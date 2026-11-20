import axios from 'axios';
import FormData from 'form-data';
import Retell from 'retell-sdk';
import { VoiceAgentProvider, VoiceAgentConfig, VoiceAgent, CallSession, PhoneConnectionResult, ConversationFlow, BusinessInfo, KnowledgeBase } from '../interfaces/VoiceAgentProvider';
import { INDUSTRY_CONFIGS, getCallTypesForIndustry, type Industry } from '../../shared/industryConfig';
import { getNodeTemplateForIndustry, type ConversationFlowTemplate } from '../../shared/conversationFlowTemplates';
import { RETELL_FUNCTIONS_BY_INDUSTRY } from '../../shared/retellFunctionsConfig';
import { resolveBaseUrl } from '../utils/baseUrlResolver';

const RECEPTIONIST_NAMES = [
  'Aria', 'Bella', 'Chloe', 'Dana', 'Elena', 'Fiona', 'Grace', 'Hana',
  'Iris', 'Jade', 'Kira', 'Luna', 'Maya', 'Nova', 'Olivia', 'Piper',
  'Quinn', 'Rosa', 'Stella', 'Tara', 'Uma', 'Vera', 'Willow', 'Xena',
  'Yara', 'Zoe', 'Alexis', 'Brooke', 'Clara', 'Diana', 'Eva', 'Faith',
  'Gemma', 'Holly', 'Isla', 'Jenna', 'Kylie', 'Leah', 'Mia', 'Nora'
];

function generateReceptionistName(): string {
  return RECEPTIONIST_NAMES[Math.floor(Math.random() * RECEPTIONIST_NAMES.length)];
}

interface RetellAgentResponse {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  response_engine: {
    type: string;
    llm_id?: string;
  };
  language: string;
  voice_temperature: number;
  voice_speed: number;
  enable_backchannel: boolean;
  backchannel_frequency: number;
  backchannel_words: string[];
  reminder_trigger_ms: number;
  reminder_max_count: number;
  ambient_sound: string;
  ambient_sound_volume: number;
  responsiveness: number;
  interruption_threshold: number;
  enable_transcription_formatting: boolean;
  opt_out_sensitive_data_storage: boolean;
  webhook_url?: string;
  boosted_keywords?: string[];
  format_text: boolean;
  pronunciation_dictionary?: any[];
  normalize_for_speech: boolean;
  end_call_after_silence_ms: number;
  enable_voicemail_detection: boolean;
  voicemail_detection_timeout_ms: number;
  voicemail_message?: string;
  last_modification_timestamp: number;
  llm_websocket_url?: string;
}

interface RetellPhoneNumberResponse {
  phone_number_id: string;
  phone_number: string;
  nickname?: string;
  agent_id?: string;
  inbound_agent_id?: string;
  outbound_agent_id?: string;
  last_modification_timestamp: number;
}

export class RetellProvider implements VoiceAgentProvider {
  readonly providerName = 'retell';
  private apiKey: string;
  private storage: any; // Will be injected
  private client: Retell;

  constructor(storage?: any) {
    if (!process.env.RETELL_API_KEY) {
      throw new Error('RETELL_API_KEY environment variable is required');
    }
    this.storage = storage;

    this.apiKey = process.env.RETELL_API_KEY;
    this.client = new Retell({ apiKey: this.apiKey });
  }

  // Helper method to format phone numbers to E.164 format
  private formatPhoneToE164(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If already has + prefix, return as-is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // If it's a 10-digit US number, add +1 prefix
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // If it's an 11-digit number starting with 1, add + prefix
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    
    // Otherwise, assume it needs +1 prefix (US default)
    return `+1${cleaned}`;
  }

