/**
 * HIPAA PHI Audit Service — § 164.312(b) Audit Controls
 *
 * Logs every access to Protected Health Information (PHI). All writes are
 * append-only. Records must never be deleted or modified after creation.
 *
 * Usage:
 *   await PhiAuditService.log(req, { action: 'phi_accessed', resourceType: 'call_log', resourceId: id, industry: 'healthcare' });
 */

import { db } from '../db';
import { phiAuditLog, voiceAgents } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import type { Request } from 'express';
import crypto from 'crypto';

// Industries that require HIPAA audit logging
const HIPAA_INDUSTRIES = new Set(['healthcare', 'dentist', 'medical-spa']);

export type PhiAction =
  | 'phi_accessed'           // Generic PHI read
  | 'call_log_viewed'        // Call transcript or recording accessed
  | 'patient_profile_viewed' // Customer/patient profile accessed
  | 'prescription_requested' // Prescription refill requested via AI
  | 'test_results_queried'   // Lab/imaging results discussed
  | 'patient_verified'       // Identity verification completed
  | 'patient_verify_failed'  // Identity verification failed
  | 'phi_exported'           // PHI exported (CSV, JSON)
  | 'phi_deleted';           // PHI deleted

export interface PhiAuditEntry {
  action: PhiAction;
  resourceType: string;
  resourceId?: string;
  patientIdentifier?: string; // Will be hashed before storage
  industry?: string;
  agentId?: string;
  outcome?: 'success' | 'denied' | 'error';
  metadata?: Record<string, unknown>;
}

export class PhiAuditService {
  /**
   * Hash a patient identifier (name, phone) so we can correlate records
   * without storing raw PHI in the audit log itself.
   */
  static hashIdentifier(value: string): string {
    return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex').slice(0, 16);
  }

  /**
   * Write a PHI audit log entry. Never throws — audit failures must not
   * interrupt the request that triggered them.
   */
  static async log(req: Request | null, entry: PhiAuditEntry & { userId: string }): Promise<void> {
    try {
      await db.insert(phiAuditLog).values({
        userId: entry.userId,
        agentId: entry.agentId ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        patientIdentifier: entry.patientIdentifier
          ? PhiAuditService.hashIdentifier(entry.patientIdentifier)
          : null,
        industry: entry.industry ?? null,
        ipAddress: req ? (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || null) : null,
        userAgent: req ? (req.headers['user-agent'] ?? null) : null,
        outcome: entry.outcome ?? 'success',
        metadata: entry.metadata ?? null,
      });
    } catch (err) {
      // Log to console but never fail the calling request
      console.error('[PHI Audit] Failed to write audit log entry:', err);
    }
  }

  /**
   * Look up the primary industry for a userId from their voice agents.
   * Returns null if not found or on error.
   */
  static async getUserIndustry(userId: string): Promise<string | null> {
    try {
      const agents = await db
        .select({ industry: voiceAgents.industry })
        .from(voiceAgents)
        .where(eq(voiceAgents.userId, userId))
        .orderBy(desc(voiceAgents.createdAt))
        .limit(1);
      return agents[0]?.industry ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Express middleware — logs PHI access only for HIPAA-regulated industries.
   * Looks up the requesting user's industry before deciding whether to audit.
   * Never blocks the request — runs fire-and-forget.
   *
   * Usage:
   *   router.get('/metrics/calls', isAuthenticated, PhiAuditService.hipaaMiddleware('call_log_viewed'), ...)
   */
  static hipaaMiddleware(action: PhiAction) {
    return (req: any, _res: any, next: () => void) => {
      const userId = req.viewingOwnerId || req.user?.claims?.sub || req.user?.id;
      if (userId) {
        // Fire-and-forget: check industry then conditionally audit
        PhiAuditService.getUserIndustry(userId).then(industry => {
          if (industry && HIPAA_INDUSTRIES.has(industry)) {
            return PhiAuditService.log(req, {
              userId,
              action,
              resourceType: req.path,
              resourceId: req.params?.id,
              industry,
              outcome: 'success',
              metadata: { method: req.method, query: req.query },
            });
          }
        }).catch(() => {});
      }
      next();
    };
  }

  /**
   * Express middleware — logs PHI access for any HIPAA-regulated route.
   * Attach to routes that return healthcare data.
   *
   * Usage in routes.ts:
   *   app.get('/api/metrics/calls', isAuthenticated, PhiAuditService.middleware('call_log_viewed', 'healthcare'), ...)
   */
  static middleware(action: PhiAction, industry: string) {
    return async (req: any, _res: any, next: () => void) => {
      const userId = req.viewingOwnerId || req.user?.claims?.sub || req.user?.id;
      if (userId) {
        // Fire-and-forget — don't await, don't block the request
        PhiAuditService.log(req, {
          userId,
          action,
          resourceType: req.path,
          resourceId: req.params?.id,
          industry,
          outcome: 'success',
          metadata: { method: req.method, query: req.query },
        }).catch(() => {});
      }
      next();
    };
  }
}
