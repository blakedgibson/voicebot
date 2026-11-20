import type { Request } from 'express';

/**
 * Resolves the base URL for the application using a prioritized strategy.
 * In Replit deployments, REPLIT_DEV_DOMAIN is an internal domain that is NOT
 * publicly accessible. The public domain is in REPLIT_DOMAINS or must be set
 * explicitly via PRODUCTION_URL.
 */
export function resolveBaseUrl(req?: Request): string {
  // Strategy 1: If we have a request, use the forwarded headers (most reliable)
  if (req) {
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('x-forwarded-host') || req.get('host');
    
    if (host) {
      return `${protocol}://${host}`;
    }
  }
  
  // Strategy 2: Check for explicitly set environment variables
  if (process.env.PRODUCTION_URL) {
    return process.env.PRODUCTION_URL;
  }

  if (process.env.REPL_URL) {
    return process.env.REPL_URL;
  }

  // Strategy 3: In Replit deployments, REPLIT_DEPLOYMENT is set.
  // Use REPLIT_DOMAINS which contains the public-facing domain(s).
  // REPLIT_DEV_DOMAIN in deployments is an internal picard domain that
  // external services like Twilio cannot reach.
  if (process.env.REPLIT_DEPLOYMENT === '1') {
    if (process.env.REPLIT_DOMAINS) {
      const publicDomain = process.env.REPLIT_DOMAINS.split(',')[0];
      if (publicDomain) {
        console.log(`🌐 Deployment detected, using public domain: ${publicDomain}`);
        return `https://${publicDomain}`;
      }
    }
  }
  
  // Strategy 4: Use REPLIT_DEV_DOMAIN (development environment only)
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Strategy 5: Construct from Replit environment variables
  const replSlug = process.env.REPL_SLUG;
  const replOwner = process.env.REPL_OWNER;
  
  if (replSlug && replOwner) {
    return `https://${replSlug}.${replOwner}.replit.app`;
  }
  
  // Strategy 6: Use default port for local development
  if (process.env.NODE_ENV === 'development' && !replSlug) {
    return `http://localhost:${process.env.PORT || 5000}`;
  }
  
  // Fallback - this should not happen in production
  throw new Error('Unable to resolve base URL. Please set PRODUCTION_URL environment variable.');
}

/**
 * Get webhook URLs for Twilio configuration
 */
export function getWebhookUrls(baseUrl: string) {
  return {
    voiceUrl: `${baseUrl}/api/voice/incoming`,
    smsUrl: `${baseUrl}/api/sms/incoming-message`,
    statusCallback: `${baseUrl}/api/voice/status-callback`
  };
}