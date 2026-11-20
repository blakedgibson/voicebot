/**
 * Billing Notification Service
 * Sends email notifications for billing events using Resend API
 * Emails sent from: billing@voicebot.one
 */

import { getUncachableResendClient } from './resendService';
import { storage } from '../storage';

const FROM_EMAIL = 'VoiceBot Billing <billing@voicebot.one>';

interface EmailData {
  recipientEmail: string;
  recipientName: string;
}

interface UsageWarningData extends EmailData {
  currentUsage: number;
  monthlyLimit: number;
  percentageUsed: number;
  remainingMinutes: number;
  planName: string;
  overageRate: number;
}

interface PaymentReceiptData extends EmailData {
  amount: number;
  currency: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentMethod: string;
  planName: string;
  invoiceUrl?: string;
}

interface MonthlyInvoiceData extends EmailData {
  billingPeriod: string;
  totalAmount: number;
  currency: string;
  minutesUsed: number;
  minutesLimit: number;
  overageMinutes: number;
  overageCharges: number;
  planName: string;
  invoiceUrl?: string;
  invoiceNumber: string;
}

interface PaymentFailedData extends EmailData {
  amount: number;
  currency: string;
  invoiceNumber: string;
  failureReason: string;
  attemptCount: number;
  gracePeriodEndsAt: string;
  updatePaymentUrl: string;
  dayInSequence: 1 | 3 | 5 | 7; // Dunning email sequence day
}

interface SubscriptionCancelledData extends EmailData {
  planName: string;
  cancellationDate: string;
  dataRetentionDays: number;
  reactivationUrl: string;
}

