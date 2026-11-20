/**
 * Multi-Source Business Data Extractor
 *
 * Implements a fallback chain so onboarding never silently fails:
 *   1. Primary scrape via enhancedBusinessExtractor (Google Maps + website)
 *   2. Yelp Fusion API (if YELP_API_KEY configured)
 *   3. Headless-mode HTTP retry with stealth headers (bypasses basic bot detection)
 *   4. Industry shadow data (synthetic FAQs) — always succeeds
 *
 * Returns a confidence score (0–100). Values < 40 trigger the MVO Guided Interview in the UI.
 */

import { enhancedBusinessExtractor, type EnhancedBusinessProfile } from './enhancedBusinessExtractor';
import { getShadowDataForIndustry, buildShadowBusinessInfo } from '@shared/industryShadowData';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export type OnboardingSource = 'auto' | 'gbp' | 'yelp' | 'headless' | 'manual' | 'shadow';

export interface MultiSourceResult {
  /** Partial or full EnhancedBusinessProfile — always present */
  profile: Partial<EnhancedBusinessProfile> & {
    name: string;
    address?: string;
    phone?: string;
    rawBusinessInfo?: string;
  };
  /** 0–100. <40 = trigger Guided Interview */
  confidenceScore: number;
  /** Which fetcher produced the data */
  source: OnboardingSource;
  /** Fields the system could not find — drives Knowledge Gap questions in MVO form */
  missingFields: string[];
  /** True if industry defaults were injected because real data was unavailable */
  shadowDataUsed: boolean;
}

// Confidence thresholds
export const CONFIDENCE_THRESHOLD_COMPLETE = 70;
export const CONFIDENCE_THRESHOLD_INCOMPLETE = 40;

/**
 * Rotate through desktop browser user-agents to bypass basic bot detection
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Compute a confidence score from a partial profile.
 */
