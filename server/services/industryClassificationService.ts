/**
 * Industry Classification Service
 * Automatically determines business industry from business information using keyword matching
 * and business characteristics analysis
 */

import { Industry, INDUSTRY_CONFIGS, DEFAULT_INDUSTRY } from '@shared/industryConfig';

export interface BusinessData {
  businessName?: string;
  description?: string;
  services?: string[];
  website?: string;
  menuItems?: any;
  googleMapsData?: any;
  industry?: string; // User-selected industry if available
}

export class IndustryClassificationService {
  /**
   * Classify industry based on business information
   * Uses a scoring system with keyword matching and business characteristics
   */
  static classifyIndustry(businessData: BusinessData): Industry {
    // If user explicitly selected an industry, use that
    if (businessData.industry) {
      const normalizedIndustry = this.normalizeIndustryString(businessData.industry);
      if (normalizedIndustry) {
        return normalizedIndustry;
      }
    }

    // Combine all text fields for analysis
    const textToAnalyze = this.combineBusinessText(businessData).toLowerCase();

    // Score each industry based on keyword matches
    const scores: Record<Industry, number> = {} as Record<Industry, number>;

    Object.entries(INDUSTRY_CONFIGS).forEach(([industryId, config]) => {
      scores[industryId as Industry] = this.scoreIndustryMatch(textToAnalyze, config.keywords);
    });

    // Find industry with highest score
    let maxScore = 0;
    let bestMatch: Industry = DEFAULT_INDUSTRY;

    Object.entries(scores).forEach(([industry, score]) => {
      if (score > maxScore) {
        maxScore = score;
        bestMatch = industry as Industry;
      }
    });

    // If no clear match found, return default
    if (maxScore === 0) {
      console.log('🔍 No industry match found, using default:', DEFAULT_INDUSTRY);
      return DEFAULT_INDUSTRY;
    }

    console.log(`🎯 Industry classified as: ${bestMatch} (score: ${maxScore})`);
    return bestMatch;
  }

  /**
   * Normalize user-selected industry string to Industry enum
   */
  private static normalizeIndustryString(industry: string): Industry | null {
    const normalized = industry.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Direct mapping for common industry strings
    const industryMap: Record<string, Industry> = {
      'restaurant': 'restaurant',
      'cafe': 'restaurant',
      'catering': 'restaurant',
      'food': 'restaurant',
      'salon': 'salon',
      'beauty': 'salon',
      'spa': 'salon',
      'nail': 'salon',
      'hotel': 'hotel',
      'resort': 'hotel',
      'vacation': 'hotel',
      'medical': 'medical',
      'clinic': 'medical',
      'doctor': 'medical',
      'healthcare': 'medical',
      'auto': 'auto',
      'car': 'auto',
      'automotive': 'auto',
      'barbershop': 'barbershop',
      'barber': 'barbershop',
      'fitness': 'fitness',
      'yoga': 'fitness',
      'veterinary': 'veterinary',
      'vet': 'veterinary',
      'pet': 'veterinary',
      'realestate': 'real-estate',
      'property': 'real-estate',
      'medicalspa': 'medical-spa',
      'medspa': 'medical-spa',
      'petdaycare': 'pet-daycare',
      'dogdaycare': 'pet-daycare',
      'homeservice': 'home-service',
      'plumbing': 'home-service',
      'cleaning': 'home-service',
      'education': 'education',
      'tutoring': 'education',
      'school': 'education',
      'gym': 'gym',
      'fitnesscenter': 'gym',
      'dentist': 'dentist',
      'dental': 'dentist',
      'orthodontist': 'dentist',
    };

    return industryMap[normalized] || null;
  }

  /**
   * Combine all business text fields for analysis
   */
  private static combineBusinessText(businessData: BusinessData): string {
    const parts: string[] = [];

    if (businessData.businessName) {
      parts.push(businessData.businessName);
    }

    if (businessData.description) {
      parts.push(businessData.description);
    }

    if (businessData.services && Array.isArray(businessData.services)) {
      parts.push(...businessData.services);
    }

    if (businessData.website) {
      parts.push(businessData.website);
    }

    // Extract from Google Maps data
    if (businessData.googleMapsData) {
      const gmData = businessData.googleMapsData;
      if (gmData.types && Array.isArray(gmData.types)) {
        parts.push(...gmData.types);
      }
      if (gmData.description) {
        parts.push(gmData.description);
      }
      if (gmData.categories && Array.isArray(gmData.categories)) {
        parts.push(...gmData.categories);
      }
    }

    // Check for menu items (strong restaurant indicator)
    if (businessData.menuItems) {
      parts.push('menu food restaurant dining');
    }

    return parts.join(' ');
  }

  /**
   * Score how well business text matches industry keywords
   * Uses weighted scoring: exact keyword match = 10 points, partial match = 5 points
   */
  private static scoreIndustryMatch(text: string, keywords: string[]): number {
    let score = 0;

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();

      // Exact word match (e.g., "restaurant" in "Joe's Restaurant")
      const exactMatch = new RegExp(`\\b${keywordLower}\\b`, 'i').test(text);
      if (exactMatch) {
        score += 10;
      }

      // Partial match (e.g., "salon" in "hair salon and spa")
      else if (text.includes(keywordLower)) {
        score += 5;
      }
    });

    return score;
  }

  /**
   * Validate if an industry string is valid
   */
  static isValidIndustry(industry: string): boolean {
    return Object.keys(INDUSTRY_CONFIGS).includes(industry);
  }

  /**
   * Get suggested industries based on partial business information
   * Useful for showing suggestions during onboarding
   */
  static getSuggestedIndustries(businessData: BusinessData, limit: number = 3): Industry[] {
    const textToAnalyze = this.combineBusinessText(businessData).toLowerCase();

    if (!textToAnalyze.trim()) {
      // Return default suggestions if no data
      return ['restaurant', 'salon', 'medical'];
    }

    // Score all industries
    const scored = Object.entries(INDUSTRY_CONFIGS).map(([industryId, config]) => ({
      industry: industryId as Industry,
      score: this.scoreIndustryMatch(textToAnalyze, config.keywords),
    }));

    // Sort by score and return top matches
    return scored
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0)
      .slice(0, limit)
      .map(item => item.industry);
  }
}
