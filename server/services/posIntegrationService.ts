/**
 * POS Integration Service
 *
 * Handles order placement for Square, Clover, Toast, and custom POS systems
 */

import axios from 'axios';

export interface POSOrderItem {
  name?: string;
  item_name?: string;
  quantity: number;
  price?: number;
  item_price?: number;
  modifiers?: string[];
  customizations?: string;
  notes?: string;
  specialInstructions?: string;
}

export interface POSOrderData {
  items: POSOrderItem[];
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  order_type?: string;
  orderType?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  special_instructions?: string;
  notes?: string;
}

export interface POSIntegrationConfig {
  name: string;
  type: 'POS' | 'Reservation' | 'Delivery' | 'Calendar';
  provider?: 'Square' | 'Clover' | 'Toast' | 'Custom';
  enabled?: boolean;
  apiKey?: string;
  accessToken?: string;
  merchantId?: string;
  locationId?: string;
  sandboxMode?: boolean;
  apiEndpointUrl?: string;
  authorization?: string;
  contentType?: string;
  customHeaders?: Array<{ key: string; value: string }>;
}

export interface POSOrderResult {
  success: boolean;
  orderId?: string;
  message?: string;
  error?: string;
  raw?: any;
}

export class POSIntegrationService {
  /**
   * Place an order through the configured POS system
   */
  async placeOrder(
    integration: POSIntegrationConfig,
    orderData: POSOrderData,
    callId: string
  ): Promise<POSOrderResult> {
    const provider = integration.provider || this.detectProvider(integration);

    console.log(`🍽️ Placing order via ${provider} POS`);

    try {
      switch (provider) {
        case 'Square':
          return await this.placeSquareOrder(integration, orderData, callId);
        case 'Clover':
          return await this.placeCloverOrder(integration, orderData, callId);
        case 'Toast':
          return await this.placeToastOrder(integration, orderData, callId);
        case 'Custom':
          return await this.placeCustomOrder(integration, orderData, callId);
        default:
          throw new Error(`Unsupported POS provider: ${provider}`);
      }
    } catch (error) {
      console.error(`❌ ${provider} order placement error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect POS provider from integration configuration
   */
  private detectProvider(integration: POSIntegrationConfig): string {
    const name = integration.name.toLowerCase();
    if (name.includes('square')) return 'Square';
    if (name.includes('clover')) return 'Clover';
    if (name.includes('toast')) return 'Toast';
    return 'Custom';
  }

  /**
   * Place order via Square POS API
   */
  private async placeSquareOrder(
    integration: POSIntegrationConfig,
    orderData: POSOrderData,
    callId: string
  ): Promise<POSOrderResult> {
    const apiUrl = integration.sandboxMode
      ? 'https://connect.squareupsandbox.com/v2/orders'
      : 'https://connect.squareup.com/v2/orders';

    // Transform items to Square format
    console.log(`🔄 Transforming ${orderData.items?.length || 0} items for Square`);
    console.log('📋 Items to transform:', JSON.stringify(orderData.items, null, 2));

    const lineItems = orderData.items.map((item) => {
      const itemName = item.item_name || item.name || 'Unknown Item';
      const itemPrice = item.price || item.item_price || 0;
      const itemQuantity = item.quantity || 1;
      const priceInCents = Math.round(itemPrice * 100);

      // Build note with modifiers and special instructions
      const modifiersText = item.modifiers && item.modifiers.length > 0
        ? `Modifiers: ${item.modifiers.join(', ')}`
        : '';
      const instructionsText = item.specialInstructions || item.notes || item.customizations || '';
      const noteText = [modifiersText, instructionsText].filter(Boolean).join(' | ');

      const lineItem = {
        name: itemName,
        quantity: String(itemQuantity),
        base_price_money: {
          amount: priceInCents,
          currency: 'USD'
        },
        note: noteText || undefined
      };

      console.log(`  ✓ Transformed: ${itemName} x${itemQuantity} @ $${itemPrice} (${priceInCents}¢)`);
      return lineItem;
    });

    console.log(`✅ Created ${lineItems.length} line items for Square API`);

    const payload = {
      idempotency_key: `retell-${callId}-${Date.now()}`,
      order: {
        location_id: integration.locationId,
        line_items: lineItems,
        metadata: {
          source: 'retell_ai',
          call_id: callId,
          customer_phone: orderData.customer_phone || '',
          order_type: orderData.order_type || orderData.orderType || 'takeout'
        }
      }
    };

    console.log('📤 Sending order to Square:', JSON.stringify(payload, null, 2));

    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integration.apiKey}`,
        'Square-Version': '2025-07-16' // Updated to latest 2025 version
      }
    });

