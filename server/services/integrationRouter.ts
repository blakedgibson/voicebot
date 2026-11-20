import type { IStorage } from '../storage';
import axios from 'axios';

export interface CustomFunctionCall {
  function_name: string;
  arguments: Record<string, any>;
  call_id?: string;
  user_id?: string;
}

export interface IntegrationRouterResponse {
  success: boolean;
  data?: any;
  error?: string;
  integration_used?: string;
}

export class IntegrationRouter {
  constructor(private storage: IStorage) {}

  async routeFunctionCall(
    userId: string,
    functionCall: CustomFunctionCall
  ): Promise<IntegrationRouterResponse> {
    try {
      console.log(`🔀 Routing function call for user ${userId}:`, functionCall);

      const integrationSettings = await this.storage.getIntegrationSettings(userId);
      const customIntegrations = integrationSettings?.customIntegrations || [];

      console.log(`📋 Found ${customIntegrations.length} custom integrations`);

      // Map function names to integration types
      const functionTypeMap: Record<string, string> = {
        'place_order': 'POS',
        'check_order_status': 'POS',
        'cancel_order': 'POS',
        'create_reservation': 'Reservation',
        'modify_reservation': 'Reservation',
        'cancel_reservation': 'Reservation',
        'check_availability': 'Reservation',
        'book_calendar_event': 'Calendar',
        'schedule_delivery': 'Delivery',
        'track_delivery': 'Delivery',
        'update_delivery': 'Delivery',
        'trigger_magic_action': 'Magic',
        'create_magic_actor': 'Magic',
        'get_magic_settings': 'Magic',
      };

      const requiredType = functionTypeMap[functionCall.function_name];
      if (!requiredType) {
        return {
          success: false,
          error: `Unknown function: ${functionCall.function_name}`
        };
      }

      // Find the first active integration of the required type
      const integration = customIntegrations.find(
        (int: any) => int.type === requiredType && int.enabled !== false
      );

      if (!integration) {
        return {
          success: false,
          error: `No ${requiredType} integration configured`
        };
      }

      // Validate Square integration has locationId
      if (functionCall.function_name === 'place_order' && integration.name?.toLowerCase().includes('square')) {
        if (!integration.locationId) {
          console.error('❌ Square integration missing locationId:', integration);
          return {
            success: false,
            error: 'Square integration is not properly configured. Missing location ID. Please re-configure your Square integration in the Integrations tab.'
          };
        }
        console.log(`✅ Square locationId found: ${integration.locationId}`);
      }

      // Execute the integration call
      const result = await this.executeIntegrationCall(integration, functionCall);

      return {
        success: true,
        data: result,
        integration_used: integration.name
      };
    } catch (error) {
      console.error('❌ Error routing function call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeIntegrationCall(
    integration: any,
    functionCall: CustomFunctionCall
  ): Promise<any> {
    console.log(`⚡ Executing integration call to ${integration.name}`);

    // Build the request
    let url = integration.apiEndpointUrl || integration.endpoint;
    const method = integration.method || 'POST';
    const timeout = integration.timeout || 15000;

    // Replace template variables in URL
    if (url && url.includes('{{')) {
      // Replace common URL template variables with integration settings
      url = url.replace('{{merchant_id}}', integration.locationId || '');
      url = url.replace('{{location_id}}', integration.locationId || '');
      url = url.replace('{{restaurant_guid}}', integration.locationId || '');
      url = url.replace('{{business_id}}', integration.locationId || '');
      console.log(`🔗 Replaced URL templates: ${url}`);
    }

    // Replace template variables in authorization header
    let authorization = integration.authorization || '';
    
    // For now, use simple token replacement - in production, fetch from secure storage
    if (authorization.includes('{{')) {
      // Replace common tokens
      authorization = authorization.replace('{{access_token}}', integration.apiKey || '');
      authorization = authorization.replace('{{api_key}}', integration.apiKey || '');
      authorization = authorization.replace('{{jwt_token}}', integration.apiKey || '');
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': integration.contentType || 'application/json'
    };

    if (authorization) {
      headers['Authorization'] = authorization;
    }

    // Add custom headers
    if (integration.customHeaders && Array.isArray(integration.customHeaders)) {
      integration.customHeaders.forEach((header: any) => {
        if (header.key && header.value) {
          headers[header.key] = header.value;
        }
      });
    }

    // Build payload from function arguments
    const payload = this.buildPayload(integration, functionCall);

    console.log(`📤 Making ${method} request to ${url}`);
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

    try {
      const response = await axios({
        method: method.toLowerCase() as any,
        url,
        headers,
        data: payload,
        timeout
      });

      console.log(`✅ Integration call successful:`, response.data);
      
      // Extract response variables if configured
      const extractedData = this.extractResponseVariables(
        response.data,
        integration.responseVariables
      );

      return {
        raw: response.data,
        extracted: extractedData,
        status: response.status
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ Integration call failed:`, error.response?.data || error.message);
        throw new Error(
          `Integration API error: ${error.response?.status} - ${JSON.stringify(error.response?.data || error.message)}`
        );
      }
      throw error;
    }
  }

  private buildPayload(integration: any, functionCall: CustomFunctionCall): any {
    // Parse the JSON schema template
    let schema: any = {};

    console.log(`🔍 Building payload for integration: ${integration.name}`);
    console.log(`🔍 Integration locationId: ${integration.locationId || 'NOT SET'}`);

    try {
      if (typeof integration.jsonPayloadSchema === 'string') {
        schema = JSON.parse(integration.jsonPayloadSchema);
      } else {
        schema = integration.jsonPayloadSchema || {};
      }
    } catch (error) {
      console.error('❌ Error parsing payload schema:', error);
      // Fallback to function arguments
      return functionCall.arguments;
    }

    // Handle array expansion for line_items (for POS systems like Square)
    const args = functionCall.arguments;

    console.log(`🔍 DEBUG: Full function call:`, JSON.stringify(functionCall, null, 2));
    console.log(`🔍 DEBUG: Function arguments received:`, JSON.stringify(args, null, 2));
    console.log(`🔍 DEBUG: Checking for items in args.items:`, args.items);
    console.log(`🔍 DEBUG: Checking for items in args.order_items:`, args.order_items);
    console.log(`🔍 DEBUG: Checking for items in args.line_items:`, args.line_items);

    const items = args.items || args.order_items || args.line_items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error(`❌ CRITICAL: No items found in function arguments!`);
      console.error(`Available args keys:`, Object.keys(args));
      console.error(`Full arguments:`, JSON.stringify(args, null, 2));
      console.error(`Full function call:`, JSON.stringify(functionCall, null, 2));

      // Try to provide helpful error message
      console.error(`\n⚠️  RETELL AI DID NOT SEND ORDER ITEMS!`);
      console.error(`This means the AI agent didn't extract items from the conversation.`);
      console.error(`Check the Retell AI agent configuration and conversation flow.`);
    }

    // Store the expanded line items to preserve them after template replacement
    let expandedLineItems: any[] | null = null;
    let lineItemsPath: 'order.line_items' | 'line_items' | null = null;

    if (items && Array.isArray(items) && items.length > 0) {
      console.log(`🔄 Expanding ${items.length} items for line_items array`);
      console.log(`📋 Items data:`, JSON.stringify(items, null, 2));

      // Check if schema has order.line_items or just line_items
      lineItemsPath = schema.order?.line_items ? 'order.line_items' : 'line_items';
      const lineItemsArray = lineItemsPath === 'order.line_items' ? schema.order?.line_items : schema.line_items;

      if (lineItemsArray && Array.isArray(lineItemsArray) && lineItemsArray.length > 0) {
        // Generate line items from the items array
        expandedLineItems = items.map((item: any) => {
          const lineItem: any = {};

          // Map item fields to Square format (support both naming conventions)
          lineItem.name = item.name || item.item_name || 'Unknown Item';
          lineItem.quantity = String(item.quantity || 1);

          // Handle price - support both 'price' and 'item_price' fields
          const itemPrice = item.price || item.item_price;
          if (itemPrice !== undefined && itemPrice !== null) {
            const priceInCents = Math.round(parseFloat(String(itemPrice)) * 100);
            lineItem.base_price_money = {
              amount: priceInCents,
              currency: 'USD'
            };
          }

          // Handle customizations/modifiers
          const notes: string[] = [];
          if (item.customizations) notes.push(item.customizations);
          if (item.modifiers) notes.push(Array.isArray(item.modifiers) ? item.modifiers.join(', ') : item.modifiers);
          if (item.special_instructions) notes.push(item.special_instructions);
          if (item.notes) notes.push(item.notes);

          if (notes.length > 0) {
            lineItem.note = notes.join(' | ');
          }

          return lineItem;
        });

        console.log(`✅ Expanded ${expandedLineItems.length} line_items:`, JSON.stringify(expandedLineItems, null, 2));
      }
    }

    // Add additional metadata
    if (schema.order) {
      schema.order.metadata = {
        ...(schema.order.metadata || {}),
        source: 'retell_ai',
        call_id: functionCall.call_id || 'unknown',
        customer_phone: args.customer_phone || args.phone_number || '',
        order_type: args.order_type || args.type || 'takeout'
      };
    }

    // Generate idempotency key if needed
    if (schema.idempotency_key && schema.idempotency_key.includes('{{')) {
      schema.idempotency_key = `retell-${functionCall.call_id || 'call'}-${Date.now()}`;
    }

    // Set location_id if present in integration settings
    if (integration.locationId) {
      if (schema.location_id) {
        schema.location_id = integration.locationId;
        console.log(`🔧 Set schema.location_id = ${integration.locationId}`);
      }
      if (schema.order?.location_id) {
        schema.order.location_id = integration.locationId;
        console.log(`🔧 Set schema.order.location_id = ${integration.locationId}`);
      }
    }

    // Replace remaining template variables with actual function arguments
    const payload = this.replaceTemplateVariables(schema, args);

    // CRITICAL FIX: Re-apply location_id AFTER template replacement
    // This prevents the template replacement from overwriting our location_id
    if (integration.locationId) {
      if (payload.location_id !== undefined) {
        payload.location_id = integration.locationId;
        console.log(`🔧 Re-applied location_id to payload.location_id: ${integration.locationId}`);
      }
      if (payload.order?.location_id !== undefined) {
        payload.order.location_id = integration.locationId;
        console.log(`🔧 Re-applied location_id to payload.order.location_id: ${integration.locationId}`);
      }
    }

    // CRITICAL FIX: Re-apply expanded line_items AFTER template replacement
    // This prevents the template replacement from overwriting our expanded array
    if (expandedLineItems && lineItemsPath) {
      if (lineItemsPath === 'order.line_items') {
        payload.order.line_items = expandedLineItems;
        console.log(`🔧 Re-applied ${expandedLineItems.length} line_items to payload.order.line_items`);
      } else {
        payload.line_items = expandedLineItems;
        console.log(`🔧 Re-applied ${expandedLineItems.length} line_items to payload.line_items`);
      }
    }

    console.log(`📤 Final payload with line_items:`, JSON.stringify(payload, null, 2));

    return payload;
  }

  private replaceTemplateVariables(obj: any, args: Record<string, any>): any {
    if (typeof obj === 'string') {
      // Replace {{variable}} with actual value
      return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return args[key] !== undefined ? args[key] : match;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceTemplateVariables(item, args));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceTemplateVariables(value, args);
      }
      return result;
    }

    return obj;
  }

  private extractResponseVariables(data: any, variablesConfig?: string): Record<string, any> {
    if (!variablesConfig) {
      return data;
    }

    const variables = variablesConfig.split(',').map(v => v.trim());
    const extracted: Record<string, any> = {};

    for (const variable of variables) {
      // Support dot notation for nested properties
      const value = this.getNestedProperty(data, variable);
      if (value !== undefined) {
        extracted[variable] = value;
      }
    }

    return extracted;
  }

  private getNestedProperty(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
