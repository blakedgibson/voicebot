/**
 * Email Verification Service
 * Handles email verification token generation and sending verification emails
 * Emails sent from: verify@voicebot.one
 */

import crypto from 'crypto';
import { getUncachableResendClient } from './resendService';
import { storage } from '../storage';

const FROM_EMAIL = 'VoiceBot <verify@voicebot.one>';
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

interface VerificationEmailData {
  recipientEmail: string;
  recipientName?: string;
  verificationUrl: string;
}

/**
 * Generate a secure verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get verification token expiry date (24 hours from now)
 */
export function getVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);
  return expiry;
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
  try {
    const { client } = await getUncachableResendClient();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - VoiceBot</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #ffffff; max-width: 600px; margin: 0 auto; padding: 0; background: #0D0D0D;">
          <!-- Header -->
          <div style="background: #0D0D0D; padding: 40px 20px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">
              Voice<span style="background: linear-gradient(to right, #60A5FA, #2563EB); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Bot</span>
            </h1>
          </div>

          <!-- Main Content -->
          <div style="background: #0D0D0D; padding: 40px 30px;">
            <!-- Title -->
            <h2 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0 0 20px 0; text-align: center;">
              Verify Your Email Address
            </h2>

            <!-- Greeting -->
            <p style="color: #D1D5DB; font-size: 16px; margin: 0 0 24px 0;">
              ${data.recipientName ? `Hi ${data.recipientName},` : 'Hi there,'}
            </p>

            <!-- Message -->
            <p style="color: #D1D5DB; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">
              Thank you for signing up for VoiceBot! To complete your registration and start using your AI voice agent, please verify your email address by clicking the button below.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.verificationUrl}" style="display: inline-block; background: #2563EB; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background 0.3s ease;">
                Verify Email Address
              </a>
            </div>

            <!-- Alternative Link -->
            <p style="color: #9CA3AF; font-size: 14px; margin: 24px 0 0 0; line-height: 1.6; text-align: center;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #60A5FA; font-size: 14px; margin: 8px 0 0 0; word-break: break-all; text-align: center;">
              ${data.verificationUrl}
            </p>

            <!-- Expiry Notice -->
            <div style="background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 8px; padding: 16px; margin: 32px 0 0 0;">
              <p style="color: #D1D5DB; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong style="color: #ffffff;">⏱️ This link expires in ${VERIFICATION_TOKEN_EXPIRY_HOURS} hours.</strong><br>
                If you didn't create an account with VoiceBot, you can safely ignore this email.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #0D0D0D; padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <p style="color: #6B7280; font-size: 14px; margin: 0 0 12px 0;">
              © ${new Date().getFullYear()} VoiceBot. All rights reserved.
            </p>
            <p style="color: #6B7280; font-size: 12px; margin: 0;">
              You're receiving this email because you signed up for VoiceBot.
            </p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Verify Your Email Address

${data.recipientName ? `Hi ${data.recipientName},` : 'Hi there,'}

Thank you for signing up for VoiceBot! To complete your registration and start using your AI voice agent, please verify your email address by clicking the link below:

${data.verificationUrl}

This link expires in ${VERIFICATION_TOKEN_EXPIRY_HOURS} hours.

If you didn't create an account with VoiceBot, you can safely ignore this email.

© ${new Date().getFullYear()} VoiceBot. All rights reserved.
    `.trim();

    await client.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: 'Verify your email address - VoiceBot',
      html: htmlContent,
      text: textContent,
    });

    console.log(`📧 Verification email sent to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/**
 * Verify an email verification token
 */
export async function verifyToken(token: string): Promise<{ success: boolean; userId?: string; paymentToken?: string; error?: string }> {
  try {
    const user = await storage.getUserByVerificationToken(token);

    if (!user) {
      return { success: false, error: 'This verification link has already been used or is invalid. If your email is already verified, please log in.' };
    }

    // Check if token is expired
    if (user.emailVerificationExpires) {
      const expiryDate = new Date(user.emailVerificationExpires);
      if (expiryDate < new Date()) {
        return { success: false, error: 'Verification token has expired. Please request a new verification email.' };
      }
    }

    // Mark email as verified (clears the verification token field)
    await storage.verifyUserEmail(user.id);

    // Generate a one-time payment token so the frontend can authenticate after
    // the Stripe redirect without bypassing password validation. Stored in the
    // same DB field, expires in 24 hours, single-use (cleared on consumption).
    const paymentToken = generateVerificationToken();
    const paymentExpiry = new Date();
    paymentExpiry.setHours(paymentExpiry.getHours() + 24);
    await storage.setEmailVerificationToken(user.id, paymentToken, paymentExpiry.toISOString());

    // Auto-create 14-day free trial with 100 minutes
    try {
      const existingTrial = await storage.getUserTrial(user.id);
      if (!existingTrial) {
        await storage.createUserTrial(user.id);
        console.log(`🎉 Created 14-day trial with 100 minutes for user ${user.id}`);
      }
    } catch (error) {
      console.error('Failed to create trial:', error);
      // Don't fail verification if trial creation fails
    }

    console.log(`✅ Email verified for user ${user.id}`);
    return { success: true, userId: user.id, paymentToken };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { success: false, error: 'Verification failed' };
  }
}

/**
 * Generate and store verification token for a user
 */
export async function createVerificationToken(userId: string): Promise<string> {
  const token = generateVerificationToken();
  const expires = getVerificationExpiry();

  await storage.setEmailVerificationToken(userId, token, expires.toISOString());

  return token;
}

/**
 * Resend verification email to a user
 */
export async function resendVerificationEmail(email: string, baseUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await storage.getUserByEmail(email);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.emailVerified) {
      return { success: false, error: 'Email already verified' };
    }

    // Generate new token
    const token = await createVerificationToken(user.id);
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    // Send email
    const sent = await sendVerificationEmail({
      recipientEmail: user.email!,
      recipientName: user.firstName || undefined,
      verificationUrl,
    });

    if (!sent) {
      return { success: false, error: 'Failed to send verification email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error resending verification email:', error);
    return { success: false, error: 'Failed to resend verification email' };
  }
}
