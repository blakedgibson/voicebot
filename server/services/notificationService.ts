import { storage } from '../storage';
import type { Notification, InsertNotification } from '@shared/schema';
import { sendFlaggedCallEmail } from './flaggedCallEmailService';
import { getUncachableResendClient } from './resendService';
import { twilioService } from './twilioService';
import { db } from '../db';
import { phoneNumberAssignments } from '@shared/schema';
import { eq } from 'drizzle-orm';

const FROM_EMAIL = 'VoiceBot <notifications@voicebot.one>';
const DASHBOARD_URL = 'https://voicebot.one/dashboard';

interface StatusNotification {
  id: string;
  type: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  actionUrl: string;
  createdAt: Date;
}

// Generic alert email HTML builder
function buildAlertEmail(opts: {
  displayName: string;
  headerColor: string;
  icon: string;
  title: string;
  body: string;
  ctaLabel?: string;
}): string {
  const { displayName, headerColor, icon, title, body, ctaLabel = 'Open Dashboard' } = opts;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:560px;width:100%;">
        <tr><td style="background:${headerColor};padding:32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">VoiceBot</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">AI Receptionist Alert</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">${icon} ${title}</h2>
          <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">Hi ${displayName},</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">${body}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-top:8px;">
              <a href="${DASHBOARD_URL}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">${ctaLabel}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            You're receiving this because Email Alerts are enabled in your VoiceBot notification settings.<br>
            <a href="${DASHBOARD_URL}" style="color:#6b7280;text-decoration:underline;">Manage settings</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Send a generic alert email if user has email alerts enabled
async function sendAlertEmailIfEnabled(
  userId: string,
  opts: {
    subject: string;
    icon: string;
    title: string;
    body: string;
    headerColor?: string;
    ctaLabel?: string;
  }
): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user?.email || !user.notifyEmailAlerts) return;

    const html = buildAlertEmail({
      displayName: user.firstName || 'there',
      headerColor: opts.headerColor || '#2563eb',
      icon: opts.icon,
      title: opts.title,
      body: opts.body,
      ctaLabel: opts.ctaLabel,
    });

    const { client } = await getUncachableResendClient();
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: opts.subject,
      html,
    });

    if (error) {
      console.error('❌ Resend error sending alert email:', error);
    } else {
      console.log(`✅ Alert email "${opts.subject}" sent to ${user.email}, id: ${data?.id}`);
    }
  } catch (err) {
    console.error('❌ Exception sending alert email:', err);
  }
}

