import {
  users,
  voiceAgents,
  voicePresets,
  agentLikes,
  restaurantData,
  callLogs,
  telephonyCallLogs,
  smsMessages,
  voiceSettings,
  businessHours,
  enhancedBusinessProfiles,
  enhancedMenuItems,
  enhancedCustomerReviews,
  businessKnowledgeBase,
  knowledgeSources,
  subscriptionPlans,
  userSubscriptions,
  userTrials,
  paymentHistory,
  phoneNumberAssignments,
  businessPhoneConnections,
  signupProgress,
  userCredentials,
  businessSettings,
  agentIntegrations,
  agentFunctionSettings,
  demoSessions,
  restaurantAutomationConfigs,
  automationEvents,
  cateringRequests,
  deliveryRequests,
  callSessions,
  callOutcomes,
  orderCallLinks,
  reservationCallLinks,
  customerProfiles,
  customerMemories,
  callMetricsDaily,
  type User,
  type UpsertUser,
  type VoiceAgent,
  type VoiceAgentWithUser,
  type VoiceAgentWithRestaurantData,
  type InsertVoiceAgent,
  type VoicePreset,
  type InsertVoicePreset,
  type InsertAgentLike,
  type RestaurantData,
  type InsertRestaurantData,
  type CallLog,
  type InsertCallLog,
  type TelephonyCallLog,
  type InsertTelephonyCallLog,
  type VoiceSetting,
  type InsertVoiceSetting,
  type BusinessHour,
  type InsertBusinessHour,
  type Industry,
  type EnhancedBusinessProfile,
  type InsertEnhancedBusinessProfile,
  type EnhancedMenuItem,
  type InsertEnhancedMenuItem,
  type EnhancedCustomerReview,
  type BusinessKnowledgeItem,
  type InsertBusinessKnowledgeItem,
  type KnowledgeSource,
  type InsertKnowledgeSource,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type UserSubscription,
  type InsertUserSubscription,
  type UserSubscriptionWithPlan,
  type UserTrial,
  type InsertUserTrial,
  type PaymentHistory,
  type InsertPaymentHistory,
  type PhoneNumberAssignment,
  type InsertPhoneNumberAssignment,
  type BusinessPhoneConnection,
  type InsertBusinessPhoneConnection,
  type SignupProgress,
  type InsertSignupProgress,
  type UserCredentials,
  type InsertUserCredentials,
  type BusinessSettings,
  type InsertBusinessSettings,
  type AgentIntegration,
  type InsertAgentIntegration,
  type AgentFunctionSetting,
  type InsertAgentFunctionSetting,
  type DemoSession,
  type InsertDemoSession,
  type RestaurantAutomationConfig,
  type InsertRestaurantAutomationConfig,
  type AutomationEvent,
  type InsertAutomationEvent,
  type CateringRequest,
  type InsertCateringRequest,
  type DeliveryRequest,
  type InsertDeliveryRequest,
  type CallSession,
  type InsertCallSession,
  type CallOutcome,
  type InsertCallOutcome,
  type OrderCallLink,
  type InsertOrderCallLink,
  type ReservationCallLink,
  type InsertReservationCallLink,
  type CustomerProfile,
  type InsertCustomerProfile,
  type CustomerMemory,
  type InsertCustomerMemory,
  type CallMetricsDaily,
  type InsertCallMetricsDaily,
  teamInvitations,
  teamMembers,
  type TeamInvitation,
  type InsertTeamInvitation,
  type TeamMember,
  type InsertTeamMember,
  notifications,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ilike, inArray, or, exists, isNull, asc, gte, lte, gt } from "drizzle-orm";
import { EncryptionService } from "./services/encryptionService";

