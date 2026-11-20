import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

export interface EnhancedBusinessProfile {
  // Basic Info
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  
  // Google Maps Data
  placeId: string;
  rating: number;
  totalReviews: number;
  priceLevel?: number; // 1-4 scale ($, $$, $$$, $$$$)
  hours: BusinessHours;
  popularTimes?: PopularTime[];
  reviews: Review[];
  photos?: string[];
  
  // Website Extracted Data
  menu: MenuSection[];
  specialties: string[];
  promotions: Promotion[];
  reservationInfo: ReservationInfo;
  deliveryInfo: DeliveryInfo;
  aboutInfo: AboutInfo;
  atmosphere: AtmosphereInfo;
  
  // Enhanced Website Data
  awards?: AwardsInfo;
  socialMedia?: SocialMediaInfo;
  staffInfo?: StaffInfo;
  nutritionalInfo?: NutritionalInfo;
  sustainabilityInfo?: SustainabilityInfo;
  businessPolicies?: BusinessPolicies;
  customerTestimonials?: CustomerTestimonial[];
  partnershipInfo?: PartnershipInfo;
  eventInfo?: EventInfo;
  loyalty?: LoyaltyProgramInfo;
  serviceOfferings?: ServiceOfferings;
  dailySpecials?: DailySpecial[];
  seasonalMenu?: SeasonalMenuInfo;
  structuredData?: any;
  
  // Derived Data
  industry: string;
  priceRange: string;
  cuisine?: string;
  tags: string[];
  
  // Metadata
  lastUpdated: Date;
  dataQuality: number; // 0-100 score
  websiteLastScraped?: Date;
}

export interface BusinessHours {
  weeklyHours: WeeklyHour[];
  specialHours?: SpecialHour[];
  isOpen: boolean;
  nextOpenTime?: string;
  nextCloseTime?: string;
}

export interface WeeklyHour {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface SpecialHour {
  date: string;
  description: string;
  hours?: string;
  isClosed: boolean;
}

export interface PopularTime {
  day: string;
  hourlyData: number[]; // 24 hour array, values 0-100
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: Date;
  helpful?: boolean;
  responseFromOwner?: string;
}

export interface MenuSection {
  name: string;
  description?: string;
  items: MenuItem[];
}

export interface MenuItem {
  name: string;
  description?: string;
  price?: string;
  category: string;
  tags?: string[]; // vegetarian, spicy, gluten-free, etc.
  allergens?: string[];
  ingredients?: string[];
  isPopular?: boolean;
  isNew?: boolean;
  isAvailable?: boolean;
  calories?: number;
  spiceLevel?: string;
}

export interface Promotion {
  title: string;
  description: string;
  validUntil?: Date;
  terms?: string;
  discountAmount?: string;
  dayOfWeek?: string;
}

export interface ReservationInfo {
  acceptsReservations: boolean;
  onlineBookingUrl?: string;
  phoneReservations: boolean;
  walkInsAccepted: boolean;
  waitTime?: string;
  partySize?: {min: number, max: number};
}

export interface DeliveryInfo {
  hasDelivery: boolean;
  hasTakeout: boolean;
  deliveryPartners: string[];
  deliveryFee?: string;
  minimumOrder?: string;
  estimatedTime?: string;
  deliveryRadius?: string;
}

export interface AboutInfo {
  story: string;
  established?: number;
  ownerInfo?: string;
  mission?: string;
  awards?: string[];
  uniqueFeatures: string[];
}

export interface AtmosphereInfo {
  ambiance: string[];
  dressCode?: string;
  noiseLevel?: string;
  goodFor: string[]; // date night, family, business, groups
  hasParking: boolean;
  wheelchairAccessible?: boolean;
  wifi?: boolean;
  outdoorSeating?: boolean;
}

// New enhanced data interfaces
export interface AwardsInfo {
  awards: Award[];
  certifications: Certification[];
}

export interface Award {
  title: string;
  year?: number;
  organization?: string;
}

export interface Certification {
  title: string;
  issuer?: string;
  validUntil?: Date;
}

export interface SocialMediaInfo {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
}

export interface StaffInfo {
  staff: StaffMember[];
  chefInfo: ChefInfo;
}

export interface StaffMember {
  name: string;
  title: string;
  bio: string;
  isChef: boolean;
}

export interface ChefInfo {
  head?: StaffMember;
}

export interface NutritionalInfo {
  hasCalorieInfo: boolean;
  averageCalories?: number;
  commonAllergens: string[];
  dietaryOptions: DietaryOptions;
}

export interface DietaryOptions {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  keto: boolean;
  lowCarb: boolean;
}

export interface SustainabilityInfo {
  sustainable: boolean;
  localSourcing: boolean;
  organic: boolean;
  recycling: boolean;
  energyEfficient: boolean;
  wasteReduction: boolean;
}

export interface BusinessPolicies {
  cancellationPolicy?: string;
  refundPolicy?: string;
  dresscode?: string;
  ageRestrictions?: string;
  petPolicy?: string;
  smokingPolicy?: string;
  groupBookingPolicy?: string;
}

export interface CustomerTestimonial {
  text: string;
  author: string;
  rating?: number;
}

export interface PartnershipInfo {
  partnerships: Partnership[];
  suppliers: string[];
  distributors: string[];
}

export interface Partnership {
  type: string;
  description: string;
}

export interface EventInfo {
  events: BusinessEvent[];
  privateEvents: boolean;
  liveMusic: boolean;
}

export interface BusinessEvent {
  title: string;
  description: string;
  date?: Date;
  recurring: boolean;
}

export interface LoyaltyProgramInfo {
  hasLoyaltyProgram: boolean;
  programName?: string;
  benefits: string[];
  signupMethod?: string;
}

export interface ServiceOfferings {
  catering: CateringInfo;
  mobileOrdering: MobileOrderingInfo;
  driveThru: DriveThruInfo;
  delivery: EnhancedDeliveryInfo;
  takeout: boolean;
  dineIn: boolean;
  curbside: boolean;
}

export interface CateringInfo {
  available: boolean;
  details?: {
    minimumOrder?: string;
    advanceNotice?: string;
  };
}

export interface MobileOrderingInfo {
  available: boolean;
  appName?: string;
}

export interface DriveThruInfo {
  available: boolean;
  hours?: string;
}

export interface EnhancedDeliveryInfo {
  available: boolean;
  partners: string[];
  fee?: string;
  radius?: string;
  minimumOrder?: string;
}

export interface DailySpecial {
  title: string;
  description: string;
  dayOfWeek?: string;
  timeRange?: string;
  discount?: string;
}

export interface SeasonalMenuInfo {
  hasSeasonalMenu: boolean;
  currentSeason?: string;
  seasonalItems: string[];
}

export class EnhancedBusinessExtractor {
  private googleMapsApiKey: string;
  
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  async extractComprehensiveBusinessProfile(searchQuery: string): Promise<EnhancedBusinessProfile> {
    console.log(`🔍 Extracting comprehensive profile for: ${searchQuery}`);
    
    try {
      // Step 1: Get Google Maps data
      const googleData = await this.extractGoogleMapsData(searchQuery);
      
      // Step 2: Extract website data
      let websiteData = {};
      if (googleData.website) {
        websiteData = await this.extractWebsiteData(googleData.website);
      }
      
      // Step 3: Fuse and enhance data
      const profile = await this.fuseBusinessData(googleData, websiteData);
      
      console.log(`✅ Successfully extracted comprehensive profile for: ${profile.name}`);
      return profile;
      
    } catch (error) {
      console.error(`❌ Error extracting business profile: ${error}`);
      throw new Error(`Failed to extract business profile: ${error}`);
    }
  }

