import { twilioService } from './twilioService';
import { twilioISVService } from './twilioISVService';
import { RetellProvider } from './RetellProvider';
import { IntegratedPhoneProvisioner } from './integratedPhoneProvisioner';
import { storage } from '../storage';
import { VoiceAgentConfig } from '../interfaces/VoiceAgentProvider';
import { analyzeBusinessWebsite, formatAIAnalysisForMemory, detectMultipleLocations } from './websiteAnalysisService';

export interface BusinessInfo {
  businessName: string;
  industry: string;
  physicalAddress: string;
  phoneNumber: string;
  website: string;
  email: string;
  services: {
    dineIn: boolean;
    takeout: boolean;
    delivery: boolean;
    catering: boolean;
    reservations: boolean;
    curbsidePickup: boolean;
    driveThru: boolean;
  };
  businessHours: any;
  menuSource: string;
  menuText: string;
  menuWebsite: string;
  popularItems: string;
  dietaryOptions: string;
  specialsPromotions: string;
  commonQuestions: string;
  allergiesAccessibility: string;
  reservationPolicy: string;
  maxPartySize: number;
  deliveryRadius: number;
  peakHours: string;
  ambiance: string;
  interactionStyle: string;
  // Additional business settings...
}

export interface ProvisioningResult {
  success: boolean;
  twilioPhoneNumber?: string;
  twilioPhoneSid?: string;
  retellAgentId?: string;
  conversationFlowId?: string;
  knowledgeBaseId?: string;
  sipTrunkingSid?: string;
  emergencyAddressSid?: string;
  error?: string;
  warnings?: string[];
  knowledgeBaseStatus?: 'ready' | 'failed' | 'pending';
}

export class SubscriptionProvisioningService {
  private retellProvider: RetellProvider;
  private phoneProvisioner: IntegratedPhoneProvisioner;

  constructor() {
    this.retellProvider = new RetellProvider(storage);
    this.phoneProvisioner = new IntegratedPhoneProvisioner();
  }

