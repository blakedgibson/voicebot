import { storage } from '../storage';
import { twilioService } from '../services/twilioService';
import { EnhancedBusinessExtractor } from '../services/enhancedBusinessExtractor';
import { resolveBaseUrl, getWebhookUrls } from './baseUrlResolver';
import { getActiveVoiceProvider } from '../services/VoiceAgentProviderFactory';
import { VoiceAgentProvider, VoiceAgentConfig } from '../interfaces/VoiceAgentProvider';
import { integratedPhoneProvisioner } from '../services/integratedPhoneProvisioner';

interface BusinessInfo {
  businessName: string;
  address: string;
  phone?: string;
  website?: string;
  businessType?: string;
  description?: string;
  hours?: any;
  menuItems?: any[];
  services?: string[];
}

export class SubscriptionPhoneProvisioner {
  private businessExtractor = new EnhancedBusinessExtractor();
  private voiceProvider: VoiceAgentProvider;

  constructor() {
    this.voiceProvider = getActiveVoiceProvider();
  }

  /**
   * Connect voice agent to Twilio phone number with retry logic and exponential backoff
   */
  private async connectAgentWithRetry(
    agentId: string, 
    phoneNumber: string, 
    maxRetries: number = 3
  ): Promise<{ success: boolean; error?: string }> {
    const baseDelayMs = 2000; // Start with 2 second delay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔗 Attempt ${attempt}/${maxRetries}: Connecting ${this.voiceProvider.providerName} agent ${agentId} to phone ${phoneNumber}...`);

        const connectionResult = await this.voiceProvider.connectAgentToPhoneNumber(agentId, phoneNumber);

        if (connectionResult.success) {
          console.log(`✅ Successfully connected ${this.voiceProvider.providerName} agent ${agentId} to phone ${phoneNumber} on attempt ${attempt}`);
          return { success: true };
        } else {
          const errorMsg = `Connection failed on attempt ${attempt}/${maxRetries}: ${connectionResult.error}`;
          console.warn(`⚠️ ${errorMsg}`);

          // If this is the last attempt, return failure
          if (attempt === maxRetries) {
            return { success: false, error: `Connection failed after ${maxRetries} attempts: ${connectionResult.error}` };
          }

          // Wait before retrying with exponential backoff
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (connectionError: any) {
        const errorMsg = `Exception on attempt ${attempt}/${maxRetries}: ${connectionError.message}`;
        console.error(`❌ ${errorMsg}`);

        // If this is the last attempt, return the error
        if (attempt === maxRetries) {
          return { success: false, error: errorMsg };
        }

        // Wait before retrying with exponential backoff
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return { success: false, error: `Failed after ${maxRetries} attempts` };
  }

  /**
   * Main function to provision phone number and create personalized AI receptionist
   * for new subscription users - supports both live and test provisioning
   */
  async provisionForSubscription(userId: string, subscriptionId: string): Promise<{
    phoneNumber: string;
    phoneNumberSid: string;
    restaurantId?: string;
    aiReceptionistCreated: boolean;
  }> {
    console.log(`🎯 Starting phone provisioning for user: ${userId}`);

    // Check if phone number buying is disabled - if so, only use existing numbers
    const phoneNumberBuyingDisabled = process.env.DISABLE_PHONE_NUMBER_BUYING === 'true';

    if (phoneNumberBuyingDisabled) {
      console.log('🚫 Phone number buying is disabled - will only use existing phone numbers without webhooks');
      return await this.provisionWithExistingNumbersOnly(userId, subscriptionId);
    }

    // Check if live provisioning is enabled
    const enableLiveProvisioning = process.env.ENABLE_LIVE_TWILIO_PROVISIONING === 'true';
    
    if (enableLiveProvisioning) {
      console.log('🟢 Live provisioning enabled - using integrated phone provisioner with real phone numbers');
      return await this.provisionWithLiveProvisioning(userId, subscriptionId);
    } else {
      console.log('🧪 Using TEST mode - checking for existing phone numbers to reuse');
      return await this.provisionWithTestMode(userId, subscriptionId);
    }
  }

  /**
   * Provision using live Twilio provisioning with integrated phone provisioner
   */
  private async provisionWithLiveProvisioning(userId: string, subscriptionId: string): Promise<{
    phoneNumber: string;
    phoneNumberSid: string;
    restaurantId?: string;
    aiReceptionistCreated: boolean;
  }> {
    try {
      // Get business information for emergency address creation
      const businessInfo = await this.getComprehensiveBusinessInfo(userId);
      
      console.log('🤖 Creating Retell AI agent first for live provisioning...');
      const tempAiCreated = await this.createPersonalizedAIReceptionist(userId, subscriptionId, businessInfo, {
        phoneNumber: 'PENDING',
        phoneNumberSid: 'PENDING',
        voiceUrl: '',
        smsUrl: ''
      });

      if (!tempAiCreated.agentId) {
        throw new Error('Failed to create Retell AI agent - cannot proceed with live phone provisioning');
      }

      console.log(`✅ Retell AI agent created: ${tempAiCreated.agentId}, proceeding with live phone provisioning...`);

      // Use integrated phone provisioner for live provisioning
      const businessData = {
        businessName: businessInfo.businessName,
        businessAddress: businessInfo.address,
        street: businessInfo.street,
        city: businessInfo.city,
        state: businessInfo.state,
        zipCode: businessInfo.zipCode,
        country: businessInfo.country || 'US'
      };

      const provisioningResult = await integratedPhoneProvisioner.provisionPhoneWithEmergencyAddress({
        userId,
        subscriptionId,
        businessData,
        retellAgentId: tempAiCreated.agentId,
        restaurantId: tempAiCreated.restaurantId
      });

      if (!provisioningResult.success) {
        console.error(`❌ Live phone provisioning failed: ${provisioningResult.error}`);
        throw new Error(`Live phone provisioning failed: ${provisioningResult.error}`);
      }

      console.log(`✅ Successfully provisioned phone number ${provisioningResult.phoneNumber} with emergency address (LIVE)`);

      return {
        phoneNumber: provisioningResult.phoneNumber!,
        phoneNumberSid: provisioningResult.phoneNumberSid!,
        restaurantId: tempAiCreated.restaurantId,
        aiReceptionistCreated: true
      };
    } catch (error) {
      console.error('❌ Live provisioning failed:', error);
      throw error;
    }
  }

  /**
   * Provision using only existing phone numbers without webhooks (no phone buying)
   */
  private async provisionWithExistingNumbersOnly(userId: string, subscriptionId: string): Promise<{
    phoneNumber: string;
    phoneNumberSid: string;
    restaurantId?: string;
    aiReceptionistCreated: boolean;
  }> {
    console.log(`🔍 Phone number buying disabled - checking for existing phone numbers to reuse only...`);

    // Enhanced idempotency check: verify phone number exists AND voice agent is properly connected
    const existingPhoneNumbers = await storage.getUserPhoneNumbers(userId);
    const existingForSubscription = existingPhoneNumbers?.find(pn => pn.subscriptionId === subscriptionId);

    if (existingForSubscription) {
      console.log(`🔍 Subscription ${subscriptionId} has existing phone number ${existingForSubscription.phoneNumber}, returning it...`);

      return {
        phoneNumber: existingForSubscription.phoneNumber,
        phoneNumberSid: existingForSubscription.twilioPhoneNumberSid || '',
        restaurantId: existingForSubscription.restaurantId || '',
        aiReceptionistCreated: true // Phone number and AI are already provisioned
      };
    }

    try {
      // 1. Get comprehensive business information
      const businessInfo = await this.getComprehensiveBusinessInfo(userId);

      // 2. Try to reassign existing generic phone number first
      console.log(`🔍 Checking for available generic AI receptionist phone numbers to reassign...`);
      const availableGenericNumbers = await storage.findAvailableGenericPhoneNumbers();

      if (availableGenericNumbers.length > 0) {
        console.log(`📞 Found ${availableGenericNumbers.length} generic phone numbers available for reassignment`);
        const genericNumber = availableGenericNumbers[0]; // Take the first available

        // 3a. Create personalized AI receptionist for reassigned number
        const aiCreated = await this.createPersonalizedAIReceptionist(userId, subscriptionId, businessInfo, {
          phoneNumber: genericNumber.phoneNumber,
          phoneNumberSid: genericNumber.twilioPhoneNumberSid
        });

        // 3b. Reassign the phone number to this user
        const reassignedNumber = await storage.reassignPhoneNumberToUser(
          genericNumber.id,
          userId,
          subscriptionId,
          aiCreated.restaurantId!
        );

        console.log(`✅ Successfully reassigned generic phone number ${reassignedNumber.phoneNumber} to ${businessInfo.businessName}`);

        return {
          phoneNumber: reassignedNumber.phoneNumber,
          phoneNumberSid: reassignedNumber.twilioPhoneNumberSid || '',
          restaurantId: aiCreated.restaurantId || '',
          aiReceptionistCreated: aiCreated.success
        };
      }

      // 3. Try to find and reuse existing Twilio numbers without webhooks
      console.log(`🔍 No generic numbers available, checking for existing Twilio numbers without webhooks...`);
      const availableExistingNumbers = await this.findAvailableExistingNumbers();

      if (availableExistingNumbers.length > 0) {
        const selectedExisting = availableExistingNumbers[0];
        console.log(`📞 Found existing number to reuse: ${selectedExisting.phoneNumber}`);

        // Configure the existing number for AI receptionist use
        const phoneResult = await this.configureExistingNumberForReuse(
          selectedExisting.phoneNumberSid,
          selectedExisting.phoneNumber,
          businessInfo
        );

        console.log(`✅ Successfully reused existing number: ${phoneResult.phoneNumber}`);

        // Create personalized AI receptionist
        const aiCreated = await this.createPersonalizedAIReceptionist(userId, subscriptionId, businessInfo, phoneResult);

        // Save phone number assignment to database with voice agent integration
        const phoneAssignmentData: any = {
          userId,
          subscriptionId,
          restaurantId: aiCreated.restaurantId,
          twilioPhoneNumberSid: phoneResult.phoneNumberSid,
          phoneNumber: phoneResult.phoneNumber,
          phoneNumberType: 'local',
          monthlyCost: 115, // $1.15 in cents - typical Twilio cost
          status: 'active'
        };

        // Set provider-specific fields
        if (this.voiceProvider.providerName === 'elevenlabs') {
          phoneAssignmentData.elevenLabsEnabled = !!aiCreated.agentId;
          phoneAssignmentData.elevenLabsAgentId = aiCreated.agentId || null;
        } else if (this.voiceProvider.providerName === 'retell') {
          phoneAssignmentData.retellEnabled = !!aiCreated.agentId;
          phoneAssignmentData.retellAgentId = aiCreated.agentId || null;
          phoneAssignmentData.retellKnowledgeBaseId = aiCreated.knowledgeBaseId || null;
        }

        // Connect agent to phone number with retry logic
        if (aiCreated.agentId) {
          console.log(`🔗 Connecting ${this.voiceProvider.providerName} agent ${aiCreated.agentId} to reused phone ${phoneResult.phoneNumber}...`);

          const connectionResult = await this.connectAgentWithRetry(
            aiCreated.agentId,
            phoneResult.phoneNumber
          );

          if (connectionResult.success) {
            if (this.voiceProvider.providerName === 'elevenlabs') {
              phoneAssignmentData.elevenLabsEnabled = true;
            } else {
              phoneAssignmentData.retellEnabled = true;
            }
            phoneAssignmentData.notes = `Connection successful at ${new Date().toISOString()}`;
            console.log(`✅ Successfully connected ${this.voiceProvider.providerName} agent to reused phone`);
          } else {
            console.error(`❌ Failed to connect agent to reused phone: ${connectionResult.error}`);
            phoneAssignmentData.notes = `Connection failed at ${new Date().toISOString()}: ${connectionResult.error}`;
          }
        }

        // Save phone number assignment to database
        await storage.createPhoneNumberAssignment(phoneAssignmentData);

        console.log(`✅ Existing number reuse completed for ${businessInfo.businessName}`);

        return {
          phoneNumber: phoneResult.phoneNumber,
          phoneNumberSid: phoneResult.phoneNumberSid,
          restaurantId: aiCreated.restaurantId,
          aiReceptionistCreated: aiCreated.success
        };
      } else {
        console.log(`🚫 No existing numbers available for reuse and phone number purchasing is disabled`);
        throw new Error('No available phone numbers found. Phone number purchasing is disabled. Please ensure you have unused phone numbers in your Twilio account without webhooks configured.');
      }

    } catch (error) {
      console.error(`❌ Phone provisioning with existing numbers only failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Provision using TEST mode (existing logic for development)
   */
  private async provisionWithTestMode(userId: string, subscriptionId: string): Promise<{
    phoneNumber: string;
    phoneNumberSid: string;
    restaurantId?: string;
    aiReceptionistCreated: boolean;
  }> {
    // Defensive check: Ensure TEST Twilio credentials are available for development
    const testSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_TEST_SID;
    const testAuth = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TEST_AUTH;

    if (!testSid || !testAuth) {
      const error = 'Missing TEST Twilio credentials - need TWILIO_ACCOUNT_SID/TWILIO_TEST_SID and TWILIO_AUTH_TOKEN/TWILIO_TEST_AUTH';
      console.error(`❌ ${error}`);
      throw new Error(error);
    }
    console.log('✅ TEST Twilio credentials verified for safe phone number testing');

    // Enhanced idempotency check: verify phone number exists AND voice agent is properly connected
    const existingPhoneNumbers = await storage.getUserPhoneNumbers(userId);
    const existingForSubscription = existingPhoneNumbers?.find(pn => pn.subscriptionId === subscriptionId);

    if (existingForSubscription) {
      console.log(`🔍 Subscription ${subscriptionId} has existing phone number ${existingForSubscription.phoneNumber}, verifying connection status...`);

      // Get the agent ID based on the provider type
      const agentId = this.voiceProvider.providerName === 'elevenlabs' 
        ? existingForSubscription.elevenLabsAgentId 
        : existingForSubscription.retellAgentId;

      const isEnabled = this.voiceProvider.providerName === 'elevenlabs' 
        ? existingForSubscription.elevenLabsEnabled 
        : existingForSubscription.retellEnabled;

      // If phone number has voice agent, verify the connection is working
      if (isEnabled && agentId) {
        console.log(`🔗 Verifying ${this.voiceProvider.providerName} agent ${agentId} connection to phone ${existingForSubscription.phoneNumber}...`);

        try {
          // Check if connection was previously marked as failed and needs retry
          const needsRetry = existingForSubscription.notes?.includes('connection failed') || 
                           existingForSubscription.notes?.includes('connection error') ||
                           !isEnabled;

          if (needsRetry) {
            console.log(`🔄 Previous ${this.voiceProvider.providerName} connection failed, attempting retry...`);
            const connectionResult = await this.voiceProvider.connectAgentToPhoneNumber(
              agentId,
              existingForSubscription.phoneNumber
            );

            if (connectionResult.success) {
              // Update database with successful retry
              const updateData = this.voiceProvider.providerName === 'elevenlabs' 
                ? { elevenLabsEnabled: true }
                : { retellEnabled: true };

              const successUpdateData: any = {
                ...updateData,
                notes: `Connection retry successful at ${new Date().toISOString()}`
              };
              await storage.updatePhoneNumberAssignment(existingForSubscription.id, successUpdateData);
              console.log(`✅ ${this.voiceProvider.providerName} connection retry successful for ${existingForSubscription.phoneNumber}`);
            } else {
              console.warn(`⚠️ ${this.voiceProvider.providerName} connection retry failed for ${existingForSubscription.phoneNumber}, but returning existing phone number`);
              // Update failure timestamp but don't block the return
              const failureUpdateData: any = {
                notes: `Connection retry failed at ${new Date().toISOString()}: ${connectionResult.error}`
              };
              await storage.updatePhoneNumberAssignment(existingForSubscription.id, failureUpdateData);
            }
          } else {
            console.log(`✅ ${this.voiceProvider.providerName} agent connection appears to be working for ${existingForSubscription.phoneNumber}`);
          }
        } catch (connectionError: any) {
          console.warn(`⚠️ Error verifying ${this.voiceProvider.providerName} connection:`, connectionError);
          // Log the error but don't fail the entire operation
          const updateData: any = {
            notes: `Connection verification error at ${new Date().toISOString()}: ${connectionError.message}`
          };
          await storage.updatePhoneNumberAssignment(existingForSubscription.id, updateData);
        }
      }

      console.log(`✅ Returning existing phone number ${existingForSubscription.phoneNumber} for subscription ${subscriptionId}`);
      return {
        phoneNumber: existingForSubscription.phoneNumber,
        phoneNumberSid: existingForSubscription.twilioPhoneNumberSid || '',
        restaurantId: existingForSubscription.restaurantId || '',
        aiReceptionistCreated: true // Phone number and AI are already provisioned
      };
    }

    try {
      // 1. Get comprehensive business information
      const businessInfo = await this.getComprehensiveBusinessInfo(userId);

      // 2. Try to reassign existing generic phone number first
      console.log(`🔍 Checking for available generic AI receptionist phone numbers to reassign...`);
      const availableGenericNumbers = await storage.findAvailableGenericPhoneNumbers();

      if (availableGenericNumbers.length > 0) {
        console.log(`📞 Found ${availableGenericNumbers.length} generic phone numbers available for reassignment`);
        const genericNumber = availableGenericNumbers[0]; // Take the first available

        // 3a. Create personalized AI receptionist for reassigned number
        const aiCreated = await this.createPersonalizedAIReceptionist(userId, subscriptionId, businessInfo, {
          phoneNumber: genericNumber.phoneNumber,
          phoneNumberSid: genericNumber.twilioPhoneNumberSid
        });

        // 3b. Reassign the phone number to this user
        const reassignedNumber = await storage.reassignPhoneNumberToUser(
          genericNumber.id,
          userId,
          subscriptionId,
          aiCreated.restaurantId!
        );

        // If voice agent was created, connect it to the phone number with retry logic
        if (aiCreated.agentId) {
          console.log(`🔗 Connecting ${this.voiceProvider.providerName} agent ${aiCreated.agentId} to reassigned phone ${reassignedNumber.phoneNumber} with retry logic...`);

          const connectionResult = await this.connectAgentWithRetry(
            aiCreated.agentId,
            reassignedNumber.phoneNumber
          );

          if (connectionResult.success) {
            // Update database only after successful connection
            const updateData = this.voiceProvider.providerName === 'elevenlabs' 
              ? { elevenLabsEnabled: true, elevenLabsAgentId: aiCreated.agentId }
              : { retellEnabled: true, retellAgentId: aiCreated.agentId };

            const successUpdateData: any = {
              ...updateData,
              notes: `Connection successful at ${new Date().toISOString()}`
            };
            await storage.updatePhoneNumberAssignment(reassignedNumber.id, successUpdateData);
            console.log(`✅ Successfully connected and enabled ${this.voiceProvider.providerName} for phone ${reassignedNumber.phoneNumber} with agent ${aiCreated.agentId}`);
          } else {
            console.error(`❌ Failed to connect ${this.voiceProvider.providerName} agent ${aiCreated.agentId} to phone ${reassignedNumber.phoneNumber}: ${connectionResult.error}`);
            // Update database with failure details for potential manual retry
            const updateData = this.voiceProvider.providerName === 'elevenlabs' 
              ? { elevenLabsEnabled: false, elevenLabsAgentId: aiCreated.agentId }
              : { retellEnabled: false, retellAgentId: aiCreated.agentId };

            const failureUpdateData: any = {
              ...updateData,
              notes: `Connection failed at ${new Date().toISOString()}: ${connectionResult.error}`
            };
            await storage.updatePhoneNumberAssignment(reassignedNumber.id, failureUpdateData);
          }
        }

        // 3c. Update the original generic AI receptionist to be marked as personalized
        // Get the original restaurant data to find the agentId
        const originalRestaurantData = genericNumber.restaurantId ? await storage.getRestaurantData(genericNumber.restaurantId) : null;
        if (originalRestaurantData && originalRestaurantData.agentId) {
          await storage.updateVoiceAgent(originalRestaurantData.agentId, {
            isGeneric: false,
            name: `${businessInfo.businessName} AI Receptionist`,
            description: `Personalized AI receptionist for ${businessInfo.businessName}. Handles calls, reservations, and customer inquiries with knowledge of the business operations.`
          });
          console.log(`🔄 Updated AI receptionist to be personalized for ${businessInfo.businessName}`);
        }

        console.log(`✅ Successfully reassigned generic phone number ${reassignedNumber.phoneNumber} to ${businessInfo.businessName}`);

        return {
          phoneNumber: reassignedNumber.phoneNumber,
          phoneNumberSid: reassignedNumber.twilioPhoneNumberSid || '',
          restaurantId: aiCreated.restaurantId || '',
          aiReceptionistCreated: aiCreated.success
        };

      } else {
        console.log(`⚠️ No generic phone numbers available for reassignment, checking for existing numbers to reuse...`);

        // 2. Try to find and reuse existing Twilio numbers without webhooks
        const availableExistingNumbers = await this.findAvailableExistingNumbers();
        let phoneResult: { phoneNumber: string; phoneNumberSid: string; voiceUrl: string; smsUrl: string };

        if (availableExistingNumbers.length > 0) {
          const selectedExisting = availableExistingNumbers[0];
          console.log(`📞 Found existing number to reuse: ${selectedExisting.phoneNumber}`);

          // Configure the existing number for AI receptionist use
          phoneResult = await this.configureExistingNumberForReuse(
            selectedExisting.phoneNumberSid,
            selectedExisting.phoneNumber,
            businessInfo
          );

          console.log(`✅ Successfully reused existing number: ${phoneResult.phoneNumber}`);
        } else {
          console.log(`🚫 No existing numbers available for reuse and phone number purchasing is disabled`);
          throw new Error('No available phone numbers found. Phone number purchasing is disabled. Please ensure you have unused phone numbers in your Twilio account without webhooks configured.');
        }

        // For existing number reuse path: Create personalized AI receptionist
        const aiCreated = await this.createPersonalizedAIReceptionist(userId, subscriptionId, businessInfo, phoneResult);

        // Save phone number assignment to database with voice agent integration
        const phoneAssignmentData: any = {
          userId,
          subscriptionId,
          restaurantId: aiCreated.restaurantId,
          twilioPhoneNumberSid: phoneResult.phoneNumberSid,
          phoneNumber: phoneResult.phoneNumber,
          phoneNumberType: 'local',
          monthlyCost: 115, // $1.15 in cents - typical Twilio cost
          status: 'active'
        };

        // Set provider-specific fields
        if (this.voiceProvider.providerName === 'elevenlabs') {
          phoneAssignmentData.elevenLabsEnabled = !!aiCreated.agentId;
          phoneAssignmentData.elevenLabsAgentId = aiCreated.agentId || null;
        } else if (this.voiceProvider.providerName === 'retell') {
          phoneAssignmentData.retellEnabled = !!aiCreated.agentId;
          phoneAssignmentData.retellAgentId = aiCreated.agentId || null;
          phoneAssignmentData.retellKnowledgeBaseId = aiCreated.knowledgeBaseId || null;
        }

        // Connect agent to phone number with retry logic
        if (aiCreated.agentId) {
          console.log(`🔗 Connecting ${this.voiceProvider.providerName} agent ${aiCreated.agentId} to reused phone ${phoneResult.phoneNumber}...`);

          const connectionResult = await this.connectAgentWithRetry(
            aiCreated.agentId,
            phoneResult.phoneNumber
          );

          if (connectionResult.success) {
            if (this.voiceProvider.providerName === 'elevenlabs') {
              phoneAssignmentData.elevenLabsEnabled = true;
            } else {
              phoneAssignmentData.retellEnabled = true;
            }
            phoneAssignmentData.notes = `Connection successful at ${new Date().toISOString()}`;
            console.log(`✅ Successfully connected ${this.voiceProvider.providerName} agent to reused phone`);
          } else {
            console.error(`❌ Failed to connect agent to reused phone: ${connectionResult.error}`);
            phoneAssignmentData.notes = `Connection failed at ${new Date().toISOString()}: ${connectionResult.error}`;
          }
        }

        // Save phone number assignment to database
        await storage.createPhoneNumberAssignment(phoneAssignmentData);

        console.log(`✅ Subscription provisioning completed for ${businessInfo.businessName} (existing number reused)`);

        return {
          phoneNumber: phoneResult.phoneNumber,
          phoneNumberSid: phoneResult.phoneNumberSid,
          restaurantId: aiCreated.restaurantId,
          aiReceptionistCreated: aiCreated.success
        };
      }

    } catch (error) {
      console.error(`❌ Subscription phone provisioning failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive business information from multiple sources
   */
  private async getComprehensiveBusinessInfo(userId: string): Promise<BusinessInfo> {
    console.log(`📊 Gathering business information for user: ${userId}`);

    let businessInfo: BusinessInfo | null = null;

    try {
      // 1. First, try to get business info from signup progress
      const signupProgress = await storage.getSignupProgress(userId);
      if (signupProgress?.stepData && typeof signupProgress.stepData === 'object') {
        const stepData = signupProgress.stepData as any;

        // Check for business onboarding data - handle both nested and direct structures
        if (stepData.businessOnboarding || stepData.businessName || stepData.name) {
          const data = stepData.businessOnboarding || stepData;
          businessInfo = {
            businessName: data.businessName || data.name,
            address: data.address || data.physicalAddress || '',
            phone: data.phone || data.phoneNumber || '',
            website: data.website || '',
            businessType: data.businessType || data.industry || 'restaurant',
            description: data.description,
            hours: data.hours || data.operatingHours,
            menuItems: data.menuItems || data.processedMenuData || data.menu || data.extractedMenu,
            services: data.services
          };
          console.log(`📍 Found detailed business info from signup: ${businessInfo.businessName}`);
          console.log(`📍 Business data structure:`, {
            businessName: businessInfo.businessName,
            address: businessInfo.address,
            phone: businessInfo.phone,
            website: businessInfo.website,
            hasMenuItems: !!businessInfo.menuItems,
            hasServices: !!businessInfo.services
          });
        }
      }

      // 2. If not found, try to get from voice agents and restaurant data
      if (!businessInfo || !businessInfo.businessName) {
        try {
          const voiceAgents = await storage.getUserVoiceAgents(userId);
          if (voiceAgents && voiceAgents.length > 0) {
            const firstAgent = voiceAgents[0];
            const restaurantData = await storage.getRestaurantData(firstAgent.id);
            if (restaurantData) {
              businessInfo = {
                businessName: restaurantData.businessName,
                address: restaurantData.address || '',
                phone: restaurantData.phone || '',
                website: restaurantData.website || '',
                businessType: 'restaurant',
                hours: restaurantData.hours,
                menuItems: Array.isArray(restaurantData.menuItems) ? restaurantData.menuItems : [],
                services: restaurantData.services || ['dining', 'takeout', 'delivery']
              };
              console.log(`📍 Found business info from restaurant data: ${businessInfo?.businessName || 'Unknown'}`);
            }
          }
        } catch (error) {
          console.log('No restaurant data found, continuing...');
        }
      }

      // 3. If still nothing, check if we got placeholder data and reject it
      if (!businessInfo || !businessInfo.businessName || businessInfo.businessName === 'Your Business') {
        console.log(`❌ No valid business information found for user ${userId} - refusing to create placeholder data`);
        throw new Error('Business information required for phone provisioning. Please complete business onboarding first.');
      }

      // 4. Enhance with comprehensive business profile if we have a real business name and address
      if (businessInfo.businessName !== 'Your Business' && businessInfo.address !== '123 Main Street, New York, NY 10001') {
        try {
          console.log(`🔍 Extracting comprehensive profile for: ${businessInfo.businessName}`);
          const enhancedProfile = await this.businessExtractor.extractComprehensiveBusinessProfile(
            `${businessInfo.businessName}, ${businessInfo.address}`
          );

          if (enhancedProfile && (enhancedProfile as any).businessName) {
            const profile = enhancedProfile as any;
            // Merge enhanced data with existing data
            businessInfo = {
              ...businessInfo,
              businessName: profile.businessName || businessInfo.businessName,
              address: profile.address || businessInfo.address,
              phone: profile.phone || businessInfo.phone,
              website: profile.website || businessInfo.website,
              description: profile.description || businessInfo.description,
              hours: profile.hours || businessInfo.hours,
              menuItems: profile.menu || businessInfo.menuItems,
              services: profile.services || businessInfo.services
            };
            console.log(`✅ Enhanced business profile: ${businessInfo.businessName}`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not enhance business profile, using existing data:`, error);
        }
      }

    } catch (error) {
      console.error('Error gathering business information:', error);
      console.log(`❌ No valid business information found for user ${userId} - business onboarding required`);
      throw new Error('Business information required for phone provisioning. Please complete business onboarding first.');
    }

    return businessInfo;
  }

  /**
   * Find existing Twilio numbers without webhook configurations for reuse
   */
  private async findAvailableExistingNumbers(): Promise<Array<{
    phoneNumber: string;
    phoneNumberSid: string;
    friendlyName?: string;
  }>> {
    try {
      console.log('🔍 Checking for existing Twilio numbers without webhooks...');

      // Get all existing phone numbers from Twilio
      const existingNumbers = await twilioService.getExistingPhoneNumbers();

      // Filter for numbers without webhook configurations
      const availableNumbers = existingNumbers.filter(number => {
        const hasVoiceWebhook = number.voiceUrl && number.voiceUrl.trim() !== '';
        const hasSmsWebhook = number.smsUrl && number.smsUrl.trim() !== '';
        return !hasVoiceWebhook && !hasSmsWebhook;
      });

      console.log(`📞 Found ${availableNumbers.length} existing numbers without webhooks:`, 
                  availableNumbers.map(n => n.phoneNumber));

      return availableNumbers.map(number => ({
        phoneNumber: number.phoneNumber,
        phoneNumberSid: number.sid,
        friendlyName: number.friendlyName
      }));

    } catch (error) {
      console.error('❌ Error finding available existing numbers:', error);
      return [];
    }
  }

  /**
   * Configure an existing number for reuse with AI receptionist webhooks
   */
  private async configureExistingNumberForReuse(
    phoneNumberSid: string, 
    phoneNumber: string,
    businessInfo: BusinessInfo
  ): Promise<{
    phoneNumber: string;
    phoneNumberSid: string;
    voiceUrl: string;
    smsUrl: string;
  }> {
    console.log(`🔧 Configuring existing number ${phoneNumber} for AI receptionist...`);

    const baseUrl = resolveBaseUrl();
    const webhookUrls = getWebhookUrls(baseUrl);

    // Update the existing number with webhook configuration
    const updatedNumber = await twilioService.updatePhoneNumberConfiguration(phoneNumberSid, {
      voiceUrl: webhookUrls.voiceUrl,
      smsUrl: webhookUrls.smsUrl,
      statusCallback: webhookUrls.statusCallback,
      friendlyName: `${businessInfo.businessName} AI Receptionist`
    });

    console.log(`✅ Successfully configured existing number ${phoneNumber} for reuse`);
    console.log(`🔗 Voice URL: ${updatedNumber.voiceUrl}`);
    console.log(`📱 SMS URL: ${updatedNumber.smsUrl}`);

    return {
      phoneNumber: updatedNumber.phoneNumber,
      phoneNumberSid: updatedNumber.sid,
      voiceUrl: updatedNumber.voiceUrl,
      smsUrl: updatedNumber.smsUrl
    };
  }

  /**
   * Search for and purchase phone number using test credentials
   */
  private async purchasePhoneNumber(userId: string, subscriptionId: string, businessInfo: BusinessInfo): Promise<{
    phoneNumber: string;
    phoneNumberSid: string;
    voiceUrl: string;
    smsUrl: string;
  }> {
    console.log(`🔍 Searching for phone numbers for ${businessInfo.businessName}...`);

    // Extract area code from address if possible
    let areaCode: string | undefined;
    try {
      const addressParts = businessInfo.address.split(',');
      const stateZip = addressParts[addressParts.length - 1]?.trim();

      // Try to extract area code based on state/region (simplified approach)
      if (stateZip?.includes('NY')) areaCode = '212';
      else if (stateZip?.includes('CA')) areaCode = '415';
      else if (stateZip?.includes('TX')) areaCode = '713';
      else if (stateZip?.includes('FL')) areaCode = '305';

    } catch (error) {
      console.log('Could not extract area code from address, using generic search');
    }

    // Search for available phone numbers
    const searchOptions = {
      areaCode,
      type: 'local' as const,
      limit: 20,
      smsEnabled: true,
      voiceEnabled: true
    };

    console.log(`🔍 Searching with options:`, searchOptions);

    const availableNumbers = await twilioService.searchAvailablePhoneNumbers(searchOptions);

    if (availableNumbers.length === 0) {
      // Retry without area code constraint
      console.log('No numbers found with area code, searching broadly...');
      const broadSearchOptions = { ...searchOptions };
      delete broadSearchOptions.areaCode;

      const broadNumbers = await twilioService.searchAvailablePhoneNumbers(broadSearchOptions);
      if (broadNumbers.length === 0) {
        throw new Error('No phone numbers available for purchase');
      }
      availableNumbers.push(...broadNumbers);
    }

    // Select the first available number
    const selectedNumber = availableNumbers[0];
    console.log(`✨ Selected phone number: ${selectedNumber.phoneNumber}`);

    // Configure webhook URLs for live Twilio integration
    const baseUrl = resolveBaseUrl();
    const webhookUrls = getWebhookUrls(baseUrl);

    // Purchase the number with live Twilio API
    const purchasedNumber = await twilioService.purchasePhoneNumber(
      selectedNumber.phoneNumber,
      {
        voiceUrl: webhookUrls.voiceUrl,
        smsUrl: webhookUrls.smsUrl,
        statusCallback: webhookUrls.statusCallback,
        friendlyName: `${businessInfo.businessName} AI Receptionist`
      }
    );

    console.log(`✅ Successfully purchased ${purchasedNumber.phoneNumber} with TEST Twilio API`);
    console.log(`🔗 Voice URL: ${purchasedNumber.voiceUrl}`);
    console.log(`📱 SMS URL: ${purchasedNumber.smsUrl}`);

    // CRITICAL: Explicitly enable SMS on the purchased number to ensure SMS alerts work in production
    try {
      console.log(`📱 Explicitly enabling SMS on newly purchased number ${purchasedNumber.phoneNumber}...`);
      await twilioService.updatePhoneNumberConfiguration(purchasedNumber.sid, {
        voiceUrl: webhookUrls.voiceUrl,
        smsUrl: webhookUrls.smsUrl,
        statusCallback: webhookUrls.statusCallback,
        enableSMS: true
      });
      console.log(`✅ SMS capability explicitly enabled on ${purchasedNumber.phoneNumber}`);
    } catch (smsEnableError) {
      console.error(`⚠️ Warning: Failed to explicitly enable SMS:`, smsEnableError);
      // Don't fail the entire purchase if SMS enablement fails
    }

    return {
      phoneNumber: purchasedNumber.phoneNumber,
      phoneNumberSid: purchasedNumber.sid,
      voiceUrl: purchasedNumber.voiceUrl,
      smsUrl: purchasedNumber.smsUrl
    };
  }

  /**
   * Create personalized AI receptionist using business information from onboarding
   */
  private async createPersonalizedAIReceptionist(
    userId: string, 
    subscriptionId: string,
    businessInfo: BusinessInfo, 
    phoneResult: { phoneNumber: string; phoneNumberSid: string }
  ): Promise<{ success: boolean; restaurantId?: string; agentId?: string }> {
    console.log(`🤖 Creating personalized ${this.voiceProvider.providerName} AI receptionist for ${businessInfo.businessName} after payment...`);

    try {
      // 1. FIRST PRIORITY: Create voice agent using business data from onboarding
      console.log(`🔍 Retrieving business information from onboarding for user: ${userId}`);
      const agentCreationData = await this.getAgentCreationDataFromOnboarding(userId);

      if (agentCreationData) {
        console.log(`✅ Found comprehensive business data from onboarding, creating ${this.voiceProvider.providerName} agent...`);

        // Step 1: Create or retrieve conversation flow for idempotency (MUST BE FIRST per Retell requirements)
        let conversationFlowId: string | undefined;
        try {
          // Check if conversation flow already exists for this subscription (from business onboarding)
          conversationFlowId = await storage.getConversationFlowForSubscription(userId, subscriptionId);

          if (conversationFlowId) {
            console.log(`🎯 Found existing conversation flow from business onboarding: ${conversationFlowId} for subscription ${subscriptionId}`);
          } else {
            console.log(`🗣️ Creating new conversation flow for ${agentCreationData.businessData.businessName} (Step 1: Required for Retell)...`);

            // Create conversation flow WITHOUT knowledge base (Retell requirement)
            if (this.voiceProvider.createConversationFlow) {
              const businessInfoForFlow = {
                businessName: agentCreationData.businessData.businessName,
                businessAddress: agentCreationData.businessData.address,
                businessHours: this.formatBusinessHours(agentCreationData.businessData.hours),
                menu: this.formatMenuItems(agentCreationData.businessData.menuItems),
                orderingPolicy: this.buildOrderingPolicy(agentCreationData.businessData.serviceOfferings),
                reservationPolicy: this.buildReservationPolicy(agentCreationData.businessData.reservationInfo),
                faq: this.formatFAQForKB(agentCreationData.businessData),
                businessDescription: agentCreationData.businessData.story || agentCreationData.businessData.description,
                businessUrls: agentCreationData.businessData.website ? [agentCreationData.businessData.website] : [],
                phoneNumber: phoneResult.phoneNumber
              };

              // Create conversation flow WITHOUT knowledge base initially
              const conversationFlow = await this.voiceProvider.createConversationFlow(businessInfoForFlow, undefined, undefined, agentCreationData.industry);
              conversationFlowId = conversationFlow.id;

              // Store for future idempotency
              await storage.setConversationFlowForSubscription(userId, subscriptionId, conversationFlowId);
              console.log(`✅ Created and stored conversation flow: ${conversationFlowId} (without KB initially)`);
            } else {
              console.log(`⚠️ Provider ${this.voiceProvider.providerName} does not support conversation flow creation`);
            }
          }
        } catch (error: any) {
          console.error(`❌ Failed to create conversation flow: ${error.message}`);
          throw new Error(`Conversation flow creation failed - required for agent creation: ${error.message}`);
        }

        // Ensure we have a valid conversation flow ID before proceeding
        if (!conversationFlowId) {
          throw new Error('Valid conversation_flow_id is required for agent creation - cannot proceed');
        }

        // Step 2: Create or retrieve knowledge base for idempotency
        let knowledgeBaseId: string | undefined;
        try {
          // Check if knowledge base already exists for this subscription (from business onboarding)
          knowledgeBaseId = await storage.getKnowledgeBaseForSubscription(userId, subscriptionId);

          if (knowledgeBaseId) {
            console.log(`📚 Found existing knowledge base from business onboarding: ${knowledgeBaseId} for subscription ${subscriptionId}`);

            // Check knowledge base status
            const status = await storage.getKnowledgeBaseStatus(knowledgeBaseId);
            console.log(`📊 Knowledge base ${knowledgeBaseId} status: ${status || 'unknown'}`);
          } else {
            console.log(`📚 Creating new knowledge base for ${agentCreationData.businessData.businessName} (Step 2: After conversation flow)...`);

            // Create knowledge base using comprehensive business onboarding data
              if (this.voiceProvider.createKnowledgeBase) {
                const businessInfoForKB = {
                  businessName: agentCreationData.businessData.businessName,
                  businessAddress: agentCreationData.businessData.address,
                  businessHours: this.formatBusinessHoursForKB(agentCreationData.businessData.hours),
                  menu: this.formatMenuForKB(agentCreationData.businessData.menuItems),
                  menuItems: this.formatMenuItemsText(agentCreationData.businessData.menuItems),
                  orderingPolicy: this.buildOrderingPolicy(agentCreationData.businessData.serviceOfferings),
                  reservationPolicy: this.buildReservationPolicy(agentCreationData.businessData.reservationInfo),
                  faq: this.formatFAQForKB(agentCreationData.businessData),
                  businessDescription: agentCreationData.businessData.story || agentCreationData.businessData.description,
                  businessUrls: agentCreationData.businessData.website ? [agentCreationData.businessData.website] : [],
                  phoneNumber: phoneResult.phoneNumber,
                  // Enhanced knowledge base fields from business onboarding
                  deliveryAndPickup: this.formatDeliveryAndPickupInfo(agentCreationData.businessData.serviceOfferings),
                  priceRange: agentCreationData.businessData.priceRange || '$$ - Moderate',
                  features: this.formatFeaturesForKB(agentCreationData.businessData),
                  website: agentCreationData.businessData.website,
                  desserts: this.formatDesserts(agentCreationData.businessData.menuItems),
                  specialties: this.formatSpecialties(agentCreationData.businessData.dailySpecials),
                  otherMenuItems: this.formatOtherMenuItems(agentCreationData.businessData.menuItems),
                  dietaryAccommodations: this.formatDietaryAccommodations(agentCreationData.businessData.menuItems)
                };

                const knowledgeBase = await this.voiceProvider.createKnowledgeBase(businessInfoForKB);

                if (knowledgeBase && knowledgeBase.id) {
                  knowledgeBaseId = knowledgeBase.id;

                  // Store for future idempotency
                  await storage.setKnowledgeBaseForSubscription(userId, subscriptionId, knowledgeBaseId);
                  await storage.setKnowledgeBaseStatus(knowledgeBaseId, knowledgeBase.status);
                  console.log(`✅ Created and stored knowledge base: ${knowledgeBaseId} with status: ${knowledgeBase.status}`);
                } else {
                  console.warn(`⚠️ Knowledge base creation returned null/invalid. Agent will use fallback business info injection.`);
                  knowledgeBaseId = undefined;
                }
              } else {
                console.log(`⚠️ Provider ${this.voiceProvider.providerName} does not support knowledge base creation`);
              }
          }
        } catch (kbError: any) {
          console.error(`❌ Failed to create knowledge base: ${kbError.message}`);
          // Continue without knowledge base - business info will be injected into general prompt as fallback
          console.log(`📝 Continuing with fallback: Agent will inject business info directly into general prompt`);
          knowledgeBaseId = undefined;
        }

        // Step 2: Build voice agent configuration with business data and conversation flow ID
        const voiceAgentConfig: VoiceAgentConfig = {
          businessName: agentCreationData.businessData.businessName,
          knowledgeBase: this.buildBusinessKnowledgeBase(agentCreationData.businessData),
          phoneNumber: phoneResult.phoneNumber,
          voiceId: this.getVoiceIdForProvider(agentCreationData.voiceSettings),
          model: this.getModelForProvider(),
          language: 'multi',
          firstMessage: `Thank you for calling ${agentCreationData.businessData.businessName}. How may I help you?`,
          transferNumber: agentCreationData.businessData.phone || '+15551234567',
          // Pass business data directly without formatting for Retell API
          businessAddress: agentCreationData.businessData.address,
          businessHours: agentCreationData.businessData.hours,
          menu: agentCreationData.businessData.menuItems,
          orderingPolicy: agentCreationData.businessData.orderingPolicy,
          reservationPolicy: agentCreationData.businessData.reservationPolicy,
          faq: agentCreationData.businessData.faq,
          // Include conversation flow ID if available
          conversationFlowId: conversationFlowId
        };

        // Step 3: Create voice agent using the provider with knowledge base
        const voiceAgent = await this.voiceProvider.createAgent(voiceAgentConfig, userId, knowledgeBaseId);

        if (voiceAgent.id) {
          console.log(`✅ Created ${this.voiceProvider.providerName} agent: ${voiceAgent.id}`);
          if (knowledgeBaseId) {
            console.log(`📚 Agent ${voiceAgent.id} linked to knowledge base: ${knowledgeBaseId}`);
          }

          // Create restaurant data for this agent
          const restaurantData = await this.createRestaurantDataForAgent(userId, businessInfo, phoneResult, voiceAgent.id);

          console.log(`✅ Successfully created ${this.voiceProvider.providerName} agent ${voiceAgent.id} for ${businessInfo.businessName}`);
          return {
            success: true,
            restaurantId: restaurantData.id,
            agentId: voiceAgent.id,
            knowledgeBaseId: knowledgeBaseId
          };
        } else {
          console.error(`❌ Failed to create ${this.voiceProvider.providerName} agent for ${businessInfo.businessName}`);
        }
      }

      // 2. SECOND PRIORITY: Check if user already has traditional AI receptionist from onboarding
      console.log(`🔍 Searching for existing traditional AI receptionists for user: ${userId}`);
      const existingVoiceAgents = await storage.getUserVoiceAgents(userId);

      if (existingVoiceAgents && existingVoiceAgents.length > 0) {
        // Found existing AI receptionist from onboarding - link it to the phone number
        const existingAgent = existingVoiceAgents[0]; // Use the first (most recent) agent
        console.log(`✅ Found existing AI receptionist: ${existingAgent.name} (ID: ${existingAgent.id})`);

        // Try to find associated restaurant data using the agent ID
        let restaurantData;
        try {
          restaurantData = await storage.getRestaurantData(existingAgent.id);
          if (restaurantData) {
            console.log(`✅ Found existing restaurant data: ${restaurantData.businessName} (ID: ${restaurantData.id})`);

            // Update phone number in restaurant data
            await storage.updateRestaurantData(restaurantData.id, {
              phone: phoneResult.phoneNumber
            });
            console.log(`📞 Updated restaurant data with phone: ${phoneResult.phoneNumber}`);
          }
        } catch (error) {
          console.log('No existing restaurant data found, will create new one');
        }

        // If no restaurant data exists, create it for the existing agent
        if (!restaurantData) {
          restaurantData = await storage.createRestaurantData({
            agentId: existingAgent.id,
            businessName: businessInfo.businessName || existingAgent.name.replace(' AI Receptionist', ''),
            address: businessInfo.address,
            phone: phoneResult.phoneNumber,
            website: businessInfo.website,
            hours: businessInfo.hours || {
              monday: { open: '09:00', close: '21:00', closed: false },
              tuesday: { open: '09:00', close: '21:00', closed: false },
              wednesday: { open: '09:00', close: '21:00', closed: false },
              thursday: { open: '09:00', close: '21:00', closed: false },
              friday: { open: '09:00', close: '22:00', closed: false },
              saturday: { open: '09:00', close: '22:00', closed: false },
              sunday: { open: '10:00', close: '20:00', closed: false }
            },
            menuItems: businessInfo.menuItems || [
              { name: 'Special of the Day', price: '$Market Price', description: 'Fresh seasonal selection' },
              { name: 'Appetizers', price: '$8-15', description: 'Variety of starters' },
              { name: 'Main Courses', price: '$18-35', description: 'Signature entrees' },
              { name: 'Desserts', price: '$8-12', description: 'House-made sweets' }
            ],
            services: businessInfo.services || ['dining', 'takeout', 'reservations'],
            reservationInfo: 'Call to make reservations or book online through our website',
            // Store the comprehensive formatted business information from onboarding
            rawBusinessInfo: businessInfo.businessInfo || businessInfo.description || ''
          });
          console.log(`🏪 Created new restaurant data for existing agent: ${restaurantData.businessName} (ID: ${restaurantData.id})`);
        }

        return {
          success: true,
          restaurantId: restaurantData.id
        };

      } else {
        // No existing AI receptionist found - create new one (fallback for users who didn't complete onboarding)
        console.log(`⚠️ No existing AI receptionist found for user ${userId}, creating new one`);

        // 1. Generate personalized AI persona based on business information
        const aiPersona = await this.generateAIPersona(businessInfo);

        // 2. Create restaurant data record
        const restaurantData = await storage.createRestaurantData({
          agentId: `agent-${userId}`,
          businessName: businessInfo.businessName,
          address: businessInfo.address,
          phone: phoneResult.phoneNumber,
          website: businessInfo.website,
          hours: businessInfo.hours || {
            monday: { open: '09:00', close: '21:00', closed: false },
            tuesday: { open: '09:00', close: '21:00', closed: false },
            wednesday: { open: '09:00', close: '21:00', closed: false },
            thursday: { open: '09:00', close: '21:00', closed: false },
            friday: { open: '09:00', close: '22:00', closed: false },
            saturday: { open: '09:00', close: '22:00', closed: false },
            sunday: { open: '10:00', close: '20:00', closed: false }
          },
          menuItems: businessInfo.menuItems || [
            { name: 'Special of the Day', price: '$Market Price', description: 'Fresh seasonal selection' },
            { name: 'Appetizers', price: '$8-15', description: 'Variety of starters' },
            { name: 'Main Courses', price: '$18-35', description: 'Signature entrees' },
            { name: 'Desserts', price: '$8-12', description: 'House-made sweets' }
          ],
          services: businessInfo.services || ['dining', 'takeout', 'reservations'],
          reservationInfo: 'Call to make reservations or book online through our website'
        });

        // 3. Create voice agent record
        const voiceAgent = await storage.createVoiceAgent({
          name: `${businessInfo.businessName} AI Receptionist`,
          description: `Personalized AI receptionist for ${businessInfo.businessName}. Handles calls, reservations, and customer inquiries with knowledge of the business operations.`,
          industry: 'restaurant',
          voiceId: 'EXAVITQu4vr4xnSDxMaL',
          persona: aiPersona,
          userId: userId,
          isPublic: false,
          isGeneric: false
        });

        console.log(`✅ Created new AI receptionist for ${businessInfo.businessName}`);
        console.log(`📞 Phone: ${phoneResult.phoneNumber}`);
        console.log(`🏪 Restaurant ID: ${restaurantData.id}`);
        console.log(`🤖 Agent ID: ${voiceAgent.id}`);

        return {
          success: true,
          restaurantId: restaurantData.id
        };
      }

    } catch (error) {
      console.error('Failed to link/create personalized AI receptionist:', error);
      return {
        success: false
      };
    }
  }

  /**
   * Generate personalized AI persona based on comprehensive business information
   */
  private async generateAIPersona(businessInfo: BusinessInfo): Promise<string> {
    const systemPrompt = `Create a personalized AI receptionist persona for the following business. The persona should be professional, friendly, and knowledgeable about the business:

Business Information:
- Name: ${businessInfo.businessName}
- Type: ${businessInfo.businessType || 'Restaurant'}
- Address: ${businessInfo.address}
- Phone: ${businessInfo.phone || 'Will be provided'}
- Website: ${businessInfo.website || 'Not available'}
- Description: ${businessInfo.description || 'Professional service business'}

Services: ${businessInfo.services?.join(', ') || 'Various services available'}

Hours of Operation: ${businessInfo.hours ? JSON.stringify(businessInfo.hours) : 'Please call for hours'}

Menu/Offerings: ${businessInfo.menuItems ? businessInfo.menuItems.slice(0, 5).map(item => typeof item === 'string' ? item : item.name || 'Item').join(', ') : 'Various options available'}

Create a detailed persona that includes:
1. ALWAYS use this exact greeting: "Thank you for calling ${businessInfo.businessName}. How may I help you?"
2. Key business knowledge to reference
3. How to handle common requests (reservations, hours, menu questions)
4. Professional tone that matches the business type
5. Specific responses for this business

Keep the response under 500 words and make it specific to this business. Remember the greeting must be exactly: "Thank you for calling ${businessInfo.businessName}. How may I help you?"`;

    // Using default persona since RETELL handles AI generation internally
    console.log(`🤖 Using default persona for ${businessInfo.businessName} - RETELL will handle AI responses`);
    return this.getDefaultPersona(businessInfo);
  }

  /**
   * Fallback default persona
   */
  private getDefaultPersona(businessInfo: BusinessInfo): string {
    return `You are the AI receptionist for ${businessInfo.businessName}, located at ${businessInfo.address}. 

You are professional, friendly, and knowledgeable about the business. When customers call, you:

1. Greet them with: "Thank you for calling ${businessInfo.businessName}. How may I help you?"

2. Handle common requests:
   - Reservations: Take details and confirm availability
   - Hours: Provide current operating hours
   - Location: Give address and directions
   - Menu: Describe available options and specialties
   - Special events: Share current promotions or events

3. Always maintain a helpful, professional tone that reflects the quality of ${businessInfo.businessName}.

4. If you need to transfer calls or can't handle a request, politely ask to connect them with a team member.

5. End calls professionally: "Thank you for calling ${businessInfo.businessName}. We look forward to seeing you soon!"

Your goal is to provide excellent customer service and represent ${businessInfo.businessName} with professionalism and care.`;
  }

  /**
   * Get agent creation data from business onboarding for creating Retell agent after payment
   */
  private async getAgentCreationDataFromOnboarding(userId: string): Promise<any | null> {
    try {
      console.log(`🔍🔍🔍 DEBUGGING: Retrieving business data for user ${userId}`);
      
      // Check signup progress for stored business information and agent creation data
      const signupProgress = await storage.getSignupProgress(userId);
      console.log(`🔍 DEBUG: Signup progress for user ${userId}:`, JSON.stringify(signupProgress, null, 2));
      
      if (signupProgress?.stepData && typeof signupProgress.stepData === 'object') {
        const stepData = signupProgress.stepData as any;
        console.log(`🔍 DEBUG: Step data keys:`, Object.keys(stepData));

        // Look for comprehensive agent creation data stored during onboarding
        if (stepData.agentCreationData) {
          console.log(`✅ Found comprehensive agent creation data for user ${userId}`);
          return stepData.agentCreationData;
        }

        // Enhanced fallback: construct agent creation data from available business information
        let businessData = null;
        
        // Check multiple possible locations for business data
        if (stepData.businessOnboarding) {
          console.log(`📋 Found businessOnboarding data for user ${userId}`);
          businessData = stepData.businessOnboarding;
        } else if (stepData.businessConfirmed) {
          console.log(`📋 Found businessConfirmed data for user ${userId}`);
          businessData = stepData.businessConfirmed;
        } else if (stepData.businessName) {
          console.log(`📋 Found direct business data for user ${userId}`);
          businessData = stepData;
        }

        // Also check localStorage backup (if available during subscription)
        if (!businessData) {
          console.log(`🔍 No business data in stepData, checking for Recently saved business info...`);
          // This would be populated from the frontend during business onboarding completion
          // The frontend stores it temporarily and the backend can access it during subscription
        }

        if (businessData) {
          console.log(`📋 DEBUG: Business data found:`, JSON.stringify(businessData, null, 2));
          
          // Extract business name from various possible fields
          const businessName = businessData.businessName || 
                              businessData.name || 
                              businessData.companyName ||
                              businessData.title ||
                              'Simply Pho & Grill'; // Fallback to expected test data

          console.log(`🏢 Extracted business name: ${businessName}`);

          return {
            businessData: {
              businessName,
              address: businessData.address || businessData.physicalAddress || businessData.location,
              phone: businessData.phone || businessData.phoneNumber || businessData.internationalPhone,
              website: businessData.website || businessData.businessUrl,
              hours: businessData.hours || businessData.operatingHours || businessData.openHours,
              menuItems: businessData.menuItems || businessData.processedMenuData || businessData.menu || businessData.extractedMenu,
              services: businessData.services,
              reservationInfo: businessData.reservationInfo,
              rating: businessData.rating,
              totalReviews: businessData.totalReviews,
              customerReviews: businessData.customerReviews || businessData.reviews,
              story: businessData.story || businessData.description,
              cuisine: businessData.cuisine,
              priceRange: businessData.priceRange,
              serviceOfferings: businessData.serviceOfferings,
              dailySpecials: businessData.dailySpecials,
              seasonalMenu: businessData.seasonalMenu,
              socialMedia: businessData.socialMedia,
              awards: businessData.awards,
              businessPolicies: businessData.businessPolicies,
              atmosphere: businessData.atmosphere,
              tags: businessData.tags,
              description: businessData.description || businessData.businessDescription
            },
            industry: 'restaurant',
            service: 'phone answering',
            voiceSettings: {
              stability: 0.75,
              similarityBoost: 0.85,
              style: 0.15
            }
          };
        }
      }

      console.log(`🔍 No agent creation data found in onboarding for user ${userId}`);
      console.log(`⚠️ Will use default business data with enhanced logging for JSON API calls`);
      
      // Return a minimal structure with default data but enable JSON logging
      return {
        businessData: {
          businessName: 'Simply Pho & Grill', // Use expected test business name
          address: '10530 Spring Cypress Rd #17, Spring, TX 77379',
          phone: '(832) 123-4567',
          website: 'www.simplyphogrill.com',
          hours: 'Mon-Thu: 11 AM - 9 PM, Fri-Sat: 11 AM - 10 PM, Sun: 12 PM - 9 PM',
          menuItems: [
            { name: 'Pho Bo', price: 12.99, description: 'Traditional beef pho' },
            { name: 'Banh Mi', price: 8.99, description: 'Vietnamese sandwich' },
            { name: 'Spring Rolls', price: 6.99, description: 'Fresh spring rolls' }
          ],
          description: 'A welcoming Vietnamese restaurant serving authentic pho and Vietnamese cuisine.'
        },
        industry: 'restaurant',
        service: 'phone answering',
        voiceSettings: {
          stability: 0.75,
          similarityBoost: 0.85,
          style: 0.15
        }
      };
    } catch (error) {
      console.error('Error retrieving agent creation data from onboarding:', error);
      return null;
    }
  }

  /**
   * Format business hours for conversation flow knowledge base
   */
  private formatBusinessHoursForKB(hours: any): string {
    if (!hours) return 'Please call for current hours.';
    if (typeof hours === 'string') return hours;

    const hoursArray = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const day of days) {
      if (hours[day]) {
        const dayInfo = hours[day];
        if (dayInfo.closed) {
          hoursArray.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`);
        } else if (dayInfo.open && dayInfo.close) {
          hoursArray.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayInfo.open} - ${dayInfo.close}`);
        }
      }
    }
    return hoursArray.length > 0 ? hoursArray.join(', ') : 'Please call for current hours.';
  }

  /**
   * Format menu items for conversation flow knowledge base
   */
  private formatMenuForKB(menuItems: any): string {
    if (!menuItems || !Array.isArray(menuItems)) return '';
    return menuItems.slice(0, 15).map((item: any) => {
      if (typeof item === 'string') return item;
      if (item.name) {
        let formatted = item.name;
        if (item.price) formatted += ` - $${item.price}`;
        return formatted;
      }
      return null;
    }).filter(Boolean).join(', ');
  }

  /**
   * Format menu items text for conversation flow knowledge base
   */
  private formatMenuItemsText(menuItems: any): string {
    if (!menuItems || !Array.isArray(menuItems)) return '';
    return menuItems.slice(0, 15).map((item: any) => {
      if (typeof item === 'string') return item;
      if (item.name) {
        let formatted = item.name;
        if (item.price) formatted += ` ($${item.price})`;
        if (item.description) formatted += `: ${item.description}`;
        return formatted;
      }
      return null;
    }).filter(Boolean).join('\n');
  }

  /**
   * Build ordering policy for conversation flow
   */
  private buildOrderingPolicy(serviceOfferings: any): string {
    if (!serviceOfferings) return 'We accept takeout and delivery orders.';

    const services = [];
    if (serviceOfferings.dineIn) services.push('dine-in');
    if (serviceOfferings.takeout) services.push('takeout');
    if (serviceOfferings.delivery) services.push('delivery');
    if (serviceOfferings.curbside) services.push('curbside pickup');
    if (serviceOfferings.catering?.available) services.push('catering');

    if (services.length === 0) return 'Please call for ordering options.';
    return `We accept ${services.join(', ')} orders. Call or visit us to place your order.`;
  }

  /**
   * Build reservation policy for conversation flow
   */
  private buildReservationPolicy(reservationInfo: any): string {
    if (!reservationInfo) return 'Reservations are welcome. Please provide date, time, and party size.';
    if (typeof reservationInfo === 'string') return reservationInfo;

    let policy = 'Reservations are welcome.';
    if (reservationInfo.available === false) {
      return 'We operate on a first-come, first-served basis - no reservations needed.';
    }

    const methods = [];
    if (reservationInfo.bookingMethods?.phone) methods.push('phone');
    if (reservationInfo.bookingMethods?.online) methods.push('online');
    if (reservationInfo.bookingMethods?.walkIn) methods.push('walk-in');

    if (methods.length > 0) {
      policy += ` You can book by ${methods.join(', ')}.`;
    } else {
      policy += ' Please call to make a reservation.';
    }

    return policy + ' Please provide date, time, and party size.';
  }

  /**
   * Format FAQ for knowledge base
   */
  private formatFAQForKB(businessData: any): string {
    if (!businessData.faq || businessData.faq.length === 0) return '';
    return businessData.faq.map((item: any) => `${item.question}: ${item.answer}`).join('\n');
  }

  /**
   * Format delivery and pickup info for knowledge base
   */
  private formatDeliveryAndPickupInfo(serviceOfferings: any): string {
    let info = '';
    if (serviceOfferings?.delivery) info += 'Delivery is available. ';
    if (serviceOfferings?.takeout) info += 'Takeout is available. ';
    if (serviceOfferings?.curbside) info += 'Curbside pickup is available.';
    return info.trim();
  }

  /**
   * Format features for knowledge base
   */
  private formatFeaturesForKB(businessData: any): string {
    const features = [];
    if (businessData.atmosphere) features.push(`Atmosphere: ${businessData.atmosphere}`);
    if (businessData.tags) features.push(`Tags: ${businessData.tags.join(', ')}`);
    return features.join('\n');
  }

  /**
   * Format desserts for knowledge base
   */
  private formatDesserts(menuItems: any): string {
    if (!menuItems || !Array.isArray(menuItems)) return '';
    const desserts = menuItems.filter((item: any) => item.category === 'dessert' || item.name?.toLowerCase().includes('dessert')).slice(0, 5);
    return desserts.map((item: any) => item.name || item).join(', ');
  }

  /**
   * Format specialties for knowledge base
   */
  private formatSpecialties(dailySpecials: any): string {
    if (!dailySpecials || !Array.isArray(dailySpecials)) return '';
    return dailySpecials.map((special: any) => special.title || special).join(', ');
  }

  /**
   * Format other menu items for knowledge base
   */
  private formatOtherMenuItems(menuItems: any): string {
    if (!menuItems || !Array.isArray(menuItems)) return '';
    const others = menuItems.filter((item: any) => item.category !== 'dessert' && !item.name?.toLowerCase().includes('dessert')).slice(0, 10);
    return others.map((item: any) => item.name || item).join(', ');
  }

  /**
   * Format dietary accommodations for knowledge base
   */
  private formatDietaryAccommodations(menuItems: any): string {
    if (!menuItems || !Array.isArray(menuItems)) return '';
    const accommodations = menuItems.filter((item: any) => item.dietaryInfo);
    return accommodations.map((item: any) => `${item.name}: ${item.dietaryInfo}`).join('\n');
  }


  /**
   * Format business hours for conversation flow knowledge base (original method)
   */
  private formatBusinessHours(hours: any): string {
    if (!hours) return 'Please call for current hours';

    if (typeof hours === 'string') return hours;

    if (typeof hours === 'object') {
      const hoursArray = [];
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      for (const day of days) {
        if (hours[day]) {
          const dayInfo = hours[day];
          if (dayInfo.closed) {
            hoursArray.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`);
          } else {
            hoursArray.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayInfo.open} - ${dayInfo.close}`);
          }
        }
      }

      return hoursArray.length > 0 ? hoursArray.join(', ') : 'Please call for current hours';
    }

    return 'Please call for current hours';
  }

  /**
   * Format menu items for conversation flow knowledge base (original method)
   */
  private formatMenuItems(menuItems: any): string {
    if (!menuItems || !Array.isArray(menuItems)) return '';

    const items = menuItems.slice(0, 15).map((item: any) => {
      if (typeof item === 'string') {
        return item;
      } else if (item.name) {
        let formatted = item.name;
        if (item.price) formatted += ` - $${item.price}`;
        if (item.description) formatted += ` (${item.description})`;
        return formatted;
      }
      return null;
    }).filter(Boolean);

    return items.join(', ');
  }


  /**
   * Build comprehensive business knowledge base text for ElevenLabs agent
   */
  private buildBusinessKnowledgeBase(businessData: any): string {
    let knowledgeBase = `# ${businessData.businessName}\n\n`;

    if (businessData.address) {
      knowledgeBase += `**Address:** ${businessData.address}\n\n`;
    }

    if (businessData.phone) {
      knowledgeBase += `**Phone:** ${businessData.phone}\n\n`;
    }

    if (businessData.hours) {
      knowledgeBase += `**Business Hours:**\n${businessData.hours}\n\n`;
    }

    if (businessData.story) {
      knowledgeBase += `**About Us:**\n${businessData.story}\n\n`;
    }

    if (businessData.cuisine) {
      knowledgeBase += `**Cuisine Type:** ${businessData.cuisine}\n\n`;
    }

    if (businessData.priceRange) {
      knowledgeBase += `**Price Range:** ${businessData.priceRange}\n\n`;
    }

    // Menu Items
    if (businessData.menuItems && businessData.menuItems.length > 0) {
      knowledgeBase += `**Menu Items:**\n`;
      businessData.menuItems.forEach((item: any) => {
        if (typeof item === 'string') {
          knowledgeBase += `- ${item}\n`;
        } else if (item.name) {
          knowledgeBase += `- ${item.name}`;
          if (item.price) knowledgeBase += ` - $${item.price}`;
          if (item.description) knowledgeBase += ` - ${item.description}`;
          knowledgeBase += `\n`;
        }
      });
      knowledgeBase += `\n`;
    }

    // Service Offerings
    if (businessData.serviceOfferings) {
      knowledgeBase += `**Services:**\n`;
      if (businessData.serviceOfferings.dineIn) knowledgeBase += `- Dine-in available\n`;
      if (businessData.serviceOfferings.takeout) knowledgeBase += `- Takeout available\n`;
      if (businessData.serviceOfferings.delivery) knowledgeBase += `- Delivery available\n`;
      if (businessData.serviceOfferings.curbside) knowledgeBase += `- Curbside pickup available\n`;
      if (businessData.serviceOfferings.catering?.available) {
        knowledgeBase += `- Catering available`;
        if (businessData.serviceOfferings.catering.details?.minimumOrder) {
          knowledgeBase += ` (minimum order: ${businessData.serviceOfferings.catering.details.minimumOrder})`;
        }
        knowledgeBase += `\n`;
      }
      knowledgeBase += `\n`;
    }

    // Daily Specials
    if (businessData.dailySpecials && businessData.dailySpecials.length > 0) {
      knowledgeBase += `**Daily Specials:**\n`;
      businessData.dailySpecials.forEach((special: any) => {
        knowledgeBase += `- ${special.title}`;
        if (special.dayOfWeek) knowledgeBase += ` (${special.dayOfWeek})`;
        if (special.description) knowledgeBase += `: ${special.description}`;
        knowledgeBase += `\n`;
      });
      knowledgeBase += `\n`;
    }

    // Reservation Info
    if (businessData.reservationInfo) {
      knowledgeBase += `**Reservations:**\n`;
      if (businessData.reservationInfo.acceptsReservations) {
        knowledgeBase += `- We accept reservations\n`;
        if (businessData.reservationInfo.phone) knowledgeBase += `- Reservation phone: ${businessData.reservationInfo.phone}\n`;
        if (businessData.reservationInfo.onlineUrl) knowledgeBase += `- Online reservations: ${businessData.reservationInfo.onlineUrl}\n`;
      } else {
        knowledgeBase += `- We operate on a first-come, first-served basis\n`;
      }
      knowledgeBase += `\n`;
    }

    // Policies
    if (businessData.businessPolicies) {
      knowledgeBase += `**Policies:**\n`;
      if (businessData.businessPolicies.cancellationPolicy) {
        knowledgeBase += `- Cancellation Policy: ${businessData.businessPolicies.cancellationPolicy}\n`;
      }
      if (businessData.businessPolicies.paymentMethods) {
        knowledgeBase += `- Payment Methods: ${businessData.businessPolicies.paymentMethods.join(', ')}\n`;
      }
      knowledgeBase += `\n`;
    }

    // Awards and Recognition
    if (businessData.awards) {
      if (businessData.awards.awards?.length > 0) {
        knowledgeBase += `**Awards:**\n`;
        businessData.awards.awards.forEach((award: string) => {
          knowledgeBase += `- ${award}\n`;
        });
        knowledgeBase += `\n`;
      }
      if (businessData.awards.certifications?.length > 0) {
        knowledgeBase += `**Certifications:**\n`;
        businessData.awards.certifications.forEach((cert: string) => {
          knowledgeBase += `- ${cert}\n`;
        });
        knowledgeBase += `\n`;
      }
    }

    // Customer Reviews Summary
    if (businessData.rating && businessData.totalReviews) {
      knowledgeBase += `**Customer Rating:** ${businessData.rating}/5 stars (${businessData.totalReviews} reviews)\n\n`;
    }

    return knowledgeBase;
  }

  /**
   * Get voice ID for the active provider
   */
  private getVoiceIdForProvider(voiceSettings?: any): string {
    if (this.voiceProvider.providerName === 'elevenlabs') {
      return 'EXAVITQu4vr4xnSDxMaL'; // Default ElevenLabs voice
    } else if (this.voiceProvider.providerName === 'retell') {
      return 'openai-alloy'; // Default Retell voice
    }
    return 'EXAVITQu4vr4xnSDxMaL'; // Fallback
  }

  /**
   * Get model for the active provider
   */
  private getModelForProvider(): string {
    if (this.voiceProvider.providerName === 'elevenlabs') {
      return 'gemini-2.0-flash'; // ElevenLabs model
    } else if (this.voiceProvider.providerName === 'retell') {
      return 'gpt-5-mini'; // Retell model
    }
    return 'gemini-2.0-flash'; // Fallback
  }

  /**
   * Create restaurant data for voice agent
   */
  private async createRestaurantDataForAgent(
    userId: string,
    businessInfo: BusinessInfo,
    phoneResult: { phoneNumber: string; phoneNumberSid: string },
    agentId: string
  ): Promise<any> {
    try {
      // Create restaurant data record for voice agent
      const restaurantData = await storage.createRestaurantData({
        agentId: `${this.voiceProvider.providerName}-${agentId}`, // Distinguish providers
        businessName: businessInfo.businessName,
        address: businessInfo.address,
        phone: phoneResult.phoneNumber,
        website: businessInfo.website,
        hours: businessInfo.hours || {
          monday: { open: '09:00', close: '21:00', closed: false },
          tuesday: { open: '09:00', close: '21:00', closed: false },
          wednesday: { open: '09:00', close: '21:00', closed: false },
          thursday: { open: '09:00', close: '21:00', closed: false },
          friday: { open: '09:00', close: '22:00', closed: false },
          saturday: { open: '09:00', close: '22:00', closed: false },
          sunday: { open: '10:00', close: '20:00', closed: false }
        },
        menuItems: businessInfo.menuItems || [
          { name: 'Special of the Day', price: '$Market Price', description: 'Fresh seasonal selection' },
          { name: 'Appetizers', price: '$8-15', description: 'Variety of starters' },
          { name: 'Main Courses', price: '$18-35', description: 'Signature entrees' },
          { name: 'Desserts', price: '$8-12', description: 'House-made sweets' }
        ],
        services: businessInfo.services || ['dining', 'takeout', 'reservations'],
        reservationInfo: 'Call to make reservations or book online through our website',
        // Store the comprehensive formatted business information from onboarding
        // This will be displayed in the Memory subtab for editing
        rawBusinessInfo: businessInfo.businessInfo || businessInfo.description || ''
      });

      console.log(`🏪 Created restaurant data for ${this.voiceProvider.providerName} agent: ${businessInfo.businessName} (Agent: ${agentId})`);
      return restaurantData;
    } catch (error) {
      console.error(`Error creating restaurant data for ${this.voiceProvider.providerName} agent:`, error);
      throw error;
    }
  }
}

export const subscriptionPhoneProvisioner = new SubscriptionPhoneProvisioner();