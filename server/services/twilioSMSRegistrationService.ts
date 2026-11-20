import twilio from 'twilio';

/**
 * Twilio A2P 10DLC SMS Registration Service
 * 
 * Handles the complete SMS registration workflow for US phone numbers:
 * 1. Create Business Profile (TrustHub Customer Profile)
 * 2. Create A2P Messaging Profile (TrustHub TrustProduct)
 * 3. Register Brand
 * 4. Create Messaging Service
 * 5. Create Campaign
 * 6. Add phone number to Messaging Service
 * 
 * Pricing (2025):
 * - Business Profile: Free
 * - Brand Registration: $4 (Low-Volume) or $45 (Standard)
 * - Campaign Registration: $15 one-time fee
 */

interface BusinessInfo {
  businessName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  businessType?: string; // 'direct_customer' | 'isv'
  vertical?: string; // Industry type
  ein?: string; // Tax ID (optional, for standard brands)
}

interface SMSRegistrationResult {
  success: boolean;
  businessProfileSid?: string;
  a2pProfileSid?: string;
  brandSid?: string;
  brandStatus?: string;
  campaignSid?: string;
  campaignStatus?: string;
  messagingServiceSid?: string;
  error?: string;
  details?: any;
}

export class TwilioSMSRegistrationService {
  private client: twilio.Twilio;
  private isTestMode: boolean;

  constructor() {
    const enableLiveProvisioning = process.env.ENABLE_LIVE_TWILIO_PROVISIONING === 'true';
    this.isTestMode = !enableLiveProvisioning;

    const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';

    if (!accountSid || !authToken) {
      throw new Error('Missing Twilio credentials for SMS registration');
    }

    this.client = twilio(accountSid, authToken);
    console.log(enableLiveProvisioning ? '🟢 SMS Registration: LIVE mode' : '🧪 SMS Registration: TEST mode');
  }

  /**
   * Complete SMS registration workflow for a phone number
   */
  async registerPhoneNumberForSMS(
    phoneNumber: string,
    businessInfo: BusinessInfo
  ): Promise<SMSRegistrationResult> {
    try {
      console.log(`📱 Starting SMS registration for ${phoneNumber}`);
      
      // Step 1: Create Business Profile (Customer Profile)
      console.log('📝 Step 1: Creating Business Profile...');
      const businessProfileSid = await this.createBusinessProfile(businessInfo);
      if (!businessProfileSid) {
        throw new Error('Failed to create business profile');
      }
      console.log(`✅ Business Profile created: ${businessProfileSid}`);

      // Step 2: Create A2P Messaging Profile (TrustProduct)
      console.log('📝 Step 2: Creating A2P Messaging Profile...');
      const a2pProfileSid = await this.createA2PMessagingProfile(businessProfileSid, businessInfo);
      if (!a2pProfileSid) {
        throw new Error('Failed to create A2P Messaging Profile');
      }
      console.log(`✅ A2P Messaging Profile created: ${a2pProfileSid}`);

      // Step 3: Register Brand (using Low-Volume for most ISV customers)
      console.log('📝 Step 3: Registering Brand...');
      const brandResult = await this.registerBrand(businessProfileSid, a2pProfileSid, this.isTestMode);
      if (!brandResult.sid) {
        throw new Error('Failed to register brand');
      }
      console.log(`✅ Brand registered: ${brandResult.sid}, Status: ${brandResult.status}`);

      // Step 4: Create Messaging Service
      console.log('📝 Step 4: Creating Messaging Service...');
      const messagingServiceSid = await this.createMessagingService(businessInfo.businessName);
      if (!messagingServiceSid) {
        throw new Error('Failed to create messaging service');
      }
      console.log(`✅ Messaging Service created: ${messagingServiceSid}`);

      // Step 5: Create Campaign
      console.log('📝 Step 5: Creating Campaign...');
      const campaignResult = await this.createCampaign(messagingServiceSid, brandResult.sid, businessInfo);
      if (!campaignResult.sid) {
        throw new Error('Failed to create campaign');
      }
      console.log(`✅ Campaign created: ${campaignResult.sid}, Status: ${campaignResult.status}`);

      // Step 6: Add phone number to Messaging Service
      console.log('📝 Step 6: Adding phone number to Messaging Service...');
      await this.addPhoneToMessagingService(messagingServiceSid, phoneNumber);
      console.log(`✅ Phone number ${phoneNumber} added to Messaging Service`);

      return {
        success: true,
        businessProfileSid,
        a2pProfileSid,
        brandSid: brandResult.sid,
        brandStatus: brandResult.status,
        campaignSid: campaignResult.sid,
        campaignStatus: campaignResult.status,
        messagingServiceSid,
      };
    } catch (error: any) {
      console.error('❌ SMS Registration failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during SMS registration',
        details: error,
      };
    }
  }

