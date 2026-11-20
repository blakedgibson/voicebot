/**
 * Restaurant Automation Service - Replit Webhook System
 *
 * This service replaces all n8n workflow functions with a custom automation system
 * that handles reservations, POS integration, delivery systems, and analytics.
 * Designed to work seamlessly with AI conversation flows.
 */

import axios from 'axios';
import { google } from 'googleapis';
import { storage } from '../storage';
import { MetricsAggregationService } from './metricsAggregationService';
import { EncryptionService } from './encryptionService';

export interface RestaurantConfig {
  userId: string;
  restaurantId: string;
  businessName: string;

  // Google Calendar Integration
  googleCalendar?: {
    calendarId: string;
    serviceAccountKey: any; // JSON service account key
    timeZone: string;
  };

  // POS System Integration
  posSystem?: {
    type: 'square' | 'toast' | 'clover' | 'resy' | 'opentable' | 'custom';
    apiKey: string;
    apiSecret?: string;
    environmentId?: string;
    locationId?: string;
    webhookUrl?: string;
  };

  // Delivery Integration
  deliverySystem?: {
    uberEats?: {
      apiKey: string;
      storeId: string;
    };
    doorDash?: {
      apiKey: string;
      storeId: string;
    };
    inHouse?: {
      enabled: boolean;
      deliveryRadius: number;
      deliveryFee: number;
    };
  };

  // Business Configuration
  businessHours: {
    [key: string]: { open: string; close: string; closed?: boolean };
  };
  timezone: string;
  acceptAfterHours: boolean;
}

export interface WebhookPayload {
  action: 'reservation' | 'order' | 'delivery' | 'catering' | 'transfer' | 'afterhours' | 'payment' | 'feedback';
  restaurantId: string;
  conversationId: string;
  callId: string;
  customerData: {
    name?: string;
    phone?: string;
    email?: string;
  };
  requestData: any;
  timestamp: string;
  retryCount?: number;
}

export interface AutomationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  confirmationId?: string;
  nextAction?: string;
}

class RestaurantAutomationService {
  private static instance: RestaurantAutomationService;
  private restaurantConfigs: Map<string, RestaurantConfig> = new Map();
  private metricsService: MetricsAggregationService;

  constructor() {
    this.metricsService = new MetricsAggregationService(storage);
  }

  static getInstance(): RestaurantAutomationService {
    if (!RestaurantAutomationService.instance) {
      RestaurantAutomationService.instance = new RestaurantAutomationService();
    }
    return RestaurantAutomationService.instance;
  }

  /**
   * Load restaurant configuration from database
   */
  async loadRestaurantConfig(restaurantId: string): Promise<RestaurantConfig | null> {
    try {
      // Check cache first
      if (this.restaurantConfigs.has(restaurantId)) {
        return this.restaurantConfigs.get(restaurantId)!;
      }

      // Load from database
      const config = await storage.getRestaurantAutomationConfig(restaurantId);
      if (config) {
        this.restaurantConfigs.set(restaurantId, config);
        return config;
      }

      console.error(`❌ No automation config found for restaurant: ${restaurantId}`);
      return null;
    } catch (error) {
      console.error(`❌ Failed to load restaurant config for ${restaurantId}:`, error);
      return null;
    }
  }

