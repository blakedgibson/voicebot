/**
 * Industry-specific configuration for call types and analytics cards
 * This configuration determines what call types and metrics are shown based on business industry
 */

export type Industry =
  | 'medical'
  | 'salon'
  | 'home-service'
  | 'real-estate'
  | 'professional-services'
  | 'hotel'
  | 'auto'
  | 'education'
  | 'retail'
  | 'restaurant'
  | 'barbershop'
  | 'fitness'
  | 'veterinary'
  | 'medical-spa'
  | 'pet-daycare'
  | 'dentist'
  | 'legal'
  | 'general_business';

export interface CallType {
  id: string;
  label: string;
  description: string;
  icon?: string;
}

export interface MetricCard {
  id: string;
  label: string;
  description?: string;
}

export interface IndustryConfig {
  id: Industry;
  name: string;
  callTypes: CallType[];
  metricCards: MetricCard[];
  keywords: string[]; // Keywords for AI classification
  /** True for industries subject to HIPAA — triggers identity verification, PHI audit logging, and session timeout enforcement */
  hipaaRequired?: boolean;
}

export const INDUSTRY_CONFIGS: Record<Industry, IndustryConfig> = {
  medical: {
    id: 'medical',
    name: 'Healthcare',
    callTypes: [
      {
        id: 'appointment',
        label: 'Appointment',
        description: 'Schedule or reschedule patient visits.',
      },
      {
        id: 'prescription',
        label: 'Prescription',
        description: 'Medication refills or prescription questions.',
      },
      {
        id: 'insurance',
        label: 'Insurance',
        description: 'Insurance verification or billing questions.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about services, hours, or procedures.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Feedback or other inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'appointments', label: 'Appointments' },
      { id: 'prescriptions', label: 'Prescriptions' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['healthcare', 'medical', 'clinic', 'doctor', 'physician', 'health', 'patient', 'hospital', 'ehr', 'emr'],
    hipaaRequired: true,
  },
  salon: {
    id: 'salon',
    name: 'Salons & Spas',
    callTypes: [
      {
        id: 'appointment',
        label: 'Appointment',
        description: 'Schedule, reschedule, or cancel appointments.',
      },
      {
        id: 'service',
        label: 'Service',
        description: 'Questions about services or pricing.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about hours, walk-ins, or policies.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Feedback or other inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'appointments', label: 'Appointments' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['salon', 'spa', 'beauty', 'nail', 'hair', 'massage', 'treatment', 'appointment'],
  },
  'home-service': {
    id: 'home-service',
    name: 'Home Services',
    callTypes: [
      {
        id: 'appointment',
        label: 'Appointment',
        description: 'Schedule a service call.',
      },
      {
        id: 'estimate',
        label: 'Estimate',
        description: 'Request a quote for service.',
      },
      {
        id: 'dispatch',
        label: 'Dispatch',
        description: 'Track or schedule dispatch for service.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'Questions about services, pricing, or availability.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Feedback or emergency requests.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'appointments', label: 'Appointments' },
      { id: 'estimates', label: 'Estimates' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['home service', 'plumbing', 'hvac', 'cleaning', 'contractor', 'handyman', 'repair', 'maintenance'],
  },
  'real-estate': {
    id: 'real-estate',
    name: 'Real Estate',
    callTypes: [
      {
        id: 'showing',
        label: 'Showing',
        description: 'Schedule property tours or viewings.',
      },
      {
        id: 'maintenance',
        label: 'Maintenance',
        description: 'Submit or inquire about maintenance requests.',
      },
      {
        id: 'lead',
        label: 'Lead',
        description: 'New lead tracking or follow-up.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'Questions about listings, policies, or availability.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'showings', label: 'Showings' },
      { id: 'leads', label: 'Leads' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['real estate', 'property', 'realty', 'realtor', 'housing', 'crm', 'salesforce', 'hubspot'],
  },
  'professional-services': {
    id: 'professional-services',
    name: 'Professional Services',
    callTypes: [
      {
        id: 'consultation',
        label: 'Consultation',
        description: 'Schedule or inquire about consultations.',
      },
      {
        id: 'intake',
        label: 'Intake',
        description: 'Client intake or onboarding questions.',
      },
      {
        id: 'case',
        label: 'Case',
        description: 'Case or project status inquiries.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about services or pricing.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other professional inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'cases', label: 'Cases' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['professional', 'legal', 'consulting', 'financial', 'attorney', 'lawyer', 'consultant', 'advisor'],
  },
  hotel: {
    id: 'hotel',
    name: 'Hospitality',
    callTypes: [
      {
        id: 'reservation',
        label: 'Reservation',
        description: 'Book, modify, or cancel room or table reservations.',
      },
      {
        id: 'order',
        label: 'Order',
        description: 'Food or service orders.',
      },
      {
        id: 'guest',
        label: 'Guest Services',
        description: 'Guest details or special requests.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'Questions about amenities, check-in, or policies.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other guest inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'reservations', label: 'Reservations' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['hotel', 'hospitality', 'resort', 'accommodation', 'restaurant', 'food', 'pos', 'reservation'],
  },
  auto: {
    id: 'auto',
    name: 'Automotive',
    callTypes: [
      {
        id: 'appointment',
        label: 'Appointment',
        description: 'Schedule service appointments.',
      },
      {
        id: 'estimate',
        label: 'Estimate',
        description: 'Request service estimates or quotes.',
      },
      {
        id: 'status',
        label: 'Status',
        description: 'Check service or repair status.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'Questions about services, pricing, or hours.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other service inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'appointments', label: 'Appointments' },
      { id: 'estimates', label: 'Estimates' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['automotive', 'auto', 'car', 'repair', 'service', 'mechanic', 'vehicle'],
  },
  education: {
    id: 'education',
    name: 'Education',
    callTypes: [
      {
        id: 'enrollment',
        label: 'Enrollment',
        description: 'Class enrollment or registration questions.',
      },
      {
        id: 'scheduling',
        label: 'Scheduling',
        description: 'Class scheduling or calendar inquiries.',
      },
      {
        id: 'communication',
        label: 'Communication',
        description: 'Parent or student communication.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about programs or policies.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other educational inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'enrollments', label: 'Enrollments' },
      { id: 'scheduling', label: 'Scheduling' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['education', 'school', 'tutoring', 'learning', 'teaching', 'academy', 'crm'],
  },
  retail: {
    id: 'retail',
    name: 'Retail & E-commerce',
    callTypes: [
      {
        id: 'order',
        label: 'Order Inquiry',
        description: 'Order status or product questions.',
      },
      {
        id: 'return',
        label: 'Return',
        description: 'Return or exchange requests.',
      },
      {
        id: 'inventory',
        label: 'Inventory',
        description: 'Product availability or stock questions.',
      },
      {
        id: 'support',
        label: 'Support',
        description: 'Customer support or technical help.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about products or policies.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other customer inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'returns', label: 'Returns' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['retail', 'ecommerce', 'e-commerce', 'shop', 'store', 'online', 'inventory', 'customer support'],
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant',
    callTypes: [
      {
        id: 'reservation',
        label: 'Reservation',
        description: 'Book, modify, or cancel table reservations.',
      },
      {
        id: 'order',
        label: 'Order',
        description: 'Food orders for pickup or delivery.',
      },
      {
        id: 'menu',
        label: 'Menu',
        description: 'Questions about menu items or specials.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about hours, location, or policies.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other customer inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'reservations', label: 'Reservations' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['restaurant', 'food', 'pizza', 'cafe', 'dining', 'menu', 'reservation', 'delivery'],
  },
  barbershop: {
    id: 'barbershop',
    name: 'Barbershop',
    callTypes: [
      {
        id: 'appointment',
        label: 'Appointment',
        description: 'Schedule, reschedule, or cancel appointments.',
      },
      {
        id: 'service',
        label: 'Service',
        description: 'Questions about services or pricing.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about hours, walk-ins, or policies.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'appointments', label: 'Appointments' },
      { id: 'services', label: 'Services' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['barbershop', 'barber', 'haircut', 'grooming', 'men'],
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness & Wellness',
    callTypes: [
      {
        id: 'class',
        label: 'Class / Session Booking',
        description: 'Book, reschedule, or cancel a class, session, or court reservation.',
      },
      {
        id: 'membership',
        label: 'Membership',
        description: 'Membership inquiries, sign-ups, freezes, or cancellations.',
      },
      {
        id: 'training',
        label: 'Personal Training',
        description: 'Personal training session or trainer consultation booking.',
      },
      {
        id: 'trial',
        label: 'Trial / Day Pass',
        description: 'Free trial, day pass, or guest pass inquiries.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about facilities, schedule, or hours.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'class_bookings', label: 'Class Bookings' },
      { id: 'memberships', label: 'Memberships' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['fitness', 'gym', 'workout', 'training', 'exercise', 'class', 'crossfit', 'yoga', 'pilates', 'studio', 'wellness', 'court'],
  },
  veterinary: {
    id: 'veterinary',
    name: 'Veterinary',
    callTypes: [
      {
        id: 'appointment',
        label: 'Appointment',
        description: 'Schedule vet appointments.',
      },
      {
        id: 'emergency',
        label: 'Emergency',
        description: 'Emergency pet care inquiries.',
      },
      {
        id: 'prescription',
        label: 'Prescription',
        description: 'Pet medication refills.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about services or hours.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other pet care inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'appointments', label: 'Appointments' },
      { id: 'emergencies', label: 'Emergencies' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['veterinary', 'vet', 'animal', 'pet', 'clinic', 'doctor'],
  },
  'medical-spa': {
    id: 'medical-spa',
    name: 'Medical Spa',
    callTypes: [
      {
        id: 'appointment',
        label: 'Appointment',
        description: 'Schedule spa or treatment appointments.',
      },
      {
        id: 'consultation',
        label: 'Consultation',
        description: 'Book consultation for treatments.',
      },
      {
        id: 'treatment',
        label: 'Treatment',
        description: 'Questions about treatments or procedures.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about services or pricing.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'appointments', label: 'Appointments' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['medical spa', 'medspa', 'aesthetic', 'cosmetic', 'treatment', 'botox'],
    hipaaRequired: true,
  },
  'pet-daycare': {
    id: 'pet-daycare',
    name: 'Pet Daycare',
    callTypes: [
      {
        id: 'booking',
        label: 'Booking',
        description: 'Book daycare or boarding.',
      },
      {
        id: 'pickup',
        label: 'Pickup/Drop-off',
        description: 'Schedule pickup or drop-off times.',
      },
      {
        id: 'services',
        label: 'Services',
        description: 'Questions about grooming or training.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about facility or policies.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'bookings', label: 'Bookings' },
      { id: 'services', label: 'Services' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['pet daycare', 'dog daycare', 'boarding', 'kennel', 'grooming'],
  },
  legal: {
    id: 'legal',
    name: 'Legal',
    callTypes: [
      {
        id: 'intake',
        label: 'New Client Intake',
        description: 'Prospective client describing their legal matter.',
      },
      {
        id: 'consultation',
        label: 'Consultation',
        description: 'Schedule, reschedule, or cancel a consultation.',
      },
      {
        id: 'case_status',
        label: 'Case Status',
        description: 'Existing client asking for a case update.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'Questions about practice areas, fees, or firm policies.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other legal inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'intakes', label: 'Intakes' },
      { id: 'consultations', label: 'Consultations' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['legal', 'law', 'attorney', 'lawyer', 'firm', 'counsel', 'litigation', 'paralegal', 'practice'],
  },
  dentist: {
    id: 'dentist',
    name: 'Dental',
    callTypes: [
      {
        id: 'appointment',
        label: 'Appointment',
        description: 'Schedule dental appointments.',
      },
      {
        id: 'emergency',
        label: 'Emergency',
        description: 'Emergency dental care.',
      },
      {
        id: 'insurance',
        label: 'Insurance',
        description: 'Insurance and billing questions.',
      },
      {
        id: 'faq',
        label: 'FAQ',
        description: 'General questions about services or hours.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'appointments', label: 'Appointments' },
      { id: 'emergencies', label: 'Emergencies' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['dentist', 'dental', 'teeth', 'orthodontic', 'oral health'],
    hipaaRequired: true,
  },
  general_business: {
    id: 'general_business',
    name: 'General Business',
    callTypes: [
      {
        id: 'inquiry',
        label: 'General Inquiry',
        description: 'Questions about hours, location, services, or policies.',
      },
      {
        id: 'message',
        label: 'Message',
        description: 'Caller wants to leave a message for staff.',
      },
      {
        id: 'callback',
        label: 'Callback Request',
        description: 'Caller requests a return call from the business.',
      },
      {
        id: 'transfer',
        label: 'Staff Transfer',
        description: 'Caller needs to speak with a specific person or department.',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Other inquiries.',
      },
    ],
    metricCards: [
      { id: 'calls', label: 'Calls' },
      { id: 'messages', label: 'Messages Taken' },
      { id: 'phone_minutes', label: 'Phone Minutes' },
    ],
    keywords: ['business', 'company', 'office', 'general'],
  },
};

/**
 * Get industry configuration by ID
 */
export function getIndustryConfig(industry: Industry): IndustryConfig {
  return INDUSTRY_CONFIGS[industry];
}

/**
 * Get all available industries
 */
export function getAllIndustries(): IndustryConfig[] {
  return Object.values(INDUSTRY_CONFIGS);
}

/**
 * Get call types for a specific industry
 */
export function getCallTypesForIndustry(industry: Industry): CallType[] {
  return INDUSTRY_CONFIGS[industry]?.callTypes || [];
}

/**
 * Get metric cards for a specific industry
 */
export function getMetricCardsForIndustry(industry: Industry): MetricCard[] {
  return INDUSTRY_CONFIGS[industry]?.metricCards || [];
}

/**
 * Default industry if classification fails
 */
export const DEFAULT_INDUSTRY: Industry = 'medical';
