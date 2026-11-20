export interface OrderingConfig {
  deliveryPartnersEnabled: boolean;
  doorDashUrl?: string;
  uberEatsUrl?: string;
  grubHubUrl?: string;
  toastPosEnabled: boolean;
  toastApiKey?: string;
  onlineOrderingUrl?: string;
}

export interface OrderingIntent {
  orderingType: 'delivery' | 'pickup' | 'dine_in';
  deliveryPartner?: 'doordash' | 'ubereats' | 'grubhub' | 'direct';
  hasOrderingIntent: boolean;
  confidence: number;
}

export interface OrderingResponse {
  success: boolean;
  message: string;
  redirectUrl?: string;
  orderingOptions: string[];
}

export class OrderingService {

  /**
   * Detect ordering intent from customer message
   */
  detectOrderingIntent(customerMessage: string): OrderingIntent {
    console.log(`🍕 Analyzing ordering intent: "${customerMessage}"`);
    
    const message = customerMessage.toLowerCase();
    
    // Ordering keywords
    const orderKeywords = [
      'order', 'delivery', 'takeout', 'pickup', 'food', 'menu',
      'deliver', 'delivered', 'ordering', 'place an order',
      'order food', 'get food', 'food delivery', 'take out',
      'pick up', 'ordenar', 'entrega', 'comida', 'pedido' // Spanish
    ];
    
    const hasOrderingIntent = orderKeywords.some(keyword => 
      message.includes(keyword)
    );
    
    if (!hasOrderingIntent) {
      return {
        orderingType: 'dine_in',
        hasOrderingIntent: false,
        confidence: 0.1
      };
    }
    
    // Determine ordering type
    let orderingType: 'delivery' | 'pickup' | 'dine_in' = 'dine_in';
    let confidence = 0.6;
    
    // Delivery indicators
    const deliveryKeywords = [
      'deliver', 'delivery', 'delivered', 'bring to', 'send to',
      'entregar', 'entrega', 'llevado', 'enviar'
    ];
    
    if (deliveryKeywords.some(keyword => message.includes(keyword))) {
      orderingType = 'delivery';
      confidence = 0.9;
    }
    
    // Pickup indicators
    const pickupKeywords = [
      'pickup', 'pick up', 'takeout', 'take out', 'collect',
      'recoger', 'llevar', 'para llevar'
    ];
    
    if (pickupKeywords.some(keyword => message.includes(keyword))) {
      orderingType = 'pickup';
      confidence = 0.9;
    }
    
    // Delivery partner detection
    let deliveryPartner: 'doordash' | 'ubereats' | 'grubhub' | 'direct' | undefined;
    
    if (message.includes('doordash') || message.includes('door dash')) {
      deliveryPartner = 'doordash';
      confidence = 0.95;
    } else if (message.includes('uber') || message.includes('ubereats')) {
      deliveryPartner = 'ubereats';
      confidence = 0.95;
    } else if (message.includes('grubhub') || message.includes('grub hub')) {
      deliveryPartner = 'grubhub';
      confidence = 0.95;
    } else if (orderingType === 'delivery') {
      deliveryPartner = 'direct';
    }
    
    console.log(`📋 Ordering intent detected: ${orderingType} via ${deliveryPartner} (confidence: ${confidence})`);
    
    return {
      orderingType,
      deliveryPartner,
      hasOrderingIntent: true,
      confidence
    };
  }

