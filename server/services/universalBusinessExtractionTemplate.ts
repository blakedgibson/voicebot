/**
 * UNIVERSAL BUSINESS EXTRACTION TEMPLATE
 *
 * This template provides a flexible, industry-agnostic framework for extracting
 * business information from any source. It includes:
 *
 * 1. CORE FIELDS (Universal) - Required for all businesses
 * 2. INDUSTRY MODULES (Optional) - Pluggable based on business type
 * 3. EXTRACTION LOGIC - NLP-based detection and parsing
 */

// ============================================================================
// CORE FIELDS (Universal) - Applied to ALL businesses
// ============================================================================

export interface UniversalBusinessCore {
  // === BUSINESS IDENTITY ===
  identity: {
    businessName: string;                    // Legal or operating name
    legalEntityName?: string;                // If different from business name
    dba?: string;                            // "Doing Business As" name
    brandName?: string;                      // Marketing/brand name
    tagline?: string;                        // Business motto/tagline
    industry: string;                        // Primary industry classification
    subIndustry?: string;                    // Specific niche (e.g., "Hair Salon" under "Beauty & Personal Care")
    businessType: 'sole_proprietor' | 'llc' | 'corporation' | 'partnership' | 'nonprofit' | 'other';
    taxId?: string;                          // EIN or Tax ID (if applicable)
    founded?: number;                        // Year established
  };

