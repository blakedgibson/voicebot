import express, { Request, Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { twilioService } from './services/twilioService';
import { speechToTextService } from './services/speechToTextService';
import { elevenLabsService } from './services/elevenLabsService';
import { openaiService } from './services/openaiService';
import { storage } from './storage';
import { secureTokenStore } from './services/secureTokenStore';
import { db } from './db';
import { phoneNumberAssignments, businessPhoneConnections } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const upload = multer({ storage: multer.memoryStorage() });

// In-memory cache for restaurant data to optimize response times
class RestaurantDataCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes TTL

  get(restaurantId: string) {
    const cached = this.cache.get(restaurantId);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      console.log(`⚡ Cache hit for restaurant: ${restaurantId}`);
      return cached.data;
    }
    return null;
  }

  set(restaurantId: string, data: any) {
    this.cache.set(restaurantId, { data, timestamp: Date.now() });
    console.log(`⚡ Cached restaurant data: ${restaurantId}`);
  }

  clear(restaurantId?: string) {
    if (restaurantId) {
      this.cache.delete(restaurantId);
    } else {
      this.cache.clear();
    }
  }
}

// Global restaurant cache instance 
const restaurantCache = new RestaurantDataCache();

// Per-call session cache to avoid repeated DB lookups during active calls
class CallSessionStore {
  private sessions = new Map<string, {
    restaurantData: any;
    conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>;
    lastTurnAt: number;
    callStartTime: number;
  }>();
  private readonly SESSION_TTL = 30 * 60 * 1000; // 30 minutes TTL
  
  set(callSid: string, restaurantData: any) {
    this.sessions.set(callSid, {
      restaurantData,
      conversationHistory: [],
      lastTurnAt: Date.now(),
      callStartTime: Date.now()
    });
    console.log(`🔄 Created call session for: ${callSid}`);
  }
  
  get(callSid: string) {
    const session = this.sessions.get(callSid);
    if (session && Date.now() - session.lastTurnAt < this.SESSION_TTL) {
      console.log(`⚡ Retrieved call session for: ${callSid}`);
      return session;
    }
    return null;
  }
  
  updateHistory(callSid: string, userMessage: string, assistantMessage: string) {
    const session = this.sessions.get(callSid);
    if (session) {
      session.conversationHistory.push(
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: assistantMessage }
      );
      // Keep only last 6 messages for performance
      session.conversationHistory = session.conversationHistory.slice(-6);
      session.lastTurnAt = Date.now();
      console.log(`🔄 Updated call session history for: ${callSid}`);
    }
  }
  
  cleanup(callSid?: string) {
    if (callSid) {
      this.sessions.delete(callSid);
      console.log(`🧹 Cleaned up call session: ${callSid}`);
    } else {
      // Cleanup expired sessions
      const now = Date.now();
      for (const [sid, session] of Array.from(this.sessions.entries())) {
        if (now - session.lastTurnAt > this.SESSION_TTL) {
          this.sessions.delete(sid);
          console.log(`🧹 Expired call session: ${sid}`);
        }
      }
    }
  }
  
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

// Global call session store
const callSessionStore = new CallSessionStore();

// DISABLED: This setInterval was blocking server startup by running during module import
// TODO: Move to background jobs initialization
// // Cleanup expired sessions every 5 minutes
// setInterval(() => callSessionStore.cleanup(), 5 * 60 * 1000);

