/**
 * Integration Templates with UI Metadata
 *
 * This file contains frontend-specific metadata for all integration templates
 * including brand colors, icons, documentation links, and field definitions.
 */

import { IntegrationTemplate, IntegrationCategory } from './types';

export const INTEGRATION_TEMPLATES: Record<string, IntegrationTemplate> = {
  // ============================================================================
  // CALENDAR / APPOINTMENT SETTING INTEGRATIONS
  // ============================================================================

  google_calendar: {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Organize your schedule and stay on track with Google\'s calendar service',
    category: 'calendar',
    icon: 'fab fa-google',
    color: '#4285F4',
    isOAuth: true,
    documentationUrl: 'https://developers.google.com/calendar/api',
    setupGuideUrl: 'https://support.google.com/calendar',
    popularityScore: 100,
    requiredFields: [],
  },

  cal_com: {
    id: 'cal_com',
    name: 'Cal.com',
    description: 'Open-source scheduling platform for seamless appointment booking',
    category: 'calendar',
    icon: 'fas fa-calendar-alt',
    color: '#292929',
    isOAuth: false,
    documentationUrl: 'https://cal.com/docs/api',
    setupGuideUrl: 'https://cal.com/docs/core-features/calendar-setup',
    popularityScore: 85,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Cal.com API key',
        required: true,
        helpText: 'Find this in your Cal.com Settings > Security > API Keys',
      },
    ],
  },

  calendly: {
    id: 'calendly',
    name: 'Calendly',
    description: 'Simplified scheduling software for faster meetings and appointments',
    category: 'calendar',
    icon: 'fas fa-calendar-check',
    color: '#006BFF',
    isOAuth: false,
    documentationUrl: 'https://developer.calendly.com',
    setupGuideUrl: 'https://help.calendly.com/hc/en-us/articles/360007990833',
    popularityScore: 90,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'Personal Access Token',
        type: 'password',
        placeholder: 'Your Calendly PAT',
        required: true,
        helpText: 'Generate at https://calendly.com/integrations/api_webhooks',
      },
    ],
  },

  housecall_pro: {
    id: 'housecall_pro',
    name: 'Housecall Pro',
    description: 'Complete home service business management and scheduling platform',
    category: 'calendar',
    icon: 'fas fa-home',
    color: '#FF6B35',
    isOAuth: false,
    documentationUrl: 'https://docs.housecallpro.com/reference',
    setupGuideUrl: 'https://help.housecallpro.com',
    popularityScore: 75,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Housecall Pro API key',
        required: true,
      },
      {
        name: 'applicationId',
        label: 'Company ID',
        type: 'text',
        placeholder: 'Your company identifier',
        required: true,
      },
    ],
  },

  meevo: {
    id: 'meevo',
    name: 'Meevo',
    description: 'Salon and spa management software with booking capabilities',
    category: 'calendar',
    icon: 'fas fa-spa',
    color: '#9B59B6',
    isOAuth: false,
    documentationUrl: 'https://meevo.com/support',
    popularityScore: 65,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'Meevo Token',
        type: 'password',
        placeholder: 'Your Meevo API token',
        required: true,
      },
      {
        name: 'locationId',
        label: 'Location ID',
        type: 'text',
        placeholder: 'Your location identifier',
        required: true,
      },
    ],
  },

  boulevard: {
    id: 'boulevard',
    name: 'Boulevard',
    description: 'Modern booking and client management platform for beauty and wellness',
    category: 'calendar',
    icon: 'fas fa-cut',
    color: '#000000',
    isOAuth: false,
    documentationUrl: 'https://developers.joinblvd.com',
    popularityScore: 70,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Boulevard API key',
        required: true,
      },
      {
        name: 'applicationId',
        label: 'Business ID',
        type: 'text',
        placeholder: 'Your business identifier',
        required: true,
      },
    ],
  },

  mindbody: {
    id: 'mindbody',
    name: 'Mindbody',
    description: 'Wellness and fitness business management software with scheduling and client management',
    category: 'calendar',
    icon: 'fas fa-dumbbell',
    color: '#00A3E0',
    isOAuth: false,
    documentationUrl: 'https://developers.mindbodyonline.com/PublicDocumentation/V6',
    setupGuideUrl: 'https://developers.mindbodyonline.com',
    popularityScore: 85,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Mindbody API key',
        required: true,
        helpText: 'Get your API key from the Mindbody Developer Portal',
      },
      {
        name: 'siteId',
        label: 'Site ID',
        type: 'text',
        placeholder: 'Your Mindbody Site ID (e.g., -99)',
        required: true,
        helpText: 'Your unique Mindbody site identifier',
      },
      {
        name: 'username',
        label: 'Source Name (Optional)',
        type: 'text',
        placeholder: 'Your source name for authenticated requests',
        required: false,
        helpText: 'Required for authenticated API calls. Will be prefixed with underscore automatically.',
      },
      {
        name: 'password',
        label: 'Source Password (Optional)',
        type: 'password',
        placeholder: 'Your source password',
        required: false,
        helpText: 'Required for authenticated API calls.',
      },
    ],
  },

  servicetitan: {
    id: 'servicetitan',
    name: 'ServiceTitan',
    description: 'All-in-one software for home service professionals',
    category: 'calendar',
    icon: 'fas fa-wrench',
    color: '#FF8C00',
    isOAuth: true,
    documentationUrl: 'https://developer.servicetitan.io',
    popularityScore: 80,
    requiredFields: [
      {
        name: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        placeholder: 'Your ServiceTitan client secret',
        required: true,
      },
      {
        name: 'applicationId',
        label: 'Client ID',
        type: 'text',
        placeholder: 'Your client identifier',
        required: true,
      },
    ],
  },

  servicetrade: {
    id: 'servicetrade',
    name: 'ServiceTrade',
    description: 'Job management software for commercial service contractors',
    category: 'calendar',
    icon: 'fas fa-tools',
    color: '#003D7A',
    isOAuth: false,
    documentationUrl: 'https://www.servicetrade.com/api',
    popularityScore: 60,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your ServiceTrade API key',
        required: true,
      },
    ],
  },

  vagaro: {
    id: 'vagaro',
    name: 'Vagaro',
    description: 'Enterprise business management platform for salons, spas, and fitness studios',
    category: 'calendar',
    icon: 'fas fa-spa',
    color: '#6B4DB1',
    isOAuth: true,
    documentationUrl: 'https://docs.vagaro.com/public/reference/api-introduction',
    setupGuideUrl: 'https://support.vagaro.com/hc/en-us/categories/34949493949851-Developer-Features',
    popularityScore: 78,
    requiredFields: [
      {
        name: 'applicationId',
        label: 'Client ID',
        type: 'text',
        placeholder: 'Your Vagaro Client ID',
        required: true,
        helpText: 'Found in your Vagaro Developer Settings',
      },
      {
        name: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        placeholder: 'Your Vagaro Client Secret',
        required: true,
        helpText: 'Found in your Vagaro Developer Settings',
      },
    ],
  },

  fresha: {
    id: 'fresha',
    name: 'Fresha',
    description: 'Modern salon and spa management software with integrated appointment booking',
    category: 'calendar',
    icon: 'fas fa-calendar-days',
    color: '#FF6B9D',
    isOAuth: true,
    documentationUrl: 'https://developer.fresha.com/api',
    setupGuideUrl: 'https://support.fresha.com/hc/en-us',
    popularityScore: 82,
    requiredFields: [
      {
        name: 'applicationId',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Fresha API Key',
        required: true,
        helpText: 'Found in Fresha Settings > Integrations > API',
      },
      {
        name: 'clientSecret',
        label: 'Client Secret (Optional)',
        type: 'password',
        placeholder: 'Your Fresha Client Secret',
        required: false,
        helpText: 'Required for OAuth flow, optional for API key only',
      },
    ],
  },

  square_appointments: {
    id: 'square_appointments',
    name: 'Square Appointments',
    description: 'Square\'s Bookings API for managing appointments, scheduling, and service availability',
    category: 'calendar',
    icon: 'fab fa-square',
    color: '#3CCBF4',
    isOAuth: true,
    documentationUrl: 'https://developer.squareup.com/docs/bookings-api/what-it-is',
    setupGuideUrl: 'https://developer.squareup.com/docs/bookings-api/get-ready-to-use-the-api',
    popularityScore: 88,
    requiredFields: [
      {
        name: 'applicationId',
        label: 'Access Token',
        type: 'password',
        placeholder: 'Your Square Access Token',
        required: true,
        helpText: 'OAuth access token from Square Dashboard > Developer > Credentials',
      },
      {
        name: 'clientSecret',
        label: 'Location ID',
        type: 'text',
        placeholder: 'Your primary location ID',
        required: false,
        helpText: 'Default location for appointments (found in Square Dashboard > Locations)',
      },
    ],
  },

  // ============================================================================
  // CRM INTEGRATIONS
  // ============================================================================

  contact_memory: {
    id: 'contact_memory',
    name: 'Contacts',
    description: 'View and manage customer profiles, conversation history, and contact information from your AI receptionist calls',
    category: 'crm',
    icon: 'fas fa-user-group',
    color: '#8B5CF6',
    isOAuth: false,
    documentationUrl: '/docs/contacts',
    setupGuideUrl: '/docs/contacts-setup',
    popularityScore: 100,
    isDefault: true,
    autoConfigured: true,
    requiredFields: [],
  },

  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Powerful CRM platform for marketing, sales, and customer service',
    category: 'crm',
    icon: 'fab fa-hubspot',
    color: '#FF7A59',
    isOAuth: false,
    documentationUrl: 'https://developers.hubspot.com/docs/api/overview',
    setupGuideUrl: 'https://knowledge.hubspot.com/getting-started',
    popularityScore: 95,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'Private App Access Token',
        type: 'password',
        placeholder: 'Your HubSpot access token',
        required: true,
        helpText: 'Create a private app at Settings > Integrations > Private Apps',
      },
    ],
  },

  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'World\'s #1 CRM platform for managing customer relationships',
    category: 'crm',
    icon: 'fab fa-salesforce',
    color: '#00A1E0',
    isOAuth: true,
    documentationUrl: 'https://developer.salesforce.com/docs/apis',
    setupGuideUrl: 'https://help.salesforce.com',
    popularityScore: 98,
    requiredFields: [
      {
        name: 'applicationId',
        label: 'Consumer Key',
        type: 'text',
        placeholder: 'Your Salesforce consumer key',
        required: true,
      },
      {
        name: 'clientSecret',
        label: 'Consumer Secret',
        type: 'password',
        placeholder: 'Your consumer secret',
        required: true,
      },
      {
        name: 'apiEndpointUrl',
        label: 'Instance URL',
        type: 'text',
        placeholder: 'https://your-instance.salesforce.com',
        required: true,
      },
    ],
  },

  zoho: {
    id: 'zoho',
    name: 'ZOHO CRM',
    description: 'Cloud-based CRM solution for managing sales and customer data',
    category: 'crm',
    icon: 'fas fa-chart-line',
    color: '#E42527',
    isOAuth: true,
    documentationUrl: 'https://www.zoho.com/crm/developer/docs/api/v2/',
    popularityScore: 85,
    requiredFields: [
      {
        name: 'applicationId',
        label: 'Client ID',
        type: 'text',
        placeholder: 'Your ZOHO client ID',
        required: true,
      },
      {
        name: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        placeholder: 'Your client secret',
        required: true,
      },
    ],
  },

  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sales-focused CRM designed to help close more deals',
    category: 'crm',
    icon: 'fas fa-funnel-dollar',
    color: '#00BD5F',
    isOAuth: false,
    documentationUrl: 'https://developers.pipedrive.com/docs/api/v1',
    popularityScore: 80,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Token',
        type: 'password',
        placeholder: 'Your Pipedrive API token',
        required: true,
        helpText: 'Find at Settings > Personal > API',
      },
    ],
  },

  gohighlevel: {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    description: 'All-in-one marketing and CRM platform for agencies',
    category: 'crm',
    icon: 'fas fa-rocket',
    color: '#6366F1',
    isOAuth: false,
    documentationUrl: 'https://highlevel.stoplight.io/docs/integrations',
    popularityScore: 75,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your GoHighLevel API key',
        required: true,
      },
      {
        name: 'locationId',
        label: 'Location ID',
        type: 'text',
        placeholder: 'Your location identifier',
        required: true,
      },
    ],
  },

  bitrix: {
    id: 'bitrix',
    name: 'Bitrix24',
    description: 'Free online workspace for teams with CRM and collaboration tools',
    category: 'crm',
    icon: 'fas fa-building',
    color: '#2FC6F6',
    isOAuth: false,
    documentationUrl: 'https://training.bitrix24.com/rest_help/',
    popularityScore: 70,
    requiredFields: [
      {
        name: 'webhookUrl',
        label: 'Webhook URL',
        type: 'text',
        placeholder: 'https://your-portal.bitrix24.com/rest/...',
        required: true,
        helpText: 'Create an incoming webhook in your Bitrix24 portal',
      },
    ],
  },

  acculynx: {
    id: 'acculynx',
    name: 'Acculynx',
    description: 'Roofing contractor CRM and project management platform',
    category: 'crm',
    icon: 'fas fa-hammer',
    color: '#003D7A',
    isOAuth: false,
    documentationUrl: 'https://www.acculynx.com/api-documentation',
    popularityScore: 60,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Acculynx API key',
        required: true,
      },
    ],
  },

  keycrm: {
    id: 'keycrm',
    name: 'KeyCRM',
    description: 'Modern CRM system for managing customer interactions',
    category: 'crm',
    icon: 'fas fa-key',
    color: '#4A90E2',
    isOAuth: false,
    documentationUrl: 'https://keycrm.app/api/docs',
    popularityScore: 55,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your KeyCRM API key',
        required: true,
      },
    ],
  },

  // ============================================================================
  // POS / FOOD ORDER INTEGRATIONS
  // ============================================================================

  square_pos: {
    id: 'square_pos',
    name: 'Square POS',
    description: 'Complete point of sale system with payment processing',
    category: 'pos',
    icon: 'fab fa-cc-square',
    color: '#3E4348',
    isOAuth: false,
    documentationUrl: 'https://developer.squareup.com/docs',
    setupGuideUrl: 'https://squareup.com/help',
    popularityScore: 92,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'Access Token',
        type: 'password',
        placeholder: 'Your Square access token',
        required: true,
        helpText: 'Get from Square Developer Dashboard',
      },
      {
        name: 'locationId',
        label: 'Location ID',
        type: 'text',
        placeholder: 'Your Square location ID',
        required: true,
      },
      {
        name: 'sandboxMode',
        label: 'Sandbox Mode',
        type: 'toggle',
        required: false,
        helpText: 'Enable for testing with Square sandbox',
        defaultValue: false,
      },
    ],
  },

  clover_pos: {
    id: 'clover_pos',
    name: 'Clover POS',
    description: 'Versatile point of sale and business management system',
    category: 'pos',
    icon: 'fas fa-cash-register',
    color: '#4CAF50',
    isOAuth: false,
    documentationUrl: 'https://docs.clover.com',
    setupGuideUrl: 'https://www.clover.com/help',
    popularityScore: 85,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Token',
        type: 'password',
        placeholder: 'Your Clover API token',
        required: true,
      },
      {
        name: 'applicationId',
        label: 'Merchant ID',
        type: 'text',
        placeholder: 'Your merchant identifier',
        required: true,
      },
    ],
  },

  // ============================================================================
  // MESSAGING INTEGRATIONS
  // ============================================================================

  sms_messaging: {
    id: 'sms_messaging',
    name: 'Messaging',
    description: 'Send and receive text messages with customers via your business phone number',
    category: 'messaging',
    icon: 'fas fa-envelope',
    color: '#10B981',
    isOAuth: false,
    documentationUrl: 'https://www.twilio.com/docs/messaging',
    setupGuideUrl: 'https://support.twilio.com/hc/en-us/articles/223181608-Getting-Started-with-SMS',
    popularityScore: 95,
    isDefault: true,
    requiredFields: [],
    autoConfigured: true,
  },

  telegram: {
    id: 'telegram',
    name: 'Telegram',
    description: 'Send instant messages and notifications via Telegram bot',
    category: 'messaging',
    icon: 'fab fa-telegram',
    color: '#0088CC',
    isOAuth: false,
    documentationUrl: 'https://core.telegram.org/bots/api',
    setupGuideUrl: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
    popularityScore: 80,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'Bot Token',
        type: 'password',
        placeholder: 'Your Telegram bot token',
        required: true,
        helpText: 'Get from @BotFather on Telegram',
      },
    ],
  },

  thumbtack: {
    id: 'thumbtack',
    name: 'Thumbtack',
    description: 'Connect with local service professionals and receive leads',
    category: 'messaging',
    icon: 'fas fa-thumbtack',
    color: '#009FD9',
    isOAuth: false,
    documentationUrl: 'https://www.thumbtack.com/pro-center',
    popularityScore: 70,
    requiredFields: [
      {
        name: 'webhookUrl',
        label: 'Webhook URL',
        type: 'text',
        placeholder: 'Your Thumbtack webhook URL',
        required: true,
      },
    ],
  },

  yelp_leads: {
    id: 'yelp_leads',
    name: 'Yelp Leads',
    description: 'Receive and manage customer inquiries from Yelp',
    category: 'messaging',
    icon: 'fab fa-yelp',
    color: '#D32323',
    isOAuth: false,
    documentationUrl: 'https://www.yelp.com/developers/documentation',
    popularityScore: 75,
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Yelp Fusion API key',
        required: true,
      },
    ],
  },

  // ============================================================================
  // MAGIC INTEGRATION (newo.ai Magic Browser Automation)
  // ============================================================================

  newo_magic: {
    id: 'newo_magic',
    name: 'Magic',
    description: 'AI-powered browser automation that lets your voice agent interact with any web-based booking system — even without a public API.',
    category: 'magic',
    icon: 'fas fa-wand-magic-sparkles',
    color: '#7C3AED',
    isOAuth: false,
    documentationUrl: 'https://docs.newo.ai/docs/agent-creator-app-api',
    setupGuideUrl: 'https://newo.ai/hey-developer-create-ai-automations-10x-faster-and-smarter/',
    popularityScore: 97,
    requiredFields: [
      {
        name: 'selectedSystem',
        label: 'Booking System',
        type: 'select',
        placeholder: 'Select your booking system',
        required: true,
        helpText: 'Choose the software your salon uses. This auto-fills the login URL and form selectors.',
        options: [
          { value: 'vagaro', label: 'Vagaro' },
          { value: 'mindbody', label: 'Mindbody' },
          { value: 'square_appointments', label: 'Square Appointments' },
          { value: 'acuity', label: 'Acuity Scheduling' },
          { value: 'booksy', label: 'Booksy' },
          { value: 'fresha', label: 'Fresha' },
          { value: 'boulevard', label: 'Boulevard' },
          { value: 'zenoti', label: 'Zenoti' },
          { value: 'glossgenius', label: 'GlossGenius' },
          { value: 'styleseat', label: 'StyleSeat' },
          { value: 'timely', label: 'Timely' },
          { value: 'generic', label: 'Other / Generic' },
        ],
      },
      {
        name: 'apiEndpointUrl',
        label: 'Login URL',
        type: 'url',
        placeholder: 'https://app.yoursystem.com/login',
        required: false,
        helpText: 'Auto-filled when you select a system above. Edit if your account uses a custom URL.',
      },
      {
        name: 'apiKey',
        label: 'Username / Email',
        type: 'text',
        placeholder: 'your@email.com',
        required: true,
        helpText: 'The login email or username for your booking system',
      },
      {
        name: 'clientSecret',
        label: 'Password',
        type: 'password',
        placeholder: '••••••••',
        required: true,
        helpText: 'Stored encrypted. Used to log in to your booking system automatically.',
      },
    ],
  },

  // ============================================================================
  // CUSTOM INTEGRATION
  // ============================================================================

  custom: {
    id: 'custom',
    name: 'Custom Integration',
    description: 'Build your own integration with webhooks (n8n, Zapier, Make.com, etc.)',
    category: 'custom',
    icon: 'fas fa-code',
    color: '#6B7280',
    isOAuth: false,
    documentationUrl: 'https://docs.retellai.com/api-references/create-custom-llm',
    setupGuideUrl: 'https://docs.retellai.com/get-started/custom-integration',
    popularityScore: 100,
    requiredFields: [
      {
        name: 'name',
        label: 'Integration Name',
        type: 'text',
        placeholder: 'My Custom Integration',
        required: true,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Describe what this integration does...',
        required: false,
      },
      {
        name: 'apiEndpointUrl',
        label: 'Webhook URL',
        type: 'text',
        placeholder: 'https://your-webhook-url.com/endpoint',
        required: true,
        helpText: 'The URL that will receive webhook calls from your voice agent',
      },
      {
        name: 'method',
        label: 'HTTP Method',
        type: 'select',
        required: true,
        defaultValue: 'POST',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'PATCH', label: 'PATCH' },
          { value: 'DELETE', label: 'DELETE' },
        ],
      },
      {
        name: 'webhookSecret',
        label: 'Webhook Secret (Optional)',
        type: 'password',
        placeholder: 'For signature verification',
        required: false,
        helpText: 'Optional secret for HMAC signature verification',
      },
    ],
  },
};

