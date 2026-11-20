/**
 * UNIVERSAL BUSINESS EXTRACTOR
 *
 * This service implements the extraction logic for the flexible business template.
 * It can:
 * 1. Auto-detect business industry from various data sources
 * 2. Extract core universal fields
 * 3. Dynamically activate and populate industry-specific modules
 * 4. Combine data from multiple sources (Google Maps, website, manual input)
 */

import {
  FlexibleBusinessTemplate,
  UniversalBusinessCore,
  IndustryModules,
  DayHours,
  ServiceOffering,
  ProductOffering,
  BusinessTemplateFormatter
} from './universalBusinessExtractionTemplate';

// ============================================================================
// INDUSTRY DETECTION
// ============================================================================

interface IndustryDetectionResult {
  primaryIndustry: string;
  subIndustry?: string;
  confidence: number;
  activeModules: string[];
}

export class IndustryDetector {
  /**
   * Detect industry from business data using multiple signals
   */
  static detectIndustry(data: any): IndustryDetectionResult {
    const signals = this.extractIndustrySignals(data);
    const scores = new Map<string, number>();

    // Score each industry based on keyword matches and patterns
    const industryKeywords = this.getIndustryKeywordMappings();

    for (const [industry, patterns] of Object.entries(industryKeywords)) {
      let score = 0;

      // Check business name
      if (data.name) {
        score += this.scoreText(data.name, patterns.keywords) * 2; // 2x weight for name
      }

      // Check description/about
      if (data.description || data.aboutInfo?.story) {
        const text = data.description || data.aboutInfo?.story || '';
        score += this.scoreText(text, patterns.keywords);
      }

      // Check Google types
      if (data.types && Array.isArray(data.types)) {
        const typesMatch = data.types.some((type: string) =>
          patterns.googleTypes?.includes(type)
        );
        if (typesMatch) score += 20;
      }

      // Check services/products
      if (data.services || data.offerings?.services) {
        const services = data.services || data.offerings?.services || [];
        const servicesText = services.map((s: any) => s.name || s).join(' ');
        score += this.scoreText(servicesText, patterns.keywords);
      }

      // Check menu (strong signal for food industry)
      if (data.menu || data.menuSections) {
        if (industry === 'restaurant') score += 30;
      }

      scores.set(industry, score);
    }

    // Find highest scoring industry
    let maxScore = 0;
    let detectedIndustry = 'general_business';
    for (const [industry, score] of scores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        detectedIndustry = industry;
      }
    }

    // Determine active modules based on detected industry
    const activeModules = this.determineActiveModules(detectedIndustry, data);

    // Calculate confidence (0-100)
    const confidence = Math.min(100, Math.round(maxScore * 2));