  // === CONTACT INFORMATION ===
  contact: {
    primaryPhone: string;
    secondaryPhone?: string;
    faxNumber?: string;
    primaryEmail: string;
    supportEmail?: string;
    bookingEmail?: string;
    website?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
      tiktok?: string;
      youtube?: string;
      pinterest?: string;
      yelp?: string;
      googleBusiness?: string;
    };
  };

  // === LOCATION & ACCESSIBILITY ===
  location: {
    primaryAddress: {
      street: string;
      street2?: string;                      // Suite, unit, etc.
      city: string;
      state: string;
      postalCode: string;
      country: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    additionalLocations?: Array<{
      name?: string;                         // Location nickname (e.g., "Downtown Branch")
      street: string;
      street2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }>;
    accessibility: {
      wheelchairAccessible?: boolean;
      parkingAvailable?: boolean;
      parkingType?: 'free' | 'paid' | 'street' | 'valet' | 'none';
      publicTransitNearby?: boolean;
      transitDetails?: string;
    };
    serviceArea?: {
      type: 'local' | 'regional' | 'national' | 'international';
      radiusMiles?: number;                  // Service radius from primary location
      citiesServed?: string[];
      statesServed?: string[];
      countriesServed?: string[];
    };
  };

  // === OPERATING HOURS & SCHEDULE ===
  hours: {
    regularHours: {
      monday: DayHours;
      tuesday: DayHours;
      wednesday: DayHours;
      thursday: DayHours;
      friday: DayHours;
      saturday: DayHours;
      sunday: DayHours;
    };
    specialHours?: Array<{
      date: string;                          // ISO date or "2024-12-25"
      reason?: string;                       // "Christmas", "Private Event"
      hours?: DayHours;                      // Override hours or null if closed
      isClosed: boolean;
    }>;
    holidaySchedule?: Array<{
      holiday: string;
      status: 'closed' | 'modified_hours' | 'normal';
      hours?: DayHours;
    }>;
    timezone: string;                        // IANA timezone (e.g., "America/New_York")
    appointmentOnly?: boolean;
    walkInsAccepted?: boolean;
    advanceBookingRequired?: boolean;
    advanceBookingMinHours?: number;         // Minimum hours notice for booking
  };

  // === STAFF & PERSONNEL ===
  staff: {
    totalEmployees?: number;
    keyPersonnel?: Array<{
      name: string;
      title: string;
      role: string;
      bio?: string;
      specialties?: string[];
      certifications?: string[];
      yearsExperience?: number;
      photoUrl?: string;
      email?: string;
      phone?: string;
      availableForBooking?: boolean;
    }>;
    departments?: Array<{
      name: string;
      headCount?: number;
      managerName?: string;
    }>;
  };

  // === SERVICES/PRODUCTS (Universal Structure) ===
  offerings: {
    services?: Array<ServiceOffering>;
    products?: Array<ProductOffering>;
    packages?: Array<PackageOffering>;
    categories?: Array<{
      name: string;
      description?: string;
      items: string[];                       // IDs of services/products in this category
    }>;
  };

  // === PRICING & PAYMENT ===
  pricing: {
    currency: string;                        // ISO currency code (USD, EUR, etc.)
    priceLevel?: 1 | 2 | 3 | 4;            // $ to $$$$
    priceRange?: {
      minimum?: number;
      maximum?: number;
      average?: number;
    };
    paymentMethods: {
      cash?: boolean;
      creditCards?: boolean;
      debitCards?: boolean;
      acceptedCards?: Array<'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'diners'>;
      digitalWallets?: Array<'apple_pay' | 'google_pay' | 'samsung_pay' | 'paypal' | 'venmo'>;
      checks?: boolean;
      financing?: boolean;
      financingDetails?: string;
      installmentPlans?: boolean;
      cryptocurrencies?: string[];
    };
    posIntegration?: {
      provider?: string;                     // "Square", "Toast", "Clover", etc.
      capabilities?: string[];               // "online_ordering", "table_management", etc.
    };
    taxInfo?: {
      taxRate?: number;
      taxIncluded?: boolean;                 // Prices include tax or tax added at checkout
      taxExemptAvailable?: boolean;
    };
  };

  // === BOOKING, ORDERING & CANCELLATION POLICIES ===
  policies: {
    booking?: {
      methodsAccepted: Array<'phone' | 'website' | 'app' | 'email' | 'in_person' | 'third_party'>;
      onlineBookingUrl?: string;
      thirdPartyPlatforms?: string[];        // "OpenTable", "Resy", "BookSy", etc.
      requiresDeposit?: boolean;
      depositAmount?: string;                // "$50" or "20%"
      depositRefundable?: boolean;
    };
    cancellation?: {
      policy: string;                        // Full policy text
      noticePeriodHours?: number;            // Minimum hours notice for free cancellation
      cancellationFee?: string;              // "$25" or "50% of service cost"
      noShowFee?: string;
      rescheduleAllowed?: boolean;
      rescheduleFee?: string;
    };
    refunds?: {
      policy: string;
      timeLimitDays?: number;
      restockingFee?: string;
      conditions?: string[];
    };
    ageRestrictions?: {
      minimumAge?: number;
      requiresParentalConsent?: boolean;
      details?: string;
    };
    dresscode?: {
      required: boolean;
      description?: string;
      level?: 'casual' | 'business_casual' | 'business_formal' | 'formal' | 'black_tie';
    };
    petPolicy?: {
      petsAllowed: boolean;
      types?: Array<'dogs' | 'cats' | 'service_animals_only'>;
      restrictions?: string;
      outdoorOnly?: boolean;
    };
    smokingPolicy?: {
      smokingAllowed: boolean;
      areas?: Array<'outdoor' | 'designated_area' | 'nowhere'>;
      details?: string;
    };
    groupBookings?: {
      accepted: boolean;
      minimumSize?: number;
      maximumSize?: number;
      advanceNoticeDays?: number;
      specialTerms?: string;
    };
  };

  // === COMMUNICATION PREFERENCES ===
  communication: {
    preferredChannels: Array<'phone' | 'email' | 'sms' | 'app' | 'chat' | 'social_media'>;
    smsEnabled?: boolean;
    smsOptInRequired?: boolean;
    emailNotificationsEnabled?: boolean;
    appointmentReminders?: {
      enabled: boolean;
      timing?: string;                       // "24 hours before", "1 day and 1 hour before"
      methods?: Array<'sms' | 'email' | 'phone' | 'app'>;
    };
    marketingOptIn?: boolean;
    preferredLanguages?: string[];           // ["en", "es", "fr"]
    accessibilitySupport?: {
      ttyAvailable?: boolean;
      signLanguageSupport?: boolean;
      translationServices?: boolean;
      supportedLanguages?: string[];
    };
  };

  // === COMPLIANCE & LICENSING ===
  compliance: {
    licenses?: Array<{
      type: string;                          // "Business License", "Health Permit", etc.
      number?: string;
      issuer?: string;
      issuedDate?: string;
      expirationDate?: string;
      status: 'active' | 'expired' | 'pending' | 'suspended';
    }>;
    certifications?: Array<{
      name: string;
      issuer?: string;
      issuedDate?: string;
      expirationDate?: string;
      verificationUrl?: string;
    }>;
    insurance?: {
      liabilityInsurance?: boolean;
      bondedAndInsured?: boolean;
      coverageAmount?: string;
      provider?: string;
    };
    industryStandards?: string[];            // "HIPAA Compliant", "FDA Approved", "ADA Compliant"
    backgroundChecked?: boolean;
    membershipAffiliations?: string[];       // "Chamber of Commerce", "BBB Accredited"
  };

  // === ADDITIONAL METADATA ===
  metadata: {
    description: string;                     // Short business description (160 chars for SEO)
    longDescription?: string;                // Full "About Us" content
    mission?: string;
    values?: string[];
    awards?: Array<{
      name: string;
      year?: number;
      issuer?: string;
    }>;
    mediaKit?: {
      logoUrl?: string;
      brandColors?: string[];
      pressReleases?: string[];
    };
    sustainability?: {
      ecoFriendly?: boolean;
      certifications?: string[];             // "Green Business Certified", "LEED"
      practices?: string[];                  // "Recycling", "Solar Power"
    };
    reviews?: {
      averageRating?: number;
      totalReviews?: number;
      platforms?: Array<{
        name: string;                        // "Google", "Yelp", "Facebook"
        rating?: number;
        reviewCount?: number;
        url?: string;
      }>;
    };
    dataQuality?: number;                    // 0-100 score of data completeness
    lastUpdated?: string;                    // ISO timestamp
    dataSource?: string[];                   // "google_maps", "website", "manual_entry"
  };
}

// Supporting interfaces
export interface DayHours {
  isClosed: boolean;
  openTime?: string;                         // "09:00" in 24h format
  closeTime?: string;                        // "17:00" in 24h format
  breaks?: Array<{                           // Lunch breaks, etc.
    start: string;
    end: string;
  }>;
}

