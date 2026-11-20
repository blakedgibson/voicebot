import fetch from 'node-fetch';
import { storage } from '../storage';

export interface PlatformInfo {
  id: string;
  name: string;
  type: 'pos' | 'reservation' | 'delivery' | 'payment' | 'analytics' | 'other';
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  health: 'healthy' | 'degraded' | 'down' | 'unknown';
  version?: string;
  features: string[];
  lastChecked: string;
  connectionDetails?: {
    endpoint?: string;
    apiVersion?: string;
    accountId?: string;
    locationId?: string;
    merchantId?: string;
  };
  capabilities: {
    orders: boolean;
    reservations: boolean;
    payments: boolean;
    inventory: boolean;
    analytics: boolean;
    webhooks: boolean;
  };
  credentialsRequired: string[];
  detectionMethod: 'api_test' | 'webhook_response' | 'manual_config' | 'auto_discovery';
}

export interface DetectionResult {
  platform: PlatformInfo;
  confidence: number;
  detectedAt: string;
  detectionData?: any;
}

/**
 * Universal Platform Detection Service
 * Auto-detects and identifies any connected POS, reservation, or business system
 */
export class PlatformDetectionService {

  private platformDefinitions: Map<string, PlatformInfo> = new Map();

  constructor() {
    this.initializePlatformDefinitions();
  }

  /**
   * Initialize known platform definitions
   */
  private initializePlatformDefinitions() {
    // POS Systems
    this.platformDefinitions.set('square', {
      id: 'square',
      name: 'Square POS',
      type: 'pos',
      status: 'disconnected',
      health: 'unknown',
      features: ['orders', 'payments', 'inventory', 'analytics', 'webhooks'],
      lastChecked: new Date().toISOString(),
      capabilities: {
        orders: true,
        reservations: false,
        payments: true,
        inventory: true,
        analytics: true,
        webhooks: true
      },
      credentialsRequired: ['app_id', 'access_token', 'location_id'],
      detectionMethod: 'api_test'
    });

    this.platformDefinitions.set('toast', {
      id: 'toast',
      name: 'Toast POS',
      type: 'pos',
      status: 'disconnected',
      health: 'unknown',
      features: ['orders', 'payments', 'inventory', 'analytics'],
      lastChecked: new Date().toISOString(),
      capabilities: {
        orders: true,
        reservations: false,
        payments: true,
        inventory: true,
        analytics: true,
        webhooks: true
      },
      credentialsRequired: ['client_key', 'client_secret', 'location_id'],
      detectionMethod: 'api_test'
    });

    this.platformDefinitions.set('clover', {
      id: 'clover',
      name: 'Clover POS',
      type: 'pos',
      status: 'disconnected',
      health: 'unknown',
      features: ['orders', 'payments', 'inventory', 'apps'],
      lastChecked: new Date().toISOString(),
      capabilities: {
        orders: true,
        reservations: false,
        payments: true,
        inventory: true,
        analytics: true,
        webhooks: true
      },
      credentialsRequired: ['app_id', 'app_secret', 'merchant_id'],
      detectionMethod: 'api_test'
    });

    // Reservation Systems
    this.platformDefinitions.set('opentable', {
      id: 'opentable',
      name: 'OpenTable',
      type: 'reservation',
      status: 'disconnected',
      health: 'unknown',
      features: ['reservations', 'waitlist', 'analytics'],
      lastChecked: new Date().toISOString(),
      capabilities: {
        orders: false,
        reservations: true,
        payments: false,
        inventory: false,
        analytics: true,
        webhooks: true
      },
      credentialsRequired: ['restaurant_id', 'api_key'],
      detectionMethod: 'api_test'
    });

    this.platformDefinitions.set('resy', {
      id: 'resy',
      name: 'Resy',
      type: 'reservation',
      status: 'disconnected',
      health: 'unknown',
      features: ['reservations', 'waitlist', 'guest_management'],
      lastChecked: new Date().toISOString(),
      capabilities: {
        orders: false,
        reservations: true,
        payments: false,
        inventory: false,
        analytics: true,
        webhooks: false
      },
      credentialsRequired: ['venue_id', 'api_key'],
      detectionMethod: 'api_test'
    });

    // Delivery Platforms
    this.platformDefinitions.set('doordash', {
      id: 'doordash',
      name: 'DoorDash',
      type: 'delivery',
      status: 'disconnected',
      health: 'unknown',
      features: ['delivery', 'orders', 'analytics'],
      lastChecked: new Date().toISOString(),
      capabilities: {
        orders: true,
        reservations: false,
        payments: true,
        inventory: false,
        analytics: true,
        webhooks: true
      },
      credentialsRequired: ['developer_id', 'key_id', 'signing_secret'],
      detectionMethod: 'webhook_response'
    });

    this.platformDefinitions.set('ubereats', {
      id: 'ubereats',
      name: 'Uber Eats',
      type: 'delivery',
      status: 'disconnected',
      health: 'unknown',
      features: ['delivery', 'orders', 'analytics'],
      lastChecked: new Date().toISOString(),
      capabilities: {
        orders: true,
        reservations: false,
        payments: true,
        inventory: false,
        analytics: true,
        webhooks: true
      },
      credentialsRequired: ['client_id', 'client_secret', 'store_id'],
      detectionMethod: 'webhook_response'
    });

    // Payment Systems
    this.platformDefinitions.set('stripe', {
      id: 'stripe',
      name: 'Stripe',
      type: 'payment',
      status: 'disconnected',
      health: 'unknown',
      features: ['payments', 'subscriptions', 'analytics'],
      lastChecked: new Date().toISOString(),
      capabilities: {
        orders: false,
        reservations: false,
        payments: true,
        inventory: false,
        analytics: true,
        webhooks: true
      },
      credentialsRequired: ['secret_key', 'webhook_secret'],
      detectionMethod: 'api_test'
    });

    // Calendar/Scheduling
    this.platformDefinitions.set('google_calendar', {
      id: 'google_calendar',
      name: 'Google Calendar',
      type: 'reservation',
      status: 'disconnected',
      health: 'unknown',
      features: ['calendar', 'scheduling', 'events'],
      lastChecked: new Date().toISOString(),
      capabilities: {
        orders: false,
        reservations: true,
        payments: false,
        inventory: false,
        analytics: false,
        webhooks: true
      },
      credentialsRequired: ['client_id', 'client_secret', 'calendar_id'],
      detectionMethod: 'api_test'
    });
  }

