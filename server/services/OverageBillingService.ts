import Stripe from 'stripe';
import { db } from '../db';
import { userSubscriptions, telephonyCallLogs, phoneNumberAssignments, users } from '@shared/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { PLAN_DETAILS, OVERAGE_RATE_PER_MINUTE } from '@shared/constants';

const AUTO_CHARGE_THRESHOLD_CENTS = 10000; // $100

function getStripe() {
  return new Stripe(
    process.env.NODE_ENV === 'production'
      ? process.env.STRIPE_SECRET_KEY_LIVE!
      : process.env.TESTING_STRIPE_SECRET_KEY!,
    { apiVersion: '2024-11-20.acacia' }
  );
}

export class OverageBillingService {
  /**
   * Calculate total minutes used across ALL agents for a user in the current billing period.
   * Queries telephonyCallLogs by the user's assigned phone numbers.
   */
  static async calculateTotalMinutesForPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    try {
      const phones = await db
        .select({ phoneNumber: phoneNumberAssignments.phoneNumber })
        .from(phoneNumberAssignments)
        .where(eq(phoneNumberAssignments.userId, userId));

      if (phones.length === 0) return 0;

      const phoneNumbers = phones.map(p => p.phoneNumber);

      const result = await db
        .select({
          totalSeconds: sql<number>`COALESCE(SUM(${telephonyCallLogs.duration}), 0)`,
        })
        .from(telephonyCallLogs)
        .where(
          and(
            inArray(telephonyCallLogs.toNumber, phoneNumbers),
            gte(telephonyCallLogs.startTime, periodStart),
            lte(telephonyCallLogs.startTime, periodEnd),
            eq(telephonyCallLogs.status, 'completed')
          )
        );

      const totalSeconds = Number(result[0]?.totalSeconds || 0);
      return Math.round(totalSeconds / 60);
    } catch (error) {
      console.error('❌ Error calculating total minutes:', error);
      return 0;
    }
  }

  /**
   * Returns true if the user has reached or exceeded their plan minute limit.
   */
  static async isAtMinuteLimit(userId: string, subscriptionId: string): Promise<boolean> {
    try {
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.id, subscriptionId),
        with: { plan: true },
      });

      if (!subscription) return false;
      const minuteLimit = subscription.plan?.maxCallMinutes || 0;
      if (minuteLimit === 0) return false;

      const totalMinutes = await this.calculateTotalMinutesForPeriod(
        userId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd
      );

      return totalMinutes >= minuteLimit;
    } catch (error) {
      console.error('❌ Error checking minute limit:', error);
      return false;
    }
  }

  /**
   * Update overage tracking for a subscription after a call completes.
   * Automatically charges $100 when accumulated overage reaches the threshold,
   * BUT ONLY if:
   *   1. The user is on a paid plan (real Stripe subscription)
   *   2. Their "Stop Service at Limit" toggle is OFF
   *   3. They have used 100% of their included minutes (overageMinutes > 0)
   */
  static async updateOverageTracking(subscriptionId: string): Promise<void> {
    try {
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.id, subscriptionId),
        with: { plan: true },
      });

      if (!subscription) {
        console.log('⚠️ Subscription not found:', subscriptionId);
        return;
      }

      // Only process real paid Stripe subscriptions
      if (!subscription.stripeSubscriptionId?.startsWith('sub_')) {
        return;
      }

      // Fetch user to check the "Stop Service at Limit" toggle
      const [user] = await db
        .select({ billingStopServiceAtLimit: users.billingStopServiceAtLimit })
        .from(users)
        .where(eq(users.id, subscription.userId));

      // If toggle is ON, do not accumulate or charge overage — service stops at limit
      if (user?.billingStopServiceAtLimit === true) {
        return;
      }

      const totalMinutes = await this.calculateTotalMinutesForPeriod(
        subscription.userId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd
      );

      const minuteLimit = subscription.plan?.maxCallMinutes || 0;

      // Check if we need to send 80% usage warning
      const usagePercent = (totalMinutes / minuteLimit) * 100;
      if (usagePercent >= 80 && usagePercent < 100) {
        // Check if we haven't sent a warning recently (within last 24 hours)
        const [userRecord] = await db
          .select({
            lastUsageWarningAt: users.lastUsageWarningAt,
            billingNotifyUsageWarning: users.billingNotifyUsageWarning
          })
          .from(users)
          .where(eq(users.id, subscription.userId));

        const shouldSendWarning = userRecord?.billingNotifyUsageWarning !== false && (
          !userRecord?.lastUsageWarningAt ||
          (new Date().getTime() - new Date(userRecord.lastUsageWarningAt).getTime()) > 24 * 60 * 60 * 1000
        );

        if (shouldSendWarning) {
          const minutesRemaining = minuteLimit - totalMinutes;
          const { NotificationService } = await import('./notificationService');
          await NotificationService.createUsageWarningNotification(
            subscription.userId,
            usagePercent,
            minutesRemaining,
            minuteLimit
          );

          // Update last warning timestamp
          await db
            .update(users)
            .set({ lastUsageWarningAt: new Date() })
            .where(eq(users.id, subscription.userId));

          console.log(`📧 Sent 80% usage warning notification to user ${subscription.userId}`);
        }
      }

      // No overage if still within included minutes
      if (totalMinutes <= minuteLimit) {
        await db
          .update(userSubscriptions)
          .set({
            currentMonthMinutesUsed: totalMinutes,
            currentMonthOverageMinutes: 0,
            pendingOverageCharges: 0,
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.id, subscriptionId));
        return;
      }

      // Determine overage rate from plan name
      const planName = subscription.plan?.planName?.toLowerCase() || 'small';
      const planKey = (planName in PLAN_DETAILS ? planName : 'small') as keyof typeof PLAN_DETAILS;
      const overageRate = PLAN_DETAILS[planKey]?.overageRate || OVERAGE_RATE_PER_MINUTE;

      const overageMinutes = Math.max(0, totalMinutes - minuteLimit);
      const overageCharges = Math.round(overageMinutes * overageRate * 100); // in cents

      await db
        .update(userSubscriptions)
        .set({
          currentMonthMinutesUsed: totalMinutes,
          currentMonthOverageMinutes: overageMinutes,
          pendingOverageCharges: overageCharges,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, subscriptionId));

      console.log(`📊 Overage tracking updated for ${subscriptionId}:`, {
        totalMinutes,
        minuteLimit,
        overageMinutes,
        overageChargesDollars: `$${(overageCharges / 100).toFixed(2)}`,
        ratePerMinute: `$${overageRate.toFixed(2)}`,
        plan: planName,
      });

      // Auto-charge when accumulated overage hits $100 threshold
      if (overageCharges >= AUTO_CHARGE_THRESHOLD_CENTS) {
        console.log(`💳 Overage threshold reached ($${(overageCharges / 100).toFixed(2)}) — initiating auto-charge`);
        await this.autoChargeOverage(
          subscription.id,
          subscription.userId,
          subscription.stripeCustomerId,
          overageMinutes,
          overageCharges,
          overageRate,
          planName
        );
      }
    } catch (error) {
      console.error('❌ Error updating overage tracking:', error);
    }
  }

  /**
   * Immediately charge accumulated overage to the customer via Stripe.
   *
   * Per Stripe docs (https://docs.stripe.com/invoicing/automatic-charging):
   * - Create a standalone invoice item (NOT attached to the subscription)
   *   to avoid it being included in the subscription's next renewal invoice.
   * - Create an invoice with auto_advance: true and collection_method: 'charge_automatically'
   *   so Stripe automatically finalizes and collects it against the customer's default payment method.
   */
  static async autoChargeOverage(
    subscriptionId: string,
    userId: string,
    stripeCustomerId: string,
    overageMinutes: number,
    overageChargesCents: number,
    overageRate: number,
    planName: string
  ): Promise<void> {
    try {
      // Resolve Stripe customer ID if missing
      if (!stripeCustomerId) {
        const [userRow] = await db
          .select({ stripeCustomerId: users.stripeCustomerId })
          .from(users)
          .where(eq(users.id, userId));
        stripeCustomerId = userRow?.stripeCustomerId || '';
      }

      if (!stripeCustomerId) {
        console.warn('⚠️ No Stripe customer ID — skipping auto-charge for subscription', subscriptionId);
        return;
      }

      const stripe = getStripe();

      const planLabel = planName.charAt(0).toUpperCase() + planName.slice(1);
      const period = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Step 1: Create a standalone invoice item for the overage.
      // Do NOT pass `subscription` — attaching it would put this line item on the
      // subscription's next renewal invoice and cause double-billing.
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        amount: overageChargesCents,
        currency: 'usd',
        description: `Overage: ${overageMinutes} min × $${overageRate.toFixed(2)}/min (${planLabel} plan) — ${period}`,
      });

      // Step 2: Create a draft invoice with auto_advance: false so we control timing.
      // collection_method: 'charge_automatically' means Stripe uses the customer's
      // default payment method when we trigger payment (no hosted invoice page needed).
      const invoice = await stripe.invoices.create({
        customer: stripeCustomerId,
        collection_method: 'charge_automatically',
        auto_advance: false,
        description: `VoiceBot overage auto-charge — ${period}`,
      });

      console.log(`📄 Overage invoice drafted: ${invoice.id} ($${(overageChargesCents / 100).toFixed(2)})`);

      // Step 3: Finalize the invoice immediately (moves it from draft → open).
      // When collection_method is 'charge_automatically', Stripe may collect payment
      // automatically during finalization — so we check the status before calling pay().
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: false });
      console.log(`✅ Invoice finalized: ${finalizedInvoice.id} — status: ${finalizedInvoice.status}`);

      // Step 4: Pay only if Stripe hasn't already collected it during finalization.
      if (finalizedInvoice.status !== 'paid') {
        const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id);
        console.log(`💳 Invoice paid: ${paidInvoice.id} — status: ${paidInvoice.status}`);
      } else {
        console.log(`💳 Invoice ${finalizedInvoice.id} was already collected by Stripe upon finalization`);
      }

      // Step 5: Reset pending overage so the next $100 block starts fresh.
      // Only reset AFTER a confirmed charge to avoid losing tracking on failure.
      await db
        .update(userSubscriptions)
        .set({
          pendingOverageCharges: 0,
          currentMonthOverageMinutes: 0,
          lastOverageBilledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, subscriptionId));

      console.log(`✅ Auto-charged $${(overageChargesCents / 100).toFixed(2)} overage for subscription ${subscriptionId} (${overageMinutes} min @ $${overageRate.toFixed(2)}/min)`);
    } catch (error: any) {
      console.error('❌ Error auto-charging overage:', error?.message || error);

      // Track the failure so billing team can follow up
      await db
        .update(userSubscriptions)
        .set({
          paymentFailureCount: sql`${userSubscriptions.paymentFailureCount} + 1`,
          firstPaymentFailedAt: sql`COALESCE(${userSubscriptions.firstPaymentFailedAt}, NOW())`,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, subscriptionId));
    }
  }

  /**
   * Bill any remaining overage charges at end of billing period (called from Stripe invoice.paid webhook).
   * Resets the minute counter for the new period.
   */
  static async billOverageCharges(subscriptionId: string): Promise<void> {
    try {
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.id, subscriptionId),
        with: { plan: true },
      });

      if (!subscription) {
        console.log('⚠️ Subscription not found:', subscriptionId);
        return;
      }

      // Recalculate to pick up any calls since last check
      await this.updateOverageTracking(subscriptionId);

      const updatedSub = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.id, subscriptionId),
        with: { plan: true },
      });

      if (!updatedSub || !updatedSub.pendingOverageCharges || updatedSub.pendingOverageCharges === 0) {
        console.log('✅ No remaining overage to bill at period end for:', subscriptionId);
      } else {
        const planName = updatedSub.plan?.planName?.toLowerCase() || 'small';
        const planKey = (planName in PLAN_DETAILS ? planName : 'small') as keyof typeof PLAN_DETAILS;
        const overageRate = PLAN_DETAILS[planKey]?.overageRate || OVERAGE_RATE_PER_MINUTE;

        // Standalone invoice item — not attached to subscription
        await getStripe().invoiceItems.create({
          customer: updatedSub.stripeCustomerId,
          amount: updatedSub.pendingOverageCharges,
          currency: 'usd',
          description: `End-of-period overage: ${updatedSub.currentMonthOverageMinutes} min × $${overageRate.toFixed(2)}/min (${planName.charAt(0).toUpperCase() + planName.slice(1)} plan)`,
        });

        console.log(`💸 Created end-of-period overage invoice item for ${subscriptionId}: $${(updatedSub.pendingOverageCharges / 100).toFixed(2)}`);
      }

      // Reset overage tracking for new billing period
      await db
        .update(userSubscriptions)
        .set({
          currentMonthMinutesUsed: 0,
          currentMonthOverageMinutes: 0,
          pendingOverageCharges: 0,
          lastOverageBilledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, subscriptionId));

      console.log(`✅ Reset overage tracking for new billing period: ${subscriptionId}`);
    } catch (error) {
      console.error('❌ Error billing end-of-period overage:', error);
      throw error;
    }
  }

  /**
   * Get current usage and overage info for a subscription.
   */
  static async getUsageInfo(subscriptionId: string): Promise<{
    totalMinutes: number;
    minuteLimit: number;
    overageMinutes: number;
    overageCharges: number;
  }> {
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.id, subscriptionId),
      with: { plan: true },
    });

    if (!subscription) {
      return { totalMinutes: 0, minuteLimit: 0, overageMinutes: 0, overageCharges: 0 };
    }

    const totalMinutes = await this.calculateTotalMinutesForPeriod(
      subscription.userId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd
    );

    const minuteLimit = subscription.plan?.maxCallMinutes || 0;
    const planName = subscription.plan?.planName?.toLowerCase() || 'small';
    const planKey = (planName in PLAN_DETAILS ? planName : 'small') as keyof typeof PLAN_DETAILS;
    const overageRate = PLAN_DETAILS[planKey]?.overageRate || OVERAGE_RATE_PER_MINUTE;

    const overageMinutes = Math.max(0, totalMinutes - minuteLimit);
    const overageCharges = overageMinutes * overageRate;

    return { totalMinutes, minuteLimit, overageMinutes, overageCharges };
  }
}