    return {
      primaryIndustry: detectedIndustry,
      subIndustry: this.detectSubIndustry(detectedIndustry, data),
      confidence,
      activeModules
    };
  }

  private static scoreText(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }
    return score;
  }

  private static extractIndustrySignals(data: any): any {
    return {
      name: data.name || data.businessName || '',
      types: data.types || [],
      description: data.description || data.aboutInfo?.story || '',
      services: data.services || data.offerings?.services || [],
      hasMenu: !!(data.menu || data.menuSections),
      hasRooms: !!(data.roomTypes),
      hasVehicleServices: !!(data.vehicleServices),
    };
  }

  private static getIndustryKeywordMappings(): Record<string, { keywords: string[]; googleTypes?: string[] }> {
    return {
      restaurant: {
        keywords: ['restaurant', 'cafe', 'bistro', 'eatery', 'diner', 'grill', 'cuisine', 'menu', 'dining', 'food', 'bar', 'pub', 'tavern', 'kitchen', 'buffet'],
        googleTypes: ['restaurant', 'food', 'cafe', 'bar', 'meal_delivery', 'meal_takeaway']
      },
      beauty: {
        keywords: ['salon', 'spa', 'beauty', 'hair', 'nails', 'barbershop', 'barber', 'stylist', 'manicure', 'pedicure', 'facial', 'massage', 'waxing', 'makeup', 'cosmetic'],
        googleTypes: ['beauty_salon', 'hair_care', 'spa', 'nail_salon']
      },
      healthcare: {
        keywords: ['doctor', 'clinic', 'medical', 'physician', 'dentist', 'dental', 'health', 'hospital', 'urgent care', 'therapy', 'chiropractic', 'veterinary', 'vet', 'patient'],
        googleTypes: ['doctor', 'hospital', 'dentist', 'health', 'pharmacy', 'veterinary_care', 'physiotherapist']
      },
      hospitality: {
        keywords: ['hotel', 'motel', 'inn', 'resort', 'lodge', 'bed and breakfast', 'b&b', 'hostel', 'suites', 'rooms', 'accommodation', 'stay'],
        googleTypes: ['lodging', 'hotel', 'resort_hotel', 'motel']
      },
      automotive: {
        keywords: ['auto', 'car', 'vehicle', 'repair', 'mechanic', 'tire', 'oil change', 'brake', 'transmission', 'detailing', 'body shop', 'collision', 'automotive'],
        googleTypes: ['car_repair', 'car_dealer', 'car_wash']
      },
      professional: {
        keywords: ['attorney', 'lawyer', 'legal', 'accountant', 'cpa', 'consulting', 'consultant', 'firm', 'services', 'professional', 'tax', 'law', 'architect', 'engineering'],
        googleTypes: ['lawyer', 'accounting', 'insurance_agency', 'real_estate_agency']
      },
      fitness: {
        keywords: ['gym', 'fitness', 'yoga', 'pilates', 'crossfit', 'training', 'workout', 'exercise', 'martial arts', 'studio', 'personal training', 'wellness'],
        googleTypes: ['gym', 'health', 'fitness_center']
      },
      retail: {
        keywords: ['shop', 'store', 'boutique', 'retail', 'clothing', 'apparel', 'shoes', 'accessories', 'gift', 'market', 'emporium'],
        googleTypes: ['store', 'clothing_store', 'shoe_store', 'jewelry_store', 'home_goods_store']
      },
      education: {
        keywords: ['tutoring', 'tutor', 'learning', 'school', 'academy', 'education', 'training', 'class', 'lesson', 'instruction', 'teaching'],
        googleTypes: ['school', 'university', 'library', 'tutoring']
      },
      homeServices: {
        keywords: ['cleaning', 'maid', 'plumbing', 'plumber', 'hvac', 'electrical', 'electrician', 'landscaping', 'lawn', 'roofing', 'pest control', 'handyman'],
        googleTypes: ['plumber', 'electrician', 'roofing_contractor', 'general_contractor']
      },
      petServices: {
        keywords: ['pet', 'dog', 'cat', 'grooming', 'boarding', 'kennel', 'daycare', 'veterinary', 'animal'],
        googleTypes: ['veterinary_care', 'pet_store']
      }
    };
  }

  private static detectSubIndustry(primaryIndustry: string, data: any): string | undefined {
    const text = `${data.name || ''} ${data.description || ''} ${JSON.stringify(data.types || [])}`.toLowerCase();

    const subIndustryMap: Record<string, Record<string, string[]>> = {
      restaurant: {
        'Fast Food': ['fast food', 'quick service', 'drive-thru', 'counter service'],
        'Fine Dining': ['fine dining', 'upscale', 'gourmet', 'michelin'],
        'Cafe': ['cafe', 'coffee', 'coffeehouse', 'espresso'],
        'Bar/Pub': ['bar', 'pub', 'tavern', 'brewery', 'taproom'],
        'Bakery': ['bakery', 'patisserie', 'pastry', 'baked goods']
      },
      beauty: {
        'Hair Salon': ['hair salon', 'hairstylist', 'hair care'],
        'Nail Salon': ['nail salon', 'nails', 'manicure'],
        'Spa': ['spa', 'day spa', 'wellness spa'],
        'Barbershop': ['barbershop', 'barber', 'men\'s grooming']
      },
      healthcare: {
        'Dental': ['dentist', 'dental', 'orthodontist'],
        'Veterinary': ['veterinary', 'vet', 'animal hospital'],
        'Medical Clinic': ['medical clinic', 'family practice', 'primary care'],
        'Urgent Care': ['urgent care', 'walk-in clinic'],
        'Mental Health': ['therapy', 'counseling', 'psychologist', 'psychiatrist']
      },
      fitness: {
        'Yoga Studio': ['yoga', 'hot yoga', 'vinyasa'],
        'CrossFit': ['crossfit', 'functional fitness'],
        'Martial Arts': ['martial arts', 'karate', 'taekwondo', 'jiu-jitsu'],
        'Personal Training': ['personal training', 'one-on-one']
      }
    };

    if (subIndustryMap[primaryIndustry]) {
      for (const [subIndustry, keywords] of Object.entries(subIndustryMap[primaryIndustry])) {
        if (keywords.some(keyword => text.includes(keyword))) {
          return subIndustry;
        }
      }
    }

    return undefined;
  }

  private static determineActiveModules(industry: string, data: any): string[] {
    const modules: string[] = [];

    // Map industries to their primary modules
    const industryModuleMap: Record<string, string> = {
      restaurant: 'restaurant',
      beauty: 'beauty',
      healthcare: 'healthcare',
      hospitality: 'hospitality',
      automotive: 'automotive',
      professional: 'professional',
      fitness: 'fitness',
      retail: 'retail',
      education: 'education',
      homeServices: 'homeServices',
      petServices: 'petServices'
    };

    const primaryModule = industryModuleMap[industry];
    if (primaryModule) {
      modules.push(primaryModule);
    }

    // Check for secondary modules based on data presence
    if (data.menu || data.menuSections) modules.push('restaurant');
    if (data.roomTypes) modules.push('hospitality');
    if (data.retailProducts) modules.push('retail');

    return [...new Set(modules)]; // Remove duplicates
  }
}