  /**
   * Step 1: Create Business Profile (TrustHub Customer Profile)
   */
  private async createBusinessProfile(businessInfo: BusinessInfo): Promise<string | null> {
    try {
      const customerProfile = await this.client.trusthub.v1.customerProfiles.create({
        friendlyName: `${businessInfo.businessName} - Business Profile`,
        email: businessInfo.email || 'contact@business.com',
        policySid: 'RNb0d4771c2c98518d770f3c8e1af89413', // Secondary Customer Profile policy
        statusCallback: '', // Optional webhook for status updates
      });

      // Add business information to the profile
      await this.client.trusthub.v1
        .customerProfiles(customerProfile.sid)
        .customerProfilesEntityAssignments.create({
          objectSid: await this.createEndUser(businessInfo),
        });

      // Submit for review
      await this.client.trusthub.v1
        .customerProfiles(customerProfile.sid)
        .update({ status: 'pending-review' });

      return customerProfile.sid;
    } catch (error: any) {
      console.error('Error creating business profile:', error);
      return null;
    }
  }

  /**
   * Helper: Create End User for Business Profile
   */
  private async createEndUser(businessInfo: BusinessInfo): Promise<string> {
    const endUser = await this.client.trusthub.v1.endUsers.create({
      friendlyName: businessInfo.businessName,
      type: 'business',
      attributes: {
        business_name: businessInfo.businessName,
        business_registration_number: businessInfo.ein || '',
        business_type: 'llc',
        business_industry: businessInfo.vertical || 'restaurant',
        business_regions_of_operation: businessInfo.state || 'US',
        website_url: businessInfo.website || '',
        business_registration_identifier: businessInfo.ein || '',
        social_media_profile_urls: [],
      },
    });

    return endUser.sid;
  }

  /**
   * Step 2: Create A2P Messaging Profile (TrustHub TrustProduct)
   */
  private async createA2PMessagingProfile(
    customerProfileSid: string,
    businessInfo: BusinessInfo
  ): Promise<string | null> {
    try {
      const trustProduct = await this.client.trusthub.v1.trustProducts.create({
        friendlyName: `${businessInfo.businessName} - A2P Messaging`,
        email: businessInfo.email || 'contact@business.com',
        policySid: 'RN43659b6bf60934dd2be498e50e6fe611', // A2P Messaging Profile policy
      });

      // Link to customer profile
      await this.client.trusthub.v1
        .trustProducts(trustProduct.sid)
        .trustProductsEntityAssignments.create({
          objectSid: customerProfileSid,
        });

      // Submit for review
      await this.client.trusthub.v1
        .trustProducts(trustProduct.sid)
        .update({ status: 'pending-review' });

      return trustProduct.sid;
    } catch (error: any) {
      console.error('Error creating A2P messaging profile:', error);
      return null;
    }
  }

  /**
   * Step 3: Register Brand
   */
  private async registerBrand(
    customerProfileSid: string,
    a2pProfileSid: string,
    useMock: boolean = false
  ): Promise<{ sid: string; status: string }> {
    try {
      const brandRegistration = await this.client.messaging.v1.brandRegistrations.create({
        customerProfileBundleSid: customerProfileSid,
        a2pProfileBundleSid: a2pProfileSid,
        skipAutomaticSecVet: true, // Use Low-Volume brand (cheaper: $4 vs $45)
        mock: useMock, // Use mock for testing (no fees)
      });

      return {
        sid: brandRegistration.sid,
        status: brandRegistration.brandRegistrationStatus || 'pending',
      };
    } catch (error: any) {
      console.error('Error registering brand:', error);
      throw error;
    }
  }

