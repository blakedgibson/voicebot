/**
 * TypeScript types and interfaces for the Integrations system
 */

// Integration status enum
export type IntegrationStatus = 'connected' | 'error' | 'paused' | 'pending';

// Integration categories
export type IntegrationCategory =
  | 'crm'
  | 'calendar'
  | 'pos'
  | 'messaging'
  | 'callactions'
  | 'custom'
  | 'magic'
  | 'all';

// Integration event types for logs
export type IntegrationEventType =
  | 'call'
  | 'error'
  | 'test'
  | 'status_change'
  | 'created'
  | 'updated'
  | 'deleted';

// Base integration interface (matches database schema)
export interface Integration {
  id: number;
  userId: number;
  agentId: number | null;
  name: string;
  description: string | null;
  type: string;
  customFunction: string | null;

  // Authentication
  apiKey: string | null;
  applicationId: string | null;
  clientSecret: string | null;
  webhookSecret: string | null;

  // Server configuration
  apiEndpointUrl: string | null;
  method: string | null;
  timeout: number | null;
  webhookUrl: string | null;

  // Headers
  authorization: string | null;
  contentType: string | null;
  customHeaders: Record<string, any> | null;

  // Query parameters
  locationId: string | null;
  timeZone: string | null;
  customQueryParams: Record<string, any> | null;

  // Payload and response
  jsonPayloadSchema: Record<string, any> | null;
  responseVariables: string[] | null;

  // Security
  hmacSignature: boolean | null;
  sandboxMode: boolean | null;

  // OAuth
  isOAuthIntegration: boolean | null;
  oauthAccessToken: string | null;
  oauthRefreshToken: string | null;
  oauthCalendarId: string | null;
  oauthTokenExpiry: Date | null;
  oauthScope: string | null;

  // Testing
  testStatus: string | null;
  testMessage: string | null;
  lastTestedAt: Date | null;

  // Triggers
  triggerFunctions: string[] | null;

  // Status monitoring (new fields)
  status: IntegrationStatus;
  lastHealthCheck: Date | null;
  errorMessage: string | null;
  pausedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Integration template interface (for library display)
export interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string; // Font Awesome class or URL
  logoUrl?: string; // Optional custom logo
  color: string; // Brand color
  isOAuth: boolean;
  documentationUrl: string;
  setupGuideUrl?: string;
  requiredFields: IntegrationField[];
  popularityScore?: number; // For sorting
  isDefault?: boolean; // Whether this integration is created by default during account setup
  autoConfigured?: boolean; // Whether this integration is auto-configured and doesn't need manual setup
}

// Integration field definition for dynamic forms
export interface IntegrationField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select' | 'textarea' | 'toggle' | 'number';
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: { value: string; label: string }[]; // For select fields
  defaultValue?: string | boolean | number;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

// Integration log entry
export interface IntegrationLog {
  id: number;
  userId: number;
  agentId: number | null;
  integrationId: number;
  eventType: IntegrationEventType;
  requestData: Record<string, any> | null;
  responseData: Record<string, any> | null;
  statusCode: number | null;
  errorMessage: string | null;
  duration: number | null; // milliseconds
  createdAt: Date;
}

// Integration with additional UI metadata
export interface IntegrationWithMeta extends Integration {
  template?: IntegrationTemplate;
  lastActivityText?: string; // e.g., "Last used 2 hours ago"
  configSummary?: string; // e.g., "Connected via API Key"
  healthStatus?: 'healthy' | 'degraded' | 'down';
}

// Form data for creating/updating integrations
export interface IntegrationFormData {
  name: string;
  description?: string;
  type: string;
  agentId?: number;

  // Authentication
  apiKey?: string;
  applicationId?: string;
  clientSecret?: string;
  webhookSecret?: string;

  // Server configuration
  apiEndpointUrl?: string;
  method?: string;
  timeout?: number;
  webhookUrl?: string;

  // Headers
  authorization?: string;
  contentType?: string;
  customHeaders?: Record<string, any>;

  // Query parameters
  locationId?: string;
  timeZone?: string;
  customQueryParams?: Record<string, any>;

  // Payload
  jsonPayloadSchema?: Record<string, any>;
  responseVariables?: string[];

  // Security
  hmacSignature?: boolean;
  sandboxMode?: boolean;

  // OAuth
  oauthCalendarId?: string;

  // Triggers
  triggerFunctions?: string[];
  customFunction?: string;
}

// API response types
export interface IntegrationTestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface IntegrationHealthCheck {
  integrationId: number;
  status: IntegrationStatus;
  healthy: boolean;
  lastCheck: Date;
  errorMessage?: string;
  responseTime?: number;
}

// Component props interfaces
export interface IntegrationCardProps {
  integration: IntegrationWithMeta;
  onClick: () => void;
}

export interface IntegrationsLibraryProps {
  templates: IntegrationTemplate[];
  connectedIntegrations: Integration[];
  onSelectTemplate: (template: IntegrationTemplate) => void;
}

export interface IntegrationDetailsModalProps {
  integration?: Integration; // undefined for new integration
  template?: IntegrationTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IntegrationFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  onTest?: (id: number) => Promise<IntegrationTestResult>;
}

export interface IntegrationLogsProps {
  integrationId: number;
  logs: IntegrationLog[];
  isLoading?: boolean;
}

// View state
export type IntegrationsView = 'my-integrations' | 'library';

// Filter state
export interface IntegrationsFilter {
  search: string;
  category: IntegrationCategory;
  status?: IntegrationStatus | 'all';
}
