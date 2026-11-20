import twilio from 'twilio';
import { twilioService } from './twilioService';
import { RetellProvider } from './RetellProvider';
import { storage } from '../storage';
import { resolveBaseUrl, getWebhookUrls } from '../utils/baseUrlResolver';
import type { 
  PhoneNumberAssignment, 
  InsertPhoneNumberAssignment,
  RestaurantData,
  UserSubscription
} from '../../shared/schema';

interface BusinessData {
  businessName: string;
  businessAddress?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface PhoneProvisioningResult {
  success: boolean;
  phoneNumber?: string;
  phoneNumberSid?: string;
  retellAgentId?: string;
  emergencyAddressSid?: string;
  assignment?: PhoneNumberAssignment;
  error?: string;
}

export class IntegratedPhoneProvisioner {
  private retellProvider: RetellProvider;

  constructor() {
    this.retellProvider = new RetellProvider();
  }

  /**
   * Clear ALL data when reassigning a phone number to a new user
   * This ensures the new user starts with a completely clean slate
   * Deletes data from both Twilio and our database
   */
  private async clearCallDataForPhoneNumber(phoneNumber: string): Promise<void> {
    try {
      console.log(`🧹 COMPREHENSIVE DATA CLEANUP for phone number: ${phoneNumber}`);
      console.log(`⚠️ This will delete ALL call history, SMS messages, customer data, and recordings`);

      // Get the existing assignment to find associated user ID
      const assignment = await storage.getPhoneNumberAssignmentByNumber(phoneNumber);
      const userId = assignment?.userId;

      if (!assignment) {
        console.log('ℹ️ No existing assignment found, but will still clean up orphaned data');
      } else {
        console.log(`📋 Found existing assignment for user: ${userId}`);
      }

      // Step 1: Delete all Twilio data (calls, messages, recordings)
      console.log('🗑️ Step 1/3: Deleting data from Twilio...');
      try {
        const twilioResults = await twilioService.deleteAllTwilioDataForPhoneNumber(phoneNumber);
        console.log(`✅ Twilio cleanup complete:`);
        console.log(`   - ${twilioResults.calls.deleted} call records deleted`);
        console.log(`   - ${twilioResults.messages.deleted} message records deleted`);
        console.log(`   - ${twilioResults.recordings.deleted} recordings deleted`);
      } catch (twilioError: any) {
        console.warn(`⚠️ Twilio cleanup failed (non-critical): ${twilioError.message}`);
        // Continue with database cleanup even if Twilio cleanup fails
      }

      // Step 2: Delete all database data
      console.log('🗑️ Step 2/3: Deleting data from database...');
      try {
        const dbResults = await storage.deleteAllDataForPhoneNumber(phoneNumber, userId);
        console.log(`✅ Database cleanup complete:`);
        console.log(`   - ${dbResults.telephonyCallLogs} telephony call logs`);
        console.log(`   - ${dbResults.smsMessages} SMS messages`);
        console.log(`   - ${dbResults.callSessions} call sessions`);
        console.log(`   - ${dbResults.callOutcomes} call outcomes`);
        console.log(`   - ${dbResults.orderCallLinks} order links`);
        console.log(`   - ${dbResults.reservationCallLinks} reservation links`);
        console.log(`   - ${dbResults.customerProfiles} customer profiles`);
        console.log(`   - ${dbResults.customerMemories} customer memories`);
        console.log(`   - ${dbResults.callMetricsDaily} daily metrics`);

        const totalDbDeleted = Object.values(dbResults).reduce((sum, count) => sum + count, 0);
        console.log(`   📊 Total database records deleted: ${totalDbDeleted}`);
      } catch (dbError: any) {
        console.error(`❌ Database cleanup failed: ${dbError.message}`);
        // Don't throw - we want to continue with provisioning even if cleanup partially fails
      }

      // Step 3: Delete legacy call logs (old format)
      console.log('🗑️ Step 3/3: Cleaning up legacy call logs...');
      if (assignment && assignment.restaurantId) {
        try {
          const restaurantData = await storage.getRestaurantDataById(assignment.restaurantId);
          if (restaurantData && restaurantData.agentId) {
            await storage.deleteCallLogsForAgent(restaurantData.agentId);
            console.log(`✅ Cleared legacy call logs for agent: ${restaurantData.agentId}`);
          }
        } catch (legacyError: any) {
          console.warn(`⚠️ Legacy cleanup failed (non-critical): ${legacyError.message}`);
        }
      }

      console.log(`✅✅✅ COMPREHENSIVE CLEANUP COMPLETE for ${phoneNumber}`);
      console.log(`🔒 This phone number is now clean and ready for the new user`);
    } catch (error: any) {
      console.error(`❌ Error during comprehensive cleanup:`, error);
      // Don't throw - cleanup failure shouldn't block provisioning
      // The new user might see some old data, but provisioning will still succeed
    }
  }