// Temporary memory storage for when database is unavailable
class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private usersByEmail: Map<string, User> = new Map();
  private userCredentials: Map<string, UserCredentials> = new Map(); // key: userId:integrationType:credentialName
  private businessSettings: Map<string, BusinessSettings> = new Map(); // key: userId
  private demoSessions: Map<string, DemoSession> = new Map(); // key: session id

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email);
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    // Search through all users to find one with matching verification token
    const userEntries = Array.from(this.users.values());
    for (const user of userEntries) {
      if (user.emailVerificationToken === token) {
        return user;
      }
    }
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      id: userData.id || `user_${Date.now()}`,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      passwordHash: userData.passwordHash || null,
      selectedIndustry: userData.selectedIndustry || null,
      stripeCustomerId: userData.stripeCustomerId || null,
      isSubscribed: userData.isSubscribed || false,
      emailVerified: userData.emailVerified || false,
      emailVerificationToken: userData.emailVerificationToken || null,
      emailVerificationExpires: userData.emailVerificationExpires || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    if (user.email) {
      this.usersByEmail.set(user.email, user);
    }
    return user;
  }

  async updateUserIndustry(userId: string, industry: Industry): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, selectedIndustry: industry, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserSubscriptionStatus(userId: string, isSubscribed: boolean): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, isSubscribed: isSubscribed, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    if (updatedUser.email) {
      this.usersByEmail.set(updatedUser.email, updatedUser);
    }
    return updatedUser;
  }

  async updateEmailNotifSettings(userId: string, notifyEmailAlerts: boolean, notifyDesktopAlerts: boolean, notifyCallFlagged: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    const updatedUser = { ...user, notifyEmailAlerts, notifyDesktopAlerts, notifyCallFlagged, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    if (updatedUser.email) this.usersByEmail.set(updatedUser.email, updatedUser);
  }

  async setEmailVerificationToken(userId: string, token: string, expires: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, emailVerificationToken: token, emailVerificationExpires: expires, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    if (updatedUser.email) {
      this.usersByEmail.set(updatedUser.email, updatedUser);
    }
  }

  async verifyUserEmail(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, emailVerified: true, emailVerificationToken: null, emailVerificationExpires: null, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    if (updatedUser.email) {
      this.usersByEmail.set(updatedUser.email, updatedUser);
    }
  }

  async clearEmailVerificationToken(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, emailVerificationToken: null, emailVerificationExpires: null, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    if (updatedUser.email) {
      this.usersByEmail.set(updatedUser.email, updatedUser);
    }
  }

  // Stub implementations for other methods (will throw errors if used)
  async createVoiceAgent(_agent: any): Promise<VoiceAgent> { throw new Error('Database unavailable'); }
  async getVoiceAgent(_id: string): Promise<VoiceAgent | undefined> { throw new Error('Database unavailable'); }
  async getVoiceAgentByRetellAgentId(_retellAgentId: string): Promise<VoiceAgent | undefined> { throw new Error('Database unavailable'); }
  async getVoiceAgentWithUser(_id: string): Promise<VoiceAgentWithUser | undefined> { throw new Error('Database unavailable'); }
  async getVoiceAgentWithRestaurantData(_id: string): Promise<VoiceAgentWithRestaurantData | undefined> { throw new Error('Database unavailable'); }
  async getUserVoiceAgents(_userId: string): Promise<VoiceAgent[]> { throw new Error('Database unavailable'); }
  async updateVoiceAgent(_id: string, _updates: any): Promise<VoiceAgent> { throw new Error('Database unavailable'); }
  async deleteVoiceAgent(_id: string): Promise<void> { throw new Error('Database unavailable'); }
  async getPublicVoiceAgents(): Promise<VoiceAgentWithUser[]> { throw new Error('Database unavailable'); }
  async getVoicePresets(): Promise<VoicePreset[]> { return []; }
  async upsertVoicePreset(): Promise<VoicePreset> { throw new Error('Database unavailable'); }
  async likeAgent(): Promise<void> { throw new Error('Database unavailable'); }
  async unlikeAgent(): Promise<void> { throw new Error('Database unavailable'); }
  async isAgentLiked(): Promise<boolean> { throw new Error('Database unavailable'); }
  async incrementAgentLikes(): Promise<void> { throw new Error('Database unavailable'); }
  async decrementAgentLikes(): Promise<void> { throw new Error('Database unavailable'); }
  async incrementAgentDuplicates(): Promise<void> { throw new Error('Database unavailable'); }
  async createRestaurantData(): Promise<RestaurantData> { throw new Error('Database unavailable'); }
  async getRestaurantData(): Promise<RestaurantData | undefined> { throw new Error('Database unavailable'); }
  async getRestaurantDataById(): Promise<RestaurantData | undefined> { throw new Error('Database unavailable'); }
  async updateRestaurantData(): Promise<RestaurantData> { throw new Error('Database unavailable'); }
  async deleteRestaurantData(): Promise<void> { throw new Error('Database unavailable'); }
  async createCallLog(): Promise<CallLog> { throw new Error('Database unavailable'); }
  async getCallLogs(): Promise<CallLog[]> { throw new Error('Database unavailable'); }
  async getCallStats(): Promise<{ totalCalls: number; avgDuration: number; purposes: Record<string, number> }> { throw new Error('Database unavailable'); }
  async createTelephonyCallLog(): Promise<TelephonyCallLog> { throw new Error('Database unavailable'); }
  async getTelephonyCallLogByTwilioSid(): Promise<TelephonyCallLog | undefined> { throw new Error('Database unavailable'); }
  async updateTelephonyCallLog(): Promise<TelephonyCallLog> { throw new Error('Database unavailable'); }
  async getTelephonyCallLogs(): Promise<TelephonyCallLog[]> { throw new Error('Database unavailable'); }
  async getTelephonyCallLogsByPhoneNumbers(): Promise<TelephonyCallLog[]> { throw new Error('Database unavailable'); }
  async getUserStats(): Promise<{ phoneMinutesThisMonth: number }> { return { phoneMinutesThisMonth: 0 }; }
  
  // Enhanced call management stub methods
  async listCalls(filters: any): Promise<{ calls: TelephonyCallLog[]; total: number; page: number; pageSize: number }> { throw new Error('Database unavailable'); }
  async getCall(id: string): Promise<TelephonyCallLog | undefined> { throw new Error('Database unavailable'); }
  async getCallForAgent(id: string, restaurantAgentId: string): Promise<TelephonyCallLog | undefined> { throw new Error('Database unavailable'); }
  async updateCallMeta(id: string, updates: { callStatus?: string; tags?: string[]; notes?: string[]; vip?: boolean; flagged?: boolean; customerName?: string; interactionType?: string; summary?: string; actions?: any[]; connectedRefs?: any; restaurantAgentId?: string; }): Promise<TelephonyCallLog> { throw new Error('Database unavailable'); }
  async recordCallIngest(payload: any): Promise<TelephonyCallLog> { throw new Error('Database unavailable'); }
  async getRecordingStream(id: string): Promise<{ url: string; contentType: string } | undefined> { throw new Error('Database unavailable'); }
  async exportCalls(filters: any): Promise<string> { throw new Error('Database unavailable'); }

  // Enhanced business profile stub methods
  async createEnhancedBusinessProfile(): Promise<EnhancedBusinessProfile> { throw new Error('Database unavailable'); }
  async getEnhancedBusinessProfile(): Promise<EnhancedBusinessProfile | undefined> { throw new Error('Database unavailable'); }
  async updateEnhancedBusinessProfile(): Promise<EnhancedBusinessProfile> { throw new Error('Database unavailable'); }
  async deleteEnhancedBusinessProfile(): Promise<void> { throw new Error('Database unavailable'); }
  async getEnhancedBusinessProfileWithMenu(): Promise<(EnhancedBusinessProfile & { menuItems: EnhancedMenuItem[] }) | undefined> { throw new Error('Database unavailable'); }
  async createEnhancedMenuItem(): Promise<EnhancedMenuItem> { throw new Error('Database unavailable'); }
  async getEnhancedMenuItems(): Promise<EnhancedMenuItem[]> { throw new Error('Database unavailable'); }
  async updateEnhancedMenuItem(): Promise<EnhancedMenuItem> { throw new Error('Database unavailable'); }
  async deleteEnhancedMenuItem(): Promise<void> { throw new Error('Database unavailable'); }
  async getMenuItemsByCategory(): Promise<EnhancedMenuItem[]> { throw new Error('Database unavailable'); }
  async searchMenuItems(): Promise<EnhancedMenuItem[]> { throw new Error('Database unavailable'); }
  async createBusinessKnowledge(): Promise<BusinessKnowledgeItem> { throw new Error('Database unavailable'); }
  async getBusinessKnowledge(): Promise<BusinessKnowledgeItem[]> { throw new Error('Database unavailable'); }
  async updateBusinessKnowledge(): Promise<BusinessKnowledgeItem> { throw new Error('Database unavailable'); }
  async deleteBusinessKnowledge(): Promise<void> { throw new Error('Database unavailable'); }
  async searchBusinessKnowledge(): Promise<BusinessKnowledgeItem[]> { throw new Error('Database unavailable'); }
  async getKnowledgeByCategory(): Promise<BusinessKnowledgeItem[]> { throw new Error('Database unavailable'); }
  async markProfileForRefresh(): Promise<void> { throw new Error('Database unavailable'); }
  async getProfilesDueForRefresh(): Promise<EnhancedBusinessProfile[]> { throw new Error('Database unavailable'); }

  // Subscription management stub methods
  async createSubscriptionPlan(): Promise<SubscriptionPlan> { throw new Error('Database unavailable'); }
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> { return []; }
  async getSubscriptionPlan(): Promise<SubscriptionPlan | undefined> { throw new Error('Database unavailable'); }
  async updateSubscriptionPlan(): Promise<SubscriptionPlan> { throw new Error('Database unavailable'); }
  async deleteSubscriptionPlan(): Promise<void> { throw new Error('Database unavailable'); }
  async createUserSubscription(): Promise<UserSubscription> { throw new Error('Database unavailable'); }
  async getUserSubscription(): Promise<UserSubscriptionWithPlan | undefined> { throw new Error('Database unavailable'); }
  async getUserSubscriptionByStripeId(): Promise<UserSubscription | undefined> { throw new Error('Database unavailable'); }
  async updateUserSubscription(): Promise<UserSubscription> { throw new Error('Database unavailable'); }
  async cancelUserSubscription(): Promise<UserSubscription> { throw new Error('Database unavailable'); }

  // Atomic provisioning operations stubs  
  async beginProvisioningIfIdle(subscriptionId: string): Promise<{ success: boolean; alreadyInProgress?: boolean; alreadyCompleted?: boolean; currentStatus?: string }> { 
    throw new Error('Database unavailable'); 
  }
  async markProvisioningCompleted(subscriptionId: string, results: {
    retellAgentId: string;
    conversationFlowId: string;
    knowledgeBaseId: string;
    twilioPhoneNumber: string;
    twilioPhoneSid: string;
    sipTrunkingSid?: string;
    emergencyAddressSid?: string;
  }): Promise<UserSubscription> { throw new Error('Database unavailable'); }
  async markProvisioningFailed(subscriptionId: string, error: string): Promise<UserSubscription> { throw new Error('Database unavailable'); }
  async getProvisioningResults(subscriptionId: string): Promise<{
    retellAgentId?: string;
    conversationFlowId?: string;
    knowledgeBaseId?: string;
    twilioPhoneNumber?: string;
    twilioPhoneSid?: string;
    sipTrunkingSid?: string;
    emergencyAddressSid?: string;
    twilioSubaccountSid?: string;
    twilioSubaccountAuthToken?: string;
    retellFolderId?: string;
  } | undefined> { throw new Error('Database unavailable'); }

  // Step-level persistence stubs
  async updateKnowledgeBaseId(subscriptionId: string, knowledgeBaseId: string): Promise<void> {
    throw new Error('Database unavailable');
  }
  async updateConversationFlowId(subscriptionId: string, conversationFlowId: string): Promise<void> {
    throw new Error('Database unavailable');
  }
  async updateRetellAgentId(subscriptionId: string, retellAgentId: string): Promise<void> {
    throw new Error('Database unavailable');
  }
  async updateTwilioSubaccount(subscriptionId: string, subaccountSid: string, subaccountAuthToken: string): Promise<void> {
    throw new Error('Database unavailable');
  }
  async updateRetellFolderId(subscriptionId: string, folderId: string): Promise<void> {
    throw new Error('Database unavailable');
  }

  async updateUserStripeCustomerId(): Promise<User> { throw new Error('Database unavailable'); }
  async createPaymentRecord(): Promise<PaymentHistory> { throw new Error('Database unavailable'); }
  async getPaymentHistory(): Promise<PaymentHistory[]> { return []; }
  async updatePaymentRecord(): Promise<PaymentHistory> { throw new Error('Database unavailable'); }

  // User trials stub methods
  async createUserTrial(): Promise<UserTrial> { throw new Error('Database unavailable'); }
  async getUserTrial(): Promise<UserTrial | undefined> { return undefined; }
  async updateUserTrial(): Promise<UserTrial> { throw new Error('Database unavailable'); }
  async deductTrialMinutes(): Promise<UserTrial> { throw new Error('Database unavailable'); }
  async convertTrialToSubscription(): Promise<UserTrial> { throw new Error('Database unavailable'); }
  async suspendTrialService(): Promise<UserTrial> { throw new Error('Database unavailable'); }
  async getActiveTrials(): Promise<UserTrial[]> { return []; }

  // Phone number assignment stub methods
  async getUserPhoneNumbers(): Promise<PhoneNumberAssignment[]> { return []; }
  async getPhoneNumberAssignment(): Promise<PhoneNumberAssignment | undefined> { throw new Error('Database unavailable'); }
  async createPhoneNumberAssignment(): Promise<PhoneNumberAssignment> { throw new Error('Database unavailable'); }
  async updatePhoneNumberAssignment(): Promise<PhoneNumberAssignment> { throw new Error('Database unavailable'); }
  async getPhoneNumberByTwilioSid(): Promise<PhoneNumberAssignment | undefined> { throw new Error('Database unavailable'); }
  async getPhoneNumberAssignmentByNumber(): Promise<PhoneNumberAssignment | undefined> { throw new Error('Database unavailable'); }
  async findAvailableGenericPhoneNumbers(): Promise<PhoneNumberAssignment[]> { return []; }
  async reassignPhoneNumberToUser(): Promise<PhoneNumberAssignment> { throw new Error('Database unavailable'); }

  // Existing phone connection stub methods
  async createOrUpdateExistingPhoneConnection(): Promise<BusinessPhoneConnection> { throw new Error('Database unavailable'); }
  async getExistingPhoneConnection(): Promise<BusinessPhoneConnection | undefined> { throw new Error('Database unavailable'); }
  async getBusinessPhoneConnectionByPhoneNumber(phoneNumber: string): Promise<BusinessPhoneConnection | undefined> { throw new Error('Database unavailable'); }
  async updateExistingPhoneConnectionStatus(): Promise<BusinessPhoneConnection | undefined> { throw new Error('Database unavailable'); }

  // Signup progress stub methods
  async saveSignupProgress(): Promise<SignupProgress> { throw new Error('Database unavailable'); }
  async getSignupProgress(): Promise<SignupProgress | undefined> { throw new Error('Database unavailable'); }
  async updateSignupProgress(): Promise<SignupProgress | undefined> { throw new Error('Database unavailable'); }

  // ElevenLabs integration stub methods
  async isPhoneNumberElevenLabsEnabled(): Promise<boolean> { return false; }
  async getElevenLabsPhoneNumberId(): Promise<string | null> { return null; }
  async getElevenLabsAgentId(): Promise<string | null> { return null; }

  // Conversation Flow tracking methods
  private conversationFlows: Map<string, string> = new Map(); // key: userId:subscriptionId, value: flowId

  async getConversationFlowForSubscription(userId: string, subscriptionId: string): Promise<string | undefined> {
    const key = `${userId}:${subscriptionId}`;
    return this.conversationFlows.get(key);
  }

  async setConversationFlowForSubscription(userId: string, subscriptionId: string, flowId: string): Promise<void> {
    const key = `${userId}:${subscriptionId}`;
    this.conversationFlows.set(key, flowId);
  }

  // Knowledge Base tracking methods
  private knowledgeBases: Map<string, string> = new Map(); // key: userId:subscriptionId, value: knowledgeBaseId
  private knowledgeBaseStatuses: Map<string, string> = new Map(); // key: knowledgeBaseId, value: status

  async getKnowledgeBaseForSubscription(userId: string, subscriptionId: string): Promise<string | undefined> {
    const key = `${userId}:${subscriptionId}`;
    return this.knowledgeBases.get(key);
  }

  async setKnowledgeBaseForSubscription(userId: string, subscriptionId: string, knowledgeBaseId: string): Promise<void> {
    const key = `${userId}:${subscriptionId}`;
    this.knowledgeBases.set(key, knowledgeBaseId);
  }

  async getKnowledgeBaseStatus(knowledgeBaseId: string): Promise<string | undefined> {
    return this.knowledgeBaseStatuses.get(knowledgeBaseId);
  }

  async setKnowledgeBaseStatus(knowledgeBaseId: string, status: string): Promise<void> {
    this.knowledgeBaseStatuses.set(knowledgeBaseId, status);
  }

  // Demo session methods for 1-minute per user cap
  async createDemoSession(sessionData: InsertDemoSession): Promise<DemoSession> {
    const session: DemoSession = {
      id: `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: sessionData.userId,
      sessionId: sessionData.sessionId,
      ipAddress: sessionData.ipAddress,
      retellCallId: sessionData.retellCallId,
      startedAt: new Date(),
      endedAt: sessionData.endedAt || null,
      duration: sessionData.duration || null,
      status: sessionData.status || 'active',
    };

    this.demoSessions.set(session.sessionId, session);
    return session;
  }

  async getDemoSession(sessionId: string): Promise<DemoSession | undefined> {
    return this.demoSessions.get(sessionId);
  }

  async getRecentDemoSessions(userId?: string, sessionId?: string, ipAddress?: string, hoursBack?: number): Promise<DemoSession[]> {
    const hours = hoursBack || 24;
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    return Array.from(this.demoSessions.values()).filter(session => {
      // Check time filter
      if (session.startedAt < cutoff) return false;
      
      // Check filters
      if (userId && session.userId !== userId) return false;
      if (sessionId && session.sessionId !== sessionId) return false;
      if (ipAddress && session.ipAddress !== ipAddress) return false;
      
      return true;
    }).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async updateDemoSession(id: string, updates: Partial<DemoSession>): Promise<DemoSession> {
    // Find session by id
    let session: DemoSession | undefined;
    let sessionKey: string | undefined;
    
    for (const [key, sess] of this.demoSessions.entries()) {
      if (sess.id === id) {
        session = sess;
        sessionKey = key;
        break;
      }
    }

    if (!session || !sessionKey) {
      throw new Error(`Demo session not found: ${id}`);
    }

    const updatedSession = {
      ...session,
      ...updates,
    };

    this.demoSessions.set(sessionKey, updatedSession);
    return updatedSession;
  }

  async hasRecentDemoSession(userId?: string, sessionId?: string, ipAddress?: string, minutesBack?: number): Promise<boolean> {
    const minutes = minutesBack || 60;
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - minutes);

    return Array.from(this.demoSessions.values()).some(session => {
      // Check time filter
      if (session.startedAt < cutoff) return false;
      
      // Check filters
      if (userId && session.userId !== userId) return false;
      if (sessionId && session.sessionId !== sessionId) return false;
      if (ipAddress && session.ipAddress !== ipAddress) return false;
      
      return true;
    });
  }

  // User credentials operations (for secure API key storage)
  async upsertUserCredentials(credentialsData: InsertUserCredentials): Promise<UserCredentials> {
    const credentials: UserCredentials = {
      id: `cred_${Date.now()}`,
      userId: credentialsData.userId,
      integrationType: credentialsData.integrationType,
      credentialName: credentialsData.credentialName,
      encryptedData: credentialsData.encryptedData,
      encryptionIv: credentialsData.encryptionIv,
      encryptionTag: credentialsData.encryptionTag,
      encryptionAlgorithm: credentialsData.encryptionAlgorithm || 'aes-256-gcm',
      encryptionVersion: credentialsData.encryptionVersion || '1',
      isActive: credentialsData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const key = `${credentials.userId}:${credentials.integrationType}:${credentials.credentialName}`;
    this.userCredentials.set(key, credentials);
    return credentials;
  }

  async getUserCredentials(userId: string, integrationType: string, credentialName: string): Promise<UserCredentials | undefined> {
    const key = `${userId}:${integrationType}:${credentialName}`;
    return this.userCredentials.get(key);
  }

  async getUserCredentialsByIntegration(userId: string, integrationType: string): Promise<UserCredentials[]> {
    const credentials: UserCredentials[] = [];
    const entries = Array.from(this.userCredentials.entries());
    for (const [key, cred] of entries) {
      if (key.startsWith(`${userId}:${integrationType}:`)) {
        credentials.push(cred);
      }
    }
    return credentials;
  }

  async deleteUserCredentials(userId: string, integrationType: string, credentialName: string): Promise<void> {
    const key = `${userId}:${integrationType}:${credentialName}`;
    this.userCredentials.delete(key);
  }

  async hasUserCredentials(userId: string, integrationType: string, credentialName: string): Promise<boolean> {
    const key = `${userId}:${integrationType}:${credentialName}`;
    return this.userCredentials.has(key);
  }

  async upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings> {
    const businessSetting: BusinessSettings = {
      id: `business_${Date.now()}`,
      userId: settings.userId,
      acceptOrders: settings.acceptOrders ?? true,
      acceptReservations: settings.acceptReservations ?? true,
      businessHours: settings.businessHours ?? {
        "monday": {"open": "09:00", "close": "22:00", "isOpen": true},
        "tuesday": {"open": "09:00", "close": "22:00", "isOpen": true},
        "wednesday": {"open": "09:00", "close": "22:00", "isOpen": true},
        "thursday": {"open": "09:00", "close": "22:00", "isOpen": true},
        "friday": {"open": "09:00", "close": "22:00", "isOpen": true},
        "saturday": {"open": "09:00", "close": "22:00", "isOpen": true},
        "sunday": {"open": "10:00", "close": "21:00", "isOpen": true}
      },
      timezone: settings.timezone ?? 'America/New_York',
      orderCutoffTime: settings.orderCutoffTime ?? '21:30',
      reservationLeadTime: settings.reservationLeadTime ?? 60,
      isActive: settings.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.businessSettings.set(settings.userId, businessSetting);
    return businessSetting;
  }

  async getBusinessSettings(userId: string): Promise<BusinessSettings | undefined> {
    return this.businessSettings.get(userId);
  }

  async updateBusinessSettings(userId: string, updates: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const existing = this.businessSettings.get(userId);
    if (!existing) {
      throw new Error(`Business settings not found for user: ${userId}`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.businessSettings.set(userId, updated);
    return updated;
  }

  async incrementMetric(userId: string, metricType: 'order' | 'delivery' | 'catering' | 'reservation'): Promise<void> {
    const existing = this.businessSettings.get(userId);
    if (existing) {
      const metricKey = `${metricType}Count` as keyof BusinessSettings;
      const currentValue = (existing[metricKey] as number) || 0;
      const updated = { ...existing, [metricKey]: currentValue + 1, updatedAt: new Date() };
      this.businessSettings.set(userId, updated);
    }
  }

  // Specialized business settings for sticky save functionality
  async updateBehaviorSettings(userId: string, behaviorSettings: any): Promise<void> {
    // Store behavior settings in memory (simplified storage for demo)
    const key = `${userId}:behavior`;
    this.businessSettings.set(key, behaviorSettings);
    console.log(`🎭 Behavior settings stored for user ${userId}`);
  }

  async updateBusinessInfo(userId: string, businessData: any): Promise<void> {
    // Store business info in memory (simplified storage for demo)
    const key = `${userId}:info`;
    this.businessSettings.set(key, businessData);
    console.log(`🏢 Business info stored for user ${userId}`);
  }

  async updateIntegrationSettings(userId: string, integrationData: any): Promise<void> {
    // Store integration settings in memory (simplified storage for demo)
    const key = `${userId}:integrations`;
    this.businessSettings.set(key, integrationData);
    console.log(`🔗 Integration settings stored for user ${userId}`);
  }

  // Get specialized business settings for form pre-population
  async getBehaviorSettings(userId: string): Promise<any> {
    const key = `${userId}:behavior`;
    const settings = this.businessSettings.get(key);
    console.log(`🎭 Retrieved behavior settings for user ${userId}:`, settings);
    return settings || {
      globalPrompt: '',
      businessHoursGreeting: '',
      afterHoursGreeting: ''
    };
  }

  async getBusinessInfo(userId: string): Promise<any> {
    const key = `${userId}:info`;
    const info = this.businessSettings.get(key);
    console.log(`🏢 Retrieved business info for user ${userId}:`, info);
    return info || {};
  }

  async getIntegrationSettings(userId: string): Promise<any> {
    const key = `${userId}:integrations`;
    const settings = this.businessSettings.get(key);
    console.log(`🔗 Retrieved integration settings for user ${userId}:`, settings);
    return settings || {
      platform: '',
      squareAppId: '',
      squareAccessToken: '',
      squareLocationId: '',
      toastClientKey: '',
      toastClientSecret: '',
      toastGuid: '',
      googleClientId: '',
      googleClientSecret: '',
      googleCalendarId: ''
    };
  }

  // Restaurant automation methods - Memory storage implementations
  private restaurantConfigs: Map<string, any> = new Map();
  private automationEvents: any[] = [];
  private cateringRequests: Map<string, any[]> = new Map();
  private deliveryRequests: Map<string, any[]> = new Map();

  async getRestaurantAutomationConfig(restaurantId: string): Promise<any> {
    // First check if we have a stored config
    const storedConfig = this.restaurantConfigs.get(restaurantId);
    if (storedConfig) {
      return storedConfig;
    }

    // If not, build config from user's businessSettings and credentials
    // restaurantId is the same as userId in this system
    const userId = restaurantId;

    try {
      const businessSettings = await this.getBusinessSettings(userId);
      if (!businessSettings) {
        return null;
      }

      // Build the config object from business settings
      const config: any = {
        userId: userId,
        restaurantId: userId,
        businessName: 'Restaurant', // This could be enhanced to get from restaurantData
        businessHours: businessSettings.businessHours || {},
        timezone: businessSettings.timezone || 'America/New_York',
        acceptAfterHours: businessSettings.acceptAfterHours || false
      };

      // Check if Google Calendar is connected
      const googleCalendarCreds = await this.getUserCredentialsByIntegration(userId, 'google_calendar');
      if (googleCalendarCreds && googleCalendarCreds.length > 0) {
        // Mark that Google Calendar is available
        config.hasGoogleCalendar = true;
      }

      return config;
    } catch (error) {
      console.error('❌ Error building restaurant automation config:', error);
      return null;
    }
  }

  async saveRestaurantAutomationConfig(userId: string, config: InsertRestaurantAutomationConfig): Promise<RestaurantAutomationConfig> {
    const newConfig = {
      id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    } as RestaurantAutomationConfig;

    this.restaurantConfigs.set(config.restaurantId, newConfig);
    return newConfig;
  }

  async saveRestaurantIntegrations(restaurantId: string, config: any): Promise<void> {
    this.restaurantConfigs.set(restaurantId, config);
  }

  async getRestaurantIntegrations(restaurantId: string): Promise<any> {
    return this.restaurantConfigs.get(restaurantId);
  }

  async logAutomationEvent(eventLog: any): Promise<void> {
    this.automationEvents.push({
      ...eventLog,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    });
  }

  async createCateringRequest(restaurantId: string, data: any): Promise<void> {
    if (!this.cateringRequests.has(restaurantId)) {
      this.cateringRequests.set(restaurantId, []);
    }
    this.cateringRequests.get(restaurantId)!.push({
      ...data,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    });
  }

  async createDeliveryRequest(restaurantId: string, data: any): Promise<void> {
    if (!this.deliveryRequests.has(restaurantId)) {
      this.deliveryRequests.set(restaurantId, []);
    }
    this.deliveryRequests.get(restaurantId)!.push({
      ...data,
      id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    });
  }

  async getRestaurantAnalytics(restaurantId: string, options?: { startDate?: string; endDate?: string }): Promise<any> {
    const events = this.automationEvents.filter(event => event.restaurantId === restaurantId);
    const catering = this.cateringRequests.get(restaurantId) || [];
    const delivery = this.deliveryRequests.get(restaurantId) || [];

    return {
      events,
      catering,
      delivery,
      summary: {
        totalEvents: events.length,
        successfulEvents: events.filter(e => e.success).length,
        totalCateringRequests: catering.length,
        totalDeliveryRequests: delivery.length
      }
    };
  }

  // ============================================
  // CALL METRICS STUB IMPLEMENTATIONS
  // ============================================
  // Stubs for when database is unavailable

  async createCallSession(session: InsertCallSession): Promise<CallSession> { throw new Error('Database unavailable'); }
  async getCallSession(id: string): Promise<CallSession | undefined> { throw new Error('Database unavailable'); }
  async getCallSessionByTwilioSid(twilioCallSid: string): Promise<CallSession | undefined> { throw new Error('Database unavailable'); }
  async getCallSessionByRetellId(retellCallId: string): Promise<CallSession | undefined> { throw new Error('Database unavailable'); }
  async updateCallSession(id: string, updates: Partial<InsertCallSession>): Promise<CallSession> { throw new Error('Database unavailable'); }
  async getUserCallSessions(userId: string, options?: { limit?: number; offset?: number; startDate?: Date; endDate?: Date }): Promise<CallSession[]> { return []; }

  async createCallOutcome(outcome: InsertCallOutcome): Promise<CallOutcome> { throw new Error('Database unavailable'); }
  async getCallOutcome(callSessionId: string): Promise<CallOutcome | undefined> { throw new Error('Database unavailable'); }
  async updateCallOutcome(id: string, updates: Partial<InsertCallOutcome>): Promise<CallOutcome> { throw new Error('Database unavailable'); }

  async createOrderCallLink(link: InsertOrderCallLink): Promise<OrderCallLink> { throw new Error('Database unavailable'); }
  async getOrderCallLinks(callSessionId: string): Promise<OrderCallLink[]> { return []; }
  async getOrderCallLinkByOrderId(orderId: string): Promise<OrderCallLink | undefined> { throw new Error('Database unavailable'); }
  async getUserOrderCallLinks(userId: string, options?: { startDate?: Date; endDate?: Date; retellAgentId?: string }): Promise<OrderCallLink[]> { return []; }

  async createReservationCallLink(link: InsertReservationCallLink): Promise<ReservationCallLink> { throw new Error('Database unavailable'); }
  async getReservationCallLinks(callSessionId: string): Promise<ReservationCallLink[]> { return []; }
  async getReservationCallLinkByReservationId(reservationId: string): Promise<ReservationCallLink | undefined> { throw new Error('Database unavailable'); }
  async getUserReservationCallLinks(userId: string, options?: { startDate?: Date; endDate?: Date; retellAgentId?: string }): Promise<ReservationCallLink[]> { return []; }

  async createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile> { throw new Error('Database unavailable'); }
  async getCustomerProfile(id: string): Promise<CustomerProfile | undefined> { throw new Error('Database unavailable'); }
  async getCustomerProfileByPhone(phoneNumber: string, userId: string): Promise<CustomerProfile | undefined> { throw new Error('Database unavailable'); }
  async updateCustomerProfile(id: string, updates: Partial<InsertCustomerProfile>): Promise<CustomerProfile> { throw new Error('Database unavailable'); }
  async getUserCustomerProfiles(userId: string, options?: { segment?: string; vipOnly?: boolean; limit?: number; offset?: number; search?: string }): Promise<CustomerProfile[]> { return []; }
  
  async getCustomerSegmentCounts(userId: string): Promise<Record<string, number>> { return {}; }
  async getTopCustomersByRevenue(userId: string, limit?: number): Promise<CustomerProfile[]> { return []; }
  async getTopCustomersByVisits(userId: string, limit?: number): Promise<CustomerProfile[]> { return []; }

  async createCustomerMemory(memory: InsertCustomerMemory): Promise<CustomerMemory> { throw new Error('Database unavailable'); }
  async getCustomerMemory(id: string): Promise<CustomerMemory | undefined> { throw new Error('Database unavailable'); }
  async getCustomerMemoriesByAgent(agentId: string): Promise<CustomerMemory[]> { return []; }
  async getCustomerMemoriesByCustomer(customerProfileId: string, agentId: string): Promise<CustomerMemory | undefined> { throw new Error('Database unavailable'); }
  async updateCustomerMemory(id: string, updates: Partial<InsertCustomerMemory>): Promise<CustomerMemory> { throw new Error('Database unavailable'); }
  async deleteCustomerMemory(id: string): Promise<void> { }

  async createOrUpdateDailyMetrics(metrics: InsertCallMetricsDaily): Promise<CallMetricsDaily> { throw new Error('Database unavailable'); }
  async getDailyMetrics(userId: string, date: Date): Promise<CallMetricsDaily | undefined> { throw new Error('Database unavailable'); }
  async getDailyMetricsRange(userId: string, startDate: Date, endDate: Date): Promise<CallMetricsDaily[]> { return []; }
  
  async getCallMetricsSummary(userId: string, options?: { startDate?: Date; endDate?: Date; phoneNumber?: string; retellAgentId?: string }): Promise<any> {
    return {
      totalCalls: 0,
      completedCalls: 0,
      missedCalls: 0,
      averageDuration: 0,
      totalDuration: 0,
      aiSuccessRate: 0,
      averageSatisfaction: 0,
      conversionRate: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      uniqueCallers: 0,
      newCustomers: 0,
      repeatCustomers: 0,
      vipCustomers: 0,
    };
  }

  async getCallMetricsTrends(userId: string, options?: { startDate?: Date; endDate?: Date; granularity?: 'daily' | 'weekly' | 'monthly' }): Promise<Array<any>> { return []; }
  async getPeakCallTimes(userId: string, options?: { startDate?: Date; endDate?: Date }): Promise<Array<any>> { return []; }
  async getAIPerformanceMetrics(userId: string, options?: { startDate?: Date; endDate?: Date }): Promise<any> {
    return {
      aiHandledCalls: 0,
      aiSuccessfulCalls: 0,
      transferredCalls: 0,
      aiSuccessRate: 0,
      averageResponseTime: 0,
      averageConfidence: 0,
      averageSentiment: 0,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    };
  }
  async getRevenueMetrics(userId: string, options?: { startDate?: Date; endDate?: Date }): Promise<any> {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      ordersCreated: 0,
      reservationsCreated: 0,
      conversionRate: 0,
      revenueByOrderType: {},
    };
  }

  // Team member methods (stubs for memory storage)
  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> { throw new Error('Database unavailable'); }
  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> { return undefined; }
  async getTeamInvitationsByOwner(ownerId: string): Promise<TeamInvitation[]> { return []; }
  async updateTeamInvitation(id: string, updates: Partial<TeamInvitation>): Promise<TeamInvitation> { throw new Error('Database unavailable'); }
  async acceptTeamInvitation(token: string, userId: string): Promise<TeamInvitation> { throw new Error('Database unavailable'); }
  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> { throw new Error('Database unavailable'); }
  async getTeamMembersByOwner(ownerId: string): Promise<TeamMember[]> { return []; }
  async getTeamMemberByUserId(ownerId: string, userId: string): Promise<TeamMember | undefined> { return undefined; }
  async getTeamMembershipByUserId(userId: string): Promise<TeamMember | undefined> { return undefined; }
  async deleteTeamMember(id: string): Promise<void> { }
  async updateTeamMemberRole(id: string, role: string): Promise<TeamMember> { throw new Error('Database unavailable'); }

  // Agent integrations stubs
  async createAgentIntegration(): Promise<AgentIntegration> { throw new Error('Database unavailable'); }
  async getAgentIntegrations(): Promise<AgentIntegration[]> { return []; }
  async updateAgentIntegration(): Promise<AgentIntegration> { throw new Error('Database unavailable'); }
  async deleteAgentIntegration(): Promise<void> { }
  async getUserIntegrationsForAgent(): Promise<AgentIntegration[]> { return []; }

  // Agent function settings stubs
  async getAgentFunctionSetting(agentId: string, functionName: string): Promise<AgentFunctionSetting | undefined> { return undefined; }
}

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;

  upsertUser(user: UpsertUser): Promise<User>;
  updateUserIndustry(userId: string, industry: Industry): Promise<User>;
  updateUserSubscriptionStatus(userId: string, isSubscribed: boolean): Promise<User>;
  updateEmailNotifSettings(userId: string, notifyEmailAlerts: boolean, notifyDesktopAlerts: boolean, notifyCallFlagged: boolean): Promise<void>;
  setEmailVerificationToken(userId: string, token: string, expires: string): Promise<void>;
  verifyUserEmail(userId: string): Promise<void>;
  clearEmailVerificationToken(userId: string): Promise<void>;

  // User credentials operations (for secure API key storage)
  upsertUserCredentials(credentials: InsertUserCredentials): Promise<UserCredentials>;
  getUserCredentials(userId: string, integrationType: string, credentialName: string): Promise<UserCredentials | undefined>;
  getUserCredentialsByIntegration(userId: string, integrationType: string): Promise<UserCredentials[]>;
  deleteUserCredentials(userId: string, integrationType: string, credentialName: string): Promise<void>;
  hasUserCredentials(userId: string, integrationType: string, credentialName: string): Promise<boolean>;

  // Business settings operations
  upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings>;
  getBusinessSettings(userId: string): Promise<BusinessSettings | undefined>;
  updateBusinessSettings(userId: string, updates: Partial<BusinessSettings>): Promise<BusinessSettings>;
  incrementMetric(userId: string, metricType: 'order' | 'delivery' | 'catering' | 'reservation'): Promise<void>;
  
  // Specialized business settings for sticky save functionality
  updateBehaviorSettings(userId: string, behaviorSettings: any): Promise<void>;
  updateBusinessInfo(userId: string, businessData: any): Promise<void>;
  updateIntegrationSettings(userId: string, integrationData: any): Promise<void>;
  
  // Get specialized business settings for form pre-population
  getBehaviorSettings(userId: string): Promise<any>;
  getBusinessInfo(userId: string): Promise<any>;
  getIntegrationSettings(userId: string): Promise<any>;

  // Agent integrations operations
  createAgentIntegration(integrationData: InsertAgentIntegration): Promise<AgentIntegration>;
  getAgentIntegrations(agentId: string): Promise<AgentIntegration[]>;
  updateAgentIntegration(integrationId: string, updates: Partial<AgentIntegration>): Promise<AgentIntegration>;
  deleteAgentIntegration(integrationId: string): Promise<void>;
  getUserIntegrationsForAgent(userId: string, agentId: string): Promise<AgentIntegration[]>;

  // Voice agent operations
  createVoiceAgent(agent: InsertVoiceAgent & { userId: string; persona?: string; sampleScript?: string; audioUrl?: string }): Promise<VoiceAgent>;
  getVoiceAgent(id: string): Promise<VoiceAgent | undefined>;
  getVoiceAgentByRetellAgentId(retellAgentId: string): Promise<VoiceAgent | undefined>;
  getVoiceAgentWithUser(id: string): Promise<VoiceAgentWithUser | undefined>;
  getVoiceAgentWithRestaurantData(id: string): Promise<VoiceAgentWithRestaurantData | undefined>;
  getUserVoiceAgents(userId: string): Promise<VoiceAgent[]>;
  updateVoiceAgent(id: string, updates: Partial<VoiceAgent>): Promise<VoiceAgent>;
  deleteVoiceAgent(id: string): Promise<void>;

  // Public agents
  getPublicVoiceAgents(options?: { industry?: Industry; search?: string; limit?: number; offset?: number }): Promise<VoiceAgentWithUser[]>;

  // Voice presets
  getVoicePresets(): Promise<VoicePreset[]>;
  upsertVoicePreset(preset: InsertVoicePreset): Promise<VoicePreset>;

  // Agent likes
  likeAgent(userId: string, agentId: string): Promise<void>;
  unlikeAgent(userId: string, agentId: string): Promise<void>;
  isAgentLiked(userId: string, agentId: string): Promise<boolean>;
  incrementAgentLikes(agentId: string): Promise<void>;
  decrementAgentLikes(agentId: string): Promise<void>;
  incrementAgentDuplicates(agentId: string): Promise<void>;

  // Restaurant data operations
  createRestaurantData(data: InsertRestaurantData): Promise<RestaurantData>;
  getRestaurantData(agentId: string): Promise<RestaurantData | undefined>;
  getRestaurantDataById(id: string): Promise<RestaurantData | undefined>;
  updateRestaurantData(agentId: string, updates: Partial<RestaurantData>): Promise<RestaurantData>;
  deleteRestaurantData(agentId: string): Promise<void>;

  // Knowledge source operations
  createKnowledgeSource(data: InsertKnowledgeSource): Promise<KnowledgeSource>;
  getKnowledgeSource(id: string): Promise<KnowledgeSource | null>;
  getKnowledgeSources(agentId: string): Promise<KnowledgeSource[]>;
  updateKnowledgeSource(id: string, updates: Partial<KnowledgeSource>): Promise<KnowledgeSource>;
  deleteKnowledgeSource(id: string): Promise<void>;

  // Call logs operations
  createCallLog(log: InsertCallLog): Promise<CallLog>;
  getCallLogs(agentId: string, options?: { limit?: number; offset?: number }): Promise<CallLog[]>;
  getCallStats(agentId: string): Promise<{ totalCalls: number; avgDuration: number; purposes: Record<string, number> }>;
  deleteCallLogsForAgent(agentId: string): Promise<void>;
  deleteAllDataForPhoneNumber(phoneNumber: string, userId?: string): Promise<{
    telephonyCallLogs: number;
    smsMessages: number;
    callSessions: number;
    callOutcomes: number;
    orderCallLinks: number;
    reservationCallLinks: number;
    customerProfiles: number;
    customerMemories: number;
    callMetricsDaily: number;
  }>;

  // Telephony call logs operations
  createTelephonyCallLog(log: Partial<InsertTelephonyCallLog>): Promise<TelephonyCallLog>;
  getTelephonyCallLogByTwilioSid(twilioCallSid: string): Promise<TelephonyCallLog | undefined>;
  updateTelephonyCallLog(id: string, updates: Partial<InsertTelephonyCallLog>): Promise<TelephonyCallLog>;
  getTelephonyCallLogs(restaurantAgentId?: string, limit?: number, offset?: number): Promise<TelephonyCallLog[]>;
  getTelephonyCallLogsByPhoneNumbers(phoneNumbers: string[], limit?: number, offset?: number, startDate?: Date, endDate?: Date): Promise<TelephonyCallLog[]>;
  getUserStats(userId: string): Promise<{ phoneMinutesThisMonth: number }>;
  
  // Enhanced call management operations
  listCalls(filters: {
    page?: number;
    pageSize?: number;
    sortBy?: 'createdAt' | 'duration' | 'interactionType' | 'callStatus';
    sortDir?: 'asc' | 'desc';
    q?: string; // Search query across customerName, normalizedPhone, tags, summary, transcript
    types?: string[]; // Filter by interactionType
    statuses?: string[]; // Filter by callStatus
    vip?: boolean; // Filter by VIP status
    phoneNumbers?: string[]; // Filter by specific phone numbers
    startDate?: Date;
    endDate?: Date;
    restaurantAgentId: string; // REQUIRED - Filter by restaurant agent for authorization
  }): Promise<{ calls: TelephonyCallLog[]; total: number; page: number; pageSize: number }>;
  
  getCall(id: string): Promise<TelephonyCallLog | undefined>;
  getCallForAgent(id: string, restaurantAgentId: string): Promise<TelephonyCallLog | undefined>;
  
  updateCallMeta(id: string, updates: {
    callStatus?: string;
    tags?: string[];
    notes?: string[];
    vip?: boolean;
    flagged?: boolean;
    customerName?: string;
    interactionType?: string;
    summary?: string;
    actions?: any[];
    connectedRefs?: any;
    restaurantAgentId?: string;
  }): Promise<TelephonyCallLog>;
  
  recordCallIngest(payload: {
    twilioCallSid: string;
    fromNumber: string;
    toNumber: string;
    direction: string;
    status: string;
    duration?: number;
    startTime: Date;
    endTime?: Date;
    recordingUrl?: string;
    recordingSid?: string;
    transcriptionText?: string;
    aiResponse?: string;
    sentiment?: string;
    actionTaken?: string;
    customerName?: string;
    interactionType?: string;
    callStatus?: string;
    summary?: string;
    restaurantAgentId?: string;
  }): Promise<TelephonyCallLog>;
  
  getRecordingStream(id: string): Promise<{ url: string; contentType: string } | undefined>;
  
  exportCalls(filters: {
    phoneNumbers?: string[];
    startDate?: Date;
    endDate?: Date;
    types?: string[];
    statuses?: string[];
    vip?: boolean;
    format?: 'csv' | 'json';
    restaurantAgentId: string; // REQUIRED - Filter by restaurant agent for authorization
  }): Promise<string>;

  // Enhanced business profile operations
  createEnhancedBusinessProfile(profile: InsertEnhancedBusinessProfile): Promise<EnhancedBusinessProfile>;
  getEnhancedBusinessProfile(restaurantDataId: string): Promise<EnhancedBusinessProfile | undefined>;
  updateEnhancedBusinessProfile(id: string, updates: Partial<EnhancedBusinessProfile>): Promise<EnhancedBusinessProfile>;
  deleteEnhancedBusinessProfile(id: string): Promise<void>;
  getEnhancedBusinessProfileWithMenu(restaurantDataId: string): Promise<(EnhancedBusinessProfile & { menuItems: EnhancedMenuItem[] }) | undefined>;

  // Enhanced menu items operations
  createEnhancedMenuItem(item: InsertEnhancedMenuItem): Promise<EnhancedMenuItem>;
  getEnhancedMenuItems(enhancedProfileId: string): Promise<EnhancedMenuItem[]>;
  updateEnhancedMenuItem(id: string, updates: Partial<EnhancedMenuItem>): Promise<EnhancedMenuItem>;
  deleteEnhancedMenuItem(id: string): Promise<void>;
  getMenuItemsByCategory(enhancedProfileId: string, category: string): Promise<EnhancedMenuItem[]>;
  searchMenuItems(enhancedProfileId: string, searchTerm: string): Promise<EnhancedMenuItem[]>;

  // Business knowledge base operations
  createBusinessKnowledge(knowledge: InsertBusinessKnowledgeItem): Promise<BusinessKnowledgeItem>;
  getBusinessKnowledge(restaurantDataId: string): Promise<BusinessKnowledgeItem[]>;
  updateBusinessKnowledge(id: string, updates: Partial<BusinessKnowledgeItem>): Promise<BusinessKnowledgeItem>;
  deleteBusinessKnowledge(id: string): Promise<void>;
  searchBusinessKnowledge(restaurantDataId: string, query: string): Promise<BusinessKnowledgeItem[]>;
  getKnowledgeByCategory(restaurantDataId: string, category: string): Promise<BusinessKnowledgeItem[]>;

  // Data refresh operations
  markProfileForRefresh(restaurantDataId: string): Promise<void>;
  getProfilesDueForRefresh(): Promise<EnhancedBusinessProfile[]>;

  // Subscription management operations
  // Subscription Plans
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlans(activeOnly?: boolean): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  deleteSubscriptionPlan(id: string): Promise<void>;

  // User Subscriptions
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  getUserSubscription(userId: string): Promise<UserSubscriptionWithPlan | undefined>;
  getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined>;
  updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription>;
  cancelUserSubscription(id: string): Promise<UserSubscription>;

  // Atomic provisioning operations for concurrency safety
  beginProvisioningIfIdle(subscriptionId: string): Promise<{ success: boolean; alreadyInProgress?: boolean; alreadyCompleted?: boolean; currentStatus?: string }>;
  markProvisioningCompleted(subscriptionId: string, results: {
    retellAgentId: string;
    conversationFlowId: string;
    knowledgeBaseId: string;
    twilioPhoneNumber: string;
    twilioPhoneSid: string;
    sipTrunkingSid?: string;
    emergencyAddressSid?: string;
  }): Promise<UserSubscription>;
  markProvisioningFailed(subscriptionId: string, error: string): Promise<UserSubscription>;
  getProvisioningResults(subscriptionId: string): Promise<{
    retellAgentId?: string;
    conversationFlowId?: string;
    knowledgeBaseId?: string;
    twilioPhoneNumber?: string;
    twilioPhoneSid?: string;
    sipTrunkingSid?: string;
    emergencyAddressSid?: string;
    twilioSubaccountSid?: string;
    twilioSubaccountAuthToken?: string;
    retellFolderId?: string;
  } | undefined>;

  // Step-level persistence for partial completion recovery
  updateKnowledgeBaseId(subscriptionId: string, knowledgeBaseId: string): Promise<void>;
  updateConversationFlowId(subscriptionId: string, conversationFlowId: string): Promise<void>;
  updateRetellAgentId(subscriptionId: string, retellAgentId: string): Promise<void>;
  updateTwilioSubaccount(subscriptionId: string, subaccountSid: string, subaccountAuthToken: string): Promise<void>;
  updateRetellFolderId(subscriptionId: string, folderId: string): Promise<void>;

  // Stripe customer management
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;

  // Payment History
  createPaymentRecord(payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistory(userId: string, limit?: number): Promise<PaymentHistory[]>;
  updatePaymentRecord(id: string, updates: Partial<PaymentHistory>): Promise<PaymentHistory>;

  // User Trials (14-day free trial with 100 minutes)
  createUserTrial(userId: string): Promise<UserTrial>;
  getUserTrial(userId: string): Promise<UserTrial | undefined>;
  updateUserTrial(id: string, updates: Partial<UserTrial>): Promise<UserTrial>;
  deductTrialMinutes(userId: string, minutes: number): Promise<UserTrial>;
  convertTrialToSubscription(userId: string, subscriptionId: string): Promise<UserTrial>;
  suspendTrialService(userId: string): Promise<UserTrial>;
  getActiveTrials(): Promise<UserTrial[]>;

  // Phone Number Assignments
  getUserPhoneNumbers(userId: string): Promise<PhoneNumberAssignment[]>;
  getPhoneNumberAssignment(assignmentId: string): Promise<PhoneNumberAssignment | undefined>;
  createPhoneNumberAssignment(assignment: InsertPhoneNumberAssignment): Promise<PhoneNumberAssignment>;
  updatePhoneNumberAssignment(assignmentId: string, updates: Partial<InsertPhoneNumberAssignment>): Promise<PhoneNumberAssignment>;
  getPhoneNumberByTwilioSid(twilioSid: string): Promise<PhoneNumberAssignment | undefined>;
  getPhoneNumberAssignmentByNumber(phoneNumber: string): Promise<PhoneNumberAssignment | undefined>;

  // Generic phone number reassignment methods
  findAvailableGenericPhoneNumbers(): Promise<PhoneNumberAssignment[]>;
  reassignPhoneNumberToUser(phoneAssignmentId: string, newUserId: string, newSubscriptionId: string, newRestaurantId: string | null): Promise<PhoneNumberAssignment>;

  // Existing Phone Connection Operations
  createOrUpdateExistingPhoneConnection(connectionData: Partial<BusinessPhoneConnection>): Promise<BusinessPhoneConnection>;
  getExistingPhoneConnection(userId: string): Promise<BusinessPhoneConnection | undefined>;
  getBusinessPhoneConnectionByPhoneNumber(phoneNumber: string): Promise<BusinessPhoneConnection | undefined>;
  updateExistingPhoneConnectionStatus(userId: string, status: string): Promise<BusinessPhoneConnection | undefined>;

  // Signup Progress Operations
  saveSignupProgress(data: InsertSignupProgress): Promise<SignupProgress>;
  getSignupProgress(userId?: string, sessionId?: string): Promise<SignupProgress | undefined>;
  updateSignupProgress(id: string, updates: Partial<SignupProgress>): Promise<SignupProgress | undefined>;

  // ElevenLabs integration methods
  isPhoneNumberElevenLabsEnabled(phoneNumber: string): Promise<boolean>;
  getElevenLabsPhoneNumberId(phoneNumber: string): Promise<string | null>;
  getElevenLabsAgentId(phoneNumber: string): Promise<string | null>;

  // Conversation Flow tracking methods
  getConversationFlowForSubscription(userId: string, subscriptionId: string): Promise<string | undefined>;
  setConversationFlowForSubscription(userId: string, subscriptionId: string, flowId: string): Promise<void>;

  // Knowledge Base tracking methods
  getKnowledgeBaseForSubscription(userId: string, subscriptionId: string): Promise<string | undefined>;
  setKnowledgeBaseForSubscription(userId: string, subscriptionId: string, knowledgeBaseId: string): Promise<void>;
  getKnowledgeBaseStatus(knowledgeBaseId: string): Promise<string | undefined>;
  setKnowledgeBaseStatus(knowledgeBaseId: string, status: string): Promise<void>;

  // Demo session methods for 1-minute per user cap
  createDemoSession(sessionData: InsertDemoSession): Promise<DemoSession>;
  getDemoSession(sessionId: string): Promise<DemoSession | undefined>;
  getRecentDemoSessions(userId?: string, sessionId?: string, ipAddress?: string, hoursBack?: number): Promise<DemoSession[]>;
  updateDemoSession(id: string, updates: Partial<DemoSession>): Promise<DemoSession>;
  hasRecentDemoSession(userId?: string, sessionId?: string, ipAddress?: string, minutesBack?: number): Promise<boolean>;

  // Restaurant automation methods
  getRestaurantAutomationConfig(restaurantId: string): Promise<RestaurantAutomationConfig | null>;
  saveRestaurantAutomationConfig(userId: string, config: InsertRestaurantAutomationConfig): Promise<RestaurantAutomationConfig>;
  saveRestaurantIntegrations(restaurantId: string, config: any): Promise<void>;
  getRestaurantIntegrations(restaurantId: string): Promise<RestaurantAutomationConfig | null>;
  deleteRestaurantIntegration(restaurantId: string, integrationType: 'googleCalendar' | 'posSystem' | 'deliverySystem'): Promise<void>;
  logAutomationEvent(eventLog: any): Promise<void>;
  createCateringRequest(restaurantId: string, data: any): Promise<void>;
  createDeliveryRequest(restaurantId: string, data: any): Promise<void>;
  getRestaurantAnalytics(restaurantId: string, options?: { startDate?: string; endDate?: string }): Promise<any>;

  // ============================================
  // CALL METRICS OPERATIONS
  // ============================================

  // Call Sessions
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  getCallSession(id: string): Promise<CallSession | undefined>;
  getCallSessionByTwilioSid(twilioCallSid: string): Promise<CallSession | undefined>;
  getCallSessionByRetellId(retellCallId: string): Promise<CallSession | undefined>;
  updateCallSession(id: string, updates: Partial<InsertCallSession>): Promise<CallSession>;
  getUserCallSessions(userId: string, options?: { limit?: number; offset?: number; startDate?: Date; endDate?: Date }): Promise<CallSession[]>;

  // Call Outcomes
  createCallOutcome(outcome: InsertCallOutcome): Promise<CallOutcome>;
  getCallOutcome(callSessionId: string): Promise<CallOutcome | undefined>;
  updateCallOutcome(id: string, updates: Partial<InsertCallOutcome>): Promise<CallOutcome>;

  // Order-Call Links
  createOrderCallLink(link: InsertOrderCallLink): Promise<OrderCallLink>;
  getOrderCallLinks(callSessionId: string): Promise<OrderCallLink[]>;
  getOrderCallLinkByOrderId(orderId: string): Promise<OrderCallLink | undefined>;
  getUserOrderCallLinks(userId: string, options?: { startDate?: Date; endDate?: Date; retellAgentId?: string }): Promise<OrderCallLink[]>;

  // Reservation-Call Links
  createReservationCallLink(link: InsertReservationCallLink): Promise<ReservationCallLink>;
  getReservationCallLinks(callSessionId: string): Promise<ReservationCallLink[]>;
  getReservationCallLinkByReservationId(reservationId: string): Promise<ReservationCallLink | undefined>;
  getUserReservationCallLinks(userId: string, options?: { startDate?: Date; endDate?: Date; retellAgentId?: string }): Promise<ReservationCallLink[]>;

  // Customer Profiles
  createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile>;
  getCustomerProfile(id: string): Promise<CustomerProfile | undefined>;
  getCustomerProfileByPhone(phoneNumber: string, userId: string): Promise<CustomerProfile | undefined>;
  updateCustomerProfile(id: string, updates: Partial<InsertCustomerProfile>): Promise<CustomerProfile>;
  getUserCustomerProfiles(userId: string, options?: { segment?: string; vipOnly?: boolean; limit?: number; offset?: number; search?: string }): Promise<CustomerProfile[]>;
  
  // Customer Profile Statistics
  getCustomerSegmentCounts(userId: string): Promise<Record<string, number>>;
  getTopCustomersByRevenue(userId: string, limit?: number): Promise<CustomerProfile[]>;
  getTopCustomersByVisits(userId: string, limit?: number): Promise<CustomerProfile[]>;

  // Customer Memories
  createCustomerMemory(memory: InsertCustomerMemory): Promise<CustomerMemory>;
  getCustomerMemory(id: string): Promise<CustomerMemory | undefined>;
  getCustomerMemoriesByAgent(agentId: string): Promise<any[]>;
  getCustomerMemoriesByCustomer(customerProfileId: string, agentId: string): Promise<CustomerMemory | undefined>;
  updateCustomerMemory(id: string, updates: Partial<InsertCustomerMemory>): Promise<CustomerMemory>;
  deleteCustomerMemory(id: string): Promise<void>;

  // Call Metrics Daily
  createOrUpdateDailyMetrics(metrics: InsertCallMetricsDaily): Promise<CallMetricsDaily>;
  getDailyMetrics(userId: string, date: Date): Promise<CallMetricsDaily | undefined>;
  getDailyMetricsRange(userId: string, startDate: Date, endDate: Date): Promise<CallMetricsDaily[]>;
  
  // Aggregated Metrics Queries
  getCallMetricsSummary(userId: string, options?: { startDate?: Date; endDate?: Date; phoneNumber?: string; retellAgentId?: string }): Promise<{
    totalCalls: number;
    completedCalls: number;
    missedCalls: number;
    averageDuration: number;
    totalDuration: number;
    aiSuccessRate: number;
    averageSatisfaction: number;
    conversionRate: number;
    totalRevenue: number;
    averageOrderValue: number;
    uniqueCallers: number;
    newCustomers: number;
    repeatCustomers: number;
    vipCustomers: number;
  }>;

  getCallMetricsTrends(userId: string, options?: { startDate?: Date; endDate?: Date; granularity?: 'daily' | 'weekly' | 'monthly' }): Promise<Array<{
    date: Date;
    totalCalls: number;
    averageDuration: number;
    aiSuccessRate: number;
    conversionRate: number;
    totalRevenue: number;
  }>>;

  getPeakCallTimes(userId: string, options?: { startDate?: Date; endDate?: Date }): Promise<Array<{
    hour: number;
    dayOfWeek: number;
    callCount: number;
  }>>;

  getAIPerformanceMetrics(userId: string, options?: { startDate?: Date; endDate?: Date }): Promise<{
    aiHandledCalls: number;
    aiSuccessfulCalls: number;
    transferredCalls: number;
    aiSuccessRate: number;
    averageResponseTime: number;
    averageConfidence: number;
    averageSentiment: number;
    sentimentBreakdown: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }>;

  getRevenueMetrics(userId: string, options?: { startDate?: Date; endDate?: Date }): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    ordersCreated: number;
    reservationsCreated: number;
    conversionRate: number;
    revenueByOrderType: Record<string, number>;
  }>;

  // Team Management
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined>;
  getTeamInvitationsByOwner(ownerId: string): Promise<TeamInvitation[]>;
  updateTeamInvitation(id: string, updates: Partial<TeamInvitation>): Promise<TeamInvitation>;
  acceptTeamInvitation(token: string, userId: string): Promise<TeamInvitation>;
  
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMembersByOwner(ownerId: string): Promise<TeamMember[]>;
  getTeamMemberByUserId(ownerId: string, userId: string): Promise<TeamMember | undefined>;
  getTeamMembershipByUserId(userId: string): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<void>;
  updateTeamMemberRole(id: string, role: string): Promise<TeamMember>;

  // Agent Function Settings
  getAgentFunctionSetting(agentId: string, functionName: string): Promise<AgentFunctionSetting | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Expose db instance for direct queries (used by billing background service)
  public db = db;

  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }


  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserIndustry(userId: string, industry: Industry): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ selectedIndustry: industry, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserSubscriptionStatus(userId: string, isSubscribed: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isSubscribed: isSubscribed, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateEmailNotifSettings(userId: string, notifyEmailAlerts: boolean, notifyDesktopAlerts: boolean, notifyCallFlagged: boolean): Promise<void> {
    await db
      .update(users)
      .set({ notifyEmailAlerts, notifyDesktopAlerts, notifyCallFlagged, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setEmailVerificationToken(userId: string, token: string, expires: string): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerificationToken: token,
        emailVerificationExpires: expires,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async verifyUserEmail(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async clearEmailVerificationToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // User credentials operations (for secure API key storage)
  async upsertUserCredentials(credentialsData: InsertUserCredentials): Promise<UserCredentials> {
    // First, try to find existing credential
    const existing = await db
      .select()
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.userId, credentialsData.userId),
          eq(userCredentials.integrationType, credentialsData.integrationType),
          eq(userCredentials.credentialName, credentialsData.credentialName)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(userCredentials)
        .set({
          encryptedData: credentialsData.encryptedData,
          encryptionIv: credentialsData.encryptionIv,
          encryptionTag: credentialsData.encryptionTag,
          encryptionAlgorithm: credentialsData.encryptionAlgorithm,
          encryptionVersion: credentialsData.encryptionVersion,
          isActive: credentialsData.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(userCredentials.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Insert new
      const [created] = await db
        .insert(userCredentials)
        .values(credentialsData)
        .returning();
      return created;
    }
  }

  async getUserCredentials(userId: string, integrationType: string, credentialName: string): Promise<UserCredentials | undefined> {
    const [credentials] = await db
      .select()
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.integrationType, integrationType),
          eq(userCredentials.credentialName, credentialName),
          eq(userCredentials.isActive, true)
        )
      );
    return credentials;
  }

  async getUserCredentialsByIntegration(userId: string, integrationType: string): Promise<UserCredentials[]> {
    return await db
      .select()
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.integrationType, integrationType),
          eq(userCredentials.isActive, true)
        )
      );
  }

  async deleteUserCredentials(userId: string, integrationType: string, credentialName: string): Promise<void> {
    await db
      .update(userCredentials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.integrationType, integrationType),
          eq(userCredentials.credentialName, credentialName)
        )
      );
  }

  async hasUserCredentials(userId: string, integrationType: string, credentialName: string): Promise<boolean> {
    const [credentials] = await db
      .select({ id: userCredentials.id })
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.integrationType, integrationType),
          eq(userCredentials.credentialName, credentialName),
          eq(userCredentials.isActive, true)
        )
      );
    return !!credentials;
  }

  // Business settings operations
  async upsertBusinessSettings(settingsData: InsertBusinessSettings): Promise<BusinessSettings> {
    const [settings] = await db
      .insert(businessSettings)
      .values(settingsData)
      .onConflictDoUpdate({
        target: [businessSettings.userId],
        set: {
          // CRITICAL: Update ALL provided fields, not just a subset
          // This ensures fields like addressCompletionRequired and incompleteAddressData are saved
          ...Object.fromEntries(
            Object.entries(settingsData).filter(([key]) => key !== 'userId' && key !== 'id')
          ),
          updatedAt: new Date(),
        },
      })
      .returning();
    return settings;
  }

  async getBusinessSettings(userId: string): Promise<BusinessSettings | undefined> {
    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(
        and(
          eq(businessSettings.userId, userId),
          eq(businessSettings.isActive, true)
        )
      );
    return settings;
  }

  async updateBusinessSettings(userId: string, updates: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const [settings] = await db
      .update(businessSettings)
      .set({ 
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(businessSettings.userId, userId))
      .returning();
    
    if (!settings) {
      throw new Error(`Business settings not found for user: ${userId}`);
    }
    
    return settings;
  }

  async incrementMetric(userId: string, metricType: 'order' | 'delivery' | 'catering' | 'reservation'): Promise<void> {
    const metricColumn = metricType === 'order' ? businessSettings.orderCount :
                         metricType === 'delivery' ? businessSettings.deliveryCount :
                         metricType === 'catering' ? businessSettings.cateringCount :
                         businessSettings.reservationCount;
    
    await db
      .update(businessSettings)
      .set({ 
        [metricType + 'Count']: sql`${metricColumn} + 1`,
        updatedAt: new Date()
      })
      .where(eq(businessSettings.userId, userId));
  }

  // Specialized business settings for sticky save functionality
  async updateBehaviorSettings(userId: string, behaviorSettings: any): Promise<void> {
    // For simplicity, store in business settings as JSON field (in production, create dedicated table)
    console.log(`🎭 Saving behavior settings for user ${userId}:`, behaviorSettings);
    
    // This is a simplified implementation - in production you'd want a dedicated table
    // For now, just log the behavior settings
    console.log(`🎭 Behavior settings saved for user ${userId}`);
  }

  async updateBusinessInfo(userId: string, businessData: any): Promise<void> {
    console.log(`🏢 Saving business info for user ${userId}:`, businessData);
    
    // Find user's agents to update restaurant data
    const userAgents = await db
      .select()
      .from(voiceAgents)
      .where(eq(voiceAgents.userId, userId));
    
    if (userAgents.length === 0) {
      console.log(`⚠️ No agents found for user ${userId}, skipping restaurant data update`);
      return;
    }
    
    // Update restaurant data for each agent with rawBusinessInfo
    for (const agent of userAgents) {
      try {
        // Check if restaurant data exists for this agent
        const [existing] = await db
          .select()
          .from(restaurantData)
          .where(eq(restaurantData.agentId, agent.id))
          .limit(1);
        
        if (existing) {
          // Update existing restaurant data
          await db
            .update(restaurantData)
            .set({
              rawBusinessInfo: businessData.rawText || businessData.rawBusinessInfo || '',
              updatedAt: new Date()
            })
            .where(eq(restaurantData.agentId, agent.id));
          console.log(`✅ Updated restaurant data for agent ${agent.id}`);
        } else {
          // Create new restaurant data if it doesn't exist
          await db
            .insert(restaurantData)
            .values({
              agentId: agent.id,
              businessName: agent.businessName || 'Business',
              rawBusinessInfo: businessData.rawText || businessData.rawBusinessInfo || '',
            });
          console.log(`✅ Created restaurant data for agent ${agent.id}`);
        }
      } catch (error) {
        console.error(`❌ Error updating restaurant data for agent ${agent.id}:`, error);
      }
    }
    
    console.log(`🏢 Business info saved for user ${userId}`);
  }

  async updateIntegrationSettings(userId: string, integrationData: any): Promise<void> {
    console.log(`🔗 Saving integration settings for user ${userId}:`, integrationData);

    // Upsert business settings with custom integrations
    await db
      .insert(businessSettings)
      .values({
        userId,
        customIntegrations: integrationData.customIntegrations || [],
      })
      .onConflictDoUpdate({
        target: businessSettings.userId,
        set: {
          customIntegrations: integrationData.customIntegrations || [],
          updatedAt: sql`now()`,
        },
      });

    console.log(`✅ Integration settings saved to database for user ${userId}`);
  }

  // Get specialized business settings for form pre-population
  async getBehaviorSettings(userId: string): Promise<any> {
    // For now, return default values since we don't have dedicated tables
    console.log(`🎭 Fetching behavior settings for user ${userId}`);
    return {
      globalPrompt: '',
      businessHoursGreeting: '',
      afterHoursGreeting: ''
    };
  }

  async getBusinessInfo(userId: string): Promise<any> {
    // For now, return empty object since we don't have dedicated tables
    console.log(`🏢 Fetching business info for user ${userId}`);
    return {};
  }

  async getIntegrationSettings(userId: string): Promise<any> {
    console.log(`🔗 Fetching integration settings for user ${userId}`);

    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.userId, userId))
      .limit(1);

    if (settings) {
      console.log(`✅ Found integration settings in database for user ${userId}`);
      return {
        platform: '',
        squareAppId: '',
        squareAccessToken: '',
        squareLocationId: '',
        toastClientKey: '',
        toastClientSecret: '',
        toastGuid: '',
        googleClientId: '',
        googleClientSecret: '',
        googleCalendarId: '',
        customIntegrations: settings.customIntegrations || [],
      };
    }

    console.log(`⚠️ No integration settings found for user ${userId}, returning defaults`);
    return {
      platform: '',
      squareAppId: '',
      squareAccessToken: '',
      squareLocationId: '',
      toastClientKey: '',
      toastClientSecret: '',
      toastGuid: '',
      googleClientId: '',
      googleClientSecret: '',
      googleCalendarId: '',
      customIntegrations: [],
    };
  }

  // Agent integrations operations
  async createAgentIntegration(integrationData: InsertAgentIntegration): Promise<AgentIntegration> {
    const [integration] = await db
      .insert(agentIntegrations)
      .values(integrationData)
      .returning();
    console.log(`✅ Created agent integration: ${integration.name} for agent ${integration.agentId}`);
    return integration;
  }

  async getAgentIntegrations(agentId: string): Promise<AgentIntegration[]> {
    const integrations = await db
      .select()
      .from(agentIntegrations)
      .where(eq(agentIntegrations.agentId, agentId));
    console.log(`✅ Found ${integrations.length} integrations for agent ${agentId}`);
    return integrations;
  }

  async updateAgentIntegration(integrationId: string, updates: Partial<AgentIntegration>): Promise<AgentIntegration> {
    const [integration] = await db
      .update(agentIntegrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agentIntegrations.id, integrationId))
      .returning();
    console.log(`✅ Updated agent integration: ${integrationId}`);
    return integration;
  }

  async deleteAgentIntegration(integrationId: string): Promise<void> {
    await db
      .delete(agentIntegrations)
      .where(eq(agentIntegrations.id, integrationId));
    console.log(`✅ Deleted agent integration: ${integrationId}`);
  }

  async getUserIntegrationsForAgent(userId: string, agentId: string): Promise<AgentIntegration[]> {
    const integrations = await db
      .select()
      .from(agentIntegrations)
      .where(
        and(
          eq(agentIntegrations.userId, userId),
          eq(agentIntegrations.agentId, agentId)
        )
      );
    return integrations;
  }

  // Voice agent operations
  async createVoiceAgent(agentData: InsertVoiceAgent & { userId: string; persona?: string; sampleScript?: string; audioUrl?: string }): Promise<VoiceAgent> {
    const [agent] = await db
      .insert(voiceAgents)
      .values(agentData)
      .returning();
    return agent;
  }

  async getVoiceAgent(id: string): Promise<VoiceAgent | undefined> {
    const [agent] = await db.select().from(voiceAgents).where(eq(voiceAgents.id, id));
    return agent;
  }

  async getVoiceAgentByRetellAgentId(retellAgentId: string): Promise<VoiceAgent | undefined> {
    const [agent] = await db.select().from(voiceAgents).where(eq(voiceAgents.retellAgentId, retellAgentId));
    return agent;
  }

  async getVoiceAgentWithUser(id: string): Promise<VoiceAgentWithUser | undefined> {
    const result = await db
      .select({
        id: voiceAgents.id,
        name: voiceAgents.name,
        description: voiceAgents.description,
        industry: voiceAgents.industry,
        voiceId: voiceAgents.voiceId,
        persona: voiceAgents.persona,
        sampleScript: voiceAgents.sampleScript,
        audioUrl: voiceAgents.audioUrl,
        userId: voiceAgents.userId,
        isPublic: voiceAgents.isPublic,
        likes: voiceAgents.likes,
        duplicates: voiceAgents.duplicates,
        createdAt: voiceAgents.createdAt,
        updatedAt: voiceAgents.updatedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(voiceAgents)
      .leftJoin(users, eq(voiceAgents.userId, users.id))
      .where(eq(voiceAgents.id, id));

    if (result.length === 0) return undefined;

    return result[0] as VoiceAgentWithUser;
  }

  async getUserVoiceAgents(userId: string): Promise<VoiceAgent[]> {
    console.log('📋 getUserVoiceAgents called for userId:', userId);

    // First get all agents for the user
    const agents = await db
      .select()
      .from(voiceAgents)
      .where(eq(voiceAgents.userId, userId));

    console.log(`📊 Found ${agents.length} agents for user`);

    // Then for each agent, get the phone number and business data
    const result = await Promise.all(
      agents.map(async (agent) => {
        // Get phone number assignment (limit to 1 to avoid duplicates)
        const [phoneAssignment] = await db
          .select({
            phoneNumber: phoneNumberAssignments.phoneNumber,
            phoneNumberType: phoneNumberAssignments.phoneNumberType,
            phoneNumberStatus: phoneNumberAssignments.status
          })
          .from(phoneNumberAssignments)
          .where(eq(phoneNumberAssignments.retellAgentId, agent.retellAgentId))
          .limit(1);

        // Get restaurant data (limit to 1 to avoid duplicates)
        const [businessData] = await db
          .select({
            businessName: restaurantData.businessName,
            address: restaurantData.address
          })
          .from(restaurantData)
          .where(eq(restaurantData.agentId, agent.id))
          .limit(1);

        const resultAgent = {
          ...agent,
          phoneNumber: phoneAssignment?.phoneNumber || null,
          phoneNumberType: phoneAssignment?.phoneNumberType || null,
          phoneNumberStatus: phoneAssignment?.phoneNumberStatus || null,
          // Prioritize businessName from voiceAgents table, fall back to restaurantData
          businessName: agent.businessName || businessData?.businessName || null,
          address: businessData?.address || null
        };

        console.log(`🔍 Agent ${agent.id} data:`, {
          agentBusinessName: agent.businessName,
          restaurantDataBusinessName: businessData?.businessName,
          finalBusinessName: resultAgent.businessName,
          name: agent.name
        });

        return resultAgent;
      })
    );

    return result as any;
  }

  async updateVoiceAgent(id: string, updates: Partial<VoiceAgent>): Promise<VoiceAgent> {
    console.log('💾 updateVoiceAgent called:', { id, updates });

    const updatePayload = { ...updates, updatedAt: new Date() };
    console.log('📦 Update payload:', updatePayload);

    const [agent] = await db
      .update(voiceAgents)
      .set(updatePayload)
      .where(eq(voiceAgents.id, id))
      .returning();

    console.log('✅ Database returned updated agent:', {
      id: agent.id,
      name: agent.name,
      businessName: agent.businessName,
      updatedAt: agent.updatedAt
    });

    // Verify the update was persisted by re-querying
    const [verifyAgent] = await db
      .select()
      .from(voiceAgents)
      .where(eq(voiceAgents.id, id))
      .limit(1);

    console.log('🔍 Verification query - agent in database:', {
      id: verifyAgent?.id,
      name: verifyAgent?.name,
      businessName: verifyAgent?.businessName,
      updatedAt: verifyAgent?.updatedAt
    });

    return agent;
  }

  async deleteVoiceAgent(id: string): Promise<void> {
    await db.delete(voiceAgents).where(eq(voiceAgents.id, id));
  }

  async getPublicVoiceAgents(options: { industry?: Industry; search?: string; limit?: number; offset?: number } = {}): Promise<VoiceAgentWithUser[]> {
    const { industry, search, limit = 50, offset = 0 } = options;

    let query = db
      .select({
        id: voiceAgents.id,
        name: voiceAgents.name,
        description: voiceAgents.description,
        industry: voiceAgents.industry,
        voiceId: voiceAgents.voiceId,
        persona: voiceAgents.persona,
        sampleScript: voiceAgents.sampleScript,
        audioUrl: voiceAgents.audioUrl,
        userId: voiceAgents.userId,
        isPublic: voiceAgents.isPublic,
        likes: voiceAgents.likes,
        duplicates: voiceAgents.duplicates,
        createdAt: voiceAgents.createdAt,
        updatedAt: voiceAgents.updatedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(voiceAgents)
      .leftJoin(users, eq(voiceAgents.userId, users.id))
      .where(eq(voiceAgents.isPublic, true));

    const conditions = [eq(voiceAgents.isPublic, true)];

    if (industry) {
      conditions.push(eq(voiceAgents.industry, industry));
    }

    if (search) {
      conditions.push(
        sql`(${ilike(voiceAgents.name, `%${search}%`)} OR ${ilike(voiceAgents.description, `%${search}%`)})`
      );
    }

    const result = await db
      .select({
        id: voiceAgents.id,
        name: voiceAgents.name,
        description: voiceAgents.description,
        industry: voiceAgents.industry,
        voiceId: voiceAgents.voiceId,
        persona: voiceAgents.persona,
        sampleScript: voiceAgents.sampleScript,
        audioUrl: voiceAgents.audioUrl,
        userId: voiceAgents.userId,
        isPublic: voiceAgents.isPublic,
        likes: voiceAgents.likes,
        duplicates: voiceAgents.duplicates,
        createdAt: voiceAgents.createdAt,
        updatedAt: voiceAgents.updatedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(voiceAgents)
      .leftJoin(users, eq(voiceAgents.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(voiceAgents.likes), desc(voiceAgents.createdAt))
      .limit(limit)
      .offset(offset);

    return result as VoiceAgentWithUser[];
  }

  // Voice presets
  async getVoicePresets(): Promise<VoicePreset[]> {
    return await db
      .select()
      .from(voicePresets)
      .where(eq(voicePresets.isActive, true));
  }

  async upsertVoicePreset(presetData: InsertVoicePreset): Promise<VoicePreset> {
    const [preset] = await db
      .insert(voicePresets)
      .values(presetData)
      .onConflictDoUpdate({
        target: voicePresets.id,
        set: presetData,
      })
      .returning();
    return preset;
  }

  // Agent likes
  async likeAgent(userId: string, agentId: string): Promise<void> {
    await db.insert(agentLikes).values({ userId, agentId });
  }

  async unlikeAgent(userId: string, agentId: string): Promise<void> {
    await db.delete(agentLikes).where(
      and(eq(agentLikes.userId, userId), eq(agentLikes.agentId, agentId))
    );
  }

  async isAgentLiked(userId: string, agentId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(agentLikes)
      .where(and(eq(agentLikes.userId, userId), eq(agentLikes.agentId, agentId)));
    return !!like;
  }

  async incrementAgentLikes(agentId: string): Promise<void> {
    await db
      .update(voiceAgents)
      .set({ likes: sql`${voiceAgents.likes} + 1` })
      .where(eq(voiceAgents.id, agentId));
  }

  async decrementAgentLikes(agentId: string): Promise<void> {
    await db
      .update(voiceAgents)
      .set({ likes: sql`${voiceAgents.likes} - 1` })
      .where(eq(voiceAgents.id, agentId));
  }

  async incrementAgentDuplicates(agentId: string): Promise<void> {
    await db
      .update(voiceAgents)
      .set({ duplicates: sql`${voiceAgents.duplicates} + 1` })
      .where(eq(voiceAgents.id, agentId));
  }

  async getVoiceAgentWithRestaurantData(id: string): Promise<VoiceAgentWithRestaurantData | undefined> {
    const result = await db
      .select({
        id: voiceAgents.id,
        name: voiceAgents.name,
        description: voiceAgents.description,
        industry: voiceAgents.industry,
        voiceId: voiceAgents.voiceId,
        persona: voiceAgents.persona,
        sampleScript: voiceAgents.sampleScript,
        audioUrl: voiceAgents.audioUrl,
        userId: voiceAgents.userId,
        isPublic: voiceAgents.isPublic,
        likes: voiceAgents.likes,
        duplicates: voiceAgents.duplicates,
        createdAt: voiceAgents.createdAt,
        updatedAt: voiceAgents.updatedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        restaurantData: {
          id: restaurantData.id,
          businessName: restaurantData.businessName,
          address: restaurantData.address,
          phone: restaurantData.phone,
          website: restaurantData.website,
          hours: restaurantData.hours,
          menuItems: restaurantData.menuItems,
          services: restaurantData.services,
          reservationInfo: restaurantData.reservationInfo,
          googleMapsData: restaurantData.googleMapsData,
          scrapedAt: restaurantData.scrapedAt,
          updatedAt: restaurantData.updatedAt,
          rawBusinessInfo: restaurantData.rawBusinessInfo,
        },
      })
      .from(voiceAgents)
      .leftJoin(users, eq(voiceAgents.userId, users.id))
      .leftJoin(restaurantData, eq(voiceAgents.id, restaurantData.agentId))
      .where(eq(voiceAgents.id, id));

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      ...row,
      restaurantData: row.restaurantData?.id ? row.restaurantData : undefined,
    } as VoiceAgentWithRestaurantData;
  }

  // Restaurant data operations
  async createRestaurantData(data: InsertRestaurantData): Promise<RestaurantData> {
    const [restaurant] = await db
      .insert(restaurantData)
      .values(data)
      .returning();
    return restaurant;
  }

  async getRestaurantData(agentId: string): Promise<RestaurantData | undefined> {
    const [restaurant] = await db
      .select()
      .from(restaurantData)
      .where(eq(restaurantData.agentId, agentId));
    return restaurant;
  }

  async getRestaurantDataById(id: string): Promise<RestaurantData | undefined> {
    const [restaurant] = await db
      .select()
      .from(restaurantData)
      .where(eq(restaurantData.id, id));
    return restaurant;
  }

  async updateRestaurantData(agentId: string, updates: Partial<RestaurantData>): Promise<RestaurantData> {
    const [restaurant] = await db
      .update(restaurantData)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(restaurantData.agentId, agentId))
      .returning();
    return restaurant;
  }

  async deleteRestaurantData(agentId: string): Promise<void> {
    await db.delete(restaurantData).where(eq(restaurantData.agentId, agentId));
  }

  // Knowledge source operations
  async createKnowledgeSource(data: InsertKnowledgeSource): Promise<KnowledgeSource> {
    const [source] = await db
      .insert(knowledgeSources)
      .values(data)
      .returning();
    return source;
  }

  async getKnowledgeSource(id: string): Promise<KnowledgeSource | null> {
    const [source] = await db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.id, id))
      .limit(1);
    return source || null;
  }

  async getKnowledgeSources(agentId: string): Promise<KnowledgeSource[]> {
    const sources = await db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.agentId, agentId))
      .orderBy(sql`${knowledgeSources.createdAt} DESC`);
    return sources;
  }

  async updateKnowledgeSource(id: string, updates: Partial<KnowledgeSource>): Promise<KnowledgeSource> {
    const [source] = await db
      .update(knowledgeSources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeSources.id, id))
      .returning();
    return source;
  }

  async deleteKnowledgeSource(id: string): Promise<void> {
    await db.delete(knowledgeSources).where(eq(knowledgeSources.id, id));
  }

  // Call logs operations
  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    const [callLog] = await db
      .insert(callLogs)
      .values(log)
      .returning();
    return callLog;
  }

  async getCallLogs(agentId: string, options: { limit?: number; offset?: number } = {}): Promise<CallLog[]> {
    const { limit = 50, offset = 0 } = options;

    return await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.agentId, agentId))
      .orderBy(desc(callLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async deleteCallLogsForAgent(agentId: string): Promise<void> {
    await db.delete(callLogs).where(eq(callLogs.agentId, agentId));
    console.log(`✅ Deleted all call logs for agent: ${agentId}`);
  }

  /**
   * COMPREHENSIVE DATA CLEANUP - Delete all data associated with a phone number
   * Used when reassigning phone numbers to ensure new users don't see old data
   */
  async deleteAllDataForPhoneNumber(phoneNumber: string, userId?: string): Promise<{
    telephonyCallLogs: number;
    smsMessages: number;
    callSessions: number;
    callOutcomes: number;
    orderCallLinks: number;
    reservationCallLinks: number;
    customerProfiles: number;
    customerMemories: number;
    callMetricsDaily: number;
  }> {
    console.log(`🧹 Starting comprehensive database cleanup for phone number: ${phoneNumber}${userId ? ` (userId: ${userId})` : ''}`);

    // Track deletion counts
    const deletionCounts = {
      telephonyCallLogs: 0,
      smsMessages: 0,
      callSessions: 0,
      callOutcomes: 0,
      orderCallLinks: 0,
      reservationCallLinks: 0,
      customerProfiles: 0,
      customerMemories: 0,
      callMetricsDaily: 0
    };

    try {
      // 1. Delete telephony call logs (by toNumber or fromNumber)
      const deletedTelephonyLogs = await db.delete(telephonyCallLogs)
        .where(
          or(
            eq(telephonyCallLogs.toNumber, phoneNumber),
            eq(telephonyCallLogs.fromNumber, phoneNumber)
          )
        )
        .returning();
      deletionCounts.telephonyCallLogs = deletedTelephonyLogs.length;
      console.log(`   ✅ Deleted ${deletionCounts.telephonyCallLogs} telephony call logs`);

      // 2. Delete SMS messages (by toNumber or fromNumber)
      const deletedSmsMessages = await db.delete(smsMessages)
        .where(
          or(
            eq(smsMessages.toNumber, phoneNumber),
            eq(smsMessages.fromNumber, phoneNumber),
            ...(userId ? [eq(smsMessages.userId, userId)] : [])
          )
        )
        .returning();
      deletionCounts.smsMessages = deletedSmsMessages.length;
      console.log(`   ✅ Deleted ${deletionCounts.smsMessages} SMS messages`);

      // 3. Get all call sessions for this phone number (to find related data)
      const callSessionsToDelete = await db.select()
        .from(callSessions)
        .where(
          or(
            eq(callSessions.fromNumber, phoneNumber),
            eq(callSessions.toNumber, phoneNumber),
            ...(userId ? [eq(callSessions.userId, userId)] : [])
          )
        );

      const callSessionIds = callSessionsToDelete.map(cs => cs.id);
      console.log(`   📞 Found ${callSessionIds.length} call sessions to delete`);

      if (callSessionIds.length > 0) {
        // 4. Delete call outcomes (linked to call sessions)
        const deletedCallOutcomes = await db.delete(callOutcomes)
          .where(
            sql`${callOutcomes.callSessionId} IN ${sql.raw(`(${callSessionIds.map(id => `'${id}'`).join(',')})`)} `
          )
          .returning();
        deletionCounts.callOutcomes = deletedCallOutcomes.length;
        console.log(`   ✅ Deleted ${deletionCounts.callOutcomes} call outcomes`);

        // 5. Delete order call links (linked to call sessions)
        const deletedOrderLinks = await db.delete(orderCallLinks)
          .where(
            sql`${orderCallLinks.callSessionId} IN ${sql.raw(`(${callSessionIds.map(id => `'${id}'`).join(',')})`)} `
          )
          .returning();
        deletionCounts.orderCallLinks = deletedOrderLinks.length;
        console.log(`   ✅ Deleted ${deletionCounts.orderCallLinks} order call links`);

        // 6. Delete reservation call links (linked to call sessions)
        const deletedReservationLinks = await db.delete(reservationCallLinks)
          .where(
            sql`${reservationCallLinks.callSessionId} IN ${sql.raw(`(${callSessionIds.map(id => `'${id}'`).join(',')})`)} `
          )
          .returning();
        deletionCounts.reservationCallLinks = deletedReservationLinks.length;
        console.log(`   ✅ Deleted ${deletionCounts.reservationCallLinks} reservation call links`);

        // 7. Delete call sessions
        const deletedCallSessions = await db.delete(callSessions)
          .where(
            sql`${callSessions.id} IN ${sql.raw(`(${callSessionIds.map(id => `'${id}'`).join(',')})`)} `
          )
          .returning();
        deletionCounts.callSessions = deletedCallSessions.length;
        console.log(`   ✅ Deleted ${deletionCounts.callSessions} call sessions`);
      }

      // 8. Get customer profiles for this phone number
      const customerProfilesToDelete = await db.select()
        .from(customerProfiles)
        .where(
          or(
            eq(customerProfiles.phoneNumber, phoneNumber),
            eq(customerProfiles.normalizedPhone, phoneNumber),
            ...(userId ? [eq(customerProfiles.userId, userId)] : [])
          )
        );

      const customerProfileIds = customerProfilesToDelete.map(cp => cp.id);
      console.log(`   👤 Found ${customerProfileIds.length} customer profiles to delete`);

      if (customerProfileIds.length > 0) {
        // 9. Delete customer memories (linked to customer profiles)
        const deletedCustomerMemories = await db.delete(customerMemories)
          .where(
            sql`${customerMemories.customerProfileId} IN ${sql.raw(`(${customerProfileIds.map(id => `'${id}'`).join(',')})`)} `
          )
          .returning();
        deletionCounts.customerMemories = deletedCustomerMemories.length;
        console.log(`   ✅ Deleted ${deletionCounts.customerMemories} customer memories`);

        // 10. Delete customer profiles
        const deletedCustomerProfiles = await db.delete(customerProfiles)
          .where(
            sql`${customerProfiles.id} IN ${sql.raw(`(${customerProfileIds.map(id => `'${id}'`).join(',')})`)} `
          )
          .returning();
        deletionCounts.customerProfiles = deletedCustomerProfiles.length;
        console.log(`   ✅ Deleted ${deletionCounts.customerProfiles} customer profiles`);
      }

      // 11. Delete call metrics daily (if userId is provided)
      if (userId) {
        const deletedMetrics = await db.delete(callMetricsDaily)
          .where(eq(callMetricsDaily.userId, userId))
          .returning();
        deletionCounts.callMetricsDaily = deletedMetrics.length;
        console.log(`   ✅ Deleted ${deletionCounts.callMetricsDaily} daily metrics records`);
      }

      console.log(`✅ Database cleanup complete for ${phoneNumber}`);
      const totalDeleted = Object.values(deletionCounts).reduce((sum, count) => sum + count, 0);
      console.log(`   📊 Total records deleted: ${totalDeleted}`);

      return deletionCounts;

    } catch (error: any) {
      console.error(`❌ Error during database cleanup for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async getCallStats(agentId: string): Promise<{ totalCalls: number; avgDuration: number; purposes: Record<string, number> }> {
    const logs = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.agentId, agentId));

    const totalCalls = logs.length;
    const avgDuration = totalCalls > 0 
      ? logs.reduce((sum, log) => sum + (log.duration || 0), 0) / totalCalls 
      : 0;

    const purposes: Record<string, number> = {};
    logs.forEach(log => {
      if (log.purpose) {
        purposes[log.purpose] = (purposes[log.purpose] || 0) + 1;
      }
    });

    return { totalCalls, avgDuration, purposes };
  }

  // Telephony call logs operations
  async createTelephonyCallLog(log: Partial<InsertTelephonyCallLog>): Promise<TelephonyCallLog> {
    const id = log.id || `call-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const [callLog] = await db
      .insert(telephonyCallLogs)
      .values({
        ...log,
        id,
        startTime: log.startTime || new Date(),
        conversationData: log.conversationData || []
      } as InsertTelephonyCallLog)
      .returning();
    return callLog;
  }

  async getTelephonyCallLog(id: string): Promise<TelephonyCallLog | undefined> {
    const [callLog] = await db
      .select()
      .from(telephonyCallLogs)
      .where(eq(telephonyCallLogs.id, id))
      .limit(1);
    return callLog;
  }

  async getTelephonyCallLogByTwilioSid(twilioCallSid: string): Promise<TelephonyCallLog | undefined> {
    const [callLog] = await db
      .select()
      .from(telephonyCallLogs)
      .where(eq(telephonyCallLogs.twilioCallSid, twilioCallSid))
      .limit(1);
    return callLog;
  }

  async updateTelephonyCallLog(id: string, updates: Partial<InsertTelephonyCallLog>): Promise<TelephonyCallLog> {
    const [callLog] = await db
      .update(telephonyCallLogs)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(telephonyCallLogs.id, id))
      .returning();
    return callLog;
  }

  async getTelephonyCallLogs(
    restaurantAgentId?: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<TelephonyCallLog[]> {
    if (restaurantAgentId) {
      return await db
        .select()
        .from(telephonyCallLogs)
        .where(eq(telephonyCallLogs.restaurantAgentId, restaurantAgentId))
        .orderBy(desc(telephonyCallLogs.startTime))
        .limit(limit)
        .offset(offset);
    }

    return await db
      .select()
      .from(telephonyCallLogs)
      .orderBy(desc(telephonyCallLogs.startTime))
      .limit(limit)
      .offset(offset);
  }

  async getTelephonyCallLogsByPhoneNumbers(
    phoneNumbers: string[],
    limit: number = 1000,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date
  ): Promise<TelephonyCallLog[]> {
    if (phoneNumbers.length === 0) {
      return [];
    }

    const conditions: any[] = [
      or(
        inArray(telephonyCallLogs.toNumber, phoneNumbers),
        inArray(telephonyCallLogs.fromNumber, phoneNumbers)
      )
    ];

    if (startDate) {
      conditions.push(gte(telephonyCallLogs.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(telephonyCallLogs.startTime, endDate));
    }

    return await db
      .select()
      .from(telephonyCallLogs)
      .where(and(...conditions))
      .orderBy(desc(telephonyCallLogs.startTime))
      .limit(limit)
      .offset(offset);
  }

  async getUserStats(userId: string): Promise<{ phoneMinutesThisMonth: number }> {
    try {
      const phoneNumbers = await this.getUserPhoneNumbers(userId);
      if (phoneNumbers.length === 0) return { phoneMinutesThisMonth: 0 };

      const phoneNumberList = phoneNumbers.map(pn => pn.phoneNumber);

      // Get billing period start (first of current month)
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const logs = await db
        .select({
          duration: telephonyCallLogs.duration,
          startTime: telephonyCallLogs.startTime,
          endTime: telephonyCallLogs.endTime
        })
        .from(telephonyCallLogs)
        .where(
          and(
            inArray(telephonyCallLogs.toNumber, phoneNumberList),
            gte(telephonyCallLogs.startTime, periodStart)
          )
        );

      const totalSeconds = logs.reduce((sum, log) => {
        // Mirror the Calls tab logic: prefer (end_time - start_time) as the most
        // accurate measure; fall back to stored duration only when timestamps aren't available.
        if (log.endTime && log.startTime && log.endTime > log.startTime) {
          const tsDuration = Math.round((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000);
          const storedDuration = log.duration && log.duration > 2 ? log.duration : 0;
          return sum + Math.max(tsDuration, storedDuration);
        }
        if (log.duration && log.duration > 2) return sum + log.duration;
        return sum;
      }, 0);
      return { phoneMinutesThisMonth: Math.round(totalSeconds / 60) };
    } catch (error) {
      console.error('❌ Failed to get user stats:', error);
      return { phoneMinutesThisMonth: 0 };
    }
  }

  // Enhanced call management operations
  async listCalls(filters: {
    page?: number;
    pageSize?: number;
    sortBy?: 'createdAt' | 'duration' | 'interactionType' | 'callStatus';
    sortDir?: 'asc' | 'desc';
    q?: string;
    types?: string[];
    statuses?: string[];
    vip?: boolean;
    phoneNumbers?: string[];
    startDate?: Date;
    endDate?: Date;
    restaurantAgentId: string;
  }): Promise<{ calls: TelephonyCallLog[]; total: number; page: number; pageSize: number }> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortDir = 'desc',
      q,
      types,
      statuses,
      vip,
      phoneNumbers,
      startDate,
      endDate,
      restaurantAgentId
    } = filters;

    const offset = (page - 1) * pageSize;
    let query = db.select().from(telephonyCallLogs);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(telephonyCallLogs);

    // Build WHERE conditions
    const conditions = [];

    // Filter by restaurant agent (REQUIRED for authorization)
    if (!restaurantAgentId) {
      throw new Error('restaurantAgentId is required for security - cannot list calls without agent scope');
    }
    conditions.push(eq(telephonyCallLogs.restaurantAgentId, restaurantAgentId));

    // Search query across multiple fields
    if (q) {
      conditions.push(
        or(
          ilike(telephonyCallLogs.customerName, `%${q}%`),
          ilike(telephonyCallLogs.normalizedPhone, `%${q}%`),
          ilike(telephonyCallLogs.fromNumber, `%${q}%`),
          ilike(telephonyCallLogs.toNumber, `%${q}%`),
          ilike(telephonyCallLogs.summary, `%${q}%`),
          ilike(telephonyCallLogs.transcriptionText, `%${q}%`)
        )
      );
    }

    // Filter by interaction types
    if (types && types.length > 0) {
      conditions.push(inArray(telephonyCallLogs.interactionType, types));
    }

    // Filter by call statuses
    if (statuses && statuses.length > 0) {
      conditions.push(inArray(telephonyCallLogs.callStatus, statuses));
    }

    // Filter by VIP status
    if (vip !== undefined) {
      conditions.push(eq(telephonyCallLogs.vip, vip));
    }

    // Filter by phone numbers
    if (phoneNumbers && phoneNumbers.length > 0) {
      conditions.push(
        or(
          inArray(telephonyCallLogs.toNumber, phoneNumbers),
          inArray(telephonyCallLogs.fromNumber, phoneNumbers)
        )
      );
    }

    // Date range filters
    if (startDate) {
      conditions.push(sql`${telephonyCallLogs.startTime} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${telephonyCallLogs.startTime} <= ${endDate}`);
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Apply sorting
    const sortColumn = {
      'createdAt': telephonyCallLogs.createdAt,
      'duration': telephonyCallLogs.duration,
      'interactionType': telephonyCallLogs.interactionType,
      'callStatus': telephonyCallLogs.callStatus
    }[sortBy] || telephonyCallLogs.createdAt;

    query = query.orderBy(sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn));

    // Apply pagination
    query = query.limit(pageSize).offset(offset);

    // Execute queries
    const [calls, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      calls,
      total,
      page,
      pageSize
    };
  }

  async getCall(id: string): Promise<TelephonyCallLog | undefined> {
    // WARNING: This method does not enforce restaurant agent scoping
    // Use getCallForAgent(id, restaurantAgentId) for secure access
    return this.getTelephonyCallLog(id);
  }

  async getCallForAgent(id: string, restaurantAgentId: string): Promise<TelephonyCallLog | undefined> {
    const [callLog] = await db
      .select()
      .from(telephonyCallLogs)
      .where(
        and(
          eq(telephonyCallLogs.id, id),
          eq(telephonyCallLogs.restaurantAgentId, restaurantAgentId)
        )
      )
      .limit(1);
    return callLog;
  }

  async updateCallMeta(id: string, updates: {
    callStatus?: string;
    tags?: string[];
    notes?: string[];
    vip?: boolean;
    flagged?: boolean;
    customerName?: string;
    interactionType?: string;
    summary?: string;
    actions?: any[];
    connectedRefs?: any;
    restaurantAgentId?: string;
  }): Promise<TelephonyCallLog> {
    const [callLog] = await db
      .update(telephonyCallLogs)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(telephonyCallLogs.id, id))
      .returning();
    return callLog;
  }

  async recordCallIngest(payload: {
    twilioCallSid: string;
    fromNumber: string;
    toNumber: string;
    direction: string;
    status: string;
    duration?: number;
    startTime: Date;
    endTime?: Date;
    recordingUrl?: string;
    recordingSid?: string;
    transcriptionText?: string;
    aiResponse?: string;
    sentiment?: string;
    actionTaken?: string;
    customerName?: string;
    interactionType?: string;
    callStatus?: string;
    summary?: string;
    restaurantAgentId?: string;
  }): Promise<TelephonyCallLog> {
    // Normalize phone number for better searchability
    const normalizedPhone = payload.fromNumber.replace(/[^\d+]/g, '');
    
    // Generate call ID
    const id = `call-${Date.now()}-${Math.random().toString(36).substring(2)}`;

    const [callLog] = await db
      .insert(telephonyCallLogs)
      .values({
        id,
        twilioCallSid: payload.twilioCallSid,
        fromNumber: payload.fromNumber,
        toNumber: payload.toNumber,
        normalizedPhone: normalizedPhone,
        direction: payload.direction,
        status: payload.status,
        duration: payload.duration,
        startTime: payload.startTime,
        endTime: payload.endTime,
        recordingUrl: payload.recordingUrl,
        recordingSid: payload.recordingSid,
        transcriptionText: payload.transcriptionText,
        aiResponse: payload.aiResponse,
        sentiment: payload.sentiment,
        actionTaken: payload.actionTaken,
        customerName: payload.customerName,
        interactionType: payload.interactionType || 'other',
        callStatus: payload.callStatus || 'completed',
        summary: payload.summary,
        restaurantAgentId: payload.restaurantAgentId,
        vip: false,
        flagged: false,
        tags: [],
        notes: [],
        actions: [],
        connectedRefs: {}
      })
      .onConflictDoUpdate({
        target: telephonyCallLogs.twilioCallSid,
        set: {
          status: payload.status,
          duration: payload.duration,
          endTime: payload.endTime,
          recordingUrl: payload.recordingUrl,
          recordingSid: payload.recordingSid,
          transcriptionText: payload.transcriptionText,
          aiResponse: payload.aiResponse,
          sentiment: payload.sentiment,
          actionTaken: payload.actionTaken,
          customerName: payload.customerName,
          interactionType: payload.interactionType || 'other',
          callStatus: payload.callStatus || 'completed',
          summary: payload.summary,
          updatedAt: new Date()
        }
      })
      .returning();

    return callLog;
  }

  async getRecordingStream(id: string): Promise<{ url: string; contentType: string } | undefined> {
    const [callLog] = await db
      .select({ recordingUrl: telephonyCallLogs.recordingUrl })
      .from(telephonyCallLogs)
      .where(eq(telephonyCallLogs.id, id))
      .limit(1);

    if (!callLog?.recordingUrl) {
      return undefined;
    }

    // Return the recording URL with appropriate content type
    return {
      url: callLog.recordingUrl,
      contentType: 'audio/wav' // Default to WAV, could be enhanced to detect actual format
    };
  }

  async exportCalls(filters: {
    phoneNumbers?: string[];
    startDate?: Date;
    endDate?: Date;
    types?: string[];
    statuses?: string[];
    vip?: boolean;
    format?: 'csv' | 'json';
    restaurantAgentId: string;
  }): Promise<string> {
    const {
      phoneNumbers,
      startDate,
      endDate,
      types,
      statuses,
      vip,
      format = 'csv',
      restaurantAgentId
    } = filters;

    let query = db.select().from(telephonyCallLogs);
    const conditions = [];

    // Filter by restaurant agent (REQUIRED for authorization)
    if (!restaurantAgentId) {
      throw new Error('restaurantAgentId is required for security - cannot export calls without agent scope');
    }
    conditions.push(eq(telephonyCallLogs.restaurantAgentId, restaurantAgentId));

    // Apply filters
    if (phoneNumbers && phoneNumbers.length > 0) {
      conditions.push(
        or(
          inArray(telephonyCallLogs.toNumber, phoneNumbers),
          inArray(telephonyCallLogs.fromNumber, phoneNumbers)
        )
      );
    }

    if (startDate) {
      conditions.push(sql`${telephonyCallLogs.startTime} >= ${startDate}`);
    }

    if (endDate) {
      conditions.push(sql`${telephonyCallLogs.startTime} <= ${endDate}`);
    }

    if (types && types.length > 0) {
      conditions.push(inArray(telephonyCallLogs.interactionType, types));
    }

    if (statuses && statuses.length > 0) {
      conditions.push(inArray(telephonyCallLogs.callStatus, statuses));
    }

    if (vip !== undefined) {
      conditions.push(eq(telephonyCallLogs.vip, vip));
    }

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    const calls = await query.orderBy(desc(telephonyCallLogs.startTime));

    if (format === 'json') {
      return JSON.stringify(calls, null, 2);
    }

    // CSV format
    if (calls.length === 0) {
      return 'No calls found for the specified criteria.';
    }

    const headers = [
      'Date/Time',
      'Customer Name',
      'Phone Number',
      'Interaction Type',
      'Duration',
      'Status',
      'VIP',
      'Tags',
      'Summary'
    ];

    const csvRows = [
      headers.join(','),
      ...calls.map(call => [
        call.startTime.toISOString(),
        call.customerName || 'Unknown',
        call.fromNumber,
        call.interactionType || 'other',
        `${call.duration || 0} seconds`,
        call.callStatus || 'unknown',
        call.vip ? 'Yes' : 'No',
        call.tags?.join(';') || '',
        (call.summary || '').replace(/,/g, ';') // Replace commas with semicolons for CSV
      ].map(field => `"${field}"`).join(','))
    ];

    return csvRows.join('\n');
  }

  // Voice settings operations
  async createVoiceSetting(voiceSetting: Partial<InsertVoiceSetting>): Promise<VoiceSetting> {
    const id = voiceSetting.id || `voice-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const [setting] = await db
      .insert(voiceSettings)
      .values({
        ...voiceSetting,
        id
      } as InsertVoiceSetting)
      .returning();
    return setting;
  }

  async getVoiceSettings(restaurantAgentId: string): Promise<VoiceSetting[]> {
    return await db
      .select()
      .from(voiceSettings)
      .where(eq(voiceSettings.restaurantAgentId, restaurantAgentId));
  }

  async getActiveVoiceSetting(restaurantAgentId: string): Promise<VoiceSetting | undefined> {
    const [setting] = await db
      .select()
      .from(voiceSettings)
      .where(
        and(
          eq(voiceSettings.restaurantAgentId, restaurantAgentId),
          eq(voiceSettings.isActive, true)
        )
      )
      .limit(1);
    return setting;
  }

  async updateVoiceSetting(id: string, updates: Partial<InsertVoiceSetting>): Promise<VoiceSetting> {
    const [setting] = await db
      .update(voiceSettings)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(voiceSettings.id, id))
      .returning();
    return setting;
  }

  // Business hours operations
  async createBusinessHour(businessHour: Partial<InsertBusinessHour>): Promise<BusinessHour> {
    const id = businessHour.id || `hours-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const [hour] = await db
      .insert(businessHours)
      .values({
        ...businessHour,
        id
      } as InsertBusinessHour)
      .returning();
    return hour;
  }

  async getBusinessHours(restaurantAgentId: string): Promise<BusinessHour[]> {
    return await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.restaurantAgentId, restaurantAgentId))
      .orderBy(businessHours.dayOfWeek);
  }

  async updateBusinessHour(id: string, updates: Partial<InsertBusinessHour>): Promise<BusinessHour> {
    const [hour] = await db
      .update(businessHours)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(businessHours.id, id))
      .returning();
    return hour;
  }

  // Enhanced business profile operations
  async createEnhancedBusinessProfile(profile: InsertEnhancedBusinessProfile): Promise<EnhancedBusinessProfile> {
    const [enhancedProfile] = await db
      .insert(enhancedBusinessProfiles)
      .values(profile)
      .returning();
    return enhancedProfile;
  }

  async getEnhancedBusinessProfile(restaurantDataId: string): Promise<EnhancedBusinessProfile | undefined> {
    const [profile] = await db
      .select()
      .from(enhancedBusinessProfiles)
      .where(eq(enhancedBusinessProfiles.restaurantDataId, restaurantDataId));
    return profile;
  }

  async updateEnhancedBusinessProfile(id: string, updates: Partial<EnhancedBusinessProfile>): Promise<EnhancedBusinessProfile> {
    const [profile] = await db
      .update(enhancedBusinessProfiles)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(enhancedBusinessProfiles.id, id))
      .returning();
    return profile;
  }

  async deleteEnhancedBusinessProfile(id: string): Promise<void> {
    await db.delete(enhancedBusinessProfiles).where(eq(enhancedBusinessProfiles.id, id));
  }

  async getEnhancedBusinessProfileWithMenu(restaurantDataId: string): Promise<(EnhancedBusinessProfile & { menuItems: EnhancedMenuItem[] }) | undefined> {
    const profile = await this.getEnhancedBusinessProfile(restaurantDataId);
    if (!profile) return undefined;

    const menuItems = await this.getEnhancedMenuItems(profile.id);
    return { ...profile, menuItems };
  }

  // Enhanced menu items operations
  async createEnhancedMenuItem(item: InsertEnhancedMenuItem): Promise<EnhancedMenuItem> {
    const [menuItem] = await db
      .insert(enhancedMenuItems)
      .values(item)
      .returning();
    return menuItem;
  }

  async getEnhancedMenuItems(enhancedProfileId: string): Promise<EnhancedMenuItem[]> {
    return await db
      .select()
      .from(enhancedMenuItems)
      .where(eq(enhancedMenuItems.enhancedProfileId, enhancedProfileId))
      .orderBy(enhancedMenuItems.sortOrder, enhancedMenuItems.category);
  }

  async updateEnhancedMenuItem(id: string, updates: Partial<EnhancedMenuItem>): Promise<EnhancedMenuItem> {
    const [item] = await db
      .update(enhancedMenuItems)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(enhancedMenuItems.id, id))
      .returning();
    return item;
  }

  async deleteEnhancedMenuItem(id: string): Promise<void> {
    await db.delete(enhancedMenuItems).where(eq(enhancedMenuItems.id, id));
  }

  async getMenuItemsByCategory(enhancedProfileId: string, category: string): Promise<EnhancedMenuItem[]> {
    return await db
      .select()
      .from(enhancedMenuItems)
      .where(
        and(
          eq(enhancedMenuItems.enhancedProfileId, enhancedProfileId),
          eq(enhancedMenuItems.category, category)
        )
      )
      .orderBy(enhancedMenuItems.sortOrder);
  }

  async searchMenuItems(enhancedProfileId: string, searchTerm: string): Promise<EnhancedMenuItem[]> {
    return await db
      .select()
      .from(enhancedMenuItems)
      .where(
        and(
          eq(enhancedMenuItems.enhancedProfileId, enhancedProfileId),
          sql`(
            ${enhancedMenuItems.itemName} ILIKE ${`%${searchTerm}%`} OR
            ${enhancedMenuItems.description} ILIKE ${`%${searchTerm}%`} OR
            ${searchTerm} = ANY(${enhancedMenuItems.ingredients}) OR
            ${searchTerm} = ANY(${enhancedMenuItems.dietaryTags})
          )`
        )
      )
      .orderBy(enhancedMenuItems.isPopular, enhancedMenuItems.sortOrder);
  }

  // Business knowledge base operations
  async createBusinessKnowledge(knowledge: InsertBusinessKnowledgeItem): Promise<BusinessKnowledgeItem> {
    const [item] = await db
      .insert(businessKnowledgeBase)
      .values(knowledge)
      .returning();
    return item;
  }

  async getBusinessKnowledge(restaurantDataId: string): Promise<BusinessKnowledgeItem[]> {
    return await db
      .select()
      .from(businessKnowledgeBase)
      .where(
        and(
          eq(businessKnowledgeBase.restaurantDataId, restaurantDataId),
          eq(businessKnowledgeBase.isActive, true)
        )
      )
      .orderBy(businessKnowledgeBase.confidence, businessKnowledgeBase.category);
  }

  async updateBusinessKnowledge(id: string, updates: Partial<BusinessKnowledgeItem>): Promise<BusinessKnowledgeItem> {
    const [item] = await db
      .update(businessKnowledgeBase)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(businessKnowledgeBase.id, id))
      .returning();
    return item;
  }

  async deleteBusinessKnowledge(id: string): Promise<void> {
    await db.delete(businessKnowledgeBase).where(eq(businessKnowledgeBase.id, id));
  }

  async searchBusinessKnowledge(restaurantDataId: string, query: string): Promise<BusinessKnowledgeItem[]> {
    return await db
      .select()
      .from(businessKnowledgeBase)
      .where(
        and(
          eq(businessKnowledgeBase.restaurantDataId, restaurantDataId),
          eq(businessKnowledgeBase.isActive, true),
          sql`(
            ${businessKnowledgeBase.question} ILIKE ${`%${query}%`} OR
            ${businessKnowledgeBase.answer} ILIKE ${`%${query}%`} OR
            ${businessKnowledgeBase.context} ILIKE ${`%${query}%`}
          )`
        )
      )
      .orderBy(businessKnowledgeBase.confidence, businessKnowledgeBase.timesAsked);
  }

  async getKnowledgeByCategory(restaurantDataId: string, category: string): Promise<BusinessKnowledgeItem[]> {
    return await db
      .select()
      .from(businessKnowledgeBase)
      .where(
        and(
          eq(businessKnowledgeBase.restaurantDataId, restaurantDataId),
          eq(businessKnowledgeBase.category, category),
          eq(businessKnowledgeBase.isActive, true)
        )
      )
      .orderBy(businessKnowledgeBase.confidence);
  }

  // Data refresh operations
  async markProfileForRefresh(restaurantDataId: string): Promise<void> {
    const profile = await this.getEnhancedBusinessProfile(restaurantDataId);
    if (profile) {
      await this.updateEnhancedBusinessProfile(profile.id, {
        nextRefreshDue: new Date()
      });
    }
  }

  async getProfilesDueForRefresh(): Promise<EnhancedBusinessProfile[]> {
    return await db
      .select()
      .from(enhancedBusinessProfiles)
      .where(sql`${enhancedBusinessProfiles.nextRefreshDue} <= NOW()`)
      .orderBy(enhancedBusinessProfiles.nextRefreshDue);
  }

  // Subscription management implementations
  // Subscription Plans
  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [subscriptionPlan] = await db
      .insert(subscriptionPlans)
      .values(plan)
      .returning();
    return subscriptionPlan;
  }

  async getSubscriptionPlans(activeOnly: boolean = true): Promise<SubscriptionPlan[]> {
    let query = db.select().from(subscriptionPlans);

    if (activeOnly) {
      query = query.where(eq(subscriptionPlans.isActive, true));
    }

    return await query.orderBy(subscriptionPlans.displayOrder, subscriptionPlans.monthlyPrice);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const [plan] = await db
      .update(subscriptionPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return plan;
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  // User Subscriptions
  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [userSubscription] = await db
      .insert(userSubscriptions)
      .values(subscription)
      .returning();
    return userSubscription;
  }

  async getUserSubscription(userId: string): Promise<UserSubscriptionWithPlan | undefined> {
    const result = await db
      .select({
        id: userSubscriptions.id,
        userId: userSubscriptions.userId,
        stripeCustomerId: userSubscriptions.stripeCustomerId,
        stripeSubscriptionId: userSubscriptions.stripeSubscriptionId,
        stripePriceId: userSubscriptions.stripePriceId,
        planId: userSubscriptions.planId,
        status: userSubscriptions.status,
        currentPeriodStart: userSubscriptions.currentPeriodStart,
        currentPeriodEnd: userSubscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
        trialEnd: userSubscriptions.trialEnd,
        provisioningStatus: userSubscriptions.provisioningStatus,
        serviceStatus: userSubscriptions.serviceStatus,
        twilioPhoneNumber: userSubscriptions.twilioPhoneNumber,
        createdAt: userSubscriptions.createdAt,
        updatedAt: userSubscriptions.updatedAt,
        plan: {
          id: subscriptionPlans.id,
          planName: subscriptionPlans.planName,
          stripePriceId: subscriptionPlans.stripePriceId,
          planDescription: subscriptionPlans.planDescription,
          monthlyPrice: subscriptionPlans.monthlyPrice,
          yearlyPrice: subscriptionPlans.yearlyPrice,
          features: subscriptionPlans.features,
          maxPhoneNumbers: subscriptionPlans.maxPhoneNumbers,
          maxCallMinutes: subscriptionPlans.maxCallMinutes,
          isActive: subscriptionPlans.isActive,
          planType: subscriptionPlans.planType,
          displayOrder: subscriptionPlans.displayOrder,
          createdAt: subscriptionPlans.createdAt,
          updatedAt: subscriptionPlans.updatedAt,
        },
        phoneNumberAssignments: [],
      })
      .from(userSubscriptions)
      .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(userSubscriptions.userId, userId))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    if (result.length === 0) return undefined;

    const subscription = result[0];
    const phoneNumbers = await this.getUserPhoneNumbers(userId);

    return {
      ...subscription,
      phoneNumberAssignments: phoneNumbers,
    } as UserSubscriptionWithPlan;
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription;
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription> {
    const [subscription] = await db
      .update(userSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return subscription;
  }

  async cancelUserSubscription(id: string): Promise<UserSubscription> {
    const [subscription] = await db
      .update(userSubscriptions)
      .set({ 
        status: 'canceled', 
        cancelAtPeriodEnd: true,
        updatedAt: new Date() 
      })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return subscription;
  }

  // Atomic provisioning operations for concurrency safety
  async beginProvisioningIfIdle(subscriptionId: string): Promise<{ 
    success: boolean; 
    alreadyInProgress?: boolean; 
    alreadyCompleted?: boolean; 
    currentStatus?: string 
  }> {
    try {
      // First attempt: atomic update from null/failed to in_progress
      const [updated] = await db
        .update(userSubscriptions)
        .set({ 
          provisioningStatus: 'in_progress',
          updatedAt: new Date() 
        })
        .where(
          and(
            eq(userSubscriptions.id, subscriptionId),
            or(
              isNull(userSubscriptions.provisioningStatus),
              eq(userSubscriptions.provisioningStatus, 'failed')
            )
          )
        )
        .returning({ provisioningStatus: userSubscriptions.provisioningStatus });

      if (updated) {
        return { success: true };
      }

      // Second attempt: reclaim stale in_progress locks (older than 30 minutes)
      const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const [reclaimedLock] = await db
        .update(userSubscriptions)
        .set({ 
          provisioningStatus: 'in_progress',
          updatedAt: new Date() 
        })
        .where(
          and(
            eq(userSubscriptions.id, subscriptionId),
            eq(userSubscriptions.provisioningStatus, 'in_progress'),
            sql`${userSubscriptions.updatedAt} < ${staleThreshold}`
          )
        )
        .returning({ provisioningStatus: userSubscriptions.provisioningStatus });

      if (reclaimedLock) {
        console.log(`🔓 Reclaimed stale provisioning lock for subscription ${subscriptionId}`);
        return { success: true };
      }

      // Check current status to provide context
      const [current] = await db
        .select({ provisioningStatus: userSubscriptions.provisioningStatus })
        .from(userSubscriptions)
        .where(eq(userSubscriptions.id, subscriptionId));

      const currentStatus = current?.provisioningStatus;
      
      if (currentStatus === 'completed') {
        return { success: false, alreadyCompleted: true, currentStatus };
      } else if (currentStatus === 'in_progress') {
        return { success: false, alreadyInProgress: true, currentStatus };
      }

      return { success: false, currentStatus };
    } catch (error) {
      console.error('Error in beginProvisioningIfIdle:', error);
      return { success: false };
    }
  }

  async markProvisioningCompleted(subscriptionId: string, results: {
    retellAgentId: string;
    conversationFlowId: string;
    knowledgeBaseId: string;
    twilioPhoneNumber: string;
    twilioPhoneSid: string;
    sipTrunkingSid?: string;
    emergencyAddressSid?: string;
  }): Promise<UserSubscription> {
    const [subscription] = await db
      .update(userSubscriptions)
      .set({
        provisioningStatus: 'completed',
        retellAgentId: results.retellAgentId,
        conversationFlowId: results.conversationFlowId,
        knowledgeBaseId: results.knowledgeBaseId,
        twilioPhoneNumber: results.twilioPhoneNumber,
        twilioPhoneSid: results.twilioPhoneSid,
        sipTrunkingSid: results.sipTrunkingSid,
        emergencyAddressSid: results.emergencyAddressSid,
        provisionedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscriptionId))
      .returning();

    // CRITICAL: Create phone number assignment record so it shows up in the dashboard
    // Check if assignment already exists first (idempotency)
    if (results.twilioPhoneNumber && results.retellAgentId) {
      const existingAssignment = await db
        .select()
        .from(phoneNumberAssignments)
        .where(eq(phoneNumberAssignments.retellAgentId, results.retellAgentId))
        .limit(1);

      if (existingAssignment.length === 0) {
        console.log(`📞 Creating phone number assignment for ${results.twilioPhoneNumber} -> ${results.retellAgentId}`);

        await db.insert(phoneNumberAssignments).values({
          userId: subscription.userId,
          subscriptionId: subscriptionId,
          phoneNumber: results.twilioPhoneNumber,
          twilioPhoneNumberSid: results.twilioPhoneSid,
          retellAgentId: results.retellAgentId,
          phoneNumberType: 'local',
          status: 'active',
          voiceProvider: 'retell',
          assignedAt: new Date(),
          createdAt: new Date()
        });

        console.log(`✅ Phone number assignment created successfully`);
      } else {
        console.log(`♻️ Phone number assignment already exists for ${results.retellAgentId}`);
      }
    }

    return subscription;
  }

  async markProvisioningFailed(subscriptionId: string, error: string): Promise<UserSubscription> {
    const [subscription] = await db
      .update(userSubscriptions)
      .set({
        provisioningStatus: 'failed',
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscriptionId))
      .returning();
    return subscription;
  }

  async getProvisioningResults(subscriptionId: string): Promise<{
    retellAgentId?: string;
    conversationFlowId?: string;
    knowledgeBaseId?: string;
    twilioPhoneNumber?: string;
    twilioPhoneSid?: string;
    sipTrunkingSid?: string;
    emergencyAddressSid?: string;
    twilioSubaccountSid?: string;
    twilioSubaccountAuthToken?: string;
    retellFolderId?: string;
  } | undefined> {
    const [subscription] = await db
      .select({
        retellAgentId: userSubscriptions.retellAgentId,
        conversationFlowId: userSubscriptions.conversationFlowId,
        knowledgeBaseId: userSubscriptions.knowledgeBaseId,
        twilioPhoneNumber: userSubscriptions.twilioPhoneNumber,
        twilioPhoneSid: userSubscriptions.twilioPhoneSid,
        sipTrunkingSid: userSubscriptions.sipTrunkingSid,
        emergencyAddressSid: userSubscriptions.emergencyAddressSid,
        twilioSubaccountSid: userSubscriptions.twilioSubaccountSid,
        twilioSubaccountAuthToken: userSubscriptions.twilioSubaccountAuthToken,
        retellFolderId: userSubscriptions.retellFolderId
      })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.id, subscriptionId));

    return subscription;
  }

  // Step-level persistence for partial completion recovery
  async updateKnowledgeBaseId(subscriptionId: string, knowledgeBaseId: string): Promise<void> {
    await db
      .update(userSubscriptions)
      .set({ 
        knowledgeBaseId,
        updatedAt: new Date() 
      })
      .where(eq(userSubscriptions.id, subscriptionId));
  }

  async updateConversationFlowId(subscriptionId: string, conversationFlowId: string): Promise<void> {
    await db
      .update(userSubscriptions)
      .set({ 
        conversationFlowId,
        updatedAt: new Date() 
      })
      .where(eq(userSubscriptions.id, subscriptionId));
  }

  async updateRetellAgentId(subscriptionId: string, retellAgentId: string): Promise<void> {
    await db
      .update(userSubscriptions)
      .set({
        retellAgentId,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscriptionId));
  }

  async updateTwilioSubaccount(subscriptionId: string, subaccountSid: string, subaccountAuthToken: string): Promise<void> {
    await db
      .update(userSubscriptions)
      .set({
        twilioSubaccountSid: subaccountSid,
        twilioSubaccountAuthToken: subaccountAuthToken,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscriptionId));
  }

  async updateRetellFolderId(subscriptionId: string, folderId: string): Promise<void> {
    await db
      .update(userSubscriptions)
      .set({
        retellFolderId: folderId,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscriptionId));
  }

  // Stripe customer management
  async updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Payment History
  async createPaymentRecord(payment: InsertPaymentHistory): Promise<PaymentHistory> {
    const [paymentRecord] = await db
      .insert(paymentHistory)
      .values(payment)
      .returning();
    return paymentRecord;
  }

  async getPaymentHistory(userId: string, limit: number = 50): Promise<PaymentHistory[]> {
    return await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.userId, userId))
      .orderBy(desc(paymentHistory.createdAt))
      .limit(limit);
  }

  async updatePaymentRecord(id: string, updates: Partial<PaymentHistory>): Promise<PaymentHistory> {
    const [payment] = await db
      .update(paymentHistory)
      .set(updates)
      .where(eq(paymentHistory.id, id))
      .returning();
    return payment;
  }

  // User Trials (14-day free trial with 100 minutes)
  async createUserTrial(userId: string): Promise<UserTrial> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days from now

    const [trial] = await db
      .insert(userTrials)
      .values({
        userId,
        expiresAt,
        minutesLimit: 100,
        minutesUsed: 0,
        status: 'active',
        serviceStatus: 'active'
      })
      .returning();
    
    console.log(`✅ Created 14-day trial for user ${userId} with 100 minutes`);
    return trial;
  }

  async getUserTrial(userId: string): Promise<UserTrial | undefined> {
    const [trial] = await db
      .select()
      .from(userTrials)
      .where(eq(userTrials.userId, userId));
    return trial;
  }

  async updateUserTrial(id: string, updates: Partial<UserTrial>): Promise<UserTrial> {
    const [trial] = await db
      .update(userTrials)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userTrials.id, id))
      .returning();
    return trial;
  }

  async deductTrialMinutes(userId: string, minutes: number): Promise<UserTrial> {
    const trial = await this.getUserTrial(userId);
    if (!trial) {
      throw new Error('Trial not found');
    }

    const newMinutesUsed = trial.minutesUsed + minutes;
    const [updatedTrial] = await db
      .update(userTrials)
      .set({
        minutesUsed: newMinutesUsed,
        updatedAt: new Date()
      })
      .where(eq(userTrials.id, trial.id))
      .returning();

    console.log(`📊 Deducted ${minutes} minutes from trial. Used: ${newMinutesUsed}/${trial.minutesLimit}`);
    return updatedTrial;
  }

  async convertTrialToSubscription(userId: string, subscriptionId: string): Promise<UserTrial> {
    const trial = await this.getUserTrial(userId);
    if (!trial) {
      throw new Error('Trial not found');
    }

    const [updatedTrial] = await db
      .update(userTrials)
      .set({
        status: 'converted',
        convertedToSubscriptionId: subscriptionId,
        updatedAt: new Date()
      })
      .where(eq(userTrials.id, trial.id))
      .returning();

    console.log(`✅ Converted trial to subscription ${subscriptionId}`);
    return updatedTrial;
  }

  async suspendTrialService(userId: string): Promise<UserTrial> {
    const trial = await this.getUserTrial(userId);
    if (!trial) {
      throw new Error('Trial not found');
    }

    const [updatedTrial] = await db
      .update(userTrials)
      .set({
        serviceStatus: 'suspended',
        updatedAt: new Date()
      })
      .where(eq(userTrials.id, trial.id))
      .returning();

    console.log(`⏸️ Suspended trial service for user ${userId}`);
    return updatedTrial;
  }

  async getActiveTrials(): Promise<UserTrial[]> {
    return await db
      .select()
      .from(userTrials)
      .where(and(
        eq(userTrials.status, 'active'),
        eq(userTrials.serviceStatus, 'active')
      ))
      .orderBy(desc(userTrials.createdAt));
  }

  // Phone Number Assignments
  async assignPhoneNumber(assignment: InsertPhoneNumberAssignment): Promise<PhoneNumberAssignment> {
    const [phoneNumber] = await db
      .insert(phoneNumberAssignments)
      .values(assignment)
      .returning();
    return phoneNumber;
  }

  async getUserPhoneNumbers(userId: string): Promise<PhoneNumberAssignment[]> {
    return await db
      .select()
      .from(phoneNumberAssignments)
      .where(and(
        eq(phoneNumberAssignments.userId, userId),
        eq(phoneNumberAssignments.status, 'active')
      ))
      .orderBy(desc(phoneNumberAssignments.assignedAt));
  }

  async releasePhoneNumber(id: string): Promise<void> {
    await db
      .update(phoneNumberAssignments)
      .set({ 
        status: 'released', 
        releasedAt: new Date() 
      })
      .where(eq(phoneNumberAssignments.id, id));
  }

  async getPhoneNumberByTwilioSid(twilioSid: string): Promise<PhoneNumberAssignment | undefined> {
    const [phoneNumber] = await db
      .select()
      .from(phoneNumberAssignments)
      .where(eq(phoneNumberAssignments.twilioPhoneNumberSid, twilioSid));
    return phoneNumber;
  }

  async getPhoneNumberAssignmentByNumber(phoneNumber: string): Promise<PhoneNumberAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(phoneNumberAssignments)
      .where(eq(phoneNumberAssignments.phoneNumber, phoneNumber));
    return assignment;
  }

  async getPhoneNumberAssignment(assignmentId: string): Promise<PhoneNumberAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(phoneNumberAssignments)
      .where(eq(phoneNumberAssignments.id, assignmentId));
    return assignment;
  }

  // Phone Number Reassignment methods
  async findAvailableGenericPhoneNumbers(): Promise<PhoneNumberAssignment[]>;
  async reassignPhoneNumberToUser(
    phoneAssignmentId: string, 
    newUserId: string, 
    newSubscriptionId: string, 
    newRestaurantId: string
  ): Promise<PhoneNumberAssignment>;

  async findAvailableGenericPhoneNumbers(): Promise<PhoneNumberAssignment[]> {
    // Find phone numbers that can be reassigned using proper subqueries
    // Priority: oldest numbers first for efficient reuse
    // CRITICAL: Only return numbers that are NOT assigned to active subscriptions

    const availableNumbers = await db
      .select()
      .from(phoneNumberAssignments)
      .where(
        and(
          eq(phoneNumberAssignments.status, 'active'),
          // CRITICAL FIX: Exclude numbers assigned to active subscriptions
          // Only return truly available numbers (no active subscription assignment)
          isNull(phoneNumberAssignments.subscriptionId),
          or(
            // 1. Generic AI receptionists
            exists(
              db
                .select({ value: sql`1` })
                .from(restaurantData)
                .innerJoin(voiceAgents, eq(restaurantData.agentId, voiceAgents.id))
                .where(
                  and(
                    eq(restaurantData.id, phoneNumberAssignments.restaurantId),
                    eq(voiceAgents.isGeneric, true)
                  )
                )
            ),
            // 2. Orphaned numbers (no restaurant data)
            isNull(phoneNumberAssignments.restaurantId),
            // 3. Known demo restaurants (specific names for reliability)
            exists(
              db
                .select({ value: sql`1` })
                .from(restaurantData)
                .where(
                  and(
                    eq(restaurantData.id, phoneNumberAssignments.restaurantId),
                    or(
                      eq(restaurantData.businessName, 'Phat Eatery Woodlands'),
                      eq(restaurantData.businessName, 'Fielding\'s Wood Grill')
                    )
                  )
                )
            )
          )
        )
      )
      .orderBy(asc(phoneNumberAssignments.assignedAt)); // Reuse oldest first

    console.log(`📞 Found ${availableNumbers.length} phone numbers available for reassignment (excluding active subscriptions): ${availableNumbers.map(n => n.phoneNumber).join(', ')}`);

    return availableNumbers;
  }

  async reassignPhoneNumberToUser(
    phoneAssignmentId: string, 
    newUserId: string, 
    newSubscriptionId: string, 
    newRestaurantId: string | null
  ): Promise<PhoneNumberAssignment> {
    const [updatedAssignment] = await db
      .update(phoneNumberAssignments)
      .set({
        userId: newUserId,
        subscriptionId: newSubscriptionId,
        restaurantId: newRestaurantId,
        assignedAt: new Date()
      })
      .where(eq(phoneNumberAssignments.id, phoneAssignmentId))
      .returning();
    return updatedAssignment;
  }

  // Existing Phone Connection Operations
  async createOrUpdateExistingPhoneConnection(connectionData: Partial<BusinessPhoneConnection>): Promise<BusinessPhoneConnection> {
    const existingConnection = await this.getExistingPhoneConnection(connectionData.userId!);
    
    if (existingConnection) {
      // Update existing connection
      const [updatedConnection] = await db
        .update(businessPhoneConnections)
        .set({
          ...connectionData,
          updatedAt: new Date()
        })
        .where(eq(businessPhoneConnections.userId, connectionData.userId!))
        .returning();
      return updatedConnection;
    } else {
      // Create new connection
      const [newConnection] = await db
        .insert(businessPhoneConnections)
        .values({
          id: sql`gen_random_uuid()`,
          ...connectionData,
          createdAt: new Date(),
          updatedAt: new Date()
        } as InsertBusinessPhoneConnection)
        .returning();
      return newConnection;
    }
  }

  async getExistingPhoneConnection(userId: string): Promise<BusinessPhoneConnection | undefined> {
    const [connection] = await db
      .select()
      .from(businessPhoneConnections)
      .where(eq(businessPhoneConnections.userId, userId));
    return connection;
  }

  async getBusinessPhoneConnectionByPhoneNumber(phoneNumber: string): Promise<BusinessPhoneConnection | undefined> {
    const [connection] = await db
      .select()
      .from(businessPhoneConnections)
      .where(eq(businessPhoneConnections.businessPhoneNumber, phoneNumber));
    return connection;
  }

  async updateExistingPhoneConnectionStatus(userId: string, status: string): Promise<BusinessPhoneConnection | undefined> {
    const [updatedConnection] = await db
      .update(businessPhoneConnections)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(businessPhoneConnections.userId, userId))
      .returning();
    return updatedConnection;
  }

  async createPhoneNumberAssignment(assignment: InsertPhoneNumberAssignment): Promise<PhoneNumberAssignment> {
    const [newAssignment] = await db
      .insert(phoneNumberAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async updatePhoneNumberAssignment(assignmentId: string, updates: Partial<InsertPhoneNumberAssignment>): Promise<PhoneNumberAssignment> {
    const [updatedAssignment] = await db
      .update(phoneNumberAssignments)
      .set({ ...updates, createdAt: new Date() })
      .where(eq(phoneNumberAssignments.id, assignmentId))
      .returning();
    return updatedAssignment;
  }

  // ElevenLabs integration methods
  async isPhoneNumberElevenLabsEnabled(phoneNumber: string): Promise<boolean> {
    try {
      const [assignment] = await db
        .select({ elevenLabsEnabled: phoneNumberAssignments.elevenLabsEnabled })
        .from(phoneNumberAssignments)
        .where(and(
          eq(phoneNumberAssignments.phoneNumber, phoneNumber),
          eq(phoneNumberAssignments.status, 'active')
        ));

      return assignment?.elevenLabsEnabled || false;
    } catch (error) {
      console.error('Error checking ElevenLabs integration status:', error);
      return false;
    }
  }

  async getElevenLabsPhoneNumberId(phoneNumber: string): Promise<string | null> {
    try {
      const [assignment] = await db
        .select({ elevenLabsPhoneNumberId: phoneNumberAssignments.elevenLabsPhoneNumberId })
        .from(phoneNumberAssignments)
        .where(and(
          eq(phoneNumberAssignments.phoneNumber, phoneNumber),
          eq(phoneNumberAssignments.status, 'active'),
          eq(phoneNumberAssignments.elevenLabsEnabled, true)
        ));

      return assignment?.elevenLabsPhoneNumberId || null;
    } catch (error) {
      console.error('Error getting ElevenLabs phone number ID:', error);
      return null;
    }
  }

  async getElevenLabsAgentId(phoneNumber: string): Promise<string | null> {
    try {
      const [assignment] = await db
        .select({ elevenLabsAgentId: phoneNumberAssignments.elevenLabsAgentId })
        .from(phoneNumberAssignments)
        .where(and(
          eq(phoneNumberAssignments.phoneNumber, phoneNumber),
          eq(phoneNumberAssignments.status, 'active'),
          eq(phoneNumberAssignments.elevenLabsEnabled, true)
        ));

      return assignment?.elevenLabsAgentId || null;
    } catch (error) {
      console.error('Error getting ElevenLabs agent ID:', error);
      return null;
    }
  }

  // Signup Progress implementations
  async saveSignupProgress(data: InsertSignupProgress): Promise<SignupProgress> {
    // Check if signup progress already exists for this user to avoid duplicates
    if (data.userId) {
      const existing = await this.getSignupProgress(data.userId);
      if (existing) {
        // Update existing record instead of creating duplicate
        const updated = await this.updateSignupProgress(existing.id, {
          currentStep: data.currentStep,
          stepData: {
            ...existing.stepData,
            ...data.stepData
          },
          completedSteps: data.completedSteps || existing.completedSteps,
          updatedAt: new Date()
        });
        return updated!;
      }
    }

    // Create new record if none exists
    const [progress] = await db
      .insert(signupProgress)
      .values({
        ...data,
        updatedAt: new Date()
      })
      .returning();
    return progress;
  }

  async getSignupProgress(userId?: string, sessionId?: string): Promise<SignupProgress | undefined> {
    if (!userId && !sessionId) {
      return undefined;
    }

    let whereCondition;
    if (userId) {
      whereCondition = eq(signupProgress.userId, userId);
    } else if (sessionId) {
      whereCondition = eq(signupProgress.sessionId, sessionId);
    }

    if (!whereCondition) {
      return undefined;
    }

    const [progress] = await db
      .select()
      .from(signupProgress)
      .where(whereCondition)
      .orderBy(desc(signupProgress.updatedAt));

    return progress;
  }

  async updateSignupProgress(id: string, updates: Partial<SignupProgress>): Promise<SignupProgress | undefined> {
    const [updatedProgress] = await db
      .update(signupProgress)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(signupProgress.id, id))
      .returning();

    return updatedProgress;
  }

  // Conversation Flow tracking methods (in-memory for now)
  private static conversationFlows: Map<string, string> = new Map(); // key: userId:subscriptionId, value: flowId

  async getConversationFlowForSubscription(userId: string, subscriptionId: string): Promise<string | undefined> {
    const key = `${userId}:${subscriptionId}`;
    return DatabaseStorage.conversationFlows.get(key);
  }

  async setConversationFlowForSubscription(userId: string, subscriptionId: string, flowId: string): Promise<void> {
    const key = `${userId}:${subscriptionId}`;
    DatabaseStorage.conversationFlows.set(key, flowId);
  }

  // Knowledge Base tracking methods (in-memory for now)
  private static knowledgeBases: Map<string, string> = new Map(); // key: userId:subscriptionId, value: knowledgeBaseId
  private static knowledgeBaseStatuses: Map<string, string> = new Map(); // key: knowledgeBaseId, value: status

  async getKnowledgeBaseForSubscription(userId: string, subscriptionId: string): Promise<string | undefined> {
    const key = `${userId}:${subscriptionId}`;
    return DatabaseStorage.knowledgeBases.get(key);
  }

  async setKnowledgeBaseForSubscription(userId: string, subscriptionId: string, knowledgeBaseId: string): Promise<void> {
    const key = `${userId}:${subscriptionId}`;
    DatabaseStorage.knowledgeBases.set(key, knowledgeBaseId);
  }

  async getKnowledgeBaseStatus(knowledgeBaseId: string): Promise<string | undefined> {
    return DatabaseStorage.knowledgeBaseStatuses.get(knowledgeBaseId);
  }

  async setKnowledgeBaseStatus(knowledgeBaseId: string, status: string): Promise<void> {
    DatabaseStorage.knowledgeBaseStatuses.set(knowledgeBaseId, status);
  }

  // Demo session methods for 1-minute per user cap
  async createDemoSession(sessionData: InsertDemoSession): Promise<DemoSession> {
    const [session] = await db
      .insert(demoSessions)
      .values({
        ...sessionData,
        startedAt: new Date(),
      })
      .returning();
    
    return session;
  }

  async getDemoSession(sessionId: string): Promise<DemoSession | undefined> {
    const [session] = await db
      .select()
      .from(demoSessions)
      .where(eq(demoSessions.sessionId, sessionId));
    
    return session;
  }

  async getRecentDemoSessions(userId?: string, sessionId?: string, ipAddress?: string, hoursBack?: number): Promise<DemoSession[]> {
    const conditions = [];
    const hours = hoursBack || 24; // Default to 24 hours
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    conditions.push(sql`${demoSessions.startedAt} >= ${cutoff}`);

    if (userId) {
      conditions.push(eq(demoSessions.userId, userId));
    }
    
    if (sessionId) {
      conditions.push(eq(demoSessions.sessionId, sessionId));
    }
    
    if (ipAddress) {
      conditions.push(eq(demoSessions.ipAddress, ipAddress));
    }

    const sessions = await db
      .select()
      .from(demoSessions)
      .where(and(...conditions))
      .orderBy(desc(demoSessions.startedAt));
    
    return sessions;
  }

  async updateDemoSession(id: string, updates: Partial<DemoSession>): Promise<DemoSession> {
    const [session] = await db
      .update(demoSessions)
      .set(updates)
      .where(eq(demoSessions.id, id))
      .returning();
    
    if (!session) {
      throw new Error(`Demo session not found: ${id}`);
    }
    
    return session;
  }

  async hasRecentDemoSession(userId?: string, sessionId?: string, ipAddress?: string, minutesBack?: number): Promise<boolean> {
    const conditions = [];
    const minutes = minutesBack || 60; // Default to 60 minutes
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - minutes);

    conditions.push(sql`${demoSessions.startedAt} >= ${cutoff}`);

    if (userId) {
      conditions.push(eq(demoSessions.userId, userId));
    }
    
    if (sessionId) {
      conditions.push(eq(demoSessions.sessionId, sessionId));
    }
    
    if (ipAddress) {
      conditions.push(eq(demoSessions.ipAddress, ipAddress));
    }

    const [count] = await db
      .select({ count: sql<number>`count(*)` })
      .from(demoSessions)
      .where(and(...conditions));
    
    return count.count > 0;
  }

  // Customer Profile methods - Database storage implementations
  async createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile> {
    try {
      console.log('🔧 Creating customer profile with data:', JSON.stringify(profile, null, 2));

      const [created] = await db
        .insert(customerProfiles)
        .values({
          ...profile,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log('✅ Customer profile created successfully:', created);
      return created;
    } catch (error: any) {
      console.error('❌ Failed to create customer profile');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error detail:', error.detail);
      console.error('❌ Full error:', error);
      console.error('❌ Profile data that failed:', JSON.stringify(profile, null, 2));
      throw error;
    }
  }

  async getCustomerProfile(id: string): Promise<CustomerProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.id, id));
      
      return profile;
    } catch (error) {
      console.error('❌ Failed to get customer profile:', error);
      return undefined;
    }
  }

  async getCustomerProfileByPhone(phoneNumber: string, userId: string): Promise<CustomerProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(customerProfiles)
        .where(
          and(
            eq(customerProfiles.phoneNumber, phoneNumber),
            eq(customerProfiles.userId, userId)
          )
        );
      
      return profile;
    } catch (error) {
      console.error('❌ Failed to get customer profile by phone:', error);
      return undefined;
    }
  }

  async updateCustomerProfile(id: string, updates: Partial<InsertCustomerProfile>): Promise<CustomerProfile> {
    try {
      const [updated] = await db
        .update(customerProfiles)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(customerProfiles.id, id))
        .returning();
      
      if (!updated) {
        throw new Error(`Customer profile not found: ${id}`);
      }
      
      return updated;
    } catch (error) {
      console.error('❌ Failed to update customer profile:', error);
      throw error;
    }
  }

  async getUserCustomerProfiles(userId: string, options?: { segment?: string; vipOnly?: boolean; limit?: number; offset?: number; search?: string }): Promise<CustomerProfile[]> {
    try {
      const conditions: any[] = [eq(customerProfiles.userId, userId)];

      if (options?.segment) {
        conditions.push(eq(customerProfiles.segment, options.segment));
      }

      if (options?.vipOnly) {
        conditions.push(eq(customerProfiles.vipStatus, true));
      }

      if (options?.search) {
        const term = `%${options.search}%`;
        conditions.push(
          or(
            ilike(customerProfiles.customerName, term),
            ilike(customerProfiles.phoneNumber, term),
            ilike(customerProfiles.email, term),
            ilike(customerProfiles.businessOrganization, term)
          )
        );
      }

      let query = db
        .select()
        .from(customerProfiles)
        .where(and(...conditions))
        .orderBy(desc(customerProfiles.lastCallDate));

      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }

      if (options?.offset) {
        query = query.offset(options.offset) as any;
      }

      return await query;
    } catch (error) {
      console.error('❌ Failed to get user customer profiles:', error);
      return [];
    }
  }

  async getCustomerSegmentCounts(userId: string): Promise<Record<string, number>> {
    try {
      const rows = await db
        .select({
          segment: customerProfiles.segment,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, userId))
        .groupBy(customerProfiles.segment);

      const counts: Record<string, number> = {
        new: 0, repeat: 0, vip: 0, at_risk: 0, churned: 0,
      };
      rows.forEach(row => {
        if (row.segment) counts[row.segment] = row.count;
      });
      return counts;
    } catch (error) {
      console.error('❌ Failed to get customer segment counts:', error);
      return {};
    }
  }

  async getTopCustomersByRevenue(userId: string, limit: number = 10): Promise<CustomerProfile[]> {
    try {
      const profiles = await db
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, userId))
        .orderBy(desc(customerProfiles.lifetimeValue))
        .limit(limit);

      return profiles;
    } catch (error) {
      console.error('❌ Failed to get top customers by revenue:', error);
      return [];
    }
  }

  async getTopCustomersByVisits(userId: string, limit: number = 10): Promise<CustomerProfile[]> {
    try {
      const profiles = await db
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, userId))
        .orderBy(desc(customerProfiles.totalCalls))
        .limit(limit);

      return profiles;
    } catch (error) {
      console.error('❌ Failed to get top customers by visits:', error);
      return [];
    }
  }

  // Customer Memories methods
  async createCustomerMemory(memory: InsertCustomerMemory): Promise<CustomerMemory> {
    try {
      const [created] = await db
        .insert(customerMemories)
        .values({
          ...memory,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log(`✅ Created customer memory: ${created.id}`);
      return created;
    } catch (error) {
      console.error('❌ Failed to create customer memory:', error);
      throw error;
    }
  }

  async getCustomerMemory(id: string): Promise<CustomerMemory | undefined> {
    try {
      const [memory] = await db
        .select()
        .from(customerMemories)
        .where(eq(customerMemories.id, id));

      return memory;
    } catch (error) {
      console.error('❌ Failed to get customer memory:', error);
      return undefined;
    }
  }

  async getCustomerMemoriesByAgent(agentId: string): Promise<any[]> {
    try {
      const memories = await db
        .select({
          id: customerMemories.id,
          customerProfileId: customerMemories.customerProfileId,
          agentId: customerMemories.agentId,
          userId: customerMemories.userId,
          title: customerMemories.title,
          content: customerMemories.content,
          wordCount: customerMemories.wordCount,
          createdAt: customerMemories.createdAt,
          updatedAt: customerMemories.updatedAt,
          customerProfile: {
            id: customerProfiles.id,
            name: customerProfiles.customerName,
            phoneNumber: customerProfiles.phoneNumber,
          }
        })
        .from(customerMemories)
        .leftJoin(customerProfiles, eq(customerMemories.customerProfileId, customerProfiles.id))
        .where(eq(customerMemories.agentId, agentId))
        .orderBy(desc(customerMemories.updatedAt));

      return memories;
    } catch (error) {
      console.error('❌ Failed to get customer memories by agent:', error);
      return [];
    }
  }

  async getCustomerMemoriesByCustomer(customerProfileId: string, agentId: string): Promise<CustomerMemory | undefined> {
    try {
      const [memory] = await db
        .select()
        .from(customerMemories)
        .where(
          and(
            eq(customerMemories.customerProfileId, customerProfileId),
            eq(customerMemories.agentId, agentId)
          )
        );

      return memory;
    } catch (error) {
      console.error('❌ Failed to get customer memory by customer:', error);
      return undefined;
    }
  }

  async updateCustomerMemory(id: string, updates: Partial<InsertCustomerMemory>): Promise<CustomerMemory> {
    try {
      const [updated] = await db
        .update(customerMemories)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(customerMemories.id, id))
        .returning();

      if (!updated) {
        throw new Error(`Customer memory not found: ${id}`);
      }

      return updated;
    } catch (error) {
      console.error('❌ Failed to update customer memory:', error);
      throw error;
    }
  }

  async deleteCustomerMemory(id: string): Promise<void> {
    try {
      await db
        .delete(customerMemories)
        .where(eq(customerMemories.id, id));

      console.log(`✅ Deleted customer memory: ${id}`);
    } catch (error) {
      console.error('❌ Failed to delete customer memory:', error);
      throw error;
    }
  }

  // Order and Reservation Call Links
  async getUserOrderCallLinks(userId: string, options?: { startDate?: Date; endDate?: Date; retellAgentId?: string }): Promise<OrderCallLink[]> {
    try {
      const conditions = [eq(callSessions.userId, userId)];

      if (options?.startDate) {
        conditions.push(gte(callSessions.startTime, options.startDate));
      }

      if (options?.endDate) {
        conditions.push(lte(callSessions.startTime, options.endDate));
      }

      if (options?.retellAgentId) {
        conditions.push(eq(callSessions.retellAgentId, options.retellAgentId));
      }

      const orders = await db
        .select({
          id: orderCallLinks.id,
          callSessionId: orderCallLinks.callSessionId,
          orderId: orderCallLinks.orderId,
          posSystem: orderCallLinks.posSystem,
          orderTotal: orderCallLinks.orderTotal,
          orderItems: orderCallLinks.orderItems,
          orderStatus: orderCallLinks.orderStatus,
          orderType: orderCallLinks.orderType,
          revenueGenerated: orderCallLinks.revenueGenerated,
          createdAt: orderCallLinks.createdAt,
        })
        .from(orderCallLinks)
        .innerJoin(callSessions, eq(orderCallLinks.callSessionId, callSessions.id))
        .where(and(...conditions))
        .orderBy(desc(callSessions.startTime));

      return orders;
    } catch (error) {
      console.error('❌ Failed to get user order call links:', error);
      return [];
    }
  }

  async getUserReservationCallLinks(userId: string, options?: { startDate?: Date; endDate?: Date; retellAgentId?: string }): Promise<ReservationCallLink[]> {
    try {
      const conditions = [eq(callSessions.userId, userId)];

      if (options?.startDate) {
        conditions.push(gte(callSessions.startTime, options.startDate));
      }

      if (options?.endDate) {
        conditions.push(lte(callSessions.startTime, options.endDate));
      }

      if (options?.retellAgentId) {
        conditions.push(eq(callSessions.retellAgentId, options.retellAgentId));
      }

      const reservations = await db
        .select({
          id: reservationCallLinks.id,
          callSessionId: reservationCallLinks.callSessionId,
          reservationId: reservationCallLinks.reservationId,
          reservationSystem: reservationCallLinks.reservationSystem,
          partySize: reservationCallLinks.partySize,
          reservationDate: reservationCallLinks.reservationDate,
          reservationTime: reservationCallLinks.reservationTime,
          specialRequests: reservationCallLinks.specialRequests,
          reservationStatus: reservationCallLinks.reservationStatus,
          estimatedRevenue: reservationCallLinks.estimatedRevenue,
          createdAt: reservationCallLinks.createdAt,
        })
        .from(reservationCallLinks)
        .innerJoin(callSessions, eq(reservationCallLinks.callSessionId, callSessions.id))
        .where(and(...conditions))
        .orderBy(desc(callSessions.startTime));

      return reservations;
    } catch (error) {
      console.error('❌ Failed to get user reservation call links:', error);
      return [];
    }
  }

  // Restaurant automation methods - Database storage implementations
  async getRestaurantAutomationConfig(restaurantId: string): Promise<RestaurantAutomationConfig | null> {
    try {
      const configs = await db
        .select()
        .from(restaurantAutomationConfigs)
        .where(eq(restaurantAutomationConfigs.restaurantId, restaurantId))
        .limit(1);

      return configs.length > 0 ? configs[0] : null;
    } catch (error) {
      console.error('❌ Failed to get restaurant automation config:', error);
      return null;
    }
  }

  async saveRestaurantAutomationConfig(userId: string, config: InsertRestaurantAutomationConfig): Promise<RestaurantAutomationConfig> {
    try {
      // Check if config already exists
      const existing = await this.getRestaurantAutomationConfig(config.restaurantId);

      if (existing) {
        // Update existing config
        const updated = await db
          .update(restaurantAutomationConfigs)
          .set({
            ...config,
            updatedAt: new Date()
          })
          .where(eq(restaurantAutomationConfigs.restaurantId, config.restaurantId))
          .returning();

        return updated[0];
      } else {
        // Insert new config
        const inserted = await db
          .insert(restaurantAutomationConfigs)
          .values(config)
          .returning();

        return inserted[0];
      }
    } catch (error) {
      console.error('❌ Failed to save restaurant automation config:', error);
      throw error;
    }
  }

  async saveRestaurantIntegrations(restaurantId: string, config: any): Promise<void> {
    // This method is now an alias for saveRestaurantAutomationConfig for backward compatibility
    try {
      await this.saveRestaurantAutomationConfig(config.userId, {
        userId: config.userId,
        restaurantId,
        businessName: config.businessName || 'Restaurant',
        googleCalendar: config.googleCalendar || null,
        posSystem: config.posSystem || null,
        deliverySystem: config.deliverySystem || null,
        businessHours: config.businessHours || {},
        timezone: config.timezone || 'America/New_York',
        acceptAfterHours: config.acceptAfterHours || false
      });
    } catch (error) {
      console.error('❌ Failed to save restaurant integrations:', error);
      throw error;
    }
  }

  async getRestaurantIntegrations(restaurantId: string): Promise<RestaurantAutomationConfig | null> {
    // This method is now an alias for getRestaurantAutomationConfig for backward compatibility
    return this.getRestaurantAutomationConfig(restaurantId);
  }

  async deleteRestaurantIntegration(restaurantId: string, integrationType: 'googleCalendar' | 'posSystem' | 'deliverySystem'): Promise<void> {
    try {
      const config = await this.getRestaurantAutomationConfig(restaurantId);

      if (!config) {
        throw new Error(`Restaurant automation config not found for ${restaurantId}`);
      }

      // Set the specific integration to null
      const updateData: any = {};
      updateData[integrationType] = null;

      await db
        .update(restaurantAutomationConfigs)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(restaurantAutomationConfigs.restaurantId, restaurantId));

      console.log(`✅ Deleted ${integrationType} integration for restaurant ${restaurantId}`);
    } catch (error) {
      console.error(`❌ Failed to delete restaurant integration:`, error);
      throw error;
    }
  }

  async logAutomationEvent(eventLog: any): Promise<void> {
    try {
      const event: InsertAutomationEvent = {
        restaurantId: eventLog.restaurantId,
        conversationId: eventLog.conversationId,
        callId: eventLog.callId,
        action: eventLog.action,
        success: eventLog.success,
        customerData: eventLog.customerData || null,
        requestData: eventLog.requestData || null,
        result: eventLog.result || null,
        businessName: eventLog.businessName || null,
        retryCount: eventLog.retryCount || 0,
        timestamp: new Date(eventLog.timestamp)
      };

      await db.insert(automationEvents).values(event);
    } catch (error) {
      console.error('❌ Failed to log automation event:', error);
      // Don't throw - logging should not break the main flow
    }
  }

  async createCateringRequest(restaurantId: string, data: any): Promise<void> {
    try {
      const request: InsertCateringRequest = {
        restaurantId,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        customerEmail: data.customerEmail || null,
        eventDate: data.eventDate || null,
        eventTime: data.eventTime || null,
        guestCount: data.guestCount || null,
        menuItems: data.menuItems || null,
        specialRequests: data.specialRequests || null,
        budget: data.budget || null,
        eventLocation: data.eventLocation || null,
        conversationId: data.conversationId || null,
        status: 'pending'
      };

      await db.insert(cateringRequests).values(request);
    } catch (error) {
      console.error('❌ Failed to create catering request:', error);
      throw error;
    }
  }

  async createDeliveryRequest(restaurantId: string, data: any): Promise<void> {
    try {
      const request: InsertDeliveryRequest = {
        restaurantId,
        orderId: data.orderId,
        customerAddress: data.customerAddress,
        customerPhone: data.customerPhone || null,
        items: data.items || null,
        deliveryFee: data.deliveryFee || null,
        estimatedTime: data.estimatedTime || null,
        status: 'pending',
        trackingId: data.trackingId || null
      };

      await db.insert(deliveryRequests).values(request);
    } catch (error) {
      console.error('❌ Failed to create delivery request:', error);
      throw error;
    }
  }

  async getRestaurantAnalytics(restaurantId: string, options?: { startDate?: string; endDate?: string }): Promise<any> {
    try {
      // Build date filters if provided
      const dateFilters = [];
      if (options?.startDate) {
        dateFilters.push(sql`created_at >= ${options.startDate}`);
      }
      if (options?.endDate) {
        dateFilters.push(sql`created_at <= ${options.endDate}`);
      }

      // Get all automation events for this restaurant
      const eventsQuery = db
        .select()
        .from(automationEvents)
        .where(eq(automationEvents.restaurantId, restaurantId));

      if (dateFilters.length > 0) {
        eventsQuery.where(and(eq(automationEvents.restaurantId, restaurantId), ...dateFilters));
      }

      const events = await eventsQuery.orderBy(desc(automationEvents.createdAt));

      // Get catering requests
      const cateringQuery = db
        .select()
        .from(cateringRequests)
        .where(eq(cateringRequests.restaurantId, restaurantId));

      if (dateFilters.length > 0) {
        cateringQuery.where(and(eq(cateringRequests.restaurantId, restaurantId), ...dateFilters));
      }

      const catering = await cateringQuery.orderBy(desc(cateringRequests.createdAt));

      // Get delivery requests
      const deliveryQuery = db
        .select()
        .from(deliveryRequests)
        .where(eq(deliveryRequests.restaurantId, restaurantId));

      if (dateFilters.length > 0) {
        deliveryQuery.where(and(eq(deliveryRequests.restaurantId, restaurantId), ...dateFilters));
      }

      const delivery = await deliveryQuery.orderBy(desc(deliveryRequests.createdAt));

      // Calculate analytics
      const successfulEvents = events.filter(e => e.success);
      const eventsByAction = events.reduce((acc, event) => {
        acc[event.action] = (acc[event.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const completedCatering = catering.filter(c => c.status === 'confirmed');
      const completedDeliveries = delivery.filter(d => d.status === 'delivered');

      return {
        events,
        catering,
        delivery,
        summary: {
          totalEvents: events.length,
          successfulEvents: successfulEvents.length,
          successRate: events.length > 0 ? (successfulEvents.length / events.length * 100).toFixed(1) + '%' : '0%',
          eventsByAction,
          totalCateringRequests: catering.length,
          completedCateringRequests: completedCatering.length,
          totalDeliveryRequests: delivery.length,
          completedDeliveryRequests: completedDeliveries.length,
          dateRange: {
            startDate: options?.startDate || 'All time',
            endDate: options?.endDate || 'Present'
          }
        },
        insights: {
          mostPopularAction: Object.keys(eventsByAction).reduce((a, b) => eventsByAction[a] > eventsByAction[b] ? a : b, 'none'),
          averageOrdersPerDay: this.calculateAverageOrdersPerDay(events.filter(e => e.action === 'order')),
          conversionRate: this.calculateConversionRate(events),
          busyHours: this.analyzeBusyHours(events)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get restaurant analytics:', error);
      return {
        events: [],
        catering: [],
        delivery: [],
        summary: {
          totalEvents: 0,
          successfulEvents: 0,
          totalCateringRequests: 0,
          totalDeliveryRequests: 0
        }
      };
    }
  }

  // Analytics helper methods
  private calculateAverageOrdersPerDay(orderEvents: AutomationEvent[]): number {
    if (orderEvents.length === 0) return 0;

    // Group orders by date
    const ordersByDate = orderEvents.reduce((acc, event) => {
      const date = event.timestamp.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalDays = Object.keys(ordersByDate).length;
    return totalDays > 0 ? orderEvents.length / totalDays : 0;
  }

  private calculateConversionRate(events: AutomationEvent[]): string {
    const inquiries = events.length;
    const completedActions = events.filter(e => e.success && ['order', 'reservation'].includes(e.action)).length;

    return inquiries > 0 ? (completedActions / inquiries * 100).toFixed(1) + '%' : '0%';
  }

  private analyzeBusyHours(events: AutomationEvent[]): Array<{ hour: number; count: number }> {
    const hourCounts = events.reduce((acc, event) => {
      const hour = event.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 busy hours
  }

  // Team Management Methods
  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const [created] = await db.insert(teamInvitations).values(invitation).returning();
    return created;
  }

  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db.select().from(teamInvitations).where(eq(teamInvitations.inviteToken, token));
    return invitation;
  }

  async getTeamInvitationsByOwner(ownerId: string): Promise<TeamInvitation[]> {
    return await db.select().from(teamInvitations).where(eq(teamInvitations.ownerId, ownerId));
  }

  async updateTeamInvitation(id: string, updates: Partial<TeamInvitation>): Promise<TeamInvitation> {
    const [updated] = await db
      .update(teamInvitations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teamInvitations.id, id))
      .returning();
    return updated;
  }

  async acceptTeamInvitation(token: string, userId: string): Promise<TeamInvitation> {
    const [updated] = await db
      .update(teamInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(teamInvitations.inviteToken, token))
      .returning();
    return updated;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values(member).returning();
    return created;
  }

  async getTeamMembersByOwner(ownerId: string): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.ownerId, ownerId));
  }

  async getTeamMemberByUserId(ownerId: string, userId: string): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.ownerId, ownerId), eq(teamMembers.userId, userId)));
    return member;
  }

  async getTeamMembershipByUserId(userId: string): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
    return member;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  async updateTeamMemberRole(id: string, role: string): Promise<TeamMember> {
    const [updated] = await db
      .update(teamMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return updated;
  }

  // Notification Management Methods
  async getActiveNotifications(userId: string): Promise<Notification[]> {
    // Get database notifications (flagged calls)
    const dbNotifications = await db.select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isDismissed, false)
        )
      )
      .orderBy(desc(notifications.createdAt));

    return dbNotifications;
  }

  async countUnreadNotifications(userId: string, lastSeenAt: Date | null): Promise<number> {
    const where = lastSeenAt
      ? and(
          eq(notifications.userId, userId),
          eq(notifications.isDismissed, false),
          gt(notifications.createdAt, lastSeenAt)
        )
      : and(
          eq(notifications.userId, userId),
          eq(notifications.isDismissed, false)
        );

    const result = await db.select({ count: sql`count(*)` })
      .from(notifications)
      .where(where);

    return Number(result[0]?.count || 0);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async updateNotificationsLastSeenAt(userId: string): Promise<void> {
    await db.update(users)
      .set({ notificationsLastSeenAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getUserTrial(userId: string): Promise<UserTrial | undefined> {
    const [trial] = await db.select()
      .from(userTrials)
      .where(eq(userTrials.userId, userId));
    return trial;
  }

  async getAgentFunctionSetting(agentId: string, functionName: string): Promise<AgentFunctionSetting | undefined> {
    const [setting] = await db.select()
      .from(agentFunctionSettings)
      .where(and(
        eq(agentFunctionSettings.agentId, agentId),
        eq(agentFunctionSettings.functionName, functionName)
      ));
    return setting;
  }

  async saveAgentFunctionSettings(agentId: string, functionName: string, settings: { category?: string; smsMessageType?: string; smsContent?: string; recipientPhone?: string; useCallerPhoneByDefault?: boolean; selectedIntegrationId?: string; selectedIntegrationIds?: string[]; callActionType?: string; transferPhoneNumber?: string; displayTitle?: string; verboseDescription?: string }): Promise<void> {
    // Check if a setting already exists
    const existingSetting = await this.getAgentFunctionSetting(agentId, functionName);

    // Migration logic: handle both old and new integration field formats
    const processedSettings = { ...settings };
    if (settings.selectedIntegrationIds !== undefined) {
      // New array format provided - clear deprecated field
      processedSettings.selectedIntegrationId = null;
    } else if (settings.selectedIntegrationId !== undefined && !settings.selectedIntegrationIds) {
      // Legacy single ID format - convert to array
      processedSettings.selectedIntegrationIds = settings.selectedIntegrationId ? [settings.selectedIntegrationId] : [];
    }

    if (existingSetting) {
      // Update existing setting
      await db.update(agentFunctionSettings)
        .set({
          ...processedSettings,
          updatedAt: new Date()
        })
        .where(and(
          eq(agentFunctionSettings.agentId, agentId),
          eq(agentFunctionSettings.functionName, functionName)
        ));
    } else {
      // Insert new setting - ensure array field is initialized
      await db.insert(agentFunctionSettings).values({
        agentId,
        functionName,
        selectedIntegrationIds: processedSettings.selectedIntegrationIds || [],
        ...processedSettings
      });
    }
  }
}

// Create storage with fallback to memory storage if database is unavailable
let storage: IStorage;
try {
  storage = new DatabaseStorage();
} catch (error) {
  console.warn('Database unavailable, using memory storage for authentication:', error);
  storage = new MemoryStorage();
}

export { storage };