  // Helper method to safely log axios errors without exposing credentials
  private sanitizeAndLogAxiosError(error: any, context: string): void {
    console.error(`❌ ${context}:`);
    console.error('Error Type:', typeof error);
    console.error('Error Message:', error.message);

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Status Text:', error.response.statusText);
      console.error('Response Data:', error.response.data);

      // Safely redact sensitive headers (case-insensitive)
      if (error.config?.headers) {
        const safeHeaders: any = {};
        Object.keys(error.config.headers).forEach(key => {
          if (key.toLowerCase().match(/(authorization|api[-_]key|token)/)) {
            safeHeaders[key] = `Bearer ${this.apiKey.substring(0, 6)}...`;
          } else {
            safeHeaders[key] = error.config.headers[key];
          }
        });

        console.error('Request Config:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: safeHeaders
        });

        // Only log payload in debug mode
        if (process.env.DEBUG_HTTP === 'true') {
          console.error('Payload Sent:', error.config?.data);
        }
      }
    } else if (error.request) {
      console.error('Network Error (no response received)');
      console.error('Request URL:', error.config?.url || 'unknown');
      console.error('Request Method:', error.config?.method || 'unknown');
    } else {
      console.error('Non-Axios Error Stack:', error.stack);
    }
  }

  async createKnowledgeBase(business: BusinessInfo, files?: any[]): Promise<KnowledgeBase> {
    try {
      console.log(`📚 Creating comprehensive knowledge base for ${business.businessName}`);

      // Require real business name - don't create knowledge base with placeholder
      if (!business.businessName || business.businessName.trim() === '' || business.businessName === 'Your Business') {
        throw new Error('Cannot create knowledge base without valid business name');
      }
      
      const businessName = business.businessName;
      const shortName = businessName.length > 30 ? businessName.substring(0, 30) + "..." : businessName;
      const knowledgeBaseName = `${shortName} KB`;

      // Build knowledge base payload using FormData (multipart/form-data format required by Retell AI)
      const formData = new FormData();

      // Add knowledge base name (required, max 40 characters)
      formData.append('knowledge_base_name', knowledgeBaseName);

      console.log(`📡 Calling Retell API: POST https://api.retellai.com/create-knowledge-base`);
      console.log('🚀 Knowledge base payload structure:');
      console.log(`  - Name: ${knowledgeBaseName}`);

      // Add website URL if available (Retell will crawl all pages automatically)
      // Otherwise fall back to text-based knowledge base content
      if (business.website && business.website.trim().length > 0) {
        // Basic URL validation
        const urlPattern = /^https?:\/\/.+/i;
        if (urlPattern.test(business.website.trim())) {
          formData.append('knowledge_base_urls', JSON.stringify([business.website.trim()]));
          formData.append('enable_auto_refresh', 'true');
          console.log(`🌐 Adding website URL for crawling: ${business.website} (all pages will be crawled, auto-refresh enabled)`);
        } else {
          console.warn(`⚠️ Invalid website URL format: ${business.website}, falling back to text content`);
        }
      }

      // Always add business text as a knowledge base source (supplements URL or serves as fallback)
      const businessText = this.buildComprehensiveKnowledgeBaseData(business);
      if (businessText && businessText.trim().length > 0) {
        const sanitizedTitle = (business.businessName || 'Business Info')
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w\s-]/g, '')
          .trim()
          .substring(0, 100);
        formData.append('knowledge_base_texts', JSON.stringify([{ text: businessText, title: sanitizedTitle }]));
        console.log(`📝 Adding business info as text content (${businessText.length} chars)`);
      } else if (!business.website || business.website.trim().length === 0) {
        throw new Error('No website URL or business text available for knowledge base creation');
      }

      // Only add files if we have actual file data (not null/empty)
      // Files must be actual file streams, not null values
      if (files && Array.isArray(files) && files.length > 0 && files[0] !== null) {
        for (const file of files) {
          formData.append('knowledge_base_files', file);
        }
        console.log(`📄 Including ${files.length} uploaded file(s)`);
      }

      console.log('🔄 About to make axios POST request with multipart/form-data...');
      // PRIVACY: Do not log API keys for compliance
      console.log('🔑 API Key: [CONFIGURED]');

      const response = await axios.post('https://api.retellai.com/create-knowledge-base', formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        }
      });

      const kbResponse = response.data;
      console.log(`✅ Successfully created comprehensive knowledge base: ${kbResponse.knowledge_base_id}`);
      console.log(`📊 Status: ${kbResponse.status}`);

      return {
        id: kbResponse.knowledge_base_id,
        name: kbResponse.knowledge_base_name,
        status: kbResponse.status
      };

    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Failed to create comprehensive knowledge base');
      const errorMessage = error.response?.data?.message || error.response?.statusText || error.message || 'Unknown error';

      // Log detailed error for debugging knowledge base API issues
      console.error('❌ Knowledge base creation failed with details:');
      console.error(`  - Error: ${errorMessage}`);
      if (error.response?.status) {
        console.error(`  - Status Code: ${error.response.status}`);
      }

      // Return null to indicate KB creation failed, allowing fallback to general prompt injection
      console.warn(`⚠️ Knowledge base creation failed. Agent will inject business info into general prompt as fallback.`);
      return null as any;
    }
  }

  async updateKnowledgeBase(knowledgeBaseId: string, business: BusinessInfo): Promise<KnowledgeBase> {
    try {
      console.log(`📚 Updating knowledge base ${knowledgeBaseId} for ${business.businessName}`);

      // Require valid business data
      if (!business.businessName || business.businessName === 'Your Business') {
        throw new Error('Cannot update knowledge base without valid business name');
      }

      const businessName = business.businessName;
      const shortName = businessName.length > 30 ? businessName.substring(0, 30) + "..." : businessName;
      const knowledgeBaseName = `${shortName} KB`;

      // Use the raw user input from Memory tab - preserve exactly as entered
      // Priority: businessInfo > rawBusinessInfo > description (these contain exact user input)
      const rawUserInput = business.businessInfo || business.rawBusinessInfo || business.description || '';
      
      if (!rawUserInput || rawUserInput.trim().length === 0) {
        throw new Error('Cannot update knowledge base without business information');
      }

      // Only do minimal sanitization to prevent API errors, but preserve user's exact text
      const cleanText = rawUserInput
        .replace(/\s+/g, ' ') // Normalize excessive whitespace only
        .trim();

      // Log the payload size for debugging
      console.log(`📏 Knowledge base data size: ${cleanText.length} characters`);

      // First, get the existing knowledge base to find text sources
      console.log(`🔍 Fetching existing knowledge base ${knowledgeBaseId}...`);
      const kbDetails = await this.getKnowledgeBase(knowledgeBaseId);
      
      // Delete existing text sources (not URLs or files)
      if (kbDetails.knowledge_base_sources) {
        for (const source of kbDetails.knowledge_base_sources) {
          if (source.type === 'text') {
            try {
              console.log(`🗑️ Deleting old text source: ${source.source_id}`);
              await axios.delete(`https://api.retellai.com/delete-knowledge-base-source/${knowledgeBaseId}/source/${source.source_id}`, {
                headers: {
                  'Authorization': `Bearer ${this.apiKey}`
                }
              });
            } catch (deleteError) {
              console.warn(`⚠️ Failed to delete source ${source.source_id}, continuing...`);
            }
          }
        }
        
        // Wait a moment for deletions to propagate
        if (kbDetails.knowledge_base_sources.some(s => s.type === 'text')) {
          console.log('⏳ Waiting for deletions to propagate...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Sanitize title to prevent API errors - normalize Unicode and special chars
      const sanitizeTitle = (title: string): string => {
        return title
          .normalize('NFKD') // Normalize Unicode (converts en-dash – to regular dash -)
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
          .replace(/[–—]/g, '-') // Replace en-dash and em-dash with regular hyphen
          .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
          .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
          .substring(0, 100) // Limit to 100 chars
          .trim();
      };

      const cleanTitle = sanitizeTitle(businessName);

      console.log(`📡 Calling Retell API: POST https://api.retellai.com/add-knowledge-base-sources/${knowledgeBaseId}`);
      console.log(`📦 Text length: ${cleanText.length} chars`);
      console.log(`📄 Title: "${cleanTitle}"`);
      console.log(`📄 Text preview:`, cleanText.substring(0, 300));

      // Use multipart/form-data as specified in Retell AI API documentation
      const formData = new FormData();
      
      // Add knowledge base texts as JSON string in the form data
      formData.append('knowledge_base_texts', JSON.stringify([
        {
          text: cleanText,
          title: cleanTitle
        }
      ]));

      const response = await axios.post(`https://api.retellai.com/add-knowledge-base-sources/${knowledgeBaseId}`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders() // This sets Content-Type to multipart/form-data with boundary
        },
        timeout: 30000, // 30 second timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log(`✅ Successfully updated knowledge base: ${knowledgeBaseId}`);

      return {
        id: knowledgeBaseId,
        name: knowledgeBaseName,
        status: 'ready'
      };

    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Failed to update knowledge base');
      
      // Log additional debugging info
      if (error.response?.status === 500) {
        console.error('⚠️ Retell AI returned 500 error. This may be a temporary issue with their API.');
        console.error('⚠️ Knowledge base ID:', knowledgeBaseId);
        console.error('⚠️ Business name:', business.businessName);
      }
      
      const errorMessage = error.response?.data?.message || error.response?.statusText || error.message || 'Unknown error';
      throw new Error(`Failed to update knowledge base: ${errorMessage}`);
    }
  }

  /**
   * Build comprehensive knowledge base data using all business information
   * Returns flattened text string as required by Retell AI API
   */
  private buildComprehensiveKnowledgeBaseData(business: BusinessInfo): string {
    // Convert phone number to digit-by-digit format for voice clarity
    const formatPhoneForSpeech = (phone: string | number | null | undefined): string => {
      if (!phone) return 'Phone available upon request';
      const phoneStr = String(phone);
      const digits = phoneStr.replace(/\D/g, '');
      if (!digits) return 'Phone available upon request';
      const digitWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
      return digits.split('').map(d => digitWords[parseInt(d)] || d).join(' ');
    };

    // Format menu as readable text string
    const formatMenuAsText = (menuData: any): string => {
      if (!menuData) return '';
      if (menuData.sections && Array.isArray(menuData.sections)) {
        return menuData.sections.map((section: any) => {
          const items = (section.items || []).map((item: any) => {
            const name = item.name || item.item || item;
            const price = item.price ? ` ($${item.price})` : '';
            const desc = item.description ? ` — ${item.description}` : '';
            return `  • ${name}${price}${desc}`;
          }).join('\n');
          return `${section.name || 'Items'}:\n${items}`;
        }).join('\n\n');
      }
      if (Array.isArray(menuData)) {
        return menuData.map((item: any) => {
          const name = item.name || item.item || item;
          const price = item.price ? ` ($${item.price})` : '';
          const desc = item.description ? ` — ${item.description}` : '';
          return `  • ${name}${price}${desc}`;
        }).join('\n');
      }
      if (typeof menuData === 'string') return menuData;
      return '';
    };

    // Format services list
    const formatServices = (services: any): string => {
      if (!services) return '';
      if (Array.isArray(services)) return services.join(', ');
      if (typeof services === 'object') {
        const enabled = Object.entries(services)
          .filter(([_, on]) => on)
          .map(([svc]) => svc.replace(/([A-Z])/g, ' $1').trim().toLowerCase());
        return enabled.join(', ');
      }
      return String(services);
    };

    // Format operating hours into per-day lines
    const formatHours = (hours: any): string => {
      if (!hours) return 'Please call for current hours';
      if (typeof hours === 'string') return hours;
      if (hours.weeklyHours && Array.isArray(hours.weeklyHours)) {
        return hours.weeklyHours.map((d: any) =>
          d.isClosed ? `  ${d.day}: Closed` : `  ${d.day}: ${d.open}`
        ).join('\n');
      }
      if (typeof hours === 'object') {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const lines = days.map(day => {
          const d = hours[day];
          if (!d) return '';
          const label = day.charAt(0).toUpperCase() + day.slice(1);
          if (d.closed) return `  ${label}: Closed`;
          return `  ${label}: ${d.open} to ${d.close}`;
        }).filter(Boolean);
        return lines.join('\n');
      }
      return 'Please call for current hours';
    };

    const name = business.businessName || (business as any).name || 'Our Business';
    const phone = business.phoneNumber || (business as any).phone || '';
    const website = business.website || (business as any).businessUrls?.[0] || '';
    const address = business.physicalAddress || (business as any).businessAddress || (business as any).address || '';
    const email = (business as any).email || '';
    const hoursRaw = (business as any).operatingHours || (business as any).businessHours || '';
    const description = (business as any).description || (business as any).businessDescription || '';
    const services = formatServices((business as any).services);
    const menuText = (business as any).menuText || formatMenuAsText((business as any).menuItems || (business as any).menu);
    const faqRaw: any = (business as any).faq;
    const faqText = Array.isArray(faqRaw)
      ? faqRaw.map((item: any) => `  Q: ${item.q || item.question}\n  A: ${item.a || item.answer}`).join('\n')
      : (typeof faqRaw === 'string' ? faqRaw : '');
    const promotions = (business as any).promotionsCoupons || (business as any).promotions || (business as any).specials || '';
    const reservationPolicy = (business as any).reservationPolicy || '';
    const orderingPolicy = (business as any).orderingPolicy || '';
    const deliveryPlatforms = (business as any).deliveryPlatforms || '';
    const deliveryPolicy = (business as any).policies?.deliveryPolicy || (business as any).deliveryPolicy || '';
    const paymentPolicy = (business as any).policies?.paymentPolicy || (business as any).paymentPolicy || '';
    const cancellationPolicy = (business as any).policies?.cancellationPolicy || (business as any).cancellationPolicy || '';
    const catering = (business as any).cateringMenu || (business as any).catering || '';
    const keyStaff = (business as any).keyStaffContacts || (business as any).keyStaff || '';
    const socialMedia = (business as any).socialMedia || '';
    const hoursFormatted = formatHours(hoursRaw);

    // Build sections in priority order (most important → least important)
    const sections: string[] = [];

    // ── 1. BUSINESS OVERVIEW ──────────────────────────────────────────────────
    const overviewLines = [`Business Name: ${name}`, `Industry: ${business.industry || 'General'}`];
    if (description) overviewLines.push(`About: ${description}`);
    sections.push(`=== BUSINESS OVERVIEW ===\n${overviewLines.join('\n')}`);

    // ── 2. CONTACT & LOCATION ─────────────────────────────────────────────────
    const contactLines: string[] = [];
    if (address) contactLines.push(`Address: ${address}`);
    if (phone) contactLines.push(`Phone: ${formatPhoneForSpeech(phone)}`);
    if (website) contactLines.push(`Website: ${website}`);
    if (email) contactLines.push(`Email: ${email}`);
    if (socialMedia) contactLines.push(`Social Media: ${socialMedia}`);
    if (contactLines.length > 0) {
      sections.push(`=== CONTACT & LOCATION ===\n${contactLines.join('\n')}`);
    }

    // ── 3. HOURS OF OPERATION ─────────────────────────────────────────────────
    sections.push(`=== HOURS OF OPERATION ===\n${hoursFormatted}`);

    // ── 4. SERVICES ───────────────────────────────────────────────────────────
    if (services) {
      sections.push(`=== SERVICES OFFERED ===\n${services}`);
    }

    // ── 5. POLICIES ───────────────────────────────────────────────────────────
    const policyLines: string[] = [];
    if (reservationPolicy) policyLines.push(`Reservations: ${reservationPolicy}`);
    if (orderingPolicy) policyLines.push(`Ordering: ${orderingPolicy}`);
    if (deliveryPolicy) policyLines.push(`Delivery: ${deliveryPolicy}`);
    if (deliveryPlatforms) policyLines.push(`Delivery Platforms: ${deliveryPlatforms}`);
    if (paymentPolicy) policyLines.push(`Payment: ${paymentPolicy}`);
    if (cancellationPolicy) policyLines.push(`Cancellations: ${cancellationPolicy}`);
    if (policyLines.length > 0) {
      sections.push(`=== POLICIES ===\n${policyLines.join('\n')}`);
    }

    // ── 6. MENU / OFFERINGS ───────────────────────────────────────────────────
    if (menuText) {
      sections.push(`=== MENU & OFFERINGS ===\n${menuText}`);
    }

    // ── 7. CATERING ───────────────────────────────────────────────────────────
    if (catering) {
      sections.push(`=== CATERING ===\n${catering}`);
    }

    // ── 8. PROMOTIONS & SPECIALS ──────────────────────────────────────────────
    if (promotions) {
      sections.push(`=== PROMOTIONS & SPECIALS ===\n${promotions}`);
    }

    // ── 9. FREQUENTLY ASKED QUESTIONS ────────────────────────────────────────
    if (faqText) {
      sections.push(`=== FREQUENTLY ASKED QUESTIONS ===\n${faqText}`);
    }

    // ── 10. STAFF ─────────────────────────────────────────────────────────────
    if (keyStaff) {
      sections.push(`=== KEY STAFF ===\n${keyStaff}`);
    }

    // ── 11. AFTER-HOURS ───────────────────────────────────────────────────────
    sections.push(`=== AFTER-HOURS MESSAGE ===\nHello, thank you for calling ${name}. We are currently closed. Please call back during our business hours or leave a message and we will return your call promptly.`);

    return sections.join('\n\n');
  }


  async getKnowledgeBase(knowledgeBaseId: string): Promise<any> {
    try {
      console.log(`🔍 Fetching knowledge base details: ${knowledgeBaseId}`);

      const response = await axios.get(`https://api.retellai.com/get-knowledge-base/${knowledgeBaseId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const kbResponse = response.data;
      console.log(`📊 Knowledge base ${knowledgeBaseId} has ${kbResponse.knowledge_base_sources?.length || 0} sources`);

      return kbResponse;

    } catch (error: any) {
      console.error(`❌ Failed to get knowledge base ${knowledgeBaseId}:`, error.response?.data || error.message);
      throw new Error(`Failed to get knowledge base: ${error.response?.data?.message || error.message}`);
    }
  }

  async getKnowledgeBaseStatus(knowledgeBaseId: string): Promise<KnowledgeBase> {
    try {
      console.log(`🔍 Checking knowledge base status: ${knowledgeBaseId}`);

      const response = await axios.get(`https://api.retellai.com/get-knowledge-base/${knowledgeBaseId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const kbResponse = response.data;
      console.log(`📊 Knowledge base ${knowledgeBaseId} status: ${kbResponse.status}`);

      return {
        id: kbResponse.knowledge_base_id,
        name: kbResponse.knowledge_base_name,
        status: kbResponse.status
      };

    } catch (error: any) {
      console.error(`❌ Failed to get knowledge base status for ${knowledgeBaseId}:`, error.response?.data || error.message);
      throw new Error(`Failed to get knowledge base status: ${error.response?.data?.message || error.message}`);
    }
  }

  async listAllKnowledgeBases(): Promise<any[]> {
    try {
      console.log(`📋 Listing all knowledge bases from Retell AI`);

      const response = await axios.get('https://api.retellai.com/list-knowledge-bases', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const knowledgeBases = response.data;
      console.log(`📊 Found ${knowledgeBases.length} knowledge base(s) in Retell AI`);

      return knowledgeBases;

    } catch (error: any) {
      console.error(`❌ Failed to list knowledge bases:`, error.response?.data || error.message);
      throw new Error(`Failed to list knowledge bases: ${error.response?.data?.message || error.message}`);
    }
  }

  async deleteKnowledgeBaseSource(knowledgeBaseId: string, sourceId: string): Promise<any> {
    try {
      console.log(`🗑️ Deleting source ${sourceId} from knowledge base ${knowledgeBaseId}`);

      const response = await axios.delete(`https://api.retellai.com/delete-knowledge-base-source/${knowledgeBaseId}/source/${sourceId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      console.log(`✅ Successfully deleted source ${sourceId} from Retell AI`);
      return response.data;

    } catch (error: any) {
      console.error(`❌ Failed to delete source ${sourceId}:`, error.response?.data || error.message);
      throw new Error(`Failed to delete source: ${error.response?.data?.message || error.message}`);
    }
  }

  // Helper methods for formatting knowledge base sections

  private formatMenuSection(business: BusinessInfo): string | null {
    const sections = [];

    // Main menu items (following attached format exactly)
    if (business.menuItems) {
      sections.push(`Menu Items:\n${business.menuItems}`);
    } else if (business.menu && Array.isArray(business.menu) && business.menu.length > 0) {
      // Fallback to legacy menu format
      const menuItems = business.menu.map((item: any) => 
        `${item.item || item.name} - $${item.price}${item.description ? ': ' + item.description : ''}`
      ).join('\n');
      sections.push(`Menu Items:\n${menuItems}`);
    }

    // Additional menu categories (following attached format)
    if (business.desserts) {
      sections.push(`\nDesserts:\n${business.desserts}`);
    }

    if (business.specialties) {
      sections.push(`\nSpecialties:\n${business.specialties}`);
    }

    if (business.otherMenuItems) {
      sections.push(`\nOther Options:\n${business.otherMenuItems}`);
    }

    return sections.length > 0 ? sections.join('\n') : null;
  }

  private formatFAQSection(business: BusinessInfo): string {
    const standardFaqs = [
      `Q: What are your business hours?\nA: ${business.businessHours || 'Contact us for current hours'}`,
      `Q: Do you accept reservations?\nA: ${business.reservationPolicy || 'Contact us for reservation information'}`,
      `Q: Do you offer delivery or takeout?\nA: ${business.deliveryAndPickup || business.orderingPolicy || 'Contact us for delivery and pickup options'}`,
      `Q: What type of food do you serve?\nA: ${business.menuItems || 'We offer a variety of delicious dishes. Please ask about our current menu.'}`,
      `Q: Do you accommodate dietary restrictions?\nA: ${business.dietaryAccommodations || 'Yes, please let us know about any dietary restrictions and we will do our best to accommodate you.'}`,
      `Q: How can I contact your business?\nA: Phone: ${business.phoneNumber || 'Contact us for phone number'}, Website: ${business.website || business.businessUrls?.[0] || 'Contact us for more information'}`
    ];

    // Add custom FAQs if available - handle both string and array formats
    if (business.faq) {
      let customFaqs: string[] = [];
      
      if (Array.isArray(business.faq) && business.faq.length > 0) {
        customFaqs = business.faq.map((item: any) => `Q: ${item.q || item.question}\nA: ${item.a || item.answer}`);
      } else if (typeof business.faq === 'string' && business.faq.trim().length > 0) {
        // Convert string to basic FAQ format
        const faqQuestions = business.faq.split(',').map(item => item.trim()).filter(item => item.length > 0);
        customFaqs = faqQuestions.map(question => `Q: ${question}\nA: Please contact us for details.`);
      }
      
      if (customFaqs.length > 0) {
        return `Frequently Asked Questions:\n\n${standardFaqs.concat(customFaqs).join('\n\n')}`;
      }
    }

    return `Frequently Asked Questions:\n\n${standardFaqs.join('\n\n')}`;
  }

  private formatReviewsSection(business: BusinessInfo): string {
    // Following attached format - using standard review template since rating fields aren't in BusinessInfo
    return `Customer Reviews:\nRating: Not available/5 based on Not available reviews.\n\nHighlights from reviews:\nWe strive to provide excellent service and quality food for all our guests.`;
  }

  private formatAdditionalInfo(business: BusinessInfo): string | null {
    const additionalDetails = [];

    // Use businessDescription as the main additional details
    if (business.businessDescription) {
      additionalDetails.push(`Additional Details: ${business.businessDescription}`);
    }

    return additionalDetails.length > 0 ? additionalDetails.join('\n\n') : null;
  }

  /**
   * Create a minimal conversation flow with just one node
   * This is simpler than the full conversation flow but still uses the conversation-flow engine
   */
  async createMinimalConversationFlow(businessName: string, knowledgeBase: string): Promise<ConversationFlow> {
    try {
      console.log(`🗣️ Creating minimal conversation flow for: ${businessName}`);

      const minimalFlowPayload = {
        start_node_id: "main",
        start_speaker: "agent",
        global_prompt: `You are a professional AI receptionist for ${businessName}. Answer questions, take orders, make reservations, and help customers naturally based on the business information provided below.\n\n${knowledgeBase}`,
        model_choice: {
          type: "cascading",
          model: "gpt-5-mini"
        },
        model_temperature: 0.7,
        nodes: [
          {
            id: "main",
            type: "conversation",
            instruction: {
              type: "prompt",
              text: "Handle all customer interactions naturally. Greet them warmly, answer their questions about the business, take orders or reservations as needed, and provide excellent customer service."
            },
            edges: [] // No edges - just one continuous conversation
          }
        ]
      };

      const response = await axios.post('https://api.retellai.com/create-conversation-flow', minimalFlowPayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const flowResponse = response.data;
      console.log(`✅ Successfully created minimal conversation flow: ${flowResponse.conversation_flow_id}`);

      return {
        id: flowResponse.conversation_flow_id,
        name: `${businessName} Minimal Flow`
      };

    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Failed to create minimal conversation flow');
      throw new Error(`Failed to create minimal conversation flow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Convert custom integrations from UI to Retell AI tool format
   */
  private async convertCustomIntegrationsToTools(userId: string): Promise<any[]> {
    if (!this.storage) {
      console.warn('⚠️ Storage not available, cannot fetch custom integrations');
      return [];
    }

    try {
      const integrationSettings = await this.storage.getIntegrationSettings(userId);
      const customIntegrations = integrationSettings?.customIntegrations || [];

      console.log(`🔧 Converting ${customIntegrations.length} custom integrations to Retell tools`);

      const tools = customIntegrations.map((integration: any) => {
        const bridgeUrl = `${resolveBaseUrl()}/api/integrations/bridge/${integration.id}?userId=${userId}`;

        const toolName = integration.name.toLowerCase().replace(/\s+/g, '_');
        return {
          tool_id: toolName,
          type: "custom",
          name: toolName,
          description: integration.description || `Integration with ${integration.name}`,
          url: bridgeUrl,
          method: "POST",
          speak_during_execution: true,
          speak_after_execution: true,
          execution_message_description: `Processing your request with ${integration.name}...`,
          parameters: {
            type: "object",
            properties: {
              data: {
                type: "object",
                description: "Integration data payload"
              }
            }
          }
        };
      });

      return tools;
    } catch (error) {
      console.error('❌ Error converting custom integrations to tools:', error);
      return [];
    }
  }

  /**
   * Build conversation flow nodes dynamically based on industry template
   */
  private buildNodesFromTemplate(template: ConversationFlowTemplate, business: BusinessInfo, receptionistName?: string): any[] {
    const nodes: any[] = [];
    const businessName = business.businessName || business.name || 'us';
    const industry = template.industry;
    const agentName = receptionistName || generateReceptionistName();

    // ── NODE 1: GREETING ──────────────────────────────────────────────────────
    // These node IDs are built as universal shared nodes — never duplicate them from templates.
    const SHARED_NODE_IDS = new Set(['walk_in_inquiry', 'gift_card', 'pricing_inquiry']);

    // Only build service edges for industry-specific nodes (not universal shared nodes).
    const serviceEdges = template.serviceNodes
      .filter(sn => !SHARED_NODE_IDS.has(sn.id))
      .map(sn => ({
        id: `edge_to_${sn.id}`,
        transition_condition: {
          type: "prompt",
          prompt: sn.description
        },
        destination_node_id: sn.id
      }));

    nodes.push({
      id: "greeting",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `BEFORE SPEAKING: Silently call Lookup. Do not say anything until it returns.

Your name is ${agentName}. Always introduce yourself as ${agentName} and always mention this is a recorded line.

After Lookup returns, use ALL available memory to craft a personalized greeting:

RETURNING CUSTOMER — FULL MEMORY (name + usual service + preferred staff):
→ "Thank you for calling ${businessName}. This is ${agentName} calling on a recorded line. Welcome back, [name]! Should we get you down for your usual [preferred_service] with [preferred_technician]?"
→ If they had an upcoming event last time they mentioned → add naturally: "How did [event] go, by the way?"
→ Wait for their response — they may confirm the usual or request something different.

RETURNING CUSTOMER — PARTIAL MEMORY (name only, or name + service):
→ "Thank you for calling ${businessName}. This is ${agentName} calling on a recorded line. Welcome back, [name]! How may I help you today?"
→ If preferred_service is known: "Are you calling to book your [preferred_service] again?"

NEW CUSTOMER (no record found):
→ "Thank you for calling ${businessName}. This is ${agentName} calling on a recorded line. How may I help you today?"

IMPORTANT MEMORY RULES:
- If Lookup returns ANY data → use it. Skip collecting that info again during the booking flow.
- If a personal note exists (upcoming_event, personal_notes) → weave it in once, naturally and warmly.
- Never announce that you "looked them up" or "checked their file" — just know it.
- If memory shows allergies_or_sensitivities or accessibility_needs → silently note for the booking and ensure the right accommodations are applied.

Listen carefully for intent and route immediately once clear.`
      },
      edges: [
        ...serviceEdges,
        {
          id: "edge_to_walk_in",
          transition_condition: {
            type: "prompt",
            prompt: "Customer asks about walk-in availability, current wait time, whether they can come in right now today, or if walk-ins are accepted"
          },
          destination_node_id: "walk_in_inquiry"
        },
        {
          id: "edge_to_gift_card",
          transition_condition: {
            type: "prompt",
            prompt: "Customer asks about gift cards: purchasing, redeeming, checking balance, or gifting services to someone else"
          },
          destination_node_id: "gift_card"
        },
        {
          id: "edge_to_pricing",
          transition_condition: {
            type: "prompt",
            prompt: "Customer asks specifically about price, cost, rate, or how much a particular service, item, or treatment costs"
          },
          destination_node_id: "pricing_inquiry"
        },
        {
          id: "edge_to_cancellation",
          transition_condition: {
            type: "prompt",
            prompt: "Customer wants to cancel, reschedule, or modify an existing booking, order, appointment, or reservation"
          },
          destination_node_id: "cancellation_modification"
        },
        {
          id: "edge_to_status",
          transition_condition: {
            type: "prompt",
            prompt: "Customer wants to check the status of an existing order, reservation, appointment, or delivery"
          },
          destination_node_id: "status_check"
        },
        {
          id: "edge_to_info",
          transition_condition: {
            type: "prompt",
            prompt: "Customer asks about hours, location, address, directions, available services, menu, staff, policies, or any general information about the business"
          },
          destination_node_id: "info_inquiry"
        },
        {
          id: "edge_to_complaint",
          transition_condition: {
            type: "prompt",
            prompt: "Customer has a complaint, is unhappy, frustrated, or has a problem with a previous order or service"
          },
          destination_node_id: "complaint_handling"
        },
        {
          id: "edge_to_human",
          transition_condition: {
            type: "prompt",
            prompt: "Customer explicitly asks to speak with a person, manager, owner, or human representative"
          },
          destination_node_id: "transfer_human"
        },
        {
          id: "edge_to_after_hours",
          transition_condition: {
            type: "prompt",
            prompt: "Business is currently closed or customer is calling outside of operating hours"
          },
          destination_node_id: "after_hours"
        }
      ]
    });

    // ── NODE 2: SERVICE-SPECIFIC NODES ────────────────────────────────────────
    // Skip any node whose ID matches a universal shared node (already built below).
    for (const serviceNode of template.serviceNodes.filter(sn => !SHARED_NODE_IDS.has(sn.id))) {
      const instruction = this.buildServiceNodeInstruction(serviceNode, businessName, industry);

      if (serviceNode.type === 'transfer_call') {
        nodes.push({
          id: serviceNode.id,
          type: "conversation",
          instruction: { type: "prompt", text: instruction },
          edges: []
        });
      } else {
        nodes.push({
          id: serviceNode.id,
          type: "conversation",
          instruction: { type: "prompt", text: instruction },
          edges: [
            {
              id: `edge_${serviceNode.id}_confirmed`,
              transition_condition: {
                type: "prompt",
                prompt: `Customer confirmed the summary, the action function was called successfully, and the SMS phone number question has been asked`
              },
              destination_node_id: "send_confirmation"
            },
            {
              id: `edge_${serviceNode.id}_unavailable`,
              transition_condition: {
                type: "prompt",
                prompt: "Requested time, item, or service is unavailable and the customer needs alternatives"
              },
              destination_node_id: "alternatives_offer"
            },
            {
              id: `edge_${serviceNode.id}_modify`,
              transition_condition: {
                type: "prompt",
                prompt: "Customer wants to cancel or modify this request before it is finalized"
              },
              destination_node_id: "cancellation_modification"
            },
            {
              id: `edge_${serviceNode.id}_human`,
              transition_condition: {
                type: "prompt",
                prompt: "Customer requests a human agent or the situation is too complex to handle"
              },
              destination_node_id: "transfer_human"
            }
          ]
        });
      }
    }

    // ── NODE 3: INFORMATION INQUIRY ───────────────────────────────────────────
    nodes.push({
      id: "info_inquiry",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `Answer the customer's question using the available business information.

Use these variables to answer precisely:
- Hours: {{business_hours}}
- Address: {{address}}
- Phone: {{phone_number}}
- Website: {{website}}
- Services: {{services}}
- Menu/offerings: {{menu}}
- Popular items: {{popular_items}}
- Dietary options: {{dietary_options}}
- Promotions & specials: {{promotions}}
- Parking / accessibility: {{allergies_accessibility}}
- FAQ: {{faq}}

Be direct and concise. If you don't know the answer, say "Let me connect you with a team member who can help."
After answering, ask: "Is there anything else I can help you with?"`
      },
      edges: [
        {
          id: "edge_info_book",
          transition_condition: {
            type: "prompt",
            prompt: "Customer wants to make a booking, reservation, or order after receiving the information"
          },
          destination_node_id: "greeting"
        },
        {
          id: "edge_info_human",
          transition_condition: {
            type: "prompt",
            prompt: "Question cannot be answered with available information and customer needs a human"
          },
          destination_node_id: "transfer_human"
        },
        {
          id: "edge_info_done",
          transition_condition: {
            type: "prompt",
            prompt: "Question fully answered and customer has nothing further to ask"
          },
          destination_node_id: "anything_else"
        }
      ]
    });

    // ── NODE 4: CANCELLATION / MODIFICATION ───────────────────────────────────
    nodes.push({
      id: "cancellation_modification",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `Help the customer cancel or modify an existing booking, order, reservation, or appointment.

Step 1: Clarify intent — "Are you looking to cancel or make a change to an existing [booking/order/reservation]?"
Step 2: Collect identifying details: customer name, original date/time, and what change they need.
Step 3: Review relevant policy with the customer ({{reservation_policy}}, {{refund_policy}}) and inform them of any fees or conditions.
Step 4: For a CANCELLATION: confirm you are cancelling the right booking, then call the appropriate cancel function, then call Alert silently to notify the team.
Step 5: For a MODIFICATION: collect the new details, check availability if a time change is involved (check_availability), call the reschedule/update function, then call Alert silently.
Step 6: Confirm the action clearly: "I've [cancelled / updated] your [booking] for [details]. You'll receive a text shortly."

Be empathetic — customers may be stressed when changing plans. Do not argue about policies; state them calmly and clearly.`
      },
      edges: [
        {
          id: "edge_cancel_done",
          transition_condition: {
            type: "prompt",
            prompt: "Cancellation or modification completed and customer accepted the outcome"
          },
          destination_node_id: "send_confirmation"
        },
        {
          id: "edge_cancel_dispute",
          transition_condition: {
            type: "prompt",
            prompt: "Customer disputes the cancellation policy or demands a manager or exception"
          },
          destination_node_id: "transfer_human"
        },
        {
          id: "edge_cancel_more",
          transition_condition: {
            type: "prompt",
            prompt: "Cancellation done and customer has an additional unrelated request"
          },
          destination_node_id: "anything_else"
        }
      ]
    });

    // ── NODE 5: STATUS CHECK ──────────────────────────────────────────────────
    nodes.push({
      id: "status_check",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `Help the customer check the status of an existing order, reservation, appointment, or delivery.

Step 1: Ask what they are checking on: "Are you checking on an order, reservation, appointment, or delivery?"
Step 2: Collect their name and either a reference number or the original date/time.
Step 3: Look up or call check_order_status to retrieve current status.
Step 4: Give a clear and specific update: "Your [reservation/order] for [date/time] is [confirmed / being prepared / on the way / completed]."
Step 5: If there is a problem or delay: be transparent and empathetic. Offer to escalate if needed.
Step 6: Offer to send an SMS update if it would be helpful.

If you cannot retrieve status information, say: "Let me connect you with a team member who can give you a real-time update."`
      },
      edges: [
        {
          id: "edge_status_ok",
          transition_condition: {
            type: "prompt",
            prompt: "Status provided and customer is satisfied with the answer"
          },
          destination_node_id: "anything_else"
        },
        {
          id: "edge_status_problem",
          transition_condition: {
            type: "prompt",
            prompt: "There is an issue with the order or the customer needs immediate human help"
          },
          destination_node_id: "transfer_human"
        }
      ]
    });

    // ── NODE 6: ALTERNATIVES OFFER ────────────────────────────────────────────
    nodes.push({
      id: "alternatives_offer",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `The customer's first choice is unavailable. Help them find a suitable alternative.

Step 1: Acknowledge empathetically: "I'm sorry, [that time / item / service] isn't available."
Step 2: Proactively suggest 2–3 concrete alternatives:
   - Time-based bookings → nearby open times
   - Unavailable menu item → similar items or today's specials from {{menu}}
   - Fully booked period → earliest next available slot or a waitlist
Step 3: Let the customer choose. If none work, offer to take a message or a callback.
Step 4: Once they accept an alternative, return to the appropriate service node to complete the booking.`
      },
      edges: [
        {
          id: "edge_alt_accepted",
          transition_condition: {
            type: "prompt",
            prompt: "Customer accepted an alternative and wants to proceed with the booking or order"
          },
          destination_node_id: "greeting"
        },
        {
          id: "edge_alt_waitlist",
          transition_condition: {
            type: "prompt",
            prompt: "Customer wants to join a waitlist or be called back when availability opens"
          },
          destination_node_id: "send_confirmation"
        },
        {
          id: "edge_alt_declined",
          transition_condition: {
            type: "prompt",
            prompt: "Customer declines all alternatives and wants to end the call or speak with someone"
          },
          destination_node_id: "anything_else"
        }
      ]
    });

    // ── NODE 7: COMPLAINT HANDLING ────────────────────────────────────────────
    nodes.push({
      id: "complaint_handling",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `Handle the customer's complaint with empathy and professionalism.

Step 1: Let them speak fully before responding. Do NOT interrupt or be defensive.
Step 2: Acknowledge sincerely: "I'm really sorry to hear that. That's not the experience we want for you."
Step 3: Gather the specifics: what happened, when, any order or booking reference.
Step 4: Decide the appropriate response:
   - Minor issue (wrong item, slight delay, small inconvenience) → offer a solution (replacement, discount on next visit, priority service).
   - Serious issue (safety, health, major failure, repeated problem) → "I want to make sure this is handled properly. Let me connect you with a manager right away."
Step 5: ALWAYS call Add Note to log the complaint — do this silently, without mentioning it.
Step 6: Thank them: "Thank you for letting us know — your feedback genuinely helps us improve."

Never make promises you cannot keep. Focus on acknowledgment and the right level of escalation.`
      },
      edges: [
        {
          id: "edge_complaint_resolved",
          transition_condition: {
            type: "prompt",
            prompt: "Customer is satisfied with the resolution or acknowledgment"
          },
          destination_node_id: "anything_else"
        },
        {
          id: "edge_complaint_escalate",
          transition_condition: {
            type: "prompt",
            prompt: "Customer is not satisfied and demands to speak with a manager or human agent"
          },
          destination_node_id: "transfer_human"
        }
      ]
    });

    // ── NODE 8: SEND CONFIRMATION ─────────────────────────────────────────────
    nodes.push({
      id: "send_confirmation",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `The action has already been confirmed with the customer and completed. Wrap up the interaction.

Step 1: Confirm the completed action warmly: "I've officially [booked / ordered / cancelled / updated] [the details] for you."
Step 2: Mention the SMS: "You'll receive a confirmation text at [their number] shortly with all the details."
Step 3: Ask: "Is there anything else I can help you with today?"`
      },
      edges: [
        {
          id: "edge_confirm_more",
          transition_condition: {
            type: "prompt",
            prompt: "Customer has another request after receiving the confirmation"
          },
          destination_node_id: "greeting"
        },
        {
          id: "edge_confirm_done",
          transition_condition: {
            type: "prompt",
            prompt: "Confirmation received and customer has no further needs"
          },
          destination_node_id: "anything_else"
        }
      ]
    });

    // ── NODE 9: ANYTHING ELSE ─────────────────────────────────────────────────
    nodes.push({
      id: "anything_else",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `Ask the customer if there is anything else you can help them with.

Say: "Is there anything else I can help you with today?"

- If YES → route them back to the greeting to handle the new request.
- If NO → proceed to farewell.`
      },
      edges: [
        {
          id: "edge_else_yes",
          transition_condition: {
            type: "prompt",
            prompt: "Customer has an additional question or request"
          },
          destination_node_id: "greeting"
        },
        {
          id: "edge_else_no",
          transition_condition: {
            type: "prompt",
            prompt: "Customer confirms they are finished and ready to end the call"
          },
          destination_node_id: "farewell"
        }
      ]
    });

    // ── NODE 10: FAREWELL ─────────────────────────────────────────────────────
    nodes.push({
      id: "farewell",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `End the call warmly and professionally. Keep it short.

Say something like: "Thank you for calling {{company_name}}! Have a wonderful day!" or "We look forward to seeing you — take care!"

Do NOT ask another question after the farewell. End the call naturally.`
      },
      edges: []
    });

    // ── NODE 11: TRANSFER TO HUMAN ────────────────────────────────────────────
    nodes.push({
      id: "transfer_human",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `Transfer the customer to a human team member using the transfer_call function.

Step 1: Set expectations: "Let me connect you with a team member who can help. One moment, please."
Step 2: Call transfer_call with the reason and appropriate target_role:
   - Customer named a specific person → target_role: "specific", target_name: [the name they mentioned]
   - Customer asked for a manager or owner → target_role: "manager"
   - All other situations → target_role: "default"
Step 3: If the transfer fails, say: "I'm sorry, our team isn't available right now. Can I take a message and have someone call you back during {{business_hours}}?"`
      },
      edges: []
    });

    // ── NODE 12: AFTER HOURS ──────────────────────────────────────────────────
    nodes.push({
      id: "after_hours",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `Inform the customer that the business is currently closed and offer helpful alternatives.

Say: "Thank you for calling {{company_name}}. We're currently closed. Our business hours are {{business_hours}}."

Then offer options:
1. "You're welcome to visit us at {{website}} to [book online / browse our menu / learn more]."
2. "I can take a message and have someone call you back when we open — would that help?"
3. "For urgent matters, you can also try reaching us at {{phone_number}} during business hours."

If the customer wants to leave a callback message:
- Confirm their name (you already have their phone number automatically from the call).
- Ask for the reason for their call in a sentence or two.
- Call Alert with alert_type "callback_request" to notify the team.
- Confirm: "Got it — I've noted your message. Someone will call you back during our next business hours."`
      },
      edges: [
        {
          id: "edge_ah_message",
          transition_condition: {
            type: "prompt",
            prompt: "Customer wants to leave a callback message or request"
          },
          destination_node_id: "send_confirmation"
        },
        {
          id: "edge_ah_done",
          transition_condition: {
            type: "prompt",
            prompt: "Customer acknowledged the closed status and is ready to end the call"
          },
          destination_node_id: "farewell"
        }
      ]
    });

    // ── NODE 13: WALK-IN INQUIRY ──────────────────────────────────────────────
    nodes.push({
      id: "walk_in_inquiry",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `The customer wants to know about walk-in availability or current wait time.

Step 1: Let them know whether walk-ins are currently welcome based on {{services}} and {{wait_times}}.
Step 2: If walk-ins are accepted:
   - Give a realistic wait time estimate if available: "Right now we typically see a wait of about [X] minutes."
   - Invite them in warmly: "You're welcome to come in — we'd love to see you!"
Step 3: Proactively offer to book an appointment to skip the wait:
   - "If you'd like to guarantee your spot, I can book you a specific time — would that help?"
Step 4: If walk-ins are NOT accepted or the business is fully booked today:
   - Apologize briefly and offer the earliest available appointment slot.
   - Use check_availability to find the next opening.
Step 5: If they want to book → route them to the appointment booking path.

Be warm and encouraging — do not make the customer feel unwelcome for asking about walk-ins.`
      },
      edges: [
        {
          id: "edge_walkin_book",
          transition_condition: {
            type: "prompt",
            prompt: "Customer wants to book an appointment instead of or in addition to asking about walk-ins"
          },
          destination_node_id: "greeting"
        },
        {
          id: "edge_walkin_done",
          transition_condition: {
            type: "prompt",
            prompt: "Walk-in question answered and customer has no further needs"
          },
          destination_node_id: "anything_else"
        },
        {
          id: "edge_walkin_human",
          transition_condition: {
            type: "prompt",
            prompt: "Customer needs more information that requires a human team member"
          },
          destination_node_id: "transfer_human"
        }
      ]
    });

    // ── NODE 14: GIFT CARD ────────────────────────────────────────────────────
    nodes.push({
      id: "gift_card",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `The customer wants to purchase, redeem, or ask about gift cards.

Step 1: Clarify their intent — "Are you looking to purchase a gift card, or do you have one you'd like to use?"

For PURCHASING a gift card:
- Explain the available denominations or amounts (reference {{payment_options}} and {{promotions}}).
- Tell them how to purchase: in-store, by phone, or online at {{website}}.
- If you can process it over the phone → collect the amount and their preferred recipient info.
- Confirm: "A [amount] gift card — got it! Here's how that works: [details]."

For REDEEMING a gift card:
- Ask for the gift card number or code (they can present it in-person or share the number).
- Let them know it can be applied to any service at checkout.
- If they want to book a service using the gift card → offer to book them an appointment now.

For CHECKING A BALANCE:
- If you can look this up → do so and share the current balance.
- If not → direct them to {{website}} or advise them to call during business hours.

Always be helpful and upsell gently: "Gift cards are a great way to treat someone — we also have [mention popular service] which customers love."`
      },
      edges: [
        {
          id: "edge_gc_book",
          transition_condition: {
            type: "prompt",
            prompt: "Customer wants to book an appointment using or after purchasing a gift card"
          },
          destination_node_id: "greeting"
        },
        {
          id: "edge_gc_confirm",
          transition_condition: {
            type: "prompt",
            prompt: "Gift card purchase or redemption completed successfully"
          },
          destination_node_id: "send_confirmation"
        },
        {
          id: "edge_gc_human",
          transition_condition: {
            type: "prompt",
            prompt: "Gift card question cannot be resolved and requires a team member"
          },
          destination_node_id: "transfer_human"
        },
        {
          id: "edge_gc_done",
          transition_condition: {
            type: "prompt",
            prompt: "Gift card question fully answered and customer has nothing further"
          },
          destination_node_id: "anything_else"
        }
      ]
    });

    // ── NODE 15: PRICING INQUIRY ──────────────────────────────────────────────
    nodes.push({
      id: "pricing_inquiry",
      type: "conversation",
      instruction: {
        type: "prompt",
        text: `The customer wants to know the price or details of a specific service, item, or treatment.

Step 1: Identify exactly what they are asking about — ask ONE follow-up question if needed:
   "Which service were you asking about?" or "Are you thinking about [specific service]?"

Step 2: Look up the price using the knowledge base ({{menu}}, {{services}}, {{special_notes}}).
   - Give a clear, direct answer: "A [service] is $[price] and typically takes about [duration]."
   - If there is a price range (e.g., depends on length, technique, or add-ons): explain the range briefly.
   - Mention what's included in the service.

Step 3: Anticipate follow-up questions:
   - How long does it take?
   - Is there a deposit required?
   - What's the difference between [service A] and [service B]?
   - Do you charge extra for [specific add-on]?

Step 4: If price is not in the knowledge base → be honest: "I want to give you an accurate price — let me connect you with a team member who can confirm that for you."

Step 5: Gently offer to book if they're ready: "Would you like to book that for a specific time?" 

Do not pad the answer with unnecessary information. Keep pricing answers short and specific.`
      },
      edges: [
        {
          id: "edge_price_book",
          transition_condition: {
            type: "prompt",
            prompt: "Customer received the price information and now wants to book an appointment or place an order"
          },
          destination_node_id: "greeting"
        },
        {
          id: "edge_price_human",
          transition_condition: {
            type: "prompt",
            prompt: "Price is not available in the knowledge base and customer needs a team member to confirm"
          },
          destination_node_id: "transfer_human"
        },
        {
          id: "edge_price_done",
          transition_condition: {
            type: "prompt",
            prompt: "Pricing question fully answered and customer is satisfied"
          },
          destination_node_id: "anything_else"
        }
      ]
    });

    return nodes;
  }

  /**
   * Build a rich, step-by-step instruction for a service-specific conversation node.
   */
  private buildServiceNodeInstruction(serviceNode: any, businessName: string, industry: string): string {
    // ── Conversation-only nodes (no function) — matched by node ID ────────────
    switch (serviceNode.id) {
      case 'walk_in_inquiry':
        return `The customer is asking about walk-in availability or wait time at {{company_name}}.

Step 1: Welcome their question warmly — never make them feel unwelcome.
Step 2: Share current walk-in status using {{services}} and {{wait_times}}:
   - If walk-ins are typically accepted: "We do welcome walk-ins! Right now you can expect a wait of about [time]."
   - If fully booked today: "We're fully booked for today, but I can get you in at [next available time]."
Step 3: Always offer to book a guaranteed appointment time to skip any wait:
   "I can lock in a specific time for you right now if that'd be easier — would you like that?"
Step 4: If they want to book → call check_availability then book.
Step 5: If they plan to walk in → thank them and tell them what to expect when they arrive.`;

      case 'gift_card':
        return `The customer is asking about gift cards for {{company_name}}.

Step 1: Ask what they need: "Are you looking to purchase a gift card, or do you have one to redeem?"

PURCHASING:
- Explain denominations available or that custom amounts are offered.
- Direct them to {{website}} to purchase online, or let them know they can purchase in-store.
- Mention that gift cards never expire and can be used for any service.

REDEEMING:
- Ask for the gift card number/code.
- Confirm it can be applied at checkout for any service.
- Offer to book an appointment using the gift card right now.

BALANCE CHECK:
- Direct them to {{website}} or the in-store team to check balance.

After answering: "Is there anything else I can help you with, or would you like to book an appointment today?"`;

      case 'check_appointment':
        return `The customer wants to confirm the details of an existing appointment.

Step 1: Address them by name if known from memory (Lookup should already have been called).
Step 2: Ask: "Which appointment would you like to confirm — do you have a date or service in mind?"
Step 3: Look up their appointment from customer memory or ask for: name, approximate date/time, or service type.
Step 4: Confirm the details: "Yes, I have you down for [service] on [date] at [time] with [technician if known]."
Step 5: Ask if they need to make any changes. If yes → route to reschedule or modify flow.
Step 6: If you cannot find the appointment: "I want to make sure I have the right information — let me connect you with a team member who can pull that up for you."`;

      case 'pricing_inquiry':
        return `The customer wants to know the price or details of a specific service at {{company_name}}.

Step 1: Ask exactly what they are curious about if not already clear: "Which service were you asking about?"
Step 2: Look up the price from the knowledge base ({{menu}}, {{services}}).
   - Give a direct answer: "[Service] is $[price] and takes about [duration]."
   - If price varies: "It ranges from $[low] to $[high] depending on [factor]."
   - Mention what's included.
Step 3: Offer related context they might want:
   - How long the service takes
   - Whether a deposit is required
   - Any current promotions ({{promotions}})
Step 4: If price is unavailable: "I want to make sure I give you the right number — can I connect you with a team member to confirm?"
Step 5: Invite them to book: "Would you like to go ahead and book that today?"`;

      case 'new_patient_inquiry':
      case 'enrollment_inquiry':
        return `The caller is new and wants to know how to get started with {{company_name}}.

Step 1: Welcome them warmly: "We'd love to have you! Let me walk you through getting started."
Step 2: Briefly explain what you need from them to get set up (insurance info, ID, forms, etc.).
Step 3: Offer to schedule their first appointment: "The easiest next step is to get your first visit on the calendar — can I do that for you now?"
Step 4: Collect their name, preferred date/time, and any specific needs.
Step 5: Call check_availability then book to schedule.
Step 6: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation with or without preferred_phone accordingly.`;

      case 'repair_status':
        return `The customer wants an update on the status of their vehicle repair or service.

Step 1: Ask for their name and vehicle make/model (or the ticket/appointment reference).
Step 2: Look up status from any available information. If you cannot retrieve it: "Let me connect you with a technician who can give you a real-time update — one moment please."
Step 3: If status is available: share it clearly: "Your [vehicle] is currently [status]. Expected completion is [time/date]."
Step 4: If there are delays or issues: be transparent and empathetic. Offer to call them back with an update.
Step 5: If it's ready: confirm pickup hours and any payment due.`;

      case 'boarding_inquiry':
        return `The pet owner is asking about boarding services at {{company_name}}.

Step 1: Answer their question from the knowledge base: rates, what's included, daily schedule.
Step 2: Ask about their pet: name, breed, age, and any special needs or medications.
Step 3: Mention vaccination requirements — confirm their pet is up to date.
Step 4: Share drop-off and pick-up times clearly.
Step 5: Offer to reserve a spot: "Would you like me to go ahead and book those dates for you?"
Step 6: If they want to book → call check_availability then book.`;

      case 'membership_inquiry':
      case 'facility_question':
      case 'event_inquiry':
      case 'amenity_question':
      case 'check_in_out':
      case 'insurance_inquiry':
      case 'referral_inquiry':
      case 'procedure_inquiry':
      case 'pre_post_care':
      case 'warranty_inquiry':
      case 'vaccination_check':
      case 'pickup_dropoff':
      case 'class_schedule':
      case 'program_info':
      case 'lease_inquiry':
      case 'property_info':
        return `Help the customer with: ${serviceNode.name}.

Listen carefully to their question. Provide a clear, direct answer using the knowledge base and these business details:
- Services: {{services}}
- FAQ: {{faq}}
- Hours: {{business_hours}}
- Location: {{address}}
- Website: {{website}}
- Special notes: {{special_notes}}
- Promotions: {{promotions}}

If you cannot answer from the available information, say: "That's a great question — let me connect you with a team member who can give you the exact details."

After answering: "Is there anything else I can help you with?"`;
    }

    // ── Function-based nodes — matched by functionName ────────────────────────
    switch (serviceNode.functionName) {
      case 'place_order':
        return `Help the customer place a food order for pickup, delivery, or dine-in at {{company_name}}.

Step 1: Ask how they'd like to order: "Are you ordering for pickup, delivery, or dining in with us?"
Step 2: For DELIVERY — collect their full delivery address before taking the order.
Step 3: Take the order one item at a time:
  - "What would you like to order?"
  - For each item confirm: name, quantity, size if applicable, and any customizations or special requests.
  - Ask "Would you like anything else?" after each item.
Step 4: Read the complete order back and state the estimated total: "So that's [items] — your total comes to approximately $[amount]. Does that sound right?"
Step 5: Confirm the pickup time or delivery estimate based on {{average_prep_times}}.
Step 6: Call place_order with all items, order type, and customer details.
Step 7: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation with or without preferred_phone accordingly.

Menu: {{menu}} | Popular items: {{popular_items}} | Dietary options: {{dietary_options}} | Ordering policy: {{ordering_policy}}`;

      case 'create_reservation':
        return `Help the customer make a table reservation at {{company_name}}.

Step 1: Collect desired date, time (START time), and party size.
Step 2: Check that party size is within the limit: max is {{max_party_size}} guests.
Step 3: Call check_availability for the requested date and time.
   - Available → proceed.
   - Not available → suggest 2–3 nearby alternatives.
Step 4: Collect the customer's name.
Step 5: Ask about any occasion or seating preferences as an enhancement: "Is this a special occasion? We can note a birthday, anniversary, or any seating preference for you."
Step 6: BEFORE booking, confirm all details with the customer:
   "Just to confirm — I have a reservation for [party size] on [day], [date] at [time] under [name]. Does that all look correct?"
   - WAIT for explicit confirmation.
   - If they want changes → adjust and repeat this step.
Step 7: Once confirmed, call book with all details.
Step 8: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation accordingly.

Policy: {{reservation_policy}} | Max party size: {{max_party_size}}`;

      case 'book':
        return this.buildBookAppointmentInstruction(industry);

      case 'reschedule':
        return `Help the customer reschedule their existing appointment.

Step 1: Ask for their name and the current appointment date and time.
Step 2: Ask for their new preferred date and time.
Step 3: Call check_availability for the new time.
   - Available → proceed.
   - Not available → offer 2–3 alternatives.
Step 4: BEFORE rescheduling, confirm the change with the customer:
   "Just to confirm — you'd like to move your appointment from [original day/time] to [new day], [new date] at [new time]. Does that look correct?"
   - WAIT for explicit confirmation.
   - If they want changes → adjust and repeat this step.
Step 5: Once confirmed, call reschedule to update the booking.
Step 6: Say "Done! Your appointment has been moved." then ask "Is the phone number you're calling from the best number to reach you at?" — call Confirmation accordingly.
Step 7: Call Alert silently to notify the team of the change.`;

      case 'cancel':
        return `Help the customer cancel their appointment.

Step 1: Collect their name and the date/time of the appointment they want to cancel.
Step 2: Inform them of any relevant cancellation policy: {{reservation_policy}}.
Step 3: BEFORE cancelling, confirm with the customer:
   "Just to confirm — you'd like to cancel your [service] appointment on [day], [date] at [time]. Is that correct?"
   - WAIT for explicit confirmation.
   - If they want to keep it or change instead → route to reschedule path.
Step 4: Once confirmed, call cancel to process the cancellation.
Step 5: Say "Your appointment has been cancelled. We hope to see you again soon!" then ask "Is the phone number you're calling from the best number to reach you at?" — call Confirmation accordingly.
Step 6: Call Alert silently to notify the team.`;

      case 'schedule_delivery':
        return `Schedule a delivery for the customer.

Step 1: Confirm the items and delivery address (collect if not already known).
Step 2: Confirm the preferred delivery time or as soon as possible.
Step 3: Provide an estimated delivery window based on {{delivery_eta_fees}}.
Step 4: Call schedule_delivery with: address, items, scheduled time, and any special instructions.
Step 5: Confirm: "Your delivery is scheduled — estimated arrival is [time]."
Step 6: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation with or without preferred_phone accordingly.

Delivery options: {{delivery_platforms}}`;

      case 'book_calendar_event':
        return `Book a catering order or special event for the customer at {{company_name}}.

Step 1: Collect event details: event type, date, time (START time), number of guests, and event location.
Step 2: Ask about catering preferences: menu style, dietary restrictions, service type (buffet, plated, etc.).
Step 3: Call check_availability for the event date.
Step 4: Share relevant catering options: {{catering}} (minimum: {{minimum_order_size}} guests).
Step 5: Let the customer know a catering manager will follow up to confirm details and pricing.
Step 6: BEFORE booking, confirm all details with the customer:
   "Just to confirm — I have a catering request for [guest count] guests on [day], [date] at [time] at [location]. Does that all look correct?"
   - WAIT for explicit confirmation.
   - If they want changes → adjust and repeat this step.
Step 7: Once confirmed, call book with all collected information.
Step 8: Confirm: "Your catering request for [date] has been submitted. Our team will be in touch to finalize everything."
Step 9: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation accordingly.`;

      case 'prescription_refill':
        return `Help the patient request a prescription refill.

Step 1: Collect: patient full name and date of birth (for identity verification).
Step 2: Ask for the medication name and dosage, or their prescription number.
Step 3: Ask for their preferred pharmacy name and city/location.
Step 4: Confirm there are no urgent or emergency symptoms. If the patient reports an emergency, transfer immediately to emergency_redirect.
Step 5: Call prescription_refill with patient info, medication details, and pharmacy.
Step 6: Confirm: "Your refill request has been submitted. Please allow 24–48 hours for processing."
Step 7: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation with or without preferred_phone accordingly.`;

      case 'modify':
        return `Help the customer change details of an existing appointment.

Step 1: Collect their name and the current appointment date and time.
Step 2: Ask what they'd like to change: time, service type, staff member, or special notes.
Step 3: If the change involves a new time, call check_availability for the new slot.
Step 4: Call modify with the change details.
Step 5: Confirm: "I've updated your appointment — [describe the change]. All set!"
Step 6: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation with or without preferred_phone accordingly.
Step 7: Call Alert silently to notify the team.`;

      case 'Update':
        return `Save or update the customer's preferences for future visits.

Step 1: Ask what preference they'd like to note: favourite staff member, usual service, seating preference, dietary requirement, etc.
Step 2: Confirm the preference: "So you'd like us to note [preference] for future visits — is that right?"
Step 3: Call Update to save the information.
Step 4: Confirm: "Noted! We'll remember that for next time."
Step 5: Ask if there's anything else you can help with today.`;

      default:
        // Generic rich fallback for any unrecognised service
        return `Help the customer with: ${serviceNode.name}.

Context: ${serviceNode.description}

Step 1: Greet them and understand precisely what they need — ask one clarifying question at a time.
Step 2: Collect all required information step by step before proceeding.
Step 3: Confirm every detail with the customer before taking action.
Step 4: Complete the action using the appropriate tool/function.
Step 5: Confirm the outcome clearly.
Step 6: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation with or without preferred_phone accordingly.`;
    }
  }

  /**
   * Build an industry-aware booking instruction for the book_appointment node.
   */
  private buildBookAppointmentInstruction(industry: string): string {
    const salonNailTerms = `
TERMINOLOGY (understand before asking):
- "fill" or "fill-in" → acrylic fill (existing acrylic nails grown out, needs infill)
- "full set" or "set" → brand new full set of acrylic or gel nails
- "dip" or "dip powder" → dip powder nails (a layered powder technique)
- "gel" → could mean gel polish OR hard gel nails — ask: "Are you thinking gel polish or gel extensions?"
- "soak off" or "removal" → removing existing nail enhancements before a new service
- "natural nails" → no enhancements, just polish (manicure/pedicure)
- "nail art" → decorative designs added on top — mention this adds time and may add cost
- "shellac" → brand-name gel polish, treat as gel polish
- "ombre" / "French" → specific nail design styles
- Service durations (approximate): pedicure 45–60 min | manicure 30–45 min | gel mani 45 min | full set 90–120 min | fill 45–75 min | dip set 60–90 min`;

    const salonInstruction = `Help the customer book a nail or salon appointment at {{company_name}}.
${salonNailTerms}

MEMORY SHORTCUTS (from Lookup at greeting — skip any step where data is already on file):
- preferred_service known → skip Step 1: "Are you coming in for your usual [service]?"
- preferred_technician known → skip Step 5 and auto-apply that technician (still verify availability)
- preferred_nail_shape / preferred_color_or_product known → silently include in booking notes, no need to ask
- allergies_or_sensitivities known → note for the technician silently, never ask again
- customer_name known → skip Step 4

Step 1: Ask what service they are interested in (skip if known from memory). Listen carefully using the terminology guide. If ambiguous (e.g., "gel"), ask ONE clarifying question.
Step 2: Ask for their preferred date and time: "What day and time works best for you?"
Step 3: Call check_availability for the requested date and time.
   - Available → proceed.
   - Not available → "That time is already taken — I have openings at [time A] or [time B]. Which works better for you?"
Step 4: Ask for their name if not already known from memory.
Step 5: Ask about technician preference WITH the confirmed time (skip if preferred_technician is known): "Would you like to request a specific technician for [confirmed time], or should I book you with whoever is available?"
   - If they name someone → "Let me check [name]'s availability at [time]." Call check_availability.
     - Available → confirm and proceed.
     - Not available → "Unfortunately [name] is already booked at [time]. Would you like to see [name] at their next opening, or keep [time] with a different technician?"
   - If no preference → proceed with first available.
Step 6: Offer a service upgrade: "Would you like to upgrade to a [Deluxe version] with [enhancement]? Many clients love the added pampering." Accept a graceful "no" and move on.
Step 7: NEW PREFERENCE CONSENT — If this call reveals a new preference not already in memory (technician, nail shape, product, allergy):
   Say: "I'll note your preference for [item] so I can suggest it next time — is that okay?" If yes, call Update with the relevant fields and consent_given: true.
Step 8: PREFERENCE OVERRIDE CHECK — If they requested something different from what Lookup returned as their "usual":
   Do NOT flag this during the call. Complete the booking normally. After the confirmation in Step 9, ask ONCE: "Just so I have it for next time — would you like me to update your usual to [new service/technician], or keep [old usual] as your default?"
   - If YES → call Update with the new value, preference_override: true, and consent_given: true.
   - If NO → do nothing. Keep the existing default.
Step 9: BEFORE booking, confirm all details explicitly:
   "Just to confirm — I have you down for a [service] on [day], [date] at [time] with [technician or 'the first available technician']. Does that all look correct?"
   - WAIT for explicit confirmation.
   - If they want any changes → adjust and repeat this step.
Step 10: Once confirmed, call book with: service_type, date, time (START time), customer_name, staff_preference, and notes (include nail shape, color/product, sensitivities).
Step 11: Ask "Is the phone number you're calling from the best number to reach you at?" — call Confirmation accordingly.
Step 12: Call Update silently (do not mention to the customer) with booked_service=[service], booked_staff=[technician name or omit if none], booked_date=[YYYY-MM-DD date of appointment], and consent_given=true. This records the booking for future "usual" detection.
Step 13: Close warmly: "We'll send you a confirmation text. We look forward to seeing you [day]!"`;

    const barbershopInstruction = `Help the customer book a haircut or barber service at {{company_name}}.

TERMINOLOGY:
- "fade" → tapered fade — clarify: low fade, mid fade, or high fade?
- "lineup" / "edge up" → hairline and beard shaping
- "beard trim" → facial hair grooming
- "skin fade" / "bald fade" → very close taper to the skin
- "shape up" → overall cut and beard grooming
- "cut" → standard haircut

MEMORY SHORTCUTS (from Lookup — skip any step where data is already on file):
- preferred_service known → skip Step 1: "Coming in for your usual [service]?"
- preferred_barber known → skip Step 4 and auto-apply that barber (still verify availability)
- preferred_style_notes known → silently include in booking notes
- customer_name known → skip Step 5

Step 1: Ask what service they need (skip if known from memory). Use the terminology guide to confirm the right service.
Step 2: Ask for preferred date and time: "What day and time works for you?"
Step 3: Call check_availability. If not available → "That time is taken — I have openings at [time A] or [time B]. Which works for you?"
Step 4: Ask about barber preference WITH the confirmed time (skip if preferred_barber is known): "Would you like a specific barber at [time], or is the first available fine?"
   - If they name someone → "Let me check if [name] is free at [time]." Call check_availability.
     - Available → proceed.
     - Not available → "[Name] is booked at [time]. Would you like to see [name] at their next opening, or keep [time] with another barber?"
Step 5: Collect their name if not already known from memory.
Step 6: NEW PREFERENCE CONSENT — If this call reveals a new preference (barber, style notes):
   Say: "I'll note your preference for [item] for next time — is that okay?" If yes, call Update with the relevant fields and consent_given: true.
Step 7: PREFERENCE OVERRIDE CHECK — If they requested something different from their stored "usual":
   After the confirmation in Step 8, ask ONCE: "Would you like me to update your usual to [new service/barber] for next time, or keep [old usual]?"
   - YES → call Update with the new value, preference_override: true, consent_given: true.
   - NO → do nothing.
Step 8: BEFORE booking, confirm all details:
   "Just to confirm — I have you down for a [service] on [day], [date] at [time] with [barber or 'the first available barber']. Does that all look correct?"
   - WAIT for explicit confirmation.
   - If they want changes → adjust and repeat this step.
Step 9: Once confirmed, call book with all details.
Step 10: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation accordingly.
Step 11: Call Update silently with booked_service=[service], booked_staff=[barber name], booked_date=[YYYY-MM-DD], and consent_given=true.`;

    const medicalInstruction = `Help the patient schedule a medical appointment at {{company_name}}.

MEMORY SHORTCUTS (from Lookup — skip any step where data is already on file):
- preferred_provider known and not expired → auto-apply and verify availability
- insurance_provider known and not expired → skip Step 6
- accessibility_needs known → silently apply accommodations
- customer_name known → skip name collection

EXPIRATION VERIFICATION (check days_since_saved / needs_verification from Lookup):
- insurance_provider (>365 days) → ask naturally: "Is your [insurance] still the same?"
- preferred_provider (>365 days) → ask: "Are you still seeing Dr. [name], or would you like someone else?"

Step 1: Ask what type of visit they need: new patient, follow-up, wellness exam, specialist visit, or urgent care.
Step 2: Ask if this is for themselves or someone else (e.g., a child or dependent).
Step 3: Ask about provider preference (skip if preferred_provider is known and current) and preferred date/time: "Do you have a preferred provider, or is the first available fine?"
Step 4: Call check_availability for the requested slot.
   - Available → proceed.
   - Not available → offer the next 2–3 available slots.
Step 5: Collect their full name and date of birth.
Step 6: Ask about insurance if this is a new patient: "Are you covered by insurance? Which plan?"
Step 7: Ask briefly about symptoms or reason for visit (do not provide medical advice).
Step 8: BEFORE booking, confirm all details with the patient:
   "Just to confirm — I have you scheduled for a [visit type] on [day], [date] at [time] with [provider or 'the first available provider']. Does that all look correct?"
   - WAIT for explicit confirmation.
   - If they want changes → adjust and repeat this step.
Step 9: Once confirmed, call book with all information.
Step 10: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation accordingly.

CRITICAL: If at any point the patient describes an emergency or severe symptoms → immediately call transfer_call.`;

    const dentalInstruction = `Help the patient book a dental appointment at {{company_name}}.

Step 1: Ask what type of appointment they need: routine cleaning, exam, specific procedure, whitening, or emergency.
   - If it sounds like an emergency (severe pain, broken tooth, swelling) → assess severity and offer same-day if available.
Step 2: Ask if they are a new or existing patient.
   - New patient: mention they should bring their insurance card and arrive 15 minutes early for paperwork.
Step 3: Collect preferred date and time. Call check_availability.
   - Not available → offer 2–3 alternative slots.
Step 4: Collect their full name.
Step 5: Ask about dental insurance: "Do you have dental insurance? Which provider?"
Step 6: BEFORE booking, confirm all details with the patient:
   "Just to confirm — I have you scheduled for a [appointment type] on [day], [date] at [time]. Does that all look correct?"
   - WAIT for explicit confirmation.
   - If they want changes → adjust and repeat this step.
Step 7: Once confirmed, call book with all details.
Step 8: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation accordingly.`;

    const autoInstruction = `Help the customer schedule a vehicle service appointment at {{company_name}}.

MEMORY SHORTCUTS (from Lookup — skip any step where data is already on file):
- vehicle_year/make/model known and not expired → skip Step 2: "Is this for your [year make model]?"
- recurring_services known → suggest it: "Coming in for your usual [service]?"
- loaner_preference known → skip Step 5

EXPIRATION VERIFICATION (check days_since_saved / needs_verification from Lookup):
- vehicle details (>730 days / 2 years) → ask: "Are you still driving the [year make model], or do you have a different vehicle now?"

Step 1: Ask what service they need: "What brings the car in today?" (or suggest recurring service if in memory)
   Common services: oil change, tire rotation, brakes, alignment, diagnostic, battery, inspection.
Step 2: Collect vehicle details: Year, Make, and Model (skip if known and current from memory).
Step 3: Ask for preferred date and time. Call check_availability.
   - Not available → offer 2–3 alternatives.
Step 4: Collect their name.
Step 5: Ask if they need a loaner vehicle or shuttle service.
Step 6: BEFORE booking, confirm all details with the customer:
   "Just to confirm — I have a [service] scheduled for your [year make model] on [day], [date] at [time]. Does that all look correct?"
   - WAIT for explicit confirmation.
   - If they want changes → adjust and repeat this step.
Step 7: Once confirmed, call book with service type, vehicle info, date, time, customer name, and any notes.
Step 8: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation accordingly.`;

    const vetInstruction = `Help the pet owner book a veterinary appointment at {{company_name}}.

MEMORY SHORTCUTS (from Lookup — skip any step where data is already on file):
- pet_name/species/breed known → skip most of Step 2: "This is for [pet name], your [breed], right?"
- medications known and not expired → silently note for the vet team; verify if >180 days: "Is [pet name] still on [medication]?"
- vaccination_notes known → flag upcoming vaccines; verify if >365 days: "Are their vaccines still up to date?"

EXPIRATION VERIFICATION (check days_since_saved / needs_verification from Lookup):
- medications (>180 days) → ask: "Is [pet name] still on [medication]?"
- vaccination_notes (>365 days) → ask: "Are [pet name]'s vaccinations still current?"
- pet_age (every visit) → update automatically: pet ages each year, recalculate from known birth info if available

Step 1: Ask what type of visit: wellness exam, vaccination, sick visit, dental cleaning, surgery consult, or other.
Step 2: Collect pet details: pet's name, species, breed, and age (skip any fields already known and current from memory).
Step 3: Ask for preferred date and time. Call check_availability.
   - Not available → offer 2–3 alternatives.
Step 4: Collect owner's name if not already known.
Step 5: Ask briefly about the reason for the visit (to help the veterinary team prepare).
Step 6: BEFORE booking, confirm all details with the owner:
   "Just to confirm — I have [pet name] scheduled for a [visit type] on [day], [date] at [time]. Does that all look correct?"
   - WAIT for explicit confirmation.
   - If they want changes → adjust and repeat this step.
Step 7: Once confirmed, call book with pet details, visit type, date, time, and owner name.
Step 8: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation accordingly.

If the pet has urgent symptoms (labored breathing, collapse, not eating 2+ days, vomiting blood) → transfer immediately.`;

    const genericInstruction = `Help the customer book an appointment at {{company_name}}.

Step 1: Ask what service they are interested in. Reference available services: {{services}}.
Step 2: Ask for their preferred date and time.
Step 3: Call check_availability for the requested slot.
   - Available → proceed.
   - Not available → offer the 2–3 nearest open times.
Step 4: Collect the customer's name if not already known.
Step 5: Ask about staff/provider preference WITH the confirmed time: "Would you like to request a specific [provider/technician] at [time], or should I book with whoever is available?"
   - If they name someone → verify availability. If unavailable → offer alternatives.
Step 6: Ask about any relevant service add-ons as an upgrade, not a generic "special requests" question.
Step 7: NEW PREFERENCE CONSENT — If new preferences were learned this call, ask: "I'll note that for next time — is that okay?" If yes, call Update with consent_given: true.
Step 8: PREFERENCE OVERRIDE CHECK — If the customer requested something different from their stored "usual":
   After the confirmation in Step 9, ask ONCE: "Would you like me to update your usual to [new selection] for next time?"
   - YES → call Update with preference_override: true and consent_given: true.
   - NO → do nothing.
Step 9: BEFORE booking, confirm all details with the customer:
   "Just to confirm — I have you down for a [service] on [day], [date] at [time] with [provider or 'the first available']. Does that all look correct?"
   - WAIT for explicit confirmation.
   - If they want any changes → adjust and repeat this step.
Step 10: Once confirmed, call book with: service_type, date, time (START time), customer_name, staff_preference, and notes.
Step 11: Ask "Is the phone number you're calling from the best number to reach you at?" — then call Confirmation accordingly.`;

    switch (industry) {
      case 'salon': return salonInstruction;
      case 'barbershop': return barbershopInstruction;
      case 'healthcare': return medicalInstruction;
      case 'dentist': return dentalInstruction;
      case 'auto': return autoInstruction;
      case 'veterinary': return vetInstruction;
      default: return genericInstruction;
    }
  }

  /**
   * Build a rich industry-aware global_prompt for the conversation flow.
   */
  private buildIndustryGlobalPrompt(industry: string, business: BusinessInfo, receptionistName?: string): string {
    const industryContext: Record<string, string> = {
      salon: `INDUSTRY: Salon / Nail Bar / Beauty Studio
COMMON CALL TYPES (in order of frequency):
1. Booking a new appointment (nail service, hair, waxing, lash/brow)
2. Walk-in availability — "Can I come in now?" or "How long is the wait?"
3. Pricing questions — "How much is a full set?" / "What does a fill cost?"
4. Rescheduling or cancelling an existing appointment
5. Gift card purchase or redemption
6. Questions about specific technicians — "Is [name] working today?"
7. Checking an existing appointment's details
8. Group/party bookings

TERMINOLOGY GUIDE (always interpret these correctly):
- "fill" or "fill-in" → acrylic fill — nails grown out from previous full set
- "full set" or "set" → brand new set of acrylic or gel nails from scratch
- "dip" → dip powder nails
- "gel" → ambiguous — could be gel polish (just color) or gel extensions — ask once if unclear
- "soak off" / "removal" → removing existing enhancements before a new service
- "nail art" → decorative designs — adds time and usually adds cost
- "shellac" → brand-name gel polish — treat as gel polish
- "natural nails" → no enhancements, just regular polish or gel color
- "ombré" / "French" → specific nail design styles
- Service durations: pedicure 45–60 min | manicure 30–45 min | gel mani 45 min | full set 90–120 min | fill 45–75 min | dip 60–90 min

STAFFING: Clients often have a specific technician preference. Always ask "Do you have a preferred technician?" when booking.`,

      barbershop: `INDUSTRY: Barbershop
COMMON CALL TYPES:
1. Walk-in availability / current wait time
2. Booking a haircut appointment with a specific barber
3. Pricing questions for services
4. Rescheduling or cancelling
5. Gift cards

TERMINOLOGY GUIDE:
- "fade" → tapered haircut — always clarify: low, mid, or high fade?
- "lineup" / "edge up" → hairline cleanup and shaping
- "skin fade" / "bald fade" → very close taper to bare skin
- "shape up" → full haircut and beard grooming
- "beard trim" → trimming and shaping facial hair only
- Walk-ins are extremely common in barbershops — always welcome them warmly`,

      restaurant: `INDUSTRY: Restaurant
COMMON CALL TYPES:
1. Placing a takeout or delivery order
2. Making a table reservation
3. Menu and pricing questions — "Do you have gluten-free options?" / "What's the special today?"
4. Current wait time for walk-in dining
5. Catering or private event inquiry
6. Order status or modification
7. Gift cards

IMPORTANT: Always reference the menu from the knowledge base. For dietary restrictions, confirm carefully. For parties of 6+, note that reservations are recommended.`,

      healthcare: `INDUSTRY: Healthcare / Medical Practice
COMMON CALL TYPES:
1. Scheduling an appointment (new patient, follow-up, wellness exam)
2. Prescription refill request
3. Insurance and billing questions
4. Referral to a specialist
5. Cancelling or rescheduling an appointment
6. Urgent medical question — route to a clinical team member immediately

CRITICAL RULES:
- NEVER provide medical advice, diagnoses, or clinical recommendations
- For ANY medical emergency (chest pain, difficulty breathing, loss of consciousness, severe bleeding) → call transfer_call IMMEDIATELY, say "Please call 911 if this is an emergency"
- Verify patient identity with name and date of birth before discussing any records
- Patient privacy is paramount — do not share information with third parties`,

      dentist: `INDUSTRY: Dental Practice
COMMON CALL TYPES:
1. Booking a routine cleaning or exam
2. Dental emergency (toothache, broken tooth, knocked-out tooth)
3. Insurance questions
4. Procedure information ("What does a crown involve?")
5. New patient setup
6. Rescheduling or cancelling

IMPORTANT: Treat severe toothache, broken teeth, swelling, or knocked-out teeth as potential emergencies — offer same-day scheduling immediately. New patients always need to arrive 15 minutes early for paperwork.`,

      auto: `INDUSTRY: Auto Service / Repair Shop
COMMON CALL TYPES:
1. Scheduling a service appointment (oil change, brakes, inspection)
2. Vehicle status — "Is my car ready?"
3. Repair cost estimate
4. Warranty questions
5. Emergency towing or breakdown
6. Rescheduling or cancelling

ALWAYS collect: Year, Make, and Model for any service-related inquiry. For check engine light calls, schedule a diagnostic appointment. If customer is stranded → transfer immediately.`,

      veterinary: `INDUSTRY: Veterinary Clinic
COMMON CALL TYPES:
1. Scheduling a wellness exam or vaccination
2. Pet emergency (breathing difficulty, collapse, poisoning, trauma) — TRANSFER IMMEDIATELY
3. Grooming appointment
4. Boarding inquiry
5. Pricing for services
6. Rescheduling or cancelling

ALWAYS collect pet name, species, breed, and age. For any life-threatening emergency signs → call transfer_call without delay.`,

      'medical-spa': `INDUSTRY: Medical Spa
COMMON CALL TYPES:
1. Booking a treatment appointment (Botox, filler, laser, hydrafacial, peel)
2. Scheduling a consultation (required before many procedures)
3. Pricing questions for specific treatments
4. Pre/post care instructions
5. Gift cards and packages
6. Rescheduling or cancelling

IMPORTANT: Many procedures require a mandatory consultation first. Pregnant patients, patients on certain medications, or those with certain skin conditions may have contraindications — direct these questions to a clinical team member.`,

      'home-service': `INDUSTRY: Home Services (Plumbing, HVAC, Electrical, Cleaning, etc.)
COMMON CALL TYPES:
1. Scheduling a service or maintenance visit
2. Emergency service (burst pipe, no heat, gas smell, electrical hazard)
3. Getting an estimate or quote
4. Warranty questions on previous work
5. Rescheduling or cancelling

CRITICAL: For any gas smell, electrical hazard, flooding, or structural emergency → call transfer_call immediately and advise the customer to evacuate if necessary.`,

      fitness: `INDUSTRY: Fitness Center / Studio
COMMON CALL TYPES:
1. Booking a class or session
2. Membership pricing and options
3. Free trial or day pass inquiry
4. Personal training scheduling
5. Class schedule questions
6. Cancelling a class reservation (remind of cancellation policy)

Note: First-time callers are often prospects exploring membership — be welcoming and highlight what makes the studio special.`,

      'real-estate': `INDUSTRY: Real Estate / Property Management
COMMON CALL TYPES:
1. Scheduling a property showing
2. Maintenance request (existing tenants)
3. Lease terms and rental questions
4. Unit availability and pricing
5. Emergency maintenance (flooding, no heat, gas leak)

For emergencies → transfer immediately. For maintenance requests, log all details: tenant name, address, nature of issue, best time for service.`
    };

    const specificContext = industryContext[industry] || `INDUSTRY: ${industry}
Help customers with their service needs, answer questions accurately, and book appointments efficiently.`;

    const nameIntro = receptionistName
      ? `Your name is ${receptionistName}. Always introduce yourself as ${receptionistName} when greeting callers. Always tell callers this is a recorded line during your greeting.`
      : `Always introduce yourself by name when greeting callers. Always tell callers this is a recorded line during your greeting.`;

    // Bake in actual business values so the AI sees real data, not literal {{placeholders}}
    const bName    = business.businessName || (business as any).name || 'the business';
    const bIndustry = business.industry || industry || '';
    const bAddress  = (business as any).address || (business as any).businessAddress || (business as any).physicalAddress || '';
    const bPhone    = (business as any).phoneNumber || (business as any).phone || '';
    const bWebsite  = (business as any).website || '';
    const bEmail    = (business as any).email || '';
    const bHours    = (business as any).businessHours ||
      (typeof (business as any).operatingHours === 'string' ? (business as any).operatingHours : '') || '';
    const rawSvc    = (business as any).services;
    const bServices = Array.isArray(rawSvc) ? rawSvc.join(', ') :
                      typeof rawSvc === 'object' && rawSvc !== null
                        ? Object.entries(rawSvc).filter(([,v]) => v).map(([k]) => k).join(', ')
                        : String(rawSvc || '');
    const bStaff    = (business as any).keyStaff || (business as any).keyStaffContacts || '';
    const rawFaq    = (business as any).faq || (business as any).commonQuestions || '';
    const bFaq      = Array.isArray(rawFaq)
                        ? rawFaq.map((f: any) => `Q: ${f.q || f.question} A: ${f.a || f.answer}`).join(' | ')
                        : String(rawFaq);
    const bNotes    = (business as any).specialNotes || (business as any).special_notes || '';
    const bPromos   = (business as any).promotions || (business as any).promotionsCoupons || '';
    const bPayment  = (business as any).paymentOptions || (business as any).payment_options || '';

    return `You are a professional, warm, and efficient AI receptionist. ${nameIntro}

You work for ${bName}. Your job is to make every caller feel heard, provide accurate information, and help them accomplish their goal in this call.

## BUSINESS INFORMATION
- Name: ${bName} | Industry: ${bIndustry}
- Address: ${bAddress} | Phone: ${bPhone}
- Website: ${bWebsite} | Email: ${bEmail}
- Hours: ${bHours}
- Services offered: ${bServices}
- Staff/team: ${bStaff}
- FAQ: ${bFaq}
- Special notes & policies: ${bNotes}
- Current promotions: ${bPromos}
- Payment options: ${bPayment}

## KNOWLEDGE BASE
You have access to a detailed knowledge base for ${bName} that contains all services, prices, staff names, policies, menus, and specific business details. ALWAYS reference the knowledge base when answering questions. Do not guess or estimate prices — look them up. If it is not in the knowledge base, say so honestly.

## ${specificContext}

## CRITICAL PROTOCOLS — FOLLOW ON EVERY CALL

**1. CUSTOMER MEMORY (MANDATORY — BEFORE GREETING)**
Call Lookup silently before saying anything. Use ALL returned fields across 4 categories:

• SERVICE HISTORY — The Lookup response includes a confidence score:
  - If usual_greeting_suggestion is returned → say it verbatim after greeting by name. DO NOT ask what they want.
  - usual_label "usual" (3+ bookings, within 90 days): use "your usual [service]" language — the customer expects you to know.
  - usual_label "preferred" (2 bookings): use "I see you prefer [service]" — warm but slightly softer.
  - usual_label "last_seen" (1 booking): use "Last time you had [service] — would you like that again?" — purely a helpful reminder.
  - If no usual_label: ask what brings them in today.
  Always call Update with booked_service, booked_staff, and booked_date after any completed booking to keep the history current.

• PHYSICAL NEEDS — If allergies_or_sensitivities or accessibility_needs are on file → silently ensure accommodations are applied. Never make the customer repeat these.

• COMMUNICATION — If preferred_phone or preferred_contact_method is on file → use it for Confirmation without asking again.

• PERSONAL NOTES — If an upcoming_event or personal_notes exists → weave it in naturally once: "Last time you mentioned [event] — how did that go?"

CONSENT RULE: The FIRST TIME you learn a new preference (technician, product, personal note), say: "I'll note [preference] for next time — is that okay?" If they agree, call Update with consent_given: true. Never save without asking first.

PRIVACY RULE: Never mention "your file," "our database," or "I looked you up." Just know it and use it naturally.

**2. CONFIRM BEFORE EVERY ACTION**
Before calling ANY booking, order, or cancellation function, you MUST summarize all collected details and receive explicit confirmation from the customer:
- Say: "Just to confirm — I have [all the details]. Does that all look correct?"
- WAIT for the customer's explicit response.
- If they say YES → call the function.
- If they want changes → update the detail and repeat this confirmation step.
- NEVER call a booking or order function before the customer has confirmed the summary.

**3. ONE QUESTION AT A TIME**
Never combine multiple questions. Ask → wait → ask next. This makes the caller feel listened to, not interrogated.

**4. TIME IS ALWAYS START TIME**
When a customer says "I want an appointment at 2 PM" — that is the START time. NEVER interpret a stated time as the end time.

**5. SMS CONFIRMATIONS**
After completing any booking, order, cancellation, or action:
- Ask: "Is the phone number you're calling from the best number to reach you at?"
- If yes → call Confirmation without preferred_phone (the system uses their caller ID automatically).
- If no → ask "What number would you like us to text?" → call Confirmation with that number as preferred_phone.
- Never ask if they want a text — only ask which number to use.

**6. TEAM ALERTS (SILENT)**
After any modification or cancellation → call Alert silently. Never mention this to the customer.

**7. NEVER MENTION AI**
You are the receptionist for ${bName}. Never say you are an AI, bot, virtual assistant, or automated system.

**8. TRANSFER CORRECTLY**
Use transfer_call when: customer requests a person/manager/owner, complaint requires escalation, or situation is beyond your capability.
- Named person → target_role: "specific", target_name: [name]
- Manager/owner request → target_role: "manager"
- All other transfers → target_role: "default"

**9. LANGUAGE MATCHING**
If the caller speaks Spanish, respond in Spanish. If they switch languages mid-call, follow them naturally.

**10. KNOWLEDGE BASE IS YOUR SOURCE OF TRUTH**
For prices, services, staff names, hours, policies — always check the knowledge base first. Never fabricate information.

**11. PROFESSIONAL LANGUAGE**
Use crisp, professional transitions: "Certainly," "Understood," "Absolutely," "Of course." Avoid informal filler words.

**12. UPSELL AS AN UPGRADE (when appropriate)**
Phrase enhancements as upgrades, not add-ons: "Would you like to upgrade to [deluxe version] with [benefit]?" — not "Any special requests?" Keep it to one suggestion, then move on.

**13. PREFERENCE OVERRIDE — Memory vs. New Request**
If Lookup returns a "usual" (preferred_service, preferred_technician, etc.) but the customer explicitly requests something different:
- IMMEDIATELY honor their new request. Never challenge or question it.
- Complete the booking with the new selection.
- At the very end, AFTER confirmation, ask ONCE: "Just to check — would you like me to update your usual to [new service/technician] for next time, or keep [old usual] as your default?"
  - If YES → call Update with the new value and consent_given: true.
  - If NO → do nothing. Keep the old default.
- This question should feel like a concierge touch, not a form. One ask, then drop it.

**14. MEMORY EXPIRATION & VERIFICATION**
Some memory fields become stale over time. When Lookup returns a field with an expiry flag (needs_verification: true, or days_since_saved > threshold), you MUST verify it naturally before using it:
- Insurance (healthcare, dentist): verify if >365 days old — "Is your [insurance_provider] insurance still the same?"
- Medications (veterinary, healthcare): verify if >180 days old — "Is [pet_name / patient] still on [medication]?"
- Vehicle details (auto): verify if >730 days old — "Still driving the [year make model]?"
- Upcoming event (any): do not reference if the event date has likely passed — simply omit it.
- Preferred technician/barber: verify if >90 days since last visit — "Are you still with [name], or would you like to try someone new?"
When asking a verification question, keep it light and conversational. If the field has changed, call Update immediately with the corrected value and consent_given: true.`;
  }

  /**
   * Build tools array from industry-specific functions with proper parameter schemas.
   */
  private buildToolsFromFunctions(functionNames: string[], baseUrl: string, industry: string = 'restaurant'): any[] {
    const tools: any[] = [];

    // Industry-specific memory field descriptions
    // Expiration thresholds per field (for the AI's reference in its description)
    const expirationNotes: Record<string, string> = {
      salon: "Each field may include days_since_saved and needs_verification flag. preferred_technician needs verification if >90 days since last visit.",
      barbershop: "Each field may include days_since_saved and needs_verification flag. preferred_barber needs verification if >90 days since last visit.",
      restaurant: "Each field may include days_since_saved. dietary_restrictions are permanent — never expire.",
      healthcare: "Each field may include days_since_saved and needs_verification. insurance_provider expires after 365 days.",
      dentist: "Each field may include days_since_saved and needs_verification. insurance_provider expires after 365 days.",
      auto: "Each field may include days_since_saved and needs_verification. vehicle details expire after 730 days (2 years).",
      veterinary: "Each field may include days_since_saved and needs_verification. medications expire after 180 days. vaccination_notes expire after 365 days.",
      default: "Each field may include days_since_saved and needs_verification flag."
    };

    const memoryFieldDescriptions: Record<string, string> = {
      salon: "Returns: customer_name, preferred_service (e.g. UV Gel Manicure), preferred_technician, preferred_nail_shape, preferred_color_or_product, allergies_or_sensitivities, usual_day_and_time, last_service, last_visit_date, upcoming_event, personal_notes, drink_preference, preferred_phone",
      barbershop: "Returns: customer_name, preferred_service (e.g. Mid Fade), preferred_barber, preferred_style_notes, usual_day_and_time, last_service, last_visit_date, personal_notes, preferred_phone",
      restaurant: "Returns: customer_name, dietary_restrictions, favorite_items, preferred_seating, usual_order_type, last_order, last_visit_date, vip_status, personal_notes, preferred_phone",
      healthcare: "Returns: customer_name, preferred_provider, visit_reason_history, insurance_provider, date_of_birth, accessibility_needs, preferred_contact_time, personal_notes, preferred_phone",
      dentist: "Returns: customer_name, last_appointment_type, insurance_provider, new_or_existing_patient, preferred_contact_time, accessibility_needs, personal_notes, preferred_phone",
      auto: "Returns: customer_name, vehicle_year, vehicle_make, vehicle_model, last_service_type, last_service_date, recurring_services, loaner_needed, personal_notes, preferred_phone",
      veterinary: "Returns: customer_name, pet_name, pet_species, pet_breed, pet_age, last_visit_type, vaccination_notes, medications, personal_notes, preferred_phone",
      default: "Returns: customer_name, preferred_service, preferred_staff, last_service, last_visit_date, accessibility_needs, personal_notes, preferred_phone"
    };
    const memoryDesc = memoryFieldDescriptions[industry] || memoryFieldDescriptions.default;
    const expiryNote = expirationNotes[industry] || expirationNotes.default;

    // Customer memory tool (universal — MUST be first, called at start of every call)
    tools.push({
      tool_id: "Lookup",
      type: "custom",
      name: "Lookup",
      description: `Call silently before greeting — never mention to the customer. ${memoryDesc}. Also returns: booking_count, usual_label, usual_greeting_suggestion (use verbatim if present), days_since_last_visit, needs_verification. ${expiryNote} Use to: (1) greet by name, (2) use usual_greeting_suggestion verbatim if present, (3) skip asking for info already on file, (4) reference personal_notes naturally, (5) if needs_verification is true, ask "Are you still with [name], or would you like someone new?".`,
      url: `${baseUrl}/api/retell/get_customer_memory`,
      method: "POST",
      timeout_ms: 10000,
      speak_during_execution: false,
      speak_after_execution: false,
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description: "Caller's phone number — captured automatically from call metadata, pass it here"
          },
          industry: {
            type: "string",
            description: "Industry context to return the right memory fields"
          }
        },
        required: []
      }
    });

    // SMS confirmation tool (universal)
    tools.push({
      tool_id: "Confirmation",
      type: "custom",
      name: "Confirmation",
      description: "Send an SMS confirmation to the customer. Before calling this, ask: 'Is the phone number you're calling from the best number to reach you at?' If yes, omit preferred_phone. If no, collect their preferred number and pass it as preferred_phone.",
      url: `${baseUrl}/api/retell/send_sms_confirmation`,
      method: "POST",
      timeout_ms: 15000,
      speak_during_execution: true,
      speak_after_execution: false,
      execution_message_description: "Sending confirmation message...",
      parameters: {
        type: "object",
        properties: {
          message_type: {
            type: "string",
            description: "Type: order, reservation, appointment, cancellation, delivery, callback_request, modification"
          },
          details: {
            type: "string",
            description: "Human-readable summary of the confirmed action to include in the SMS"
          },
          preferred_phone: {
            type: "string",
            description: "Customer's preferred phone number for SMS — only include if they provided a different number than the one they are calling from"
          }
        },
        required: ["message_type", "details"]
      }
    });

    // Team SMS alert tool (modifications / cancellations)
    tools.push({
      tool_id: "Alert",
      type: "custom",
      name: "Alert",
      description: "Alert team members via SMS when a customer cancels, modifies, or has an urgent request. Call silently — do not mention to the customer.",
      url: `${baseUrl}/api/retell/sms_alert`,
      method: "POST",
      timeout_ms: 15000,
      speak_during_execution: false,
      speak_after_execution: false,
      parameters: {
        type: "object",
        properties: {
          alert_type: {
            type: "string",
            description: "Type: appointment_modified, reservation_modified, order_modified, cancellation, urgent_request, callback_request"
          },
          customer_name: { type: "string", description: "Customer name" },
          details: { type: "string", description: "What was changed or the reason for the alert" }
        },
        required: ["alert_type", "details"]
      }
    });

    // Transfer call tool (universal)
    tools.push({
      tool_id: "transfer_call",
      type: "custom",
      name: "transfer_call",
      description: "Transfer the call to a human team member when the customer requests it or the situation requires human judgement.",
      url: `${baseUrl}/api/retell/transfer_call`,
      method: "POST",
      timeout_ms: 30000,
      speak_during_execution: true,
      speak_after_execution: false,
      execution_message_description: "Transferring you now...",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Why the call is being transferred" },
          target_role: {
            type: "string",
            description: "Who to transfer to: 'default' (general), 'manager', 'owner', or 'specific' (named person)"
          },
          target_name: {
            type: "string",
            description: "Name of the specific person to connect to (only when target_role is 'specific')"
          },
          is_retry: {
            type: "boolean",
            description: "Set true if a previous transfer attempt already failed"
          }
        },
        required: ["reason", "target_role"]
      }
    });

    // Feedback / complaint logging (universal)
    tools.push({
      tool_id: "Add Note",
      type: "custom",
      name: "Add Note",
      description: "Log customer feedback, complaints, or compliments. Call silently — do not mention to the customer.",
      url: `${baseUrl}/api/retell/collect_feedback`,
      method: "POST",
      timeout_ms: 15000,
      speak_during_execution: false,
      speak_after_execution: false,
      parameters: {
        type: "object",
        properties: {
          feedback_type: { type: "string", description: "complaint, compliment, or suggestion" },
          feedback_text: { type: "string", description: "The customer's feedback in their own words" },
          customer_name: { type: "string", description: "Customer name if provided" }
        },
        required: ["feedback_type", "feedback_text"]
      }
    });

    // Calendar availability check (universal for booking industries)
    tools.push({
      tool_id: "check_availability",
      type: "custom",
      name: "check_availability",
      description: "Check if a specific date and time slot is available before booking any appointment, reservation, or event.",
      url: `${baseUrl}/api/retell/check_calendar_availability`,
      method: "POST",
      timeout_ms: 20000,
      speak_during_execution: true,
      speak_after_execution: false,
      execution_message_description: "Checking availability...",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          time: { type: "string", description: "Start time in HH:MM 24-hour format" },
          duration_minutes: { type: "number", description: "Duration in minutes (default 60 for most services)" },
          service_type: { type: "string", description: "Type of service being booked" }
        },
        required: ["date", "time"]
      }
    });

    // End call tool (universal)
    tools.push({
      tool_id: "end_call",
      type: "custom",
      name: "end_call",
      description: "End the current phone call gracefully after completing all customer requests or when the customer indicates they are done.",
      url: `${baseUrl}/api/retell/end_call`,
      method: "POST",
      timeout_ms: 10000,
      speak_during_execution: true,
      speak_after_execution: false,
      execution_message_description: "Ending the call / wrapping up",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Why the call is ending: completed, customer_request, no_response, transfer_complete" }
        },
        required: []
      }
    });

    // Industry-specific function tools with detailed parameter schemas
    const universalToolIds = ["Lookup", "Confirmation", "Alert", "transfer_call", "Add Note", "check_availability", "end_call"];
    for (const funcName of functionNames) {
      // Avoid duplicating tools already added above
      if (!universalToolIds.includes(funcName)) {
        tools.push(this.buildToolWithParameters(funcName, baseUrl, industry));
      }
    }

    return tools;
  }

  /**
   * Build a tool definition with full parameter schemas for each known function name.
   */
  private getIndustryExecutionMessage(funcName: string, industry: string): string {
    const messages: Record<string, Record<string, string>> = {
      book: {
        salon: "Booking your appointment / scheduling your beauty service",
        barbershop: "Booking your appointment / scheduling your haircut",
        medical: "Scheduling your appointment / booking your visit",
        'home-service': "Scheduling your service visit / booking your home service",
        'real-estate': "Scheduling your showing / booking your appointment",
        'professional-services': "Booking your consultation / scheduling your appointment",
        default: "Booking your appointment / scheduling your service"
      },
      reschedule: {
        salon: "Rescheduling your appointment / updating your beauty booking",
        barbershop: "Rescheduling your appointment / updating your haircut booking",
        medical: "Rescheduling your appointment / updating your visit",
        default: "Rescheduling your appointment / updating your booking"
      },
      cancel: {
        salon: "Cancelling your appointment / removing your booking",
        barbershop: "Cancelling your appointment / removing your booking",
        medical: "Cancelling your appointment / removing your scheduled visit",
        default: "Cancelling your appointment / removing your booking"
      },
      modify: {
        salon: "Updating your appointment details / modifying your service request",
        barbershop: "Updating your appointment / modifying your barber service",
        default: "Updating your appointment details / modifying your booking"
      },
      Update: {
        salon: "Saving your preferences / updating your stylist and service notes",
        barbershop: "Saving your preferences / updating your barber notes",
        default: "Saving your preferences / updating your profile notes"
      },
      create_reservation: {
        restaurant: "Making your reservation / booking your table",
        hotel: "Reserving your room / booking your stay",
        default: "Creating your reservation / booking your spot"
      },
      place_order: {
        restaurant: "Placing your order / processing your food request",
        default: "Placing your order / processing your request"
      },
      schedule_delivery: {
        restaurant: "Scheduling your delivery / arranging your order drop-off",
        default: "Scheduling your delivery / arranging delivery"
      },
      book_calendar_event: {
        restaurant: "Booking your event / scheduling your catering",
        hotel: "Booking your event / scheduling your venue",
        default: "Booking your event / scheduling your reservation"
      },
      prescription_refill: {
        medical: "Processing your refill request / submitting your prescription",
        default: "Processing your refill request"
      }
    };

    const funcMessages = messages[funcName];
    if (funcMessages) {
      return funcMessages[industry] || funcMessages['default'] || `Processing your ${funcName.replace(/_/g, ' ')}...`;
    }
    return `Processing your ${funcName.replace(/_/g, ' ')}...`;
  }

  /**
   * Build an industry-specific schema for the Update (update_customer_preferences) tool.
   * Covers four memory categories: Service History, Physical Needs, Communication, Personal Notes.
   */
  private buildUpdateToolSchema(industry: string): { description: string; parameters: any } {
    // Expiry windows per industry for time-sensitive fields (in days)
    const expiryWindows: Record<string, Record<string, number>> = {
      salon: { preferred_technician: 90, preferred_color_or_product: 180, upcoming_event: 30 },
      barbershop: { preferred_barber: 90, upcoming_event: 30 },
      restaurant: { upcoming_event: 30, favorite_items: 365 },
      healthcare: { insurance_provider: 365, preferred_provider: 365, upcoming_event: 30 },
      dentist: { insurance_provider: 365, last_appointment_type: 365, upcoming_event: 30 },
      auto: { vehicle_year: 730, vehicle_make: 730, vehicle_model: 730, recurring_services: 180 },
      veterinary: { medications: 180, vaccination_notes: 365, pet_age: 365 }
    };
    const industryExpiry = expiryWindows[industry] || {};
    const expiryDescription = Object.keys(industryExpiry).length > 0
      ? `Expiry windows for this industry: ${Object.entries(industryExpiry).map(([k, v]) => `${k} (${v} days)`).join(', ')}.`
      : '';

    // Common fields across all industries
    const commonProps: Record<string, any> = {
      customer_name: { type: "string", description: "Customer's full name" },
      preferred_phone: { type: "string", description: "Customer's preferred phone number for future SMS — only if different from their caller ID" },
      preferred_contact_method: { type: "string", description: "text, call, or email" },
      preferred_contact_time: { type: "string", description: "e.g. 'after 10am', 'weekday mornings'" },
      upcoming_event: { type: "string", description: "Any personal event they mentioned: wedding, vacation, birthday, graduation, etc. Clear this field by passing an empty string once the event date has likely passed." },
      upcoming_event_date: { type: "string", description: "Approximate date of the upcoming event in YYYY-MM-DD format — used to determine when to stop referencing it" },
      personal_notes: { type: "string", description: "Friendly personal details: names of kids/pets, recent trips, life updates they shared naturally in conversation" },
      consent_given: { type: "boolean", description: "Set true once the customer has explicitly agreed to have their preferences saved" },
      preference_override: { type: "boolean", description: "Set true when the customer explicitly requested something different from their stored 'usual' — signals that the usual should be updated" },
      booked_service: { type: "string", description: "The service that was just confirmed and booked in this call — used to record a booking entry and update confidence scoring. Pass this whenever a booking is completed." },
      booked_staff: { type: "string", description: "The staff member (technician, barber, doctor, etc.) assigned to the just-confirmed booking — optional but strongly recommended for accurate 'usual' detection." },
      booked_date: { type: "string", description: "Date of the just-confirmed booking in YYYY-MM-DD format — defaults to today if omitted." }
    };

    // Industry-specific memory fields
    const industryProps: Record<string, Record<string, any>> = {
      salon: {
        preferred_service: { type: "string", description: "Their usual service, e.g. 'UV Gel Manicure', 'Acrylic Fill', 'Dip Powder Pedicure'" },
        preferred_technician: { type: "string", description: "Their preferred technician or stylist name" },
        preferred_nail_shape: { type: "string", description: "e.g. Almond, Square, Coffin, Stiletto, Oval, Round" },
        preferred_color_or_product: { type: "string", description: "Specific polish color, brand, or product code they like (e.g. 'OPI Bubble Bath #NL L14')" },
        usual_day_and_time: { type: "string", description: "Their usual appointment day and time, e.g. 'Tuesdays at 2pm'" },
        allergies_or_sensitivities: { type: "string", description: "Any product allergies, skin sensitivities, or ingredients to avoid (e.g. latex, citrus, acrylics)" },
        drink_preference: { type: "string", description: "Water, tea, coffee, etc." }
      },
      barbershop: {
        preferred_service: { type: "string", description: "Their usual cut, e.g. 'Mid Fade with Lineup', 'Beard Trim'" },
        preferred_barber: { type: "string", description: "Their preferred barber's name" },
        preferred_style_notes: { type: "string", description: "Specific style details: length on top, fade level, beard length, etc." },
        usual_day_and_time: { type: "string", description: "Their usual appointment day and time" }
      },
      restaurant: {
        dietary_restrictions: { type: "string", description: "Allergies, dietary preferences: gluten-free, vegan, nut allergy, etc." },
        favorite_items: { type: "string", description: "Their go-to menu items or usual order" },
        preferred_seating: { type: "string", description: "indoor, outdoor, bar, booth, window, etc." },
        usual_order_type: { type: "string", description: "dine-in, takeout, or delivery" },
        drink_preference: { type: "string", description: "Their usual drink order" }
      },
      healthcare: {
        preferred_provider: { type: "string", description: "Their preferred doctor or provider name" },
        insurance_provider: { type: "string", description: "Their insurance plan name" },
        accessibility_needs: { type: "string", description: "Mobility aids, ground-floor requirement, language interpreter, etc." },
        preferred_appointment_type: { type: "string", description: "e.g. follow-up, routine checkup, telehealth" }
      },
      dentist: {
        insurance_provider: { type: "string", description: "Their dental insurance plan" },
        last_appointment_type: { type: "string", description: "cleaning, filling, crown, whitening, etc." },
        new_or_existing: { type: "string", description: "new or existing patient" },
        accessibility_needs: { type: "string", description: "Any special accessibility requirements" }
      },
      auto: {
        vehicle_year: { type: "string", description: "Vehicle year" },
        vehicle_make: { type: "string", description: "Vehicle make, e.g. Toyota" },
        vehicle_model: { type: "string", description: "Vehicle model, e.g. Camry" },
        recurring_services: { type: "string", description: "Services they get regularly, e.g. oil change every 3 months" },
        loaner_preference: { type: "string", description: "Whether they typically need a loaner or shuttle" }
      },
      veterinary: {
        pet_name: { type: "string", description: "Name of their pet" },
        pet_species: { type: "string", description: "dog, cat, bird, etc." },
        pet_breed: { type: "string", description: "Breed of the pet" },
        pet_age: { type: "string", description: "Age of the pet" },
        medications: { type: "string", description: "Any ongoing medications or health conditions" },
        vaccination_notes: { type: "string", description: "Vaccination status or upcoming vaccine needs" }
      }
    };

    const specificProps = industryProps[industry] || {
      preferred_service: { type: "string", description: "Their usual or preferred service" },
      preferred_staff: { type: "string", description: "Their preferred staff member" },
      usual_day_and_time: { type: "string", description: "Their usual appointment day and time" }
    };

    const industryLabel: Record<string, string> = {
      salon: "nail shape, color/product code, technician preference, allergies, usual service",
      barbershop: "style notes, preferred barber, usual service",
      restaurant: "dietary restrictions, favorite items, seating and order preferences",
      healthcare: "provider preference, insurance, accessibility needs",
      dentist: "insurance, appointment history, accessibility needs",
      auto: "vehicle details, recurring services, loaner preference",
      veterinary: "pet details, medications, vaccination status"
    };

    return {
      description: `Save or update a customer's preferences and notes for future visits. Covers four categories: (1) Service History — ${industryLabel[industry] || 'preferred service and staff'}; (2) Physical Needs — allergies, sensitivities, accessibility; (3) Communication — preferred contact method, time, phone; (4) Personal Notes — upcoming events, life details. ${expiryDescription} IMPORTANT: Before saving NEW preferences, ask consent and set consent_given: true. When the customer overrides their usual (requests something different), set preference_override: true and update the relevant field. Clear upcoming_event by passing an empty string once the event has passed.`,
      parameters: {
        type: "object",
        properties: {
          ...specificProps,
          ...commonProps
        },
        required: ["customer_name"]
      }
    };
  }

  private buildToolWithParameters(funcName: string, baseUrl: string, industry: string = 'restaurant'): any {
    // Map new native action names to their existing webhook URL paths
    const urlPathMap: Record<string, string> = {
      'book': 'book_appointment',
      'cancel': 'cancel_appointment',
      'reschedule': 'reschedule_appointment',
      'modify': 'modify_appointment',
      'Update': 'update_customer_preferences',
    };
    const urlPath = urlPathMap[funcName] || funcName;
    const base = {
      tool_id: funcName,
      type: "custom",
      name: funcName,
      url: `${baseUrl}/api/retell/${urlPath}`,
      method: "POST",
      timeout_ms: 30000,
      speak_during_execution: true,
      speak_after_execution: true,
      execution_message_description: this.getIndustryExecutionMessage(funcName, industry)
    };

    // Use industry-specific schema from retellFunctionsConfig when available
    const industryConfig = RETELL_FUNCTIONS_BY_INDUSTRY[industry as Industry];
    const industryFunc = industryConfig?.functions.find(f => f.name === funcName);
    if (industryFunc?.parameters) {
      return {
        ...base,
        description: industryFunc.description,
        parameters: industryFunc.parameters
      };
    }

    // Generic fallback schemas for functions not in industry config
    const schemas: Record<string, { description: string; parameters: any }> = {
      place_order: {
        description: "Place a food or product order for pickup, delivery, or dine-in",
        parameters: {
          type: "object",
          properties: {
            order_type: { type: "string", enum: ["pickup", "delivery", "dine-in"], description: "How the customer wants to receive their order" },
            items: {
              type: "array",
              description: "All ordered items",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  quantity: { type: "number" },
                  price: { type: "number" },
                  customizations: { type: "string", description: "Modifications or special requests for this item" }
                },
                required: ["item_name", "quantity"]
              }
            },
            delivery_address: { type: "string", description: "Full delivery address (required for delivery orders)" },
            customer_name: { type: "string" },
            special_instructions: { type: "string" },
            estimated_total: { type: "number", description: "Estimated total in dollars" }
          },
          required: ["order_type", "items"]
        }
      },
      create_reservation: {
        description: "Create a table reservation",
        parameters: {
          type: "object",
          properties: {
            customer_name: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD" },
            reservation_time: { type: "string", description: "HH:MM 24-hour — this is the START time" },
            party_size: { type: "number" },
            special_requests: { type: "string", description: "e.g. birthday, high chair, dietary needs, seating preference" }
          },
          required: ["customer_name", "date", "reservation_time", "party_size"]
        }
      },
      book: {
        description: "Book a service appointment",
        parameters: {
          type: "object",
          properties: {
            customer_name: { type: "string" },
            service_type: { type: "string", description: "Type of service requested" },
            date: { type: "string", description: "YYYY-MM-DD" },
            time: { type: "string", description: "HH:MM 24-hour — START time" },
            duration_minutes: { type: "number" },
            staff_preference: { type: "string" },
            notes: { type: "string" }
          },
          required: ["customer_name", "service_type", "date", "time"]
        }
      },
      reschedule: {
        description: "Move an existing appointment to a new date/time",
        parameters: {
          type: "object",
          properties: {
            customer_name: { type: "string" },
            original_date: { type: "string", description: "YYYY-MM-DD" },
            original_time: { type: "string" },
            new_date: { type: "string", description: "YYYY-MM-DD" },
            new_time: { type: "string", description: "HH:MM 24-hour" },
            reason: { type: "string" }
          },
          required: ["customer_name", "new_date", "new_time"]
        }
      },
      cancel: {
        description: "Cancel an existing appointment",
        parameters: {
          type: "object",
          properties: {
            customer_name: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD" },
            time: { type: "string" },
            reason: { type: "string" }
          },
          required: ["customer_name"]
        }
      },
      schedule_delivery: {
        description: "Schedule a delivery",
        parameters: {
          type: "object",
          properties: {
            customer_name: { type: "string" },
            delivery_address: { type: "string" },
            items: { type: "string", description: "Description of items to deliver" },
            scheduled_time: { type: "string" },
            special_instructions: { type: "string" }
          },
          required: ["delivery_address", "items"]
        }
      },
      book_calendar_event: {
        description: "Book a catering order or special event",
        parameters: {
          type: "object",
          properties: {
            event_type: { type: "string", description: "wedding, corporate, birthday, etc." },
            customer_name: { type: "string" },
            event_date: { type: "string", description: "YYYY-MM-DD" },
            start_time: { type: "string", description: "HH:MM 24-hour — START time of the event" },
            guest_count: { type: "number" },
            location: { type: "string" },
            menu_preferences: { type: "string" },
            notes: { type: "string" }
          },
          required: ["customer_name", "event_date", "guest_count"]
        }
      },
      prescription_refill: {
        description: "Submit a prescription refill request",
        parameters: {
          type: "object",
          properties: {
            patient_name: { type: "string" },
            date_of_birth: { type: "string" },
            medication_name: { type: "string" },
            dosage: { type: "string" },
            pharmacy_name: { type: "string" },
            pharmacy_location: { type: "string" }
          },
          required: ["patient_name", "medication_name"]
        }
      },
      modify: {
        description: "Modify details of an existing appointment",
        parameters: {
          type: "object",
          properties: {
            customer_name: { type: "string" },
            original_date: { type: "string", description: "YYYY-MM-DD" },
            original_time: { type: "string" },
            modification_type: { type: "string", description: "time, service, staff, or notes" },
            new_value: { type: "string" }
          },
          required: ["customer_name", "modification_type", "new_value"]
        }
      },
      Update: this.buildUpdateToolSchema(industry)
    };

    const specific = schemas[funcName];
    if (specific) {
      return { ...base, ...specific };
    }

    return {
      ...base,
      description: `Execute ${funcName.replace(/_/g, ' ')}`,
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string" },
          details: { type: "string", description: "Relevant details for this action" }
        },
        required: []
      }
    };
  }

  async createConversationFlow(business: BusinessInfo, knowledgeBaseId?: string, userId?: string, industry?: string): Promise<ConversationFlow> {
    let targetIndustry = industry || business.industry || 'restaurant';
    let conversationFlowPayload: any = null;
    try {
      // Determine industry (fallback to business.industry or 'restaurant')
      console.log(`🗣️ Creating conversation flow for: ${business.businessName} (Industry: ${targetIndustry})`);

      // Get industry-specific template
      const template = getNodeTemplateForIndustry(targetIndustry);
      console.log(`📋 Using template for ${template.industry} industry with ${template.serviceNodes.length} service nodes`);

      // Format menu for display in conversation flow - handle different menu formats
      let menuText = 'Full menu with prices, item modifiers, dietary options, specials, availability per time/day, allergen info';
      if (business.menu) {
        if (Array.isArray(business.menu)) {
          // Handle array format
          menuText = business.menu.map((item: any) => 
            `${item.item || item.name} - $${item.price}${item.description ? ' (' + item.description + ')' : ''}`
          ).join(', ');
        } else if (typeof business.menu === 'string') {
          // Handle string format
          menuText = business.menu;
        } else if (business.menu.menuItems && Array.isArray(business.menu.menuItems)) {
          // Handle object with menuItems array
          menuText = business.menu.menuItems.map((item: any) => 
            `${item.name || item.item} - $${item.price}${item.description ? ' (' + item.description + ')' : ''}`
          ).join(', ');
        }
      }

      // Format FAQ for conversation flow - handle both string and array formats
      let faqText = 'Common questions include hours, menu items, dietary options, wait times, allergy info, parking.';
      
      if (business.faq) {
        if (Array.isArray(business.faq)) {
          // Handle array format with Q&A objects
          faqText = business.faq.map((item: any) => 
            `Q: ${item.q || item.question} A: ${item.a || item.answer}`
          ).join(' | ');
        } else if (typeof business.faq === 'string') {
          // Handle string format - convert to a more structured format
          const faqQuestions = business.faq.split(',').map(item => item.trim()).filter(item => item.length > 0);
          if (faqQuestions.length > 0) {
            faqText = faqQuestions.map(question => `Q: ${question} A: Please contact us for details.`).join(' | ');
          } else {
            faqText = business.faq;
          }
        }
      }

      // Convert business hours to full words format without abbreviations
      const formatBusinessHours = (hours: any): string => {
        if (!hours) return 'Please call for current hours';
        
        // Ensure hours is a string
        if (typeof hours !== 'string') {
          // If it's an object, try to stringify it or return default
          if (typeof hours === 'object') {
            return 'Please call for current hours';
          }
          // Convert to string if it's another type
          hours = String(hours);
        }

        // Convert common abbreviations to full words using word boundaries to prevent double-replacement
        return hours
          .replace(/\bMon\b/gi, 'Monday')
          .replace(/\bTue\b/gi, 'Tuesday') 
          .replace(/\bWed\b/gi, 'Wednesday')
          .replace(/\bThu\b/gi, 'Thursday')
          .replace(/\bFri\b/gi, 'Friday')
          .replace(/\bSat\b/gi, 'Saturday')
          .replace(/\bSun\b/gi, 'Sunday')
          .replace(/(\d+)(AM|PM)/gi, '$1 $2')
          .replace(/-/g, ' to ')
          .replace(/\b(\d{1,2})\s*(AM|PM)\b/gi, (match, hour, period) => {
            // Convert to verbose format: "11 AM" becomes "eleven AM"
            const numbers = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
            const hourNum = parseInt(hour);
            return `${numbers[hourNum] || hour} ${period}`;
          });
      };

      // Convert phone number to digit-by-digit format
      const formatPhoneForSpeech = (phone: any): string => {
        if (!phone) return 'Phone available upon request';

        // Handle array of phone numbers — use the first one
        if (Array.isArray(phone)) {
          phone = phone[0] || '';
        }

        // Ensure it's a string
        if (typeof phone !== 'string') {
          phone = String(phone);
        }

        // Remove all non-digit characters and convert each digit to words
        const digits = phone.replace(/\D/g, '');
        const digitWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

        return digits.split('').map(digit => digitWords[parseInt(digit)] || digit).join(' ');
      };

      // Convert services object to string format
      const formatServices = (services: any): string => {
        if (!services) return "dine-in, takeout, delivery, catering, reservations, curbside pickup";
        
        if (typeof services === 'string') return services;
        
        if (typeof services === 'object') {
          const availableServices = [];
          if (services.dineIn) availableServices.push('dine-in');
          if (services.takeout) availableServices.push('takeout');
          if (services.delivery) availableServices.push('delivery');
          if (services.catering) availableServices.push('catering');
          if (services.reservations) availableServices.push('reservations');
          if (services.curbsidePickup) availableServices.push('curbside pickup');
          if (services.driveThru) availableServices.push('drive-thru');
          
          return availableServices.length > 0 ? availableServices.join(', ') : "dine-in, takeout, delivery";
        }
        
        return "dine-in, takeout, delivery, catering, reservations, curbside pickup";
      };

      // Convert delivery platforms object to string format
      const formatDeliveryPlatforms = (platforms: any): string => {
        if (!platforms) return "Uber Eats, DoorDash, Grubhub";
        
        if (typeof platforms === 'string') return platforms;
        
        if (typeof platforms === 'object') {
          const availablePlatforms = [];
          if (platforms.uberEats) availablePlatforms.push('Uber Eats');
          if (platforms.doorDash) availablePlatforms.push('DoorDash');
          if (platforms.grubhub) availablePlatforms.push('Grubhub');
          if (platforms.postmates) availablePlatforms.push('Postmates');
          if (platforms.seamless) availablePlatforms.push('Seamless');
          return availablePlatforms.length > 0 ? availablePlatforms.join(', ') : "Direct delivery available";
        }
        
        return "Uber Eats, DoorDash, Grubhub";
      };

      // Log business information being used for conversation flow
      console.log(`🗣️ Creating conversation flow with business information:`);
      console.log(`📋 Business name: ${business.businessName || business.name}`);
      console.log(`📋 Business address: ${business.businessAddress || business.physicalAddress || business.address}`);
      console.log(`📋 Business phone: ${business.phoneNumber || business.phone}`);
      
      // Helper methods for formatting onboarding data
      const formatOperatingHours = (hours: any): string => {
        if (!hours || typeof hours !== 'object') return 'Please call for current hours';

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const formatted = days.map(day => {
          const dayData = hours[day];
          if (!dayData) return `${day.charAt(0).toUpperCase() + day.slice(1)}: Please call`;
          if (dayData.closed) return `${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`;
          return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayData.open} to ${dayData.close}`;
        });

        return formatted.join(', ');
      };

      const formatReservationPolicy = (policy: string): string => {
        if (!policy) return 'Reservations are welcome. Please call to make a reservation with date, time, and party size.';

        switch (policy) {
          case 'recommended': return 'Reservations are recommended. Please call ahead to secure your table.';
          case 'required': return 'Reservations are required. Please call to book your table in advance.';
          case 'walkinsonly': return 'We operate on a walk-in basis only. No reservations required.';
          default: return policy;
        }
      };

      const formatPaymentOptions = (options: any): string => {
        if (!options || typeof options !== 'object') return 'We accept cash and card payments';

        const accepted = [];
        if (options.card) accepted.push('credit and debit cards');
        if (options.cash) accepted.push('cash');
        if (options.app) accepted.push('mobile app payments');
        if (options.giftCards) accepted.push('gift cards');

        return accepted.length > 0 ? `We accept ${accepted.join(', ')}` : 'Please ask about payment options';
      };

      // Fetch custom integrations and convert them to tools
      let customTools: any[] = [];
      if (userId && this.storage) {
        customTools = await this.convertCustomIntegrationsToTools(userId);
        console.log(`📦 Loaded ${customTools.length} custom integration tools`);
      }

      // Build tools from industry-specific functions
      const functionNames = template.serviceNodes
        .filter(node => node.functionName)
        .map(node => node.functionName!);
      const baseUrl = resolveBaseUrl();
      const industryTools = this.buildToolsFromFunctions(functionNames, baseUrl, targetIndustry);
      console.log(`🔧 Built ${industryTools.length} industry-specific tools for ${targetIndustry}`);

      // Generate receptionist name once — used in both the greeting node instruction
      // and the global_prompt so the AI knows its own name from every angle.
      const receptionistName = generateReceptionistName();
      console.log(`👤 Assigned receptionist name: ${receptionistName}`);

      // Build nodes dynamically from template
      const dynamicNodes = this.buildNodesFromTemplate(template, business, receptionistName);
      console.log(`📐 Built ${dynamicNodes.length} conversation flow nodes for ${targetIndustry}`);

      // Using the updated conversation flow template with tools architecture
      conversationFlowPayload = {
        "start_node_id": "greeting",
        "global_prompt": this.buildIndustryGlobalPrompt(targetIndustry, business, receptionistName),
        "start_speaker": "agent",
        "model_choice": {
          "type": "cascading",
          "model": "gpt-5.1"
        },
        "model_temperature": 0.7,
        ...(knowledgeBaseId && { knowledge_base_ids: [knowledgeBaseId] }),
        "default_dynamic_variables": {
          // Core business information from onboarding
          "company_name": business.businessName || business.name || "Restaurant",
          "industry": business.industry || "Restaurant",
          "address": business.physicalAddress || business.businessAddress || business.address || `${business.businessName || business.name || 'Restaurant'} Location`,
          "phone_number": formatPhoneForSpeech(business.phoneNumber || business.phone || "Please contact us for our phone number"),
          "website": business.website || business.businessUrls?.[0] || `www.${(business.businessName || business.name || 'restaurant').toLowerCase().replace(/\s+/g, '')}.com`,
          "email": business.email || `info@${(business.businessName || business.name || 'restaurant').toLowerCase().replace(/\s+/g, '')}.com`,
          "social_media": business.socialMedia || "Follow us on social media for updates",
          "key_staff": business.keyStaffContacts || business.keyStaff || business.staff || "Our friendly and professional staff ready to serve you",

          // Operating hours from onboarding
          "business_hours": formatBusinessHours(typeof business.operatingHours === 'object' ? formatOperatingHours(business.operatingHours) : business.businessHours || business.operatingHours || "Please contact us for current hours"),
          "peak_hours": business.peakHours || "Please call ahead during busy times",

          // Services from onboarding
          "services": formatServices(business.services),
          "table_turnover_minutes": business.tableTurnoverTime || business.tableTurnover || "60",

          // Menu and pricing from onboarding
          "menu": menuText || business.menuText || business.menuItems || business.menu || "Please ask about our current menu items and pricing",
          "dietary_options": business.dietaryOptions || business.dietaryAccommodations || "Please ask about dietary accommodations",
          "popular_items": business.popularItems || business.recommendedItems || "Ask about our popular items",
          "allergen_info": business.allergenInfo || "Please inform us of any allergies",
          "item_modifiers": business.itemModifiers || "Most items can be customized",

          // Reservations from onboarding
          "reservation_policy": formatReservationPolicy(business.reservationPolicy) || business.reservations || "Reservations are welcome. Please call to make a reservation with date, time, and party size.",
          "max_party_size": business.maxPartySize || "10",
          "waitlist_management": business.waitlistManagement ? "true" : "false",

          // Ordering and payment from onboarding
          "ordering_policy": business.orderingPolicy || business.ordering || "We accept takeout and delivery orders.",
          "payment_options": formatPaymentOptions(business.paymentOptions) || "We accept cash and card payments",
          "payment_policies": business.paymentPolicies || "Payment required upon order",
          "tips_gratuity": business.tipsGratuity || "Gratuity is appreciated",

          // Delivery and third-party integration from onboarding
          "delivery_platforms": formatDeliveryPlatforms(business.deliveryPlatforms),
          "preferred_delivery_partner": business.preferredDeliveryPartner || business.preferredDelivery || "Please ask about our delivery options",
          "delivery_eta_fees": business.deliveryETAFees || "Delivery fees and timing vary by location",

          // Catering from onboarding
          "catering": business.cateringMenu || business.catering || business.cateringServices || "Ask about our catering options for events and groups",
          "minimum_order_size": business.minimumOrderSize || "20",
          "catering_delivery": business.cateringDelivery || "both",
          "customizable_items": business.customizableItems || "Many items can be customized for events",

          // Customer interaction and FAQ from onboarding
          "faq": faqText || business.commonQuestions || "Common questions include hours, menu items, dietary options, wait times, allergy info, parking",
          "allergies_accessibility": business.allergiesAccessibility || business.allergyInfo || "Please inform us of any allergies or accessibility needs",
          "loyalty_rewards": business.loyaltyRewards || business.loyaltyPoints || "Ask about our loyalty program",
          "refund_policy": business.refundPolicy || "Please ask about our refund policy",

          // Promotions from onboarding
          "promotions": business.promotionsCoupons || business.specialsPromotions || business.promotions || business.specials || "Ask about our current promotions and specials",
          "current_campaigns": business.currentCampaigns || "Ask about our current offers",
          "birthday_packages": business.birthdayPackages || business.birthdayAnniversary || "Ask about birthday celebrations",

          // Policies and toggles from onboarding
          "allow_order_modifications": business.allowModifications !== false ? "true" : "false",
          "allow_payment_by_phone": business.paymentByPhone || business.paymentByPhoneEnabled ? "true" : "false",
          "allow_call_transfer": business.policies?.callTransfer !== false ? "true" : "false",
          "multi_language_support": business.policies?.multiLanguage ? "true" : "false",

          // Special notes and ambiance from onboarding
          "special_notes": business.features || business.businessDescription || business.description || `Welcome to ${business.businessName || business.name || 'our restaurant'}! We provide quality service and great food.`,
          "ambiance": business.ambiance || "casual",
          "noise_level": business.noiseLevel || "comfortable",
          "events_live_music": business.eventsLiveMusic || "Ask about our events and live music",
          "vip_perks": business.vipPerks || "Ask about VIP benefits",

          // Real-time operational details from onboarding
          "dynamic_capacity": business.dynamicCapacity !== false ? "true" : "false",
          "live_wait_times": business.liveWaitTime !== false ? "true" : "false",
          "table_availability": business.tableAvailability !== false ? "true" : "false",
          "staff_availability": business.staffAvailability ? "tracked for optimal service" : "available during business hours",
          "average_prep_times": business.avgPrepTimes || "Preparation times vary by item",
          "wait_times": business.waitTimes !== false ? "true" : "false",

          // System settings
          "receptionist_name": receptionistName,
          "after_hours_message": business.afterHoursMessage || `Hello. Thank you for calling ${business.businessName || business.name || 'us'}. We are currently closed. How may I assist you?`,
          "interaction_style": business.interactionStyle || "friendly",
          "vip_greeting": business.vipGreeting || "Welcome back, valued customer!",
          "current_marketing_campaigns": "true",
          "pos_webhook_enabled": "true",
          "kitchen_ticket_integration": "true",
          "delivery_eta_tracking": "true",
          "reservation_table_mapping": "true",
          "after_hours_toggle": "true"
        },
        "tools": [
          // Industry-specific tools built dynamically
          ...industryTools,
          // Custom integration tools from the UI
          ...customTools
        ],
        "nodes": dynamicNodes
      };

      // Ensure all default_dynamic_variables values are strings (Retell requirement)
      const dv = conversationFlowPayload.default_dynamic_variables;
      Object.keys(dv).forEach(key => {
        if (typeof dv[key] !== 'string') {
          dv[key] = String(dv[key]);
        }
      });

      // Debug: log tool IDs to verify tool_id is present on all tools (no PII)
      const toolDebug = conversationFlowPayload.tools.map((t: any) => ({ tool_id: t.tool_id, name: t.name, has_tool_id: !!t.tool_id }));
      console.log(`🔑 Tools debug (${toolDebug.length} tools):`, JSON.stringify(toolDebug));
      const missingToolId = toolDebug.filter((t: any) => !t.has_tool_id);
      if (missingToolId.length > 0) {
        console.error(`❌ ${missingToolId.length} tool(s) missing tool_id:`, missingToolId.map((t: any) => t.name));
      }

      console.log(`📡 Calling Retell API: POST https://api.retellai.com/create-conversation-flow`);
      console.log(`🔍 model_choice being sent:`, JSON.stringify(conversationFlowPayload.model_choice));

      const response = await axios.post('https://api.retellai.com/create-conversation-flow', conversationFlowPayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const flowResponse = response.data;
      console.log(`✅ Successfully created conversation flow: ${flowResponse.conversation_flow_id}`);

      return {
        id: flowResponse.conversation_flow_id,
        name: `${business.businessName} AI Receptionist Flow`
      };

    } catch (error: any) {
      console.error('❌ Failed to create conversation flow');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Industry:', targetIndustry);
      console.error('❌ Business name:', business.businessName);

      // Log more details about the payload structure for debugging
      if (error.response?.status === 400) {
        console.error('❌ Payload validation failed - check Retell API requirements');
        console.error('❌ Nodes count:', conversationFlowPayload?.nodes?.length);
        console.error('❌ Tools count:', conversationFlowPayload?.tools?.length);
        console.error('❌ Start node ID:', conversationFlowPayload?.start_node_id);
      }

      throw new Error(`Failed to create conversation flow: ${error.response?.data?.error_message || error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Patch an existing conversation flow to attach a knowledge base.
   * Called after KB creation since Retell requires the flow to exist first.
   */
  async linkKnowledgeBaseToConversationFlow(conversationFlowId: string, knowledgeBaseId: string): Promise<void> {
    try {
      console.log(`🔗 Linking knowledge base ${knowledgeBaseId} to conversation flow ${conversationFlowId}`);
      await axios.patch(
        `https://api.retellai.com/update-conversation-flow/${conversationFlowId}`,
        { knowledge_base_ids: [knowledgeBaseId] },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`✅ Knowledge base linked to conversation flow`);
    } catch (error: any) {
      console.error(`❌ Failed to link knowledge base to conversation flow: ${error.response?.data?.error_message || error.message}`);
      throw error;
    }
  }

  /**
   * Rebuild an existing conversation flow with the latest industry-specific template.
   * Called when resuming a partially-completed provisioning run so that existing flows
   * get the receptionist-name greeting and "calling on a recorded line" language even
   * if they were created by an older code path.
   */
  async rebuildConversationFlowNodes(
    conversationFlowId: string,
    business: BusinessInfo,
    knowledgeBaseId?: string,
    industry?: string
  ): Promise<void> {
    try {
      const targetIndustry = industry || business.industry || 'restaurant';
      console.log(`🔄 Rebuilding conversation flow nodes for ${conversationFlowId} (industry: ${targetIndustry})`);

      const template = getNodeTemplateForIndustry(targetIndustry);
      const receptionistName = generateReceptionistName();
      console.log(`👤 Assigned receptionist name: ${receptionistName}`);
      const dynamicNodes = this.buildNodesFromTemplate(template, business, receptionistName);

      const functionNames = template.serviceNodes
        .filter(node => node.functionName)
        .map(node => node.functionName!);
      const baseUrl = resolveBaseUrl();
      const industryTools = this.buildToolsFromFunctions(functionNames, baseUrl, targetIndustry);

      const patchPayload: any = {
        nodes: dynamicNodes,
        tools: industryTools,
        global_prompt: this.buildIndustryGlobalPrompt(targetIndustry, business, receptionistName),
        default_dynamic_variables: {
          receptionist_name: receptionistName,
          company_name: business.businessName || business.name || 'Business',
        },
      };

      if (knowledgeBaseId) {
        patchPayload.knowledge_base_ids = [knowledgeBaseId];
      }

      await axios.patch(
        `https://api.retellai.com/update-conversation-flow/${conversationFlowId}`,
        patchPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`✅ Conversation flow ${conversationFlowId} rebuilt with latest template`);
    } catch (error: any) {
      console.error(`❌ Failed to rebuild conversation flow nodes: ${error.response?.data?.error_message || error.message}`);
      throw error;
    }
  }

  /**
   * Retell AI does not expose a folder management REST API (as of SDK v4.47).
   * Agent names already encode the business name, which is sufficient for
   * identification inside the Retell dashboard.
   * @deprecated No-op — kept so call-sites compile without changes.
   */
  async createFolder(folderName: string): Promise<{ folder_id: string; folder_name: string }> {
    console.log(`📁 Retell folder API not available — agent will be identified by name instead of folder (business: ${folderName})`);
    // Return a sentinel so callers that check for a result still work, but
    // the folder_id will simply be omitted from the create-agent call below.
    return { folder_id: '', folder_name: folderName };
  }

  /**
   * Create an agent with a conversation flow (new approach)
   */
  private async createAgentWithConversationFlow(config: VoiceAgentConfig, userId?: string, knowledgeBaseId?: string, industry?: string, folderId?: string): Promise<VoiceAgent> {
    try {
      console.log(`🗣️ Creating agent with conversation flow: ${config.conversationFlowId}`);

      // Create webhook URL
      const webhookUrl = `${resolveBaseUrl()}/api/webhooks/retell`;

      // Get industry-specific post-call analysis
      const targetIndustry = (industry || config.industry || 'restaurant') as Industry;
      const industryCallTypes = getCallTypesForIndustry(targetIndustry);
      let callTypeChoices = industryCallTypes.map((ct: any) => ct.label);
      if (callTypeChoices.length === 0) {
        callTypeChoices = ['General Inquiry', 'Customer Service', 'Information Request', 'Other'];
      }
      const postCallAnalysisData = [
        { type: "string", name: "call_summary", description: "Detailed summary of the call including customer request, actions taken, and outcome" },
        { type: "enum", name: "service_type", description: "Type of service requested by customer", choices: callTypeChoices },
        { type: "string", name: "call_outcome", description: "Specific outcome of the call (e.g., 'Reservation Booked', 'Order Placed', 'Information Provided', 'Transferred to Staff', 'Customer Hung Up', 'Issue Resolved', etc.)" },
        { type: "enum", name: "sentiment", description: "Customer sentiment during the call", choices: ["Positive", "Neutral", "Negative"] },
        { type: "boolean", name: "call_successful", description: "Whether the customer's request was successfully handled" },
        { type: "string", name: "customer_name", description: "Name of the customer if provided" },
        { type: "number", name: "order_amount", description: "Total dollar amount if an order was placed" }
      ];

      // Build agent payload with conversation flow response engine
      const agentPayload: any = {
        agent_name: config.businessName || 'AI Receptionist',
        voice_id: config.voiceId || "11labs-Hailey",
        voice_temperature: 0.7,
        voice_speed: 1,
        language: config.language || "en-US",

        // Use conversation-flow response engine
        response_engine: {
          type: "conversation-flow",
          conversation_flow_id: config.conversationFlowId
        },

        webhook_url: webhookUrl,
        post_call_analysis_data: postCallAnalysisData,
        post_call_analysis_model: "gpt-5.4-nano",

        // Agent behavior settings
        responsiveness: 1,
        interruption_sensitivity: 1,
        enable_backchannel: false,
        backchannel_frequency: 0,
        backchannel_words: [],
        normalize_for_speech: true,
        end_call_after_silence_ms: 600000,
        max_call_duration_ms: 3600000,

        // Note: Retell API does not accept a folder_id on create-agent (no folder API exists)
      };

      console.log(`📡 Creating agent with conversation flow...`);
      console.log(`   - Name: ${agentPayload.agent_name}`);
      console.log(`   - Voice: ${agentPayload.voice_id}`);
      console.log(`   - Language: ${agentPayload.language}`);
      console.log(`   - Response Engine: conversation-flow`);
      console.log(`   - Conversation Flow ID: ${config.conversationFlowId}`);

      // Create agent via Retell API
      const response = await axios.post('https://api.retellai.com/create-agent', agentPayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const agentResponse = response.data;
      console.log(`✅ Successfully created agent with conversation flow: ${agentResponse.agent_id}`);

      return {
        id: agentResponse.agent_id,
        name: agentResponse.agent_name || agentPayload.agent_name,
        phoneNumber: config.phoneNumber,
        status: 'active',
        provider: 'retell',
        conversationFlowId: config.conversationFlowId,  // Store conversation flow ID instead of LLM ID
        createdAt: new Date(),
        updatedAt: new Date()
      };

    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Failed to create agent with conversation flow');
      throw new Error(`Failed to create agent with conversation flow: ${error.response?.data?.message || error.message}`);
    }
  }

  async createAgent(config: VoiceAgentConfig, userId?: string, knowledgeBaseId?: string, industry?: string, folderId?: string): Promise<VoiceAgent> {
    try {
      console.log(`🤖 Creating Retell AI agent for: ${config.businessName}`);
      if (knowledgeBaseId) {
        console.log(`📚 Agent will be linked to knowledge base: ${knowledgeBaseId}`);
      }
      if (folderId) {
        console.log(`📁 Agent will be placed in folder: ${folderId}`);
      }

      // Check if conversation flow ID is provided
      if (config.conversationFlowId) {
        console.log(`🗣️ Using conversation flow: ${config.conversationFlowId}`);
        return await this.createAgentWithConversationFlow(config, userId, knowledgeBaseId, industry, folderId);
      }

      // Otherwise, use the legacy LLM-based approach
      console.log(`📝 Using legacy LLM-based approach for agent creation`);

      // Build general prompt from config
      const generalPrompt = this.buildGeneralPromptForLLM(config);

      // Create webhook URL
      const webhookUrl = `${resolveBaseUrl()}/api/webhooks/retell`;

      // Build dynamic variables from business config
      const dynamicVariables = this.buildDynamicVariables(config);

      // Step 1: Create Retell LLM (required for retell-llm engine)
      console.log(`📝 Creating Retell LLM for: ${config.businessName}`);

      // Build tools: use custom functions from config if provided, otherwise use default tools
      let tools: any[];

      // DEBUG: Log customFunctions status
      console.log('🔍 DEBUG customFunctions check:', {
        exists: !!config.customFunctions,
        length: config.customFunctions?.length || 0,
        type: typeof config.customFunctions,
        isArray: Array.isArray(config.customFunctions),
        functions: config.customFunctions?.map(f => f.name).slice(0, 5) || [],
        industry: config.industry
      });

      if (config.customFunctions && config.customFunctions.length > 0) {
        // Use industry-specific custom functions if provided
        console.log(`🎯 Processing ${config.customFunctions.length} functions for ${config.industry || 'business'}`);

        // Create base URL for custom function webhooks
        const baseUrl = webhookUrl.replace('/api/webhooks/retell', '');

        // Separate built-in Retell functions from custom functions
        const customFuncs: any[] = [];

        // Check if transfer is enabled in business settings
        const businessSettingsData = userId ? await this.storage.getBusinessSettings(userId) : null;
        const transferEnabled = businessSettingsData?.enableTransfer !== false; // Default to true if not set

        config.customFunctions.forEach(func => {
          if (func.name === 'transfer_call') {
            // Only add transfer_call if enabled in business settings
            if (transferEnabled) {
              console.log(`📞 Adding transfer_call as custom webhook function`);
              const customFunctionUrl = `${baseUrl}/api/retell/transfer_call`;
              customFuncs.push({
                type: 'custom',
                name: 'transfer_call',
                description: func.description || 'Transfer the call to a human agent when the customer requests to speak with someone, is frustrated, angry, or has a complex issue that requires human assistance',
                url: customFunctionUrl,
                speak_during_execution: false,
                speak_after_execution: false,
                parameters: func.parameters || {
                  type: 'object',
                  properties: {
                    reason: { type: 'string', description: 'Reason for transferring the call' },
                    customer_phone: { type: 'string', description: 'Customer phone number' }
                  },
                  required: ['reason']
                }
              });
            } else {
              console.log(`⚠️ Transfer call disabled in business settings - skipping`);
            }
          } else {
            // Add ALL functions as custom webhooks (including SMS functions)
            const customFunctionUrl = `${baseUrl}/api/retell/${func.name}`;
            console.log(`🔧 Adding custom function: ${func.name} → ${customFunctionUrl}`);
            // Use the function name formatted as a human-readable title for the Retell description.
            // This is what shows as the action title in the UI. The verbose config description
            // is too long and would appear as the title for new users.
            const functionTitle = func.name
              .split('_')
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
            customFuncs.push({
              type: 'custom',
              name: func.name,
              description: functionTitle,
              url: customFunctionUrl,
              speak_during_execution: false,
              speak_after_execution: true,
              parameters: func.parameters || {
                type: 'object',
                properties: {},
                required: []
              }
            });
          }
        });

        // Set tools to custom functions only
        tools = customFuncs;
        console.log(`🔧 Agent will have ${customFuncs.length} custom webhook functions`);
      } else {
        // Fall back to default tools
        const defaultTools = this.buildGeneralTools(webhookUrl);
        const customTools = userId ? await this.convertCustomIntegrationsToTools(userId) : [];
        tools = [...defaultTools, ...customTools];
        console.log(`🔧 Agent will have ${defaultTools.length} default tools + ${customTools.length} custom integration tools`);
      }

      const llmPayload = {
        model: config.model || "gpt-5-mini",
        begin_message: config.firstMessage || "",  // Empty to allow AI to call get_customer_memory first and greet dynamically
        general_prompt: generalPrompt,
        general_tools: tools,
        start_speaker: "agent",
        ...(knowledgeBaseId && { knowledge_base_ids: [knowledgeBaseId] })
      };

      console.log('📝 LLM payload being sent:', JSON.stringify(llmPayload, null, 2));

      let llmResponse;
      try {
        llmResponse = await axios.post('https://api.retellai.com/create-retell-llm', llmPayload, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (llmError: any) {
        console.error('❌ Failed to create Retell LLM:');
        console.error('Status:', llmError.response?.status);
        console.error('Status Text:', llmError.response?.statusText);
        console.error('Error Data:', JSON.stringify(llmError.response?.data, null, 2));
        console.error('Error Message:', llmError.message);
        throw new Error(`Failed to create Retell LLM: ${llmError.response?.data?.message || llmError.message}`);
      }

      const llmId = llmResponse.data.llm_id;
      console.log(`✅ Created Retell LLM: ${llmId}`);

      // Step 2: Create single-prompt agent using the LLM
      const finalPayload: any = {
        agent_name: config.businessName || 'AI Receptionist',
        voice_id: config.voiceId || "11labs-Hailey",
        voice_temperature: 0.7,
        voice_speed: 1,
        language: config.language || "en-US",

        // Use retell-llm response engine
        response_engine: {
          type: "retell-llm",
          llm_id: llmId
        },

        // Post-call analytics webhook
        webhook_url: webhookUrl,

        // Post-call analysis: use industry-specific analysis if provided, otherwise build from industry config
        post_call_analysis_data: config.postCallAnalysis && config.postCallAnalysis.length > 0 ? config.postCallAnalysis : (() => {
          // Get industry from config or parameter, default to restaurant
          const agentIndustry = (industry || config.industry || 'restaurant') as Industry;
          
          // Get industry-specific call types
          const industryCallTypes = getCallTypesForIndustry(agentIndustry);
          let callTypeChoices = industryCallTypes.map(ct => ct.label);
          
          // Ensure at least one choice exists (Retell AI requirement)
          if (callTypeChoices.length === 0) {
            callTypeChoices = ['General Inquiry', 'Customer Service', 'Information Request', 'Other'];
            console.log(`⚠️ No call types found for industry "${agentIndustry}", using default choices`);
          }
          
          console.log(`🏭 Using industry "${agentIndustry}" with call types: ${callTypeChoices.join(', ')}`);
          
          return [
            {
              type: "string",
              name: "call_summary",
              description: "Detailed summary of the call including customer request, actions taken, and outcome"
            },
            {
              type: "enum",
              name: "service_type",
              description: "Type of service requested by customer",
              choices: callTypeChoices
            },
            {
              type: "string",
              name: "call_outcome",
              description: "Specific outcome of the call (e.g., 'Reservation Booked', 'Order Placed', 'Information Provided', 'Transferred to Staff', 'Customer Hung Up', 'Issue Resolved', etc.)"
            },
            {
              type: "enum",
              name: "sentiment",
              description: "Customer sentiment during the call",
              choices: ["Positive", "Neutral", "Negative"]
            },
            {
              type: "boolean",
              name: "call_successful",
              description: "Whether the customer's request was successfully handled"
            },
            {
              type: "string",
              name: "customer_name",
              description: "Name of the customer if provided"
            },
            {
              type: "number",
              name: "order_amount",
              description: "Total dollar amount if an order was placed"
            }
          ];
        })(),
        post_call_analysis_model: "gpt-5.4-nano",

        responsiveness: 1,
        interruption_sensitivity: 1,
        enable_backchannel: false,
        backchannel_frequency: 0,
        backchannel_words: [],
        normalize_for_speech: true,
        end_call_after_silence_ms: 600000,
        max_call_duration_ms: 3600000
      };

      console.log(`📡 Calling Retell API: POST https://api.retellai.com/create-agent`);
      console.log('🚀 Agent configuration:');
      console.log(`   - Name: ${finalPayload.agent_name}`);
      console.log(`   - Voice: ${finalPayload.voice_id}`);
      console.log(`   - Using retell-llm engine with LLM ID: ${llmId}`);
      console.log(`   - General Prompt Length: ${generalPrompt.length} chars`);
      console.log(`   - General Tools Count: ${tools.length}`);
      console.log(`   - Webhook Base URL: ${webhookUrl.replace('/api/webhooks/retell', '')}`);
      console.log('📝 Full payload being sent to Retell AI:', JSON.stringify(finalPayload, null, 2));

      // Make direct HTTP request to Retell AI API
      const response = await axios.post('https://api.retellai.com/create-agent', finalPayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const agentResponse = response.data;

      console.log(`✅ Successfully created Retell agent: ${agentResponse.agent_id}`);
      console.log(`🗣️ Voice: ${finalPayload.voice_id}, Language: ${finalPayload.language}`);
      console.log(`🤖 Using retell-llm engine (LLM ID: ${llmId})`);

      return {
        id: agentResponse.agent_id,
        name: agentResponse.agent_name || finalPayload.agent_name,
        phoneNumber: config.phoneNumber,
        status: 'active',
        provider: 'retell',
        llmId: llmId, // Include LLM ID for database storage
        createdAt: new Date(),
        updatedAt: new Date()
      };

    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Failed to create Retell agent');
      throw new Error(`Failed to create Retell agent: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a Retell agent directly with raw configuration
   * This method accepts a complete Retell agent configuration and creates the agent
   * without the intermediate step of creating a separate LLM.
   * Used for industry-specific agents with custom prompts and functions.
   */
  async createAgentDirect(agentConfig: any): Promise<any> {
    try {
      console.log(`🤖 Creating Retell agent directly: ${agentConfig.agent_name}`);

      // Create webhook URL for post-call analysis
      const webhookUrl = `${resolveBaseUrl()}/api/webhooks/retell`;

      // Build final payload with webhook and sensible defaults
      const finalPayload = {
        ...agentConfig,
        webhook_url: webhookUrl,
        voice_temperature: agentConfig.voice_temperature || 0.7,
        voice_speed: agentConfig.voice_speed || 1,
        responsiveness: agentConfig.responsiveness || 1,
        interruption_sensitivity: agentConfig.interruption_sensitivity || 0.9,
        enable_backchannel: agentConfig.enable_backchannel !== false,
        backchannel_frequency: agentConfig.backchannel_frequency || 0.8,
        backchannel_words: agentConfig.backchannel_words || ["yeah", "uh-huh"],
        normalize_for_speech: agentConfig.normalize_for_speech !== false,
        end_call_after_silence_ms: agentConfig.end_call_after_silence_ms || 600000,
        max_call_duration_ms: agentConfig.max_call_duration_ms || 3600000,
        post_call_analysis_model: "gpt-5.4-nano"
      };

      console.log(`📡 Calling Retell API: POST https://api.retellai.com/create-agent`);
      console.log('🚀 Agent configuration:');
      console.log(`   - Name: ${finalPayload.agent_name}`);
      console.log(`   - Voice: ${finalPayload.voice_id}`);
      console.log(`   - Language: ${finalPayload.language}`);
      console.log(`   - Response Engine Type: ${finalPayload.response_engine?.type}`);
      console.log(`   - LLM Model: ${finalPayload.response_engine?.llm_id}`);
      console.log(`   - General Tools Count: ${finalPayload.response_engine?.general_tools?.length || 0}`);
      console.log(`   - Post-call Analysis Fields: ${finalPayload.post_call_analysis_data?.length || 0}`);

      // Make direct HTTP request to Retell AI API
      const response = await axios.post('https://api.retellai.com/create-agent', finalPayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const agentResponse = response.data;

      console.log(`✅ Successfully created Retell agent: ${agentResponse.agent_id}`);
      console.log(`🗣️ Voice: ${finalPayload.voice_id}, Language: ${finalPayload.language}`);

      return {
        id: agentResponse.agent_id,
        agent_id: agentResponse.agent_id,
        agent_name: agentResponse.agent_name || finalPayload.agent_name,
        voice_id: agentResponse.voice_id,
        language: agentResponse.language,
        response_engine: agentResponse.response_engine,
        llmId: llmId  // Include LLM ID so it can be persisted to database
      };

    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Failed to create Retell agent directly');
      throw new Error(`Failed to create Retell agent: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update an existing Retell LLM with knowledge base IDs
   * Used to connect knowledge bases to an agent after creation
   * Note: Knowledge bases are attached to the LLM (response engine), not the agent directly
   */
  async updateAgentWithKnowledgeBase(agentId: string, knowledgeBaseIds: string[]): Promise<void> {
    try {
      console.log(`🔗 Connecting knowledge base to agent ${agentId}`);
      console.log(`📚 Knowledge base IDs: ${knowledgeBaseIds.join(', ')}`);

      // First, retrieve the LLM ID from the database using the agent ID
      const voiceAgent = await this.storage.getVoiceAgentByRetellAgentId(agentId);

      if (!voiceAgent) {
        throw new Error(`Voice agent not found for Retell agent ID: ${agentId}`);
      }

      let llmId = voiceAgent.retellLlmId;

      // Automatic LLM ID recovery: If LLM ID is missing, fetch it from Retell AI and save it
      if (!llmId) {
        console.log(`⚠️ No LLM ID found in database for agent ${agentId}. Fetching from Retell AI...`);

        try {
          // Fetch agent details from Retell AI to get the LLM ID
          const response = await axios.get(`https://api.retellai.com/get-agent/${agentId}`, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.data && response.data.llm_id) {
            llmId = response.data.llm_id;
            console.log(`✅ Found LLM ID ${llmId} from Retell AI. Saving to database...`);

            // Save the LLM ID to the database for future use
            await this.storage.updateVoiceAgent(voiceAgent.id, { retellLlmId: llmId });
            console.log(`✅ Saved LLM ID to database for agent ${agentId}`);
          } else {
            console.warn(`⚠️ Agent ${agentId} does not have an LLM ID in Retell AI`);
            throw new Error(`No LLM ID found for agent ${agentId}. Cannot update knowledge base.`);
          }
        } catch (fetchError: any) {
          console.error('⚠️ Error fetching LLM ID from Retell AI:', fetchError.message);
          throw new Error(`Failed to fetch LLM ID for agent ${agentId}: ${fetchError.message}`);
        }
      }

      console.log(`🔍 Using LLM ID ${llmId} for agent ${agentId}`);

      const updatePayload = {
        knowledge_base_ids: knowledgeBaseIds
      };

      // Use the correct endpoint to update the LLM (not the agent)
      const response = await axios.patch(`https://api.retellai.com/update-retell-llm/${llmId}`, updatePayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Successfully connected knowledge base to LLM ${llmId} (agent ${agentId})`);

    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Failed to update LLM with knowledge base');
      throw new Error(`Failed to update agent with knowledge base: ${error.response?.data?.message || error.message}`);
    }
  }

  async updateAgentPostCallAnalysisSchema(agentId: string, industry: Industry = 'restaurant'): Promise<void> {
    try {
      console.log(`📊 Updating post-call analysis schema for agent ${agentId}`);

      // Retrieve the LLM ID from the database
      const voiceAgent = await this.storage.getVoiceAgentByRetellAgentId(agentId);

      if (!voiceAgent) {
        throw new Error(`Voice agent not found for Retell agent ID: ${agentId}`);
      }

      let llmId = voiceAgent.retellLlmId;

      // Automatic LLM ID recovery: If LLM ID is missing, fetch it from Retell AI and save it
      if (!llmId) {
        console.log(`⚠️ No LLM ID found in database for agent ${agentId}. Fetching from Retell AI...`);

        try {
          // Fetch agent details from Retell AI to get the LLM ID
          const response = await axios.get(`https://api.retellai.com/get-agent/${agentId}`, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.data && response.data.llm_id) {
            llmId = response.data.llm_id;
            console.log(`✅ Found LLM ID ${llmId} from Retell AI. Saving to database...`);

            // Save the LLM ID to the database for future use
            await this.storage.updateVoiceAgent(voiceAgent.id, { retellLlmId: llmId });
            console.log(`✅ Saved LLM ID to database for agent ${agentId}`);
          } else {
            console.warn(`⚠️ Agent ${agentId} does not have an LLM ID in Retell AI`);
            throw new Error(`No LLM ID found for agent ${agentId}. Cannot update post-call analysis schema.`);
          }
        } catch (fetchError: any) {
          console.error('⚠️ Error fetching LLM ID from Retell AI:', fetchError.message);
          throw new Error(`Failed to fetch LLM ID for agent ${agentId}: ${fetchError.message}`);
        }
      }

      console.log(`🔍 Using LLM ID ${llmId} for agent ${agentId}`);

      // Get industry-specific call types
      const industryCallTypes = getCallTypesForIndustry(industry);
      let callTypeChoices = industryCallTypes.map(ct => ct.label);

      if (callTypeChoices.length === 0) {
        callTypeChoices = ['General Inquiry', 'Customer Service', 'Information Request', 'Other'];
        console.log(`⚠️ No call types found for industry "${industry}", using default choices`);
      }

      console.log(`🏭 Using industry "${industry}" with call types: ${callTypeChoices.join(', ')}`);

      // Build updated post-call analysis schema
      const postCallAnalysisData = [
        {
          type: "string",
          name: "call_summary",
          description: "Detailed summary of the call including customer request, actions taken, and outcome"
        },
        {
          type: "enum",
          name: "service_type",
          description: "Type of service requested by customer",
          choices: callTypeChoices
        },
        {
          type: "string",
          name: "call_outcome",
          description: "Specific outcome of the call (e.g., 'Reservation Booked', 'Order Placed', 'Information Provided', 'Transferred to Staff', 'Customer Hung Up', 'Issue Resolved', etc.)"
        },
        {
          type: "enum",
          name: "sentiment",
          description: "Customer sentiment during the call",
          choices: ["Positive", "Neutral", "Negative"]
        },
        {
          type: "boolean",
          name: "call_successful",
          description: "Whether the customer's request was successfully handled"
        },
        {
          type: "string",
          name: "customer_name",
          description: "Name of the customer if provided"
        },
        {
          type: "number",
          name: "order_amount",
          description: "Total dollar amount if an order was placed"
        }
      ];

      const updatePayload = {
        post_call_analysis_data: postCallAnalysisData
      };

      console.log(`📡 Updating LLM ${llmId} with new post-call analysis schema`);

      // Update the LLM with the new schema
      const response = await axios.patch(`https://api.retellai.com/update-retell-llm/${llmId}`, updatePayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Successfully updated post-call analysis schema for LLM ${llmId} (agent ${agentId})`);

    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Failed to update post-call analysis schema');
      throw new Error(`Failed to update post-call analysis schema: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Shared helper: fix stale picard.replit.dev URLs to the current public base URL.
   */
  private correctStalePicardUrl(url: string): string {
    if (url && url.includes('picard.replit.dev')) {
      try {
        const publicBase = resolveBaseUrl();
        const parsed = new URL(url);
        const corrected = `${publicBase}${parsed.pathname}${parsed.search || ''}`;
        console.log(`🔧 Corrected stale picard URL: ${url} → ${corrected}`);
        return corrected;
      } catch {
        return url;
      }
    }
    return url;
  }

  /**
   * Shared helper: fetch an agent's response engine from Retell AI.
   * Returns { type, conversationFlowId?, llmId? }
   */
  private async getAgentResponseEngine(agentId: string): Promise<{ type: string; conversationFlowId?: string; llmId?: string }> {
    const agentResp = await axios.get(`https://api.retellai.com/get-agent/${agentId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
    });
    const engine = agentResp.data?.response_engine || {};
    return {
      type: engine.type || 'retell-llm',
      conversationFlowId: engine.conversation_flow_id,
      llmId: engine.llm_id || agentResp.data?.llm_id
    };
  }

  /**
   * Shared helper: fetch tools from a conversation flow.
   */
  private async getConversationFlowTools(flowId: string): Promise<any[]> {
    const flowResp = await axios.get(`https://api.retellai.com/get-conversation-flow/${flowId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
    });
    return flowResp.data?.tools || [];
  }

  /**
   * Shared helper: patch tools array on a conversation flow.
   */
  private async patchConversationFlowTools(flowId: string, tools: any[]): Promise<void> {
    await axios.patch(
      `https://api.retellai.com/update-conversation-flow/${flowId}`,
      { tools },
      { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } }
    );
  }

  async updateAgentCustomFunction(
    agentId: string, 
    functionName: string, 
    functionData: {
      description: string;
      parameters: any;
      speakDuringExecution: boolean;
      speakDuringText?: string;
      speakAfterExecution: boolean;
    },
    voiceAgentData?: { id: string; retellLlmId?: string | null }
  ): Promise<void> {
    try {
      console.log(`🔧 Updating custom function '${functionName}' for agent ${agentId}`);

      // Determine if this is a conversation-flow or LLM agent
      const engine = await this.getAgentResponseEngine(agentId);

      // ── Conversation-flow path ────────────────────────────────────────────────
      if (engine.type === 'conversation-flow' && engine.conversationFlowId) {
        const flowId = engine.conversationFlowId;
        console.log(`🔧 Agent ${agentId} is a conversation-flow agent (flow ${flowId}) — updating flow tools`);

        const currentTools = await this.getConversationFlowTools(flowId);
        const functionIndex = currentTools.findIndex((t: any) => t.name === functionName);

        if (functionIndex === -1) {
          throw new Error(`Function '${functionName}' not found in conversation flow tools`);
        }

        const existingTool = currentTools[functionIndex];
        const updatedTool = {
          ...existingTool,
          url: this.correctStalePicardUrl(existingTool.url || ''),
          description: functionData.description || existingTool.description,
          speak_during_execution: functionData.speakDuringExecution ?? existingTool.speak_during_execution,
          speak_after_execution: functionData.speakAfterExecution ?? existingTool.speak_after_execution
        };

        if (functionData.parameters && typeof functionData.parameters === 'object' && !Array.isArray(functionData.parameters)) {
          updatedTool.parameters = functionData.parameters;
        }
        if (functionData.speakDuringExecution && functionData.speakDuringText) {
          updatedTool.speak_during_execution_message = functionData.speakDuringText;
        }

        const updatedTools = [...currentTools];
        updatedTools[functionIndex] = updatedTool;
        await this.patchConversationFlowTools(flowId, updatedTools);
        console.log(`✅ Successfully updated '${functionName}' in conversation flow ${flowId}`);
        return;
      }

      // ── LLM path ─────────────────────────────────────────────────────────────
      let voiceAgent = voiceAgentData;
      if (!voiceAgent && this.storage?.getVoiceAgentByRetellAgentId) {
        voiceAgent = await this.storage.getVoiceAgentByRetellAgentId(agentId);
      }

      let llmId = voiceAgent?.retellLlmId || engine.llmId;

      if (!llmId) {
        throw new Error(`No LLM ID found for agent ${agentId}. Cannot update custom function.`);
      }

      console.log(`🔍 Using LLM ID ${llmId} for agent ${agentId}`);

      const getLlmResponse = await axios.get(`https://api.retellai.com/get-retell-llm/${llmId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
      });

      const currentTools = getLlmResponse.data.general_tools || [];
      console.log(`📋 Found ${currentTools.length} existing tools in LLM`);

      const functionIndex = currentTools.findIndex((tool: any) => tool.name === functionName);
      if (functionIndex === -1) {
        throw new Error(`Function '${functionName}' not found in agent's tools`);
      }

      const existingFunction = currentTools[functionIndex];
      const updatedFunction = {
        ...existingFunction,
        url: this.correctStalePicardUrl(existingFunction.url || ''),
        description: functionData.description || existingFunction.description,
        speak_during_execution: functionData.speakDuringExecution ?? existingFunction.speak_during_execution,
        speak_after_execution: functionData.speakAfterExecution ?? existingFunction.speak_after_execution
      };
      
      if (functionData.parameters && typeof functionData.parameters === 'object' && !Array.isArray(functionData.parameters)) {
        updatedFunction.parameters = functionData.parameters;
      }
      if (functionData.speakDuringExecution && functionData.speakDuringText) {
        updatedFunction.speak_during_execution_message = functionData.speakDuringText;
      }
      
      console.log(`📋 Updating function with properties:`, JSON.stringify(updatedFunction, null, 2));

      const updatedTools = [...currentTools];
      updatedTools[functionIndex] = updatedFunction;

      await axios.patch(`https://api.retellai.com/update-retell-llm/${llmId}`, { general_tools: updatedTools }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
      });

      console.log(`✅ Successfully updated custom function '${functionName}' for agent ${agentId}`);

    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to update custom function '${functionName}'`);
      throw new Error(`Failed to update custom function: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add a brand-new custom function/tool to an existing agent's LLM in Retell AI.
   * Retrieves the current tools array, appends the new tool, and PATCHes the LLM.
   */
  async addAgentCustomFunction(
    agentId: string,
    functionData: {
      name: string;
      description: string;
      parameters: any;
      speakDuringExecution: boolean;
      speakDuringText?: string;
      speakAfterExecution: boolean;
      category?: string;
    },
    voiceAgentData?: { id: string; retellLlmId?: string | null }
  ): Promise<void> {
    try {
      console.log(`🔧 Adding new custom function '${functionData.name}' to agent ${agentId}`);

      // Determine if this is a conversation-flow or LLM agent
      const engine = await this.getAgentResponseEngine(agentId);

      // Use resolveBaseUrl() for the correct public domain in both dev and production
      const baseUrl = resolveBaseUrl();

      // Determine the correct webhook URL based on the function name and category.
      // Well-known built-in function names always route to their dedicated endpoint.
      // User-created messaging functions route to send_sms_confirmation (sends SMS to customer).
      // All other user-created functions route to their own endpoint name.
      const knownEndpoints: Record<string, string> = {
        notify_team: '/api/retell/notify_team',
        sms_alert: '/api/retell/notify_team',
        transfer_call: '/api/retell/transfer_call',
        book_appointment: '/api/retell/book_appointment',
        cancel_appointment: '/api/retell/cancel_appointment',
        reschedule_appointment: '/api/retell/reschedule_appointment',
        modify_appointment_details: '/api/retell/modify_appointment',
        customer_memory: '/api/retell/customer_memory',
        update_customer_memory: '/api/retell/update_customer_memory',
        send_sms_confirmation: '/api/retell/send_sms_confirmation',
        send_sms: '/api/retell/send_sms_confirmation',
        sms_order_confirmation: '/api/retell/sms_order_confirmation',
        sms_reservation_confirmation: '/api/retell/sms_reservation_confirmation',
        sms_delivery_tracking: '/api/retell/sms_delivery_tracking',
        sms_catering_confirmation: '/api/retell/sms_catering_confirmation',
        sms_appointment_confirmation: '/api/retell/sms_appointment_confirmation',
        sms_modification_alert: '/api/retell/sms_modification_alert',
        sms_feedback_confirmation: '/api/retell/sms_feedback_confirmation',
        sms_general_confirmation: '/api/retell/sms_general_confirmation',
        place_order: '/api/retell/place_order',
        create_reservation: '/api/retell/create_reservation',
        schedule_delivery: '/api/retell/schedule_delivery',
      };

      let webhookPath: string;
      if (knownEndpoints[functionData.name]) {
        webhookPath = knownEndpoints[functionData.name];
      } else if (functionData.category === 'messaging') {
        // User-created messaging actions → send SMS to the customer
        webhookPath = '/api/retell/send_sms_confirmation';
      } else {
        webhookPath = `/api/retell/${functionData.name}`;
      }

      const webhookUrl = `${baseUrl}${webhookPath}`;
      console.log(`🔗 Webhook URL for '${functionData.name}': ${webhookUrl}`);

      const newTool: any = {
        type: 'custom',
        name: functionData.name,
        description: functionData.description,
        url: webhookUrl,
        speak_during_execution: functionData.speakDuringExecution,
        speak_after_execution: functionData.speakAfterExecution,
        parameters: functionData.parameters || { type: 'object', properties: {}, required: [] }
      };

      if (functionData.speakDuringExecution && functionData.speakDuringText) {
        newTool.speak_during_execution_message = functionData.speakDuringText;
      }

      // ── Conversation-flow path ────────────────────────────────────────────────
      if (engine.type === 'conversation-flow' && engine.conversationFlowId) {
        const flowId = engine.conversationFlowId;
        console.log(`🔧 Agent ${agentId} is a conversation-flow agent (flow ${flowId}) — adding to flow tools`);
        const currentTools = await this.getConversationFlowTools(flowId);
        if (currentTools.some((t: any) => t.name === functionData.name)) {
          throw new Error(`A function named '${functionData.name}' already exists on this agent.`);
        }
        await this.patchConversationFlowTools(flowId, [...currentTools, newTool]);
        console.log(`✅ Successfully added custom function '${functionData.name}' to conversation flow ${flowId}`);
        return;
      }

      // ── LLM path ─────────────────────────────────────────────────────────────
      let voiceAgent = voiceAgentData;
      if (!voiceAgent && this.storage?.getVoiceAgentByRetellAgentId) {
        voiceAgent = await this.storage.getVoiceAgentByRetellAgentId(agentId);
      }
      let llmId = voiceAgent?.retellLlmId || engine.llmId;
      if (!llmId) {
        throw new Error(`No LLM ID found for agent ${agentId}.`);
      }
      const getLlmResp = await axios.get(`https://api.retellai.com/get-retell-llm/${llmId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
      });
      const currentTools: any[] = getLlmResp.data.general_tools || [];
      if (currentTools.some((t: any) => t.name === functionData.name)) {
        throw new Error(`A function named '${functionData.name}' already exists on this agent.`);
      }

      await axios.patch(
        `https://api.retellai.com/update-retell-llm/${llmId}`,
        { general_tools: [...currentTools, newTool] },
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } }
      );

      console.log(`✅ Successfully added custom function '${functionData.name}' to agent ${agentId}`);
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to add custom function '${functionData.name}'`);
      throw new Error(`Failed to add custom function: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a custom function/tool from an existing agent's LLM in Retell AI.
   * Retrieves the current tools array, removes the specified tool, and PATCHes the LLM.
   */
  async deleteAgentCustomFunction(
    agentId: string,
    functionName: string,
    voiceAgentData?: { id: string; retellLlmId?: string | null }
  ): Promise<void> {
    try {
      console.log(`🗑️ ========== DELETE FUNCTION START ==========`);
      console.log(`🗑️ Deleting custom function '${functionName}' from agent ${agentId}`);

      // Determine agent type
      const engine = await this.getAgentResponseEngine(agentId);

      // ── Conversation-flow path ────────────────────────────────────────────────
      if (engine.type === 'conversation-flow' && engine.conversationFlowId) {
        const flowId = engine.conversationFlowId;
        console.log(`🗑️ Conversation-flow agent (flow ${flowId}) — removing from flow tools`);
        const currentTools = await this.getConversationFlowTools(flowId);
        if (!currentTools.some((t: any) => t.name === functionName)) {
          throw new Error(`Function '${functionName}' not found in conversation flow tools.`);
        }
        const updatedTools = currentTools.filter((t: any) => t.name !== functionName);
        await this.patchConversationFlowTools(flowId, updatedTools);
        console.log(`✅ Successfully deleted '${functionName}' from conversation flow ${flowId}`);
        console.log(`🗑️ ========== DELETE FUNCTION END ==========`);
        return;
      }

      // ── LLM path ─────────────────────────────────────────────────────────────
      let voiceAgent = voiceAgentData;
      if (!voiceAgent && this.storage?.getVoiceAgentByRetellAgentId) {
        console.log(`🗑️ Fetching voice agent from storage...`);
        voiceAgent = await this.storage.getVoiceAgentByRetellAgentId(agentId);
      }

      let llmId = voiceAgent?.retellLlmId || engine.llmId;
      console.log(`🗑️ LLM ID:`, llmId || 'Not found');

      if (!llmId) {
        throw new Error(`No LLM ID found for agent ${agentId}.`);
      }

      // Fetch current tools
      console.log(`🗑️ Fetching current tools from LLM ${llmId}...`);
      const getLlmResp = await axios.get(`https://api.retellai.com/get-retell-llm/${llmId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
      });
      const currentTools: any[] = getLlmResp.data.general_tools || [];
      console.log(`🗑️ Current tools count:`, currentTools.length);
      console.log(`🗑️ Current tool names:`, currentTools.map(t => t.name).join(', '));

      // Find the function to delete
      const functionExists = currentTools.some((t: any) => t.name === functionName);
      console.log(`🗑️ Function '${functionName}' exists:`, functionExists);

      if (!functionExists) {
        console.error(`❌ Function '${functionName}' not found in tools. Available: ${currentTools.map(t => t.name).join(', ')}`);
        throw new Error(`Function '${functionName}' not found in agent's tools.`);
      }

      // Remove the function from tools
      const updatedTools = currentTools.filter((t: any) => t.name !== functionName);
      console.log(`🗑️ Updated tools count after removal:`, updatedTools.length);

      // Update the LLM with the filtered tools
      console.log(`🗑️ Updating LLM ${llmId} with filtered tools...`);
      const updateResp = await axios.patch(
        `https://api.retellai.com/update-retell-llm/${llmId}`,
        { general_tools: updatedTools },
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } }
      );
      console.log(`🗑️ Retell AI update response status:`, updateResp.status);

      console.log(`✅ Successfully deleted custom function '${functionName}' from agent ${agentId}`);
      console.log(`🗑️ ========== DELETE FUNCTION END ==========`);
    } catch (error: any) {
      console.error(`❌ ========== DELETE FUNCTION ERROR ==========`);
      console.error(`❌ Error details:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      this.sanitizeAndLogAxiosError(error, `Failed to delete custom function '${functionName}'`);
      throw new Error(`Failed to delete custom function: ${error.response?.data?.message || error.message}`);
    }
  }

  // Helper method to build general prompt for retell-llm
  /**
   * Shared response guidelines appended to every agent prompt (both LLM and conversation-flow global_prompt).
   */
  private getResponseGuidelines(): string {
    return `

## Response Guidelines
0. FIRST ACTION - Customer Memory Check: Before greeting the customer, silently call Lookup function to check if they are a returning customer.
   • If customer data exists: Use "Welcome back to {{business_name}}! How can I assist you?" and reference their preferences
   • If new customer: Use "Hello! Welcome to {{business_name}}! How can I assist you?" and collect their information, then call Update
1. Friendly and approachable: Maintain a warm, professional, and conversational tone at all times.
2. Concise responses: Use short, clear sentences. Only expand to multiple sentences for complex explanations.
3. Ask one thing at a time: Avoid combining multiple questions or topics in a single prompt.
4. Confirm key details: Always verify important information with the customer to prevent errors (e.g., date, time, service type).
5. Natural language: Use contractions, casual phrasing, and human-like responses when appropriate.
6. Collect necessary info step-by-step: Gather key information such as name, email, or address incrementally to avoid overwhelming the customer.
   • Example: First ask for the name, then the address or service details.
   • For phone number: Ask "Is the phone number you're calling from the best number to reach you at?" — if yes, use the caller's number automatically; if no, collect their preferred number.
7. Clarity and focus: Keep instructions and interactions simple and focused on a single topic at a time.
8. Follow the user's language preference: Detect the user's preferred language and respond in that language naturally, maintaining fluency and tone.
9. Adapt style to context: Adjust friendliness, formality, and detail level depending on the user's tone, urgency, or type of request.
10. Step-by-step guidance for processes: For complex actions like bookings or cancellations, guide the customer sequentially and confirm each step before proceeding.
11. Do not say anything after you ask a question: Wait for the customer's response without adding extra statements or filler words.`;
  }

  private buildGeneralPromptForLLM(config: VoiceAgentConfig): string {
    // Standard response guidelines to ensure conversational, easy-to-understand AI
    const responseGuidelines = this.getResponseGuidelines();

    // If knowledgeBase contains an OpenAI-generated prompt, use it directly
    // (OpenAI prompt service generates complete, industry-specific prompts)
    if (config.knowledgeBase && config.knowledgeBase.length > 200) {
      console.log('📝 Using OpenAI-generated prompt as general_prompt');
      return config.knowledgeBase + responseGuidelines;
    }

    // Fallback to template-based prompt if no OpenAI prompt is available
    // This handles cases where knowledge base creation failed
    console.log('📝 Using template-based fallback prompt with business info injection');
    const businessName = config.businessName || 'the business';
    const knowledgeBase = config.knowledgeBase || this.buildBusinessInfo(config);

    return `You are a professional receptionist for ${businessName}. You can take orders, answer questions, make reservations, handle catering requests, check table availability, and provide delivery updates. Always follow business policies and toggles. Speak clearly using full sentences. Do not say any information in parentheses. Be brief when explaining information. Only ask one question at a time. Do not mention AI.

## Business Information (Fallback - Knowledge Base Unavailable)
The following business information is provided directly in your prompt as a fallback since the knowledge base was not available:

${knowledgeBase}

## Task Instructions
1. AT THE START OF EVERY CALL: Call Lookup function to check if this caller is a returning customer and retrieve their history, preferences, and past interactions
2. Greet customers warmly - if Lookup returns existing data, personalize the greeting (e.g., "Welcome back, [Name]!")
3. During the call, if you learn new information about the customer (name, email, preferences), call Update to save it
3. Listen to customer requests and determine the type of service needed:
   - If customer wants to place an order → call place_order function, then automatically call Confirmation
   - If customer wants delivery → call schedule_delivery function, then automatically call Confirmation
   - If customer wants a reservation → check calendar availability with check_availability, then call book, then automatically call Confirmation
   - If customer requests catering → check calendar availability with check_availability, then call book, then automatically call Confirmation
   - If customer provides feedback → call Add Note function
   - If customer wants to modify existing appointment/order/reservation → update it, then call Alert function to notify team
   - If customer requests human agent/manager/specific person → call transfer_call function immediately with appropriate target_role
4. Always be helpful and provide accurate information about our services

## Function Usage Instructions

**CRITICAL TIME INTERPRETATION:**
When a customer says "I want a reservation/appointment for [TIME]" or "book me at [TIME]", that time is ALWAYS the START TIME, not the end time.
Examples:
- "I want an appointment for 12:25 PM" → START: 12:25 PM, END: 1:25 PM (1 hour duration)
- "Book me for 3:00 PM" → START: 3:00 PM, END: 4:00 PM (1 hour duration)
- "Reservation at 7:30 PM" → START: 7:30 PM, END: 9:00 PM (1.5 hour duration)

### Customer Memory (MUST USE FIRST):
CRITICAL: At the start of EVERY call, you MUST call Lookup function:
- This function checks if the customer has called before and retrieves their:
  - Name and contact information
  - Previous orders, reservations, or interactions
  - Preferences and special requests
  - VIP status or loyalty information
- Use this information to personalize the conversation and provide better service
- Example: "Welcome back, Sarah! Are you calling about your usual Tuesday reservation?"
- If you learn NEW information during the call (name, email, preferences), call Update to save it for future interactions

### Order Flow - IMPORTANT:
1. Collect order details ONE ITEM AT A TIME:
   - Ask "What would you like to order?"
   - For each item, get: item name, quantity, and any customizations
   - Confirm each item: "So that's [quantity] [item name] with [customizations], correct?"
   - Ask "Would you like anything else?" until customer is done
2. Calculate total price based on menu prices
3. Confirm order type (pickup, delivery, or dine-in)
4. Call place_order function with ALL items in the items array:
   - Each item MUST have: item_name, quantity, price
   - Include customizations if any
   - Example: items: [{"item_name": "Cheeseburger", "quantity": 2, "price": 12.99, "customizations": "No onions"}]
5. AUTOMATICALLY call Confirmation function - DO NOT ask the customer if they want an SMS confirmation, just send it automatically

CRITICAL: You MUST include the items array with all ordered items when calling place_order. Never call place_order without items!

### Delivery Flow:
1. Confirm delivery address and order details
2. Call schedule_delivery function with delivery details
3. Get estimated delivery time
4. AUTOMATICALLY call Confirmation function - DO NOT ask the customer if they want an SMS confirmation, just send it automatically

### Reservation Flow:
1. Collect reservation details (date, time, party size, special requests)
   CRITICAL: When a customer says "I want a reservation for [TIME]", that time is the START TIME of the reservation, not the end time.
   For example: "I want a reservation for 12:25 PM" means the reservation STARTS at 12:25 PM.
2. Check calendar availability using check_availability function:
   - Pass the requested date and time in the proper format
   - If slots are available, proceed with the reservation
   - If no slots available, suggest alternative times from the calendar
3. Call book function with reservation details
   IMPORTANT: Pass the customer's requested time as reservation_time - this is the START time of the reservation.
4. AUTOMATICALLY call Confirmation function - DO NOT ask the customer if they want an SMS confirmation, just send it automatically

### Catering Flow:
1. Collect catering details (event date, guest count, event type, location)
   CRITICAL: When a customer says "I want catering for [TIME]", that time is the START TIME of the event, not the end time.
2. Check calendar availability using check_availability function:
   - Pass the requested event date and time in the proper format
   - If slots are available, proceed with booking
   - If no slots available, suggest alternative dates from the calendar
3. Explain that catering manager will follow up
4. Call book function with catering request
   IMPORTANT: Pass the customer's requested time as start_time - this is the START time of the event.
5. AUTOMATICALLY call Confirmation function - DO NOT ask the customer if they want an SMS confirmation, just send it automatically

### Feedback Flow:
- When customer provides feedback, call Add Note function
- Thank them for their feedback

### Transfer Flow - SMART ROUTING SYSTEM:
CRITICAL: The system uses intelligent routing with priority levels:

**WHEN TO USE EACH TARGET ROLE:**
1. **target_role: "specific"** - Customer mentions a name (e.g., "Can I speak with Sarah?")
   - Set target_name to the person's name
   - Highest priority: transfers directly if that person is assigned and has transfer enabled

2. **target_role: "manager"/"owner"/"employee"** - Customer requests a role
   - Use when customer says "I want to speak with a manager", "Can I talk to the owner", etc.
   - Second priority: transfers to first available person with that role

3. **target_role: "default"** - Use for ALL other transfer scenarios:
   - Customer is frustrated or angry
   - Customer requests "human", "person", "someone" without specifying who
   - Customer issue requires human assistance but no specific request
   - Previous transfer attempt failed (set is_retry: true)
   - Fallback priority: transfers to the pre-configured Default Call Transfer member

**INSTRUCTIONS:**
1. Listen carefully to identify the customer's request
2. Call transfer_call with the appropriate target_role
3. Say "Let me transfer you to [role/name]. One moment please..."
4. The system AUTOMATICALLY:
   - Looks up team members assigned to THIS SPECIFIC AI AGENT
   - Filters by role/name based on priority
   - Checks if they have call transfer enabled
   - Routes to Default Call Transfer member if no specific match or as fallback
5. For phone number: Ask "Is the phone number you're calling from the best number to reach you at?" — if yes, use the caller's number automatically; if no, collect their preferred number

### SMS Alert Flow:
CRITICAL: When customers MODIFY existing appointments, reservations, or orders:
1. Identify the modification type:
   - Appointment time/date changed: alert_type: "appointment_modified"
   - Reservation changed: alert_type: "reservation_modified"
   - Order modified: alert_type: "order_modified"
   - Cancellation: alert_type: "cancellation"
   - Urgent request: alert_type: "urgent_request"
2. AUTOMATICALLY call Alert function with modification details - DO NOT ask the customer
3. The system will AUTOMATICALLY:
   - Send SMS alerts ONLY to team members who are ASSIGNED TO THIS SPECIFIC AI AGENT
   - Further filter to only members who have SMS messaging enabled in their account settings
   - Include customer name and details about what was modified
   - Use the agent_id to look up the correct team members
4. Simply confirm to customer: "I've updated your [appointment/reservation/order] and notified our team"

### Calendar Availability Check:
CRITICAL: ALWAYS call check_availability BEFORE booking any appointment, reservation, or calendar event:
- For industries with appointments/reservations (salons, medical, hotels, restaurants, etc.), you MUST check availability first
- Call with date (YYYY-MM-DD) and time (HH:MM in 24-hour format) - this time represents the START time
- IMPORTANT: When customer says "I want an appointment at 12:25 PM", pass "12:25" as the time - this is the START time
- Optionally specify duration_minutes if different from default 30 minutes
- Use availability results to confirm or suggest alternative times to customer
- ONLY proceed with booking if availability is confirmed
- If rescheduling an existing appointment, check availability for the new time before confirming the change

## SMS Confirmation Guidelines
CRITICAL - SMS is sent AUTOMATICALLY, not by asking:
- ALWAYS call Confirmation function after completing orders, reservations, deliveries, appointments, or any confirmable action
- DO NOT ask the customer if they want an SMS confirmation - just send it automatically
- For phone number: Ask "Is the phone number you're calling from the best number to reach you at?" — if yes, use caller's number automatically; if no, collect their preferred number and pass it as preferred_phone
- The Confirmation function will route to the appropriate SMS message based on the action context
- After the function executes, simply inform: "I've sent a confirmation text with all the details"
- The system handles all SMS content generation based on the transaction type and details
${responseGuidelines}`;
  }

  // Build business info string
  private buildBusinessInfo(config: VoiceAgentConfig): string {
    const businessName = config.businessName || 'the business';
    const address = config.businessAddress || 'our location';
    const hours = config.businessHours || 'our business hours';

    return `- Name: ${businessName}
- Industry: Restaurant
- Address: ${address}
- Hours: ${hours}
- Services: dine-in, takeout, delivery, catering, reservations, curbside pickup`;
  }

  // Build general tools array for Retell LLM
  private buildGeneralTools(webhookUrl: string): any[] {
    const baseUrl = webhookUrl.replace('/api/webhooks/retell', '');
    const orderWebhookUrl = `${baseUrl}/api/webhooks/order`;

    return [
      // Customer Memory Functions
      {
        type: "custom",
        name: "Lookup",
        description: "Retrieve customer history, preferences, and past interactions from CRM. Call this at the start of every call to personalize the conversation. Returns customer_name, phone_number, email, and preferences if the customer is found. If any of these fields are returned, DO NOT ask the customer for that information again - use the returned values directly.",
        url: `${baseUrl}/api/retell/customer_memory`,
        method: "POST",
        speak_during_execution: false,
        speak_after_execution: false,
        parameters: {
          type: "object",
          properties: {
            customer_phone: { type: "string", description: "Customer's phone number (automatically captured from caller)" }
          }
        }
      },
      {
        type: "custom",
        name: "Update",
        description: "Update customer information in CRM including preferences, notes, and VIP status",
        url: `${baseUrl}/api/retell/update_customer_memory`,
        method: "POST",
        speak_during_execution: false,
        speak_after_execution: false,
        parameters: {
          type: "object",
          properties: {
            customer_phone: { type: "string", description: "Customer's phone number" },
            customer_name: { type: "string", description: "Customer's full name" },
            customer_email: { type: "string", description: "Customer's email address" },
            preferences: { type: "string", description: "Customer preferences or special requests" },
            notes: { type: "string", description: "Additional notes about the customer" },
            vip_status: { type: "boolean", description: "Whether customer is VIP" }
          },
          required: ["customer_phone"]
        }
      },

      // POS Integration Functions
      {
        type: "custom",
        name: "place_order",
        description: "Place a customer order in the POS system (Square, Clover, or Toast)",
        url: orderWebhookUrl,
        method: "POST",
        speak_during_execution: true,
        speak_after_execution: true,
        execution_message_description: "Processing your order...",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "Unique order ID" },
            customer_name: { type: "string", description: "Customer's full name" },
            customer_phone: { type: "string", description: "Customer's phone number" },
            items: {
              type: "array",
              description: "List of order items",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string", description: "Name of the item" },
                  quantity: { type: "number", description: "Quantity ordered" },
                  price: { type: "number", description: "Price per item" },
                  customizations: { type: "string", description: "Special instructions or customizations" }
                },
                required: ["item_name", "quantity"]
              }
            },
            subtotal: { type: "number", description: "Order subtotal" },
            tax: { type: "number", description: "Tax amount" },
            total: { type: "number", description: "Total order amount" },
            order_type: { type: "string", enum: ["pickup", "delivery", "dine-in"], description: "Type of order" }
          },
          required: ["customer_name", "items", "total", "order_type"]
        }
      },

      // Reservation Integration Functions
      {
        type: "custom",
        name: "create_reservation",
        description: "Create a reservation in Google Calendar or OpenTable",
        url: `${baseUrl}/api/retell/create_reservation`,
        method: "POST",
        speak_during_execution: true,
        speak_after_execution: true,
        execution_message_description: "Creating your reservation...",
        parameters: {
          type: "object",
          properties: {
            customer_first_name: { type: "string", description: "Customer's first name" },
            customer_last_name: { type: "string", description: "Customer's last name" },
            customer_phone: { type: "string", description: "Customer's phone number" },
            customer_email: { type: "string", description: "Customer's email address" },
            reservation_date: { type: "string", description: "Reservation date (YYYY-MM-DD)" },
            reservation_time: { type: "string", description: "Reservation time (HH:MM)" },
            party_size: { type: "number", description: "Number of guests" },
            special_requests: { type: "string", description: "Special requests or dietary restrictions" },
            seating_preference: { type: "string", enum: ["indoor", "outdoor", "bar", "any"], description: "Seating preference" }
          },
          required: ["customer_first_name", "customer_last_name", "customer_phone", "reservation_date", "reservation_time", "party_size"]
        }
      },

      // Delivery Integration Functions
      {
        type: "custom",
        name: "schedule_delivery",
        description: "Schedule delivery via Grubhub, DoorDash, or Uber Eats",
        url: `${baseUrl}/api/retell/schedule_delivery`,
        method: "POST",
        speak_during_execution: true,
        speak_after_execution: true,
        execution_message_description: "Setting up your delivery...",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "Order ID to deliver" },
            customer_name: { type: "string", description: "Customer's name" },
            customer_phone: { type: "string", description: "Customer's phone number" },
            delivery_address: { type: "string", description: "Full delivery address" },
            delivery_street: { type: "string", description: "Street address" },
            delivery_city: { type: "string", description: "City" },
            delivery_state: { type: "string", description: "State" },
            delivery_zip: { type: "string", description: "ZIP code" },
            delivery_instructions: { type: "string", description: "Special delivery instructions" },
            items: {
              type: "array",
              description: "Items to deliver",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  quantity: { type: "number" },
                  item_price: { type: "number" }
                }
              }
            },
            order_value_cents: { type: "number", description: "Order total in cents" }
          },
          required: ["customer_name", "customer_phone", "delivery_address", "items"]
        }
      },

      // Calendar Integration Functions
      {
        type: "custom",
        name: "book_calendar_event",
        description: "Book an event directly in Google Calendar",
        url: `${baseUrl}/api/retell/book_calendar_event`,
        method: "POST",
        speak_during_execution: true,
        speak_after_execution: true,
        execution_message_description: "Booking your event...",
        parameters: {
          type: "object",
          properties: {
            event_summary: { type: "string", description: "Event title/summary" },
            event_location: { type: "string", description: "Event location" },
            customer_name: { type: "string", description: "Customer name" },
            customer_email: { type: "string", description: "Customer email" },
            start_time: { type: "string", description: "Event start time (ISO format)" },
            end_time: { type: "string", description: "Event end time (ISO format)" },
            time_zone: { type: "string", description: "Time zone", default: "America/New_York" }
          },
          required: ["event_summary", "customer_name", "start_time", "end_time"]
        }
      },

      // SMS confirmation tools (keep existing SMS webhooks for now)
      {
        type: "custom",
        name: "sms_order_confirmation",
        description: "Send SMS order confirmation to customer after order is placed",
        url: `${baseUrl}/api/webhooks/sms/order`,
        method: "POST",
        speak_during_execution: false,
        speak_after_execution: true,
        execution_message_description: "I've sent a confirmation text with your order details"
      },
      {
        type: "custom",
        name: "sms_reservation_confirmation",
        description: "Send SMS reservation confirmation to customer after booking",
        url: `${baseUrl}/api/webhooks/sms/reservation`,
        method: "POST",
        speak_during_execution: false,
        speak_after_execution: true,
        execution_message_description: "I've sent a confirmation text with your reservation details"
      },
      {
        type: "custom",
        name: "sms_delivery_tracking",
        description: "Send SMS delivery tracking update to customer",
        url: `${baseUrl}/api/webhooks/sms/delivery`,
        method: "POST",
        speak_during_execution: false,
        speak_after_execution: true,
        execution_message_description: "I've sent a tracking text with your delivery details"
      }
    ];
  }

  // Build dynamic variables
  private buildDynamicVariables(config: VoiceAgentConfig): any {
    return {
      company_name: config.businessName || 'the business',
      industry: config.industry || "Business",
      address: config.businessAddress || 'our location',
      phone_number: config.phoneNumber || '',
      website: '',
      email: '',
      business_hours: config.businessHours || 'our business hours',
      services: "dine-in, takeout, delivery, catering, reservations, curbside pickup",
      menu: config.menu || 'Please ask about our menu',
      reservation_policy: config.reservationPolicy || 'Reservations recommended',
      ordering_policy: config.orderingPolicy || 'Phone and online orders accepted',
      delivery_platforms: "Uber Eats, DoorDash, Grubhub",
      catering: "Ask about our catering options for events and groups"
    };
  }

  async updateAgent(agentId: string, config: Partial<VoiceAgentConfig>): Promise<VoiceAgent> {
    try {
      console.log(`🔄 Updating Retell agent: ${agentId} with new business information`);

      // Update agent using template variable substitution for consistency
      const updateTemplate = {
        "agent_id": agentId,
        "name": "[{{business_name}}]",
        "description": "AI receptionist for {{business_name}} that handles calls, phone orders, reservations, and FAQs using onboarding info.",
        "knowledge_base": {
          "business_name": "{{business_name}}",
          "business_address": "{{business_address}}",
          "business_phone": "{{business_phone}}",
          "business_hours": "{{business_hours}}",
          "menu": "{{menu}}",
          "ordering_policy": "{{ordering_policy}}",
          "reservation_policy": "{{reservation_policy}}",
          "faq": "{{faq}}"
        }
      };

      // Template variable substitution
      let updateStr = JSON.stringify(updateTemplate);
      updateStr = updateStr.replace(/\{\{business_name\}\}/g, config.businessName || '');
      updateStr = updateStr.replace(/\{\{business_address\}\}/g, config.businessAddress || '');
      updateStr = updateStr.replace(/\{\{business_phone\}\}/g, config.phoneNumber || '');
      updateStr = updateStr.replace(/\{\{business_hours\}\}/g, typeof config.businessHours === 'string' ? config.businessHours : JSON.stringify(config.businessHours || 'Please call for current hours'));
      updateStr = updateStr.replace(/\{\{menu\}\}/g, JSON.stringify(config.menu || []));
      updateStr = updateStr.replace(/\{\{ordering_policy\}\}/g, config.orderingPolicy || '');
      updateStr = updateStr.replace(/\{\{reservation_policy\}\}/g, config.reservationPolicy || '');
      updateStr = updateStr.replace(/\{\{faq\}\}/g, JSON.stringify(config.faq || []));

      const finalUpdatePayload = JSON.parse(updateStr);

      console.log('🚀 Update payload:', JSON.stringify(finalUpdatePayload, null, 2));

      // Use direct API call for updates
      const response = await axios.put(`https://api.retellai.com/update-agent`, finalUpdatePayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      const updatedAgent = response.data;

      console.log(`✅ Successfully updated Retell agent: ${agentId} with new business information`);

      return {
        id: updatedAgent.agent_id || updatedAgent.id,
        name: updatedAgent.agent_name || updatedAgent.name,
        status: 'active',
        provider: 'retell',
        createdAt: new Date(),
        updatedAt: new Date()
      };

    } catch (error: any) {
      console.error(`❌ Failed to update Retell agent ${agentId}:`, error.response?.data || error.message);
      throw new Error(`Failed to update Retell agent: ${error.response?.data?.message || error.message}`);
    }
  }

  async getAgent(agentId: string): Promise<VoiceAgent | null> {
    try {
      const response = await axios.get(`https://api.retellai.com/get-agent/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      const agent = response.data;

      return {
        id: agent.agent_id || agent.id,
        name: agent.agent_name || agent.name,
        status: 'active',
        provider: 'retell',
        llmId: agent.llm_id, // Include LLM ID in response
        createdAt: new Date(agent.last_modification_timestamp || Date.now()),
        updatedAt: new Date(agent.last_modification_timestamp || Date.now())
      };
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to get Retell agent ${agentId}`);
      return null;
    }
  }

  /**
   * Get the LLM ID for a Retell agent
   * Used to fetch missing LLM IDs for existing agents
   */
  async getAgentLlmId(agentId: string): Promise<string | null> {
    try {
      const response = await axios.get(`https://api.retellai.com/get-agent/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      const agent = response.data;
      return agent.llm_id || null;
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to get LLM ID for agent ${agentId}`);
      return null;
    }
  }

  /**
   * Get LLM configuration details including custom functions
   * Returns the full LLM object with general_tools, states, and other configuration
   */
  async getLlmDetails(llmId: string): Promise<any | null> {
    try {
      const response = await axios.get(`https://api.retellai.com/get-retell-llm/${llmId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      console.log(`✅ Retrieved LLM configuration for ${llmId}`);
      return response.data;
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to get LLM details for ${llmId}`);
      return null;
    }
  }

  /**
   * Get custom functions configured for an agent
   * Fetches the agent's LLM configuration and extracts general_tools
   */
  async getAgentCustomFunctions(agentId: string): Promise<any[]> {
    try {
      // First, get the agent to find its response engine type
      const agentResponse = await axios.get(`https://api.retellai.com/get-agent/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const responseEngine = agentResponse.data.response_engine || {};

      // ── Conversation-flow agents ──────────────────────────────────────────────
      // These agents have no LLM; their tools live on the conversation flow itself.
      if (responseEngine.type === 'conversation-flow' && responseEngine.conversation_flow_id) {
        const flowId = responseEngine.conversation_flow_id;
        const flowResponse = await axios.get(
          `https://api.retellai.com/get-conversation-flow/${flowId}`,
          { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
        );
        const tools = flowResponse.data.tools || [];
        console.log(`📋 Found ${tools.length} tools in conversation flow ${flowId} for agent ${agentId}`);
        return tools;
      }

      // ── Standard LLM agents ───────────────────────────────────────────────────
      const llmId = responseEngine.llm_id;
      if (!llmId) {
        console.log(`⚠️ Agent ${agentId} has no LLM configured`);
        return [];
      }

      // Then, get the LLM details to access general_tools
      const llmDetails = await this.getLlmDetails(llmId);
      if (!llmDetails) {
        return [];
      }

      // Extract and return general_tools array
      const generalTools = llmDetails.general_tools || [];
      console.log(`📋 Found ${generalTools.length} custom functions for agent ${agentId}`);
      
      return generalTools;
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to get custom functions for agent ${agentId}`);
      return [];
    }
  }

  /**
   * Upload a file to a Retell AI knowledge base
   * @param knowledgeBaseId - The knowledge base ID to upload to
   * @param file - The file buffer with metadata from multer
   */
  async uploadFileToKnowledgeBase(knowledgeBaseId: string, file: any): Promise<any> {
    try {
      console.log(`📤 Uploading file "${file.originalname}" to knowledge base ${knowledgeBaseId}`);
      console.log(`📋 File details: size=${file.size}, type=${file.mimetype}`);
      
      // Use FormData with axios for file uploads (SDK has issues with buffer streams)
      const formData = new FormData();
      formData.append('knowledge_base_files', Buffer.from(file.buffer), {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      console.log('📤 Sending file to Retell AI using FormData');

      const response = await axios.post(
        `https://api.retellai.com/add-knowledge-base-sources/${knowledgeBaseId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...formData.getHeaders(),
          },
        }
      );

      console.log(`✅ File uploaded successfully to knowledge base ${knowledgeBaseId}`);
      console.log(`📄 Response:`, JSON.stringify(response.data, null, 2));
      
      // Return source_id from response for database tracking
      return {
        source_id: response.data.source_id || response.data.knowledge_base_sources?.[0]?.source_id,
        ...response.data
      };
    } catch (error: any) {
      console.error(`❌ File upload failed for "${file.originalname}"`);
      this.sanitizeAndLogAxiosError(error, `Failed to upload file to knowledge base ${knowledgeBaseId}`);
      
      // Extract and throw more specific error if available
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  /**
   * Add a URL to a Retell AI knowledge base
   * @param knowledgeBaseId - The knowledge base ID to add URL to
   * @param url - The URL to scrape and add
   */
  async addUrlToKnowledgeBase(knowledgeBaseId: string, url: string): Promise<any> {
    try {
      console.log(`🌐 Adding URL "${url}" to knowledge base ${knowledgeBaseId}`);

      // Validate URL format - must start with http:// or https://
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(url.trim())) {
        throw new Error('Invalid URL format. Please enter a valid URL starting with http:// or https://');
      }

      console.log('📤 Sending URL to Retell AI using SDK:', url.trim());

      // Use official Retell SDK for proper multipart/form-data encoding
      const response = await this.client.knowledgeBase.addSources(knowledgeBaseId, {
        knowledge_base_urls: [url.trim()]
      });

      console.log(`✅ URL added successfully to knowledge base ${knowledgeBaseId}`);
      console.log(`📄 Response:`, JSON.stringify(response, null, 2));

      // Return source_id from response for database tracking
      return {
        source_id: response.source_id || response.knowledge_base_sources?.[0]?.source_id,
        ...response
      };
    } catch (error: any) {
      console.error(`❌ URL scraping failed for "${url}"`);
      console.error('Error details:', error);

      // Extract and throw more specific error if available
      if (error.body?.message) {
        // Provide user-friendly error message
        if (error.statusCode === 500) {
          throw new Error(`Retell AI couldn't scrape this URL. The website might be inaccessible, blocking scrapers, or not publicly available. Error: ${error.body.message}`);
        }
        throw new Error(error.body.message);
      }
      
      // Generic 500 error
      if (error.statusCode === 500) {
        throw new Error('The URL could not be scraped. Please ensure the website is publicly accessible and not blocking automated access.');
      }
      
      throw error;
    }
  }

  /**
   * Add text to a Retell AI knowledge base
   * @param knowledgeBaseId - The knowledge base ID to add text to
   * @param textContent - The text content to add
   * @param title - Optional title for the text snippet
   */
  async addTextToKnowledgeBase(knowledgeBaseId: string, textContent: string, title?: string): Promise<any> {
    try {
      console.log(`📝 Adding text to knowledge base ${knowledgeBaseId}`);
      console.log(`📝 Title: ${title || 'Untitled'}`);

      if (!textContent || textContent.trim().length === 0) {
        throw new Error('Text content cannot be empty');
      }

      console.log('📤 Sending text to Retell AI using SDK');

      // Use official Retell SDK for proper multipart/form-data encoding
      const response = await this.client.knowledgeBase.addSources(knowledgeBaseId, {
        knowledge_base_texts: [{
          text: textContent.trim(),
          title: title || 'Custom Text'
        }]
      });

      console.log(`✅ Text added successfully to knowledge base ${knowledgeBaseId}`);
      console.log(`📄 Response:`, JSON.stringify(response, null, 2));

      // Return source_id from response for database tracking
      return {
        source_id: response.source_id || response.knowledge_base_sources?.[0]?.source_id,
        ...response
      };
    } catch (error: any) {
      console.error(`❌ Text addition failed`);
      console.error('Error details:', error);

      // Extract and throw more specific error if available
      if (error.body?.message) {
        throw new Error(error.body.message);
      }
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    try {
      await axios.delete(`https://api.retellai.com/delete-agent/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      console.log(`🗑️ Successfully deleted Retell agent: ${agentId}`);
      return true;
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to delete Retell agent ${agentId}`);
      return false;
    }
  }

  async connectAgentToPhoneNumber(agentId: string, phoneNumber: string): Promise<PhoneConnectionResult> {
    try {
      console.log(`📞 Connecting Retell agent ${agentId} to phone number: ${phoneNumber}`);
      console.log(`📞 Using "Dial to SIP URI" method - no phone number import required`);
      console.log(`📞 Phone calls will be registered individually using registerPhoneCall()`);

      // With "Dial to SIP URI" method, we don't need to import the phone number
      // Instead, each call will be registered individually when received
      console.log(`✅ Agent ${agentId} configured for phone ${phoneNumber}`);
      console.log(`📞 Ready to handle calls via SIP URI method`);

      return {
        success: true,
        phoneNumber,
        agentId
      };
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to connect agent ${agentId} to phone ${phoneNumber}`);
      return {
        success: false,
        phoneNumber,
        agentId,
        error: error.message
      };
    }
  }

  async disconnectAgentFromPhoneNumber(agentId: string, phoneNumber: string): Promise<boolean> {
    try {
      // For Retell, we need to update the phone number to remove agent assignment
      const response = await axios.get('https://api.retellai.com/list-phone-numbers', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      const phoneNumbers = response.data;
      const targetPhone = phoneNumbers.find((p: any) => p.phone_number === phoneNumber);

      if (targetPhone) {
        await axios.put(`https://api.retellai.com/phone-number/${targetPhone.phone_number_id}`, {
          inbound_agent_id: undefined,
          outbound_agent_id: undefined
        }, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`📵 Disconnected agent ${agentId} from phone ${phoneNumber}`);
        return true;
      }

      return false;
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to disconnect agent ${agentId} from phone ${phoneNumber}`);
      return false;
    }
  }

  async startCallSession(agentId: string, phoneNumber: string): Promise<CallSession> {
    // Retell handles call sessions automatically through phone number routing
    // This is more of a tracking/logging function for our system
    const sessionId = `retell_${agentId}_${Date.now()}`;

    console.log(`📞 Starting call session: ${sessionId} for agent ${agentId} on ${phoneNumber}`);

    return {
      sessionId,
      agentId,
      phoneNumber,
      status: 'active',
      startedAt: new Date()
    };
  }

  async endCallSession(sessionId: string): Promise<boolean> {
    // Retell handles call session lifecycle automatically
    console.log(`📞 Call session ended: ${sessionId}`);
    return true;
  }

  async getTwiMLForInboundCall(agentId: string, phoneNumber: string): Promise<string> {
    // For Retell integration, we need to create a TwiML that connects to Retell's system
    // Retell uses WebSocket for real-time communication

    const domain = resolveBaseUrl().replace(/^https?:\/\//, '');
    const wsUrl = `wss://${domain}/retell-stream/${agentId}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Please hold while we connect you to our AI assistant.</Say>
    <Connect>
        <Stream url="${wsUrl}">
            <Parameter name="agent_id" value="${agentId}" />
            <Parameter name="phone_number" value="${phoneNumber}" />
        </Stream>
    </Connect>
