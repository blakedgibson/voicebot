import twilio from 'twilio';
import { resolveBaseUrl, getWebhookUrls } from '../utils/baseUrlResolver';
import type { Request } from 'express';

const VoiceResponse = twilio.twiml.VoiceResponse;

class TestTwilioService {
  private client: twilio.Twilio | null = null;
  private phoneNumber?: string;

  private initializeClient() {
    if (this.client) return this.client;
    
    // Use test credentials for phone number purchasing
    const accountSid = process.env.twilio_test_auth_sid;
    const authToken = process.env.twilio_test_auth_secret;
    
    if (!accountSid || !authToken) {
      throw new Error('Missing test Twilio credentials - need twilio_test_auth_sid and twilio_test_auth_secret');
    }

    this.client = twilio(accountSid, authToken);
    console.log('🧪 Initialized TEST Twilio service for phone number purchasing');
    return this.client;
  }

  /**
   * Search for available phone numbers with test account
   */
  async searchAvailablePhoneNumbers(options: {
    areaCode?: string;
    contains?: string;
    smsEnabled?: boolean;
    voiceEnabled?: boolean;
    country?: string;
    type?: 'local' | 'toll-free';
    limit?: number;
  }): Promise<any[]> {
    try {
      const client = this.initializeClient();
      const searchOptions: any = {
        smsEnabled: options.smsEnabled !== false, // Default to true
        voiceEnabled: options.voiceEnabled !== false, // Default to true
        limit: options.limit || 10
      };

      if (options.areaCode) {
        searchOptions.areaCode = options.areaCode;
      }

      if (options.contains) {
        searchOptions.contains = options.contains;
      }

      let phoneNumbers;
      if (options.type === 'toll-free') {
        phoneNumbers = await client.availablePhoneNumbers(options.country || 'US').tollFree.list(searchOptions);
      } else {
        phoneNumbers = await client.availablePhoneNumbers(options.country || 'US').local.list(searchOptions);
      }

      return phoneNumbers.map(phone => ({
        phoneNumber: phone.phoneNumber,
        friendlyName: phone.friendlyName,
        locality: phone.locality,
        region: phone.region,
        postalCode: phone.postalCode,
        isoCountry: phone.isoCountry,
        capabilities: phone.capabilities,
        addressRequirements: phone.addressRequirements,
        beta: phone.beta
      }));
    } catch (error) {
      console.error('Error searching phone numbers with test credentials:', error);
      console.log(`🎭 TEST MODE: Twilio test credentials cannot access real phone numbers, generating mock numbers...`);
      
      // Generate mock phone numbers for test mode when real API fails
      const mockNumbers = [];
      const limit = options.limit || 10;
      
      for (let i = 0; i < limit; i++) {
        const areaCode = options.areaCode || '555'; // Use requested area code or 555 (test number)
        const exchange = Math.floor(Math.random() * 900) + 100; // 100-999
        const number = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        const phoneNumber = `+1${areaCode}${exchange}${number.toString().padStart(4, '0')}`;
        
        mockNumbers.push({
          phoneNumber,
          friendlyName: phoneNumber,
          locality: 'Test City',
          region: options.country || 'US',
          postalCode: '12345',
          isoCountry: 'US',
          capabilities: {
            voice: true,
            sms: true,
            mms: true
          },
          addressRequirements: 'none',
          beta: false
        });
      }
      
      console.log(`🎭 Generated ${mockNumbers.length} mock test phone numbers`);
      return mockNumbers;
    }
  }