// Helper function to get all templates as array
export const getAllTemplates = (): IntegrationTemplate[] => {
  return Object.values(INTEGRATION_TEMPLATES).sort(
    (a, b) => (b.popularityScore || 0) - (a.popularityScore || 0)
  );
};

// Helper function to get templates by category
export const getTemplatesByCategory = (
  category: IntegrationCategory
): IntegrationTemplate[] => {
  if (category === 'all') {
    return getAllTemplates();
  }
  return getAllTemplates().filter((t) => t.category === category);
};

// Helper function to get template by ID
export const getTemplateById = (id: string): IntegrationTemplate | undefined => {
  return INTEGRATION_TEMPLATES[id];
};

// Category labels for UI
export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  all: 'All Integrations',
  calendar: 'Appointment Setting',
  crm: 'CRM',
  pos: 'Point of Sale',
  messaging: 'Messaging',
  callactions: 'Call Actions',
  custom: 'Custom Integration',
  magic: 'Magic',
};

// Category icons for UI
export const CATEGORY_ICONS: Record<IntegrationCategory, string> = {
  all: 'fas fa-th',
  calendar: 'fas fa-calendar',
  crm: 'fas fa-users',
  pos: 'fas fa-shopping-cart',
  messaging: 'fas fa-comment',
  callactions: 'fas fa-phone',
  custom: 'fas fa-plug',
  magic: 'fas fa-wand-magic-sparkles',
};