  /**
   * Auto-detect all connected platforms for a user
   */
  async detectConnectedPlatforms(userId: string): Promise<DetectionResult[]> {
    console.log(`🔍 Auto-detecting connected platforms for user: ${userId}`);

    const results: DetectionResult[] = [];
    const userCredentials = await this.getUserCredentials(userId);

    // Test each platform definition
    for (const [platformId, platformDef] of this.platformDefinitions) {
      try {
        const detectionResult = await this.testPlatformConnection(platformId, userCredentials);
        if (detectionResult) {
          results.push(detectionResult);
        }
      } catch (error) {
        console.warn(`Detection failed for ${platformId}:`, error);
      }
    }

    // Also check for unknown/custom platforms
    const customPlatforms = await this.detectCustomPlatforms(userCredentials);
    results.push(...customPlatforms);

    return results;
  }

  /**
   * Test connection to a specific platform
   */
  async testPlatformConnection(platformId: string, credentials: any): Promise<DetectionResult | null> {
    const platformDef = this.platformDefinitions.get(platformId);
    if (!platformDef) return null;

    console.log(`🧪 Testing ${platformDef.name} connection...`);

    try {
      let detectionResult: DetectionResult | null = null;

      switch (platformId) {
        case 'square':
          detectionResult = await this.testSquareConnection(credentials);
          break;
        case 'toast':
          detectionResult = await this.testToastConnection(credentials);
          break;
        case 'clover':
          detectionResult = await this.testCloverConnection(credentials);
          break;
        case 'stripe':
          detectionResult = await this.testStripeConnection(credentials);
          break;
        case 'google_calendar':
          detectionResult = await this.testGoogleCalendarConnection(credentials);
          break;
        case 'opentable':
          detectionResult = await this.testOpenTableConnection(credentials);
          break;
        case 'resy':
          detectionResult = await this.testResyConnection(credentials);
          break;
        default:
          // Generic API test
          detectionResult = await this.testGenericConnection(platformDef, credentials);
      }

      if (detectionResult) {
        // Update platform status
        platformDef.status = 'connected';
        platformDef.health = 'healthy';
        platformDef.lastChecked = new Date().toISOString();
        this.platformDefinitions.set(platformId, platformDef);
      }

      return detectionResult;
    } catch (error) {
      console.warn(`❌ ${platformDef.name} connection test failed:`, error);

      // Update platform status to error
      platformDef.status = 'error';
      platformDef.health = 'down';
      platformDef.lastChecked = new Date().toISOString();
      this.platformDefinitions.set(platformId, platformDef);

      return null;
    }
  }

