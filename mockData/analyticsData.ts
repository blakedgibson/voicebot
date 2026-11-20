// Comprehensive mock data for Analytics dashboard
// This demonstrates integration with multiple systems: Retell AI, POS, Reservations, Delivery

// Base interfaces for analytics data
export interface CallAnalytics {
  id: string;
  retellCallId: string;
  customerName?: string;
  phoneNumber: string;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'transferred' | 'failed';
  callType: 'order' | 'reservation' | 'catering' | 'faq' | 'complaint' | 'other';
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  transcript?: string;
  aiResponse?: string;
  transferredToHuman: boolean;
  linkedOrderId?: string;
  linkedReservationId?: string;
  linkedDeliveryId?: string;
  revenue?: number; // Revenue generated from this call
  conversionSuccessful: boolean;
  responseTimeMs: number; // AI response time
  tags: string[];
  notes: string[];
}

export interface RevenueData {
  id: string;
  source: 'pos' | 'online_ordering' | 'delivery' | 'catering';
  orderId: string;
  amount: number;
  currency: 'USD';
  date: string;
  linkedCallId?: string;
  customerName?: string;
  phoneNumber?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  paymentMethod: 'credit_card' | 'cash' | 'debit_card' | 'mobile_pay';
  platform?: 'square' | 'toast' | 'clover' | 'doordash' | 'ubereats' | 'grubhub';
}

export interface CustomerAnalytics {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  firstCallDate: string;
  lastCallDate: string;
  totalCalls: number;
  totalRevenue: number;
  avgOrderValue: number;
  preferredOrderType: 'dine_in' | 'takeout' | 'delivery';
  isVip: boolean;
  lifetimeValue: number;
  satisfactionScore: number; // 1-5
  callTypes: {
    orders: number;
    reservations: number;
    catering: number;
    faq: number;
    complaints: number;
  };
  lastOrderItems: string[];
  notes: string[];
  tags: string[];
}

export interface PerformanceMetrics {
  date: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  transferredCalls: number;
  avgCallDuration: number;
  avgResponseTime: number;
  conversionRate: number; // % of calls that result in orders/reservations
  revenuePerCall: number;
  customerSatisfaction: number;
  aiSuccessRate: number; // % handled without human transfer
  peakHours: Array<{
    hour: string;
    callCount: number;
  }>;
}

// Mock data generation
const generateCallAnalytics = (): CallAnalytics[] => {
  const calls: CallAnalytics[] = [];
  const customers = [
    'John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emily Davis', 'Lisa Chen',
    'David Brown', 'Anna Garcia', 'Chris Miller', 'Jessica Taylor', 'Ryan Anderson'
  ];
  const phoneNumbers = [
    '+15551234567', '+15555678901', '+15552345678', '+15554567890', '+15556789012',
    '+15558901234', '+15551111111', '+15552222222', '+15553333333', '+15554444444'
  ];

  for (let i = 0; i < 150; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
    date.setHours(9 + Math.floor(Math.random() * 13)); // Business hours 9am-10pm
    date.setMinutes(Math.floor(Math.random() * 60));

    const duration = 60 + Math.floor(Math.random() * 300); // 1-6 minutes
    const endTime = new Date(date.getTime() + duration * 1000);

    const callTypes: CallAnalytics['callType'][] = ['order', 'reservation', 'catering', 'faq', 'complaint', 'other'];
    const statuses: CallAnalytics['status'][] = ['completed', 'missed', 'transferred', 'failed'];
    const sentiments: CallAnalytics['sentiment'][] = ['positive', 'neutral', 'negative'];

    const callType = callTypes[Math.floor(Math.random() * callTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const transferredToHuman = Math.random() < 0.15; // 15% transferred
    const conversionSuccessful = status === 'completed' && !transferredToHuman && Math.random() < 0.8;

    let revenue = 0;
    if (conversionSuccessful && ['order', 'catering'].includes(callType)) {
      revenue = 15 + Math.floor(Math.random() * 200); // $15-$215
    }

    calls.push({
      id: `call-${i + 1}`,
      retellCallId: `retell-${Math.random().toString(36).substr(2, 9)}`,
      customerName: customers[Math.floor(Math.random() * customers.length)],
      phoneNumber: phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)],
      startTime: date.toISOString(),
      endTime: status !== 'missed' ? endTime.toISOString() : undefined,
      duration: status !== 'missed' ? duration : 0,
      direction: Math.random() < 0.9 ? 'inbound' : 'outbound',
      status,
      callType,
      sentiment: status === 'completed' ? sentiment : undefined,
      sentimentScore: status === 'completed' ? (sentiment === 'positive' ? 0.8 + Math.random() * 0.2 : sentiment === 'negative' ? Math.random() * 0.3 : 0.3 + Math.random() * 0.4) : undefined,
      transferredToHuman,
      linkedOrderId: conversionSuccessful && callType === 'order' ? `order-${Math.random().toString(36).substr(2, 6)}` : undefined,
      linkedReservationId: conversionSuccessful && callType === 'reservation' ? `res-${Math.random().toString(36).substr(2, 6)}` : undefined,
      revenue,
      conversionSuccessful,
      responseTimeMs: 500 + Math.floor(Math.random() * 2000), // 0.5-2.5 seconds
      tags: callType === 'order' ? ['takeout', 'dinner'] : callType === 'reservation' ? ['weekend', 'party-of-4'] : ['info'],
      notes: conversionSuccessful ? ['Customer satisfied', 'Order processed successfully'] : transferredToHuman ? ['Complex request', 'Transferred to manager'] : []
    });
  }

  return calls.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};

