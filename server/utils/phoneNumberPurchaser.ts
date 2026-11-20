import { twilioService } from '../services/twilioService';
import { resolveBaseUrl, getWebhookUrls } from './baseUrlResolver';
import type { Request } from 'express';

interface PurchaseOptions {
  areaCode?: string;
  contains?: string;
  type?: 'local' | 'toll-free';
  limit?: number;
  friendlyName?: string;
}

export class PhoneNumberPurchaser {
  /**
   * Search and purchase a phone number for AI receptionist
   */
  async searchAndPurchaseNumber(options: PurchaseOptions = {}): Promise<any> {
    try {
      console.log('🔍 Searching for available phone numbers...');
      
      const searchOptions = {
        areaCode: options.areaCode,
        contains: options.contains,
        type: options.type || 'local',
        limit: options.limit || 20,
        smsEnabled: true,
        voiceEnabled: true
      };

      // Search for available phone numbers
      const availableNumbers = await twilioService.searchAvailablePhoneNumbers(searchOptions);
      
      if (availableNumbers.length === 0) {
        throw new Error('No available phone numbers found with the specified criteria');
      }

      console.log(`📞 Found ${availableNumbers.length} available numbers:`);
      availableNumbers.slice(0, 5).forEach((number, index) => {
        console.log(`${index + 1}. ${number.phoneNumber} (${number.locality}, ${number.region})`);
      });

      // Select the first available number
      const selectedNumber = availableNumbers[0];
      console.log(`\n✨ Selecting: ${selectedNumber.phoneNumber}`);

      // Configure webhook URLs for AI receptionist
      const baseUrl = resolveBaseUrl();
      const webhookUrls = getWebhookUrls(baseUrl);
      const webhookConfig = {
        voiceUrl: webhookUrls.voiceUrl,
        smsUrl: webhookUrls.smsUrl,
        statusCallback: webhookUrls.statusCallback,
        friendlyName: options.friendlyName || 'AI Receptionist'
      };

      console.log(`🔗 Configuring webhooks with base URL: ${baseUrl}`);

      // Purchase the phone number with webhook configuration
      const purchasedNumber = await twilioService.purchasePhoneNumber(
        selectedNumber.phoneNumber,
        webhookConfig
      );

      console.log('🎉 Phone number purchased successfully!');
      console.log('📋 Purchase details:', {
        phoneNumber: purchasedNumber.phoneNumber,
        sid: purchasedNumber.sid,
        friendlyName: purchasedNumber.friendlyName,
        voiceUrl: purchasedNumber.voiceUrl,
        smsUrl: purchasedNumber.smsUrl
      });

      // CRITICAL: Explicitly enable SMS on the purchased number to ensure SMS alerts work in production
      try {
        console.log(`📱 Explicitly enabling SMS on newly purchased number ${purchasedNumber.phoneNumber}...`);
        await twilioService.updatePhoneNumberConfiguration(purchasedNumber.sid, {
          ...webhookConfig,
          enableSMS: true
        });
        console.log(`✅ SMS capability explicitly enabled on ${purchasedNumber.phoneNumber}`);
      } catch (smsEnableError) {
        console.error(`⚠️ Warning: Failed to explicitly enable SMS:`, smsEnableError);
        // Don't fail the entire purchase if SMS enablement fails
      }

      // Update the Twilio service with the new phone number
      twilioService.setPhoneNumber(purchasedNumber.phoneNumber);
      
      // Set the phone number as an environment variable for persistence
      process.env.TWILIO_PHONE_NUMBER = purchasedNumber.phoneNumber;

      return purchasedNumber;

    } catch (error) {
      console.error('❌ Error purchasing phone number:', error);
      throw error;
    }
  }

  /**
   * List existing phone numbers in the account
   */
  async listExistingNumbers(): Promise<any[]> {
    try {
      console.log('📋 Fetching existing phone numbers...');
      const numbers = await twilioService.getExistingPhoneNumbers();

      console.log(`📞 Found ${numbers.length} existing phone numbers:`);
      numbers.forEach(number => {
        console.log(`- ${number.phoneNumber} (${number.friendlyName}) - SID: ${number.sid}`);
      });

      return numbers;

    } catch (error) {
      console.error('❌ Error listing phone numbers:', error);
      throw error;
    }
  }

  /**
   * Configure an existing phone number for AI receptionist
   */
  async configureExistingNumber(phoneNumberSid: string, phoneNumber: string): Promise<any> {
    try {
      console.log(`🔧 Configuring existing number ${phoneNumber} for AI receptionist...`);

      const baseUrl = resolveBaseUrl();
      const webhookUrls = getWebhookUrls(baseUrl);
      const webhookConfig = {
        voiceUrl: webhookUrls.voiceUrl,
        smsUrl: webhookUrls.smsUrl,
        statusCallback: webhookUrls.statusCallback,
        friendlyName: 'AI Receptionist'
      };

      console.log(`🔗 Configuring webhooks with base URL: ${baseUrl}`);

      const updatedNumber = await twilioService.updatePhoneNumberConfiguration(phoneNumberSid, webhookConfig);

      console.log('✅ Phone number configured successfully!');
      console.log('📋 Configuration details:', {
        phoneNumber: updatedNumber.phoneNumber,
        voiceUrl: updatedNumber.voiceUrl,
        smsUrl: updatedNumber.smsUrl
      });

      // Update the Twilio service with this phone number
      twilioService.setPhoneNumber(phoneNumber);
      
      // Set the phone number as an environment variable for persistence
      process.env.TWILIO_PHONE_NUMBER = phoneNumber;

      return updatedNumber;

    } catch (error) {
      console.error('❌ Error configuring phone number:', error);
      throw error;
    }
  }
}

export const phoneNumberPurchaser = new PhoneNumberPurchaser();