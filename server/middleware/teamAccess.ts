import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { teamMembers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Helper function to get the effective user ID for data access.
 * Returns the owner's ID if team member is viewing as owner, otherwise returns the user's own ID.
 * This ensures team members can view owner data while maintaining their own identity.
 */
export function getEffectiveUserId(req: any): string {
  return req.viewingOwnerId || req.user?.claims?.sub;
}

/**
 * Middleware that allows team members to access their owner's data.
 * Checks for a 'viewAsUserId' query parameter or header.
 * If present and user is a valid team member, sets effectiveUserId to owner's ID.
 * IMPORTANT: This does NOT change who the user is logged in as!
 */
export async function handleTeamAccess(req: any, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next();
    }

    const currentUserId = req.user.claims.sub;
    const viewAsUserId = req.query.viewAsUserId || req.headers['x-view-as-user-id'];

    // If no viewAsUserId specified, continue with current user
    if (!viewAsUserId) {
      return next();
    }

    // If viewAsUserId is the same as current user, continue
    if (viewAsUserId === currentUserId) {
      return next();
    }

    // Check if current user is a team member of the specified owner
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.userId, currentUserId),
        eq(teamMembers.ownerId, viewAsUserId),
        eq(teamMembers.status, 'active')
      ))
      .limit(1);

    if (membership) {
      // User is authorized to view as this owner
      // Store which owner's data to display, but keep the user's identity unchanged
      req.viewingOwnerId = viewAsUserId;
      req.teamMemberRole = membership.role;
      req.isViewingAsTeamMember = true;
      
      console.log(`🔍 Team member ${currentUserId} viewing owner ${viewAsUserId}'s data`);
    }

    next();
  } catch (error) {
    console.error('Error in team access middleware:', error);
    next();
  }
}
