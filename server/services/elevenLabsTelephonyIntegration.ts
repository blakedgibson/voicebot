import axios from 'axios';
import { storage } from '../storage';

interface ElevenLabsPhoneNumberConfig {
  label: string;
  phone_number: string;
  twilio_sid: string;
  twilio_auth_token: string;
  agent_id?: string;
}

interface ElevenLabsPhoneNumberResponse {
  phone_number_id: string;
  label: string;
  phone_number: string;
  agent_id?: string;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
}

/**
 * ElevenLabs Telephony Integration Service
 * Manages phone numbers in ElevenLabs Conversational AI platform for direct Twilio integration
 */
class ElevenLabsTelephonyIntegration {
  private apiKey: string;
  private baseUrl: string = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ ELEVENLABS_API_KEY not found - ElevenLabs telephony integration disabled');
    }
  }

  /**
   * Check if ElevenLabs integration is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Import a Twilio phone number into ElevenLabs platform
   * This enables direct Twilio → ElevenLabs routing without custom webhooks
   */
  async importTwilioPhoneNumber(config: ElevenLabsPhoneNumberConfig): Promise<ElevenLabsPhoneNumberResponse> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      console.log(`📞 Importing Twilio phone number ${config.phone_number} into ElevenLabs platform`);
      
      const response = await axios.post(
        `${this.baseUrl}/convai/phone-numbers/twilio`,
        {
          label: config.label,
          phone_number: config.phone_number,
          twilio_sid: config.twilio_sid,
          twilio_auth_token: config.twilio_auth_token,
          agent_id: config.agent_id // Optional - can be assigned later
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Successfully imported phone number ${config.phone_number} to ElevenLabs`);
      console.log(`📞 Phone Number ID: ${response.data.phone_number_id}`);
      console.log(`🤖 Agent Assignment: ${response.data.agent_id || 'Not assigned'}`);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to import Twilio phone number to ElevenLabs:', error);
      
      if (error.response?.status === 400) {
        throw new Error(`Invalid phone number configuration: ${error.response.data?.detail || 'Unknown error'}`);
      } else if (error.response?.status === 401) {
        throw new Error('Invalid ElevenLabs API key');
      } else if (error.response?.status === 409) {
        throw new Error('Phone number already exists in ElevenLabs platform');
      }
      
      throw new Error(`ElevenLabs integration failed: ${error.message}`);
    }
  }

  /**
   * Assign an ElevenLabs agent to handle calls for a phone number
   */
  async assignAgentToPhoneNumber(phoneNumberId: string, agentId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      console.log(`🤖 Assigning agent ${agentId} to phone number ${phoneNumberId}`);
      
      await axios.patch(
        `${this.baseUrl}/convai/phone-numbers/${phoneNumberId}`,
        {
          agent_id: agentId
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Successfully assigned agent ${agentId} to phone number ${phoneNumberId}`);
    } catch (error: any) {
      console.error('❌ Failed to assign agent to phone number:', error);
      throw new Error(`Agent assignment failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get phone numbers configured in ElevenLabs
   */
  async getPhoneNumbers(): Promise<ElevenLabsPhoneNumberResponse[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/phone-numbers`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data.phone_numbers || [];
    } catch (error: any) {
      console.error('❌ Failed to fetch ElevenLabs phone numbers:', error);
      return [];
    }
  }

  /**
   * Remove a phone number from ElevenLabs platform
   */
  async removePhoneNumber(phoneNumberId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      console.log(`🗑️ Removing phone number ${phoneNumberId} from ElevenLabs platform`);
      
      await axios.delete(
        `${this.baseUrl}/convai/phone-numbers/${phoneNumberId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      console.log(`✅ Successfully removed phone number ${phoneNumberId} from ElevenLabs`);
    } catch (error: any) {
      console.error('❌ Failed to remove phone number from ElevenLabs:', error);
      throw new Error(`Phone number removal failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Migrate a restaurant's Twilio integration to ElevenLabs Conversational AI
   * This enables direct call routing without custom webhook processing
   */
  async migrateRestaurantToElevenLabs(restaurantId: string, userId: string): Promise<{ success: boolean; phoneNumberId?: string; error?: string }> {
    try {
      console.log(`🔄 Migrating restaurant ${restaurantId} to ElevenLabs telephony integration`);

      // Get restaurant data
      const restaurantData = await storage.getRestaurantDataById(restaurantId);
      if (!restaurantData) {
        throw new Error('Restaurant not found');
      }

      // Get user's phone number assignments
      const phoneNumbers = await storage.getUserPhoneNumbers(userId);
      if (phoneNumbers.length === 0) {
        throw new Error('No phone numbers found for user');
      }

      // Use the first active phone number
      const phoneNumber = phoneNumbers.find(pn => pn.status === 'active');
      if (!phoneNumber) {
        throw new Error('No active phone numbers found');
      }

      // Get user's voice agent
      const voiceAgents = await storage.getUserVoiceAgents(userId);
      if (voiceAgents.length === 0) {
        throw new Error('No voice agents found for user');
      }

      const voiceAgent = voiceAgents[0];
      if (!voiceAgent.elevenLabsAgentId) {
        throw new Error('Voice agent has no ElevenLabs agent ID - migrate agent first');
      }

      // Import phone number to ElevenLabs
      const elevenLabsConfig: ElevenLabsPhoneNumberConfig = {
        label: `${restaurantData.businessName || 'Restaurant'} - ${phoneNumber.phoneNumber}`,
        phone_number: phoneNumber.phoneNumber,
        twilio_sid: process.env.TWILIO_LIVE_SID || '',
        twilio_auth_token: process.env.TWILIO_LIVE_AUTH || '',
        agent_id: voiceAgent.elevenLabsAgentId
      };

      const elevenLabsPhone = await this.importTwilioPhoneNumber(elevenLabsConfig);

      // Update our database to track ElevenLabs integration
      await storage.updatePhoneNumberAssignment(phoneNumber.id, {
        elevenLabsPhoneNumberId: elevenLabsPhone.phone_number_id,
        elevenLabsEnabled: true
      });

      console.log(`✅ Successfully migrated restaurant ${restaurantId} to ElevenLabs telephony`);
      console.log(`📞 ElevenLabs Phone Number ID: ${elevenLabsPhone.phone_number_id}`);
      console.log(`🤖 Assigned Agent: ${elevenLabsPhone.agent_id}`);

      return {
        success: true,
        phoneNumberId: elevenLabsPhone.phone_number_id
      };
    } catch (error: any) {
      console.error(`❌ Failed to migrate restaurant ${restaurantId} to ElevenLabs:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a phone number is integrated with ElevenLabs
   */
  async isPhoneNumberIntegrated(phoneNumber: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const phoneNumbers = await this.getPhoneNumbers();
      return phoneNumbers.some(pn => pn.phone_number === phoneNumber);
    } catch (error) {
      console.error('Error checking phone number integration:', error);
      return false;
    }
  }

  /**
   * Generate webhook URL for ElevenLabs integration status updates
   */
  getWebhookUrl(): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `https://${process.env.REPL_SLUG}.${process.env.REPLIT_CLUSTER || 'replit'}.repl.co`;
    
    return `${baseUrl}/api/elevenlabs/webhooks/call-status`;
  }
}

export const elevenLabsTelephonyIntegration = new ElevenLabsTelephonyIntegration();