/**
 * Required Business Information by Industry
 *
 * Defines exactly what each industry's AI agent NEEDS to function correctly.
 * Fields absent from extraction = hallucination risk:
 *   - Missing services → AI invents services the business doesn't offer
 *   - Missing hours    → AI quotes the default 9–5 placeholder as real hours
 *   - Missing policies → AI makes up policies (walk-ins, emergencies, new patients)
 *
 * Used by:
 *   - extractionGapAnalyzer.ts (server) — determines what's missing after scraping
 *   - SetupCompletionModal.tsx (client) — drives field highlighting and pre-fill
 *   - SubscriptionProvisioningService.ts — scores extraction quality and triggers MVO
 */

export type FieldCategory = 'vitals' | 'services' | 'policy' | 'pricing' | 'booking';
export type FormField = 'phone' | 'address' | 'businessHours' | 'services' | 'aboutDescription' | 'pricingModel' | 'callGoal';

export interface RequiredField {
  /** Internal key — used for gap analysis matching */
  key: string;
  /** Human-readable label shown in the form */
  label: string;
  /** Which form input in SetupCompletionModal this maps to */
  formField: FormField;
  /** Grouping for form layout */
  category: FieldCategory;
  /** Shown as inline helper — why the agent needs this to avoid hallucination */
  whyNeeded: string;
  /** Input placeholder when field is empty */
  placeholder: string;
  /** Text vs multi-line */
  inputType: 'text' | 'textarea';
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal — required for every industry
// ─────────────────────────────────────────────────────────────────────────────

export const UNIVERSAL_REQUIRED_FIELDS: RequiredField[] = [
  {
    key: 'phone',
    label: 'Business Phone Number',
    formField: 'phone',
    category: 'vitals',
    whyNeeded: 'Used when callers ask for your number or when a call needs to be transferred to staff',
    placeholder: '(555) 123-4567',
    inputType: 'text',
  },
  {
    key: 'address',
    label: 'Physical Address',
    formField: 'address',
    category: 'vitals',
    whyNeeded: 'Callers frequently ask for your location or directions — wrong address sends them elsewhere',
    placeholder: '123 Main St, City, State 12345',
    inputType: 'text',
  },
  {
    key: 'hours',
    label: 'Business Hours',
    formField: 'businessHours',
    category: 'vitals',
    whyNeeded: 'Your AI will quote these hours on every call — the default placeholder is 9am–5pm which is almost certainly wrong',
    placeholder: 'Mon–Fri 9am–6pm, Sat 10am–4pm, Sun Closed',
    inputType: 'text',
  },
  {
    key: 'services',
    label: 'Services You Actually Offer',
    formField: 'services',
    category: 'services',
    whyNeeded: 'Without a real service list the AI will invent services your business does not have — this causes bookings for things you can\'t deliver',
    placeholder: 'List your actual services, separated by commas',
    inputType: 'textarea',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Industry-specific required fields
// ─────────────────────────────────────────────────────────────────────────────

export const INDUSTRY_REQUIRED_FIELDS: Record<string, RequiredField[]> = {

  restaurant: [
    {
      key: 'menu_categories',
      label: 'Menu or Food Categories',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: 'Callers ask "what do you serve?" on nearly every call — without a menu the AI will invent dishes',
      placeholder: 'e.g. Burgers, tacos, salads, appetizers, desserts. Gluten-free and vegan options available.',
      inputType: 'textarea',
    },
    {
      key: 'ordering_options',
      label: 'Ordering Options (Dine-in / Takeout / Delivery)',
      formField: 'callGoal',
      category: 'policy',
      whyNeeded: '"Do you do takeout?" is asked before almost every food order — wrong answer loses the sale',
      placeholder: 'e.g. Dine-in, takeout, and delivery via DoorDash. No third-party ordering for custom requests.',
      inputType: 'text',
    },
  ],

  medical: [
    {
      key: 'accepting_new_patients',
      label: 'Accepting New Patients?',
      formField: 'callGoal',
      category: 'policy',
      whyNeeded: 'The #1 question new callers ask — a wrong "yes" when you\'re at capacity wastes your staff\'s time',
      placeholder: 'Yes, we are accepting new patients / No, currently at capacity for new patients',
      inputType: 'text',
    },
    {
      key: 'insurance_accepted',
      label: 'Insurance Plans Accepted',
      formField: 'aboutDescription',
      category: 'policy',
      whyNeeded: 'Insurance is the second question every new patient asks — AI must know which plans you accept',
      placeholder: 'e.g. Blue Cross Blue Shield, Aetna, United Healthcare, Medicare. Also self-pay.',
      inputType: 'textarea',
    },
  ],

  dentist: [
    {
      key: 'accepting_new_patients',
      label: 'Accepting New Patients?',
      formField: 'callGoal',
      category: 'policy',
      whyNeeded: 'Most dental callers are new patients — a wrong answer makes you look unprepared',
      placeholder: 'Yes, accepting new patients / Currently at capacity — check back in [timeframe]',
      inputType: 'text',
    },
    {
      key: 'dental_insurance',
      label: 'Dental Insurance Plans Accepted',
      formField: 'aboutDescription',
      category: 'policy',
      whyNeeded: 'Dental insurance determines whether a patient books or hangs up — AI must know your network',
      placeholder: 'e.g. Delta Dental, Cigna, MetLife, Guardian. Also fee-for-service.',
      inputType: 'textarea',
    },
    {
      key: 'emergency_protocol',
      label: 'Dental Emergency Protocol',
      formField: 'pricingModel',
      category: 'policy',
      whyNeeded: 'Same-day emergency callers need immediate direction — an uncertain AI response loses an urgent patient',
      placeholder: 'e.g. Call by 9am for same-day emergency slots. After hours: leave a voicemail and we call back within the hour.',
      inputType: 'text',
    },
  ],

  salon: [
    {
      key: 'walk_in_policy',
      label: 'Walk-In Policy',
      formField: 'callGoal',
      category: 'booking',
      whyNeeded: '"Do you take walk-ins?" is asked on nearly every salon call — wrong info frustrates customers at the door',
      placeholder: 'e.g. Walk-ins welcome based on availability / Appointments strongly recommended',
      inputType: 'text',
    },
    {
      key: 'service_pricing',
      label: 'Service Pricing (Approximate)',
      formField: 'pricingModel',
      category: 'pricing',
      whyNeeded: 'Callers almost always ask pricing before booking — give the AI a real range to quote',
      placeholder: 'e.g. Haircuts $45–85, Color from $120, Highlights from $150, Blowout $65',
      inputType: 'text',
    },
  ],

  barbershop: [
    {
      key: 'walk_in_policy',
      label: 'Walk-In vs. Appointment Policy',
      formField: 'callGoal',
      category: 'booking',
      whyNeeded: '"Do you take walk-ins?" is the #1 barbershop question — AI must know your policy',
      placeholder: 'e.g. Walk-ins welcome, expect 15–30 min wait on weekends / Appointments preferred',
      inputType: 'text',
    },
    {
      key: 'service_pricing',
      label: 'Haircut & Service Pricing',
      formField: 'pricingModel',
      category: 'pricing',
      whyNeeded: 'Callers compare prices before choosing a barber — give the AI real numbers to work with',
      placeholder: 'e.g. Haircut $30, Beard trim $15, Fade $35, Hot towel shave $45',
      inputType: 'text',
    },
  ],

  fitness: [
    {
      key: 'membership_pricing',
      label: 'Membership Plans & Pricing',
      formField: 'pricingModel',
      category: 'pricing',
      whyNeeded: 'Membership cost is the #1 call driver — AI must quote real prices, not generic estimates',
      placeholder: 'e.g. Monthly $49/mo, Annual $399/yr. First week free trial available.',
      inputType: 'text',
    },
    {
      key: 'class_types',
      label: 'Class Types or Schedule',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: '"What classes do you offer?" — a wrong class list sends callers to competitors',
      placeholder: 'e.g. Yoga, HIIT, Spin, Boxing, Pilates. Classes Mon–Fri 6am–8pm, weekends 8am–2pm.',
      inputType: 'textarea',
    },
  ],

  veterinary: [
    {
      key: 'emergency_protocol',
      label: 'Emergency & After-Hours Protocol',
      formField: 'callGoal',
      category: 'policy',
      whyNeeded: 'A panicking pet owner who gets uncertain AI responses will not trust you with their animal',
      placeholder: 'e.g. Same-day emergencies accepted. After hours: call Emergency Animal Hospital at (555) 999-0000',
      inputType: 'text',
    },
    {
      key: 'animal_types',
      label: 'Animal Types Accepted',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: 'Callers with exotic pets need to know immediately if you see their animal — wrong info wastes a trip',
      placeholder: 'e.g. Dogs, cats, rabbits, and small mammals. We do not see reptiles or birds.',
      inputType: 'text',
    },
  ],

  'pet-daycare': [
    {
      key: 'vaccination_requirements',
      label: 'Required Vaccinations',
      formField: 'aboutDescription',
      category: 'policy',
      whyNeeded: 'This is the very first question every new daycare caller asks — wrong info means a turned-away dog at the door',
      placeholder: 'e.g. Rabies, DHPP, and Bordetella required and current. Proof must be on file before first day.',
      inputType: 'textarea',
    },
    {
      key: 'daycare_pricing',
      label: 'Daycare Pricing',
      formField: 'pricingModel',
      category: 'pricing',
      whyNeeded: 'Callers compare prices before booking — AI must quote real rates, not guesses',
      placeholder: 'e.g. Full day $45, Half day $28. 10-day package $399.',
      inputType: 'text',
    },
  ],

  hotel: [
    {
      key: 'check_in_out_times',
      label: 'Check-In and Check-Out Times',
      formField: 'businessHours',
      category: 'policy',
      whyNeeded: 'Every guest asks check-in time — wrong info causes conflict at arrival and damages reviews',
      placeholder: 'e.g. Check-in 3:00 PM, Check-out 11:00 AM. Early check-in subject to availability ($25 fee).',
      inputType: 'text',
    },
    {
      key: 'amenities',
      label: 'Key Amenities (Pool, Parking, Breakfast)',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: 'Guests ask about parking, pool, and breakfast on nearly every booking call',
      placeholder: 'e.g. Free self-parking, outdoor pool (seasonal), complimentary continental breakfast, pet-friendly.',
      inputType: 'textarea',
    },
  ],

  auto: [
    {
      key: 'appointment_policy',
      label: 'Appointment vs. Walk-In Policy',
      formField: 'callGoal',
      category: 'booking',
      whyNeeded: '"Do I need an appointment?" is asked on nearly every auto shop call',
      placeholder: 'e.g. Appointments preferred. Walk-ins accepted for oil changes and tire rotations based on availability.',
      inputType: 'text',
    },
    {
      key: 'makes_accepted',
      label: 'Vehicle Makes & Models Serviced',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: 'Callers ask "do you work on my car?" before driving over — wrong answer wastes their trip',
      placeholder: 'e.g. All domestic and import vehicles. Specializing in Honda, Toyota, and Subaru.',
      inputType: 'text',
    },
  ],

  'home-service': [
    {
      key: 'emergency_availability',
      label: 'Emergency & After-Hours Availability',
      formField: 'callGoal',
      category: 'policy',
      whyNeeded: 'Home emergencies (burst pipe, no heat in winter) are time-critical — AI must know your exact availability',
      placeholder: 'e.g. 24/7 emergency service. After-hours dispatch fee $125. Standard calls Mon–Sat 7am–6pm.',
      inputType: 'text',
    },
    {
      key: 'service_area',
      label: 'Service Area (Cities or Zip Codes)',
      formField: 'aboutDescription',
      category: 'policy',
      whyNeeded: 'Callers outside your area must know immediately — this prevents wasted scheduling conversations',
      placeholder: 'e.g. Serving Denver metro and surrounding areas within 30 miles of downtown.',
      inputType: 'text',
    },
  ],

  'real-estate': [
    {
      key: 'service_type',
      label: 'Service Type (Buy / Sell / Rent / Property Management)',
      formField: 'callGoal',
      category: 'services',
      whyNeeded: 'Callers need to know immediately if you handle their situation — or they hang up to find someone who does',
      placeholder: 'e.g. Residential buy and sell, property management, and rentals in the Austin metro area.',
      inputType: 'text',
    },
  ],

  'medical-spa': [
    {
      key: 'treatment_menu',
      label: 'Treatment Menu (Your Actual Services)',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: 'Med spa callers ask about specific treatments by name — AI must know exactly what you offer vs. what competitors offer',
      placeholder: 'e.g. Botox/Dysport, dermal fillers, laser resurfacing, chemical peels, microneedling, body contouring.',
      inputType: 'textarea',
    },
    {
      key: 'consultation_policy',
      label: 'Consultation Policy (Free or Fee?)',
      formField: 'pricingModel',
      category: 'pricing',
      whyNeeded: '"Is the consultation free?" is the very first question callers ask before they commit to anything',
      placeholder: 'e.g. Complimentary consultations for all new clients / $50 consultation fee credited to your treatment.',
      inputType: 'text',
    },
  ],

  legal: [
    {
      key: 'practice_areas',
      label: 'Practice Areas (Be Specific)',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: 'Callers need to know if you handle their specific legal matter — "we handle all law" makes them call a specialist instead',
      placeholder: 'e.g. Personal injury, family law (divorce and custody), criminal defense, estate planning, DUI.',
      inputType: 'textarea',
    },
    {
      key: 'consultation_structure',
      label: 'Initial Consultation (Free or Paid?)',
      formField: 'pricingModel',
      category: 'pricing',
      whyNeeded: '"Is the consultation free?" is the first thing every caller asks before sharing any details',
      placeholder: 'e.g. Free 30-minute initial consultation / $250 consultation fee, credited to your retainer.',
      inputType: 'text',
    },
  ],

  education: [
    {
      key: 'programs_offered',
      label: 'Programs or Courses Offered',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: 'Prospective students call about specific programs — AI must know what you actually offer',
      placeholder: 'e.g. K–12 tutoring, SAT/ACT prep, college counseling, coding bootcamp, ESL classes.',
      inputType: 'textarea',
    },
    {
      key: 'enrollment_process',
      label: 'How to Enroll / Get Started',
      formField: 'callGoal',
      category: 'booking',
      whyNeeded: 'This is the conversion point — callers need clear next steps or they leave and forget to call back',
      placeholder: 'e.g. Call to schedule a free assessment session. Enrollment open year-round, classes start monthly.',
      inputType: 'text',
    },
  ],

  'professional-services': [
    {
      key: 'specific_services',
      label: 'Specific Services You Provide',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: '"What exactly do you do?" — callers need specifics, not a tagline, to decide if you\'re the right fit',
      placeholder: 'e.g. Tax preparation, bookkeeping, payroll processing, and small business consulting.',
      inputType: 'textarea',
    },
  ],

  retail: [
    {
      key: 'product_categories',
      label: 'Product Categories',
      formField: 'aboutDescription',
      category: 'services',
      whyNeeded: 'Callers ask "do you carry X?" before driving over — AI must know what you actually stock',
      placeholder: 'e.g. Men\'s and women\'s apparel, shoes, accessories, and gifts. We carry sizes XS–4X.',
      inputType: 'textarea',
    },
    {
      key: 'return_policy',
      label: 'Return & Exchange Policy',
      formField: 'callGoal',
      category: 'policy',
      whyNeeded: 'Return policy questions drive a significant share of retail calls — wrong info causes disputes',
      placeholder: 'e.g. 30-day returns with receipt. Exchanges accepted within 60 days. Final sale on clearance items.',
      inputType: 'text',
    },
  ],

  general_business: [],
};

/**
 * Get all required fields for an industry (universal + industry-specific).
 */
export function getRequiredFieldsForIndustry(industry: string): RequiredField[] {
  const industrySpecific = INDUSTRY_REQUIRED_FIELDS[industry] ?? [];
  return [...UNIVERSAL_REQUIRED_FIELDS, ...industrySpecific];
}

/**
 * Get just the field keys required for an industry.
 */
export function getRequiredFieldKeysForIndustry(industry: string): string[] {
  return getRequiredFieldsForIndustry(industry).map(f => f.key);
}