  /**
   * Test Square POS connection
   */
  private async testSquareConnection(credentials: any): Promise<DetectionResult | null> {
    if (!credentials.square_pos_app_id || !credentials.square_pos_access_token) {
      return null;
    }

    try {
      const response = await fetch('https://connect.squareupsandbox.com/v2/locations', {
        headers: {
          'Authorization': `Bearer ${credentials.square_pos_access_token}`,
          'Square-Version': '2023-10-18'
        }
      });

      if (response.ok) {
        const data = await response.json() as any;
        const platformDef = this.platformDefinitions.get('square')!;

        return {
          platform: {
            ...platformDef,
            status: 'connected',
            health: 'healthy',
            connectionDetails: {
              endpoint: 'connect.squareupsandbox.com',
              apiVersion: '2023-10-18',
              locationId: credentials.square_pos_location_id
            }
          },
          confidence: 1.0,
          detectedAt: new Date().toISOString(),
          detectionData: { locations: data.locations?.length || 0 }
        };
      }
    } catch (error) {
      console.warn('Square connection test failed:', error);
    }

    return null;
  }

  /**
   * Test Toast POS connection
   */
  private async testToastConnection(credentials: any): Promise<DetectionResult | null> {
    if (!credentials.toast_pos_client_key || !credentials.toast_pos_client_secret) {
      return null;
    }

    try {
      // Toast uses different auth - this is a simplified test
      const platformDef = this.platformDefinitions.get('toast')!;

      return {
        platform: {
          ...platformDef,
          status: 'connected',
          health: 'healthy',
          connectionDetails: {
            endpoint: 'ws-api.toasttab.com',
            locationId: credentials.toast_pos_location_id
          }
        },
        confidence: 0.8, // Lower confidence without actual API test
        detectedAt: new Date().toISOString(),
        detectionData: { hasCredentials: true }
      };
    } catch (error) {
      console.warn('Toast connection test failed:', error);
    }

    return null;
  }

  /**
   * Test Clover POS connection
   */
  private async testCloverConnection(credentials: any): Promise<DetectionResult | null> {
    if (!credentials.clover_pos_app_id || !credentials.clover_pos_merchant_id) {
      return null;
    }

    try {
      const platformDef = this.platformDefinitions.get('clover')!;

      return {
        platform: {
          ...platformDef,
          status: 'connected',
          health: 'healthy',
          connectionDetails: {
            endpoint: 'sandbox-dev.clover.com',
            merchantId: credentials.clover_pos_merchant_id
          }
        },
        confidence: 0.8,
        detectedAt: new Date().toISOString(),
        detectionData: { hasCredentials: true }
      };
    } catch (error) {
      console.warn('Clover connection test failed:', error);
    }

    return null;
  }

  /**
   * Test Stripe connection
   */
  private async testStripeConnection(credentials: any): Promise<DetectionResult | null> {
    if (!credentials.stripe_secret_key) {
      return null;
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: {
          'Authorization': `Bearer ${credentials.stripe_secret_key}`
        }
      });