interface RenewalReminderData extends EmailData {
  planName: string;
  renewalDate: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

interface PaymentMethodExpiringData extends EmailData {
  cardBrand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  updatePaymentUrl: string;
  daysUntilExpiry: number;
}

/**
 * Send usage warning email when user reaches 80% of monthly limit
 */
export async function sendUsageWarningEmail(data: UsageWarningData): Promise<boolean> {
  try {
    const { client } = await getUncachableResendClient();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">VoiceBot</h1>
          </div>

          <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #f59e0b; margin-top: 0; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 24px;">⚠️</span> Usage Warning
            </h2>

            <p style="font-size: 16px;">Hi ${data.recipientName},</p>

            <p style="font-size: 16px;">You've used <strong style="color: #f59e0b;">${data.percentageUsed.toFixed(0)}%</strong> of your monthly phone minutes on your <strong>${data.planName}</strong> plan.</p>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #92400e; font-size: 15px;">Minutes Used:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong style="color: #92400e; font-size: 18px;">${data.currentUsage} / ${data.monthlyLimit}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92400e; font-size: 15px;">Minutes Remaining:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong style="color: #059669; font-size: 18px;">${data.remainingMinutes}</strong></td>
                </tr>
              </table>
            </div>

            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <h3 style="margin-top: 0; color: #991b1b; font-size: 16px;">⚡ What happens if I exceed my limit?</h3>
              <p style="margin: 0; color: #7f1d1d; font-size: 15px;">Overage charges of <strong style="font-size: 17px;">$${data.overageRate.toFixed(2)}/minute</strong> will apply for any usage beyond your monthly limit.</p>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <h3 style="margin-top: 0; color: #166534; font-size: 16px;">💡 Recommendations:</h3>
              <ul style="color: #166534; margin: 10px 0; padding-left: 20px;">
                <li style="margin: 8px 0;">Consider upgrading to a higher plan to avoid overage charges</li>
                <li style="margin: 8px 0;">Monitor your usage in your dashboard</li>
                <li style="margin: 8px 0;">Review your call patterns to optimize usage</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="https://voicebot.one/dashboard?tab=billing" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">View Billing Dashboard</a>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
              This is an automated notification from VoiceBot. You're receiving this because you have usage warnings enabled in your billing preferences.
              <br><br>
              To manage your notification preferences, visit your <a href="https://voicebot.one/dashboard?tab=billing" style="color: #667eea; text-decoration: none;">Billing Settings</a>.
            </p>
          </div>
        </body>
      </html>
    `;

    await client.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: `⚠️ Usage Alert: ${data.percentageUsed.toFixed(0)}% of Monthly Minutes Used`,
      html: htmlContent,
    });

    console.log('✅ Usage warning email sent to:', data.recipientEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send usage warning email:', error);
    return false;
  }
}

/**
 * Send payment receipt email after successful payment
 */
export async function sendPaymentReceiptEmail(data: PaymentReceiptData): Promise<boolean> {
  try {
    const { client } = await getUncachableResendClient();

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.toUpperCase(),
    }).format(data.amount / 100);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">VoiceBot</h1>
          </div>

          <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 25px;">
              <div style="width: 70px; height: 70px; background: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                <span style="color: white; font-size: 36px; font-weight: bold;">✓</span>
              </div>
              <h2 style="color: #10b981; margin: 10px 0; font-size: 24px;">Payment Successful</h2>
            </div>

            <p style="font-size: 16px;">Hi ${data.recipientName},</p>

            <p style="font-size: 16px;">Thank you for your payment. Your transaction was processed successfully.</p>

            <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 25px; margin: 25px 0; border-radius: 10px;">
              <h3 style="margin-top: 0; color: #374151; font-size: 18px; margin-bottom: 20px;">Payment Details</h3>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; color: #6b7280; font-size: 15px;">Amount Paid:</td>
                  <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 22px; color: #111827;">${formattedAmount}</strong></td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #6b7280; font-size: 15px;">Invoice Number:</td>
                  <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 15px;">${data.invoiceNumber}</strong></td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #6b7280; font-size: 15px;">Payment Date:</td>
                  <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 15px;">${data.invoiceDate}</strong></td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #6b7280; font-size: 15px;">Payment Method:</td>
                  <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 15px;">${data.paymentMethod}</strong></td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #6b7280; font-size: 15px;">Plan:</td>
                  <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 15px;">${data.planName}</strong></td>
                </tr>
              </table>
            </div>

            ${data.invoiceUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.invoiceUrl}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">Download Invoice PDF</a>
              </div>
            ` : ''}

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>Need help?</strong> Contact our support team at <a href="mailto:support@voicebot.one" style="color: #2563eb; text-decoration: none;">support@voicebot.one</a>
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
              This is an automated receipt from VoiceBot. Please keep this for your records.
              <br><br>
              Questions about this payment? Visit your <a href="https://voicebot.one/dashboard?tab=billing" style="color: #667eea; text-decoration: none;">Billing Dashboard</a>.
            </p>
          </div>
        </body>
      </html>
    `;

    await client.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: `Payment Receipt - ${formattedAmount} - Invoice #${data.invoiceNumber}`,
      html: htmlContent,
    });

    console.log('✅ Payment receipt email sent to:', data.recipientEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send payment receipt email:', error);
    return false;
  }
}

/**
 * Send monthly invoice summary email
 */
