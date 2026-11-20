/**
 * Website Analysis Service
 * Fetches and analyzes a business website to extract key information
 * Used for automatic provisioning during email verification
 */

import fetch from 'node-fetch';
import type { Industry } from '../../shared/industryConfig';

const INDUSTRY_OPTIONS: Industry[] = [
  'restaurant', 'medical', 'salon', 'home-service', 'real-estate',
  'professional-services', 'hotel', 'auto', 'education', 'retail',
  'barbershop', 'fitness', 'veterinary', 'medical-spa', 'pet-daycare',
  'gym', 'dentist'
];

export interface WebsiteAnalysisResult {
  success: boolean;
  businessName?: string;
  industry?: Industry;
  description?: string;
  phoneNumber?: string;
  address?: string;
  error?: string;
}

/**
 * Fetch HTML content from a URL
 */
async function fetchWebsiteHTML(url: string): Promise<string | null> {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    console.log(`🌐 Fetching website: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VoiceBot/1.0; +https://voicebot.one)',
      },
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      console.error(`❌ Website fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    console.log(`✅ Website fetched successfully (${html.length} bytes)`);

    return html;
  } catch (error: any) {
    console.error(`❌ Error fetching website:`, error.message);
    return null;
  }
}

/**
 * Extract text content from HTML (simple extraction)
 */
function extractTextFromHTML(html: string): string {
  try {
    // Remove script and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Limit to reasonable size (first 3000 chars for analysis)
    return text.substring(0, 3000);
  } catch (error) {
    console.error('Error extracting text from HTML:', error);
    return '';
  }
}

/**
 * Use OpenAI to analyze website content and extract business information
 */
async function analyzeWithAI(websiteText: string, websiteUrl: string): Promise<WebsiteAnalysisResult> {
  try {
    const { OpenAI } = await import('openai');

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured');
      return {
        success: false,
        error: 'AI analysis not configured'
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Analyze this business website and extract COMPREHENSIVE information. Extract EVERY detail available.

Website URL: ${websiteUrl}

Website Content:
${websiteText}

CRITICAL: Extract EVERY SINGLE service, product, menu item, package, or offering with its complete details including prices.

Extract the following information in JSON format:
{
  "businessName": "The business name (required)",
  "industry": "ONE of these exact values: ${INDUSTRY_OPTIONS.join(', ')}",
  "description": "Detailed description of what the business does (2-3 sentences)",
  "phoneNumber": "Phone number if found (include all formats found)",
  "address": "Complete physical address if found (street, city, state, zip)",
  "email": "Email address if found",
  "hours": "Business hours if found (as detailed string or object)",
  "services": [
    {
      "name": "Service/Product name",
      "price": "Price (exact value like '$50', range like '$20-$100', or starting price like 'from $25')",
      "description": "Service/product description with details",
      "duration": "Duration if applicable (e.g., '30 min', '1 hour')",
      "category": "Category or type of service"
    }
  ]
}

CRITICAL EXTRACTION RULES:
- businessName must be extracted from the website
- industry must be ONE of the listed options - choose the closest match
- description should include what makes this business unique
- Extract ALL contact information: phone, email, address, hours
- List EVERY service or product you find with:
  * Complete name/title
  * Price (even if it's a range or "starting at" price)
  * Full description with any details about what's included
  * Duration/time if mentioned
  * Category/type
- If a service has multiple pricing tiers or packages, list each one separately
- Include menu items, treatments, packages, memberships, or any offerings
- If no services are explicitly listed, extract any products, packages, or offerings mentioned
- If truly no services/products found, return empty array for services
- Return valid JSON only`;

    console.log('🤖 Analyzing website with AI for comprehensive data extraction...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(responseText);

    console.log('✅ AI analysis complete:', result);

    // Validate required fields
    if (!result.businessName) {
      return {
        success: false,
        error: 'Could not extract business name from website'
      };
    }

    // Validate industry
    if (!result.industry || !INDUSTRY_OPTIONS.includes(result.industry)) {
      console.warn(`⚠️ Invalid industry "${result.industry}", defaulting to professional-services`);
      result.industry = 'professional-services';
    }

    return {
      success: true,
      businessName: result.businessName,
      industry: result.industry as Industry,
      description: result.description || `${result.businessName} - Professional services`,
      phoneNumber: result.phoneNumber || undefined,
      address: result.address || undefined,
      email: result.email || undefined,
      hours: result.hours || undefined,
      services: result.services || [],
    };
  } catch (error: any) {
    console.error('❌ AI analysis error:', error.message);
    return {
      success: false,
      error: 'Failed to analyze website content'
    };
  }
}

/**
 * Analyze a business website and extract information
 */
export async function analyzeBusinessWebsite(websiteUrl: string): Promise<WebsiteAnalysisResult> {
  try {
    console.log(`🔍 Starting website analysis for: ${websiteUrl}`);

    // Fetch website HTML
    const html = await fetchWebsiteHTML(websiteUrl);

    if (!html) {
      return {
        success: false,
        error: 'Could not fetch website content. Please check the URL and try again.'
      };
    }

    // Extract text content
    const text = extractTextFromHTML(html);

    // Allow even minimal content - OpenAI can extract from titles, meta tags, etc.
    if (!text || text.trim().length === 0) {
      // If no text at all, use the website URL as context
      console.log('⚠️ No text extracted, analyzing URL only');
      const result = await analyzeWithAI(websiteUrl, websiteUrl);
      return result;
    }

    // Analyze with AI
    const result = await analyzeWithAI(text, websiteUrl);

    return result;
  } catch (error: any) {
    console.error('❌ Website analysis error:', error.message);
    return {
      success: false,
      error: 'Failed to analyze website. Please try manual setup.'
    };
  }
}

export interface LocationInfo {
  name?: string;
  address: string;
  isPrimary?: boolean;
}

export interface MultipleLocationsResult {
  success: boolean;
  locations: LocationInfo[];
  error?: string;
}

/**
 * Detect multiple physical locations from a business website URL.
 * Returns all locations found including the primary one.
 */
export async function detectMultipleLocations(websiteUrl: string): Promise<MultipleLocationsResult> {
  try {
    const html = await fetchWebsiteHTML(websiteUrl);
    if (!html) {
      return { success: false, locations: [], error: 'Could not fetch website content' };
    }

    const text = extractTextFromHTML(html);

    const { OpenAI } = await import('openai');
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, locations: [], error: 'AI analysis not configured' };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Analyze this business website and extract ALL physical location addresses.
Many businesses have multiple branches or locations listed on their website.

Website URL: ${websiteUrl}

Website Content:
${text.substring(0, 3000)}

Extract every physical location/address mentioned. Return a JSON object:
{
  "locations": [
    {
      "name": "Location nickname if present (e.g. 'Downtown', 'North Branch'), or omit if none",
      "address": "Full address: street, city, state, zip",
      "isPrimary": true
    }
  ]
}

Rules:
- Include ALL physical addresses found (including the main/primary one)
- If only one address exists, return an array with that single location
- Only include physical street addresses, not PO boxes or virtual offices
- Set "isPrimary": true on exactly ONE location — the headquarters, flagship, or first/main branch. Clues: labeled "main", "headquarters", "original", listed first on a locations page, or the address that appears most prominently on the homepage. If unclear, pick the first address found.
- All other locations should have "isPrimary": false or omit the field
- Return valid JSON only`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(responseText);

    const locations: LocationInfo[] = (result.locations || []).filter((loc: any) => loc.address && loc.address.trim());

    // Ensure the primary location is first — sort so isPrimary:true comes before others
    locations.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });

    // If no location was marked primary, mark the first one
    if (locations.length > 0 && !locations.some(l => l.isPrimary)) {
      locations[0].isPrimary = true;
    }

    console.log(`🏢 Detected ${locations.length} location(s) from website`);
    if (locations.length > 1) {
      console.log(`📍 Primary location: ${locations[0].address}`);
    }

    return { success: true, locations };
  } catch (error: any) {
    console.error('❌ Location detection error:', error.message);
    return { success: false, locations: [], error: error.message };
  }
}

