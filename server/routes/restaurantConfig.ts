/**
 * Restaurant Configuration API Routes
 *
 * Provides endpoints for restaurants to configure their integrations,
 * credentials, and automation settings for the AI receptionist system.
 */

import express from 'express';
import { restaurantConfigService } from '../services/restaurantConfigService';
import { storage } from '../storage';

const router = express.Router();

/**
 * Get restaurant integration status
 */
router.get('/config/:restaurantId/status', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const status = await restaurantConfigService.getIntegrationStatus(restaurantId);

    res.json({
      success: true,
      restaurantId,
      integrations: status
    });

  } catch (error) {
    console.error('❌ Get integration status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration status'
    });
  }
});

/**
 * Get full restaurant configuration
 */
router.get('/config/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const config = await restaurantConfigService.getRestaurantIntegrations(restaurantId);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant configuration not found'
      });
    }

    // Remove sensitive fields from response
    const safeConfig = {
      ...config,
      googleCalendar: config.googleCalendar ? {
        ...config.googleCalendar,
        serviceAccountKey: config.googleCalendar.serviceAccountKey ? '[CONFIGURED]' : undefined
      } : undefined,
      posSystem: config.posSystem ? {
        ...config.posSystem,
        credentials: {
          ...config.posSystem.credentials,
          apiKey: config.posSystem.credentials?.apiKey ? '[CONFIGURED]' : undefined,
          apiSecret: config.posSystem.credentials?.apiSecret ? '[CONFIGURED]' : undefined,
          accessToken: config.posSystem.credentials?.accessToken ? '[CONFIGURED]' : undefined
        }
      } : undefined,
      deliveryIntegrations: config.deliveryIntegrations ? {
        ...config.deliveryIntegrations,
        uberEats: config.deliveryIntegrations.uberEats ? {
          ...config.deliveryIntegrations.uberEats,
          apiKey: config.deliveryIntegrations.uberEats.apiKey ? '[CONFIGURED]' : undefined
        } : undefined,
        doorDash: config.deliveryIntegrations.doorDash ? {
          ...config.deliveryIntegrations.doorDash,
          apiKey: config.deliveryIntegrations.doorDash.apiKey ? '[CONFIGURED]' : undefined
        } : undefined
      } : undefined
    };

    res.json({
      success: true,
      config: safeConfig
    });

  } catch (error) {
    console.error('❌ Get restaurant config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get restaurant configuration'
    });
  }
});

/**
 * Update Google Calendar integration
 */
router.post('/config/:restaurantId/google-calendar', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { enabled, calendarId, serviceAccountKey, timeZone } = req.body;

    const integrationData = {
      enabled: enabled || false,
      calendarId,
      serviceAccountKey,
      timeZone: timeZone || 'America/New_York'
    };

    await restaurantConfigService.updateIntegration(restaurantId, 'googleCalendar', integrationData);

    res.json({
      success: true,
      message: 'Google Calendar integration updated successfully',
      integration: 'googleCalendar'
    });

  } catch (error) {
    console.error('❌ Update Google Calendar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Google Calendar integration'
    });
  }
});

/**
 * Update POS system integration
 */
router.post('/config/:restaurantId/pos-system', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const {
      enabled,
      type,
      displayName,
      credentials,
      settings
    } = req.body;

    const integrationData = {
      enabled: enabled || false,
      type,
      displayName: displayName || `${type} POS`,
      credentials: credentials || {},
      settings: {
        autoAcceptOrders: settings?.autoAcceptOrders || false,
        orderConfirmationEmail: settings?.orderConfirmationEmail || true,
        kitchenPrintingEnabled: settings?.kitchenPrintingEnabled || false,
        ...settings
      }
    };

    await restaurantConfigService.updateIntegration(restaurantId, 'posSystem', integrationData);

    res.json({
      success: true,
      message: `${type} POS integration updated successfully`,
      integration: 'posSystem'
    });

  } catch (error) {
    console.error('❌ Update POS system error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update POS system integration'
    });
  }
});

/**
 * Update delivery integrations
 */
router.post('/config/:restaurantId/delivery', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { uberEats, doorDash, inHouseDelivery } = req.body;

    const integrationData = {
      uberEats: uberEats ? {
        enabled: uberEats.enabled || false,
        storeId: uberEats.storeId,
        apiKey: uberEats.apiKey,
        webhookSecret: uberEats.webhookSecret
      } : undefined,
      doorDash: doorDash ? {
        enabled: doorDash.enabled || false,
        storeId: doorDash.storeId,
        apiKey: doorDash.apiKey,
        webhookSecret: doorDash.webhookSecret
      } : undefined,
      inHouseDelivery: inHouseDelivery ? {
        enabled: inHouseDelivery.enabled || false,
        deliveryRadius: inHouseDelivery.deliveryRadius || 5,
        deliveryFee: inHouseDelivery.deliveryFee || 2.99,
        minimumOrder: inHouseDelivery.minimumOrder || 15,
        estimatedDeliveryTime: inHouseDelivery.estimatedDeliveryTime || '30-45 minutes'
      } : undefined
    };

    await restaurantConfigService.updateIntegration(restaurantId, 'deliveryIntegrations', integrationData);

    res.json({
      success: true,
      message: 'Delivery integrations updated successfully',
      integration: 'deliveryIntegrations'
    });

  } catch (error) {
    console.error('❌ Update delivery integrations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update delivery integrations'
    });
  }
});

