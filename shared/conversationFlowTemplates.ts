/**
 * Conversation Flow Templates for All Industries
 *
 * Each template defines 7–8 service nodes covering the most common real-world
 * call scenarios for that industry. Nodes are built into the Retell conversation
 * flow graph by RetellProvider.buildNodesFromTemplate().
 */

export interface ConversationFlowTemplate {
  industry: string;
  serviceNodes: ServiceNode[];
  description: string;
  /** True for industries subject to HIPAA (healthcare, dental, medical-spa) */
  hipaaRequired?: boolean;
}

/** Industries that require HIPAA compliance */
export const HIPAA_INDUSTRIES = new Set(['healthcare', 'dentist', 'medical-spa']);

export interface ServiceNode {
  id: string;
  type: 'conversation' | 'function' | 'branch' | 'transfer_call' | 'end';
  name: string;
  description: string;
  functionName?: string;
  branchConditions?: BranchCondition[];
}

export interface BranchCondition {
  condition: string;
  destinationNodeId: string;
}

export function getNodeTemplateForIndustry(industry?: string): ConversationFlowTemplate {
  const normalizedIndustry = (industry || 'restaurant').toLowerCase();
  const template = INDUSTRY_TEMPLATES[normalizedIndustry];

  if (!template) {
    console.warn(`No template found for industry: ${industry}, falling back to general_business`);
    return INDUSTRY_TEMPLATES['general_business'];
  }

  return template;
}