export async function sendMonthlyInvoiceEmail(data: MonthlyInvoiceData): Promise<boolean> {
  try {
    const { client } = await getUncachableResendClient();

    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.toUpperCase(),
    }).format(data.totalAmount / 100);

    const formattedOverageCharges = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.toUpperCase(),
    }).format(data.overageCharges);

    const baseAmount = (data.totalAmount / 100) - data.overageCharges;
    const formattedBaseAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.toUpperCase(),
    }).format(baseAmount);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0;">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">VoiceBot</h1>
            <p style="color: white; opacity: 0.95; margin: 10px 0 0 0; font-size: 16px;">Monthly Billing Summary</p>
          </div>

          <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #374151; margin-top: 0; font-size: 22px;">Invoice for ${data.billingPeriod}</h2>

            <p style="font-size: 16px;">Hi ${data.recipientName},</p>

            <p style="font-size: 16px;">Here's your billing summary for the month of <strong>${data.billingPeriod}</strong>.</p>

            <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 25px; margin: 25px 0; border-radius: 10px;">
              <h3 style="margin-top: 0; color: #374151; font-size: 18px; margin-bottom: 20px;">Usage Summary</h3>

              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #6b7280; font-size: 15px;">Plan:</td>
                    <td style="padding: 10px 0; text-align: right;"><strong style="font-size: 15px;">${data.planName}</strong></td>
                  </tr>
                  <tr style="border-top: 1px solid #f3f4f6;">
                    <td style="padding: 10px 0; color: #6b7280; font-size: 15px;">Minutes Used:</td>
                    <td style="padding: 10px 0; text-align: right;"><strong style="font-size: 15px;">${data.minutesUsed} / ${data.minutesLimit}</strong></td>
                  </tr>
                  ${data.overageMinutes > 0 ? `
                    <tr style="border-top: 1px solid #fee2e2;">
                      <td style="padding: 10px 0; color: #dc2626; font-size: 15px;">Overage Minutes:</td>
                      <td style="padding: 10px 0; text-align: right;"><strong style="color: #dc2626; font-size: 15px;">+${data.overageMinutes}</strong></td>
                    </tr>
                  ` : ''}
                </table>
              </div>

              <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                <tr style="background: #f3f4f6;">
                  <th style="padding: 15px; text-align: left; font-weight: 600; color: #374151; font-size: 14px;">Description</th>
                  <th style="padding: 15px; text-align: right; font-weight: 600; color: #374151; font-size: 14px;">Amount</th>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 15px; color: #6b7280; font-size: 15px;">${data.planName} Plan</td>
                  <td style="padding: 15px; text-align: right; font-size: 15px;">${formattedBaseAmount}</td>
                </tr>
                ${data.overageCharges > 0 ? `
                  <tr style="border-top: 1px solid #e5e7eb;">
                    <td style="padding: 15px; color: #6b7280; font-size: 15px;">Overage Charges (${data.overageMinutes} min)</td>
                    <td style="padding: 15px; text-align: right; font-size: 15px;">${formattedOverageCharges}</td>
                  </tr>
                ` : ''}
                <tr style="border-top: 3px solid #374151; background: #f9fafb;">
                  <td style="padding: 15px;"><strong style="font-size: 16px;">Total Amount</strong></td>
                  <td style="padding: 15px; text-align: right;"><strong style="font-size: 20px; color: #667eea;">${formattedTotal}</strong></td>
                </tr>
              </table>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1e40af; font-size: 15px;">
                <strong>Invoice #${data.invoiceNumber}</strong>
                <br>
                <span style="font-size: 14px;">Payment will be processed automatically with your saved payment method.</span>
              </p>
            </div>

            ${data.invoiceUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.invoiceUrl}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px; margin-right: 10px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">Download PDF</a>
                <a href="https://voicebot.one/dashboard?tab=billing" style="background: white; color: #667eea; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; border: 2px solid #667eea; font-size: 15px;">View Details</a>
              </div>
            ` : `
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://voicebot.one/dashboard?tab=billing" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">View Billing Dashboard</a>
              </div>
            `}

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
              Questions about your invoice? Contact us at <a href="mailto:billing@voicebot.one" style="color: #667eea; text-decoration: none;">billing@voicebot.one</a>
              <br><br>
              To manage your notification preferences, visit your <a href="https://voicebot.one/dashboard?tab=billing" style="color: #667eea; text-decoration: none;">Billing Settings</a>.
            </p>
          </div>
        </body>
      </html>
    `;

    await client.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: `Monthly Invoice - ${data.billingPeriod} - ${formattedTotal}`,
      html: htmlContent,
    });

    console.log('✅ Monthly invoice email sent to:', data.recipientEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send monthly invoice email:', error);
    return false;
  }
}

