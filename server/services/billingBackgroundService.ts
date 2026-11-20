/**
 * Billing Background Service
 * Handles automated billing tasks: grace period enforcement, renewal reminders, card expiry checks
 */

import { storage } from '../storage';
import Stripe from 'stripe';
import {
  sendPaymentFailedEmail,
  sendRenewalReminderEmail,
  sendPaymentMethodExpiringEmail
} from './billingNotificationService';

// Production uses live keys; development always uses test keys.
const getStripe = () => {
  const apiKey = process.env.NODE_ENV === 'production'
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.TESTING_STRIPE_SECRET_KEY;

  if (!apiKey) {
    throw new Error('Stripe API key not found');
  }

  return new Stripe(apiKey, { apiVersion: '2024-12-18.acacia' });
};

/**
 * Grace Period Enforcement Job
 * Runs hourly to check for expired grace periods and suspend services
 */
export async function enforceGracePeriods(): Promise<void> {
  try {
    console.log('🔄 Running grace period enforcement job...');

    // Find all subscriptions where grace period has expired but service is still in grace_period
    const db = storage.db;
    const { userSubscriptions, users, phoneNumberAssignments } = await import('@shared/schema');
    const { eq, and, lt } = await import('drizzle-orm');

    const expiredSubscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.serviceStatus, 'grace_period'),
          lt(userSubscriptions.gracePeriodEndsAt, new Date())
        )
      );

    console.log(`📊 Found ${expiredSubscriptions.length} subscriptions with expired grace periods`);

    for (const subscription of expiredSubscriptions) {
      try {
        // Update subscription to suspended status
        await storage.updateUserSubscription(subscription.id, {
          serviceStatus: 'suspended'
        });

        // Suspend all phone numbers/AI agents
        const phoneAssignments = await storage.getPhoneNumberAssignmentsByUserId(subscription.userId);
        for (const assignment of phoneAssignments) {
          await storage.updatePhoneNumberAssignment(assignment.id, {
            status: 'suspended'
          });
        }

        console.log(`🚫 Suspended services for subscription ${subscription.id} (user: ${subscription.userId}) - grace period expired`);

        // Send final suspension email
        const user = await storage.getUser(subscription.userId);
        if (user && user.billingNotifyPaymentFailed !== false) {
          const plan = await storage.getSubscriptionPlan(subscription.planId);

          await sendPaymentFailedEmail({
            recipientEmail: user.email,
            recipientName: user.firstName || user.email,
            amount: 0, // Amount not relevant for suspension notice
            currency: 'usd',
            invoiceNumber: 'SUSPENDED',
            failureReason: 'Grace period expired',
            attemptCount: subscription.paymentFailureCount || 0,
            gracePeriodEndsAt: subscription.gracePeriodEndsAt?.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) || 'N/A',
            updatePaymentUrl: 'https://voicebot.one/dashboard?tab=billing',
            dayInSequence: 7 // Day 7 is the suspension email
          });

          console.log(`📧 Sent final suspension email to ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error suspending subscription ${subscription.id}:`, error);
      }
    }

    console.log('✅ Grace period enforcement job completed');
  } catch (error) {
    console.error('❌ Error in grace period enforcement job:', error);
  }
}

/**
 * Renewal Reminder Job
 * Runs daily to send renewal reminders 3-7 days before subscription renewal
 */
export async function sendRenewalReminders(): Promise<void> {
  try {
    console.log('🔄 Running renewal reminder job...');

    const db = storage.db;
    const { userSubscriptions } = await import('@shared/schema');
    const { eq, and, gte, lte } = await import('drizzle-orm');

    // Find subscriptions renewing in 3-7 days
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingRenewals = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.status, 'active'),
          eq(userSubscriptions.serviceStatus, 'active'),
          gte(userSubscriptions.currentPeriodEnd, threeDaysFromNow),
          lte(userSubscriptions.currentPeriodEnd, sevenDaysFromNow)
        )
      );

    console.log(`📊 Found ${upcomingRenewals.length} subscriptions renewing in 3-7 days`);

    for (const subscription of upcomingRenewals) {
      try {
        const user = await storage.getUser(subscription.userId);
        if (!user || user.billingNotifyRenewalReminder === false) {
          continue; // Skip if user disabled renewal reminders
        }

        const plan = await storage.getSubscriptionPlan(subscription.planId);
        if (!plan) continue;

        // Check if we already sent a renewal reminder for this period
        // (avoid sending multiple reminders for the same renewal)
        const daysSinceLastDunning = subscription.lastDunningEmailSentAt
          ? (Date.now() - new Date(subscription.lastDunningEmailSentAt).getTime()) / (24 * 60 * 60 * 1000)
          : Infinity;

        if (daysSinceLastDunning < 3) {
          continue; // Already sent recently
        }

        // Get payment method details from Stripe
        const stripe = getStripe();
        let paymentMethodStr = 'Card on file';

        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
          const defaultPaymentMethod = stripeSubscription.default_payment_method;

          if (defaultPaymentMethod) {
            const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethod as string);
            if (pm.card) {
              paymentMethodStr = `${pm.card.brand} •••• ${pm.card.last4}`;
            }
          }
        } catch (stripeError) {
          console.error('Failed to fetch payment method from Stripe:', stripeError);
        }

        const renewalDate = new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        await sendRenewalReminderEmail({
          recipientEmail: user.email,
          recipientName: user.firstName || user.email,
          planName: plan.planName,
          renewalDate,
          amount: plan.monthlyPrice,
          currency: 'usd',
          paymentMethod: paymentMethodStr
        });

        // Update last dunning email timestamp to track we sent this
        await storage.updateUserSubscription(subscription.id, {
          lastDunningEmailSentAt: new Date()
        });

        console.log(`📧 Sent renewal reminder email to ${user.email} for ${renewalDate}`);
      } catch (error) {
        console.error(`❌ Error sending renewal reminder for subscription ${subscription.id}:`, error);
      }
    }

    console.log('✅ Renewal reminder job completed');
  } catch (error) {
    console.error('❌ Error in renewal reminder job:', error);
  }
}

