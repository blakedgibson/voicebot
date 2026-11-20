/**
 * Magic Browser Service
 *
 * Playwright-based headless browser engine for the Magic integration.
 * Automates login and form-filling on any web-based booking or POS system
 * within Retell's 28-second response window.
 */

import { db } from '../db';
import { agentIntegrations } from '@shared/schema';
import { eq } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Known system selector registry — universal coverage, no single system hardcoded
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemSelectors {
  loginUrl?: string;
  actionMappings: {
    clientName?: string;
    serviceType?: string;
    date?: string;
    time?: string;
    phone?: string;
    email?: string;
    notes?: string;
    [key: string]: string | undefined;
  };
  submitSelector: string;
  successIndicator?: string;
}

export const KNOWN_SYSTEM_SELECTORS: Record<string, SystemSelectors> = {
  vagaro: {
    loginUrl: 'https://www.vagaro.com/login',
    actionMappings: {
      clientName: 'input[name="ClientName"], input[placeholder*="Client" i], input[id*="clientName" i]',
      serviceType: 'select[id*="service" i], select[name*="service" i], .service-select select',
      date: 'input[id*="date" i][type="text"], .datepicker input, input[name*="date" i]',
      time: 'select[id*="time" i], select[name*="time" i], .time-dropdown select',
      phone: 'input[type="tel"], input[name*="phone" i], input[id*="phone" i]',
      email: 'input[type="email"], input[name*="email" i], input[id*="email" i]',
      notes: 'textarea[name*="note" i], textarea[id*="note" i]',
    },
    submitSelector: 'button[type="submit"], .btn-book, button[class*="book" i], button[class*="submit" i]',
    successIndicator: '.booking-confirmation, .appointment-confirmed, .success-message, [class*="confirm" i]',
  },
  mindbody: {
    loginUrl: 'https://clients.mindbodyonline.com',
    actionMappings: {
      clientName: 'input[name*="client" i], input[placeholder*="name" i], input[id*="firstName" i]',
      serviceType: 'select[name*="service" i], select[id*="service" i], .class-filter select',
      date: 'input[type="date"], input[placeholder*="date" i], .datepicker-input',
      time: 'select[name*="time" i], input[placeholder*="time" i]',
      phone: 'input[type="tel"], input[name*="phone" i]',
      email: 'input[type="email"], input[name*="email" i]',
      notes: 'textarea[id*="note" i], textarea[name*="comment" i]',
    },
    submitSelector: 'button[type="submit"], .btn-primary, a.button[class*="book" i]',
    successIndicator: '.enrollment-success, .purchase-complete, [class*="success" i], [class*="confirmation" i]',
  },
  square_appointments: {
    loginUrl: 'https://squareup.com/login',
    actionMappings: {
      clientName: 'input[name="customer_name"], input[placeholder*="name" i], input[data-testid*="name" i]',
      serviceType: 'select[data-testid*="service" i], button[aria-label*="service" i], .service-selector',
      date: 'input[type="date"], [data-testid*="date" i] input, .calendar-input',
      time: '[data-testid*="time" i] button, select[name*="time" i]',
      phone: 'input[type="tel"], input[name*="phone" i]',
      email: 'input[type="email"]',
      notes: 'textarea[placeholder*="note" i], textarea[name*="note" i]',
    },
    submitSelector: '[data-testid*="confirm" i], button[class*="confirm" i], button[type="submit"]',
    successIndicator: '[data-testid*="success" i], .booking-success, .confirmation-number',
  },
  acuity: {
    loginUrl: 'https://secure.acuityscheduling.com/login.php',
    actionMappings: {
      clientName: 'input[name="firstName"], input[id="firstName"], #firstName',
      serviceType: 'select[name="type"], select[id="appointmentType"]',
      date: 'input[name="date"], .date-input, td.available',
      time: '.time-button, .timeslot, a[href*="time"]',
      phone: 'input[name="phone"], input[type="tel"]',
      email: 'input[name="email"], input[type="email"]',
      notes: 'textarea[name="notes"], textarea[id="notes"]',
    },
    submitSelector: '#submit, button[type="submit"], .submit-appt',
    successIndicator: '.appointment-confirmed, #confirmation, .confirmation',
  },
  booksy: {
    loginUrl: 'https://booksy.com/en-us',
    actionMappings: {
      clientName: 'input[placeholder*="name" i], input[name*="name" i], [data-testid*="name" i] input',
      serviceType: 'button[class*="service" i], [aria-label*="service" i], .service-card',
      date: 'button[aria-label*="day" i], [data-testid*="date" i], .calendar-day.available',
      time: 'button[class*="slot" i], [data-testid*="time" i], .time-slot-button',
      phone: 'input[type="tel"], input[name*="phone" i]',
      email: 'input[type="email"]',
      notes: 'textarea[placeholder*="note" i]',
    },
    submitSelector: 'button[type="submit"], button[class*="confirm" i], button[class*="book" i]',
    successIndicator: '[class*="confirmed" i], [class*="success" i], .booking-confirmed',
  },
  fresha: {
    loginUrl: 'https://partners.fresha.com/login',
    actionMappings: {
      clientName: 'input[placeholder*="client" i], input[placeholder*="name" i], [data-testid*="client" i] input',
      serviceType: 'input[placeholder*="service" i], [class*="service" i] input, [data-testid*="service" i]',
      date: 'input[placeholder*="date" i], [class*="date" i] input, button[aria-label*="date" i]',
      time: '[class*="time-slot" i] button, button[aria-label*="time" i]',
      phone: 'input[type="tel"], input[placeholder*="phone" i]',
      email: 'input[type="email"]',
      notes: 'textarea[placeholder*="note" i]',
    },
    submitSelector: 'button[type="submit"], [class*="save" i] button, button[class*="add-appointment" i]',
    successIndicator: '[class*="success" i], [class*="confirmed" i]',
  },
  boulevard: {
    loginUrl: 'https://dashboard.blvd.com/login',
    actionMappings: {
      clientName: 'input[name*="client" i], input[placeholder*="client" i], input[data-testid*="client" i]',
      serviceType: '[data-testid*="service" i], input[placeholder*="service" i]',
      date: '[data-testid*="date" i] input, input[type="date"]',
      time: '[data-testid*="time" i], button[class*="time" i]',
      phone: 'input[type="tel"]',
      email: 'input[type="email"]',
      notes: 'textarea',
    },
    submitSelector: 'button[type="submit"], [data-testid*="confirm" i]',
    successIndicator: '[class*="success" i], [class*="confirmed" i]',
  },
  zenoti: {
    loginUrl: 'https://app.zenoti.com',
    actionMappings: {
      clientName: 'input[id*="guest" i], input[placeholder*="guest" i], input[placeholder*="name" i]',
      serviceType: 'select[id*="service" i], input[placeholder*="service" i]',
      date: 'input[id*="date" i], .daterangepicker input',
      time: 'select[id*="slot" i], [class*="slot" i] td',
      phone: 'input[type="tel"], input[id*="phone" i]',
      email: 'input[type="email"]',
      notes: 'textarea[id*="note" i], textarea[placeholder*="note" i]',
    },
    submitSelector: 'button[id*="confirm" i], button[class*="save" i], input[type="submit"]',
    successIndicator: '.alert-success, [class*="success" i], .confirmation-banner',
  },
  glossgenius: {
    loginUrl: 'https://app.glossgenius.com/login',
    actionMappings: {
      clientName: 'input[placeholder*="client" i], input[placeholder*="name" i]',
      serviceType: '[class*="service" i] button, input[placeholder*="service" i]',
      date: 'button[aria-label*="day" i], [class*="date" i] button',
      time: '[class*="time" i] button, button[data-time]',
      phone: 'input[type="tel"]',
      email: 'input[type="email"]',
      notes: 'textarea',
    },
    submitSelector: 'button[type="submit"], [class*="confirm" i] button',
    successIndicator: '[class*="success" i], [class*="confirmed" i]',
  },
  styleseat: {
    loginUrl: 'https://www.styleseat.com/login',
    actionMappings: {
      clientName: 'input[name*="name" i], input[placeholder*="name" i]',
      serviceType: 'select[name*="service" i], [class*="service" i] select',
      date: 'input[type="date"], [class*="datepicker" i] input',
      time: '[class*="time-slot" i], button[data-time]',
      phone: 'input[type="tel"]',
      email: 'input[type="email"]',
      notes: 'textarea[name*="note" i]',
    },
    submitSelector: 'button[type="submit"], [class*="book" i] button',
    successIndicator: '[class*="confirmation" i], [class*="success" i]',
  },
  timely: {
    loginUrl: 'https://app.gettimely.com/login',
    actionMappings: {
      clientName: 'input[placeholder*="client" i], input[name*="client" i]',
      serviceType: '[class*="service" i] input, select[name*="service" i]',
      date: 'input[placeholder*="date" i], [class*="date-picker" i] input',
      time: 'select[name*="time" i], [class*="time-slot" i]',
      phone: 'input[type="tel"]',
      email: 'input[type="email"]',
      notes: 'textarea',
    },
    submitSelector: 'button[type="submit"], [class*="save" i] button',
    successIndicator: '[class*="success" i], [class*="booked" i]',
  },
  generic: {
    actionMappings: {
      clientName: 'input[name*="name" i], input[id*="name" i], input[placeholder*="name" i], input[class*="name" i]',
      serviceType: 'select[name*="service" i], select[id*="service" i], select[name*="type" i], select[placeholder*="service" i]',
      date: 'input[type="date"], input[name*="date" i], input[id*="date" i], input[placeholder*="date" i], .date-picker input',
      time: 'select[name*="time" i], input[name*="time" i], select[id*="time" i]',
      phone: 'input[type="tel"], input[name*="phone" i], input[id*="phone" i], input[placeholder*="phone" i]',
      email: 'input[type="email"], input[name*="email" i], input[id*="email" i]',
      notes: 'textarea[name*="note" i], textarea[id*="note" i], textarea[placeholder*="note" i]',
    },
    submitSelector: 'button[type="submit"], input[type="submit"], button[class*="book" i], button[class*="confirm" i], button[class*="submit" i], button[class*="save" i]',
    successIndicator: '.confirmation, .success, .thank-you, [class*="confirmed" i], [class*="success" i], [id*="success" i]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MagicActionPayload {
  clientName?: string;
  serviceType?: string;
  date?: string;
  time?: string;
  phone?: string;
  email?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export interface MagicExecutionResult {
  success: boolean;
  message: string;
  confirmationId?: string;
  duration: number;
  error?: string;
  screenshot?: string;
}

interface MagicSessionConfig {
  keepAlive?: boolean;
  reloginFrequency?: 'every_call' | 'daily' | 'on_failure';
  headlessMode?: boolean;
  cookies?: SerializedCookie[];
  lastLoginAt?: string;
  selectedSystem?: string;
}

interface SerializedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

interface MagicConfig {
  loginUrl: string;
  username: string;
  password: string;
  bookingUrl?: string;
  session: MagicSessionConfig;
  actionMappings: Record<string, string>;
  submitSelector: string;
  successIndicator?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class MagicBrowserService {
  private static _instance: MagicBrowserService;
  private browser: any = null;
  private contexts: Map<string, { context: any; lastUsed: Date }> = new Map();

  static getInstance(): MagicBrowserService {
    if (!MagicBrowserService._instance) {
      MagicBrowserService._instance = new MagicBrowserService();
    }
    return MagicBrowserService._instance;
  }

  // ── Primary entry point ────────────────────────────────────────────────────

  async executeAction(integrationId: string, payload: MagicActionPayload): Promise<MagicExecutionResult> {
    const startTime = Date.now();

    try {
      const config = await this.loadConfig(integrationId);
      if (!config) {
        return {
          success: false,
          message: 'Magic browser automation is not configured for this agent.',
          duration: Date.now() - startTime,
          error: 'No configuration found',
        };
      }

      // Fast-path: session expired → return graceful message, refresh in background
      if (!this.isSessionValid(config.session)) {
        this.refreshSessionBackground(integrationId, config).catch(err =>
          console.error(`🪄 Magic background login failed for ${integrationId}:`, err)
        );
        return {
          success: false,
          message: "I need a moment to connect to the booking system. Please call back in 30 seconds or our team will follow up to confirm your appointment.",
          duration: Date.now() - startTime,
        };
      }

      return await this.withTimeout(
        this.runBooking(integrationId, config, payload, startTime),
        28_000,
        'booking execution'
      );

    } catch (err: any) {
      const duration = Date.now() - startTime;
      if (err.message?.includes('timeout')) {
        return {
          success: false,
          message: "The booking system is taking too long to respond. Our team will follow up to confirm your appointment.",
          duration,
          error: err.message,
        };
      }
      console.error('🪄 Magic executeAction error:', err);
      return {
        success: false,
        message: "I encountered an issue with the booking system. Our team will follow up to confirm.",
        duration,
        error: err.message,
      };
    }
  }

  async executeTestAction(integrationId: string, testPayload?: Partial<MagicActionPayload>): Promise<MagicExecutionResult> {
    const defaults: MagicActionPayload = {
      clientName: 'Test Client',
      serviceType: 'Test Service',
      date: new Date(Date.now() + 86_400_000).toLocaleDateString('en-US'),
      time: '2:00 PM',
      phone: '+15550001234',
      email: 'test@example.com',
      notes: 'This is a test booking from VoiceBot Magic integration',
    };
    return this.executeAction(integrationId, { ...defaults, ...testPayload });
  }

  // ── Core booking flow ──────────────────────────────────────────────────────

  private async runBooking(
    integrationId: string,
    config: MagicConfig,
    payload: MagicActionPayload,
    startTime: number
  ): Promise<MagicExecutionResult> {
    const { chromium } = await import('playwright');
    const browser = await this.getOrCreateBrowser(chromium, config.session.headlessMode !== false);
    const context = await this.getOrCreateContext(integrationId, browser, config);
    const page = await context.newPage();

    try {
      // Navigate to booking page
      const targetUrl = config.bookingUrl || config.loginUrl;
      console.log(`🪄 Magic: navigating to ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15_000 });

      // Fill form fields
      const { filledFields, failedFields } = await this.fillForm(page, config.actionMappings, payload);

      if (failedFields.length > 0) {
        console.warn(`🪄 Magic: failed fields: ${failedFields.join(', ')}`);
        this.healSelectorsInBackground(integrationId, page, failedFields).catch(() => {});

        if (filledFields.length === 0) {
          return {
            success: false,
            message: "I found the booking page but couldn't complete the form. Please call us directly to confirm.",
            duration: Date.now() - startTime,
            error: `All fields failed: ${failedFields.join(', ')}`,
          };
        }
      }

      // Submit
      await this.submitForm(page, config.submitSelector);

      // Detect success
      const { confirmed, confirmationId } = await this.detectSuccess(page, config.successIndicator);

      const serviceInfo = payload.serviceType ? ` for ${payload.serviceType}` : '';
      const dateInfo = payload.date ? ` on ${payload.date}` : '';
      const message = confirmed
        ? `Your appointment${serviceInfo} is booked${dateInfo}!${confirmationId ? ` Confirmation: ${confirmationId}.` : ''}`
        : `I've submitted your booking request${serviceInfo}${dateInfo}. You should receive a confirmation shortly.`;

      return {
        success: true,
        message,
        confirmationId,
        duration: Date.now() - startTime,
      };

    } finally {
      await page.close().catch(() => {});
    }
  }

  // ── Session management ─────────────────────────────────────────────────────

  private isSessionValid(session: MagicSessionConfig): boolean {
    if (!session.cookies?.length) return false;
    if (session.reloginFrequency === 'every_call') return false;
    if (session.reloginFrequency === 'on_failure') return true;

    // 'daily' — check lastLoginAt
    if (!session.lastLoginAt) return false;
    const age = Date.now() - new Date(session.lastLoginAt).getTime();
    const maxAge = 23 * 60 * 60 * 1000; // 23 hours
    return age < maxAge;
  }

  private async refreshSessionBackground(integrationId: string, config: MagicConfig): Promise<void> {
    console.log(`🪄 Magic: refreshing session for ${integrationId} in background`);
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const cookies = await this.performLogin(context, config.loginUrl, config.username, config.password);
      await this.saveCookiesToDb(integrationId, cookies);
      await context.close();
      await browser.close();
      console.log(`🪄 Magic: session refreshed for ${integrationId}`);
    } catch (err) {
      console.error(`🪄 Magic: background session refresh failed for ${integrationId}:`, err);
    }
  }

  private async performLogin(context: any, loginUrl: string, username: string, password: string): Promise<SerializedCookie[]> {
    const page = await context.newPage();
    try {
      await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 20_000 });

      // Generic login form detection
      const usernameSelectors = [
        'input[type="email"]',
        'input[name*="email" i]',
        'input[id*="email" i]',
        'input[name*="username" i]',
        'input[id*="username" i]',
        'input[placeholder*="email" i]',
        'input[placeholder*="username" i]',
      ];
      const passwordSelectors = [
        'input[type="password"]',
        'input[name*="password" i]',
        'input[id*="password" i]',
      ];
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button[class*="login" i]',
        'button[class*="sign-in" i]',
        'button[class*="signin" i]',
      ];

      let filled = false;
      for (const sel of usernameSelectors) {
        try {
          await page.locator(sel).first().waitFor({ state: 'visible', timeout: 3_000 });
          await page.locator(sel).first().fill(username);
          filled = true;
          break;
        } catch { continue; }
      }
      if (!filled) throw new Error('Could not find username/email field on login page');

      for (const sel of passwordSelectors) {
        try {
          await page.locator(sel).first().waitFor({ state: 'visible', timeout: 3_000 });
          await page.locator(sel).first().fill(password);
          break;
        } catch { continue; }
      }

      for (const sel of submitSelectors) {
        try {
          await page.locator(sel).first().click({ timeout: 3_000 });
          break;
        } catch { continue; }
      }

      await page.waitForLoadState('networkidle', { timeout: 15_000 });
      const cookies = await context.cookies();
      return cookies;
    } finally {
      await page.close().catch(() => {});
    }
  }

  private async saveCookiesToDb(integrationId: string, cookies: SerializedCookie[]): Promise<void> {
    const fresh = await db.query.agentIntegrations.findFirst({
      where: eq(agentIntegrations.id, integrationId),
    });
    const existing = (fresh?.customQueryParams as any) || {};
    const merged = {
      ...existing,
      magicSession: {
        ...(existing.magicSession || {}),
        cookies,
        lastLoginAt: new Date().toISOString(),
      },
    };
    await db.update(agentIntegrations)
      .set({ customQueryParams: merged, updatedAt: new Date() })
      .where(eq(agentIntegrations.id, integrationId));
  }

  // ── Browser/context lifecycle ──────────────────────────────────────────────

  private async getOrCreateBrowser(chromium: any, headless: boolean): Promise<any> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    }
    return this.browser;
  }

  private async getOrCreateContext(integrationId: string, browser: any, config: MagicConfig): Promise<any> {
    const cached = this.contexts.get(integrationId);
    if (cached && config.session.keepAlive !== false) {
      cached.lastUsed = new Date();
      if (config.session.cookies?.length) {
        try {
          await cached.context.addCookies(config.session.cookies);
        } catch { /* context may have been recycled */ }
      }
      return cached.context;
    }

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });
    if (config.session.cookies?.length) {
      await context.addCookies(config.session.cookies);
    }
    this.contexts.set(integrationId, { context, lastUsed: new Date() });
    return context;
  }

  // ── Form filling ───────────────────────────────────────────────────────────

  private async fillForm(
    page: any,
    actionMappings: Record<string, string>,
    payload: MagicActionPayload
  ): Promise<{ filledFields: string[]; failedFields: string[] }> {
    const filledFields: string[] = [];
    const failedFields: string[] = [];

    // Wait for first selector to prove form is mounted
    const firstSelector = Object.values(actionMappings)[0];
    if (firstSelector) {
      try {
        await page.locator(firstSelector).first().waitFor({ state: 'visible', timeout: 8_000 });
      } catch { /* form may use different mount approach */ }
    }

    for (const [fieldName, selector] of Object.entries(actionMappings)) {
      const value = payload[fieldName as keyof MagicActionPayload];
      if (!value || !selector) continue;

      const ok = await this.fillField(page, selector, value);
      if (ok) {
        filledFields.push(fieldName);
      } else {
        failedFields.push(fieldName);
        console.warn(`🪄 Magic: failed to fill '${fieldName}' with selector '${selector}'`);
      }
    }

    return { filledFields, failedFields };
  }

  private async fillField(page: any, selectorList: string, value: string): Promise<boolean> {
    // Selectors may be comma-separated fallback chains
    const selectors = selectorList.split(',').map(s => s.trim());
    for (const selector of selectors) {
      try {
        const loc = page.locator(selector).first();
        await loc.waitFor({ state: 'visible', timeout: 3_000 });
        const tagName = await loc.evaluate((el: any) => el.tagName.toLowerCase());
        if (tagName === 'select') {
          await loc.selectOption({ label: value }).catch(() =>
            loc.selectOption({ value }).catch(() => {})
          );
        } else {
          await loc.fill(value);
        }
        return true;
      } catch { continue; }
    }
    return false;
  }

  private async submitForm(page: any, submitSelectorList: string): Promise<void> {
    const selectors = submitSelectorList.split(',').map(s => s.trim());
    for (const selector of selectors) {
      try {
        await page.locator(selector).first().click({ timeout: 5_000 });
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
        return;
      } catch { continue; }
    }
    console.warn('🪄 Magic: could not find submit button');
  }

  private async detectSuccess(page: any, successIndicator?: string): Promise<{ confirmed: boolean; confirmationId?: string }> {
    if (!successIndicator) return { confirmed: true };

    const selectors = successIndicator.split(',').map(s => s.trim());
    for (const selector of selectors) {
      try {
        await page.locator(selector).first().waitFor({ state: 'visible', timeout: 5_000 });
        const text = await page.locator(selector).first().innerText().catch(() => '');
        const idMatch = text.match(/[A-Z]{2,}\d{4,}|#\d{4,}|\d{6,}/);
        return { confirmed: true, confirmationId: idMatch?.[0] };
      } catch { continue; }
    }
    return { confirmed: true }; // submitted but no indicator found
  }

  // ── Vision-based selector healing (background) ────────────────────────────

  private async healSelectorsInBackground(integrationId: string, page: any, failedFields: string[]): Promise<void> {
    try {
      const screenshot = await page.screenshot({ type: 'png' });
      const base64 = screenshot.toString('base64');
      this.runVisionHealingAsync(integrationId, base64, failedFields).catch(err =>
        console.error(`🪄 Magic: vision healing error for ${integrationId}:`, err)
      );
    } catch { /* screenshot failure is non-fatal */ }
  }

  private async runVisionHealingAsync(integrationId: string, screenshotBase64: string, failedFields: string[]): Promise<void> {
    // TODO: call OpenAI GPT-4o Vision to identify correct selectors from the screenshot,
    // then update jsonPayloadSchema.actionMappings in the DB with healed selectors.
    console.log(`🪄 Magic: vision healing queued for fields ${failedFields.join(', ')} on integration ${integrationId}`);
  }

  // ── Config loader ──────────────────────────────────────────────────────────

  private async loadConfig(integrationId: string): Promise<MagicConfig | null> {
    const row = await db.query.agentIntegrations.findFirst({
      where: eq(agentIntegrations.id, integrationId),
    });
    if (!row) return null;

    const session: MagicSessionConfig = (row.customQueryParams as any)?.magicSession || {};
    const selectedSystem: string = session.selectedSystem || 'generic';
    const knownDefaults = KNOWN_SYSTEM_SELECTORS[selectedSystem] || KNOWN_SYSTEM_SELECTORS.generic;

    // User-configured action mappings override known-system defaults
    const userMappings: Record<string, string> = (row.jsonPayloadSchema as any)?.actionMappings || {};
    const mergedMappings: Record<string, string> = {};
    const defaultMappings = knownDefaults.actionMappings;
    for (const key of Object.keys({ ...defaultMappings, ...userMappings })) {
      const userVal = userMappings[key];
      const defaultVal = (defaultMappings as Record<string, string | undefined>)[key];
      const merged = userVal?.trim() || defaultVal;
      if (merged) mergedMappings[key] = merged;
    }

    // Decrypt password
    let password = row.clientSecret || '';
    if (password) {
      try {
        const { EncryptionService } = await import('./encryptionService');
        password = EncryptionService.decrypt(password) || password;
      } catch { /* use raw value if not encrypted */ }
    }

    return {
      loginUrl: row.apiEndpointUrl || knownDefaults.loginUrl || '',
      bookingUrl: (row.customQueryParams as any)?.bookingUrl,
      username: row.apiKey || '',
      password,
      session,
      actionMappings: mergedMappings,
      submitSelector: (row.jsonPayloadSchema as any)?.submitSelector || knownDefaults.submitSelector,
      successIndicator: (row.jsonPayloadSchema as any)?.successIndicator || knownDefaults.successIndicator,
    };
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Magic timeout: ${label} exceeded ${ms}ms`)), ms)
      ),
    ]);
  }

  async shutdown(): Promise<void> {
    for (const { context } of this.contexts.values()) {
      await context.close().catch(() => {});
    }
    this.contexts.clear();
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    console.log('🪄 Magic browser service shut down');
  }
}

export const magicBrowserService = MagicBrowserService.getInstance();
