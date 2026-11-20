import { IStorage } from '../storage';
import type {
  InsertCallSession,
  InsertCallOutcome,
  InsertOrderCallLink,
  InsertReservationCallLink,
  InsertCustomerProfile,
  InsertCallMetricsDaily,
  CallSession,
  CallOutcome,
  CustomerProfile
} from '@shared/schema';

interface MetricsCache {
  summary: {
    data: any;
    timestamp: number;
    userId: string;
  } | null;
  trends: {
    data: any[];
    timestamp: number;
    userId: string;
  } | null;
  customers: {
    data: CustomerProfile[];
    timestamp: number;
    userId: string;
  } | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class MetricsAggregationService {
  private storage: IStorage;
  private cache: MetricsCache = {
    summary: null,
    trends: null,
    customers: null
  };

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async recordCallSession(data: {
    userId: string;
    phoneNumber: string;
    twilioCallSid?: string;
    retellCallId?: string;
    retellAgentId?: string;
    direction: 'inbound' | 'outbound';
    startedAt: Date;
    customerPhoneNumber?: string;
  }): Promise<CallSession> {
    const session: InsertCallSession = {
      userId: data.userId,
      phoneNumber: data.phoneNumber,
      twilioCallSid: data.twilioCallSid || null,
      retellCallId: data.retellCallId || null,
      retellAgentId: data.retellAgentId || null,
      direction: data.direction,
      callStatus: 'in-progress',
      startedAt: data.startedAt,
      endedAt: null,
      durationSeconds: null,
      recordingUrl: null,
      customerPhoneNumber: data.customerPhoneNumber || null
    };

    const callSession = await this.storage.createCallSession(session);
    
    if (data.customerPhoneNumber) {
      await this.updateCustomerProfileFromCall(data.userId, data.customerPhoneNumber, callSession.id);
    }

    this.invalidateCache(data.userId);
    return callSession;
  }

  async updateCallSession(
    callSessionId: string,
    updates: {
      callStatus?: 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy' | 'cancelled';
      endedAt?: Date;
      durationSeconds?: number;
      recordingUrl?: string;
    }
  ): Promise<CallSession> {
    const session = await this.storage.updateCallSession(callSessionId, updates);
    
    if (session) {
      this.invalidateCache(session.userId);
    }
    
    return session;
  }

  async recordCallOutcome(data: {
    callSessionId: string;
    userId: string;
    intentDetected?: string;
    orderCreated: boolean;
    reservationCreated: boolean;
    transferRequested: boolean;
    customerSatisfaction?: number;
    aiConfidence?: number;
    sentiment?: string;
    summaryText?: string;
  }): Promise<CallOutcome> {
    const outcome: InsertCallOutcome = {
      callSessionId: data.callSessionId,
      userId: data.userId,
      intentDetected: data.intentDetected || null,
      orderCreated: data.orderCreated,
      reservationCreated: data.reservationCreated,
      transferRequested: data.transferRequested,
      customerSatisfaction: data.customerSatisfaction || null,
      aiConfidence: data.aiConfidence || null,
      sentiment: data.sentiment || null,
      summaryText: data.summaryText || null
    };

    const callOutcome = await this.storage.createCallOutcome(outcome);
    this.invalidateCache(data.userId);
    return callOutcome;
  }

  async linkOrderToCall(data: {
    callSessionId: string;
    userId: string;
    orderId: string;
    orderAmount: number;
    orderType?: string;
    itemsOrdered?: string[];
  }): Promise<void> {
    const link: InsertOrderCallLink = {
      callSessionId: data.callSessionId,
      userId: data.userId,
      orderId: data.orderId,
      orderAmount: data.orderAmount.toString(),
      orderType: data.orderType || null,
      itemsOrdered: data.itemsOrdered || null
    };

    await this.storage.createOrderCallLink(link);

    const session = await this.storage.getCallSession(data.callSessionId);
    if (session?.customerPhoneNumber) {
      await this.updateCustomerRevenue(
        data.userId,
        session.customerPhoneNumber,
        data.orderAmount
      );
    }

    this.invalidateCache(data.userId);
  }

  async linkReservationToCall(data: {
    callSessionId: string;
    userId: string;
    reservationId: string;
    reservationDateTime: Date;
    partySize?: number;
    specialRequests?: string;
  }): Promise<void> {
    const link: InsertReservationCallLink = {
      callSessionId: data.callSessionId,
      userId: data.userId,
      reservationId: data.reservationId,
      reservationDateTime: data.reservationDateTime,
      partySize: data.partySize || null,
      specialRequests: data.specialRequests || null
    };

    await this.storage.createReservationCallLink(link);

    const session = await this.storage.getCallSession(data.callSessionId);
    if (session?.customerPhoneNumber) {
      await this.updateCustomerReservations(
        data.userId,
        session.customerPhoneNumber
      );
    }

    this.invalidateCache(data.userId);
  }

  private async updateCustomerProfileFromCall(
    userId: string,
    phoneNumber: string,
    callSessionId: string
  ): Promise<void> {
    const existingProfile = await this.storage.getCustomerProfileByPhone(phoneNumber, userId);

    if (existingProfile) {
      await this.storage.updateCustomerProfile(existingProfile.id, {
        totalCalls: existingProfile.totalCalls + 1,
        lastCallAt: new Date(),
        lastCallSessionId: callSessionId
      });
    } else {
      const newProfile: InsertCustomerProfile = {
        userId,
        phoneNumber,
        customerName: null,
        email: null,
        totalCalls: 1,
        totalOrders: 0,
        totalReservations: 0,
        totalRevenue: '0',
        averageOrderValue: '0',
        lastCallAt: new Date(),
        lastCallSessionId: callSessionId,
        firstCallAt: new Date(),
        segment: 'new',
        isVip: false,
        vipThreshold: null,
        tags: null,
        notes: null
      };

      await this.storage.createCustomerProfile(newProfile);
    }
  }

  private async updateCustomerRevenue(
    userId: string,
    phoneNumber: string,
    orderAmount: number
  ): Promise<void> {
    const profile = await this.storage.getCustomerProfileByPhone(phoneNumber, userId);
    
    if (profile) {
      const newTotalOrders = profile.totalOrders + 1;
      const newTotalRevenue = parseFloat(profile.totalRevenue) + orderAmount;
      const newAverageOrderValue = newTotalRevenue / newTotalOrders;

      let segment = 'new';
      if (newTotalOrders > 1) {
        segment = 'repeat';
      }

      const vipThreshold = parseFloat(profile.vipThreshold || '500');
      const isVip = newTotalRevenue >= vipThreshold;
      if (isVip) {
        segment = 'vip';
      }

      await this.storage.updateCustomerProfile(profile.id, {
        totalOrders: newTotalOrders,
        totalRevenue: newTotalRevenue.toString(),
        averageOrderValue: newAverageOrderValue.toString(),
        segment,
        isVip
      });
    }
  }

  private async updateCustomerReservations(
    userId: string,
    phoneNumber: string
  ): Promise<void> {
    const profile = await this.storage.getCustomerProfileByPhone(phoneNumber, userId);
    
    if (profile) {
      const newTotalReservations = profile.totalReservations + 1;
      const totalInteractions = profile.totalOrders + newTotalReservations;

      let segment = 'new';
      if (totalInteractions > 1) {
        segment = 'repeat';
      }

      const vipThreshold = parseFloat(profile.vipThreshold || '500');
      const currentRevenue = parseFloat(profile.totalRevenue);
      const isVip = currentRevenue >= vipThreshold || newTotalReservations >= 5;
      if (isVip) {
        segment = 'vip';
      }

      await this.storage.updateCustomerProfile(profile.id, {
        totalReservations: newTotalReservations,
        segment,
        isVip
      });
    }
  }

  async getSummaryMetrics(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      phoneNumber?: string;
      retellAgentId?: string;
      useCache?: boolean;
    }
  ): Promise<any> {
    const useCache = options?.useCache !== false;
    
    if (useCache && this.isCacheValid('summary', userId)) {
      return this.cache.summary!.data;
    }

    const summary = await this.storage.getCallMetricsSummary(userId, options);
    
    if (useCache) {
      this.cache.summary = {
        data: summary,
        timestamp: Date.now(),
        userId
      };
    }

    return summary;
  }

