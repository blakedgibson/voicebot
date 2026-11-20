import axios, { AxiosInstance } from 'axios';

/**
 * Twilio ISV Service
 * 
 * Implements Independent Software Vendor (ISV) functionality for automated A2P 10DLC registration.
 * This service manages the complete workflow for registering clients for A2P (Application-to-Person)
 * 10DLC (10-Digit Long Code) messaging, which is required by US carriers for business SMS.
 * 
 * ISV Workflow Overview:
 * 1. Create a subaccount for each client
 * 2. Create a business profile with client's business information
 * 3. Register the business as an A2P brand with Twilio/TCR (The Campaign Registry)
 * 4. Create a messaging service to manage SMS
 * 5. Create a 10DLC campaign (use case for messaging)
 * 6. Associate phone numbers with the messaging service
 * 
 * Environment Variables:
 * - TWILIO_ISV_ACCOUNT_SID: ISV parent account SID (enables ISV mode)
 * - TWILIO_ISV_AUTH_TOKEN: ISV parent account auth token
 * - TWILIO_ACCOUNT_SID: Fallback to regular account if ISV not configured
 * - TWILIO_AUTH_TOKEN: Fallback auth token
 */

// TypeScript Interfaces

export interface ClientData {
  friendlyName: string;
  email?: string;
  ownerAccountSid?: string;
}

export interface SubaccountResponse {
  sid: string;
  friendlyName: string;
  status: string;
  dateCreated: string;
  authToken: string;
}

export interface BusinessProfileData {
  friendlyName: string;
  email: string;
  businessName: string;
  businessType: 'soleProprietorship' | 'partnership' | 'llc' | 'corporation' | 'cooperative' | 'nonprofit';
  businessRegistrationNumber?: string;
  businessIdentifier?: string;
  businessIndustry: string;
  website?: string;
  businessRegion?: string;
  businessStreetAddress: string;
  businessCity: string;
  businessStateProvinceRegion: string;
  businessPostalCode: string;
  businessCountry: string;
}

export interface BusinessProfileResponse {
  sid: string;
  accountSid: string;
  friendlyName: string;
  email: string;
  status: string;
  dateCreated: string;
}

export interface BrandRegistrationData {
  customerProfileSid: string;
  a2pProfileSid: string;
  brandType?: 'standard' | 'starter';
  mock?: boolean;
  skipAutomaticSecVet?: boolean;
}

export interface BrandRegistrationResponse {
  sid: string;
  accountSid: string;
  customerProfileBundleSid: string;
  a2pProfileBundleSid: string;
  status: string;
  brandType: string;
  identityStatus: string;
  dateCreated: string;
}

export interface MessagingServiceData {
  friendlyName: string;
  useCase?: string;
  statusCallback?: string;
}

export interface MessagingServiceResponse {
  sid: string;
  accountSid: string;
  friendlyName: string;
  dateCreated: string;
}

export interface CampaignData {
  brandSid: string;
  messagingServiceSid: string;
  useCaseCategories: string[];
  description: string;
  messageFlow?: string;
  optInMessage?: string;
  optOutMessage?: string;
  helpMessage?: string;
  optInKeywords?: string[];
  optOutKeywords?: string[];
  helpKeywords?: string[];
  messageVolume?: string;
  mock?: boolean;
}

export interface CampaignResponse {
  sid: string;
  accountSid: string;
  brandSid: string;
  messagingServiceSid: string;
  status: string;
  useCaseCategories: string[];
  dateCreated: string;
}

export interface PhoneNumberAssociationResponse {
  accountSid: string;
  phoneNumberSid: string;
  messagingServiceSid: string;
  dateCreated: string;
}

export interface SubaccountStatusResponse {
  subaccountSid: string;
  subaccountStatus: string;
  businessProfile?: {
    sid: string;
    status: string;
  };
  brand?: {
    sid: string;
    status: string;
    identityStatus: string;
  };
  messagingService?: {
    sid: string;
  };
  campaign?: {
    sid: string;
    status: string;
  };
  phoneNumbers?: Array<{
    sid: string;
    phoneNumber: string;
  }>;
}

class TwilioISVService {
  private axiosClient: AxiosInstance;
  private isvAccountSid: string;
  private isvAuthToken: string;
  private isISVEnabled: boolean;

