/**
 * Member Audit Service
 *
 * Provides helper functions for creating and querying member audit logs.
 * Tracks all member-related actions for accountability and transparency.
 */

import { db } from '../db';
import { memberAuditLog, users } from '@shared/schema';
import { eq, and, desc, or } from 'drizzle-orm';

export type AuditAction =
  | 'invited'
  | 'role_changed'
  | 'suspended'
  | 'reactivated'
  | 'removed'
  | 'agents_updated'
  | 'invitation_resent'
  | 'invitation_revoked';

interface CreateAuditLogParams {
  ownerId: string;
  performedById: string;
  action: AuditAction;
  targetMemberId?: string;
  targetEmail?: string;
  previousValue?: any;
  newValue?: any;
}

interface AuditLogEntry {
  id: string;
  action: AuditAction;
  performedBy: {
    id: string;
    name: string;
    email: string;
  };
  targetMemberId?: string;
  targetEmail?: string;
  previousValue: any;
  newValue: any;
  createdAt: Date;
}

/**
 * Create an audit log entry for a member-related action
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await db.insert(memberAuditLog).values({
      ownerId: params.ownerId,
      performedById: params.performedById,
      action: params.action,
      targetMemberId: params.targetMemberId || null,
      targetEmail: params.targetEmail || null,
      previousValue: params.previousValue || null,
      newValue: params.newValue || null,
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw new Error('Failed to create audit log entry');
  }
}

/**
 * Get audit logs for a specific member (by member ID or email)
 */