</Response>`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - try to list agents
      await axios.get('https://api.retellai.com/list-agents', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return true;
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Retell provider health check failed');
      return false;
    }
  }


  /**
   * Extract keywords from business configuration for boosting
   */
  private extractKeywords(config: VoiceAgentConfig): string[] {
    const keywords = [config.businessName];

    // Extract keywords from knowledge base
    const knowledgeWords = config.knowledgeBase
      .toLowerCase()
      .match(/\b\w{3,}\b/g) || [];

    // Common restaurant/business keywords
    const commonKeywords = [
      'reservation', 'booking', 'table', 'menu', 'hours', 'location', 'delivery',
      'takeout', 'pickup', 'special', 'price', 'cost', 'available', 'open', 'closed'
    ];

    return Array.from(new Set([...keywords, ...knowledgeWords.slice(0, 20), ...commonKeywords])).slice(0, 50);
  }

  /**
   * Register phone call with Retell AI using "Dial to SIP URI" method
   * This method doesn't require importing phone numbers - it registers individual calls instead
   */
  async registerPhoneCall(
    agentId: string, 
    fromNumber: string, 
    toNumber: string, 
    direction: 'inbound' | 'outbound' = 'inbound',
    metadata?: Record<string, any>
  ): Promise<{ call_id: string; sip_uri: string }> {
    try {
      console.log(`📞 Registering phone call with Retell AI for agent ${agentId}`);
      console.log(`📞 Call details: ${direction} call from ${fromNumber} to ${toNumber}`);
      if (metadata) {
        console.log(`📞 Metadata:`, metadata);
      }

      const requestBody: any = {
        agent_id: agentId,
        from_number: fromNumber,
        to_number: toNumber,
        direction: direction
      };

      // Add metadata if provided (e.g., Twilio Call SID for call transfer)
      if (metadata) {
        requestBody.metadata = metadata;
      }

      const response = await axios.post('https://api.retellai.com/v2/register-phone-call', requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const callData = response.data;
      const sipUri = `sip:${callData.call_id}@5t4n6j0wnrl.sip.livekit.cloud`;
      
      console.log(`✅ Successfully registered phone call: ${callData.call_id}`);
      console.log(`📞 SIP URI for dialing: ${sipUri}`);

      return {
        call_id: callData.call_id,
        sip_uri: sipUri
      };
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, 'Failed to register phone call with Retell AI');
      throw error;
    }
  }

  /**
   * Get call details from Retell AI including transcript and post-call variables
   */
  async getCallDetails(callId: string): Promise<any> {
    try {
      console.log(`📞 Fetching call details from Retell AI for call: ${callId}`);

      const response = await axios.get(`https://api.retellai.com/v2/get-call/${callId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const callData = response.data;

      console.log(`✅ Successfully fetched call details for: ${callId}`);
      console.log(`📋 Call has transcript: ${!!callData.transcript}`);
      console.log(`📋 Call variables:`, callData.call_analysis?.custom_analysis_data || callData.metadata);

      const extractedSummary = callData.call_analysis?.custom_analysis_data?.call_summary ||
                               callData.call_analysis?.call_summary;
      const extractedSuccess = callData.call_analysis?.custom_analysis_data?.call_successful ||
                               callData.call_analysis?.call_successful;

      console.log(`📋 Extracted call_summary: ${extractedSummary}`);
      console.log(`📋 Extracted call_successful: ${extractedSuccess}`);

      // Extract and normalize the data
      return {
        call_id: callData.call_id,
        agent_id: callData.agent_id,

        // Caller information from Retell AI
        caller_name: callData.call_analysis?.custom_analysis_data?.customer_name ||
                     callData.metadata?.customer_name ||
                     callData.from_number,
        customer_name: callData.call_analysis?.custom_analysis_data?.customer_name ||
                       callData.metadata?.customer_name,

        // Phone numbers
        from_number: callData.from_number,
        to_number: callData.to_number,

        // Call metadata
        direction: callData.direction,
        start_timestamp: callData.start_timestamp,
        end_timestamp: callData.end_timestamp,
        duration_ms: callData.end_timestamp ? callData.end_timestamp - callData.start_timestamp : 0,

        // Transcript and summary from Retell AI
        transcript: callData.transcript,
        transcript_object: callData.transcript_object,
        call_summary: callData.call_analysis?.custom_analysis_data?.call_summary ||
                      callData.call_analysis?.call_summary,

        // Call type/purpose from Retell AI variables
        service_type: callData.call_analysis?.custom_analysis_data?.service_type ||
                      callData.metadata?.service_type,
        call_outcome: callData.call_analysis?.custom_analysis_data?.call_outcome ||
                     callData.metadata?.call_outcome,
        sentiment: callData.call_analysis?.custom_analysis_data?.sentiment ||
                  callData.metadata?.sentiment,
        call_successful: callData.call_analysis?.custom_analysis_data?.call_successful ||
                        callData.call_analysis?.call_successful,
        order_amount: callData.call_analysis?.custom_analysis_data?.order_amount,

        // Recording
        recording_url: callData.recording_url,

        // Additional metadata
        call_analysis: callData.call_analysis,
        metadata: callData.metadata,

        // Status
        call_status: callData.call_status,
        disconnect_reason: callData.disconnect_reason
      };
    } catch (error: any) {
      this.sanitizeAndLogAxiosError(error, `Failed to fetch call details for ${callId}`);
      throw error;
    }
  }

  /**
   * DEPRECATED: This method tried to import phone numbers directly which causes 500 errors
   * Use registerPhoneCall() instead with the "Dial to SIP URI" method
   */
  private async registerPhoneNumber_DEPRECATED(phoneNumber: string, agentId: string): Promise<void> {
    console.warn('⚠️ registerPhoneNumber is deprecated - phone number import causes 500 errors');
    console.warn('📞 Use registerPhoneCall() with "Dial to SIP URI" method instead');
    // This method is kept for reference but should not be used
  }

  /**
   * Note: With the direct API approach, we use the knowledge_base field directly
   * instead of managing separate LLMs. This aligns with the user's specification.
   */
  private buildRestaurantKnowledge(config: VoiceAgentConfig): string {
    return `You are an AI receptionist for ${config.businessName}. You handle customer inquiries, reservations, and general questions about the restaurant. Keep responses concise and helpful.\n\nBusiness Information:\n${config.knowledgeBase || 'Information will be provided during configuration.'}`;
  }

  /**
   * Build knowledge base from business configuration
   */
  private buildKnowledgeBase(config: VoiceAgentConfig): string {
    const knowledge = [];

    knowledge.push(`Business Name: ${config.businessName}`);

    // Use knowledgeBase field directly as provided in config
    if (config.knowledgeBase) {
      knowledge.push(`Business Information: ${config.knowledgeBase}`);
    }

    // Add restaurant-specific conversation guidelines
    knowledge.push('\nConversation Guidelines:');
    knowledge.push('- Handle reservations, orders, and general questions');
    knowledge.push('- Keep responses friendly, concise, and professional');
    knowledge.push('- Transfer to human staff when needed');

    return knowledge.join('\n');
  }

  /**
   * Update conversation flow with restaurant-specific workflow
   */
  async updateConversationFlow(conversationFlowId: string, businessName: string): Promise<void> {
    try {
      console.log(`🔄 Updating conversation flow: ${conversationFlowId} for ${businessName}`);

      const conversationFlowData = {
        conversation_flow_id: conversationFlowId,
        nodes: [
          {
            id: "start",
            type: "message",
            content: `Hello, thank you for calling ${businessName}! Are you calling about reservations, ordering takeout, our menu, hours, or something else?`,
            next: ["intent_router"]
          },
          {
            id: "intent_router",
            type: "router",
            routes: [
              {
                keywords: ["reservation", "book", "table", "party"],
                next: "reservation_intro"
              },
              {
                keywords: ["order", "takeout", "pickup", "food"],
                next: "takeout_intro"
              },
              {
                keywords: ["menu", "food", "dishes", "options"],
                next: "knowledge_base_menu"
              },
              {
                keywords: ["hours", "open", "close", "time"],
                next: "knowledge_base_hours"
              },
              {
                keywords: ["location", "address", "directions"],
                next: "knowledge_base_location"
              }
            ],
            default: "knowledge_base_fallback"
          },
          // Reservation flow
          {
            id: "reservation_intro",
            type: "message",
            content: "Great! Let's get your reservation set up. Can I have the date, time, and party size?",
            next: ["reservation"]
          },
          {
            id: "reservation",
            type: "schedule",
            fields: ["date", "time", "party_size"],
            action: "book_reservation",
            next: ["reservation_confirm"]
          },
          {
            id: "reservation_confirm",
            type: "message",
            content: `Perfect, your table has been reserved at ${businessName}. We look forward to serving you!`,
            next: ["end"]
          },
          // Takeout ordering flow
          {
            id: "takeout_intro",
            type: "message",
            content: "Sure, let's get your takeout order started. What would you like from the menu?",
            next: ["takeout_order"]
          },
          {
            id: "takeout_order",
            type: "knowledge_base",
            query_type: "menu",
            action: "create_order",
            next: ["takeout_confirm"]
          },
          {
            id: "takeout_confirm",
            type: "message",
            content: `Thanks! Your order has been placed for pickup at ${businessName}. We'll have it ready for you at the requested time.`,
            next: ["end"]
          },
          // Knowledge base FAQ handling
          {
            id: "knowledge_base_menu",
            type: "knowledge_base",
            query_type: "menu",
            next: ["end"]
          },
          {
            id: "knowledge_base_hours",
            type: "knowledge_base",
            query_type: "hours",
            next: ["end"]
          },
          {
            id: "knowledge_base_location",
            type: "knowledge_base",
            query_type: "location",
            next: ["end"]
          },
          {
            id: "knowledge_base_fallback",
            type: "knowledge_base",
            query_type: "general",
            next: ["end"]
          },
          // End node
          {
            id: "end",
            type: "message",
            content: `Thank you for calling ${businessName}!`
          }
        ]
      };

      // Make API call to update conversation flow
      await axios.post('https://api.retellai.com/update-conversation-flow', conversationFlowData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Successfully updated conversation flow for ${businessName}`);

    } catch (error: any) {
      console.error(`❌ Failed to update conversation flow ${conversationFlowId}:`, error.response?.data || error.message);
      throw new Error(`Failed to update conversation flow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Note: System prompts are now managed at the LLM level in Retell AI.
   * Create a custom LLM with your system prompt first, then reference it in the agent.
   * This method is kept for potential future use but currently logs a note.
   */
  private async updateAgentPrompt(agentId: string, systemPrompt: string): Promise<void> {
    console.log(`📝 Note: System prompts for Retell agents are now managed at the LLM level.`);
    console.log(`🤖 Agent ${agentId} will use the default LLM configuration.`);
    console.log(`💡 To use custom prompts, create a custom LLM first via Retell's LLM API.`);
  }
}

/**
 * High-level function to create a Retell agent for a user after subscription
 */
export async function createRetellAgentForUser(userId: string): Promise<void> {
  try {
    console.log(`🤖 Creating Retell agent for user: ${userId}`);

    // Import storage here to avoid circular dependency
    const { storage } = await import('../storage');

    // Get user's current restaurant/business data
    let business: any = null;
    let businessName = 'AI Restaurant';

    try {
      // PRIORITY 1: Use business onboarding data from signup progress (most complete information)
      const signupProgress = await storage.getSignupProgress(userId);
      let businessOnboardingData = null;

      if (signupProgress?.stepData && typeof signupProgress.stepData === 'object') {
        // Check both possible locations for business onboarding data
        businessOnboardingData = (signupProgress.stepData as any).businessOnboarding ||
                                  (signupProgress.stepData as any).agentCreationData?.businessData;

        if (businessOnboardingData) {
          business = businessOnboardingData;
          businessName = business.businessName || business.name || 'AI Restaurant';
          console.log(`📊 ✅ PRIORITY: Using complete business onboarding data for: ${businessName}`);
          console.log(`📋 Business data includes: ${Object.keys(business).join(', ')}`);
        }
      }

      // FALLBACK 1: Enhanced business profile if onboarding data not available
      if (!businessOnboardingData) {
        const businessProfile = await storage.getEnhancedBusinessProfile(userId);
        if (businessProfile) {
          business = businessProfile;
          businessName = business.businessName || 'AI Restaurant';
          console.log(`📊 Using enhanced business profile for business: ${businessName}`);
        } else {
          // FALLBACK 2: Restaurant data
          const restaurantData = await storage.getRestaurantDataById(userId);
          if (restaurantData) {
            business = restaurantData;
            businessName = business.businessName || 'AI Restaurant';
            console.log(`📊 Using restaurant data for business: ${businessName}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load business data, using defaults:', error);
    }

    if (!business) {
      console.warn('⚠️ No business data found, creating agent with default settings');
      business = { businessName, industry: 'Restaurant' };
    }

    console.log(`📊 Creating agent for business: ${businessName}`);

    // Initialize RetellProvider with storage for custom integrations
    const retellProvider = new RetellProvider(storage);

    // Build comprehensive knowledge base text from business data
    const knowledgeBaseText = (retellProvider as any).buildComprehensiveKnowledgeBaseData(business);

    // Helper to format services
    const formatServicesSimple = (services: any): string => {
      if (!services) return 'various services';
      if (Array.isArray(services)) return services.join(', ');
      if (typeof services === 'object') {
        const enabledServices = Object.entries(services)
          .filter(([_, enabled]) => enabled)
          .map(([service]) => service.replace(/([A-Z])/g, ' $1').trim());
        return enabledServices.length > 0 ? enabledServices.join(', ') : 'various services';
      }
      return String(services);
    };

    // Helper to format operating hours
    const formatOperatingHours = (hours: any): string => {
      if (!hours || typeof hours !== 'object') return 'Please call for current hours';

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const formatted = days.map(day => {
        const dayData = hours[day];
        if (!dayData) return '';
        if (dayData.closed) return `${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`;
        return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayData.open} to ${dayData.close}`;
      }).filter(Boolean);

      return formatted.join(', ');
    };

    // Prepare business info for conversation flow creation
    const agentIndustry = business.industry || 'restaurant';
    const businessInfo: BusinessInfo = {
      businessName,
      name: businessName,
      industry: agentIndustry,
      businessAddress: business.physicalAddress || business.businessAddress || business.address,
      address: business.physicalAddress || business.businessAddress || business.address,
      phoneNumber: business.phoneNumber || business.phone,
      phone: business.phoneNumber || business.phone,
      businessHours: typeof business.operatingHours === 'object'
        ? formatOperatingHours(business.operatingHours)
        : business.businessHours || business.operatingHours,
      operatingHours: business.operatingHours,
      services: business.services,
      menu: business.menu,
      faq: business.faq || business.commonQuestions,
      website: business.website
    };

    // Step 1: Create conversation flow for this business
    console.log(`🗣️ Creating conversation flow for: ${businessName} (industry: ${agentIndustry})`);
    const conversationFlow = await retellProvider.createConversationFlow(businessInfo, undefined, userId, agentIndustry);
    console.log(`✅ Conversation flow created: ${conversationFlow.id}`);

    // Step 2: Create agent configuration that references the conversation flow
    const voiceConfig: VoiceAgentConfig = {
      businessName,
      businessAddress: business.physicalAddress || business.businessAddress || business.address,
      businessPhone: business.phoneNumber || business.phone,
      businessHours: typeof business.operatingHours === 'object'
        ? formatOperatingHours(business.operatingHours)
        : business.businessHours || business.operatingHours,
      voiceId: 'default',
      model: 'gpt-5-mini',
      language: 'multi',
      knowledgeBase: knowledgeBaseText,
      conversationFlowId: conversationFlow.id  // Link to conversation flow
    };

    // Step 3: Create the agent with conversation flow
    console.log(`🤖 Creating Retell agent with conversation flow for: ${businessName}`);
    const agent = await retellProvider.createAgent(voiceConfig, userId, undefined, agentIndustry);
    console.log(`✅ Successfully created Retell agent: ${agent.id} with conversation flow: ${conversationFlow.id}`);

    // Step 4: Save agent to database with conversationFlowId
    console.log(`💾 Saving agent to database for user: ${userId}`);
    const savedAgent = await storage.createVoiceAgent({
      name: businessName,
      description: `AI receptionist for ${businessName}`,
      industry: business.industry || 'restaurant',
      voiceId: 'elevenlabs-chloe',
      userId: userId,
      retellAgentId: agent.id,
      conversationFlowId: conversationFlow.id,
      isPublic: false,
      isGeneric: false
    });

    console.log(`✅ Agent saved to database with ID: ${savedAgent.id}`);

  } catch (error: any) {
    console.error(`Failed to create Retell agent for user ${userId}:`, error);
    throw error;
  }
}