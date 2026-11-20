// Example mock data for CustomerContactsTable component
// This demonstrates contact aggregation and caller-centric view

// Enhanced call record interface for mock data
interface EnhancedCallRecord {
  id: string;
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
  normalizedPhone?: string;
  direction: 'inbound' | 'outbound';
  status: string;
  callStatus?: string;
  duration?: number;
  startTime: string;
  endTime?: string;
  recordingUrl?: string | null;
  recordingSid?: string | null;
  transcriptionText?: string | null;
  transcriptionSid?: string;
  aiResponse?: string | null;
  sentiment?: 'positive' | 'neutral' | 'negative' | null;
  sentimentScore?: number | null;
  actionTaken?: string;
  confidence?: number;
  conversationData?: Array<{ role: 'user' | 'assistant', content: string }>;
  price?: string;
  priceUnit?: string;
  customerName?: string;
  interactionType?: string;
  vip?: boolean;
  tags?: string[];
  notes?: string[];
  summary?: string;
  actions?: any[];
  flagged?: boolean;
  connectedRefs?: any;
  recordingProviderId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const mockContactCallsData: EnhancedCallRecord[] = [
  // John Smith - VIP Customer with multiple reservations
  {
    id: "call-001",
    twilioCallSid: "CA123456789abcdef",
    fromNumber: "+15551234567",
    toNumber: "+15559876543",
    normalizedPhone: "+15551234567",
    direction: "inbound",
    status: "completed",
    callStatus: "completed",
    duration: 180,
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 3420000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/123",
    recordingSid: "RE123456789",
    transcriptionText: "Hi, I'd like to make a reservation for 4 people this Friday at 7 PM please.",
    aiResponse: "I'd be happy to help you with a reservation for 4 people this Friday at 7 PM.",
    sentiment: "positive",
    sentimentScore: 0.85,
    actionTaken: "reservation",
    confidence: 0.92,
    customerName: "John Smith",
    interactionType: "reservation",
    vip: true,
    tags: ["dinner", "party-of-4", "weekend", "regular-customer"],
    notes: ["Requested window table", "Regular customer - prefers booth seating", "Allergic to shellfish"],
    summary: "Customer made dinner reservation for 4 people on Friday evening.",
    flagged: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "call-002",
    twilioCallSid: "CA123456789abcdeg",
    fromNumber: "+15551234567", // Same customer
    toNumber: "+15559876543",
    normalizedPhone: "+15551234567",
    direction: "inbound",
    status: "completed",
    callStatus: "completed",
    duration: 120,
    startTime: new Date(Date.now() - 86400000 * 7).toISOString(), // 1 week ago
    endTime: new Date(Date.now() - 86400000 * 7 + 120000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/124",
    recordingSid: "RE123456790",
    transcriptionText: "I need to modify my reservation for tonight to 6 people instead of 4.",
    sentiment: "neutral",
    sentimentScore: 0.6,
    actionTaken: "reservation",
    customerName: "John Smith",
    interactionType: "reservation",
    vip: true,
    tags: ["modification", "party-size-change"],
    notes: ["Changed party size from 4 to 6"],
    summary: "Customer modified existing reservation to accommodate more guests.",
    flagged: false,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },

  // Sarah Johnson - Regular order customer
  {
    id: "call-003",
    twilioCallSid: "CA987654321fedcba",
    fromNumber: "+15555678901",
    toNumber: "+15559876543",
    normalizedPhone: "+15555678901",
    direction: "inbound",
    status: "completed",
    callStatus: "completed",
    duration: 120,
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 7080000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/456",
    recordingSid: "RE987654321",
    transcriptionText: "I'd like to order the chicken alfredo and a Caesar salad for pickup please.",
    sentiment: "neutral",
    sentimentScore: 0.65,
    actionTaken: "order",
    customerName: "Sarah Johnson",
    interactionType: "order",
    vip: false,
    tags: ["takeout", "pickup", "lunch", "quick-order"],
    notes: ["Prefers pickup over delivery", "Regular lunch customer"],
    summary: "Customer placed takeout order for chicken alfredo and Caesar salad.",
    flagged: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: "call-004",
    twilioCallSid: "CA987654321fedcbb",
    fromNumber: "+15555678901", // Same customer
    toNumber: "+15559876543",
    normalizedPhone: "+15555678901",
    direction: "inbound",
    status: "completed",
    callStatus: "completed",
    duration: 90,
    startTime: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    endTime: new Date(Date.now() - 86400000 * 3 + 90000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/457",
    transcriptionText: "Can I get my usual order? Chicken alfredo and Caesar salad for pickup.",
    sentiment: "positive",
    sentimentScore: 0.8,
    actionTaken: "order",
    customerName: "Sarah Johnson",
    interactionType: "order",
    vip: false,
    tags: ["takeout", "pickup", "usual-order", "repeat-customer"],
    notes: ["Has usual order saved", "Very loyal customer"],
    summary: "Repeat customer ordered her usual meal for pickup.",
    flagged: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },

  // Mike Wilson - Catering inquiry
  {
    id: "call-005",
    twilioCallSid: "CA456789123456789",
    fromNumber: "+15552345678",
    toNumber: "+15559876543",
    normalizedPhone: "+15552345678",
    direction: "inbound",
    status: "completed",
    callStatus: "transferred",
    duration: 45,
    startTime: new Date(Date.now() - 10800000).toISOString(),
    endTime: new Date(Date.now() - 10755000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/789",
    transcriptionText: "Hi, I'm calling about catering options for a corporate event with about 50 people.",
    sentiment: "neutral",
    sentimentScore: 0.7,
    actionTaken: "transfer",
    customerName: "Mike Wilson",
    interactionType: "catering",
    vip: false,
    tags: ["catering", "large-order", "corporate", "transfer"],
    notes: ["Transferred to catering manager", "Corporate event inquiry", "50+ people"],
    summary: "Customer inquiry about catering for large corporate event.",
    flagged: true,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    updatedAt: new Date(Date.now() - 10800000).toISOString()
  },

  // Emily Davis - Multiple interaction types
  {
    id: "call-006",
    twilioCallSid: "CA999888777666555",
    fromNumber: "+15554567890",
    toNumber: "+15559876543",
    normalizedPhone: "+15554567890",
    direction: "outbound",
    status: "completed",
    callStatus: "completed",
    duration: 90,
    startTime: new Date(Date.now() - 18000000).toISOString(),
    endTime: new Date(Date.now() - 17910000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/101112",
    transcriptionText: "Thank you for calling back! I'm very interested in the catering proposal.",
    sentiment: "positive",
    sentimentScore: 0.9,
    actionTaken: "follow_up",
    customerName: "Emily Davis",
    interactionType: "catering",
    vip: true,
    tags: ["follow-up", "outbound", "catering-quote", "hot-lead"],
    notes: ["Successful follow-up call", "Customer very interested", "Quote to be sent via email"],
    summary: "Successful outbound follow-up call for catering inquiry.",
    flagged: false,
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    updatedAt: new Date(Date.now() - 18000000).toISOString()
  },
  {
    id: "call-007",
    twilioCallSid: "CA999888777666556",
    fromNumber: "+15554567890", // Same customer
    toNumber: "+15559876543",
    normalizedPhone: "+15554567890",
    direction: "inbound",
    status: "completed",
    callStatus: "completed",
    duration: 240,
    startTime: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
    endTime: new Date(Date.now() - 86400000 * 10 + 240000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/101113",
    transcriptionText: "I need to make a reservation for my anniversary dinner next week.",
    sentiment: "positive",
    sentimentScore: 0.85,
    actionTaken: "reservation",
    customerName: "Emily Davis",
    interactionType: "reservation",
    vip: true,
    tags: ["anniversary", "special-occasion", "romantic-dinner"],
    notes: ["Anniversary dinner", "Requested quiet table", "VIP treatment needed"],
    summary: "Customer made reservation for special anniversary dinner.",
    flagged: false,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },

  // Unknown caller - missed call
  {
    id: "call-008",
    twilioCallSid: "CA111222333444555",
    fromNumber: "+15557890123",
    toNumber: "+15559876543",
    normalizedPhone: "+15557890123",
    direction: "inbound",
    status: "completed",
    callStatus: "missed",
    duration: 0,
    startTime: new Date(Date.now() - 14400000).toISOString(),
    endTime: new Date(Date.now() - 14400000).toISOString(),
    recordingUrl: null,
    transcriptionText: null,
    sentiment: null,
    sentimentScore: null,
    actionTaken: "missed",
    customerName: "Unknown Caller",
    interactionType: "faq",
    vip: false,
    tags: ["missed-call", "no-voicemail"],
    notes: ["Call missed during busy period", "No voicemail left"],
    summary: "Missed call with no voicemail message left.",
    flagged: true,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString()
  },

  // Lisa Chen - FAQ and order customer
  {
    id: "call-009",
    twilioCallSid: "CA777888999111222",
    fromNumber: "+15556789012",
    toNumber: "+15559876543",
    normalizedPhone: "+15556789012",
    direction: "inbound",
    status: "completed",
    callStatus: "completed",
    duration: 150,
    startTime: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
    endTime: new Date(Date.now() - 21450000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/777888",
    transcriptionText: "What are your hours today? And do you have any vegetarian options?",
    sentiment: "neutral",
    sentimentScore: 0.65,
    actionTaken: "info",
    customerName: "Lisa Chen",
    interactionType: "faq",
    vip: false,
    tags: ["hours-inquiry", "vegetarian", "menu-question"],
    notes: ["Asked about vegetarian options", "Interested in dietary accommodations"],
    summary: "Customer inquired about hours and vegetarian menu options.",
    flagged: false,
    createdAt: new Date(Date.now() - 21600000).toISOString(),
    updatedAt: new Date(Date.now() - 21600000).toISOString()
  },
  {
    id: "call-010",
    twilioCallSid: "CA777888999111223",
    fromNumber: "+15556789012", // Same customer
    toNumber: "+15559876543",
    normalizedPhone: "+15556789012",
    direction: "inbound",
    status: "completed",
    callStatus: "completed",
    duration: 180,
    startTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    endTime: new Date(Date.now() - 7020000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/777889",
    transcriptionText: "I'd like to order the vegetarian pasta and a side salad for delivery.",
    sentiment: "positive",
    sentimentScore: 0.8,
    actionTaken: "order",
    customerName: "Lisa Chen",
    interactionType: "order",
    vip: false,
    tags: ["vegetarian", "delivery", "repeat-customer"],
    notes: ["Chose vegetarian option after earlier inquiry", "First delivery order"],
    summary: "Customer placed vegetarian order for delivery after earlier inquiry.",
    flagged: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  },

  // David Brown - Single order
  {
    id: "call-011",
    twilioCallSid: "CA333444555666777",
    fromNumber: "+15558901234",
    toNumber: "+15559876543",
    normalizedPhone: "+15558901234",
    direction: "inbound",
    status: "completed",
    callStatus: "completed",
    duration: 200,
    startTime: new Date(Date.now() - 25200000).toISOString(), // 7 hours ago
    endTime: new Date(Date.now() - 25000000).toISOString(),
    recordingUrl: "https://api.twilio.com/recording/333444",
    transcriptionText: "I'd like to place a large order for pickup. Can you handle an order for 12 people?",
    sentiment: "neutral",
    sentimentScore: 0.7,
    actionTaken: "order",
    customerName: "David Brown",
    interactionType: "order",
    vip: false,
    tags: ["large-order", "pickup", "group-order"],
    notes: ["Large order for 12 people", "Business lunch order"],
    summary: "Customer placed large pickup order for 12 people.",
    flagged: false,
    createdAt: new Date(Date.now() - 25200000).toISOString(),
    updatedAt: new Date(Date.now() - 25200000).toISOString()
  }
];

// Example of how the CustomerContactsTable will aggregate this data:
//
// Contacts Summary:
// - Total Callers: 8 (John Smith, Sarah Johnson, Mike Wilson, Emily Davis, Unknown Caller, Lisa Chen, David Brown)
// - Repeat Callers: 4 (John Smith: 2 calls, Sarah Johnson: 2 calls, Emily Davis: 2 calls, Lisa Chen: 2 calls)
// - VIP Callers: 2 (John Smith, Emily Davis)
// - Flagged Contacts: 2 (Mike Wilson - catering follow-up needed, Unknown Caller - missed call)
//
// Individual Contact Examples:
// - John Smith: 2 calls, both reservations, VIP, average sentiment: positive
// - Sarah Johnson: 2 calls, both orders, regular customer with usual order
// - Emily Davis: 2 calls, mixed types (reservation + catering), VIP, high sentiment
// - Lisa Chen: 2 calls, FAQ then order, shows customer journey from inquiry to purchase