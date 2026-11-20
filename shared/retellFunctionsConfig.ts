/**
 * Industry-specific Retell AI custom functions and post-call analysis configuration
 */

import type { Industry } from './industryConfig';

export interface RetellFunction {
  name: string;
  description: string;
  parameters?: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface PostCallAnalysisField {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'enum';
  description: string;
  choices?: string[]; // For enum type
}

export interface IndustryRetellConfig {
  industry: Industry;
  functions: RetellFunction[];
  postCallAnalysis: PostCallAnalysisField[];
}

export const RETELL_FUNCTIONS_BY_INDUSTRY: Partial<Record<Industry, IndustryRetellConfig>> = {
  restaurant: {
    industry: 'restaurant',
    functions: [
      {
        name: 'place_order',
        description: 'Place a food order for pickup, delivery, or dine-in. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            order_items: { type: 'array', items: { type: 'string' }, description: 'List of ordered items' },
            order_type: { type: 'string', enum: ['pickup', 'delivery', 'dine-in'], description: 'Type of order' },
            total_amount: { type: 'number', description: 'Total order amount' }
          },
          required: ['customer_name', 'order_items', 'order_type']
        }
      },
      {
        name: 'create_reservation',
        description: 'Create a table reservation. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            party_size: { type: 'number', description: 'Number of people' },
            date_time: { type: 'string', description: 'Reservation date and time' },
            special_requests: { type: 'string', description: 'Any special requests' }
          },
          required: ['customer_name', 'party_size', 'date_time']
        }
      },
      {
        name: 'schedule_delivery',
        description: 'Schedule a food delivery. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string' },
            delivery_address: { type: 'string' },
            delivery_time: { type: 'string' },
          },
          required: ['customer_name', 'delivery_address']
        }
      },
      {
        name: 'book_calendar_event',
        description: 'Book a catering or event',
        parameters: {
          type: 'object',
          properties: {
            event_name: { type: 'string' },
            event_date: { type: 'string' },
            guest_count: { type: 'number' },
            contact_info: { type: 'string' }
          },
          required: ['event_name', 'event_date', 'guest_count']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve customer structured data (name, email, past appointment history, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate customer context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured customer preferences in the Contacts subtab (preferred technician, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred service provider, technician, stylist, or barber name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "weekends only", "after 3pm")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'modify_order',
        description: 'Modify a recently placed order before it is prepared — add/remove items, change order type, or update delivery address. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            change_description: { type: 'string', description: 'Description of what to change in the order' },
            order_type: { type: 'string', enum: ['pickup', 'delivery', 'dine-in'], description: 'Updated order type if changing' }
          },
          required: ['customer_name', 'change_description']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Reservation', 'Order', 'Delivery', 'Catering', 'Order Modification', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the customer' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Booked Reservation', 'Placed Order', 'Modified Order', 'Scheduled Catering', 'Scheduled Delivery', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  salon: {
    industry: 'salon',
    functions: [
      {
        name: 'book',
        description: 'Book a beauty or nail appointment - Syncs with salon calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            service_type: { type: 'string', description: 'Type of service (manicure, pedicure, facial, etc.)' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            stylist_preference: { type: 'string', description: 'Preferred stylist/technician' },
            client_notes: { type: 'string', description: 'Special requests or client notes (e.g., nail shape preferences, allergies, design requests)' }
          },
          required: ['customer_name', 'service_type', 'appointment_time']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel an existing appointment. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            appointment_time: { type: 'string', description: 'Original appointment date and time in ISO format, e.g. 2026-03-15T14:00' }
          },
          required: ['customer_name', 'appointment_time']
        }
      },
      {
        name: 'reschedule',
        description: 'Reschedule an existing appointment to a new time. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            current_appointment_time: { type: 'string', description: 'Current appointment date and time' },
            new_appointment_time: { type: 'string', description: 'New appointment date and time in ISO format, e.g. 2026-03-15T14:00' }
          },
          required: ['customer_name', 'current_appointment_time', 'new_appointment_time']
        }
      },
      {
        name: 'check_current_appointment',
        description: 'Check details of a customer\'s current or upcoming appointment. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'modify',
        description: 'Modify specific details of an existing appointment (service type, stylist preference, or client notes) without changing the appointment time. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_service_type: { type: 'string', description: 'New service type if changing service' },
            new_stylist_preference: { type: 'string', description: 'New stylist preference if changing stylist' },
            new_client_notes: { type: 'string', description: 'New or updated client notes/special requests' }
          },
          required: ['customer_name', 'appointment_time']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve customer structured data (name, email, past appointment history, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate customer context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured customer preferences in the Contacts subtab (preferred technician, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred service provider, technician, stylist, or barber name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "weekends only", "after 3pm")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'add_client_note',
        description: 'Add notes to CRM or booking system for this client. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            note: { type: 'string', description: 'Note to add to client record' }
          },
          required: ['customer_name', 'note']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Appointment', 'Service', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the customer' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Booked Appointment', 'Rescheduled Appointment', 'Cancelled Appointment', 'Service Inquiry', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  hotel: {
    industry: 'hotel',
    functions: [
      {
        name: 'create_reservation',
        description: 'Create a room reservation - Syncs with booking calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Guest name' },
            check_in_date: { type: 'string', description: 'Check-in date' },
            check_out_date: { type: 'string', description: 'Check-out date' },
            room_type: { type: 'string', description: 'Type of room requested' },
            guest_count: { type: 'number', description: 'Number of guests' }
          },
          required: ['customer_name', 'check_in_date', 'check_out_date']
        }
      },
      {
        name: 'modify_reservation',
        description: 'Update stay details or room types for existing reservation',
        parameters: {
          type: 'object',
          properties: {
            confirmation_number: { type: 'string', description: 'Reservation confirmation number' },
            customer_name: { type: 'string', description: 'Guest name' },
            updated_details: { type: 'string', description: 'Details to update (dates, room type, etc.)' }
          },
          required: ['confirmation_number', 'customer_name']
        }
      },
      {
        name: 'book_event',
        description: 'Schedule weddings, conferences, or gatherings. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            event_name: { type: 'string', description: 'Name of the event' },
            event_date: { type: 'string', description: 'Event date' },
            attendee_count: { type: 'number', description: 'Number of attendees' },
            contact_name: { type: 'string', description: 'Contact person name' },
            event_type: { type: 'string', description: 'Type of event (wedding, conference, party, etc.)' }
          },
          required: ['event_name', 'event_date', 'attendee_count', 'contact_name']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve customer structured data (name, email, past appointment history, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate customer context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured customer preferences in the Contacts subtab (preferred technician, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred service provider, technician, stylist, or barber name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "weekends only", "after 3pm")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'check_availability',
        description: 'Check room availability - Connects to booking integrations',
        parameters: {
          type: 'object',
          properties: {
            check_in_date: { type: 'string', description: 'Check-in date in ISO format, e.g. 2026-03-15' },
            check_out_date: { type: 'string', description: 'Check-out date in ISO format, e.g. 2026-03-18' },
            room_type: { type: 'string', description: 'Preferred room type' },
            guest_count: { type: 'number', description: 'Number of guests' }
          },
          required: ['check_in_date', 'check_out_date']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel an existing hotel room reservation. Guest phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Guest name' },
            confirmation_number: { type: 'string', description: 'Reservation confirmation number' },
            reason: { type: 'string', description: 'Optional reason for cancellation' }
          },
          required: ['customer_name']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Reservation', 'Event', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the customer' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Booked Room Reservation', 'Scheduled Event', 'Amenity Inquiry', 'Room Service', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  // Medical/Dental/Wellness uses same config
  medical: {
    industry: 'medical',
    functions: [
      {
        name: 'book',
        description: 'Book a medical appointment - Syncs with scheduling calendar. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            appointment_type: { type: 'string', description: 'Type of appointment' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            reason_for_visit: { type: 'string', description: 'Reason for the visit' }
          },
          required: ['patient_name', 'appointment_time']
        }
      },
      {
        name: 'modify',
        description: 'Change appointment times (reschedule or cancel). Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            action: { type: 'string', enum: ['reschedule', 'cancel'], description: 'Action to perform' },
            new_time: { type: 'string', description: 'New appointment time (required for reschedule)' }
          },
          required: ['patient_name', 'action']
        }
      },
      {
        name: 'request_prescription_refill',
        description: 'Process prescription refill request - Connects to EHR integrations. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            medication_name: { type: 'string', description: 'Name of medication' },
            pharmacy_info: { type: 'string', description: 'Pharmacy information' }
          },
          required: ['patient_name', 'medication_name']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve patient structured data (name, email, medical history, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate patient context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured patient preferences in the Contacts subtab (preferred provider, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred doctor, provider, or practitioner name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "weekends only", "after 3pm")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel a patient appointment - Syncs with scheduling calendar. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            appointment_time: { type: 'string', description: 'Original appointment date and time to cancel' },
            reason: { type: 'string', description: 'Optional reason for cancellation' }
          },
          required: ['patient_name']
        }
      },
      {
        name: 'reschedule',
        description: 'Reschedule a patient appointment - Syncs with scheduling calendar. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            old_appointment_time: { type: 'string', description: 'Original appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_appointment_time: { type: 'string', description: 'New appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            reason: { type: 'string', description: 'Optional reason for rescheduling' }
          },
          required: ['patient_name', 'new_appointment_time']
        }
      },
      {
        name: 'check_current_appointment',
        description: 'Check existing appointments for a patient - Retrieves current scheduled appointments. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' }
          },
          required: ['patient_name']
        }
      },
      {
        name: 'modify',
        description: 'Modify appointment details without changing time - Updates appointment notes, type, or provider. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_appointment_type: { type: 'string', description: 'Updated appointment type' },
            new_provider: { type: 'string', description: 'Updated provider or doctor name' },
            notes: { type: 'string', description: 'Additional notes or special requests' }
          },
          required: ['patient_name']
        }
      },
      {
        name: 'add_client_note',
        description: 'Add a note or reminder to patient record - Stores important patient information, preferences, or follow-up reminders in the CRM. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            note: { type: 'string', description: 'Note content to add to the record' },
            category: { type: 'string', description: 'Optional category (e.g., "follow-up", "preference", "medical-history")' }
          },
          required: ['patient_name', 'note']
        }
      },
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Appointment', 'Prescription', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the customer/patient' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Appointment Scheduled', 'Prescription Refill', 'Insurance Question', 'Emergency Redirect', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  auto: {
    industry: 'auto',
    functions: [
      {
        name: 'book_service',
        description: 'Book an auto service appointment - Syncs with service calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            vehicle_info: { type: 'string', description: 'Vehicle make, model, and year' },
            service_type: { type: 'string', description: 'Type of service needed' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' }
          },
          required: ['customer_name', 'appointment_time']
        }
      },
      {
        name: 'request_estimate',
        description: 'Request a service estimate - Connects to estimate system. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            service_description: { type: 'string', description: 'Description of service needed' },
            vehicle_info: { type: 'string', description: 'Vehicle information' }
          },
          required: ['customer_name', 'service_description']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve customer structured data (name, email, past appointment history, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate customer context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured customer preferences in the Contacts subtab (preferred technician, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred service provider, technician, stylist, or barber name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "weekends only", "after 3pm")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel a service appointment - Syncs with service calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            appointment_time: { type: 'string', description: 'Original appointment date and time to cancel' },
            reason: { type: 'string', description: 'Optional reason for cancellation' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'reschedule',
        description: 'Reschedule a service appointment - Syncs with service calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            old_appointment_time: { type: 'string', description: 'Original appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_appointment_time: { type: 'string', description: 'New appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            reason: { type: 'string', description: 'Optional reason for rescheduling' }
          },
          required: ['customer_name', 'new_appointment_time']
        }
      },
      {
        name: 'check_current_appointment',
        description: 'Check existing service appointments for a customer - Retrieves current scheduled appointments. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'modify',
        description: 'Modify appointment details without changing time - Updates service notes, type, or technician. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_service_type: { type: 'string', description: 'Updated service type' },
            new_technician: { type: 'string', description: 'Updated technician name' },
            notes: { type: 'string', description: 'Additional notes or special requests' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'add_client_note',
        description: 'Add a note or reminder to customer record - Stores important customer information, vehicle details, or service reminders in the CRM. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            note: { type: 'string', description: 'Note content to add to the record' },
            category: { type: 'string', description: 'Optional category (e.g., "vehicle-info", "preference", "service-history")' }
          },
          required: ['customer_name', 'note']
        }
      },
      {
        name: 'update_service_status',
        description: 'Update job progress in the system',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            status: { type: 'string', enum: ['scheduled', 'in-progress', 'completed', 'ready-for-pickup'], description: 'Current status' }
          },
          required: ['customer_name', 'status']
        }
      },
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Appointment', 'Estimate', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the customer' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Scheduled Service', 'Repair Estimate', 'Warranty Question', 'Parts Inquiry', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  barbershop: {
    industry: 'barbershop',
    functions: [
      {
        name: 'book',
        description: 'Book a haircut appointment - Syncs with calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            service_type: { type: 'string', description: 'Type of service (haircut, shave, etc.)' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            barber_preference: { type: 'string', description: 'Preferred barber' }
          },
          required: ['customer_name', 'service_type', 'appointment_time']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel a haircut appointment - Syncs with calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            appointment_time: { type: 'string', description: 'Original appointment date and time to cancel' },
            reason: { type: 'string', description: 'Optional reason for cancellation' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'reschedule',
        description: 'Reschedule a haircut appointment - Syncs with calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            old_appointment_time: { type: 'string', description: 'Original appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_appointment_time: { type: 'string', description: 'New appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            reason: { type: 'string', description: 'Optional reason for rescheduling' }
          },
          required: ['customer_name', 'new_appointment_time']
        }
      },
      {
        name: 'check_current_appointment',
        description: 'Check existing appointments for a customer - Retrieves current scheduled appointments. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'modify',
        description: 'Modify appointment details without changing time - Updates service type, barber, or special notes. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_service_type: { type: 'string', description: 'Updated service type' },
            new_barber: { type: 'string', description: 'Updated barber name' },
            notes: { type: 'string', description: 'Additional notes or special requests' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve customer structured data (name, email, past appointment history, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate customer context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured customer preferences in the Contacts subtab (preferred technician, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred service provider, technician, stylist, or barber name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "weekends only", "after 3pm")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'add_client_note',
        description: 'Add a note or reminder to customer record - Stores important customer information, style preferences, or service reminders in the CRM. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            note: { type: 'string', description: 'Note content to add to the record' },
            category: { type: 'string', description: 'Optional category (e.g., "style-preference", "allergy", "service-history")' }
          },
          required: ['customer_name', 'note']
        }
      },
      {
        name: 'update_service_request',
        description: 'Record haircut or treatment details. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            service_details: { type: 'string', description: 'Details of the service requested' }
          },
          required: ['customer_name', 'service_details']
        }
      },
      {
        name: 'log_feedback',
        description: 'Store customer comments and feedback. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            feedback: { type: 'string', description: 'Customer feedback' },
            rating: { type: 'number', minimum: 1, maximum: 5, description: 'Rating (1-5)' }
          },
          required: ['customer_name', 'feedback']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Appointment', 'Service', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the customer' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Booked Haircut', 'Walk-in Availability', 'Stylist Request', 'Service Inquiry', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  fitness: {
    industry: 'fitness',
    functions: [
      {
        name: 'book_session',
        description: 'Book a fitness session or class - Syncs with class or trainer calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            session_type: { type: 'string', description: 'Type of session (yoga, pilates, personal training, etc.)' },
            session_time: { type: 'string', description: 'Session date and time in ISO format, e.g. 2026-03-15T09:00' },
            trainer_preference: { type: 'string', description: 'Preferred trainer (optional)' }
          },
          required: ['customer_name', 'session_type', 'session_time']
        }
      },
      {
        name: 'update_membership',
        description: 'Update or modify membership - Connects to membership system. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            action: { type: 'string', enum: ['upgrade', 'downgrade', 'renew', 'freeze'], description: 'Membership action' },
            membership_type: { type: 'string', description: 'New membership type (if applicable)' }
          },
          required: ['customer_name', 'action']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve customer structured data (name, email, past appointment history, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate customer context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured customer preferences in the Contacts subtab (preferred technician, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred service provider, technician, stylist, or barber name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "weekends only", "after 3pm")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel a fitness session or class - Syncs with class calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            session_time: { type: 'string', description: 'Original session date and time to cancel' },
            reason: { type: 'string', description: 'Optional reason for cancellation' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'reschedule',
        description: 'Reschedule a fitness session or class - Syncs with class calendar. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            old_session_time: { type: 'string', description: 'Original session date and time' },
            new_session_time: { type: 'string', description: 'New session date and time' },
            reason: { type: 'string', description: 'Optional reason for rescheduling' }
          },
          required: ['customer_name', 'new_session_time']
        }
      },
      {
        name: 'check_current_appointment',
        description: 'Check existing class bookings for a customer - Retrieves current scheduled sessions. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'modify',
        description: 'Modify session details without changing time - Updates class type, trainer, or special notes. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            session_time: { type: 'string', description: 'Session date and time in ISO format, e.g. 2026-03-15T09:00' },
            new_session_type: { type: 'string', description: 'Updated session type' },
            new_trainer: { type: 'string', description: 'Updated trainer name' },
            notes: { type: 'string', description: 'Additional notes or special requests' }
          },
          required: ['customer_name']
        }
      },
      {
        name: 'add_client_note',
        description: 'Add a note or reminder to customer record - Stores important member information, fitness goals, or training reminders in the CRM. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            note: { type: 'string', description: 'Note content to add to the record' },
            category: { type: 'string', description: 'Optional category (e.g., "fitness-goal", "medical-note", "training-plan")' }
          },
          required: ['customer_name', 'note']
        }
      },
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Class / Session', 'Court / Open Gym', 'Personal Training', 'Membership', 'Trial / Day Pass', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the member or prospect' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Booking Confirmed', 'Booking Rescheduled', 'Booking Cancelled', 'Membership Signed Up', 'Membership Frozen / Cancelled', 'Personal Training Booked', 'Trial / Day Pass Inquiry', 'Facility Question', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  veterinary: {
    industry: 'veterinary',
    functions: [
      {
        name: 'book',
        description: 'Book a veterinary appointment - Syncs with scheduling calendar. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            pet_type: { type: 'string', description: 'Type of pet (dog, cat, etc.)' },
            service_type: { type: 'string', description: 'Type of service (checkup, vaccination, grooming, etc.)' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            reason: { type: 'string', description: 'Reason for visit' }
          },
          required: ['owner_name', 'pet_name', 'appointment_time']
        }
      },
      {
        name: 'update_appointment',
        description: 'Reschedule pet visits. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            new_time: { type: 'string', description: 'New appointment time' }
          },
          required: ['owner_name', 'pet_name', 'new_time']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve pet owner structured data (name, email, pet history, visit records, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured pet owner preferences in the Contacts subtab (preferred veterinarian, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred veterinarian or pet care specialist name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "weekends only", "after 3pm")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel a veterinary appointment - Syncs with scheduling calendar. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            appointment_time: { type: 'string', description: 'Original appointment date and time to cancel' },
            reason: { type: 'string', description: 'Optional reason for cancellation' }
          },
          required: ['owner_name', 'pet_name']
        }
      },
      {
        name: 'reschedule',
        description: 'Reschedule a veterinary appointment - Syncs with scheduling calendar. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            old_appointment_time: { type: 'string', description: 'Original appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_appointment_time: { type: 'string', description: 'New appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            reason: { type: 'string', description: 'Optional reason for rescheduling' }
          },
          required: ['owner_name', 'pet_name', 'new_appointment_time']
        }
      },
      {
        name: 'check_current_appointment',
        description: 'Check existing appointments for a pet owner - Retrieves current scheduled appointments. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' }
          },
          required: ['owner_name']
        }
      },
      {
        name: 'modify',
        description: 'Modify appointment details without changing time - Updates service type, veterinarian, or special notes. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_service_type: { type: 'string', description: 'Updated service type' },
            new_veterinarian: { type: 'string', description: 'Updated veterinarian name' },
            notes: { type: 'string', description: 'Additional notes or special requests' }
          },
          required: ['owner_name', 'pet_name']
        }
      },
      {
        name: 'add_client_note',
        description: 'Add a note or reminder to pet owner record - Stores important pet information, medical history, or care reminders in the CRM. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            note: { type: 'string', description: 'Note content to add to the record' },
            category: { type: 'string', description: 'Optional category (e.g., "medical-history", "dietary-restriction", "behavioral-note")' }
          },
          required: ['owner_name', 'pet_name', 'note']
        }
      },
      {
        name: 'log_emergency',
        description: 'Flag urgent cases for immediate attention. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            emergency_details: { type: 'string', description: 'Details of the emergency' },
            urgency_level: { type: 'string', enum: ['critical', 'high', 'moderate'], description: 'Urgency level' }
          },
          required: ['owner_name', 'pet_name', 'emergency_details']
        }
      },
      {
        name: 'request_prescription_refill',
        description: 'Request a refill for an existing pet prescription (flea/tick, heartworm, thyroid, pain medication, or any ongoing medication). Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            medication_name: { type: 'string', description: 'Name of the medication to refill' },
            pharmacy_info: { type: 'string', description: 'Pharmacy or pickup preference (optional)' }
          },
          required: ['owner_name', 'pet_name', 'medication_name']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Appointment', 'Emergency', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the pet owner' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Booked Appointment', 'Emergency Situation', 'Grooming Booking', 'Boarding Inquiry', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  'real-estate': {
    industry: 'real-estate',
    functions: [
      {
        name: 'book_showing',
        description: 'Schedule a property showing - Syncs with agent calendar. Client phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Client name' },
            property_address: { type: 'string', description: 'Property address' },
            showing_time: { type: 'string', description: 'Showing date and time' },
            property_type: { type: 'string', description: 'Type of property (house, condo, apartment, etc.)' }
          },
          required: ['client_name', 'property_address', 'showing_time']
        }
      },
      {
        name: 'submit_maintenance_request',
        description: 'Submit a maintenance request - Connects to maintenance system. Tenant phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            tenant_name: { type: 'string', description: 'Tenant name' },
            property_address: { type: 'string', description: 'Property address' },
            issue_description: { type: 'string', description: 'Description of the issue' },
            urgency: { type: 'string', enum: ['emergency', 'high', 'normal', 'low'], description: 'Urgency level' }
          },
          required: ['tenant_name', 'property_address', 'issue_description']
        }
      },
      {
        name: 'update_lease',
        description: 'Update lease information - Connects to leasing integrations. Tenant phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            tenant_name: { type: 'string', description: 'Tenant name' },
            property_address: { type: 'string', description: 'Property address' },
            update_details: { type: 'string', description: 'Lease update details' }
          },
          required: ['tenant_name', 'property_address', 'update_details']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve client or tenant structured data (name, email, property history, lease details, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured client or tenant preferences in the Contacts subtab (preferred agent, property type, viewing time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred real estate agent or property manager name' },
            preferred_service_type: { type: 'string', description: 'Preferred property type or inquiry type (buying, renting, selling)' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred viewing times or contact preferences' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'log_inquiry',
        description: 'Add new lead to CRM. Client phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Potential client name' },
            inquiry_type: { type: 'string', description: 'Type of inquiry (buying, renting, selling)' },
            property_preferences: { type: 'string', description: 'Property preferences and requirements' }
          },
          required: ['client_name', 'inquiry_type']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Showing', 'Maintenance', 'Leasing', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the client/tenant' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Scheduled Showing', 'Maintenance Request', 'Leasing Question', 'Property Inquiry', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  'medical-spa': {
    industry: 'medical-spa',
    functions: [
      {
        name: 'book',
        description: 'Book a medical spa appointment - Syncs with scheduling system. Client phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Client name' },
            treatment_type: { type: 'string', description: 'Type of treatment (Botox, fillers, laser, facials, etc.)' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            consultation_needed: { type: 'boolean', description: 'Whether consultation is needed first' }
          },
          required: ['client_name', 'treatment_type', 'appointment_time']
        }
      },
      {
        name: 'update_treatment_request',
        description: 'Modify booked procedures. Client phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Client name' },
            current_treatment: { type: 'string', description: 'Current booked treatment' },
            requested_changes: { type: 'string', description: 'Changes to treatment or time' }
          },
          required: ['client_name', 'requested_changes']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve client structured data (name, email, service history, case details, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured client preferences in the Contacts subtab (preferred provider, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred medical provider or injector name' },
            preferred_service_type: { type: 'string', description: 'Preferred treatment type (Botox, filler, laser, etc.)' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times or consultation preferences' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'update_client_record',
        description: 'Add notes to CRM system. Client phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Client name' },
            record_notes: { type: 'string', description: 'Notes to add to client record' },
            treatment_history: { type: 'string', description: 'Treatment history or preferences' }
          },
          required: ['client_name', 'record_notes']
        }
      },
      {
        name: 'log_inquiry',
        description: 'Track new patient interest. Client phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Potential client name' },
            treatment_interest: { type: 'string', description: 'Treatment they are interested in' },
            inquiry_notes: { type: 'string', description: 'Additional inquiry details' }
          },
          required: ['client_name', 'treatment_interest']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Appointment', 'Treatment', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the client' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Booked Treatment', 'Consultation Scheduled', 'Pricing Inquiry', 'Procedure Question', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  'pet-daycare': {
    industry: 'pet-daycare',
    functions: [
      {
        name: 'book_daycare',
        description: 'Book daycare service - Syncs with calendar. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            pet_type: { type: 'string', description: 'Type of pet' },
            date: { type: 'string', description: 'Daycare date' },
            drop_off_time: { type: 'string', description: 'Drop-off time' },
            pickup_time: { type: 'string', description: 'Pickup time' }
          },
          required: ['owner_name', 'pet_name', 'date']
        }
      },
      {
        name: 'book_training',
        description: 'Schedule training sessions. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            training_type: { type: 'string', description: 'Type of training (obedience, agility, behavior, etc.)' },
            session_date: { type: 'string', description: 'Training session date and time' }
          },
          required: ['owner_name', 'pet_name', 'training_type', 'session_date']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve pet owner structured data (name, email, pet history, visit records, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured pet owner preferences in the Contacts subtab (preferred caregiver, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred caregiver, trainer, or staff member name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type (daycare, training, grooming, etc.)' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred drop-off/pick-up times or scheduling preferences' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'update_pet_record',
        description: 'Sync pet notes to CRM. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            pet_name: { type: 'string', description: 'Pet name' },
            notes: { type: 'string', description: 'Notes about pet behavior, needs, or updates' }
          },
          required: ['owner_name', 'pet_name', 'notes']
        }
      },
      {
        name: 'log_feedback',
        description: 'Store client comments. Owner phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            owner_name: { type: 'string', description: 'Pet owner name' },
            feedback: { type: 'string', description: 'Client feedback' },
            rating: { type: 'number', minimum: 1, maximum: 5, description: 'Rating (1-5)' }
          },
          required: ['owner_name', 'feedback']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Booking', 'Service', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the pet owner' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Booked Daycare', 'Training Session', 'Vaccination Question', 'Care Policies', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  education: {
    industry: 'education',
    functions: [
      {
        name: 'enroll_student',
        description: 'Enroll student in program - Connects to enrollment system. Parent/guardian phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name' },
            parent_name: { type: 'string', description: 'Parent/guardian name' },
            program_name: { type: 'string', description: 'Program or class to enroll in' },
            grade_level: { type: 'string', description: 'Student grade level' },
            start_date: { type: 'string', description: 'Start date' }
          },
          required: ['student_name', 'program_name']
        }
      },
      {
        name: 'schedule_class',
        description: 'Schedule a class or tutoring session - Syncs with class calendar. Parent/guardian phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name' },
            subject: { type: 'string', description: 'Subject or class' },
            session_time: { type: 'string', description: 'Class date and time' },
            instructor: { type: 'string', description: 'Preferred instructor' }
          },
          required: ['student_name', 'subject', 'session_time']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve student or parent structured data (name, email, enrollment history, course preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured student or parent preferences in the Contacts subtab (preferred instructor, course type, class time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred instructor or advisor name' },
            preferred_service_type: { type: 'string', description: 'Preferred subject, program, or course type' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred class times or scheduling preferences' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel a class or tutoring session - Syncs with class calendar. Parent/guardian phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name' },
            session_time: { type: 'string', description: 'Original session date and time to cancel' },
            reason: { type: 'string', description: 'Optional reason for cancellation' }
          },
          required: ['student_name']
        }
      },
      {
        name: 'reschedule',
        description: 'Reschedule a class or tutoring session - Syncs with class calendar. Parent/guardian phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name' },
            old_session_time: { type: 'string', description: 'Original session date and time' },
            new_session_time: { type: 'string', description: 'New session date and time' },
            reason: { type: 'string', description: 'Optional reason for rescheduling' }
          },
          required: ['student_name', 'new_session_time']
        }
      },
      {
        name: 'check_current_appointment',
        description: 'Check existing class schedules for a student - Retrieves current scheduled sessions. Parent/guardian phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name' }
          },
          required: ['student_name']
        }
      },
      {
        name: 'modify',
        description: 'Modify session details without changing time - Updates subject, instructor, or special notes. Parent/guardian phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name' },
            session_time: { type: 'string', description: 'Session date and time in ISO format, e.g. 2026-03-15T09:00' },
            new_subject: { type: 'string', description: 'Updated subject or class' },
            new_instructor: { type: 'string', description: 'Updated instructor name' },
            notes: { type: 'string', description: 'Additional notes or special requests' }
          },
          required: ['student_name']
        }
      },
      {
        name: 'add_client_note',
        description: 'Add a note or reminder to student record - Stores important student information, learning goals, or academic reminders in the CRM. Parent/guardian phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name' },
            note: { type: 'string', description: 'Note content to add to the record' },
            category: { type: 'string', description: 'Optional category (e.g., "learning-goal", "behavioral-note", "academic-plan")' }
          },
          required: ['student_name', 'note']
        }
      },
      {
        name: 'update_student_record',
        description: 'Add notes or progress reports to student record. Parent/guardian phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name' },
            record_type: { type: 'string', enum: ['note', 'progress', 'attendance'], description: 'Type of record' },
            details: { type: 'string', description: 'Record details' }
          },
          required: ['student_name', 'details']
        }
      },
      {
        name: 'log_inquiry',
        description: 'Store parent or student interest in CRM. Parent/guardian phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            contact_name: { type: 'string', description: 'Parent or student name' },
            program_interest: { type: 'string', description: 'Program or service interested in' },
            inquiry_notes: { type: 'string', description: 'Additional inquiry details' }
          },
          required: ['contact_name', 'program_interest']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Enrollment', 'Scheduling', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the student/parent' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Enrollment Started', 'Scheduled Class', 'Program Inquiry', 'Academic Question', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  dentist: {
    industry: 'dentist',
    functions: [
      {
        name: 'book',
        description: 'Book a dental appointment - Syncs with dental scheduling system. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            appointment_type: { type: 'string', description: 'Type of appointment (cleaning, filling, exam, etc.)' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            reason: { type: 'string', description: 'Reason for visit' },
            insurance_info: { type: 'string', description: 'Insurance information (optional)' }
          },
          required: ['patient_name', 'appointment_time']
        }
      },
      {
        name: 'update_procedure',
        description: 'Modify treatment information. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            procedure_type: { type: 'string', description: 'Type of procedure' },
            update_details: { type: 'string', description: 'Details of the update' }
          },
          required: ['patient_name', 'update_details']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve patient structured data (name, email, medical history, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate patient context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured patient preferences in the Contacts subtab (preferred dentist, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred dentist or hygienist name' },
            preferred_service_type: { type: 'string', description: 'Preferred type of dental service or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "after 3pm", "Fridays only")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel a dental appointment - Syncs with scheduling calendar. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            appointment_time: { type: 'string', description: 'Original appointment date and time to cancel' },
            reason: { type: 'string', description: 'Optional reason for cancellation' }
          },
          required: ['patient_name']
        }
      },
      {
        name: 'reschedule',
        description: 'Reschedule a dental appointment - Syncs with scheduling calendar. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            old_appointment_time: { type: 'string', description: 'Original appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_appointment_time: { type: 'string', description: 'New appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            reason: { type: 'string', description: 'Optional reason for rescheduling' }
          },
          required: ['patient_name', 'new_appointment_time']
        }
      },
      {
        name: 'check_current_appointment',
        description: 'Check existing appointments for a patient - Retrieves current scheduled appointments. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' }
          },
          required: ['patient_name']
        }
      },
      {
        name: 'modify',
        description: 'Modify appointment details without changing time - Updates appointment type, dentist, or special notes. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            appointment_time: { type: 'string', description: 'Appointment date and time in ISO format, e.g. 2026-03-15T14:00' },
            new_appointment_type: { type: 'string', description: 'Updated appointment type' },
            new_dentist: { type: 'string', description: 'Updated dentist name' },
            notes: { type: 'string', description: 'Additional notes or special requests' }
          },
          required: ['patient_name']
        }
      },
      {
        name: 'add_client_note',
        description: 'Add a note or reminder to patient record - Stores important patient information, dental history, or treatment reminders in the CRM. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            note: { type: 'string', description: 'Note content to add to the record' },
            category: { type: 'string', description: 'Optional category (e.g., "dental-history", "allergy", "treatment-plan")' }
          },
          required: ['patient_name', 'note']
        }
      },
      {
        name: 'log_feedback',
        description: 'Collect patient feedback. Patient phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            feedback: { type: 'string', description: 'Patient feedback' },
            rating: { type: 'number', minimum: 1, maximum: 5, description: 'Rating (1-5)' }
          },
          required: ['patient_name', 'feedback']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Appointment', 'Procedure', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the patient' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Appointment Booked', 'Procedure Question', 'Insurance Inquiry', 'Emergency Situation', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  legal: {
    industry: 'legal',
    functions: [
      {
        name: 'submit_client_intake',
        description: 'Submit a new client intake form — captures prospective client contact info and a description of their legal matter for attorney review. Caller phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Full name of the prospective client' },
            matter_type: { type: 'string', description: 'Type of legal matter (e.g., personal injury, family law, criminal defense, contract dispute, estate planning)' },
            matter_description: { type: 'string', description: 'Brief description of the legal situation' },
            urgency: { type: 'string', enum: ['routine', 'time-sensitive', 'urgent'], description: 'How urgently the matter needs attention' },
            preferred_attorney: { type: 'string', description: 'Preferred attorney name if the caller has one (optional)' }
          },
          required: ['client_name', 'matter_type', 'matter_description']
        }
      },
      {
        name: 'book',
        description: 'Schedule an initial consultation with an attorney. Caller phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Full name of the client' },
            appointment_time: { type: 'string', description: 'Consultation date and time' },
            matter_type: { type: 'string', description: 'Type of legal matter for the consultation' },
            attorney_name: { type: 'string', description: 'Preferred attorney name (optional)' },
            notes: { type: 'string', description: 'Additional notes or context for the consultation' }
          },
          required: ['client_name', 'appointment_time']
        }
      },
      {
        name: 'reschedule',
        description: 'Reschedule an existing consultation to a new date or time. Caller phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Client name' },
            old_appointment_time: { type: 'string', description: 'Original consultation date and time' },
            new_appointment_time: { type: 'string', description: 'New consultation date and time' },
            reason: { type: 'string', description: 'Optional reason for rescheduling' }
          },
          required: ['client_name', 'new_appointment_time']
        }
      },
      {
        name: 'cancel',
        description: 'Cancel a scheduled consultation. Caller phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            client_name: { type: 'string', description: 'Client name' },
            appointment_time: { type: 'string', description: 'Consultation date and time to cancel' },
            reason: { type: 'string', description: 'Optional reason for cancellation' }
          },
          required: ['client_name']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve existing client structured data (name, email, matter type, case notes, preferences) from the Contacts record. Runs automatically at the start of every call. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured client information in the Contacts subtab (preferred attorney, matter type, communication notes). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred attorney or practice area contact name' },
            preferred_service_type: { type: 'string', description: 'Type of legal matter (e.g., personal injury, family law, criminal defense, estate planning)' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred consultation times or communication preferences' }
          },
          required: ['agent_id']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'call_type', type: 'enum', description: 'Primary reason for the call', choices: ['New Client Intake', 'Consultation', 'Case Status', 'Practice Area Inquiry', 'FAQ', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the caller' },
      { name: 'matter_type', type: 'string', description: 'Type of legal matter discussed (if applicable)' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Intake Submitted', 'Consultation Booked', 'Consultation Rescheduled', 'Consultation Cancelled', 'Case Status Message Taken', 'Transferred to Attorney', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  'home-service': {
    industry: 'home-service',
    functions: [
      {
        name: 'book_service',
        description: 'Book a home service appointment (cleaning, plumbing, HVAC, roofing, etc.). Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer name' },
            service_type: { type: 'string', description: 'Type of service needed' },
            appointment_time: { type: 'string', description: 'Preferred date and time' },
            address: { type: 'string', description: 'Service address' },
            details: { type: 'string', description: 'Additional service details' }
          },
          required: ['customer_name', 'service_type', 'address']
        }
      },
      {
        name: 'request_estimate',
        description: 'Request a service estimate. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string' },
            service_type: { type: 'string' },
            address: { type: 'string' },
            description: { type: 'string' }
          },
          required: ['customer_name', 'service_type']
        }
      },
      {
        name: 'get_customer_memory',
        description: 'Retrieve customer structured data (name, email, past appointment history, preferences) from the Contacts subtab. This function runs automatically at the start of every call to provide immediate customer context. Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the search' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update specific, structured customer preferences in the Contacts subtab (preferred technician, service type, appointment time preferences). Phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to scope the data' },
            preferred_technician_name: { type: 'string', description: 'Preferred service provider, technician, stylist, or barber name' },
            preferred_service_type: { type: 'string', description: 'Preferred service type or treatment' },
            preferred_appointment_time_notes: { type: 'string', description: 'Notes about preferred appointment times (e.g., "mornings", "weekends only", "after 3pm")' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'update_job_status',
        description: 'Update job status in the system',
        parameters: {
          type: 'object',
          properties: {
            job_id: { type: 'string' },
            status: { type: 'string', enum: ['scheduled', 'in-progress', 'completed', 'cancelled'] },
            notes: { type: 'string' }
          },
          required: ['job_id', 'status']
        }
      },
      {
        name: 'log_feedback',
        description: 'Log customer feedback or review. Customer phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string' },
            feedback: { type: 'string' },
            rating: { type: 'number', minimum: 1, maximum: 5 }
          },
          required: ['feedback']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call' },
      { name: 'service_type', type: 'enum', description: 'Type of service requested', choices: ['Service Booking', 'Estimate', 'FAQ', 'Emergency', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the call objective was achieved' },
      { name: 'customer_name', type: 'string', description: 'Name of the customer' },
      { name: 'call_outcome', type: 'enum', description: 'Determine the single most relevant final outcome of the call from the provided list of options. Prioritize successful outcomes first.', choices: ['Service Scheduled', 'Estimate Provided', 'Emergency Dispatch', 'Availability Question', 'Transferred Call', 'FAQ Handled', 'Customer Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Determine the overall emotional tone of the caller throughout the conversation.', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  },

  general_business: {
    industry: 'general_business',
    functions: [
      {
        name: 'get_customer_memory',
        description: 'Look up existing caller information at the start of every call. Returns caller name, phone number, prior call history, and any notes left by staff. Caller phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Voice agent ID to look up caller records for this business' }
          },
          required: ['agent_id']
        }
      },
      {
        name: 'take_message',
        description: 'Record a message or callback request from the caller. Use for: (1) a caller leaving a message for a specific staff member, (2) a caller requesting a return call, or (3) any inquiry that cannot be answered directly. Caller phone number is automatically captured from Twilio call metadata.',
        parameters: {
          type: 'object',
          properties: {
            caller_name: { type: 'string', description: 'Full name of the caller' },
            message: { type: 'string', description: 'The message content or reason for the call' },
            intended_recipient: { type: 'string', description: 'Name or department the message is for (optional — use "general" if caller does not specify)' },
            callback_requested: { type: 'boolean', description: 'True if the caller wants a return call' },
            preferred_callback_time: { type: 'string', description: 'Caller\'s preferred time to be reached back, e.g. "tomorrow morning" or "anytime today" (optional)' },
            agent_id: { type: 'string', description: 'Voice agent ID to associate this message with the correct business' }
          },
          required: ['caller_name', 'message', 'agent_id']
        }
      },
      {
        name: 'Update',
        description: 'Update caller preferences and notes in the customer record after the call. Use to store callback preferences, communication notes, or any information useful for future interactions.',
        parameters: {
          type: 'object',
          properties: {
            preferred_contact_method: { type: 'string', description: 'How the caller prefers to be contacted (phone, email, text)' },
            preferred_contact_time: { type: 'string', description: 'Best time to reach the caller' },
            notes: { type: 'string', description: 'Any other relevant notes about this caller for staff reference' },
            agent_id: { type: 'string', description: 'Voice agent ID' }
          },
          required: ['agent_id']
        }
      }
    ],
    postCallAnalysis: [
      { name: 'call_summary', type: 'string', description: 'Brief summary of the call and what the caller needed' },
      { name: 'call_type', type: 'enum', description: 'Primary type of call', choices: ['General Inquiry', 'Message Left', 'Callback Requested', 'Staff Transfer', 'Hours / Location', 'Other'] },
      { name: 'call_successful', type: 'boolean', description: 'Whether the caller\'s need was met or properly routed' },
      { name: 'caller_name', type: 'string', description: 'Name of the caller' },
      { name: 'call_outcome', type: 'enum', description: 'Final outcome of the call', choices: ['Message Recorded', 'Callback Scheduled', 'Transferred to Staff', 'Information Provided', 'Caller Hung Up', 'AI Failed'] },
      { name: 'sentiment', type: 'enum', description: 'Overall emotional tone of the caller', choices: ['Positive', 'Neutral', 'Negative'] }
    ]
  }
};

