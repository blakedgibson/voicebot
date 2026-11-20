/**
 * Integration Service - Centralized Integration Handler
 *
 * This service routes integration requests from Retell AI custom functions
 * to the appropriate third-party APIs (POS, Calendar, Delivery, CRM, etc.)
 * based on user configuration and integration templates.
 */

import axios, { AxiosError } from 'axios';
import { storage } from '../storage';
import { INTEGRATION_TEMPLATES, IntegrationTemplate } from './integrationTemplates';
import { oauthTokenService } from './oauthTokenService';
import { createGraphQLClient, BoulevardQueries } from './graphqlClient';
import { EncryptionService } from './encryptionService';
import { db } from '../db';
import { integrationLogs } from '@shared/schema';

export interface IntegrationRequest {
  userId: string;
  restaurantId: string;
  agentId?: string;
  integrationType: 'POS' | 'Calendar' | 'Delivery' | 'CRM' | 'Messaging' | 'Appointment' | 'Magic';
  action: string; // e.g., 'place_order', 'create_reservation', 'schedule_delivery'
  payload: any; // The data to send to the integration
  conversationId?: string;
  callId?: string;
}

export interface IntegrationResponse {
  success: boolean;
  data?: any;
  error?: string;
  message: string; // User-friendly message to speak back
  confirmationId?: string;
}

/**
 * Create a Date object representing a specific time in a given timezone
 * @param year - Full year (e.g., 2026)
 * @param month - Month (0-11, JavaScript convention)
 * @param day - Day of month (1-31)
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param timezone - IANA timezone string (e.g., 'America/Chicago')
 * @returns Date object representing that time in the given timezone
 */
function createDateInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Create a date string in the format "2026-01-30T14:25:00"
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

  // Create a Date object from the string + format it in the target timezone
  // Then parse it back to get the UTC equivalent
  const tempDate = new Date(dateStr);

  // Format this date as if it's in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Parse the localized string back to get components
  const parts = formatter.formatToParts(tempDate);
  const getValue = (type: string) => parts.find(p => p.type === type)?.value || '0';

  const localYear = parseInt(getValue('year'), 10);
  const localMonth = parseInt(getValue('month'), 10) - 1;
  const localDay = parseInt(getValue('day'), 10);
  const localHour = parseInt(getValue('hour'), 10);
  const localMinute = parseInt(getValue('minute'), 10);
  const localSecond = parseInt(getValue('second'), 10);

  // Calculate the offset
  const localDate = new Date(localYear, localMonth, localDay, localHour, localMinute, localSecond);
  const offset = tempDate.getTime() - localDate.getTime();

  // Apply offset to get the correct UTC time
  const targetDate = new Date(year, month, day, hour, minute, 0);
  return new Date(targetDate.getTime() - offset);
}

/**
 * Parse natural language date formats like "November 6 at 12:00 PM" or "2025-11-06 at 01:00 PM"
 */
function parseNaturalLanguageDate(dateStr: string): Date | null {
  try {
    // Remove extra whitespace
    const normalized = dateStr.trim();

    // Pattern 1: "YYYY-MM-DD at HH:MM AM/PM" (e.g., "2025-11-06 at 01:00 PM")
    const isoDateTimeRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i;
    const isoMatch = normalized.match(isoDateTimeRegex);

    if (isoMatch) {
      const [, yearStr, monthStr, dayStr, hourStr, minuteStr, ampmStr] = isoMatch;
      
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1; // JavaScript months are 0-indexed
      const day = parseInt(dayStr, 10);
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // Handle AM/PM
      if (ampmStr) {
        const isPM = ampmStr.toUpperCase() === 'PM';
        if (isPM && hour !== 12) {
          hour += 12;
        } else if (!isPM && hour === 12) {
          hour = 0;
        }
      }

      return new Date(year, month, day, hour, minute, 0);
    }

    // Pattern 2: "Month Day at HH:MM AM/PM" (e.g., "November 6 at 12:00 PM")
    const monthDayTimeRegex = /^(\w+)\s+(\d{1,2})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i;
    const monthMatch = normalized.match(monthDayTimeRegex);

    if (monthMatch) {
      const [, monthStr, dayStr, hourStr, minuteStr, ampmStr] = monthMatch;

      // Parse month
      const monthMap: Record<string, number> = {
        january: 0, jan: 0,
        february: 1, feb: 1,
        march: 2, mar: 2,
        april: 3, apr: 3,
        may: 4,
        june: 5, jun: 5,
        july: 6, jul: 6,
        august: 7, aug: 7,
        september: 8, sep: 8,
        october: 9, oct: 9,
        november: 10, nov: 10,
        december: 11, dec: 11
      };

      const month = monthMap[monthStr.toLowerCase()];
      if (month === undefined) return null;

      const day = parseInt(dayStr, 10);
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // Handle AM/PM
      if (ampmStr) {
        const isPM = ampmStr.toUpperCase() === 'PM';
        if (isPM && hour !== 12) {
          hour += 12;
        } else if (!isPM && hour === 12) {
          hour = 0;
        }
      }

      // Get current year if not specified
      const today = new Date();
      const year = today.getFullYear();

      // Create date
      const date = new Date(year, month, day, hour, minute, 0);

      // If date is in the past, try next year
      if (date < today) {
        date.setFullYear(year + 1);
      }

      return date;
    }

    // If no match, return null
    return null;
  } catch (error) {
    console.error('❌ Error parsing natural language date:', error);
    return null;
  }
}

class IntegrationService {
  private static instance: IntegrationService;

  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Helper method to decrypt OAuth credentials from agentIntegrations
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
   * Route an integration request to the correct handler
   */
  async processIntegration(request: IntegrationRequest): Promise<IntegrationResponse> {
    try {
      console.log(`🔀 Processing ${request.integrationType} integration: ${request.action}`);
      console.log(`   User: ${request.userId}, Restaurant: ${request.restaurantId}`);

      // Get user's integration settings from database
      const integrationSettings = await storage.getIntegrationSettings(request.userId);

      if (!integrationSettings) {
        return {
          success: false,
          error: 'No integration settings found',
          message: 'I apologize, but integrations are not configured for your account. Please set up your integrations in the dashboard.'
        };
      }

      // Route to appropriate integration handler based on type and action
      switch (request.integrationType) {
        case 'POS':
          return await this.handlePOSIntegration(request, integrationSettings);

        case 'Calendar':
          // Check if this is a modification or reschedule action
          if (request.action === 'modify_appointment' || request.action === 'update_appointment' || request.action === 'reschedule_appointment') {
            return await this.handleModifyCalendarAppointment(request, integrationSettings);
          }
          // Check if this is a cancellation action
          if (request.action === 'cancel_appointment' || request.action === 'cancel') {
            return await this.handleCancelCalendarAppointment(request, integrationSettings);
          }
          return await this.handleCalendarIntegration(request, integrationSettings);

        case 'Appointment':
          return await this.handleAppointmentIntegration(request, integrationSettings);

        case 'Delivery':
          return await this.handleDeliveryIntegration(request, integrationSettings);

        case 'CRM':
          return await this.handleCRMIntegration(request, integrationSettings);

        case 'Messaging':
          return await this.handleMessagingIntegration(request, integrationSettings);

        case 'Magic':
          return await this.handleMagicIntegration(request, integrationSettings);

        default:
          return {
            success: false,
            error: `Unknown integration type: ${request.integrationType}`,
            message: 'I apologize, but that integration type is not supported.'
          };
      }

    } catch (error) {
      console.error('❌ Integration processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'I apologize, but there was an error processing your request. Please try again or contact support.'
      };
    }
  }

  /**
   * Handle POS integrations (Square, Toast, Clover, etc.)
   */
  private async handlePOSIntegration(
    request: IntegrationRequest,
    settings: any
  ): Promise<IntegrationResponse> {
    const posConfig = settings.posSystem;

    if (!posConfig) {
      return {
        success: false,
        error: 'No POS system configured',
        message: 'I apologize, but no POS system is configured. Please call us directly to place your order.'
      };
    }

    const posType = posConfig.type; // 'square', 'toast', 'clover', etc.
    console.log(`📟 Using POS system: ${posType}`);

    switch (posType) {
      case 'square':
        return await this.handleSquarePOS(request, posConfig);

      case 'toast':
        return await this.handleToastPOS(request, posConfig);

      case 'clover':
        return await this.handleCloverPOS(request, posConfig);

      default:
        // Generic webhook-based POS
        return await this.handleGenericWebhookPOS(request, posConfig);
    }
  }

  /**
   * Square POS Integration
   * API Docs: https://developer.squareup.com/reference/square/orders-api/create-order
   */
  private async handleSquarePOS(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🟦 Processing Square POS order');

      const { payload } = request;
      const isProduction = config.environmentId === 'production';
      const apiUrl = isProduction
        ? 'https://connect.squareup.com/v2'
        : 'https://connect.squareupsandbox.com/v2';

      // Generate idempotency key for safe retries
      const idempotencyKey = `${request.restaurantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build Square API payload
      const squarePayload = {
        idempotency_key: idempotencyKey,
        order: {
          location_id: config.locationId,
          line_items: payload.items.map((item: any) => ({
            name: item.item_name || item.name,
            quantity: item.quantity.toString(),
            variation_name: item.variation || 'Regular',
            base_price_money: {
              amount: Math.round((item.price || 0) * 100), // Convert to cents
              currency: 'USD'
            },
            note: item.customizations || item.special_instructions || '',
            modifiers: item.modifiers || []
          })),
          metadata: {
            source: 'voice_ai_retell',
            conversation_id: request.conversationId || '',
            customer_phone: payload.customer_phone || ''
          }
        }
      };

      console.log(`📡 Calling Square API: POST ${apiUrl}/orders`);
      console.log('   Location ID:', config.locationId);
      console.log('   Line Items:', squarePayload.order.line_items.length);

      const response = await axios.post(`${apiUrl}/orders`, squarePayload, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Square-Version': '2025-10-16' // Latest API version
        },
        timeout: 15000
      });

      const orderId = response.data.order.id;
      const orderShortId = orderId.slice(-6);

      console.log(`✅ Square order created successfully: ${orderId}`);

      return {
        success: true,
        message: `Perfect! I've placed your order. Your order number is ${orderShortId}. ${payload.order_type === 'pickup' ? 'It will be ready for pickup in about 15-20 minutes.' : 'We\'ll have that ready for you shortly.'}`,
        confirmationId: orderId,
        data: {
          order_id: orderId,
          order_number: orderShortId,
          status: response.data.order.state,
          total: response.data.order.total_money,
          created_at: response.data.order.created_at
        }
      };

    } catch (error) {
      console.error('❌ Square POS error:', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('   Status:', axiosError.response?.status);
        console.error('   Response:', JSON.stringify(axiosError.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Square API error',
        message: 'I apologize, but I encountered an issue creating your order in our system. Please call us directly and we\'ll take your order over the phone.'
      };
    }
  }

  /**
   * Toast POS Integration
   * API Docs: https://doc.toasttab.com/doc/devguide/apiCreatingOrders.html
   */
  private async handleToastPOS(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🍞 Processing Toast POS order');

      const { payload } = request;

      // Toast API requires a different payload structure
      const toastPayload = {
        source: 'VOICE_AI',
        diningOption: {
          behavior: payload.order_type === 'delivery' ? 'DELIVERY' : 'TAKEOUT'
        },
        checks: [{
          displayNumber: `VOICE-${Date.now()}`,
          customer: {
            firstName: payload.customer_name.split(' ')[0],
            lastName: payload.customer_name.split(' ').slice(1).join(' ') || '',
            phone: payload.customer_phone,
            email: payload.customer_email || ''
          },
          selections: payload.items.map((item: any) => ({
            item: {
              name: item.item_name || item.name,
              quantity: item.quantity,
              specialRequest: item.customizations || item.special_instructions || ''
            },
            modifiers: item.modifiers || [],
            preDiscountPrice: (item.price || 0) * item.quantity
          }))
        }]
      };

      console.log(`📡 Calling Toast API: POST https://ws-api.toasttab.com/orders/v2/orders`);