// ============================================================================
// UNIVERSAL BUSINESS EXTRACTOR
// ============================================================================

export class UniversalBusinessExtractor {
  /**
   * Extract complete business profile from raw data
   */
  async extractBusinessProfile(
    rawData: any,
    options: {
      source?: 'google_maps' | 'website' | 'manual' | 'hybrid';
      includeAIFormatting?: boolean;
    } = {}
  ): Promise<FlexibleBusinessTemplate> {
    console.log('🔍 Starting universal business extraction...');

    // Step 1: Detect industry
    const industryDetection = IndustryDetector.detectIndustry(rawData);
    console.log(`✓ Detected industry: ${industryDetection.primaryIndustry} (${industryDetection.confidence}% confidence)`);

    // Step 2: Extract core fields
    const core = this.extractCoreFields(rawData);

    // Step 3: Extract industry-specific modules
    const industryModules = this.extractIndustryModules(rawData, industryDetection.activeModules);

    // Step 4: Assemble template
    const template: FlexibleBusinessTemplate = {
      core,
      industryModules,
      extractionMetadata: {
        detectedIndustry: industryDetection.primaryIndustry,
        activeModules: industryDetection.activeModules,
        confidence: industryDetection.confidence,
        extractionMethod: options.source || 'hybrid',
        extractionTimestamp: new Date().toISOString(),
        dataSources: this.identifyDataSources(rawData)
      }
    };

    console.log(`✅ Extraction complete. Active modules: ${industryDetection.activeModules.join(', ')}`);

    return template;
  }