  /**
   * Step 4: Create Messaging Service
   */
  private async createMessagingService(businessName: string): Promise<string | null> {
    try {
      const messagingService = await this.client.messaging.v1.services.create({
        friendlyName: `${businessName} - AI Receptionist SMS`,
        usecase: 'notifications', // or 'marketing', '2fa', etc.
      });

      return messagingService.sid;
    } catch (error: any) {
      console.error('Error creating messaging service:', error);
      return null;
    }
  }

  /**
   * Step 5: Create Campaign
   */
  private async createCampaign(
    messagingServiceSid: string,
    brandSid: string,
    businessInfo: BusinessInfo
  ): Promise<{ sid: string; status: string }> {
    try {
      const campaign = await this.client.messaging.v1
        .services(messagingServiceSid)
        .usAppToPerson.create({
          brandRegistrationSid: brandSid,
          description: `AI Receptionist for ${businessInfo.businessName} - Automated customer service, order confirmations, reservation reminders, and business notifications.`,
          messageFlow: 'Customers receive SMS confirmations after placing orders or making reservations via phone.',
          usAppToPersonUsecase: 'MIXED', // Mixed use case for general business communications
          hasEmbeddedLinks: false,
          hasEmbeddedPhone: false,
          subscriberOptIn: true,
          ageGated: false,
          directLending: false,
          // Required opt-in/out messages
          optInMessage: `Reply YES to receive notifications from ${businessInfo.businessName}. Msg&data rates may apply.`,
          optOutMessage: `You have been unsubscribed from ${businessInfo.businessName} notifications. Reply YES to resubscribe.`,
          helpMessage: `${businessInfo.businessName} AI Receptionist: Order & reservation confirmations. Help: ${businessInfo.phoneNumber || 'contact us'}. STOP to opt-out.`,
          // Optional: Campaign attributes for better approval
          sampleMessages: [
            `Hello! Your order at ${businessInfo.businessName} has been confirmed for pickup. Thank you!`,
            `Reminder: Your reservation at ${businessInfo.businessName} is confirmed for tomorrow at 7:00 PM.`,
            `Your delivery from ${businessInfo.businessName} is on the way! Estimated arrival: 30 minutes.`,
          ],
        });

      return {
        sid: campaign.sid,
        status: campaign.complianceStatus || 'pending',
      };
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Step 6: Add phone number to Messaging Service
   */
  private async addPhoneToMessagingService(
    messagingServiceSid: string,
    phoneNumber: string
  ): Promise<void> {
    try {
      await this.client.messaging.v1
        .services(messagingServiceSid)
        .phoneNumbers.create({
          phoneNumberSid: phoneNumber, // Can also use phone number SID
        });
    } catch (error: any) {
      console.error('Error adding phone to messaging service:', error);
      throw error;
    }
  }

  /**
   * Check SMS registration status for a brand or campaign
   */
  async checkRegistrationStatus(brandSid?: string, campaignSid?: string): Promise<any> {
    try {
      const status: any = {};

      if (brandSid) {
        const brand = await this.client.messaging.v1.brandRegistrations(brandSid).fetch();
        status.brand = {
          sid: brand.sid,
          status: brand.brandRegistrationStatus,
          identityStatus: brand.identityStatus,
        };
      }

      if (campaignSid) {
        // Campaign status check would require messaging service SID
        // This is a simplified version
        status.campaign = {
          sid: campaignSid,
          note: 'Campaign status check requires messaging service SID',
        };
      }

      return status;
    } catch (error: any) {
      console.error('Error checking registration status:', error);
      return { error: error.message };
    }
  }

  /**
   * Helper: Get available use cases for a brand
   */
  async getAvailableUseCases(brandSid: string): Promise<string[]> {
    try {
      const useCases = await this.client.messaging.v1
        .brandRegistrations(brandSid)
        .brandUseCases.list();

      return useCases.map((uc: any) => uc.useCaseType);
    } catch (error: any) {
      console.error('Error fetching use cases:', error);
      return [];
    }
  }
}

// Export singleton instance
export const twilioSMSRegistrationService = new TwilioSMSRegistrationService();