  private async extractGoogleMapsData(searchQuery: string): Promise<any> {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    console.log(`📍 Searching Google Places for: ${searchQuery}`);

    // Step 1: Find place
    const searchResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?` +
      `input=${encodeURIComponent(searchQuery)}&` +
      `inputtype=textquery&` +
      `fields=place_id,name,formatted_address&` +
      `key=${this.googleMapsApiKey}`
    );

    const searchData = await searchResponse.json();
    
    if (!searchData.candidates || searchData.candidates.length === 0) {
      throw new Error(`No business found for: ${searchQuery}`);
    }

    const place = searchData.candidates[0];
    console.log(`🏢 Found place: ${place.name}`);

    // Step 2: Get detailed information with ALL available fields
    const detailsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${place.place_id}&` +
      `fields=` + [
        'name', 'formatted_address', 'address_components', 'formatted_phone_number', 'international_phone_number',
        'website', 'rating', 'user_ratings_total', 'price_level', 'opening_hours',
        'reviews', 'photos', 'business_status', 'editorial_summary', 'types',
        'vicinity', 'url', 'utc_offset', 'wheelchair_accessible_entrance',
        'delivery', 'takeout', 'reservable', 'serves_breakfast', 'serves_lunch',
        'serves_dinner', 'serves_beer', 'serves_wine', 'serves_vegetarian_food'
      ].join(',') + `&` +
      `key=${this.googleMapsApiKey}`
    );

    const detailsData = await detailsResponse.json();
    
    if (!detailsData.result) {
      throw new Error('Failed to get place details');
    }

    return this.processGoogleMapsData(detailsData.result);
  }