  /**
   * Extract core universal fields
   */
  private extractCoreFields(data: any): UniversalBusinessCore {
    return {
      identity: {
        businessName: data.name || data.businessName || 'Unknown Business',
        legalEntityName: data.legalName,
        dba: data.dba,
        brandName: data.brandName,
        tagline: data.tagline,
        industry: data.industry || 'General Business',
        subIndustry: data.subIndustry,
        businessType: data.businessType || 'sole_proprietor',
        taxId: data.taxId,
        founded: data.established || data.founded
      },

      contact: {
        primaryPhone: data.phone || data.primaryPhone || data.formatted_phone_number || '',
        secondaryPhone: data.secondaryPhone,
        faxNumber: data.fax,
        primaryEmail: data.email || data.contact?.email || '',
        supportEmail: data.supportEmail,
        bookingEmail: data.bookingEmail,
        website: data.website || data.url,
        socialMedia: data.socialMedia || this.extractSocialMedia(data)
      },

      location: {
        primaryAddress: this.extractAddress(data),
        additionalLocations: data.additionalLocations,
        accessibility: {
          wheelchairAccessible: data.wheelchair_accessible_entrance || data.accessibility?.wheelchairAccessible,
          parkingAvailable: data.hasParking || data.parking,
          parkingType: data.parkingType,
          publicTransitNearby: data.publicTransit,
          transitDetails: data.transitDetails
        },
        serviceArea: data.serviceArea
      },

      hours: this.extractHours(data),

      staff: {
        totalEmployees: data.totalEmployees,
        keyPersonnel: this.extractStaff(data),
        departments: data.departments
      },

      offerings: {
        services: this.extractServices(data),
        products: this.extractProducts(data),
        packages: data.packages,
        categories: data.categories
      },

      pricing: {
        currency: data.currency || 'USD',
        priceLevel: data.price_level || data.priceLevel,
        priceRange: data.priceRange,
        paymentMethods: this.extractPaymentMethods(data),
        posIntegration: data.posIntegration,
        taxInfo: data.taxInfo
      },

      policies: {
        booking: this.extractBookingPolicies(data),
        cancellation: this.extractCancellationPolicies(data),
        refunds: data.refundPolicy,
        ageRestrictions: data.ageRestrictions,
        dresscode: data.dresscode,
        petPolicy: this.extractPetPolicy(data),
        smokingPolicy: this.extractSmokingPolicy(data),
        groupBookings: data.groupBookings
      },

      communication: {
        preferredChannels: this.extractCommunicationChannels(data),
        smsEnabled: data.smsEnabled,
        smsOptInRequired: data.smsOptIn,
        emailNotificationsEnabled: data.emailNotifications,
        appointmentReminders: data.appointmentReminders,
        marketingOptIn: data.marketingOptIn,
        preferredLanguages: data.languages || ['en'],
        accessibilitySupport: data.accessibilitySupport
      },

      compliance: {
        licenses: data.licenses,
        certifications: this.extractCertifications(data),
        insurance: data.insurance,
        industryStandards: data.industryStandards || [],
        backgroundChecked: data.backgroundChecked,
        membershipAffiliations: data.affiliations || []
      },

      metadata: {
        description: data.description || data.editorial_summary?.overview || '',
        longDescription: data.aboutInfo?.story || data.longDescription,
        mission: data.aboutInfo?.mission || data.mission,
        values: data.values,
        awards: this.extractAwards(data),
        mediaKit: data.mediaKit,
        sustainability: this.extractSustainability(data),
        reviews: this.extractReviews(data),
        dataQuality: this.calculateDataQuality(data),
        lastUpdated: new Date().toISOString(),
        dataSource: this.identifyDataSources(data)
      }
    };
  }

  /**
   * Extract industry-specific modules
   */
  private extractIndustryModules(data: any, activeModules: string[]): IndustryModules {
    const modules: IndustryModules = {};

    for (const moduleName of activeModules) {
      switch (moduleName) {
        case 'restaurant':
          modules.restaurant = this.extractRestaurantModule(data);
          break;
        case 'beauty':
          modules.beauty = this.extractBeautyModule(data);
          break;
        case 'healthcare':
          modules.healthcare = this.extractHealthcareModule(data);
          break;
        case 'hospitality':
          modules.hospitality = this.extractHospitalityModule(data);
          break;
        case 'automotive':
          modules.automotive = this.extractAutomotiveModule(data);
          break;
        case 'professional':
          modules.professional = this.extractProfessionalModule(data);
          break;
        case 'fitness':
          modules.fitness = this.extractFitnessModule(data);
          break;
        case 'retail':
          modules.retail = this.extractRetailModule(data);
          break;
        case 'education':
          modules.education = this.extractEducationModule(data);
          break;
        case 'homeServices':
          modules.homeServices = this.extractHomeServicesModule(data);
          break;
        case 'petServices':
          modules.petServices = this.extractPetServicesModule(data);
          break;
      }
    }

    return modules;
  }

  // ============================================================================
  // HELPER METHODS - Core Field Extraction
  // ============================================================================

