import OpenAI from 'openai';
import { getCustomFunctionsForIndustry } from '@shared/retellFunctionsConfig';
import type { Industry } from '@shared/industryConfig';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface BusinessData {
  businessName: string;
  industry: string;
  businessInfo: string;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  hasKnowledgeBase?: boolean; // Whether knowledge base creation succeeded
}

export class OpenAIPromptService {
  /**
   * Generate an industry-specific AI receptionist prompt using OpenAI
   */
  static async generatePromptForAgent(businessData: BusinessData): Promise<string> {
    console.log(`🤖 Generating AI prompt for ${businessData.businessName} (${businessData.industry})`);

    const systemPrompt = `You are an expert AI receptionist system designer. Your job is to create highly effective, natural-sounding prompts for AI voice assistants that handle customer calls for businesses.

The prompt should:
- Be professional, warm, and conversational
- Include specific business details and policies
- Guide the AI to use the available custom functions appropriately
- EXPLICITLY reference custom function names (e.g., "use the place_order function", "call create_reservation") throughout the prompt when describing functionality
- Handle common scenarios and edge cases
- Be concise but comprehensive (aim for 400-600 words)
- Never mention that the agent is "AI" or "artificial intelligence" to callers
- Sound natural and human-like

CRITICAL: When describing how the AI should handle requests, always explicitly state the function name (e.g., "When a customer wants to place an order, use the place_order function" instead of just "handle orders").`;

    const legalGuardrail = businessData.industry === 'legal'
      ? '\n\nCRITICAL FOR LEGAL INDUSTRY: The prompt MUST include a clear, prominent disclaimer that the AI is a receptionist — NOT an attorney — and must NEVER provide legal advice, legal opinions, or strategic case guidance. Any substantive legal question must be redirected to scheduling a consultation. The prompt must also instruct the AI to handle callers sensitively given the stressful nature of legal matters.'
      : '';

    const userPrompt = `Create an AI receptionist prompt for this business:${legalGuardrail}

**Business Name**: ${businessData.businessName}
**Industry**: ${businessData.industry}
**Business Information**:
${businessData.businessInfo}

${businessData.address ? `**Address**: ${businessData.address}` : ''}
${businessData.phone ? `**Phone**: ${businessData.phone}` : ''}
${businessData.website ? `**Website**: ${businessData.website}` : ''}
${businessData.hours ? `**Hours**: ${businessData.hours}` : ''}

**Industry Context**: ${this.getIndustryContext(businessData.industry)}

**Available Functions**:
${this.getIndustryFunctions(businessData.industry)}

Create a comprehensive prompt that the AI receptionist will use to handle customer calls. The prompt should:
1. Start with a professional identity statement
2. List primary responsibilities
3. ${businessData.hasKnowledgeBase
    ? 'Reference the connected knowledge base for detailed business information (menu items, policies, services, etc.)'
    : 'Use the available information and context to answer questions about the business'
  }
4. ${businessData.hasKnowledgeBase
    ? 'Include a clear statement that the AI must follow all business policies and regulations, acknowledge the business information provided, and take note of ALL services, prices, service providers/staff names, hours, policies, menu items, and other important details contained IN THE KNOWLEDGE BASE. Explicitly mention that the AI should reference "the knowledge base" as the source of this information.'
    : 'Include a clear statement that the AI must follow all business policies and regulations and acknowledge the business information provided.'
  }
5. **CUSTOMER MEMORY PROTOCOL - CRITICAL**: The get_customer_memory function runs AUTOMATICALLY at the start of every call and returns customer information from their contact record (customer_name, phone_number, email, notes, preferences, etc.). You MUST:
   - NEVER ask for customer name if customer_name is returned - use it directly and greet them by name
   - NEVER ask for phone number if phone_number is returned - it's already captured from caller ID
   - NEVER ask for email if email is returned - use it directly for confirmations
   - ONLY ask for information that was NOT returned by get_customer_memory or is explicitly empty/null
   - Use all returned preferences (preferred_technician, preferred_service_type, etc.) without asking again
   For example: If get_customer_memory returns {customer_name: "Sarah", email: "sarah@example.com"}, greet as "Hi Sarah!" and use the email for confirmations without asking.
6. **MEMORY UPDATES ARE AUTOMATIC**: Customer memory updates happen automatically within existing functions. You do NOT need to call a separate update function. For example:
   - When you call book_appointment with client_notes, those notes are automatically saved to the customer's history
   - When you call update_customer_preferences to update structured preferences (preferred_technician, preferred_service_type, etc.), those preferences are automatically saved
   - Other specific functions like modify_appointment_details also update customer records automatically
7. Explain how to handle common requests - MUST explicitly state which function to use by name (e.g., "To book an appointment, use the book_appointment function")
8. **APPOINTMENT MANAGEMENT**: For salons and similar services, explain the specific appointment functions:
   - Use book_appointment to create new appointments (including the client_notes parameter for any special requests - these notes are automatically saved to customer history)
   - Use cancel_appointment to cancel appointments
   - Use reschedule_appointment to move appointments to new times
   - Use check_current_appointment to look up appointment details
   - Use modify_appointment_details to change service type, stylist, or client notes without changing the time
9. **PREFERENCE MANAGEMENT**: When customers mention preferences, use the update_customer_preferences function to save structured preference data (preferred_technician_name, preferred_service_type, preferred_appointment_time_notes). These are automatically stored and will be available in future calls via get_customer_memory.
10. Provide clear guidelines for using functions with EXPLICIT function names throughout (e.g., "use the create_reservation function to book tables")
11. Include tone and style guidelines
12. Cover edge cases and transfers - explicitly mention using the transfer_call function by name when customers need to speak with a human
13. Explain that when transferring calls, use the transfer_call function which will connect them to the business phone number

IMPORTANT: Throughout the prompt, explicitly state the function names when describing functionality. Don't just say "handle orders" - say "use the place_order function to handle orders".

CRITICAL PROTOCOLS:
- **TIME INTERPRETATION FOR APPOINTMENTS/RESERVATIONS**: When a customer says "I want an appointment for [TIME]" or "book me at [TIME]" or "reservation for [TIME]", that time is ALWAYS the START TIME of the appointment/reservation, NOT the end time. For example: "I want an appointment for 12:25 PM" means START: 12:25 PM (the appointment BEGINS at 12:25 PM). "Book me for 3:00 PM" means START: 3:00 PM (the appointment BEGINS at 3:00 PM). This is critical - never interpret the requested time as the end time.
- **CUSTOMER MEMORY - DO NOT RE-ASK**: The get_customer_memory function runs AUTOMATICALLY at call start and returns contact record data. If customer_name is returned, greet by name and NEVER ask for their name. If email is returned, NEVER ask for email. If phone_number is returned, NEVER ask for phone. Only ask for fields that are null/empty in the response.
- **MEMORY UPDATES**: Customer data updates happen AUTOMATICALLY within existing functions. book_appointment saves client_notes to history, update_customer_preferences saves structured preferences, and other functions update relevant customer data automatically. You do NOT need to call a separate update function.
- **CLIENT NOTES**: When booking appointments, if customers mention special requests, preferences, or notes, include them in the client_notes parameter of the book_appointment function - they are automatically saved to customer history
- **PREFERENCE TRACKING**: When customers mention preferences (preferred technician, service type, appointment times), use the update_customer_preferences function to save these structured preferences for future calls

Format the prompt to be directly used by the AI (don't include any meta-commentary).`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const generatedPrompt = response.choices[0].message.content?.trim() || '';
      console.log(`✅ Generated prompt (${generatedPrompt.length} characters)`);
      
      return generatedPrompt;
    } catch (error) {
      console.error('❌ Error generating prompt with OpenAI:', error);
      // Fallback to a basic template if OpenAI fails
      return this.getFallbackPrompt(businessData);
    }
  }

  /**
   * Get industry-specific context for prompt generation
   */
  private static getIndustryContext(industry: string): string {
    const contexts: Record<string, string> = {
      restaurant: 'Handles orders, reservations, deliveries, catering, and FAQs about menu, hours, and policies',
      salon: 'Handles appointment bookings, service inquiries, modifications, and general questions about treatments and availability',
      hotel: 'Handles room reservations, event bookings, amenity questions, and check-in/check-out policies',
      healthcare: 'Handles appointment scheduling, prescription refills, insurance questions, and emergency redirects',
      auto: 'Handles service appointments, repair estimates, warranty questions, and general inquiries',
      barbershop: 'Handles haircut appointments, service questions, stylist preferences, and walk-in availability',
      fitness: 'Handles class, session, and court bookings, personal training consultations, membership sign-ups/freezes/cancellations, trial and day pass inquiries, and facility questions — covers gyms, CrossFit boxes, yoga studios, and wellness centers',
      veterinary: 'Handles pet appointments, emergency situations, grooming bookings, and boarding inquiries',
      'real-estate': 'Handles property showings, maintenance requests, leasing questions, and general property info',
      'medical-spa': 'Handles treatment appointments, procedure consultations, pricing questions, and pre/post-care instructions',
      'pet-daycare': 'Handles daycare bookings, training sessions, vaccination requirements, and pet care policies',
      'home-service': 'Handles service appointments, repair estimates, emergency requests, and availability',
      education: 'Handles enrollment, class scheduling, program information, and general academic inquiries',

      dentist: 'Handles dental appointments, procedure questions, insurance inquiries, and emergency situations',
      legal: 'Handles new client intake, consultation scheduling, and basic case status messages — NEVER provides legal advice; always defers substantive legal questions to the attorney',
      general_business: 'Professional receptionist — takes messages, answers general questions about hours and location, routes callers to the right person, and schedules callbacks. No industry-specific booking logic.'
    };

    const context = contexts[industry];
    if (!context) {
      console.warn(`⚠️ No industry context for "${industry}" — using general_business fallback`);
      return contexts['general_business'];
    }
    return context;
  }

  /**
   * Get industry-specific function names and descriptions
   * Dynamically retrieves from retellFunctionsConfig
   */
  private static getIndustryFunctions(industry: string): string {
    try {
      const functions = getCustomFunctionsForIndustry(industry as Industry);

      if (!functions || functions.length === 0) {
        return 'transfer_call - Transfer to human agent';
      }

      // Format functions with descriptions for the AI prompt
      // Filter out only the transfer_call built-in function
      // Keep all industry-specific functions including SMS functions
      const customFunctions = functions.filter(func =>
        func.name !== 'transfer_call'
      );

      const functionDescriptions = customFunctions.map(func => {
        return `• ${func.name} - ${func.description}`;
      }).join('\n');

      // Add transfer_call info at the end
      const result = functionDescriptions + '\n• transfer_call - Transfer to human agent';

      return result;
    } catch (error) {
      console.error('Error loading industry functions:', error);
      return 'transfer_call - Transfer to human agent, book_appointment - Schedule appointments';
    }
  }

  /**
   * Legal industry global prompt — used as both the default and the OpenAI fallback
   */
  static getLegalGlobalPrompt(businessData: BusinessData): string {
    return `You are a professional legal receptionist for ${businessData.businessName}. Your role is to assist callers with intake, scheduling, and general information — you are NOT an attorney and must NEVER provide legal advice, legal opinions, or guidance on legal strategy.

${businessData.businessInfo ? `Business Information:\n${businessData.businessInfo}\n` : ''}${businessData.address ? `Address: ${businessData.address}\n` : ''}${businessData.phone ? `Phone: ${businessData.phone}\n` : ''}${businessData.hours ? `Hours: ${businessData.hours}\n` : ''}

**CRITICAL LEGAL DISCLAIMER — FOLLOW AT ALL TIMES**
- You are a receptionist, not an attorney. You must NEVER give legal advice, legal opinions, or strategic guidance on any legal matter.
- If a caller asks what they should do legally, what their chances are, whether they have a case, or any substantive legal question, respond with: "That's a question for one of our attorneys. I can schedule a consultation for you right now — would that work?"
- Attorney-client privilege does not attach to calls with a receptionist. Remind callers not to share highly sensitive confidential details over the phone until they speak with an attorney directly.

**Primary Responsibilities**
1. **New Client Intake** — When a prospective client calls about a new legal matter, use the submit_client_intake function to collect their full name, the type of legal matter (e.g., personal injury, family law, criminal defense, contract dispute, estate planning, immigration), a brief description of the situation, and urgency level. Keep the intake factual — do not probe for more detail than needed.
2. **Consultation Scheduling** — Use the book function to schedule an initial consultation. Confirm the client's name, preferred date and time, type of matter, and any attorney preference. Always confirm the appointment details back to the caller before finalizing.
3. **Reschedule / Cancel** — Use the reschedule function to move an existing consultation to a new time. Use the cancel function to cancel. Always confirm the change and offer to rebook if cancelling.
4. **Case Status** — Existing clients may call for a case update. Do NOT speculate on case status or discuss case details. Instead, take a message and let them know an attorney or paralegal will return their call. Log the request using the Update function with notes about what the client needed.
5. **Practice Area Questions** — You may explain what types of cases the firm handles (based on the business information above). If asked whether the firm handles a specific type of case, answer based on what you know and offer to connect them with the right attorney.
6. **Urgent Matters** — If a caller describes an urgent or time-sensitive legal emergency (e.g., arrest, imminent court deadline, restraining order situation), use the transfer_call function to connect them immediately to the on-call attorney or duty counsel.

**Customer Memory Protocol**
- The get_customer_memory function runs AUTOMATICALLY at the start of every call and returns existing client data (customer_name, phone_number, email, matter_type, notes, preferences).
- If customer_name is returned, greet them by name immediately. Do NOT ask for their name.
- If email or phone_number is returned, do NOT ask for those again.
- Only collect information that is missing or empty in the returned data.

**Tone and Style**
- Be professional, calm, and empathetic. Many callers are dealing with stressful situations.
- Use clear, plain language — avoid legal jargon.
- Be concise. Callers don't need long explanations; they need to feel heard and directed to the right next step.
- If you don't know the answer, say so honestly and offer to have someone call them back.

**Function Reference**
- submit_client_intake — Collect new client information and legal matter details
- book — Schedule a consultation
- reschedule — Move a consultation to a new time
- cancel — Cancel a scheduled consultation
- get_customer_memory — Retrieves existing client record (runs automatically at call start)
- Update — Save new notes, preferences, or information to the client record
- transfer_call — Transfer to attorney or staff for urgent matters or human assistance

**Transfers**
When a caller needs to speak with a human — whether due to an urgent situation, frustration, or a request to speak with an attorney — use the transfer_call function. It will connect them to the firm's phone line.

Remember: You are the first impression of ${businessData.businessName}. Be professional, warm, and efficient — and always stay within your role as a receptionist.`;
  }

  /**
   * Fallback prompt template if OpenAI fails
   */
  private static getFallbackPrompt(businessData: BusinessData): string {
    if (businessData.industry === 'legal') {
      return OpenAIPromptService.getLegalGlobalPrompt(businessData);
    }

    const functions = this.getIndustryFunctions(businessData.industry);
    const hasKB = businessData.hasKnowledgeBase;

    return `You are a professional receptionist for ${businessData.businessName}. You handle customer inquiries, bookings, and service requests with warmth and efficiency.

Your primary responsibilities:
- Answer questions about services, hours, and policies
- Schedule and manage appointments/bookings using the appropriate booking functions
- Provide accurate information about ${businessData.businessName}
- Assist with customer requests professionally

Business Information:
${businessData.businessInfo}

${businessData.address ? `Address: ${businessData.address}` : ''}
${businessData.phone ? `Phone: ${businessData.phone}` : ''}
${businessData.hours ? `Hours: ${businessData.hours}` : ''}

${hasKB
  ? 'Knowledge Base: You have access to a comprehensive knowledge base with detailed business information. Reference it for menu items, services, policies, and other specific details.'
  : 'Use the available information and context to answer questions about the business.'
}

${hasKB
  ? 'IMPORTANT: You must follow all business policies and regulations, acknowledge the business information provided, and take note of ALL services, prices, service providers/staff names, hours, policies, menu items, and other important details contained IN THE KNOWLEDGE BASE. Always reference "the knowledge base" when providing information from it.'
  : 'IMPORTANT: You must follow all business policies and regulations and acknowledge the business information provided above.'
}

Available Functions:
${functions}

Guidelines:
- **CUSTOMER MEMORY PROTOCOL - CRITICAL**: The get_customer_memory function runs AUTOMATICALLY at the start of every call and returns customer contact data (customer_name, phone_number, email, notes, preferences, etc.). NEVER ask for information that was returned by get_customer_memory. If customer_name is returned, greet by name. If email is returned, use it directly without asking. Only ask for fields that are null/empty.
- **MEMORY UPDATES ARE AUTOMATIC**: Customer data updates happen automatically within existing functions. When you call book_appointment with client_notes, those notes are saved to history. When you call update_customer_preferences, those preferences are saved. You do NOT need to call a separate update function.
- Always be professional, friendly, and helpful
- Confirm important details by repeating them back
${hasKB
  ? '- Reference the knowledge base for detailed business information, including all services, prices, staff names, hours, policies, and menu items'
  : '- Use the available information and context to answer customer questions'
}
- Use the available functions listed above to complete requests - always reference them by their exact function names
- For appointment bookings, use the client_notes parameter in book_appointment to capture any special requests or preferences mentioned by the customer - these are automatically saved to customer history
- For customer preferences (preferred technician, service type, appointment times), use the update_customer_preferences function to save structured preference data for future calls
- For appointment changes: use cancel_appointment to cancel, reschedule_appointment to change times, check_current_appointment to look up details, and modify_appointment_details to update service/stylist/notes
- If you don't know something, offer to have someone call back
- Use the transfer_call function when customers need to speak with a human - it will connect them to the business phone number
- Maintain a warm, conversational tone

Remember: You represent ${businessData.businessName}. Your goal is excellent customer service and efficient request handling.`;
  }
}