  async getTrendsData(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      granularity?: 'daily' | 'weekly' | 'monthly';
      useCache?: boolean;
    }
  ): Promise<any[]> {
    const useCache = options?.useCache !== false;
    
    if (useCache && this.isCacheValid('trends', userId)) {
      return this.cache.trends!.data;
    }

    const trends = await this.storage.getCallMetricsTrends(userId, options);
    
    if (useCache) {
      this.cache.trends = {
        data: trends,
        timestamp: Date.now(),
        userId
      };
    }

    return trends;
  }

  async getAIPerformanceMetrics(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any> {
    return await this.storage.getAIPerformanceMetrics(userId, options);
  }

  async getRevenueMetrics(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any> {
    return await this.storage.getRevenueMetrics(userId, options);
  }

  async getCustomerProfiles(
    userId: string,
    options?: {
      segment?: string;
      vipOnly?: boolean;
      limit?: number;
      offset?: number;
      useCache?: boolean;
    }
  ): Promise<CustomerProfile[]> {
    const useCache = options?.useCache !== false;
    
    if (useCache && this.isCacheValid('customers', userId)) {
      return this.cache.customers!.data;
    }

    const customers = await this.storage.getUserCustomerProfiles(userId, options);
    
    if (useCache) {
      this.cache.customers = {
        data: customers,
        timestamp: Date.now(),
        userId
      };
    }

    return customers;
  }

  async getCustomerSegmentCounts(userId: string): Promise<Record<string, number>> {
    return await this.storage.getCustomerSegmentCounts(userId);
  }

  async getPeakCallTimes(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    return await this.storage.getPeakCallTimes(userId, options);
  }

  async aggregateDailyMetrics(userId: string, date: Date): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const summary = await this.storage.getCallMetricsSummary(userId, {
      startDate: startOfDay,
      endDate: endOfDay
    });

    const aiMetrics = await this.storage.getAIPerformanceMetrics(userId, {
      startDate: startOfDay,
      endDate: endOfDay
    });

    const revenueMetrics = await this.storage.getRevenueMetrics(userId, {
      startDate: startOfDay,
      endDate: endOfDay
    });

    const dailyMetrics: InsertCallMetricsDaily = {
      userId,
      date: startOfDay,
      totalCalls: summary.totalCalls,
      completedCalls: summary.completedCalls,
      missedCalls: summary.missedCalls,
      averageDuration: summary.averageDuration,
      totalDuration: summary.totalDuration,
      aiHandledCalls: aiMetrics.aiHandledCalls,
      aiSuccessRate: aiMetrics.aiSuccessRate,
      transferredCalls: aiMetrics.transferredCalls,
      ordersCreated: revenueMetrics.ordersCreated,
      reservationsCreated: revenueMetrics.reservationsCreated,
      totalRevenue: revenueMetrics.totalRevenue.toString(),
      averageOrderValue: revenueMetrics.averageOrderValue.toString(),
      conversionRate: summary.conversionRate,
      newCustomers: summary.newCustomers,
      repeatCustomers: summary.repeatCustomers,
      vipCustomers: summary.vipCustomers,
      averageSatisfaction: summary.averageSatisfaction,
      averageSentiment: aiMetrics.averageSentiment
    };

    await this.storage.createOrUpdateDailyMetrics(dailyMetrics);
    this.invalidateCache(userId);
  }

  private isCacheValid(
    cacheKey: keyof MetricsCache,
    userId: string
  ): boolean {
    const cache = this.cache[cacheKey];
    if (!cache) return false;
    
    const isExpired = Date.now() - cache.timestamp > CACHE_TTL_MS;
    const isDifferentUser = cache.userId !== userId;
    
    return !isExpired && !isDifferentUser;
  }

  private invalidateCache(userId: string): void {
    if (this.cache.summary?.userId === userId) {
      this.cache.summary = null;
    }
    if (this.cache.trends?.userId === userId) {
      this.cache.trends = null;
    }
    if (this.cache.customers?.userId === userId) {
      this.cache.customers = null;
    }
  }

  clearAllCache(): void {
    this.cache = {
      summary: null,
      trends: null,
      customers: null
    };
  }
}