export interface ServiceOffering {
  id: string;
  name: string;
  description?: string;
  category?: string;
  duration?: number;                         // Minutes
  price?: number;
  priceRange?: { min: number; max: number };
  priceUnit?: 'fixed' | 'per_hour' | 'per_item' | 'per_person' | 'custom';
  currency?: string;
  availability?: 'always' | 'seasonal' | 'appointment_only' | 'limited';
  providedBy?: string[];                     // Staff member IDs who can provide this service
  tags?: string[];
  popularity?: 'popular' | 'new' | 'featured' | 'standard';
  requiresConsultation?: boolean;
}

export interface ProductOffering {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  priceRange?: { min: number; max: number };
  currency?: string;
  quantity?: number;                         // Stock level
  unit?: string;                             // "each", "lb", "oz", "kg"
  sku?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'made_to_order' | 'seasonal';
  tags?: string[];
  allergens?: string[];
  ingredients?: string[];
  popularity?: 'bestseller' | 'new' | 'featured' | 'standard';
}

export interface PackageOffering {
  id: string;
  name: string;
  description?: string;
  includedServices?: string[];               // Service IDs
  includedProducts?: string[];               // Product IDs
  price: number;
  savings?: string;                          // "Save $50" or "20% off"
  duration?: number;                         // Total duration in minutes
  validity?: string;                         // "Valid for 6 months"
  terms?: string;
}

// ============================================================================
// INDUSTRY-SPECIFIC MODULES (Optional/Pluggable)
// ============================================================================

/**
 * These modules are activated based on the industry type detected.
 * Only relevant modules are populated during extraction.
 */

export interface IndustryModules {
  // === FOOD & BEVERAGE MODULE ===
  restaurant?: {
    cuisine?: string[];                      // ["Italian", "Mediterranean"]
    menuSections?: Array<{
      name: string;
      description?: string;
      items: MenuItem[];
    }>;
    dietaryOptions?: {
      vegetarian?: boolean;
      vegan?: boolean;
      glutenFree?: boolean;
      halal?: boolean;
      kosher?: boolean;
      nutFree?: boolean;
      dairyFree?: boolean;
    };
    serviceStyles?: Array<'dine_in' | 'takeout' | 'delivery' | 'catering' | 'drive_thru' | 'buffet' | 'counter_service'>;
    reservations?: {
      accepted: boolean;
      requiredForPartySize?: number;
      maxPartySize?: number;
      averageWaitTime?: string;
    };
    delivery?: {
      ownDelivery?: boolean;
      thirdPartyPartners?: string[];         // "DoorDash", "Uber Eats"
      deliveryFee?: string;
      minimumOrder?: number;
      deliveryRadius?: number;
      estimatedTime?: string;
    };
    alcohol?: {
      served: boolean;
      types?: Array<'beer' | 'wine' | 'spirits' | 'cocktails'>;
      happyHour?: {
        available: boolean;
        schedule?: string;
        details?: string;
      };
      bringYourOwn?: boolean;
      corkageFee?: string;
    };
    seating?: {
      capacity?: number;
      tableTypes?: Array<'two_top' | 'four_top' | 'booth' | 'bar' | 'outdoor' | 'private_room'>;
      outdoorSeating?: boolean;
      barSeating?: boolean;
      privateRooms?: boolean;
    };
    specialEvents?: {
      catering?: boolean;
      privateEvents?: boolean;
      liveMusic?: boolean;
      triviaNight?: boolean;
      customEventInfo?: string[];
    };
  };

  // === BEAUTY & PERSONAL CARE MODULE ===
  beauty?: {
    services?: Array<{
      category: 'hair' | 'nails' | 'skin' | 'massage' | 'spa' | 'barber' | 'waxing' | 'makeup' | 'other';
      subcategory?: string;                  // "Hair Color", "Manicure", "Facial"
      name: string;
      duration: number;
      price: number | { min: number; max: number };
      description?: string;
      addOns?: Array<{
        name: string;
        price: number;
        duration?: number;
      }>;
    }>;
    specialties?: string[];                  // "Balayage Expert", "Acrylic Nails", "Brazilian Blowout"
    productsUsed?: string[];                 // Brands: "Olaplex", "OPI", "Redken"
    retailProducts?: boolean;                // Sells products to take home
    consultationRequired?: boolean;
    patchTestRequired?: boolean;
    membershipProgram?: {
      available: boolean;
      tiers?: Array<{
        name: string;
        monthlyFee: number;
        benefits: string[];
      }>;
    };
  };

  // === HEALTHCARE & MEDICAL MODULE ===
  healthcare?: {
    practiceType?: 'general_practice' | 'specialist' | 'urgent_care' | 'dental' | 'vision' | 'mental_health' | 'physical_therapy' | 'chiropractic' | 'veterinary';
    specialties?: string[];                  // "Cardiology", "Pediatrics", "Orthodontics"
    providers?: Array<{
      name: string;
      credentials: string;                   // "MD", "DDS", "DVM", "PT", etc.
      specialty?: string;
      acceptingNewPatients: boolean;
      languages?: string[];
    }>;
    insuranceAccepted?: {
      acceptsInsurance: boolean;
      providers?: string[];                  // "Blue Cross", "Aetna", "Medicare"
      verifyBeforeVisit?: boolean;
    };
    emergencyServices?: boolean;
    telehealth?: {
      available: boolean;
      platforms?: string[];                  // "Zoom", "Doxy.me"
      states?: string[];                     // States where provider is licensed
    };
    prescriptionServices?: boolean;
    labServicesOnsite?: boolean;
    parkingValidation?: boolean;
    hipaaCompliant?: boolean;
    covidPrecautions?: string[];
  };