  /**
   * Complete subscription provisioning flow using Dashboard agent creation workflow
   * 1. Extract business data with OpenAI
   * 2. Generate industry-specific AI prompt
   * 3. Load custom functions and post-call analysis for industry
   * 4. Create Retell AI agent FIRST (without KB)
   * 5. Create knowledge base AFTER agent
   * 6. Connect KB to agent
   * 7. Use IntegratedPhoneProvisioner for complete phone setup with SIP trunking
   * 8. Save to voice_agents and restaurantData tables
   */
  async provisionSubscription(
    userId: string,
    subscriptionId: string,
    businessInfoText: string
  ): Promise<ProvisioningResult> {
    try {
      console.log(`🚀 Starting automated subscription provisioning for user ${userId}`);

      // Atomic check and begin provisioning if idle (concurrency-safe)
      const provisioningAttempt = await storage.beginProvisioningIfIdle(subscriptionId);
      
      if (!provisioningAttempt.success) {
        if (provisioningAttempt.alreadyCompleted) {
          console.log(`✅ Provisioning already completed for subscription ${subscriptionId}`);
          // Return stored results instead of just success
          const storedResults = await storage.getProvisioningResults(subscriptionId);
          if (storedResults) {
            return {
              success: true,
              ...storedResults
            };
          }
          return { success: true, error: 'Already provisioned but no stored results' };
        }
        
        if (provisioningAttempt.alreadyInProgress) {
          console.log(`⏳ Provisioning already in progress for subscription ${subscriptionId}`);
          return { success: false, error: 'Provisioning already in progress' };
        }
        
        console.log(`❌ Could not begin provisioning for subscription ${subscriptionId}, status: ${provisioningAttempt.currentStatus}`);
        return { success: false, error: `Cannot begin provisioning, current status: ${provisioningAttempt.currentStatus}` };
      }

      console.log(`🔒 Successfully acquired provisioning lock for subscription ${subscriptionId}`);

      // Check for existing partial results to resume from
      const existingResults = await storage.getProvisioningResults(subscriptionId);
      let knowledgeBaseId = existingResults?.knowledgeBaseId;
      let conversationFlowId = existingResults?.conversationFlowId;
      let retellAgentId = existingResults?.retellAgentId;
      let retellLlmId = existingResults?.retellLlmId; // LLM ID for knowledge base updates
      let voiceAgentDbId = existingResults?.voiceAgentDbId;
      let twilioSubaccountSid = existingResults?.twilioSubaccountSid;
      let twilioSubaccountAuthToken = existingResults?.twilioSubaccountAuthToken;
      let retellFolderId = existingResults?.retellFolderId;

      const warnings: string[] = [];
      let knowledgeBaseStatus: 'ready' | 'failed' | 'pending' = 'pending';

      // Step 1: Extract business data with OpenAI (if not already extracted)
      let extractedData: any;
      let businessName: string;
      let industry: string;
      let address: string;
      let phone: string;
      let email: string;
      let website: string;
      let hours: string;
      let services: string = '';
      let description: string = '';

      if (!retellAgentId) {
        console.log('🔍 Extracting business information with OpenAI...');
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const extractionPrompt = `Extract and structure the following business information. Return a JSON object with these fields:
- business_name: The business name
- industry: MUST be ONE of these exact values: "restaurant", "salon", "hotel", "medical", "auto", "barbershop", "fitness", "veterinary", "real-estate", "medical-spa", "pet-daycare", "home-service", "education", "gym", "dentist". Choose the CLOSEST match to the business type.
- address: Full physical address
- phone: Phone number
- email: Email address (if mentioned)
- website: Website URL (if mentioned)
- hours: Business hours
- services: List of services offered
- description: Brief business description

Business Information:
${businessInfoText}

CRITICAL: The "industry" field MUST be one of the 16 exact values listed above. Do not create custom industry names.
Return ONLY valid JSON, no markdown formatting.`;

        const extractionResponse = await openai.chat.completions.create({
          model: 'gpt-5-nano',
          messages: [{ role: 'user', content: extractionPrompt }],
          response_format: { type: "json_object" }
        });

        extractedData = JSON.parse(extractionResponse.choices[0].message.content || '{}');
        console.log('✅ Extracted business data:', JSON.stringify(extractedData, null, 2));

        // Detect insufficient data: if 3+ of the key fields are missing, use the general fallback
        const insufficientFields = [
          !extractedData.phone,
          !extractedData.address,
          !extractedData.services || String(extractedData.services).length < 10,
          !extractedData.description || String(extractedData.description).length < 20,
        ].filter(Boolean).length;
        const usedGeneralFallback = insufficientFields >= 3;

        if (usedGeneralFallback) {
          console.log('⚠️ Insufficient business data detected — applying General Professional Services fallback');
        }

        // Use extracted data with fallbacks and type safety
        businessName = extractedData.business_name || 'Your Business';
        industry = extractedData.industry || 'professional-services';
        // CRITICAL: Ensure address is a string, not an object or other type
        address = (typeof extractedData.address === 'string' ? extractedData.address : '') || '';
        phone = extractedData.phone || '';
        email = extractedData.email || '';
        website = extractedData.website || '';
        hours = extractedData.hours || 'Monday–Friday: 9:00 AM – 5:00 PM';
        services = extractedData.services || (usedGeneralFallback ? 'Consultations, Client Services, Professional Support' : '');
        description = extractedData.description || (usedGeneralFallback ? 'A professional services business dedicated to helping clients with their needs.' : '');

        // Store fallback flag for post-provisioning notification
        (this as any)._usedGeneralFallback = usedGeneralFallback;

        console.log(`📝 Business: ${businessName}`);
        console.log(`🎯 Industry: ${industry}`);
        console.log(`📍 Address: ${address}`);
        console.log(`📞 Phone: ${phone || '(none)'}`);
      }

      // Step 2: Generate industry-specific AI prompt with OpenAI (if not already generated)
      let aiPrompt: string;

      if (!retellAgentId) {
        console.log('🤖 Generating AI prompt with OpenAI...');
        const { OpenAIPromptService } = await import('./openAIPromptService');
        aiPrompt = await OpenAIPromptService.generatePromptForAgent({
          businessName: businessName!,
          industry: industry!,
          businessInfo: businessInfoText || '',
          address: address!,
          phone: phone!,
          website: website!,
          hours: hours!
        });
        console.log(`✅ Generated AI prompt (${aiPrompt.length} characters)`);
      }

      // Step 3: Get industry-specific custom functions and post-call analysis (if not already loaded)
      let customFunctions: any[];
      let postCallAnalysis: any;

      if (!retellAgentId) {
        console.log('⚙️ Loading custom functions for industry...');
        const { getCustomFunctionsForIndustry, getPostCallAnalysisForIndustry, normalizeIndustryName } = await import('../../shared/retellFunctionsConfig');
        const normalizedIndustry = normalizeIndustryName(industry!);
        console.log(`🔄 Industry normalization: "${industry}" → "${normalizedIndustry}"`);

        customFunctions = getCustomFunctionsForIndustry(industry!);
        postCallAnalysis = getPostCallAnalysisForIndustry(industry!);
        console.log(`✅ Loaded ${customFunctions.length} custom functions for ${industry}`);
      }

      // Step 3a: Create Twilio subaccount named after this business (if not already created)
      if (!twilioSubaccountSid && businessName) {
        try {
          console.log(`🏦 Creating Twilio subaccount for: ${businessName}`);
          const subaccount = await twilioISVService.createClientSubaccount({
            friendlyName: businessName
          });
          twilioSubaccountSid = subaccount.sid;
          twilioSubaccountAuthToken = subaccount.authToken;
          await storage.updateTwilioSubaccount(subscriptionId, twilioSubaccountSid, twilioSubaccountAuthToken);
          console.log(`✅ Twilio subaccount created: ${twilioSubaccountSid}`);
        } catch (subaccountError: any) {
          console.warn(`⚠️ Twilio subaccount creation failed (non-critical): ${subaccountError.message}`);
          warnings.push(`Twilio subaccount creation failed: ${subaccountError.message}. Using parent account.`);
        }
      } else if (twilioSubaccountSid) {
        console.log(`♻️ Reusing existing Twilio subaccount: ${twilioSubaccountSid}`);
      }

      // Step 3b: Retell AI does not expose a folder management API (confirmed against SDK v4.47
      // and official docs). Agents are identified by their agent_name which already encodes
      // the business name, so no folder step is needed.

      // Step 4: Create conversation flow FIRST (required by Retell before KB or agent creation)
      // Track additional location agents for later DB persistence
      const additionalLocationAgents: Array<{ locationName: string; locationAddress: string; retellAgentId: string; conversationFlowId: string }> = [];

      if (!conversationFlowId && !retellAgentId) {
        console.log('🗣️ Creating conversation flow with industry-specific configuration...');

        // Detect multiple locations from the website URL
        let allLocations: Array<{ name?: string; address: string }> = [{ address: address! }];
        if (website) {
          try {
            console.log(`🏢 Detecting multiple locations from website: ${website}`);
            const locationsResult = await detectMultipleLocations(website);
            if (locationsResult.success && locationsResult.locations.length > 1) {
              console.log(`✅ Found ${locationsResult.locations.length} locations on website`);
              allLocations = locationsResult.locations;
              // Use the primary location's address for the main agent
              const primaryLocation = locationsResult.locations.find(l => l.isPrimary) || locationsResult.locations[0];
              if (primaryLocation?.address) {
                console.log(`📍 Using primary location for AI receptionist: ${primaryLocation.address}`);
                address = primaryLocation.address;
              }
            } else {
              console.log(`📍 Single location business (or could not detect multiple)`);
            }
          } catch (locError: any) {
            console.warn(`⚠️ Location detection failed (non-critical): ${locError.message}`);
          }
        }

        // Create ONE conversation flow for the primary location only.
        // Multi-location businesses get a single voicebot trained on the primary location.
        // Per Retell requirements: flows must be created WITHOUT a knowledge base ID.
        const primaryLocation = allLocations[0];
        const primaryAddress = primaryLocation.address || address!;
        const primaryName = businessName!;

        const businessInfoForFlow = {
          businessName: primaryName,
          name: primaryName,
          industry: industry!,
          website: website!,
          phoneNumber: phone!,
          phone: phone!,
          physicalAddress: primaryAddress,
          businessAddress: primaryAddress,
          address: primaryAddress,
          email: email!,
          businessHours: hours!,
          services: services || '',
          description: description || businessInfoText || ''
        };

        try {
          // Pass undefined for knowledgeBaseId — Retell requires conversation flow
          // to be created before the knowledge base is attached.
          const conversationFlow = await this.retellProvider.createConversationFlow(
            businessInfoForFlow as any,
            undefined,
            userId,
            industry!
          );

          conversationFlowId = conversationFlow.id;
          await storage.updateConversationFlowId(subscriptionId, conversationFlowId);
          console.log(`✅ Conversation flow created for primary location: ${conversationFlowId}`);
          if (allLocations.length > 1) {
            console.log(`ℹ️ Multi-location business (${allLocations.length} locations) — single voicebot created for primary location: ${primaryAddress}`);
          }
        } catch (cfError: any) {
          throw new Error(`Conversation flow creation failed: ${(cfError as Error).message}`);
        }

        // Verify we obtained a valid primary conversation flow ID
        if (!conversationFlowId) {
          throw new Error('Valid conversation_flow_id is required for agent creation — cannot proceed');
        }
      } else if (conversationFlowId) {
        console.log(`♻️ Reusing existing conversation flow: ${conversationFlowId} — rebuilding nodes with latest template`);
        // Only rebuild if we extracted business data during this run (i.e. retellAgentId was not set)
        if (businessName && industry) {
          try {
            const businessInfoForRebuild = {
              businessName: businessName,
              name: businessName,
              industry: industry,
              website: website || '',
              phoneNumber: phone || '',
              phone: phone || '',
              physicalAddress: address || '',
              businessAddress: address || '',
              address: address || '',
              email: email || '',
              businessHours: hours || '',
              services: services || '',
              description: description || businessInfoText || ''
            };
            await this.retellProvider.rebuildConversationFlowNodes(
              conversationFlowId,
              businessInfoForRebuild as any,
              knowledgeBaseId,
              industry
            );
          } catch (rebuildError: any) {
            console.warn(`⚠️ Could not rebuild conversation flow nodes (non-critical): ${rebuildError.message}`);
            warnings.push(`Conversation flow update failed: ${rebuildError.message}`);
          }
        } else {
          console.log(`ℹ️ Skipping conversation flow rebuild — business data not available in this run`);
        }
      }

      // Step 5: Create knowledge base AFTER conversation flow (soft fail — agent works without it)
      if (!knowledgeBaseId) {
        console.log('📚 Creating Retell AI knowledge base with business information...');
        try {
          const businessInfoForKB = {
            businessName: businessName!,
            phoneNumber: phone!,
            physicalAddress: address!,
            email: email!,
            website: website!,
            industry: industry!,
            services: services!,
            menuText: '',
            businessHours: hours!,
            popularItems: '',
            dietaryOptions: '',
            businessInfo: businessInfoText || '',
            description: businessInfoText || ''
          };

          const knowledgeBase = await this.retellProvider.createKnowledgeBase(businessInfoForKB as any);
          if (!knowledgeBase || !knowledgeBase.id) {
            throw new Error('Knowledge base creation returned null or invalid response');
          }
          knowledgeBaseId = knowledgeBase.id;
          knowledgeBaseStatus = 'ready';

          // Persist immediately for recovery
          await storage.updateKnowledgeBaseId(subscriptionId, knowledgeBaseId);
          console.log(`✅ Knowledge base created: ${knowledgeBaseId}`);

          // Attach the knowledge base to the conversation flow now that both exist
          if (conversationFlowId) {
            try {
              await this.retellProvider.linkKnowledgeBaseToConversationFlow(conversationFlowId, knowledgeBaseId);
            } catch (linkError: any) {
              console.warn(`⚠️ Could not link knowledge base to conversation flow (non-critical): ${linkError.message}`);
            }
          }

        } catch (kbError: any) {
          console.warn(`⚠️ Knowledge base creation failed (non-critical): ${kbError.message}`);
          knowledgeBaseStatus = 'failed';
          warnings.push(`Knowledge base creation failed: ${kbError.message}. Agent will work with limited context.`);
          knowledgeBaseId = undefined;
        }
      } else {
        console.log(`♻️ Reusing existing knowledge base: ${knowledgeBaseId}`);
        knowledgeBaseStatus = 'ready';
      }

      // Step 6: Create primary Retell agent linked to conversation flow (or legacy LLM fallback)
      if (!retellAgentId) {
        console.log('📞 Creating Retell agent with industry-specific configuration...');
        if (knowledgeBaseId) {
          console.log(`🔗 Agent will be created with knowledge base ${knowledgeBaseId} already linked`);
        }

        const agentConfig = {
          businessName: businessName!,
          businessAddress: address!,
          phoneNumber: phone!,
          businessPhone: phone!, // Backward compatibility
          businessHours: hours!,
          menu: [],
          orderingPolicy: 'Orders accepted by phone',
          reservationPolicy: 'Reservations recommended',
          faq: [],
          voiceId: '11labs-Hailey',
          model: 'gpt-5.1',
          language: 'en-US',
          knowledgeBase: aiPrompt!,
          industry: industry as any,
          customFunctions: customFunctions!,
          postCallAnalysis: postCallAnalysis!,
          ...(conversationFlowId && { conversationFlowId })
        };

        const retellAgent = await this.retellProvider.createAgent(agentConfig, userId, knowledgeBaseId, industry as any);
        retellAgentId = retellAgent.id;
        retellLlmId = retellAgent.llmId; // Capture LLM ID for future updates

        // Persist immediately for recovery
        await storage.updateRetellAgentId(subscriptionId, retellAgentId);
        console.log(`✅ Retell agent created: ${retellAgentId}`);
        if (retellLlmId) {
          console.log(`✅ Retell LLM ID captured: ${retellLlmId}`);
        }
        if (knowledgeBaseId) {
          console.log(`✅ Knowledge base ${knowledgeBaseId} is now linked to agent's LLM ${retellLlmId}`);
        }
      } else {
        console.log(`♻️ Reusing existing agent: ${retellAgentId}`);
      }

      // Step 7: Provision phone number using IntegratedPhoneProvisioner
      console.log('📱 Provisioning phone number...');

      // Parse address to extract components - handles multi-location businesses
      const extractAddressComponents = (addr: any) => {
        // CRITICAL: Validate that addr is actually a string
        if (!addr || typeof addr !== 'string') {
          console.warn('⚠️ Address is not a string, received:', typeof addr, addr);
          return {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'US'
          };
        }

        if (!addr.trim()) {
          return {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'US'
          };
        }

        let address = addr.trim();

        // CRITICAL: Handle multi-location businesses (addresses separated by semicolons)
        // Take only the FIRST location for emergency address
        if (address.includes(';')) {
          console.log('📍 Multi-location business detected, using first location only');
          const locations = address.split(';').map(loc => loc.trim()).filter(Boolean);
          if (locations.length > 0) {
            address = locations[0];
            console.log(`✅ Using first location: ${address}`);
          }
        }

        // Try multiple parsing strategies
        const parts = address.split(',').map(p => p.trim());

        // Strategy 1: Full format "Street, City, State Zip"
        if (parts.length >= 3) {
          const lastPart = parts[parts.length - 1];
          const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/i);

          if (stateZipMatch) {
            return {
              street: parts[0],
              city: parts[parts.length - 2],
              state: stateZipMatch[1].toUpperCase(),
              zipCode: stateZipMatch[2],
              country: 'US'
            };
          }
        }

        // Strategy 2: "Street, City State Zip"
        if (parts.length === 2) {
          const secondPart = parts[1];
          const cityStateZipMatch = secondPart.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);

          if (cityStateZipMatch) {
            return {
              street: parts[0],
              city: cityStateZipMatch[1].trim(),
              state: cityStateZipMatch[2].toUpperCase(),
              zipCode: cityStateZipMatch[3],
              country: 'US'
            };
          }
        }

        // Strategy 3: Incomplete - extract what we can
        console.warn('⚠️ Could not fully parse address, extracting partial components:', address);
        const lastPart = parts[parts.length - 1];
        const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5}(-\d{4})?)?/i);

        return {
          street: parts[0] || '',
          city: parts.length > 1 ? parts[1] : '',
          state: stateZipMatch ? stateZipMatch[1].toUpperCase() : '',
          zipCode: stateZipMatch && stateZipMatch[2] ? stateZipMatch[2] : '',
          country: 'US'
        };
      };

      // CRITICAL: Ensure address is a string before using it
      const safeAddress = typeof address === 'string' ? address : '';
      const addressComponents = extractAddressComponents(safeAddress);

      const phoneProvisioningResult = await this.phoneProvisioner.provisionPhoneWithEmergencyAddress({
        userId,
        subscriptionId,
        businessData: {
          businessName: businessName!,
          businessAddress: safeAddress,
          ...addressComponents
        },
        retellAgentId: retellAgentId!,
        areaCode: this.extractAreaCodeFromAddress(safeAddress),
        phoneNumberType: 'local',
        subaccountSid: twilioSubaccountSid,
        subaccountAuthToken: twilioSubaccountAuthToken
      });

      let phoneProvisioningStatus = 'completed';

      if (!phoneProvisioningResult.success || !phoneProvisioningResult.phoneNumber) {
        // Check if this is an address completion issue or a real failure
        if (phoneProvisioningResult.error && (phoneProvisioningResult.error.includes('incomplete address data') || phoneProvisioningResult.error.includes('cannot be validated'))) {
          console.log('📋 Phone provisioning skipped due to address issues - user can complete later');
          phoneProvisioningStatus = 'pending_address_completion';
          warnings.push('Phone provisioning pending - please complete your business address in the dashboard to get your phone number.');
        } else if (!phoneProvisioningResult.success) {
          // Phone provisioning failed - keep the Retell agent and mark phone as pending
          // The agent is still valuable even without a phone number (user can retry from dashboard)
          console.log(`⚠️ Phone provisioning failed: ${phoneProvisioningResult.error}. Keeping Retell agent, marking phone as pending.`);
          phoneProvisioningStatus = 'pending_address_completion';
          warnings.push(`Phone number setup failed: ${phoneProvisioningResult.error}. Your AI agent has been created. Please complete phone setup from your dashboard.`);
        }
      }

      console.log(`✅ Phone number provisioned: ${phoneProvisioningResult.phoneNumber || 'Pending address completion'}`);

      // Step 8: Save agent to database (voice_agents table) if not already saved
      if (!voiceAgentDbId) {
        console.log('💾 Saving agent to voice_agents table...');
        const city = addressComponents.city || 'AI Agent';
        const agentName = `${businessName} – ${city}`;

        const newAgent = await storage.createVoiceAgent({
          userId,
          name: agentName,
          description: `AI receptionist for ${businessName}`,
          industry: industry!,
          voiceId: '11labs-Hailey',
          retellAgentId: retellAgentId!,
          retellLlmId: retellLlmId,
          conversationFlowId: conversationFlowId || null,
        } as any);

        voiceAgentDbId = newAgent.id;
        console.log('✅ Agent saved to database:', voiceAgentDbId);

        // Register knowledge sources in DB so the Memory tab sidebar is populated.
        if (knowledgeBaseId) {
          try {
            // Text memory entry (business info)
            await storage.createKnowledgeSource({
              agentId: voiceAgentDbId,
              knowledgeBaseId,
              type: 'text',
              title: businessName || 'Business Information',
              status: 'ready',
            } as any);

            // Website URL entry (if provided)
            if (website) {
              await storage.createKnowledgeSource({
                agentId: voiceAgentDbId,
                knowledgeBaseId,
                type: 'url',
                url: website,
                title: `${businessName} Website`,
                autoRefresh: true,
                status: 'ready',
              } as any);
            }
            console.log(`✅ Registered ${website ? 2 : 1} knowledge source(s) in database`);
          } catch (ksError: any) {
            console.warn(`⚠️ Could not register knowledge sources in DB (non-critical): ${ksError.message}`);
          }
        }

        // Step 9: Analyze website and save business details to restaurantData table
        try {
          // Parse services - handle both string and array formats
          let servicesArray: string[] = [];
          if (services) {
            if (typeof services === 'string') {
              servicesArray = services.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(services)) {
              servicesArray = services;
            }
          }

          // Analyze website if provided to extract comprehensive business information
          let rawBusinessInfo: string | null = null;
          if (website) {
            console.log(`🔍 Analyzing website for business information: ${website}`);
            try {
              const websiteAnalysis = await analyzeBusinessWebsite(website);
              if (websiteAnalysis.success) {
                // Format AI analysis results into readable text for Memory tab
                rawBusinessInfo = formatAIAnalysisForMemory(websiteAnalysis, website);
                console.log(`✅ AI analysis complete and formatted for Memory tab (${rawBusinessInfo.length} chars)`);
              } else {
                console.warn(`⚠️ Website analysis failed: ${websiteAnalysis.error}`);
              }
            } catch (analysisError) {
              console.error('❌ Error analyzing website:', analysisError);
              // Continue without AI analysis
            }
          }

          const restaurantRecord = await storage.createRestaurantData({
            agentId: voiceAgentDbId,
            businessName: businessName!,
            address: addressComponents.street ? `${addressComponents.street}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`.trim() : (safeAddress || null),
            phone: phoneProvisioningResult.phoneNumber || phone || null,
            website: website || null,
            hours: {
              monday: { open: '09:00', close: '21:00', closed: false },
              tuesday: { open: '09:00', close: '21:00', closed: false },
              wednesday: { open: '09:00', close: '21:00', closed: false },
              thursday: { open: '09:00', close: '21:00', closed: false },
              friday: { open: '09:00', close: '22:00', closed: false },
              saturday: { open: '09:00', close: '22:00', closed: false },
              sunday: { open: '10:00', close: '20:00', closed: false }
            },
            menuItems: [],
            services: servicesArray,
            reservationInfo: 'Call to make reservations',
            rawBusinessInfo: rawBusinessInfo // Store formatted AI analysis for Memory tab
          });

          // ── Gap analysis: score the extraction and flag missing required fields ──
          try {
            const { analyzeExtractionGaps } = await import('./extractionGapAnalyzer');
            const normalizedIndustry = (industry || 'general_business').toLowerCase()
              .replace(/[_\s]/g, '-');
            const gaps = analyzeExtractionGaps(restaurantRecord, normalizedIndustry);

            await storage.updateRestaurantData(restaurantRecord.id, {
              dataConfidenceScore: gaps.confidenceScore,
              onboardingStatus: gaps.onboardingStatus,
              missingDataFields: gaps.missingFields,
            } as any);

            // Store gap analysis in setupNotification so the dashboard can read it once
            if (gaps.onboardingStatus !== 'complete') {
              await storage.updateUserSubscription(subscriptionId, {
                setupNotification: JSON.stringify({
                  type: 'gap_analysis',
                  agentId: voiceAgentDbId,
                  industry: normalizedIndustry,
                  confidenceScore: gaps.confidenceScore,
                  onboardingStatus: gaps.onboardingStatus,
                  missingFields: gaps.missingFields,
                  foundFields: gaps.foundFields,
                  prefillData: {
                    businessName: businessName!,
                    phone: phoneProvisioningResult.phoneNumber || phone || '',
                    address: addressComponents.street
                      ? `${addressComponents.street}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`.trim()
                      : (safeAddress || ''),
                    services: servicesArray.join(', '),
                    ...gaps.prefillData,
                  },
                }),
              } as any);
              console.log(`📊 Gap analysis: ${gaps.confidenceScore}% complete (${gaps.missingFields.length} missing fields). MVO modal queued.`);
            }
          } catch (gapErr: any) {
            console.warn('⚠️ Gap analysis failed (non-critical):', gapErr.message);
          }

          console.log('✅ Business data saved for agent:', voiceAgentDbId, {
            address: addressComponents.street ? `${addressComponents.street}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`.trim() : (safeAddress || null),
            phone: phoneProvisioningResult.phoneNumber || phone || null,
            servicesCount: servicesArray.length,
            hasAIAnalysis: !!rawBusinessInfo
          });
        } catch (error) {
          console.error('⚠️ Failed to create restaurant data (non-critical):', error);
          // Continue even if restaurant data creation fails
        }
      } else {
        console.log(`♻️ Agent already saved to database: ${voiceAgentDbId}`);
      }

      // Save additional location agents to the database
      if (additionalLocationAgents.length > 0) {
        console.log(`💾 Saving ${additionalLocationAgents.length} additional location agent(s) to database...`);
        for (const locAgent of additionalLocationAgents) {
          try {
            const addlDbAgent = await storage.createVoiceAgent({
              userId,
              name: locAgent.locationName,
              description: `AI receptionist for ${locAgent.locationName}`,
              industry: industry!,
              voiceId: '11labs-Hailey',
              retellAgentId: locAgent.retellAgentId,
              retellLlmId: null
            });
            // Save basic restaurant data for this location too
            try {
              await storage.createRestaurantData({
                agentId: addlDbAgent.id,
                businessName: locAgent.locationName,
                address: locAgent.locationAddress || null,
                phone: phone || null,
                website: website || null,
                hours: {
                  monday: { open: '09:00', close: '21:00', closed: false },
                  tuesday: { open: '09:00', close: '21:00', closed: false },
                  wednesday: { open: '09:00', close: '21:00', closed: false },
                  thursday: { open: '09:00', close: '21:00', closed: false },
                  friday: { open: '09:00', close: '22:00', closed: false },
                  saturday: { open: '09:00', close: '22:00', closed: false },
                  sunday: { open: '10:00', close: '20:00', closed: false }
                },
                menuItems: [],
                services: [],
                reservationInfo: 'Call to make reservations',
                rawBusinessInfo: null
              });
            } catch (rdErr) {
              console.warn(`⚠️ Failed to save restaurant data for additional location (non-critical):`, rdErr);
            }
            console.log(`✅ Additional location agent saved: ${addlDbAgent.id} (${locAgent.locationName})`);
          } catch (saveErr: any) {
            console.warn(`⚠️ Failed to save additional location agent to DB (non-critical): ${saveErr.message}`);
          }
        }
      }

      if (phoneProvisioningStatus === 'completed') {
        console.log('✅ Subscription provisioning completed successfully!');
      } else {
        console.log('⚠️ Subscription provisioning completed with phone setup pending address completion');
      }

      // Initialize business settings with call transfer enabled by default
      try {
        console.log('⚙️ Initializing business settings with call transfer enabled');
        await storage.upsertBusinessSettings({
          userId,
          enableTransfer: true,
          transferPhoneNumber: phoneProvisioningResult.phoneNumber || phone || null, // Use provisioned phone or business phone as transfer number
          acceptOrders: true,
          acceptReservations: true,
          isActive: true
        });
        console.log(`✅ Business settings initialized: transfer enabled${phoneProvisioningResult.phoneNumber || phone ? `, transfer number: ${phoneProvisioningResult.phoneNumber || phone}` : ''}`);
      } catch (error) {
        console.error('⚠️ Failed to initialize business settings (non-critical):', error);
        warnings.push('Failed to initialize business settings');
      }

      // Set one-time setup notification if general fallback was used
      if ((this as any)._usedGeneralFallback) {
        try {
          await storage.updateUserSubscription(subscriptionId, {
            setupNotification: "We couldn't find much on your site, so we set up a general professional flow for you to edit."
          } as any);
          console.log('📬 Setup notification queued for user (general fallback used)');
        } catch (notifErr: any) {
          console.warn('⚠️ Could not store setup notification (non-critical):', notifErr.message);
        }
      }

      const results: ProvisioningResult = {
        success: true,
        twilioPhoneNumber: phoneProvisioningResult.phoneNumber,
        twilioPhoneSid: phoneProvisioningResult.phoneNumberSid,
        retellAgentId: retellAgentId!,
        knowledgeBaseId: knowledgeBaseId,
        emergencyAddressSid: phoneProvisioningResult.emergencyAddressSid,
        sipTrunkingSid: phoneProvisioningResult.sipTrunkingSid,
        warnings: warnings.length > 0 ? warnings : undefined,
        knowledgeBaseStatus: knowledgeBaseStatus
      };

      // CRITICAL: Only mark as "completed" if phone was actually provisioned
      // Otherwise, mark as "pending_phone_provisioning" so user knows to complete setup
      if (phoneProvisioningStatus === 'completed' && phoneProvisioningResult.phoneNumber) {
        // Full provisioning completed - phone number assigned
        await storage.markProvisioningCompleted(subscriptionId, {
          retellAgentId: retellAgentId!,
          conversationFlowId: conversationFlowId || retellAgentId!,
          knowledgeBaseId: knowledgeBaseId,
          twilioPhoneNumber: phoneProvisioningResult.phoneNumber,
          twilioPhoneSid: phoneProvisioningResult.phoneNumberSid || '',
          sipTrunkingSid: phoneProvisioningResult.sipTrunkingSid,
          emergencyAddressSid: phoneProvisioningResult.emergencyAddressSid
        });
        console.log('💾 Provisioning results stored atomically - STATUS: completed');

        // Create default Messaging integration with all SMS-related functions
        try {
          console.log('📱 Creating default Messaging integration...');

          // All SMS-related function names from Retell AI
          const smsFunctionNames = [
            'send_sms_confirmation',
            'sms_order_confirmation',
            'sms_reservation_confirmation',
            'sms_delivery_tracking',
            'sms_alert',
            'notify_team',
            'sms_appointment_confirmation',
            'sms_modification_alert'
          ];

          await storage.createAgentIntegration({
            userId: userId,
            agentId: voiceAgentDbId!,
            name: 'Messaging',
            description: 'Send and receive text messages with customers via your business phone number',
            type: 'sms_messaging',
            status: 'connected',
            triggerFunctions: smsFunctionNames,
          });
          console.log(`✅ Default Messaging integration created with ${smsFunctionNames.length} trigger functions`);
        } catch (smsError) {
          console.error('⚠️ Failed to create default SMS integration:', smsError);
          // Don't fail the entire provisioning if SMS integration creation fails
        }
      } else {
        // Agent created but phone provisioning pending - mark as completed so user can reach dashboard
        // Phone number can be set up later from the dashboard
        await storage.markProvisioningCompleted(subscriptionId, {
          retellAgentId: retellAgentId!,
          conversationFlowId: retellAgentId!,
          knowledgeBaseId: knowledgeBaseId,
          twilioPhoneNumber: '',
          twilioPhoneSid: '',
          sipTrunkingSid: undefined,
          emergencyAddressSid: undefined
        });
        console.log('💾 Agent provisioning completed (phone pending) - STATUS: completed so user can proceed to dashboard');
      }

      return results;

    } catch (error) {
      console.error('❌ Subscription provisioning failed:', error);
      
      // Atomically mark provisioning as failed
      await storage.markProvisioningFailed(subscriptionId, error instanceof Error ? error.message : 'Unknown error occurred');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create Retell AI Knowledge Base with business information using existing provider
   */
  private async createKnowledgeBase(businessInfo: BusinessInfo): Promise<{
    success: boolean;
    knowledgeBaseId?: string;
    error?: string;
  }> {
    try {
      console.log('📚 Using existing RetellProvider to create knowledge base');
      const knowledgeBase = await this.retellProvider.createKnowledgeBase(businessInfo);

      if (!knowledgeBase || !knowledgeBase.id) {
        throw new Error('Knowledge base creation returned null or invalid response');
      }

      return {
        success: true,
        knowledgeBaseId: knowledgeBase.id
      };

    } catch (error) {
      console.error('❌ Knowledge base creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Knowledge base creation failed'
      };
    }
  }

  /**
   * Create conversation flow with business dynamic variables using existing provider
   */
  private async createConversationFlow(
    businessInfo: BusinessInfo,
    knowledgeBaseId: string
  ): Promise<{
    success: boolean;
    conversationFlowId?: string;
    error?: string;
  }> {
    try {
      console.log('🔄 Using existing RetellProvider to create conversation flow');
      const conversationFlow = await this.retellProvider.createConversationFlow(businessInfo, knowledgeBaseId, undefined, businessInfo.industry);
      
      return {
        success: true,
        conversationFlowId: conversationFlow.id
      };

    } catch (error) {
      console.error('❌ Conversation flow creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversation flow creation failed'
      };
    }
  }

  /**
   * Create Retell AI Agent using existing provider
   */
  private async createRetellAgent(
    businessInfo: BusinessInfo,
    knowledgeBaseId: string,
    conversationFlowId: string
  ): Promise<{
    success: boolean;
    retellAgentId?: string;
    error?: string;
  }> {
    try {
      console.log('🤖 Using existing RetellProvider to create agent');
      
      // Map BusinessInfo to VoiceAgentConfig format with proper typing
      const agentConfig: VoiceAgentConfig = {
        businessName: businessInfo.businessName,
        knowledgeBase: knowledgeBaseId,
        conversationFlowId: conversationFlowId,
        businessAddress: businessInfo.physicalAddress,
        businessHours: this.formatBusinessHours(businessInfo.businessHours),
        menu: businessInfo.menuText || businessInfo.popularItems,
        orderingPolicy: businessInfo.services ? 'Orders accepted' : 'No ordering',
        reservationPolicy: businessInfo.reservationPolicy,
        faq: businessInfo.commonQuestions,
        phoneNumber: businessInfo.phoneNumber,
        voiceId: "11labs-Adrian", // Default professional voice - will map to Retell voice in provider
        model: "gpt-4", // Will map to Retell model in provider
        language: "multi",
        firstMessage: `Thank you for calling ${businessInfo.businessName}. How may I help you today?`
      };

      const agent = await this.retellProvider.createAgent(agentConfig);
      
      return {
        success: true,
        retellAgentId: agent.id
      };

    } catch (error) {
      console.error('❌ Agent creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Agent creation failed'
      };
    }
  }

  /**
   * Convert BusinessInfo interface to BusinessData format expected by IntegratedPhoneProvisioner
   */
  private convertBusinessInfoToBusinessData(businessInfo: BusinessInfo): any {
    console.log(`🔄 Converting business info to business data: ${businessInfo.businessName}`);
    return {
      businessName: businessInfo.businessName,
      businessPhone: businessInfo.phoneNumber,
      businessAddress: businessInfo.physicalAddress,
      businessWebsite: businessInfo.website,
      businessEmail: businessInfo.email,
      // Additional fields to help with address search
      street: businessInfo.street,
      city: businessInfo.city, 
      state: businessInfo.state,
      zipCode: businessInfo.zipCode,
      country: businessInfo.country || 'US',
      // Business context
      industry: businessInfo.industry,
      services: businessInfo.services,
      menuText: businessInfo.menuText,
      businessHours: businessInfo.businessHours,
      popularItems: businessInfo.popularItems,
      dietaryOptions: businessInfo.dietaryOptions,
      specialsPromotions: businessInfo.specialsPromotions,
      commonQuestions: businessInfo.commonQuestions,
      reservationPolicy: businessInfo.reservationPolicy,
      maxPartySize: businessInfo.maxPartySize,
      deliveryRadius: businessInfo.deliveryRadius,
      ambiance: businessInfo.ambiance,
      interactionStyle: businessInfo.interactionStyle
    };
  }


  /**
   * Format business hours for knowledge base
   */
  private formatBusinessHours(businessHours: any): string {
    if (!businessHours) return 'Hours vary - please call for current hours';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days
      .map(day => {
        const hours = businessHours[day];
        if (!hours || !hours.isOpen) return `${day}: Closed`;
        return `${day}: ${hours.open} - ${hours.close}`;
      })
      .join('\n');
  }

  /**
   * Extract area code from business address for local phone number
   */
  private extractAreaCodeFromAddress(address: any): string {
    // Validate input is a string
    if (!address || typeof address !== 'string') {
      console.warn('⚠️ Cannot extract area code - address is not a string');
      return ''; // Return empty string if invalid
    }

    // Simple implementation - in production, use a proper geocoding service
    const stateAreaCodes: { [key: string]: string[] } = {
      'NY': ['212', '646', '917', '347'],
      'CA': ['415', '510', '650', '925'],
      'TX': ['214', '469', '972', '945'],
      'FL': ['305', '786', '954', '561'],
      // Add more state mappings as needed
    };

    // Extract state from address
    const addressParts = address.split(',');
    const state = addressParts[addressParts.length - 2]?.trim().toUpperCase();
    
    if (state && stateAreaCodes[state]) {
      return stateAreaCodes[state][0]; // Return first area code for the state
    }
    
    return '555'; // Fallback area code
  }
}