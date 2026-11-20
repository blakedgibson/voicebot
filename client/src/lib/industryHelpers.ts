/**
 * Client-side helpers for working with industry-specific configurations
 */

import {
  Industry,
  getIndustryConfig,
  getCallTypesForIndustry,
  getMetricCardsForIndustry,
  type CallType,
  type MetricCard,
  type IndustryConfig
} from '@shared/industryConfig';

/**
 * Get industry configuration for UI display
 */
export function useIndustryConfig(industry: Industry): IndustryConfig {
  return getIndustryConfig(industry);
}

/**
 * Get call types for a specific industry
 */
export function getCallTypes(industry: Industry): CallType[] {
  return getCallTypesForIndustry(industry);
}

/**
 * Get metric cards for a specific industry
 */
export function getMetricCards(industry: Industry): MetricCard[] {
  return getMetricCardsForIndustry(industry);
}

/**
 * Get call type label by ID for a specific industry
 */
export function getCallTypeLabel(industry: Industry, callTypeId: string): string {
  const callTypes = getCallTypesForIndustry(industry);
  const callType = callTypes.find(ct => ct.id === callTypeId);
  return callType?.label || callTypeId;
}

/**
 * Get call type description by ID for a specific industry
 */
export function getCallTypeDescription(industry: Industry, callTypeId: string): string {
  const callTypes = getCallTypesForIndustry(industry);
  const callType = callTypes.find(ct => ct.id === callTypeId);
  return callType?.description || '';
}

/**
 * Format call type for display (with emoji if available)
 */
export function formatCallType(industry: Industry, callTypeId: string): string {
  const config = getIndustryConfig(industry);
  const label = getCallTypeLabel(industry, callTypeId);
  return `${config.emoji} ${label}`;
}
