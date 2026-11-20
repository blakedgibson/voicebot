/**
 * Extraction Gap Analyzer
 *
 * Compares a saved restaurantData record against the required fields for its industry.
 * Returns which required fields are missing, what was successfully extracted (for pre-fill),
 * and a confidence score that drives onboarding status.
 *
 * A "missing" field means the AI agent will either:
 *   (a) make up an answer (hallucination), or
 *   (b) say "I don't have that information" (broken UX)
 */

import { getRequiredFieldsForIndustry, type RequiredField } from '@shared/requiredFieldsByIndustry';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GapAnalysisResult {
  /** Keys of required fields that are absent from the extracted data */
  missingFields: string[];
  /** Keys of required fields that were found — for summary display */
  foundFields: string[];
  /**
   * Pre-fill values indexed by field key.
   * Value is the extracted string, or a short description like "From your website".
   * Client uses this to pre-populate the form and show "✓ Found" badges.
   */
  prefillData: Record<string, string>;
  /** 0–100. Percentage of required fields that have real data. */
  confidenceScore: number;
  /** Derived from confidenceScore */
  onboardingStatus: 'complete' | 'incomplete' | 'draft';
  /** Total required fields for this industry */
  totalRequired: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default hours sentinel — SubscriptionProvisioningService uses these as placeholders
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_HOURS_OPEN = '09:00';
const DEFAULT_HOURS_CLOSE_WEEKDAY = '21:00';
const DEFAULT_HOURS_CLOSE_WEEKEND = '22:00';
const DEFAULT_HOURS_SUNDAY_CLOSE = '20:00';

function isDefaultHoursPlaceholder(hours: any): boolean {
  if (!hours || typeof hours !== 'object') return true;
  const days = Object.keys(hours);
  if (days.length === 0) return true;

  // If every entry matches the SubscriptionProvisioningService default values, it's a placeholder
  const allDefault = days.every(day => {
    const h = hours[day];
    if (!h || h.closed) return false;
    return (
      h.open === DEFAULT_HOURS_OPEN &&
      (h.close === DEFAULT_HOURS_CLOSE_WEEKDAY ||
        h.close === DEFAULT_HOURS_CLOSE_WEEKEND ||
        h.close === DEFAULT_HOURS_SUNDAY_CLOSE)
    );
  });

  return allDefault;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field value extractor — maps RequiredField.key → value from restaurantData
// ─────────────────────────────────────────────────────────────────────────────

function extractFieldValue(key: string, data: any): string | undefined {
  const raw = data.rawBusinessInfo as string | null | undefined;
  const rawLower = raw?.toLowerCase() ?? '';

  switch (key) {
    // ── Universal ──────────────────────────────────────────────────────────────
    case 'phone':
      return data.phone || undefined;

    case 'address':
      return data.address || undefined;

    case 'hours':
      if (isDefaultHoursPlaceholder(data.hours)) return undefined;
      // If hours were set from real data, format them for display
      if (data.hours && typeof data.hours === 'object') {
        const days = Object.keys(data.hours);
        if (days.length > 0) {
          const sample = data.hours[days[0]];
          return `${sample?.open ?? '?'} – ${sample?.close ?? '?'} (confirmed)`;
        }
      }
      if (rawLower.includes('hours') || rawLower.match(/\d{1,2}:\d{2}\s*[ap]m/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'services':
      if (data.services && Array.isArray(data.services) && data.services.length > 0) {
        return data.services.join(', ');
      }
      if (rawLower.length > 200) return 'Found on your website';
      return undefined;

    // ── Restaurant ────────────────────────────────────────────────────────────
    case 'menu_categories':
      if (data.menuItems && Array.isArray(data.menuItems) && data.menuItems.length > 0) {
        return `${data.menuItems.length} menu items found`;
      }
      if (rawLower.includes('menu') || rawLower.match(/appetizer|entrée|entree|dessert|starter/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'ordering_options':
      if (data.orderingPolicy) return data.orderingPolicy;
      if (rawLower.match(/takeout|take.?out|take-out|delivery|dine.?in|curbside/)) {
        return 'Found on your website';
      }
      return undefined;

    // ── Medical / Dental ──────────────────────────────────────────────────────
    case 'accepting_new_patients':
      if (rawLower.match(/new patient|accepting patient|not accepting|at capacity/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'insurance_accepted':
    case 'dental_insurance':
      if (rawLower.includes('insurance') || rawLower.match(/blue cross|aetna|united|medicare|medicaid|delta dental|cigna/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'emergency_protocol':
      if (rawLower.match(/emergency|urgent|same.?day|after.?hour|on.?call/)) {
        return 'Found on your website';
      }
      return undefined;

    // ── Booking / Walk-in policies ────────────────────────────────────────────
    case 'walk_in_policy':
    case 'appointment_policy':
      if (rawLower.match(/walk.?in|appointment|book|schedule|reservation/)) {
        return 'Found on your website';
      }
      return undefined;

    // ── Pricing ───────────────────────────────────────────────────────────────
    case 'service_pricing':
    case 'membership_pricing':
    case 'daycare_pricing':
    case 'consultation_policy':
    case 'consultation_structure':
      if (rawLower.match(/\$\d|\bpric|\brate|\bcost|\bfee|\bfree/)) {
        return 'Found on your website';
      }
      return undefined;

    // ── Service/treatment descriptions ────────────────────────────────────────
    case 'class_types':
    case 'treatment_menu':
    case 'practice_areas':
    case 'programs_offered':
    case 'specific_services':
    case 'product_categories':
    case 'amenities':
      if (rawLower.length > 300) return 'Found on your website';
      return undefined;

    case 'animal_types':
      if (rawLower.match(/dog|cat|rabbit|bird|reptile|exotic|small mammal/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'vaccination_requirements':
      if (rawLower.match(/vaccin|bordetella|rabies|dhpp|distemper/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'check_in_out_times':
      if (rawLower.match(/check.?in|check.?out|arrival|departure/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'makes_accepted':
      if (rawLower.match(/domestic|import|toyota|honda|ford|chevrolet|bmw|mercedes|all make/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'service_area':
      if (rawLower.match(/serving|service area|mile radius|zip code|metro|county/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'emergency_availability':
      if (rawLower.match(/24.?7|emergency|after.?hour|weekend|dispatch/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'service_type':
      if (rawLower.match(/buy|sell|rent|property management|lease/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'enrollment_process':
      if (rawLower.match(/enroll|register|sign up|get started|apply/)) {
        return 'Found on your website';
      }
      return undefined;

    case 'return_policy':
      if (rawLower.match(/return|exchange|refund|final sale/)) {
        return 'Found on your website';
      }
      return undefined;

    default:
      if (rawLower.length > 200) return 'Found on your website';
      return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze a restaurantData record against the required fields for its industry.
 * Returns the gap analysis used to drive the MVO Setup Completion Modal.
 */
export function analyzeExtractionGaps(
  restaurantData: any,
  industry: string
): GapAnalysisResult {
  const requiredFields: RequiredField[] = getRequiredFieldsForIndustry(industry);
  const missing: string[] = [];
  const found: string[] = [];
  const prefill: Record<string, string> = {};

  for (const field of requiredFields) {
    const value = extractFieldValue(field.key, restaurantData);
    if (value) {
      found.push(field.key);
      prefill[field.key] = value;
    } else {
      missing.push(field.key);
    }
  }

  const total = requiredFields.length;
  const filled = found.length;
  const score = total === 0 ? 100 : Math.round((filled / total) * 100);

  const status: GapAnalysisResult['onboardingStatus'] =
    score >= 75 ? 'complete' : score >= 45 ? 'incomplete' : 'draft';

  return {
    missingFields: missing,
    foundFields: found,
    prefillData: prefill,
    confidenceScore: score,
    onboardingStatus: status,
    totalRequired: total,
  };
}