  // === HOSPITALITY MODULE (Hotels, Resorts, B&Bs) ===
  hospitality?: {
    propertyType?: 'hotel' | 'resort' | 'motel' | 'bnb' | 'hostel' | 'vacation_rental' | 'inn';
    starRating?: number;                     // 1-5 stars
    totalRooms?: number;
    roomTypes?: Array<{
      name: string;                          // "King Suite", "Double Queen", "Presidential"
      capacity: number;                      // Max occupants
      beds?: string;                         // "1 King" or "2 Queens"
      size?: number;                         // Square feet
      pricePerNight?: { min: number; max: number };
      amenities?: string[];                  // "Mini bar", "Balcony", "Ocean view"
      available?: number;                    // Current availability
    }>;
    checkInTime: string;                     // "15:00"
    checkOutTime: string;                    // "11:00"
    earlyCheckIn?: {
      available: boolean;
      fee?: number;
    };
    lateCheckOut?: {
      available: boolean;
      fee?: number;
    };
    amenities?: {
      wifi?: boolean;
      parking?: boolean | 'paid' | 'free' | 'valet';
      pool?: boolean;
      gym?: boolean;
      spa?: boolean;
      restaurant?: boolean;
      roomService?: boolean;
      laundry?: boolean;
      businessCenter?: boolean;
      petFriendly?: boolean;
      airportShuttle?: boolean;
      concierge?: boolean;
      custom?: string[];
    };
    seasonalPricing?: boolean;
    bookingPlatforms?: string[];             // "Booking.com", "Expedia", "Airbnb"
    minimumStayNights?: number;
    cancellationPolicy?: string;
  };

  // === AUTOMOTIVE MODULE (Auto Repair, Detailing, Sales) ===
  automotive?: {
    serviceType?: 'repair' | 'maintenance' | 'detailing' | 'body_shop' | 'dealership' | 'towing' | 'inspection';
    specialties?: string[];                  // "European Cars", "Diesel Engines", "Transmissions"
    services?: Array<{
      name: string;
      category: 'engine' | 'transmission' | 'brakes' | 'electrical' | 'tires' | 'body' | 'detailing' | 'other';
      estimatedTime?: string;
      priceRange?: { min: number; max: number };
      description?: string;
    }>;
    brandsServiced?: string[];               // "Honda", "Toyota", "BMW"
    partsSource?: Array<'OEM' | 'aftermarket' | 'used' | 'refurbished'>;
    warrantyOffered?: {
      available: boolean;
      duration?: string;
      coverage?: string;
    };
    loaner?: {
      vehiclesAvailable: boolean;
      fee?: number;
      reservationRequired?: boolean;
    };
    shuttleService?: boolean;
    waitingArea?: {
      available: boolean;
      amenities?: string[];                  // "WiFi", "Coffee", "TV"
    };
    inspectionCertified?: boolean;
    towingService?: boolean;
    mobileService?: boolean;
  };

  // === PROFESSIONAL SERVICES MODULE (Legal, Accounting, Consulting) ===
  professional?: {
    serviceType?: 'legal' | 'accounting' | 'consulting' | 'marketing' | 'hr' | 'it' | 'architecture' | 'engineering' | 'real_estate';
    practiceAreas?: string[];                // "Family Law", "Tax Planning", "Brand Strategy"
    professionals?: Array<{
      name: string;
      title: string;
      credentials?: string[];                // "CPA", "JD", "MBA"
      yearsExperience?: number;
      bio?: string;
      specializations?: string[];
    }>;
    consultationOffered?: {
      free: boolean;
      duration?: number;
      virtual?: boolean;
    };
    billingStructure?: {
      type: 'hourly' | 'flat_fee' | 'retainer' | 'contingency' | 'value_based';
      hourlyRate?: number | { min: number; max: number };
      retainerFee?: number;
      details?: string;
    };
    clientTypes?: Array<'individual' | 'small_business' | 'enterprise' | 'nonprofit'>;
    industryFocus?: string[];                // Industries served
    languages?: string[];
    virtualServices?: boolean;
    documentsRequired?: string[];
  };

  // === FITNESS & WELLNESS MODULE ===
  fitness?: {
    facilityType?: 'gym' | 'yoga_studio' | 'pilates' | 'crossfit' | 'martial_arts' | 'dance' | 'climbing' | 'pool';
    classesCourses?: Array<{
      name: string;
      type: string;                          // "Yoga", "Spin", "HIIT", "Boxing"
      instructor?: string;
      duration: number;
      level?: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
      maxCapacity?: number;
      schedule?: string;
      dropInAllowed?: boolean;
      price?: number;
    }>;
    membership?: {
      required: boolean;
      tiers?: Array<{
        name: string;
        monthlyFee: number;
        commitmentMonths?: number;
        benefits: string[];
      }>;
      dayPassAvailable?: boolean;
      dayPassPrice?: number;
    };
    personalTraining?: {
      available: boolean;
      sessionPrice?: number;
      packageDeals?: Array<{
        sessions: number;
        price: number;
      }>;
    };
    amenities?: {
      showers?: boolean;
      lockers?: boolean;
      towels?: boolean;
      childcare?: boolean;
      cafe?: boolean;
      proShop?: boolean;
    };
    equipment?: string[];
    ageRestrictions?: string;
    firstVisitFree?: boolean;
  };