  /**
   * Purchase a phone number with test credentials and configure for specific user/restaurant
   */
  async purchasePhoneNumberForUser(phoneNumber: string, options: {
    userId: string;
    restaurantId?: string;
    businessName: string;
    voiceUrl?: string;
    smsUrl?: string;
    statusCallback?: string;
    addressSid?: string;
    emergencyAddressSid?: string;
  }): Promise<any> {
    try {
      console.log(`🧪 Purchasing phone number ${phoneNumber} with TEST credentials for ${options.businessName}`);
      
      // Use provided URLs or generate default ones
      const baseUrl = resolveBaseUrl();
      const webhookUrls = getWebhookUrls(baseUrl);
      
      const purchaseOptions: any = {
        phoneNumber: phoneNumber,
        voiceUrl: options.voiceUrl || webhookUrls.voiceUrl,
        voiceMethod: 'POST',
        smsUrl: options.smsUrl || webhookUrls.smsUrl,
        smsMethod: 'POST',
        statusCallback: options.statusCallback || webhookUrls.statusCallback,
        friendlyName: `${options.businessName} AI Receptionist`
      };

      if (options.addressSid) {
        purchaseOptions.addressSid = options.addressSid;
      }

      if (options.emergencyAddressSid) {
        purchaseOptions.emergencyAddressSid = options.emergencyAddressSid;
      }

      const client = this.initializeClient();
      const incomingPhoneNumber = await client.incomingPhoneNumbers.create(purchaseOptions);

      console.log(`✅ Successfully purchased phone number ${phoneNumber} for ${options.businessName}`);
      
      return {
        sid: incomingPhoneNumber.sid,
        phoneNumber: incomingPhoneNumber.phoneNumber,
        friendlyName: incomingPhoneNumber.friendlyName,
        voiceUrl: incomingPhoneNumber.voiceUrl,
        smsUrl: incomingPhoneNumber.smsUrl,
        statusCallback: incomingPhoneNumber.statusCallback,
        dateCreated: incomingPhoneNumber.dateCreated,
        userId: options.userId,
        restaurantId: options.restaurantId,
        businessName: options.businessName
      };
    } catch (error) {
      console.error('Error purchasing phone number with test credentials:', error);
      console.log(`🎭 TEST MODE: Simulating phone number purchase for ${phoneNumber} (test credentials cannot purchase real numbers)`);
      
      // Generate a mock Twilio SID for test mode
      const mockSid = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`✅ Mock phone number "purchased" successfully: ${phoneNumber} for ${options.businessName}`);
      console.log(`🎭 In production, this would use live Twilio credentials for real purchase`);
      
      return {
        sid: mockSid,
        phoneNumber: phoneNumber,
        friendlyName: `${options.businessName} AI Receptionist`,
        voiceUrl: purchaseOptions.voiceUrl,
        smsUrl: purchaseOptions.smsUrl,
        statusCallback: purchaseOptions.statusCallback,
        dateCreated: new Date(),
        userId: options.userId,
        restaurantId: options.restaurantId,
        businessName: options.businessName
      };
    }
  }

  /**
   * Update phone number configuration for specific user
   */
  async updatePhoneNumberForUser(phoneNumberSid: string, options: {
    userId: string;
    businessName: string;
    voiceUrl?: string;
    smsUrl?: string;
    statusCallback?: string;
    emergencyAddressSid?: string;
  }): Promise<any> {
    try {
      console.log(`🔧 Updating phone number configuration for ${options.businessName}`);

      const baseUrl = resolveBaseUrl();
      const webhookUrls = getWebhookUrls(baseUrl);
      
      const updateOptions: any = {
        voiceUrl: options.voiceUrl || webhookUrls.voiceUrl,
        voiceMethod: 'POST',
        smsUrl: options.smsUrl || webhookUrls.smsUrl,
        smsMethod: 'POST',
        statusCallback: options.statusCallback || webhookUrls.statusCallback,
        friendlyName: `${options.businessName} AI Receptionist`
      };

      if (options.emergencyAddressSid) {
        updateOptions.emergencyAddressSid = options.emergencyAddressSid;
      }

      const client = this.initializeClient();
      const updatedNumber = await client.incomingPhoneNumbers(phoneNumberSid).update(updateOptions);

      return {
        sid: updatedNumber.sid,
        phoneNumber: updatedNumber.phoneNumber,
        friendlyName: updatedNumber.friendlyName,
        voiceUrl: updatedNumber.voiceUrl,
        smsUrl: updatedNumber.smsUrl,
        statusCallback: updatedNumber.statusCallback,
        userId: options.userId,
        businessName: options.businessName
      };
    } catch (error) {
      console.error('Error updating phone number configuration:', error);
      throw error;
    }
  }

  /**
   * Create emergency address for phone number compliance
   */
  async createEmergencyAddress(address: {
    customerName: string;
    street: string;
    city: string;
    region: string;
    postalCode: string;
    isoCountry?: string;
  }): Promise<any> {
    try {
      const client = this.initializeClient();
      const emergencyAddress = await client.addresses.create({
        customerName: address.customerName,
        street: address.street,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        isoCountry: address.isoCountry || 'US'
      });

      return {
        sid: emergencyAddress.sid,
        customerName: emergencyAddress.customerName,
        street: emergencyAddress.street,
        city: emergencyAddress.city,
        region: emergencyAddress.region,
        postalCode: emergencyAddress.postalCode,
        isoCountry: emergencyAddress.isoCountry
      };
    } catch (error) {
      console.error('Error creating emergency address:', error);
      throw error;
    }
  }

  /**
   * Get pricing information
   */
  async getPhoneNumberPricing(country: string = 'US'): Promise<any> {
    try {
      const client = this.initializeClient();
      const pricing = await client.pricing.v1.phoneNumbers.countries(country).fetch();
      return {
        country: pricing.country,
        isoCountry: pricing.isoCountry,
        phoneNumberPrices: pricing.phoneNumberPrices,
        priceUnit: pricing.priceUnit
      };
    } catch (error) {
      console.error('Error fetching phone number pricing:', error);
      throw error;
    }
  }

  /**
   * Release a phone number
   */
  async releasePhoneNumber(phoneNumberSid: string): Promise<boolean> {
    try {
      const client = this.initializeClient();
      await client.incomingPhoneNumbers(phoneNumberSid).remove();
      console.log(`✅ Successfully released phone number SID: ${phoneNumberSid}`);
      return true;
    } catch (error) {
      console.error('Error releasing phone number:', error);
      throw error;
    }
  }
}

// Factory function to get test Twilio service instance
let _testTwilioServiceInstance: TestTwilioService | null = null;

export function getTestTwilioService(): TestTwilioService {
  if (!_testTwilioServiceInstance) {
    _testTwilioServiceInstance = new TestTwilioService();
  }
  return _testTwilioServiceInstance;
}

// For backward compatibility - proxy all methods to the lazy-loaded instance
export const testTwilioService = new Proxy({}, {
  get(target, prop) {
    const instance = getTestTwilioService();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
}) as TestTwilioService;