  private processGoogleMapsData(result: any): any {
    const data: any = {
      placeId: result.place_id,
      name: result.name,
      address: result.formatted_address,
      phone: result.formatted_phone_number,
      website: result.website,
      rating: result.rating || 0,
      totalReviews: result.user_ratings_total || 0,
      priceLevel: result.price_level,
    };

    // Process address components for emergency address creation
    if (result.address_components) {
      data.addressComponents = this.parseAddressComponents(result.address_components);
    }

    // Process hours
    if (result.opening_hours) {
      data.hours = this.processOpeningHours(result.opening_hours);
    }

    // Process reviews with enhanced detail
    if (result.reviews) {
      data.reviews = result.reviews.slice(0, 10).map((review: any) => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        date: new Date(review.time * 1000),
        helpful: review.text.length > 100 // Simple heuristic for helpful reviews
      }));
    }

    // Process photos
    if (result.photos) {
      data.photos = result.photos.slice(0, 5).map((photo: any) => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${this.googleMapsApiKey}`
      );
    }

    // Determine cuisine and industry from types
    data.industry = this.determineIndustry(result.types || []);
    data.cuisine = this.determineCuisine(result.types || []);
    
    // Process service attributes
    data.serviceAttributes = {
      delivery: result.delivery || false,
      takeout: result.takeout || false,
      reservable: result.reservable || false,
      serves_breakfast: result.serves_breakfast || false,
      serves_lunch: result.serves_lunch || false,
      serves_dinner: result.serves_dinner || false,
      serves_beer: result.serves_beer || false,
      serves_wine: result.serves_wine || false,
      serves_vegetarian_food: result.serves_vegetarian_food || false,
      wheelchair_accessible: result.wheelchair_accessible_entrance || false
    };

    // Extract story from editorial summary
    if (result.editorial_summary?.overview) {
      data.story = result.editorial_summary.overview;
    }

    return data;
  }

  private parseAddressComponents(components: any[]): any {
    const addressParts: any = {
      streetNumber: '',
      route: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      countryCode: ''
    };

    for (const component of components) {
      const types = component.types || [];
      
      if (types.includes('street_number')) {
        addressParts.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        addressParts.route = component.long_name;
      } else if (types.includes('locality')) {
        addressParts.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        addressParts.state = component.short_name;
      } else if (types.includes('postal_code')) {
        addressParts.postalCode = component.long_name;
      } else if (types.includes('country')) {
        addressParts.country = component.long_name;
        addressParts.countryCode = component.short_name;
      }
    }

    // Combine street number and route for full street address
    addressParts.street = `${addressParts.streetNumber} ${addressParts.route}`.trim();

    return addressParts;
  }

  private processOpeningHours(openingHours: any): BusinessHours {
    const hours: BusinessHours = {
      weeklyHours: [],
      isOpen: openingHours.open_now || false,
      specialHours: []
    };

    if (openingHours.weekday_text) {
      hours.weeklyHours = openingHours.weekday_text.map((dayText: string) => {
        const [day, timeRange] = dayText.split(': ');
        const isClosed = timeRange === 'Closed';
        
        if (isClosed) {
          return { day, open: '', close: '', isClosed: true };
        }

        // Parse time range (e.g., "11:00 AM – 10:00 PM")
        const times = timeRange.split(' – ');
        return {
          day,
          open: times[0] || '',
          close: times[1] || '',
          isClosed: false
        };
      });
    }

    return hours;
  }

  /**
   * Discover internal links from a webpage
   */
  private discoverInternalLinks(baseUrl: string, document: Document): string[] {
    try {
      const links = document.querySelectorAll('a[href]');
      const internalLinks = new Set<string>();
      const baseHostname = new URL(baseUrl).hostname;

      links.forEach(link => {
        try {
          const href = (link as HTMLAnchorElement).href;
          const url = new URL(href, baseUrl);

          // Only same domain, avoid external links, anchors, files, and common non-content pages
          if (url.hostname === baseHostname &&
              !href.includes('#') &&
              !href.match(/\.(pdf|jpg|jpeg|png|gif|svg|zip|doc|docx|xls|xlsx)$/i) &&
              !url.pathname.match(/(\/cart|\/checkout|\/login|\/register|\/account|\/admin)/i)) {
            internalLinks.add(url.href);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      });

      return Array.from(internalLinks);
    } catch (error) {
      console.warn('Failed to discover internal links:', error);
      return [];
    }
  }

  /**
   * Prioritize pages by relevance for business information
   */
  private prioritizePages(links: string[]): string[] {
    const priority = [
      'menu', 'services', 'pricing', 'price', 'packages', 'treatments',
      'about', 'staff', 'team', 'contact', 'specials', 'promotions',
      'hours', 'location', 'policy', 'policies'
    ];

    return links
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();

        // Find the highest priority keyword in each URL
        const aScore = priority.findIndex(p => aLower.includes(p));
        const bScore = priority.findIndex(p => bLower.includes(p));

        return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
      })
      .slice(0, 10); // Limit to top 10 most relevant pages
  }

  /**
   * Merge data from multiple pages
   */
  private mergeData(target: any, source: any): void {
    if (!source) return;

    // Merge arrays (avoiding duplicates based on name/title)
    const mergeArray = (targetArr: any[], sourceArr: any[], keyField: string = 'name') => {
      if (!sourceArr || !Array.isArray(sourceArr)) return;

      sourceArr.forEach(item => {
        const exists = targetArr.some(t =>
          t[keyField] && item[keyField] &&
          t[keyField].toLowerCase() === item[keyField].toLowerCase()
        );
        if (!exists) {
          targetArr.push(item);
        }
      });
    };

    // Merge menu items
    if (source.menu) mergeArray(target.menu, source.menu);

    // Merge other array fields
    if (source.specialties) mergeArray(target.specialties, source.specialties, 'specialty');
    if (source.promotions) mergeArray(target.promotions, source.promotions, 'title');
    if (source.awards) mergeArray(target.awards, source.awards, 'name');
    if (source.staffInfo) mergeArray(target.staffInfo, source.staffInfo, 'name');
    if (source.serviceOfferings) mergeArray(target.serviceOfferings, source.serviceOfferings, 'name');
    if (source.dailySpecials) mergeArray(target.dailySpecials, source.dailySpecials, 'day');

    // Merge object fields (prefer non-empty values)
    const mergeObject = (key: string) => {
      if (source[key] && Object.keys(source[key]).length > 0) {
        target[key] = { ...target[key], ...source[key] };
      }
    };

    mergeObject('reservationInfo');
    mergeObject('deliveryInfo');
    mergeObject('aboutInfo');
    mergeObject('atmosphere');
    mergeObject('contact');
    mergeObject('socialMedia');
    mergeObject('businessPolicies');
    mergeObject('loyalty');
  }

  private async extractWebsiteData(websiteUrl: string): Promise<any> {
    console.log(`🌐 Scraping website with multi-page crawling: ${websiteUrl}`);

    // Initialize combined data structure
    const allData: any = {
      menu: [],
      specialties: [],
      promotions: [],
      reservationInfo: {},
      deliveryInfo: {},
      aboutInfo: {},
      atmosphere: {},
      contact: {},
      awards: [],
      socialMedia: {},
      staffInfo: [],
      nutritionalInfo: {},
      sustainabilityInfo: {},
      businessPolicies: {},
      customerTestimonials: [],
      partnershipInfo: {},
      eventInfo: [],
      loyalty: {},
      serviceOfferings: [],
      dailySpecials: [],
      seasonalMenu: {},
      structuredData: {}
    };

    try {
      // Step 1: Fetch and extract from homepage
      console.log(`📄 Extracting from homepage: ${websiteUrl}`);
      const response = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VoiceCrafter-BusinessBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        timeout: 20000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Extract structured data first (JSON-LD, microdata)
      const structuredData = this.extractStructuredData(document);

      // Extract from homepage
      const homepageData = {
        menu: await this.extractEnhancedMenuData(document),
        specialties: this.extractSpecialties(document),
        promotions: this.extractPromotions(document),
        reservationInfo: this.extractEnhancedReservationInfo(document),
        deliveryInfo: this.extractEnhancedDeliveryInfo(document),
        aboutInfo: this.extractEnhancedAboutInfo(document),
        atmosphere: this.extractAtmosphereInfo(document),
        contact: this.extractEnhancedContactInfo(document),
        awards: this.extractAwardsAndCertifications(document),
        socialMedia: this.extractSocialMediaLinks(document),
        staffInfo: this.extractStaffInformation(document),
        nutritionalInfo: this.extractNutritionalInformation(document),
        sustainabilityInfo: this.extractSustainabilityInfo(document),
        businessPolicies: this.extractBusinessPolicies(document),
        customerTestimonials: this.extractCustomerTestimonials(document),
        partnershipInfo: this.extractPartnershipInformation(document),
        eventInfo: this.extractEventInformation(document),
        loyalty: this.extractLoyaltyProgramInfo(document),
        serviceOfferings: this.extractServiceOfferings(document),
        dailySpecials: this.extractDailySpecials(document),
        seasonalMenu: this.extractSeasonalMenuInfo(document),
        structuredData: structuredData
      };

      // Merge homepage data
      this.mergeData(allData, homepageData);
      console.log(`✅ Homepage extracted: ${allData.menu.length} menu items, ${allData.serviceOfferings.length} services`);

      // Step 2: Discover internal links
      const internalLinks = this.discoverInternalLinks(websiteUrl, document);
      console.log(`🔍 Discovered ${internalLinks.length} internal links`);

      // Step 3: Prioritize pages
      const priorityLinks = this.prioritizePages(internalLinks);
      console.log(`📊 Prioritized ${priorityLinks.length} pages to crawl:`, priorityLinks.map(url => new URL(url).pathname));

      // Step 4: Crawl priority pages (with rate limiting)
      let crawledCount = 0;
      for (const pageUrl of priorityLinks) {
        try {
          // Rate limiting: wait 500ms between requests
          await new Promise(resolve => setTimeout(resolve, 500));

          console.log(`📄 Crawling page ${crawledCount + 1}/${priorityLinks.length}: ${new URL(pageUrl).pathname}`);

          const pageResponse = await fetch(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; VoiceCrafter-BusinessBot/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 15000
          });

          if (!pageResponse.ok) {
            console.warn(`⚠️ Failed to fetch ${pageUrl}: HTTP ${pageResponse.status}`);
            continue;
          }

          const pageHtml = await pageResponse.text();
          const pageDom = new JSDOM(pageHtml);
          const pageDoc = pageDom.window.document;

          // Extract data from this page
          const pageData = {
            menu: await this.extractEnhancedMenuData(pageDoc),
            specialties: this.extractSpecialties(pageDoc),
            promotions: this.extractPromotions(pageDoc),
            reservationInfo: this.extractEnhancedReservationInfo(pageDoc),
            deliveryInfo: this.extractEnhancedDeliveryInfo(pageDoc),
            aboutInfo: this.extractEnhancedAboutInfo(pageDoc),
            contact: this.extractEnhancedContactInfo(pageDoc),
            awards: this.extractAwardsAndCertifications(pageDoc),
            staffInfo: this.extractStaffInformation(pageDoc),
            businessPolicies: this.extractBusinessPolicies(pageDoc),
            serviceOfferings: this.extractServiceOfferings(pageDoc),
            dailySpecials: this.extractDailySpecials(pageDoc),
          };

          // Merge page data
          this.mergeData(allData, pageData);
          crawledCount++;

          console.log(`✅ Page ${crawledCount} extracted: +${pageData.menu.length} menu items, +${pageData.serviceOfferings.length} services`);
        } catch (pageError) {
          console.warn(`⚠️ Failed to scrape ${pageUrl}: ${pageError}`);
        }
      }

      console.log(`🎉 Multi-page crawl complete! Total: ${allData.menu.length} menu items, ${allData.serviceOfferings.length} services`);
      return allData;

    } catch (error) {
      console.warn(`⚠️ Website scraping failed for ${websiteUrl}: ${error}`);
      return allData; // Return whatever we managed to extract
    }
  }

  // Enhanced structured data extraction
  private extractStructuredData(document: Document): any {
    const structuredData: any = {};
    
    // Extract JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type'] === 'Restaurant' || data['@type'] === 'FoodEstablishment') {
          structuredData.restaurant = data;
        } else if (data['@type'] === 'Menu') {
          structuredData.menu = data;
        }
      } catch (error) {
        // Ignore malformed JSON-LD
      }
    });
    
    // Extract microdata
    const microdataElements = document.querySelectorAll('[itemtype*="Restaurant"], [itemtype*="FoodEstablishment"]');
    if (microdataElements.length > 0) {
      structuredData.microdata = this.parseMicrodata(microdataElements[0]);
    }
    
    return structuredData;
  }
  
  private parseMicrodata(element: Element): any {
    const data: any = {};
    const properties = element.querySelectorAll('[itemprop]');
    
    properties.forEach(prop => {
      const property = prop.getAttribute('itemprop');
      if (property) {
        data[property] = prop.textContent?.trim() || prop.getAttribute('content') || prop.getAttribute('href');
      }
    });
    
    return data;
  }

  // Enhanced menu extraction with nutritional and dietary information
  private async extractEnhancedMenuData(document: Document): Promise<MenuSection[]> {
    const menuSections: MenuSection[] = [];
    
    // Common menu selectors
    const menuSelectors = [
      '[class*="menu"]',
      '[id*="menu"]',
      '[class*="food"]',
      '.menu-section',
      '.food-menu',
      '.menu-category'
    ];

    for (const selector of menuSelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        const sectionName = this.extractTextContent(element.querySelector('h1, h2, h3, h4, .title, .category-name'));
        
        if (sectionName && sectionName.length > 2) {
          const items = this.extractMenuItems(element);
          
          if (items.length > 0) {
            menuSections.push({
              name: sectionName,
              description: this.extractTextContent(element.querySelector('.description, .subtitle')),
              items
            });
          }
        }
      }
    }

    // If no structured menu found, try to extract from text
    if (menuSections.length === 0) {
      const textBasedMenu = this.extractMenuFromText(document);
      if (textBasedMenu.length > 0) {
        menuSections.push(...textBasedMenu);
      }
    }

    return menuSections.slice(0, 10); // Limit to 10 sections
  }

  private extractMenuItems(sectionElement: Element): MenuItem[] {
    const items: MenuItem[] = [];
    
    // Look for item containers
    const itemSelectors = [
      '.menu-item',
      '.food-item',
      '.dish',
      '[class*="item"]',
      'li'
    ];

    for (const selector of itemSelectors) {
      const itemElements = sectionElement.querySelectorAll(selector);
      
      for (const itemElement of itemElements) {
        const name = this.extractTextContent(itemElement.querySelector('.name, .title, h4, h5, strong, b'));
        const description = this.extractTextContent(itemElement.querySelector('.description, .desc, p'));
        const priceText = this.extractPrice(itemElement);
        const itemText = itemElement.textContent || '';
        
        if (name && name.length > 2) {
          items.push({
            name: name,
            description: description || '',
            price: priceText,
            category: this.extractCategory(itemElement),
            tags: this.extractDietaryTags(itemText),
            allergens: this.extractAllergens(itemText),
            ingredients: this.extractIngredients(description || ''),
            isPopular: this.isPopularItem(itemText),
            isNew: this.isNewItem(itemText),
            isAvailable: this.checkAvailability(itemText),
            calories: this.extractCalories(itemText),
            spiceLevel: this.extractSpiceLevel(itemText)
          });
        }
      }
    }

    return items.slice(0, 20); // Limit items per section
  }

  private extractMenuFromText(document: Document): MenuSection[] {
    const sections: MenuSection[] = [];
    const bodyText = document.body.textContent || '';
    
    // Look for menu-like patterns in text
    const menuKeywords = ['appetizers', 'starters', 'mains', 'entrees', 'desserts', 'drinks', 'beverages'];
    
    for (const keyword of menuKeywords) {
      const regex = new RegExp(`${keyword}[\\s\\S]{0,500}`, 'i');
      const match = bodyText.match(regex);
      
      if (match) {
        const items = this.parseTextMenuItems(match[0]);
        if (items.length > 0) {
          sections.push({
            name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
            items
          });
        }
      }
    }

    return sections;
  }

  private parseTextMenuItems(text: string): MenuItem[] {
    const items: MenuItem[] = [];
    
    // Look for patterns like "Item Name - $12.99" or "Item Name $12.99"
    const itemPattern = /([A-Z][^$\n]{5,40})[\s\-]*\$?(\d{1,3}\.?\d{0,2})?/g;
    let match;
    
    while ((match = itemPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const price = match[2] ? `$${match[2]}` : undefined;
      
      if (name.length > 3) {
        items.push({
          name,
          price,
          category: 'General'
        });
      }
    }

    return items.slice(0, 15);
  }

  private extractSpecialties(document: Document): string[] {
    const specialties: string[] = [];
    
    const specialtySelectors = [
      '[class*="special"]',
      '[class*="signature"]',
      '[class*="popular"]',
      '[class*="favorite"]'
    ];

    for (const selector of specialtySelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = this.extractTextContent(element);
        if (text && text.length > 5 && text.length < 100) {
          specialties.push(text);
        }
      }
    }

    return [...new Set(specialties)].slice(0, 10);
  }

  private extractPromotions(document: Document): Promotion[] {
    const promotions: Promotion[] = [];
    
    const promoSelectors = [
      '[class*="promo"]',
      '[class*="deal"]',
      '[class*="special"]',
      '[class*="offer"]'
    ];

    for (const selector of promoSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const title = this.extractTextContent(element.querySelector('h1, h2, h3, h4, .title'));
        const description = this.extractTextContent(element);
        
        if (title && description) {
          promotions.push({
            title,
            description: description.slice(0, 200),
            validUntil: this.extractExpirationDate(description)
          });
        }
      }
    }

    return promotions.slice(0, 5);
  }

  private extractReservationInfo(document: Document): ReservationInfo {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    return {
      acceptsReservations: /reservation|book|table/i.test(bodyText),
      onlineBookingUrl: this.findBookingUrl(document),
      phoneReservations: /call.*reserv|phone.*book/i.test(bodyText),
      walkInsAccepted: /walk.?in/i.test(bodyText),
      waitTime: this.extractWaitTime(bodyText)
    };
  }

  private extractDeliveryInfo(document: Document): DeliveryInfo {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    return {
      hasDelivery: /delivery|deliver/i.test(bodyText),
      hasTakeout: /takeout|take.?out|pickup|pick.?up/i.test(bodyText),
      deliveryPartners: this.extractDeliveryPartners(bodyText),
      deliveryFee: this.extractDeliveryFee(bodyText),
      minimumOrder: this.extractMinimumOrder(bodyText)
    };
  }

  private extractAboutInfo(document: Document): AboutInfo {
    const aboutSelectors = [
      '[class*="about"]',
      '[class*="story"]',
      '[class*="history"]',
      '[id*="about"]'
    ];

    let story = '';
    for (const selector of aboutSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        story = this.extractTextContent(element) || '';
        if (story.length > 50) break;
      }
    }

    return {
      story: story.slice(0, 500),
      established: this.extractEstablishedYear(story),
      uniqueFeatures: this.extractUniqueFeatures(story)
    };
  }

  private extractAtmosphereInfo(document: Document): AtmosphereInfo {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    return {
      ambiance: this.extractAmbiance(bodyText),
      goodFor: this.extractGoodFor(bodyText),
      hasParking: /parking/i.test(bodyText),
      wheelchairAccessible: /wheelchair|accessible/i.test(bodyText),
      wifi: /wifi|wi-fi/i.test(bodyText),
      outdoorSeating: /outdoor|patio|terrace/i.test(bodyText)
    };
  }

  private extractContactInfo(document: Document): any {
    const bodyText = document.body.textContent || '';
    
    // Extract email
    const emailMatch = bodyText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    
    return {
      email: emailMatch ? emailMatch[0] : null
    };
  }

  // Helper methods
  private extractTextContent(element: Element | null): string | null {
    if (!element) return null;
    return element.textContent?.trim() || null;
  }

  private extractPrice(element: Element): string | undefined {
    const text = element.textContent || '';
    const priceMatch = text.match(/\$\d+\.?\d{0,2}/);
    return priceMatch ? priceMatch[0] : undefined;
  }

  private extractDietaryTags(text: string): string[] {
    const tags: string[] = [];
    const patterns = {
      'vegetarian': /vegetarian|veggie/i,
      'vegan': /vegan/i,
      'gluten-free': /gluten.?free|gf/i,
      'spicy': /spicy|hot/i,
      'dairy-free': /dairy.?free/i,
      'keto': /keto|ketogenic/i,
      'low-carb': /low.?carb/i,
      'organic': /organic/i,
      'locally-sourced': /local|farm.?to.?table/i,
      'sugar-free': /sugar.?free|no.?sugar/i,
      'low-fat': /low.?fat|fat.?free/i,
      'high-protein': /high.?protein|protein.?rich/i
    };

    for (const [tag, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  private isPopularItem(text: string): boolean {
    return /popular|favorite|signature|best.?seller/i.test(text);
  }

  private isNewItem(text: string): boolean {
    return /new|fresh|latest/i.test(text);
  }

  private extractExpirationDate(text: string): Date | undefined {
    const dateMatch = text.match(/until|expires?|valid.*?(\d{1,2}\/\d{1,2}\/?\d{0,4})/i);
    if (dateMatch) {
      try {
        return new Date(dateMatch[1]);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private findBookingUrl(document: Document): string | undefined {
    const links = document.querySelectorAll('a[href*="reservation"], a[href*="book"], a[href*="opentable"]');
    return links.length > 0 ? (links[0] as HTMLAnchorElement).href : undefined;
  }

  private extractWaitTime(text: string): string | undefined {
    const waitMatch = text.match(/wait.*?(\d+.*?minute)/i);
    return waitMatch ? waitMatch[1] : undefined;
  }

  private extractDeliveryPartners(text: string): string[] {
    const partners: string[] = [];
    const partnerPatterns = {
      'DoorDash': /doordash|door.?dash/i,
      'Uber Eats': /uber.?eats|ubereats/i,
      'Grubhub': /grubhub|grub.?hub/i,
      'Postmates': /postmates/i,
      'Seamless': /seamless/i,
      'ChowNow': /chownow|chow.?now/i,
      'Toast': /toast\s+delivery/i,
      'Square': /square\s+delivery/i,
      'Local Delivery': /local.?delivery|own.?delivery/i
    };

    for (const [partner, pattern] of Object.entries(partnerPatterns)) {
      if (pattern.test(text)) {
        partners.push(partner);
      }
    }

    return partners;
  }

  private extractDeliveryFee(text: string): string | undefined {
    const feePatterns = [
      /delivery.?fee[:\s]*\$([\d.]+)/i,
      /\$([\d.]+)\s*delivery/i,
      /free\s*delivery/i,
      /no\s*delivery\s*fee/i
    ];
    
    for (const pattern of feePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].includes('free') || match[0].includes('no') ? 'Free' : `$${match[1] || '0'}`;
      }
    }
    return undefined;
  }

  private extractMinimumOrder(text: string): string | undefined {
    const minOrderPatterns = [
      /minimum[:\s]*\$([\d.]+)/i,
      /\$([\d.]+)\s*minimum/i,
      /orders?\s*over\s*\$([\d.]+)/i,
      /min\s*order[:\s]*\$([\d.]+)/i
    ];
    
    for (const pattern of minOrderPatterns) {
      const match = text.match(pattern);
      if (match) return `$${match[1]}`;
    }
    return undefined;
  }

  private extractEstablishedYear(text: string): number | undefined {
    const yearMatch = text.match(/since|established|founded.*?(\d{4})/i);
    return yearMatch ? parseInt(yearMatch[1]) : undefined;
  }

  private extractUniqueFeatures(text: string): string[] {
    const features: string[] = [];
    const featureKeywords = ['award', 'authentic', 'family', 'traditional', 'artisan', 'craft', 'homemade'];
    
    for (const keyword of featureKeywords) {
      if (new RegExp(keyword, 'i').test(text)) {
        features.push(keyword);
      }
    }
    
    return features;
  }

  private extractAmbiance(text: string): string[] {
    const ambiance: string[] = [];
    const ambianceTerms = ['cozy', 'romantic', 'casual', 'upscale', 'family-friendly', 'lively', 'quiet', 'intimate'];
    
    for (const term of ambianceTerms) {
      if (new RegExp(term, 'i').test(text)) {
        ambiance.push(term);
      }
    }
    
    return ambiance;
  }

  private extractGoodFor(text: string): string[] {
    const goodFor: string[] = [];
    const occasions = ['date night', 'family dinner', 'business lunch', 'groups', 'celebrations', 'quick bite'];
    
    for (const occasion of occasions) {
      if (new RegExp(occasion.replace(' ', '.?'), 'i').test(text)) {
        goodFor.push(occasion);
      }
    }
    
    return goodFor;
  }

  private determineIndustry(types: string[]): string {
    const industryMapping = {
      'restaurant': ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'],
      'cafe': ['cafe', 'bakery'],
      'bar': ['bar', 'night_club'],
      'fast_food': ['meal_takeaway', 'meal_delivery'],
      'fine_dining': ['restaurant']
    };

    for (const [industry, keywords] of Object.entries(industryMapping)) {
      if (keywords.some(keyword => types.includes(keyword))) {
        return industry;
      }
    }

    return 'restaurant';
  }

  private determineCuisine(types: string[]): string | undefined {
    const cuisineTypes = types.find(type => 
      ['chinese', 'italian', 'mexican', 'indian', 'japanese', 'thai', 'american'].some(cuisine => 
        type.toLowerCase().includes(cuisine)
      )
    );
    
    return cuisineTypes?.toLowerCase();
  }

  private async fuseBusinessData(googleData: any, websiteData: any): Promise<EnhancedBusinessProfile> {
    const profile: EnhancedBusinessProfile = {
      // Basic info (prioritize Google Maps for accuracy)
      name: googleData.name || 'Unknown Business',
      address: googleData.address || '',
      phone: googleData.phone || '',
      email: websiteData.contact?.email || '',
      website: googleData.website || '',
      
      // Google Maps specific
      placeId: googleData.placeId || '',
      rating: googleData.rating || 0,
      totalReviews: googleData.totalReviews || 0,
      priceLevel: googleData.priceLevel,
      hours: googleData.hours || { weeklyHours: [], isOpen: false },
      reviews: googleData.reviews || [],
      photos: googleData.photos || [],
      
      // Website specific (prioritize for freshness)
      menu: websiteData.menu || [],
      specialties: [...(googleData.specialties || []), ...(websiteData.specialties || [])],
      promotions: websiteData.promotions || [],
      reservationInfo: websiteData.reservationInfo || {
        acceptsReservations: googleData.serviceAttributes?.reservable || false,
        phoneReservations: true,
        walkInsAccepted: true
      },
      deliveryInfo: websiteData.deliveryInfo || {
        hasDelivery: googleData.serviceAttributes?.delivery || false,
        hasTakeout: googleData.serviceAttributes?.takeout || false,
        deliveryPartners: []
      },
      aboutInfo: websiteData.aboutInfo || {
        story: googleData.story || '',
        uniqueFeatures: []
      },
      atmosphere: websiteData.atmosphere || {
        ambiance: [],
        goodFor: [],
        hasParking: false,
        wheelchairAccessible: googleData.serviceAttributes?.wheelchair_accessible || false
      },
      
      // Enhanced Website Data
      awards: websiteData.awards,
      socialMedia: websiteData.socialMedia,
      staffInfo: websiteData.staffInfo,
      nutritionalInfo: websiteData.nutritionalInfo,
      sustainabilityInfo: websiteData.sustainabilityInfo,
      businessPolicies: websiteData.businessPolicies,
      customerTestimonials: websiteData.customerTestimonials,
      partnershipInfo: websiteData.partnershipInfo,
      eventInfo: websiteData.eventInfo,
      loyalty: websiteData.loyalty,
      structuredData: websiteData.structuredData,
      
      // Derived data
      industry: googleData.industry || 'restaurant',
      cuisine: googleData.cuisine,
      priceRange: this.derivePriceRange(googleData.priceLevel),
      tags: this.deriveTags(googleData, websiteData),
      
      // Metadata
      lastUpdated: new Date(),
      dataQuality: this.calculateDataQuality(googleData, websiteData),
      websiteLastScraped: websiteData.menu ? new Date() : undefined
    };

    return profile;
  }

  private derivePriceRange(priceLevel?: number): string {
    if (!priceLevel) return 'Moderate';
    
    const ranges = {
      1: 'Budget-friendly',
      2: 'Moderate',
      3: 'Upscale',
      4: 'Fine dining'
    };
    
    return ranges[priceLevel as keyof typeof ranges] || 'Moderate';
  }

  private deriveTags(googleData: any, websiteData: any): string[] {
    const tags = new Set<string>();
    
    // Add industry tags
    if (googleData.industry) tags.add(googleData.industry);
    if (googleData.cuisine) tags.add(googleData.cuisine);
    
    // Add service tags
    if (googleData.serviceAttributes?.delivery) tags.add('delivery');
    if (googleData.serviceAttributes?.takeout) tags.add('takeout');
    if (googleData.serviceAttributes?.serves_beer) tags.add('beer');
    if (googleData.serviceAttributes?.serves_wine) tags.add('wine');
    if (googleData.serviceAttributes?.serves_vegetarian_food) tags.add('vegetarian-friendly');
    
    // Add atmosphere tags
    if (websiteData.atmosphere?.ambiance) {
      websiteData.atmosphere.ambiance.forEach((tag: string) => tags.add(tag));
    }
    
    return Array.from(tags).slice(0, 10);
  }

  private calculateDataQuality(googleData: any, websiteData: any): number {
    let score = 0;
    
    // Google Maps data quality (base 50 points)
    if (googleData.name) score += 8;
    if (googleData.address) score += 8;
    if (googleData.phone) score += 7;
    if (googleData.hours) score += 10;
    if (googleData.rating > 0) score += 7;
    if (googleData.reviews?.length > 0) score += 10;
    
    // Website basic data quality (30 points)
    if (websiteData.menu?.length > 0) score += 15;
    if (websiteData.aboutInfo?.story) score += 8;
    if (websiteData.contact?.email) score += 4;
    if (websiteData.promotions?.length > 0) score += 3;
    
    // Enhanced extraction quality (20 points)
    if (websiteData.awards?.awards?.length > 0) score += 3;
    if (websiteData.socialMedia && Object.keys(websiteData.socialMedia).length > 0) score += 2;
    if (websiteData.staffInfo?.staff?.length > 0) score += 3;
    if (websiteData.nutritionalInfo?.hasCalorieInfo) score += 2;
    if (websiteData.sustainabilityInfo?.sustainable) score += 2;
    if (websiteData.businessPolicies && Object.keys(websiteData.businessPolicies).length > 0) score += 2;
    if (websiteData.customerTestimonials?.length > 0) score += 2;
    if (websiteData.eventInfo?.events?.length > 0) score += 2;
    if (websiteData.loyalty?.hasLoyaltyProgram) score += 2;
    
    return Math.min(score, 100);
  }

  // Enhanced reservation information extraction
  private extractEnhancedReservationInfo(document: Document): ReservationInfo {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    return {
      acceptsReservations: /reservation|book|table/i.test(bodyText),
      onlineBookingUrl: this.findBookingUrl(document),
      phoneReservations: /call.*reserv|phone.*book/i.test(bodyText),
      walkInsAccepted: /walk.?in/i.test(bodyText),
      waitTime: this.extractWaitTime(bodyText),
      partySize: this.extractPartySizeInfo(bodyText)
    };
  }

  // Enhanced delivery information extraction
  private extractEnhancedDeliveryInfo(document: Document): DeliveryInfo {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    return {
      hasDelivery: /delivery|deliver/i.test(bodyText),
      hasTakeout: /takeout|take.?out|pickup|pick.?up/i.test(bodyText),
      deliveryPartners: this.extractDeliveryPartners(bodyText),
      deliveryFee: this.extractDeliveryFee(bodyText),
      minimumOrder: this.extractMinimumOrder(bodyText),
      estimatedTime: this.extractDeliveryTime(bodyText),
      deliveryRadius: this.extractDeliveryRadius(bodyText)
    };
  }

  // Enhanced about information extraction
  private extractEnhancedAboutInfo(document: Document): AboutInfo {
    const aboutSelectors = [
      '[class*="about"]',
      '[class*="story"]',
      '[class*="history"]',
      '[id*="about"]'
    ];

    let story = '';
    for (const selector of aboutSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        story = this.extractTextContent(element) || '';
        if (story.length > 50) break;
      }
    }

    return {
      story: story.slice(0, 800),
      established: this.extractEstablishedYear(story),
      uniqueFeatures: this.extractUniqueFeatures(story),
      mission: this.extractMissionStatement(story),
      history: this.extractHistoryDetails(story)
    };
  }

  // Enhanced contact information extraction
  private extractEnhancedContactInfo(document: Document): any {
    const bodyText = document.body.textContent || '';
    
    // Extract email
    const emailMatch = bodyText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    
    // Extract multiple phone numbers
    const phoneMatches = bodyText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) || [];
    
    return {
      email: emailMatch ? emailMatch[0] : null,
      phones: phoneMatches.slice(0, 3),
      fax: this.extractFaxNumber(bodyText),
      mailingAddress: this.extractMailingAddress(document)
    };
  }

  // Awards and certifications extraction
  private extractAwardsAndCertifications(document: Document): any {
    const awards: any[] = [];
    const certifications: any[] = [];
    
    const awardSelectors = [
      '[class*="award"]',
      '[class*="certificate"]',
      '[class*="recognition"]',
      '[class*="accolade"]'
    ];

    for (const selector of awardSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = this.extractTextContent(element);
        if (text && text.length > 10 && text.length < 200) {
          if (/award|winner|best|top/i.test(text)) {
            awards.push({
              title: text,
              year: this.extractYear(text),
              organization: this.extractAwardingOrganization(text)
            });
          } else if (/certified|certificate|license/i.test(text)) {
            certifications.push({
              title: text,
              issuer: this.extractCertificationIssuer(text),
              validUntil: this.extractCertificationExpiry(text)
            });
          }
        }
      }
    }

    return { awards: awards.slice(0, 10), certifications: certifications.slice(0, 10) };
  }

  // Social media links extraction
  private extractSocialMediaLinks(document: Document): any {
    const socialLinks: any = {};
    const platforms = ['facebook', 'instagram', 'twitter', 'youtube', 'tiktok', 'linkedin'];
    
    const links = document.querySelectorAll('a[href]');
    
    links.forEach(link => {
      const href = (link as HTMLAnchorElement).href.toLowerCase();
      platforms.forEach(platform => {
        if (href.includes(platform)) {
          socialLinks[platform] = (link as HTMLAnchorElement).href;
        }
      });
    });

    return socialLinks;
  }

  // Staff information extraction
  private extractStaffInformation(document: Document): any {
    const staff: any[] = [];
    const chefInfo: any = {};
    
    const staffSelectors = [
      '[class*="chef"]',
      '[class*="staff"]',
      '[class*="team"]',
      '[class*="owner"]'
    ];

    for (const selector of staffSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const name = this.extractTextContent(element.querySelector('.name, h3, h4'));
        const title = this.extractTextContent(element.querySelector('.title, .position'));
        const bio = this.extractTextContent(element.querySelector('.bio, .description, p'));
        
        if (name) {
          const staffMember = {
            name,
            title: title || 'Staff Member',
            bio: bio?.slice(0, 300) || '',
            isChef: /chef|cook/i.test(title || '')
          };
          
          if (staffMember.isChef && !chefInfo.head) {
            chefInfo.head = staffMember;
          } else {
            staff.push(staffMember);
          }
        }
      }
    }

    return { staff: staff.slice(0, 10), chefInfo };
  }

  // Nutritional information extraction
  private extractNutritionalInformation(document: Document): any {
    const nutritionInfo: any = {};
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    // Extract calorie information
    const calorieMatches = bodyText.match(/(\d+)\s*calories?/gi) || [];
    if (calorieMatches.length > 0) {
      nutritionInfo.hasCalorieInfo = true;
      nutritionInfo.averageCalories = this.calculateAverageCalories(calorieMatches);
    }
    
    // Extract allergen information
    const allergens = ['nuts', 'dairy', 'gluten', 'soy', 'eggs', 'shellfish', 'fish'];
    nutritionInfo.commonAllergens = allergens.filter(allergen => 
      new RegExp(allergen, 'i').test(bodyText)
    );
    
    // Extract dietary options
    nutritionInfo.dietaryOptions = {
      vegetarian: /vegetarian/i.test(bodyText),
      vegan: /vegan/i.test(bodyText),
      glutenFree: /gluten.?free/i.test(bodyText),
      keto: /keto|ketogenic/i.test(bodyText),
      lowCarb: /low.?carb/i.test(bodyText)
    };

    return nutritionInfo;
  }

  // Sustainability information extraction
  private extractSustainabilityInfo(document: Document): any {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    return {
      sustainable: /sustainable|sustainability|eco.?friendly|green/i.test(bodyText),
      localSourcing: /local.*sourcing|farm.?to.?table|locally.?sourced/i.test(bodyText),
      organic: /organic/i.test(bodyText),
      recycling: /recycling|compost/i.test(bodyText),
      energyEfficient: /energy.?efficient|solar|renewable/i.test(bodyText),
      wasteReduction: /waste.?reduction|zero.?waste/i.test(bodyText)
    };
  }

  // Business policies extraction
  private extractBusinessPolicies(document: Document): any {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    return {
      cancellationPolicy: this.extractCancellationPolicy(bodyText),
      refundPolicy: this.extractRefundPolicy(bodyText),
      dresscode: this.extractDressCode(bodyText),
      ageRestrictions: this.extractAgeRestrictions(bodyText),
      petPolicy: this.extractPetPolicy(bodyText),
      smokingPolicy: this.extractSmokingPolicy(bodyText),
      groupBookingPolicy: this.extractGroupBookingPolicy(bodyText)
    };
  }

  // Customer testimonials extraction
  private extractCustomerTestimonials(document: Document): any {
    const testimonials: any[] = [];
    
    const testimonialSelectors = [
      '[class*="testimonial"]',
      '[class*="review"]',
      '[class*="quote"]',
      '.customer-review'
    ];

    for (const selector of testimonialSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = this.extractTextContent(element);
        const author = this.extractTextContent(element.querySelector('.author, .name'));
        
        if (text && text.length > 30 && text.length < 500) {
          testimonials.push({
            text: text.slice(0, 300),
            author: author || 'Anonymous Customer',
            rating: this.extractRatingFromTestimonial(element)
          });
        }
      }
    }

    return testimonials.slice(0, 5);
  }

  // Partnership information extraction
  private extractPartnershipInformation(document: Document): any {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    const partnerships: any[] = [];
    
    const partnerKeywords = ['partner', 'sponsor', 'collaboration', 'affiliate'];
    
    partnerKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}[\\s\\S]{0,100}`, 'i');
      const match = bodyText.match(regex);
      if (match) {
        partnerships.push({
          type: keyword,
          description: match[0].trim()
        });
      }
    });

    return {
      partnerships: partnerships.slice(0, 5),
      suppliers: this.extractSupplierInfo(bodyText),
      distributors: this.extractDistributorInfo(bodyText)
    };
  }

  // Event information extraction
  private extractEventInformation(document: Document): any {
    const events: any[] = [];
    
    const eventSelectors = [
      '[class*="event"]',
      '[class*="special"]',
      '[class*="occasion"]'
    ];

    for (const selector of eventSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const title = this.extractTextContent(element.querySelector('h1, h2, h3, .title'));
        const description = this.extractTextContent(element);
        const date = this.extractEventDate(description || '');
        
        if (title && description) {
          events.push({
            title,
            description: description.slice(0, 200),
            date,
            recurring: /weekly|monthly|daily/i.test(description)
          });
        }
      }
    }

    return {
      events: events.slice(0, 5),
      privateEvents: /private.*event|catering/i.test(document.body.textContent || ''),
      liveMusic: /live.*music|entertainment/i.test(document.body.textContent || '')
    };
  }

  // Loyalty program information extraction
  private extractLoyaltyProgramInfo(document: Document): any {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    return {
      hasLoyaltyProgram: /loyalty|rewards|points|membership/i.test(bodyText),
      programName: this.extractLoyaltyProgramName(bodyText),
      benefits: this.extractLoyaltyBenefits(bodyText),
      signupMethod: this.extractSignupMethod(bodyText)
    };
  }

  // Helper methods for enhanced extraction
  private extractPartySizeInfo(text: string): any {
    const sizeMatch = text.match(/party.*?(\d+).*?(\d+)/i);
    if (sizeMatch) {
      return { min: parseInt(sizeMatch[1]), max: parseInt(sizeMatch[2]) };
    }
    return undefined;
  }

  private extractDeliveryTime(text: string): string | undefined {
    const timeMatch = text.match(/delivery.*?(\d+\-?\d*)\s*(minutes?|mins?|hours?)/i);
    return timeMatch ? `${timeMatch[1]} ${timeMatch[2]}` : undefined;
  }

  private extractDeliveryRadius(text: string): string | undefined {
    const radiusPatterns = [
      /(\d+)\s*miles?.*?delivery/i,
      /delivery.*?(\d+)\s*miles?/i,
      /(\d+)\s*mile\s*radius/i,
      /within\s*(\d+)\s*miles?/i,
      /deliver.*?(\d+)\s*(miles?|km)/i
    ];
    
    for (const pattern of radiusPatterns) {
      const match = text.match(pattern);
      if (match) return `${match[1]} ${match[2] || 'miles'}`;
    }
    return undefined;
  }

  private extractMissionStatement(text: string): string | undefined {
    const missionMatch = text.match(/mission[:\s]*([^.!?]{50,200})/i);
    return missionMatch ? missionMatch[1].trim() : undefined;
  }

  private extractHistoryDetails(text: string): string | undefined {
    const historyMatch = text.match(/history[:\s]*([^.!?]{50,300})/i);
    return historyMatch ? historyMatch[1].trim() : undefined;
  }

  private extractFaxNumber(text: string): string | undefined {
    const faxMatch = text.match(/fax[:\s]*(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i);
    return faxMatch ? faxMatch[1] : undefined;
  }

  private extractMailingAddress(document: Document): string | undefined {
    const addressElement = document.querySelector('[class*="mailing"], [class*="postal"]');
    return addressElement ? this.extractTextContent(addressElement) : undefined;
  }

  private extractYear(text: string): number | undefined {
    const yearMatch = text.match(/20\d{2}|19\d{2}/);
    return yearMatch ? parseInt(yearMatch[0]) : undefined;
  }

  private extractAwardingOrganization(text: string): string | undefined {
    const orgMatch = text.match(/by\s+([A-Z][^.!?]{5,50})/i);
    return orgMatch ? orgMatch[1].trim() : undefined;
  }

  private extractCertificationIssuer(text: string): string | undefined {
    const issuerMatch = text.match(/certified\s+by\s+([A-Z][^.!?]{5,50})/i);
    return issuerMatch ? issuerMatch[1].trim() : undefined;
  }

  private extractCertificationExpiry(text: string): Date | undefined {
    const expiryMatch = text.match(/expires?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (expiryMatch) {
      try {
        return new Date(expiryMatch[1]);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private calculateAverageCalories(matches: string[]): number {
    const calories = matches.map(match => parseInt(match.replace(/\D/g, ''))).filter(cal => cal > 0 && cal < 5000);
    return calories.length > 0 ? Math.round(calories.reduce((a, b) => a + b, 0) / calories.length) : 0;
  }

  private extractCancellationPolicy(text: string): string | undefined {
    const policyMatch = text.match(/cancel[l]?ation.*?policy[:\s]*([^.!?]{20,200})/i);
    return policyMatch ? policyMatch[1].trim() : undefined;
  }

  private extractRefundPolicy(text: string): string | undefined {
    const refundMatch = text.match(/refund.*?policy[:\s]*([^.!?]{20,200})/i);
    return refundMatch ? refundMatch[1].trim() : undefined;
  }

  private extractDressCode(text: string): string | undefined {
    const dressMatch = text.match(/dress.*?code[:\s]*([^.!?]{10,100})/i);
    return dressMatch ? dressMatch[1].trim() : undefined;
  }

  private extractAgeRestrictions(text: string): string | undefined {
    const ageMatch = text.match(/(\d+)\+|age.*?(\d+)|minimum.*?age.*?(\d+)/i);
    return ageMatch ? `${ageMatch[1] || ageMatch[2] || ageMatch[3]}+` : undefined;
  }

  private extractPetPolicy(text: string): string | undefined {
    if (/pet.*?friendly|dogs.*?welcome/i.test(text)) return 'Pet-friendly';
    if (/no.*?pets|pets.*?not.*?allowed/i.test(text)) return 'No pets allowed';
    return undefined;
  }

  private extractSmokingPolicy(text: string): string | undefined {
    if (/non.?smoking|no.*?smoking/i.test(text)) return 'Non-smoking';
    if (/smoking.*?area|smoking.*?allowed/i.test(text)) return 'Smoking area available';
    return undefined;
  }

  private extractGroupBookingPolicy(text: string): string | undefined {
    const groupMatch = text.match(/group.*?booking[:\s]*([^.!?]{20,150})/i);
    return groupMatch ? groupMatch[1].trim() : undefined;
  }

  private extractRatingFromTestimonial(element: Element): number | undefined {
    const stars = element.querySelectorAll('[class*="star"], [class*="rating"]');
    return stars.length > 0 ? Math.min(stars.length, 5) : undefined;
  }

  private extractSupplierInfo(text: string): string[] {
    const suppliers: string[] = [];
    const supplierMatch = text.match(/supplier[s]?[:\s]*([^.!?]{20,100})/i);
    if (supplierMatch) {
      suppliers.push(supplierMatch[1].trim());
    }
    return suppliers;
  }

  private extractDistributorInfo(text: string): string[] {
    const distributors: string[] = [];
    const distributorMatch = text.match(/distributor[s]?[:\s]*([^.!?]{20,100})/i);
    if (distributorMatch) {
      distributors.push(distributorMatch[1].trim());
    }
    return distributors;
  }

  private extractEventDate(text: string): Date | undefined {
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})|(\w+\s+\d{1,2},?\s+\d{4})/i);
    if (dateMatch) {
      try {
        return new Date(dateMatch[0]);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private extractLoyaltyProgramName(text: string): string | undefined {
    const nameMatch = text.match(/loyalty.*?program[:\s]*([A-Z][^.!?]{5,50})/i) ||
                     text.match(/rewards.*?program[:\s]*([A-Z][^.!?]{5,50})/i);
    return nameMatch ? nameMatch[1].trim() : undefined;
  }

  private extractLoyaltyBenefits(text: string): string[] {
    const benefits: string[] = [];
    const benefitKeywords = ['discount', 'free', 'points', 'cashback', 'reward'];
    
    benefitKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}[\\s\\S]{0,50}`, 'i');
      const match = text.match(regex);
      if (match) {
        benefits.push(match[0].trim());
      }
    });
    
    return benefits.slice(0, 5);
  }

  private extractSignupMethod(text: string): string | undefined {
    if (/app|mobile/i.test(text)) return 'Mobile app';
    if (/website|online/i.test(text)) return 'Website';
    if (/in.?store|restaurant/i.test(text)) return 'In-store';
    return undefined;
  }

  // Enhanced menu item extraction helpers
  private extractAllergens(text: string): string[] {
    const allergens: string[] = [];
    const allergenPatterns = {
      'nuts': /nuts?|peanuts?|tree.?nuts?|almonds?|walnuts?/i,
      'dairy': /dairy|milk|cheese|butter|cream/i,
      'eggs': /eggs?|egg/i,
      'soy': /soy|soybean/i,
      'gluten': /gluten|wheat|barley|rye/i,
      'shellfish': /shellfish|shrimp|crab|lobster|oyster/i,
      'fish': /fish|salmon|tuna|cod/i,
      'sesame': /sesame/i
    };

    for (const [allergen, pattern] of Object.entries(allergenPatterns)) {
      if (pattern.test(text)) {
        allergens.push(allergen);
      }
    }

    return allergens;
  }

  private extractIngredients(description: string): string[] {
    // Extract ingredients from parentheses or after "with"
    const ingredients: string[] = [];
    
    // Look for ingredients in parentheses
    const parenMatch = description.match(/\(([^)]+)\)/g);
    if (parenMatch) {
      parenMatch.forEach(match => {
        const content = match.replace(/[()]/g, '');
        if (content.length < 100) { // Avoid long descriptions
          ingredients.push(...content.split(',').map(i => i.trim()));
        }
      });
    }

    // Look for "with" patterns
    const withMatch = description.match(/with\s+([^.!?]{5,50})/i);
    if (withMatch) {
      ingredients.push(...withMatch[1].split(',').map(i => i.trim()));
    }

    return ingredients.slice(0, 10); // Limit ingredients
  }

  private extractCategory(element: Element): string {
    const parentSection = element.closest('[class*="section"], [class*="category"]');
    if (parentSection) {
      const categoryName = this.extractTextContent(parentSection.querySelector('h1, h2, h3, .title'));
      if (categoryName) return categoryName;
    }
    return 'General';
  }

  private checkAvailability(text: string): boolean {
    // Check for out-of-stock or unavailable indicators
    const unavailablePatterns = /out.?of.?stock|sold.?out|unavailable|not.?available|seasonal|limited.?time/i;
    return !unavailablePatterns.test(text);
  }

  private extractCalories(text: string): number | undefined {
    const calorieMatch = text.match(/(\d+)\s*cal/i);
    return calorieMatch ? parseInt(calorieMatch[1]) : undefined;
  }

  private extractSpiceLevel(text: string): string | undefined {
    if (/mild/i.test(text)) return 'mild';
    if (/medium/i.test(text)) return 'medium';
    if (/hot|spicy/i.test(text)) return 'hot';
    if (/extra.?hot|very.?spicy/i.test(text)) return 'extra-hot';
    return undefined;
  }

  // Enhanced service extraction
  private extractServiceOfferings(document: Document): ServiceOfferings {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    return {
      catering: {
        available: /catering|cater|events?|parties/i.test(bodyText),
        details: this.extractCateringDetails(bodyText)
      },
      mobileOrdering: {
        available: /mobile.?order|app.?order|order.?ahead/i.test(bodyText),
        appName: this.extractMobileAppName(bodyText)
      },
      driveThru: {
        available: /drive.?thru|drive.?through|drive.?up/i.test(bodyText),
        hours: this.extractDriveThruHours(bodyText)
      },
      delivery: {
        available: /delivery|deliver/i.test(bodyText),
        partners: this.extractDeliveryPartners(bodyText),
        fee: this.extractDeliveryFee(bodyText),
        radius: this.extractDeliveryRadius(bodyText),
        minimumOrder: this.extractMinimumOrder(bodyText)
      },
      takeout: /takeout|take.?out|pickup|pick.?up/i.test(bodyText),
      dineIn: /dine.?in|eat.?in|restaurant|tables/i.test(bodyText),
      curbside: /curbside|curb.?side/i.test(bodyText)
    };
  }

  private extractCateringDetails(text: string): any {
    const details: any = {};
    
    const minOrderMatch = text.match(/catering.*?(\$\d+)/i);
    if (minOrderMatch) details.minimumOrder = minOrderMatch[1];
    
    const advanceNoticeMatch = text.match(/(\d+)\s*(hours?|days?).*?advance/i);
    if (advanceNoticeMatch) details.advanceNotice = `${advanceNoticeMatch[1]} ${advanceNoticeMatch[2]}`;
    
    return details;
  }

  private extractMobileAppName(text: string): string | undefined {
    const appPatterns = [
      /download.*?([A-Z][a-z]+\s+app)/i,
      /([A-Z][a-z]+)\s+mobile\s+app/i,
      /order.*?([A-Z][a-z]+\s+app)/i
    ];
    
    for (const pattern of appPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return undefined;
  }

  private extractDriveThruHours(text: string): string | undefined {
    const driveThruMatch = text.match(/drive.?thru.*?(\d{1,2}:\d{2}.*?\d{1,2}:\d{2})/i);
    return driveThruMatch ? driveThruMatch[1] : undefined;
  }

  // Enhanced specials and promotions extraction
  private extractDailySpecials(document: Document): DailySpecial[] {
    const specials: DailySpecial[] = [];
    const specialSelectors = [
      '[class*="daily"]',
      '[class*="special"]',
      '[class*="happy"]',
      '[class*="promotion"]'
    ];

    for (const selector of specialSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = this.extractTextContent(element);
        if (text && text.length > 10) {
          specials.push({
            title: this.extractSpecialTitle(text),
            description: text,
            dayOfWeek: this.extractDayOfWeek(text),
            timeRange: this.extractTimeRange(text),
            discount: this.extractDiscount(text)
          });
        }
      }
    }

    return specials.slice(0, 10);
  }

  private extractSpecialTitle(text: string): string {
    const titleMatch = text.match(/^([^.!?]{5,50})/i);
    return titleMatch ? titleMatch[1].trim() : text.slice(0, 50);
  }

  private extractDayOfWeek(text: string): string | undefined {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayMatch = text.toLowerCase().match(new RegExp(`(${days.join('|')})`, 'i'));
    return dayMatch ? dayMatch[1] : undefined;
  }

  private extractTimeRange(text: string): string | undefined {
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[ap]m).*?(\d{1,2}:\d{2}\s*[ap]m)/i);
    return timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : undefined;
  }

  private extractDiscount(text: string): string | undefined {
    const discountMatches = [
      /\$\d+\s*off/i,
      /\d+%\s*off/i,
      /buy.*?get.*?free/i,
      /half.?price|50%/i
    ];
    
    for (const pattern of discountMatches) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return undefined;
  }

  private extractSeasonalMenuInfo(document: Document): SeasonalMenuInfo {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    // Check for seasonal indicators
    const hasSeasonalMenu = /seasonal|season|limited.?time|special.?menu/i.test(bodyText);
    
    // Extract current season offerings
    const seasons = ['spring', 'summer', 'fall', 'autumn', 'winter', 'holiday'];
    const currentSeason = seasons.find(season => 
      new RegExp(season, 'i').test(bodyText)
    );
    
    // Look for seasonal items
    const seasonalItems: string[] = [];
    const seasonalElements = document.querySelectorAll('[class*="seasonal"], [class*="limited"], [class*="special"]');
    seasonalElements.forEach(element => {
      const text = this.extractTextContent(element);
      if (text && text.length > 5 && text.length < 100) {
        seasonalItems.push(text);
      }
    });
    
    return {
      hasSeasonalMenu,
      currentSeason,
      seasonalItems: seasonalItems.slice(0, 10)
    };
  }
}

export const enhancedBusinessExtractor = new EnhancedBusinessExtractor();