  constructor() {
    // Check if ISV mode is enabled via environment variable
    this.isvAccountSid = process.env.TWILIO_ISV_ACCOUNT_SID || '';
    this.isvAuthToken = process.env.TWILIO_ISV_AUTH_TOKEN || '';
    
    // ISV mode is enabled if ISV credentials are provided
    this.isISVEnabled = !!(this.isvAccountSid && this.isvAuthToken);

    if (this.isISVEnabled) {
      console.log('🏢 Twilio ISV Service initialized in ISV MODE with parent account:', this.isvAccountSid);
    } else {
      console.log('⚠️ Twilio ISV Service initialized in FALLBACK MODE (ISV credentials not configured)');
      // Fallback to regular Twilio credentials
      this.isvAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
      this.isvAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
    }

    // Initialize axios client with Twilio API base URL and authentication
    this.axiosClient = axios.create({
      baseURL: 'https://api.twilio.com/2010-04-01',
      auth: {
        username: this.isvAccountSid,
        password: this.isvAuthToken
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  /**
   * Check if ISV mode is enabled
   */
  isEnabled(): boolean {
    return this.isISVEnabled;
  }

  /**
   * Create a subaccount for a client
   * 
   * In ISV mode, each client gets their own Twilio subaccount under the parent ISV account.
   * This isolates billing, usage, and configuration per client.
   * 
   * @param clientData - Client information for subaccount creation
   * @returns Subaccount details including SID and auth token
   */
  async createClientSubaccount(clientData: ClientData): Promise<SubaccountResponse> {
    if (!this.isvAccountSid || !this.isvAuthToken) {
      throw new Error('Twilio credentials not configured — cannot create subaccount. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }

    try {
      const mode = this.isISVEnabled ? 'ISV mode' : 'standard account';
      console.log(`🔧 Creating Twilio subaccount (${mode}): ${clientData.friendlyName}`);

      const params = new URLSearchParams();
      params.append('FriendlyName', clientData.friendlyName);
      
      if (clientData.email) {
        params.append('Email', clientData.email);
      }

      const response = await this.axiosClient.post(
        `/Accounts.json`,
        params
      );

      const subaccount = response.data;

      console.log('✅ Subaccount created successfully:', subaccount.sid);

      return {
        sid: subaccount.sid,
        friendlyName: subaccount.friendly_name,
        status: subaccount.status,
        dateCreated: subaccount.date_created,
        authToken: subaccount.auth_token
      };
    } catch (error: any) {
      console.error('❌ Error creating client subaccount:', error.response?.data || error.message);
      throw new Error(`Failed to create client subaccount: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a business profile (Customer Profile) for A2P registration
   * 
   * The business profile contains all the business information required for A2P brand registration.
   * This is the first step in the A2P 10DLC compliance process.
   * 
   * @param subaccountSid - The subaccount SID to create the profile under
   * @param businessData - Complete business information
   * @returns Business profile details
   */
  async createBusinessProfile(
    subaccountSid: string,
    businessData: BusinessProfileData
  ): Promise<BusinessProfileResponse> {
    if (!this.isISVEnabled) {
      console.warn('⚠️ ISV mode not enabled - createBusinessProfile will return mock data');
      return {
        sid: `BU${Date.now()}mock`,
        accountSid: subaccountSid,
        friendlyName: businessData.friendlyName,
        email: businessData.email,
        status: 'in-review',
        dateCreated: new Date().toISOString()
      };
    }

    try {
      console.log('📋 Creating business profile for subaccount:', subaccountSid);

      // Create axios client for subaccount
      const subaccountClient = axios.create({
        baseURL: 'https://trusthub.twilio.com/v1',
        auth: {
          username: this.isvAccountSid,
          password: this.isvAuthToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Step 1: Create Customer Profile Bundle
      const customerProfileParams = new URLSearchParams();
      customerProfileParams.append('FriendlyName', businessData.friendlyName);
      customerProfileParams.append('Email', businessData.email);
      customerProfileParams.append('PolicySid', 'RNdfbf3fae0e1107f8aded0e7cead80bf5'); // Customer Profile policy
      customerProfileParams.append('StatusCallback', ''); // Optional webhook

      const customerProfileResponse = await subaccountClient.post(
        `/CustomerProfiles`,
        customerProfileParams
      );

      const customerProfile = customerProfileResponse.data;
      console.log('✅ Customer profile created:', customerProfile.sid);

      // Step 2: Create End User (Business Information)
      const endUserParams = new URLSearchParams();
      endUserParams.append('FriendlyName', businessData.businessName);
      endUserParams.append('Type', 'customer_profile_business_information');
      endUserParams.append('Attributes', JSON.stringify({
        business_name: businessData.businessName,
        business_type: businessData.businessType,
        business_registration_number: businessData.businessRegistrationNumber || '',
        business_identity: businessData.businessIdentifier || businessData.businessRegistrationNumber || '',
        business_industry: businessData.businessIndustry,
        website_url: businessData.website || '',
        business_regions_of_operation: businessData.businessRegion || 'USA',
        social_media_profile_urls: []
      }));

      const endUserResponse = await subaccountClient.post(
        `/EndUsers`,
        endUserParams
      );

      const endUser = endUserResponse.data;
      console.log('✅ End user created:', endUser.sid);

      // Step 3: Create Address (Business Address)
      const addressParams = new URLSearchParams();
      addressParams.append('FriendlyName', `${businessData.businessName} Address`);
      addressParams.append('CustomerName', businessData.businessName);
      addressParams.append('Street', businessData.businessStreetAddress);
      addressParams.append('City', businessData.businessCity);
      addressParams.append('Region', businessData.businessStateProvinceRegion);
      addressParams.append('PostalCode', businessData.businessPostalCode);
      addressParams.append('IsoCountry', businessData.businessCountry);

      const addressResponse = await subaccountClient.post(
        `/Addresses`,
        addressParams
      );

      const address = addressResponse.data;
      console.log('✅ Address created:', address.sid);

      // Step 4: Assign End User to Customer Profile
      const assignEndUserParams = new URLSearchParams();
      assignEndUserParams.append('ObjectSid', endUser.sid);

      await subaccountClient.post(
        `/CustomerProfiles/${customerProfile.sid}/CustomerProfilesEntityAssignments`,
        assignEndUserParams
      );

      console.log('✅ End user assigned to customer profile');

      // Step 5: Assign Address to Customer Profile
      const assignAddressParams = new URLSearchParams();
      assignAddressParams.append('ObjectSid', address.sid);

      await subaccountClient.post(
        `/CustomerProfiles/${customerProfile.sid}/CustomerProfilesEntityAssignments`,
        assignAddressParams
      );

      console.log('✅ Address assigned to customer profile');

      // Step 6: Submit Customer Profile for review
      const submitParams = new URLSearchParams();
      submitParams.append('Status', 'pending-review');

      await subaccountClient.post(
        `/CustomerProfiles/${customerProfile.sid}`,
        submitParams
      );

      console.log('✅ Customer profile submitted for review');

      return {
        sid: customerProfile.sid,
        accountSid: subaccountSid,
        friendlyName: customerProfile.friendly_name,
        email: customerProfile.email,
        status: 'pending-review',
        dateCreated: customerProfile.date_created
      };
    } catch (error: any) {
      console.error('❌ Error creating business profile:', error.response?.data || error.message);
      throw new Error(`Failed to create business profile: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Register an A2P brand with Twilio/TCR (The Campaign Registry)
   * 
   * After business profile is approved, register the brand for A2P messaging.
   * This links the business identity to messaging capabilities.
   * 
   * @param subaccountSid - The subaccount SID
   * @param brandData - Brand registration data including profile SIDs
   * @returns Brand registration details
   */
  async registerA2PBrand(
    subaccountSid: string,
    brandData: BrandRegistrationData
  ): Promise<BrandRegistrationResponse> {
    if (!this.isISVEnabled) {
      console.warn('⚠️ ISV mode not enabled - registerA2PBrand will return mock data');
      return {
        sid: `BN${Date.now()}mock`,
        accountSid: subaccountSid,
        customerProfileBundleSid: brandData.customerProfileSid,
        a2pProfileBundleSid: brandData.a2pProfileSid,
        status: 'pending',
        brandType: brandData.brandType || 'standard',
        identityStatus: 'unverified',
        dateCreated: new Date().toISOString()
      };
    }

    try {
      console.log('🏷️ Registering A2P brand for subaccount:', subaccountSid);

      const messagingClient = axios.create({
        baseURL: 'https://messaging.twilio.com/v1',
        auth: {
          username: this.isvAccountSid,
          password: this.isvAuthToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const params = new URLSearchParams();
      params.append('CustomerProfileBundleSid', brandData.customerProfileSid);
      params.append('A2PProfileBundleSid', brandData.a2pProfileSid);
      
      if (brandData.brandType) {
        params.append('BrandType', brandData.brandType);
      }

      if (brandData.mock) {
        params.append('Mock', 'true');
      }

      if (brandData.skipAutomaticSecVet) {
        params.append('SkipAutomaticSecVet', 'true');
      }

      const response = await messagingClient.post(
        `/a2p/BrandRegistrations`,
        params
      );

      const brand = response.data;

      console.log('✅ A2P brand registered successfully:', brand.sid);

      return {
        sid: brand.sid,
        accountSid: subaccountSid,
        customerProfileBundleSid: brand.customer_profile_bundle_sid,
        a2pProfileBundleSid: brand.a2p_profile_bundle_sid,
        status: brand.status,
        brandType: brand.brand_type,
        identityStatus: brand.identity_status,
        dateCreated: brand.date_created
      };
    } catch (error: any) {
      console.error('❌ Error registering A2P brand:', error.response?.data || error.message);
      throw new Error(`Failed to register A2P brand: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a messaging service for managing SMS
   * 
   * Messaging services provide a single interface for sending messages,
   * handle sender pool management, and enable features like sticky sender.
   * 
   * @param subaccountSid - The subaccount SID
   * @param serviceData - Messaging service configuration
   * @returns Messaging service details
   */
  async createMessagingService(
    subaccountSid: string,
    serviceData: MessagingServiceData
  ): Promise<MessagingServiceResponse> {
    if (!this.isISVEnabled) {
      console.warn('⚠️ ISV mode not enabled - createMessagingService will return mock data');
      return {
        sid: `MG${Date.now()}mock`,
        accountSid: subaccountSid,
        friendlyName: serviceData.friendlyName,
        dateCreated: new Date().toISOString()
      };
    }

    try {
      console.log('💬 Creating messaging service for subaccount:', subaccountSid);

      const messagingClient = axios.create({
        baseURL: 'https://messaging.twilio.com/v1',
        auth: {
          username: this.isvAccountSid,
          password: this.isvAuthToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const params = new URLSearchParams();
      params.append('FriendlyName', serviceData.friendlyName);
      
      if (serviceData.useCase) {
        params.append('UseCase', serviceData.useCase);
      }

      if (serviceData.statusCallback) {
        params.append('StatusCallback', serviceData.statusCallback);
      }

      const response = await messagingClient.post(
        `/Services`,
        params
      );

      const service = response.data;

      console.log('✅ Messaging service created successfully:', service.sid);

      return {
        sid: service.sid,
        accountSid: subaccountSid,
        friendlyName: service.friendly_name,
        dateCreated: service.date_created
      };
    } catch (error: any) {
      console.error('❌ Error creating messaging service:', error.response?.data || error.message);
      throw new Error(`Failed to create messaging service: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a 10DLC campaign for specific messaging use case
   * 
   * Campaigns define the specific use case and message content for A2P messaging.
   * Each campaign is linked to a brand and messaging service.
   * 
   * Common use case categories:
   * - CUSTOMER_CARE
   * - MARKETING
   * - MIXED
   * - 2FA (Two-Factor Authentication)
   * - ACCOUNT_NOTIFICATION
   * - DELIVERY_NOTIFICATION
   * - FRAUD_ALERT
   * - HIGHER_EDUCATION
   * - POLLING_AND_VOTING
   * - PUBLIC_SERVICE_ANNOUNCEMENT
   * 
   * @param subaccountSid - The subaccount SID
   * @param campaignData - Campaign configuration including use case and message samples
   * @returns Campaign details
   */
  async createCampaign(
    subaccountSid: string,
    campaignData: CampaignData
  ): Promise<CampaignResponse> {
    if (!this.isISVEnabled) {
      console.warn('⚠️ ISV mode not enabled - createCampaign will return mock data');
      return {
        sid: `CX${Date.now()}mock`,
        accountSid: subaccountSid,
        brandSid: campaignData.brandSid,
        messagingServiceSid: campaignData.messagingServiceSid,
        status: 'pending',
        useCaseCategories: campaignData.useCaseCategories,
        dateCreated: new Date().toISOString()
      };
    }

    try {
      console.log('📢 Creating 10DLC campaign for subaccount:', subaccountSid);

      const messagingClient = axios.create({
        baseURL: 'https://messaging.twilio.com/v1',
        auth: {
          username: this.isvAccountSid,
          password: this.isvAuthToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const params = new URLSearchParams();
      params.append('BrandSid', campaignData.brandSid);
      params.append('MessagingServiceSid', campaignData.messagingServiceSid);
      params.append('Description', campaignData.description);
      
      // Add use case categories
      campaignData.useCaseCategories.forEach(category => {
        params.append('UseCaseCategories', category);
      });

      // Optional fields for campaign details
      if (campaignData.messageFlow) {
        params.append('MessageFlow', campaignData.messageFlow);
      }

      if (campaignData.optInMessage) {
        params.append('OptInMessage', campaignData.optInMessage);
      }

      if (campaignData.optOutMessage) {
        params.append('OptOutMessage', campaignData.optOutMessage);
      }

      if (campaignData.helpMessage) {
        params.append('HelpMessage', campaignData.helpMessage);
      }

      if (campaignData.optInKeywords && campaignData.optInKeywords.length > 0) {
        campaignData.optInKeywords.forEach(keyword => {
          params.append('OptInKeywords', keyword);
        });
      }

      if (campaignData.optOutKeywords && campaignData.optOutKeywords.length > 0) {
        campaignData.optOutKeywords.forEach(keyword => {
          params.append('OptOutKeywords', keyword);
        });
      }

      if (campaignData.helpKeywords && campaignData.helpKeywords.length > 0) {
        campaignData.helpKeywords.forEach(keyword => {
          params.append('HelpKeywords', keyword);
        });
      }

      if (campaignData.messageVolume) {
        params.append('MessageVolume', campaignData.messageVolume);
      }

      if (campaignData.mock) {
        params.append('Mock', 'true');
      }

      const response = await messagingClient.post(
        `/a2p/Campaigns`,
        params
      );

      const campaign = response.data;

      console.log('✅ 10DLC campaign created successfully:', campaign.sid);

      return {
        sid: campaign.sid,
        accountSid: subaccountSid,
        brandSid: campaign.brand_sid,
        messagingServiceSid: campaign.messaging_service_sid,
        status: campaign.status,
        useCaseCategories: campaign.use_case_categories,
        dateCreated: campaign.date_created
      };
    } catch (error: any) {
      console.error('❌ Error creating 10DLC campaign:', error.response?.data || error.message);
      throw new Error(`Failed to create 10DLC campaign: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Associate a phone number with a messaging service
   * 
   * Links a purchased phone number to the messaging service, enabling it to send
   * A2P messages through the registered campaign.
   * 
   * @param subaccountSid - The subaccount SID
   * @param phoneNumberSid - The phone number SID to associate
   * @param messagingServiceSid - The messaging service SID
   * @returns Association details
   */
  async associatePhoneNumber(
    subaccountSid: string,
    phoneNumberSid: string,
    messagingServiceSid: string
  ): Promise<PhoneNumberAssociationResponse> {
    if (!this.isISVEnabled) {
      console.warn('⚠️ ISV mode not enabled - associatePhoneNumber will return mock data');
      return {
        accountSid: subaccountSid,
        phoneNumberSid: phoneNumberSid,
        messagingServiceSid: messagingServiceSid,
        dateCreated: new Date().toISOString()
      };
    }

    try {
      console.log('📞 Associating phone number with messaging service...');
      console.log(`   Phone: ${phoneNumberSid}, Service: ${messagingServiceSid}`);

      const messagingClient = axios.create({
        baseURL: 'https://messaging.twilio.com/v1',
        auth: {
          username: this.isvAccountSid,
          password: this.isvAuthToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const params = new URLSearchParams();
      params.append('PhoneNumberSid', phoneNumberSid);

      const response = await messagingClient.post(
        `/Services/${messagingServiceSid}/PhoneNumbers`,
        params
      );

      const association = response.data;

      console.log('✅ Phone number associated successfully');

      return {
        accountSid: association.account_sid,
        phoneNumberSid: association.sid,
        messagingServiceSid: messagingServiceSid,
        dateCreated: association.date_created
      };
    } catch (error: any) {
      console.error('❌ Error associating phone number:', error.response?.data || error.message);
      throw new Error(`Failed to associate phone number: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get comprehensive status of a subaccount and its A2P registration
   * 
   * Retrieves the complete status of:
   * - Subaccount
   * - Business profile
   * - Brand registration
   * - Messaging service
   * - Campaign
   * - Associated phone numbers
   * 
   * @param subaccountSid - The subaccount SID to check
   * @returns Complete status information
   */
  async getSubaccountStatus(subaccountSid: string): Promise<SubaccountStatusResponse> {
    if (!this.isISVEnabled) {
      console.warn('⚠️ ISV mode not enabled - getSubaccountStatus will return mock data');
      return {
        subaccountSid: subaccountSid,
        subaccountStatus: 'active',
        businessProfile: {
          sid: 'BUmock',
          status: 'in-review'
        },
        brand: {
          sid: 'BNmock',
          status: 'pending',
          identityStatus: 'unverified'
        },
        messagingService: {
          sid: 'MGmock'
        },
        campaign: {
          sid: 'CXmock',
          status: 'pending'
        },
        phoneNumbers: []
      };
    }

    try {
      console.log('🔍 Fetching subaccount status:', subaccountSid);

      const status: SubaccountStatusResponse = {
        subaccountSid: subaccountSid,
        subaccountStatus: 'unknown'
      };

      // Fetch subaccount details
      try {
        const accountResponse = await this.axiosClient.get(
          `/Accounts/${subaccountSid}.json`
        );
        status.subaccountStatus = accountResponse.data.status;
        console.log('✅ Subaccount status:', status.subaccountStatus);
      } catch (error) {
        console.warn('⚠️ Could not fetch subaccount details');
      }

      // Fetch business profiles (TrustHub)
      try {
        const trustHubClient = axios.create({
          baseURL: 'https://trusthub.twilio.com/v1',
          auth: {
            username: this.isvAccountSid,
            password: this.isvAuthToken
          }
        });

        const profilesResponse = await trustHubClient.get(`/CustomerProfiles`);
        if (profilesResponse.data.customer_profiles && profilesResponse.data.customer_profiles.length > 0) {
          const profile = profilesResponse.data.customer_profiles[0];
          status.businessProfile = {
            sid: profile.sid,
            status: profile.status
          };
          console.log('✅ Business profile found:', profile.sid);
        }
      } catch (error) {
        console.warn('⚠️ No business profiles found');
      }

      // Fetch brand registrations
      try {
        const messagingClient = axios.create({
          baseURL: 'https://messaging.twilio.com/v1',
          auth: {
            username: this.isvAccountSid,
            password: this.isvAuthToken
          }
        });

        const brandsResponse = await messagingClient.get(`/a2p/BrandRegistrations`);
        if (brandsResponse.data.brand_registrations && brandsResponse.data.brand_registrations.length > 0) {
          const brand = brandsResponse.data.brand_registrations[0];
          status.brand = {
            sid: brand.sid,
            status: brand.status,
            identityStatus: brand.identity_status
          };
          console.log('✅ Brand registration found:', brand.sid);
        }
      } catch (error) {
        console.warn('⚠️ No brand registrations found');
      }

      // Fetch messaging services
      try {
        const messagingClient = axios.create({
          baseURL: 'https://messaging.twilio.com/v1',
          auth: {
            username: this.isvAccountSid,
            password: this.isvAuthToken
          }
        });

        const servicesResponse = await messagingClient.get(`/Services`);
        if (servicesResponse.data.services && servicesResponse.data.services.length > 0) {
          const service = servicesResponse.data.services[0];
          status.messagingService = {
            sid: service.sid
          };
          console.log('✅ Messaging service found:', service.sid);
        }
      } catch (error) {
        console.warn('⚠️ No messaging services found');
      }

      // Fetch campaigns
      try {
        const messagingClient = axios.create({
          baseURL: 'https://messaging.twilio.com/v1',
          auth: {
            username: this.isvAccountSid,
            password: this.isvAuthToken
          }
        });

        const campaignsResponse = await messagingClient.get(`/a2p/Campaigns`);
        if (campaignsResponse.data.campaigns && campaignsResponse.data.campaigns.length > 0) {
          const campaign = campaignsResponse.data.campaigns[0];
          status.campaign = {
            sid: campaign.sid,
            status: campaign.status
          };
          console.log('✅ Campaign found:', campaign.sid);
        }
      } catch (error) {
        console.warn('⚠️ No campaigns found');
      }

      // Fetch phone numbers
      try {
        const numbersResponse = await this.axiosClient.get(
          `/Accounts/${subaccountSid}/IncomingPhoneNumbers.json`
        );
        if (numbersResponse.data.incoming_phone_numbers) {
          status.phoneNumbers = numbersResponse.data.incoming_phone_numbers.map((num: any) => ({
            sid: num.sid,
            phoneNumber: num.phone_number
          }));
          console.log(`✅ Found ${status.phoneNumbers.length} phone numbers`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch phone numbers');
      }

      console.log('✅ Subaccount status check complete');
      return status;
    } catch (error: any) {
      console.error('❌ Error fetching subaccount status:', error.response?.data || error.message);
      throw new Error(`Failed to fetch subaccount status: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Export singleton instance
export const twilioISVService = new TwilioISVService();