  // === RETAIL MODULE ===
  retail?: {
    storeType?: 'boutique' | 'department' | 'specialty' | 'online' | 'pop_up' | 'chain';
    productCategories?: string[];            // "Clothing", "Electronics", "Home Goods"
    brands?: string[];                       // Brands carried
    pricePoint?: 'budget' | 'mid_range' | 'premium' | 'luxury';
    returns?: {
      allowed: boolean;
      timeLimitDays?: number;
      requiresReceipt?: boolean;
      refundMethod?: Array<'original_payment' | 'store_credit' | 'exchange_only'>;
      restockingFee?: number;
    };
    loyaltyProgram?: {
      available: boolean;
      name?: string;
      pointsSystem?: string;
      benefits?: string[];
      signupBonus?: string;
    };
    alterations?: boolean;
    personalShopping?: boolean;
    curbsidePickup?: boolean;
    sameDay?: boolean;
    giftWrapping?: boolean;
  };

  // === EDUCATION MODULE (Tutoring, Classes, Training) ===
  education?: {
    educationType?: 'tutoring' | 'language' | 'music' | 'art' | 'test_prep' | 'stem' | 'professional_development';
    subjects?: string[];
    ageGroups?: string[];                    // "K-5", "High School", "Adult"
    classFormats?: Array<'one_on_one' | 'small_group' | 'large_group' | 'online' | 'hybrid'>;
    instructors?: Array<{
      name: string;
      qualifications: string[];
      subjects: string[];
      yearsExperience?: number;
    }>;
    pricing?: {
      perSession?: number;
      perMonth?: number;
      packageDeals?: Array<{
        sessions: number;
        price: number;
      }>;
    };
    materialsFee?: number;
    materialsIncluded?: boolean;
    assessmentOffered?: boolean;
    certificationOffered?: boolean;
    progressTracking?: boolean;
  };

  // === HOME SERVICES MODULE (Cleaning, Landscaping, Repair) ===
  homeServices?: {
    serviceType?: 'cleaning' | 'landscaping' | 'hvac' | 'plumbing' | 'electrical' | 'roofing' | 'painting' | 'pest_control' | 'moving';
    servicesOffered?: string[];
    emergencyService?: {
      available: boolean;
      availability247?: boolean;
      emergencyFee?: number;
    };
    licensed?: boolean;
    bonded?: boolean;
    insured?: boolean;
    backgroundChecked?: boolean;
    estimatesProvided?: {
      free: boolean;
      virtual?: boolean;
      required?: boolean;
    };
    guaranteeWarranty?: {
      offered: boolean;
      duration?: string;
      coverage?: string;
    };
    serviceArea?: {
      radiusMiles?: number;
      zipcodes?: string[];
    };
    equipmentProvided?: boolean;
    contractsAvailable?: {
      monthly?: boolean;
      seasonal?: boolean;
      annual?: boolean;
    };
  };

  // === PET SERVICES MODULE (Veterinary, Grooming, Boarding) ===
  petServices?: {
    serviceType?: 'veterinary' | 'grooming' | 'boarding' | 'daycare' | 'training' | 'sitting' | 'walking';
    speciesServed?: Array<'dogs' | 'cats' | 'birds' | 'exotic' | 'reptiles' | 'small_animals'>;
    services?: string[];
    sizeRestrictions?: {
      minWeight?: number;
      maxWeight?: number;
    };
    breedRestrictions?: string[];
    vaccinationsRequired?: string[];
    emergencyServices?: boolean;
    dropOffPickUp?: boolean;
    pickupDelivery?: boolean;
    webcams?: boolean;                       // For boarding/daycare
    playAreaSize?: string;
    certifications?: string[];
  };

  // EXTENSIBLE: Add more industry modules as needed
  [key: string]: any;
}

// ============================================================================
// FULL EXTRACTION TEMPLATE (Core + Modules)
// ============================================================================

export interface FlexibleBusinessTemplate {
  core: UniversalBusinessCore;
  industryModules: IndustryModules;
  extractionMetadata: {
    detectedIndustry: string;
    activeModules: string[];                 // Which modules were populated
    confidence: number;                      // 0-100 confidence in extraction accuracy
    extractionMethod: 'google_maps' | 'website_scrape' | 'manual_input' | 'api' | 'ai_analysis' | 'hybrid';
    extractionTimestamp: string;
    dataSources: string[];
  };
}

// ============================================================================
// FORMATTED OUTPUT TEMPLATE
// ============================================================================

export interface MenuItem {
  name: string;
  description?: string;
  price?: string | { min: string; max: string };
  category?: string;
  allergens?: string[];
  dietary?: string[];                        // "Vegan", "Gluten-free"
  spiceLevel?: number;                       // 1-5
  calories?: number;
  popular?: boolean;
}