/**
 * Normalize industry name by converting underscores to hyphens
 * This handles cases where OpenAI extracts "home_services" but config uses "home-service"
 */
export function normalizeIndustryName(industry: string): Industry {
  const input = industry.toLowerCase();
  
  // Direct matches (after normalization)
  const normalized = input
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
  
  // Handle exact matches in config
  if (normalized === 'home-services') return 'home-service';
  if (normalized === 'auto-service') return 'auto';
  if (normalized === 'healthcare') return 'medical';
  
  // Keyword-based fallback mapping for unknown industries
  if (input.includes('restaurant') || input.includes('food') || input.includes('pizza') || input.includes('cafe')) return 'restaurant';
  if (input.includes('salon') || input.includes('hair') || input.includes('beauty')) return 'salon';
  if (input.includes('hotel') || input.includes('inn') || input.includes('lodge') || input.includes('motel')) return 'hotel';
  if (input.includes('medical') || input.includes('doctor') || input.includes('clinic') || input.includes('healthcare')) return 'medical';
  if (input.includes('auto') || input.includes('car') || input.includes('mechanic') || input.includes('repair')) return 'auto';
  if (input.includes('barber')) return 'barbershop';
  if (input.includes('fitness') || input.includes('gym') || input.includes('workout') || input.includes('crossfit') || input.includes('yoga') || input.includes('pilates') || input.includes('wellness')) return 'fitness';
  if (input.includes('vet') || input.includes('animal')) return 'veterinary';
  if (input.includes('real estate') || input.includes('property') || input.includes('apartment') || input.includes('housing')) return 'real-estate';
  if (input.includes('spa') && input.includes('medical')) return 'medical-spa';
  if (input.includes('pet') || input.includes('dog') || input.includes('daycare')) return 'pet-daycare';
  if (input.includes('home') || input.includes('roof') || input.includes('plumb') || input.includes('hvac') || input.includes('clean')) return 'home-service';
  if (input.includes('education') || input.includes('school') || input.includes('tutor') || input.includes('learning')) return 'education';
  if (input.includes('gym')) return 'fitness';
  if (input.includes('dent') || input.includes('ortho')) return 'dentist';
  if (input.includes('legal') || input.includes('law') || input.includes('attorney') || input.includes('lawyer') || input.includes('litigation')) return 'legal';
  if (input.includes('spa')) return 'salon';
  if (input.includes('retail') || input.includes('store') || input.includes('shop')) return 'home-service'; // Default retail to home-service
  
  // Default fallback to general_business
  console.warn(`⚠️ Unknown industry "${industry}" - defaulting to "general_business"`);
  return 'general_business';
}