  private extractAddress(data: any): any {
    if (data.primaryAddress) return data.primaryAddress;

    // Parse from formatted_address or individual components
    const formatted = data.formatted_address || data.address || '';
    const components = data.address_components || data.addressComponents || {};

    return {
      street: components.street || data.street || '',
      street2: components.street2 || data.street2,
      city: components.city || data.city || '',
      state: components.state || data.state || '',
      postalCode: components.postalCode || components.postal_code || data.postalCode || '',
      country: components.country || data.country || 'USA',
      coordinates: data.coordinates || (data.geometry?.location ? {
        latitude: data.geometry.location.lat,
        longitude: data.geometry.location.lng
      } : undefined)
    };
  }

  private extractHours(data: any): any {
    const defaultHours: DayHours = { isClosed: true };

    if (data.hours?.regularHours) {
      return data.hours;
    }

    // Parse from Google Maps opening_hours
    const regularHours: any = {
      monday: defaultHours,
      tuesday: defaultHours,
      wednesday: defaultHours,
      thursday: defaultHours,
      friday: defaultHours,
      saturday: defaultHours,
      sunday: defaultHours
    };

    if (data.opening_hours?.weekday_text) {
      data.opening_hours.weekday_text.forEach((dayText: string) => {
        const [day, timeRange] = dayText.split(': ');
        const dayKey = day.toLowerCase();

        if (timeRange === 'Closed') {
          regularHours[dayKey] = { isClosed: true };
        } else {
          const times = timeRange.split(' – ');
          regularHours[dayKey] = {
            isClosed: false,
            openTime: this.convertTo24Hour(times[0]),
            closeTime: this.convertTo24Hour(times[1])
          };
        }
      });
    }

    return {
      regularHours,
      specialHours: data.specialHours || [],
      holidaySchedule: data.holidaySchedule || [],
      timezone: data.timezone || 'America/New_York',
      appointmentOnly: data.appointmentOnly,
      walkInsAccepted: data.walkInsAccepted ?? true,
      advanceBookingRequired: data.advanceBookingRequired,
      advanceBookingMinHours: data.advanceBookingMinHours
    };
  }

  private convertTo24Hour(time: string): string {
    // Convert "9:00 AM" to "09:00"
    if (!time) return '';
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return time;

    let [_, hours, minutes, period] = match;
    let hour = parseInt(hours);

    if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  }

  private extractStaff(data: any): any[] {
    if (data.keyPersonnel) return data.keyPersonnel;
    if (data.staffInfo?.staff) return data.staffInfo.staff;
    if (data.staff) return data.staff;
    return [];
  }

  private extractServices(data: any): ServiceOffering[] {
    const services: ServiceOffering[] = [];

    if (data.services && Array.isArray(data.services)) {
      data.services.forEach((service: any, index: number) => {
        services.push({
          id: service.id || `service_${index}`,
          name: service.name || service,
          description: service.description,
          category: service.category,
          duration: service.duration,
          price: service.price,
          priceRange: service.priceRange,
          priceUnit: service.priceUnit || 'fixed',
          currency: service.currency || 'USD',
          availability: service.availability || 'always',
          providedBy: service.providedBy,
          tags: service.tags,
          popularity: service.popularity,
          requiresConsultation: service.requiresConsultation
        });
      });
    }

    return services;
  }

  private extractProducts(data: any): ProductOffering[] {
    if (!data.products) return [];

    return data.products.map((product: any, index: number) => ({
      id: product.id || `product_${index}`,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      priceRange: product.priceRange,
      currency: product.currency || 'USD',
      quantity: product.quantity,
      unit: product.unit,
      sku: product.sku,
      availability: product.availability || 'in_stock',
      tags: product.tags,
      allergens: product.allergens,
      ingredients: product.ingredients,
      popularity: product.popularity
    }));
  }

  private extractPaymentMethods(data: any): any {
    if (data.paymentMethods) return data.paymentMethods;

    return {
      cash: true,
      creditCards: true,
      debitCards: true,
      acceptedCards: ['visa', 'mastercard', 'amex', 'discover'],
      digitalWallets: data.digitalWallets || [],
      checks: data.acceptsChecks,
      financing: data.financing,
      financingDetails: data.financingDetails,
      installmentPlans: data.installmentPlans,
      cryptocurrencies: data.cryptocurrencies
    };
  }

