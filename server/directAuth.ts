import { storage } from "./storage";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface SignupData {
  fullName?: string;
  email: string;
  phone?: string;
  password: string;
}

export class DirectAuthService {
  private readonly SALT_ROUNDS = 10;
  // Create user directly without external OAuth
  async createUserDirectly(signupData: SignupData) {
    try {
      // Generate a unique user ID
      const userId = randomUUID();

      // Hash the password before storing
      const passwordHash = await this.hashPassword(signupData.password);

      // Create user in database — no in-memory fallback; a DB failure must surface
      // to the caller so the signup endpoint returns a proper error rather than
      // issuing a session for an account that was never persisted.
      const user = await storage.upsertUser({
        id: userId,
        email: signupData.email,
        firstName: signupData.fullName?.split(' ')[0] || '',
        lastName: signupData.fullName?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: '',
        passwordHash: passwordHash,
      });

      // Create a simple session object
      const sessionUser = {
        claims: {
          sub: userId,
          email: signupData.email,
          first_name: signupData.fullName?.split(' ')[0] || '',
          last_name: signupData.fullName?.split(' ').slice(1).join(' ') || '',
          profile_image_url: ''
        },
        access_token: randomUUID(), // Generate a simple token
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };

      return { user, sessionUser };
    } catch (error) {
      console.error('Direct user creation error:', error);
      throw new Error('Failed to create user account');
    }
  }

  // Simple email validation
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Simple phone validation
  validatePhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  }

  // Password validation: at least 8 chars, 1 uppercase, 1 number
  validatePassword(password: string): boolean {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    );
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}

export const directAuthService = new DirectAuthService();