import { Router, type Request, type Response } from 'express';
import { storage } from '../storage';
import { MetricsAggregationService } from '../services/metricsAggregationService';
import { isAuthenticated } from '../replitAuth';
import { PhiAuditService } from '../services/phiAuditService';
import { z } from 'zod';

const router = Router();
const metricsService = new MetricsAggregationService(storage);

const baseDateRangeSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined).refine(
    val => !val || !isNaN(val.getTime()),
    { message: 'Invalid startDate format. Use ISO 8601 date string.' }
  ),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined).refine(
    val => !val || !isNaN(val.getTime()),
    { message: 'Invalid endDate format. Use ISO 8601 date string.' }
  ),
  phoneNumber: z.string().optional(),
  retellAgentId: z.string().optional(),
});

const dateRangeSchema = baseDateRangeSchema.refine(
  data => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: 'startDate must be before or equal to endDate' }
);

const trendsQuerySchema = baseDateRangeSchema.extend({
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
}).refine(
  data => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: 'startDate must be before or equal to endDate' }
);

const customerQuerySchema = z.object({
  segment: z.string().optional(),
  vipOnly: z.string().optional().transform(val => val === 'true'),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const aggregateDailySchema = z.object({
  date: z.string().optional().default(() => new Date().toISOString()).transform(val => new Date(val)).refine(
    val => !isNaN(val.getTime()),
    { message: 'Invalid date format. Use ISO 8601 date string.' }
  )
});

router.get('/metrics/summary', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.viewingOwnerId || req.user.claims.sub;
    const query = dateRangeSchema.parse(req.query);

    const summary = await metricsService.getSummaryMetrics(userId, {
      startDate: query.startDate,
      endDate: query.endDate,
      phoneNumber: query.phoneNumber,
      retellAgentId: query.retellAgentId,
      useCache: true
    });

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    console.error('❌ Failed to fetch metrics summary:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch metrics summary'
    });
  }
});

router.get('/metrics/trends', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.viewingOwnerId || req.user.claims.sub;
    const query = trendsQuerySchema.parse(req.query);

    const trends = await metricsService.getTrendsData(userId, {
      startDate: query.startDate,
      endDate: query.endDate,
      granularity: query.granularity,
      useCache: true
    });

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    console.error('❌ Failed to fetch metrics trends:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch metrics trends'
    });
  }
});

router.get('/metrics/ai-performance', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.viewingOwnerId || req.user.claims.sub;
    const query = dateRangeSchema.parse(req.query);

    const aiMetrics = await metricsService.getAIPerformanceMetrics(userId, {
      startDate: query.startDate,
      endDate: query.endDate
    });

    res.json({
      success: true,
      data: aiMetrics
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    console.error('❌ Failed to fetch AI performance metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch AI performance metrics'
    });
  }
});

router.get('/metrics/revenue', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.viewingOwnerId || req.user.claims.sub;
    const query = dateRangeSchema.parse(req.query);

    const revenueMetrics = await metricsService.getRevenueMetrics(userId, {
      startDate: query.startDate,
      endDate: query.endDate
    });

    res.json({
      success: true,
      data: revenueMetrics
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    console.error('❌ Failed to fetch revenue metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch revenue metrics'
    });
  }
});

router.get('/metrics/customers', isAuthenticated, PhiAuditService.hipaaMiddleware('patient_profile_viewed'), async (req: any, res: Response) => {
  try {
    const userId = req.viewingOwnerId || req.user.claims.sub;
    const query = customerQuerySchema.parse(req.query);

    const [customers, segmentCounts] = await Promise.all([
      metricsService.getCustomerProfiles(userId, {
        segment: query.segment,
        vipOnly: query.vipOnly,
        limit: query.limit,
        offset: query.offset,
        useCache: true
      }),
      metricsService.getCustomerSegmentCounts(userId)
    ]);

    let total = Object.values(segmentCounts).reduce((sum, count) => sum + count, 0);
    
    if (query.segment) {
      total = segmentCounts[query.segment] || 0;
    }
    
    if (query.vipOnly) {
      const allVipCustomers = await metricsService.getCustomerProfiles(userId, {
        vipOnly: true,
        useCache: true
      });
      total = allVipCustomers.length;
    }

    res.json({
      success: true,
      data: customers,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total,
        hasMore: query.offset + query.limit < total
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    console.error('❌ Failed to fetch customer profiles:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer profiles'
    });
  }
});

router.get('/metrics/customers/segments', isAuthenticated, PhiAuditService.hipaaMiddleware('patient_profile_viewed'), async (req: any, res: Response) => {
  try {
    const userId = req.viewingOwnerId || req.user.claims.sub;

    const segments = await metricsService.getCustomerSegmentCounts(userId);

    res.json({
      success: true,
      data: segments
    });
  } catch (error) {
    console.error('❌ Failed to fetch customer segments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer segments'
    });
  }
});

router.get('/metrics/peak-times', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.viewingOwnerId || req.user.claims.sub;
    const query = dateRangeSchema.parse(req.query);

    const peakTimes = await metricsService.getPeakCallTimes(userId, {
      startDate: query.startDate,
      endDate: query.endDate
    });

    res.json({
      success: true,
      data: peakTimes
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    console.error('❌ Failed to fetch peak call times:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch peak call times'
    });
  }
});

router.post('/metrics/aggregate-daily', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.viewingOwnerId || req.user.claims.sub;
    const body = aggregateDailySchema.parse(req.body);
    
    await metricsService.aggregateDailyMetrics(userId, body.date);

    res.json({
      success: true,
      message: 'Daily metrics aggregated successfully',
      data: {
        date: body.date.toISOString()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    console.error('❌ Failed to aggregate daily metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to aggregate daily metrics'
    });
  }
});

export default router;