  private extractBookingPolicies(data: any): any {
    if (data.policies?.booking) return data.policies.booking;

    return {
      methodsAccepted: data.bookingMethods || ['phone', 'website'],
      onlineBookingUrl: data.onlineBookingUrl || data.reservationInfo?.onlineBookingUrl,
      thirdPartyPlatforms: data.thirdPartyPlatforms || [],
      requiresDeposit: data.requiresDeposit,
      depositAmount: data.depositAmount,
      depositRefundable: data.depositRefundable
    };
  }

  private extractCancellationPolicies(data: any): any {
    if (data.policies?.cancellation) return data.policies.cancellation;
    if (data.cancellationPolicy) {
      return {
        policy: typeof data.cancellationPolicy === 'string' ? data.cancellationPolicy : JSON.stringify(data.cancellationPolicy),
        noticePeriodHours: data.cancellationNoticePeriod,
        cancellationFee: data.cancellationFee,
        noShowFee: data.noShowFee,
        rescheduleAllowed: data.rescheduleAllowed ?? true,
        rescheduleFee: data.rescheduleFee
      };
    }
    return undefined;
  }

  private extractPetPolicy(data: any): any {
    const text = `${data.description || ''} ${data.policies || ''}`.toLowerCase();

    return {
      petsAllowed: /pet.?friendly|dogs?.?welcome/i.test(text),
      types: data.petTypes,
      restrictions: data.petRestrictions,
      outdoorOnly: /outdoor.*only/i.test(text)
    };
  }

  private extractSmokingPolicy(data: any): any {
    const text = `${data.description || ''} ${data.policies || ''}`.toLowerCase();

    return {
      smokingAllowed: !/non.?smoking|no.*smoking/i.test(text),
      areas: data.smokingAreas,
      details: data.smokingDetails
    };
  }

  private extractCommunicationChannels(data: any): string[] {
    const channels: string[] = ['phone', 'email'];

    if (data.smsEnabled) channels.push('sms');
    if (data.chatEnabled) channels.push('chat');
    if (data.appEnabled) channels.push('app');

    return channels;
  }

  private extractCertifications(data: any): any[] {
    if (data.certifications) return data.certifications;
    if (data.awards?.certifications) return data.awards.certifications;
    return [];
  }

  private extractAwards(data: any): any[] {
    if (data.awards?.awards) return data.awards.awards;
    if (data.aboutInfo?.awards) {
      return data.aboutInfo.awards.map((award: string) => ({ name: award }));
    }
    return [];
  }

  private extractSustainability(data: any): any {
    if (data.sustainability) return data.sustainability;
    if (data.sustainabilityInfo) return data.sustainabilityInfo;
    return undefined;
  }

  private extractReviews(data: any): any {
    return {
      averageRating: data.rating || data.averageRating,
      totalReviews: data.user_ratings_total || data.totalReviews || 0,
      platforms: data.reviewPlatforms
    };
  }

  private extractSocialMedia(data: any): any {
    if (data.socialMedia) return data.socialMedia;

    // Extract from links or other fields
    return {
      facebook: data.facebookUrl,
      instagram: data.instagramUrl,
      twitter: data.twitterUrl,
      linkedin: data.linkedinUrl
    };
  }

  private calculateDataQuality(data: any): number {
    let score = 0;
    const weights = {
      name: 10,
      address: 10,
      phone: 10,
      email: 5,
      website: 5,
      hours: 15,
      description: 10,
      services: 15,
      reviews: 10,
      photos: 5,
      socialMedia: 5
    };

    if (data.name || data.businessName) score += weights.name;
    if (data.address || data.formatted_address) score += weights.address;
    if (data.phone || data.formatted_phone_number) score += weights.phone;
    if (data.email) score += weights.email;
    if (data.website) score += weights.website;
    if (data.opening_hours || data.hours) score += weights.hours;
    if (data.description) score += weights.description;
    if ((data.services && data.services.length > 0) || (data.menu && data.menu.length > 0)) score += weights.services;
    if (data.reviews && data.reviews.length > 0) score += weights.reviews;
    if (data.photos && data.photos.length > 0) score += weights.photos;
    if (data.socialMedia && Object.keys(data.socialMedia).length > 0) score += weights.socialMedia;

    return Math.min(100, score);
  }

