import fetch from 'node-fetch';

export interface ReservationRequest {
  partySize: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  specialRequests?: string;
}

export interface ReservationResponse {
  success: boolean;
  reservationId?: string;
  confirmationNumber?: string;
  message: string;
  availableTimes?: string[];
}

export interface ReservationConfig {
  openTableEnabled: boolean;
  openTableRestaurantId?: string;
  openTableApiKey?: string;
  resyEnabled: boolean;
  resyVenueId?: string;
  resyApiKey?: string;
}

export class ReservationService {
  
  /**
   * Parse reservation intent from customer message
   */
  parseReservationIntent(customerMessage: string): Partial<ReservationRequest> | null {
    console.log(`📅 Parsing reservation intent from: "${customerMessage}"`);
    
    const message = customerMessage.toLowerCase();
    
    // Check if this is a reservation request
    const reservationKeywords = [
      'book', 'reserve', 'reservation', 'table', 'make a reservation',
      'book a table', 'party of', 'table for', 'dinner reservation',
      'lunch reservation', 'reservar', 'mesa', 'reserva' // Spanish
    ];
    
    const hasReservationIntent = reservationKeywords.some(keyword => 
      message.includes(keyword)
    );
    
    if (!hasReservationIntent) {
      return null;
    }
    
    const reservation: Partial<ReservationRequest> = {};
    
    // Extract party size
    const partySizePatterns = [
      /(?:table for|party of|for|para)\s*(\d+)/i,
      /(\d+)\s*(?:people|person|guests?|personas?)/i,
      /(\d+)\s*(?:adults?|adultos?)/i
    ];
    
    for (const pattern of partySizePatterns) {
      const match = message.match(pattern);
      if (match) {
        reservation.partySize = parseInt(match[1]);
        break;
      }
    }
    
    // Extract time
    const timePatterns = [
      /(?:at|@|para las?)\s*(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm|a\.?m\.?|p\.?m\.?)?/i,
      /(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm|a\.?m\.?|p\.?m\.?)/i,
      /(\d{1,2})\s*o'clock/i
    ];
    
    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        let hour = parseInt(match[1]);
        const minute = match[2] ? parseInt(match[2]) : 0;
        const period = match[3]?.toLowerCase();
        
        // Convert to 24-hour format
        if (period?.includes('p') && hour !== 12) {
          hour += 12;
        } else if (period?.includes('a') && hour === 12) {
          hour = 0;
        }
        
        reservation.time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        break;
      }
    }
    
    // Extract date
    const datePatterns = [
      /(?:today|hoy)/i,
      /(?:tomorrow|mañana)/i,
      /(?:tonight|esta noche)/i,
      /(?:on\s+)?(\w+day)/i, // Monday, Tuesday, etc.
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
      /(\d{1,2})-(\d{1,2})-(\d{2,4})/,
    ];
    
    const today = new Date();
    
    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        if (pattern.source.includes('today|hoy')) {
          reservation.date = today.toISOString().split('T')[0];
        } else if (pattern.source.includes('tomorrow|mañana')) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          reservation.date = tomorrow.toISOString().split('T')[0];
        } else if (pattern.source.includes('tonight|esta noche')) {
          reservation.date = today.toISOString().split('T')[0];
          if (!reservation.time) {
            reservation.time = '19:00'; // Default to 7 PM for dinner
          }
        }
        break;
      }
    }
    
    // Default to today if no date specified
    if (!reservation.date) {
      reservation.date = today.toISOString().split('T')[0];
    }
    
    console.log(`✅ Parsed reservation:`, reservation);
    return reservation;
  }

  /**
   * Make reservation using OpenTable API
   */
  async makeOpenTableReservation(
    reservation: ReservationRequest, 
    config: ReservationConfig
  ): Promise<ReservationResponse> {
    try {
      if (!config.openTableEnabled || !config.openTableApiKey || !config.openTableRestaurantId) {
        return {
          success: false,
          message: 'OpenTable integration not configured'
        };
      }

      console.log(`🍴 Making OpenTable reservation:`, reservation);

      // OpenTable API call (this is a mock implementation)
      // In reality, you'd need to integrate with OpenTable's actual API
      const response = await fetch('https://api.opentable.com/v1/reservations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openTableApiKey}`,
          'Content-Type': 'application/json',
          'X-Restaurant-ID': config.openTableRestaurantId
        },
        body: JSON.stringify({
          party_size: reservation.partySize,
          date: reservation.date,
          time: reservation.time,
          customer: {
            name: reservation.customerName,
            phone: reservation.customerPhone,
            email: reservation.customerEmail
          },
          special_requests: reservation.specialRequests
        })
      });

      if (response.ok) {
        const result = await response.json() as any;
        return {
          success: true,
          reservationId: result.reservation_id,
          confirmationNumber: result.confirmation_number,
          message: `Great! Your reservation for ${reservation.partySize} on ${reservation.date} at ${reservation.time} has been confirmed. Confirmation number: ${result.confirmation_number}`
        };
      } else {
        const error = await response.json() as any;
        return {
          success: false,
          message: `Unable to make reservation: ${error.message || 'Please call the restaurant directly.'}`,
          availableTimes: error.available_times
        };
      }

    } catch (error) {
      console.error('❌ OpenTable reservation failed:', error);
      return {
        success: false,
        message: 'Sorry, I\'m having trouble with our reservation system. Please call the restaurant directly to make a reservation.'
      };
    }
  }

  /**
   * Make reservation using Resy API
   */
  async makeResyReservation(
    reservation: ReservationRequest, 
    config: ReservationConfig
  ): Promise<ReservationResponse> {
    try {
      if (!config.resyEnabled || !config.resyApiKey || !config.resyVenueId) {
        return {
          success: false,
          message: 'Resy integration not configured'
        };
      }

      console.log(`🍽️ Making Resy reservation:`, reservation);

      // Resy API call (mock implementation)
      const response = await fetch('https://api.resy.com/3/book', {
        method: 'POST',
        headers: {
          'Authorization': `ResyAPI api_key="${config.resyApiKey}"`,
          'Content-Type': 'application/json',
          'X-Resy-Venue-Id': config.resyVenueId
        },
        body: JSON.stringify({
          party_size: reservation.partySize,
          day: reservation.date,
          time: reservation.time,
          guest: {
            first_name: reservation.customerName?.split(' ')[0],
            last_name: reservation.customerName?.split(' ').slice(1).join(' '),
            phone_number: reservation.customerPhone,
            email: reservation.customerEmail
          },
          notes: reservation.specialRequests
        })
      });

      if (response.ok) {
        const result = await response.json() as any;
        return {
          success: true,
          reservationId: result.resy_token,
          confirmationNumber: result.resy_token,
          message: `Perfect! Your table for ${reservation.partySize} is reserved for ${reservation.date} at ${reservation.time}. Confirmation: ${result.resy_token}`
        };
      } else {
        const error = await response.json() as any;
        return {
          success: false,
          message: `Sorry, that time isn't available. ${error.message || 'Please try a different time or call us directly.'}`,
          availableTimes: error.available_slots?.map((slot: any) => slot.time)
        };
      }

    } catch (error) {
      console.error('❌ Resy reservation failed:', error);
      return {
        success: false,
        message: 'I\'m having trouble accessing our reservation system right now. Please call us directly to book your table.'
      };
    }
  }

  /**
   * Attempt reservation using available integrations
   */
  async makeReservation(
    reservation: ReservationRequest,
    config: ReservationConfig
  ): Promise<ReservationResponse> {
    console.log(`📞 Attempting to make reservation:`, reservation);

    // Validate required fields
    if (!reservation.partySize || reservation.partySize < 1 || reservation.partySize > 20) {
      return {
        success: false,
        message: 'Please specify a valid party size between 1 and 20 people.'
      };
    }

    if (!reservation.date || !reservation.time) {
      return {
        success: false,
        message: 'Please provide both the date and time for your reservation.'
      };
    }

    // Try OpenTable first
    if (config.openTableEnabled) {
      const result = await this.makeOpenTableReservation(reservation, config);
      if (result.success) {
        return result;
      }
      console.log('OpenTable reservation failed, trying Resy...');
    }

    // Try Resy as backup
    if (config.resyEnabled) {
      const result = await this.makeResyReservation(reservation, config);
      if (result.success) {
        return result;
      }
      console.log('Resy reservation failed');
    }

    // No integrations available
    return {
      success: false,
      message: 'I\'d be happy to help you make a reservation! Please call us directly and we\'ll get you set up with a table.'
    };
  }

  /**
   * Check if message contains reservation intent
   */
  hasReservationIntent(message: string): boolean {
    const reservationKeywords = [
      'book', 'reserve', 'reservation', 'table', 'make a reservation',
      'book a table', 'party of', 'table for', 'dinner reservation',
      'lunch reservation', 'reservar', 'mesa', 'reserva'
    ];
    
    const lowerMessage = message.toLowerCase();
    return reservationKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

export const reservationService = new ReservationService();