/**
 * Check usage and send warning if at 80% threshold
 */
export async function checkAndSendUsageWarning(
  userEmail: string,
  userName: string,
  currentUsage: number,
  monthlyLimit: number,
  planName: string,
  overageRate: number,
  lastWarningTimestamp?: number
): Promise<boolean> {
  const percentageUsed = (currentUsage / monthlyLimit) * 100;

  // Only send warning at 80% threshold
  if (percentageUsed >= 80 && percentageUsed < 100) {
    // Don't send if already warned in the last 24 hours
    if (lastWarningTimestamp) {
      const hoursSinceLastWarning = (Date.now() - lastWarningTimestamp) / (1000 * 60 * 60);
      if (hoursSinceLastWarning < 24) {
        console.log('⏭️ Skipping usage warning - already sent in last 24 hours');
        return false;
      }
    }

    return await sendUsageWarningEmail({
      recipientEmail: userEmail,
      recipientName: userName,
      currentUsage,
      monthlyLimit,
      percentageUsed,
      remainingMinutes: monthlyLimit - currentUsage,
      planName,
      overageRate,
    });
  }

  return false;
}

/**
 * Send payment failed email - Dunning sequence (Day 1, 3, 5, or 7)
 */
export async function sendPaymentFailedEmail(data: PaymentFailedData): Promise<boolean> {
  try {
    const { client } = await getUncachableResendClient();

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.toUpperCase(),
    }).format(data.amount / 100);

    // Customize messaging based on dunning sequence day
    const urgencyLevels = {
      1: {
        color: '#f59e0b',
        icon: '⚠️',
        title: 'Payment Issue Detected',
        message: 'We had trouble processing your recent payment. This is usually a temporary issue that can be quickly resolved.',
        action: 'Please update your payment method to ensure uninterrupted service.',
      },
      3: {
        color: '#f59e0b',
        icon: '⚠️',
        title: 'Payment Still Pending',
        message: 'We\'re still having trouble processing your payment. Your account is currently in a grace period.',
        action: 'Please update your payment method soon to avoid service interruption.',
      },
      5: {
        color: '#dc2626',
        icon: '🚨',
        title: 'Urgent: Payment Required',
        message: `Your grace period expires on ${data.gracePeriodEndsAt}. After this date, your AI agents will be suspended.`,
        action: 'Update your payment method immediately to keep your service active.',
      },
      7: {
        color: '#dc2626',
        icon: '🚨',
        title: 'Final Notice: Service Suspension',
        message: 'Your grace period has expired. Your AI voice agents have been suspended due to payment failure.',
        action: 'Update your payment method now to reactivate your service.',
      },
    };

    const urgency = urgencyLevels[data.dayInSequence];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">VoiceBot</h1>
          </div>

          <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: ${urgency.color}; margin-top: 0; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 24px;">${urgency.icon}</span> ${urgency.title}
            </h2>

            <p style="font-size: 16px;">Hi ${data.recipientName},</p>

            <p style="font-size: 16px;">${urgency.message}</p>

            <div style="background: #fef3c7; border-left: 4px solid ${urgency.color}; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #92400e; font-size: 15px;">Amount Due:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong style="color: #92400e; font-size: 18px;">${formattedAmount}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92400e; font-size: 15px;">Invoice:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 15px;">#${data.invoiceNumber}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92400e; font-size: 15px;">Reason:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 15px;">${data.failureReason}</strong></td>
                </tr>
                ${data.dayInSequence < 7 ? `
                <tr>
                  <td style="padding: 8px 0; color: #92400e; font-size: 15px;">Grace Period Ends:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong style="color: ${urgency.color}; font-size: 15px;">${data.gracePeriodEndsAt}</strong></td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: #eff6ff; border: 1px solid #dbeafe; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; color: #1e40af; font-size: 15px;">
                <strong>What to do:</strong><br>
                ${urgency.action}
              </p>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${data.updatePaymentUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">Update Payment Method</a>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; color: #166534; font-size: 14px;">
                <strong>Questions?</strong> Contact our support team at <a href="mailto:billing@voicebot.one" style="color: #15803d; text-decoration: none;">billing@voicebot.one</a>
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
              This is an automated notification from VoiceBot. Attempt ${data.attemptCount} of automated payment retries.
              <br><br>
              Visit your <a href="https://voicebot.one/dashboard?tab=billing" style="color: #667eea; text-decoration: none;">Billing Dashboard</a> to manage your subscription.
            </p>
          </div>
        </body>
      </html>
    `;

    await client.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: `${urgency.icon} ${urgency.title} - ${formattedAmount} Payment Failed`,
      html: htmlContent,
    });

    console.log(`✅ Payment failed email (Day ${data.dayInSequence}) sent to:`, data.recipientEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send payment failed email:', error);
    return false;
  }
}

