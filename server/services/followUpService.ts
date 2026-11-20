import { twilioService } from './twilioService';
import fetch from 'node-fetch';

export interface FollowUpConfig {
  autoFollowUpEnabled: boolean;
  followUpSmsEnabled: boolean;
  followUpEmailEnabled: boolean;
  followUpTemplate?: string;
  followUpDelayMinutes: number;
  contactEmail?: string;
  menuPdfUrl?: string;
  onlineOrderingUrl?: string;
}

export interface FollowUpData {
  customerPhone: string;
  customerEmail?: string;
  businessName: string;
  callDuration?: number;
  callReason?: string;
  wasCompleted: boolean;
}

export interface FollowUpResult {
  smsSent: boolean;
  emailSent: boolean;
  smsDelivered?: boolean;
  emailDelivered?: boolean;
  message: string;
}

export class FollowUpService {

  /**
   * Send automated follow-up after missed or incomplete call
   */
  async sendFollowUp(
    followUpData: FollowUpData,
    config: FollowUpConfig
  ): Promise<FollowUpResult> {
    console.log(`📞 Sending follow-up for ${followUpData.businessName} to ${followUpData.customerPhone}`);

    if (!config.autoFollowUpEnabled) {
      return {
        smsSent: false,
        emailSent: false,
        message: 'Follow-up automation is disabled'
      };
    }

    const result: FollowUpResult = {
      smsSent: false,
      emailSent: false,
      message: ''
    };

    // Generate personalized follow-up message
    const followUpMessage = this.generateFollowUpMessage(followUpData, config);

    // Send SMS if enabled
    if (config.followUpSmsEnabled && followUpData.customerPhone) {
      try {
        const smsResult = await this.sendFollowUpSms(
          followUpData.customerPhone,
          followUpMessage,
          config
        );
        result.smsSent = smsResult.success;
        result.smsDelivered = smsResult.delivered;
      } catch (error) {
        console.error('❌ Failed to send follow-up SMS:', error);
      }
    }

    // Send email if enabled and email available
    if (config.followUpEmailEnabled && followUpData.customerEmail) {
      try {
        const emailResult = await this.sendFollowUpEmail(
          followUpData.customerEmail,
          followUpMessage,
          followUpData.businessName,
          config
        );
        result.emailSent = emailResult.success;
        result.emailDelivered = emailResult.delivered;
      } catch (error) {
        console.error('❌ Failed to send follow-up email:', error);
      }
    }

    // Generate result message
    if (result.smsSent || result.emailSent) {
      result.message = `Follow-up sent via ${result.smsSent ? 'SMS' : ''}${result.smsSent && result.emailSent ? ' and ' : ''}${result.emailSent ? 'email' : ''}`;
    } else {
      result.message = 'No follow-up sent';
    }

    console.log(`✅ Follow-up completed: ${result.message}`);
    return result;
  }

  /**
   * Send SMS follow-up using Twilio
   */
  private async sendFollowUpSms(
    phoneNumber: string,
    message: string,
    config: FollowUpConfig
  ): Promise<{ success: boolean; delivered: boolean; messageId?: string }> {
    try {
      console.log(`📱 Sending follow-up SMS to ${phoneNumber}`);

      // Use existing Twilio service to send SMS
      const result = await twilioService.sendSMS(phoneNumber, message);

      if (result.success) {
        console.log(`✅ Follow-up SMS sent successfully: ${result.sid}`);
        return {
          success: true,
          delivered: true, // Twilio will handle delivery status
          messageId: result.sid
        };
      } else {
        console.error(`❌ Failed to send follow-up SMS: ${result.error}`);
        return { success: false, delivered: false };
      }

    } catch (error) {
      console.error('❌ SMS sending error:', error);
      return { success: false, delivered: false };
    }
  }

  /**
   * Send email follow-up (mock implementation - integrate with your email service)
   */
  private async sendFollowUpEmail(
    emailAddress: string,
    message: string,
    businessName: string,
    config: FollowUpConfig
  ): Promise<{ success: boolean; delivered: boolean; messageId?: string }> {
    try {
      console.log(`📧 Sending follow-up email to ${emailAddress}`);

      // This is a mock implementation
      // In production, integrate with SendGrid, AWS SES, or similar service
      const emailData = {
        to: emailAddress,
        from: config.contactEmail || 'noreply@voicecrafter.com',
        subject: `Thank you for contacting ${businessName}!`,
        html: this.generateEmailHtml(message, businessName, config),
        text: message
      };

      // Mock successful email send
      // Replace with actual email service integration
      const mockEmailResponse = {
        success: true,
        messageId: `email_${Date.now()}_${Math.random().toString(36).substring(2)}`
      };

      if (mockEmailResponse.success) {
        console.log(`✅ Follow-up email sent successfully: ${mockEmailResponse.messageId}`);
        return {
          success: true,
          delivered: true,
          messageId: mockEmailResponse.messageId
        };
      } else {
        return { success: false, delivered: false };
      }

    } catch (error) {
      console.error('❌ Email sending error:', error);
      return { success: false, delivered: false };
    }
  }

