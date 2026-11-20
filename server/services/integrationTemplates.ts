/**
 * Integration Templates Library
 *
 * Defines pre-configured templates for all supported third-party integrations.
 * Each template includes authentication requirements, payload schemas, and function mappings.
 */

export interface IntegrationTemplate {
  id: string;
  name: string;
  category: 'Appointment Setting' | 'Text Messaging' | 'CRM' | 'Food Order' | 'Custom Integration' | 'Magic';
  type: 'POS' | 'Reservation' | 'Calendar' | 'Delivery' | 'CRM' | 'Messaging' | 'Custom' | 'Magic';
  provider: string;
  description: string;

  // Authentication
  authMethod: 'api_key' | 'oauth2' | 'token' | 'webhook' | 'basic' | 'jwt';
  requiredCredentials: Array<{
    key: string;
    label: string;
    type: 'password' | 'text' | 'url';
    required: boolean;
    placeholder?: string;
    helpText?: string;
  }>;

  // API Configuration
  baseUrl?: string;
  apiVersion?: string;

  // Function Mappings
  functionMappings: {
    [retellFunction: string]: {
      endpoint: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      payloadTemplate?: any;
      responseMapping?: string[];
    };
  };

  // Default configuration
  defaultConfig?: {
    headers?: Record<string, string>;
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      backoff: 'linear' | 'exponential';
    };
  };
}