  /**
   * Complete provisioning flow: Create emergency address -> Purchase phone -> Connect to Retell agent -> Store assignment
   */
  async provisionPhoneWithEmergencyAddress(options: {
    userId: string;
    subscriptionId: string;
    businessData: BusinessData;
    retellAgentId: string;
    restaurantId?: string;
    areaCode?: string;
    phoneNumberType?: 'local' | 'toll-free';
    subaccountSid?: string;
    subaccountAuthToken?: string;
  }): Promise<PhoneProvisioningResult> {
    const { userId, subscriptionId, businessData, retellAgentId, restaurantId, areaCode, phoneNumberType = 'local', subaccountSid, subaccountAuthToken } = options;

    // If subaccount credentials are provided, create a dedicated Twilio client for that subaccount
    const subaccountClient = (subaccountSid && subaccountAuthToken)
      ? twilio(subaccountSid, subaccountAuthToken)
      : null;

    if (subaccountClient) {
      console.log(`🏦 Using Twilio subaccount ${subaccountSid} for phone provisioning`);
    }

    console.log(`🚀 Starting integrated phone provisioning for agent ${retellAgentId}`);
    console.log(`📊 Business: ${businessData.businessName}`);
    console.log(`👤 User: ${userId}, Subscription: ${subscriptionId}`);

    try {
      // Step 1: Create emergency address from business data
      console.log('🏢 Step 1: Creating emergency address...');
      let emergencyAddress = null;
      let skipPhoneProvisioning = false;

      try {
        if (subaccountClient) {
          // Use subaccount client directly for emergency address creation
          emergencyAddress = await this.createEmergencyAddressWithClient(subaccountClient, businessData);
        } else {
          emergencyAddress = await twilioService.createEmergencyAddressFromBusiness(businessData);
        }
        console.log(`✅ Emergency address created: ${emergencyAddress.sid}`);
      } catch (addressError: any) {
        console.warn(`⚠️ Emergency address creation failed: ${addressError.message}`);
        console.log('📋 Proceeding with phone provisioning WITHOUT emergency address. User can complete address later from dashboard.');
        try {
          await this.storeIncompleteAddressForCompletion(userId, subscriptionId, businessData, retellAgentId);
        } catch (storeError: any) {
          console.warn(`⚠️ Could not store incomplete address data: ${storeError.message}`);
        }
        // emergencyAddress remains null - phone provisioning ALWAYS continues without it
      }

      // Step 2: Check for available phone numbers to reassign before purchasing new ones
      // Skip reassignment when using a subaccount — reassigned numbers live in the parent account
      // and cannot be moved to a subaccount. Each subaccount always gets a fresh number.
      console.log('🔄 Step 2: Checking for available phone numbers to reassign...');
      let phoneNumber = null;
      let isReassigned = false;

      if (subaccountClient) {
        console.log('🏦 Subaccount mode — skipping reassignment check. Will purchase a fresh number in the subaccount.');
      } else {
        try {
          const reassignmentResult = await this.tryReassignAvailablePhoneNumber({
            userId,
            subscriptionId,
            restaurantId,
            emergencyAddressSid: emergencyAddress?.sid,
            businessName: businessData.businessName
          });

          if (reassignmentResult.success) {
            phoneNumber = reassignmentResult.phoneNumber;
            isReassigned = true;
            console.log(`✅ Successfully reassigned phone number: ${phoneNumber.phoneNumber}`);
          } else {
            console.log(`ℹ️ No available phone numbers to reassign: ${reassignmentResult.reason}`);
          }
        } catch (reassignError: any) {
          console.warn(`⚠️ Phone reassignment check failed: ${reassignError.message}`);
          // Continue to purchase new number if reassignment fails
        }
      }

      // Step 3: If no phone number was reassigned, purchase a new one from Twilio
      if (!phoneNumber) {
        console.log('📞 Step 3: All existing phone numbers are taken - purchasing new phone number from Twilio...');
        console.log('💡 This is expected behavior when your account grows - Twilio will automatically provision a new number');

        try {
          phoneNumber = await this.searchAndPurchaseNumberWithEmergencyAddress({
            emergencyAddressSid: emergencyAddress?.sid,
            areaCode,
            phoneNumberType,
            friendlyName: `${businessData.businessName} AI Receptionist`,
            subaccountClient
          });

          if (!phoneNumber || !phoneNumber.phoneNumber) {
            throw new Error('Twilio API returned invalid phone number data');
          }

          console.log(`✅ NEW PHONE NUMBER PURCHASED: ${phoneNumber.phoneNumber} (SID: ${phoneNumber.sid})`);
          console.log(`💰 Monthly cost: $${phoneNumberType === 'toll-free' ? '2.00' : '1.00'} (automatically added to Twilio bill)`);
        } catch (purchaseError: any) {
          console.error('❌ Failed to purchase new phone number from Twilio:', purchaseError);
          throw new Error(
            `Failed to purchase new phone number from Twilio: ${purchaseError.message}. ` +
            `Please check: (1) Twilio account is not in trial mode, (2) Twilio account has sufficient credit, ` +
            `(3) TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are valid production credentials`
          );
        }
      }

      // Step 4: Connect phone number to Retell AI agent
      console.log('🤖 Step 4: Connecting phone number to Retell AI agent...');
      const connection = await this.retellProvider.connectAgentToPhoneNumber(retellAgentId, phoneNumber.phoneNumber);
      
      if (!connection.success) {
        console.warn(`⚠️ Failed to connect to Retell AI: ${connection.error}, but phone number was purchased successfully`);
        // Don't throw error here - phone number was still purchased and can be connected later
      } else {
        console.log(`✅ Phone number connected to Retell AI agent`);
      }

      // Step 5: Calculate monthly cost (basic estimation)
      const monthlyCost = phoneNumberType === 'toll-free' ? 200 : 100; // $2.00 for toll-free, $1.00 for local (in cents)

      // Step 6: Store phone number assignment in database (if not already created during reassignment)
      console.log('💾 Step 6: Storing phone number assignment...');
      let assignment;
      
      if (isReassigned) {
        // For reassigned numbers, the assignment already exists and was updated
        assignment = await storage.getPhoneNumberAssignmentByNumber(phoneNumber.phoneNumber);
      } else {
        // For newly purchased numbers, create a new assignment
        const assignmentData: InsertPhoneNumberAssignment = {
          userId,
          subscriptionId,
          restaurantId,
          twilioPhoneNumberSid: phoneNumber.sid,
          phoneNumber: phoneNumber.phoneNumber,
          phoneNumberType,
          monthlyCost,
          status: 'active'
        };

        assignment = await storage.createPhoneNumberAssignment(assignmentData);
      }
      
      // Update assignment with Retell AI details if connection was successful
      if (connection.success && assignment.id) {
        const updatedAssignment = await storage.updatePhoneNumberAssignment(assignment.id, {
          retellAgentId,
          retellEnabled: true,
          voiceProvider: 'retell'
        });
        console.log(`✅ Phone number assignment stored and updated with Retell AI details`);
        
        return {
          success: true,
          phoneNumber: phoneNumber.phoneNumber,
          phoneNumberSid: phoneNumber.sid,
          retellAgentId,
          emergencyAddressSid: emergencyAddress?.sid,
          assignment: updatedAssignment
        };
      } else {
        console.log(`✅ Phone number assignment stored (Retell AI connection pending)`);
        
        return {
          success: true,
          phoneNumber: phoneNumber.phoneNumber,
          phoneNumberSid: phoneNumber.sid,
          retellAgentId,
          emergencyAddressSid: emergencyAddress?.sid,
          assignment,
          error: connection.success ? undefined : `Retell AI connection failed: ${connection.error}`
        };
      }

    } catch (error: any) {
      console.error('❌ Integrated phone provisioning failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create an emergency address in a Twilio subaccount using the subaccount client directly.
   * Handles basic address parsing since we cannot call twilioService methods with a foreign client.
   */
  private async createEmergencyAddressWithClient(client: twilio.Twilio, business: BusinessData): Promise<any> {
    const street = business.street || '';
    const city = business.city || '';
    const region = business.state || '';
    const postalCode = business.zipCode || '';

    if (!street || !city || !region || !postalCode) {
      throw new Error(`Incomplete address data for subaccount emergency address: street="${street}", city="${city}", state="${region}", zip="${postalCode}"`);
    }

    const address = await client.addresses.create({
      customerName: business.businessName,
      street,
      city,
      region,
      postalCode,
      isoCountry: business.country || 'US',
      emergencyEnabled: true,
      autoCorrectAddress: true
    });

    return {
      sid: address.sid,
      customerName: address.customerName,
      street: address.street,
      city: address.city,
      region: address.region,
      postalCode: address.postalCode
    };
  }

  /**
   * Search and purchase phone number with emergency address
   */
  private async searchAndPurchaseNumberWithEmergencyAddress(options: {
    emergencyAddressSid?: string;
    areaCode?: string;
    phoneNumberType?: 'local' | 'toll-free';
    friendlyName?: string;
    subaccountClient?: twilio.Twilio | null;
  }): Promise<any> {
    const { emergencyAddressSid, areaCode, phoneNumberType = 'local', friendlyName, subaccountClient } = options;

    try {
      // Configure webhook URLs
      const baseUrl = resolveBaseUrl();
      const webhookUrls = getWebhookUrls(baseUrl);

      const purchaseConfig: any = {
        voiceUrl: webhookUrls.voiceUrl,
        smsUrl: webhookUrls.smsUrl,
        statusCallback: webhookUrls.statusCallback,
        friendlyName: friendlyName || 'AI Receptionist'
      };

      if (emergencyAddressSid) {
        purchaseConfig.emergencyAddressSid = emergencyAddressSid;
        console.log(`🔗 Purchasing with emergency address SID: ${emergencyAddressSid}`);
      } else {
        console.log('📞 Purchasing phone number without emergency address (address incomplete)');
      }

      let purchasedNumber: any;

      if (subaccountClient) {
        // Twilio pattern: search via parent account (full visibility), purchase via subaccount client
        // Subaccounts sometimes return empty availablePhoneNumbers lists for new accounts,
        // so always search from the parent account and purchase into the subaccount.
        console.log(`🔍 Searching for available ${phoneNumberType} phone numbers via parent account for subaccount assignment...`);

        let availableNumbers = await twilioService.searchAvailablePhoneNumbers({
          areaCode,
          type: phoneNumberType,
          smsEnabled: true,
          voiceEnabled: true,
          limit: 10
        });

        if (availableNumbers.length === 0 && areaCode) {
          console.log(`🔍 No numbers found with area code ${areaCode}, retrying without area code restriction...`);
          availableNumbers = await twilioService.searchAvailablePhoneNumbers({
            type: phoneNumberType,
            smsEnabled: true,
            voiceEnabled: true,
            limit: 10
          });
        }

        if (availableNumbers.length === 0) {
          throw new Error(`No available ${phoneNumberType} phone numbers found`);
        }

        const selectedNumber = availableNumbers[0].phoneNumber;
        console.log(`✨ Selected number for subaccount: ${selectedNumber}`);

        try {
          const bought = await subaccountClient.incomingPhoneNumbers.create({
            phoneNumber: selectedNumber,
            voiceUrl: purchaseConfig.voiceUrl,
            voiceMethod: 'POST',
            smsUrl: purchaseConfig.smsUrl,
            smsMethod: 'POST',
            statusCallback: purchaseConfig.statusCallback,
            friendlyName: purchaseConfig.friendlyName,
            ...(emergencyAddressSid && { emergencyAddressSid })
          });

          purchasedNumber = {
            sid: bought.sid,
            phoneNumber: bought.phoneNumber,
            friendlyName: bought.friendlyName,
            voiceUrl: bought.voiceUrl,
            smsUrl: bought.smsUrl,
            statusCallback: bought.statusCallback,
            dateCreated: bought.dateCreated
          };
          console.log(`✅ NEW PHONE NUMBER PURCHASED IN SUBACCOUNT: ${purchasedNumber.phoneNumber} (SID: ${purchasedNumber.sid})`);
        } catch (subaccountPurchaseError: any) {
          console.warn(`⚠️ Subaccount purchase failed: ${subaccountPurchaseError.message}. Falling back to parent account purchase.`);
          purchasedNumber = await twilioService.purchasePhoneNumber(
            selectedNumber,
            purchaseConfig
          );
          console.log(`✅ NEW PHONE NUMBER PURCHASED (parent account fallback): ${purchasedNumber.phoneNumber} (SID: ${purchasedNumber.sid})`);
        }
      } else {
        // Fall back to the parent account via twilioService
        console.log(`🔍 Searching for available ${phoneNumberType} phone numbers...`);
        const availableNumbers = await twilioService.searchAvailablePhoneNumbers({
          areaCode,
          type: phoneNumberType,
          smsEnabled: true,
          voiceEnabled: true,
          limit: 10
        });

        if (availableNumbers.length === 0) {
          throw new Error(`No available ${phoneNumberType} phone numbers found`);
        }

        const selectedNumber = availableNumbers[0];
        console.log(`✨ Selected number: ${selectedNumber.phoneNumber}`);

        purchasedNumber = await twilioService.purchasePhoneNumber(
          selectedNumber.phoneNumber,
          purchaseConfig
        );
        console.log(`✅ NEW PHONE NUMBER PURCHASED: ${purchasedNumber.phoneNumber} (SID: ${purchasedNumber.sid})`);
      }

      // Explicitly enable SMS on the purchased number
      try {
        console.log(`📱 Explicitly enabling SMS on newly purchased number ${purchasedNumber.phoneNumber}...`);
        if (subaccountClient) {
          await subaccountClient.incomingPhoneNumbers(purchasedNumber.sid).update({
            smsUrl: purchaseConfig.smsUrl,
            smsMethod: 'POST'
          });
        } else {
          await twilioService.updatePhoneNumberConfiguration(purchasedNumber.sid, {
            ...purchaseConfig,
            enableSMS: true
          });
        }
        console.log(`✅ SMS capability explicitly enabled on ${purchasedNumber.phoneNumber}`);
      } catch (smsEnableError: any) {
        console.error(`⚠️ Warning: Failed to explicitly enable SMS on ${purchasedNumber.phoneNumber}:`, smsEnableError.message);
        // Don't throw - the number was still purchased successfully
      }

      // Add newly purchased number to Twilio Messaging Service (parent account only)
      if (!subaccountClient) {
        try {
          console.log(`📨 Adding ${purchasedNumber.phoneNumber} to Twilio Messaging Service...`);
          const msgServiceSid = await twilioService.ensurePhoneInMessagingService(
            purchasedNumber.sid,
            friendlyName || 'AI Receptionist'
          );
          if (msgServiceSid) {
            console.log(`✅ Phone number registered in Messaging Service: ${msgServiceSid}`);
          }
        } catch (msgSvcError: any) {
          console.warn(`⚠️ Could not add phone to Messaging Service (non-critical): ${msgSvcError.message}`);
        }
      }

      return purchasedNumber;

    } catch (error: any) {
      console.error('❌ Error purchasing phone number with emergency address:', error);
      throw error;
    }
  }

  /**
   * Get phone number assignment for user
   */
  async getUserPhoneNumberAssignment(userId: string): Promise<PhoneNumberAssignment | null> {
    try {
      const phoneNumbers = await storage.getUserPhoneNumbers(userId);
      return phoneNumbers.length > 0 ? phoneNumbers[0] : null;
    } catch (error) {
      console.error('❌ Error getting user phone number assignment:', error);
      return null;
    }
  }

  /**
   * Update phone number assignment with Retell AI details
   */
  async updateAssignmentWithRetellAgent(assignmentId: string, retellAgentId: string): Promise<PhoneNumberAssignment | null> {
    try {
      console.log(`🔄 Updating assignment ${assignmentId} with Retell agent ${retellAgentId}`);
      
      const updatedAssignment = await storage.updatePhoneNumberAssignment(assignmentId, {
        retellAgentId,
        retellEnabled: true,
        voiceProvider: 'retell'
      });

      console.log(`✅ Assignment updated with Retell AI details`);
      return updatedAssignment;

    } catch (error) {
      console.error('❌ Error updating assignment with Retell agent:', error);
      return null;
    }
  }

  /**
   * Connect existing phone number to new Retell AI agent
   */
  async connectExistingPhoneToRetellAgent(phoneNumber: string, retellAgentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📞 Connecting existing phone ${phoneNumber} to Retell agent ${retellAgentId}`);
      
      const connection = await this.retellProvider.connectAgentToPhoneNumber(retellAgentId, phoneNumber);
      
      if (connection.success) {
        // Find and update the assignment in database by phone number
        // We'll need to get all phone assignments and find by number since we don't have getUserId
        console.log(`📊 Finding assignment for phone number ${phoneNumber}...`);
        
        // For now, we'll log success but won't update the database assignment here
        // The caller should handle updating the assignment separately
        console.log(`✅ Phone number ${phoneNumber} connected to Retell agent ${retellAgentId}`);
      }

      return connection;

    } catch (error: any) {
      console.error('❌ Error connecting existing phone to Retell agent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Try to reassign an available phone number instead of purchasing a new one
   * Priority order: 1) Twilio numbers without webhooks, 2) Available generic numbers from storage
   * CRITICAL: Only reassign numbers that are truly orphaned or inactive - NEVER steal from active users
   */
  private async tryReassignAvailablePhoneNumber(options: {
    userId: string;
    subscriptionId: string;
    restaurantId?: string;
    emergencyAddressSid?: string;
    businessName: string;
  }): Promise<{
    success: boolean;
    phoneNumber?: any;
    reason?: string;
  }> {
    const { userId, subscriptionId, restaurantId, emergencyAddressSid, businessName } = options;

    try {
      console.log('🔍 Searching for available phone numbers to reassign...');

      // PRIORITY 1: Check for cleanest phone numbers (no webhooks AND no emergency address)
      console.log('🎯 Priority 1: Checking for cleanest phone numbers (no webhooks AND no emergency address)...');
      try {
        const cleanestNumbers = await twilioService.findPhoneNumbersWithoutWebhooksAndAddress();

        if (cleanestNumbers.length > 0) {
          // Check each number to find one that's truly available (not assigned to an active user)
          for (const number of cleanestNumbers) {
            console.log(`🔍 Checking if ${number.phoneNumber} is truly available...`);

            // Check if this number has a database assignment
            const existingAssignment = await storage.getPhoneNumberAssignmentByNumber(number.phoneNumber);

            // CRITICAL: Only use this number if it's NOT assigned to an active user/subscription
            if (existingAssignment && existingAssignment.status === 'active' && existingAssignment.subscriptionId) {
              console.log(`⚠️ Number ${number.phoneNumber} is assigned to active user ${existingAssignment.userId}, SKIPPING (will not steal from active users)`);
              continue; // Skip this number, try the next one
            }

            // This number is safe to use (either no assignment, or inactive)
            console.log(`✨ Found truly available cleanest phone number: ${number.phoneNumber} (SID: ${number.sid})`);

            if (existingAssignment) {
              console.log(`🔄 Number ${number.phoneNumber} exists in database but is inactive, reassigning to user ${userId}`);

              // Clear all call data before reassigning
              await this.clearCallDataForPhoneNumber(number.phoneNumber);

              // Update the existing assignment to the new user/subscription
              const updatedAssignment = await storage.updatePhoneNumberAssignment(existingAssignment.id, {
                userId,
                subscriptionId: subscriptionId || null,
                restaurantId: restaurantId || null,
                status: 'active'
              });

              console.log(`✅ Updated existing assignment for ${number.phoneNumber} to new user ${userId}`);
            } else {
              console.log(`💾 Number ${number.phoneNumber} has no database assignment, will create new one`);
            }

            // Determine phone number type and cost based on number format
            const isToLLFree = number.phoneNumber.startsWith('+1800') ||
                              number.phoneNumber.startsWith('+1888') ||
                              number.phoneNumber.startsWith('+1877') ||
                              number.phoneNumber.startsWith('+1866') ||
                              number.phoneNumber.startsWith('+1855') ||
                              number.phoneNumber.startsWith('+1844') ||
                              number.phoneNumber.startsWith('+1833') ||
                              number.phoneNumber.startsWith('+1822');

            const phoneNumberType = isToLLFree ? 'toll-free' : 'local';
            const monthlyCost = isToLLFree ? 200 : 100;

            // Update Twilio phone number configuration with webhooks (and emergency address if available)
            const baseUrl = resolveBaseUrl();
            const webhookUrls = getWebhookUrls(baseUrl);

            const updateConfig: any = {
              voiceUrl: webhookUrls.voiceUrl,
              smsUrl: webhookUrls.smsUrl,
              statusCallback: webhookUrls.statusCallback,
              friendlyName: `${businessName} AI Receptionist`
            };
            if (emergencyAddressSid) updateConfig.emergencyAddressSid = emergencyAddressSid;

            console.log(`🔄 Configuring cleanest number ${number.phoneNumber} (${phoneNumberType}) with webhooks${emergencyAddressSid ? ' and emergency address' : ''}...`);

            await twilioService.updatePhoneNumberConfiguration(number.sid, {
              ...updateConfig,
              enableSMS: true
            });
            console.log(`✅ Cleanest number configured successfully with SMS enabled: ${number.phoneNumber}`);

            // If no existing assignment, create one
            if (!existingAssignment) {
              const assignmentData: any = {
                userId,
                subscriptionId,
                restaurantId: restaurantId || null,
                twilioPhoneNumberSid: number.sid,
                phoneNumber: number.phoneNumber,
                phoneNumberType,
                monthlyCost,
                status: 'active'
              };

              console.log(`💾 Creating phone number assignment in storage for cleanest number (${phoneNumberType})...`);
              await storage.createPhoneNumberAssignment(assignmentData);
            }

            return {
              success: true,
              phoneNumber: {
                phoneNumber: number.phoneNumber,
                sid: number.sid
              }
            };
          }

          console.log('ℹ️ All cleanest phone numbers are assigned to active users, checking priority 2...');
        } else {
          console.log('ℹ️ No cleanest phone numbers found, checking priority 2...');
        }
      } catch (cleanestError: any) {
        console.warn(`⚠️ Error checking for cleanest numbers: ${cleanestError.message}`);
      }
      
      // PRIORITY 2: Check for existing Twilio phone numbers without webhooks (but may have emergency address)
      console.log('🎯 Priority 2: Checking Twilio account for phone numbers without webhooks (may need cleanup)...');
      try {
        const numbersWithoutWebhooks = await twilioService.findPhoneNumbersWithoutWebhooks();

        if (numbersWithoutWebhooks.length > 0) {
          // Check each number to find one that's truly available (not assigned to an active user)
          for (const number of numbersWithoutWebhooks) {
            console.log(`🔍 Checking if ${number.phoneNumber} is truly available...`);

            // Check if this number has a database assignment
            const existingAssignment = await storage.getPhoneNumberAssignmentByNumber(number.phoneNumber);

            // CRITICAL: Only use this number if it's NOT assigned to an active user/subscription
            if (existingAssignment && existingAssignment.status === 'active' && existingAssignment.subscriptionId) {
              console.log(`⚠️ Number ${number.phoneNumber} is assigned to active user ${existingAssignment.userId}, SKIPPING (will not steal from active users)`);
              continue; // Skip this number, try the next one
            }

            // This number is safe to use (either no assignment, or inactive)
            console.log(`📞 Found truly available Twilio number without webhooks: ${number.phoneNumber} (SID: ${number.sid})`);

            // WIPE ALL EXISTING DATA - make it like brand new
            if (number.emergencyAddressSid || number.friendlyName) {
              console.log(`🧹 Number has existing data, wiping it clean first...`);
              await twilioService.wipePhoneNumberConfiguration(number.sid);
            }

            if (existingAssignment) {
              console.log(`🔄 Number ${number.phoneNumber} exists in database but is inactive, reassigning to user ${userId}`);

              // Clear all call data before reassigning
              await this.clearCallDataForPhoneNumber(number.phoneNumber);

              // Update the existing assignment to the new user/subscription
              const updatedAssignment = await storage.updatePhoneNumberAssignment(existingAssignment.id, {
                userId,
                subscriptionId: subscriptionId || null,
                restaurantId: restaurantId || null,
                status: 'active'
              });

              console.log(`✅ Updated existing assignment for ${number.phoneNumber} to new user ${userId}`);
            } else {
              // No existing assignment, create a new one
              console.log(`💾 Creating new assignment for ${number.phoneNumber}...`);
            }


            // Determine phone number type and cost based on number format
            const isToLLFree = number.phoneNumber.startsWith('+1800') ||
                              number.phoneNumber.startsWith('+1888') ||
                              number.phoneNumber.startsWith('+1877') ||
                              number.phoneNumber.startsWith('+1866') ||
                              number.phoneNumber.startsWith('+1855') ||
                              number.phoneNumber.startsWith('+1844') ||
                              number.phoneNumber.startsWith('+1833') ||
                              number.phoneNumber.startsWith('+1822');

            const phoneNumberType = isToLLFree ? 'toll-free' : 'local';
            const monthlyCost = isToLLFree ? 200 : 100;

            // Update Twilio phone number configuration with webhooks (and emergency address if available)
            const baseUrl = resolveBaseUrl();
            const webhookUrls = getWebhookUrls(baseUrl);

            const updateConfig: any = {
              voiceUrl: webhookUrls.voiceUrl,
              smsUrl: webhookUrls.smsUrl,
              statusCallback: webhookUrls.statusCallback,
              friendlyName: `${businessName} AI Receptionist`
            };
            if (emergencyAddressSid) updateConfig.emergencyAddressSid = emergencyAddressSid;

            console.log(`🔄 Configuring wiped number ${number.phoneNumber} (${phoneNumberType}) with new webhooks${emergencyAddressSid ? ' and emergency address' : ''}...`);

            // Update the phone number in Twilio with new settings and enable SMS
            await twilioService.updatePhoneNumberConfiguration(number.sid, {
              ...updateConfig,
              enableSMS: true
            });
            console.log(`✅ Wiped number configured successfully with SMS enabled: ${number.phoneNumber}`);

            // If no existing assignment, create one
            if (!existingAssignment) {
              const assignmentData: any = {
                userId,
                subscriptionId,
                restaurantId: restaurantId || null,
                twilioPhoneNumberSid: number.sid,
                phoneNumber: number.phoneNumber,
                phoneNumberType,
                monthlyCost,
                status: 'active'
              };

              console.log(`💾 Creating phone number assignment in storage for wiped number (${phoneNumberType})...`);
              await storage.createPhoneNumberAssignment(assignmentData);
            }

            // Return the phone number info in the same format as a newly purchased number
            return {
              success: true,
              phoneNumber: {
                phoneNumber: number.phoneNumber,
                sid: number.sid
              }
            };
          }

          console.log('ℹ️ All Twilio phone numbers without webhooks are assigned to active users, checking priority 3...');
        } else {
          console.log('ℹ️ No Twilio phone numbers without webhooks found, checking priority 3...');
        }
      } catch (twilioError: any) {
        console.warn(`⚠️ Error checking Twilio numbers without webhooks: ${twilioError.message}`);
        // Continue to fallback approach
      }
      
      // PRIORITY 3: Find available phone numbers from storage (fallback)
      console.log('🎯 Priority 3: Checking storage for available generic phone numbers...');
      const availableNumbers = await storage.findAvailableGenericPhoneNumbers();

      if (availableNumbers.length === 0) {
        console.log('❌ No available phone numbers found in any priority - all existing numbers are assigned to active users');
        return {
          success: false,
          reason: 'No available phone numbers found for reassignment (all existing numbers are assigned to active users). Need to purchase a new phone number.'
        };
      }

      // CRITICAL: Iterate through all available numbers to find one that's truly available
      // Even though the query should filter correctly, this is a defensive measure
      let selectedAssignment = null;

      for (const number of availableNumbers) {
        console.log(`🔍 Checking if ${number.phoneNumber} is truly available...`);

        // Double-check that this number is actually available (not assigned to active subscription)
        if (number.status === 'active' && number.subscriptionId) {
          console.log(`⚠️ Number ${number.phoneNumber} appears available but has active subscription ${number.subscriptionId}, SKIPPING`);
          continue; // Skip this number, try the next one
        }

        // This number is safe to use
        selectedAssignment = number;
        console.log(`✅ Found truly available generic number for reassignment: ${selectedAssignment.phoneNumber}`);
        break;
      }

      // If no truly available number was found after checking all
      if (!selectedAssignment) {
        console.log('❌ All numbers in storage have active subscriptions - cannot reassign any');
        return {
          success: false,
          reason: 'All numbers in storage have active subscriptions. Need to purchase a new phone number.'
        };
      }

      // Reassign the phone number to the new user/subscription
      const reassignedAssignment = await storage.reassignPhoneNumberToUser(
        selectedAssignment.id,
        userId,
        subscriptionId,
        restaurantId || null
      );

      // Update Twilio phone number configuration with new emergency address and webhooks
      const baseUrl = resolveBaseUrl();
      const webhookUrls = getWebhookUrls(baseUrl);
      
      const updateConfig = {
        voiceUrl: webhookUrls.voiceUrl,
        smsUrl: webhookUrls.smsUrl,
        statusCallback: webhookUrls.statusCallback,
        emergencyAddressSid: emergencyAddressSid,
        friendlyName: `${businessName} AI Receptionist`
      };

      console.log(`🔄 Updating Twilio configuration for reassigned generic number ${selectedAssignment.phoneNumber} with SMS enabled`);
      
      // Update the phone number in Twilio with new settings and enable SMS
      if (selectedAssignment.twilioPhoneNumberSid) {
        await twilioService.updatePhoneNumberConfiguration(selectedAssignment.twilioPhoneNumberSid, {
          ...updateConfig,
          enableSMS: true  // Enable SMS messaging for Retell AI
        });
        console.log(`✅ Twilio configuration updated with SMS enabled for ${selectedAssignment.phoneNumber}`);
      }

      // Return the phone number info in the same format as a newly purchased number
      return {
        success: true,
        phoneNumber: {
          phoneNumber: selectedAssignment.phoneNumber,
          sid: selectedAssignment.twilioPhoneNumberSid
        }
      };

    } catch (error: any) {
      console.error('❌ Error during phone number reassignment:', error);
      return {
        success: false,
        reason: `Reassignment failed: ${error.message}`
      };
    }
  }

  /**
   * Store incomplete address information for dashboard completion
   */
  private async storeIncompleteAddressForCompletion(
    userId: string, 
    subscriptionId: string, 
    businessData: BusinessData, 
    retellAgentId: string
  ): Promise<void> {
    try {
      // Create a record that tracks incomplete provisioning
      const incompleteRecord = {
        userId,
        subscriptionId,
        businessName: businessData.businessName,
        businessAddress: businessData.businessAddress || '',
        street: businessData.street || '',
        city: businessData.city || '',
        state: businessData.state || '',
        zipCode: businessData.zipCode || '',
        country: businessData.country || 'US',
        retellAgentId,
        status: 'address_incomplete',
        createdAt: new Date(),
        requiresUserAction: true
      };

      console.log('📋 Storing incomplete address record for dashboard completion:', incompleteRecord);

      // Store in business settings or a dedicated incomplete provisioning table
      // For now, we'll use business settings to store this information
      await storage.upsertBusinessSettings({
        userId: userId, // ✅ CRITICAL: userId must be in the settings object, not a separate parameter
        addressCompletionRequired: true,
        incompleteAddressData: JSON.stringify(incompleteRecord),
        subscriptionId: subscriptionId,
        retellAgentId: retellAgentId
      });

      console.log('💾 Incomplete address record stored successfully');
    } catch (error) {
      console.error('❌ Error storing incomplete address record:', error);
      // Don't throw - this is a nice-to-have feature
    }
  }
}

export const integratedPhoneProvisioner = new IntegratedPhoneProvisioner();