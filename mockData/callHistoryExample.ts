// Example mock data for the CallHistoryTable component
// This demonstrates the full feature set and proper data structure

export const mockCallHistoryData = [
  {
    id: "call-001",
    twilioCallSid: "CA123456789abcdef",
    fromNumber: "+15551234567",
    toNumber: "+15559876543",
    normalizedPhone: "+15551234567",
    direction: "inbound" as const,
    status: "completed",
    callStatus: "completed",
    duration: 180,
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 3420000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/123",
    recordingSid: "RE123456789",
    transcriptionText: "Hi, I'd like to make a reservation for 4 people this Friday at 7 PM please. Do you have any tables available?",
    aiResponse: "I'd be happy to help you with a reservation for 4 people this Friday at 7 PM. Let me check our availability... Yes, we have tables available. Can I get your name and phone number?",
    sentiment: "positive" as const,
    sentimentScore: 0.85,
    actionTaken: "reservation",
    confidence: 0.92,
    conversationData: [
      { role: "user" as const, content: "Hi, I'd like to make a reservation for 4 people this Friday at 7 PM please." },
      { role: "assistant" as const, content: "I'd be happy to help you with a reservation for 4 people this Friday at 7 PM. Let me check our availability." },
      { role: "user" as const, content: "Great! The name is John Smith." },
      { role: "assistant" as const, content: "Perfect! I have you down for a table for 4 on Friday at 7 PM under John Smith. Can I get a phone number for the reservation?" }
    ],
    customerName: "John Smith",
    interactionType: "reservation",
    vip: true,
    tags: ["dinner", "party-of-4", "weekend", "regular-customer"],
    notes: ["Requested window table", "Regular customer - prefers booth seating", "Allergic to shellfish"],
    summary: "Customer made dinner reservation for 4 people on Friday evening. Regular VIP customer with dietary restrictions noted.",
    actions: [
      { type: "reservation_created", timestamp: new Date().toISOString(), details: { party_size: 4, date: "Friday 7PM" } },
      { type: "customer_notes_added", timestamp: new Date().toISOString(), details: { notes: ["shellfish allergy"] } }
    ],
    flagged: false,
    connectedRefs: {
      reservationId: "res_12345",
      calendarEventId: "cal_67890",
      posOrderId: null
    },
    recordingProviderId: "twilio_rec_123",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "call-002",
    twilioCallSid: "CA987654321fedcba",
    fromNumber: "+15555678901",
    toNumber: "+15559876543",
    normalizedPhone: "+15555678901",
    direction: "inbound" as const,
    status: "completed",
    callStatus: "completed",
    duration: 120,
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 7080000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/456",
    recordingSid: "RE987654321",
    transcriptionText: "I'd like to order the chicken alfredo and a Caesar salad for pickup please.",
    aiResponse: "I'll be happy to take your order. The chicken alfredo and Caesar salad will be ready in about 20 minutes. Can I get your name and phone number?",
    sentiment: "neutral" as const,
    sentimentScore: 0.65,
    actionTaken: "order",
    confidence: 0.88,
    conversationData: [
      { role: "user" as const, content: "I'd like to order the chicken alfredo and a Caesar salad for pickup." },
      { role: "assistant" as const, content: "I'll be happy to take your order. The chicken alfredo and Caesar salad will be ready in about 20 minutes." },
      { role: "user" as const, content: "Perfect, the name is Sarah Johnson." },
      { role: "assistant" as const, content: "Great! Your total is $24.50. Your order will be ready for pickup in 20 minutes under Sarah Johnson." }
    ],
    customerName: "Sarah Johnson",
    interactionType: "order",
    vip: false,
    tags: ["takeout", "pickup", "lunch", "quick-order"],
    notes: ["Prefers pickup over delivery", "Regular lunch customer"],
    summary: "Customer placed takeout order for chicken alfredo and Caesar salad for pickup.",
    actions: [
      { type: "order_created", timestamp: new Date().toISOString(), details: { items: ["chicken alfredo", "caesar salad"], total: 24.50 } },
      { type: "pickup_time_set", timestamp: new Date().toISOString(), details: { pickup_time: "20 minutes" } }
    ],
    flagged: false,
    connectedRefs: {
      posOrderId: "pos_order_789",
      reservationId: null,
      calendarEventId: null
    },
    recordingProviderId: "twilio_rec_456",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: "call-003",
    twilioCallSid: "CA456789123456789",
    fromNumber: "+15552345678",
    toNumber: "+15559876543",
    normalizedPhone: "+15552345678",
    direction: "inbound" as const,
    status: "completed",
    callStatus: "transferred",
    duration: 45,
    startTime: new Date(Date.now() - 10800000).toISOString(),
    endTime: new Date(Date.now() - 10755000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/789",
    recordingSid: "RE456789123",
    transcriptionText: "Hi, I'm calling about catering options for a corporate event with about 50 people. Do you handle large orders?",
    aiResponse: "For catering orders of that size, let me transfer you to our catering manager who can better assist you with pricing and menu options.",
    sentiment: "neutral" as const,
    sentimentScore: 0.7,
    actionTaken: "transfer",
    confidence: 0.75,
    conversationData: [
      { role: "user" as const, content: "Hi, I'm calling about catering options for a corporate event with about 50 people." },
      { role: "assistant" as const, content: "For catering orders of that size, let me transfer you to our catering manager who can better assist you." },
      { role: "user" as const, content: "That would be great, thank you." },
      { role: "assistant" as const, content: "Please hold while I transfer you. Have a great day!" }
    ],
    customerName: "Mike Wilson",
    interactionType: "catering",
    vip: false,
    tags: ["catering", "large-order", "corporate", "transfer"],
    notes: ["Transferred to catering manager", "Corporate event inquiry", "50+ people"],
    summary: "Customer inquiry about catering for large corporate event, successfully transferred to catering manager.",
    actions: [
      { type: "transfer_initiated", timestamp: new Date().toISOString(), details: { transfer_to: "catering_manager", reason: "large_catering_order" } },
      { type: "lead_captured", timestamp: new Date().toISOString(), details: { event_size: "50 people", event_type: "corporate" } }
    ],
    flagged: true, // Flagged for follow-up
    connectedRefs: {
      cateringRequestId: "catering_req_123",
      followUpTaskId: "task_456",
      posOrderId: null,
      reservationId: null
    },
    recordingProviderId: "twilio_rec_789",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    updatedAt: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: "call-004",
    twilioCallSid: "CA111222333444555",
    fromNumber: "+15557890123",
    toNumber: "+15559876543",
    normalizedPhone: "+15557890123",
    direction: "inbound" as const,
    status: "completed",
    callStatus: "missed",
    duration: 0,
    startTime: new Date(Date.now() - 14400000).toISOString(),
    endTime: new Date(Date.now() - 14400000).toISOString(),
    recordingUrl: null,
    recordingSid: null,
    transcriptionText: null,
    aiResponse: null,
    sentiment: null,
    sentimentScore: null,
    actionTaken: "missed",
    confidence: null,
    conversationData: [],
    customerName: "Unknown Caller",
    interactionType: "faq",
    vip: false,
    tags: ["missed-call", "no-voicemail"],
    notes: ["Call missed during busy period", "No voicemail left"],
    summary: "Missed call with no voicemail message left.",
    actions: [
      { type: "missed_call_logged", timestamp: new Date().toISOString(), details: { during: "busy_period" } }
    ],
    flagged: true, // Flagged for callback
    connectedRefs: {},
    recordingProviderId: null,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: "call-005",
    twilioCallSid: "CA999888777666555",
    fromNumber: "+15554567890",
    toNumber: "+15559876543",
    normalizedPhone: "+15554567890",
    direction: "outbound" as const,
    status: "completed",
    callStatus: "completed",
    duration: 90,
    startTime: new Date(Date.now() - 18000000).toISOString(),
    endTime: new Date(Date.now() - 17910000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/101112",
    recordingSid: "RE999888777",
    transcriptionText: "Hello, this is a follow-up call about your catering inquiry. We have prepared a custom quote for your event.",
    aiResponse: "Thank you for calling back! I'm very interested in the catering proposal. Can you email me the details?",
    sentiment: "positive" as const,
    sentimentScore: 0.9,
    actionTaken: "follow_up",
    confidence: 0.95,
    conversationData: [
      { role: "assistant" as const, content: "Hello, this is a follow-up call about your catering inquiry. We have prepared a custom quote for your event." },
      { role: "user" as const, content: "Thank you for calling back! I'm very interested in the catering proposal." },
      { role: "assistant" as const, content: "Excellent! I'll send you the detailed proposal via email within the hour." },
      { role: "user" as const, content: "Perfect, I look forward to reviewing it." }
    ],
    customerName: "Emily Davis",
    interactionType: "catering",
    vip: true,
    tags: ["follow-up", "outbound", "catering-quote", "hot-lead"],
    notes: ["Successful follow-up call", "Customer very interested", "Quote to be sent via email"],
    summary: "Successful outbound follow-up call for catering inquiry. Customer expressed strong interest in proposal.",
    actions: [
      { type: "follow_up_completed", timestamp: new Date().toISOString(), details: { outcome: "positive", next_step: "email_quote" } },
      { type: "quote_to_send", timestamp: new Date().toISOString(), details: { method: "email", urgency: "high" } }
    ],
    flagged: false,
    connectedRefs: {
      cateringRequestId: "catering_req_789",
      quoteId: "quote_101112",
      followUpTaskId: "task_789"
    },
    recordingProviderId: "twilio_rec_101112",
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    updatedAt: new Date(Date.now() - 18000000).toISOString()
  }
];

// Example of how to use the mock data with the CallHistoryTable component:
// <CallHistoryTable
//   calls={mockCallHistoryData}
//   isLoading={false}
//   onRefresh={() => console.log('Refreshing data...')}
// />