/**
 * Card Expiry Check Job
 * Runs weekly to check for payment methods expiring in the next 30 days
 */
export async function checkExpiringCards(): Promise<void> {
  try {
    console.log('🔄 Running card expiry check job...');

    const db = storage.db;
    const { userSubscriptions } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    // Get all active subscriptions
    const activeSubscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.status, 'active'));

    console.log(`📊 Checking ${activeSubscriptions.length} active subscriptions for expiring cards`);

    const stripe = getStripe();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let expiringCardsFound = 0;

    for (const subscription of activeSubscriptions) {
      try {
        const user = await storage.getUser(subscription.userId);
        if (!user || user.billingNotifyCardExpiring === false) {
          continue; // Skip if user disabled card expiry notifications
        }

        // Get Stripe subscription and payment method
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        const defaultPaymentMethod = stripeSubscription.default_payment_method;

        if (!defaultPaymentMethod) {
          continue; // No payment method on file
        }

        const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethod as string);

        if (!pm.card || !pm.card.exp_month || !pm.card.exp_year) {
          continue; // Not a card payment method
        }

        // Check if card expires within 30 days
        const cardExpiryDate = new Date(pm.card.exp_year, pm.card.exp_month - 1, 1);

        if (cardExpiryDate <= thirtyDaysFromNow && cardExpiryDate >= now) {
          // Card expires within 30 days
          const daysUntilExpiry = Math.ceil((cardExpiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          // Check if we already sent an expiry warning recently (within last 7 days)
          const daysSinceLastDunning = subscription.lastDunningEmailSentAt
            ? (Date.now() - new Date(subscription.lastDunningEmailSentAt).getTime()) / (24 * 60 * 60 * 1000)
            : Infinity;

          if (daysSinceLastDunning < 7) {
            continue; // Already sent recently
          }

          await sendPaymentMethodExpiringEmail({
            recipientEmail: user.email,
            recipientName: user.firstName || user.email,
            cardBrand: pm.card.brand || 'Card',
            last4: pm.card.last4 || '****',
            expiryMonth: pm.card.exp_month,
            expiryYear: pm.card.exp_year,
            updatePaymentUrl: 'https://voicebot.one/dashboard?tab=billing',
            daysUntilExpiry
          });

          // Update last dunning email timestamp
          await storage.updateUserSubscription(subscription.id, {
            lastDunningEmailSentAt: new Date()
          });

          expiringCardsFound++;
          // PRIVACY: Do not log card details or emails (GDPR-A5-32, PCI-DSS, CCPA)
          console.log(`📧 Sent card expiry warning (expires in ${daysUntilExpiry} days)`);
        }
      } catch (error) {
        console.error(`❌ Error checking card expiry for subscription ${subscription.id}:`, error);
      }
    }

    console.log(`✅ Card expiry check job completed (${expiringCardsFound} expiring cards found)`);
  } catch (error) {
    console.error('❌ Error in card expiry check job:', error);
  }
}

/**
 * Start all background billing jobs
 * Call this once when the server starts
 */
export function startBillingBackgroundJobs(): void {
  console.log('🚀 Starting billing background jobs...');

  // Grace period enforcement - Run every hour
  const gracePeriodInterval = 60 * 60 * 1000; // 1 hour
  setInterval(enforceGracePeriods, gracePeriodInterval);
  // Run immediately on startup
  enforceGracePeriods();

  // Renewal reminders - Run daily at midnight
  const renewalInterval = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(sendRenewalReminders, renewalInterval);
  // Run on startup
  sendRenewalReminders();

  // Card expiry check - Run weekly
  const cardExpiryInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
  setInterval(checkExpiringCards, cardExpiryInterval);
  // Run on startup
  checkExpiringCards();

  console.log('✅ Billing background jobs started successfully');
  console.log('   - Grace period enforcement: Every hour');
  console.log('   - Renewal reminders: Daily');
  console.log('   - Card expiry checks: Weekly');
}