/**
 * Send subscription cancelled confirmation email
 */
export async function sendSubscriptionCancelledEmail(data: SubscriptionCancelledData): Promise<boolean> {
  try {
    const { client } = await getUncachableResendClient();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">VoiceBot</h1>
          </div>

          <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #6b7280; margin-top: 0; font-size: 22px;">Subscription Cancelled</h2>

            <p style="font-size: 16px;">Hi ${data.recipientName},</p>

            <p style="font-size: 16px;">Your <strong>${data.planName}</strong> subscription has been cancelled as of <strong>${data.cancellationDate}</strong>.</p>

            <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 25px; margin: 25px 0; border-radius: 10px;">
              <h3 style="margin-top: 0; color: #374151; font-size: 18px; margin-bottom: 15px;">What happens next?</h3>

              <ul style="margin: 10px 0; padding-left: 20px; color: #6b7280;">
                <li style="margin: 10px 0;">Your AI voice agents have been deactivated</li>
                <li style="margin: 10px 0;">Phone numbers have been released and are no longer active</li>
                <li style="margin: 10px 0;">Your account data will be retained for <strong>${data.dataRetentionDays} days</strong></li>
                <li style="margin: 10px 0;">No further charges will be made to your payment method</li>
              </ul>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1e40af; font-size: 15px;">
                <strong>Changed your mind?</strong><br>
                You can reactivate your subscription at any time within the next ${data.dataRetentionDays} days. Your previous configuration will be restored.
              </p>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${data.reactivationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">Reactivate Subscription</a>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 15px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Feedback Welcome:</strong> We'd love to hear why you cancelled. Your feedback helps us improve. Reply to this email to share your thoughts.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
              Thank you for using VoiceBot. We hope to serve you again in the future.
              <br><br>
              Questions? Contact us at <a href="mailto:support@voicebot.one" style="color: #667eea; text-decoration: none;">support@voicebot.one</a>
            </p>
          </div>
        </body>
      </html>
    `;

    await client.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: 'Subscription Cancelled - VoiceBot',
      html: htmlContent,
    });

    console.log('✅ Subscription cancelled email sent to:', data.recipientEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send subscription cancelled email:', error);
    return false;
  }
}

/**
 * Send renewal reminder email (3-7 days before renewal)
 */
export async function sendRenewalReminderEmail(data: RenewalReminderData): Promise<boolean> {
  try {
    const { client } = await getUncachableResendClient();

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.toUpperCase(),
    }).format(data.amount / 100);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">VoiceBot</h1>
            <p style="color: white; opacity: 0.95; margin: 10px 0 0 0; font-size: 16px;">Upcoming Renewal</p>
          </div>

          <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #374151; margin-top: 0; font-size: 22px;">Your Subscription Renews Soon</h2>

            <p style="font-size: 16px;">Hi ${data.recipientName},</p>

            <p style="font-size: 16px;">This is a friendly reminder that your <strong>${data.planName}</strong> subscription will automatically renew on <strong>${data.renewalDate}</strong>.</p>

            <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 25px; margin: 25px 0; border-radius: 10px;">
              <h3 style="margin-top: 0; color: #374151; font-size: 18px; margin-bottom: 20px;">Renewal Summary</h3>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; color: #6b7280; font-size: 15px;">Plan:</td>
                  <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 15px;">${data.planName}</strong></td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #6b7280; font-size: 15px;">Renewal Date:</td>
                  <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 15px;">${data.renewalDate}</strong></td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #6b7280; font-size: 15px;">Amount:</td>
                  <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 22px; color: #667eea;">${formattedAmount}</strong></td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #6b7280; font-size: 15px;">Payment Method:</td>
                  <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 15px;">${data.paymentMethod}</strong></td>
                </tr>
              </table>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; color: #166534; font-size: 15px;">
                <strong>✓ No action required</strong><br>
                Your subscription will renew automatically. We'll charge your payment method on file.
              </p>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="https://voicebot.one/dashboard?tab=billing" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4); margin-right: 10px;">View Billing Details</a>
              <a href="https://voicebot.one/dashboard?tab=billing" style="background: white; color: #667eea; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; border: 2px solid #667eea; font-size: 16px;">Update Payment Method</a>
            </div>

            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; color: #991b1b; font-size: 14px;">
                <strong>Need to cancel?</strong> You can cancel anytime from your billing dashboard. Cancellation takes effect at the end of your current billing period.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
              This is an automated reminder from VoiceBot.
              <br><br>
              To manage your notification preferences, visit your <a href="https://voicebot.one/dashboard?tab=billing" style="color: #667eea; text-decoration: none;">Billing Settings</a>.
            </p>
          </div>
        </body>
      </html>
    `;

    await client.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: `Subscription Renewing ${data.renewalDate} - ${formattedAmount}`,
      html: htmlContent,
    });

    console.log('✅ Renewal reminder email sent to:', data.recipientEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send renewal reminder email:', error);
    return false;
  }
}