function scoreProfile(profile: Partial<EnhancedBusinessProfile>): { score: number; missingFields: string[] } {
  let score = 0;
  const missing: string[] = [];

  // Vitals — 40 pts
  if (profile.name) score += 10; else missing.push('business_name');
  if (profile.phone) score += 10; else missing.push('phone_number');
  if (profile.address) score += 10; else missing.push('address');
  if (profile.hours && (profile.hours as any).weeklyHours?.length > 0) score += 10; else missing.push('business_hours');

  // Services / menu — 20 pts
  if ((profile.menu && profile.menu.length > 0) || (profile as any).serviceOfferings) score += 20;
  else missing.push('services_menu');

  // Trust signals — 20 pts
  if (profile.rating && profile.rating > 0) score += 10; else missing.push('reviews_rating');
  if (profile.reviews && profile.reviews.length > 0) score += 10; else missing.push('customer_reviews');

  // Policies & extras — 20 pts
  if (profile.aboutInfo?.story) score += 10; else missing.push('about_description');
  if (profile.website) score += 5; else missing.push('website_url');
  if (profile.email) score += 5; else missing.push('email_address');

  return { score: Math.min(score, 100), missingFields: missing };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetcher 1 (primary): Enhanced Business Extractor (Google Maps + website)
// ─────────────────────────────────────────────────────────────────────────────
async function tryPrimaryExtractor(searchQuery: string): Promise<MultiSourceResult | null> {
  try {
    const profile = await enhancedBusinessExtractor.extractComprehensiveBusinessProfile(searchQuery);
    const { score, missingFields } = scoreProfile(profile);

    return {
      profile,
      confidenceScore: score,
      source: 'auto',
      missingFields,
      shadowDataUsed: false,
    };
  } catch (err) {
    console.warn(`[MultiSource] Primary extractor failed: ${err}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetcher 2: Yelp Fusion API
// Returns business name, address, phone, rating, review count, categories
// ─────────────────────────────────────────────────────────────────────────────
async function tryYelpAPI(searchQuery: string, location?: string): Promise<MultiSourceResult | null> {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL('https://api.yelp.com/v3/businesses/search');
    url.searchParams.set('term', searchQuery);
    url.searchParams.set('location', location || searchQuery);
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) return null;

    const data = await response.json() as any;
    const biz = data.businesses?.[0];
    if (!biz) return null;

    const partial: Partial<EnhancedBusinessProfile> & { name: string } = {
      name: biz.name,
      phone: biz.phone,
      address: [biz.location?.address1, biz.location?.city, biz.location?.state, biz.location?.zip_code]
        .filter(Boolean).join(', '),
      website: biz.url,
      rating: biz.rating,
      totalReviews: biz.review_count,
      tags: biz.categories?.map((c: any) => c.title) ?? [],
      industry: biz.categories?.[0]?.alias ?? 'general',
      dataQuality: 0, // will be replaced by scoreProfile
      lastUpdated: new Date(),
    } as any;

    const { score, missingFields } = scoreProfile(partial);

    console.log(`[MultiSource] Yelp returned "${biz.name}" with score ${score}`);

    return {
      profile: partial,
      confidenceScore: score,
      source: 'yelp',
      missingFields,
      shadowDataUsed: false,
    };
  } catch (err) {
    console.warn(`[MultiSource] Yelp API failed: ${err}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetcher 3: Headless-mode HTTP fetch with stealth headers
// Bypasses basic bot-detection (Cloudflare JS challenges require real Playwright,
// but this handles most simple anti-scrape headers).
// To enable full headless browser support, install @playwright/test and replace
// the fetch call below with a Playwright page.goto() call.
// ─────────────────────────────────────────────────────────────────────────────
async function tryHeadlessRetry(url: string): Promise<{ text: string; wordCount: number } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': randomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    if (!response.ok || response.status === 403) {
      console.warn(`[MultiSource] Headless retry got ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const text = dom.window.document.body?.textContent ?? '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    if (wordCount < 50) {
      console.warn(`[MultiSource] Headless retry: thin content (${wordCount} words) for ${url}`);
      return null;
    }

    return { text, wordCount };
  } catch (err) {
    console.warn(`[MultiSource] Headless retry failed for ${url}: ${err}`);
    return null;
  }
}

/**
 * Extract structured fields from raw text using regex heuristics.
 * Lightweight alternative to full HTML parsing for headless fallback path.
 */
function parseRawText(text: string, businessName: string): Partial<EnhancedBusinessProfile> & { name: string } {
  const phoneMatch = text.match(/(?:\+1\s?)?[\(\[]?\d{3}[\)\]\s\-\.]{1,2}\d{3}[\s\-\.]\d{4}/);
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  const hoursMatch = text.match(/(?:mon|tue|wed|thu|fri|sat|sun)[a-z\-\s\d:apm–—,]+/gi);

  return {
    name: businessName,
    phone: phoneMatch?.[0],
    email: emailMatch?.[0],
    rawBusinessInfo: text.slice(0, 3000),
    hours: hoursMatch ? { weeklyHours: hoursMatch.slice(0, 7).map(h => ({ day: h, open: '', close: '', isClosed: false })), isOpen: true } : { weeklyHours: [], isOpen: false },
    lastUpdated: new Date(),
    dataQuality: 0,
  } as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractionRequest {
  businessName: string;
  websiteUrl?: string;
  location?: string;
  industry?: string;
}

/**
 * Run the full fallback chain and return the best available result.
 *
 * Chain order:
 *   1. enhancedBusinessExtractor (Google Places + website scrape)
 *   2. Yelp Fusion API
 *   3. Headless HTTP retry on the provided URL
 *   4. Industry shadow data (always succeeds)
 *
 * The first source that returns confidence >= CONFIDENCE_THRESHOLD_COMPLETE (70)
 * short-circuits the chain. Otherwise the chain completes and the highest-scoring
 * result is returned, merged with shadow data for missing fields.
 */
export async function extractWithFallback(req: ExtractionRequest): Promise<MultiSourceResult> {
  const { businessName, websiteUrl, location, industry = 'general_business' } = req;

  const searchQuery = location ? `${businessName} ${location}` : businessName;
  console.log(`[MultiSource] Starting extraction chain for: "${searchQuery}"`);

  let best: MultiSourceResult | null = null;

  // ── Step 1: Primary extractor ──────────────────────────────────────────────
  const primary = await tryPrimaryExtractor(searchQuery);
  if (primary) {
    console.log(`[MultiSource] Primary extractor score: ${primary.confidenceScore}`);
    best = primary;
    if (primary.confidenceScore >= CONFIDENCE_THRESHOLD_COMPLETE) {
      return applyOnboardingStatus(primary);
    }
  }

  // ── Step 2: Yelp API ───────────────────────────────────────────────────────
  const yelp = await tryYelpAPI(businessName, location);
  if (yelp && yelp.confidenceScore > (best?.confidenceScore ?? 0)) {
    console.log(`[MultiSource] Yelp score: ${yelp.confidenceScore} — promoting to best`);
    // Merge Yelp data into primary profile if both exist
    if (best) {
      best = mergeSources(best, yelp);
    } else {
      best = yelp;
    }
    if (best.confidenceScore >= CONFIDENCE_THRESHOLD_COMPLETE) {
      return applyOnboardingStatus(best);
    }
  }

  // ── Step 3: Headless retry on the provided URL ─────────────────────────────
  if (websiteUrl) {
    const headlessResult = await tryHeadlessRetry(websiteUrl);
    if (headlessResult) {
      console.log(`[MultiSource] Headless retry succeeded (${headlessResult.wordCount} words)`);
      const parsed = parseRawText(headlessResult.text, businessName);
      const { score, missingFields } = scoreProfile(parsed);

      const headlessMulti: MultiSourceResult = {
        profile: parsed,
        confidenceScore: score,
        source: 'headless',
        missingFields,
        shadowDataUsed: false,
      };

      if (!best || score > best.confidenceScore) {
        best = best ? mergeSources(best, headlessMulti) : headlessMulti;
      }
    }
  }

  // ── Step 4: Shadow data fallback ───────────────────────────────────────────
  const shadow = getShadowDataForIndustry(industry);
  const shadowInfo = buildShadowBusinessInfo(industry, businessName);

  if (!best) {
    // Complete failure — use pure shadow data
    const fallback: MultiSourceResult = {
      profile: {
        name: businessName,
        rawBusinessInfo: shadowInfo,
      },
      confidenceScore: 15, // Shadow data alone = low confidence
      source: 'shadow',
      missingFields: ['phone_number', 'address', 'business_hours', 'services_menu', 'reviews_rating', 'about_description'],
      shadowDataUsed: true,
    };
    console.log(`[MultiSource] All fetchers failed — using shadow data for ${industry}`);
    return applyOnboardingStatus(fallback);
  }

  // Inject shadow FAQs into the rawBusinessInfo if still incomplete
  if (best.confidenceScore < CONFIDENCE_THRESHOLD_INCOMPLETE) {
    best.profile.rawBusinessInfo = [best.profile.rawBusinessInfo, shadowInfo].filter(Boolean).join('\n\n---\n\n');
    best.shadowDataUsed = true;
    console.log(`[MultiSource] Low confidence (${best.confidenceScore}) — injecting shadow data for ${industry}`);
  }

  return applyOnboardingStatus(best);
}

/**
 * Merge data from a secondary source into the primary, filling gaps.
 */
function mergeSources(primary: MultiSourceResult, secondary: MultiSourceResult): MultiSourceResult {
  const merged = { ...primary };

  // Fill missing fields from secondary
  for (const field of secondary.missingFields) {
    // if secondary HAS it (not in its missing list) and primary DOESN'T, copy it over
    if (!primary.missingFields.includes(field)) continue; // primary already has it
  }

  // Simple property-level merge: overwrite nullish primary fields with secondary values
  const p = primary.profile as any;
  const s = secondary.profile as any;
  for (const key of Object.keys(s)) {
    if (!p[key] && s[key]) {
      p[key] = s[key];
    }
  }

  // Re-score after merge
  const { score, missingFields } = scoreProfile(merged.profile);
  merged.confidenceScore = score;
  merged.missingFields = missingFields;

  return merged;
}

/**
 * Tag the result with an onboarding status string.
 */
function applyOnboardingStatus(result: MultiSourceResult): MultiSourceResult {
  return {
    ...result,
    profile: {
      ...result.profile,
      dataQuality: result.confidenceScore,
    },
  };
}

/**
 * Translate confidence score to onboarding status string for DB storage.
 */
export function getOnboardingStatus(confidenceScore: number): 'complete' | 'incomplete' | 'draft' {
  if (confidenceScore >= CONFIDENCE_THRESHOLD_COMPLETE) return 'complete';
  if (confidenceScore >= CONFIDENCE_THRESHOLD_INCOMPLETE) return 'incomplete';
  return 'draft';
}
