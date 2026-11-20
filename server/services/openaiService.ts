import { OpenAI } from 'openai';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: string };
}

class OpenAIService {
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(request: ChatCompletionRequest) {
    try {
      console.log(`🤖 Creating chat completion with ${request.model}`);
      
      const completion = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        response_format: request.response_format as any,
      });

      console.log(`✅ Chat completion created successfully`);
      return completion;
    } catch (error: any) {
      console.error('❌ OpenAI API error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze text and return structured response
   */
  async analyzeText(prompt: string, responseFormat: 'json' | 'text' = 'text'): Promise<string> {
    try {
      const completion = await this.createChatCompletion({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
        ...(responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {})
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('❌ Text analysis error:', error.message);
      throw error;
    }
  }

  /**
   * Intelligently format business information for any industry
   * Uses a universal template with core fields + industry-specific modules
   * Extracts all details needed for an AI receptionist to be successful
   */
  async formatBusinessInformation(
    businessData: any,
    searchQuery: string = ''
  ): Promise<{
    success: boolean;
    formattedInfo?: string;
    industry?: string;
    error?: string;
  }> {
    try {
      const systemPrompt = `You are an expert business analyst specializing in AI receptionist systems. Your task is to perform a COMPREHENSIVE, DEEP EXTRACTION of business information.

CRITICAL INSTRUCTIONS:
- Extract EVERY SINGLE DETAIL available in the provided data
- List out ALL services, policies, menu items, prices, and offerings
- Include ALL contact methods, social media links, and communication channels
- Document ALL business hours, special hours, and seasonal variations
- Capture ALL staff members, their roles, specializations, and credentials
- Record ALL policies (cancellation, refund, payment, booking, age restrictions, dress code, pet policy, smoking policy, etc.)
- Extract ALL awards, certifications, licenses, and achievements
- Document ALL reviews, testimonials, and customer feedback
- Include ALL amenities, facilities, and special features
- Capture ALL pricing tiers, packages, promotions, and deals
- Extract dietary options, allergen information, and ingredient details (for food businesses)
- Include sustainability practices, community involvement, and unique values

Your task is to:
1. **Analyze** the provided business data and determine the industry/business type
2. **Extract** EVERY SINGLE DETAIL using a universal template with core fields + industry-specific modules
3. **Format** the information in an exhaustive, comprehensive template optimized for the specific industry
4. **List everything** - if there's a detail in the data, it MUST appear in your output

## UNIVERSAL TEMPLATE STRUCTURE

### CORE FIELDS (Required for ALL businesses):
- **Business Identity**: Name, legal entity, contact info, industry classification
- **Location & Hours**: Address, operating hours, timezone, accessibility, parking
- **Staff & Personnel**: Key team members, roles, specialties, certifications
- **Services/Products**: All offerings with name, price, duration/quantity
- **Payment & POS**: Accepted payment methods, POS integration, pricing
- **Booking/Ordering Policies**: How to book, cancellation rules, deposits
- **Communication Preferences**: Preferred channels (SMS, email, phone), reminder settings
- **Compliance/Licensing**: Relevant licenses, certifications, industry standards

### INDUSTRY-SPECIFIC MODULES (Only activate if relevant):

**RESTAURANTS & FOOD SERVICE:**
- Menu items, categories, dietary options (vegan, gluten-free, halal, kosher)
- Table capacity, reservation rules, wait times
- Delivery/takeout options, minimum orders, delivery radius
- POS integration for food orders (Toast, Square, Clover)
- Alcohol service, happy hour specials
- Catering services, private events

**SALONS & BEAUTY:**
- Hair/nail/skin services, add-ons, color types
- Service duration and pricing ranges
- Product lines used (Olaplex, OPI, etc.)
- Stylist specialties and booking preferences
- Consultation requirements, patch tests
- Retail product sales

**MEDICAL & HEALTHCARE:**
- Provider credentials, specialties, accepting new patients
- Insurance accepted, copay requirements
- Telehealth availability, prescription services
- HIPAA compliance, patient privacy policies
- Emergency services, lab services on-site
- Appointment booking rules, referral requirements

**HOTELS & HOSPITALITY:**
- Room types, capacity, amenities
- Check-in/check-out times, early/late fees
- Cancellation policies, minimum stay requirements
- On-site facilities (pool, gym, restaurant, spa)
- Booking platforms (Booking.com, Expedia)
- Seasonal pricing, special packages

**AUTO REPAIR & AUTOMOTIVE:**
- Services offered (brakes, oil change, transmission, etc.)
- Brands serviced, parts sources (OEM, aftermarket)
- Warranty coverage, loaner vehicles, shuttle service
- Inspection certification, mobile service availability
- Estimated service times, pricing ranges

**PROFESSIONAL SERVICES (Legal, Accounting, Consulting):**
- Practice areas, specializations
- Professional credentials (CPA, JD, MBA)
- Billing structure (hourly, flat fee, retainer)
- Free consultation availability
- Virtual service options, document requirements
- Client types served (individual, business, enterprise)

**FITNESS & WELLNESS:**
- Class types, schedules, instructor names
- Membership tiers and pricing
- Personal training availability, package deals
- Equipment and amenities (showers, lockers, childcare)
- First-time visitor policies, trial passes

**RETAIL STORES:**
- Product categories, brands carried
- Return policies, exchange rules
- Loyalty programs, rewards
- Alterations, personal shopping services
- Curbside pickup, same-day delivery

**EDUCATION & TUTORING:**
- Subjects taught, age groups served
- Class formats (one-on-one, group, online)
- Instructor qualifications, pricing packages
- Materials included, assessment offered
- Progress tracking, certification programs

**HOME SERVICES (Cleaning, HVAC, Plumbing, Landscaping):**
- Services offered, emergency availability
- Licensed/bonded/insured status
- Service area coverage, travel fees
- Estimates provided, warranty offered
- Equipment provided, contract options

**PET SERVICES (Veterinary, Grooming, Boarding):**
- Species served, size/breed restrictions
- Vaccinations required, emergency services
- Drop-off/pickup options, webcam monitoring
- Daycare vs overnight boarding
- Certifications, specialized care

## FORMATTING GUIDELINES:
- Use clear emoji icons for visual organization (🏢 📞 📍 🕐 💳 📋 etc.)
- Structure with section headers and bullet points
- **CRITICAL: Include EVERY SINGLE DETAIL from the data - leave ABSOLUTELY NOTHING out**
- List EVERY menu item, service, product, policy, staff member, price, hour, review, amenity, feature
- For missing information, use: "[Information not available]" or "[To be provided]"
- Be EXHAUSTIVELY comprehensive - the goal is 100% coverage of all data
- Create detailed subsections for complex information (e.g., separate each menu category, list every staff member individually)
- Include exact prices, durations, measurements, and specifications whenever available
- Extract and list ALL URLs (booking sites, ordering platforms, social media, third-party services)
- Make it easy for an AI voice agent to quickly find and reference ANY piece of information during calls

## EXTRACTION DEPTH REQUIREMENTS:
- **Menu Items**: List EVERY item with name, description, price, dietary tags, allergens, ingredients
- **Services**: List EVERY service with duration, price range, requirements, and specialist information
- **Staff**: List EVERY staff member with name, title, specialization, credentials, and availability
- **Policies**: Document EVERY policy in complete detail with specific time frames, fees, and conditions
- **Reviews**: Include multiple reviews with ratings, dates, and full text excerpts
- **Hours**: Document regular hours, special hours, holidays, seasonal changes, and exceptions
- **Pricing**: List ALL prices, packages, tiers, promotions, discounts, and payment options
- **Features**: Document EVERY amenity, facility, accessibility feature, and unique offering

## OUTPUT FORMAT:
Return a JSON object with:
{
  "industry": "Specific industry (e.g., 'Italian Restaurant', 'Hair Salon', 'Auto Repair Shop', 'Medical Clinic', 'Law Firm')",
  "formattedInfo": "The complete formatted business information template as a string"
}`;

      const userPrompt = `Business Data:
${JSON.stringify(businessData, null, 2)}

Search Query/Context: ${searchQuery || 'None provided'}

Analyze this business, determine the industry, and create a comprehensive AI receptionist knowledge template using the universal structure with appropriate industry-specific modules.`;

      const completion = await this.createChatCompletion({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(responseText);

      return {
        success: true,
        formattedInfo: parsedResponse.formattedInfo,
        industry: parsedResponse.industry
      };
    } catch (error: any) {
      console.error('❌ Business information formatting error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to format business information'
      };
    }
  }

  /**
   * Process restaurant call with AI
   */
  async processRestaurantCall(
    transcription: string,
    restaurantData: any,
    conversationHistory: ChatMessage[] = []
  ): Promise<{
    response: string;
    action: string;
    confidence: number;
    sentiment?: string;
    sentimentScore?: number;
  }> {
    try {
      const systemPrompt = `You are an AI receptionist for ${restaurantData.businessName || 'a restaurant'}. 

Restaurant Information:
- Name: ${restaurantData.businessName || 'Restaurant'}
- Address: ${restaurantData.address || 'Not available'}
- Phone: ${restaurantData.phone || 'Not available'}
- Hours: ${restaurantData.hours || 'Please call for hours'}
- Specialties: ${restaurantData.menuItems?.slice(0, 5).join(', ') || 'Various dishes'}

Your Role:
- Be friendly, professional, and helpful
- Handle reservations, takeout orders, questions about menu/hours
- If you can't help with something, offer to transfer to a human staff member
- Keep responses conversational and under 35 words for faster speech synthesis
- Always maintain a warm, welcoming tone

Current customer said: "${transcription}"

Based on the conversation, provide a JSON response with:
1. An appropriate response (under 35 words)
2. What action should be taken
3. Your confidence level (0-100)
4. Customer sentiment analysis

IMPORTANT: You must respond with valid JSON only. No other text.

{
  "response": "Your spoken response to the customer",
  "action": "reservation|order|info|transfer|end_call|continue",
  "confidence": 85,
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.8
}`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.slice(-6), // Last 3 exchanges
        { role: 'user' as const, content: transcription }
      ];

      const completion = await this.createChatCompletion({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 120,
        temperature: 0.6,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      try {
        const parsedResponse = JSON.parse(responseText);
        return {
          response: parsedResponse.response,
          action: parsedResponse.action || 'continue',
          confidence: parsedResponse.confidence || 70,
          sentiment: parsedResponse.sentiment || 'neutral',
          sentimentScore: parsedResponse.sentimentScore || 0.5
        };
      } catch (parseError) {
        console.warn('JSON parsing failed, using fallback response');
        return {
          response: "How can I help you today?",
          action: 'continue',
          confidence: 30,
          sentiment: 'neutral',
          sentimentScore: 0.5
        };
      }
    } catch (error) {
      console.error('Error processing restaurant call:', error);
      return {
        response: "I'm sorry, I didn't catch that. Could you please repeat your question?",
        action: 'continue',
        confidence: 0,
        sentiment: 'neutral',
        sentimentScore: 0.5
      };
    }
  }
}

export const openaiService = new OpenAIService();