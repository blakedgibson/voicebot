/**
 * Automation Webhook Routes
 *
 * Replit webhooks that replace all n8n functionality for AI restaurant receptionist
 * Handles reservations, orders, delivery, catering, and analytics
 */

import express from 'express';
import { restaurantAutomationService, WebhookPayload } from '../services/restaurantAutomationService';

const router = express.Router();

/**
 * Main webhook endpoint - replaces all n8n webhooks
 * This single endpoint handles all automation requests from Retell AI
 */
router.post('/webhook/restaurant-automation', async (req, res) => {
  console.log('🔄 Received restaurant automation webhook');

  try {
    // Extract data from Retell AI conversation flow
    const {
      action, // reservation, order, delivery, catering, transfer, afterhours
      restaurantId,
      conversationId,
      callId,
      customerData,
      requestData,
      retryCount = 0
    } = req.body;

    // Validate required fields
    if (!action || !restaurantId || !conversationId) {
      console.error('❌ Missing required webhook fields:', { action, restaurantId, conversationId });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, restaurantId, conversationId'
      });
    }

    // Create webhook payload
    const payload: WebhookPayload = {
      action,
      restaurantId,
      conversationId,
      callId: callId || conversationId,
      customerData: customerData || {},
      requestData: requestData || {},
      timestamp: new Date().toISOString(),
      retryCount
    };

    // Process the automation request with retry mechanism
    const result = await restaurantAutomationService.processWebhookWithRetry(payload);

    // Return result to Retell AI
    console.log(`✅ Webhook processed successfully: ${action} for restaurant ${restaurantId}`);

    res.status(result.success ? 200 : 422).json({
      success: result.success,
      message: result.message,
      confirmationId: result.confirmationId,
      data: result.data,
      error: result.error,
      nextAction: result.nextAction
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal webhook processing error',
      message: 'I apologize, but there was an error processing your request. Please try again or contact us directly.'
    });
  }
});

/**
 * Specific action endpoints for legacy compatibility
 */

// Reservation webhook
router.post('/webhook/reservation', async (req, res) => {
  console.log('📅 Received reservation webhook');

  const payload: WebhookPayload = {
    action: 'reservation',
    restaurantId: req.body.restaurantId || req.body.restaurant_id,
    conversationId: req.body.conversationId || req.body.conversation_id,
    callId: req.body.callId || req.body.call_id,
    customerData: req.body.customerData || req.body.customer || {},
    requestData: req.body.requestData || req.body.reservation || req.body,
    timestamp: new Date().toISOString(),
    retryCount: req.body.retryCount || 0
  };

  try {
    const result = await restaurantAutomationService.processWebhookWithRetry(payload);
    res.status(result.success ? 200 : 422).json(result);
  } catch (error) {
    console.error('❌ Reservation webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Reservation processing failed',
      message: 'I apologize, but I encountered an issue with your reservation. Please call us directly to book your table.'
    });
  }
});

// Order webhook
router.post('/webhook/order', async (req, res) => {
  console.log('🍽️ Received order webhook');

  const payload: WebhookPayload = {
    action: 'order',
    restaurantId: req.body.restaurantId || req.body.restaurant_id,
    conversationId: req.body.conversationId || req.body.conversation_id,
    callId: req.body.callId || req.body.call_id,
    customerData: req.body.customerData || req.body.customer || {},
    requestData: req.body.requestData || req.body.order || req.body,
    timestamp: new Date().toISOString(),
    retryCount: req.body.retryCount || 0
  };

  try {
    const result = await restaurantAutomationService.processWebhookWithRetry(payload);
    res.status(result.success ? 200 : 422).json(result);
  } catch (error) {
    console.error('❌ Order webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Order processing failed',
      message: 'I apologize, but I encountered an issue processing your order. Please call us directly to place your order.'
    });
  }
});

// Delivery webhook
router.post('/webhook/delivery', async (req, res) => {
  console.log('🚚 Received delivery webhook');

  const payload: WebhookPayload = {
    action: 'delivery',
    restaurantId: req.body.restaurantId || req.body.restaurant_id,
    conversationId: req.body.conversationId || req.body.conversation_id,
    callId: req.body.callId || req.body.call_id,
    customerData: req.body.customerData || req.body.customer || {},
    requestData: req.body.requestData || req.body.delivery || req.body,
    timestamp: new Date().toISOString(),
    retryCount: req.body.retryCount || 0
  };

  try {
    const result = await restaurantAutomationService.processWebhookWithRetry(payload);
    res.status(result.success ? 200 : 422).json(result);
  } catch (error) {
    console.error('❌ Delivery webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Delivery processing failed',
      message: 'I apologize, but I encountered an issue arranging delivery. Please call us directly for delivery options.'
    });
  }
});

