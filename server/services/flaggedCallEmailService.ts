/**
 * Flagged Call Email Notification Service
 * Sends email alerts when a call is flagged for follow-up
 * Emails sent from: notifications@voicebot.one
 */

import { getUncachableResendClient } from './resendService';

const FROM_EMAIL = 'VoiceBot <notifications@voicebot.one>';

export async function sendFlaggedCallEmail(params: {
  toEmail: string;
  toName?: string;
  callId: string;
  customerName?: string;
  phoneNumber?: string;
  duration?: number;
  startTime?: string;
  callSummary?: string;
}): Promise<boolean> {
  const { toEmail, toName, callId, customerName, phoneNumber, duration, startTime, callSummary } = params;

  const displayName = toName || 'there';
  const callerLabel = customerName || (phoneNumber ? phoneNumber : 'Unknown caller');
  const durationText = duration ? `${Math.round(duration / 60)}m ${duration % 60}s` : 'N/A';
  const timeText = startTime
    ? new Date(startTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Unknown time';
  const dashboardUrl = 'https://voicebot.one/dashboard';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">VoiceBot</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">AI Receptionist Alert</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">🚩 Call Flagged for Follow-up</h2>
          <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">Hi ${displayName}, your AI receptionist flagged a call that needs your attention.</p>

          <!-- Call Details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">CALL DETAILS</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding-bottom:12px;width:100px;">Caller</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding-bottom:12px;">${callerLabel}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding-bottom:12px;">Time</td>
                  <td style="color:#111827;font-size:14px;padding-bottom:12px;">${timeText}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;">Duration</td>
                  <td style="color:#111827;font-size:14px;">${durationText}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          ${callSummary ? `
          <!-- AI Summary -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="border-left:3px solid #dc2626;padding:16px 20px;background:#fef2f2;border-radius:0 6px 6px 0;">
              <p style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">AI SUMMARY</p>
              <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">${callSummary}</p>
            </td></tr>
          </table>` : ''}

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-top:8px;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">View Call in Dashboard</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            You're receiving this because Email Alerts are enabled in your VoiceBot notification settings.<br>
            <a href="${dashboardUrl}" style="color:#6b7280;text-decoration:underline;">Manage settings</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { client } = await getUncachableResendClient();

    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `🚩 Call Flagged for Follow-up — ${callerLabel}`,
      html,
    });

    if (error) {
      console.error('❌ Resend error sending flagged call email:', error);
      return false;
    }

    console.log(`✅ Flagged call email sent to ${toEmail}, id: ${data?.id}`);
    return true;
  } catch (err) {
    console.error('❌ Exception sending flagged call email:', err);
    return false;
  }
}