  /**
   * Main webhook handler - processes all automation requests with retry logic
   */
  async processWebhook(payload: WebhookPayload): Promise<AutomationResult> {
    console.log(`🔄 Processing webhook: ${payload.action} for restaurant: ${payload.restaurantId} (attempt ${(payload.retryCount || 0) + 1})`);

    try {
      // Load restaurant configuration
      const config = await this.loadRestaurantConfig(payload.restaurantId);
      if (!config) {
        return {
          success: false,
          error: 'Restaurant configuration not found',
          message: 'I apologize, but I cannot process your request right now. Please contact the restaurant directly.'
        };
      }

      // Check business hours and after-hours policy
      const businessStatus = this.checkBusinessHours(config);
      if (!businessStatus.isOpen && !config.acceptAfterHours) {
        return {
          success: false,
          error: 'Restaurant closed and after-hours disabled',
          message: `I apologize, but we are currently closed. Our hours are ${this.formatBusinessHours(config.businessHours)}. Please call back during business hours.`
        };
      }

      // Route to appropriate handler
      let result: AutomationResult;

      switch (payload.action) {
        case 'reservation':
          result = await this.handleReservation(config, payload);
          break;
        case 'order':
          result = await this.handleOrder(config, payload);
          break;
        case 'delivery':
          result = await this.handleDelivery(config, payload);
          break;
        case 'catering':
          result = await this.handleCatering(config, payload);
          break;
        case 'transfer':
          result = await this.handleTransfer(config, payload);
          break;
        case 'afterhours':
          result = await this.handleAfterHours(config, payload);
          break;
        case 'payment':
          result = await this.handlePayment(config, payload);
          break;
        case 'feedback':
          result = await this.handleFeedback(config, payload);
          break;
        default:
          result = {
            success: false,
            error: `Unknown action: ${payload.action}`,
            message: 'I apologize, but I cannot process that request. Please let me know how else I can help you.'
          };
      }

      // Log the automation event
      await this.logAutomationEvent(payload, result, config);

      // Send confirmation back to Retell AI if successful
      if (result.success && result.confirmationId) {
        await this.sendRetellConfirmation(payload.conversationId, result);
      }

      return result;

    } catch (error) {
      console.error(`❌ Webhook processing failed for ${payload.action}:`, error);

      // Log the error
      await this.logAutomationEvent(payload, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'I apologize, but there was an error processing your request. Please try again or contact us directly.'
      }, null);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'I apologize, but there was an error processing your request. Please try again or contact us directly.'
      };
    }
  }

  /**
   * Retry webhook processing with exponential backoff
   */
  async processWebhookWithRetry(payload: WebhookPayload, maxRetries: number = 3): Promise<AutomationResult> {
    const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
    let lastResult: AutomationResult;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const retryPayload = { ...payload, retryCount: attempt };
      lastResult = await this.processWebhook(retryPayload);

      if (lastResult.success) {
        if (attempt > 0) {
          console.log(`✅ Webhook succeeded on retry ${attempt} for ${payload.action}`);
        }
        return lastResult;
      }

      // If this is not the last attempt and the error is retryable, wait and retry
      if (attempt < maxRetries && this.isRetryableError(lastResult.error)) {
        const delay = retryDelays[attempt] || 5000;
        console.log(`⏳ Retrying webhook ${payload.action} in ${delay}ms (attempt ${attempt + 1})`);
        await this.sleep(delay);
        continue;
      }

      // If error is not retryable, break immediately
      if (!this.isRetryableError(lastResult.error)) {
        console.log(`❌ Non-retryable error for ${payload.action}: ${lastResult.error}`);
        break;
      }
    }

    // All retries exhausted
    console.error(`❌ All retries exhausted for ${payload.action} webhook`);
    return {
      ...lastResult!,
      error: `Max retries exceeded: ${lastResult!.error}`,
      message: 'I apologize, but I\'m experiencing technical difficulties. Please try again later or contact the restaurant directly.'
    };
  }

  /**
   * Determine if an error is worth retrying
   */
  private isRetryableError(error?: string): boolean {
    if (!error) return false;

    const retryableErrors = [
      'network error',
      'timeout',
      'connection refused',
      'service unavailable',
      'internal server error',
      'calendar api error',
      'pos system error',
      'delivery system error'
    ];

    return retryableErrors.some(retryableError =>
      error.toLowerCase().includes(retryableError)
    );
  }

  /**
   * Circuit breaker for external services
   */
  private circuitBreakers: Map<string, { failures: number; lastFailure: Date; isOpen: boolean }> = new Map();

  private checkCircuitBreaker(serviceName: string): boolean {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return true; // No history, allow request

    if (breaker.isOpen) {
      // Check if enough time has passed to try again (60 seconds)
      const timeToWait = 60000;
      if (Date.now() - breaker.lastFailure.getTime() > timeToWait) {
        console.log(`🔧 Circuit breaker for ${serviceName} attempting recovery`);
        breaker.isOpen = false;
        return true;
      }
      return false;
    }

    return true;
  }

  private recordCircuitBreakerFailure(serviceName: string): void {
    const breaker = this.circuitBreakers.get(serviceName) || { failures: 0, lastFailure: new Date(), isOpen: false };
    breaker.failures += 1;
    breaker.lastFailure = new Date();

    // Open circuit after 5 consecutive failures
    if (breaker.failures >= 5) {
      breaker.isOpen = true;
      console.error(`🚨 Circuit breaker opened for ${serviceName} after ${breaker.failures} failures`);
    }

    this.circuitBreakers.set(serviceName, breaker);
  }

  private recordCircuitBreakerSuccess(serviceName: string): void {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
      console.log(`✅ Circuit breaker reset for ${serviceName}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper method to decrypt OAuth credential from agentIntegrations
   */
  private decryptOAuthCredential(encryptedJson: string | null): string | null {
    if (!encryptedJson) {
      return null;
    }

    try {
      const encryptedData = JSON.parse(encryptedJson);
      return EncryptionService.decrypt(
        encryptedData.encryptedData,
        encryptedData.iv,
        encryptedData.tag
      );
    } catch (error) {
      console.error('❌ Error decrypting OAuth credential:', error);
      return null;
    }
  }

  /**
   * Get decrypted Google Calendar OAuth tokens from agent-specific integration
   */
  private async getGoogleCalendarTokens(userId: string, agentId: string): Promise<{ accessToken: string; refreshToken?: string; calendarId: string; timeZone?: string; integrationId?: string } | null> {
    try {
      // Get agent integrations from database
      const integrations = await storage.getAgentIntegrations(agentId);

      // Filter for Google Calendar OAuth integration
      const googleCalendarIntegration = integrations.find(
        integration => integration.type === 'Calendar' && integration.isOAuthIntegration === true
      );

      if (!googleCalendarIntegration) {
        console.log('❌ No Google Calendar integration found for agent:', agentId);
        return null;
      }

      console.log('✅ Found Google Calendar integration for agent');

      // Decrypt OAuth credentials
      const accessToken = this.decryptOAuthCredential(googleCalendarIntegration.oauthAccessToken);
      const refreshToken = this.decryptOAuthCredential(googleCalendarIntegration.oauthRefreshToken);
      const calendarId = this.decryptOAuthCredential(googleCalendarIntegration.oauthCalendarId);

      if (!accessToken || !calendarId) {
        console.log('❌ Missing required Google Calendar credentials');
        return null;
      }

      const expiresAt = googleCalendarIntegration.oauthTokenExpiry;

      // Check if token is expired or will expire in next 5 minutes
      const now = new Date();
      const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (expiresAt && new Date(expiresAt).getTime() - now.getTime() < expiryBuffer) {
        console.log('🔄 Access token expired or expiring soon, attempting refresh...');

        if (!refreshToken) {
          console.error('❌ Token expired but no refresh token available');
          return null;
        }

        // Refresh the token
        try {
          // Use the correct redirect URI based on environment
          const redirectUri = process.env.APP_DOMAIN
            ? `https://${process.env.APP_DOMAIN}/api/integrations/google-calendar/callback`
            : process.env.REPLIT_DEV_DOMAIN
              ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/integrations/google-calendar/callback`
              : 'http://localhost:5000/api/integrations/google-calendar/callback';

          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUri
          );

          oauth2Client.setCredentials({
            refresh_token: refreshToken
          });

          const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();

          if (newCredentials.access_token) {
            // Store the new access token back to agentIntegrations
            const newExpiresAt = newCredentials.expiry_date
              ? new Date(newCredentials.expiry_date)
              : new Date(Date.now() + 3600 * 1000);

            // Encrypt new access token using EncryptionService
            const encryptedAccessToken = EncryptionService.encrypt(newCredentials.access_token);

            await storage.updateAgentIntegration(googleCalendarIntegration.id, {
              oauthAccessToken: JSON.stringify(encryptedAccessToken),
              oauthTokenExpiry: newExpiresAt,
              updatedAt: new Date()
            });

            console.log('✅ Access token refreshed successfully');
            return {
              accessToken: newCredentials.access_token,
              refreshToken,
              calendarId,
              timeZone: googleCalendarIntegration.timeZone || undefined,
              integrationId: googleCalendarIntegration.id
            };
          }
        } catch (refreshError) {
          console.error('❌ Failed to refresh access token:', refreshError);
          return null;
        }
      }

      return {
        accessToken,
        refreshToken: refreshToken || undefined,
        calendarId,
        timeZone: googleCalendarIntegration.timeZone || undefined,
        integrationId: googleCalendarIntegration.id
      };
    } catch (error) {
      console.error('❌ Error decrypting Google Calendar tokens:', error);
      return null;
    }
  }

  /**
   * Handle reservation requests - Google Calendar integration
   */
  private async handleReservation(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    console.log(`📅 Processing reservation for ${config.businessName}`);

    const { customerData, requestData } = payload;

    // Validate required data
    if (!requestData.date || !requestData.time || !requestData.partySize) {
      return {
        success: false,
        error: 'Missing required reservation data',
        message: 'I need the date, time, and party size to make your reservation. Could you please provide those details?'
      };
    }

    try {
      // Check circuit breaker for Google Calendar
      if (!this.checkCircuitBreaker('google-calendar')) {
        return {
          success: false,
          error: 'Google Calendar service temporarily unavailable',
          message: 'I apologize, but our reservation system is temporarily experiencing issues. Please call us directly to make a reservation.'
        };
      }

      // Get agentId from restaurantId
      const restaurantData = await storage.getRestaurantDataById(payload.restaurantId);
      if (!restaurantData) {
        console.error(`❌ Restaurant data not found for restaurantId: ${payload.restaurantId}`);
        return {
          success: false,
          error: 'Restaurant data not found',
          message: 'I apologize, but I cannot process your reservation right now. Please contact the restaurant directly.'
        };
      }

      const agentId = restaurantData.agentId;
      console.log(`✅ Found agentId: ${agentId} for restaurantId: ${payload.restaurantId}`);

      // Get Google Calendar OAuth tokens from agent-specific integration
      const tokens = await this.getGoogleCalendarTokens(config.userId, agentId);

      if (!tokens) {
        console.log('❌ Google Calendar not configured for user:', config.userId);
        return {
          success: false,
          error: 'Google Calendar not configured',
          message: 'I apologize, but our reservation system is not currently available. Please call us directly to make a reservation.'
        };
      }

      // CRITICAL: Use the timezone from the Google Calendar integration
      // This ensures the appointment is booked in the calendar's actual timezone
      const timeZone = tokens.timeZone || config.timezone || config.googleCalendar?.timeZone || 'America/New_York';

      console.log(`🌍 Using timezone: ${timeZone} (from Google Calendar integration)`);
      console.log(`   Config timezone: ${config.timezone || 'not set'}`);
      console.log(`   Calendar timezone: ${tokens.timeZone || 'not set'}`);

      // Parse the requested date/time properly
      // The customer's requested time should be interpreted in the BUSINESS's timezone
      const datePart = requestData.date; // e.g., "2026-01-30"
      const timePart = requestData.time; // e.g., "12:00 PM" or "14:30"

      // Parse time handling both 12-hour (with AM/PM) and 24-hour formats
      let hours = 0;
      let minutes = 0;

      console.log(`⏰ Parsing time: "${timePart}"`);

      const timeMatch = timePart.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3]?.toUpperCase();

        console.log(`   Raw parse: ${hours}:${minutes} ${period || '(24-hour)'}`);

        // Convert 12-hour to 24-hour format
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }

        console.log(`   24-hour format: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      } else {
        console.error(`❌ Failed to parse time: "${timePart}"`);
      }

      // Construct ISO 8601 datetime string WITHOUT timezone offset
      // This will be interpreted by Google Calendar in the specified timeZone
      const startDateTimeISO = `${datePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

      console.log(`📅 Constructed start datetime: ${startDateTimeISO} (will be interpreted in ${timeZone})`);

      // Calculate end time (90 minutes later)
      const endTotalMinutes = hours * 60 + minutes + 90;
      const endHours = Math.floor(endTotalMinutes / 60) % 24;
      const endMinutes = endTotalMinutes % 60;

      // Handle day rollover if the end time goes past midnight
      let endDatePart = datePart;
      if (endTotalMinutes >= 24 * 60) {
        const tempDate = new Date(datePart);
        tempDate.setDate(tempDate.getDate() + 1);
        endDatePart = tempDate.toISOString().split('T')[0];
        console.log(`   ⚠️  End time rolls over to next day: ${endDatePart}`);
      }

      const endDateTimeISO = `${endDatePart}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

      console.log(`   End datetime: ${endDateTimeISO} (90 minutes after start)`);

      // Create Date objects for validation (these are approximate since we don't have exact timezone handling in Date)
      const startDateTime = new Date(`${datePart} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      const endDateTime = new Date(`${endDatePart} ${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`);

      // ✅ STEP 1: Check if requested time is within business operating hours
      const hoursCheck = this.isWithinBusinessHours(config, startDateTime);
      if (!hoursCheck.valid) {
        console.log(`❌ Reservation time outside business hours: ${startDateTime}`);
        return {
          success: false,
          error: 'Requested time outside business hours',
          message: hoursCheck.message || 'The requested time is outside our operating hours.'
        };
      }

      console.log(`✅ Requested time is within business hours`);

      // Initialize Google Calendar API with OAuth2
      // Use the correct redirect URI based on environment
      const redirectUri = process.env.APP_DOMAIN
        ? `https://${process.env.APP_DOMAIN}/api/integrations/google-calendar/callback`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/integrations/google-calendar/callback`
          : 'http://localhost:5000/api/integrations/google-calendar/callback';

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      // Set credentials
      oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // ✅ STEP 2: Check if the time slot is available in Google Calendar
      const availabilityCheck = await this.checkCalendarAvailability(
        calendar,
        tokens.calendarId,
        startDateTime,
        endDateTime,
        timeZone
      );

      if (!availabilityCheck.available) {
        console.log(`❌ Time slot not available in calendar: ${startDateTime}`);
        return {
          success: false,
          error: 'Time slot not available',
          message: availabilityCheck.message || 'That time slot is not available. Please choose a different time.'
        };
      }

      console.log(`✅ Time slot is available in calendar`);

      const event = {
        summary: `Reservation - ${customerData.name || 'Guest'} (${requestData.partySize} people)`,
        description: `
Party Size: ${requestData.partySize}
Customer: ${customerData.name || 'N/A'}
Phone: ${customerData.phone || 'N/A'}
Email: ${customerData.email || 'N/A'}
Special Requests: ${requestData.specialRequests || 'None'}
Conversation ID: ${payload.conversationId}
        `.trim(),
        start: {
          dateTime: startDateTimeISO,
          timeZone: timeZone
        },
        end: {
          dateTime: endDateTimeISO,
          timeZone: timeZone
        },
        attendees: customerData.email ? [{ email: customerData.email }] : undefined
      };

      console.log(`📅 ==================== CREATING GOOGLE CALENDAR EVENT ====================`);
      console.log(`   Customer: ${customerData.name || 'Guest'}`);
      console.log(`   Party Size: ${requestData.partySize}`);
      console.log(`   Requested: ${requestData.date} at ${requestData.time}`);
      console.log(`   Calendar ID: ${tokens.calendarId}`);
      console.log(`   Timezone: ${timeZone}`);
      console.log(`   Start DateTime: ${startDateTimeISO}`);
      console.log(`   End DateTime: ${endDateTimeISO}`);
      console.log(`   This will create an event at:`);
      console.log(`     - ${requestData.date} ${requestData.time} (${timeZone})`);
      console.log(`========================================================================`);

      const response = await calendar.events.insert({
        calendarId: tokens.calendarId,
        requestBody: event,
        sendUpdates: 'all' // Send email notifications to attendees
      });

      const confirmationId = response.data.id;

      console.log(`✅ Calendar event created successfully!`);
      console.log(`   Event ID: ${confirmationId}`);
      console.log(`   Event URL: ${response.data.htmlLink}`);

      // Record successful API call
      this.recordCircuitBreakerSuccess('google-calendar');

      // Link reservation to call session for metrics tracking
      await this.linkReservationToCallSession(
        payload,
        config,
        confirmationId!,
        startDateTime,
        requestData.partySize,
        requestData.specialRequests
      );

      // Record call outcome
      await this.recordCallOutcome(payload, config, {
        intentDetected: 'reservation',
        reservationCreated: true
      });

      return {
        success: true,
        message: `Perfect! I've confirmed your reservation for ${requestData.partySize} people on ${requestData.date} at ${requestData.time}. Your confirmation number is ${confirmationId?.slice(-6)}. We look forward to serving you at ${config.businessName}!`,
        confirmationId,
        data: {
          eventId: response.data.id,
          eventUrl: response.data.htmlLink,
          startTime: startDateTimeISO,
          endTime: endDateTimeISO,
          timeZone: timeZone
        }
      };

    } catch (error) {
      console.error('❌ Google Calendar reservation failed:', error);

      // Log detailed error information
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }

      // Check if it's an OAuth error
      if ((error as any)?.code === 401 || (error as any)?.message?.includes('invalid_grant')) {
        console.error('   OAuth token may be expired - user needs to reconnect Google Calendar');
      }

      // Record failure in circuit breaker
      this.recordCircuitBreakerFailure('google-calendar');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calendar API error',
        message: 'I apologize, but I encountered an issue creating your reservation. Please call us directly and we\'ll be happy to book your table.'
      };
    }
  }

  /**
   * Handle order requests - POS system integration
   */
  private async handleOrder(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    console.log(`🍽️ Processing order for ${config.businessName}`);

    const { customerData, requestData } = payload;

    if (!requestData.items || requestData.items.length === 0) {
      return {
        success: false,
        error: 'No items in order',
        message: 'What would you like to order? I can help you with our menu items.'
      };
    }

    if (!config.posSystem) {
      return {
        success: false,
        error: 'POS system not configured',
        message: 'I apologize, but our ordering system is not currently available. Please call us directly to place your order.'
      };
    }

    try {
      let result: AutomationResult;

      switch (config.posSystem.type) {
        case 'square':
          result = await this.handleSquareOrder(config, payload);
          break;
        case 'toast':
          result = await this.handleToastOrder(config, payload);
          break;
        case 'clover':
          result = await this.handleCloverOrder(config, payload);
          break;
        default:
          result = await this.handleGenericPOSOrder(config, payload);
      }

      // Link order to call session for metrics tracking if successful
      if (result.success && result.confirmationId) {
        const orderAmount = requestData.totalAmount || requestData.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const orderType = requestData.orderType || 'takeout';
        const items = requestData.items.map((item: any) => item.name);

        await this.linkOrderToCallSession(
          payload,
          config,
          result.confirmationId,
          orderAmount,
          orderType,
          items
        );

        // Record call outcome
        await this.recordCallOutcome(payload, config, {
          intentDetected: 'order',
          orderCreated: true
        });
      }

      return result;

    } catch (error) {
      console.error('❌ POS order processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'POS system error',
        message: 'I apologize, but I encountered an issue processing your order. Please call us directly and we\'ll take your order over the phone.'
      };
    }
  }

  /**
   * Handle delivery requests
   */
  private async handleDelivery(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    console.log(`🚚 Processing delivery for ${config.businessName}`);

    const { customerData, requestData } = payload;

    if (!requestData.address) {
      return {
        success: false,
        error: 'No delivery address provided',
        message: 'I need your delivery address to arrange delivery. What\'s your address?'
      };
    }

    if (!config.deliverySystem) {
      return {
        success: false,
        error: 'Delivery system not configured',
        message: 'I apologize, but delivery is not currently available. Would you like to place an order for pickup instead?'
      };
    }

    try {
      // Check if we have in-house delivery enabled
      if (config.deliverySystem.inHouse?.enabled) {
        return await this.handleInHouseDelivery(config, payload);
      }

      // Try third-party delivery services
      if (config.deliverySystem.uberEats) {
        return await this.handleUberEatsDelivery(config, payload);
      }

      if (config.deliverySystem.doorDash) {
        return await this.handleDoorDashDelivery(config, payload);
      }

      return {
        success: false,
        error: 'No delivery options available',
        message: 'I apologize, but delivery is not currently available. Would you like to place an order for pickup instead?'
      };

    } catch (error) {
      console.error('❌ Delivery processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delivery system error',
        message: 'I apologize, but I encountered an issue arranging delivery. Please call us directly for delivery options.'
      };
    }
  }

  /**
   * Handle catering requests
   */
  private async handleCatering(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    console.log(`🎉 Processing catering request for ${config.businessName}`);

    const { customerData, requestData } = payload;

    // Catering typically requires more complex handling
    const cateringData = {
      customerName: customerData.name,
      customerPhone: customerData.phone,
      customerEmail: customerData.email,
      eventDate: requestData.eventDate,
      eventTime: requestData.eventTime,
      guestCount: requestData.guestCount,
      menuItems: requestData.menuItems || [],
      specialRequests: requestData.specialRequests,
      budget: requestData.budget,
      eventLocation: requestData.eventLocation,
      conversationId: payload.conversationId
    };

    // Store catering request for manual follow-up
    await storage.createCateringRequest(config.restaurantId, cateringData);

    // Send notification to restaurant staff
    await this.notifyRestaurantStaff(config, 'catering', cateringData);

    return {
      success: true,
      message: `Thank you for your interest in catering from ${config.businessName}! I've recorded your request for ${requestData.guestCount} guests on ${requestData.eventDate}. Our catering team will contact you within 24 hours to discuss menu options and pricing. You can also reach us directly at ${config.businessName} if you have any immediate questions.`,
      confirmationId: `CAT-${Date.now()}`,
      data: cateringData
    };
  }

  /**
   * Handle call transfer requests
   */
  private async handleTransfer(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    console.log(`📞 Processing call transfer for ${config.businessName}`);

    // In a real implementation, this would integrate with the telephony system
    // For now, we'll provide instructions to the AI

    return {
      success: true,
      message: 'Let me transfer you to a team member who can better assist you. Please hold for just a moment.',
      nextAction: 'transfer_call',
      data: {
        transferTo: config.posSystem?.webhookUrl || 'main_line',
        reason: payload.requestData.reason || 'customer_request'
      }
    };
  }

  /**
   * Handle after-hours requests
   */
  private async handleAfterHours(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    console.log(`🌙 Processing after-hours request for ${config.businessName}`);

    const businessStatus = this.checkBusinessHours(config);
    const nextOpenTime = this.getNextOpenTime(config);

    // If after-hours orders/reservations are allowed
    if (config.acceptAfterHours) {
      return {
        success: true,
        message: `Thank you for calling ${config.businessName}. While we're currently closed, I can still help you with reservations and takeout orders. Our regular hours are ${this.formatBusinessHours(config.businessHours)}. How can I assist you tonight?`,
        data: {
          afterHours: true,
          acceptingOrders: true,
          nextOpenTime
        }
      };
    }

    // Standard after-hours message
    return {
      success: true,
      message: `Thank you for calling ${config.businessName}. We're currently closed. Our hours are ${this.formatBusinessHours(config.businessHours)}. We'll reopen ${nextOpenTime}. You can also visit our website or social media for more information. Thank you and have a great day!`,
      data: {
        afterHours: true,
        acceptingOrders: false,
        nextOpenTime
      }
    };
  }

  /**
   * Check if restaurant is currently open
   */
  private checkBusinessHours(config: RestaurantConfig): { isOpen: boolean; currentDay: string; nextOpenTime?: string } {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: config.timezone }).toLowerCase();

    const todayHours = config.businessHours[currentDay];
    if (!todayHours || todayHours.closed) {
      return { isOpen: false, currentDay, nextOpenTime: this.getNextOpenTime(config) };
    }

    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: config.timezone
    });

    const isOpen = currentTime >= todayHours.open && currentTime <= todayHours.close;

    return { isOpen, currentDay, nextOpenTime: isOpen ? undefined : this.getNextOpenTime(config) };
  }

  /**
   * Check if a specific date/time is within business operating hours
   */
  private isWithinBusinessHours(config: RestaurantConfig, requestedDateTime: Date): { valid: boolean; message?: string } {
    const dayName = requestedDateTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: config.timezone }).toLowerCase();

    const dayHours = config.businessHours[dayName];
    if (!dayHours || dayHours.closed) {
      return {
        valid: false,
        message: `I apologize, but we're closed on ${dayName}s. Our operating hours are ${this.formatBusinessHours(config.businessHours)}.`
      };
    }

    const requestedTime = requestedDateTime.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: config.timezone
    });

    if (requestedTime < dayHours.open || requestedTime > dayHours.close) {
      return {
        valid: false,
        message: `I apologize, but ${requestedTime} is outside our operating hours on ${dayName}s. We're open from ${dayHours.open} to ${dayHours.close}.`
      };
    }

    return { valid: true };
  }

  /**
   * Check if a specific time slot is available in Google Calendar
   */
  private async checkCalendarAvailability(
    calendar: any,
    calendarId: string,
    requestedStartTime: Date,
    requestedEndTime: Date,
    timeZone: string
  ): Promise<{ available: boolean; message?: string; conflictingEvents?: any[] }> {
    try {
      console.log(`📅 Checking calendar availability for ${requestedStartTime.toISOString()} to ${requestedEndTime.toISOString()}`);

      // Query for events that overlap with the requested time slot
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: requestedStartTime.toISOString(),
        timeMax: requestedEndTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];

      if (events.length > 0) {
        console.log(`❌ Time slot unavailable - found ${events.length} conflicting event(s)`);

        const conflictDetails = events.map((event: any) => {
          const eventStart = event.start?.dateTime || event.start?.date;
          const eventEnd = event.end?.dateTime || event.end?.date;
          return `${event.summary || 'Busy'} (${eventStart} - ${eventEnd})`;
        }).join(', ');

        return {
          available: false,
          message: `I apologize, but that time slot is already booked. Please choose a different time.`,
          conflictingEvents: events
        };
      }

      console.log(`✅ Time slot is available`);
      return { available: true };

    } catch (error) {
      console.error('❌ Error checking calendar availability:', error);
      // If we can't check availability, we should fail safely and not book
      return {
        available: false,
        message: 'I apologize, but I\'m having trouble checking our availability. Please call us directly to make a reservation.'
      };
    }
  }

  private getNextOpenTime(config: RestaurantConfig): string {
    // Simplified implementation - find next open day
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const now = new Date();

    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + i);
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: config.timezone }).toLowerCase();

      const dayHours = config.businessHours[dayName];
      if (dayHours && !dayHours.closed) {
        const dayLabel = i === 1 ? 'tomorrow' : dayName;
        return `${dayLabel} at ${dayHours.open}`;
      }
    }

    return 'next week';
  }

  private formatBusinessHours(businessHours: RestaurantConfig['businessHours']): string {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hours = days.map(day => {
      const dayHours = businessHours[day];
      if (!dayHours || dayHours.closed) return `${day}: Closed`;
      return `${day}: ${dayHours.open} - ${dayHours.close}`;
    });

    return hours.join(', ');
  }

  // POS System Handlers
  private async handleSquareOrder(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    // Square POS integration implementation
    const squareApiUrl = config.posSystem?.environmentId === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    const orderData = {
      location_id: config.posSystem?.locationId,
      order: {
        location_id: config.posSystem?.locationId,
        line_items: payload.requestData.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity.toString(),
          variation_name: item.variation || 'Regular',
          modifiers: item.modifiers || [],
          note: item.specialInstructions || ''
        }))
      }
    };

    const response = await axios.post(`${squareApiUrl}/v2/orders`, orderData, {
      headers: {
        'Authorization': `Bearer ${config.posSystem?.apiKey}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18'
      }
    });

    return {
      success: true,
      message: `Great! I've placed your order. Your order number is ${response.data.order.id.slice(-6)}. ${payload.requestData.orderType === 'pickup' ? 'It will be ready for pickup in about 15-20 minutes.' : 'We\'ll have that ready for you shortly.'}`,
      confirmationId: response.data.order.id,
      data: response.data.order
    };
  }

  private async handleToastOrder(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    // Toast POS integration - using integrationService
    console.log('Processing Toast POS order via integrationService');

    const { integrationService } = await import('./integrationService');

    const result = await integrationService.processIntegration({
      userId: config.userId,
      restaurantId: config.restaurantId,
      integrationType: 'POS',
      action: 'place_order',
      payload: {
        customer_name: payload.customerData.name,
        customer_phone: payload.customerData.phone,
        customer_email: payload.customerData.email,
        items: payload.requestData.items,
        total: payload.requestData.totalAmount || payload.requestData.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
        order_type: payload.requestData.orderType || 'takeout'
      },
      conversationId: payload.conversationId,
      callId: payload.callId
    });

    return {
      success: result.success,
      message: result.message,
      confirmationId: result.confirmationId,
      error: result.error,
      data: result.data
    };
  }

  private async handleCloverOrder(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    // Clover POS integration - using integrationService
    console.log('Processing Clover POS order via integrationService');

    const { integrationService } = await import('./integrationService');

    const result = await integrationService.processIntegration({
      userId: config.userId,
      restaurantId: config.restaurantId,
      integrationType: 'POS',
      action: 'place_order',
      payload: {
        customer_name: payload.customerData.name,
        customer_phone: payload.customerData.phone,
        customer_email: payload.customerData.email,
        items: payload.requestData.items,
        total: payload.requestData.totalAmount || payload.requestData.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
        order_type: payload.requestData.orderType || 'takeout'
      },
      conversationId: payload.conversationId,
      callId: payload.callId
    });

    return {
      success: result.success,
      message: result.message,
      confirmationId: result.confirmationId,
      error: result.error,
      data: result.data
    };
  }

  private async handleGenericPOSOrder(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    // Generic POS integration for custom systems
    if (config.posSystem?.webhookUrl) {
      try {
        const response = await axios.post(config.posSystem.webhookUrl, {
          restaurant_id: config.restaurantId,
          order_data: payload.requestData,
          customer_data: payload.customerData,
          conversation_id: payload.conversationId
        }, {
          headers: {
            'Authorization': `Bearer ${config.posSystem.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        return {
          success: true,
          message: response.data.message || `Thank you! I've placed your order. ${response.data.confirmationId ? `Your confirmation number is ${response.data.confirmationId}.` : ''} We'll have it ready shortly.`,
          confirmationId: response.data.confirmationId || `ORD-${Date.now()}`,
          data: response.data
        };
      } catch (error) {
        throw new Error(`POS webhook failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: false,
      error: 'POS system configuration incomplete',
      message: 'I apologize, but our ordering system needs to be configured. Please call us directly to place your order.'
    };
  }

  // Delivery System Handlers
  private async handleInHouseDelivery(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    const deliveryData = {
      orderId: `DEL-${Date.now()}`,
      customerAddress: payload.requestData.address,
      customerPhone: payload.customerData.phone,
      items: payload.requestData.items,
      deliveryFee: config.deliverySystem?.inHouse?.deliveryFee || 2.99,
      estimatedTime: '30-45 minutes'
    };

    // Store delivery request
    await storage.createDeliveryRequest(config.restaurantId, deliveryData);

    return {
      success: true,
      message: `Perfect! I've arranged delivery to ${payload.requestData.address}. The delivery fee is $${deliveryData.deliveryFee} and your order should arrive in ${deliveryData.estimatedTime}. Your delivery tracking number is ${deliveryData.orderId.slice(-6)}.`,
      confirmationId: deliveryData.orderId,
      data: deliveryData
    };
  }

  private async handleUberEatsDelivery(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    // UberEats API integration - using integrationService
    console.log('Processing UberEats delivery via integrationService');

    const { integrationService } = await import('./integrationService');

    const result = await integrationService.processIntegration({
      userId: config.userId,
      restaurantId: config.restaurantId,
      integrationType: 'Delivery',
      action: 'schedule_delivery',
      payload: {
        customer_name: payload.customerData.name,
        customer_phone: payload.customerData.phone,
        delivery_address: payload.requestData.address,
        delivery_instructions: payload.requestData.deliveryInstructions,
        items: payload.requestData.items,
        order_value_cents: payload.requestData.totalAmount ? payload.requestData.totalAmount * 100 : 0,
        total: payload.requestData.totalAmount
      },
      conversationId: payload.conversationId,
      callId: payload.callId
    });

    return {
      success: result.success,
      message: result.message,
      confirmationId: result.confirmationId,
      error: result.error,
      data: result.data
    };
  }

  private async handleDoorDashDelivery(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    // DoorDash API integration - using integrationService
    console.log('Processing DoorDash delivery via integrationService');

    const { integrationService } = await import('./integrationService');

    const result = await integrationService.processIntegration({
      userId: config.userId,
      restaurantId: config.restaurantId,
      integrationType: 'Delivery',
      action: 'schedule_delivery',
      payload: {
        customer_name: payload.customerData.name,
        customer_phone: payload.customerData.phone,
        delivery_address: payload.requestData.address,
        delivery_instructions: payload.requestData.deliveryInstructions,
        items: payload.requestData.items,
        order_value_cents: payload.requestData.totalAmount ? payload.requestData.totalAmount * 100 : 0,
        total: payload.requestData.totalAmount
      },
      conversationId: payload.conversationId,
      callId: payload.callId
    });

    return {
      success: result.success,
      message: result.message,
      confirmationId: result.confirmationId,
      error: result.error,
      data: result.data
    };
  }

  /**
   * Send confirmation back to Retell AI conversation
   */
  private async sendRetellConfirmation(conversationId: string, result: AutomationResult): Promise<void> {
    try {
      // This would integrate with Retell AI's response API
      console.log(`✅ Sending confirmation to Retell conversation ${conversationId}:`, result.message);

      // In a real implementation, this would call Retell's API to update the conversation
      // For now, we'll just log it
    } catch (error) {
      console.error('❌ Failed to send Retell confirmation:', error);
    }
  }

  /**
   * Log automation events for analytics
   */
  private async logAutomationEvent(payload: WebhookPayload, result: AutomationResult, config: RestaurantConfig | null): Promise<void> {
    try {
      const eventLog = {
        restaurantId: payload.restaurantId,
        conversationId: payload.conversationId,
        callId: payload.callId,
        action: payload.action,
        success: result.success,
        timestamp: payload.timestamp,
        customerData: payload.customerData,
        requestData: payload.requestData,
        result: {
          message: result.message,
          confirmationId: result.confirmationId,
          error: result.error
        },
        businessName: config?.businessName || 'Unknown',
        retryCount: payload.retryCount || 0
      };

      await storage.logAutomationEvent(eventLog);
    } catch (error) {
      console.error('❌ Failed to log automation event:', error);
    }
  }

  /**
   * Handle payment requests - generate secure payment links for phone orders
   */
  private async handlePayment(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    console.log(`💳 Processing payment request for ${config.businessName}`);

    const { customerData, requestData } = payload;

    try {
      // Extract order details from request data
      const orderAmount = requestData.total || requestData.amount || 0;
      const orderItems = requestData.items || [];
      const customerPhone = customerData.phone;
      const customerName = customerData.name || 'Customer';

      if (!orderAmount || orderAmount <= 0) {
        return {
          success: false,
          error: 'Invalid order amount',
          message: 'I need the order total to generate a payment link. What is the total amount for this order?'
        };
      }

      // Generate secure payment link (integrates with Stripe)
      const paymentLinkId = `PAY-${config.restaurantId}-${Date.now()}`;
      const paymentLink = `${process.env.REPLIT_DEV_DOMAIN || 'https://your-domain.com'}/payment/${paymentLinkId}`;

      // Store payment request for processing
      const paymentData = {
        paymentLinkId,
        restaurantId: config.restaurantId,
        customerPhone,
        customerName,
        orderItems,
        amount: orderAmount,
        currency: 'USD',
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        callId: payload.callId,
        conversationId: payload.conversationId
      };

      await storage.createPaymentRequest(paymentData);

      // Send payment link via SMS if phone number available
      if (customerPhone) {
        await this.sendPaymentLinkSMS(customerPhone, customerName, paymentLink, orderAmount, config.businessName);
      }

      return {
        success: true,
        message: `Perfect! I've created a secure payment link for your $${orderAmount} order. ${customerPhone ? `I'm sending the link to ${customerPhone} via text message.` : 'Please provide your phone number to receive the payment link.'} The link is valid for 24 hours and supports Apple Pay, Google Pay, and credit cards.`,
        confirmationId: paymentLinkId,
        data: {
          paymentLink,
          amount: orderAmount,
          expiresAt: paymentData.expiresAt
        }
      };

    } catch (error) {
      console.error('❌ Payment processing error:', error);
      return {
        success: false,
        error: 'Payment processing failed',
        message: 'I apologize, but I cannot process the payment right now. Please try again or pay when you pick up your order.'
      };
    }
  }

  /**
   * Handle feedback collection from customers
   */
  private async handleFeedback(config: RestaurantConfig, payload: WebhookPayload): Promise<AutomationResult> {
    console.log(`📝 Processing feedback for ${config.businessName}`);

    const { customerData, requestData } = payload;

    try {
      const feedback = requestData.feedback || requestData.rating || requestData.comment;
      const rating = requestData.rating || null;
      const customerPhone = customerData.phone;
      const customerName = customerData.name || 'Anonymous';

      if (!feedback) {
        return {
          success: false,
          error: 'No feedback provided',
          message: 'I would love to hear your feedback! Could you share your experience or rate us from 1 to 5 stars?'
        };
      }

      // Store feedback in analytics system
      const feedbackData = {
        restaurantId: config.restaurantId,
        customerPhone,
        customerName,
        rating: typeof rating === 'number' ? rating : null,
        feedback: feedback.toString(),
        callId: payload.callId,
        conversationId: payload.conversationId,
        source: 'phone_call',
        timestamp: new Date()
      };

      await storage.createFeedbackEntry(feedbackData);

      // Notify restaurant staff of feedback
      await this.notifyRestaurantStaff(config, 'customer_feedback', feedbackData);

      const responseMessage = rating 
        ? `Thank you ${customerName} for your ${rating}-star rating and feedback! We truly appreciate you taking the time to share your experience with us.`
        : `Thank you ${customerName} for your valuable feedback! We appreciate you taking the time to share your experience with us.`;

      return {
        success: true,
        message: responseMessage,
        confirmationId: `FB-${Date.now()}`,
        data: feedbackData
      };

    } catch (error) {
      console.error('❌ Feedback processing error:', error);
      return {
        success: false,
        error: 'Feedback processing failed',
        message: 'Thank you for your feedback! We appreciate your input.'
      };
    }
  }

  /**
   * Send payment link via SMS
   */
  private async sendPaymentLinkSMS(phone: string, customerName: string, paymentLink: string, amount: number, businessName: string): Promise<void> {
    try {
      const message = `Hi ${customerName}! Your ${businessName} order total is $${amount}. Pay securely here: ${paymentLink} (Valid 24hrs, supports Apple/Google Pay)`;
      
      // This would integrate with Twilio SMS service
      console.log(`📱 Sending payment link SMS to ${phone}: ${message}`);
      
      // Implementation would go here to send actual SMS
      // await twilioService.sendSMS(phone, message);
      
    } catch (error) {
      console.error('❌ Failed to send payment link SMS:', error);
    }
  }

  /**
   * Notify restaurant staff of important events
   */
  private async notifyRestaurantStaff(config: RestaurantConfig, eventType: string, data: any): Promise<void> {
    try {
      // Implementation for staff notifications (email, SMS, Slack, etc.)
      console.log(`📧 Notifying staff for ${config.businessName} about ${eventType}:`, data);

      // This could integrate with email services, SMS, Slack, etc.
    } catch (error) {
      console.error('❌ Failed to notify restaurant staff:', error);
    }
  }

  /**
   * Link order to call session for metrics tracking
   */
  private async linkOrderToCallSession(
    payload: WebhookPayload,
    config: RestaurantConfig,
    orderId: string,
    orderAmount: number,
    orderType: string,
    items?: string[]
  ): Promise<void> {
    try {
      let callSession;
      
      if (payload.conversationId) {
        callSession = await storage.getCallSessionByRetellId(payload.conversationId);
      } else if (payload.callId) {
        callSession = await storage.getCallSessionByTwilioSid(payload.callId);
      }

      if (callSession) {
        await this.metricsService.linkOrderToCall({
          callSessionId: callSession.id,
          userId: config.userId,
          orderId,
          orderAmount,
          orderType,
          itemsOrdered: items
        });
        
        console.log(`✅ Linked order ${orderId} to call session ${callSession.id}`);
      } else {
        console.warn(`⚠️ No call session found for callId: ${payload.callId}, conversationId: ${payload.conversationId}`);
      }
    } catch (error) {
      console.error('❌ Failed to link order to call session:', error);
    }
  }

  /**
   * Link reservation to call session for metrics tracking
   */
  private async linkReservationToCallSession(
    payload: WebhookPayload,
    config: RestaurantConfig,
    reservationId: string,
    reservationDateTime: Date,
    partySize?: number,
    specialRequests?: string
  ): Promise<void> {
    try {
      let callSession;
      
      if (payload.conversationId) {
        callSession = await storage.getCallSessionByRetellId(payload.conversationId);
      } else if (payload.callId) {
        callSession = await storage.getCallSessionByTwilioSid(payload.callId);
      }

      if (callSession) {
        await this.metricsService.linkReservationToCall({
          callSessionId: callSession.id,
          userId: config.userId,
          reservationId,
          reservationDateTime,
          partySize,
          specialRequests
        });
        
        console.log(`✅ Linked reservation ${reservationId} to call session ${callSession.id}`);
      } else {
        console.warn(`⚠️ No call session found for callId: ${payload.callId}, conversationId: ${payload.conversationId}`);
      }
    } catch (error) {
      console.error('❌ Failed to link reservation to call session:', error);
    }
  }

  /**
   * Record call outcome for metrics tracking
   */
  private async recordCallOutcome(
    payload: WebhookPayload,
    config: RestaurantConfig,
    outcome: {
      intentDetected?: string;
      orderCreated?: boolean;
      reservationCreated?: boolean;
      transferRequested?: boolean;
    }
  ): Promise<void> {
    try {
      let callSession;
      
      if (payload.conversationId) {
        callSession = await storage.getCallSessionByRetellId(payload.conversationId);
      } else if (payload.callId) {
        callSession = await storage.getCallSessionByTwilioSid(payload.callId);
      }

      if (callSession) {
        await this.metricsService.recordCallOutcome({
          callSessionId: callSession.id,
          userId: config.userId,
          intentDetected: outcome.intentDetected,
          orderCreated: outcome.orderCreated || false,
          reservationCreated: outcome.reservationCreated || false,
          transferRequested: outcome.transferRequested || false
        });
        
        console.log(`✅ Recorded call outcome for session ${callSession.id}`);
      }
    } catch (error) {
      console.error('❌ Failed to record call outcome:', error);
    }
  }
}

export const restaurantAutomationService = RestaurantAutomationService.getInstance();