const INDUSTRY_TEMPLATES: Record<string, ConversationFlowTemplate> = {

  restaurant: {
    industry: 'restaurant',
    description: 'Restaurant with orders, reservations, delivery, catering, and gift cards',
    serviceNodes: [
      {
        id: 'take_order',
        type: 'function',
        name: 'Take Order',
        description: 'Customer wants to place a food order for pickup, delivery, or dine-in',
        functionName: 'place_order'
      },
      {
        id: 'create_reservation',
        type: 'function',
        name: 'Make a Reservation',
        description: 'Customer wants to book a table, reserve seating, or make a dining reservation',
        functionName: 'create_reservation'
      },
      {
        id: 'schedule_delivery',
        type: 'function',
        name: 'Schedule Delivery',
        description: 'Customer wants to schedule food delivery to their address',
        functionName: 'schedule_delivery'
      },
      {
        id: 'book_catering',
        type: 'function',
        name: 'Book Catering or Private Event',
        description: 'Customer wants catering, a private event, or a large group booking',
        functionName: 'book_calendar_event'
      },
      {
        id: 'walk_in_inquiry',
        type: 'conversation',
        name: 'Walk-In / Current Wait Time',
        description: 'Customer asks about current wait time, table availability right now, or if walk-ins are accepted'
      },
      {
        id: 'gift_card',
        type: 'conversation',
        name: 'Gift Cards',
        description: 'Customer wants to purchase, check the balance of, or redeem a gift card'
      },
      {
        id: 'cancel_reservation',
        type: 'function',
        name: 'Cancel Reservation',
        description: 'Customer wants to cancel an existing table reservation or dining booking',
        functionName: 'cancel'
      },
      {
        id: 'hours_location',
        type: 'conversation',
        name: 'Hours, Location, and Directions',
        description: 'Customer asks what time the restaurant opens or closes, the address, parking, or how to get there'
      },
      {
        id: 'modify_order',
        type: 'function',
        name: 'Modify Existing Order',
        description: 'Customer wants to change a recently placed order — add or remove items, change the order type, or update the delivery address before the order is prepared',
        functionName: 'modify_order'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Menu and Pricing',
        description: 'Customer asks about specific menu items, prices, daily specials, dietary options, or allergen information'
      }
    ]
  },

  salon: {
    industry: 'salon',
    description: 'Salon / nail bar / beauty studio with appointments, walk-ins, services, and gift cards',
    serviceNodes: [
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Book Appointment',
        description: 'Customer wants to book a new appointment for any salon service: haircut, color, highlights, manicure, pedicure, full set, fill, dip powder, gel, waxing, facial, lash, brow, or other beauty service',
        functionName: 'book'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Appointment',
        description: 'Customer wants to change the date or time of an existing salon appointment',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Appointment',
        description: 'Customer wants to cancel an existing salon appointment',
        functionName: 'cancel'
      },
      {
        id: 'modify_appointment',
        type: 'function',
        name: 'Modify Appointment Details',
        description: 'Customer wants to change the service type, add a service, change their technician or stylist, or update notes without changing the appointment time',
        functionName: 'modify'
      },
      {
        id: 'update_customer_preferences',
        type: 'function',
        name: 'Save Stylist or Service Preference',
        description: 'Customer wants to save their preferred technician, stylist, or nail tech for future visits, or update their service preferences',
        functionName: 'Update'
      },
      {
        id: 'walk_in_inquiry',
        type: 'conversation',
        name: 'Walk-In Availability',
        description: 'Customer asks if they can come in right now as a walk-in, what the current wait time is, or if there are openings today'
      },
      {
        id: 'gift_card',
        type: 'conversation',
        name: 'Gift Cards',
        description: 'Customer wants to purchase a gift card, check a gift card balance, or redeem a gift card'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Service Pricing and Details',
        description: 'Customer asks how much a specific service costs, how long it takes, what is included, or wants to compare service options before booking'
      },
      {
        id: 'check_appointment',
        type: 'conversation',
        name: 'Check Existing Appointment',
        description: 'Customer wants to confirm the details of an existing appointment: date, time, service, or technician name'
      }
    ]
  },

  barbershop: {
    industry: 'barbershop',
    description: 'Barbershop with haircuts, beard services, walk-ins, and appointments',
    serviceNodes: [
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Book Haircut Appointment',
        description: 'Customer wants to book a haircut, fade, beard trim, lineup, shave, or any barber service',
        functionName: 'book'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Appointment',
        description: 'Customer wants to change the date or time of an existing barbershop appointment',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Appointment',
        description: 'Customer wants to cancel their scheduled haircut or barber appointment',
        functionName: 'cancel'
      },
      {
        id: 'update_customer_preferences',
        type: 'function',
        name: 'Save Barber Preference',
        description: 'Customer wants to note their preferred barber for future visits or save style preferences',
        functionName: 'Update'
      },
      {
        id: 'walk_in_inquiry',
        type: 'conversation',
        name: 'Walk-In Availability',
        description: 'Customer wants to know if they can come in right now, what the current wait is, or if walk-ins are available today'
      },
      {
        id: 'gift_card',
        type: 'conversation',
        name: 'Gift Cards',
        description: 'Customer wants to purchase or redeem a gift card for barbershop services'
      },
      {
        id: 'modify_appointment',
        type: 'function',
        name: 'Modify Appointment Details',
        description: 'Customer wants to change the service type, add a service, switch to a different barber, or update notes without changing the appointment time',
        functionName: 'modify'
      },
      {
        id: 'check_appointment',
        type: 'conversation',
        name: 'Check Existing Appointment',
        description: 'Customer wants to confirm the details of an existing appointment: date, time, service, or barber name'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Pricing and Services',
        description: 'Customer asks about the cost of a specific haircut or barber service, or what services are available'
      }
    ]
  },

  hotel: {
    industry: 'hotel',
    description: 'Hotel with room reservations, events, amenities, and check-in/out',
    serviceNodes: [
      {
        id: 'book_room',
        type: 'function',
        name: 'Book a Room',
        description: 'Customer wants to reserve a hotel room for specific dates',
        functionName: 'create_reservation'
      },
      {
        id: 'event_inquiry',
        type: 'conversation',
        name: 'Event and Conference Inquiry',
        description: 'Customer asks about hosting an event, conference, wedding, or group booking at the hotel'
      },
      {
        id: 'amenity_question',
        type: 'conversation',
        name: 'Amenity and Facility Questions',
        description: 'Customer asks about hotel amenities: pool, gym, spa, restaurant, parking, pet policy, or room features'
      },
      {
        id: 'check_in_out',
        type: 'conversation',
        name: 'Check-In / Check-Out',
        description: 'Customer asks about check-in or check-out times, early check-in, late check-out, or luggage storage'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Room Rates and Availability',
        description: 'Customer asks about room types, nightly rates, availability for specific dates, or packages'
      },
      {
        id: 'cancel_reservation',
        type: 'function',
        name: 'Cancel Reservation',
        description: 'Guest wants to cancel an existing hotel room reservation',
        functionName: 'cancel'
      },
      {
        id: 'modify_reservation',
        type: 'function',
        name: 'Modify Reservation',
        description: 'Guest wants to change their check-in or check-out dates, room type, or number of guests on an existing reservation',
        functionName: 'reschedule'
      },
      {
        id: 'check_reservation',
        type: 'conversation',
        name: 'Check Existing Reservation',
        description: 'Guest wants to confirm the details of an existing hotel reservation: check-in and check-out dates, room type, confirmation number, or any special requests on file'
      },
      {
        id: 'gift_card',
        type: 'conversation',
        name: 'Gift Cards',
        description: 'Customer wants to purchase or use a hotel gift card'
      }
    ]
  },

  healthcare: {
    industry: 'healthcare',
    description: 'Medical practice with appointments, prescriptions, insurance, and referrals',
    hipaaRequired: true,
    serviceNodes: [
      {
        id: 'identity_verification',
        type: 'conversation',
        name: 'Patient Identity Verification',
        description: 'HIPAA REQUIRED — Before discussing any prescription, test result, or personal health information, verify the patient\'s identity by asking for their date of birth and confirming the name on file. Do not proceed with PHI disclosure until identity is confirmed.'
      },
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Book Medical Appointment',
        description: 'Patient wants to schedule a doctor visit, wellness exam, follow-up, or any medical appointment',
        functionName: 'book'
      },
      {
        id: 'prescription_refill',
        type: 'function',
        name: 'Prescription Refill',
        description: 'Patient wants to request a prescription refill for an existing medication',
        functionName: 'request_prescription_refill'
      },
      {
        id: 'emergency_redirect',
        type: 'transfer_call',
        name: 'Medical Emergency Transfer',
        description: 'Patient reports an emergency, severe symptoms, chest pain, difficulty breathing, or any life-threatening situation — transfer immediately'
      },
      {
        id: 'insurance_inquiry',
        type: 'conversation',
        name: 'Insurance and Billing',
        description: 'Patient asks about insurance coverage, accepted plans, copay amounts, or billing questions'
      },
      {
        id: 'referral_inquiry',
        type: 'conversation',
        name: 'Specialist Referral',
        description: 'Patient needs a referral to a specialist or asks about referral status'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Appointment',
        description: 'Patient wants to change the date or time of an existing medical appointment',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Appointment',
        description: 'Patient wants to cancel a scheduled medical appointment',
        functionName: 'cancel'
      },
      {
        id: 'check_appointment',
        type: 'conversation',
        name: 'Check Existing Appointment',
        description: 'Patient wants to confirm the date, time, doctor, or location of an upcoming appointment'
      },
      {
        id: 'test_results',
        type: 'conversation',
        name: 'Test Results Inquiry',
        description: 'Patient is calling to ask about lab results, imaging results, or any diagnostic test outcomes — advise on how results are communicated and offer to take a message for the care team'
      }
    ]
  },

  'medical-spa': {
    industry: 'medical-spa',
    description: 'Medical spa with treatment bookings, consultations, and package inquiries',
    hipaaRequired: true,
    serviceNodes: [
      {
        id: 'identity_verification',
        type: 'conversation',
        name: 'Client Identity Verification',
        description: 'HIPAA REQUIRED — Before discussing any treatment history, prior procedures, or personal health information for an existing client, verify their identity by asking for their date of birth and confirming the name on file. Skip for new client inquiries or general pricing FAQs.'
      },
      {
        id: 'book_treatment',
        type: 'function',
        name: 'Book Treatment Appointment',
        description: 'Customer wants to book a treatment: Botox, filler, laser, chemical peel, hydrafacial, microneedling, or any med spa service',
        functionName: 'book'
      },
      {
        id: 'procedure_consult',
        type: 'function',
        name: 'Schedule Consultation',
        description: 'Customer wants a consultation before committing to a procedure, or requires a mandatory pre-treatment consultation',
        functionName: 'book_calendar_event'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Treatment Pricing and Details',
        description: 'Customer asks about the cost of a specific treatment, how many sessions are needed, or what results to expect'
      },
      {
        id: 'pre_post_care',
        type: 'conversation',
        name: 'Pre and Post Care Instructions',
        description: 'Customer asks what to do before or after a treatment: what to avoid, how to prepare, recovery time'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Appointment',
        description: 'Customer wants to change the date or time of an existing med spa appointment',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Appointment',
        description: 'Customer wants to cancel a scheduled med spa appointment',
        functionName: 'cancel'
      },
      {
        id: 'check_appointment',
        type: 'conversation',
        name: 'Check Existing Appointment',
        description: 'Customer wants to confirm the date, time, or treatment details of an upcoming med spa appointment'
      },
      {
        id: 'gift_card',
        type: 'conversation',
        name: 'Gift Cards and Packages',
        description: 'Customer wants to purchase a gift card, gift package, or treatment bundle for themselves or someone else'
      }
    ]
  },

  dentist: {
    industry: 'dentist',
    description: 'Dental practice with appointments, emergency care, insurance, and new patients',
    hipaaRequired: true,
    serviceNodes: [
      {
        id: 'identity_verification',
        type: 'conversation',
        name: 'Patient Identity Verification',
        description: 'HIPAA REQUIRED — Before discussing any treatment details, insurance, or health information for an existing patient, verify their identity by asking for their date of birth and confirming the name on file. Skip for new patient inquiries or general FAQs.'
      },
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Book Dental Appointment',
        description: 'Patient wants to schedule a cleaning, exam, filling, crown, whitening, or any routine dental appointment',
        functionName: 'book'
      },
      {
        id: 'emergency_dental',
        type: 'transfer_call',
        name: 'Dental Emergency',
        description: 'Patient has a dental emergency: severe toothache, broken tooth, knocked-out tooth, lost filling, or swelling — needs same-day or immediate help'
      },
      {
        id: 'insurance_inquiry',
        type: 'conversation',
        name: 'Dental Insurance and Billing',
        description: 'Patient asks about accepted insurance plans, coverage for a procedure, out-of-pocket costs, or payment plans'
      },
      {
        id: 'procedure_inquiry',
        type: 'conversation',
        name: 'Procedure Information',
        description: 'Patient asks about what a dental procedure involves, how long it takes, what to expect, or preparation instructions'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Appointment',
        description: 'Patient wants to change the date or time of an existing dental appointment',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Appointment',
        description: 'Patient wants to cancel their scheduled dental appointment',
        functionName: 'cancel'
      },
      {
        id: 'check_appointment',
        type: 'conversation',
        name: 'Check Existing Appointment',
        description: 'Patient wants to confirm the date, time, or dentist for an upcoming dental appointment'
      },
      {
        id: 'post_procedure_concern',
        type: 'conversation',
        name: 'Post-Procedure Concern',
        description: 'Patient had a recent dental procedure and is experiencing pain, sensitivity, swelling, or other concerns after treatment — not a life-threatening emergency, but needs guidance or a callback from the dental team'
      },
      {
        id: 'new_patient_inquiry',
        type: 'conversation',
        name: 'New Patient Inquiry',
        description: 'First-time caller who has never been a patient — wants to know if the practice is accepting new patients, what to bring, or how to get started'
      }
    ]
  },

  auto: {
    industry: 'auto',
    description: 'Auto repair shop with service scheduling, estimates, status, and emergencies',
    serviceNodes: [
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Schedule Service Appointment',
        description: 'Customer wants to book a vehicle service appointment: oil change, tire rotation, brake job, tune-up, inspection, or any repair',
        functionName: 'book'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Service',
        description: 'Customer wants to change the date or time of an existing service appointment',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Service Appointment',
        description: 'Customer wants to cancel their scheduled vehicle service appointment',
        functionName: 'cancel'
      },
      {
        id: 'repair_status',
        type: 'conversation',
        name: 'Vehicle Status Check',
        description: 'Customer wants to know if their vehicle is ready, how the repair is going, or get an update on their service'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Repair Estimate and Pricing',
        description: 'Customer wants to know approximately how much a repair or service will cost, or asks for a quote'
      },
      {
        id: 'warranty_inquiry',
        type: 'conversation',
        name: 'Warranty Questions',
        description: 'Customer asks about their vehicle warranty, parts warranty, or whether a repair is covered under warranty'
      },
      {
        id: 'check_appointment',
        type: 'conversation',
        name: 'Check Existing Appointment',
        description: 'Customer wants to confirm the date, time, or service details of an upcoming vehicle service appointment'
      },
      {
        id: 'towing_emergency',
        type: 'transfer_call',
        name: 'Towing or Roadside Emergency',
        description: "Vehicle broke down, won't start, needs tow, or customer has a roadside emergency"
      }
    ]
  },

  'home-service': {
    industry: 'home-service',
    description: 'Home repair and maintenance with scheduling, estimates, and emergencies',
    serviceNodes: [
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Schedule Service',
        description: 'Customer wants to schedule a home repair or maintenance visit: plumbing, electrical, HVAC, cleaning, landscaping, or similar',
        functionName: 'book'
      },
      {
        id: 'emergency_service',
        type: 'transfer_call',
        name: 'Emergency Service Request',
        description: 'Customer has an urgent home emergency: burst pipe, gas leak, no heat, electrical hazard, or flooding — needs immediate dispatch'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Estimate and Pricing',
        description: 'Customer wants to know how much a service will cost, or requests a quote or estimate before scheduling'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Appointment',
        description: 'Customer wants to change the date or time of an existing service appointment',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Appointment',
        description: 'Customer wants to cancel a scheduled home service appointment',
        functionName: 'cancel'
      },
      {
        id: 'job_status',
        type: 'conversation',
        name: 'Job Status and Technician ETA',
        description: 'Customer asks about the status of ongoing or completed work, when the technician will arrive, or if a job has been finished'
      },
      {
        id: 'warranty_inquiry',
        type: 'conversation',
        name: 'Warranty and Guarantee',
        description: 'Customer asks about warranty on previous work, parts guarantee, or if a repeat issue is covered'
      }
    ]
  },

  veterinary: {
    industry: 'veterinary',
    description: 'Veterinary clinic with appointments, emergency care, grooming, and boarding',
    serviceNodes: [
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Book Vet Appointment',
        description: 'Pet owner wants to schedule a wellness exam, vaccination, dental cleaning, surgery consult, or routine vet visit',
        functionName: 'book'
      },
      {
        id: 'emergency_vet',
        type: 'transfer_call',
        name: 'Pet Emergency',
        description: 'Pet is experiencing an emergency: difficulty breathing, collapse, seizure, severe bleeding, suspected poisoning, trauma, or any life-threatening symptom — transfer immediately'
      },
      {
        id: 'grooming_booking',
        type: 'function',
        name: 'Book Grooming',
        description: 'Pet owner wants to schedule a grooming appointment: bath, haircut, nail trim, ear cleaning, or full groom',
        functionName: 'book_calendar_event'
      },
      {
        id: 'boarding_inquiry',
        type: 'conversation',
        name: 'Boarding Inquiry',
        description: 'Pet owner asks about boarding availability, rates, what is included, vaccination requirements, or drop-off and pick-up times'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Appointment',
        description: 'Pet owner wants to change the date or time of an existing vet or grooming appointment',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Appointment',
        description: 'Pet owner wants to cancel a scheduled vet or grooming appointment',
        functionName: 'cancel'
      },
      {
        id: 'check_appointment',
        type: 'conversation',
        name: 'Check Existing Appointment',
        description: 'Pet owner wants to confirm the date, time, or details of an upcoming vet or grooming appointment'
      },
      {
        id: 'medication_refill',
        type: 'function',
        name: 'Medication Refill',
        description: 'Pet owner wants to request a refill for an existing pet prescription: flea/tick prevention, heartworm medication, thyroid, or any ongoing medication',
        functionName: 'request_prescription_refill'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Service Pricing and Information',
        description: 'Pet owner asks about the cost of a specific service, vaccination prices, exam fees, or grooming rates'
      }
    ]
  },

  'pet-daycare': {
    industry: 'pet-daycare',
    description: 'Pet daycare and training with bookings, vaccination requirements, and care policies',
    serviceNodes: [
      {
        id: 'book_daycare',
        type: 'function',
        name: 'Book Daycare',
        description: 'Pet owner wants to reserve a daycare spot for their pet for a specific day or date range',
        functionName: 'book'
      },
      {
        id: 'training_session',
        type: 'function',
        name: 'Book Training Session',
        description: 'Pet owner wants to schedule a dog training class, private session, or behavior consultation',
        functionName: 'book_calendar_event'
      },
      {
        id: 'vaccination_check',
        type: 'conversation',
        name: 'Vaccination Requirements',
        description: 'Pet owner asks what vaccinations are required to attend daycare, or needs to confirm their pet is up to date'
      },
      {
        id: 'pickup_dropoff',
        type: 'conversation',
        name: 'Drop-Off and Pick-Up',
        description: 'Pet owner asks about drop-off and pick-up times, late pick-up policies, or how the day is structured'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Daycare Rates and Packages',
        description: 'Pet owner asks about daily rates, monthly packages, multi-dog discounts, or what is included in the daycare fee'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Daycare or Training',
        description: 'Pet owner wants to move a daycare reservation or training session to a different date or time',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Daycare or Training',
        description: 'Pet owner wants to cancel a daycare booking or training session',
        functionName: 'cancel'
      },
      {
        id: 'sick_pet_emergency',
        type: 'transfer_call',
        name: 'Sick Pet or Emergency Pickup',
        description: 'Pet owner reports their pet is sick, injured, or needs emergency pickup during the day — transfer immediately to on-site staff'
      }
    ]
  },

  fitness: {
    industry: 'fitness',
    description: 'Fitness & Wellness center — gyms, CrossFit boxes, yoga studios, and fitness clubs — with class and session bookings, personal training, memberships, and court reservations',
    serviceNodes: [
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Book Class, Session, or Court',
        description: 'Member or prospect wants to reserve a spot in a fitness class, group session, open gym slot, or court time',
        functionName: 'book'
      },
      {
        id: 'personal_training',
        type: 'function',
        name: 'Personal Training or Trainer Consultation',
        description: 'Customer wants to book a one-on-one personal training session, discuss fitness goals with a trainer, or schedule an initial assessment',
        functionName: 'book_calendar_event'
      },
      {
        id: 'membership_inquiry',
        type: 'conversation',
        name: 'Membership Options',
        description: 'Prospective member asks about membership plans, pricing, what is included, contracts, freeze options, or how to sign up'
      },
      {
        id: 'walk_in_inquiry',
        type: 'conversation',
        name: 'Trial Visit, Day Pass, and Walk-In',
        description: 'Prospective customer asks about a free trial, day pass, guest pass, or whether they can visit without a membership'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Booking',
        description: 'Member wants to move a class reservation, session, or court booking to a different date or time',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Booking',
        description: 'Member wants to cancel a class, session, or court reservation — remind of any cancellation window policy',
        functionName: 'cancel'
      },
      {
        id: 'membership_management',
        type: 'function',
        name: 'Freeze or Cancel Membership',
        description: 'Member wants to cancel their membership, put it on hold, or pause billing — collect their request and confirm next steps',
        functionName: 'update_membership'
      },
      {
        id: 'facility_question',
        type: 'conversation',
        name: 'Facility, Schedule, and Class Questions',
        description: 'Customer asks about hours, class schedule, available equipment, amenities, locker rooms, pool, parking, or operating hours'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Pricing and Packages',
        description: 'Customer asks about membership fees, class rates, session pricing, court fees, or personal training package costs'
      }
    ]
  },

  'real-estate': {
    industry: 'real-estate',
    description: 'Real estate agency or property management with showings, maintenance, and lease inquiries',
    serviceNodes: [
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Schedule Property Showing',
        description: 'Prospective renter or buyer wants to schedule a viewing or tour of a property',
        functionName: 'book_showing'
      },
      {
        id: 'maintenance_request',
        type: 'function',
        name: 'Maintenance Request',
        description: 'Current tenant wants to report a maintenance issue or schedule a repair visit',
        functionName: 'submit_maintenance_request'
      },
      {
        id: 'emergency_maintenance',
        type: 'transfer_call',
        name: 'Emergency Maintenance',
        description: 'Tenant has an urgent emergency: no heat, flooding, gas leak, major structural issue, or safety hazard — needs immediate escalation'
      },
      {
        id: 'lease_inquiry',
        type: 'conversation',
        name: 'Lease and Rental Questions',
        description: 'Prospective or current tenant asks about lease terms, rent amount, deposit, renewal, or lease-end procedures'
      },
      {
        id: 'property_info',
        type: 'conversation',
        name: 'Property Information',
        description: 'Caller asks about available units, property features, square footage, pet policy, parking, utilities included, or neighborhood info'
      },
      {
        id: 'reschedule_showing',
        type: 'function',
        name: 'Reschedule Property Showing',
        description: 'Caller wants to change the date or time of an existing property showing or tour',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_showing',
        type: 'function',
        name: 'Cancel Property Showing',
        description: 'Caller wants to cancel a scheduled property viewing or tour',
        functionName: 'cancel'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Rental Rates and Availability',
        description: 'Caller asks what units are currently available, what the monthly rent is, or asks about pricing for different unit types'
      }
    ]
  },

  legal: {
    industry: 'legal',
    description: 'Law firm with new client intake, consultation scheduling, and case status inquiries',
    serviceNodes: [
      {
        id: 'new_client_intake',
        type: 'function',
        name: 'New Client Intake',
        description: 'A prospective new client wants to describe their legal matter and get screened — collect their name, contact info, type of legal matter, and brief description of the situation',
        functionName: 'submit_client_intake'
      },
      {
        id: 'book_consultation',
        type: 'function',
        name: 'Schedule Consultation',
        description: 'Caller wants to book an initial consultation with an attorney',
        functionName: 'book'
      },
      {
        id: 'reschedule_consultation',
        type: 'function',
        name: 'Reschedule Consultation',
        description: 'Caller wants to change the date or time of an existing consultation appointment',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_consultation',
        type: 'function',
        name: 'Cancel Consultation',
        description: 'Caller wants to cancel a scheduled consultation',
        functionName: 'cancel'
      },
      {
        id: 'case_status_inquiry',
        type: 'conversation',
        name: 'Case Status Inquiry',
        description: 'Existing client asks for a basic update on their case — acknowledge the request, take a message, and let them know an attorney or paralegal will follow up. Never provide specific legal advice or case details beyond confirming the matter is being handled.'
      },
      {
        id: 'practice_area_inquiry',
        type: 'conversation',
        name: 'Practice Area and Services',
        description: 'Caller asks what types of cases the firm handles, what areas of law are covered, or whether the firm takes their type of case'
      },
      {
        id: 'check_appointment',
        type: 'conversation',
        name: 'Check Existing Consultation',
        description: 'Caller wants to confirm the date, time, or attorney for an upcoming consultation'
      },
      {
        id: 'urgent_legal_matter',
        type: 'transfer_call',
        name: 'Urgent Legal Matter',
        description: 'Caller has an urgent or time-sensitive legal situation requiring immediate attorney attention — transfer to on-call attorney or duty counsel'
      }
    ]
  },

  education: {
    industry: 'education',
    description: 'Educational institution with enrollment, class scheduling, programs, and tuition',
    serviceNodes: [
      {
        id: 'enrollment_inquiry',
        type: 'conversation',
        name: 'Enrollment Process',
        description: 'Prospective student or parent asks how to enroll, what documents are needed, deadlines, or the registration process'
      },
      {
        id: 'book_appointment',
        type: 'function',
        name: 'Schedule Campus Visit or Consultation',
        description: 'Prospective student wants to tour the campus, meet with an advisor, or schedule an admissions consultation',
        functionName: 'book'
      },
      {
        id: 'class_schedule',
        type: 'conversation',
        name: 'Class Schedule and Availability',
        description: 'Student asks about class times, which classes are available, or if a specific course has open spots'
      },
      {
        id: 'program_info',
        type: 'conversation',
        name: 'Program Information',
        description: 'Caller asks about what programs, courses, or degrees are offered, program length, or curriculum details'
      },
      {
        id: 'pricing_inquiry',
        type: 'conversation',
        name: 'Tuition and Financial Aid',
        description: 'Caller asks about tuition costs, payment plans, financial aid options, or scholarship availability'
      },
      {
        id: 'reschedule_appointment',
        type: 'function',
        name: 'Reschedule Campus Visit or Appointment',
        description: 'Prospective student wants to move a scheduled campus tour or advising session to a different date or time',
        functionName: 'reschedule'
      },
      {
        id: 'cancel_appointment',
        type: 'function',
        name: 'Cancel Appointment or Registration',
        description: 'Student wants to cancel a scheduled advising session, campus tour, or registration',
        functionName: 'cancel'
      },
      {
        id: 'student_crisis',
        type: 'transfer_call',
        name: 'Student Crisis or Emergency',
        description: 'Student or parent reports a mental health crisis, safety concern, medical emergency, or any situation requiring immediate staff intervention — transfer immediately to campus safety or duty staff'
      }
    ]
  },

  general_business: {
    industry: 'general_business',
    description: 'Default professional receptionist template for any business — handles message-taking, callback requests, and call routing without industry-specific booking logic',
    serviceNodes: [
      {
        id: 'general_inquiry',
        type: 'conversation',
        name: 'General Information',
        description: 'Caller asks a general question about the business — hours, location, directions, services offered, or general policies. Answer based on the business information provided. If you do not know the answer, offer to take a message or transfer to staff.'
      },
      {
        id: 'take_message',
        type: 'function',
        name: 'Take a Message',
        description: 'Caller wants to leave a message for a specific person or department, or their question cannot be answered directly. Collect the caller\'s name, their message, and who it is for. Use the take_message function to record it.',
        functionName: 'take_message'
      },
      {
        id: 'callback_request',
        type: 'function',
        name: 'Schedule Callback',
        description: 'Caller requests a return call from the business at a specific time or as soon as possible. Collect their name, a good callback number, and their preferred callback window. Use the take_message function with the callback details.',
        functionName: 'take_message'
      },
      {
        id: 'transfer_to_human',
        type: 'transfer_call',
        name: 'Transfer to Staff',
        description: 'Caller needs to speak directly with a person — requests a specific staff member by name, asks for a manager or owner, or has a question that requires human judgment. Use the transfer_call function to connect them.'
      },
      {
        id: 'hours_location_inquiry',
        type: 'conversation',
        name: 'Hours and Location',
        description: 'Caller asks specifically about business hours, address, parking, or how to find the business. Answer based on the hours and address in the business information. If not available, offer to take a message so staff can follow up.'
      }
    ]
  }

};

export function getSupportedIndustries(): string[] {
  return Object.keys(INDUSTRY_TEMPLATES);
}

export function isIndustrySupported(industry?: string): boolean {
  if (!industry) return false;
  return getSupportedIndustries().includes(industry.toLowerCase());
}
