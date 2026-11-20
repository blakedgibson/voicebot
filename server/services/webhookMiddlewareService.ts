import fetch, { Response } from 'node-fetch';
import { EncryptionService } from './encryptionService';
import { storage } from '../storage';

export interface WebhookPayload {
  restaurant_id?: string;
  action: string;
  data: any;
  call_context?: {
    phone_number?: string;
    agent_id?: string;
    call_sid?: string;
    user_id?: string;
  };
}

export interface EnhancedWebhookPayload extends WebhookPayload {
  credentials: {
    pos_api_key?: string;
    pos_application_id?: string;
    google_client_id?: string;
    google_client_secret?: string;
    google_refresh_token?: string;
    retell_api_key?: string;
    [key: string]: string | undefined;
  };
  business_context?: {
    timezone?: string;
    current_time: string;
    is_open: boolean;
    accept_orders: boolean;
    accept_reservations: boolean;
    accept_after_hours: boolean;
  };
}

/**
 * Webhook Middleware Service
 * 
 * This service intercepts outbound webhook calls to n8n and injects
 * decrypted user credentials into the payload for secure API integrations.
 */
export class WebhookMiddlewareService {
  
  /**
   * Enhanced webhook call that injects decrypted credentials
   * @param url - The n8n webhook URL
   * @param payload - The original webhook payload
   * @param callContext - Context information for credential lookup
   */
  async callWebhookWithCredentials(
    url: string,
    payload: WebhookPayload,
    callContext: {
      phone_number?: string;
      agent_id?: string;
      call_sid?: string;
      user_id?: string;
    } = {}
  ): Promise<Response> {
    try {
      console.log(`🔐 Intercepting webhook call to: ${url}`);
      
      // Step 1: Determine user identification from call context
      const userId = await this.resolveUserId(callContext);
      if (!userId) {
        console.warn('⚠️ Could not resolve user ID for credential injection, proceeding without credentials');
        return await this.makeWebhookCall(url, payload);
      }

      // Step 2: Check business rules before processing
      const businessRulesCheck = await this.checkBusinessRules(userId, payload);
      if (!businessRulesCheck.allowed) {
        console.warn(`🚫 Business rules denied action '${payload.action}': ${businessRulesCheck.reason}`);
        
        // Return a mock successful response to avoid breaking the call flow
        // but the action won't be processed by n8n
        return new Response(JSON.stringify({
          success: false,
          blocked: true,
          reason: businessRulesCheck.reason,
          message: businessRulesCheck.message
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }) as Response;
      }

      // Step 3: Retrieve and decrypt user credentials
      const credentials = await this.getUserCredentials(userId);
      
      // Step 4: Enhance payload with decrypted credentials and business context
      const enhancedPayload: EnhancedWebhookPayload = {
        ...payload,
        restaurant_id: userId, // Include restaurant/user identification
        call_context: callContext,
        credentials,
        business_context: {
          timezone: businessRulesCheck.businessSettings?.timezone,
          current_time: new Date().toISOString(),
          is_open: businessRulesCheck.businessSettings ? this.isBusinessOpen(businessRulesCheck.businessSettings) : true,
          accept_orders: businessRulesCheck.businessSettings?.acceptOrders ?? true,
          accept_reservations: businessRulesCheck.businessSettings?.acceptReservations ?? true,
          accept_after_hours: businessRulesCheck.businessSettings?.acceptAfterHours ?? false
        }
      };

      // Step 5: Forward enhanced payload to n8n
      console.log(`✅ Enhanced webhook payload with ${Object.keys(credentials).length} credential(s) and business context`);
      return await this.makeWebhookCall(url, enhancedPayload);
      
    } catch (error) {
      console.error('❌ Error in webhook middleware:', error);
      // Fallback: send original payload without credentials
      console.log('🔄 Falling back to original payload without credentials');
      return await this.makeWebhookCall(url, payload);
    }
  }

  /**
   * Resolve user ID from various call context sources
   */
  private async resolveUserId(callContext: {
    phone_number?: string;
    agent_id?: string;
    call_sid?: string;
    user_id?: string;
  }): Promise<string | null> {
    
    // Direct user ID provided
    if (callContext.user_id) {
      return callContext.user_id;
    }

    // Resolve from phone number
    if (callContext.phone_number) {
      try {
        // We'd need to add a method to search by phone number or iterate through assignments
        // For now, we'll log this limitation and rely on other methods
        console.log(`Phone number resolution not yet implemented for: ${callContext.phone_number}`);
      } catch (error) {
        console.warn(`Could not resolve user from phone number ${callContext.phone_number}:`, error);
      }
    }

    // Resolve from agent ID
    if (callContext.agent_id) {
      try {
        const agent = await storage.getVoiceAgent(callContext.agent_id);
        if (agent) {
          return agent.userId;
        }
      } catch (error) {
        console.warn(`Could not resolve user from agent ID ${callContext.agent_id}:`, error);
      }
    }

    // Resolve from call SID (via telephony logs)
    if (callContext.call_sid) {
      try {
        const callLog = await storage.getTelephonyCallLogByTwilioSid(callContext.call_sid);
        if (callLog) {
          // Try to extract user context from call log or associated phone number
          // This would require additional logic based on your call log structure
          console.log('Call log found but user resolution from call SID not yet implemented');
        }
      } catch (error) {
        console.warn(`Could not resolve user from call SID ${callContext.call_sid}:`, error);
      }
    }

    return null;
  }

  /**
   * Retrieve and decrypt all credentials for a user
   */
  private async getUserCredentials(userId: string): Promise<Record<string, string | undefined>> {
    const credentials: Record<string, string | undefined> = {};

    try {
      // First, retrieve the platform preference
      let selectedPlatform = 'square'; // default
      try {
        const platformCredential = await storage.getUserCredentials(userId, 'platform', 'selected_platform');
        if (platformCredential && platformCredential.isActive) {
          const decryptedPlatform = EncryptionService.decrypt(
            platformCredential.encryptedData,
            platformCredential.encryptionIv,
            platformCredential.encryptionTag
          );
          selectedPlatform = decryptedPlatform;
          credentials['pos_platform'] = selectedPlatform;
          console.log(`🏢 Retrieved platform preference: ${selectedPlatform} for user ${userId}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not retrieve platform preference for user ${userId}, defaulting to square:`, error);
      }

      // Define platform-specific credential mappings
      const integrationMappings = [
        // Platform preference
        // Square POS credentials (when platform is square)
        ...(selectedPlatform === 'square' ? [
          { integrationType: 'square_pos', credentialName: 'app_id', outputKey: 'pos_api_key' },
          { integrationType: 'square_pos', credentialName: 'access_token', outputKey: 'pos_access_token' },
          { integrationType: 'square_pos', credentialName: 'location_id', outputKey: 'pos_location_id' }
        ] : []),
        // Toast POS credentials (when platform is toast)
        ...(selectedPlatform === 'toast' ? [
          { integrationType: 'toast_pos', credentialName: 'client_key', outputKey: 'pos_api_key' },
          { integrationType: 'toast_pos', credentialName: 'client_secret', outputKey: 'pos_client_secret' },
          { integrationType: 'toast_pos', credentialName: 'location_id', outputKey: 'pos_location_id' }
        ] : []),
        // Clover POS credentials (when platform is clover)
        ...(selectedPlatform === 'clover' ? [
          { integrationType: 'clover_pos', credentialName: 'app_id', outputKey: 'pos_api_key' },
          { integrationType: 'clover_pos', credentialName: 'app_secret', outputKey: 'pos_app_secret' },
          { integrationType: 'clover_pos', credentialName: 'merchant_id', outputKey: 'pos_merchant_id' }
        ] : []),
        // Google Calendar credentials (common for all platforms)
        { integrationType: 'google_calendar', credentialName: 'client_id', outputKey: 'google_client_id' },
        { integrationType: 'google_calendar', credentialName: 'client_secret', outputKey: 'google_client_secret' },
        { integrationType: 'google_calendar', credentialName: 'calendar_id', outputKey: 'google_calendar_id' },
        // Retell AI credentials
        { integrationType: 'retell_ai', credentialName: 'api_key', outputKey: 'retell_api_key' }
      ];

      // Retrieve and decrypt each credential
      for (const mapping of integrationMappings) {
        try {
          const encryptedCredential = await storage.getUserCredentials(
            userId, 
            mapping.integrationType, 
            mapping.credentialName
          );

          if (encryptedCredential && encryptedCredential.isActive) {
            // Decrypt the credential using our encryption service
            const decryptedValue = EncryptionService.decrypt(
              encryptedCredential.encryptedData,
              encryptedCredential.encryptionIv,
              encryptedCredential.encryptionTag
            );

            credentials[mapping.outputKey] = decryptedValue;
            console.log(`🔓 Successfully decrypted ${mapping.outputKey} for user ${userId}`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not decrypt ${mapping.outputKey} for user ${userId}:`, error);
          // Continue with other credentials even if one fails
        }
      }

    } catch (error) {
      console.error('❌ Error retrieving user credentials:', error);
    }

    return credentials;
  }

  /**
   * Make the actual HTTP request to the webhook URL
   */
  private async makeWebhookCall(url: string, payload: any): Promise<Response> {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VoiceBot-WebhookMiddleware/1.0'
      },
      body: JSON.stringify(payload)
    });
  }

  /**
   * Check business rules before processing webhook actions
   */
  private async checkBusinessRules(
    userId: string, 
    payload: WebhookPayload
  ): Promise<{
    allowed: boolean;
    reason?: string;
    message?: string;
    businessSettings?: any;
  }> {
    try {
      // Get business settings for the user
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // If no settings exist, allow all actions (default behavior)
      if (!businessSettings) {
        console.log(`🔓 No business settings found for user ${userId}, allowing all actions`);
        return { allowed: true };
      }

      // Check if business is currently open
      const isCurrentlyOpen = this.isBusinessOpen(businessSettings);
      const currentTime = new Date();
      
      console.log(`🏢 Business settings check for user ${userId}:`);
      console.log(`  - Accept Orders: ${businessSettings.acceptOrders}`);
      console.log(`  - Accept Reservations: ${businessSettings.acceptReservations}`);
      console.log(`  - Accept After Hours: ${businessSettings.acceptAfterHours}`);
      console.log(`  - Currently Open: ${isCurrentlyOpen}`);
      console.log(`  - Current Time: ${currentTime.toISOString()}`);
      console.log(`  - Action: ${payload.action}`);

      // Check action-specific rules
      const action = payload.action.toLowerCase();
      
      // Order-related actions
      if (action.includes('order') || action.includes('cart') || action.includes('menu')) {
        if (!businessSettings.acceptOrders) {
          return {
            allowed: false,
            reason: 'orders_disabled',
            message: 'Sorry, we are not accepting orders at this time.',
            businessSettings
          };
        }
        
        // Check if orders are within business hours (unless after-hours orders are allowed)
        if (!isCurrentlyOpen && !businessSettings.acceptAfterHours) {
          return {
            allowed: false,
            reason: 'outside_business_hours',
            message: 'Sorry, we are currently closed for orders. Please call back during business hours.',
            businessSettings
          };
        }
        
        // Check order cutoff time
        const orderCutoff = this.parseTimeToMinutes(businessSettings.orderCutoffTime || '21:30');
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        
        if (currentMinutes > orderCutoff) {
          return {
            allowed: false,
            reason: 'past_order_cutoff',
            message: `Sorry, we stop taking orders at ${businessSettings.orderCutoffTime}. Please call back tomorrow.`,
            businessSettings
          };
        }
      }
      
      // Reservation-related actions
      if (action.includes('reservation') || action.includes('booking') || action.includes('table')) {
        if (!businessSettings.acceptReservations) {
          return {
            allowed: false,
            reason: 'reservations_disabled',
            message: 'Sorry, we are not accepting reservations at this time.',
            businessSettings
          };
        }
        
        // Check reservation lead time requirements
        if (businessSettings.reservationLeadTime && payload.data?.reservation_time) {
          const reservationTime = new Date(payload.data.reservation_time);
          const leadTimeMs = (businessSettings.reservationLeadTime || 60) * 60 * 1000; // Convert minutes to ms
          const earliestAllowedTime = new Date(currentTime.getTime() + leadTimeMs);
          
          if (reservationTime < earliestAllowedTime) {
            return {
              allowed: false,
              reason: 'insufficient_lead_time',
              message: `Sorry, reservations require at least ${businessSettings.reservationLeadTime} minutes notice.`,
              businessSettings
            };
          }
        }
      }

      console.log(`✅ Business rules check passed for action: ${payload.action}`);
      return { 
        allowed: true, 
        businessSettings 
      };

    } catch (error) {
      console.error('❌ Error checking business rules:', error);
      // On error, allow the action to proceed (fail open)
      return { allowed: true };
    }
  }

  /**
   * Check if business is currently open based on business hours and timezone
   */
  private isBusinessOpen(businessSettings: any): boolean {
    try {
      if (!businessSettings.businessHours) {
        return true; // No restrictions if business hours not set
      }

      const now = new Date();
      
      // Convert to business timezone if specified
      const timezone = businessSettings.timezone || 'America/New_York';
      const localTime = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'long'
      }).formatToParts(now);

      const dayOfWeek = localTime.find(part => part.type === 'weekday')?.value.toLowerCase();
      const hour = parseInt(localTime.find(part => part.type === 'hour')?.value || '0');
      const minute = parseInt(localTime.find(part => part.type === 'minute')?.value || '0');
      const currentMinutes = hour * 60 + minute;

      if (!dayOfWeek || !businessSettings.businessHours[dayOfWeek]) {
        return false;
      }

      const daySettings = businessSettings.businessHours[dayOfWeek];
      
      // Check if the business is open on this day
      if (!daySettings.isOpen) {
        return false;
      }

      // Parse open and close times
      const openMinutes = this.parseTimeToMinutes(daySettings.open);
      const closeMinutes = this.parseTimeToMinutes(daySettings.close);

      // Handle overnight hours (e.g., open 22:00, close 02:00)
      if (closeMinutes < openMinutes) {
        return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
      }

      // Normal hours (e.g., open 09:00, close 22:00)
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

    } catch (error) {
      console.warn('Error checking business hours:', error);
      return true; // Default to open on error
    }
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  private parseTimeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Utility method to check if a URL is an n8n webhook URL
   */
  static isN8nWebhookUrl(url: string): boolean {
    return url.includes('n8n') && url.includes('/webhook/');
  }
}

// Export singleton instance
export const webhookMiddlewareService = new WebhookMiddlewareService();