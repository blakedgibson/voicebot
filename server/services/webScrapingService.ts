import { JSDOM } from "jsdom";
import type { RestaurantData } from "@shared/schema";

export interface ScrapedBusinessData {
  businessName: string;
  address?: string;
  phone?: string;
  website?: string;
  hours?: Record<string, string>;
  menuItems?: Array<{ name: string; price?: string; description?: string }>;
  services?: string[];
  reservationInfo?: string;
}

export interface GoogleMapsData {
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  reviews?: number;
  hours?: Record<string, string>;
  categories?: string[];
  website?: string;
}

export interface PlaceSuggestion {
  place_id: string;
  description: string;
  name: string;
  types: string[];
}

class WebScrapingService {
  async scrapeWebsite(url: string): Promise<ScrapedBusinessData> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Extract business name from title or h1
      const businessName = this.extractBusinessName(document);
      
      // Extract contact information
      const address = this.extractAddress(document);
      const phone = this.extractPhone(document);
      
      // Extract hours
      const hours = this.extractHours(document);
      
      // Extract menu items
      const menuItems = this.extractMenuItems(document);
      
      // Extract services
      const services = this.extractServices(document);
      
      // Extract reservation info
      const reservationInfo = this.extractReservationInfo(document);

      return {
        businessName,
        address,
        phone,
        website: url,
        hours,
        menuItems,
        services,
        reservationInfo,
      };
    } catch (error) {
      console.error("Error scraping website:", error);
      throw new Error("Failed to scrape website data");
    }
  }

  async scrapeGoogleMaps(query: string): Promise<GoogleMapsData> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      // Use Google Places API Text Search
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      if (searchData.status !== 'OK' || !searchData.results.length) {
        throw new Error(`No results found for: ${query}`);
      }
      
      const place = searchData.results[0];
      const placeId = place.place_id;
      
      // Get detailed place information
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,rating,user_ratings_total,opening_hours,types,website&key=${apiKey}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      if (detailsData.status !== 'OK') {
        throw new Error('Failed to get place details');
      }
      
      const details = detailsData.result;
      
      // Convert opening hours to our format
      const hours: Record<string, string> = {};
      if (details.opening_hours?.weekday_text) {
        details.opening_hours.weekday_text.forEach((dayText: string) => {
          const [day, time] = dayText.split(': ');
          hours[day] = time || 'Closed';
        });
      }
      
      return {
        name: details.name || query,
        address: details.formatted_address || '',
        phone: details.formatted_phone_number,
        rating: details.rating,
        reviews: details.user_ratings_total,
        hours,
        categories: details.types || [],
        website: details.website
      };
      
    } catch (error) {
      console.error('Google Maps API error:', error);
      
      // Fallback to basic response if API fails
      return {
        name: query.trim(),
        address: 'Address not available',
        phone: undefined,
        rating: undefined,
        reviews: undefined,
        hours: {},
        categories: ['Restaurant'],
        website: undefined
      };
    }
  }

  async fetchGoogleMapsData(businessName: string, location?: string): Promise<GoogleMapsData | null> {
    // This method calls scrapeGoogleMaps for backward compatibility
    const query = location ? `${businessName} ${location}` : businessName;
    return this.scrapeGoogleMaps(query);
  }

  async getPlacesSuggestions(input: string): Promise<PlaceSuggestion[]> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      // Use Places Autocomplete API for suggestions
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=establishment&key=${apiKey}`;
      
      const response = await fetch(autocompleteUrl);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.warn('Autocomplete API warning:', data.status);
        return [];
      }
      
      return data.predictions?.map((prediction: any) => ({
        place_id: prediction.place_id,
        description: prediction.description,
        name: prediction.structured_formatting?.main_text || prediction.description,
        types: prediction.types || []
      })) || [];
      
    } catch (error) {
      console.error('Places autocomplete error:', error);
      return [];
    }
  }

  private formatGoogleMapsQuery(businessName: string, location?: string): string {
    // Format query for better Google Places API results
    return location ? `${businessName} ${location}` : businessName;
  }

  private extractBusinessName(document: Document): string {
    // Try multiple selectors for business name
    const selectors = [
      'h1',
      '[itemProp="name"]',
      '.restaurant-name',
      '.business-name',
      'title',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return "Restaurant";
  }

  private extractAddress(document: Document): string | undefined {
    const selectors = [
      '[itemProp="address"]',
      '.address',
      '.location',
      '[class*="address"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return undefined;
  }

  private extractPhone(document: Document): string | undefined {
    const selectors = [
      '[itemProp="telephone"]',
      '.phone',
      '.contact-phone',
      '[href^="tel:"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.getAttribute('href');
        if (text) {
          const phone = text.replace('tel:', '').trim();
          if (phone.match(/[\d\s\-\(\)\+]+/)) {
            return phone;
          }
        }
      }
    }

    return undefined;
  }

  private extractHours(document: Document): Record<string, string> | undefined {
    const hoursElement = document.querySelector('[itemProp="openingHours"], .hours, .opening-hours');
    if (!hoursElement) return undefined;

    const hoursText = hoursElement.textContent || '';
    const hours: Record<string, string> = {};
    
    // Simple parsing for common formats
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const regex = new RegExp(`${day}[:\\s]*([\\d\\s:amp-]+)`, 'i');
      const match = hoursText.match(regex);
      if (match) {
        hours[day] = match[1].trim();
      }
    });

    return Object.keys(hours).length > 0 ? hours : undefined;
  }

  private extractMenuItems(document: Document): Array<{ name: string; price?: string; description?: string }> {
    const menuItems: Array<{ name: string; price?: string; description?: string }> = [];
    
    // Look for menu sections
    const menuSelectors = [
      '.menu-item',
      '.dish',
      '[class*="menu"] li',
      '[class*="food"] .item',
    ];

    for (const selector of menuSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const name = element.querySelector('.name, .title, h3, h4')?.textContent?.trim();
        const price = element.querySelector('.price, [class*="price"]')?.textContent?.trim();
        const description = element.querySelector('.description, .desc, p')?.textContent?.trim();
        
        if (name) {
          menuItems.push({
            name,
            price,
            description,
          });
        }
      });
      
      if (menuItems.length > 0) break;
    }

    return menuItems;
  }

  private extractServices(document: Document): string[] {
    const services: string[] = [];
    const serviceKeywords = ['delivery', 'takeout', 'catering', 'reservation', 'outdoor seating', 'parking'];
    
    const bodyText = document.body.textContent?.toLowerCase() || '';
    
    serviceKeywords.forEach(keyword => {
      if (bodyText.includes(keyword)) {
        services.push(keyword);
      }
    });

    return services;
  }

  private extractReservationInfo(document: Document): string | undefined {
    // Look for reservation-related information
    const reservationSelectors = [
      '.reservation',
      '.booking',
      '[href*="reservation"]',
      '[href*="booking"]',
      '[href*="opentable"]',
      '[href*="resy"]',
    ];

    for (const selector of reservationSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        if (element.getAttribute('href')) {
          return `Reservations: ${element.getAttribute('href')}`;
        }
        if (element.textContent?.trim()) {
          return element.textContent.trim();
        }
      }
    }

    return undefined;
  }

  // Generate restaurant-specific AI prompt based on scraped data
  generateRestaurantPrompt(businessData: ScrapedBusinessData, gmapsData?: GoogleMapsData): string {
    const name = businessData.businessName || gmapsData?.name || "Restaurant";
    const address = businessData.address || gmapsData?.address;
    const phone = businessData.phone || gmapsData?.phone;
    const hours = businessData.hours || gmapsData?.hours;
    const menuItems = businessData.menuItems || [];
    const services = businessData.services || [];

    let prompt = `You are the AI voice receptionist for ${name}`;
    
    if (address) {
      prompt += `, located at ${address}`;
    }
    
    prompt += `. Your role is to handle customer calls professionally and helpfully.

Your main responsibilities:
- Answer questions about menu items, hours, and location
- Take reservation requests and provide booking information
- Handle general inquiries about the restaurant
- Provide a warm, welcoming experience that reflects the restaurant's hospitality

Restaurant Information:`;

    if (phone) {
      prompt += `\n- Phone: ${phone}`;
    }

    if (hours && Object.keys(hours).length > 0) {
      prompt += `\n- Hours: ${Object.entries(hours).map(([day, time]) => `${day}: ${time}`).join(', ')}`;
    }

    if (menuItems.length > 0) {
      prompt += `\n- Popular Menu Items: ${menuItems.slice(0, 5).map(item => `${item.name}${item.price ? ` (${item.price})` : ''}`).join(', ')}`;
    }

    if (services.length > 0) {
      prompt += `\n- Services: ${services.join(', ')}`;
    }

    if (businessData.reservationInfo) {
      prompt += `\n- Reservations: ${businessData.reservationInfo}`;
    }

    prompt += `\n\nPersonality: Be warm, friendly, and professional. Speak as if you're a knowledgeable staff member who cares about providing excellent customer service. If you don't know specific information, offer to connect them with a manager or ask for their contact information for a callback.`;

    return prompt;
  }
}

export const webScrapingService = new WebScrapingService();