export const INTEGRATION_TEMPLATES: Record<string, IntegrationTemplate> = {

  // ============================================================================
  // APPOINTMENT SETTING INTEGRATIONS
  // ============================================================================

  'cal_com': {
    id: 'cal_com',
    name: 'Cal.com',
    category: 'Appointment Setting',
    type: 'Calendar',
    provider: 'Cal.com',
    description: 'Open-source scheduling platform for seamless appointment booking',
    authMethod: 'api_key',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your Cal.com API key',
        helpText: 'Find this in your Cal.com Settings > Security > API Keys'
      }
    ],
    baseUrl: 'https://api.cal.com/v1',
    functionMappings: {
      'create_reservation': {
        endpoint: '/bookings',
        method: 'POST',
        payloadTemplate: {
          eventTypeId: '{{event_type_id}}',
          start: '{{start_time}}',
          responses: {
            name: '{{customer_name}}',
            email: '{{customer_email}}',
            phone: '{{customer_phone}}'
          },
          timeZone: '{{timezone}}',
          language: 'en',
          metadata: {
            source: 'voice_ai'
          }
        },
        responseMapping: ['uid', 'status', 'startTime', 'endTime']
      },
      'check_availability': {
        endpoint: '/availability',
        method: 'GET',
        responseMapping: ['busy', 'dateRanges']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  },

  'calendly': {
    id: 'calendly',
    name: 'Calendly',
    category: 'Appointment Setting',
    type: 'Calendar',
    provider: 'Calendly',
    description: 'Simplified scheduling software for faster meetings and appointments',
    authMethod: 'token',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        placeholder: 'Your Calendly PAT',
        helpText: 'Generate at https://calendly.com/integrations/api_webhooks'
      }
    ],
    baseUrl: 'https://api.calendly.com',
    functionMappings: {
      'create_reservation': {
        endpoint: '/scheduled_events',
        method: 'POST',
        payloadTemplate: {
          event: '{{event_uri}}',
          invitees: [{
            email: '{{customer_email}}',
            name: '{{customer_name}}'
          }],
          start_time: '{{start_time}}',
          end_time: '{{end_time}}'
        },
        responseMapping: ['uri', 'status', 'start_time', 'end_time']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  },

  'google_calendar': {
    id: 'google_calendar',
    name: 'Google Calendar',
    category: 'Appointment Setting',
    type: 'Calendar',
    provider: 'Google',
    description: 'Organize your schedule and stay on track with Google\'s calendar service',
    authMethod: 'oauth2',
    requiredCredentials: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'OAuth access token',
        helpText: 'Obtained via OAuth flow'
      },
      {
        key: 'refreshToken',
        label: 'Refresh Token',
        type: 'password',
        required: true,
        placeholder: 'OAuth refresh token'
      },
      {
        key: 'calendarId',
        label: 'Calendar ID',
        type: 'text',
        required: true,
        placeholder: 'primary or specific calendar ID'
      }
    ],
    baseUrl: 'https://www.googleapis.com/calendar/v3',
    functionMappings: {
      'create_reservation': {
        endpoint: '/calendars/{{calendar_id}}/events',
        method: 'POST',
        payloadTemplate: {
          summary: '{{event_title}}',
          description: '{{event_description}}',
          start: {
            dateTime: '{{start_time}}',
            timeZone: '{{timezone}}'
          },
          end: {
            dateTime: '{{end_time}}',
            timeZone: '{{timezone}}'
          },
          attendees: [{
            email: '{{customer_email}}',
            displayName: '{{customer_name}}'
          }],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 1440 },
              { method: 'popup', minutes: 30 }
            ]
          }
        },
        responseMapping: ['id', 'status', 'htmlLink', 'start', 'end']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  },

  'housecall_pro': {
    id: 'housecall_pro',
    name: 'Housecall Pro',
    category: 'Appointment Setting',
    type: 'Calendar',
    provider: 'Housecall Pro',
    description: 'Complete home service business management and scheduling platform',
    authMethod: 'api_key',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your Housecall Pro API key'
      },
      {
        key: 'applicationId',
        label: 'Company ID',
        type: 'text',
        required: true,
        placeholder: 'Your company identifier'
      }
    ],
    baseUrl: 'https://api.housecallpro.com/v1',
    functionMappings: {
      'create_reservation': {
        endpoint: '/jobs',
        method: 'POST',
        payloadTemplate: {
          customer: {
            first_name: '{{customer_first_name}}',
            last_name: '{{customer_last_name}}',
            email: '{{customer_email}}',
            mobile_number: '{{customer_phone}}'
          },
          schedule: {
            start: '{{start_time}}',
            end: '{{end_time}}'
          },
          description: '{{service_description}}',
          tags: ['voice_ai']
        },
        responseMapping: ['id', 'status', 'schedule']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  },

  'meevo': {
    id: 'meevo',
    name: 'Meevo',
    category: 'Appointment Setting',
    type: 'Calendar',
    provider: 'Meevo',
    description: 'Salon and spa management software with booking capabilities',
    authMethod: 'token',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'Meevo Token',
        type: 'password',
        required: true,
        placeholder: 'Your Meevo API token'
      },
      {
        key: 'locationId',
        label: 'Location ID',
        type: 'text',
        required: true,
        placeholder: 'Salon/spa location ID'
      }
    ],
    baseUrl: 'https://api.meevo.com/v2',
    functionMappings: {
      'create_reservation': {
        endpoint: '/appointments',
        method: 'POST',
        payloadTemplate: {
          locationId: '{{location_id}}',
          clientId: '{{client_id}}',
          employeeId: '{{employee_id}}',
          serviceId: '{{service_id}}',
          startDateTime: '{{start_time}}',
          duration: '{{duration}}',
          notes: '{{notes}}'
        },
        responseMapping: ['appointmentId', 'status', 'startDateTime']
      }
    },
    defaultConfig: {
      timeout: 15000
    }
  },

  'boulevard': {
    id: 'boulevard',
    name: 'Boulevard',
    category: 'Appointment Setting',
    type: 'Calendar',
    provider: 'Boulevard',
    description: 'All-in-one platform for beauty and wellness appointment management',
    authMethod: 'api_key',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your Boulevard API key'
      },
      {
        key: 'locationId',
        label: 'Business ID',
        type: 'text',
        required: true,
        placeholder: 'Your business location ID'
      }
    ],
    baseUrl: 'https://api.boulevard.io/v1',
    functionMappings: {
      'create_reservation': {
        endpoint: '/appointments',
        method: 'POST',
        payloadTemplate: {
          locationId: '{{location_id}}',
          client: {
            firstName: '{{customer_first_name}}',
            lastName: '{{customer_last_name}}',
            email: '{{customer_email}}',
            phone: '{{customer_phone}}'
          },
          services: '{{services}}',
          startAt: '{{start_time}}',
          notes: '{{notes}}'
        },
        responseMapping: ['id', 'status', 'startAt', 'endAt']
      }
    },
    defaultConfig: {
      timeout: 15000
    }
  },

  'servicetitan': {
    id: 'servicetitan',
    name: 'ServiceTitan',
    category: 'Appointment Setting',
    type: 'Calendar',
    provider: 'ServiceTitan',
    description: 'Complete software solution for home service companies',
    authMethod: 'oauth2',
    requiredCredentials: [
      {
        key: 'applicationId',
        label: 'Client ID',
        type: 'text',
        required: true,
        placeholder: 'OAuth client ID'
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'OAuth client secret'
      },
      {
        key: 'locationId',
        label: 'Tenant ID',
        type: 'text',
        required: true,
        placeholder: 'Your tenant identifier'
      }
    ],
    baseUrl: 'https://api.servicetitan.io',
    functionMappings: {
      'create_reservation': {
        endpoint: '/jpm/v2/jobs',
        method: 'POST',
        payloadTemplate: {
          customerId: '{{customer_id}}',
          locationId: '{{location_id}}',
          jobTypeId: '{{job_type_id}}',
          start: '{{start_time}}',
          summary: '{{job_summary}}',
          businessUnitId: '{{business_unit_id}}'
        },
        responseMapping: ['id', 'jobNumber', 'status']
      }
    },
    defaultConfig: {
      timeout: 20000
    }
  },

  'servicetrade': {
    id: 'servicetrade',
    name: 'ServiceTrade',
    category: 'Appointment Setting',
    type: 'Calendar',
    provider: 'ServiceTrade',
    description: 'Field service management platform for commercial contractors',
    authMethod: 'api_key',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your ServiceTrade API key'
      }
    ],
    baseUrl: 'https://api.servicetrade.com/api',
    functionMappings: {
      'create_reservation': {
        endpoint: '/appointments',
        method: 'POST',
        payloadTemplate: {
          customer: {
            name: '{{customer_name}}',
            email: '{{customer_email}}',
            phone: '{{customer_phone}}'
          },
          scheduledStart: '{{start_time}}',
          scheduledEnd: '{{end_time}}',
          description: '{{description}}',
          priority: '{{priority}}'
        },
        responseMapping: ['id', 'status', 'number']
      }
    },
    defaultConfig: {
      timeout: 15000
    }
  },

  // ============================================================================
  // TEXT MESSAGING INTEGRATIONS
  // ============================================================================

  'telegram': {
    id: 'telegram',
    name: 'Telegram',
    category: 'Text Messaging',
    type: 'Messaging',
    provider: 'Telegram',
    description: 'Secure messaging platform for business communication',
    authMethod: 'token',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'Bot Token',
        type: 'password',
        required: true,
        placeholder: 'Your Telegram bot token',
        helpText: 'Obtain from @BotFather on Telegram'
      },
      {
        key: 'locationId',
        label: 'Chat ID',
        type: 'text',
        required: false,
        placeholder: 'Optional: default chat ID'
      }
    ],
    baseUrl: 'https://api.telegram.org/bot{{bot_token}}',
    functionMappings: {
      'send_message': {
        endpoint: '/sendMessage',
        method: 'POST',
        payloadTemplate: {
          chat_id: '{{chat_id}}',
          text: '{{message_text}}',
          parse_mode: 'HTML'
        },
        responseMapping: ['message_id', 'date', 'chat']
      }
    },
    defaultConfig: {
      timeout: 10000
    }
  },

  'thumbtack': {
    id: 'thumbtack',
    name: 'Thumbtack',
    category: 'Text Messaging',
    type: 'Messaging',
    provider: 'Thumbtack',
    description: 'Professional services marketplace with messaging capabilities',
    authMethod: 'api_key',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your Thumbtack API key'
      }
    ],
    baseUrl: 'https://api.thumbtack.com/v2',
    functionMappings: {
      'send_message': {
        endpoint: '/messages',
        method: 'POST',
        payloadTemplate: {
          to: '{{recipient_id}}',
          body: '{{message_text}}',
          message_type: 'text'
        },
        responseMapping: ['message_id', 'status']
      }
    },
    defaultConfig: {
      timeout: 10000
    }
  },

  'yelp_leads': {
    id: 'yelp_leads',
    name: 'Yelp Leads',
    category: 'Text Messaging',
    type: 'Messaging',
    provider: 'Yelp',
    description: 'Lead management and messaging system from Yelp',
    authMethod: 'api_key',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your Yelp API key'
      },
      {
        key: 'locationId',
        label: 'Business ID',
        type: 'text',
        required: true,
        placeholder: 'Your Yelp business ID'
      }
    ],
    baseUrl: 'https://api.yelp.com/v3',
    functionMappings: {
      'send_message': {
        endpoint: '/businesses/{{business_id}}/leads/{{lead_id}}/messages',
        method: 'POST',
        payloadTemplate: {
          message: '{{message_text}}',
          recipient_type: 'customer'
        },
        responseMapping: ['message_id', 'sent_at']
      }
    },
    defaultConfig: {
      timeout: 10000
    }
  },

  // ============================================================================
  // CRM INTEGRATIONS
  // ============================================================================

  'contact_memory': {
    id: 'contact_memory',
    name: 'Contacts',
    category: 'CRM',
    type: 'CRM',
    provider: 'Internal',
    description: 'View and manage customer profiles, conversation history, and contact information from your AI receptionist calls',
    authMethod: 'token',
    requiredCredentials: [],
    baseUrl: '/api',
    functionMappings: {
      'get_customer_memory': {
        endpoint: '/contacts/memory/:phone_number',
        method: 'GET',
        responseMapping: ['memories', 'profile', 'callHistory']
      },
      'update_customer_memory': {
        endpoint: '/contacts/memory/:phone_number',
        method: 'POST',
        payloadTemplate: {
          content: '{{memory_content}}',
          title: '{{title}}'
        },
        responseMapping: ['success', 'memoryId']
      },
      'get_customer_profile': {
        endpoint: '/contacts/profile/:phone_number',
        method: 'GET',
        responseMapping: ['profile', 'stats', 'lastInteraction']
      },
      'update_customer_profile': {
        endpoint: '/contacts/profile/:phone_number',
        method: 'PATCH',
        payloadTemplate: {
          customerName: '{{customer_name}}',
          email: '{{email}}',
          notes: '{{notes}}',
          tags: '{{tags}}'
        },
        responseMapping: ['success', 'profile']
      }
    },
    defaultConfig: {
      timeout: 10000
    }
  },

  'zoho': {
    id: 'zoho',
    name: 'ZOHO CRM',
    category: 'CRM',
    type: 'CRM',
    provider: 'ZOHO',
    description: 'Comprehensive CRM platform for sales and customer management',
    authMethod: 'oauth2',
    requiredCredentials: [
      {
        key: 'applicationId',
        label: 'Client ID',
        type: 'text',
        required: true,
        placeholder: 'OAuth client ID'
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'OAuth client secret'
      },
      {
        key: 'apiKey',
        label: 'Refresh Token',
        type: 'password',
        required: true,
        placeholder: 'OAuth refresh token'
      }
    ],
    baseUrl: 'https://www.zohoapis.com/crm/v2',
    functionMappings: {
      'create_contact': {
        endpoint: '/Contacts',
        method: 'POST',
        payloadTemplate: {
          data: [{
            First_Name: '{{first_name}}',
            Last_Name: '{{last_name}}',
            Email: '{{email}}',
            Phone: '{{phone}}',
            Description: '{{description}}'
          }]
        },
        responseMapping: ['data.id', 'data.status']
      },
      'create_lead': {
        endpoint: '/Leads',
        method: 'POST',
        payloadTemplate: {
          data: [{
            Last_Name: '{{last_name}}',
            Company: '{{company}}',
            Email: '{{email}}',
            Phone: '{{phone}}',
            Lead_Source: 'Voice AI'
          }]
        },
        responseMapping: ['data.id', 'data.status']
      }
    },
    defaultConfig: {
      timeout: 15000
    }
  },

  'acculynx': {
    id: 'acculynx',
    name: 'Acculynx',
    category: 'CRM',
    type: 'CRM',
    provider: 'Acculynx',
    description: 'CRM and project management software for roofing contractors',
    authMethod: 'api_key',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your Acculynx API key'
      },
      {
        key: 'locationId',
        label: 'Company ID',
        type: 'text',
        required: true,
        placeholder: 'Your company identifier'
      }
    ],
    baseUrl: 'https://api.acculynx.com/api/v1',
    functionMappings: {
      'create_lead': {
        endpoint: '/leads',
        method: 'POST',
        payloadTemplate: {
          firstName: '{{first_name}}',
          lastName: '{{last_name}}',
          email: '{{email}}',
          phone: '{{phone}}',
          address: '{{address}}',
          source: 'Voice AI'
        },
        responseMapping: ['leadId', 'status']
      }
    },
    defaultConfig: {
      timeout: 15000
    }
  },

  'bitrix': {
    id: 'bitrix',
    name: 'Bitrix24',
    category: 'CRM',
    type: 'CRM',
    provider: 'Bitrix24',
    description: 'Social collaboration and CRM platform for businesses',
    authMethod: 'webhook',
    requiredCredentials: [
      {
        key: 'webhookUrl',
        label: 'Webhook URL',
        type: 'url',
        required: true,
        placeholder: 'Your Bitrix24 webhook URL',
        helpText: 'Example: https://yourcompany.bitrix24.com/rest/123/abc123/'
      }
    ],
    baseUrl: '{{webhook_url}}',
    functionMappings: {
      'create_contact': {
        endpoint: 'crm.contact.add',
        method: 'POST',
        payloadTemplate: {
          fields: {
            NAME: '{{first_name}}',
            LAST_NAME: '{{last_name}}',
            EMAIL: [{ VALUE: '{{email}}', VALUE_TYPE: 'WORK' }],
            PHONE: [{ VALUE: '{{phone}}', VALUE_TYPE: 'WORK' }],
            SOURCE_ID: 'CALLBACK'
          }
        },
        responseMapping: ['result', 'time']
      },
      'create_lead': {
        endpoint: 'crm.lead.add',
        method: 'POST',
        payloadTemplate: {
          fields: {
            TITLE: '{{title}}',
            NAME: '{{first_name}}',
            LAST_NAME: '{{last_name}}',
            EMAIL: [{ VALUE: '{{email}}', VALUE_TYPE: 'WORK' }],
            PHONE: [{ VALUE: '{{phone}}', VALUE_TYPE: 'WORK' }],
            SOURCE_ID: 'CALLBACK'
          }
        },
        responseMapping: ['result', 'time']
      }
    },
    defaultConfig: {
      timeout: 15000
    }
  },

  'gohighlevel': {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    category: 'CRM',
    type: 'CRM',
    provider: 'GoHighLevel',
    description: 'All-in-one marketing and CRM platform for agencies',
    authMethod: 'api_key',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your GoHighLevel API key'
      },
      {
        key: 'locationId',
        label: 'Location ID',
        type: 'text',
        required: true,
        placeholder: 'Your sub-account location ID'
      }
    ],
    baseUrl: 'https://rest.gohighlevel.com/v1',
    functionMappings: {
      'create_contact': {
        endpoint: '/contacts',
        method: 'POST',
        payloadTemplate: {
          firstName: '{{first_name}}',
          lastName: '{{last_name}}',
          email: '{{email}}',
          phone: '{{phone}}',
          locationId: '{{location_id}}',
          source: 'voice_ai',
          tags: ['voice_call']
        },
        responseMapping: ['contact.id', 'contact.locationId']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  },

  'hubspot': {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    type: 'CRM',
    provider: 'HubSpot',
    description: 'Leading inbound marketing, sales, and customer service platform',
    authMethod: 'token',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'Your HubSpot private app token',
        helpText: 'Create at Settings > Integrations > Private Apps'
      }
    ],
    baseUrl: 'https://api.hubapi.com',
    functionMappings: {
      'create_contact': {
        endpoint: '/crm/v3/objects/contacts',
        method: 'POST',
        payloadTemplate: {
          properties: {
            firstname: '{{first_name}}',
            lastname: '{{last_name}}',
            email: '{{email}}',
            phone: '{{phone}}',
            lifecyclestage: 'lead',
            hs_lead_status: 'NEW'
          }
        },
        responseMapping: ['id', 'properties', 'createdAt']
      },
      'create_deal': {
        endpoint: '/crm/v3/objects/deals',
        method: 'POST',
        payloadTemplate: {
          properties: {
            dealname: '{{deal_name}}',
            dealstage: '{{deal_stage}}',
            amount: '{{amount}}',
            closedate: '{{close_date}}'
          }
        },
        responseMapping: ['id', 'properties']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  },

  'keycrm': {
    id: 'keycrm',
    name: 'KeyCRM',
    category: 'CRM',
    type: 'CRM',
    provider: 'KeyCRM',
    description: 'Customer relationship management system for sales teams',
    authMethod: 'api_key',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your KeyCRM API key'
      }
    ],
    baseUrl: 'https://openapi.keycrm.app/v1',
    functionMappings: {
      'create_lead': {
        endpoint: '/leads',
        method: 'POST',
        payloadTemplate: {
          source_id: 1,
          buyer: {
            full_name: '{{customer_name}}',
            phone: '{{customer_phone}}',
            email: '{{customer_email}}'
          },
          manager_comment: '{{notes}}'
        },
        responseMapping: ['id', 'status']
      }
    },
    defaultConfig: {
      timeout: 15000
    }
  },

  'pipedrive': {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'CRM',
    type: 'CRM',
    provider: 'Pipedrive',
    description: 'Sales-focused CRM that helps teams close more deals',
    authMethod: 'token',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: 'Your Pipedrive API token',
        helpText: 'Find at Settings > Personal preferences > API'
      }
    ],
    baseUrl: 'https://api.pipedrive.com/v1',
    functionMappings: {
      'create_person': {
        endpoint: '/persons',
        method: 'POST',
        payloadTemplate: {
          name: '{{full_name}}',
          email: '{{email}}',
          phone: '{{phone}}',
          visible_to: '3'
        },
        responseMapping: ['data.id', 'data.name']
      },
      'create_deal': {
        endpoint: '/deals',
        method: 'POST',
        payloadTemplate: {
          title: '{{deal_title}}',
          value: '{{deal_value}}',
          currency: 'USD',
          person_id: '{{person_id}}',
          status: 'open'
        },
        responseMapping: ['data.id', 'data.title', 'data.status']
      }
    },
    defaultConfig: {
      timeout: 15000
    }
  },

  'salesforce': {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    type: 'CRM',
    provider: 'Salesforce',
    description: 'World\'s leading customer relationship management platform',
    authMethod: 'oauth2',
    requiredCredentials: [
      {
        key: 'applicationId',
        label: 'Consumer Key',
        type: 'text',
        required: true,
        placeholder: 'Connected app consumer key'
      },
      {
        key: 'clientSecret',
        label: 'Consumer Secret',
        type: 'password',
        required: true,
        placeholder: 'Connected app consumer secret'
      },
      {
        key: 'apiKey',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'OAuth access token'
      },
      {
        key: 'apiEndpointUrl',
        label: 'Instance URL',
        type: 'url',
        required: true,
        placeholder: 'https://your-instance.salesforce.com',
        helpText: 'Your Salesforce instance URL'
      }
    ],
    baseUrl: '{{instance_url}}/services/data/v58.0',
    functionMappings: {
      'create_contact': {
        endpoint: '/sobjects/Contact',
        method: 'POST',
        payloadTemplate: {
          FirstName: '{{first_name}}',
          LastName: '{{last_name}}',
          Email: '{{email}}',
          Phone: '{{phone}}',
          LeadSource: 'Phone Inquiry'
        },
        responseMapping: ['id', 'success', 'errors']
      },
      'create_lead': {
        endpoint: '/sobjects/Lead',
        method: 'POST',
        payloadTemplate: {
          FirstName: '{{first_name}}',
          LastName: '{{last_name}}',
          Company: '{{company}}',
          Email: '{{email}}',
          Phone: '{{phone}}',
          Status: 'Open - Not Contacted',
          LeadSource: 'Phone Inquiry'
        },
        responseMapping: ['id', 'success', 'errors']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 20000
    }
  },

  // ============================================================================
  // FOOD ORDER / POS INTEGRATIONS
  // ============================================================================

  'square_pos': {
    id: 'square_pos',
    name: 'Square POS',
    category: 'Food Order',
    type: 'POS',
    provider: 'Square',
    description: 'Payment processing and point-of-sale system for restaurants',
    authMethod: 'token',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'Your Square access token',
        helpText: 'Get from Square Developer Dashboard'
      },
      {
        key: 'locationId',
        label: 'Location ID',
        type: 'text',
        required: true,
        placeholder: 'Square location ID',
        helpText: 'Find in Square Dashboard > Locations'
      }
    ],
    baseUrl: 'https://connect.squareup.com/v2',
    apiVersion: '2024-06-04',
    functionMappings: {
      'place_order': {
        endpoint: '/orders',
        method: 'POST',
        payloadTemplate: {
          idempotency_key: '{{idempotency_key}}',
          order: {
            location_id: '{{location_id}}',
            line_items: '{{line_items}}',
            customer_id: '{{customer_id}}',
            metadata: {
              source: 'voice_ai',
              phone_number: '{{customer_phone}}'
            }
          }
        },
        responseMapping: ['order.id', 'order.state', 'order.total_money', 'order.created_at']
      },
      'check_order_status': {
        endpoint: '/orders/{{order_id}}',
        method: 'GET',
        responseMapping: ['order.id', 'order.state', 'order.updated_at']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2024-06-04'
      },
      timeout: 15000,
      retryPolicy: {
        maxRetries: 3,
        backoff: 'exponential'
      }
    }
  },

  'clover_pos': {
    id: 'clover_pos',
    name: 'Clover POS',
    category: 'Food Order',
    type: 'POS',
    provider: 'Clover',
    description: 'Point-of-sale and business management system',
    authMethod: 'token',
    requiredCredentials: [
      {
        key: 'apiKey',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: 'Your Clover API token'
      },
      {
        key: 'locationId',
        label: 'Merchant ID',
        type: 'text',
        required: true,
        placeholder: '13-character merchant ID',
        helpText: 'Find in Clover Dashboard > Setup > API Tokens'
      }
    ],
    baseUrl: 'https://api.clover.com/v3',
    functionMappings: {
      'place_order': {
        endpoint: '/merchants/{{merchant_id}}/orders',
        method: 'POST',
        payloadTemplate: {
          state: 'open',
          orderType: {
            id: '{{order_type_id}}'
          },
          manualTransaction: false,
          groupLineItems: true,
          testMode: false,
          note: 'Voice AI Order - {{customer_phone}}'
        },
        responseMapping: ['id', 'state', 'total', 'createdTime']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000,
      retryPolicy: {
        maxRetries: 3,
        backoff: 'exponential'
      }
    }
  },

  // ============================================================================
  // MAGIC INTEGRATION (newo.ai Magic Browser Automation)
  // ============================================================================

  'newo_magic': {
    id: 'newo_magic',
    name: 'Magic',
    category: 'Custom Integration',
    type: 'Custom',
    provider: 'newo.ai',
    description: 'AI-powered browser automation — lets your voice agent interact with any web UI using newo.ai Magic',
    authMethod: 'token',
    requiredCredentials: [
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Your newo.ai CLIENT_SECRET',
        helpText: 'Get your CLIENT_SECRET from your newo.ai dashboard'
      },
      {
        key: 'applicationId',
        label: 'Actor ID (Optional)',
        type: 'text',
        required: false,
        placeholder: 'Pre-created newo.ai actor ID'
      }
    ],
    baseUrl: 'https://chat.newo.ai/api/internal/v1/talking-head',
    functionMappings: {
      'trigger_magic_action': {
        endpoint: '/send-actor-event',
        method: 'POST',
        payloadTemplate: {
          actor_id: '{{actor_id}}',
          event: {
            type: '{{action_type}}',
            arguments: '{{action_arguments}}'
          }
        },
        responseMapping: ['status', 'actor_id', 'event_id', 'result']
      },
      'create_magic_actor': {
        endpoint: '/create-actor',
        method: 'POST',
        payloadTemplate: {
          name: '{{actor_name}}',
          arguments: '{{arguments}}'
        },
        responseMapping: ['actor_id', 'status', 'created_at']
      },
      'get_magic_settings': {
        endpoint: '/chat-settings',
        method: 'GET',
        responseMapping: ['connector_id', 'settings', 'capabilities']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      retryPolicy: {
        maxRetries: 2,
        backoff: 'exponential'
      }
    }
  },

  // ============================================================================
  // CUSTOM INTEGRATION
  // ============================================================================

  'custom': {
    id: 'custom',
    name: 'Custom Integration',
    category: 'Custom Integration',
    type: 'Custom',
    provider: 'Custom',
    description: 'Connect with any system using n8n or Zapier webhooks',
    authMethod: 'webhook',
    requiredCredentials: [
      {
        key: 'name',
        label: 'Integration Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., My Custom Integration'
      },
      {
        key: 'webhookUrl',
        label: 'n8n/Zapier Webhook URL',
        type: 'url',
        required: true,
        placeholder: 'Your webhook URL',
        helpText: 'The webhook URL from n8n or Zapier'
      }
    ],
    functionMappings: {
      'custom_action': {
        endpoint: '{{webhook_url}}',
        method: 'POST',
        payloadTemplate: {
          action: '{{action}}',
          data: '{{data}}',
          timestamp: '{{timestamp}}'
        },
        responseMapping: ['status', 'message']
      }
    },
    defaultConfig: {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  }
};

/**
 * Get integration template by ID
 */
export function getIntegrationTemplate(templateId: string): IntegrationTemplate | null {
  return INTEGRATION_TEMPLATES[templateId] || null;
}

/**
 * Get all integration templates
 */
export function getAllIntegrationTemplates(): IntegrationTemplate[] {
  return Object.values(INTEGRATION_TEMPLATES);
}

/**
 * Get integration templates by category
 */
export function getIntegrationTemplatesByCategory(category: string): IntegrationTemplate[] {
  return Object.values(INTEGRATION_TEMPLATES).filter(
    template => template.category === category
  );
}

/**
 * Get integration templates by type
 */
export function getIntegrationTemplatesByType(type: string): IntegrationTemplate[] {
  return Object.values(INTEGRATION_TEMPLATES).filter(
    template => template.type === type
  );
}