  /**
   * Process ordering request and provide appropriate response
   */
  processOrderingRequest(
    orderingIntent: OrderingIntent,
    config: OrderingConfig,
    language: string = 'en'
  ): OrderingResponse {
    console.log(`🛒 Processing ordering request:`, orderingIntent);
    
    if (!orderingIntent.hasOrderingIntent) {
      return {
        success: false,
        message: this.getLocalizedMessage('no_ordering_intent', language),
        orderingOptions: []
      };
    }
    
    const orderingOptions: string[] = [];
    let primaryResponse = '';
    let redirectUrl: string | undefined;
    
    // Handle delivery requests
    if (orderingIntent.orderingType === 'delivery') {
      if (!config.deliveryPartnersEnabled) {
        return {
          success: false,
          message: this.getLocalizedMessage('delivery_not_available', language),
          orderingOptions: []
        };
      }
      
      // Check for specific delivery partner request
      if (orderingIntent.deliveryPartner) {
        const partnerResult = this.getDeliveryPartnerInfo(orderingIntent.deliveryPartner, config, language);
        if (partnerResult.available) {
          return {
            success: true,
            message: partnerResult.message,
            redirectUrl: partnerResult.url,
            orderingOptions: [orderingIntent.deliveryPartner]
          };
        }
      }
      
      // Provide all available delivery options
      const availablePartners = this.getAvailableDeliveryPartners(config);
      
      if (availablePartners.length === 0) {
        primaryResponse = this.getLocalizedMessage('no_delivery_partners', language);
      } else {
        primaryResponse = this.getLocalizedMessage('delivery_options', language);
        orderingOptions.push(...availablePartners.map(p => p.name));
        
        // Use first available partner as primary redirect
        redirectUrl = availablePartners[0].url;
      }
    }
    
    // Handle pickup requests
    else if (orderingIntent.orderingType === 'pickup') {
      if (config.onlineOrderingUrl) {
        primaryResponse = this.getLocalizedMessage('pickup_available', language);
        redirectUrl = config.onlineOrderingUrl;
        orderingOptions.push('online_ordering');
      } else {
        primaryResponse = this.getLocalizedMessage('pickup_call_only', language);
      }
    }
    
    // Handle general ordering inquiries
    else {
      const allOptions = this.getAllOrderingOptions(config);
      primaryResponse = this.getLocalizedMessage('ordering_options', language);
      orderingOptions.push(...allOptions.map(o => o.name));
      
      // Use online ordering as primary if available
      const onlineOrdering = allOptions.find(o => o.name === 'online_ordering');
      if (onlineOrdering) {
        redirectUrl = onlineOrdering.url;
      }
    }
    
    return {
      success: true,
      message: primaryResponse,
      redirectUrl,
      orderingOptions
    };
  }

  /**
   * Get delivery partner information
   */
  private getDeliveryPartnerInfo(
    partner: 'doordash' | 'ubereats' | 'grubhub' | 'direct',
    config: OrderingConfig,
    language: string
  ): { available: boolean; message: string; url?: string } {
    
    switch (partner) {
      case 'doordash':
        if (config.doorDashUrl) {
          return {
            available: true,
            message: this.getLocalizedMessage('doordash_available', language),
            url: config.doorDashUrl
          };
        }
        break;
        
      case 'ubereats':
        if (config.uberEatsUrl) {
          return {
            available: true,
            message: this.getLocalizedMessage('ubereats_available', language),
            url: config.uberEatsUrl
          };
        }
        break;
        
      case 'grubhub':
        if (config.grubHubUrl) {
          return {
            available: true,
            message: this.getLocalizedMessage('grubhub_available', language),
            url: config.grubHubUrl
          };
        }
        break;
        
      case 'direct':
        if (config.onlineOrderingUrl) {
          return {
            available: true,
            message: this.getLocalizedMessage('direct_ordering', language),
            url: config.onlineOrderingUrl
          };
        }
        break;
    }
    
    return {
      available: false,
      message: this.getLocalizedMessage('partner_not_available', language)
    };
  }

  /**
   * Get all available delivery partners
   */
  private getAvailableDeliveryPartners(config: OrderingConfig): Array<{ name: string; url: string }> {
    const partners: Array<{ name: string; url: string }> = [];
    
    if (config.doorDashUrl) {
      partners.push({ name: 'doordash', url: config.doorDashUrl });
    }
    
    if (config.uberEatsUrl) {
      partners.push({ name: 'ubereats', url: config.uberEatsUrl });
    }
    
    if (config.grubHubUrl) {
      partners.push({ name: 'grubhub', url: config.grubHubUrl });
    }
    
    if (config.onlineOrderingUrl) {
      partners.push({ name: 'direct', url: config.onlineOrderingUrl });
    }
    
    return partners;
  }

  /**
   * Get all ordering options (delivery + pickup)
   */
  private getAllOrderingOptions(config: OrderingConfig): Array<{ name: string; url: string }> {
    const options: Array<{ name: string; url: string }> = [];
    
    // Add delivery partners
    options.push(...this.getAvailableDeliveryPartners(config));
    
    // Add pickup option
    if (config.onlineOrderingUrl) {
      options.push({ name: 'online_ordering', url: config.onlineOrderingUrl });
    }
    
    return options;
  }

