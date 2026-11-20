import { OAuth2Client } from 'google-auth-library';
import { storage } from './storage';
import { randomUUID } from 'crypto';

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    // Use voicebot.one domain for OAuth callback
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/auth/google/callback`
    );
  }

  // Generate Google OAuth URL
  getAuthUrl(): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      prompt: 'consent'
    });
  }

  // Verify Google OAuth token
  async verifyToken(token: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      return {
        id: payload.sub,
        email: payload.email!,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        profileImageUrl: payload.picture || ''
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      throw new Error('Invalid Google token');
    }
  }

  // Handle Google OAuth callback
  async handleCallback(code: string) {
    try {
      const { tokens } = await this.client.getToken(code);
      
      if (!tokens.id_token) {
        throw new Error('No ID token received');
      }

      const userInfo = await this.verifyToken(tokens.id_token);
      
      // Check if user exists or create new one
      let user = await storage.getUserByEmail(userInfo.email);
      const isNewUser = !user;

      if (!user) {
        // Create new user
        user = await storage.upsertUser({
          id: userInfo.id,
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          profileImageUrl: userInfo.profileImageUrl,
        });
      }

      // Create session user object
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        },
        access_token: tokens.access_token || randomUUID(),
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };

      return { user, sessionUser, isNewUser };
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      throw new Error('Google authentication failed');
    }
  }
}

export const googleAuthService = new GoogleAuthService();