  /**
   * Generate personalized follow-up message
   */
  private generateFollowUpMessage(followUpData: FollowUpData, config: FollowUpConfig): string {
    // Use custom template if provided
    if (config.followUpTemplate) {
      return config.followUpTemplate
        .replace('{businessName}', followUpData.businessName)
        .replace('{customerPhone}', followUpData.customerPhone)
        .replace('{menuLink}', config.menuPdfUrl || '')
        .replace('{orderingLink}', config.onlineOrderingUrl || '');
    }

    // Generate default message based on call context
    let message = `Sorry we missed your call at ${followUpData.businessName}! `;

    if (!followUpData.wasCompleted) {
      message += `We'd love to help you with your inquiry. `;
    }

    // Add helpful links
    const links: string[] = [];
    
    if (config.menuPdfUrl) {
      links.push(`View our menu: ${config.menuPdfUrl}`);
    }
    
    if (config.onlineOrderingUrl) {
      links.push(`Order online: ${config.onlineOrderingUrl}`);
    }

    if (links.length > 0) {
      message += `Here are some helpful links: ${links.join(' • ')}. `;
    }

    message += `Feel free to call us back anytime. We look forward to serving you!`;

    return message;
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHtml(message: string, businessName: string, config: FollowUpConfig): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank you for contacting ${businessName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${businessName}</h1>
            <p>Thank you for reaching out!</p>
        </div>
        <div class="content">
            <p>${message.replace(/\n/g, '<br>')}</p>
            
            ${config.menuPdfUrl ? `<a href="${config.menuPdfUrl}" class="button">View Menu</a>` : ''}
            ${config.onlineOrderingUrl ? `<a href="${config.onlineOrderingUrl}" class="button">Order Online</a>` : ''}
            
            <p>We appreciate your interest and look forward to serving you soon!</p>
            <p>Best regards,<br>The ${businessName} Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message from ${businessName}.</p>
            ${config.contactEmail ? `<p>Contact us: ${config.contactEmail}</p>` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Schedule delayed follow-up
   */
  async scheduleFollowUp(
    followUpData: FollowUpData,
    config: FollowUpConfig,
    delayMinutes?: number
  ): Promise<void> {
    const delay = (delayMinutes || config.followUpDelayMinutes) * 60 * 1000; // Convert to milliseconds
    
    console.log(`⏰ Scheduling follow-up in ${delay / 60000} minutes for ${followUpData.customerPhone}`);

    setTimeout(async () => {
      await this.sendFollowUp(followUpData, config);
    }, delay);
  }

  /**
   * Check if call qualifies for follow-up
   */
  shouldSendFollowUp(callDuration: number, callStatus: string, detectedIntents: string[]): boolean {
    // Send follow-up for:
    // 1. Very short calls (likely missed or dropped)
    // 2. Calls that ended abruptly
    // 3. Calls with unresolved intents (reservation requests, etc.)
    
    const shortCallThreshold = 30; // seconds
    const unresolved = ['reservation', 'ordering', 'inquiry'].some(intent => 
      detectedIntents.includes(intent)
    );

    return (
      callDuration < shortCallThreshold ||
      callStatus === 'failed' ||
      callStatus === 'busy' ||
      callStatus === 'no-answer' ||
      unresolved
    );
  }

  /**
   * Generate follow-up templates for different scenarios
   */
  getFollowUpTemplates(): { [key: string]: string } {
    return {
      'missed_call': "Sorry we missed your call at {businessName}! We're here to help. View our menu: {menuLink} or call us back anytime. We look forward to serving you!",
      
      'reservation_request': "Thanks for calling {businessName} about a reservation! We'd love to get you a table. Please call us back or visit {orderingLink} to book. We can't wait to see you!",
      
      'ordering_inquiry': "Hi from {businessName}! We'd be happy to help with your order. Check out our menu: {menuLink} or order online: {orderingLink}. Thanks for thinking of us!",
      
      'general_inquiry': "Thank you for contacting {businessName}! We're here to answer any questions. Feel free to call back or visit {menuLink} for more info. We appreciate your interest!",
      
      'short_call': "We noticed your call to {businessName} was brief - we want to make sure you got the help you needed! Please call back anytime or check {menuLink}. We're here for you!"
    };
  }
}

export const followUpService = new FollowUpService();