const generateRevenueData = (): RevenueData[] => {
  const revenue: RevenueData[] = [];
  const menuItems = [
    { name: 'Margherita Pizza', price: 18 },
    { name: 'Chicken Alfredo', price: 22 },
    { name: 'Caesar Salad', price: 14 },
    { name: 'Grilled Salmon', price: 28 },
    { name: 'Beef Burger', price: 16 },
    { name: 'Pasta Primavera', price: 20 },
    { name: 'Chocolate Cake', price: 8 },
    { name: 'Garlic Bread', price: 6 }
  ];

  const sources: RevenueData['source'][] = ['pos', 'online_ordering', 'delivery', 'catering'];
  const platforms = ['square', 'toast', 'doordash', 'ubereats', 'grubhub'];
  const paymentMethods: RevenueData['paymentMethod'][] = ['credit_card', 'cash', 'debit_card', 'mobile_pay'];

  for (let i = 0; i < 200; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    date.setHours(9 + Math.floor(Math.random() * 13));

    const source = sources[Math.floor(Math.random() * sources.length)];
    const itemCount = 1 + Math.floor(Math.random() * 5);
    const items = [];
    let total = 0;

    for (let j = 0; j < itemCount; j++) {
      const item = menuItems[Math.floor(Math.random() * menuItems.length)];
      const quantity = 1 + Math.floor(Math.random() * 3);
      items.push({
        name: item.name,
        quantity,
        price: item.price * quantity
      });
      total += item.price * quantity;
    }

    revenue.push({
      id: `rev-${i + 1}`,
      source,
      orderId: `order-${Math.random().toString(36).substr(2, 8)}`,
      amount: total,
      currency: 'USD',
      date: date.toISOString(),
      items,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      platform: platforms[Math.floor(Math.random() * platforms.length)] as any
    });
  }

  return revenue.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const generateCustomerAnalytics = (): CustomerAnalytics[] => {
  const customers: CustomerAnalytics[] = [];
  const names = [
    'John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emily Davis', 'Lisa Chen',
    'David Brown', 'Anna Garcia', 'Chris Miller', 'Jessica Taylor', 'Ryan Anderson',
    'Maria Rodriguez', 'James Williams', 'Jennifer Brown', 'Robert Jones', 'Linda Davis'
  ];

  const phoneNumbers = [
    '+15551234567', '+15555678901', '+15552345678', '+15554567890', '+15556789012',
    '+15558901234', '+15551111111', '+15552222222', '+15553333333', '+15554444444',
    '+15555555555', '+15556666666', '+15557777777', '+15558888888', '+15559999999'
  ];

  names.forEach((name, index) => {
    const firstCallDate = new Date();
    firstCallDate.setDate(firstCallDate.getDate() - Math.floor(Math.random() * 180)); // Last 6 months

    const lastCallDate = new Date();
    lastCallDate.setDate(lastCallDate.getDate() - Math.floor(Math.random() * 7)); // Last week

    const totalCalls = 1 + Math.floor(Math.random() * 20);
    const totalRevenue = totalCalls * (20 + Math.random() * 150); // $20-$170 per order avg
    const avgOrderValue = totalRevenue / Math.max(1, Math.floor(totalCalls * 0.7)); // 70% conversion rate

    const orderTypes = Math.floor(Math.random() * totalCalls);
    const reservationTypes = Math.floor(Math.random() * (totalCalls - orderTypes));
    const cateringTypes = Math.floor(Math.random() * 3);
    const faqTypes = Math.floor(Math.random() * 5);
    const complaintsTypes = Math.floor(Math.random() * 2);

    customers.push({
      id: `customer-${index + 1}`,
      name,
      phoneNumber: phoneNumbers[index],
      email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
      firstCallDate: firstCallDate.toISOString(),
      lastCallDate: lastCallDate.toISOString(),
      totalCalls,
      totalRevenue,
      avgOrderValue,
      preferredOrderType: Math.random() < 0.5 ? 'takeout' : Math.random() < 0.7 ? 'delivery' : 'dine_in',
      isVip: totalRevenue > 500 || totalCalls > 10,
      lifetimeValue: totalRevenue + (totalCalls * 5), // Revenue + estimated future value
      satisfactionScore: 3 + Math.random() * 2, // 3-5 scale
      callTypes: {
        orders: orderTypes,
        reservations: reservationTypes,
        catering: cateringTypes,
        faq: faqTypes,
        complaints: complaintsTypes
      },
      lastOrderItems: ['Margherita Pizza', 'Caesar Salad', 'Garlic Bread'],
      notes: totalRevenue > 500 ? ['VIP Customer', 'Prefers window seating'] : ['Regular customer'],
      tags: totalRevenue > 500 ? ['vip', 'regular'] : ['regular']
    });
  });

  return customers.sort((a, b) => new Date(b.lastCallDate).getTime() - new Date(a.lastCallDate).getTime());
};

const generatePerformanceMetrics = (): PerformanceMetrics[] => {
  const metrics: PerformanceMetrics[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const totalCalls = 20 + Math.floor(Math.random() * 80); // 20-100 calls per day
    const missedCalls = Math.floor(totalCalls * (0.05 + Math.random() * 0.1)); // 5-15% missed
    const transferredCalls = Math.floor(totalCalls * (0.1 + Math.random() * 0.1)); // 10-20% transferred
    const answeredCalls = totalCalls - missedCalls;

    const peakHours = [];
    for (let hour = 9; hour <= 21; hour++) {
      const callCount = Math.floor(Math.random() * 15);
      peakHours.push({
        hour: `${hour}:00`,
        callCount
      });
    }

    metrics.push({
      date: date.toISOString().split('T')[0],
      totalCalls,
      answeredCalls,
      missedCalls,
      transferredCalls,
      avgCallDuration: 120 + Math.floor(Math.random() * 180), // 2-5 minutes
      avgResponseTime: 800 + Math.floor(Math.random() * 1200), // 0.8-2.0 seconds
      conversionRate: 0.6 + Math.random() * 0.3, // 60-90%
      revenuePerCall: 25 + Math.random() * 50, // $25-75 per call
      customerSatisfaction: 4.0 + Math.random() * 1.0, // 4.0-5.0
      aiSuccessRate: 0.8 + Math.random() * 0.15, // 80-95%
      peakHours
    });
  }

  return metrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Export all mock data
export const mockAnalyticsData = {
  calls: generateCallAnalytics(),
  revenue: generateRevenueData(),
  customers: generateCustomerAnalytics(),
  performance: generatePerformanceMetrics()
};

// Summary statistics for overview
export const getOverviewStats = () => {
  const { calls, revenue, customers, performance } = mockAnalyticsData;

  const today = new Date().toISOString().split('T')[0];
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);

  // Calls
  const todayCalls = calls.filter(call => call.startTime.split('T')[0] === today);
  const weekCalls = calls.filter(call => new Date(call.startTime) >= thisWeekStart);
  const monthCalls = calls.filter(call => new Date(call.startTime) >= thisMonthStart);

  // Revenue
  const monthRevenue = revenue.filter(rev => new Date(rev.date) >= thisMonthStart)
    .reduce((sum, rev) => sum + rev.amount, 0);

  // Reservations and orders
  const monthReservations = calls.filter(call =>
    call.callType === 'reservation' &&
    call.conversionSuccessful &&
    new Date(call.startTime) >= thisMonthStart
  ).length;

  const monthOrders = calls.filter(call =>
    ['order', 'catering'].includes(call.callType) &&
    call.conversionSuccessful &&
    new Date(call.startTime) >= thisMonthStart
  ).length;

  // Customers
  const activeCustomers = customers.filter(customer =>
    new Date(customer.lastCallDate) >= thisWeekStart
  ).length;

  const totalCustomers = customers.length;

  return {
    totalCallsToday: todayCalls.length,
    totalCallsWeek: weekCalls.length,
    totalCallsMonth: monthCalls.length,
    totalRevenueMonth: monthRevenue,
    totalReservationsMonth: monthReservations,
    totalOrdersMonth: monthOrders,
    activeCustomers,
    totalCustomers,
    conversionRate: monthCalls.length > 0 ? (monthCalls.filter(c => c.conversionSuccessful).length / monthCalls.length) : 0,
    avgResponseTime: performance[0]?.avgResponseTime || 1200,
    customerSatisfaction: performance[0]?.customerSatisfaction || 4.5
  };
};