/**
 * Send payment method expiring soon email
 */
export async function sendPaymentMethodExpiringEmail(data: PaymentMethodExpiringData): Promise<boolean> {
  try {
    const { client } = await getUncachableResendClient();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">VoiceBot</h1>
          </div>

          <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #f59e0b; margin-top: 0; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 24px;">💳</span> Payment Method Expiring Soon
            </h2>

            <p style="font-size: 16px;">Hi ${data.recipientName},</p>

            <p style="font-size: 16px;">Your payment method on file will expire in <strong>${data.daysUntilExpiry} days</strong>. To avoid service interruption, please update your payment information.</p>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #92400e; font-size: 15px;">Card Type:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 15px;">${data.cardBrand}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92400e; font-size: 15px;">Last 4 Digits:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 15px;">•••• ${data.last4}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92400e; font-size: 15px;">Expiration:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong style="color: #dc2626; font-size: 15px;">${String(data.expiryMonth).padStart(2, '0')}/${data.expiryYear}</strong></td>
                </tr>
              </table>
            </div>

            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; color: #991b1b; font-size: 15px;">
                <strong>⚠️ Action Required:</strong><br>
                If your card expires before your next billing date, your subscription renewal will fail and your service may be suspended.
              </p>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${data.updatePaymentUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">Update Payment Method</a>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; color: #166534; font-size: 14px;">
                <strong>Quick & Secure:</strong> Updating your payment method takes less than a minute and is protected by industry-standard encryption.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.5;">
              This is an automated notification from VoiceBot.
              <br><br>
              Questions? Contact us at <a href="mailto:billing@voicebot.one" style="color: #667eea; text-decoration: none;">billing@voicebot.one</a>
            </p>
          </div>
        </body>
      </html>
    `;

    await client.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: '💳 Payment Method Expiring Soon - Action Required',
      html: htmlContent,
    });

    console.log('✅ Payment method expiring email sent to:', data.recipientEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send payment method expiring email:', error);
    return false;
  }
}