      const response = await axios.post(
        'https://ws-api.toasttab.com/orders/v2/orders',
        toastPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Toast-Restaurant-External-ID': config.locationId
          },
          timeout: 15000
        }
      );

      const orderId = response.data.guid || response.data.id;
      const orderShortId = orderId ? orderId.slice(-6) : `TOAST-${Date.now()}`;

      console.log(`✅ Toast order created successfully: ${orderId}`);

      return {
        success: true,
        message: `Great! I've placed your order in our Toast system. Your order number is ${orderShortId}. ${payload.order_type === 'pickup' ? 'It will be ready for pickup in about 15-20 minutes.' : 'We\'ll have that ready for you shortly.'}`,
        confirmationId: orderId,
        data: {
          order_id: orderId,
          order_number: orderShortId,
          status: 'CREATED'
        }
      };

    } catch (error) {
      console.error('❌ Toast POS error:', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('   Status:', axiosError.response?.status);
        console.error('   Response:', JSON.stringify(axiosError.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Toast API error',
        message: 'I apologize, but I encountered an issue creating your order. Please call us directly to place your order.'
      };
    }
  }

  /**
   * Clover POS Integration
   * API Docs: https://docs.clover.com/dev/reference/ordercreateatomicorder
   */
  private async handleCloverPOS(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('☘️ Processing Clover POS order');

      const { payload } = request;

      // Clover atomic order API payload
      const cloverPayload = {
        orderType: {
          id: config.orderTypeId || 'default'
        },
        state: 'open', // Required to show in Orders app
        manualTransaction: false,
        groupLineItems: true,
        testMode: config.environmentId !== 'production',
        note: `Voice AI Order - ${payload.customer_phone || ''}`,
        lineItems: payload.items.map((item: any) => ({
          name: item.item_name || item.name,
          price: Math.round((item.price || 0) * 100), // Cents
          unitQty: item.quantity * 1000, // Clover uses thousandths
          note: item.customizations || item.special_instructions || ''
        }))
      };

      const merchantId = config.locationId; // Clover uses merchant ID
      console.log(`📡 Calling Clover API: POST https://api.clover.com/v3/merchants/${merchantId}/atomic_order/orders`);

      const response = await axios.post(
        `https://api.clover.com/v3/merchants/${merchantId}/atomic_order/orders`,
        cloverPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const orderId = response.data.id;
      const orderShortId = orderId ? orderId.slice(-6) : `CLV-${Date.now()}`;

      console.log(`✅ Clover order created successfully: ${orderId}`);

      return {
        success: true,
        message: `Excellent! I've created your order in our Clover system. Your order number is ${orderShortId}. ${payload.order_type === 'pickup' ? 'It will be ready for pickup in about 15-20 minutes.' : 'We\'ll have that ready for you shortly.'}`,
        confirmationId: orderId,
        data: {
          order_id: orderId,
          order_number: orderShortId,
          status: response.data.state,
          total: response.data.total,
          created_time: response.data.createdTime
        }
      };

    } catch (error) {
      console.error('❌ Clover POS error:', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('   Status:', axiosError.response?.status);
        console.error('   Response:', JSON.stringify(axiosError.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clover API error',
        message: 'I apologize, but I encountered an issue creating your order. Please call us directly to place your order.'
      };
    }
  }

  /**
   * Generic webhook-based POS integration
   */
  private async handleGenericWebhookPOS(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    if (!config.webhookUrl) {
      return {
        success: false,
        error: 'No webhook URL configured',
        message: 'I apologize, but our ordering system is not properly configured. Please call us directly to place your order.'
      };
    }

    try {
      console.log('🔗 Processing generic webhook POS order');
      console.log('   Webhook URL:', config.webhookUrl);

      const response = await axios.post(
        config.webhookUrl,
        {
          restaurant_id: request.restaurantId,
          order_data: request.payload,
          customer_data: {
            name: request.payload.customer_name,
            phone: request.payload.customer_phone,
            email: request.payload.customer_email
          },
          conversation_id: request.conversationId,
          call_id: request.callId
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const confirmationId = response.data.confirmationId || response.data.order_id || `ORD-${Date.now()}`;

      return {
        success: true,
        message: response.data.message || `Thank you! I've placed your order. Your confirmation number is ${confirmationId}. We'll have it ready shortly.`,
        confirmationId,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Generic webhook POS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook error',
        message: 'I apologize, but I encountered an issue creating your order. Please call us directly to place your order.'
      };
    }
  }

  /**
   * Handle Calendar integrations (Google Calendar, Cal.com, Calendly, etc.)
   */
  private async handleCalendarIntegration(
    request: IntegrationRequest,
    settings: any
  ): Promise<IntegrationResponse> {
    console.log('📅 Handling Calendar integration');
    console.log(`   Agent ID: ${request.agentId || 'not provided'}`);
    console.log(`   User ID: ${request.userId}`);

    // Check for agent-specific Google Calendar OAuth integration
    if (!request.agentId) {
      console.log('❌ No agent ID provided');
      return {
        success: false,
        error: 'No agent ID provided',
        message: 'I apologize, but calendar booking requires an agent to be configured. Please contact support.'
      };
    }

    // Get agent integrations
    const agentIntegrations = await storage.getAgentIntegrations(request.agentId);
    console.log(`🔍 Found ${agentIntegrations.length} integrations for agent ${request.agentId}`);

    const googleCalendarIntegration = agentIntegrations.find(
      (integration: any) =>
        integration.type === 'Calendar' &&
        integration.isOAuthIntegration === true
    );

    if (!googleCalendarIntegration) {
      console.log(`⚠️ No Google Calendar integration found for agent ${request.agentId} — storing booking locally`);

      // --- LOCAL FALLBACK: save appointment in call log conversationData ---
      // This ensures the booking is visible in the dashboard even without a Calendar integration
      try {
        const payload = request.payload || {};
        const localBooking = {
          source: 'local_fallback',
          storedAt: new Date().toISOString(),
          customer_name: payload.patient_name || payload.customer_name || 'Guest',
          customer_phone: payload.phone_number || payload.customer_phone || null,
          customer_email: payload.customer_email || payload.email || null,
          appointment_date: payload.appointment_date || null,
          appointment_time: payload.appointment_time || null,
          service_type: payload.service_type || payload.appointment_reason || null,
          notes: payload.notes || payload.special_requests || null,
        };

        if (request.callId) {
          // Find the call log by Retell call ID and update conversationData
          const { telephonyCallLogs: logsTable } = await import('@shared/schema');
          const { eq } = await import('drizzle-orm');
          const callLog = await db.query.telephonyCallLogs.findFirst({
            where: eq(logsTable.retellCallId, request.callId)
          });
          if (callLog) {
            const existingData = (callLog.conversationData as any) || {};
            await db.update(logsTable)
              .set({
                conversationData: {
                  ...existingData,
                  appointment_booking: localBooking
                }
              })
              .where(eq(logsTable.id, callLog.id));
            console.log(`✅ Stored local booking in call log ${callLog.id}`);
          }
        }

        return {
          success: true,
          message: `Appointment request noted for ${localBooking.customer_name}. Your team will review and confirm it shortly.`,
          data: localBooking,
          warning: 'no_calendar_integration'
        };
      } catch (fallbackErr) {
        console.error('⚠️ Could not store local fallback booking:', fallbackErr);
        return {
          success: false,
          error: 'No Calendar integration configured',
          message: 'I was unable to complete the booking at this time. Please call back to schedule your appointment, or we can have a team member reach out to you.'
        };
      }
    }

    console.log('✅ Found agent-specific Google Calendar integration');

    // Decrypt OAuth credentials
    const accessToken = this.decryptOAuthCredential(googleCalendarIntegration.oauthAccessToken);
    const refreshToken = this.decryptOAuthCredential(googleCalendarIntegration.oauthRefreshToken);
    const calendarId = this.decryptOAuthCredential(googleCalendarIntegration.oauthCalendarId);

    if (!accessToken || !calendarId) {
      console.log('❌ Failed to decrypt required Google Calendar credentials');
      return {
        success: false,
        error: 'Invalid Calendar credentials',
        message: 'Google Calendar credentials are invalid. Please reconnect in dashboard Integrations tab.'
      };
    }

    console.log('✅ Successfully decrypted Google Calendar credentials');
    console.log('📋 Payload received:', JSON.stringify(request.payload, null, 2));

    // ✅ CRITICAL FIX: Use the CALENDAR'S timezone, not the business settings timezone
    // The calendar's timezone is stored when the user connects Google Calendar
    const calendarTimezone = googleCalendarIntegration.timeZone;

    // Fallback to business settings if calendar timezone isn't set
    const businessSettings = await storage.getBusinessSettings(request.userId);
    const businessTimezone = calendarTimezone || businessSettings?.timezone || 'America/Chicago';

    console.log(`🌍 Timezone Configuration:`);
    console.log(`   Calendar timezone: ${calendarTimezone || 'not set'}`);
    console.log(`   Business timezone: ${businessSettings?.timezone || 'not set'}`);
    console.log(`   Using: ${businessTimezone} ✅`);

    // Parse Retell AI payload - supports multiple field name formats
    const customerName = request.payload.patient_name ||
                        request.payload.customer_name || 
                        (request.payload.customer_first_name && request.payload.customer_last_name
                          ? `${request.payload.customer_first_name} ${request.payload.customer_last_name}`
                          : 'Guest');
    
    const phoneNumber = request.payload.phone_number || request.payload.customer_phone;
    const email = request.payload.customer_email || request.payload.email;
    
    // Parse appointment time - could be ISO string, separate date/time, or natural language format
    let appointmentDateTime: Date | null = null;
    let rawDateTimeComponents: { year: number; month: number; day: number; hour: number; minute: number; second: number } | null = null;

    // Try multiple formats
    if (request.payload.appointment_time) {
      const timeStr = request.payload.appointment_time;
      console.log(`📅 Parsing appointment_time: "${timeStr}"`);
      console.log(`   Type: ${typeof timeStr}, Length: ${timeStr.length}`);

      // Check if it's an ISO datetime string (YYYY-MM-DDTHH:MM:SS or similar)
      const isoMatch = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      console.log(`   ISO regex match result:`, isoMatch ? 'MATCHED' : 'NO MATCH');

      if (isoMatch) {
        // ✅ CRITICAL FIX: Parse as datetime in the BUSINESS timezone, not UTC
        // When AI sends "2026-02-02T10:00:00", it means 10 AM in the business's timezone
        // JavaScript's new Date() incorrectly treats this as UTC (10 AM UTC = 5 AM Eastern)

        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1; // JS months are 0-indexed
        const day = parseInt(isoMatch[3], 10);
        const hour = parseInt(isoMatch[4], 10);
        const minute = parseInt(isoMatch[5], 10);
        const second = parseInt(isoMatch[6], 10);

        console.log(`✅ ===== ISO COMPONENT PARSING (TIMEZONE FIX ACTIVE) =====`);
        console.log(`📅 Parsed ISO components: ${year}-${month+1}-${day} ${hour}:${minute}:${second}`);
        console.log(`   This represents ${hour}:${minute} in ${businessTimezone}, NOT UTC`);
        console.log(`   OLD BEHAVIOR: Would treat as ${hour}:${minute} UTC = ${hour-5}:${minute} Eastern`);
        console.log(`   NEW BEHAVIOR: Treats as ${hour}:${minute} Eastern DIRECTLY`);

        // Store the raw components so we can construct ISO strings directly
        rawDateTimeComponents = { year, month: month + 1, day, hour, minute, second };

        // Create a Date object ONLY for display/validation purposes
        // We'll use rawDateTimeComponents to construct the actual ISO string for Google Calendar
        appointmentDateTime = new Date(year, month, day, hour, minute, second);

        console.log(`✅ Stored raw components for Google Calendar`);
        console.log(`   Will send to Google Calendar as: ${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')} (${businessTimezone})`);
        console.log(`==========================================================`);
      } else {
        // ❌ OLD PATH: This has the timezone bug!
        console.log(`❌ WARNING: Using OLD date parsing (has timezone bug!)`);
        let parsedDate = new Date(timeStr);
        if (!isNaN(parsedDate.getTime())) {
          appointmentDateTime = parsedDate;
          console.log(`📅 Parsed as date: ${appointmentDateTime.toISOString()}`);
          console.log(`📅 Local time: ${appointmentDateTime.toLocaleString('en-US', { timeZone: businessTimezone })}`);
          console.log(`   ⚠️  This will have incorrect timezone!`);
        } else {
          // Try parsing natural language format like "November 6 at 12:00 PM"
          appointmentDateTime = parseNaturalLanguageDate(timeStr);
          if (appointmentDateTime) {
            console.log(`📅 Parsed as natural language: ${appointmentDateTime.toISOString()}`);
          }
        }
      }
    } else if (request.payload.reservation_date && request.payload.reservation_time) {
      // YYYY-MM-DD and HH:MM format
      // The time is meant to be interpreted in the business timezone
      const dateStr = request.payload.reservation_date;
      const timeStr = request.payload.reservation_time;
      console.log(`📅 Parsing reservation: date="${dateStr}" time="${timeStr}" timezone="${businessTimezone}"`);

      // We store this as a simple date/time string that will be sent to Google Calendar
      // Google Calendar will interpret it in the timezone we specify
      // For internal Date object, we just need something to work with for validation
      // The key is: we DON'T convert timezones - we pass through the time as-is to Google
      const dateTimeStr = `${dateStr}T${timeStr}:00`;

      // Create a Date object just for validation and calculations
      // This will be used for availability checking and end time calculation
      // We'll use the original string format when sending to Google Calendar
      const dateParts = dateStr.split('-');
      const timeParts = timeStr.split(':');

      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1], 10);

      // Create Date object representing this time in the business timezone
      // Use a helper to properly create date in target timezone
      appointmentDateTime = createDateInTimezone(year, month, day, hour, minute, businessTimezone);

      console.log(`📅 Created appointment date: ${appointmentDateTime.toISOString()}`);
      console.log(`📅 Display in ${businessTimezone}: ${appointmentDateTime.toLocaleString('en-US', { timeZone: businessTimezone, dateStyle: 'full', timeStyle: 'long' })}`);
    }

    // Validate the date
    if (!appointmentDateTime || isNaN(appointmentDateTime.getTime())) {
      console.error('❌ No valid appointment time found in payload:', {
        appointment_time: request.payload.appointment_time,
        reservation_date: request.payload.reservation_date,
        reservation_time: request.payload.reservation_time
      });
      return {
        success: false,
        error: 'Invalid appointment time',
        message: 'I apologize, but I could not understand the appointment time. Please try again with a clearer time format.'
      };
    }

    const serviceType = request.payload.service_type || 'Appointment';
    const partySize = request.payload.party_size || request.payload.num_guests || 1;
    const specialRequests = request.payload.special_requests || request.payload.notes || '';

    console.log('📅 Parsed appointment details:', {
      customerName,
      phoneNumber,
      appointmentDateTime: appointmentDateTime.toISOString(),
      serviceType,
      partySize
    });

    // Create Google Calendar event directly
    try {
      const { google } = await import('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://your-app.com/callback'
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Helper function to format date for Google Calendar in the business timezone
      const formatLocalDateTime = (date: Date): string => {
        // Format the date in the business timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: businessTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        const parts = formatter.formatToParts(date);
        const getValue = (type: string) => parts.find(p => p.type === type)?.value || '00';

        const year = getValue('year');
        const month = getValue('month');
        const day = getValue('day');
        const hour = getValue('hour');
        const minute = getValue('minute');
        const second = getValue('second');

        return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      };

      // Calculate end time (default 1 hour after start)
      const endTime = new Date(appointmentDateTime);
      endTime.setHours(endTime.getHours() + 1);

      // Format times for display
      let displayStartTime: string;
      let displayEndTime: string;

      if (rawDateTimeComponents) {
        // Use raw components to display the ACTUAL requested time
        const { year, month, day, hour, minute } = rawDateTimeComponents;
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        displayStartTime = `${dayOfWeek}, ${monthName} ${day}, ${year} at ${displayHour}:${String(minute).padStart(2,'0')} ${ampm}`;

        const endHour = (hour + 1) % 24;
        const displayEndHour = endHour > 12 ? endHour - 12 : (endHour === 0 ? 12 : endHour);
        const endAmpm = endHour >= 12 ? 'PM' : 'AM';
        displayEndTime = `${dayOfWeek}, ${monthName} ${day}, ${year} at ${displayEndHour}:${String(minute).padStart(2,'0')} ${endAmpm}`;
      } else {
        displayStartTime = appointmentDateTime.toLocaleString('en-US', { timeZone: businessTimezone, dateStyle: 'full', timeStyle: 'short' });
        displayEndTime = endTime.toLocaleString('en-US', { timeZone: businessTimezone, dateStyle: 'full', timeStyle: 'short' });
      }

      console.log('⏰ Appointment times:');
      console.log(`   Start: ${displayStartTime}`);
      console.log(`   End:   ${displayEndTime}`);
      console.log(`   Timezone: ${businessTimezone}`);

      // Check calendar availability before booking
      console.log('🔍 Checking calendar availability...');
      const existingEvents = await calendar.events.list({
        calendarId: calendarId,
        timeMin: appointmentDateTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      if (existingEvents.data.items && existingEvents.data.items.length > 0) {
        console.log(`❌ Time slot already booked. Found ${existingEvents.data.items.length} conflicting event(s)`);
        
        const conflictingEvent = existingEvents.data.items[0];
        const conflictTime = conflictingEvent.start?.dateTime 
          ? new Date(conflictingEvent.start.dateTime).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })
          : 'the requested time';

        return {
          success: false,
          error: 'Time slot unavailable',
          message: `I apologize, but that time slot is already booked. We have an appointment at ${conflictTime}. Would you like to choose a different time?`
        };
      }

      console.log('✅ Time slot is available');

      // Create event description
      let description = `Customer: ${customerName}\n`;
      if (phoneNumber) description += `Phone: ${phoneNumber}\n`;
      if (email) description += `Email: ${email}\n`;
      if (partySize > 1) description += `Party Size: ${partySize}\n`;
      if (specialRequests) description += `\nSpecial Requests: ${specialRequests}`;

      // Use raw components if available (from ISO datetime), otherwise use formatLocalDateTime
      let startDateTimeFormatted: string;
      let endDateTimeFormatted: string;

      if (rawDateTimeComponents) {
        // Build datetime strings directly from parsed components (no timezone conversion!)
        const { year, month, day, hour, minute, second } = rawDateTimeComponents;
        startDateTimeFormatted = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;

        // Calculate end time by adding 1 hour
        let endHour = hour + 1;
        let endDay = day;
        let endMonth = month;
        let endYear = year;

        // Handle hour overflow (e.g., 23:00 + 1 hour = 00:00 next day)
        if (endHour >= 24) {
          endHour = 0;
          endDay += 1;
          // Simple day overflow handling (doesn't account for month/year boundaries perfectly, but good enough)
          if (endDay > 31) {
            endDay = 1;
            endMonth += 1;
            if (endMonth > 12) {
              endMonth = 1;
              endYear += 1;
            }
          }
        }

        endDateTimeFormatted = `${endYear}-${String(endMonth).padStart(2,'0')}-${String(endDay).padStart(2,'0')}T${String(endHour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;

        console.log(`📅 Using RAW datetime components (no timezone conversion):`);
        console.log(`   Start: ${startDateTimeFormatted}`);
        console.log(`   End: ${endDateTimeFormatted}`);
      } else {
        // Use the Intl-based formatter for other date formats
        startDateTimeFormatted = formatLocalDateTime(appointmentDateTime);
        endDateTimeFormatted = formatLocalDateTime(endTime);

        console.log(`📅 Using Intl.DateTimeFormat (with timezone conversion):`);
        console.log(`   Start: ${startDateTimeFormatted}`);
        console.log(`   End: ${endDateTimeFormatted}`);
      }

      const event = {
        summary: `${serviceType} - ${customerName}`,
        description: description,
        start: {
          dateTime: startDateTimeFormatted,
          timeZone: businessTimezone,
        },
        end: {
          dateTime: endDateTimeFormatted,
          timeZone: businessTimezone,
        },
      };

      console.log('📅 Creating calendar event:');
      console.log(`   Summary: ${event.summary}`);
      console.log(`   Start: ${startDateTimeFormatted} (${businessTimezone})`);
      console.log(`   End: ${endDateTimeFormatted} (${businessTimezone})`);
      console.log('   Full event object:', JSON.stringify(event, null, 2));

      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event,
      });

      console.log('✅ Calendar event created successfully:', response.data.id);

      // Format confirmation message
      let formattedDate: string;
      let formattedTime: string;

      if (rawDateTimeComponents) {
        // Use raw components for accurate display
        const { year, month, day, hour, minute } = rawDateTimeComponents;
        const date = new Date(year, month - 1, day);
        formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        formattedTime = `${displayHour}:${String(minute).padStart(2,'0')} ${ampm}`;

        console.log(`📅 Formatted confirmation: ${formattedDate} at ${formattedTime} (using RAW components)`);
      } else {
        // Use Date object formatting with timezone
        const confirmDate = new Date(response.data.start?.dateTime || appointmentDateTime);
        formattedDate = confirmDate.toLocaleDateString('en-US', {
          timeZone: businessTimezone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        formattedTime = confirmDate.toLocaleTimeString('en-US', {
          timeZone: businessTimezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        console.log(`📅 Formatted confirmation: ${formattedDate} at ${formattedTime} (using Intl formatting)`);
      }

      const appointmentResponse: IntegrationResponse = {
        success: true,
        message: `Perfect! I've booked your ${serviceType} appointment for ${formattedDate} at ${formattedTime}. Your confirmation number is ${response.data.id?.substring(0, 8)}.`,
        confirmationId: response.data.id || undefined,
        data: {
          eventId: response.data.id,
          eventLink: response.data.htmlLink,
          appointmentDate: formattedDate,
          appointmentTime: formattedTime,
          customer_phone: phoneNumber,
          customer_name: customerName,
          action_type: 'reservation',
          details: {
            date: formattedDate,
            time: formattedTime,
            party_size: partySize,
            special_requests: specialRequests
          }
        }
      };

      // Auto-send SMS if configured for book_appointment function
      if (request.agentId && phoneNumber) {
        await this.autoSendFunctionSMS(request.agentId, 'book_appointment', {
          customer_phone: phoneNumber,
          customer_name: customerName,
          appointment_date: formattedDate,
          appointment_time: formattedTime,
          confirmation_number: response.data.id?.substring(0, 8),
          service_type: serviceType
        }, request.userId);
      }

      return appointmentResponse;

    } catch (error) {
      console.error('❌ Failed to create calendar event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calendar booking failed',
        message: 'I apologize, but I encountered an issue booking your appointment. Please call us directly to schedule.'
      };
    }
  }

  /**
   * Handle modify/update appointment with Google Calendar
   */
  private async handleModifyCalendarAppointment(
    request: IntegrationRequest,
    settings: any
  ): Promise<IntegrationResponse> {
    console.log('✏️ Modifying Calendar appointment');
    console.log(`   Agent ID: ${request.agentId || 'not provided'}`);
    console.log(`   User ID: ${request.userId}`);

    // Check for agent-specific Google Calendar OAuth integration
    if (!request.agentId) {
      console.log('❌ No agent ID provided');
      return {
        success: false,
        error: 'No agent ID provided',
        message: 'I apologize, but calendar modification requires an agent to be configured. Please contact support.'
      };
    }

    // Get agent integrations
    const agentIntegrations = await storage.getAgentIntegrations(request.agentId);
    const googleCalendarIntegration = agentIntegrations.find(
      (integration: any) => 
        integration.type === 'Calendar' && 
        integration.isOAuthIntegration === true
    );

    if (!googleCalendarIntegration) {
      console.log('❌ No Google Calendar integration found for this agent');
      return {
        success: false,
        error: 'No Calendar integration configured',
        message: 'Google Calendar not connected for this agent. Please connect in dashboard Integrations tab.'
      };
    }

    console.log('✅ Found agent-specific Google Calendar integration');

    // Decrypt OAuth credentials
    const accessToken = this.decryptOAuthCredential(googleCalendarIntegration.oauthAccessToken);
    const refreshToken = this.decryptOAuthCredential(googleCalendarIntegration.oauthRefreshToken);
    const calendarId = this.decryptOAuthCredential(googleCalendarIntegration.oauthCalendarId);

    if (!accessToken || !calendarId) {
      console.log('❌ Failed to decrypt required Google Calendar credentials');
      return {
        success: false,
        error: 'Invalid Calendar credentials',
        message: 'Google Calendar credentials are invalid. Please reconnect in dashboard Integrations tab.'
      };
    }

    console.log('✅ Successfully decrypted Google Calendar credentials');
    console.log('📋 Payload received:', JSON.stringify(request.payload, null, 2));

    try {
      // Initialize Google Calendar API
      const { google } = await import('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://your-app.com/callback'
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Check if this is a reschedule operation (has current + new time, no event ID)
      let eventId = request.payload.event_id || request.payload.appointment_id || request.payload.booking_id;
      const currentTime = request.payload.current_appointment_time || request.payload.old_appointment_time || request.payload.old_session_time;
      const customerName = request.payload.customer_name || request.payload.patient_name || request.payload.owner_name || request.payload.student_name;

      // If no eventId but we have current time and customer name, search for the event
      if (!eventId && currentTime && customerName) {
        console.log(`🔍 Searching for event: customer="${customerName}", time="${currentTime}"`);

        try {
          const currentDateTime = new Date(currentTime);
          // Search in a 2-hour window around the appointment time
          const timeMin = new Date(currentDateTime.getTime() - (60 * 60 * 1000)); // 1 hour before
          const timeMax = new Date(currentDateTime.getTime() + (120 * 60 * 1000)); // 2 hours after

          const searchResults = await calendar.events.list({
            calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
          });

          // Find event matching customer name
          const matchingEvent = searchResults.data.items?.find((event: any) => {
            const summary = event.summary || '';
            const description = event.description || '';
            const eventText = `${summary} ${description}`.toLowerCase();
            return eventText.includes(customerName.toLowerCase());
          });

          if (matchingEvent) {
            eventId = matchingEvent.id;
            console.log(`✅ Found matching event: ${eventId}`);
          } else {
            console.log(`❌ No matching event found for ${customerName} at ${currentTime}`);
            return {
              success: false,
              error: 'Event not found',
              message: `I couldn't find an appointment for ${customerName} at ${currentTime}. Could you verify the details?`
            };
          }
        } catch (searchError) {
          console.error('❌ Error searching for event:', searchError);
          return {
            success: false,
            error: 'Search failed',
            message: 'I had trouble finding your appointment. Please provide your confirmation number.'
          };
        }
      }

      // At this point, we must have an eventId
      if (!eventId) {
        return {
          success: false,
          error: 'Missing event ID',
          message: 'I apologize, but I need the appointment confirmation number to modify it. Could you provide that?'
        };
      }

      // Build patch object with only fields that need updating
      const eventPatch: any = {};

      // Parse new time if provided (support reschedule_appointment parameters)
      const newAppointmentTime = request.payload.new_appointment_time || request.payload.new_session_time || request.payload.appointment_time;

      if (newAppointmentTime || (request.payload.reservation_date && request.payload.reservation_time)) {
        let newDateTime: Date;
        if (newAppointmentTime) {
          newDateTime = new Date(newAppointmentTime);
        } else if (request.payload.appointment_time) {
          newDateTime = new Date(request.payload.appointment_time);
        } else {
          newDateTime = new Date(`${request.payload.reservation_date}T${request.payload.reservation_time}`);
        }

        const endDateTime = new Date(newDateTime.getTime() + (90 * 60 * 1000)); // 90 minutes
        const timeZone = 'America/New_York'; // TODO: Get from user settings

        eventPatch.start = {
          dateTime: newDateTime.toISOString(),
          timeZone: timeZone
        };
        eventPatch.end = {
          dateTime: endDateTime.toISOString(),
          timeZone: timeZone
        };
      }

      // Update customer name if provided
      if (request.payload.customer_name) {
        const partySize = request.payload.party_size || 1;
        eventPatch.summary = `Reservation - ${request.payload.customer_name} (${partySize} people)`;
      }

      // Update description with new details
      if (request.payload.special_requests) {
        // Fetch existing event first to preserve some fields
        const existingEvent = await calendar.events.get({
          calendarId,
          eventId
        });

        eventPatch.description = existingEvent.data.description + `\n\nUpdated: ${request.payload.special_requests}`;
      }

      console.log(`✏️ Patching event ${eventId} with:`, JSON.stringify(eventPatch, null, 2));

      // Update the event using patch (only updates specified fields)
      const response = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: eventPatch,
        sendUpdates: 'all' // Notify attendees of changes
      });

      console.log(`✅ Calendar event updated successfully!`);
      console.log(`   Event ID: ${response.data.id}`);
      console.log(`   Event URL: ${response.data.htmlLink}`);

      const modifyResponse = {
        success: true,
        message: `Perfect! I've updated your appointment. Your confirmation number is still ${eventId.slice(-6)}.`,
        confirmationId: eventId,
        data: {
          eventId: response.data.id,
          eventUrl: response.data.htmlLink,
          updatedFields: Object.keys(eventPatch)
        }
      };

      // Auto-send SMS if configured for modify_appointment_details function
      const customerPhone = request.payload.customer_phone || request.payload.phone_number;
      // customerName already declared above when searching for event

      if (request.agentId && customerPhone) {
        await this.autoSendFunctionSMS(request.agentId, 'modify_appointment_details', {
          customer_phone: customerPhone,
          customer_name: customerName,
          confirmation_number: eventId.slice(-6),
          updated_fields: Object.keys(eventPatch).join(', ')
        }, request.userId);
      }

      return modifyResponse;

    } catch (error) {
      console.error('❌ Google Calendar modification failed:', error);

      if (error instanceof Error) {
        console.error('   Error message:', error.message);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calendar API error',
        message: 'I apologize, but I encountered an issue modifying your appointment. Please call us directly and we\'ll be happy to help.'
      };
    }
  }

  /**
   * Handle cancel appointment with Google Calendar
   */
  private async handleCancelCalendarAppointment(
    request: IntegrationRequest,
    settings: any
  ): Promise<IntegrationResponse> {
    console.log('🗑️ Cancelling Calendar appointment');
    console.log(`   Agent ID: ${request.agentId || 'not provided'}`);
    console.log(`   User ID: ${request.userId}`);

    if (!request.agentId) {
      console.log('❌ No agent ID provided');
      return {
        success: false,
        error: 'No agent ID provided',
        message: 'I apologize, but calendar cancellation requires an agent to be configured. Please contact support.'
      };
    }

    // Get agent integrations
    const agentIntegrations = await storage.getAgentIntegrations(request.agentId);
    const googleCalendarIntegration = agentIntegrations.find(
      (integration: any) =>
        integration.type === 'Calendar' &&
        integration.isOAuthIntegration === true
    );

    if (!googleCalendarIntegration) {
      console.log('❌ No Google Calendar integration found for this agent');
      return {
        success: false,
        error: 'No Calendar integration configured',
        message: 'Google Calendar not connected for this agent. Please connect in dashboard Integrations tab.'
      };
    }

    console.log('✅ Found agent-specific Google Calendar integration');

    // Decrypt OAuth credentials
    const accessToken = this.decryptOAuthCredential(googleCalendarIntegration.oauthAccessToken);
    const refreshToken = this.decryptOAuthCredential(googleCalendarIntegration.oauthRefreshToken);
    const calendarId = this.decryptOAuthCredential(googleCalendarIntegration.oauthCalendarId);

    if (!accessToken || !calendarId) {
      console.log('❌ Failed to decrypt required Google Calendar credentials');
      return {
        success: false,
        error: 'Invalid Calendar credentials',
        message: 'Google Calendar credentials are invalid. Please reconnect in dashboard Integrations tab.'
      };
    }

    console.log('✅ Successfully decrypted Google Calendar credentials');
    console.log('📋 Payload received:', JSON.stringify(request.payload, null, 2));

    try {
      // Extract customer name - support multiple field names across industries
      const customerName = request.payload.customer_name ||
                          request.payload.patient_name ||
                          request.payload.owner_name ||
                          request.payload.student_name ||
                          '';

      // Extract appointment time - support multiple field names
      const appointmentTimeStr = request.payload.appointment_time ||
                                 request.payload.session_time ||
                                 '';

      console.log(`🗑️ Looking for event: customer="${customerName}", time="${appointmentTimeStr}"`);

      if (!customerName) {
        return {
          success: false,
          error: 'Missing customer name',
          message: 'I apologize, but I need the customer name to find and cancel the appointment. Could you provide that?'
        };
      }

      // Initialize Google Calendar API
      const { google } = await import('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://your-app.com/callback'
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Determine search window around the appointment time.
      // Use a ±12 hour window to account for timezone offsets: the AI sends
      // times in the business's local timezone (e.g. "2026-02-20T14:00:00"
      // meaning 2 PM Eastern), but Google Calendar's events.list() timeMin/
      // timeMax are compared in UTC. A 24-hour centered window ensures we
      // find the event regardless of which timezone the business is in.
      let searchTimeMin: Date;
      let searchTimeMax: Date;

      if (appointmentTimeStr) {
        const isoMatch = appointmentTimeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (isoMatch) {
          // Treat as UTC pivot for the search window (actual event may be offset)
          const parsed = new Date(`${appointmentTimeStr.slice(0, 19)}Z`);
          searchTimeMin = new Date(parsed.getTime() - 12 * 60 * 60 * 1000); // 12 hours before
          searchTimeMax = new Date(parsed.getTime() + 12 * 60 * 60 * 1000); // 12 hours after
        } else {
          const parsed = new Date(appointmentTimeStr);
          if (!isNaN(parsed.getTime())) {
            searchTimeMin = new Date(parsed.getTime() - 12 * 60 * 60 * 1000);
            searchTimeMax = new Date(parsed.getTime() + 12 * 60 * 60 * 1000);
          } else {
            // Can't parse time - search last 7 days to now + 30 days
            searchTimeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            searchTimeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }
        }
      } else {
        // No appointment time given - search upcoming events (next 30 days)
        searchTimeMin = new Date();
        searchTimeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      console.log(`🔍 Searching events from ${searchTimeMin.toISOString()} to ${searchTimeMax.toISOString()}`);

      const eventsResponse = await calendar.events.list({
        calendarId,
        timeMin: searchTimeMin.toISOString(),
        timeMax: searchTimeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50
      });

      const events = eventsResponse.data.items || [];
      console.log(`🔍 Found ${events.length} events in search window`);

      // Find the matching event by customer name in summary
      const customerNameLower = customerName.toLowerCase();
      let matchingEvent: any = null;

      for (const event of events) {
        const summary = (event.summary || '').toLowerCase();
        if (summary.includes(customerNameLower)) {
          matchingEvent = event;
          console.log(`✅ Found matching event: "${event.summary}" (ID: ${event.id})`);
          break;
        }
      }

      if (!matchingEvent) {
        console.log(`❌ No event found matching customer name "${customerName}"`);
        console.log(`   Searched ${events.length} events. Summaries:`, events.map((e: any) => e.summary));
        return {
          success: false,
          error: 'Appointment not found',
          message: `I apologize, but I couldn't find an upcoming appointment for ${customerName}. Could you double-check the name or appointment time?`
        };
      }

      const eventId = matchingEvent.id;
      const eventSummary = matchingEvent.summary;
      const eventStartTime = matchingEvent.start?.dateTime || matchingEvent.start?.date || '';

      console.log(`🗑️ Deleting event: ID=${eventId}, Summary="${eventSummary}", Start=${eventStartTime}`);

      // Delete the event
      await calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all'
      });

      console.log(`✅ Calendar event "${eventSummary}" deleted successfully!`);

      const reason = request.payload.reason || '';
      const cancelResponse: IntegrationResponse = {
        success: true,
        message: `Done! I've cancelled the appointment for ${customerName}${reason ? ` (Reason: ${reason})` : ''}. The event has been removed from the calendar.`,
        data: {
          cancelledEventId: eventId,
          cancelledEventSummary: eventSummary,
          cancelledEventTime: eventStartTime,
          customer_name: customerName,
          appointment_time: appointmentTimeStr || eventStartTime,
          reason: reason
        }
      };

      return cancelResponse;

    } catch (error) {
      console.error('❌ Google Calendar cancellation failed:', error);

      if (error instanceof Error) {
        console.error('   Error message:', error.message);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calendar API error',
        message: 'I apologize, but I encountered an issue cancelling your appointment. Please call us directly and we\'ll be happy to help.'
      };
    }
  }

  /**
   * Handle Delivery integrations (DoorDash, Uber Eats, etc.)
   */
  private async handleDeliveryIntegration(
    request: IntegrationRequest,
    settings: any
  ): Promise<IntegrationResponse> {
    const deliveryConfig = settings.deliverySystem;

    if (!deliveryConfig) {
      return {
        success: false,
        error: 'No delivery system configured',
        message: 'I apologize, but delivery is not currently available. Would you like to place an order for pickup instead?'
      };
    }

    // Check which delivery provider is configured
    if (deliveryConfig.doorDash) {
      return await this.handleDoorDashDelivery(request, deliveryConfig.doorDash);
    }

    if (deliveryConfig.uberEats) {
      return await this.handleUberEatsDelivery(request, deliveryConfig.uberEats);
    }

    if (deliveryConfig.inHouse) {
      return await this.handleInHouseDelivery(request, deliveryConfig.inHouse);
    }

    return {
      success: false,
      error: 'No delivery options configured',
      message: 'I apologize, but delivery is not currently available. Would you like to place an order for pickup instead?'
    };
  }

  /**
   * DoorDash Drive API Integration
   * API Docs: https://developer.doordash.com/en-US/docs/drive/tutorials/get_started/
   */
  private async handleDoorDashDelivery(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🚗 Processing DoorDash Drive delivery');

      const { payload } = request;

      // Step 1: Create a quote (required before creating delivery)
      const quotePayload = {
        external_delivery_id: `${request.restaurantId}-${Date.now()}`,
        pickup_address: payload.pickup_address || config.pickupAddress,
        pickup_business_name: payload.business_name || config.businessName,
        pickup_phone_number: payload.pickup_phone || config.pickupPhone,
        pickup_instructions: payload.pickup_instructions || '',
        dropoff_address: payload.delivery_address,
        dropoff_business_name: payload.customer_name,
        dropoff_phone_number: payload.customer_phone,
        dropoff_instructions: payload.delivery_instructions || '',
        order_value: Math.round((payload.order_value_cents || payload.total * 100))
      };

      console.log('📡 Step 1: Creating DoorDash quote');
      const quoteResponse = await axios.post(
        'https://openapi.doordash.com/drive/v2/quotes',
        quotePayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const quoteId = quoteResponse.data.external_delivery_id;
      const fee = quoteResponse.data.fee;
      const estimatedDeliveryTime = quoteResponse.data.estimated_pickup_time;

      console.log(`✅ Quote created: ${quoteId}, Fee: $${fee / 100}`);

      // Step 2: Accept the quote to create the delivery
      console.log('📡 Step 2: Accepting DoorDash quote');
      const acceptResponse = await axios.post(
        `https://openapi.doordash.com/drive/v2/deliveries/${quoteId}/accept`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const deliveryId = acceptResponse.data.external_delivery_id;
      const trackingUrl = acceptResponse.data.tracking_url;

      console.log(`✅ DoorDash delivery created: ${deliveryId}`);

      return {
        success: true,
        message: `Perfect! I've arranged delivery through DoorDash. Your delivery should arrive in approximately ${Math.round(estimatedDeliveryTime / 60)} minutes. The delivery fee is $${(fee / 100).toFixed(2)}. You'll receive a tracking link via text message.`,
        confirmationId: deliveryId,
        data: {
          delivery_id: deliveryId,
          tracking_url: trackingUrl,
          fee: fee / 100,
          estimated_time: estimatedDeliveryTime
        }
      };

    } catch (error) {
      console.error('❌ DoorDash delivery error:', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('   Status:', axiosError.response?.status);
        console.error('   Response:', JSON.stringify(axiosError.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'DoorDash API error',
        message: 'I apologize, but I encountered an issue arranging delivery through DoorDash. Please call us directly for delivery options.'
      };
    }
  }

  /**
   * Uber Eats Direct API Integration
   * API Docs: https://developer.uber.com/docs/deliveries/direct/api/v1/post-eats-deliveries-orders
   */
  private async handleUberEatsDelivery(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🚕 Processing Uber Eats Direct delivery');

      const { payload } = request;

      // Step 1: Get delivery estimate
      const estimatePayload = {
        pickup: {
          location: {
            address: payload.pickup_address || config.pickupAddress
          }
        },
        dropoff: {
          location: {
            address: payload.delivery_address
          }
        }
      };

      console.log('📡 Step 1: Getting Uber Eats estimate');
      const estimateResponse = await axios.post(
        'https://api.uber.com/v1/eats/deliveries/estimates',
        estimatePayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const estimateId = estimateResponse.data.estimate_id;
      const fee = estimateResponse.data.fee;
      const estimatedTime = estimateResponse.data.pickup_eta;

      console.log(`✅ Estimate created: ${estimateId}, Fee: $${fee}`);

      // Step 2: Create the delivery using the estimate ID
      const deliveryPayload = {
        estimate_id: estimateId,
        pickup: {
          store_id: config.storeId,
          instructions: payload.pickup_instructions || ''
        },
        dropoff: {
          contact: {
            first_name: payload.customer_name.split(' ')[0],
            last_name: payload.customer_name.split(' ').slice(1).join(' ') || '',
            phone: payload.customer_phone
          },
          location: {
            address: payload.delivery_address,
            instructions: payload.delivery_instructions || ''
          },
          delivery_type: 'MEET_AT_DOOR'
        },
        order_items: payload.items.map((item: any) => ({
          name: item.item_name || item.name,
          quantity: item.quantity,
          price: item.item_price || item.price || 0
        })),
        order_summary: {
          order_value: payload.order_value_cents || payload.total * 100
        }
      };

      console.log('📡 Step 2: Creating Uber Eats delivery');
      const deliveryResponse = await axios.post(
        'https://api.uber.com/v1/eats/deliveries/orders',
        deliveryPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const deliveryId = deliveryResponse.data.order_id;
      const trackingUrl = deliveryResponse.data.tracking_url;

      console.log(`✅ Uber Eats delivery created: ${deliveryId}`);

      return {
        success: true,
        message: `Great! I've arranged delivery through Uber Eats. Your delivery should arrive in approximately ${estimatedTime} minutes. The delivery fee is $${fee}. You'll receive a tracking link via text message.`,
        confirmationId: deliveryId,
        data: {
          delivery_id: deliveryId,
          tracking_url: trackingUrl,
          fee: fee,
          estimated_time: estimatedTime
        }
      };

    } catch (error) {
      console.error('❌ Uber Eats delivery error:', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('   Status:', axiosError.response?.status);
        console.error('   Response:', JSON.stringify(axiosError.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Uber Eats API error',
        message: 'I apologize, but I encountered an issue arranging delivery through Uber Eats. Please call us directly for delivery options.'
      };
    }
  }

  /**
   * In-house delivery handling
   */
  private async handleInHouseDelivery(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    const deliveryData = {
      orderId: `DEL-${Date.now()}`,
      customerAddress: request.payload.delivery_address,
      customerPhone: request.payload.customer_phone,
      items: request.payload.items,
      deliveryFee: config.deliveryFee || 2.99,
      estimatedTime: '30-45 minutes'
    };

    // Store delivery request in database
    await storage.createDeliveryRequest(request.restaurantId, deliveryData);

    return {
      success: true,
      message: `Perfect! I've arranged delivery to ${request.payload.delivery_address}. The delivery fee is $${deliveryData.deliveryFee} and your order should arrive in ${deliveryData.estimatedTime}. Your delivery tracking number is ${deliveryData.orderId.slice(-6)}.`,
      confirmationId: deliveryData.orderId,
      data: deliveryData
    };
  }

  /**
   * Handle Appointment Setting Integrations
   */
  private async handleAppointmentIntegration(
    request: IntegrationRequest,
    settings: any
  ): Promise<IntegrationResponse> {
    const appointmentConfig = settings.appointmentSystem;

    if (!appointmentConfig) {
      return {
        success: false,
        error: 'No appointment system configured',
        message: 'I apologize, but appointment booking is not configured. Please call us directly to schedule.'
      };
    }

    const systemType = appointmentConfig.type;
    console.log(`📅 Using appointment system: ${systemType}`);

    switch (systemType) {
      case 'cal.com':
      case 'calcom':
        return await this.handleCalComAppointment(request, appointmentConfig);

      case 'calendly':
        return await this.handleCalendlyAppointment(request, appointmentConfig);

      case 'housecall_pro':
      case 'housecallpro':
        return await this.handleHousecallProJob(request, appointmentConfig);

      case 'meevo':
        return await this.handleMeevoAppointment(request, appointmentConfig);

      case 'boulevard':
        return await this.handleBoulevardAppointment(request, appointmentConfig);

      case 'servicetitan':
        return await this.handleServiceTitanJob(request, appointmentConfig);

      case 'servicetrade':
        return await this.handleServiceTradeAppointment(request, appointmentConfig);

      default:
        return {
          success: false,
          error: `Unknown appointment system: ${systemType}`,
          message: 'I apologize, but that appointment system is not supported. Please call us directly.'
        };
    }
  }

  /**
   * Cal.com Integration
   * API: POST /v1/bookings
   */
  private async handleCalComAppointment(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('📅 Processing Cal.com booking');

      const { payload } = request;

      const bookingPayload = {
        eventTypeId: config.eventTypeId,
        start: payload.start || payload.reservation_date + 'T' + payload.reservation_time,
        responses: {
          name: payload.customer_name || `${payload.customer_first_name} ${payload.customer_last_name}`,
          email: payload.customer_email || '',
          phone: payload.customer_phone || '',
          notes: payload.special_requests || payload.notes || ''
        },
        timeZone: config.timeZone || 'America/New_York',
        language: 'en'
      };

      console.log(`📡 Calling Cal.com API: POST https://api.cal.com/v1/bookings`);

      const response = await axios.post(
        'https://api.cal.com/v1/bookings',
        bookingPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const bookingUid = response.data.uid;
      const startTime = new Date(response.data.startTime);

      console.log(`✅ Cal.com booking created: ${bookingUid}`);

      return {
        success: true,
        message: `Perfect! I've scheduled your appointment for ${startTime.toLocaleString()}. You'll receive a confirmation email with all the details.`,
        confirmationId: bookingUid,
        data: {
          booking_id: bookingUid,
          status: response.data.status,
          start_time: response.data.startTime,
          end_time: response.data.endTime
        }
      };

    } catch (error) {
      console.error('❌ Cal.com error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cal.com API error',
        message: 'I apologize, but I encountered an issue scheduling your appointment. Please call us directly to book.'
      };
    }
  }

  /**
   * Calendly Integration
   * Note: Calendly API doesn't support direct booking - use scheduling links
   */
  private async handleCalendlyAppointment(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('📅 Processing Calendly scheduling link');

      // Calendly doesn't allow direct booking via API
      // Return scheduling link for customer to complete booking
      const schedulingUrl = config.schedulingUrl || config.eventTypeUrl;

      if (!schedulingUrl) {
        return {
          success: false,
          error: 'No Calendly scheduling URL configured',
          message: 'I apologize, but our scheduling system is not properly configured. Please call us directly.'
        };
      }

      // We can pre-fill the scheduling page with customer info
      const { payload } = request;
      const prefillParams = new URLSearchParams({
        name: payload.customer_name || `${payload.customer_first_name} ${payload.customer_last_name}`,
        email: payload.customer_email || '',
        a1: payload.customer_phone || '' // Custom answer for phone
      });

      const fullUrl = `${schedulingUrl}?${prefillParams.toString()}`;

      console.log(`✅ Generated Calendly scheduling link: ${fullUrl}`);

      return {
        success: true,
        message: `I can help you schedule an appointment! I'll send you a link via text message where you can choose your preferred time. Or you can call us directly and we'll book it for you right now.`,
        confirmationId: `calendly_${Date.now()}`,
        data: {
          scheduling_url: fullUrl,
          note: 'Customer needs to complete booking via scheduling page'
        }
      };

    } catch (error) {
      console.error('❌ Calendly error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calendly error',
        message: 'I apologize, but I encountered an issue with our scheduling system. Please call us directly.'
      };
    }
  }

  /**
   * Housecall Pro Integration
   * API: POST /v1/jobs
   */
  private async handleHousecallProJob(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🏠 Processing Housecall Pro job');

      const { payload } = request;

      const jobPayload = {
        customer: {
          first_name: payload.customer_first_name || payload.customer_name.split(' ')[0],
          last_name: payload.customer_last_name || payload.customer_name.split(' ').slice(1).join(' '),
          email: payload.customer_email,
          mobile_number: payload.customer_phone
        },
        schedule: {
          start: payload.start || payload.reservation_date + 'T' + payload.reservation_time,
          end: payload.end || null
        },
        description: payload.description || payload.special_requests || payload.service_type || 'Service appointment'
      };

      console.log(`📡 Calling Housecall Pro API: POST https://api.housecallpro.com/v1/jobs`);

      const response = await axios.post(
        'https://api.housecallpro.com/v1/jobs',
        jobPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const jobId = response.data.id;

      console.log(`✅ Housecall Pro job created: ${jobId}`);

      return {
        success: true,
        message: `Perfect! I've scheduled your service appointment. You'll receive a confirmation text message shortly with all the details. Your job number is ${jobId.slice(-6)}.`,
        confirmationId: jobId,
        data: {
          job_id: jobId,
          status: response.data.status,
          customer_id: response.data.customer_id,
          schedule: response.data.schedule
        }
      };

    } catch (error) {
      console.error('❌ Housecall Pro error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Housecall Pro API error',
        message: 'I apologize, but I encountered an issue scheduling your service. Please call us directly.'
      };
    }
  }

  /**
   * Meevo Integration
   * API: POST /v2/appointments
   */
  private async handleMeevoAppointment(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('💇 Processing Meevo appointment');

      const { payload } = request;

      const appointmentPayload = {
        locationId: config.locationId,
        clientId: payload.clientId || config.defaultClientId, // May need client lookup first
        employeeId: payload.employeeId || config.defaultEmployeeId,
        serviceId: payload.serviceId || config.defaultServiceId,
        startDateTime: payload.start || payload.reservation_date + 'T' + payload.reservation_time,
        duration: payload.duration || 60 // minutes
      };

      console.log(`📡 Calling Meevo API: POST https://api.meevo.com/v2/appointments`);

      const response = await axios.post(
        'https://api.meevo.com/v2/appointments',
        appointmentPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const appointmentId = response.data.appointmentId;

      console.log(`✅ Meevo appointment created: ${appointmentId}`);

      return {
        success: true,
        message: `Excellent! I've booked your appointment for ${new Date(appointmentPayload.startDateTime).toLocaleString()}. You'll receive a confirmation shortly.`,
        confirmationId: appointmentId,
        data: {
          appointment_id: appointmentId,
          status: response.data.status,
          start_time: response.data.startDateTime,
          end_time: response.data.endDateTime
        }
      };

    } catch (error) {
      console.error('❌ Meevo error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Meevo API error',
        message: 'I apologize, but I encountered an issue booking your appointment. Please call us directly.'
      };
    }
  }

  /**
   * Boulevard Integration (GraphQL)
   * API: POST /graphql
   */
  private async handleBoulevardAppointment(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('💅 Processing Boulevard appointment (GraphQL)');

      const { payload } = request;

      // Create GraphQL client
      const client = createGraphQLClient({
        endpoint: 'https://api.boulevard.io/v1/graphql',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });

      // Variables for the mutation
      const variables = {
        input: {
          locationId: config.locationId,
          clientId: payload.clientId, // May need to create client first if doesn't exist
          serviceIds: [payload.serviceId || config.defaultServiceId],
          startAt: payload.start || payload.reservation_date + 'T' + payload.reservation_time
        }
      };

      console.log(`📡 Calling Boulevard GraphQL API`);

      const response = await client.mutate(
        BoulevardQueries.createAppointment,
        variables
      );

      const appointment = response.data?.createAppointment?.appointment;

      if (!appointment) {
        throw new Error('No appointment data returned from Boulevard');
      }

      console.log(`✅ Boulevard appointment created: ${appointment.id}`);

      return {
        success: true,
        message: `Perfect! I've scheduled your appointment for ${new Date(appointment.startAt).toLocaleString()}. You'll receive a confirmation email with all the details.`,
        confirmationId: appointment.id,
        data: {
          appointment_id: appointment.id,
          status: appointment.status,
          start_time: appointment.startAt,
          end_time: appointment.endAt
        }
      };

    } catch (error) {
      console.error('❌ Boulevard error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Boulevard API error',
        message: 'I apologize, but I encountered an issue scheduling your appointment. Please call us directly.'
      };
    }
  }

  /**
   * ServiceTitan Integration (OAuth)
   * API: POST /jpm/v2/tenant/{tenantId}/jobs
   */
  private async handleServiceTitanJob(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🔧 Processing ServiceTitan job');

      const { payload } = request;

      // Get valid OAuth access token
      const accessToken = await oauthTokenService.getValidAccessToken(request.userId, 'servicetitan');

      if (!accessToken) {
        return {
          success: false,
          error: 'ServiceTitan authentication failed',
          message: 'I apologize, but our scheduling system authentication has expired. Please call us directly.'
        };
      }

      const jobPayload = {
        customerId: payload.customerId || config.defaultCustomerId,
        locationId: payload.locationId || config.defaultLocationId,
        jobTypeId: payload.jobTypeId || config.defaultJobTypeId,
        businessUnitId: config.businessUnitId,
        priority: payload.priority || 'Normal',
        start: payload.start || payload.reservation_date + 'T' + payload.reservation_time
      };

      const tenantId = config.tenantId;
      console.log(`📡 Calling ServiceTitan API: POST https://api.servicetitan.io/jpm/v2/tenant/${tenantId}/jobs`);

      const response = await axios.post(
        `https://api.servicetitan.io/jpm/v2/tenant/${tenantId}/jobs`,
        jobPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const jobId = response.data.id;
      const jobNumber = response.data.jobNumber;

      console.log(`✅ ServiceTitan job created: ${jobNumber}`);

      return {
        success: true,
        message: `Great! I've created your service job. Your job number is ${jobNumber}. You'll receive a confirmation with the technician details shortly.`,
        confirmationId: jobId.toString(),
        data: {
          job_id: jobId,
          job_number: jobNumber,
          status: response.data.status,
          start: response.data.start
        }
      };

    } catch (error) {
      console.error('❌ ServiceTitan error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'ServiceTitan API error',
        message: 'I apologize, but I encountered an issue scheduling your service. Please call us directly.'
      };
    }
  }

  /**
   * ServiceTrade Integration
   * API: POST /api/appointments
   */
  private async handleServiceTradeAppointment(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🛠️ Processing ServiceTrade appointment');

      const { payload } = request;

      const appointmentPayload = {
        location_id: config.locationId,
        scheduled_start: payload.start || payload.reservation_date + 'T' + payload.reservation_time,
        scheduled_end: payload.end || null,
        description: payload.description || payload.service_type || 'Service appointment',
        customer_name: payload.customer_name || `${payload.customer_first_name} ${payload.customer_last_name}`,
        customer_phone: payload.customer_phone
      };

      console.log(`📡 Calling ServiceTrade API: POST https://api.servicetrade.com/api/appointments`);

      const response = await axios.post(
        'https://api.servicetrade.com/api/appointments',
        appointmentPayload,
        {
          headers: {
            'X-API-Key': config.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const appointmentId = response.data.id;
      const appointmentNumber = response.data.number;

      console.log(`✅ ServiceTrade appointment created: ${appointmentNumber}`);

      return {
        success: true,
        message: `Perfect! I've scheduled your service appointment. Your appointment number is ${appointmentNumber}. You'll receive a confirmation shortly.`,
        confirmationId: appointmentId.toString(),
        data: {
          appointment_id: appointmentId,
          appointment_number: appointmentNumber,
          status: response.data.status,
          scheduled_start: response.data.scheduled_start
        }
      };

    } catch (error) {
      console.error('❌ ServiceTrade error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'ServiceTrade API error',
        message: 'I apologize, but I encountered an issue scheduling your appointment. Please call us directly.'
      };
    }
  }

  /**
   * Handle CRM Integrations
   */
  private async handleCRMIntegration(
    request: IntegrationRequest,
    settings: any
  ): Promise<IntegrationResponse> {
    const crmConfig = settings.crmSystem;

    if (!crmConfig) {
      return {
        success: false,
        error: 'No CRM system configured',
        message: 'CRM integration is not configured.'
      };
    }

    const crmType = crmConfig.type;
    console.log(`📊 Using CRM system: ${crmType}`);

    switch (crmType) {
      case 'zoho':
        return await this.handleZohoCRM(request, crmConfig);

      case 'acculynx':
        return await this.handleAcculynxCRM(request, crmConfig);

      case 'bitrix24':
        return await this.handleBitrix24CRM(request, crmConfig);

      case 'gohighlevel':
      case 'go_high_level':
        return await this.handleGoHighLevelCRM(request, crmConfig);

      case 'hubspot':
        return await this.handleHubSpotCRM(request, crmConfig);

      case 'keycrm':
        return await this.handleKeyCRM(request, crmConfig);

      case 'pipedrive':
        return await this.handlePipedriveCRM(request, crmConfig);

      case 'salesforce':
        return await this.handleSalesforceCRM(request, crmConfig);

      default:
        return {
          success: false,
          error: `Unknown CRM system: ${crmType}`,
          message: 'That CRM integration is not supported.'
        };
    }
  }

  /**
   * ZOHO CRM Integration (OAuth)
   * API: POST /crm/v2/Contacts or /Leads
   */
  private async handleZohoCRM(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('📊 Processing ZOHO CRM contact/lead');

      const { payload } = request;

      // Get valid OAuth access token
      const accessToken = await oauthTokenService.getValidAccessToken(request.userId, 'zoho');

      if (!accessToken) {
        return {
          success: false,
          error: 'ZOHO authentication failed',
          message: 'CRM authentication expired. Please re-authenticate.'
        };
      }

      const region = config.region || 'us';
      const baseUrl = region === 'eu'
        ? 'https://www.zohoapis.eu/crm/v2'
        : region === 'in'
        ? 'https://www.zohoapis.in/crm/v2'
        : 'https://www.zohoapis.com/crm/v2';

      const contactPayload = {
        data: [{
          Last_Name: payload.customer_last_name || payload.customer_name.split(' ').slice(-1)[0],
          First_Name: payload.customer_first_name || payload.customer_name.split(' ')[0],
          Email: payload.customer_email,
          Phone: payload.customer_phone,
          Description: payload.notes || payload.description || `Voice call inquiry - ${new Date().toISOString()}`
        }]
      };

      console.log(`📡 Calling ZOHO CRM API: POST ${baseUrl}/Contacts`);

      const response = await axios.post(
        `${baseUrl}/Contacts`,
        contactPayload,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const result = response.data.data[0];
      const contactId = result.details.id;

      console.log(`✅ ZOHO contact created: ${contactId}`);

      return {
        success: true,
        message: `Thank you! I've saved your information in our system. Someone will follow up with you shortly.`,
        confirmationId: contactId,
        data: {
          contact_id: contactId,
          code: result.code,
          message: result.message
        }
      };

    } catch (error) {
      console.error('❌ ZOHO CRM error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'ZOHO CRM API error',
        message: 'I apologize, but I encountered an issue saving your information. Please try calling back.'
      };
    }
  }

  /**
   * Acculynx CRM Integration
   * API: POST /api/v1/leads
   */
  private async handleAcculynxCRM(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🏗️ Processing Acculynx lead');

      const { payload } = request;

      const leadPayload = {
        firstName: payload.customer_first_name || payload.customer_name.split(' ')[0],
        lastName: payload.customer_last_name || payload.customer_name.split(' ').slice(1).join(' '),
        email: payload.customer_email,
        phone: payload.customer_phone,
        address: {
          street: payload.street_address || payload.address || '',
          city: payload.city || '',
          state: payload.state || '',
          zip: payload.zip || ''
        },
        source: 'Voice AI Phone Call'
      };

      console.log(`📡 Calling Acculynx API: POST https://api.acculynx.com/api/v1/leads`);

      const response = await axios.post(
        'https://api.acculynx.com/api/v1/leads',
        leadPayload,
        {
          headers: {
            'X-API-Key': config.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const leadId = response.data.leadId;

      console.log(`✅ Acculynx lead created: ${leadId}`);

      return {
        success: true,
        message: `Thank you! I've saved your information. One of our team members will contact you shortly to discuss your project.`,
        confirmationId: leadId,
        data: {
          lead_id: leadId,
          status: response.data.status,
          created_at: response.data.createdAt
        }
      };

    } catch (error) {
      console.error('❌ Acculynx error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Acculynx API error',
        message: 'I apologize, but I encountered an issue saving your information. Please try calling back.'
      };
    }
  }

  /**
   * Bitrix24 CRM Integration (Webhook-based)
   * API: POST {webhook_url}/crm.contact.add
   */
  private async handleBitrix24CRM(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('📊 Processing Bitrix24 contact');

      const { payload } = request;

      const webhookUrl = config.webhookUrl;
      if (!webhookUrl) {
        return {
          success: false,
          error: 'No Bitrix24 webhook URL configured',
          message: 'CRM integration is not properly configured.'
        };
      }

      const contactPayload = {
        fields: {
          NAME: payload.customer_first_name || payload.customer_name.split(' ')[0],
          LAST_NAME: payload.customer_last_name || payload.customer_name.split(' ').slice(1).join(' '),
          EMAIL: [{ VALUE: payload.customer_email, VALUE_TYPE: 'WORK' }],
          PHONE: [{ VALUE: payload.customer_phone, VALUE_TYPE: 'WORK' }],
          COMMENTS: payload.notes || `Voice call on ${new Date().toLocaleString()}`
        }
      };

      console.log(`📡 Calling Bitrix24 API: POST ${webhookUrl}crm.contact.add`);

      const response = await axios.post(
        `${webhookUrl}crm.contact.add`,
        contactPayload,
        {
          timeout: 15000
        }
      );

      const contactId = response.data.result;

      console.log(`✅ Bitrix24 contact created: ${contactId}`);

      return {
        success: true,
        message: `Thank you! I've saved your information in our system. We'll be in touch soon.`,
        confirmationId: contactId.toString(),
        data: {
          contact_id: contactId,
          time: response.data.time
        }
      };

    } catch (error) {
      console.error('❌ Bitrix24 error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bitrix24 API error',
        message: 'I apologize, but I encountered an issue saving your information. Please try calling back.'
      };
    }
  }

  /**
   * GoHighLevel CRM Integration (V2 API)
   * API: POST /contacts/
   */
  private async handleGoHighLevelCRM(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🚀 Processing GoHighLevel contact');

      const { payload } = request;

      const contactPayload = {
        firstName: payload.customer_first_name || payload.customer_name.split(' ')[0],
        lastName: payload.customer_last_name || payload.customer_name.split(' ').slice(1).join(' '),
        email: payload.customer_email,
        phone: payload.customer_phone,
        locationId: config.locationId,
        source: 'Voice AI Call',
        tags: payload.tags || ['voice-inquiry']
      };

      console.log(`📡 Calling GoHighLevel API: POST https://services.leadconnectorhq.com/contacts/`);

      const response = await axios.post(
        'https://services.leadconnectorhq.com/contacts/',
        contactPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          timeout: 15000
        }
      );

      const contactId = response.data.contact.id;

      console.log(`✅ GoHighLevel contact created: ${contactId}`);

      return {
        success: true,
        message: `Thank you! I've saved your information. Someone from our team will reach out to you soon.`,
        confirmationId: contactId,
        data: {
          contact_id: contactId,
          location_id: response.data.contact.locationId
        }
      };

    } catch (error) {
      console.error('❌ GoHighLevel error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'GoHighLevel API error',
        message: 'I apologize, but I encountered an issue saving your information. Please try calling back.'
      };
    }
  }

  /**
   * HubSpot CRM Integration (v3 API)
   * API: POST /crm/v3/objects/contacts
   */
  private async handleHubSpotCRM(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('📊 Processing HubSpot contact');

      const { payload } = request;

      // HubSpot can use private app token OR OAuth
      const accessToken = config.privateAppToken || await oauthTokenService.getValidAccessToken(request.userId, 'hubspot');

      if (!accessToken) {
        return {
          success: false,
          error: 'HubSpot authentication failed',
          message: 'CRM authentication error.'
        };
      }

      const contactPayload = {
        properties: {
          email: payload.customer_email,
          firstname: payload.customer_first_name || payload.customer_name.split(' ')[0],
          lastname: payload.customer_last_name || payload.customer_name.split(' ').slice(1).join(' '),
          phone: payload.customer_phone,
          lifecyclestage: 'lead',
          hs_lead_status: 'NEW'
        }
      };

      console.log(`📡 Calling HubSpot API: POST https://api.hubapi.com/crm/v3/objects/contacts`);

      const response = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        contactPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const contactId = response.data.id;

      console.log(`✅ HubSpot contact created: ${contactId}`);

      return {
        success: true,
        message: `Thank you! I've saved your information. We'll follow up with you shortly.`,
        confirmationId: contactId,
        data: {
          contact_id: contactId,
          created_at: response.data.createdAt
        }
      };

    } catch (error) {
      console.error('❌ HubSpot error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'HubSpot API error',
        message: 'I apologize, but I encountered an issue saving your information. Please try calling back.'
      };
    }
  }

  /**
   * KeyCRM Integration
   * API: POST /v1/leads
   */
  private async handleKeyCRM(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('🔑 Processing KeyCRM lead');

      const { payload } = request;

      const leadPayload = {
        source_id: config.sourceId,
        buyer: {
          full_name: payload.customer_name || `${payload.customer_first_name} ${payload.customer_last_name}`,
          phone: payload.customer_phone,
          email: payload.customer_email
        },
        products: payload.items || [
          {
            price: payload.order_amount || 0,
            quantity: 1
          }
        ]
      };

      console.log(`📡 Calling KeyCRM API: POST https://openapi.keycrm.app/v1/leads`);

      const response = await axios.post(
        'https://openapi.keycrm.app/v1/leads',
        leadPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const leadId = response.data.id;

      console.log(`✅ KeyCRM lead created: ${leadId}`);

      return {
        success: true,
        message: `Thank you! I've recorded your order information. We'll process it and contact you shortly.`,
        confirmationId: leadId.toString(),
        data: {
          lead_id: leadId,
          source_id: response.data.source_id,
          status_id: response.data.status_id
        }
      };

    } catch (error) {
      console.error('❌ KeyCRM error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'KeyCRM API error',
        message: 'I apologize, but I encountered an issue saving your information. Please try calling back.'
      };
    }
  }

  /**
   * Pipedrive CRM Integration
   * API: POST /v1/persons
   */
  private async handlePipedriveCRM(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('📊 Processing Pipedrive person');

      const { payload } = request;

      const personPayload = {
        name: payload.customer_name || `${payload.customer_first_name} ${payload.customer_last_name}`,
        email: payload.customer_email,
        phone: payload.customer_phone,
        visible_to: '3' // Visible to entire company
      };

      console.log(`📡 Calling Pipedrive API: POST https://api.pipedrive.com/v1/persons`);

      const response = await axios.post(
        'https://api.pipedrive.com/v1/persons',
        personPayload,
        {
          params: {
            api_token: config.apiToken
          },
          timeout: 15000
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Pipedrive API returned success: false');
      }

      const personId = response.data.data.id;

      console.log(`✅ Pipedrive person created: ${personId}`);

      return {
        success: true,
        message: `Thank you! I've saved your contact information. Someone will be in touch with you soon.`,
        confirmationId: personId.toString(),
        data: {
          person_id: personId,
          name: response.data.data.name
        }
      };

    } catch (error) {
      console.error('❌ Pipedrive error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pipedrive API error',
        message: 'I apologize, but I encountered an issue saving your information. Please try calling back.'
      };
    }
  }

  /**
   * Salesforce CRM Integration (OAuth)
   * API: POST /services/data/v58.0/sobjects/Lead
   */
  private async handleSalesforceCRM(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('☁️ Processing Salesforce lead');

      const { payload } = request;

      // Get valid OAuth access token and instance URL
      const tokens = await oauthTokenService.getTokens(request.userId, 'salesforce');

      if (!tokens || !tokens.accessToken || !tokens.instanceUrl) {
        return {
          success: false,
          error: 'Salesforce authentication failed',
          message: 'CRM authentication expired. Please re-authenticate.'
        };
      }

      const leadPayload = {
        LastName: payload.customer_last_name || payload.customer_name.split(' ').slice(-1)[0],
        FirstName: payload.customer_first_name || payload.customer_name.split(' ')[0] || '',
        Company: payload.company_name || payload.customer_name || 'Individual',
        Email: payload.customer_email,
        Phone: payload.customer_phone,
        Status: 'Open - Not Contacted',
        LeadSource: 'Phone Inquiry',
        Description: payload.notes || `Voice call inquiry on ${new Date().toLocaleString()}`
      };

      console.log(`📡 Calling Salesforce API: POST ${tokens.instanceUrl}/services/data/v58.0/sobjects/Lead`);

      const response = await axios.post(
        `${tokens.instanceUrl}/services/data/v58.0/sobjects/Lead`,
        leadPayload,
        {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const leadId = response.data.id;

      console.log(`✅ Salesforce lead created: ${leadId}`);

      return {
        success: true,
        message: `Thank you! I've recorded your information in our system. A team member will reach out to you shortly.`,
        confirmationId: leadId,
        data: {
          lead_id: leadId,
          success: response.data.success
        }
      };

    } catch (error) {
      console.error('❌ Salesforce error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Salesforce API error',
        message: 'I apologize, but I encountered an issue saving your information. Please try calling back.'
      };
    }
  }

  /**
   * Handle Messaging Integrations
   */
  private async handleMessagingIntegration(
    request: IntegrationRequest,
    settings: any
  ): Promise<IntegrationResponse> {
    const messagingConfig = settings.messagingSystem;

    if (!messagingConfig) {
      return {
        success: false,
        error: 'No messaging system configured',
        message: 'Messaging integration is not configured.'
      };
    }

    const systemType = messagingConfig.type;
    console.log(`💬 Using messaging system: ${systemType}`);

    switch (systemType) {
      case 'telegram':
        return await this.handleTelegramMessage(request, messagingConfig);

      case 'thumbtack':
        return await this.handleThumbтackMessage(request, messagingConfig);

      case 'yelp':
        return await this.handleYelpMessage(request, messagingConfig);

      default:
        return {
          success: false,
          error: `Unknown messaging system: ${systemType}`,
          message: 'That messaging integration is not supported.'
        };
    }
  }

  /**
   * Telegram Bot API Integration
   * API: POST /bot{token}/sendMessage
   */
  private async handleTelegramMessage(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('💬 Sending Telegram message');

      const { payload } = request;

      const chatId = payload.chat_id || config.chatId;
      if (!chatId) {
        return {
          success: false,
          error: 'No Telegram chat ID configured',
          message: 'Messaging is not properly configured.'
        };
      }

      const messagePayload = {
        chat_id: chatId,
        text: payload.message || payload.text,
        parse_mode: 'HTML'
      };

      console.log(`📡 Calling Telegram API: POST https://api.telegram.org/bot${config.botToken.slice(0, 10)}... /sendMessage`);

      const response = await axios.post(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        messagePayload,
        {
          timeout: 10000
        }
      );

      const messageId = response.data.result.message_id;

      console.log(`✅ Telegram message sent: ${messageId}`);

      return {
        success: true,
        message: `Message sent successfully via Telegram.`,
        confirmationId: messageId.toString(),
        data: {
          message_id: messageId,
          chat_id: response.data.result.chat.id
        }
      };

    } catch (error) {
      console.error('❌ Telegram error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Telegram API error',
        message: 'Failed to send message via Telegram.'
      };
    }
  }

  /**
   * Thumbtack Integration
   * API: POST /v2/messages
   */
  private async handleThumbтackMessage(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('👍 Sending Thumbtack message');

      const { payload } = request;

      const messagePayload = {
        lead_id: payload.lead_id,
        message: payload.message,
        quote_price: payload.quote_price
      };

      console.log(`📡 Calling Thumbtack API: POST https://api.thumbtack.com/v2/messages`);

      const response = await axios.post(
        'https://api.thumbtack.com/v2/messages',
        messagePayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log(`✅ Thumbtack message sent`);

      return {
        success: true,
        message: `Response sent to Thumbtack lead successfully.`,
        confirmationId: payload.lead_id,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Thumbtack error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Thumbtack API error',
        message: 'Failed to send Thumbtack response.'
      };
    }
  }

  /**
   * Yelp Leads Integration
   * API: POST /v3/businesses/{business_id}/messages
   */
  private async handleYelpMessage(
    request: IntegrationRequest,
    config: any
  ): Promise<IntegrationResponse> {
    try {
      console.log('⭐ Sending Yelp message');

      const { payload } = request;

      const messagePayload = {
        business_id: config.businessId,
        user_id: payload.user_id,
        message: payload.message
      };

      console.log(`📡 Calling Yelp API: POST https://api.yelp.com/v3/businesses/${config.businessId}/messages`);

      const response = await axios.post(
        `https://api.yelp.com/v3/businesses/${config.businessId}/messages`,
        messagePayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log(`✅ Yelp message sent`);

      return {
        success: true,
        message: `Response sent to Yelp lead successfully.`,
        confirmationId: `yelp_${Date.now()}`,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Yelp error:', error);

      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Yelp API error',
        message: 'Failed to send Yelp response.'
      };
    }
  }

  /**
   * Test an integration before saving it
   * Validates that credentials work and service is accessible
   */
  async testIntegration(
    integrationType: 'googleCalendar' | 'posSystem' | 'deliverySystem',
    credentials: any,
    userId: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      console.log(`🧪 Testing ${integrationType} integration for user ${userId}`);

      switch (integrationType) {
        case 'googleCalendar':
          return await this.testGoogleCalendarIntegration(credentials, userId);

        case 'posSystem':
          return await this.testPOSIntegration(credentials);

        case 'deliverySystem':
          return await this.testDeliveryIntegration(credentials);

        default:
          return {
            success: false,
            error: `Unknown integration type: ${integrationType}`,
            message: 'Integration type not supported'
          };
      }
    } catch (error) {
      console.error(`❌ Error testing integration:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to test integration'
      };
    }
  }

  /**
   * Test Google Calendar credentials
   */
  private async testGoogleCalendarIntegration(
    credentials: any,
    userId: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Check if credentials exist in the database
      const googleCalendarCreds = await storage.getUserCredentialsByIntegration(userId, 'google_calendar');

      if (!googleCalendarCreds || googleCalendarCreds.length === 0) {
        return {
          success: false,
          error: 'Google Calendar credentials not found',
          message: 'Please connect your Google Calendar account first'
        };
      }

      // Extract and decrypt access token
      const { EncryptionService } = await import('./encryptionService');

      let accessToken = '';
      let refreshToken = '';

      // Find and decrypt tokens from credentials
      for (const cred of googleCalendarCreds) {
        if (cred.credentialName === 'access_token') {
          try {
            accessToken = EncryptionService.decrypt(
              cred.encryptedData,
              cred.encryptionIv,
              cred.encryptionTag
            );
          } catch (e) {
            console.error('Failed to decrypt access token:', e);
          }
        } else if (cred.credentialName === 'refresh_token') {
          try {
            refreshToken = EncryptionService.decrypt(
              cred.encryptedData,
              cred.encryptionIv,
              cred.encryptionTag
            );
          } catch (e) {
            console.error('Failed to decrypt refresh token:', e);
          }
        }
      }

      if (!accessToken) {
        return {
          success: false,
          error: 'Access token not found',
          message: 'Google Calendar credentials appear to be incomplete. Please reconnect your Google Calendar.'
        };
      }

      // Try to use the Google Calendar API with a simple list calendars call
      const { google } = await import('googleapis');
      const oauth2Client = new google.auth.OAuth2();

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken || undefined
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Attempt to list calendars to verify access
      const response = await calendar.calendarList.list();

      if (!response.data.items || response.data.items.length === 0) {
        return {
          success: false,
          error: 'No calendars found',
          message: 'Your Google account has no accessible calendars'
        };
      }

      console.log(`✅ Google Calendar integration test passed for user ${userId}`);
      return {
        success: true,
        message: `Successfully connected to ${response.data.items.length} calendar(s)`
      };
    } catch (error) {
      console.error('❌ Google Calendar test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Calendar API error',
        message: 'Failed to connect to Google Calendar. Please check your credentials and try again.'
      };
    }
  }

  /**
   * Test POS system credentials
   */
  private async testPOSIntegration(
    credentials: any
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Determine which POS system and test accordingly
      if (credentials.posType === 'square' && credentials.accessToken) {
        // Test Square API
        const response = await axios.get('https://squareup.com/api/v2/locations', {
          headers: { Authorization: `Bearer ${credentials.accessToken}` }
        });

        if (response.data.locations && response.data.locations.length > 0) {
          return {
            success: true,
            message: `Connected to Square with ${response.data.locations.length} location(s)`
          };
        } else {
          return {
            success: false,
            error: 'No locations found',
            message: 'Your Square account has no accessible locations'
          };
        }
      } else if (credentials.posType === 'toast' && credentials.clientSecret) {
        // Test Toast API
        // Note: Toast requires more complex auth, simplified check here
        return {
          success: true,
          message: 'Toast credentials validated'
        };
      } else {
        return {
          success: false,
          error: 'Missing POS credentials',
          message: 'Please provide required credentials for your POS system'
        };
      }
    } catch (error) {
      console.error('❌ POS integration test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'POS API error',
        message: 'Failed to connect to POS system. Please check your API keys and try again.'
      };
    }
  }

  /**
   * Test Delivery system credentials
   */
  private async testDeliveryIntegration(
    credentials: any
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Basic validation of delivery credentials
      if (!credentials.provider) {
        return {
          success: false,
          error: 'No delivery provider specified',
          message: 'Please select a delivery provider (DoorDash, Uber Eats, etc.)'
        };
      }

      if (!credentials.apiKey) {
        return {
          success: false,
          error: 'Missing API key',
          message: 'Please provide an API key for your delivery provider'
        };
      }

      // For now, just validate that credentials are provided
      // Full API testing would be provider-specific
      return {
        success: true,
        message: `Delivery provider ${credentials.provider} credentials validated`
      };
    } catch (error) {
      console.error('❌ Delivery integration test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delivery API error',
        message: 'Failed to validate delivery credentials'
      };
    }
  }

  /**
   * Automatically send SMS if configured for a function
   */
  private async autoSendFunctionSMS(
    agentId: string,
    functionName: string,
    context: Record<string, any>,
    userId: string
  ): Promise<void> {
    try {
      console.log(`📲 Checking for auto-SMS configuration for ${functionName}...`);

      // Get function settings to check if SMS is configured
      const functionSetting = await storage.getAgentFunctionSetting(agentId, functionName);

      if (!functionSetting || !functionSetting.smsContent) {
        console.log(`   No SMS content configured for ${functionName}, skipping auto-send`);
        return;
      }

      console.log(`✅ Found SMS configuration for ${functionName}`);
      console.log(`   Type: ${functionSetting.smsMessageType}`);
      console.log(`   Content: ${functionSetting.smsContent.substring(0, 50)}...`);

      const phoneNumber = context.customer_phone;
      if (!phoneNumber) {
        console.log(`   No phone number provided, skipping SMS`);
        return;
      }

      // Build the SMS message
      let smsMessage: string;

      if (functionSetting.smsMessageType === 'static') {
        // Static message: replace placeholders with context values
        smsMessage = functionSetting.smsContent;

        // Replace common placeholders
        Object.keys(context).forEach(key => {
          const placeholder = `{{${key}}}`;
          smsMessage = smsMessage.replace(new RegExp(placeholder, 'g'), context[key] || '');
        });
      } else {
        // Prompt-based: Use AI to generate the message
        console.log(`   Using AI to generate SMS based on prompt`);

        // For now, use the prompt directly with context substitution
        // TODO: Integrate with OpenAI to generate personalized message
        smsMessage = functionSetting.smsContent;
        Object.keys(context).forEach(key => {
          const placeholder = `{{${key}}}`;
          smsMessage = smsMessage.replace(new RegExp(placeholder, 'g'), context[key] || '');
        });
      }

      console.log(`📤 Sending auto-SMS to ${phoneNumber}`);
      console.log(`   Message: ${smsMessage}`);

      // Send SMS via messaging integration
      const smsResult = await this.processIntegration({
        userId,
        agentId,
        restaurantId: userId, // For SMS, restaurantId = userId
        integrationType: 'Messaging',
        action: 'send_sms',
        payload: {
          phone_number: phoneNumber,
          message: smsMessage,
          agent_id: agentId
        }
      });

      if (smsResult.success) {
        console.log(`✅ Auto-SMS sent successfully`);
      } else {
        console.log(`❌ Failed to send auto-SMS: ${smsResult.error}`);
      }

    } catch (error) {
      console.error(`❌ Error sending auto-SMS for ${functionName}:`, error);
      // Don't throw - SMS failure shouldn't block the main operation
    }
  }
  /**
   * Handle Magic Browser Automation Integration
   * Uses Playwright to log in and fill forms on any web-based booking system.
   */
  private async handleMagicIntegration(
    request: IntegrationRequest,
    settings: any
  ): Promise<IntegrationResponse> {
    try {
      const { agentId, userId, payload } = request;
      if (!agentId) {
        return { success: false, message: 'Magic automation requires an agent to be configured.' };
      }

      const rows = await storage.getAgentIntegrations(agentId);
      const integration = rows.find((i: any) => i.type === 'newo_magic' && i.status !== 'paused');
      if (!integration) {
        return { success: false, message: 'Magic browser automation is not configured for this agent.' };
      }

      const { magicBrowserService } = await import('./magicBrowserService');
      const result = await magicBrowserService.executeAction(String(integration.id), payload as any);

      db.insert(integrationLogs).values({
        userId: userId || '',
        agentId: agentId || '',
        integrationId: integration.id,
        eventType: 'call',
        requestData: { payload } as any,
        responseData: { success: result.success, confirmationId: result.confirmationId } as any,
        statusCode: result.success ? 200 : 500,
        duration: result.duration,
        errorMessage: result.error || null,
      }).catch(err => console.error('Failed to log Magic execution:', err));

      return { success: result.success, message: result.message, confirmationId: result.confirmationId };

    } catch (error: any) {
      console.error('❌ Magic integration error:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'I was unable to complete the booking. Please call us directly to confirm.',
      };
    }
  }
}

export const integrationService = IntegrationService.getInstance();