export async function getAuditLogsForMember(
  ownerId: string,
  memberIdOrEmail: string
): Promise<AuditLogEntry[]> {
  try {
    const logs = await db
      .select({
        id: memberAuditLog.id,
        action: memberAuditLog.action,
        targetMemberId: memberAuditLog.targetMemberId,
        targetEmail: memberAuditLog.targetEmail,
        previousValue: memberAuditLog.previousValue,
        newValue: memberAuditLog.newValue,
        createdAt: memberAuditLog.createdAt,
        performedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(memberAuditLog)
      .innerJoin(users, eq(memberAuditLog.performedById, users.id))
      .where(
        and(
          eq(memberAuditLog.ownerId, ownerId),
          or(
            eq(memberAuditLog.targetMemberId, memberIdOrEmail),
            eq(memberAuditLog.targetEmail, memberIdOrEmail)
          )
        )
      )
      .orderBy(desc(memberAuditLog.createdAt));

    return logs.map((log) => ({
      id: log.id,
      action: log.action as AuditAction,
      performedBy: log.performedBy,
      targetMemberId: log.targetMemberId || undefined,
      targetEmail: log.targetEmail || undefined,
      previousValue: log.previousValue,
      newValue: log.newValue,
      createdAt: log.createdAt!,
    }));
  } catch (error) {
    console.error('Error fetching audit logs for member:', error);
    throw new Error('Failed to fetch audit logs');
  }
}

/**
 * Get all audit logs for an owner (for admin dashboard)
 */
export async function getAllAuditLogs(
  ownerId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const logs = await db
      .select({
        id: memberAuditLog.id,
        action: memberAuditLog.action,
        targetMemberId: memberAuditLog.targetMemberId,
        targetEmail: memberAuditLog.targetEmail,
        previousValue: memberAuditLog.previousValue,
        newValue: memberAuditLog.newValue,
        createdAt: memberAuditLog.createdAt,
        performedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(memberAuditLog)
      .innerJoin(users, eq(memberAuditLog.performedById, users.id))
      .where(eq(memberAuditLog.ownerId, ownerId))
      .orderBy(desc(memberAuditLog.createdAt))
      .limit(limit);

    return logs.map((log) => ({
      id: log.id,
      action: log.action as AuditAction,
      performedBy: log.performedBy,
      targetMemberId: log.targetMemberId || undefined,
      targetEmail: log.targetEmail || undefined,
      previousValue: log.previousValue,
      newValue: log.newValue,
      createdAt: log.createdAt!,
    }));
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }
}

/**
 * Get audit logs filtered by action type
 */
export async function getAuditLogsByAction(
  ownerId: string,
  action: AuditAction
): Promise<AuditLogEntry[]> {
  try {
    const logs = await db
      .select({
        id: memberAuditLog.id,
        action: memberAuditLog.action,
        targetMemberId: memberAuditLog.targetMemberId,
        targetEmail: memberAuditLog.targetEmail,
        previousValue: memberAuditLog.previousValue,
        newValue: memberAuditLog.newValue,
        createdAt: memberAuditLog.createdAt,
        performedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(memberAuditLog)
      .innerJoin(users, eq(memberAuditLog.performedById, users.id))
      .where(
        and(
          eq(memberAuditLog.ownerId, ownerId),
          eq(memberAuditLog.action, action)
        )
      )
      .orderBy(desc(memberAuditLog.createdAt));

    return logs.map((log) => ({
      id: log.id,
      action: log.action as AuditAction,
      performedBy: log.performedBy,
      targetMemberId: log.targetMemberId || undefined,
      targetEmail: log.targetEmail || undefined,
      previousValue: log.previousValue,
      newValue: log.newValue,
      createdAt: log.createdAt!,
    }));
  } catch (error) {
    console.error('Error fetching audit logs by action:', error);
    throw new Error('Failed to fetch audit logs');
  }
}

/**
 * Helper function to log role changes
 */
export async function logRoleChange(
  ownerId: string,
  performedById: string,
  targetMemberId: string,
  previousRole: string,
  newRole: string,
  previousPermissions?: any,
  newPermissions?: any
): Promise<void> {
  await createAuditLog({
    ownerId,
    performedById,
    action: 'role_changed',
    targetMemberId,
    previousValue: {
      role: previousRole,
      permissions: previousPermissions,
    },
    newValue: {
      role: newRole,
      permissions: newPermissions,
    },
  });
}

/**
 * Helper function to log member invitation
 */
export async function logMemberInvited(
  ownerId: string,
  performedById: string,
  targetEmail: string,
  role: string,
  permissions?: any,
  assignedAgentIds?: string[]
): Promise<void> {
  await createAuditLog({
    ownerId,
    performedById,
    action: 'invited',
    targetEmail,
    newValue: {
      email: targetEmail,
      role,
      permissions,
      assignedAgentIds,
    },
  });
}

/**
 * Helper function to log member suspension
 */
export async function logMemberSuspended(
  ownerId: string,
  performedById: string,
  targetMemberId: string,
  reason?: string
): Promise<void> {
  await createAuditLog({
    ownerId,
    performedById,
    action: 'suspended',
    targetMemberId,
    newValue: { reason },
  });
}

/**
 * Helper function to log member reactivation
 */
export async function logMemberReactivated(
  ownerId: string,
  performedById: string,
  targetMemberId: string
): Promise<void> {
  await createAuditLog({
    ownerId,
    performedById,
    action: 'reactivated',
    targetMemberId,
  });
}

/**
 * Helper function to log member removal
 */
export async function logMemberRemoved(
  ownerId: string,
  performedById: string,
  targetMemberId: string,
  targetEmail: string
): Promise<void> {
  await createAuditLog({
    ownerId,
    performedById,
    action: 'removed',
    targetMemberId,
    targetEmail,
  });
}

/**
 * Helper function to log agent assignment updates
 */
export async function logAgentsUpdated(
  ownerId: string,
  performedById: string,
  targetMemberId: string,
  previousAgentIds: string[],
  newAgentIds: string[]
): Promise<void> {
  await createAuditLog({
    ownerId,
    performedById,
    action: 'agents_updated',
    targetMemberId,
    previousValue: { assignedAgentIds: previousAgentIds },
    newValue: { assignedAgentIds: newAgentIds },
  });
}

/**
 * Helper function to log invitation resend
 */
export async function logInvitationResent(
  ownerId: string,
  performedById: string,
  targetEmail: string
): Promise<void> {
  await createAuditLog({
    ownerId,
    performedById,
    action: 'invitation_resent',
    targetEmail,
  });
}

/**
 * Helper function to log invitation revocation
 */
export async function logInvitationRevoked(
  ownerId: string,
  performedById: string,
  targetEmail: string
): Promise<void> {
  await createAuditLog({
    ownerId,
    performedById,
    action: 'invitation_revoked',
    targetEmail,
  });
}