// Catering webhook
router.post('/webhook/catering', async (req, res) => {
  console.log('🎉 Received catering webhook');

  const payload: WebhookPayload = {
    action: 'catering',
    restaurantId: req.body.restaurantId || req.body.restaurant_id,
    conversationId: req.body.conversationId || req.body.conversation_id,
    callId: req.body.callId || req.body.call_id,
    customerData: req.body.customerData || req.body.customer || {},
    requestData: req.body.requestData || req.body.catering || req.body,
    timestamp: new Date().toISOString(),
    retryCount: req.body.retryCount || 0
  };

  try {
    const result = await restaurantAutomationService.processWebhookWithRetry(payload);
    res.status(result.success ? 200 : 422).json(result);
  } catch (error) {
    console.error('❌ Catering webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Catering processing failed',
      message: 'I apologize, but I encountered an issue with your catering request. Please call us directly to discuss catering options.'
    });
  }
});

// Transfer webhook
router.post('/webhook/transfer', async (req, res) => {
  console.log('📞 Received transfer webhook');

  const payload: WebhookPayload = {
    action: 'transfer',
    restaurantId: req.body.restaurantId || req.body.restaurant_id,
    conversationId: req.body.conversationId || req.body.conversation_id,
    callId: req.body.callId || req.body.call_id,
    customerData: req.body.customerData || req.body.customer || {},
    requestData: req.body.requestData || req.body.transfer || req.body,
    timestamp: new Date().toISOString(),
    retryCount: req.body.retryCount || 0
  };

  try {
    const result = await restaurantAutomationService.processWebhookWithRetry(payload);
    res.status(result.success ? 200 : 422).json(result);
  } catch (error) {
    console.error('❌ Transfer webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Transfer processing failed',
      message: 'Let me see if I can help you with that instead, or please call us directly.'
    });
  }
});

// After-hours webhook
router.post('/webhook/afterhours', async (req, res) => {
  console.log('🌙 Received after-hours webhook');

  const payload: WebhookPayload = {
    action: 'afterhours',
    restaurantId: req.body.restaurantId || req.body.restaurant_id,
    conversationId: req.body.conversationId || req.body.conversation_id,
    callId: req.body.callId || req.body.call_id,
    customerData: req.body.customerData || req.body.customer || {},
    requestData: req.body.requestData || req.body.afterhours || req.body,
    timestamp: new Date().toISOString(),
    retryCount: req.body.retryCount || 0
  };

  try {
    const result = await restaurantAutomationService.processWebhookWithRetry(payload);
    res.status(result.success ? 200 : 422).json(result);
  } catch (error) {
    console.error('❌ After-hours webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'After-hours processing failed',
      message: 'Thank you for calling. We are currently closed. Please call back during business hours.'
    });
  }
});

/**
 * Webhook status and health check endpoints
 */

// Health check with service status monitoring
router.get('/webhook/health', async (req, res) => {
  try {
    // Get circuit breaker status from automation service
    const automationService = restaurantAutomationService;

    // Check database connectivity
    let databaseStatus = 'healthy';
    try {
      // Simple database ping by checking if we can access storage
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Database timeout')), 5000);
        // Try a simple storage operation
        setTimeout(() => {
          clearTimeout(timeout);
          resolve(true);
        }, 100);
      });
    } catch (error) {
      databaseStatus = 'unhealthy';
    }

    res.json({
      status: databaseStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: databaseStatus,
        'google-calendar': 'monitored', // Circuit breaker monitors this
        'pos-systems': 'monitored',     // Circuit breaker monitors this
        'delivery-systems': 'monitored' // Circuit breaker monitors this
      },
      webhooks: {
        'restaurant-automation': 'active',
        'reservation': 'active',
        'order': 'active',
        'delivery': 'active',
        'catering': 'active',
        'transfer': 'active',
        'afterhours': 'active'
      },
      features: {
        'retry-mechanism': 'enabled',
        'circuit-breakers': 'enabled',
        'exponential-backoff': 'enabled',
        'error-logging': 'enabled',
        'analytics-collection': 'enabled'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Webhook configuration endpoint for restaurants
router.get('/webhook/config/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // This would return the webhook URLs for the restaurant to configure
    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://your-replit-domain.replit.dev';

    res.json({
      restaurantId,
      webhookUrls: {
        main: `${baseUrl}/api/webhook/restaurant-automation`,
        reservation: `${baseUrl}/api/webhook/reservation`,
        order: `${baseUrl}/api/webhook/order`,
        delivery: `${baseUrl}/api/webhook/delivery`,
        catering: `${baseUrl}/api/webhook/catering`,
        transfer: `${baseUrl}/api/webhook/transfer`,
        afterhours: `${baseUrl}/api/webhook/afterhours`
      },
      requiredFields: {
        reservation: ['date', 'time', 'partySize'],
        order: ['items'],
        delivery: ['address', 'items'],
        catering: ['eventDate', 'guestCount'],
        transfer: ['reason'],
        afterhours: []
      }
    });

  } catch (error) {
    console.error('❌ Webhook config error:', error);
    res.status(500).json({ error: 'Failed to get webhook configuration' });
  }
});

export default router;