  /**
   * Get localized response messages
   */
  private getLocalizedMessage(messageKey: string, language: string): string {
    const messages: { [key: string]: { [lang: string]: string } } = {
      'no_ordering_intent': {
        'en': "I'd be happy to help with other questions about our restaurant!",
        'es': "¡Me encantaría ayudarte con otras preguntas sobre nuestro restaurante!"
      },
      'delivery_not_available': {
        'en': "We don't currently offer delivery, but you can order for pickup!",
        'es': "Actualmente no ofrecemos entrega, ¡pero puedes ordenar para recoger!"
      },
      'delivery_options': {
        'en': "Great! You can order delivery through DoorDash, Uber Eats, or GrubHub.",
        'es': "¡Excelente! Puedes ordenar entrega a través de DoorDash, Uber Eats o GrubHub."
      },
      'no_delivery_partners': {
        'en': "We don't have delivery partners set up yet, but you can order for pickup!",
        'es': "Aún no tenemos socios de entrega configurados, ¡pero puedes ordenar para recoger!"
      },
      'pickup_available': {
        'en': "Perfect! You can place a pickup order through our website.",
        'es': "¡Perfecto! Puedes hacer un pedido para recoger en nuestro sitio web."
      },
      'pickup_call_only': {
        'en': "Great! For pickup orders, please call us directly and we'll have it ready.",
        'es': "¡Excelente! Para pedidos para recoger, llámanos directamente y lo tendremos listo."
      },
      'ordering_options': {
        'en': "You can order delivery through our delivery partners or pickup directly from us!",
        'es': "¡Puedes ordenar entrega a través de nuestros socios de entrega o recoger directamente de nosotros!"
      },
      'doordash_available': {
        'en': "Perfect! You can order through DoorDash for delivery.",
        'es': "¡Perfecto! Puedes ordenar a través de DoorDash para entrega."
      },
      'ubereats_available': {
        'en': "Great! You can order through Uber Eats for delivery.",
        'es': "¡Excelente! Puedes ordenar a través de Uber Eats para entrega."
      },
      'grubhub_available': {
        'en': "Excellent! You can order through GrubHub for delivery.",
        'es': "¡Excelente! Puedes ordenar a través de GrubHub para entrega."
      },
      'direct_ordering': {
        'en': "You can order directly through our website for pickup or delivery!",
        'es': "¡Puedes ordenar directamente a través de nuestro sitio web para recoger o entrega!"
      },
      'partner_not_available': {
        'en': "That delivery option isn't available, but we have other ways to order!",
        'es': "Esa opción de entrega no está disponible, ¡pero tenemos otras formas de ordenar!"
      }
    };
    
    return messages[messageKey]?.[language] || messages[messageKey]?.['en'] || 
           "I can help you with ordering! Please let me know what you'd like.";
  }

  /**
   * Generate ordering response with links/URLs
   */
  generateOrderingResponse(orderingResponse: OrderingResponse, language: string = 'en'): string {
    let response = orderingResponse.message;
    
    // Add helpful information about available options
    if (orderingResponse.orderingOptions.length > 0) {
      const optionsText = language === 'es' ? 
        ' Opciones disponibles: ' : ' Available options: ';
      
      const formattedOptions = orderingResponse.orderingOptions
        .map(option => {
          switch (option) {
            case 'doordash': return 'DoorDash';
            case 'ubereats': return 'Uber Eats';
            case 'grubhub': return 'GrubHub';
            case 'online_ordering': return language === 'es' ? 'Pedidos en línea' : 'Online ordering';
            case 'direct': return language === 'es' ? 'Pedido directo' : 'Direct ordering';
            default: return option;
          }
        })
        .join(', ');
      
      response += optionsText + formattedOptions + '.';
    }
    
    // Add call-to-action if URL is available
    if (orderingResponse.redirectUrl) {
      const ctaText = language === 'es' ? 
        ' ¿Te gustaría que te envíe el enlace por mensaje de texto?' : 
        ' Would you like me to text you the link?';
      
      response += ctaText;
    }
    
    return response;
  }

  /**
   * Check if message contains ordering intent
   */
  hasOrderingIntent(message: string): boolean {
    const orderingKeywords = [
      'order', 'delivery', 'takeout', 'pickup', 'food', 'menu',
      'deliver', 'delivered', 'ordering', 'place an order',
      'order food', 'get food', 'food delivery', 'take out',
      'pick up', 'ordenar', 'entrega', 'comida', 'pedido'
    ];
    
    const lowerMessage = message.toLowerCase();
    return orderingKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

export const orderingService = new OrderingService();