/**
 * Update notification settings
 */
router.post('/config/:restaurantId/notifications', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const {
      emailNotifications,
      smsNotifications,
      slackWebhook,
      notificationEmails,
      notificationPhones
    } = req.body;

    const integrationData = {
      emailNotifications: emailNotifications || false,
      smsNotifications: smsNotifications || false,
      slackWebhook,
      notificationEmails: notificationEmails || [],
      notificationPhones: notificationPhones || []
    };

    await restaurantConfigService.updateIntegration(restaurantId, 'notifications', integrationData);

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      integration: 'notifications'
    });

  } catch (error) {
    console.error('❌ Update notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification settings'
    });
  }
});

/**
 * Update business rules
 */
router.post('/config/:restaurantId/business-rules', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const {
      acceptAfterHours,
      maxReservationSize,
      advanceReservationDays,
      automaticConfirmations,
      requireCustomerContact
    } = req.body;

    const integrationData = {
      acceptAfterHours: acceptAfterHours || false,
      maxReservationSize: maxReservationSize || 12,
      advanceReservationDays: advanceReservationDays || 30,
      automaticConfirmations: automaticConfirmations !== false, // Default to true
      requireCustomerContact: requireCustomerContact !== false // Default to true
    };

    await restaurantConfigService.updateIntegration(restaurantId, 'businessRules', integrationData);

    res.json({
      success: true,
      message: 'Business rules updated successfully',
      integration: 'businessRules'
    });

  } catch (error) {
    console.error('❌ Update business rules error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business rules'
    });
  }
});

/**
 * Test specific integration
 */
router.post('/config/:restaurantId/test/:integrationType', async (req, res) => {
  try {
    const { restaurantId, integrationType } = req.params;

    const testResult = await restaurantConfigService.testIntegration(restaurantId, integrationType);

    res.json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details,
      integrationType
    });

  } catch (error) {
    console.error(`❌ Test integration error for ${req.params.integrationType}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to test ${req.params.integrationType} integration`
    });
  }
});

/**
 * Initialize configuration for new restaurant
 */
router.post('/config/:restaurantId/initialize', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { userId, businessName, businessData } = req.body;

    if (!userId || !businessName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, businessName'
      });
    }

    await restaurantConfigService.initializeRestaurantConfig(userId, restaurantId, businessName, businessData || {});

    res.json({
      success: true,
      message: 'Restaurant configuration initialized successfully',
      restaurantId
    });

  } catch (error) {
    console.error('❌ Initialize restaurant config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize restaurant configuration'
    });
  }
});

/**
 * Get webhook configuration URLs for restaurant
 */
router.get('/config/:restaurantId/webhooks', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://your-replit-domain.replit.dev';

    const webhookConfig = {
      restaurantId,
      baseUrl,
      webhooks: {
        main: `${baseUrl}/api/webhook/restaurant-automation`,
        reservation: `${baseUrl}/api/webhook/reservation`,
        order: `${baseUrl}/api/webhook/order`,
        delivery: `${baseUrl}/api/webhook/delivery`,
        catering: `${baseUrl}/api/webhook/catering`,
        transfer: `${baseUrl}/api/webhook/transfer`,
        afterhours: `${baseUrl}/api/webhook/afterhours`
      },
      retellIntegration: {
        conversationFlowUrls: {
          order: `${baseUrl}/api/webhook/order`,
          delivery: `${baseUrl}/api/webhook/delivery`,
          reservation: `${baseUrl}/api/webhook/reservation`,
          catering: `${baseUrl}/api/webhook/catering`,
          transfer: `${baseUrl}/api/webhook/transfer`,
          afterhours: `${baseUrl}/api/webhook/afterhours`
        }
      }
    };

    res.json({
      success: true,
      config: webhookConfig
    });

  } catch (error) {
    console.error('❌ Get webhook config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook configuration'
    });
  }
});

/**
 * Export restaurant analytics data
 */
router.get('/config/:restaurantId/analytics/export', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;

    // Get analytics data from storage
    const analyticsData = await storage.getRestaurantAnalytics(restaurantId, {
      startDate: startDate as string,
      endDate: endDate as string
    });

    if (format === 'csv') {
      // Convert to CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="restaurant-analytics-${restaurantId}.csv"`);

      // Simple CSV conversion (would need proper CSV library in production)
      let csv = 'Date,Action,Success,Customer,Confirmation ID\n';
      analyticsData.events?.forEach((event: any) => {
        csv += `${event.timestamp},${event.action},${event.success},${event.customerData?.name || 'N/A'},${event.confirmationId || 'N/A'}\n`;
      });

      res.send(csv);
    } else {
      res.json({
        success: true,
        restaurantId,
        period: { startDate, endDate },
        data: analyticsData
      });
    }

  } catch (error) {
    console.error('❌ Export analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data'
    });
  }
});

export default router;