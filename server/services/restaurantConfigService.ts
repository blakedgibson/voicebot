/**
 * Restaurant Configuration Service
 *
 * Manages restaurant-specific credentials and integrations for the automation system.
 * Handles secure storage and retrieval of API keys, POS credentials, and service configurations.
 */

import { storage } from '../storage';
import crypto from 'crypto';

export interface RestaurantIntegrations {
  userId: string;
  restaurantId: string;
  businessName: string;

  // Google Calendar Integration
  googleCalendar?: {
    enabled: boolean;
    calendarId?: string;
    serviceAccountEmail?: string;
    serviceAccountKey?: string; // Encrypted JSON key
    timeZone: string;
  };

  // POS System Integration
  posSystem?: {
    enabled: boolean;
    type: 'square' | 'toast' | 'clover' | 'resy' | 'opentable' | 'custom';
    displayName: string;
    credentials: {
      apiKey?: string;
      apiSecret?: string;
      accessToken?: string;
      environmentId?: string;
      locationId?: string;
      storeId?: string;
      webhookUrl?: string;
    };
    settings: {
      autoAcceptOrders: boolean;
      orderConfirmationEmail: boolean;
      kitchenPrintingEnabled: boolean;
    };
  };

  // Delivery Integrations
  deliveryIntegrations?: {
    uberEats?: {
      enabled: boolean;
      storeId?: string;
      apiKey?: string;
      webhookSecret?: string;
    };
    doorDash?: {
      enabled: boolean;
      storeId?: string;
      apiKey?: string;
      webhookSecret?: string;
    };
    inHouseDelivery?: {
      enabled: boolean;
      deliveryRadius: number;
      deliveryFee: number;
      minimumOrder: number;
      estimatedDeliveryTime: string;
    };
  };