  private identifyDataSources(data: any): string[] {
    const sources: string[] = [];

    if (data.place_id) sources.push('google_maps');
    if (data.websiteData) sources.push('website_scrape');
    if (data.manualEntry) sources.push('manual_input');
    if (data.apiSource) sources.push('api');

    return sources.length > 0 ? sources : ['unknown'];
  }

  // ============================================================================
  // INDUSTRY MODULE EXTRACTORS
  // ============================================================================

  private extractRestaurantModule(data: any): any {
    return {
      cuisine: data.cuisine ? [data.cuisine] : (data.types?.filter((t: string) =>
        ['italian', 'mexican', 'chinese', 'japanese', 'indian', 'thai', 'american'].includes(t)
      ) || []),
      menuSections: data.menu || data.menuSections || [],
      dietaryOptions: {
        vegetarian: data.serves_vegetarian_food || false,
        vegan: data.servesVegan || false,
        glutenFree: data.glutenFree || false,
        halal: data.halal || false,
        kosher: data.kosher || false
      },
      serviceStyles: this.extractServiceStyles(data),
      reservations: data.reservationInfo || {
        accepted: data.reservable || false
      },
      delivery: data.deliveryInfo,
      alcohol: {
        served: data.serves_beer || data.serves_wine || false,
        types: this.extractAlcoholTypes(data)
      },
      seating: data.seating,
      specialEvents: data.eventInfo
    };
  }

  private extractServiceStyles(data: any): string[] {
    const styles: string[] = [];
    if (data.dineIn !== false) styles.push('dine_in');
    if (data.takeout || data.hasTakeout) styles.push('takeout');
    if (data.delivery || data.hasDelivery) styles.push('delivery');
    if (data.catering) styles.push('catering');
    return styles;
  }

  private extractAlcoholTypes(data: any): string[] {
    const types: string[] = [];
    if (data.serves_beer) types.push('beer');
    if (data.serves_wine) types.push('wine');
    if (data.serves_cocktails) types.push('cocktails');
    return types;
  }

  private extractBeautyModule(data: any): any {
    return {
      services: data.beautyServices || [],
      specialties: data.specialties || [],
      productsUsed: data.productsUsed || [],
      retailProducts: data.retailProducts || false,
      consultationRequired: data.consultationRequired || false,
      patchTestRequired: data.patchTestRequired || false,
      membershipProgram: data.membershipProgram
    };
  }

  private extractHealthcareModule(data: any): any {
    return {
      practiceType: data.practiceType || 'general_practice',
      specialties: data.specialties || [],
      providers: data.providers || [],
      insuranceAccepted: data.insuranceAccepted,
      emergencyServices: data.emergencyServices || false,
      telehealth: data.telehealth,
      prescriptionServices: data.prescriptionServices || false,
      labServicesOnsite: data.labServices || false,
      parkingValidation: data.parkingValidation || false,
      hipaaCompliant: true, // Assume HIPAA compliance for healthcare
      covidPrecautions: data.covidPrecautions || []
    };
  }

  private extractHospitalityModule(data: any): any {
    return {
      propertyType: data.propertyType || 'hotel',
      starRating: data.starRating,
      totalRooms: data.totalRooms,
      roomTypes: data.roomTypes || [],
      checkInTime: data.checkInTime || '15:00',
      checkOutTime: data.checkOutTime || '11:00',
      earlyCheckIn: data.earlyCheckIn,
      lateCheckOut: data.lateCheckOut,
      amenities: data.amenities,
      seasonalPricing: data.seasonalPricing || false,
      bookingPlatforms: data.bookingPlatforms || [],
      minimumStayNights: data.minimumStay,
      cancellationPolicy: data.cancellationPolicy
    };
  }