export class NotificationService {
  // Get all notifications (hybrid: DB + on-demand)
  static async getAllNotifications(userId: string): Promise<Array<Notification | StatusNotification>> {
    // 1. Get event-based notifications from DB
    const dbNotifications = await storage.getActiveNotifications(userId);

    // 2. Generate status-based notifications on-demand
    const statusNotifications: StatusNotification[] = [];

    // Check trial expiring
    const trial = await storage.getUserTrial(userId);
    if (trial && trial.status === 'active') {
      const daysRemaining = Math.ceil((new Date(trial.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const minutesRemaining = trial.minutesLimit - trial.minutesUsed;
      const minutesPercentRemaining = (minutesRemaining / trial.minutesLimit) * 100;

      if (daysRemaining <= 7 || minutesPercentRemaining <= 10) {
        statusNotifications.push({
          id: 'trial-expiring',
          type: 'trial_expiring',
          priority: daysRemaining <= 3 ? 'urgent' : 'high',
          title: daysRemaining <= 3 ? 'Trial Ending Soon!' : 'Trial Minutes Running Low',
          message: daysRemaining <= 3
            ? `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Upgrade to continue service.`
            : `You have ${Math.floor(minutesRemaining)} minutes remaining (${Math.floor(minutesPercentRemaining)}% of your trial).`,
          actionUrl: '/billing',
          createdAt: new Date(trial.expiresAt),
        });
      }
    }

    // Check missing profile info
    const user = await storage.getUser(userId);
    if (user) {
      const missingFields: string[] = [];
      if (!user.firstName || !user.lastName) missingFields.push('full name');
      if (!user.phoneNumber) missingFields.push('phone number');

      if (missingFields.length > 0) {
        statusNotifications.push({
          id: 'missing-profile',
          type: 'missing_profile',
          priority: 'normal',
          title: 'Complete Your Profile',
          message: `Please add your ${missingFields.join(' and ')} to receive important updates and enable call forwarding.`,
          actionUrl: '/account',
          createdAt: new Date(user.createdAt),
        });
      }
    }

    // 3. Combine and sort by priority then timestamp
    const allNotifications = [...dbNotifications, ...statusNotifications];
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

    return allNotifications.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // Get unread count
  static async getUnreadCount(userId: string): Promise<number> {
    const user = await storage.getUser(userId);
    const lastSeenAt = user?.notificationsLastSeenAt || null;

    // Count DB notifications
    const dbCount = await storage.countUnreadNotifications(userId, lastSeenAt);

    // Count status notifications (they're always "new" if they exist)
    const allNotifications = await this.getAllNotifications(userId);
    const statusCount = allNotifications.filter(n =>
      ['trial_expiring', 'missing_profile'].includes(n.type)
    ).length;

    return dbCount + statusCount;
  }

  // Create flagged call notification
  static async createFlaggedCallNotification(
    userId: string,
    callId: string,
    callSummary: string,
    options?: {
      customerName?: string;
      phoneNumber?: string;
      duration?: number;
      startTime?: string;
      agentId?: string;
      outcome?: string;
    }
  ) {
    const notification: InsertNotification = {
      userId,
      type: 'flagged_call',
      priority: 'high',
      title: 'Call Flagged for Follow-up',
      message: callSummary || 'A call has been flagged and requires your attention.',
      actionUrl: `/calls?callId=${callId}`,
      relatedEntityType: 'call',
      relatedEntityId: callId,
      isRead: false,
      isDismissed: false,
      metadata: {
        callId,
        customerName: options?.customerName || null,
        phoneNumber: options?.phoneNumber || null,
        duration: options?.duration ?? null,
        startTime: options?.startTime || null,
        agentId: options?.agentId || null,
      },
    };

    const created = await storage.createNotification(notification);

    // Get user info for alerts
    const user = await storage.getUser(userId);

    // Send email if the user has email alerts enabled for flagged calls
    try {
      if (user?.email && user.notifyEmailAlerts && user.notifyCallFlagged) {
        await sendFlaggedCallEmail({
          toEmail: user.email,
          toName: user.firstName || undefined,
          callId,
          customerName: options?.customerName || undefined,
          phoneNumber: options?.phoneNumber || undefined,
          duration: options?.duration,
          startTime: options?.startTime || undefined,
          callSummary: callSummary || undefined,
        });
        console.log(`📧 Flagged call email sent to ${user.email}`);
      }
    } catch (emailErr) {
      console.error('❌ Failed to send flagged call email:', emailErr);
    }

    // Send SMS if the user has SMS alerts enabled for flagged calls
    console.log('🔍 SMS Alert Debug - Starting SMS alert check...');
    console.log(`   User ID: ${userId}`);
    console.log(`   User phone number: ${user?.phoneNumber || 'NOT SET'}`);
    console.log(`   User enableSMS: ${user?.enableSMS}`);
    console.log(`   User notifyCallFlagged: ${user?.notifyCallFlagged}`);

    try {
      if (!user?.phoneNumber) {
        console.log('❌ SMS Alert SKIPPED - User has no phone number set in Account tab');
        return created;
      }

      if (!user.enableSMS) {
        console.log('❌ SMS Alert SKIPPED - User has SMS alerts disabled in Notification Settings');
        return created;
      }

      if (!user.notifyCallFlagged) {
        console.log('❌ SMS Alert SKIPPED - User has Call Flagged notifications disabled in Notification Settings');
        return created;
      }

      console.log('✅ All conditions met - proceeding to send SMS...');

      // Get the user's AI receptionist phone number (Twilio phone number) to use as sender
      const phoneAssignment = await db.query.phoneNumberAssignments.findFirst({
        where: eq(phoneNumberAssignments.userId, userId)
      });

      console.log(`   AI receptionist phone number: ${phoneAssignment?.phoneNumber || 'NOT FOUND'}`);

      if (!phoneAssignment || !phoneAssignment.phoneNumber) {
        console.error(`❌ No AI receptionist phone number assigned to user ${userId} - cannot send SMS alert`);
        console.error(`   User needs to have a provisioned Twilio phone number in phoneNumberAssignments table`);
      } else {
        const customerPhone = options?.phoneNumber || 'Unknown number';
        const outcome = options?.outcome || 'Flagged for follow-up';
        const smsMessage = `ALERT: ${customerPhone} - ${outcome}`;

        console.log(`📱 Sending SMS alert...`);
        console.log(`   From: ${phoneAssignment.phoneNumber}`);
        console.log(`   To: ${user.phoneNumber}`);
        console.log(`   Message: ${smsMessage}`);

        const smsResult = await twilioService.sendSMS(user.phoneNumber, smsMessage, phoneAssignment.phoneNumber);

        console.log(`✅ SMS SENT SUCCESSFULLY!`);
        console.log(`   Message SID: ${smsResult.sid}`);
        console.log(`   Status: ${smsResult.status}`);
      }
    } catch (smsErr) {
      console.error('❌ CRITICAL ERROR sending flagged call SMS:');
      console.error(smsErr);
      if (smsErr instanceof Error) {
        console.error(`   Error message: ${smsErr.message}`);
        console.error(`   Error stack: ${smsErr.stack}`);
      }
    }

    return created;
  }

  // Create usage warning notification (80% usage)
  static async createUsageWarningNotification(
    userId: string,
    percentUsed: number,
    minutesRemaining: number,
    minutesLimit: number
  ) {
    const message = `You've used ${Math.round(percentUsed)}% of your monthly minutes (${minutesRemaining} minutes remaining out of ${minutesLimit}). Consider upgrading to avoid interruption.`;
    const notification: InsertNotification = {
      userId,
      type: 'usage_warning',
      priority: 'high',
      title: '80% of Minutes Used',
      message,
      actionUrl: '/billing',
      relatedEntityType: 'subscription',
      relatedEntityId: userId,
      isRead: false,
      isDismissed: false,
    };

    const created = await storage.createNotification(notification);

    await sendAlertEmailIfEnabled(userId, {
      subject: `⚠️ ${Math.round(percentUsed)}% of Your Monthly Minutes Used`,
      icon: '⚠️',
      title: '80% of Minutes Used',
      body: message,
      headerColor: 'linear-gradient(135deg,#d97706,#b45309)',
      ctaLabel: 'View Billing',
    });

    return created;
  }

  // Create usage limit notification (100% usage)
  static async createUsageLimitNotification(
    userId: string,
    minutesLimit: number,
    stopServiceAtLimit: boolean
  ) {
    const message = stopServiceAtLimit
      ? `You've used all ${minutesLimit} minutes in your plan. Call service has been paused. Upgrade your plan or wait until next month to resume.`
      : `You've used all ${minutesLimit} minutes in your plan. Overage charges will apply for additional minutes. Upgrade to a higher plan to get more minutes.`;

    const notification: InsertNotification = {
      userId,
      type: 'usage_limit',
      priority: 'urgent',
      title: 'Monthly Minute Limit Reached',
      message,
      actionUrl: '/billing',
      relatedEntityType: 'subscription',
      relatedEntityId: userId,
      isRead: false,
      isDismissed: false,
    };

    const created = await storage.createNotification(notification);

    await sendAlertEmailIfEnabled(userId, {
      subject: '🚨 Monthly Minute Limit Reached',
      icon: '🚨',
      title: 'Monthly Minute Limit Reached',
      body: message,
      headerColor: 'linear-gradient(135deg,#dc2626,#b91c1c)',
      ctaLabel: 'Upgrade Plan',
    });

    return created;
  }

  // Automatically check usage and fire the right notification — called after every call ends.
  // Uses the billing-period start date to deduplicate (only one 80% and one 100% alert per cycle).
  static async checkAndFireUsageNotifications(
    userId: string,
    minutesUsed: number,
    minutesLimit: number,
    stopServiceAtLimit: boolean
  ) {
    if (minutesLimit <= 0) return;

    const percentUsed = (minutesUsed / minutesLimit) * 100;

    // Get all active notifications for this user so we can deduplicate
    const existing = await storage.getActiveNotifications(userId);
    const billingCycleStart = new Date();
    billingCycleStart.setDate(1);
    billingCycleStart.setHours(0, 0, 0, 0);

    const alreadySentThisMonth = (type: string) =>
      existing.some(
        (n) => n.type === type && new Date(n.createdAt) >= billingCycleStart
      );

    if (percentUsed >= 100 && !alreadySentThisMonth('usage_limit')) {
      await this.createUsageLimitNotification(userId, minutesLimit, stopServiceAtLimit);
      console.log(`🔔 Usage LIMIT notification sent to user ${userId} (${Math.round(percentUsed)}% used)`);
    } else if (percentUsed >= 80 && percentUsed < 100 && !alreadySentThisMonth('usage_warning')) {
      const minutesRemaining = Math.max(0, minutesLimit - minutesUsed);
      await this.createUsageWarningNotification(userId, percentUsed, minutesRemaining, minutesLimit);
      console.log(`🔔 Usage WARNING notification sent to user ${userId} (${Math.round(percentUsed)}% used)`);
    }
  }

  // Create subscription renewal notification
  static async createSubscriptionRenewalNotification(
    userId: string,
    planName: string,
    amount: number,
    currency: string,
    nextRenewalDate: string
  ) {
    const formattedAmount = (amount / 100).toFixed(2);
    const message = `Your ${planName} plan has been renewed for $${formattedAmount} ${currency.toUpperCase()}. Your next renewal is on ${nextRenewalDate}.`;
    const notification: InsertNotification = {
      userId,
      type: 'subscription_renewed',
      priority: 'normal',
      title: 'Subscription Renewed Successfully',
      message,
      actionUrl: '/billing',
      relatedEntityType: 'subscription',
      relatedEntityId: userId,
      isRead: false,
      isDismissed: false,
    };

    const created = await storage.createNotification(notification);

    await sendAlertEmailIfEnabled(userId, {
      subject: `✅ Your ${planName} Plan Has Been Renewed`,
      icon: '✅',
      title: 'Subscription Renewed',
      body: message,
      headerColor: 'linear-gradient(135deg,#16a34a,#15803d)',
      ctaLabel: 'View Billing',
    });

    return created;
  }

  // Create payment failed notification
  static async createPaymentFailedNotification(
    userId: string,
    amount: number,
    currency: string,
    failureReason: string,
    attemptCount: number
  ) {
    const formattedAmount = (amount / 100).toFixed(2);
    const message = `Your payment of $${formattedAmount} ${currency.toUpperCase()} failed (Attempt ${attemptCount}). ${failureReason}. Please update your payment method to avoid service interruption.`;
    const notification: InsertNotification = {
      userId,
      type: 'payment_failed',
      priority: 'urgent',
      title: 'Payment Failed',
      message,
      actionUrl: '/billing',
      relatedEntityType: 'subscription',
      relatedEntityId: userId,
      isRead: false,
      isDismissed: false,
    };

    const created = await storage.createNotification(notification);

    await sendAlertEmailIfEnabled(userId, {
      subject: `❌ Payment Failed — Action Required`,
      icon: '❌',
      title: 'Payment Failed',
      body: message,
      headerColor: 'linear-gradient(135deg,#dc2626,#b91c1c)',
      ctaLabel: 'Update Payment Method',
    });

    return created;
  }

  // Create subscription cancelled notification
  static async createSubscriptionCancelledNotification(
    userId: string,
    planName: string,
    cancellationDate: string
  ) {
    const message = `Your ${planName} subscription was cancelled on ${cancellationDate}. You can reactivate anytime from your billing settings.`;
    const notification: InsertNotification = {
      userId,
      type: 'subscription_cancelled',
      priority: 'high',
      title: 'Subscription Cancelled',
      message,
      actionUrl: '/billing',
      relatedEntityType: 'subscription',
      relatedEntityId: userId,
      isRead: false,
      isDismissed: false,
    };

    const created = await storage.createNotification(notification);

    await sendAlertEmailIfEnabled(userId, {
      subject: `Your ${planName} Subscription Has Been Cancelled`,
      icon: '🔕',
      title: 'Subscription Cancelled',
      body: message,
      headerColor: 'linear-gradient(135deg,#6b7280,#4b5563)',
      ctaLabel: 'Reactivate Plan',
    });

    return created;
  }

  // Create card expiring notification
  static async createCardExpiringNotification(
    userId: string,
    cardBrand: string,
    cardLast4: string,
    expiryMonth: number,
    expiryYear: number
  ) {
    const message = `Your ${cardBrand} ending in ${cardLast4} expires ${expiryMonth}/${expiryYear}. Please update your payment method to avoid service disruption.`;
    const notification: InsertNotification = {
      userId,
      type: 'card_expiring',
      priority: 'high',
      title: 'Payment Card Expiring Soon',
      message,
      actionUrl: '/billing',
      relatedEntityType: 'subscription',
      relatedEntityId: userId,
      isRead: false,
      isDismissed: false,
    };

    const created = await storage.createNotification(notification);

    await sendAlertEmailIfEnabled(userId, {
      subject: `⚠️ Your ${cardBrand} Ending in ${cardLast4} Is Expiring Soon`,
      icon: '💳',
      title: 'Payment Card Expiring Soon',
      body: message,
      headerColor: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
      ctaLabel: 'Update Payment Method',
    });

    return created;
  }

  // Send a test email alert to the user
  static async sendTestEmail(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.email) return { success: false, error: 'No email address on file' };
      if (!user.notifyEmailAlerts) return { success: false, error: 'Email alerts are disabled' };

      const html = buildAlertEmail({
        displayName: user.firstName || 'there',
        headerColor: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
        icon: '🔔',
        title: 'Test Notification',
        body: 'This is a test notification from VoiceBot. Your email alerts are working correctly. You will receive emails like this when important events happen with your AI receptionist.',
        ctaLabel: 'Open Dashboard',
      });

      const { client } = await getUncachableResendClient();
      const { data, error } = await client.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: '🔔 VoiceBot Test Notification',
        html,
      });

      if (error) {
        console.error('❌ Resend error sending test email:', error);
        return { success: false, error: String(error) };
      }

      console.log(`✅ Test email sent to ${user.email}, id: ${data?.id}`);
      return { success: true };
    } catch (err: any) {
      console.error('❌ Exception sending test email:', err);
      return { success: false, error: err?.message || 'Unknown error' };
    }
  }

  // Mark all as seen
  static async markAsSeen(userId: string) {
    await storage.updateNotificationsLastSeenAt(userId);
  }
}