/**
 * Format AI analysis results into human-readable text for Memory tab
 */
export function formatAIAnalysisForMemory(analysis: WebsiteAnalysisResult, websiteUrl: string): string {
  if (!analysis.success || !analysis.businessName) {
    return '';
  }

  const sections: string[] = [];

  // Business Name and Description
  sections.push(`## ${analysis.businessName}\n`);
  
  if (analysis.description) {
    sections.push(`${analysis.description}\n`);
  }

  // Website
  sections.push(`\n**Website:** ${websiteUrl}\n`);

  // Contact Information
  const contactInfo: string[] = [];
  if (analysis.phoneNumber) {
    contactInfo.push(`**Phone:** ${analysis.phoneNumber}`);
  }
  if (analysis.email) {
    contactInfo.push(`**Email:** ${analysis.email}`);
  }
  if (analysis.address) {
    contactInfo.push(`**Address:** ${analysis.address}`);
  }
  
  if (contactInfo.length > 0) {
    sections.push(`\n### Contact Information\n${contactInfo.join('\n')}\n`);
  }

  // Business Hours
  if (analysis.hours) {
    sections.push(`\n### Business Hours\n${typeof analysis.hours === 'string' ? analysis.hours : JSON.stringify(analysis.hours, null, 2)}\n`);
  }

  // Services/Products
  if (analysis.services && Array.isArray(analysis.services) && analysis.services.length > 0) {
    sections.push(`\n### Services & Pricing\n`);
    
    analysis.services.forEach((service: any) => {
      const serviceParts: string[] = [];
      
      if (service.name) {
        serviceParts.push(`**${service.name}**`);
      }
      
      if (service.price) {
        serviceParts.push(`- Price: ${service.price}`);
      }
      
      if (service.duration) {
        serviceParts.push(`- Duration: ${service.duration}`);
      }
      
      if (service.category) {
        serviceParts.push(`- Category: ${service.category}`);
      }
      
      if (service.description) {
        serviceParts.push(`- ${service.description}`);
      }
      
      sections.push(serviceParts.join('\n') + '\n');
    });
  }

  return sections.join('\n').trim();
}