/**
 * Get Retell configuration for a specific industry
 */
export function getRetellConfigForIndustry(industry: string | Industry): IndustryRetellConfig {
  const normalizedIndustry = normalizeIndustryName(industry);
  return RETELL_FUNCTIONS_BY_INDUSTRY[normalizedIndustry]!;
}

/**
 * Built-in custom functions that are available for all industries
 * These are added automatically to every agent as custom webhook functions
 */
export const BUILT_IN_RETELL_FUNCTIONS: RetellFunction[] = [
  {
    name: 'transfer_call',
    description: `Transfer call to a team member using smart routing logic:
PRIORITY ROUTING (in order):
1. If customer requests specific person by name AND that person is assigned to this agent → transfer to them
2. If customer requests manager/owner/employee role AND member with that role is assigned → transfer to them
3. DEFAULT FALLBACK: If no specific request, customer frustrated/angry, or first transfer failed → transfer to Default Call Transfer member

REQUIREMENTS: Only transfers to members who:
- Are assigned to this specific AI agent
- Have call transfer enabled in their account settings
- Match the requested criteria (name, role, or default)

Customer phone number is automatically captured from Twilio call metadata.`,
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for transferring (e.g., "customer wants manager", "customer frustrated", "general assistance needed")' },
        target_role: { type: 'string', enum: ['manager', 'owner', 'employee', 'specific', 'default'], description: 'Type of member to transfer to. Use "default" for fallback routing when customer needs human help without specific request' },
        target_name: { type: 'string', description: 'Specific member name (only when target_role is "specific")' },
        agent_id: { type: 'string', description: 'Voice agent ID to look up assigned team members' },
        is_retry: { type: 'boolean', description: 'True if this is a retry after failed transfer attempt' }
      },
      required: ['reason', 'target_role', 'agent_id']
    }
  },
  {
    name: 'sms_alert',
    description: 'Send SMS alerts to team members when customers modify appointments, reservations, or other important actions. Only sends to members who are: (1) assigned to this specific AI agent, and (2) have SMS messaging enabled in their account settings.',
    parameters: {
      type: 'object',
      properties: {
        alert_type: { 
          type: 'string', 
          enum: ['appointment_modified', 'reservation_modified', 'order_modified', 'cancellation', 'urgent_request', 'general'],
          description: 'Type of alert being sent'
        },
        customer_name: { type: 'string', description: 'Name of the customer making the change' },
        details: { type: 'object', description: 'Details about what was modified (appointment time, reservation date, etc.)' },
        agent_id: { type: 'string', description: 'Voice agent ID to look up team members assigned to this agent' }
      },
      required: ['alert_type', 'details', 'agent_id']
    }
  },
  {
    name: 'check_calendar_availability',
    description: 'Check availability in the business calendar for appointments or reservations',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date for appointment (YYYY-MM-DD format)' },
        time: { type: 'string', description: 'Time for appointment (HH:MM format in 24-hour time)' },
        duration_minutes: { type: 'number', description: 'Duration of appointment in minutes (default 30)' },
        stylist: { type: 'string', description: 'Specific stylist, barber, or service provider to check availability for' }
      },
      required: ['date', 'time']
    }
  }
];

/**
 * Get custom functions for a specific industry
 * Automatically includes built-in Retell AI functions (transfer_call)
 */
export function getCustomFunctionsForIndustry(industry: string | Industry): RetellFunction[] {
  const normalizedIndustry = normalizeIndustryName(industry);
  const industryFunctions = RETELL_FUNCTIONS_BY_INDUSTRY[normalizedIndustry]?.functions || [];
  // Combine industry-specific functions with built-in Retell functions
  return [...industryFunctions, ...BUILT_IN_RETELL_FUNCTIONS];
}

/**
 * Get post-call analysis fields for a specific industry
 */
export function getPostCallAnalysisForIndustry(industry: string | Industry): PostCallAnalysisField[] {
  const normalizedIndustry = normalizeIndustryName(industry);
  return RETELL_FUNCTIONS_BY_INDUSTRY[normalizedIndustry]?.postCallAnalysis || [];
}