export function setupTelephonyRoutes(app: express.Application) {
  
  // Standardized audio serving endpoint for ElevenLabs-generated audio
  app.get('/api/audio/:audioId', async (req: Request, res: Response) => {
    try {
      const { audioId } = req.params;
      
      // Get audio from ElevenLabs service cache
      const audioBuffer = await elevenLabsService.getCachedAudio(audioId);
      
      if (!audioBuffer) {
        console.log(`❌ Audio not found in cache: ${audioId}`);
        return res.status(404).send('Audio not found');
      }
      
      console.log(`🎵 Serving audio: ${audioId}, buffer size: ${audioBuffer.length}`);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(audioBuffer);
    } catch (error) {
      console.error('Error serving audio:', error);
      res.status(500).send('Error serving audio');
    }
  });

  // 🆕 Backup Answer Handler - handles calls when business phone doesn't answer
  app.post('/api/twilio/backup-answer-handler', async (req: Request, res: Response) => {
    try {
      const { CallSid, DialCallStatus } = req.body;
      const businessPhone = req.query.business_phone as string;
      const forwardingNumber = req.query.forwarding_number as string;
      
      console.log(`🔔 Backup answer handler: CallSid=${CallSid}, Status=${DialCallStatus}, Business=${businessPhone}`);
      
      if (DialCallStatus === 'no-answer' || DialCallStatus === 'busy' || DialCallStatus === 'failed') {
        console.log(`📞 Business phone didn't answer (${DialCallStatus}) - routing to AI receptionist`);
        
        // Get business connection details for context
        let businessConnection = null;
        let businessContext = null;
        
        try {
          const [connection] = await db
            .select()
            .from(businessPhoneConnections)
            .where(eq(businessPhoneConnections.businessPhoneNumber, businessPhone));
          
          if (connection) {
            businessConnection = connection;
            
            // Get business context
            if (connection.restaurantId) {
              const [restaurant] = await db
                .select()
                .from(restaurantData)
                .where(eq(restaurantData.id, connection.restaurantId));
              businessContext = restaurant;
            }
          }
        } catch (error) {
          console.error('❌ Error fetching business connection:', error);
        }
        
        const twiml = twilioService.createVoiceResponse();
        
        // 🕐 ENHANCED: Check business hours and after-hours behavior
        let backupMessage = "Our team is currently unavailable, but I'm here to help you.";
        let isAfterHours = false;
        let shouldEscalate = false;
        
        // Check if we're currently outside business hours
        if (businessConnection && businessConnection.restaurantId) {
          try {
            // Get business settings with proper hours and timezone
            const [businessSettings] = await db
              .select()
              .from(require('../shared/schema').businessSettings)
              .where(eq(require('../shared/schema').businessSettings.userId, businessConnection.userId));
            
            if (businessSettings && businessSettings.businessHours && businessSettings.timezone) {
              // 🕐 ROBUST: Use business timezone for both weekday and hour calculation
              const formatter = new Intl.DateTimeFormat('en-US', { 
                timeZone: businessSettings.timezone,
                weekday: 'long',
                hour: '2-digit',
                hourCycle: 'h23'
              });
              
              const parts = formatter.formatToParts(new Date());
              const currentDay = parts.find(part => part.type === 'weekday')?.value.toLowerCase() || 'monday';
              const currentHour = parseInt(parts.find(part => part.type === 'hour')?.value || '0');
              
              const businessHours = businessSettings.businessHours as any;
              const todayHours = businessHours[currentDay];
              
              if (todayHours && todayHours.isOpen && todayHours.open && todayHours.close) {
                const [openHour] = todayHours.open.split(':').map(Number);
                const [closeHour] = todayHours.close.split(':').map(Number);
                
                isAfterHours = currentHour < openHour || currentHour >= closeHour;
                console.log(`🕐 Business hours check: Current=${currentHour}h (${businessSettings.timezone}), ${currentDay}: ${openHour}-${closeHour}h, After hours=${isAfterHours}`);
              } else {
                isAfterHours = true; // Closed today
                console.log(`🕐 Business closed on ${currentDay}`);
              }
            }
          } catch (error) {
            console.error('❌ Error checking business hours:', error);
          }
        }
        
        // Handle after-hours mode and escalation logic
        if (isAfterHours && businessConnection.afterHoursMode === 'escalate' && businessConnection.escalationEnabled) {
          shouldEscalate = true;
          console.log(`🚨 After hours + escalation enabled - attempting escalation to ${businessConnection.escalationPhoneNumber}`);
        }
        
        // Set appropriate backup message based on context
        if (businessConnection?.backupAnsweringInstructions) {
          backupMessage = businessConnection.backupAnsweringInstructions;
        } else if (isAfterHours) {
          backupMessage = `We're currently closed, but I'm here to help you. Please let me know how I can assist you.`;
        }
        
        // 🚨 ESCALATION LOGIC: Try escalation phone if configured and appropriate
        if (shouldEscalate && businessConnection.escalationPhoneNumber) {
          console.log(`🚨 Attempting escalation to ${businessConnection.escalationPhoneNumber} before AI routing`);
          
          const twimlEscalation = twilioService.createVoiceResponse();
          
          // Try escalation number with shorter timeout (10 seconds)
          const escalationDial = twimlEscalation.dial({
            timeout: 10,
            action: `/api/twilio/escalation-handler?call_sid=${CallSid}&business_phone=${encodeURIComponent(businessPhone)}&forwarding_number=${encodeURIComponent(forwardingNumber)}`,
            method: 'POST'
          });
          
          escalationDial.number(businessConnection.escalationPhoneNumber);
          
          res.type('text/xml');
          res.send(twimlEscalation.toString());
          return;
        }
        
        // Route to AI system - check for Retell, ElevenLabs, or legacy configuration
        const normalizedForwarding = forwardingNumber?.trim().startsWith('+') ? 
          forwardingNumber.trim() : `+${forwardingNumber?.trim()}`;
        
        // 🆕 ENHANCED: Check for active Retell provider integration first
        try {
          const { getActiveVoiceProvider } = require('./services/VoiceAgentProviderFactory');
          const voiceProvider = getActiveVoiceProvider();
          
          if (voiceProvider.providerName === 'retell' && businessConnection?.userId) {
            console.log(`🤖 Routing backup call to Retell AI agent`);
            
            // Get user's Retell agents
            const userAgents = await storage.getUserVoiceAgents(businessConnection.userId);
            if (userAgents && userAgents.length > 0) {
              const retellAgent = userAgents[0]; // Use first available agent
              
              // Create WebSocket bridge URL for Retell
              const host = req.get('host') || req.headers.host;
              const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
              const secureToken = secureTokenStore.generateToken(CallSid, normalizedForwarding);
              const bridgeUrl = `${protocol}://${host}/media-stream?phone_number=${encodeURIComponent(normalizedForwarding)}&token=${secureToken}&call_sid=${CallSid}&agent_id=${retellAgent.id}&backup_mode=true`;
              
              const connect = twiml.connect();
              connect.stream({
                url: bridgeUrl,
                track: 'both_tracks'
              });
              
              res.type('text/xml');
              res.send(twiml.toString());
              return;
            }
          }
        } catch (retellError) {
          console.error('❌ Error checking Retell provider:', retellError);
        }
        
        // Fallback: Check for ElevenLabs configuration
        const isElevenLabsEnabled = await storage.isPhoneNumberElevenLabsEnabled(normalizedForwarding);
        
        if (isElevenLabsEnabled) {
          console.log(`🤖 Routing backup call to ElevenLabs agent (fallback)`);
          
          const agentId = await storage.getElevenLabsAgentId(normalizedForwarding);
          if (agentId) {
            const host = req.get('host') || req.headers.host;
            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
            const secureToken = secureTokenStore.generateToken(CallSid, normalizedForwarding);
            const bridgeUrl = `${protocol}://${host}/media-stream?phone_number=${encodeURIComponent(normalizedForwarding)}&token=${secureToken}&call_sid=${CallSid}&agent_id=${agentId}&backup_mode=true`;
            
            const connect = twiml.connect();
            connect.stream({
              url: bridgeUrl,
              track: 'both_tracks'
            });
          } else {
            twiml.say(backupMessage + " Please hold while I connect you to our automated assistant.");
            twiml.redirect('/api/twilio/voice');
          }
        } else {
          // Final fallback: Route to legacy OpenAI + ElevenLabs system
          console.log(`🤖 Routing backup call to legacy AI system (final fallback)`);
          twiml.say(backupMessage + " Let me help you with your inquiry.");
          twiml.redirect(`/api/twilio/voice?backup_mode=true&business_phone=${encodeURIComponent(businessPhone)}`);
        }
        
        // Log this as a backup answering call
        try {
          await storage.createTelephonyCallLog({
            id: crypto.randomUUID(),
            twilioCallSid: CallSid,
            fromNumber: req.body.From || 'unknown',
            toNumber: forwardingNumber,
            direction: 'inbound',
            status: 'backup-answered',
            startTime: new Date(),
            conversationData: {
              backupAnswering: true,
              businessPhone: businessPhone,
              businessName: businessContext?.businessName || 'Unknown Business',
              originalDialStatus: DialCallStatus
            }
          });
        } catch (logError) {
          console.error('❌ Error logging backup answer call:', logError);
        }
        
        res.type('text/xml');
        res.send(twiml.toString());
        return;
        
      } else if (DialCallStatus === 'completed') {
        console.log(`✅ Business phone answered - call handled by human`);
        
        // Log successful human answer
        try {
          await storage.createTelephonyCallLog({
            id: crypto.randomUUID(),
            twilioCallSid: CallSid,
            fromNumber: req.body.From || 'unknown',
            toNumber: forwardingNumber,
            direction: 'inbound',
            status: 'human-answered',
            startTime: new Date(),
            conversationData: {
              backupAnswering: false,
              businessPhone: businessPhone,
              handledBy: 'human'
            }
          });
        } catch (logError) {
          console.error('❌ Error logging human answer call:', logError);
        }
        
        // Call was successfully connected to human - no further action needed
        const twiml = twilioService.createVoiceResponse();
        res.type('text/xml');
        res.send(twiml.toString());
        return;
      }
      
      // Fallback for unexpected status
      console.log(`⚠️ Unexpected dial status: ${DialCallStatus} - routing to AI`);
      const twiml = twilioService.createVoiceResponse();
      twiml.redirect('/api/twilio/voice');
      res.type('text/xml');
      res.send(twiml.toString());
      
    } catch (error) {
      console.error('❌ Error in backup answer handler:', error);
      const twiml = twilioService.createVoiceResponse();
      twiml.say("I apologize, but we're experiencing technical difficulties. Please try calling again in a few minutes.");
      twiml.hangup();
      res.type('text/xml');
      res.send(twiml.toString());
    }
  });

  // 🚨 Escalation Handler - handles calls when escalation phone doesn't answer
  app.post('/api/twilio/escalation-handler', async (req: Request, res: Response) => {
    try {
      const { CallSid, DialCallStatus } = req.body;
      const businessPhone = req.query.business_phone as string;
      const forwardingNumber = req.query.forwarding_number as string;
      
      console.log(`🚨 Escalation handler: CallSid=${CallSid}, Status=${DialCallStatus}, Business=${businessPhone}`);
      
      if (DialCallStatus === 'no-answer' || DialCallStatus === 'busy' || DialCallStatus === 'failed') {
        console.log(`📞 Escalation phone didn't answer (${DialCallStatus}) - routing to AI as final backup`);
        
        // Get business connection for context
        let businessConnection = null;
        let businessContext = null;
        
        try {
          const [connection] = await db
            .select()
            .from(businessPhoneConnections)
            .where(eq(businessPhoneConnections.businessPhoneNumber, businessPhone));
          
          if (connection) {
            businessConnection = connection;
            
            if (connection.restaurantId) {
              const [restaurant] = await db
                .select()
                .from(restaurantData)
                .where(eq(restaurantData.id, connection.restaurantId));
              businessContext = restaurant;
            }
          }
        } catch (error) {
          console.error('❌ Error fetching business connection for escalation:', error);
        }
        
        const twiml = twilioService.createVoiceResponse();
        
        // Enhanced message for escalation fallback
        let escalationMessage = "I'm sorry, no one is available right now, but I'm here to assist you.";
        if (businessConnection?.backupAnsweringInstructions) {
          escalationMessage = businessConnection.backupAnsweringInstructions + " I'll do my best to help you.";
        }
        
        // Route to AI system as final backup - check for Retell, ElevenLabs, or legacy
        const normalizedForwarding = forwardingNumber?.trim().startsWith('+') ? 
          forwardingNumber.trim() : `+${forwardingNumber?.trim()}`;
        
        // 🆕 ENHANCED: Check for active Retell provider integration first
        try {
          const { getActiveVoiceProvider } = require('./services/VoiceAgentProviderFactory');
          const voiceProvider = getActiveVoiceProvider();
          
          if (voiceProvider.providerName === 'retell' && businessConnection?.userId) {
            console.log(`🤖 Routing escalation fallback to Retell AI agent`);
            
            // Get user's Retell agents
            const userAgents = await storage.getUserVoiceAgents(businessConnection.userId);
            if (userAgents && userAgents.length > 0) {
              const retellAgent = userAgents[0]; // Use first available agent
              
              // Create WebSocket bridge URL for Retell
              const host = req.get('host') || req.headers.host;
              const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
              const secureToken = secureTokenStore.generateToken(CallSid, normalizedForwarding);
              const bridgeUrl = `${protocol}://${host}/media-stream?phone_number=${encodeURIComponent(normalizedForwarding)}&token=${secureToken}&call_sid=${CallSid}&agent_id=${retellAgent.id}&escalation_fallback=true`;
              
              const connect = twiml.connect();
              connect.stream({
                url: bridgeUrl,
                track: 'both_tracks'
              });
              
              res.type('text/xml');
              res.send(twiml.toString());
              return;
            }
          }
        } catch (retellError) {
          console.error('❌ Error checking Retell provider for escalation:', retellError);
        }
        
        // Fallback: Check for ElevenLabs configuration
        const isElevenLabsEnabled = await storage.isPhoneNumberElevenLabsEnabled(normalizedForwarding);
        
        if (isElevenLabsEnabled) {
          console.log(`🤖 Routing escalation fallback to ElevenLabs agent (fallback)`);
          
          const agentId = await storage.getElevenLabsAgentId(normalizedForwarding);
          if (agentId) {
            const host = req.get('host') || req.headers.host;
            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
            const secureToken = secureTokenStore.generateToken(CallSid, normalizedForwarding);
            const bridgeUrl = `${protocol}://${host}/media-stream?phone_number=${encodeURIComponent(normalizedForwarding)}&token=${secureToken}&call_sid=${CallSid}&agent_id=${agentId}&escalation_fallback=true`;
            
            const connect = twiml.connect();
            connect.stream({
              url: bridgeUrl,
              track: 'both_tracks'
            });
          } else {
            twiml.say(escalationMessage + " Please hold while I connect you to our automated assistant.");
            twiml.redirect('/api/twilio/voice');
          }
        } else {
          // Final fallback: Route to legacy OpenAI + ElevenLabs system
          console.log(`🤖 Routing escalation fallback to legacy AI system (final fallback)`);
          twiml.say(escalationMessage);
          twiml.redirect(`/api/twilio/voice?escalation_fallback=true&business_phone=${encodeURIComponent(businessPhone)}`);
        }
        
        // Log escalation fallback
        try {
          await storage.createTelephonyCallLog({
            id: crypto.randomUUID(),
            twilioCallSid: CallSid,
            fromNumber: req.body.From || 'unknown',
            toNumber: forwardingNumber,
            direction: 'inbound',
            status: 'escalation-fallback',
            startTime: new Date(),
            conversationData: {
              backupAnswering: true,
              escalationAttempted: true,
              businessPhone: businessPhone,
              businessName: businessContext?.businessName || 'Unknown Business',
              originalDialStatus: DialCallStatus,
              escalationPhone: businessConnection?.escalationPhoneNumber || 'unknown'
            }
          });
        } catch (logError) {
          console.error('❌ Error logging escalation fallback call:', logError);
        }
        
        res.type('text/xml');
        res.send(twiml.toString());
        return;
        
      } else if (DialCallStatus === 'completed') {
        console.log(`✅ Escalation phone answered - call handled by escalation contact`);
        
        // Log successful escalation
        try {
          await storage.createTelephonyCallLog({
            id: crypto.randomUUID(),
            twilioCallSid: CallSid,
            fromNumber: req.body.From || 'unknown',
            toNumber: forwardingNumber,
            direction: 'inbound',
            status: 'escalation-answered',
            startTime: new Date(),
            conversationData: {
              backupAnswering: false,
              escalationSuccessful: true,
              businessPhone: businessPhone,
              handledBy: 'escalation'
            }
          });
        } catch (logError) {
          console.error('❌ Error logging escalation success:', logError);
        }
        
        // Call was successfully escalated - no further action needed
        const twiml = twilioService.createVoiceResponse();
        res.type('text/xml');
        res.send(twiml.toString());
        return;
      }
      
      // Fallback for unexpected escalation status
      console.log(`⚠️ Unexpected escalation status: ${DialCallStatus} - routing to AI`);
      const twiml = twilioService.createVoiceResponse();
      twiml.say("I'm here to help you with your inquiry.");
      twiml.redirect('/api/twilio/voice');
      res.type('text/xml');
      res.send(twiml.toString());
      
    } catch (error) {
      console.error('❌ Error in escalation handler:', error);
      const twiml = twilioService.createVoiceResponse();
      twiml.say("I apologize, but we're experiencing technical difficulties. Let me try to help you anyway.");
      twiml.redirect('/api/twilio/voice');
      res.type('text/xml');
      res.send(twiml.toString());
    }
  });

  // Twilio webhook for incoming calls - main handler
  const handleIncomingCall = async (req: Request, res: Response) => {
    try {
      const { From, To, CallSid } = req.body;
      
      console.log(`[telephony v3] 🔥 Incoming call from ${From} to ${To}, CallSid: ${CallSid}`);
      
      // 🆕 ENHANCED: Check for existing business phone connection forwarding
      let businessConnection = null;
      let originalBusinessNumber = null;
      
      // Check if this call is forwarded from an existing business phone number
      // When customers call a business's existing number that forwards to our Twilio number,
      // we need to identify which business it belongs to
      try {
        // Look for business phone connections where the forwarding number matches our 'To' number
        // or check if this might be a direct forwarded call
        const normalizedTo = To?.trim().startsWith('+') ? To.trim() : `+${To?.trim()}`;
        
        console.log(`🔍 Checking if call to ${normalizedTo} is from an existing business phone connection`);
        
        // Option 1: Check if To number is a known Twilio forwarding number for any business
        const businessConnections = await db
          .select()
          .from(businessPhoneConnections)
          .where(eq(businessPhoneConnections.twilioForwardingNumber, normalizedTo));
        
        if (businessConnections.length > 0) {
          businessConnection = businessConnections[0];
          originalBusinessNumber = businessConnection.businessPhoneNumber;
          console.log(`📞 Found business connection! Original business number: ${originalBusinessNumber}, forwarded to: ${normalizedTo}`);
        }
        
        // Option 2: If no direct match, check by pattern or use custom header/param if available
        // Some forwarding services include original number as a parameter
        if (!businessConnection && req.body.OriginalCalledNumber) {
          const originalCalled = req.body.OriginalCalledNumber.trim().startsWith('+') ? 
            req.body.OriginalCalledNumber.trim() : `+${req.body.OriginalCalledNumber.trim()}`;
          
          const [directConnection] = await db
            .select()
            .from(businessPhoneConnections)
            .where(eq(businessPhoneConnections.businessPhoneNumber, originalCalled.replace(/\D/g, '')));
          
          if (directConnection) {
            businessConnection = directConnection;
            originalBusinessNumber = originalCalled;
            console.log(`📞 Found business connection via OriginalCalledNumber: ${originalBusinessNumber}`);
          }
        }
      } catch (error) {
        console.error('❌ Error checking business phone connections:', error);
      }
      
      // If this is a forwarded call from an existing business number, use that context
      let targetPhoneNumber = To;
      let businessContext = null;
      
      if (businessConnection) {
        console.log(`🏢 Routing call as existing business phone connection for: ${businessConnection.businessPhoneNumber}`);
        targetPhoneNumber = originalBusinessNumber || businessConnection.businessPhoneNumber;
        
        // Get business data associated with this phone connection
        try {
          if (businessConnection.restaurantId) {
            const [restaurant] = await db
              .select()
              .from(restaurantData)
              .where(eq(restaurantData.id, businessConnection.restaurantId));
            businessContext = restaurant;
            console.log(`🏪 Found business context: ${restaurant?.businessName}`);
          }
        } catch (error) {
          console.error('❌ Error fetching business context:', error);
        }
      }
      
      // 🆕 BACKUP ANSWERING SYSTEM: Ring business first, AI second
      if (businessConnection && businessConnection.backupAnsweringEnabled) {
        console.log(`🔔 Backup answering ENABLED for ${businessConnection.businessPhoneNumber} - implementing sequential dialing`);
        
        const twiml = twilioService.createVoiceResponse();
        
        // Create sequential dial that rings business phone first, then routes to AI
        const dial = twiml.dial({
          sequential: true,
          timeout: businessConnection.ringTimeoutSeconds || 20,
          action: `/api/twilio/backup-answer-handler?call_sid=${CallSid}&business_phone=${encodeURIComponent(businessConnection.businessPhoneNumber)}&forwarding_number=${encodeURIComponent(To)}`,
          method: 'POST'
        });
        
        // Ring the business phone first
        dial.number(businessConnection.businessPhoneNumber);
        
        console.log(`🔔 Sequential dial setup: Ring ${businessConnection.businessPhoneNumber} for ${businessConnection.ringTimeoutSeconds || 20} seconds, then route to AI`);
        
        res.type('text/xml');
        res.send(twiml.toString());
        return;
      }
      
      // 🔄 First, check if this phone number uses Retell AI
      const normalizedTarget = targetPhoneNumber?.trim().startsWith('+') ? 
        targetPhoneNumber.trim() : `+${targetPhoneNumber?.trim()}`;
      
      // Get phone number assignment to check for Retell AI agent
      let phoneAssignment = null;
      try {
        phoneAssignment = await storage.getPhoneNumberAssignmentByNumber(normalizedTarget);
      } catch (error) {
        console.log(`⚠️ Could not get phone assignment for ${normalizedTarget}:`, error);
      }

      // 🔒 CRITICAL: Check trial and subscription limits before allowing call
      if (phoneAssignment?.userId) {
        try {
          const { TrialService } = await import('./services/TrialService');
          const trialService = new TrialService();

          // Check if user can make calls (trial limits, subscription status)
          const canCall = await trialService.canMakeCall(phoneAssignment.userId);
          if (!canCall.allowed) {
            console.log(`🚫 Call blocked for user ${phoneAssignment.userId}: ${canCall.reason}`);

            // Return TwiML response informing caller that service is unavailable
            const twiml = twilioService.createVoiceResponse();
            twiml.say({
              voice: 'Polly.Joanna'
            }, 'We are sorry, but this service is currently unavailable. Please try again later.');
            twiml.hangup();

            res.type('text/xml');
            res.send(twiml.toString());
            return;
          }

          // Also check subscription service status if they have a subscription
          const subscription = await storage.getUserSubscription(phoneAssignment.userId);
          if (subscription && subscription.serviceStatus === 'suspended') {
            console.log(`🚫 Call blocked for user ${phoneAssignment.userId}: Subscription suspended`);

            const twiml = twilioService.createVoiceResponse();
            twiml.say({
              voice: 'Polly.Joanna'
            }, 'We are sorry, but this service is currently unavailable due to account suspension. Please contact support.');
            twiml.hangup();

            res.type('text/xml');
            res.send(twiml.toString());
            return;
          }

          // Check "Stop Service at Limit" — block call if user has exhausted their minutes
          if (subscription) {
            const dbUser = await storage.getUser(phoneAssignment.userId);
            if (dbUser?.billingStopServiceAtLimit) {
              const { OverageBillingService } = await import('./services/OverageBillingService');
              const atLimit = await OverageBillingService.isAtMinuteLimit(
                phoneAssignment.userId,
                subscription.id
              );
              if (atLimit) {
                console.log(`🚫 Call blocked for user ${phoneAssignment.userId}: Monthly minute limit reached (Stop Service at Limit enabled)`);

                const twiml = twilioService.createVoiceResponse();
                twiml.say({
                  voice: 'Polly.Joanna'
                }, 'We are sorry, but this service is temporarily unavailable as the monthly usage limit has been reached. Please try again next month.');
                twiml.hangup();

                res.type('text/xml');
                res.send(twiml.toString());
                return;
              }
            }
          }
        } catch (error) {
          console.error('❌ Error checking trial/subscription limits:', error);
          // Continue to allow call on error (fail open) to avoid disrupting service
        }
      }

      if (phoneAssignment && phoneAssignment.retellAgentId && phoneAssignment.retellEnabled) {
        console.log(`🤖 RETELL AI ENABLED for ${normalizedTarget} - routing to Retell agent ${phoneAssignment.retellAgentId}`);
        
        try {
          // Import RetellProvider
          const { RetellProvider } = await import('./services/RetellProvider');
          const retellProvider = new RetellProvider();
          
          // Register phone call with Retell AI using "Dial to SIP URI" method
          // IMPORTANT: Pass Twilio Call SID in metadata for call transfer functionality
          const { call_id, sip_uri } = await retellProvider.registerPhoneCall(
            phoneAssignment.retellAgentId,
            From,  // from_number
            To,    // to_number  
            'inbound',
            {
              twilio_call_sid: CallSid,
              original_from: From,
              original_to: To
            }
          );
          
          // Create call log for analytics - use 'in-progress' for live call tracking
          const callLogId = crypto.randomUUID();
          await storage.createTelephonyCallLog({
            id: callLogId,
            twilioCallSid: CallSid,
            fromNumber: From,
            toNumber: To,
            direction: 'inbound',
            status: 'in-progress',
            startTime: new Date(),
            conversationData: { retell_call_id: call_id, retell_agent_id: phoneAssignment.retellAgentId }
          });
          console.log(`📞 Created in-progress call log ${callLogId} for live tracking`);
          
          // Create TwiML to dial the Retell SIP URI
          const twiml = twilioService.createVoiceResponse();
          const dial = twiml.dial();
          dial.sip(sip_uri);
          
          console.log(`✅ Call ${CallSid} connected to Retell AI agent ${phoneAssignment.retellAgentId}`);
          console.log(`🎯 SIP URI: ${sip_uri}`);
          
          res.type('text/xml');
          res.send(twiml.toString());
          return;
          
        } catch (error) {
          console.error(`❌ Failed to connect to Retell AI:`, error);
          console.log(`⚙️ Falling back to legacy system for ${normalizedTarget}`);
          // Continue to fallback systems below
        }
      }
      
      // 🔄 Check if this phone number uses ElevenLabs Conversational AI
      const isElevenLabsEnabled = await storage.isPhoneNumberElevenLabsEnabled(normalizedTarget);
      
      if (isElevenLabsEnabled) {
        console.log(`🤖 ElevenLabs Conversational AI ENABLED for ${normalizedTarget} - routing directly to ElevenLabs agent`);
        
        // Get the ElevenLabs agent ID for this phone number
        const agentId = await storage.getElevenLabsAgentId(normalizedTarget);
        
        if (!agentId) {
          console.error(`❌ No ElevenLabs agent ID found for ${normalizedTarget}`);
          // Fall back to legacy system
          console.log(`⚙️ Falling back to legacy system for ${normalizedTarget}`);
        } else {
          // Create call log for analytics (ElevenLabs handles actual conversation)
          const callLogId = crypto.randomUUID();
          await storage.createTelephonyCallLog({
            id: callLogId,
            twilioCallSid: CallSid,
            fromNumber: From,
            toNumber: To,
            direction: 'inbound',
            status: 'elevenlabs-direct',
            startTime: new Date(),
            conversationData: {}
          });

          // 🔥 CORRECT IMPLEMENTATION: Use WebSocket bridge for protocol translation
          const twiml = twilioService.createVoiceResponse();
          
          // Build WebSocket URL to our bridge (not directly to ElevenLabs)
          const host = req.get('host') || req.headers.host;
          const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
          
          // Create secure token for this call
          const secureToken = secureTokenStore.generateToken(CallSid, normalizedTo);
          
          // Connect to our bridge which will handle ElevenLabs Conversational AI
          const bridgeUrl = `${protocol}://${host}/media-stream?phone_number=${encodeURIComponent(normalizedTo)}&token=${secureToken}&call_sid=${CallSid}&agent_id=${agentId}`;
          
          const connect = twiml.connect();
          connect.stream({
            url: bridgeUrl,
            track: 'both_tracks' // Send and receive audio
          });
          
          console.log(`✅ Call ${CallSid} connected to ElevenLabs agent ${agentId} via WebSocket bridge: ${bridgeUrl}`);
          res.type('text/xml');
          res.send(twiml.toString());
          return;
        }
      }
      
      console.log(`⚙️ ElevenLabs DISABLED for ${normalizedTarget} - using legacy OpenAI + ElevenLabs streaming`);
      
      // Get phone number assignment and AI receptionist data
      let restaurantName = "Your Restaurant"; // Fallback
      let aiReceptionist = null;
      let foundAssignment = null;
      
      try {
        // 🆕 ENHANCED: Prioritize business connection context if available
        if (businessConnection && businessContext) {
          console.log(`🏢 Using business connection context for: ${businessContext.businessName}`);
          restaurantName = businessContext.businessName;
          
          // Try to get AI receptionist from business connection's user
          if (businessConnection.userId) {
            console.log(`🤖 Getting AI receptionist for business connection user: ${businessConnection.userId}`);
            const voiceAgents = await storage.getUserVoiceAgents(businessConnection.userId);
            if (voiceAgents && voiceAgents.length > 0) {
              aiReceptionist = voiceAgents[0];
              console.log(`🤖 AI Receptionist found via business connection: ${aiReceptionist.name}`);
            }
          }
        } else {
          // Fallback to standard phone number assignment lookup
          console.log(`🔍 Looking up phone number assignment for: ${targetPhoneNumber} (normalized: ${normalizedTarget})`);
          
          // Try direct SQL query by phone number (skip SID lookup since To is phone number, not SID)
          [foundAssignment] = await db
            .select()
            .from(phoneNumberAssignments)
            .where(and(
              eq(phoneNumberAssignments.phoneNumber, normalizedTarget),
              eq(phoneNumberAssignments.status, 'active')
            ));
        }
          
        console.log(`📞 Found assignment by phone number:`, foundAssignment);
          
        if (foundAssignment && foundAssignment.restaurantId) {
          console.log(`🏪 Getting restaurant data for: ${foundAssignment.restaurantId}`);
          // Check cache first for faster response times
          let restaurantData = restaurantCache.get(foundAssignment.restaurantId);
          if (!restaurantData) {
            // Cache miss - load from database and cache
            restaurantData = await storage.getRestaurantDataById(foundAssignment.restaurantId);
            if (restaurantData) {
              restaurantCache.set(foundAssignment.restaurantId, restaurantData);
            }
          }
          
          if (restaurantData && restaurantData.businessName) {
            restaurantName = restaurantData.businessName;
            console.log(`🏪 Restaurant name: ${restaurantName}`);
          } else {
            console.log(`⚠️ Restaurant data found but no businessName: ${JSON.stringify(restaurantData)}`);
          }
          
          // Get AI receptionist for this user
          console.log(`🤖 Getting AI receptionist for user: ${foundAssignment.userId}`);
          const voiceAgents = await storage.getUserVoiceAgents(foundAssignment.userId);
          if (voiceAgents && voiceAgents.length > 0) {
            aiReceptionist = voiceAgents[0]; // Use the first agent
            console.log(`🤖 AI Receptionist found:`, aiReceptionist.name);
            
            // If restaurant name is still fallback, extract from AI receptionist name
            console.log(`🔍 Checking name extraction: restaurantName="${restaurantName}", aiReceptionist.name="${aiReceptionist.name}"`);
            if (restaurantName === "Your Restaurant" && aiReceptionist.name) {
              const extractedName = aiReceptionist.name.replace(' AI Receptionist', '').trim();
              console.log(`🔍 Extracted name from AI receptionist: "${extractedName}"`);
              if (extractedName) {
                restaurantName = extractedName;
                console.log(`🎯 Using AI receptionist name as restaurant name: ${restaurantName}`);
              }
            }
          }
        }
        
        console.log(`🎯 Final restaurant name: ${restaurantName}`);
        console.log(`🎯 Final AI receptionist:`, aiReceptionist ? aiReceptionist.name : 'null');
      } catch (lookupError) {
        console.error('Error looking up phone number assignment:', lookupError);
        // Continue with fallback data
      }
      
      // Create call log entry
      const callLogId = crypto.randomUUID();
      await storage.createTelephonyCallLog({
        id: callLogId,
        twilioCallSid: CallSid,
        fromNumber: From,
        toNumber: To,
        direction: 'inbound',
        status: 'in-progress',
        startTime: new Date(),
        conversationData: {}
      });
      
      // Create call session with restaurant data for faster subsequent processing
      const sessionRestaurantData = {
        businessName: restaurantName,
        address: "123 Main St",
        phone: To || process.env.TWILIO_PHONE_NUMBER,
        hours: "9 AM - 10 PM daily",
        menuItems: ["Pasta", "Pizza", "Salads", "Steaks", "Desserts"]
      };
      
      // If we found actual restaurant data during lookup, use it
      try {
        const normalizedTo = To?.trim().startsWith('+') ? To.trim() : `+${To?.trim()}`;
        const [foundAssignment] = await db
          .select()
          .from(phoneNumberAssignments)
          .where(and(
            eq(phoneNumberAssignments.phoneNumber, normalizedTo),
            eq(phoneNumberAssignments.status, 'active')
          ));
          
        if (foundAssignment && foundAssignment.restaurantId) {
          let restaurantData = restaurantCache.get(foundAssignment.restaurantId);
          if (!restaurantData) {
            restaurantData = await storage.getRestaurantDataById(foundAssignment.restaurantId);
            if (restaurantData) {
              restaurantCache.set(foundAssignment.restaurantId, restaurantData);
            }
          }
          
          if (restaurantData) {
            sessionRestaurantData.businessName = restaurantData.businessName || restaurantName;
            sessionRestaurantData.address = restaurantData.address || "123 Main St";
            sessionRestaurantData.phone = restaurantData.phone || To || process.env.TWILIO_PHONE_NUMBER;
            sessionRestaurantData.hours = restaurantData.hours || "9 AM - 10 PM daily";
            sessionRestaurantData.menuItems = restaurantData.menuItems || ["Pasta", "Pizza", "Salads", "Steaks", "Desserts"];
          }
        }
      } catch (error) {
        console.warn('Error loading restaurant data for session:', error);
      }
      
      callSessionStore.set(CallSid, sessionRestaurantData);

      // Generate TwiML response with personalized greeting
      const twimlResponse = await twilioService.handleIncomingCall(restaurantName, aiReceptionist, CallSid);
      
      console.log('📞 Sending TwiML response with AI content');
      res.type('text/xml');
      res.send(twimlResponse);
    } catch (error) {
      console.error('Error handling incoming call:', error);
      res.status(500).send('Error processing call');
    }
  };

  // Mount handler on both endpoints
  app.post('/api/voice/incoming', handleIncomingCall);
  app.post('/api/telephony/incoming', handleIncomingCall);

  // NEW: Real-time speech processing endpoint (much faster than recording)
  app.post('/api/voice/process-speech', async (req: Request, res: Response) => {
    try {
      const { SpeechResult, CallSid, From, To, Confidence } = req.body;
      
      console.log(`⚡ Real-time speech processing for CallSid: ${CallSid}`);
      console.log(`🎤 Speech: "${SpeechResult}" (confidence: ${Confidence})`);
      
      if (!SpeechResult || !CallSid) {
        console.error('Missing required speech data');
        return res.status(400).send('Missing speech data');
      }

      // Get existing call log to continue conversation
      const callLog = await storage.getTelephonyCallLogByTwilioSid(CallSid);
      if (!callLog) {
        console.error(`Call log not found for CallSid: ${CallSid}`);
        return res.status(404).send('Call not found');
      }

      // Get restaurant data from call session (much faster than DB lookup)
      let restaurantData = {
        businessName: "Your Restaurant",
        address: "123 Main St", 
        phone: process.env.TWILIO_PHONE_NUMBER,
        hours: "9 AM - 10 PM daily",
        menuItems: ["Pasta", "Pizza", "Salads", "Steaks", "Desserts"]
      };

      const callSession = callSessionStore.get(CallSid);
      if (callSession && callSession.restaurantData) {
        restaurantData = callSession.restaurantData;
        console.log(`⚡ Using session restaurant data: ${restaurantData.businessName}`);
      } else {
        console.warn(`⚠️ No session found for CallSid: ${CallSid}, using fallback data`);
      }
      
      // Get conversation history from session for faster processing
      const conversationHistory = callSession ? callSession.conversationHistory : 
        (callLog.conversationData as Array<{ role: 'user' | 'assistant', content: string }> || []);

      // Process with optimized single API call (includes sentiment analysis)
      const aiResult = await speechToTextService.processRestaurantCall(
        SpeechResult,
        restaurantData,
        conversationHistory
      );

      // Update session with new conversation turn
      if (callSession) {
        callSessionStore.updateHistory(CallSid, SpeechResult, aiResult.response);
      }
      
      console.log(`⚡ Fast single-API processing completed for real-time speech`);
      
      // Update conversation data
      const updatedConversation = [
        ...(callLog.conversationData as Array<{ role: 'user' | 'assistant', content: string }> || []),
        { role: 'user' as const, content: SpeechResult },
        { role: 'assistant' as const, content: aiResult.response }
      ];
      
      // Generate TwiML response and update call log in parallel
      const shouldContinue = aiResult.action !== 'end_call' && aiResult.action !== 'transfer';
      const [twimlResponse] = await Promise.all([
        twilioService.createAIResponse(aiResult.response, shouldContinue, CallSid),
        storage.updateTelephonyCallLog(callLog.id, {
          transcriptionText: SpeechResult,
          conversationData: updatedConversation,
          sentiment: aiResult.sentiment || 'neutral',
          confidence: parseFloat(Confidence || '0.9'),
          actionTaken: aiResult.action || 'continue',
          sentimentScore: aiResult.sentimentScore || 0.5,
          status: shouldContinue ? 'in-progress' : 'completed',
          endTime: shouldContinue ? undefined : new Date()
        })
      ]);

      res.type('text/xml').send(twimlResponse);
      console.log(`⚡ Real-time speech response sent for CallSid: ${CallSid}`);
    } catch (error) {
      console.error('Error processing real-time speech:', error);
      
      // Return error response TwiML
      const twiml = twilioService.createVoiceResponse();
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'multi'
      }, 'I apologize, but I encountered an error. Please try again.');
      twiml.hangup();
      
      res.type('text/xml').send(twiml.toString());
    }
  });

  // Twilio webhook for processing recorded audio (fallback method)
  app.post('/api/voice/process-recording', async (req: Request, res: Response) => {
    try {
      const { RecordingUrl, CallSid, RecordingSid } = req.body;
      
      console.log(`Processing recording for CallSid: ${CallSid}`);
      
      // Get call log
      const callLog = await storage.getTelephonyCallLogByTwilioSid(CallSid);
      if (!callLog) {
        throw new Error('Call log not found');
      }
      
      // Update call log with recording info
      await storage.updateTelephonyCallLog(callLog.id, {
        recordingUrl: RecordingUrl,
        recordingSid: RecordingSid
      });
      
      // Transcribe the audio
      let transcription = '';
      try {
        transcription = await speechToTextService.transcribeFromUrl(RecordingUrl);
        console.log(`Transcription: ${transcription}`);
      } catch (transcribeError) {
        console.error('Transcription failed:', transcribeError);
        transcription = 'Transcription failed';
      }
      
      // Get restaurant data from call session (much faster than DB lookup)
      let restaurantData = {
        businessName: "Your Restaurant",
        address: "123 Main St", 
        phone: process.env.TWILIO_PHONE_NUMBER,
        hours: "9 AM - 10 PM daily",
        menuItems: ["Pasta", "Pizza", "Salads", "Steaks", "Desserts"]
      };

      const callSession = callSessionStore.get(CallSid);
      if (callSession && callSession.restaurantData) {
        restaurantData = callSession.restaurantData;
        console.log(`⚡ Using session restaurant data: ${restaurantData.businessName}`);
      } else {
        console.warn(`⚠️ No session found for CallSid: ${CallSid}, using fallback data`);
      }
      
      // Get conversation history from session for faster processing
      const conversationHistory = callSession ? callSession.conversationHistory : 
        (callLog.conversationData as Array<{ role: 'user' | 'assistant', content: string }> || []);

      // Process with optimized single API call (includes sentiment analysis)
      const aiResult = await speechToTextService.processRestaurantCall(
        transcription,
        restaurantData,
        conversationHistory
      );

      // Update session with new conversation turn
      if (callSession) {
        callSessionStore.updateHistory(CallSid, transcription, aiResult.response);
      }
      
      console.log(`⚡ Fast single-API processing completed for CallSid: ${CallSid}`);
      
      // Update conversation data
      const updatedConversation = [
        ...(callLog.conversationData as Array<{ role: 'user' | 'assistant', content: string }> || []),
        { role: 'user' as const, content: transcription },
        { role: 'assistant' as const, content: aiResult.response }
      ];
      
      // Generate TwiML response and update call log in parallel
      const shouldContinue = aiResult.action !== 'end_call' && aiResult.action !== 'transfer';
      const [twimlResponse] = await Promise.all([
        twilioService.createAIResponse(aiResult.response, shouldContinue, CallSid),
        storage.updateTelephonyCallLog(callLog.id, {
          transcriptionText: transcription,
          aiResponse: aiResult.response,
          sentiment: aiResult.sentiment || 'neutral',
          sentimentScore: aiResult.sentimentScore || 0.5,
          actionTaken: aiResult.action,
          confidence: aiResult.confidence,
          conversationData: updatedConversation
        })
      ]);
      
      console.log(`⚡ Parallel TwiML generation and DB update completed for CallSid: ${CallSid}`);
      
      res.type('text/xml');
      res.send(twimlResponse);
    } catch (error) {
      console.error('Error processing recording:', error);
      
      // Fast fallback response - no parallel processing needed for errors
      const fallbackTwiml = await twilioService.createAIResponse(
        "I'm sorry, I'm having trouble processing your request. Please hold while I transfer you to someone who can help.",
        false,
        req.body.CallSid || 'unknown'
      );
      
      res.type('text/xml');
      res.send(fallbackTwiml);
    }
  });

  // Twilio webhook for call status updates
  app.post('/api/voice/call-status', async (req: Request, res: Response) => {
    try {
      const { CallSid, CallStatus, Duration, EndTime } = req.body;
      
      console.log(`Call status update: ${CallSid} - ${CallStatus}`);
      
      const callLog = await storage.getTelephonyCallLogByTwilioSid(CallSid);
      if (callLog) {
        await storage.updateTelephonyCallLog(callLog.id, {
          status: CallStatus,
          duration: Duration ? parseInt(Duration) : undefined,
          endTime: EndTime ? new Date(EndTime) : undefined
        });
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error updating call status:', error);
      res.status(500).send('Error');
    }
  });

  // Twilio webhook for recording status
  app.post('/api/voice/recording-status', async (req: Request, res: Response) => {
    try {
      const { CallSid, RecordingStatus, RecordingSid } = req.body;
      
      console.log(`Recording status: ${RecordingSid} - ${RecordingStatus}`);
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling recording status:', error);
      res.status(500).send('Error');
    }
  });

  // Twilio webhook for transcription completion
  app.post('/api/voice/transcription', async (req: Request, res: Response) => {
    try {
      const { CallSid, TranscriptionText, TranscriptionStatus, TranscriptionSid } = req.body;
      
      console.log(`Transcription received: ${TranscriptionSid} - ${TranscriptionStatus}`);
      
      const callLog = await storage.getTelephonyCallLogByTwilioSid(CallSid);
      if (callLog && TranscriptionText) {
        await storage.updateTelephonyCallLog(callLog.id, {
          transcriptionText: TranscriptionText,
          transcriptionSid: TranscriptionSid
        });
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling transcription:', error);
      res.status(500).send('Error');
    }
  });

  // Get enhanced call logs combining Twilio and Retell AI data
  app.get('/api/telephony/calls', async (req: Request, res: Response) => {
    try {
      let userId: string | undefined;
      
      if (req.session && (req.session as any).passport && (req.session as any).passport.user) {
        userId = (req.session as any).passport.user.claims.sub;
      } else if (req.session && (req.session as any).user) {
        userId = (req.session as any).user.id;
      } else if (req.isAuthenticated && req.isAuthenticated() && (req.user as any)?.claims?.sub) {
        userId = (req.user as any).claims.sub;
      }
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { 
        limit = 50, 
        offset = 0,
        callType,
        outcome,
        sentiment,
        startDate,
        endDate,
        tags
      } = req.query;
      
      // Get all phone numbers for this user
      const userPhoneNumbers = await storage.getUserPhoneNumbers(userId);
      
      if (userPhoneNumbers.length === 0) {
        return res.json([]);
      }
      
      // Build filters from query parameters
      const filters: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };
      
      if (callType && typeof callType === 'string') {
        filters.callType = callType.split(',');
      }
      if (outcome && typeof outcome === 'string') {
        filters.outcome = outcome.split(',');
      }
      if (sentiment && typeof sentiment === 'string') {
        filters.sentiment = sentiment.split(',');
      }
      if (tags && typeof tags === 'string') {
        filters.tags = tags.split(',');
      }
      if (startDate && typeof startDate === 'string') {
        filters.startDate = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        filters.endDate = new Date(endDate);
      }
      
      // Get enhanced call history combining Twilio and local data
      const phoneNumbers = userPhoneNumbers.map(pn => pn.phoneNumber);
      const { callHistoryService } = await import('./services/callHistoryService');
      
      console.log(`🔍 Fetching enhanced call history for user ${userId} with ${phoneNumbers.length} phone numbers`);
      
      const enhancedCallHistory = await callHistoryService.getEnhancedCallHistory(
        userId,
        phoneNumbers,
        filters
      );
      
      console.log(`✅ Returning ${enhancedCallHistory.length} enhanced call records`);
      res.json(enhancedCallHistory);
    } catch (error) {
      console.error('❌ Error fetching enhanced call logs:', error);
      res.status(500).json({ error: 'Failed to fetch enhanced call logs' });
    }
  });

  // Get call logs for specific restaurant agent (backwards compatibility)
  app.get('/api/voice/calls/:restaurantAgentId', async (req: Request, res: Response) => {
    try {
      const { restaurantAgentId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const callLogs = await storage.getTelephonyCallLogs(
        restaurantAgentId,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      res.json(callLogs);
    } catch (error) {
      console.error('Error fetching call logs:', error);
      res.status(500).json({ error: 'Failed to fetch call logs' });
    }
  });

  // Get specific call log with details
  app.get('/api/voice/call/:callId', async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      
      const callLog = await storage.getTelephonyCallLogByTwilioSid(callId);
      if (!callLog) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      res.json(callLog);
    } catch (error) {
      console.error('Error fetching call details:', error);
      res.status(500).json({ error: 'Failed to fetch call details' });
    }
  });

  // Test endpoint to make outbound call
  app.post('/api/voice/test-call', async (req: Request, res: Response) => {
    try {
      const { to, restaurantName = "Test Restaurant" } = req.body;
      
      if (!to) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      const call = await twilioService.makeCall(to, restaurantName);
      
      res.json({
        success: true,
        callSid: call.sid,
        status: call.status
      });
    } catch (error) {
      console.error('Error making test call:', error);
      res.status(500).json({ error: 'Failed to make call' });
    }
  });

  // Get available ElevenLabs voices
  app.get('/api/voice/eleven-labs-voices', async (req: Request, res: Response) => {
    try {
      const voices = await elevenLabsService.getVoices();
      res.json(voices);
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      res.status(500).json({ error: 'Failed to fetch voices' });
    }
  });

  // Test text-to-speech
  app.post('/api/voice/test-tts', upload.none(), async (req: Request, res: Response) => {
    try {
      const { text, voiceId } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      const audioBuffer = await elevenLabsService.textToSpeech(text, voiceId);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="speech.mp3"'
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error('Error generating speech:', error);
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  });

  // STREAMING AI RESPONSE ENDPOINT - Ultra-fast 1-1.5s response times
  app.post('/api/voice/process-streaming', upload.none(), async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      const { CallSid, SpeechResult, Confidence } = req.body;
      
      if (!CallSid) {
        return res.status(400).json({ error: 'CallSid is required' });
      }

      console.log(`🚀 STREAMING: Processing speech for CallSid: ${CallSid}`);
      console.log(`🎤 Speech: "${SpeechResult}" (confidence: ${Confidence})`);

      // Get session data
      const session = callSessionStore.get(CallSid);
      if (!session) {
        console.error(`❌ No session found for CallSid: ${CallSid}`);
        return res.status(404).json({ error: 'Call session not found' });
      }

      const restaurantData = session.restaurantData;
      console.log(`⚡ Using session restaurant data: ${restaurantData.businessName}`);

      const openaiService = (await import('./services/openaiService')).openaiService;
      
      // Prepare response timeout - respond within 1 second max
      const RESPONSE_TIMEOUT = 1000;
      let responseSent = false;
      let firstChunkBuffer: Buffer | null = null;
      const firstChunkId = `${CallSid}_streaming_${Date.now()}`;

      // Promise to send immediate response once first chunk is ready
      const sendImmediateResponse = async (audioBuffer: Buffer) => {
        if (responseSent) return;
        responseSent = true;
        
        await elevenLabsService.cacheAudio(firstChunkId, audioBuffer);
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>https://${process.env.REPLIT_DEV_DOMAIN || '95585cfd-4435-41f9-be4b-7477914ae9d0-00-293nvwqdmcfw7.picard.replit.dev'}/api/audio/${firstChunkId}</Play>
  <Gather input="speech" action="/api/voice/process-streaming" method="POST" timeout="3" speechTimeout="1">
    <Say>Continue speaking</Say>
  </Gather>
</Response>`;
        
        console.log(`🚀 STREAMING: First chunk sent in ${Date.now() - startTime}ms`);
        res.type('text/xml').send(twiml);
      };

      // Set timeout fallback to use cached phrase if streaming takes too long
      const timeoutHandler = setTimeout(async () => {
        if (!responseSent) {
          console.log(`⏰ STREAMING: Timeout - using cached phrase`);
          // Use pre-cached "Thank you for calling" for instant response
          const cachedAudio = elevenLabsService.getPhraseAudio('Thank you for calling');
          
          if (cachedAudio) {
            await sendImmediateResponse(cachedAudio);
          } else {
            // Last resort fallback
            const fallbackAudio = await elevenLabsService.textToSpeech("Hello, how may I help you?");
            await sendImmediateResponse(fallbackAudio);
          }
        }
      }, RESPONSE_TIMEOUT);

      // Stream OpenAI response and generate TTS
      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI receptionist for ${restaurantData.businessName}. Respond conversationally, naturally, and helpfully. Keep responses concise (under 40 words) for fast delivery.`
        },
        ...session.conversationHistory.slice(-4), // Last 4 messages for context
        {
          role: 'user' as const,
          content: SpeechResult || 'Hello'
        }
      ];

      let fullResponse = '';
      let sentenceBuffer = '';
      
      fullResponse = await openaiService.createStreamingChatCompletion({
        model: 'gpt-5-nano',
        messages,
        max_tokens: 100
      }, async (chunk: string) => {
        sentenceBuffer += chunk;
        
        // Check for complete sentences for immediate TTS
        if (sentenceBuffer.includes('.') || sentenceBuffer.includes('!') || sentenceBuffer.includes('?')) {
          const sentences = sentenceBuffer.split(/([.!?])/);
          const completeSentences = sentences.slice(0, -1).join('');
          
          if (completeSentences.trim().length > 5 && !firstChunkBuffer) { // Minimum 5 chars
            try {
              // Generate TTS for first complete sentence immediately
              firstChunkBuffer = await elevenLabsService.textToSpeech(completeSentences.trim());
              clearTimeout(timeoutHandler);
              await sendImmediateResponse(firstChunkBuffer);
            } catch (error) {
              console.error('Error generating first chunk TTS:', error);
            }
          }
          
          sentenceBuffer = sentences[sentences.length - 1] || '';
        }
      });

      // Clear timeout if we haven't sent response yet
      clearTimeout(timeoutHandler);

      // Update session history
      callSessionStore.updateHistory(CallSid, SpeechResult, fullResponse);

      const totalTime = Date.now() - startTime;
      console.log(`🚀 STREAMING: Complete response generated in ${totalTime}ms`);

      // If no response was sent (very short responses), send full response
      if (!responseSent) {
        const audioId = `${CallSid}_complete_${Date.now()}`;
        const audioBuffer = await elevenLabsService.textToSpeech(fullResponse || "I'm here to help!");
        await elevenLabsService.cacheAudio(audioId, audioBuffer);

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>https://${process.env.REPLIT_DEV_DOMAIN || '95585cfd-4435-41f9-be4b-7477914ae9d0-00-293nvwqdmcfw7.picard.replit.dev'}/api/audio/${audioId}</Play>
  <Gather input="speech" action="/api/voice/process-streaming" method="POST" timeout="3" speechTimeout="1">
    <Say>Continue speaking</Say>
  </Gather>
</Response>`;

        res.type('text/xml').send(twiml);
      }

    } catch (error) {
      console.error('❌ STREAMING: Error processing streaming response:', error);
      res.status(500).json({ error: 'Failed to process streaming response' });
    }
  });
}