/**
 * Generates a human-readable, formatted template from extracted data
 * Suitable for display, AI training, or knowledge base creation
 */
export class BusinessTemplateFormatter {
  static formatToText(data: FlexibleBusinessTemplate): string {
    const { core, industryModules, extractionMetadata } = data;
    let output = '';

    // Header
    output += `╔════════════════════════════════════════════════════════════════════╗\n`;
    output += `║  BUSINESS INFORMATION TEMPLATE                                     ║\n`;
    output += `║  Industry: ${core.identity.industry.padEnd(55)}║\n`;
    output += `╚════════════════════════════════════════════════════════════════════╝\n\n`;

    // === CORE FIELDS ===
    output += `🏢 BUSINESS IDENTITY\n`;
    output += `${'─'.repeat(70)}\n`;
    output += `Business Name: ${core.identity.businessName}\n`;
    if (core.identity.legalEntityName) output += `Legal Name: ${core.identity.legalEntityName}\n`;
    if (core.identity.dba) output += `DBA: ${core.identity.dba}\n`;
    output += `Industry: ${core.identity.industry}`;
    if (core.identity.subIndustry) output += ` > ${core.identity.subIndustry}`;
    output += `\n`;
    output += `Business Type: ${core.identity.businessType.replace(/_/g, ' ').toUpperCase()}\n`;
    if (core.identity.founded) output += `Established: ${core.identity.founded}\n`;
    output += `\n`;

    // Contact Info
    output += `📞 CONTACT INFORMATION\n`;
    output += `${'─'.repeat(70)}\n`;
    output += `Phone: ${core.contact.primaryPhone}\n`;
    if (core.contact.secondaryPhone) output += `Secondary Phone: ${core.contact.secondaryPhone}\n`;
    output += `Email: ${core.contact.primaryEmail}\n`;
    if (core.contact.website) output += `Website: ${core.contact.website}\n`;
    if (core.contact.socialMedia) {
      const social = core.contact.socialMedia;
      const links = [];
      if (social.facebook) links.push(`Facebook: ${social.facebook}`);
      if (social.instagram) links.push(`Instagram: ${social.instagram}`);
      if (social.twitter) links.push(`Twitter: ${social.twitter}`);
      if (links.length > 0) {
        output += `Social Media:\n`;
        links.forEach(link => output += `  • ${link}\n`);
      }
    }
    output += `\n`;

    // Location
    output += `📍 LOCATION & ACCESSIBILITY\n`;
    output += `${'─'.repeat(70)}\n`;
    const addr = core.location.primaryAddress;
    output += `${addr.street}\n`;
    if (addr.street2) output += `${addr.street2}\n`;
    output += `${addr.city}, ${addr.state} ${addr.postalCode}\n`;
    output += `${addr.country}\n`;
    if (core.location.accessibility.parkingAvailable) {
      output += `Parking: ${core.location.accessibility.parkingType || 'Available'}\n`;
    }
    if (core.location.accessibility.wheelchairAccessible) {
      output += `♿ Wheelchair Accessible\n`;
    }
    output += `\n`;

    // Hours
    output += `🕐 OPERATING HOURS (${core.hours.timezone})\n`;
    output += `${'─'.repeat(70)}\n`;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const dayHours = core.hours.regularHours[day as keyof typeof core.hours.regularHours];
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      if (dayHours.isClosed) {
        output += `${dayName.padEnd(12)}: CLOSED\n`;
      } else {
        output += `${dayName.padEnd(12)}: ${dayHours.openTime} - ${dayHours.closeTime}\n`;
      }
    });
    if (core.hours.appointmentOnly) {
      output += `\n⚠️  Appointment Only - Walk-ins Not Accepted\n`;
    } else if (core.hours.walkInsAccepted) {
      output += `\n✓ Walk-ins Welcome\n`;
    }
    output += `\n`;

    // Services/Products
    if (core.offerings.services && core.offerings.services.length > 0) {
      output += `⚙️  SERVICES OFFERED\n`;
      output += `${'─'.repeat(70)}\n`;
      core.offerings.services.slice(0, 10).forEach(service => {
        output += `• ${service.name}`;
        if (service.price) output += ` - ${core.pricing.currency}${service.price}`;
        if (service.duration) output += ` (${service.duration} min)`;
        output += `\n`;
        if (service.description) output += `  ${service.description}\n`;
      });
      if (core.offerings.services.length > 10) {
        output += `... and ${core.offerings.services.length - 10} more\n`;
      }
      output += `\n`;
    }

    if (core.offerings.products && core.offerings.products.length > 0) {
      output += `🛍️  PRODUCTS\n`;
      output += `${'─'.repeat(70)}\n`;
      core.offerings.products.slice(0, 10).forEach(product => {
        output += `• ${product.name}`;
        if (product.price) output += ` - ${core.pricing.currency}${product.price}`;
        output += `\n`;
      });
      if (core.offerings.products.length > 10) {
        output += `... and ${core.offerings.products.length - 10} more\n`;
      }
      output += `\n`;
    }

    // Payment
    output += `💳 PAYMENT & PRICING\n`;
    output += `${'─'.repeat(70)}\n`;
    output += `Currency: ${core.pricing.currency}\n`;
    if (core.pricing.priceLevel) {
      output += `Price Level: ${'$'.repeat(core.pricing.priceLevel)}\n`;
    }
    const payments = [];
    if (core.pricing.paymentMethods.cash) payments.push('Cash');
    if (core.pricing.paymentMethods.creditCards) {
      const cards = core.pricing.paymentMethods.acceptedCards?.join(', ').toUpperCase() || 'All major cards';
      payments.push(cards);
    }
    if (core.pricing.paymentMethods.digitalWallets) {
      payments.push(...core.pricing.paymentMethods.digitalWallets.map(w =>
        w.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      ));
    }
    if (payments.length > 0) {
      output += `Accepted: ${payments.join(', ')}\n`;
    }
    output += `\n`;

    // Policies
    if (core.policies.booking || core.policies.cancellation) {
      output += `📋 BOOKING & POLICIES\n`;
      output += `${'─'.repeat(70)}\n`;
      if (core.policies.booking) {
        output += `Booking Methods: ${core.policies.booking.methodsAccepted.join(', ')}\n`;
        if (core.policies.booking.onlineBookingUrl) {
          output += `Book Online: ${core.policies.booking.onlineBookingUrl}\n`;
        }
        if (core.policies.booking.requiresDeposit) {
          output += `Deposit Required: ${core.policies.booking.depositAmount}\n`;
        }
      }
      if (core.policies.cancellation) {
        output += `\nCancellation Policy:\n${core.policies.cancellation.policy}\n`;
        if (core.policies.cancellation.noticePeriodHours) {
          output += `Free cancellation up to ${core.policies.cancellation.noticePeriodHours} hours before appointment\n`;
        }
      }
      output += `\n`;
    }

    // Communication
    output += `💬 COMMUNICATION\n`;
    output += `${'─'.repeat(70)}\n`;
    output += `Preferred Channels: ${core.communication.preferredChannels.join(', ')}\n`;
    if (core.communication.appointmentReminders?.enabled) {
      output += `Appointment Reminders: ${core.communication.appointmentReminders.methods?.join(', ')}\n`;
    }
    if (core.communication.preferredLanguages && core.communication.preferredLanguages.length > 0) {
      output += `Languages: ${core.communication.preferredLanguages.join(', ')}\n`;
    }
    output += `\n`;

    // === INDUSTRY-SPECIFIC MODULES ===
    if (extractionMetadata.activeModules.includes('restaurant') && industryModules.restaurant) {
      output += `\n`;
      output += `🍽️  RESTAURANT-SPECIFIC INFORMATION\n`;
      output += `${'═'.repeat(70)}\n`;
      const rest = industryModules.restaurant;

      if (rest.cuisine) output += `Cuisine: ${rest.cuisine.join(', ')}\n`;
      if (rest.serviceStyles) output += `Service: ${rest.serviceStyles.join(', ')}\n`;

      if (rest.dietaryOptions) {
        const dietary = [];
        if (rest.dietaryOptions.vegetarian) dietary.push('Vegetarian');
        if (rest.dietaryOptions.vegan) dietary.push('Vegan');
        if (rest.dietaryOptions.glutenFree) dietary.push('Gluten-free');
        if (rest.dietaryOptions.halal) dietary.push('Halal');
        if (rest.dietaryOptions.kosher) dietary.push('Kosher');
        if (dietary.length > 0) output += `Dietary Options: ${dietary.join(', ')}\n`;
      }

      if (rest.reservations) {
        output += `\nReservations: ${rest.reservations.accepted ? 'Accepted' : 'Not accepted'}\n`;
        if (rest.reservations.maxPartySize) {
          output += `Max Party Size: ${rest.reservations.maxPartySize}\n`;
        }
      }

      if (rest.delivery) {
        output += `\nDelivery Options:\n`;
        if (rest.delivery.ownDelivery) output += `  • In-house delivery\n`;
        if (rest.delivery.thirdPartyPartners && rest.delivery.thirdPartyPartners.length > 0) {
          output += `  • Partners: ${rest.delivery.thirdPartyPartners.join(', ')}\n`;
        }
        if (rest.delivery.minimumOrder) {
          output += `  • Minimum Order: ${core.pricing.currency}${rest.delivery.minimumOrder}\n`;
        }
      }

      if (rest.menuSections && rest.menuSections.length > 0) {
        output += `\nMenu Highlights:\n`;
        rest.menuSections.slice(0, 3).forEach(section => {
          output += `  ${section.name}:\n`;
          section.items.slice(0, 3).forEach(item => {
            output += `    • ${item.name}`;
            if (item.price) output += ` - ${item.price}`;
            output += `\n`;
          });
        });
      }
      output += `\n`;
    }

    if (extractionMetadata.activeModules.includes('beauty') && industryModules.beauty) {
      output += `\n`;
      output += `💅 BEAUTY & PERSONAL CARE INFORMATION\n`;
      output += `${'═'.repeat(70)}\n`;
      const beauty = industryModules.beauty;

      if (beauty.specialties && beauty.specialties.length > 0) {
        output += `Specialties: ${beauty.specialties.join(', ')}\n`;
      }

      if (beauty.services && beauty.services.length > 0) {
        output += `\nServices:\n`;
        beauty.services.forEach(service => {
          output += `  • ${service.name} (${service.duration} min)`;
          if (typeof service.price === 'number') {
            output += ` - ${core.pricing.currency}${service.price}`;
          } else if (service.price) {
            output += ` - ${core.pricing.currency}${service.price.min}-${service.price.max}`;
          }
          output += `\n`;
          if (service.addOns && service.addOns.length > 0) {
            output += `    Add-ons: ${service.addOns.map(a => `${a.name} (+$${a.price})`).join(', ')}\n`;
          }
        });
      }

      if (beauty.consultationRequired) {
        output += `\n⚠️  Consultation required for new clients\n`;
      }
      output += `\n`;
    }

    if (extractionMetadata.activeModules.includes('healthcare') && industryModules.healthcare) {
      output += `\n`;
      output += `🏥 HEALTHCARE INFORMATION\n`;
      output += `${'═'.repeat(70)}\n`;
      const health = industryModules.healthcare;

      output += `Practice Type: ${health.practiceType?.replace(/_/g, ' ').toUpperCase()}\n`;

      if (health.specialties && health.specialties.length > 0) {
        output += `Specialties: ${health.specialties.join(', ')}\n`;
      }

      if (health.providers && health.providers.length > 0) {
        output += `\nProviders:\n`;
        health.providers.forEach(provider => {
          output += `  • ${provider.name}, ${provider.credentials}`;
          if (provider.specialty) output += ` - ${provider.specialty}`;
          output += `\n`;
          output += `    Accepting New Patients: ${provider.acceptingNewPatients ? 'Yes' : 'No'}\n`;
        });
      }

      if (health.insuranceAccepted) {
        output += `\nInsurance: ${health.insuranceAccepted.acceptsInsurance ? 'Accepted' : 'Not accepted'}\n`;
        if (health.insuranceAccepted.providers && health.insuranceAccepted.providers.length > 0) {
          output += `Providers: ${health.insuranceAccepted.providers.join(', ')}\n`;
        }
      }

      if (health.telehealth?.available) {
        output += `\n📱 Telehealth Available\n`;
      }

      if (health.hipaaCompliant) {
        output += `\n✓ HIPAA Compliant\n`;
      }
      output += `\n`;
    }

    if (extractionMetadata.activeModules.includes('hospitality') && industryModules.hospitality) {
      output += `\n`;
      output += `🏨 HOSPITALITY INFORMATION\n`;
      output += `${'═'.repeat(70)}\n`;
      const hotel = industryModules.hospitality;

      output += `Property Type: ${hotel.propertyType?.toUpperCase()}\n`;
      if (hotel.starRating) output += `Rating: ${'⭐'.repeat(hotel.starRating)}\n`;
      if (hotel.totalRooms) output += `Total Rooms: ${hotel.totalRooms}\n`;

      output += `\nCheck-in: ${hotel.checkInTime}\n`;
      output += `Check-out: ${hotel.checkOutTime}\n`;

      if (hotel.roomTypes && hotel.roomTypes.length > 0) {
        output += `\nRoom Types:\n`;
        hotel.roomTypes.forEach(room => {
          output += `  • ${room.name} - Sleeps ${room.capacity}`;
          if (room.pricePerNight) {
            output += ` ($${room.pricePerNight.min}-${room.pricePerNight.max}/night)`;
          }
          output += `\n`;
        });
      }

      if (hotel.amenities) {
        const amenityList = [];
        if (hotel.amenities.wifi) amenityList.push('WiFi');
        if (hotel.amenities.pool) amenityList.push('Pool');
        if (hotel.amenities.gym) amenityList.push('Gym');
        if (hotel.amenities.spa) amenityList.push('Spa');
        if (hotel.amenities.restaurant) amenityList.push('Restaurant');
        if (hotel.amenities.parking) amenityList.push(`Parking (${hotel.amenities.parking === true ? 'available' : hotel.amenities.parking})`);
        if (amenityList.length > 0) {
          output += `\nAmenities: ${amenityList.join(', ')}\n`;
        }
      }
      output += `\n`;
    }

    // Footer
    output += `\n`;
    output += `${'═'.repeat(70)}\n`;
    output += `Extraction Info:\n`;
    output += `  Method: ${extractionMetadata.extractionMethod}\n`;
    output += `  Confidence: ${extractionMetadata.confidence}%\n`;
    output += `  Active Modules: ${extractionMetadata.activeModules.join(', ')}\n`;
    output += `  Last Updated: ${new Date(extractionMetadata.extractionTimestamp).toLocaleString()}\n`;
    output += `${'═'.repeat(70)}\n`;

    return output;
  }

  /**
   * Convert to JSON format optimized for AI knowledge bases
   */
  static formatForAI(data: FlexibleBusinessTemplate): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Convert to markdown format for documentation
   */
  static formatToMarkdown(data: FlexibleBusinessTemplate): string {
    // Similar structure to formatToText but with markdown syntax
    // Implementation left as exercise - would use ## headers, **bold**, bullet lists, etc.
    return this.formatToText(data);
  }
}

export default FlexibleBusinessTemplate;
