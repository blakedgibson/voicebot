/**
 * Native Action Templates
 * Defines pre-configured action templates for common use cases.
 * These templates provide default configurations that users can customize.
 */

export interface PostCallAction {
  id: string;
  action: string; // function name to execute
  trigger: string; // e.g., 'flagged_call'
  destinationType: 'specific_number' | 'team_member' | 'voicebot';
  destinationValue: string; // phone number, team member ID, or voicebot ID
}

export interface NativeActionTemplate {
  key: string;
  label: string;
  functionName: string;
  displayTitle: string;
  description: string;
  category: string;
  parameters: Array<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    arrayItemType?: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    displayType?: 'text' | 'number' | 'date' | 'time';
  }>;
  speakDuringExecution?: boolean;
  speakDuringText?: string;
  speakAfterExecution?: boolean;
  // Messaging-specific fields
  smsMessageType?: 'static' | 'prompt';
  smsContent?: string;
  recipientPhone?: string;
  // Call action-specific fields
  callActionType?: 'transfer' | 'end' | 'hold' | 'post_call_actions';
  transferPhoneNumber?: string;
  // Post-call actions configuration
  postCallActions?: PostCallAction[];
}

// ============================================================
// APPOINTMENT SETTING NATIVE ACTIONS
// ============================================================
export const APPOINTMENT_NATIVE_ACTIONS: NativeActionTemplate[] = [
  {
    key: 'book_appointment',
    label: 'Book',
    functionName: 'book_appointment',
    displayTitle: 'Book Appointment',
    description: 'Books a new appointment with the customer. The AI will collect the necessary information (date, time, service type) and confirm the booking.',
    category: 'appointmentSetting',
    parameters: [
      {
        name: 'customer_name',
        description: 'Full name of the customer',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'customer_phone',
        description: 'Customer phone number',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'customer_email',
        description: 'Customer email address',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'appointment_date',
        description: 'Date of the appointment (YYYY-MM-DD format)',
        type: 'string',
        required: true,
        displayType: 'date'
      },
      {
        name: 'appointment_time',
        description: 'Time of the appointment (HH:MM format)',
        type: 'string',
        required: true,
        displayType: 'time'
      },
      {
        name: 'service_type',
        description: 'Type of service or appointment reason',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'notes',
        description: 'Additional notes or special requests',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'Let me book that appointment for you.',
    speakAfterExecution: true
  },
  {
    key: 'cancel_appointment',
    label: 'Cancel',
    functionName: 'cancel_appointment',
    displayTitle: 'Cancel Appointment',
    description: 'Cancels an existing appointment. The AI will verify the appointment details and process the cancellation.',
    category: 'appointmentSetting',
    parameters: [
      {
        name: 'customer_name',
        description: 'Name of the customer',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'customer_phone',
        description: 'Customer phone number',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'appointment_date',
        description: 'Date of the appointment to cancel (YYYY-MM-DD format)',
        type: 'string',
        required: true,
        displayType: 'date'
      },
      {
        name: 'appointment_time',
        description: 'Time of the appointment to cancel (HH:MM format)',
        type: 'string',
        required: false,
        displayType: 'time'
      },
      {
        name: 'cancellation_reason',
        description: 'Reason for cancellation',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m canceling that appointment for you.',
    speakAfterExecution: true
  },
  {
    key: 'reschedule_appointment',
    label: 'Reschedule',
    functionName: 'reschedule_appointment',
    displayTitle: 'Reschedule Appointment',
    description: 'Reschedules an existing appointment to a new date and time. The AI will confirm the original appointment and the new time.',
    category: 'appointmentSetting',
    parameters: [
      {
        name: 'customer_name',
        description: 'Name of the customer',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'customer_phone',
        description: 'Customer phone number',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'old_appointment_date',
        description: 'Current appointment date (YYYY-MM-DD format)',
        type: 'string',
        required: true,
        displayType: 'date'
      },
      {
        name: 'old_appointment_time',
        description: 'Current appointment time (HH:MM format)',
        type: 'string',
        required: false,
        displayType: 'time'
      },
      {
        name: 'new_appointment_date',
        description: 'New appointment date (YYYY-MM-DD format)',
        type: 'string',
        required: true,
        displayType: 'date'
      },
      {
        name: 'new_appointment_time',
        description: 'New appointment time (HH:MM format)',
        type: 'string',
        required: true,
        displayType: 'time'
      },
      {
        name: 'reason',
        description: 'Reason for rescheduling',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m rescheduling that appointment for you.',
    speakAfterExecution: true
  },
  {
    key: 'check_availability',
    label: 'Check Availability',
    functionName: 'check_availability',
    displayTitle: 'Check Availability',
    description: 'Checks availability for appointments on a specific date and time range. The AI will inform the customer of available time slots.',
    category: 'appointmentSetting',
    parameters: [
      {
        name: 'requested_date',
        description: 'Date to check availability (YYYY-MM-DD format)',
        type: 'string',
        required: true,
        displayType: 'date'
      },
      {
        name: 'requested_time',
        description: 'Preferred time (HH:MM format)',
        type: 'string',
        required: false,
        displayType: 'time'
      },
      {
        name: 'service_type',
        description: 'Type of service',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'duration_minutes',
        description: 'Expected duration in minutes',
        type: 'number',
        required: false,
        displayType: 'number'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'Let me check our availability for you.',
    speakAfterExecution: true
  },
  {
    key: 'modify_appointment',
    label: 'Modify',
    functionName: 'modify_appointment',
    displayTitle: 'Modify Appointment',
    description: 'Modifies details of an existing appointment (service type, notes, etc.) without changing the date/time.',
    category: 'appointmentSetting',
    parameters: [
      {
        name: 'customer_name',
        description: 'Name of the customer',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'customer_phone',
        description: 'Customer phone number',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'appointment_date',
        description: 'Date of the appointment (YYYY-MM-DD format)',
        type: 'string',
        required: true,
        displayType: 'date'
      },
      {
        name: 'appointment_time',
        description: 'Time of the appointment (HH:MM format)',
        type: 'string',
        required: false,
        displayType: 'time'
      },
      {
        name: 'new_service_type',
        description: 'Updated service type (if changing)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'new_notes',
        description: 'Updated notes or special requests',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m updating that appointment for you.',
    speakAfterExecution: true
  }
];

// ============================================================
// CRM NATIVE ACTIONS
// ============================================================
export const CRM_NATIVE_ACTIONS: NativeActionTemplate[] = [
  {
    key: 'crm_create',
    label: 'Create',
    functionName: 'create_customer_record',
    displayTitle: 'Create Customer Record',
    description: 'Creates a new customer record with contact information and preferences. The AI will collect necessary details to set up the customer profile.',
    category: 'crm',
    parameters: [
      {
        name: 'customer_name',
        description: 'Full name of the customer',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'phone_number',
        description: 'Customer phone number',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'email',
        description: 'Customer email address',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'address',
        description: 'Customer address',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'preferences',
        description: 'Customer preferences and notes',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'tags',
        description: 'Customer tags or categories (comma-separated)',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m creating a customer record.',
    speakAfterExecution: true
  },
  {
    key: 'crm_update',
    label: 'Update',
    functionName: 'update_customer_record',
    displayTitle: 'Update Customer Record',
    description: 'Updates an existing customer record with new information or preferences. The AI will identify the customer and update the specified fields.',
    category: 'crm',
    parameters: [
      {
        name: 'customer_identifier',
        description: 'Customer name, phone, or email to identify the record',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'field_to_update',
        description: 'Which field to update (email, phone, address, preferences, etc.)',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'new_value',
        description: 'New value for the field',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'notes',
        description: 'Additional notes about this update',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m updating the customer record.',
    speakAfterExecution: true
  },
  {
    key: 'crm_lookup',
    label: 'Lookup',
    functionName: 'lookup_customer',
    displayTitle: 'Lookup Customer',
    description: 'Looks up customer information by name, phone, or email. The AI will retrieve and can share relevant customer details.',
    category: 'crm',
    parameters: [
      {
        name: 'search_query',
        description: 'Customer name, phone number, or email to search for',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'fields_to_retrieve',
        description: 'Specific fields to retrieve (e.g., "preferences, order_history")',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'Let me look up that customer information.',
    speakAfterExecution: true
  },
  {
    key: 'crm_note',
    label: 'Add Note',
    functionName: 'add_customer_note',
    displayTitle: 'Add Customer Note',
    description: 'Adds a note or comment to a customer\'s record. The AI will document important information, feedback, or interaction details.',
    category: 'crm',
    parameters: [
      {
        name: 'customer_identifier',
        description: 'Customer name, phone, or email',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'note_content',
        description: 'The note or comment to add',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'note_category',
        description: 'Category of note (feedback, complaint, request, preference, etc.)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'priority',
        description: 'Priority level (low, medium, high)',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m adding that note to the customer record.',
    speakAfterExecution: true
  }
];

// ============================================================
// MESSAGING NATIVE ACTIONS
// ============================================================
export const MESSAGING_NATIVE_ACTIONS: NativeActionTemplate[] = [
  {
    key: 'sms_confirmation',
    label: 'Confirmation',
    functionName: 'sms_send_confirmation',
    displayTitle: 'Send Confirmation SMS',
    description: 'Sends a confirmation text message to the customer with booking, order, or appointment details.',
    category: 'messaging',
    parameters: [
      {
        name: 'recipient_phone',
        description: 'Customer phone number to send SMS to',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'confirmation_type',
        description: 'Type of confirmation (appointment, order, reservation, etc.)',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'confirmation_details',
        description: 'Key details to include in the confirmation (date, time, order number, etc.)',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'business_name',
        description: 'Name of the business',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m sending you a confirmation text message.',
    speakAfterExecution: true,
    smsMessageType: 'static',
    smsContent: 'Thank you! Your {{confirmation_type}} has been confirmed. Details: {{confirmation_details}}. From {{business_name}}.',
    recipientPhone: '{{recipient_phone}}'
  },
  {
    key: 'sms_alert',
    label: 'Alert',
    functionName: 'sms_send_alert',
    displayTitle: 'Send Alert SMS',
    description: 'Sends an urgent alert or notification text message to the customer or staff.',
    category: 'messaging',
    parameters: [
      {
        name: 'recipient_phone',
        description: 'Phone number to send alert to',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'alert_type',
        description: 'Type of alert (urgent, reminder, update, etc.)',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'alert_message',
        description: 'The alert message content',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'action_required',
        description: 'Any action the recipient should take',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m sending an alert message.',
    speakAfterExecution: true,
    smsMessageType: 'static',
    smsContent: 'ALERT: {{alert_message}} {{action_required}}',
    recipientPhone: '{{recipient_phone}}'
  },
  {
    key: 'sms_link',
    label: 'Send Link',
    functionName: 'sms_send_link',
    displayTitle: 'Send Link SMS',
    description: 'Sends a text message containing a link (website, payment portal, booking page, tracking, etc.).',
    category: 'messaging',
    parameters: [
      {
        name: 'recipient_phone',
        description: 'Customer phone number to send SMS to',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'link_url',
        description: 'The URL to send',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'link_description',
        description: 'Brief description of what the link is for',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'custom_message',
        description: 'Optional custom message to include',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m texting you the link.',
    speakAfterExecution: true,
    smsMessageType: 'static',
    smsContent: '{{link_description}}: {{link_url}} {{custom_message}}',
    recipientPhone: '{{recipient_phone}}'
  }
];

// ============================================================
// POS (POINT OF SALE) NATIVE ACTIONS
// ============================================================
export const POS_NATIVE_ACTIONS: NativeActionTemplate[] = [
  {
    key: 'pos_check_pricing',
    label: 'Check Pricing',
    functionName: 'check_item_pricing',
    displayTitle: 'Check Item Pricing',
    description: 'Looks up pricing information for products or services. The AI will retrieve current prices, available discounts, and special offers.',
    category: 'pointOfSale',
    parameters: [
      {
        name: 'item_name',
        description: 'Name or description of the product/service',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'item_sku',
        description: 'SKU or product code (if available)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'quantity',
        description: 'Quantity requested for pricing calculation',
        type: 'number',
        required: false,
        displayType: 'number'
      },
      {
        name: 'customer_type',
        description: 'Customer type for pricing tier (e.g., retail, wholesale, member)',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'Let me check the pricing for you.',
    speakAfterExecution: true
  },
  {
    key: 'pos_apply_discount',
    label: 'Apply Discount',
    functionName: 'apply_discount',
    displayTitle: 'Apply Discount',
    description: 'Applies a discount code, promotional offer, or special pricing to an order. The AI will validate and apply the appropriate discount.',
    category: 'pointOfSale',
    parameters: [
      {
        name: 'order_id',
        description: 'Order or transaction ID to apply discount to',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'discount_code',
        description: 'Promotional or discount code to apply',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'discount_type',
        description: 'Type of discount (percentage, fixed_amount, promotional, loyalty)',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'discount_value',
        description: 'Discount amount (percentage or dollar amount)',
        type: 'number',
        required: true,
        displayType: 'number'
      },
      {
        name: 'reason',
        description: 'Reason for discount (customer service, loyalty, promotion, etc.)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'items',
        description: 'Specific items to apply discount to (comma-separated)',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m applying that discount for you.',
    speakAfterExecution: true
  },
  {
    key: 'pos_send_payment_link',
    label: 'Send Payment Link',
    functionName: 'send_payment_link',
    displayTitle: 'Send Payment Link',
    description: 'Sends a secure payment link to the customer via SMS or email. The AI will generate and deliver the link with order details.',
    category: 'pointOfSale',
    parameters: [
      {
        name: 'customer_name',
        description: 'Name of the customer',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'customer_phone',
        description: 'Customer phone number for SMS (E.164 format)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'customer_email',
        description: 'Customer email address',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'amount',
        description: 'Payment amount due',
        type: 'number',
        required: true,
        displayType: 'number'
      },
      {
        name: 'currency',
        description: 'Currency code (e.g., USD, EUR, GBP)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'order_description',
        description: 'Brief description of order/invoice',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'invoice_number',
        description: 'Invoice or order number',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'due_date',
        description: 'Payment due date (YYYY-MM-DD format)',
        type: 'string',
        required: false,
        displayType: 'date'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'I\'m sending you the payment link now.',
    speakAfterExecution: true,
    smsMessageType: 'static',
    smsContent: 'Hi {{customer_name}}, here\'s your payment link for {{order_description}} (Amount: ${{amount}}): [Payment Link]. Invoice #{{invoice_number}}',
    recipientPhone: '{{customer_phone}}'
  }
];

// ============================================================
// CALL ACTIONS NATIVE ACTIONS
// ============================================================
export const CALL_NATIVE_ACTIONS: NativeActionTemplate[] = [
  {
    key: 'call_transfer',
    label: 'Transfer',
    functionName: 'transfer_call',
    displayTitle: 'Transfer Call',
    description: 'Transfers the active call to another phone number (department, specialist, manager, etc.).',
    category: 'callActions',
    parameters: [
      {
        name: 'transfer_destination_type',
        description: 'How to define the transfer destination (specific_number, team_member, voicebot)',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'transfer_phone_number',
        description: 'Specific phone number to transfer to (used when destination_type is specific_number)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'transfer_team_member',
        description: 'Team member name or ID to transfer to (used when destination_type is team_member)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'transfer_voicebot',
        description: 'VoiceBot ID to transfer to (used when destination_type is voicebot)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'transfer_type',
        description: 'Transfer type: cold (straight through) or warm (bot explains to recipient)',
        type: 'string',
        required: true,
        displayType: 'text'
      },
      {
        name: 'transfer_reason',
        description: 'Reason for transfer (e.g., "Customer needs manager", "Technical support")',
        type: 'string',
        required: false,
        displayType: 'text'
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'Let me transfer you now.',
    speakAfterExecution: false,
    callActionType: 'transfer',
    transferPhoneNumber: ''
  },
  {
    key: 'call_end',
    label: 'End Call',
    functionName: 'end_call',
    displayTitle: 'End Call',
    description: 'Ends the active call gracefully after completing the conversation.',
    category: 'callActions',
    parameters: [
      {
        name: 'end_reason',
        description: 'Reason for ending call (completed, customer_request, etc.)',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'follow_up_required',
        description: 'Whether follow-up action is needed',
        type: 'boolean',
        required: false
      }
    ],
    speakDuringExecution: false,
    speakDuringText: '',
    speakAfterExecution: true,
    callActionType: 'end'
  },
  {
    key: 'call_hold',
    label: 'Hold',
    functionName: 'hold_call',
    displayTitle: 'Hold Call',
    description: 'Places the caller on hold temporarily while looking up information or consulting with someone.',
    category: 'callActions',
    parameters: [
      {
        name: 'hold_reason',
        description: 'Reason for placing on hold',
        type: 'string',
        required: false,
        displayType: 'text'
      },
      {
        name: 'estimated_wait_seconds',
        description: 'Estimated wait time in seconds',
        type: 'number',
        required: false,
        displayType: 'number'
      },
      {
        name: 'hold_music',
        description: 'Whether to play hold music',
        type: 'boolean',
        required: false
      }
    ],
    speakDuringExecution: true,
    speakDuringText: 'Please hold for just a moment.',
    speakAfterExecution: false,
    callActionType: 'hold'
  },
  {
    key: 'post_call_actions',
    label: 'Post-Call Actions',
    functionName: 'post_call_actions',
    displayTitle: 'Post-Call Actions',
    description: 'Executes automated actions after a call ends based on specific triggers like flagged calls.',
    category: 'callActions',
    parameters: [],
    speakDuringExecution: false,
    speakDuringText: '',
    speakAfterExecution: false,
    callActionType: 'post_call_actions',
    postCallActions: []
  }
];

// ============================================================
// CATEGORY MAPPINGS
// ============================================================
export const NATIVE_ACTIONS_BY_CATEGORY: Record<string, NativeActionTemplate[]> = {
  appointmentSetting: APPOINTMENT_NATIVE_ACTIONS,
  crm: CRM_NATIVE_ACTIONS,
  pointOfSale: POS_NATIVE_ACTIONS,
  messaging: MESSAGING_NATIVE_ACTIONS,
  callActions: CALL_NATIVE_ACTIONS,
  customIntegration: [] // Custom has no native actions
};

/**
 * Get native actions for a specific category
 */
export function getNativeActionsForCategory(category: string): NativeActionTemplate[] {
  return NATIVE_ACTIONS_BY_CATEGORY[category] || [];
}

/**
 * Get a native action template by key
 */
export function getNativeActionTemplate(key: string): NativeActionTemplate | undefined {
  const allActions = Object.values(NATIVE_ACTIONS_BY_CATEGORY).flat();
  return allActions.find(action => action.key === key);
}

// ============================================================
// INDUSTRY → ALLOWED NATIVE ACTION KEYS
// Maps each industry to the native action keys that should appear in the
// "Add Actions" dropdown. Universal actions (SMS, call transfer) are always included.
// ============================================================

const UNIVERSAL_KEYS = [
  'send_sms_confirmation', 'sms_modification_alert',
  'transfer_call', 'end_call',
  'collect_feedback'
];

const APPOINTMENT_KEYS = [
  'book_appointment', 'reschedule_appointment', 'cancel_appointment',
  'modify_appointment', 'check_appointment', 'book_calendar_event'
];

const POS_RESTAURANT_KEYS = [
  'place_order', 'create_reservation', 'schedule_delivery',
  'place_catering_order', 'check_order_status'
];

const INDUSTRY_NATIVE_ACTION_KEYS: Record<string, string[]> = {
  salon:          [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS, 'update_customer_preferences'],
  barbershop:     [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS, 'update_customer_preferences'],
  'nail-bar':     [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS, 'update_customer_preferences'],
  'medical-spa':  [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  restaurant:     [...POS_RESTAURANT_KEYS, ...UNIVERSAL_KEYS],
  hotel:          ['create_reservation', 'book_calendar_event', ...UNIVERSAL_KEYS],
  healthcare:     [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  dental:         [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  auto:           [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  'home-service': [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  veterinary:     [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  'pet-daycare':  [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  fitness:        [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  gym:            [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  'real-estate':  [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
  education:      [...APPOINTMENT_KEYS, ...UNIVERSAL_KEYS],
};

/**
 * Returns the set of native action keys allowed for a given industry.
 * Falls back to all keys if the industry is not found.
 */
export function getIndustryNativeActionKeys(industry: string | undefined | null): Set<string> {
  if (!industry) return new Set(Object.values(NATIVE_ACTIONS_BY_CATEGORY).flat().map(a => a.key));
  const allowed = INDUSTRY_NATIVE_ACTION_KEYS[industry.toLowerCase()];
  if (!allowed) return new Set(Object.values(NATIVE_ACTIONS_BY_CATEGORY).flat().map(a => a.key));
  return new Set(allowed);
}

/**
 * Filters a list of native actions for a category by the allowed keys for the given industry.
 */
export function filterNativeActionsByIndustry(
  category: string,
  industry: string | undefined | null
): NativeActionTemplate[] {
  const allowed = getIndustryNativeActionKeys(industry);
  return (NATIVE_ACTIONS_BY_CATEGORY[category] || []).filter(a => allowed.has(a.key));
}

// ============================================================
// INDUSTRY → ACTION OVERRIDES
// Personalizes parameter descriptions, extra params, and SMS
// content when a native action template is loaded for a specific
// industry. The function names and parameter names stay the same
// so existing saved actions remain valid.
// ============================================================

export interface BusinessLocation {
  name: string;
  address?: string;
  phone: string;
}

export interface IndustryActionOverride {
  /** Override descriptions for existing parameters (keyed by param name) */
  parameterOverrides?: Record<string, { description: string; required?: boolean }>;
  /** Extra optional parameters to append (industry-specific details) */
  extraParameters?: Array<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    displayType?: 'text' | 'number' | 'date' | 'time';
  }>;
  /** Industry-specific SMS content template */
  smsContent?: string;
  /** Industry-specific speak-during-execution text */
  speakDuringText?: string;
}

// Per-industry appointment details
const APT_BY_INDUSTRY: Record<string, { serviceType: string; notes: string; smsContent: string }> = {
  salon: {
    serviceType: 'Type of beauty service (e.g., haircut, color, highlights, keratin, blowout, facial)',
    notes: 'Hair type, color history, allergies, preferred stylist, or special requests',
    smsContent: 'Hi {{customer_name}}! Your {{service_type}} is confirmed at {{business_name}} on {{appointment_date}} at {{appointment_time}}. We look forward to seeing you! Reply STOP to opt out.',
  },
  'nail-bar': {
    serviceType: 'Type of nail service (e.g., gel manicure, acrylic full set, pedicure, nail art, dip powder, builder gel)',
    notes: 'Preferred nail colors or design ideas, any nail conditions or product sensitivities',
    smsContent: "Hi {{customer_name}}! Your {{service_type}} is booked at {{business_name}} on {{appointment_date}} at {{appointment_time}}. Can't wait to see you! Reply STOP to opt out.",
  },
  barbershop: {
    serviceType: 'Type of barbershop service (e.g., haircut, taper fade, beard trim, straight razor shave, hot towel shave)',
    notes: 'Preferred style, length, fade level, barber name, or any specific styling requests',
    smsContent: 'Hi {{customer_name}}! Your {{service_type}} is confirmed at {{business_name}} on {{appointment_date}} at {{appointment_time}}. See you then! Reply STOP to opt out.',
  },
  'medical-spa': {
    serviceType: 'Type of aesthetic treatment (e.g., Botox, dermal filler, laser hair removal, chemical peel, microneedling, PRP, hydrafacial)',
    notes: 'Areas of concern, previous treatments received, current medications or topicals, skin type, or provider questions',
    smsContent: 'Hi {{customer_name}}, your {{service_type}} appointment at {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Please arrive 10 minutes early and avoid sun exposure beforehand. Reply STOP to opt out.',
  },
  healthcare: {
    serviceType: 'Type of medical appointment (e.g., annual physical, follow-up visit, sick visit, specialist consultation, lab work)',
    notes: 'Primary reason for visit, current symptoms, medications being taken, or questions for the provider',
    smsContent: 'Your appointment at {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Please bring a photo ID, insurance card, and arrive 15 minutes early. Reply STOP to opt out.',
  },
  dental: {
    serviceType: 'Type of dental service (e.g., routine cleaning, exam & x-rays, filling, crown, root canal, teeth whitening, Invisalign)',
    notes: 'Specific dental concerns or pain areas, date of last dental visit, insurance questions, or anxiety about treatment',
    smsContent: 'Hi {{customer_name}}, your dental appointment at {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Please arrive 10 minutes early with your insurance card. Reply STOP to opt out.',
  },
  auto: {
    serviceType: 'Type of vehicle service (e.g., oil change, brake inspection, tire rotation, AC service, alignment, transmission, engine diagnostic)',
    notes: "Vehicle year, make, model, and mileage; description of any unusual noises or issues observed",
    smsContent: 'Hi {{customer_name}}, your {{service_type}} appointment at {{business_name}} is set for {{appointment_date}} at {{appointment_time}}. Please have your vehicle registration ready. Reply STOP to opt out.',
  },
  veterinary: {
    serviceType: 'Type of veterinary service (e.g., wellness exam, vaccinations, dental cleaning, surgery consult, sick visit, spay/neuter)',
    notes: "Pet's name, species, breed, age, and primary reason for the visit or current symptoms",
    smsContent: "Hi {{customer_name}}, your pet's {{service_type}} appointment at {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Please bring vaccination records if available. Reply STOP to opt out.",
  },
  'pet-daycare': {
    serviceType: 'Type of pet service (e.g., full-day daycare, overnight boarding, bath & groom, puppy training, drop-off/pick-up)',
    notes: "Pet's name, breed, age, vaccination status, emergency contact number, or special care instructions",
    smsContent: "Hi {{customer_name}}, your pet's {{service_type}} at {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Please bring vaccination records on the first visit. Reply STOP to opt out.",
  },
  fitness: {
    serviceType: 'Type of fitness session (e.g., personal training, yoga, spin class, HIIT, pilates, nutrition consultation)',
    notes: 'Current fitness level, personal goals, any injuries or physical limitations, or trainer/class preferences',
    smsContent: 'Hi {{customer_name}}! Your {{service_type}} at {{business_name}} is booked for {{appointment_date}} at {{appointment_time}}. Remember to bring water and appropriate workout attire. Reply STOP to opt out.',
  },
  gym: {
    serviceType: 'Type of gym session or service (e.g., personal training, fitness orientation, group fitness class, body composition assessment)',
    notes: 'Current fitness level, goals, any physical limitations, or specific areas to focus on',
    smsContent: 'Hi {{customer_name}}, your {{service_type}} at {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Reply STOP to opt out.',
  },
  'real-estate': {
    serviceType: 'Type of appointment (e.g., property showing, buyer consultation, listing presentation, investment walkthrough, open house follow-up)',
    notes: 'Property address if showing, buyer budget range and must-have features, or specific market questions',
    smsContent: 'Hi {{customer_name}}, your appointment with {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. We look forward to assisting you! Reply STOP to cancel.',
  },
  education: {
    serviceType: 'Type of session or service (e.g., tutoring, enrollment consultation, campus tour, test prep session, language lesson)',
    notes: 'Subject area, grade or skill level, specific academic challenges, or goals for the session',
    smsContent: 'Hi {{customer_name}}, your {{service_type}} session at {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Please have your materials ready. Reply STOP to opt out.',
  },
  'home-service': {
    serviceType: 'Type of home service (e.g., plumbing repair, electrical inspection, HVAC maintenance, appliance repair, general cleaning, pest control)',
    notes: 'Service address, detailed description of the issue, any home access instructions, or specific areas of concern',
    smsContent: 'Hi {{customer_name}}, your {{service_type}} appointment with {{business_name}} is scheduled for {{appointment_date}} at {{appointment_time}}. A technician will arrive at your location. Reply STOP to opt out.',
  },
  hotel: {
    serviceType: 'Type of booking or request (e.g., room reservation, suite upgrade, event space booking, spa appointment, concierge request)',
    notes: 'Number of guests, special occasions or celebrations, accessibility needs, bed type or room preferences',
    smsContent: 'Hello {{customer_name}}, your booking at {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. We look forward to welcoming you! Reply STOP to opt out.',
  },
  restaurant: {
    serviceType: 'Type of dining experience (e.g., standard dinner reservation, private dining room, birthday celebration, business lunch, outdoor terrace)',
    notes: 'Dietary restrictions or allergies, seating preferences, special occasion details, or any room-related requests',
    smsContent: 'Hi {{customer_name}}, your reservation at {{business_name}} for {{party_size}} guests is confirmed for {{appointment_date}} at {{appointment_time}}. See you soon! Reply STOP to cancel.',
  },
};

// Per-industry extra parameters added to book_appointment
const APT_EXTRA_PARAMS: Record<string, IndustryActionOverride['extraParameters']> = {
  restaurant: [
    { name: 'party_size', description: 'Number of guests in the dining party', type: 'number', required: true, displayType: 'number' },
    { name: 'seating_preference', description: 'Seating preference (e.g., indoor, outdoor, bar seating, booth, private room)', type: 'string', required: false, displayType: 'text' },
  ],
  hotel: [
    { name: 'number_of_guests', description: 'Number of guests for the stay or event', type: 'number', required: false, displayType: 'number' },
    { name: 'room_type', description: 'Preferred room type (e.g., standard king, queen, deluxe suite, accessible room)', type: 'string', required: false, displayType: 'text' },
  ],
  veterinary: [
    { name: 'pet_name', description: "Name of the patient's pet", type: 'string', required: true, displayType: 'text' },
    { name: 'pet_species_breed', description: "Pet's species and breed (e.g., dog - golden retriever, cat - domestic shorthair)", type: 'string', required: true, displayType: 'text' },
  ],
  'pet-daycare': [
    { name: 'pet_name', description: "Name of the pet being booked", type: 'string', required: true, displayType: 'text' },
    { name: 'pet_breed_age', description: "Pet's breed and age (e.g., Labrador, 3 years old)", type: 'string', required: false, displayType: 'text' },
  ],
  auto: [
    { name: 'vehicle_info', description: "Customer's vehicle year, make, and model (e.g., 2020 Toyota Camry)", type: 'string', required: true, displayType: 'text' },
  ],
  'home-service': [
    { name: 'service_address', description: 'Full address where the service will be performed', type: 'string', required: true, displayType: 'text' },
  ],
};

// Per-industry SMS alert content
const ALERT_SMS_BY_INDUSTRY: Record<string, string> = {
  salon:          '{{business_name}} ALERT: {{alert_message}} {{action_required}}',
  'nail-bar':     '{{business_name}} ALERT: {{alert_message}} {{action_required}}',
  barbershop:     '{{business_name}} ALERT: {{alert_message}} {{action_required}}',
  'medical-spa':  'Important notice from {{business_name}}: {{alert_message}} {{action_required}}',
  healthcare:     'Important notice from {{business_name}}: {{alert_message}} For urgent medical concerns please call our office directly.',
  dental:         'Notice from {{business_name}}: {{alert_message}} {{action_required}}',
  auto:           '{{business_name}} Service Update: {{alert_message}} {{action_required}}',
  veterinary:     '{{business_name}} Pet Care Alert: {{alert_message}} {{action_required}}',
  'pet-daycare':  '{{business_name}} Alert: {{alert_message}} {{action_required}}',
  fitness:        '{{business_name}}: {{alert_message}} {{action_required}}',
  gym:            '{{business_name}}: {{alert_message}} {{action_required}}',
  'real-estate':  '{{business_name}} Update: {{alert_message}} {{action_required}}',
  education:      '{{business_name}} Notice: {{alert_message}} {{action_required}}',
  'home-service': '{{business_name}} Service Alert: {{alert_message}} {{action_required}} A team member will follow up.',
  hotel:          'Message from {{business_name}}: {{alert_message}} {{action_required}}',
  restaurant:     '{{business_name}}: {{alert_message}} {{action_required}}',
};

/**
 * Returns industry-specific overrides for a given native action template.
 * When businessLocations has more than one entry, transfer/SMS actions get a
 * location_name parameter so the AI can route to the correct location.
 */
export function getIndustryActionOverride(
  actionKey: string,
  industry: string | undefined | null,
  businessLocations?: BusinessLocation[]
): IndustryActionOverride | null {
  const key = (industry || '').toLowerCase();
  const isMultiLocation = (businessLocations || []).length > 1;
  const override: IndustryActionOverride = {};

  // ── Appointment actions ──────────────────────────────────────────────────
  const isAptAction = ['book_appointment', 'cancel_appointment', 'reschedule_appointment',
                       'modify_appointment', 'check_availability'].includes(actionKey);
  if (isAptAction) {
    const aptData = APT_BY_INDUSTRY[key];
    if (aptData) {
      override.parameterOverrides = {
        service_type: { description: aptData.serviceType },
        notes:        { description: aptData.notes },
      };
    }
    // Extra params only for book_appointment
    if (actionKey === 'book_appointment') {
      const extras = APT_EXTRA_PARAMS[key];
      if (extras) override.extraParameters = extras;
      if (aptData) override.smsContent = aptData.smsContent;
    }
  }

  // ── Messaging: sms_confirmation ─────────────────────────────────────────
  if (actionKey === 'sms_confirmation') {
    const aptData = APT_BY_INDUSTRY[key];
    if (aptData) override.smsContent = aptData.smsContent;
  }

  // ── Messaging: sms_alert ────────────────────────────────────────────────
  if (actionKey === 'sms_alert') {
    const alertSms = ALERT_SMS_BY_INDUSTRY[key];
    if (alertSms) override.smsContent = alertSms;
  }

  // ── Multi-location: add location_name to transfer & messaging actions ───
  if (isMultiLocation) {
    const locationTargetActions = ['call_transfer', 'sms_confirmation', 'sms_alert', 'sms_link'];
    if (locationTargetActions.includes(actionKey)) {
      const locationNames = businessLocations!.map(l => l.name).join(', ');
      const locationParam: IndustryActionOverride['extraParameters'] = [{
        name: 'location_name',
        description: `Which business location is this for? Options: ${locationNames}`,
        type: 'string',
        required: true,
        displayType: 'text',
      }];
      override.extraParameters = [...(override.extraParameters || []), ...locationParam];
    }
  }

  return Object.keys(override).length > 0 ? override : null;
}