  private extractAutomotiveModule(data: any): any {
    return {
      serviceType: data.serviceType || 'repair',
      specialties: data.specialties || [],
      services: data.automotiveServices || [],
      brandsServiced: data.brandsServiced || [],
      partsSource: data.partsSource || ['OEM', 'aftermarket'],
      warrantyOffered: data.warranty,
      loaner: data.loanerVehicles,
      shuttleService: data.shuttleService || false,
      waitingArea: data.waitingArea,
      inspectionCertified: data.inspectionCertified || false,
      towingService: data.towingService || false,
      mobileService: data.mobileService || false
    };
  }

  private extractProfessionalModule(data: any): any {
    return {
      serviceType: data.serviceType || 'consulting',
      practiceAreas: data.practiceAreas || [],
      professionals: data.professionals || [],
      consultationOffered: data.consultationOffered,
      billingStructure: data.billingStructure,
      clientTypes: data.clientTypes || ['individual', 'small_business'],
      industryFocus: data.industryFocus || [],
      languages: data.languages || ['en'],
      virtualServices: data.virtualServices || false,
      documentsRequired: data.documentsRequired || []
    };
  }

  private extractFitnessModule(data: any): any {
    return {
      facilityType: data.facilityType || 'gym',
      classesCourses: data.classes || [],
      membership: data.membership,
      personalTraining: data.personalTraining,
      amenities: data.amenities,
      equipment: data.equipment || [],
      ageRestrictions: data.ageRestrictions,
      firstVisitFree: data.firstVisitFree || false
    };
  }

  private extractRetailModule(data: any): any {
    return {
      storeType: data.storeType || 'specialty',
      productCategories: data.productCategories || [],
      brands: data.brands || [],
      pricePoint: data.pricePoint || 'mid_range',
      returns: data.returnPolicy,
      loyaltyProgram: data.loyaltyProgram,
      alterations: data.alterations || false,
      personalShopping: data.personalShopping || false,
      curbsidePickup: data.curbsidePickup || false,
      sameDay: data.sameDayDelivery || false,
      giftWrapping: data.giftWrapping || false
    };
  }

  private extractEducationModule(data: any): any {
    return {
      educationType: data.educationType || 'tutoring',
      subjects: data.subjects || [],
      ageGroups: data.ageGroups || [],
      classFormats: data.classFormats || ['one_on_one'],
      instructors: data.instructors || [],
      pricing: data.educationPricing,
      materialsFee: data.materialsFee,
      materialsIncluded: data.materialsIncluded ?? true,
      assessmentOffered: data.assessmentOffered || false,
      certificationOffered: data.certificationOffered || false,
      progressTracking: data.progressTracking || false
    };
  }

  private extractHomeServicesModule(data: any): any {
    return {
      serviceType: data.serviceType || 'cleaning',
      servicesOffered: data.servicesOffered || [],
      emergencyService: data.emergencyService,
      licensed: data.licensed || false,
      bonded: data.bonded || false,
      insured: data.insured || false,
      backgroundChecked: data.backgroundChecked || false,
      estimatesProvided: data.estimatesProvided,
      guaranteeWarranty: data.warranty,
      serviceArea: data.serviceArea,
      equipmentProvided: data.equipmentProvided ?? true,
      contractsAvailable: data.contractsAvailable
    };
  }

  private extractPetServicesModule(data: any): any {
    return {
      serviceType: data.serviceType || 'grooming',
      speciesServed: data.speciesServed || ['dogs', 'cats'],
      services: data.petServices || [],
      sizeRestrictions: data.sizeRestrictions,
      breedRestrictions: data.breedRestrictions || [],
      vaccinationsRequired: data.vaccinationsRequired || [],
      emergencyServices: data.emergencyServices || false,
      dropOffPickUp: data.dropOffPickUp ?? true,
      pickupDelivery: data.pickupDelivery || false,
      webcams: data.webcams || false,
      playAreaSize: data.playAreaSize,
      certifications: data.certifications || []
    };
  }

  /**
   * Format extracted data to human-readable text
   */
  formatToText(template: FlexibleBusinessTemplate): string {
    return BusinessTemplateFormatter.formatToText(template);
  }

  /**
   * Format for AI knowledge base
   */
  formatForAI(template: FlexibleBusinessTemplate): string {
    return BusinessTemplateFormatter.formatForAI(template);
  }
}

// Export singleton instance
export const universalBusinessExtractor = new UniversalBusinessExtractor();
