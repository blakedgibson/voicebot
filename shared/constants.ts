/**
 * Shared constants for pricing and billing
 */

// Plan details with minute limits and overage rates
export const PLAN_DETAILS = {
  'small': { minutes: 250, price: '$99', overageRate: 0.50 },
  'medium': { minutes: 800, price: '$299', overageRate: 0.45 },
  'large': { minutes: 1800, price: '$499', overageRate: 0.40 }
} as const;

// Overage pricing - charge per minute when exceeding monthly limit (deprecated - use plan-specific rates)
export const OVERAGE_RATE_PER_MINUTE = 0.5; // $0.50 per minute (fallback for Small plan)

// Usage warning thresholds
export const USAGE_WARNING_THRESHOLD = 0.9; // Show warning at 90% usage