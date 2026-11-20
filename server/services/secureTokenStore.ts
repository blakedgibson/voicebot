/**
 * Secure Token Store for WebSocket Authentication
 * Manages temporary secure tokens for Twilio WebSocket connections
 */
class SecureTokenStore {
  private tokens = new Map<string, {
    token: string;
    phoneNumber: string;
    callSid: string;
    expiry: number;
  }>();

  private readonly TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate and store a secure token for a call
   */
  generateToken(callSid: string, phoneNumber: string): string {
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    this.tokens.set(callSid, {
      token,
      phoneNumber,
      callSid,
      expiry: Date.now() + this.TOKEN_TTL
    });

    console.log(`🔐 Generated secure token for call ${callSid}`);
    return token;
  }

  /**
   * Validate a token for WebSocket connection
   */
  validateToken(callSid: string, token: string, phoneNumber: string): boolean {
    const storedData = this.tokens.get(callSid);
    
    if (!storedData) {
      console.error('❌ No token found for call:', callSid);
      return false;
    }

    // Check expiry
    if (Date.now() > storedData.expiry) {
      console.error('❌ Token expired for call:', callSid);
      this.tokens.delete(callSid); // Clean up expired token
      return false;
    }

    // Check token match
    if (storedData.token !== token) {
      console.error('❌ Invalid token for call:', callSid);
      return false;
    }

    // Check phone number match
    if (storedData.phoneNumber !== phoneNumber) {
      console.error('❌ Phone number mismatch for call:', callSid);
      return false;
    }

    console.log(`✅ Token validated for call ${callSid}`);
    return true;
  }

  /**
   * Remove token after successful validation or call end
   */
  removeToken(callSid: string): void {
    this.tokens.delete(callSid);
    console.log(`🗑️ Removed token for call ${callSid}`);
  }

  /**
   * Clean up expired tokens periodically
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [callSid, data] of this.tokens.entries()) {
      if (now > data.expiry) {
        this.tokens.delete(callSid);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired tokens`);
    }
  }

  /**
   * Get current token count for monitoring
   */
  getTokenCount(): number {
    return this.tokens.size;
  }
}

// Create singleton instance
export const secureTokenStore = new SecureTokenStore();

// DISABLED: This setInterval was blocking server startup by running during module import
// TODO: Move to background jobs initialization
// // Clean up expired tokens every 2 minutes
// setInterval(() => secureTokenStore.cleanup(), 2 * 60 * 1000);