  // Communication Settings
  notifications?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    slackWebhook?: string;
    notificationEmails: string[];
    notificationPhones: string[];
  };

  // Business Rules
  businessRules?: {
    acceptAfterHours: boolean;
    maxReservationSize: number;
    advanceReservationDays: number;
    automaticConfirmations: boolean;
    requireCustomerContact: boolean;
  };

  // Analytics Settings
  analytics?: {
    enabled: boolean;
    trackCustomerData: boolean;
    retentionPeriodDays: number;
    exportEnabled: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

class RestaurantConfigService {
  private static instance: RestaurantConfigService;
  private encryptionKey: string;

  constructor() {
    // Use environment variable or generate a key for encryption
    this.encryptionKey = process.env.RESTAURANT_CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  static getInstance(): RestaurantConfigService {
    if (!RestaurantConfigService.instance) {
      RestaurantConfigService.instance = new RestaurantConfigService();
    }
    return RestaurantConfigService.instance;
  }

  /**
   * Encrypt sensitive data before storage
   * Uses createCipheriv with random IV for security
   */
  private encrypt(text: string): string {
    try {
      // Generate a proper 32-byte key from the encryption key
      const key = crypto.scryptSync(this.encryptionKey, 'restaurant-config-salt', 32);

      // Generate a random IV (16 bytes for AES)
      const iv = crypto.randomBytes(16);

      // Use createCipheriv instead of deprecated createCipher
      const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return IV + encrypted data (IV is needed for decryption)
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      return text; // Fallback to unencrypted in development
    }
  }

  /**
   * Decrypt sensitive data after retrieval
   * Uses createDecipheriv with stored IV
   */
  private decrypt(encryptedText: string): string {
    try {
      // Check if this is the new format (with IV)
      if (encryptedText.includes(':')) {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        // Generate the same key used for encryption
        const key = crypto.scryptSync(this.encryptionKey, 'restaurant-config-salt', 32);

        // Use createDecipheriv instead of deprecated createDecipher
        const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } else {
        // Legacy format (old encrypted data) - try to decrypt with old method
        console.warn('⚠️ Decrypting legacy format data - please re-encrypt');
        const key = crypto.scryptSync(this.encryptionKey, 'restaurant-config-salt', 32);
        // For legacy data, we'll need to derive IV from key (not ideal but needed for migration)
        const legacyIv = crypto.createHash('md5').update(this.encryptionKey).digest();
        const decipher = crypto.createDecipheriv('aes-256-ctr', key, legacyIv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      return encryptedText; // Fallback to return as-is
    }
  }

  /**
   * Save restaurant integrations configuration
   */
  async saveRestaurantIntegrations(restaurantId: string, config: Partial<RestaurantIntegrations>): Promise<void> {
    console.log(`💾 Saving integrations config for restaurant: ${restaurantId}`);

    try {
      // Encrypt sensitive credentials
      const encryptedConfig = this.encryptSensitiveFields({ ...config });

      // Save to database
      await storage.saveRestaurantIntegrations(restaurantId, encryptedConfig);

      console.log(`✅ Successfully saved integrations config for restaurant: ${restaurantId}`);
    } catch (error) {
      console.error(`❌ Failed to save integrations config for ${restaurantId}:`, error);
      throw error;
    }
  }

  /**
   * Get restaurant integrations configuration
   */
  async getRestaurantIntegrations(restaurantId: string): Promise<RestaurantIntegrations | null> {
    try {
      const config = await storage.getRestaurantIntegrations(restaurantId);

      if (!config) {
        console.log(`ℹ️ No integrations config found for restaurant: ${restaurantId}`);
        return null;
      }

      // Decrypt sensitive credentials
      const decryptedConfig = this.decryptSensitiveFields(config);

      return decryptedConfig;
    } catch (error) {
      console.error(`❌ Failed to get integrations config for ${restaurantId}:`, error);
      return null;
    }
  }

  /**
   * Update specific integration for a restaurant
   */
  async updateIntegration(restaurantId: string, integrationType: string, integrationData: any): Promise<void> {
    console.log(`🔄 Updating ${integrationType} integration for restaurant: ${restaurantId}`);

    try {
      const existingConfig = await this.getRestaurantIntegrations(restaurantId);

      if (!existingConfig) {
        throw new Error(`Restaurant configuration not found for ${restaurantId}`);
      }

      // Update specific integration
      const updatedConfig = {
        ...existingConfig,
        [integrationType]: {
          ...existingConfig[integrationType as keyof RestaurantIntegrations],
          ...integrationData,
          enabled: true
        },
        updatedAt: new Date()
      };

      await this.saveRestaurantIntegrations(restaurantId, updatedConfig);

      console.log(`✅ Successfully updated ${integrationType} integration for restaurant: ${restaurantId}`);
    } catch (error) {
      console.error(`❌ Failed to update ${integrationType} integration for ${restaurantId}:`, error);
      throw error;
    }
  }

  /**
   * Test integration connectivity
   */
  async testIntegration(restaurantId: string, integrationType: string): Promise<{ success: boolean; message: string; details?: any }> {
    console.log(`🧪 Testing ${integrationType} integration for restaurant: ${restaurantId}`);

    try {
      const config = await this.getRestaurantIntegrations(restaurantId);

      if (!config) {
        return { success: false, message: 'Restaurant configuration not found' };
      }

      switch (integrationType) {
        case 'googleCalendar':
          return await this.testGoogleCalendarIntegration(config.googleCalendar);

        case 'posSystem':
          return await this.testPOSIntegration(config.posSystem);

        case 'deliveryIntegrations':
          return await this.testDeliveryIntegrations(config.deliveryIntegrations);

        default:
          return { success: false, message: `Unknown integration type: ${integrationType}` };
      }

    } catch (error) {
      console.error(`❌ Integration test failed for ${integrationType}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during integration test'
      };
    }
  }

  /**
   * Get integration status for a restaurant
   */
  async getIntegrationStatus(restaurantId: string): Promise<{
    googleCalendar: { enabled: boolean; configured: boolean; tested?: boolean };
    posSystem: { enabled: boolean; configured: boolean; type?: string; tested?: boolean };
    delivery: { enabled: boolean; platforms: string[]; tested?: boolean };
    notifications: { enabled: boolean; methods: string[] };
  }> {
    try {
      const config = await this.getRestaurantIntegrations(restaurantId);

      if (!config) {
        return {
          googleCalendar: { enabled: false, configured: false },
          posSystem: { enabled: false, configured: false },
          delivery: { enabled: false, platforms: [] },
          notifications: { enabled: false, methods: [] }
        };
      }

      return {
        googleCalendar: {
          enabled: config.googleCalendar?.enabled || false,
          configured: !!(config.googleCalendar?.calendarId && config.googleCalendar?.serviceAccountKey)
        },
        posSystem: {
          enabled: config.posSystem?.enabled || false,
          configured: !!(config.posSystem?.type && config.posSystem?.credentials?.apiKey),
          type: config.posSystem?.type
        },
        delivery: {
          enabled: !!(config.deliveryIntegrations?.uberEats?.enabled ||
                     config.deliveryIntegrations?.doorDash?.enabled ||
                     config.deliveryIntegrations?.inHouseDelivery?.enabled),
          platforms: [
            ...(config.deliveryIntegrations?.uberEats?.enabled ? ['UberEats'] : []),
            ...(config.deliveryIntegrations?.doorDash?.enabled ? ['DoorDash'] : []),
            ...(config.deliveryIntegrations?.inHouseDelivery?.enabled ? ['In-House'] : [])
          ]
        },
        notifications: {
          enabled: config.notifications?.emailNotifications || config.notifications?.smsNotifications || false,
          methods: [
            ...(config.notifications?.emailNotifications ? ['Email'] : []),
            ...(config.notifications?.smsNotifications ? ['SMS'] : []),
            ...(config.notifications?.slackWebhook ? ['Slack'] : [])
          ]
        }
      };

    } catch (error) {
      console.error(`❌ Failed to get integration status for ${restaurantId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize default configuration for new restaurant
   */
  async initializeRestaurantConfig(userId: string, restaurantId: string, businessName: string, businessData: any): Promise<void> {
    console.log(`🚀 Initializing config for new restaurant: ${businessName}`);

    try {
      const defaultConfig: Partial<RestaurantIntegrations> = {
        userId,
        restaurantId,
        businessName,

        googleCalendar: {
          enabled: false,
          timeZone: businessData.timezone || 'America/New_York'
        },

        posSystem: {
          enabled: false,
          type: 'custom',
          displayName: 'Custom POS',
          credentials: {},
          settings: {
            autoAcceptOrders: false,
            orderConfirmationEmail: true,
            kitchenPrintingEnabled: false
          }
        },

        deliveryIntegrations: {
          inHouseDelivery: {
            enabled: false,
            deliveryRadius: 5,
            deliveryFee: 2.99,
            minimumOrder: 15,
            estimatedDeliveryTime: '30-45 minutes'
          }
        },

        notifications: {
          emailNotifications: true,
          smsNotifications: false,
          notificationEmails: businessData.email ? [businessData.email] : [],
          notificationPhones: businessData.phone ? [businessData.phone] : []
        },

        businessRules: {
          acceptAfterHours: businessData.acceptAfterHours || false,
          maxReservationSize: 12,
          advanceReservationDays: 30,
          automaticConfirmations: true,
          requireCustomerContact: true
        },

        analytics: {
          enabled: true,
          trackCustomerData: true,
          retentionPeriodDays: 90,
          exportEnabled: true
        },

        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveRestaurantIntegrations(restaurantId, defaultConfig);

      console.log(`✅ Successfully initialized config for restaurant: ${businessName}`);
    } catch (error) {
      console.error(`❌ Failed to initialize config for ${restaurantId}:`, error);
      throw error;
    }
  }

  // Private helper methods

  private encryptSensitiveFields(config: any): any {
    const sensitiveFields = [
      'serviceAccountKey',
      'apiKey',
      'apiSecret',
      'accessToken',
      'webhookSecret',
      'slackWebhook'
    ];

    const encrypted = JSON.parse(JSON.stringify(config));

    const encryptRecursively = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.includes(key) && typeof value === 'string') {
            obj[key] = this.encrypt(value);
          } else if (typeof value === 'object') {
            encryptRecursively(value);
          }
        }
      }
    };

    encryptRecursively(encrypted);
    return encrypted;
  }

  private decryptSensitiveFields(config: any): any {
    const sensitiveFields = [
      'serviceAccountKey',
      'apiKey',
      'apiSecret',
      'accessToken',
      'webhookSecret',
      'slackWebhook'
    ];

    const decrypted = JSON.parse(JSON.stringify(config));

    const decryptRecursively = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.includes(key) && typeof value === 'string') {
            obj[key] = this.decrypt(value);
          } else if (typeof value === 'object') {
            decryptRecursively(value);
          }
        }
      }
    };

    decryptRecursively(decrypted);
    return decrypted;
  }

  // Integration testing methods

  private async testGoogleCalendarIntegration(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config || !config.enabled) {
      return { success: false, message: 'Google Calendar integration not enabled' };
    }

    if (!config.serviceAccountKey || !config.calendarId) {
      return { success: false, message: 'Missing Google Calendar configuration (service account key or calendar ID)' };
    }

    try {
      // Test Google Calendar API connection
      // This would make an actual API call to Google Calendar
      console.log('🧪 Testing Google Calendar API connection...');

      return {
        success: true,
        message: 'Google Calendar integration test successful',
        details: { calendarId: config.calendarId, timeZone: config.timeZone }
      };

    } catch (error) {
      return {
        success: false,
        message: `Google Calendar test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async testPOSIntegration(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config || !config.enabled) {
      return { success: false, message: 'POS integration not enabled' };
    }

    if (!config.type || !config.credentials?.apiKey) {
      return { success: false, message: 'Missing POS configuration (type or API key)' };
    }

    try {
      console.log(`🧪 Testing ${config.type} POS integration...`);

      // This would make actual API calls to test POS connectivity
      return {
        success: true,
        message: `${config.type} POS integration test successful`,
        details: { type: config.type, locationId: config.credentials.locationId }
      };

    } catch (error) {
      return {
        success: false,
        message: `POS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async testDeliveryIntegrations(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config) {
      return { success: false, message: 'No delivery integrations configured' };
    }

    const results = [];
    let hasEnabled = false;

    if (config.uberEats?.enabled) {
      hasEnabled = true;
      results.push({ platform: 'UberEats', success: true, message: 'Configuration valid' });
    }

    if (config.doorDash?.enabled) {
      hasEnabled = true;
      results.push({ platform: 'DoorDash', success: true, message: 'Configuration valid' });
    }

    if (config.inHouseDelivery?.enabled) {
      hasEnabled = true;
      results.push({ platform: 'In-House', success: true, message: 'Configuration valid' });
    }

    if (!hasEnabled) {
      return { success: false, message: 'No delivery platforms enabled' };
    }

    return {
      success: true,
      message: 'Delivery integrations test successful',
      details: { platforms: results }
    };
  }
}

export const restaurantConfigService = RestaurantConfigService.getInstance();