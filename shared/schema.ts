import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  real,
  json,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For direct auth users
  selectedIndustry: varchar("selected_industry").default('healthcare'),
  stripeCustomerId: varchar("stripe_customer_id"), // For Stripe integration
  isSubscribed: boolean("is_subscribed").default(false), // Subscription status flag
  emailVerified: boolean("email_verified").default(false), // Email verification status
  emailVerificationToken: varchar("email_verification_token"), // Verification token
  emailVerificationExpires: varchar("email_verification_expires"), // Token expiration
  currentOrganizationId: varchar("current_organization_id"), // Currently active organization for this user
  phoneNumber: varchar("phone_number"), // User's phone number for SMS alerts and call transfers
  enableCallTransfer: boolean("enable_call_transfer").default(false), // Enable call transfer to this user
  enableSMS: boolean("enable_sms").default(false), // Enable SMS notifications for this user
  // Billing notification preferences
  billingNotifyUsageWarning: boolean("billing_notify_usage_warning").default(true), // Send email at 80% usage
  billingNotifyPaymentReceipts: boolean("billing_notify_payment_receipts").default(true), // Send payment confirmation emails
  billingNotifyMonthlyInvoice: boolean("billing_notify_monthly_invoice").default(true), // Send monthly invoice summary
  billingNotifyPaymentFailed: boolean("billing_notify_payment_failed").default(true), // Send dunning emails for payment failures
  billingNotifySubscriptionCancelled: boolean("billing_notify_subscription_cancelled").default(true), // Send cancellation confirmation
  billingNotifyRenewalReminder: boolean("billing_notify_renewal_reminder").default(true), // Send renewal reminders
  billingNotifyCardExpiring: boolean("billing_notify_card_expiring").default(true), // Send card expiry warnings
  billingStopServiceAtLimit: boolean("billing_stop_service_at_limit").default(false), // Stop service when usage limit is reached
  lastUsageWarningAt: timestamp("last_usage_warning_at"), // Last time usage warning was sent
  // Event notification preferences (server-side only — email delivery)
  notifyEmailAlerts: boolean("notify_email_alerts").default(false), // Master switch: send email alerts
  notifyDesktopAlerts: boolean("notify_desktop_alerts").default(true), // Enable desktop browser notifications
  notifyCallFlagged: boolean("notify_call_flagged").default(true), // Email/desktop when a call is flagged
  notificationsLastSeenAt: timestamp("notifications_last_seen_at"), // Last time user viewed notifications
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations table - represents businesses/companies
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // Organization/business name
  industry: varchar("industry").default('healthcare'), // Organization's primary industry
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe customer ID for billing
  isSubscribed: boolean("is_subscribed").default(false), // Subscription status
  subscriptionTier: varchar("subscription_tier"), // Subscription plan tier
  billingEmail: varchar("billing_email"), // Contact email for billing
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization memberships - links users to organizations with roles
export const organizationMemberships = pgTable("organization_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  role: varchar("role").notNull(), // 'owner', 'admin', 'manager', 'member'
  accountType: varchar("account_type").notNull().default('member'), // 'owner' (placeholder/primary), 'member' (invited)
  isBillingContact: boolean("is_billing_contact").default(false), // Is this user the billing contact for the organization?
  invitedBy: varchar("invited_by").references(() => users.id), // User who sent the invitation (null for owner)
  invitationAcceptedAt: timestamp("invitation_accepted_at"), // When the invitation was accepted
  status: varchar("status").default('active'), // 'active', 'suspended', 'pending_invitation'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Signup progress tracking table
export const signupProgress = pgTable("signup_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique(), // Allow null for anonymous progress
  sessionId: varchar("session_id"), // Track anonymous users by session
  currentStep: varchar("current_step").notNull(), // 'account', 'business_info', 'business_review', 'subscription'
  stepData: jsonb("step_data").notNull(), // Store form data for current step
  completedSteps: varchar("completed_steps").array().notNull().default(sql`'{}'`), // Array of completed step names
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voice agents table
export const voiceAgents = pgTable("voice_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  industry: varchar("industry").notNull(),
  voiceId: varchar("voice_id").notNull(),
  persona: text("persona"),
  sampleScript: text("sample_script"),
  audioUrl: varchar("audio_url"),
  userId: varchar("user_id").notNull(),
  isPublic: boolean("is_public").default(false),
  isGeneric: boolean("is_generic").default(false), // true for generic AI receptionists that can be reassigned
  likes: integer("likes").default(0),
  duplicates: integer("duplicates").default(0),
  elevenLabsAgentId: varchar("elevenlabs_agent_id"), // ElevenLabs Conversational AI agent ID
  retellAgentId: varchar("retell_agent_id"), // Retell AI agent ID
  retellLlmId: varchar("retell_llm_id"), // Retell AI LLM (response engine) ID for knowledge base attachment
  conversationFlowId: varchar("conversation_flow_id"), // Retell AI Conversation Flow ID
  businessName: varchar("business_name"),
  city: varchar("city"),
  state: varchar("state"),
  address: text("address"),
  zipCode: varchar("zip_code"),
  phoneNumber: varchar("phone_number"),
  website: varchar("website"),
  businessInfo: text("business_info"),
  defaultCallTransferMemberId: varchar("default_call_transfer_member_id"), // Team member ID to use as default for call transfers
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurant business data table - stores business info in exact format for Retell API
export const restaurantData = pgTable("restaurant_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  businessName: varchar("business_name").notNull(),
  address: text("address"),
  phone: varchar("phone"),
  website: varchar("website"),
  hours: jsonb("hours"),
  menuItems: jsonb("menu_items"),
  services: varchar("services").array(),
  reservationInfo: text("reservation_info"),
  // Additional fields for Retell API knowledge base
  orderingPolicy: text("ordering_policy"),
  reservationPolicy: text("reservation_policy"),
  faq: jsonb("faq"),
  googleMapsData: jsonb("google_maps_data"),
  rawBusinessInfo: text("raw_business_info"), // Free-form business information text
  // Multi-source onboarding tracking
  dataConfidenceScore: integer("data_confidence_score"), // 0-100; <40 = incomplete
  onboardingStatus: varchar("onboarding_status"), // 'complete' | 'incomplete' | 'draft'
  onboardingSource: varchar("onboarding_source"), // 'auto' | 'gbp' | 'yelp' | 'headless' | 'manual' | 'shadow'
  missingDataFields: jsonb("missing_data_fields"), // string[] — fields the AI couldn't find
  scrapedAt: timestamp("scraped_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge base sources table (files and URLs for Retell AI)
export const knowledgeSources = pgTable("knowledge_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  knowledgeBaseId: varchar("knowledge_base_id").notNull(), // Retell AI knowledge base ID
  sourceId: varchar("source_id"), // Retell AI source ID (returned after upload)
  type: varchar("type").notNull(), // 'file', 'url', or 'text'
  fileName: varchar("file_name"), // Original filename for files
  url: text("url"), // URL for website scraping
  fileUrl: text("file_url"), // Google Cloud Storage URL for files
  textContent: text("text_content"), // Text content for text-based sources
  title: varchar("title"), // Custom title for sources
  fileSize: integer("file_size"), // File size in bytes
  mimeType: varchar("mime_type"), // File MIME type
  autoRefresh: boolean("auto_refresh").default(false), // Auto-refresh URLs every 12 hours
  lastRefreshed: timestamp("last_refreshed"), // Last time URL was refreshed
  status: varchar("status").default('active'), // 'active', 'pending', 'failed', 'deleted'
  errorMessage: text("error_message"), // Error message if upload/scrape failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Call logs table for restaurant voice agents
export const callLogs = pgTable("call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  callerId: varchar("caller_id"),
  duration: integer("duration"), // in seconds
  purpose: varchar("purpose"), // reservation, inquiry, etc.
  transcript: text("transcript"),
  outcome: varchar("outcome"), // completed, transferred, etc.
  reservationDetails: jsonb("reservation_details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Voice presets table
export const voicePresets = pgTable("voice_presets", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  description: varchar("description").notNull(),
  gender: varchar("gender").notNull(),
  ageRange: varchar("age_range").notNull(),
  personality: varchar("personality").array().notNull(),
  sampleUrl: varchar("sample_url"),
  isActive: boolean("is_active").default(true),
});

// Agent likes table (for tracking user likes)
export const agentLikes = pgTable("agent_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User credentials table for secure API key storage
export const userCredentials = pgTable("user_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  integrationType: varchar("integration_type").notNull(), // 'square_pos', 'google_calendar', 'retell_ai', etc.
  credentialName: varchar("credential_name").notNull(), // 'api_key', 'client_id', 'access_token', etc.
  encryptedData: text("encrypted_data").notNull(), // AES-256-GCM encrypted credential value
  encryptionIv: varchar("encryption_iv").notNull(), // Base64 encoded IV
  encryptionTag: varchar("encryption_tag").notNull(), // Base64 encoded auth tag
  encryptionAlgorithm: varchar("encryption_algorithm").notNull().default('aes-256-gcm'),
  encryptionVersion: varchar("encryption_version").notNull().default('1'),
  expiresAt: timestamp("expires_at"), // For OAuth tokens that expire
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business settings table for order/reservation toggles and hours
export const businessSettings = pgTable("business_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().notNull(),
  acceptOrders: boolean("accept_orders").default(true),
  acceptReservations: boolean("accept_reservations").default(true),
  acceptAfterHours: boolean("accept_after_hours").default(false),
  businessHours: jsonb("business_hours").default(sql`'{
    "monday": {"open": "09:00", "close": "22:00", "isOpen": true},
    "tuesday": {"open": "09:00", "close": "22:00", "isOpen": true},
    "wednesday": {"open": "09:00", "close": "22:00", "isOpen": true},
    "thursday": {"open": "09:00", "close": "22:00", "isOpen": true},
    "friday": {"open": "09:00", "close": "22:00", "isOpen": true},
    "saturday": {"open": "09:00", "close": "22:00", "isOpen": true},
    "sunday": {"open": "10:00", "close": "21:00", "isOpen": true}
  }'`), // Default business hours JSON
  timezone: varchar("timezone").default('America/New_York'),
  orderCutoffTime: varchar("order_cutoff_time").default('21:30'), // Stop taking orders 30 min before close
  reservationLeadTime: integer("reservation_lead_time").default(60), // Minutes ahead required for reservations
  enableOwnerFallback: boolean("enable_owner_fallback").default(false), // Business owner fallback toggle (default off)
  ownerPhoneNumber: varchar("owner_phone_number"), // Business owner's phone number for fallback
  transferPhoneNumber: varchar("transfer_phone_number"), // Phone number to transfer calls to
  enableTransfer: boolean("enable_transfer").default(true), // Enable/disable call transfer feature
  twilioSmsPhoneNumber: varchar("twilio_sms_phone_number"), // Twilio number for sending SMS confirmations
  customIntegrations: jsonb("custom_integrations").default(sql`'[]'`), // Array of custom integrations
  businessLocations: jsonb("business_locations").default(sql`'[]'`), // Array of {name, address?, phone} for multi-location businesses
  orderCount: integer("order_count").default(0), // Count of orders processed via webhooks
  deliveryCount: integer("delivery_count").default(0), // Count of deliveries processed via webhooks
  cateringCount: integer("catering_count").default(0), // Count of catering orders processed via webhooks
  reservationCount: integer("reservation_count").default(0), // Count of reservations processed via webhooks
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agent integrations table - stores integrations per agent
export const agentIntegrations = pgTable("agent_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => voiceAgents.id),

  // Basic Info
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type"), // 'POS', 'Calendar', 'CRM', etc.
  customFunction: varchar("custom_function"), // Retell AI custom function that triggers this

  // Authentication
  apiKey: text("api_key"),
  applicationId: text("application_id"),
  clientSecret: text("client_secret"),
  webhookSecret: text("webhook_secret"),

  // Server Configuration
  apiEndpointUrl: text("api_endpoint_url"),
  method: varchar("method").default('POST'), // 'GET', 'POST', 'PUT', 'DELETE'
  timeout: integer("timeout").default(10000),
  webhookUrl: text("webhook_url"),

  // Headers
  authorization: text("authorization"),
  contentType: varchar("content_type").default('application/json'),
  customHeaders: jsonb("custom_headers").default(sql`'[]'`),

  // Query Parameters
  locationId: varchar("location_id"),
  timeZone: varchar("time_zone"),
  customQueryParams: jsonb("custom_query_params").default(sql`'[]'`),

  // Payload / Body
  jsonPayloadSchema: text("json_payload_schema"),

  // Response Variables
  responseVariables: text("response_variables"),

  // Security
  hmacSignature: text("hmac_signature"),

  // Testing
  sandboxMode: boolean("sandbox_mode").default(false),

  // OAuth Integration Flag
  isOAuthIntegration: boolean("is_oauth_integration").default(false),

  // OAuth Credentials (encrypted for security)
  oauthAccessToken: text("oauth_access_token"), // Encrypted access token
  oauthRefreshToken: text("oauth_refresh_token"), // Encrypted refresh token
  oauthCalendarId: text("oauth_calendar_id"), // Encrypted primary calendar ID (for Google Calendar)
  oauthTokenExpiry: timestamp("oauth_token_expiry"), // Token expiration timestamp
  oauthScope: text("oauth_scope"), // OAuth scopes granted
  
  // Google Calendar List (all available calendars)
  availableCalendars: jsonb("available_calendars"), // Array of {id, summary, primary, accessRole, timeZone, backgroundColor}
  enabledCalendars: jsonb("enabled_calendars").default(sql`'[]'`), // Array of calendar IDs that are enabled for booking
  
  // Integration Testing
  testStatus: varchar("test_status"), // 'pending', 'passed', 'failed'
  testMessage: text("test_message"), // Test result message
  lastTestedAt: timestamp("last_tested_at"), // When the integration was last tested

  // Trigger Functions
  triggerFunctions: jsonb("trigger_functions").default(sql`'[]'`),

  // Status Monitoring (new fields for redesign)
  status: varchar("status").default('connected'), // 'connected', 'error', 'paused', 'pending'
  lastHealthCheck: timestamp("last_health_check"),
  errorMessage: text("error_message"),
  pausedAt: timestamp("paused_at"),

  // Google Calendar Configuration Settings
  calendarSyncEnabled: boolean("calendar_sync_enabled").default(true), // Enable two-way sync
  calendarBusinessHours: jsonb("calendar_business_hours"), // Scheduling hours (same format as restaurantData)
  calendarMeetingDuration: integer("calendar_meeting_duration").default(30), // Default appointment length in minutes
  calendarBufferTime: integer("calendar_buffer_time").default(0), // Gap between appointments in minutes
  calendarMaxConcurrent: integer("calendar_max_concurrent").default(1), // Max overlapping appointments allowed
  calendarBlockedTimes: jsonb("calendar_blocked_times"), // Array of blocked date/time ranges
  calendarRequiredFields: jsonb("calendar_required_fields").default(sql`'["name", "phone"]'`), // Required info to collect
  calendarEventTemplate: text("calendar_event_template"), // Event description template
  calendarConfirmationMessage: text("calendar_confirmation_message"), // Confirmation message template
  calendarReminderEnabled: boolean("calendar_reminder_enabled").default(true), // Send reminders
  calendarReminderTime: integer("calendar_reminder_time").default(60), // Reminder time in minutes before appointment

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Integration logs table for tracking integration activity
export const integrationLogs = pgTable("integration_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").references(() => voiceAgents.id),
  integrationId: varchar("integration_id").notNull().references(() => agentIntegrations.id),

  // Event Information
  eventType: varchar("event_type").notNull(), // 'call', 'error', 'test', 'status_change', 'created', 'updated', 'deleted'

  // Request/Response Data
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  statusCode: integer("status_code"),

  // Error Information
  errorMessage: text("error_message"),

  // Performance
  duration: integer("duration"), // Duration in milliseconds

  createdAt: timestamp("created_at").defaultNow(),
});

// Agent function settings table for custom function configurations (SMS, etc.)
export const agentFunctionSettings = pgTable("agent_function_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => voiceAgents.id),
  functionName: varchar("function_name").notNull(),

  // Display title for user-created functions (preserves spaces)
  displayTitle: varchar("display_title"),

  // Verbose description (explanation of what the function does)
  verboseDescription: text("verbose_description"),

  // Category of the function (for custom actions)
  category: varchar("category"), // 'appointmentSetting' | 'crm' | 'pointOfSale' | 'messaging' | 'customIntegration' | 'custom'

  // SMS Settings
  smsMessageType: varchar("sms_message_type").default('prompt'), // 'static' | 'prompt'
  smsContent: text("sms_content"), // Static message or AI prompt

  // Messaging action settings
  recipientPhone: varchar("recipient_phone"), // Phone number that receives the SMS (HTML, may include param tokens)
  useCallerPhoneByDefault: boolean("use_caller_phone_by_default").default(false), // Send to caller's phone unless customer provides preferred number
  selectedIntegrationId: varchar("selected_integration_id"), // DEPRECATED - Integration linked to this function (use selectedIntegrationIds)
  selectedIntegrationIds: jsonb("selected_integration_ids").default(sql`'[]'`), // Array of integration IDs that execute independently in parallel

  // Call Actions settings
  callActionType: varchar("call_action_type"), // 'transfer' | 'end'
  transferPhoneNumber: varchar("transfer_phone_number"), // Phone number to transfer to (E.164 format)

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Demo sessions table for tracking user demo usage with 1-minute cap
export const demoSessions = pgTable("demo_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Can be null for anonymous users
  sessionId: varchar("session_id"), // Track anonymous users by session
  ipAddress: varchar("ip_address"), // Additional tracking for anonymous users
  retellCallId: varchar("retell_call_id"), // Retell AI call ID for the demo
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration").default(0), // Duration in seconds
  status: varchar("status").default('active'), // 'active', 'completed', 'terminated'
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  voiceAgents: many(voiceAgents),
  agentLikes: many(agentLikes),
  userCredentials: many(userCredentials),
  userSubscriptions: many(userSubscriptions),
  paymentHistory: many(paymentHistory),
  phoneNumberAssignments: many(phoneNumberAssignments),
  demoSessions: many(demoSessions),
  agentIntegrations: many(agentIntegrations),
  integrationLogs: many(integrationLogs),
  signupProgress: one(signupProgress, {
    fields: [users.id],
    references: [signupProgress.userId],
  }),
  businessSettings: one(businessSettings, {
    fields: [users.id],
    references: [businessSettings.userId],
  }),
}));

export const signupProgressRelations = relations(signupProgress, ({ one }) => ({
  user: one(users, {
    fields: [signupProgress.userId],
    references: [users.id],
  }),
}));

export const voiceAgentsRelations = relations(voiceAgents, ({ one, many }) => ({
  user: one(users, {
    fields: [voiceAgents.userId],
    references: [users.id],
  }),
  likes: many(agentLikes),
  restaurantData: one(restaurantData, {
    fields: [voiceAgents.id],
    references: [restaurantData.agentId],
  }),
  callLogs: many(callLogs),
  integrations: many(agentIntegrations),
}));

export const restaurantDataRelations = relations(restaurantData, ({ one }) => ({
  agent: one(voiceAgents, {
    fields: [restaurantData.agentId],
    references: [voiceAgents.id],
  }),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  agent: one(voiceAgents, {
    fields: [callLogs.agentId],
    references: [voiceAgents.id],
  }),
}));

export const agentLikesRelations = relations(agentLikes, ({ one }) => ({
  user: one(users, {
    fields: [agentLikes.userId],
    references: [users.id],
  }),
  agent: one(voiceAgents, {
    fields: [agentLikes.agentId],
    references: [voiceAgents.id],
  }),
}));

export const userCredentialsRelations = relations(userCredentials, ({ one }) => ({
  user: one(users, {
    fields: [userCredentials.userId],
    references: [users.id],
  }),
}));

export const businessSettingsRelations = relations(businessSettings, ({ one }) => ({
  user: one(users, {
    fields: [businessSettings.userId],
    references: [users.id],
  }),
}));

export const agentIntegrationsRelations = relations(agentIntegrations, ({ one, many }) => ({
  user: one(users, {
    fields: [agentIntegrations.userId],
    references: [users.id],
  }),
  agent: one(voiceAgents, {
    fields: [agentIntegrations.agentId],
    references: [voiceAgents.id],
  }),
  logs: many(integrationLogs),
}));

export const demoSessionsRelations = relations(demoSessions, ({ one }) => ({
  user: one(users, {
    fields: [demoSessions.userId],
    references: [users.id],
  }),
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  user: one(users, {
    fields: [integrationLogs.userId],
    references: [users.id],
  }),
  agent: one(voiceAgents, {
    fields: [integrationLogs.agentId],
    references: [voiceAgents.id],
  }),
  integration: one(agentIntegrations, {
    fields: [integrationLogs.integrationId],
    references: [agentIntegrations.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  selectedIndustry: true,
});

export const insertSignupProgressSchema = createInsertSchema(signupProgress).pick({
  userId: true,
  sessionId: true,
  currentStep: true,
  stepData: true,
  completedSteps: true,
  isCompleted: true,
});

export const insertVoiceAgentSchema = createInsertSchema(voiceAgents).pick({
  name: true,
  description: true,
  industry: true,
  voiceId: true,
  isPublic: true,
  isGeneric: true,
});

export const insertVoicePresetSchema = createInsertSchema(voicePresets).pick({
  id: true,
  name: true,
  description: true,
  gender: true,
  ageRange: true,
  personality: true,
  sampleUrl: true,
});

export const insertAgentLikeSchema = createInsertSchema(agentLikes).pick({
  agentId: true,
});

export const insertKnowledgeSourceSchema = createInsertSchema(knowledgeSources).pick({
  agentId: true,
  knowledgeBaseId: true,
  sourceId: true,
  type: true,
  fileName: true,
  url: true,
  fileSize: true,
  mimeType: true,
  autoRefresh: true,
  lastRefreshed: true,
  status: true,
  errorMessage: true,
});

export const insertRestaurantDataSchema = createInsertSchema(restaurantData).pick({
  agentId: true,
  businessName: true,
  address: true,
  phone: true,
  website: true,
  hours: true,
  menuItems: true,
  services: true,
  reservationInfo: true,
  orderingPolicy: true,
  reservationPolicy: true,
  faq: true,
  googleMapsData: true,
});

export const insertCallLogSchema = createInsertSchema(callLogs).pick({
  agentId: true,
  callerId: true,
  duration: true,
  purpose: true,
  transcript: true,
  outcome: true,
  reservationDetails: true,
});

export const insertUserCredentialsSchema = createInsertSchema(userCredentials).pick({
  userId: true,
  integrationType: true,
  credentialName: true,
  encryptedData: true,
  encryptionIv: true,
  encryptionTag: true,
  encryptionAlgorithm: true,
  encryptionVersion: true,
  isActive: true,
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).pick({
  userId: true,
  acceptOrders: true,
  acceptReservations: true,
  acceptAfterHours: true,
  businessHours: true,
  timezone: true,
  orderCutoffTime: true,
  reservationLeadTime: true,
  enableOwnerFallback: true,
  ownerPhoneNumber: true,
  isActive: true,
});

export const insertAgentIntegrationSchema = createInsertSchema(agentIntegrations).pick({
  userId: true,
  agentId: true,
  name: true,
  description: true,
  type: true,
  customFunction: true,
  apiKey: true,
  applicationId: true,
  clientSecret: true,
  webhookSecret: true,
  apiEndpointUrl: true,
  method: true,
  timeout: true,
  webhookUrl: true,
  authorization: true,
  contentType: true,
  customHeaders: true,
  locationId: true,
  timeZone: true,
  customQueryParams: true,
  jsonPayloadSchema: true,
  responseVariables: true,
  hmacSignature: true,
  sandboxMode: true,
  isOAuthIntegration: true,
  triggerFunctions: true,
});

export const insertDemoSessionSchema = createInsertSchema(demoSessions).pick({
  userId: true,
  sessionId: true,
  ipAddress: true,
  retellCallId: true,
  endedAt: true,
  duration: true,
  status: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertSignupProgress = z.infer<typeof insertSignupProgressSchema>;
export type SignupProgress = typeof signupProgress.$inferSelect;
export type InsertVoiceAgent = z.infer<typeof insertVoiceAgentSchema>;
export type VoiceAgent = typeof voiceAgents.$inferSelect;
export type InsertVoicePreset = z.infer<typeof insertVoicePresetSchema>;
export type VoicePreset = typeof voicePresets.$inferSelect;
export type InsertAgentLike = z.infer<typeof insertAgentLikeSchema>;
export type AgentLike = typeof agentLikes.$inferSelect;
export type InsertRestaurantData = z.infer<typeof insertRestaurantDataSchema>;
export type RestaurantData = typeof restaurantData.$inferSelect;
export type InsertKnowledgeSource = z.infer<typeof insertKnowledgeSourceSchema>;
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type CallLog = typeof callLogs.$inferSelect;
export type InsertUserCredentials = z.infer<typeof insertUserCredentialsSchema>;
export type UserCredentials = typeof userCredentials.$inferSelect;
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertAgentIntegration = z.infer<typeof insertAgentIntegrationSchema>;
export type AgentIntegration = typeof agentIntegrations.$inferSelect;
export type AgentFunctionSetting = typeof agentFunctionSettings.$inferSelect;
export type InsertAgentFunctionSetting = typeof agentFunctionSettings.$inferInsert;
export type InsertDemoSession = z.infer<typeof insertDemoSessionSchema>;
export type DemoSession = typeof demoSessions.$inferSelect;
export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type InsertIntegrationLog = typeof integrationLogs.$inferInsert;

// Extended types with relations
export type VoiceAgentWithUser = VoiceAgent & {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl'>;
  isLiked?: boolean;
};

export type VoiceAgentWithRestaurantData = VoiceAgent & {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl'>;
  restaurantData?: RestaurantData;
  isLiked?: boolean;
};

// Enhanced call logs table for telephony
export const telephonyCallLogs = pgTable("telephony_call_logs", {
  id: text("id").primaryKey(),
  restaurantAgentId: text("restaurant_agent_id").references(() => restaurantData.id),
  twilioCallSid: text("twilio_call_sid").notNull().unique(),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  direction: text("direction").notNull(), // 'inbound' or 'outbound'
  status: text("status").notNull(), // 'queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'
  duration: integer("duration"), // in seconds
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  recordingUrl: text("recording_url"),
  recordingSid: text("recording_sid"),
  transcriptionText: text("transcription_text"),
  transcriptionSid: text("transcription_sid"),
  aiResponse: text("ai_response"),
  sentiment: text("sentiment"), // 'positive', 'neutral', 'negative'
  sentimentScore: real("sentiment_score"),
  callOutcome: text("call_outcome"), // Industry-specific outcome (e.g., 'Booked Reservation', 'Placed Order', 'Transferred Call', etc.)
  actionTaken: text("action_taken"), // 'reservation', 'order', 'info', 'transfer', 'end_call'
  confidence: real("confidence"),
  conversationData: json("conversation_data"), // Store full conversation history
  price: text("price"),
  priceUnit: text("price_unit"),
  // Enhanced call management fields
  customerName: text("customer_name"), // Customer name if known
  normalizedPhone: text("normalized_phone"), // E.164 format phone number
  interactionType: text("interaction_type"), // 'order', 'reservation', 'catering', 'faq', 'other'
  callStatus: text("call_status"), // 'completed', 'pending', 'missed', 'transferred' - different from Twilio status
  vip: boolean("vip").default(false), // VIP customer flag
  tags: text("tags").array().default(sql`'{}'`), // Array of tags for categorization
  notes: text("notes").array().default(sql`'{}'`), // Array of internal notes
  summary: text("summary"), // AI-generated call summary
  actions: jsonb("actions").default(sql`'[]'`), // Array of actions taken during call
  connectedRefs: jsonb("connected_refs").default(sql`'{}'`), // References to connected systems (POS, Calendar, etc.)
  flagged: boolean("flagged").default(false), // Flag for issues or follow-up needed
  recordingProviderId: text("recording_provider_id"), // Provider-specific recording ID
  parentCallId: text("parent_call_id"), // If set, this call is a continuation (child) of the parent call and is hidden from call history
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("telephony_call_logs_created_at_idx").on(table.createdAt),
  index("telephony_call_logs_interaction_type_idx").on(table.interactionType),
  index("telephony_call_logs_call_status_idx").on(table.callStatus),
  index("telephony_call_logs_normalized_phone_idx").on(table.normalizedPhone),
  index("telephony_call_logs_vip_idx").on(table.vip),
  index("telephony_call_logs_tags_idx").using("gin", table.tags),
  index("telephony_call_logs_status_idx").on(table.status),
  index("telephony_call_logs_to_number_idx").on(table.toNumber),
  index("telephony_call_logs_start_time_idx").on(table.startTime),
]);

export type TelephonyCallLog = typeof telephonyCallLogs.$inferSelect;
export const insertTelephonyCallLogSchema = createInsertSchema(telephonyCallLogs);
export type InsertTelephonyCallLog = z.infer<typeof insertTelephonyCallLogSchema>;

// SMS Messages table for tracking all SMS communications
export const smsMessages = pgTable("sms_messages", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id),
  twilioMessageSid: text("twilio_message_sid").notNull().unique(),
  fromNumber: text("from_number").notNull(), // The phone number that sent the message
  toNumber: text("to_number").notNull(), // The phone number that received the message
  direction: text("direction").notNull(), // 'inbound' or 'outbound'
  body: text("body").notNull(), // Message content
  status: text("status").notNull(), // 'queued', 'sending', 'sent', 'delivered', 'failed', 'received'
  errorCode: text("error_code"), // Twilio error code if failed
  errorMessage: text("error_message"), // Twilio error message if failed
  price: text("price"),
  priceUnit: text("price_unit"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("sms_messages_created_at_idx").on(table.createdAt),
  index("sms_messages_from_number_idx").on(table.fromNumber),
  index("sms_messages_to_number_idx").on(table.toNumber),
  index("sms_messages_user_id_idx").on(table.userId),
  index("sms_messages_direction_idx").on(table.direction),
]);

export type SmsMessage = typeof smsMessages.$inferSelect;
export const insertSmsMessageSchema = createInsertSchema(smsMessages);
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;

// Voice settings table for restaurant agents
export const voiceSettings = pgTable("voice_settings", {
  id: text("id").primaryKey(),
  restaurantAgentId: text("restaurant_agent_id").references(() => restaurantData.id),
  elevenLabsVoiceId: text("eleven_labs_voice_id").notNull(),
  voiceName: text("voice_name").notNull(),
  stability: real("stability").default(0.5),
  similarityBoost: real("similarity_boost").default(0.75),
  style: text("style").default('friendly'), // 'friendly', 'professional', 'casual'
  speed: real("speed").default(1.0),
  pitch: real("pitch").default(1.0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type VoiceSetting = typeof voiceSettings.$inferSelect;
export const insertVoiceSettingSchema = createInsertSchema(voiceSettings);
export type InsertVoiceSetting = z.infer<typeof insertVoiceSettingSchema>;

// Business hours table
export const businessHours = pgTable("business_hours", {
  id: text("id").primaryKey(),
  restaurantAgentId: text("restaurant_agent_id").references(() => restaurantData.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  openTime: text("open_time"), // Format: "09:00"
  closeTime: text("close_time"), // Format: "22:00"
  isOpen: boolean("is_open").default(true),
  specialNote: text("special_note"), // "Closed for holidays", "Limited menu", etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BusinessHour = typeof businessHours.$inferSelect;
export const insertBusinessHourSchema = createInsertSchema(businessHours);
export type InsertBusinessHour = z.infer<typeof insertBusinessHourSchema>;

// Subscription Plans Table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planName: varchar("plan_name").notNull(),
  stripePriceId: varchar("stripe_price_id").notNull().unique(),
  planDescription: text("plan_description"),
  monthlyPrice: integer("monthly_price").notNull(), // in cents
  yearlyPrice: integer("yearly_price"), // in cents, optional
  features: jsonb("features").notNull(),
  maxPhoneNumbers: integer("max_phone_numbers").default(1),
  maxCallMinutes: integer("max_call_minutes"), // monthly limit
  isActive: boolean("is_active").default(true),
  planType: varchar("plan_type").notNull().default('monthly'), // 'monthly', 'yearly'
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Subscriptions Table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeCustomerId: varchar("stripe_customer_id").notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id").notNull().unique(),
  stripePriceId: varchar("stripe_price_id").notNull(),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  status: varchar("status").notNull(), // 'active', 'canceled', 'past_due', 'unpaid', 'trialing'
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  trialEnd: timestamp("trial_end"),
  // Provisioning fields for atomic operations and idempotency
  provisioningStatus: varchar("provisioning_status"), // null, 'in_progress', 'completed', 'failed'
  retellAgentId: varchar("retell_agent_id"),
  conversationFlowId: varchar("conversation_flow_id"),
  knowledgeBaseId: varchar("knowledge_base_id"),
  twilioPhoneNumber: varchar("twilio_phone_number"),
  twilioPhoneSid: varchar("twilio_phone_sid"),
  sipTrunkingSid: varchar("sip_trunking_sid"),
  emergencyAddressSid: varchar("emergency_address_sid"),
  provisionedAt: timestamp("provisioned_at"),
  // Organization fields for account isolation
  twilioSubaccountSid: varchar("twilio_subaccount_sid"),
  twilioSubaccountAuthToken: varchar("twilio_subaccount_auth_token"),
  retellFolderId: varchar("retell_folder_id"),
  // Overage tracking fields
  currentMonthMinutesUsed: integer("current_month_minutes_used").default(0), // Total minutes used this billing period
  currentMonthOverageMinutes: integer("current_month_overage_minutes").default(0), // Minutes over the limit
  pendingOverageCharges: integer("pending_overage_charges").default(0), // Overage charges in cents to bill next cycle
  lastOverageBilledAt: timestamp("last_overage_billed_at"), // Last time overage was billed
  // Grace period and payment failure tracking fields
  paymentFailureCount: integer("payment_failure_count").default(0), // Number of consecutive payment failures
  firstPaymentFailedAt: timestamp("first_payment_failed_at"), // When the first payment failure occurred
  gracePeriodEndsAt: timestamp("grace_period_ends_at"), // When the grace period expires
  lastDunningEmailSentAt: timestamp("last_dunning_email_sent_at"), // Last dunning email timestamp
  serviceStatus: varchar("service_status").default('active'), // 'active', 'grace_period', 'suspended'
  setupNotification: varchar("setup_notification"), // One-time notification shown to user after provisioning (cleared after display)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment History Table
export const paymentHistory = pgTable("payment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").references(() => userSubscriptions.id),
  stripeInvoiceId: varchar("stripe_invoice_id").notNull().unique(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency").default('usd'),
  status: varchar("status").notNull(), // 'succeeded', 'failed', 'pending', 'refunded'
  description: text("description"),
  invoiceUrl: varchar("invoice_url"),
  receiptUrl: varchar("receipt_url"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Trials Table (14-day free trial with 100 minutes)
export const userTrials = pgTable("user_trials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id), // One trial per user
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 14 days from start
  minutesLimit: integer("minutes_limit").default(100).notNull(), // 100 free minutes
  minutesUsed: integer("minutes_used").default(0).notNull(), // Minutes consumed
  status: varchar("status").default('active').notNull(), // 'active', 'expired', 'converted', 'cancelled'
  convertedToSubscriptionId: varchar("converted_to_subscription_id").references(() => userSubscriptions.id), // Linked subscription after upgrade
  serviceStatus: varchar("service_status").default('active').notNull(), // 'active', 'suspended'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phone Number Assignments Table
export const phoneNumberAssignments = pgTable("phone_number_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").references(() => userSubscriptions.id),
  restaurantId: varchar("restaurant_id").references(() => restaurantData.id),
  twilioPhoneNumberSid: varchar("twilio_phone_number_sid").notNull(),
  phoneNumber: varchar("phone_number").notNull().unique(),
  phoneNumberType: varchar("phone_number_type").default('local'), // 'local', 'toll-free'
  monthlyCost: integer("monthly_cost").notNull(), // in cents
  status: varchar("status").default('active'), // 'active', 'released', 'suspended'
  // Voice AI integration fields (supports ElevenLabs and Retell)
  elevenLabsPhoneNumberId: varchar("elevenlabs_phone_number_id"),
  elevenLabsEnabled: boolean("elevenlabs_enabled").default(false),
  elevenLabsAgentId: varchar("elevenlabs_agent_id"), // ElevenLabs Conversational AI agent ID
  // Retell AI integration fields
  retellAgentId: varchar("retell_agent_id"), // Retell AI agent ID
  retellEnabled: boolean("retell_enabled").default(false),
  retellKnowledgeBaseId: varchar("retell_knowledge_base_id"), // Retell AI knowledge base ID
  voiceProvider: varchar("voice_provider").default('retell'), // 'elevenlabs' | 'retell'
  // SMS / A2P 10DLC Registration fields
  smsEnabled: boolean("sms_enabled").default(false), // Whether SMS is enabled for this number
  smsRegistrationStatus: varchar("sms_registration_status").default('not_registered'), // 'not_registered', 'pending', 'registered', 'failed'
  businessProfileSid: varchar("business_profile_sid"), // Twilio TrustHub Customer Profile SID (BU...)
  a2pProfileSid: varchar("a2p_profile_sid"), // Twilio A2P Messaging Profile SID (BU...)
  brandSid: varchar("brand_sid"), // Twilio Brand Registration SID (BN...)
  brandStatus: varchar("brand_status"), // Brand registration status
  campaignSid: varchar("campaign_sid"), // Twilio Campaign SID (QE...)
  campaignStatus: varchar("campaign_status"), // Campaign registration status
  messagingServiceSid: varchar("messaging_service_sid"), // Twilio Messaging Service SID (MG...)
  smsRegistrationError: text("sms_registration_error"), // Error details if registration failed
  smsRegisteredAt: timestamp("sms_registered_at"), // When SMS was successfully enabled
  notes: text("notes"), // For tracking connection status, errors, and retry information
  assignedAt: timestamp("assigned_at").defaultNow(),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business phone connection settings - for connecting existing business numbers to AI
export const businessPhoneConnections = pgTable("business_phone_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").notNull().references(() => userSubscriptions.id),
  restaurantId: varchar("restaurant_id").references(() => restaurantData.id),
  // Business phone details
  businessPhoneNumber: varchar("business_phone_number").notNull(),
  carrier: varchar("carrier"), // Name of phone carrier/provider
  // Connection method: 'call_forwarding' | 'sip_integration' | 'voip_bridge'
  connectionMethod: varchar("connection_method").default('call_forwarding'),
  // SIP details for VoIP integration
  sipServer: varchar("sip_server"),
  sipUsername: varchar("sip_username"),
  sipPassword: varchar("sip_password"), // Encrypted
  sipPort: integer("sip_port"),
  // Twilio forwarding details
  twilioForwardingNumber: varchar("twilio_forwarding_number"), // Twilio number that business forwards to
  twilioWebhookUrl: varchar("twilio_webhook_url"),
  twilioTwiMLBinSid: varchar("twilio_twiml_bin_sid"),
  // AI integration
  retellAgentId: varchar("retell_agent_id"),
  voiceProvider: varchar("voice_provider").default('retell'),
  // Connection status and settings
  isEnabled: boolean("is_enabled").default(false),
  connectionStatus: varchar("connection_status").default('pending'), // 'pending', 'active', 'error', 'disconnected'
  testCallStatus: varchar("test_call_status"), // 'pending', 'successful', 'failed'
  lastTestCall: timestamp("last_test_call"),
  errorDetails: text("error_details"),
  setupInstructions: text("setup_instructions"), // Generated setup instructions for business
  // 🆕 Backup Answering System Configuration
  backupAnsweringEnabled: boolean("backup_answering_enabled").default(false),
  ringTimeoutSeconds: integer("ring_timeout_seconds").default(20), // How long to ring before AI answers (5-30 seconds)
  afterHoursMode: varchar("after_hours_mode").default('immediate_ai'), // 'ring_first' | 'immediate_ai'
  escalationEnabled: boolean("escalation_enabled").default(true), // Allow customers to request human transfer
  escalationPhoneNumber: varchar("escalation_phone_number"), // Number to transfer to if requested
  backupAnsweringInstructions: text("backup_answering_instructions"), // Custom instructions for backup mode
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Industry = 'healthcare' | 'legal' | 'support' | 'realestate' | 'education' | 'ecommerce';

export const INDUSTRIES: Record<Industry, { name: string; color: string; icon: string; description: string }> = {
  healthcare: {
    name: 'Healthcare',
    color: 'hsl(197, 92%, 40%)',
    icon: 'fas fa-heartbeat',
    description: 'Patient care & medical support'
  },
  legal: {
    name: 'Legal',
    color: 'hsl(260, 76%, 58%)',
    icon: 'fas fa-balance-scale',
    description: 'Law firms & legal services'
  },
  support: {
    name: 'Customer Support',
    color: 'hsl(159, 100%, 36%)',
    icon: 'fas fa-headset',
    description: '24/7 customer assistance'
  },
  realestate: {
    name: 'Real Estate',
    color: 'hsl(26, 100%, 53%)',
    icon: 'fas fa-home',
    description: 'Property & client management'
  },
  education: {
    name: 'Education',
    color: 'hsl(42, 93%, 56%)',
    icon: 'fas fa-graduation-cap',
    description: 'Learning & student support'
  },
  ecommerce: {
    name: 'E-commerce',
    color: 'hsl(217, 100%, 50%)',
    icon: 'fas fa-shopping-cart',
    description: 'Sales & order assistance'
  }
};

// Enhanced business profile tables for comprehensive data storage
export const enhancedBusinessProfiles = pgTable("enhanced_business_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantDataId: varchar("restaurant_data_id").notNull().references(() => restaurantData.id),
  
  // Google Maps Enhanced Data
  googlePlaceId: text("google_place_id"),
  googleRating: real("google_rating"),
  totalReviews: integer("total_reviews"),
  priceLevel: integer("price_level"), // 1-4 scale
  
  // Comprehensive Profile Data (JSON objects)
  enhancedHours: jsonb("enhanced_hours"), // BusinessHours with special hours
  menuData: jsonb("menu_data"), // MenuSection[] with detailed items
  customerReviews: jsonb("customer_reviews"), // Review[] with sentiment
  promotionsData: jsonb("promotions_data"), // Promotion[] current offers
  reservationDetails: jsonb("reservation_details"), // ReservationInfo
  deliveryDetails: jsonb("delivery_details"), // DeliveryInfo
  businessStoryData: jsonb("business_story_data"), // AboutInfo
  atmosphereData: jsonb("atmosphere_data"), // AtmosphereInfo
  
  // Derived Business Intelligence
  cuisine: text("cuisine"),
  priceRange: text("price_range"),
  businessTags: text("business_tags").array(),
  popularDishes: text("popular_dishes").array(),
  uniqueFeatures: text("unique_features").array(),
  
  // Data Quality & Freshness Tracking
  dataQualityScore: integer("data_quality_score"),
  lastGoogleUpdate: timestamp("last_google_update"),
  lastWebsiteUpdate: timestamp("last_website_update"),
  nextRefreshDue: timestamp("next_refresh_due"),
  websiteScrapingSuccess: boolean("website_scraping_success").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Detailed menu items table for enhanced search and AI knowledge
export const enhancedMenuItems = pgTable("enhanced_menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enhancedProfileId: varchar("enhanced_profile_id").notNull().references(() => enhancedBusinessProfiles.id),
  
  // Basic item info
  itemName: text("item_name").notNull(),
  description: text("description"),
  price: text("price"),
  category: text("category").notNull(),
  
  // Enhanced attributes for AI responses
  dietaryTags: text("dietary_tags").array(), // vegetarian, vegan, gluten-free, etc.
  allergens: text("allergens").array(),
  ingredients: text("ingredients").array(),
  preparationTime: text("preparation_time"),
  
  // Popularity and availability
  isSignatureDish: boolean("is_signature_dish").default(false),
  isPopular: boolean("is_popular").default(false),
  isNewItem: boolean("is_new_item").default(false),
  isAvailable: boolean("is_available").default(true),
  isSeasonalSpecial: boolean("is_seasonal_special").default(false),
  
  // Customer preferences insights
  customerRating: real("customer_rating"),
  orderFrequency: integer("order_frequency"),
  pairedWithItems: text("paired_with_items").array(),
  
  // Metadata
  sortOrder: integer("sort_order"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Enhanced customer reviews with sentiment analysis
export const enhancedCustomerReviews = pgTable("enhanced_customer_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enhancedProfileId: varchar("enhanced_profile_id").notNull().references(() => enhancedBusinessProfiles.id),
  
  // Review details
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(),
  reviewText: text("review_text").notNull(),
  reviewDate: timestamp("review_date"),
  source: text("source"), // 'google', 'website', 'yelp', etc.
  
  // AI-enhanced analysis
  sentiment: text("sentiment"), // 'positive', 'neutral', 'negative'
  sentimentScore: real("sentiment_score"),
  keywordMentions: text("keyword_mentions").array(),
  topicsDiscussed: text("topics_discussed").array(), // food, service, atmosphere, etc.
  
  // Business insights
  isHelpfulForAI: boolean("is_helpful_for_ai").default(false),
  mentionedMenuItems: text("mentioned_menu_items").array(),
  ownerResponse: text("owner_response"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Business knowledge graph for AI responses
export const businessKnowledgeBase = pgTable("business_knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantDataId: varchar("restaurant_data_id").notNull().references(() => restaurantData.id),
  
  // Knowledge categories
  category: text("category").notNull(), // 'menu', 'policy', 'hours', 'services', 'atmosphere'
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  
  // Context and confidence
  context: text("context"), // additional context for AI
  confidence: real("confidence").default(1.0),
  source: text("source"), // 'website', 'google', 'manual', 'inferred'
  
  // Usage tracking
  timesAsked: integer("times_asked").default(0),
  lastUsed: timestamp("last_used"),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for enhanced tables
export const enhancedBusinessProfilesRelations = relations(enhancedBusinessProfiles, ({ one, many }) => ({
  restaurantData: one(restaurantData, {
    fields: [enhancedBusinessProfiles.restaurantDataId],
    references: [restaurantData.id],
  }),
  menuItems: many(enhancedMenuItems),
  customerReviews: many(enhancedCustomerReviews),
}));

export const enhancedMenuItemsRelations = relations(enhancedMenuItems, ({ one }) => ({
  enhancedProfile: one(enhancedBusinessProfiles, {
    fields: [enhancedMenuItems.enhancedProfileId],
    references: [enhancedBusinessProfiles.id],
  }),
}));

export const enhancedCustomerReviewsRelations = relations(enhancedCustomerReviews, ({ one }) => ({
  enhancedProfile: one(enhancedBusinessProfiles, {
    fields: [enhancedCustomerReviews.enhancedProfileId],
    references: [enhancedBusinessProfiles.id],
  }),
}));

export const businessKnowledgeBaseRelations = relations(businessKnowledgeBase, ({ one }) => ({
  restaurantData: one(restaurantData, {
    fields: [businessKnowledgeBase.restaurantDataId],
    references: [restaurantData.id],
  }),
}));

// Subscription Relations
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [userSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  paymentHistory: many(paymentHistory),
  phoneNumberAssignments: many(phoneNumberAssignments),
}));

export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  user: one(users, {
    fields: [paymentHistory.userId],
    references: [users.id],
  }),
  subscription: one(userSubscriptions, {
    fields: [paymentHistory.subscriptionId],
    references: [userSubscriptions.id],
  }),
}));

export const phoneNumberAssignmentsRelations = relations(phoneNumberAssignments, ({ one }) => ({
  user: one(users, {
    fields: [phoneNumberAssignments.userId],
    references: [users.id],
  }),
  subscription: one(userSubscriptions, {
    fields: [phoneNumberAssignments.subscriptionId],
    references: [userSubscriptions.id],
  }),
  restaurant: one(restaurantData, {
    fields: [phoneNumberAssignments.restaurantId],
    references: [restaurantData.id],
  }),
}));

// Enhanced insert schemas
export const insertEnhancedBusinessProfileSchema = createInsertSchema(enhancedBusinessProfiles).pick({
  restaurantDataId: true,
  googlePlaceId: true,
  googleRating: true,
  totalReviews: true,
  priceLevel: true,
  enhancedHours: true,
  menuData: true,
  customerReviews: true,
  promotionsData: true,
  reservationDetails: true,
  deliveryDetails: true,
  businessStoryData: true,
  atmosphereData: true,
  cuisine: true,
  priceRange: true,
  businessTags: true,
  dataQualityScore: true,
});

export const insertEnhancedMenuItemSchema = createInsertSchema(enhancedMenuItems).pick({
  enhancedProfileId: true,
  itemName: true,
  description: true,
  price: true,
  category: true,
  dietaryTags: true,
  allergens: true,
  ingredients: true,
  isSignatureDish: true,
  isPopular: true,
  isNewItem: true,
  isAvailable: true,
});

export const insertBusinessKnowledgeSchema = createInsertSchema(businessKnowledgeBase).pick({
  restaurantDataId: true,
  category: true,
  question: true,
  answer: true,
  context: true,
  confidence: true,
  source: true,
});

// Subscription insert schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).pick({
  planName: true,
  stripePriceId: true,
  planDescription: true,
  monthlyPrice: true,
  yearlyPrice: true,
  features: true,
  maxPhoneNumbers: true,
  maxCallMinutes: true,
  isActive: true,
  planType: true,
  displayOrder: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).pick({
  userId: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripePriceId: true,
  planId: true,
  status: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
  trialEnd: true,
});

export const insertUserTrialSchema = createInsertSchema(userTrials).pick({
  userId: true,
  expiresAt: true,
  minutesLimit: true,
  minutesUsed: true,
  status: true,
  convertedToSubscriptionId: true,
  serviceStatus: true,
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).pick({
  userId: true,
  subscriptionId: true,
  stripeInvoiceId: true,
  stripePaymentIntentId: true,
  amount: true,
  currency: true,
  status: true,
  description: true,
  invoiceUrl: true,
  receiptUrl: true,
  paidAt: true,
});

export const insertPhoneNumberAssignmentSchema = createInsertSchema(phoneNumberAssignments).pick({
  userId: true,
  subscriptionId: true,
  restaurantId: true,
  twilioPhoneNumberSid: true,
  phoneNumber: true,
  phoneNumberType: true,
  monthlyCost: true,
  status: true,
  elevenLabsPhoneNumberId: true,
  elevenLabsEnabled: true,
  elevenLabsAgentId: true,
  retellAgentId: true,
  retellEnabled: true,
  voiceProvider: true,
});

// Enhanced types
export type EnhancedBusinessProfile = typeof enhancedBusinessProfiles.$inferSelect;
export type InsertEnhancedBusinessProfile = z.infer<typeof insertEnhancedBusinessProfileSchema>;
export type EnhancedMenuItem = typeof enhancedMenuItems.$inferSelect;
export type InsertEnhancedMenuItem = z.infer<typeof insertEnhancedMenuItemSchema>;
export type EnhancedCustomerReview = typeof enhancedCustomerReviews.$inferSelect;
export type BusinessKnowledgeItem = typeof businessKnowledgeBase.$inferSelect;
export type InsertBusinessKnowledgeItem = z.infer<typeof insertBusinessKnowledgeSchema>;

// Subscription types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserTrial = typeof userTrials.$inferSelect;
export type InsertUserTrial = z.infer<typeof insertUserTrialSchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type PhoneNumberAssignment = typeof phoneNumberAssignments.$inferSelect;
export type InsertPhoneNumberAssignment = z.infer<typeof insertPhoneNumberAssignmentSchema>;

// Extended subscription types with relations
export type UserSubscriptionWithPlan = UserSubscription & {
  plan: SubscriptionPlan;
  phoneNumberAssignments: PhoneNumberAssignment[];
};

export type SubscriptionWithPayments = UserSubscription & {
  plan: SubscriptionPlan;
  paymentHistory: PaymentHistory[];
};

// Advanced Restaurant Configuration for Next-Level Features
export const restaurantConfigurations = pgTable("restaurant_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantDataId: varchar("restaurant_data_id").notNull().references(() => restaurantData.id),
  
  // Multilingual Support
  supportedLanguages: text("supported_languages").array().default(['en']), // ISO language codes
  defaultLanguage: text("default_language").default('en'),
  autoDetectLanguage: boolean("auto_detect_language").default(true),
  
  // Custom Voice Configuration
  customVoiceId: text("custom_voice_id"), // ElevenLabs custom voice ID
  voiceCloneStatus: text("voice_clone_status"), // 'processing', 'ready', 'failed'
  voiceSampleUrls: text("voice_sample_urls").array(), // URLs to voice samples
  voiceBrandingEnabled: boolean("voice_branding_enabled").default(false),
  
  // Reservation Integrations
  openTableEnabled: boolean("open_table_enabled").default(false),
  openTableRestaurantId: text("open_table_restaurant_id"),
  openTableApiKey: text("open_table_api_key"),
  resyEnabled: boolean("resy_enabled").default(false),
  resyVenueId: text("resy_venue_id"),
  resyApiKey: text("resy_api_key"),
  
  // Delivery Integrations
  deliveryPartnersEnabled: boolean("delivery_partners_enabled").default(false),
  doorDashUrl: text("door_dash_url"),
  uberEatsUrl: text("uber_eats_url"),
  grubHubUrl: text("grub_hub_url"),
  toastPosEnabled: boolean("toast_pos_enabled").default(false),
  toastApiKey: text("toast_api_key"),
  
  // Follow-up Settings
  autoFollowUpEnabled: boolean("auto_follow_up_enabled").default(false),
  followUpSmsEnabled: boolean("follow_up_sms_enabled").default(false),
  followUpEmailEnabled: boolean("follow_up_email_enabled").default(false),
  followUpTemplate: text("follow_up_template"),
  followUpDelayMinutes: integer("follow_up_delay_minutes").default(5),
  
  // Contact Information
  contactEmail: text("contact_email"),
  menuPdfUrl: text("menu_pdf_url"),
  onlineOrderingUrl: text("online_ordering_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Call Logs with Intent Recognition and Follow-ups
export const enhancedCallLogs = pgTable("enhanced_call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantConfigId: varchar("restaurant_config_id").notNull().references(() => restaurantConfigurations.id),
  twilioCallSid: text("twilio_call_sid").notNull().unique(),
  
  // Call Details
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  callDuration: integer("call_duration"), // seconds
  callStatus: text("call_status"), // completed, missed, busy, failed
  
  // Language & Content
  detectedLanguage: text("detected_language").default('en'),
  conversationLanguage: text("conversation_language").default('en'),
  fullTranscript: text("full_transcript"),
  aiResponses: jsonb("ai_responses"), // Array of AI responses with timestamps
  
  // Intent Recognition
  detectedIntents: text("detected_intents").array(), // reservation, ordering, hours, menu, etc.
  reservationRequested: boolean("reservation_requested").default(false),
  reservationDetails: jsonb("reservation_details"), // party size, date, time, preferences
  orderingRequested: boolean("ordering_requested").default(false),
  orderingType: text("ordering_type"), // delivery, pickup, dine-in
  
  // Follow-up Tracking
  followUpSent: boolean("follow_up_sent").default(false),
  followUpType: text("follow_up_type"), // sms, email, both
  followUpSentAt: timestamp("follow_up_sent_at"),
  followUpDelivered: boolean("follow_up_delivered").default(false),
  
  // Analytics
  customerSatisfaction: integer("customer_satisfaction"), // 1-5 scale if provided
  conversationSentiment: text("conversation_sentiment"), // positive, neutral, negative
  resolutionStatus: text("resolution_status"), // resolved, needs_human, escalated
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Multilingual Content Storage
export const multilingualContent = pgTable("multilingual_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantConfigId: varchar("restaurant_config_id").notNull().references(() => restaurantConfigurations.id),
  
  contentKey: text("content_key").notNull(), // greeting, hours_response, menu_intro, etc.
  languageCode: text("language_code").notNull(), // en, es, fr, etc.
  content: text("content").notNull(),
  contentType: text("content_type").default('text'), // text, audio_url
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voice Cloning Management
export const voiceClones = pgTable("voice_clones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantConfigId: varchar("restaurant_config_id").notNull().references(() => restaurantConfigurations.id),
  
  cloneName: text("clone_name").notNull(),
  elevenLabsVoiceId: text("eleven_labs_voice_id"),
  sampleAudioUrls: text("sample_audio_urls").array(),
  cloneStatus: text("clone_status").default('processing'), // processing, ready, failed
  qualityScore: real("quality_score"), // 0-1 ElevenLabs quality score
  
  // Voice Characteristics
  voiceDescription: text("voice_description"),
  voiceGender: text("voice_gender"),
  voiceAge: text("voice_age"),
  voiceAccent: text("voice_accent"),
  
  // Usage Settings
  isActive: boolean("is_active").default(false),
  stabilitySettings: real("stability_settings").default(0.5),
  claritySettings: real("clarity_settings").default(0.75),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for advanced features
export const restaurantConfigurationsRelations = relations(restaurantConfigurations, ({ one, many }) => ({
  restaurantData: one(restaurantData, {
    fields: [restaurantConfigurations.restaurantDataId],
    references: [restaurantData.id],
  }),
  callLogs: many(enhancedCallLogs),
  multilingualContent: many(multilingualContent),
  voiceClones: many(voiceClones),
}));

export const enhancedCallLogsRelations = relations(enhancedCallLogs, ({ one }) => ({
  restaurantConfig: one(restaurantConfigurations, {
    fields: [enhancedCallLogs.restaurantConfigId],
    references: [restaurantConfigurations.id],
  }),
}));

export const multilingualContentRelations = relations(multilingualContent, ({ one }) => ({
  restaurantConfig: one(restaurantConfigurations, {
    fields: [multilingualContent.restaurantConfigId],
    references: [restaurantConfigurations.id],
  }),
}));

export const voiceClonesRelations = relations(voiceClones, ({ one }) => ({
  restaurantConfig: one(restaurantConfigurations, {
    fields: [voiceClones.restaurantConfigId],
    references: [restaurantConfigurations.id],
  }),
}));

// Insert schemas for advanced features
export const insertRestaurantConfigurationSchema = createInsertSchema(restaurantConfigurations).pick({
  restaurantDataId: true,
  supportedLanguages: true,
  defaultLanguage: true,
  autoDetectLanguage: true,
  customVoiceId: true,
  openTableEnabled: true,
  resyEnabled: true,
  deliveryPartnersEnabled: true,
  autoFollowUpEnabled: true,
  contactEmail: true,
});

export const insertEnhancedCallLogSchema = createInsertSchema(enhancedCallLogs).pick({
  restaurantConfigId: true,
  twilioCallSid: true,
  fromNumber: true,
  toNumber: true,
  detectedLanguage: true,
  fullTranscript: true,
  detectedIntents: true,
  reservationRequested: true,
});

export const insertMultilingualContentSchema = createInsertSchema(multilingualContent).pick({
  restaurantConfigId: true,
  contentKey: true,
  languageCode: true,
  content: true,
  contentType: true,
});

export const insertVoiceCloneSchema = createInsertSchema(voiceClones).pick({
  restaurantConfigId: true,
  cloneName: true,
  sampleAudioUrls: true,
  voiceDescription: true,
  voiceGender: true,
});

// Enhanced types for advanced features
export type RestaurantConfiguration = typeof restaurantConfigurations.$inferSelect;
export type InsertRestaurantConfiguration = z.infer<typeof insertRestaurantConfigurationSchema>;
export type EnhancedCallLog = typeof enhancedCallLogs.$inferSelect;
export type InsertEnhancedCallLog = z.infer<typeof insertEnhancedCallLogSchema>;
export type MultilingualContent = typeof multilingualContent.$inferSelect;
export type InsertMultilingualContent = z.infer<typeof insertMultilingualContentSchema>;
export type VoiceClone = typeof voiceClones.$inferSelect;
export type InsertVoiceClone = z.infer<typeof insertVoiceCloneSchema>;

// Business Phone Connection schema and types
export const insertBusinessPhoneConnectionSchema = createInsertSchema(businessPhoneConnections).pick({
  businessPhoneNumber: true,
  carrier: true,
  connectionMethod: true,
  sipServer: true,
  sipUsername: true,
  sipPassword: true,
  sipPort: true,
  notes: true,
});

export type BusinessPhoneConnection = typeof businessPhoneConnections.$inferSelect;
export type InsertBusinessPhoneConnection = z.infer<typeof insertBusinessPhoneConnectionSchema>;

// Restaurant automation configuration table
export const restaurantAutomationConfigs = pgTable("restaurant_automation_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  restaurantId: varchar("restaurant_id").notNull(),
  businessName: text("business_name").notNull(),

  // Google Calendar Integration
  googleCalendar: jsonb("google_calendar"), // { calendarId, serviceAccountKey, timeZone }

  // POS System Integration
  posSystem: jsonb("pos_system"), // { type, apiKey, apiSecret, environmentId, locationId, webhookUrl }

  // Delivery System Integration
  deliverySystem: jsonb("delivery_system"), // { uberEats, doorDash, inHouse }

  // Business Configuration
  businessHours: jsonb("business_hours").notNull(), // { monday: {open, close, closed}, ... }
  timezone: text("timezone").notNull().default('America/New_York'),
  acceptAfterHours: boolean("accept_after_hours").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Automation events log table
export const automationEvents = pgTable("automation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  conversationId: varchar("conversation_id").notNull(),
  callId: varchar("call_id"),
  action: text("action").notNull(), // reservation, order, delivery, catering, transfer, afterhours
  success: boolean("success").notNull(),
  customerData: jsonb("customer_data"), // { name, phone, email }
  requestData: jsonb("request_data"), // action-specific data
  result: jsonb("result"), // { message, confirmationId, error }
  businessName: text("business_name"),
  retryCount: integer("retry_count").default(0),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Catering requests table
export const cateringRequests = pgTable("catering_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  eventDate: text("event_date"),
  eventTime: text("event_time"),
  guestCount: integer("guest_count"),
  menuItems: jsonb("menu_items"), // array of requested items
  specialRequests: text("special_requests"),
  budget: text("budget"),
  eventLocation: text("event_location"),
  conversationId: varchar("conversation_id"),
  status: text("status").default('pending'), // pending, confirmed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery requests table
export const deliveryRequests = pgTable("delivery_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  orderId: text("order_id").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerPhone: text("customer_phone"),
  items: jsonb("items"), // array of order items
  deliveryFee: real("delivery_fee"),
  estimatedTime: text("estimated_time"),
  status: text("status").default('pending'), // pending, confirmed, in_transit, delivered
  trackingId: text("tracking_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// CALL METRICS SYSTEM TABLES
// ============================================

// Call Sessions - Central table linking Twilio, Retell AI, and business data
export const callSessions = pgTable("call_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // External IDs for linking
  twilioCallSid: text("twilio_call_sid").unique(),
  retellCallId: text("retell_call_id"),
  conversationId: text("conversation_id"),
  
  // Agent and Phone Information
  userId: varchar("user_id").notNull().references(() => users.id),
  retellAgentId: text("retell_agent_id"),
  phoneNumber: text("phone_number").notNull(),
  phoneNumberId: varchar("phone_number_id").references(() => phoneNumberAssignments.id),
  
  // Call Details
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  callerPhone: text("caller_phone").notNull(),
  callerName: text("caller_name"),
  
  // Timing
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // seconds
  
  // Status
  callStatus: text("call_status").notNull(), // 'completed', 'missed', 'busy', 'failed', 'no-answer'
  
  // Call Type / Intent
  callType: text("call_type"), // 'reservation', 'order', 'inquiry', 'support', 'other'
  detectedIntents: text("detected_intents").array().default(sql`'{}'`),
  
  // Recording & Transcript
  recordingUrl: text("recording_url"),
  recordingSid: text("recording_sid"),
  transcriptText: text("transcript_text"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("call_sessions_user_idx").on(table.userId),
  index("call_sessions_phone_idx").on(table.phoneNumber),
  index("call_sessions_caller_idx").on(table.callerPhone),
  index("call_sessions_start_time_idx").on(table.startTime),
  index("call_sessions_call_type_idx").on(table.callType),
]);

// Call Outcomes - AI performance and customer satisfaction
export const callOutcomes = pgTable("call_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callSessionId: varchar("call_session_id").notNull().references(() => callSessions.id).unique(),
  
  // AI Performance
  aiHandled: boolean("ai_handled").default(true),
  aiSuccessful: boolean("ai_successful").default(false),
  transferredToHuman: boolean("transferred_to_human").default(false),
  
  // Sentiment & Satisfaction
  sentiment: text("sentiment"), // 'positive', 'neutral', 'negative'
  sentimentScore: real("sentiment_score"), // 0-1
  customerSatisfaction: integer("customer_satisfaction"), // 1-5 rating
  
  // Conversation Quality
  responseTime: integer("response_time"), // average ms
  interruptionCount: integer("interruption_count"),
  silenceDuration: integer("silence_duration"), // total seconds
  confidence: real("confidence"), // 0-1
  
  // Actions Taken
  actionsTaken: text("actions_taken").array().default(sql`'{}'`), // ['created_reservation', 'placed_order', 'answered_faq']
  outcome: text("outcome").notNull(), // 'successful', 'escalated', 'incomplete', 'follow_up_needed'
  
  // Follow-up
  followUpRequired: boolean("follow_up_required").default(false),
  followUpReason: text("follow_up_reason"),
  followUpCompleted: boolean("follow_up_completed").default(false),
  
  // Summary
  conversationSummary: text("conversation_summary"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Call Links - Bridge table linking POS orders to calls
export const orderCallLinks = pgTable("order_call_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callSessionId: varchar("call_session_id").notNull().references(() => callSessions.id),
  
  // Order Information
  orderId: text("order_id").notNull(), // POS system order ID
  posSystem: text("pos_system").notNull(), // 'square', 'toast', 'clover', 'custom'
  
  // Order Details
  orderTotal: real("order_total"),
  orderItems: jsonb("order_items"),
  orderStatus: text("order_status"), // 'pending', 'confirmed', 'completed', 'cancelled'
  orderType: text("order_type"), // 'dine-in', 'takeout', 'delivery', 'catering'
  
  // Revenue Attribution
  revenueGenerated: real("revenue_generated"), // actual revenue after fees
  commission: real("commission"), // platform fees if applicable
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("order_call_links_session_idx").on(table.callSessionId),
  index("order_call_links_order_idx").on(table.orderId),
]);

// Reservation Call Links - Bridge table linking reservations to calls
export const reservationCallLinks = pgTable("reservation_call_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callSessionId: varchar("call_session_id").notNull().references(() => callSessions.id),
  
  // Reservation Information
  reservationId: text("reservation_id").notNull(), // Calendar/booking system ID
  reservationSystem: text("reservation_system").notNull(), // 'google_calendar', 'opentable', 'resy', 'custom'
  
  // Reservation Details
  partySize: integer("party_size"),
  reservationDate: timestamp("reservation_date"),
  reservationTime: text("reservation_time"),
  specialRequests: text("special_requests"),
  
  // Status & Conversion
  reservationStatus: text("reservation_status"), // 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
  converted: boolean("converted").default(false), // whether call resulted in confirmed booking
  noShow: boolean("no_show").default(false),
  
  // Revenue (if applicable)
  estimatedRevenue: real("estimated_revenue"),
  actualRevenue: real("actual_revenue"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("reservation_call_links_session_idx").on(table.callSessionId),
  index("reservation_call_links_reservation_idx").on(table.reservationId),
  index("reservation_call_links_date_idx").on(table.reservationDate),
]);

// Customer Profiles - Customer segmentation and lifetime value
export const customerProfiles = pgTable("customer_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identification
  phoneNumber: text("phone_number").notNull(),
  normalizedPhone: text("normalized_phone").notNull(), // E.164 format
  customerName: text("customer_name"),
  email: text("email"),
  secondaryPhones: text("secondary_phones").array().default(sql`'{}'`), // Additional phone numbers
  
  // Business/Organization Info
  businessOrganization: text("business_organization"), // For business contacts
  address: text("address"), // Physical address
  
  // Associated User/Restaurant
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Call History
  firstCallDate: timestamp("first_call_date").notNull(),
  lastCallDate: timestamp("last_call_date").notNull(),
  totalCalls: integer("total_calls").default(1),
  successfulCalls: integer("successful_calls").default(0),
  
  // Revenue & Orders
  totalRevenue: real("total_revenue").default(0),
  totalOrders: integer("total_orders").default(0),
  averageOrderValue: real("average_order_value").default(0),
  
  // Reservations
  totalReservations: integer("total_reservations").default(0),
  completedReservations: integer("completed_reservations").default(0),
  noShowCount: integer("no_show_count").default(0),
  
  // Segmentation
  segment: text("segment").notNull().default('new'), // 'new', 'repeat', 'vip', 'at_risk', 'churned'
  vipStatus: boolean("vip_status").default(false),
  lifetimeValue: real("lifetime_value").default(0),
  
  // Preferences & Behavior
  preferredCallTime: text("preferred_call_time"), // time of day pattern
  averageCallDuration: integer("average_call_duration"),
  preferredOrderType: text("preferred_order_type"),
  tags: text("tags").array().default(sql`'{}'`),
  
  // Engagement
  lastInteractionType: text("last_interaction_type"),
  satisfactionScore: real("satisfaction_score"), // average across all calls
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("customer_profiles_user_idx").on(table.userId),
  phoneIdx: index("customer_profiles_phone_idx").on(table.phoneNumber),
  normalizedIdx: index("customer_profiles_normalized_idx").on(table.normalizedPhone),
  segmentIdx: index("customer_profiles_segment_idx").on(table.segment),
  vipIdx: index("customer_profiles_vip_idx").on(table.vipStatus),
  // Composite unique constraint: each user can have only one contact per phone number
  userPhoneUnique: uniqueIndex("customer_profiles_user_phone_unique").on(table.userId, table.phoneNumber),
}));

// Customer Memories - Agent-specific memory notes for customers
export const customerMemories = pgTable("customer_memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Associations
  customerProfileId: varchar("customer_profile_id").notNull().references(() => customerProfiles.id),
  agentId: varchar("agent_id").notNull().references(() => voiceAgents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Content
  title: text("title"),
  content: text("content"),
  wordCount: integer("word_count").default(0),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("customer_memories_customer_idx").on(table.customerProfileId),
  index("customer_memories_agent_idx").on(table.agentId),
  index("customer_memories_user_idx").on(table.userId),
]);

// Call Metrics Daily - Pre-aggregated daily metrics for fast queries
export const callMetricsDaily = pgTable("call_metrics_daily", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Grouping Keys
  userId: varchar("user_id").notNull().references(() => users.id),
  retellAgentId: text("retell_agent_id"),
  phoneNumber: text("phone_number"),
  date: timestamp("date").notNull(), // date at midnight
  
  // Call Volume
  totalCalls: integer("total_calls").default(0),
  inboundCalls: integer("inbound_calls").default(0),
  outboundCalls: integer("outbound_calls").default(0),
  completedCalls: integer("completed_calls").default(0),
  missedCalls: integer("missed_calls").default(0),
  failedCalls: integer("failed_calls").default(0),
  
  // Duration
  totalDuration: integer("total_duration").default(0), // seconds
  averageDuration: real("average_duration").default(0), // seconds
  
  // AI Performance
  aiHandledCalls: integer("ai_handled_calls").default(0),
  aiSuccessfulCalls: integer("ai_successful_calls").default(0),
  transferredCalls: integer("transferred_calls").default(0),
  aiSuccessRate: real("ai_success_rate").default(0), // percentage
  
  // Sentiment
  positiveCalls: integer("positive_calls").default(0),
  neutralCalls: integer("neutral_calls").default(0),
  negativeCalls: integer("negative_calls").default(0),
  averageSentiment: real("average_sentiment").default(0), // -1 to 1
  
  // Satisfaction
  averageSatisfaction: real("average_satisfaction").default(0), // 1-5
  satisfactionCount: integer("satisfaction_count").default(0), // how many provided ratings
  
  // Conversions
  ordersCreated: integer("orders_created").default(0),
  reservationsCreated: integer("reservations_created").default(0),
  conversionRate: real("conversion_rate").default(0), // percentage
  
  // Revenue
  totalRevenue: real("total_revenue").default(0),
  averageOrderValue: real("average_order_value").default(0),
  
  // Customers
  uniqueCallers: integer("unique_callers").default(0),
  newCustomers: integer("new_customers").default(0),
  repeatCustomers: integer("repeat_customers").default(0),
  vipCustomers: integer("vip_customers").default(0),
  
  // Response Quality
  averageResponseTime: real("average_response_time").default(0), // ms
  averageConfidence: real("average_confidence").default(0), // 0-1
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("call_metrics_daily_user_date_idx").on(table.userId, table.date),
  index("call_metrics_daily_agent_date_idx").on(table.retellAgentId, table.date),
  index("call_metrics_daily_phone_date_idx").on(table.phoneNumber, table.date),
  index("call_metrics_daily_date_idx").on(table.date),
]);

// Relations for metrics tables
export const callSessionsRelations = relations(callSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [callSessions.userId],
    references: [users.id],
  }),
  phoneAssignment: one(phoneNumberAssignments, {
    fields: [callSessions.phoneNumberId],
    references: [phoneNumberAssignments.id],
  }),
  outcome: one(callOutcomes),
  orderLinks: many(orderCallLinks),
  reservationLinks: many(reservationCallLinks),
}));

export const callOutcomesRelations = relations(callOutcomes, ({ one }) => ({
  callSession: one(callSessions, {
    fields: [callOutcomes.callSessionId],
    references: [callSessions.id],
  }),
}));

export const orderCallLinksRelations = relations(orderCallLinks, ({ one }) => ({
  callSession: one(callSessions, {
    fields: [orderCallLinks.callSessionId],
    references: [callSessions.id],
  }),
}));

export const reservationCallLinksRelations = relations(reservationCallLinks, ({ one }) => ({
  callSession: one(callSessions, {
    fields: [reservationCallLinks.callSessionId],
    references: [callSessions.id],
  }),
}));

export const customerProfilesRelations = relations(customerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [customerProfiles.userId],
    references: [users.id],
  }),
  memories: many(customerMemories),
}));

export const customerMemoriesRelations = relations(customerMemories, ({ one }) => ({
  customerProfile: one(customerProfiles, {
    fields: [customerMemories.customerProfileId],
    references: [customerProfiles.id],
  }),
  agent: one(voiceAgents, {
    fields: [customerMemories.agentId],
    references: [voiceAgents.id],
  }),
  user: one(users, {
    fields: [customerMemories.userId],
    references: [users.id],
  }),
}));

export const callMetricsDailyRelations = relations(callMetricsDaily, ({ one }) => ({
  user: one(users, {
    fields: [callMetricsDaily.userId],
    references: [users.id],
  }),
}));

// Create insert schemas for the new tables
export const insertRestaurantAutomationConfigSchema = createInsertSchema(restaurantAutomationConfigs).pick({
  userId: true,
  restaurantId: true,
  businessName: true,
  googleCalendar: true,
  posSystem: true,
  deliverySystem: true,
  businessHours: true,
  timezone: true,
  acceptAfterHours: true,
});

export const insertAutomationEventSchema = createInsertSchema(automationEvents).pick({
  restaurantId: true,
  conversationId: true,
  callId: true,
  action: true,
  success: true,
  customerData: true,
  requestData: true,
  result: true,
  businessName: true,
  retryCount: true,
  timestamp: true,
});

export const insertCateringRequestSchema = createInsertSchema(cateringRequests).pick({
  restaurantId: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  eventDate: true,
  eventTime: true,
  guestCount: true,
  menuItems: true,
  specialRequests: true,
  budget: true,
  eventLocation: true,
  conversationId: true,
  status: true,
});

export const insertDeliveryRequestSchema = createInsertSchema(deliveryRequests).pick({
  restaurantId: true,
  orderId: true,
  customerAddress: true,
  customerPhone: true,
  items: true,
  deliveryFee: true,
  estimatedTime: true,
  status: true,
  trackingId: true,
});

// Insert schemas for call metrics tables
export const insertCallSessionSchema = createInsertSchema(callSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallOutcomeSchema = createInsertSchema(callOutcomes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderCallLinkSchema = createInsertSchema(orderCallLinks).omit({
  id: true,
  createdAt: true,
});

export const insertReservationCallLinkSchema = createInsertSchema(reservationCallLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerProfileSchema = createInsertSchema(customerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerMemorySchema = createInsertSchema(customerMemories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallMetricsDailySchema = createInsertSchema(callMetricsDaily).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types for call metrics tables
export type CallSession = typeof callSessions.$inferSelect;
export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;
export type CallOutcome = typeof callOutcomes.$inferSelect;
export type InsertCallOutcome = z.infer<typeof insertCallOutcomeSchema>;
export type OrderCallLink = typeof orderCallLinks.$inferSelect;
export type InsertOrderCallLink = z.infer<typeof insertOrderCallLinkSchema>;
export type ReservationCallLink = typeof reservationCallLinks.$inferSelect;
export type InsertReservationCallLink = z.infer<typeof insertReservationCallLinkSchema>;
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = z.infer<typeof insertCustomerProfileSchema>;
export type CustomerMemory = typeof customerMemories.$inferSelect;
export type InsertCustomerMemory = z.infer<typeof insertCustomerMemorySchema>;
export type CallMetricsDaily = typeof callMetricsDaily.$inferSelect;
export type InsertCallMetricsDaily = z.infer<typeof insertCallMetricsDailySchema>;

// Export types for the new tables
export type RestaurantAutomationConfig = typeof restaurantAutomationConfigs.$inferSelect;
export type InsertRestaurantAutomationConfig = z.infer<typeof insertRestaurantAutomationConfigSchema>;
export type AutomationEvent = typeof automationEvents.$inferSelect;
export type InsertAutomationEvent = z.infer<typeof insertAutomationEventSchema>;
export type CateringRequest = typeof cateringRequests.$inferSelect;
export type InsertCateringRequest = z.infer<typeof insertCateringRequestSchema>;
export type DeliveryRequest = typeof deliveryRequests.$inferSelect;
export type InsertDeliveryRequest = z.infer<typeof insertDeliveryRequestSchema>;

// ============================================
// TEAM MANAGEMENT TABLES
// ============================================

// Team Members - Users who have access to a business/account
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id), // The account owner
  userId: varchar("user_id").notNull().references(() => users.id), // The team member
  role: varchar("role").notNull(), // 'owner', 'admin', 'manager', 'editor', 'viewer', 'support'
  permissions: jsonb("permissions"), // Custom permissions override
  assignedAgentIds: jsonb("assigned_agent_ids").$type<string[]>(), // Array of agent IDs this member can access
  phoneNumber: varchar("phone_number"), // Member's phone number for SMS alerts and call transfers
  enableSMS: boolean("enable_sms").default(false), // Enable SMS notifications for this member
  enableCallTransfer: boolean("enable_call_transfer").default(false), // Enable call transfer to this member
  status: varchar("status").default('active'), // 'active', 'suspended'
  joinedAt: timestamp("joined_at").defaultNow(),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("team_members_owner_idx").on(table.ownerId),
  index("team_members_user_idx").on(table.userId),
]);

// Team Invitations - Pending team invitations
export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id), // Who sent the invitation
  inviteToken: varchar("invite_token").notNull().unique(),
  email: varchar("email").notNull(),
  role: varchar("role").notNull(),
  permissions: jsonb("permissions"), // Custom permissions for custom role
  assignedAgentIds: jsonb("assigned_agent_ids").$type<string[]>(), // Array of agent IDs this member can access
  status: varchar("status").default('pending'), // 'pending', 'accepted', 'expired', 'revoked'
  inviterName: varchar("inviter_name"),
  businessName: varchar("business_name"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedByUserId: varchar("accepted_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("team_invitations_owner_idx").on(table.ownerId),
  index("team_invitations_email_idx").on(table.email),
  index("team_invitations_token_idx").on(table.inviteToken),
]);

// Member audit log table for tracking team member activity and changes
export const memberAuditLog = pgTable("member_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  targetMemberId: varchar("target_member_id"), // Can be null for invitation events
  targetEmail: varchar("target_email"), // Email for invitation tracking
  performedById: varchar("performed_by_id").notNull().references(() => users.id),
  action: varchar("action").notNull(), // 'invited', 'role_changed', 'suspended', 'reactivated', 'removed', 'agents_updated', 'invitation_resent', 'invitation_revoked'
  previousValue: jsonb("previous_value"), // JSON of old state
  newValue: jsonb("new_value"), // JSON of new state
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_log_owner_idx").on(table.ownerId),
  index("audit_log_member_idx").on(table.targetMemberId),
  index("audit_log_email_idx").on(table.targetEmail),
  index("audit_log_action_idx").on(table.action),
]);

// In-app notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type").notNull(), // 'flagged_call', 'trial_expiring', 'missing_profile'
  priority: varchar("priority").notNull().default('normal'), // 'urgent', 'high', 'normal', 'low'
  title: text("title").notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"), // Deep link to relevant page
  relatedEntityType: varchar("related_entity_type"), // 'call', 'subscription', 'profile'
  relatedEntityId: varchar("related_entity_id"), // ID of the call, subscription, etc.
  metadata: jsonb("metadata"), // Additional data
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Auto-hide after this date
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  typeIdx: index("notifications_type_idx").on(table.type),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
}));

// Relations for organizations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(organizationMemberships),
}));

export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  user: one(users, {
    fields: [organizationMemberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [organizationMemberships.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [organizationMemberships.invitedBy],
    references: [users.id],
  }),
}));

// Relations for team tables
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  owner: one(users, {
    fields: [teamMembers.ownerId],
    references: [users.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  owner: one(users, {
    fields: [teamInvitations.ownerId],
    references: [users.id],
  }),
  acceptedBy: one(users, {
    fields: [teamInvitations.acceptedByUserId],
    references: [users.id],
  }),
}));

export const memberAuditLogRelations = relations(memberAuditLog, ({ one }) => ({
  owner: one(users, {
    fields: [memberAuditLog.ownerId],
    references: [users.id],
  }),
  performedBy: one(users, {
    fields: [memberAuditLog.performedById],
    references: [users.id],
  }),
}));

// Insert schemas for team tables
export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  ownerId: true,
  userId: true,
  role: true,
  permissions: true,
  status: true,
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).pick({
  ownerId: true,
  inviteToken: true,
  email: true,
  role: true,
  permissions: true,
  status: true,
  inviterName: true,
  businessName: true,
  expiresAt: true,
});

// ─── HIPAA PHI Audit Log ─────────────────────────────────────────────────────
// Immutable record of every PHI access, change, and deletion as required by
// HIPAA Security Rule § 164.312(b) — Audit Controls.
export const phiAuditLog = pgTable("phi_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  agentId: varchar("agent_id"), // Voice agent that handled the call (if applicable)
  action: varchar("action", { length: 64 }).notNull(), // e.g. 'phi_accessed', 'prescription_requested', 'test_results_queried', 'patient_verified'
  resourceType: varchar("resource_type", { length: 64 }).notNull(), // e.g. 'call_log', 'customer_profile', 'prescription'
  resourceId: varchar("resource_id"), // ID of the record accessed
  patientIdentifier: varchar("patient_identifier"), // Hashed/masked patient reference — never store raw name here
  industry: varchar("industry", { length: 32 }), // 'healthcare' | 'dentist' | 'medical-spa'
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"),
  outcome: varchar("outcome", { length: 16 }).notNull().default('success'), // 'success' | 'denied' | 'error'
  metadata: jsonb("metadata"), // Additional context (route, query params, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PhiAuditLog = typeof phiAuditLog.$inferSelect;
export type InsertPhiAuditLog = typeof phiAuditLog.$inferInsert;

// Insert schemas for organizations
export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  industry: true,
  billingEmail: true,
});

export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships).pick({
  userId: true,
  organizationId: true,
  role: true,
  accountType: true,
  isBillingContact: true,
  invitedBy: true,
  status: true,
});

// Export types for organizations
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type InsertOrganizationMembership = z.infer<typeof insertOrganizationMembershipSchema>;

// Export types for team tables
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type MemberAuditLog = typeof memberAuditLog.$inferSelect;
export type InsertMemberAuditLog = typeof memberAuditLog.$inferInsert;

// Export insert schema and types for notifications
export const insertNotificationSchema = createInsertSchema(notifications);
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
