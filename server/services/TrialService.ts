/**
 * Trial Service
 * Manages 14-day free trial with 100 phone minutes
 * Enforces trial limits and handles upgrades
 */

import { storage } from '../storage';
import type { UserTrial } from '@shared/schema';

export class TrialService {
  /**
   * Check if user has an active trial
   */
  async hasActiveTrial(userId: string): Promise<boolean> {
    const trial = await storage.getUserTrial(userId);
    return !!trial && trial.status === 'active' && trial.serviceStatus === 'active';
  }

  /**
   * Get trial status with limit checks
   */
  async getTrialStatus(userId: string): Promise<{
    hasTrial: boolean;
    trial?: UserTrial;
    isExpired: boolean;
    daysRemaining: number;
    minutesRemaining: number;
    canUseService: boolean;
    limitReached: 'none' | 'time' | 'minutes';
  }> {
    const trial = await storage.getUserTrial(userId);
    
    if (!trial) {
      return {
        hasTrial: false,
        isExpired: false,
        daysRemaining: 0,
        minutesRemaining: 0,
        canUseService: false,
        limitReached: 'none'
      };
    }

    const now = new Date();
    const expiresAt = new Date(trial.expiresAt);
    const isExpired = now > expiresAt;
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const minutesRemaining = Math.max(0, trial.minutesLimit - trial.minutesUsed);
    
    // Determine which limit was reached
    let limitReached: 'none' | 'time' | 'minutes' = 'none';
    if (isExpired) {
      limitReached = 'time';
    } else if (minutesRemaining <= 0) {
      limitReached = 'minutes';
    }

    const canUseService = trial.status === 'active' && 
                          trial.serviceStatus === 'active' && 
                          !isExpired && 
                          minutesRemaining > 0;

    return {
      hasTrial: true,
      trial,
      isExpired,
      daysRemaining,
      minutesRemaining,
      canUseService,
      limitReached
    };
  }

  /**
   * Validate if user can create additional AI agents (only 1 allowed during trial)
   */
  async canCreateAgent(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const trialStatus = await this.getTrialStatus(userId);
    
    if (!trialStatus.hasTrial) {
      // Not on trial, check subscription
      const subscription = await storage.getUserSubscription(userId);
      if (!subscription) {
        return { allowed: false, reason: 'No active subscription or trial' };
      }
      return { allowed: true };
    }

    // User is on trial - check agent count
    const agents = await storage.getUserVoiceAgents(userId);
    if (agents.length >= 1) {
      return {
        allowed: false,
        reason: 'Trial users can only create 1 AI agent. Please upgrade to create more agents.'
      };
    }

    return { allowed: true };
  }

  /**
   * Validate if call can proceed (check trial limits)
   */
  async canMakeCall(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const trialStatus = await this.getTrialStatus(userId);
    
    if (!trialStatus.hasTrial) {
      // Not on trial, check subscription
      const subscription = await storage.getUserSubscription(userId);
      if (!subscription || subscription.serviceStatus !== 'active') {
        return { allowed: false, reason: 'No active subscription' };
      }
      return { allowed: true };
    }

    // User is on trial - check limits
    if (!trialStatus.canUseService) {
      if (trialStatus.limitReached === 'time') {
        return {
          allowed: false,
          reason: 'Your 14-day trial has expired. Please upgrade to continue using the service.'
        };
      } else if (trialStatus.limitReached === 'minutes') {
        return {
          allowed: false,
          reason: 'You have used all 100 trial minutes. Please upgrade to continue making calls.'
        };
      }
      return {
        allowed: false,
        reason: 'Trial service is suspended. Please upgrade to continue.'
      };
    }

    return { allowed: true };
  }

  /**
   * Deduct minutes from trial after a call
   */
  async deductMinutes(userId: string, durationSeconds: number): Promise<void> {
    const minutes = Math.ceil(durationSeconds / 60); // Round up to nearest minute
    
    const trial = await storage.getUserTrial(userId);
    if (!trial || trial.status !== 'active') {
      return; // Not on trial or already converted
    }

    await storage.deductTrialMinutes(userId, minutes);

    // Check if limit reached after deduction
    const updatedStatus = await this.getTrialStatus(userId);
    if (!updatedStatus.canUseService) {
      // Suspend service if limits reached
      await storage.suspendTrialService(userId);
      console.log(`⏸️ Trial limit reached for user ${userId}. Service suspended.`);
    }
  }

  /**
   * Check and expire trials that have reached time limit
   */
  async expireTrialsIfNeeded(): Promise<void> {
    const activeTrials = await storage.getActiveTrials();
    const now = new Date();

    for (const trial of activeTrials) {
      const expiresAt = new Date(trial.expiresAt);
      if (now > expiresAt) {
        // Trial has expired
        await storage.updateUserTrial(trial.id, { status: 'expired' });
        await storage.suspendTrialService(trial.userId);
        console.log(`⏰ Trial expired for user ${trial.userId}`);
      }
    }
  }

  /**
   * Convert trial to paid subscription
   */
  async convertToSubscription(userId: string, subscriptionId: string): Promise<void> {
    await storage.convertTrialToSubscription(userId, subscriptionId);
    console.log(`✅ Converted trial to subscription for user ${userId}`);
  }

  /**
   * Get trial usage summary
   */
  async getUsageSummary(userId: string): Promise<{
    minutesUsed: number;
    minutesLimit: number;
    percentageUsed: number;
    daysRemaining: number;
    expiresAt: Date;
  } | null> {
    const trial = await storage.getUserTrial(userId);
    if (!trial) {
      return null;
    }

    const trialStatus = await this.getTrialStatus(userId);
    const percentageUsed = (trial.minutesUsed / trial.minutesLimit) * 100;

    return {
      minutesUsed: trial.minutesUsed,
      minutesLimit: trial.minutesLimit,
      percentageUsed: Math.min(100, Math.round(percentageUsed)),
      daysRemaining: trialStatus.daysRemaining,
      expiresAt: new Date(trial.expiresAt)
    };
  }
}

// Export singleton instance
export const trialService = new TrialService();