    const orderId = response.data.order?.id;
    console.log('✅ Square order created:', orderId);

    return {
      success: true,
      orderId,
      message: `Order placed successfully. Your order number is ${orderId}.`,
      raw: response.data
    };
  }

  /**
   * Place order via Clover POS API
   */
  private async placeCloverOrder(
    integration: POSIntegrationConfig,
    orderData: POSOrderData,
    callId: string
  ): Promise<POSOrderResult> {
    // Accept merchantId or locationId (locationId is used when configured via dashboard)
    const merchantId = integration.merchantId || integration.locationId;
    if (!merchantId) {
      throw new Error('Merchant ID is required for Clover integration');
    }

    console.log(`🔑 Using Clover Merchant ID: ${merchantId}`);

    const baseUrl = integration.sandboxMode
      ? 'https://apisandbox.dev.clover.com'
      : 'https://api.clover.com';

    // Build order cart with line items
    const lineItems = orderData.items.map((item) => {
      const itemName = item.item_name || item.name || 'Unknown Item';
      const itemPrice = item.price || item.item_price || 0;
      const itemQuantity = item.quantity || 1;
      const priceInCents = Math.round(itemPrice * 100);

      return {
        name: itemName,
        price: priceInCents,
        unitQty: itemQuantity * 1000, // Clover uses units in thousands (e.g., 1000 = 1.0 unit, 2000 = 2.0 units)
        ...(item.notes || item.customizations || item.specialInstructions ? { note: item.notes || item.customizations || item.specialInstructions } : {})
      };
    });

    const orderPayload = {
      orderCart: {
        lineItems,
        groupLineItems: true
      }
    };

    console.log('📤 Creating Clover order:', JSON.stringify(orderPayload, null, 2));

    // Create the order directly (no checkout needed)
    const orderUrl = `${baseUrl}/v3/merchants/${merchantId}/atomic_order/orders`;
    const orderResponse = await axios.post(orderUrl, orderPayload, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${integration.accessToken || integration.apiKey}`,
        'content-type': 'application/json'
      }
    });

    const orderId = orderResponse.data.id;
    console.log('✅ Clover order created:', orderId);

    return {
      success: true,
      orderId,
      message: `Order placed successfully. Your order number is ${orderId}.`,
      raw: orderResponse.data
    };
  }

  /**
   * Place order via Toast POS API
   */
  private async placeToastOrder(
    integration: POSIntegrationConfig,
    orderData: POSOrderData,
    callId: string
  ): Promise<POSOrderResult> {
    const baseUrl = integration.sandboxMode
      ? 'https://ws-sandbox-api.eng.toasttab.com'
      : 'https://ws-api.toasttab.com';

    // Step 1: Build order object
    const selections = orderData.items.map((item, index) => {
      const itemName = item.item_name || item.name || 'Unknown Item';
      const itemPrice = item.price || item.item_price || 0;
      const itemQuantity = item.quantity || 1;

      return {
        guid: `selection-${index + 1}`,
        itemGuid: null, // For non-menu items
        itemName,
        preModifier: null,
        quantity: itemQuantity,
        price: itemPrice,
        specialRequests: item.notes || item.customizations || item.specialInstructions || undefined
      };
    });

    const orderPayload = {
      businessDate: new Date().toISOString().split('T')[0],
      diningOption: {
        behavior: orderData.order_type === 'delivery' ? 'DELIVERY' :
                   orderData.order_type === 'dine-in' ? 'DINE_IN' : 'TAKE_OUT'
      },
      checks: [
        {
          displayNumber: callId.slice(-6),
          selections,
          customer: {
            firstName: orderData.customer_name?.split(' ')[0] || 'Customer',
            lastName: orderData.customer_name?.split(' ').slice(1).join(' ') || '',
            phone: orderData.customer_phone || '',
            email: orderData.customer_email || undefined
          }
        }
      ]
    };

    console.log('📤 Getting Toast prices for order (required by API):', JSON.stringify(orderPayload, null, 2));

    // Step 2: Get pricing from Toast (REQUIRED - per 2025 API docs)
    // The /prices endpoint is the only reliable way to determine payment amounts
    const priceUrl = `${baseUrl}/orders/prices`;
    const priceResponse = await axios.post(priceUrl, orderPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integration.accessToken || integration.apiKey}`,
        'Toast-Restaurant-External-ID': integration.locationId || integration.merchantId || ''
      }
    });

    console.log('✅ Toast pricing calculated:', JSON.stringify(priceResponse.data, null, 2));

    // Step 3: Create the order with accurate pricing
    const finalOrderPayload = {
      ...orderPayload,
      checks: priceResponse.data.checks
    };

    console.log('📤 Creating Toast order with accurate pricing:', JSON.stringify(finalOrderPayload, null, 2));

    const orderUrl = `${baseUrl}/orders`;
    const orderResponse = await axios.post(orderUrl, finalOrderPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integration.accessToken || integration.apiKey}`,
        'Toast-Restaurant-External-ID': integration.locationId || integration.merchantId || ''
      }
    });

    const orderId = orderResponse.data.guid;
    console.log('✅ Toast order created:', orderId);

    return {
      success: true,
      orderId,
      message: `Order placed successfully. Your order number is ${orderId}.`,
      raw: orderResponse.data
    };
  }

  /**
   * Place order via custom webhook/API
   */
  private async placeCustomOrder(
    integration: POSIntegrationConfig,
    orderData: POSOrderData,
    callId: string
  ): Promise<POSOrderResult> {
    if (!integration.apiEndpointUrl) {
      throw new Error('API endpoint URL is required for custom integration');
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': integration.contentType || 'application/json'
    };

    // Add authorization if configured
    if (integration.authorization) {
      let auth = integration.authorization;
      // Replace template variables
      auth = auth.replace('{{access_token}}', integration.accessToken || integration.apiKey || '');
      auth = auth.replace('{{api_key}}', integration.apiKey || '');
      headers['Authorization'] = auth;
    }

    // Add custom headers
    if (integration.customHeaders && Array.isArray(integration.customHeaders)) {
      integration.customHeaders.forEach((header) => {
        if (header.key && header.value) {
          headers[header.key] = header.value;
        }
      });
    }

    // Build payload
    const payload = {
      call_id: callId,
      order_data: orderData,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending order to custom endpoint:', integration.apiEndpointUrl);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(integration.apiEndpointUrl, payload, {
      headers,
      timeout: 15000
    });

    console.log('✅ Custom order placed:', response.data);

    // Try to extract order ID from response
    const orderId = response.data.order_id || response.data.orderId ||
                    response.data.id || response.data.confirmation_id ||
                    `custom-${Date.now()}`;

    return {
      success: true,
      orderId,
      message: response.data.message || `Order placed successfully. Your order number is ${orderId}.`,
      raw: response.data
    };
  }
}

export const posIntegrationService = new POSIntegrationService();
