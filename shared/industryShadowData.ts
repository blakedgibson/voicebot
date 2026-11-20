/**
 * Industry Shadow Data — Synthetic Training FAQs
 *
 * Used as a fallback when automated data extraction returns confidence < 40.
 * Pre-loads the agent with the top real-world questions callers ask for each industry,
 * so the AI can answer intelligently while the user completes manual setup.
 *
 * Source: aggregated from Google My Business Q&A, Yelp reviews, and industry research.
 */

export interface ShadowFAQ {
  question: string;
  defaultAnswer: string; // Placeholder — replaced with real data once onboarding completes
}

export interface IndustryShadowProfile {
  industry: string;
  commonCallReasons: string[]; // Priority 1-5 reasons people call
  faqs: ShadowFAQ[];
  defaultServices: string[]; // Pre-loaded service menu for MVO "Service Menu" section
  callGoalSuggestion: string; // Default answer for "What is the #1 reason people call you?"
}

const SHADOW_DATA: Record<string, IndustryShadowProfile> = {

  restaurant: {
    industry: 'restaurant',
    commonCallReasons: ['Make a reservation', 'Ask about hours', 'Place a takeout order', 'Ask about the menu', 'Cancel or modify a reservation'],
    defaultServices: ['Dine-in', 'Takeout', 'Delivery', 'Catering', 'Private Events'],
    callGoalSuggestion: 'Take reservations and answer menu questions',
    faqs: [
      { question: 'What are your hours?', defaultAnswer: 'Our hours are listed on our website. Please confirm with staff as hours may vary.' },
      { question: 'Do you take reservations?', defaultAnswer: 'Yes, we accept reservations. I can book one for you right now.' },
      { question: 'Is there parking?', defaultAnswer: 'Please ask our staff about parking availability when you arrive.' },
      { question: 'Do you have vegetarian or vegan options?', defaultAnswer: 'We have options for most dietary needs. Our staff can walk you through the menu.' },
      { question: 'Do you do delivery?', defaultAnswer: 'Yes, we offer delivery. I can help you place an order or direct you to our delivery partner.' },
      { question: 'How long is the wait?', defaultAnswer: 'Wait times vary. I can check current availability if you would like to come in.' },
      { question: 'Can I make a large group reservation?', defaultAnswer: 'Yes, we accommodate groups. Let me take down your details and we will confirm with the team.' },
    ],
  },

  medical: {
    industry: 'medical',
    commonCallReasons: ['Schedule an appointment', 'Prescription refill request', 'Ask about insurance', 'Get test results', 'Cancel or reschedule'],
    defaultServices: ['New Patient Appointments', 'Follow-up Visits', 'Prescription Refills', 'Lab Results', 'Referrals'],
    callGoalSuggestion: 'Schedule patient appointments and handle prescription refill requests',
    faqs: [
      { question: 'Are you accepting new patients?', defaultAnswer: 'Please hold while I check availability. I can schedule an appointment for new patients.' },
      { question: 'Do you accept my insurance?', defaultAnswer: 'We work with most major insurance plans. I can have our billing team confirm your coverage.' },
      { question: 'How do I get a prescription refill?', defaultAnswer: 'I can submit a refill request for you. I will need your name and date of birth to look up your record.' },
      { question: 'How long until my appointment?', defaultAnswer: 'We have availability within the next few days. What day works best for you?' },
      { question: 'What should I bring to my first appointment?', defaultAnswer: 'Please bring a valid photo ID, your insurance card, and a list of current medications.' },
      { question: 'Is the doctor available today?', defaultAnswer: 'Let me check the schedule. In many cases we can fit same-day or next-day appointments.' },
    ],
  },

  dental: {
    industry: 'dentist',
    commonCallReasons: ['Schedule a cleaning or checkup', 'Report tooth pain or emergency', 'Ask about a procedure cost', 'Cancel or reschedule', 'Ask about insurance'],
    defaultServices: ['Cleanings', 'Fillings', 'Extractions', 'Teeth Whitening', 'Crowns & Bridges', 'Emergency Dental'],
    callGoalSuggestion: 'Schedule dental appointments and handle dental emergency calls',
    faqs: [
      { question: 'Do you handle dental emergencies?', defaultAnswer: 'Yes, we handle dental emergencies. If you are in pain right now, I will get you scheduled today.' },
      { question: 'How much does a cleaning cost?', defaultAnswer: 'Cost depends on your insurance. We will verify your benefits before your visit.' },
      { question: 'Do you accept my insurance?', defaultAnswer: 'We work with most major dental plans. Our team can verify your coverage before your appointment.' },
      { question: 'Do you do teeth whitening?', defaultAnswer: 'Yes, we offer professional whitening. I can schedule a consultation to find the best option for you.' },
      { question: 'Are you accepting new patients?', defaultAnswer: 'Yes, we are accepting new patients. I can get you booked right away.' },
    ],
  },

  salon: {
    industry: 'salon',
    commonCallReasons: ['Book a hair appointment', 'Ask about services and pricing', 'Request a specific stylist', 'Cancel or reschedule', 'Ask about walk-in availability'],
    defaultServices: ['Haircut', 'Color', 'Highlights', 'Blowout', 'Keratin Treatment', 'Extensions'],
    callGoalSuggestion: 'Book hair appointments and answer service pricing questions',
    faqs: [
      { question: 'How much does a haircut cost?', defaultAnswer: 'Pricing depends on the service and stylist. I can quote you when you book.' },
      { question: 'Do you take walk-ins?', defaultAnswer: 'We do accept walk-ins based on availability. Booking ahead guarantees your spot.' },
      { question: 'Can I request a specific stylist?', defaultAnswer: 'Absolutely. Just let me know who you prefer and I will check their availability.' },
      { question: 'How long does a color appointment take?', defaultAnswer: 'Color typically takes 2–3 hours depending on the service. I can block the right amount of time when we book.' },
      { question: 'Do you do extensions?', defaultAnswer: 'Yes, we offer hair extensions. A consultation is usually recommended first to match your hair type.' },
    ],
  },

  barbershop: {
    industry: 'barbershop',
    commonCallReasons: ['Book a haircut', 'Ask about walk-in wait time', 'Ask about pricing', 'Request a specific barber', 'Ask about beard services'],
    defaultServices: ['Haircut', 'Beard Trim', 'Hot Towel Shave', 'Fade', 'Hair Coloring', 'Kids Cut'],
    callGoalSuggestion: 'Book haircut appointments and manage walk-in questions',
    faqs: [
      { question: 'How long is the wait for a walk-in?', defaultAnswer: 'Wait times change throughout the day. I can book you an appointment to skip the wait.' },
      { question: 'How much is a haircut?', defaultAnswer: 'Prices start around standard industry rates. I can give you the exact price when you book.' },
      { question: 'Do you do beard trims?', defaultAnswer: 'Yes, we do beard trims and hot towel shaves.' },
      { question: 'Can I book with a specific barber?', defaultAnswer: 'Absolutely. Let me know who you prefer and I will check their next open slot.' },
      { question: 'Do you cut kids hair?', defaultAnswer: 'Yes, we do kids haircuts. I can get you booked right away.' },
    ],
  },

  fitness: {
    industry: 'fitness',
    commonCallReasons: ['Ask about membership pricing', 'Book a class or session', 'Ask about trial pass', 'Cancel or freeze membership', 'Ask about personal training'],
    defaultServices: ['Group Classes', 'Personal Training', 'Day Pass', 'Monthly Membership', 'Annual Membership', 'Nutrition Coaching'],
    callGoalSuggestion: 'Answer membership questions and book classes or training sessions',
    faqs: [
      { question: 'How much is a membership?', defaultAnswer: 'We have monthly and annual plans. I can walk you through current pricing and any active promotions.' },
      { question: 'Do you offer a free trial?', defaultAnswer: 'Yes, we offer a complimentary first visit. I can schedule that for you right now.' },
      { question: 'What classes do you offer?', defaultAnswer: 'We offer a full schedule of classes. I can tell you what is available this week.' },
      { question: 'Do you have personal trainers?', defaultAnswer: 'Yes, we have certified personal trainers. A consultation is the best first step — I can schedule one.' },
      { question: 'Can I freeze my membership?', defaultAnswer: 'Yes, membership freezes are available. I can note your request and have our team follow up with details.' },
      { question: 'Is there a contract?', defaultAnswer: 'We have both month-to-month and contract options. I can go over both with you.' },
    ],
  },

  veterinary: {
    industry: 'veterinary',
    commonCallReasons: ['Schedule a wellness visit', 'Report a pet emergency', 'Ask about vaccinations', 'Request a prescription refill', 'Ask about boarding or grooming'],
    defaultServices: ['Wellness Exams', 'Vaccinations', 'Surgery', 'Dental Cleaning', 'Grooming', 'Boarding', 'Emergency Care'],
    callGoalSuggestion: 'Schedule pet appointments and handle pet health emergencies',
    faqs: [
      { question: 'Do you handle emergencies?', defaultAnswer: 'Yes, we handle pet emergencies. If your pet needs urgent care, I can get you in immediately.' },
      { question: 'How much does a checkup cost?', defaultAnswer: 'Exam fees vary based on services needed. I can provide an estimate when you come in.' },
      { question: 'Do you board animals?', defaultAnswer: 'Yes, we offer boarding services. I can check availability for your dates.' },
      { question: 'What vaccines does my pet need?', defaultAnswer: 'Core vaccines depend on your pet\'s species and age. Our vet will review the full protocol at the appointment.' },
      { question: 'Do you do grooming?', defaultAnswer: 'Yes, grooming is available. Let me find you an open slot.' },
    ],
  },

  'pet-daycare': {
    industry: 'pet-daycare',
    commonCallReasons: ['Book a daycare spot', 'Ask about vaccination requirements', 'Ask about pricing', 'Check availability', 'Ask about what to bring'],
    defaultServices: ['Full-Day Daycare', 'Half-Day Daycare', 'Training Classes', 'Grooming Add-on', 'Pick-up & Drop-off'],
    callGoalSuggestion: 'Book daycare reservations and answer vaccination requirement questions',
    faqs: [
      { question: 'What vaccines are required?', defaultAnswer: 'We require up-to-date rabies, distemper, and Bordetella vaccines. You can email or bring records on the first visit.' },
      { question: 'How much does daycare cost?', defaultAnswer: 'Pricing depends on the day package. I can give you full pricing right now.' },
      { question: 'How do I sign up for the first time?', defaultAnswer: 'We start with a meet-and-greet to assess your pet. I can schedule that for you.' },
      { question: 'Is there a ratio of staff to dogs?', defaultAnswer: 'We maintain safe staff-to-dog ratios in every play group.' },
      { question: 'What do I need to bring on the first day?', defaultAnswer: 'Bring vaccination records, a collar with ID tag, and any comfort items you would like your pet to have.' },
    ],
  },

  hotel: {
    industry: 'hotel',
    commonCallReasons: ['Make a room reservation', 'Ask about check-in/check-out times', 'Cancel or modify a reservation', 'Ask about amenities', 'Ask about events or group bookings'],
    defaultServices: ['Room Reservations', 'Event Booking', 'Concierge Services', 'Room Service', 'Airport Shuttle'],
    callGoalSuggestion: 'Take room reservations and answer amenity questions',
    faqs: [
      { question: 'What time is check-in?', defaultAnswer: 'Standard check-in is 3 PM and check-out is 11 AM. Early check-in may be available.' },
      { question: 'Do you have parking?', defaultAnswer: 'Yes, we have parking available. Rates and availability can be confirmed at check-in.' },
      { question: 'Is breakfast included?', defaultAnswer: 'That depends on your rate type. I can confirm what is included with your booking.' },
      { question: 'Do you allow pets?', defaultAnswer: 'We have pet-friendly rooms available. Let me check availability for your dates.' },
      { question: 'Do you have a pool?', defaultAnswer: 'Let me confirm our current amenities for your visit.' },
    ],
  },

  auto: {
    industry: 'auto',
    commonCallReasons: ['Schedule a service appointment', 'Get a repair estimate', 'Ask about oil change', 'Ask wait time', 'Ask about warranty coverage'],
    defaultServices: ['Oil Change', 'Tire Rotation', 'Brake Service', 'Engine Diagnostics', 'AC Repair', 'Transmission Service'],
    callGoalSuggestion: 'Schedule service appointments and provide repair estimates',
    faqs: [
      { question: 'How much is an oil change?', defaultAnswer: 'Oil change pricing depends on the oil type and your vehicle. Standard synthetic starts around industry average pricing.' },
      { question: 'Do you need an appointment?', defaultAnswer: 'Appointments are recommended but we do accept walk-ins for most services based on availability.' },
      { question: 'How long will it take?', defaultAnswer: 'Most standard services take 1–2 hours. Diagnostics and major repairs may take longer.' },
      { question: 'Do you offer a loaner car?', defaultAnswer: 'Loaner availability varies. I can check when we schedule your appointment.' },
      { question: 'Do you work on my make and model?', defaultAnswer: 'We service most makes and models. I can confirm specifics when we book your appointment.' },
      { question: 'Do you do free estimates?', defaultAnswer: 'Yes, we provide free estimates for most services after a quick diagnostic review.' },
    ],
  },

  'home-service': {
    industry: 'home-service',
    commonCallReasons: ['Schedule a service call', 'Request an estimate', 'Report an emergency', 'Ask about availability today', 'Ask about pricing'],
    defaultServices: ['Emergency Service', 'Installation', 'Maintenance & Tune-up', 'Inspection', 'Repair', 'Replacement'],
    callGoalSuggestion: 'Book service appointments and handle emergency service requests',
    faqs: [
      { question: 'Do you offer emergency service?', defaultAnswer: 'Yes, we offer 24/7 emergency service. I can dispatch someone immediately.' },
      { question: 'What is the service call fee?', defaultAnswer: 'Service call fees vary by service type. I can provide a full quote once we assess the job.' },
      { question: 'Are you licensed and insured?', defaultAnswer: 'Yes, we are fully licensed and insured.' },
      { question: 'How soon can you come out?', defaultAnswer: 'We have openings this week and can often do same-day for urgent requests.' },
      { question: 'Do you offer free estimates?', defaultAnswer: 'Yes, we provide free estimates on most projects.' },
      { question: 'What brands do you work with?', defaultAnswer: 'We work with all major brands and can source most parts quickly.' },
    ],
  },

  'real-estate': {
    industry: 'real-estate',
    commonCallReasons: ['Schedule a property showing', 'Ask about a listing', 'Request a market analysis', 'Submit a maintenance request', 'Ask about lease terms'],
    defaultServices: ['Property Showings', 'Buyer Consultations', 'Seller Consultations', 'Rental Inquiries', 'Market Analysis', 'Maintenance Requests'],
    callGoalSuggestion: 'Schedule property showings and capture new buyer or seller leads',
    faqs: [
      { question: 'Is the property still available?', defaultAnswer: 'Let me check the current status of that listing for you.' },
      { question: 'Can I schedule a showing?', defaultAnswer: 'Absolutely. I can get a showing on the calendar right now — what day works for you?' },
      { question: 'What is the asking price?', defaultAnswer: 'I can pull up the full listing details. Which property are you asking about?' },
      { question: 'How do I submit a maintenance request?', defaultAnswer: 'I can log a maintenance request for you right now. What is the issue?' },
      { question: 'What is included in rent?', defaultAnswer: 'I will connect you with an agent who can walk through all lease inclusions.' },
    ],
  },

  'medical-spa': {
    industry: 'medical-spa',
    commonCallReasons: ['Book a treatment appointment', 'Ask about Botox or fillers pricing', 'Ask about a specific procedure', 'Ask about recovery time', 'Cancel or reschedule'],
    defaultServices: ['Botox / Dysport', 'Dermal Fillers', 'Laser Skin Resurfacing', 'Chemical Peels', 'Microneedling', 'Body Contouring', 'Consultations'],
    callGoalSuggestion: 'Book treatment consultations and answer procedure and pricing questions',
    faqs: [
      { question: 'How much does Botox cost?', defaultAnswer: 'Botox pricing is per unit and depends on the area treated. I can book a consultation where pricing will be discussed.' },
      { question: 'How long is the recovery?', defaultAnswer: 'Most non-surgical treatments have minimal downtime — same-day or next-day return to normal activities.' },
      { question: 'Do you offer free consultations?', defaultAnswer: 'Yes, we offer complimentary consultations. I can schedule one for you right now.' },
      { question: 'Are the providers licensed?', defaultAnswer: 'All our providers are licensed medical professionals.' },
      { question: 'How long do results last?', defaultAnswer: 'Results vary by treatment. Our providers review full timelines during your consultation.' },
    ],
  },

  legal: {
    industry: 'legal',
    commonCallReasons: ['Speak with an attorney about a new matter', 'Schedule an initial consultation', 'Ask about practice areas', 'Get a case status update', 'Ask about fees'],
    defaultServices: ['Free Consultation', 'Personal Injury', 'Family Law', 'Criminal Defense', 'Estate Planning', 'Contract Review', 'Business Law'],
    callGoalSuggestion: 'Capture new client intake information and schedule initial consultations',
    faqs: [
      { question: 'Do you offer free consultations?', defaultAnswer: 'Yes, we offer a complimentary initial consultation. I can schedule that for you right now.' },
      { question: 'What type of cases do you handle?', defaultAnswer: 'I can provide a general overview of our practice areas and connect you with the right attorney.' },
      { question: 'How much do you charge?', defaultAnswer: 'Fee structures depend on the case type — some matters are contingency-based. Our attorney will discuss fees in your consultation.' },
      { question: 'How long will my case take?', defaultAnswer: 'Case timelines vary significantly. That is a question best answered by the attorney after reviewing your situation.' },
      { question: 'Is my call confidential?', defaultAnswer: 'This is a receptionist line. Calls are not privileged until you speak with an attorney directly.' },
    ],
  },

  education: {
    industry: 'education',
    commonCallReasons: ['Ask about enrollment', 'Schedule a campus visit or tour', 'Ask about program options', 'Ask about tuition and financial aid', 'Speak with a specific department'],
    defaultServices: ['Enrollment Inquiry', 'Campus Tours', 'Program Information', 'Tuition & Financial Aid', 'Student Services', 'Admissions'],
    callGoalSuggestion: 'Handle enrollment inquiries and schedule campus visits',
    faqs: [
      { question: 'How do I enroll?', defaultAnswer: 'I can walk you through the enrollment process and schedule you with an admissions advisor.' },
      { question: 'What programs do you offer?', defaultAnswer: 'We offer a range of programs. I can provide an overview or connect you with the right department.' },
      { question: 'How much is tuition?', defaultAnswer: 'Tuition varies by program. Financial aid is available — I can schedule you with a financial aid advisor.' },
      { question: 'Can I schedule a campus tour?', defaultAnswer: 'Absolutely. I can book a tour for you right now — what days work best?' },
      { question: 'What are your admission requirements?', defaultAnswer: 'Requirements vary by program. I can connect you with admissions to walk through specifics.' },
    ],
  },

  'professional-services': {
    industry: 'professional-services',
    commonCallReasons: ['Schedule a consultation', 'Ask about services and pricing', 'Get a project estimate', 'Ask about availability', 'Speak with a specific team member'],
    defaultServices: ['Initial Consultation', 'Project Estimate', 'Ongoing Retainer', 'One-Time Project', 'Advisory Services'],
    callGoalSuggestion: 'Schedule consultations and capture new client inquiries',
    faqs: [
      { question: 'What services do you offer?', defaultAnswer: 'We offer a range of professional services. I can walk you through our offerings or schedule a consultation.' },
      { question: 'How much do you charge?', defaultAnswer: 'Pricing depends on the scope of work. A consultation is the best first step for an accurate quote.' },
      { question: 'Can I speak with someone today?', defaultAnswer: 'I can check availability and schedule a call or meeting for you.' },
      { question: 'How quickly can you start?', defaultAnswer: 'Availability varies. Let me note your timeline and have our team follow up.' },
    ],
  },

  retail: {
    industry: 'retail',
    commonCallReasons: ['Check if an item is in stock', 'Ask about store hours', 'Ask about return policy', 'Ask about promotions', 'Find a specific product'],
    defaultServices: ['In-Store Shopping', 'Curbside Pickup', 'Online Orders', 'Gift Cards', 'Returns & Exchanges'],
    callGoalSuggestion: 'Answer product availability questions and assist with orders',
    faqs: [
      { question: 'Do you have [product] in stock?', defaultAnswer: 'I can check on that item for you. Which product are you looking for?' },
      { question: 'What is your return policy?', defaultAnswer: 'We accept returns within a standard window with a receipt. I can give you the full details.' },
      { question: 'Do you price match?', defaultAnswer: 'Our team can review price match requests. I can log your inquiry for follow-up.' },
      { question: 'What are your hours?', defaultAnswer: 'Our hours are available on our website. I can confirm current hours for your location.' },
      { question: 'Do you offer gift wrapping?', defaultAnswer: 'Gift services are available in-store. I can confirm details when you arrive.' },
    ],
  },

  general_business: {
    industry: 'general_business',
    commonCallReasons: ['Get general information', 'Leave a message for staff', 'Request a callback', 'Ask about hours and location', 'Speak with the owner or manager'],
    defaultServices: ['General Inquiry', 'Message Taking', 'Callback Scheduling', 'Staff Transfer', 'Hours & Location'],
    callGoalSuggestion: 'Take messages and connect callers with the right person',
    faqs: [
      { question: 'What are your hours?', defaultAnswer: 'I can check on our current business hours. Let me confirm that for you.' },
      { question: 'Can I speak with someone?', defaultAnswer: 'I can transfer you to a team member or take a message and have someone call you back.' },
      { question: 'Where are you located?', defaultAnswer: 'Let me provide our address and any directions that may be helpful.' },
      { question: 'Can I leave a message?', defaultAnswer: 'Of course — I will take down your name, number, and the message and make sure it gets to the right person.' },
    ],
  },

};

/**
 * Get shadow profile for an industry. Falls back to general_business for unknown industries.
 */
export function getShadowDataForIndustry(industry: string): IndustryShadowProfile {
  return SHADOW_DATA[industry] ?? SHADOW_DATA['general_business'];
}

/**
 * Generate a pre-loaded business info text from shadow data.
 * Used as draft agent context when real data is unavailable.
 */
export function buildShadowBusinessInfo(industry: string, businessName: string): string {
  const shadow = getShadowDataForIndustry(industry);
  const faqText = shadow.faqs
    .map(f => `Q: ${f.question}\nA: ${f.defaultAnswer}`)
    .join('\n\n');

  return `
[DRAFT — Standard ${shadow.industry.replace(/_/g, ' ')} protocols loaded. Customize in Settings.]

Business: ${businessName}

Primary Call Goal: ${shadow.callGoalSuggestion}

Top Reasons Customers Call:
${shadow.commonCallReasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Services Offered:
${shadow.defaultServices.join(', ')}

Frequently Asked Questions:
${faqText}
`.trim();
}
