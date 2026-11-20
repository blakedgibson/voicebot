/**
 * Voice Agent Provider Interface
 * Abstracts voice agent operations to support multiple providers (ElevenLabs, Retell AI, etc.)
 */

export interface VoiceAgentConfig {
  businessName: string;
  knowledgeBase?: string;
  phoneNumber?: string;
  businessPhone?: string; // Alternative phone number property for backward compatibility
  voiceId?: string;
  model?: string;
  language?: string;
  firstMessage?: string;
  transferNumber?: string;
  // Additional business information for conversation flows
  businessAddress?: string;
  businessHours?: string;
  menu?: any;
  orderingPolicy?: string;
  reservationPolicy?: string;
  faq?: any;
  // Optional conversation flow ID for dynamic flow creation
  conversationFlowId?: string;
  // Industry-specific configuration
  industry?: string;
  customFunctions?: any[];
  postCallAnalysis?: any[];
}

export interface VoiceAgent {
  id: string;
  name: string;
  phoneNumber?: string;
  status: 'active' | 'inactive' | 'error';
  provider: 'elevenlabs' | 'retell';
  conversationFlowId?: string; // Retell Conversation Flow ID
  createdAt: Date;
  updatedAt: Date;
}

export interface CallSession {
  sessionId: string;
  agentId: string;
  phoneNumber: string;
  status: 'active' | 'ended' | 'error';
  startedAt: Date;
  endedAt?: Date;
}

export interface PhoneConnectionResult {
  success: boolean;
  phoneNumber: string;
  agentId: string;
  error?: string;
}

export interface ConversationFlow {
  id: string;
  name: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  status: 'in_progress' | 'complete' | 'failed';
}

export interface BusinessInfo {
  // Basic Business Information
  businessName: string;
  name?: string; // Alternative field name
  phoneNumber?: string;
  phone?: string; // Alternative field name
  businessAddress?: string;
  address?: string; // Alternative field name
  physicalAddress?: string; // Alternative field name
  businessHours?: string;
  operatingHours?: any; // Alternative field name (can be object or string)
  businessDescription?: string;
  businessUrls?: string[];
  industry?: string; // Industry type

  // Raw user input (exact text from Memory tab - preferred for knowledge base)
  businessInfo?: string;
  rawBusinessInfo?: string;
  description?: string;

  // Operational Details (from attached format)
  deliveryAndPickup?: string;
  reservationPolicy?: string;
  priceRange?: string;
  features?: string;
  website?: string;
  services?: any; // Services offered

  // Menu Information (from attached format)
  menu?: any;
  menuItems?: string;
  desserts?: string;
  specialties?: string;
  otherMenuItems?: string;
  dietaryAccommodations?: string;
  faq?: any; // FAQ content
  commonQuestions?: string; // Alternative field name

  // Legacy fields for backward compatibility
  orderingPolicy?: string;
}

export interface VoiceAgentProvider {
  readonly providerName: string;

  /**
   * Create a knowledge base with business information
   */
  createKnowledgeBase(business: BusinessInfo): Promise<KnowledgeBase>;

  /**
   * Check knowledge base status
   */
  getKnowledgeBaseStatus(knowledgeBaseId: string): Promise<KnowledgeBase>;

  /**
   * Create a new conversation flow with business information and knowledge base
   */
  createConversationFlow(business: BusinessInfo, knowledgeBaseId?: string, userId?: string, industry?: string): Promise<ConversationFlow>;

  /**
   * Create a new voice agent with business knowledge
   */
  createAgent(config: VoiceAgentConfig): Promise<VoiceAgent>;

  /**
   * Update an existing agent's configuration
   */
  updateAgent(agentId: string, config: Partial<VoiceAgentConfig>): Promise<VoiceAgent>;

  /**
   * Get agent details by ID
   */
  getAgent(agentId: string): Promise<VoiceAgent | null>;

  /**
   * Delete an agent
   */
  deleteAgent(agentId: string): Promise<boolean>;

  /**
   * Connect agent to a phone number
   */
  connectAgentToPhoneNumber(agentId: string, phoneNumber: string): Promise<PhoneConnectionResult>;

  /**
   * Disconnect agent from phone number
   */
  disconnectAgentFromPhoneNumber(agentId: string, phoneNumber: string): Promise<boolean>;

  /**
   * Start a call session for inbound calls
   */
  startCallSession(agentId: string, phoneNumber: string): Promise<CallSession>;

  /**
   * End a call session
   */
  endCallSession(sessionId: string): Promise<boolean>;

  /**
   * Get Twilio TwiML for handling inbound calls
   */
  getTwiMLForInboundCall(agentId: string, phoneNumber: string): Promise<string>;

  /**
   * Health check for the provider
   */
  isHealthy(): Promise<boolean>;

  /**
   * Add a custom function to an agent
   */
  addAgentCustomFunction?(
    agentId: string,
    functionData: {
      name: string;
      description: string;
      parameters: any;
      speakDuringExecution: boolean;
      speakDuringText?: string;
      speakAfterExecution: boolean;
    },
    voiceAgentData?: { id: string; retellLlmId?: string | null }
  ): Promise<void>;

  /**
   * Update a custom function for an agent
   */
  updateAgentCustomFunction?(
    agentId: string,
    functionName: string,
    functionData: {
      description?: string;
      parameters?: any;
      speakDuringExecution?: boolean;
      speakDuringText?: string;
      speakAfterExecution?: boolean;
    },
    voiceAgentData?: { id: string; retellLlmId?: string | null }
  ): Promise<void>;

  /**
   * Delete a custom function from an agent
   */
  deleteAgentCustomFunction?(
    agentId: string,
    functionName: string,
    voiceAgentData?: { id: string; retellLlmId?: string | null }
  ): Promise<void>;

  /**
   * Get custom functions for an agent
   */
  getAgentCustomFunctions?(agentId: string): Promise<any[]>;
}

export interface VoiceAgentProviderFactory {
  createProvider(providerType: 'elevenlabs' | 'retell'): VoiceAgentProvider;
}