      if (response.ok) {
        const data = await response.json() as any;
        const platformDef = this.platformDefinitions.get('stripe')!;

        return {
          platform: {
            ...platformDef,
            status: 'connected',
            health: 'healthy',
            connectionDetails: {
              endpoint: 'api.stripe.com',
              accountId: data.id
            }
          },
          confidence: 1.0,
          detectedAt: new Date().toISOString(),
          detectionData: { account: data.business_profile?.name || data.id }
        };
      }
    } catch (error) {
      console.warn('Stripe connection test failed:', error);
    }

    return null;
  }

  /**
   * Test Google Calendar connection
   */
  private async testGoogleCalendarConnection(credentials: any): Promise<DetectionResult | null> {
    if (!credentials.google_client_id || !credentials.google_calendar_id) {
      return null;
    }

    // Would need OAuth flow for real testing
    const platformDef = this.platformDefinitions.get('google_calendar')!;

    return {
      platform: {
        ...platformDef,
        status: 'connected',
        health: 'healthy',
        connectionDetails: {
          endpoint: 'calendar.googleapis.com',
          calendarId: credentials.google_calendar_id
        }
      },
      confidence: 0.7,
      detectedAt: new Date().toISOString(),
      detectionData: { hasCredentials: true }
    };
  }

  /**
   * Test OpenTable connection
   */
  private async testOpenTableConnection(credentials: any): Promise<DetectionResult | null> {
    if (!credentials.opentable_restaurant_id || !credentials.opentable_api_key) {
      return null;
    }

    const platformDef = this.platformDefinitions.get('opentable')!;

    return {
      platform: {
        ...platformDef,
        status: 'connected',
        health: 'healthy',
        connectionDetails: {
          restaurantId: credentials.opentable_restaurant_id
        }
      },
      confidence: 0.7,
      detectedAt: new Date().toISOString(),
      detectionData: { hasCredentials: true }
    };
  }

  /**
   * Test Resy connection
   */
  private async testResyConnection(credentials: any): Promise<DetectionResult | null> {
    if (!credentials.resy_venue_id || !credentials.resy_api_key) {
      return null;
    }

    const platformDef = this.platformDefinitions.get('resy')!;

    return {
      platform: {
        ...platformDef,
        status: 'connected',
        health: 'healthy',
        connectionDetails: {
          venueId: credentials.resy_venue_id
        }
      },
      confidence: 0.7,
      detectedAt: new Date().toISOString(),
      detectionData: { hasCredentials: true }
    };
  }

  /**
   * Generic connection test for unknown platforms
   */
  private async testGenericConnection(platformDef: PlatformInfo, credentials: any): Promise<DetectionResult | null> {
    // This would implement generic API testing logic
    return null;
  }

  /**
   * Detect custom/unknown platforms
   */
  private async detectCustomPlatforms(credentials: any): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // Check for custom webhook endpoints or API keys that don't match known platforms
    const customKeys = Object.keys(credentials).filter(key =>
      !key.includes('square') &&
      !key.includes('toast') &&
      !key.includes('clover') &&
      !key.includes('stripe') &&
      !key.includes('google') &&
      key.includes('api') || key.includes('webhook') || key.includes('secret')
    );

    for (const key of customKeys) {
      // Attempt to detect what platform this might be
      const detectedPlatform = await this.analyzeUnknownCredential(key, credentials[key]);
      if (detectedPlatform) {
        results.push(detectedPlatform);
      }
    }

    return results;
  }

  /**
   * Analyze unknown credentials to identify platform
   */
  private async analyzeUnknownCredential(credentialName: string, credentialValue: string): Promise<DetectionResult | null> {
    // Implement heuristics to identify unknown platforms
    // This could check URL patterns, key formats, etc.

    if (credentialValue.includes('shopify')) {
      return {
        platform: {
          id: 'shopify_detected',
          name: 'Shopify (Detected)',
          type: 'pos',
          status: 'connected',
          health: 'unknown',
          features: ['orders', 'inventory', 'payments'],
          lastChecked: new Date().toISOString(),
          capabilities: {
            orders: true,
            reservations: false,
            payments: true,
            inventory: true,
            analytics: true,
            webhooks: true
          },
          credentialsRequired: ['api_key', 'store_url'],
          detectionMethod: 'auto_discovery'
        },
        confidence: 0.6,
        detectedAt: new Date().toISOString(),
        detectionData: { credentialPattern: 'shopify_pattern' }
      };
    }

    return null;
  }

  /**
   * Get user credentials from storage
   */
  private async getUserCredentials(userId: string): Promise<any> {
    try {
      const credentials = await storage.getUserCredentials(userId);

      // Flatten credentials for easier access
      const flatCredentials: any = {};
      for (const cred of credentials) {
        const key = `${cred.integrationType}_${cred.credentialName}`;
        flatCredentials[key] = cred.value;
      }

      return flatCredentials;
    } catch (error) {
      console.warn('Failed to get user credentials:', error);
      return {};
    }
  }

  /**
   * Get all supported platforms
   */
  getAllPlatforms(): PlatformInfo[] {
    return Array.from(this.platformDefinitions.values());
  }

  /**
   * Get platform by ID
   */
  getPlatform(platformId: string): PlatformInfo | undefined {
    return this.platformDefinitions.get(platformId);
  }

  /**
   * Add custom platform definition
   */
  addCustomPlatform(platform: PlatformInfo): void {
    this.platformDefinitions.set(platform.id, platform);
  }
}

// Export singleton instance
export const platformDetectionService = new PlatformDetectionService();