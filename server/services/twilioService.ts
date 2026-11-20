import twilio from 'twilio';
const VoiceResponse = twilio.twiml.VoiceResponse;

class TwilioService {
  private client: twilio.Twilio;
  private phoneNumber: string;
  private isTestMode: boolean;

  constructor() {
    // Check if live provisioning is enabled
    const enableLiveProvisioning = process.env.ENABLE_LIVE_TWILIO_PROVISIONING === 'true';
    this.isTestMode = !enableLiveProvisioning;
    
    let accountSid: string;
    let authToken: string;
    
    if (enableLiveProvisioning) {
      // Use live credentials when live provisioning is enabled
      accountSid = process.env.TWILIO_ACCOUNT_SID || '';
      authToken = process.env.TWILIO_AUTH_TOKEN || '';
      
      if (!accountSid || !authToken) {
        throw new Error('Missing required LIVE Twilio credentials - need TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for live provisioning');
      }
      
      console.log('🟢 Initializing TwilioService with LIVE credentials for real phone provisioning');
    } else {
      // Use test credentials for development and testing
      accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_TEST_SID || '';
      authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TEST_AUTH || '';
      
      if (!accountSid || !authToken) {
        throw new Error('Missing required Twilio credentials - need TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (or TWILIO_TEST_SID and TWILIO_TEST_AUTH) environment variables');
      }

      console.log('🧪 Initializing TwilioService with TEST credentials for safe development');
    }

    this.client = twilio(accountSid, authToken);
    // Use test phone number for development or live phone number for production
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '+15005550006'; // Twilio test number
  }

  /**
   * Create TwiML response for incoming calls
   */
  createVoiceResponse(): twilio.twiml.VoiceResponse {
    return new VoiceResponse();
  }

  /**
   * Handle incoming call with restaurant AI greeting
   */
  async handleIncomingCall(restaurantName: string = "Restaurant", aiReceptionist: any = null, callSid: string = ''): Promise<string> {
    const twiml = this.createVoiceResponse();
    
    // Create personalized greeting based on AI receptionist data
    let greeting = `Thank you for calling ${restaurantName}. How may I help you?`;
    
    // Always use standardized greeting format instead of persona override
    // The AI persona will be used by the conversation processing, not the initial greeting
    
    // Generate audio using ElevenLabs and serve via Play instead of Say
    console.log('🎵 Attempting ElevenLabs audio generation for CallSid:', callSid);
    try {
      console.log('🎵 Importing ElevenLabs service...');
      const { elevenLabsService } = await import('./elevenLabsService');
      
      console.log('🎵 Generating audio with ElevenLabs for text:', greeting);
      const audioBuffer = await elevenLabsService.textToSpeech(
        greeting,
        'EXAVITQu4vr4xnSDxMaL', // ElevenLabs voice ID
        0.5, // stability
        0.75 // similarity_boost
      );
      
      console.log('🎵 Audio generated successfully, buffer size:', audioBuffer.length);
      
      // Cache audio using elevenLabsService for consistent caching strategy
      const greetingId = `${callSid}_greeting`;
      await elevenLabsService.cacheAudio(greetingId, audioBuffer);
      console.log('🎵 Audio cached with key:', greetingId);
      
      // Use Play instead of Say for ElevenLabs audio with standardized URL pattern
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : `https://${process.env.REPL_SLUG}.${process.env.REPLIT_CLUSTER || 'replit'}.repl.co`;
      
      const audioUrl = `${baseUrl}/api/audio/${greetingId}`;
      console.log('🎵 Using Play with audio URL:', audioUrl);
      twiml.play(audioUrl);
      console.log('🎵 ElevenLabs audio setup complete!');
    } catch (error) {
      console.error('❌ ElevenLabs audio generation failed, falling back to Say:', error);
      // Fallback to Twilio Say if ElevenLabs fails
      twiml.say({
        voice: 'Polly.Joanna', // Use valid Twilio voice for reliability
        language: 'multi'
      }, greeting);
    }

    // Use Gather for real-time speech processing (much faster than recording)
    const gather = twiml.gather({
      input: 'speech',
      action: '/api/voice/process-speech',
      method: 'POST',
      speechTimeout: 'auto', // Auto-detect end of speech for faster responses
      timeout: 3, // Reduced timeout for quicker processing
      language: 'multi',
      speechModel: 'phone_call', // Optimized for phone calls
      enhanced: true // Better accuracy
    });
    
    // Fallback to recording only if gather fails
    twiml.record({
      action: '/api/voice/process-recording',
      method: 'POST',
      maxLength: 30,
      timeout: 2,
      playBeep: false
    });

    return twiml.toString();
  }

  /**
   * Create AI response TwiML with ElevenLabs voice synthesis
   */
  async createAIResponse(responseText: string, shouldContinue: boolean = true, callSid?: string): Promise<string> {
    const twiml = this.createVoiceResponse();
    
    // Use ElevenLabs voice synthesis for all AI responses
    try {
      // Import ElevenLabs service dynamically to avoid circular dependencies
      const { elevenLabsService } = await import('./elevenLabsService');
      
      // Generate unique identifier for this response
      const responseId = callSid ? `${callSid}_response_${Date.now()}` : `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate audio with ElevenLabs and play it
      const audioBuffer = await elevenLabsService.generateAudio(responseText);
      await elevenLabsService.cacheAudio(responseId, audioBuffer);
      console.log(`🎵 AI response audio cached with key: ${responseId}`);
      
      // Use Play tag with ElevenLabs audio URL - standardized base URL construction
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : `https://${process.env.REPL_SLUG}.${process.env.REPLIT_CLUSTER || 'replit'}.repl.co`;
      twiml.play(`${baseUrl}/api/audio/${responseId}`);
      
    } catch (error) {
      console.warn('⚠️ ElevenLabs service unavailable, falling back to TwiML Say');
      // Fallback to TwiML Say if ElevenLabs is unavailable
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'multi'
      }, responseText);
    }

    if (shouldContinue) {
      // Use Gather for real-time speech processing (much faster than recording)
      const gather = twiml.gather({
        input: 'speech',
        action: '/api/voice/process-speech',
        method: 'POST',
        speechTimeout: 'auto', // Auto-detect end of speech for faster responses
        timeout: 3, // Reduced timeout for quicker processing
        language: 'multi',
        speechModel: 'phone_call', // Optimized for phone calls
        enhanced: true // Better accuracy
      });
      
      // Fallback to recording only if gather fails
      twiml.record({
        action: '/api/voice/process-recording',
        method: 'POST',
        maxLength: 30,
        timeout: 2,
        playBeep: false
      });
    } else {
      // End conversation with ElevenLabs goodbye message
      try {
        const { elevenLabsService } = await import('./elevenLabsService');
        const goodbyeId = callSid ? `${callSid}_goodbye` : `goodbye_${Date.now()}`;
        const goodbyeBuffer = await elevenLabsService.generateAudio('Thank you for calling. Have a great day!');
        await elevenLabsService.cacheAudio(goodbyeId, goodbyeBuffer);
        
        const baseUrl = process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : `https://${process.env.REPL_SLUG}.${process.env.REPLIT_CLUSTER || 'replit'}.repl.co`;
        twiml.play(`${baseUrl}/api/audio/${goodbyeId}`);
      } catch (error) {
        // Fallback goodbye message
        twiml.say({
          voice: 'Polly.Joanna',
          language: 'multi'
        }, 'Thank you for calling. Have a great day!');
      }
      twiml.hangup();
    }

    return twiml.toString();
  }

  /**
   * Set phone number after purchase
   */
  setPhoneNumber(phoneNumber: string): void {
    this.phoneNumber = phoneNumber;
  }

  /**
   * Get current phone number
   */
  getPhoneNumber(): string {
    return this.phoneNumber;
  }

  /**
   * Get existing phone numbers in account
   */
  async getExistingPhoneNumbers(): Promise<any[]> {
    try {
      const numbers = await this.client.incomingPhoneNumbers.list();
      return numbers.map(number => ({
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        voiceUrl: number.voiceUrl,
        smsUrl: number.smsUrl,
        dateCreated: number.dateCreated,
        capabilities: number.capabilities
      }));
    } catch (error) {
      console.error('Error fetching existing phone numbers:', error);
      throw error;
    }
  }

  /**
   * Find phone numbers without webhooks attached
   * Checks for numbers where webhooks, application SIDs are empty and safe to reassign
   */
  async findPhoneNumbersWithoutWebhooks(): Promise<any[]> {
    try {
      console.log('🔍 Searching for phone numbers without webhooks or applications...');
      
      const numbers = await this.client.incomingPhoneNumbers.list();
      
      // Filter numbers that don't have webhooks or applications configured
      const numbersWithoutWebhooks = numbers.filter(number => {
        const hasVoiceWebhook = number.voiceUrl && number.voiceUrl.trim() !== '';
        const hasSmsWebhook = number.smsUrl && number.smsUrl.trim() !== '';
        const hasVoiceApplication = number.voiceApplicationSid && number.voiceApplicationSid.trim() !== '';
        const hasSmsApplication = number.smsApplicationSid && number.smsApplicationSid.trim() !== '';
        
        // Return true if NO webhooks AND NO applications are configured (safe to reassign)
        return !hasVoiceWebhook && !hasSmsWebhook && !hasVoiceApplication && !hasSmsApplication;
      });

      // Sort by dateCreated ascending to prioritize oldest numbers for reuse
      numbersWithoutWebhooks.sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime());

      console.log(`📋 Found ${numbersWithoutWebhooks.length} phone numbers without webhooks/applications out of ${numbers.length} total numbers`);
      
      return numbersWithoutWebhooks.map(number => ({
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        voiceUrl: number.voiceUrl,
        smsUrl: number.smsUrl,
        voiceApplicationSid: number.voiceApplicationSid,
        smsApplicationSid: number.smsApplicationSid,
        emergencyAddressSid: number.emergencyAddressSid,
        dateCreated: number.dateCreated,
        capabilities: number.capabilities
      }));
    } catch (error) {
      console.error('Error finding phone numbers without webhooks:', error);
      throw error;
    }
  }

  /**
   * Find cleanest phone numbers without webhooks AND without emergency address
   * These are ideal for reassignment as they require minimal cleanup
   */
  async findPhoneNumbersWithoutWebhooksAndAddress(): Promise<any[]> {
    try {
      console.log('🔍 Searching for cleanest phone numbers (no webhooks AND no emergency address)...');
      
      const numbers = await this.client.incomingPhoneNumbers.list();
      
      // Filter numbers that don't have webhooks, applications, OR emergency addresses
      const cleanestNumbers = numbers.filter(number => {
        const hasVoiceWebhook = number.voiceUrl && number.voiceUrl.trim() !== '';
        const hasSmsWebhook = number.smsUrl && number.smsUrl.trim() !== '';
        const hasVoiceApplication = number.voiceApplicationSid && number.voiceApplicationSid.trim() !== '';
        const hasSmsApplication = number.smsApplicationSid && number.smsApplicationSid.trim() !== '';
        const hasEmergencyAddress = number.emergencyAddressSid && number.emergencyAddressSid.trim() !== '';
        
        // Return true if NO webhooks, NO applications, AND NO emergency address (cleanest possible)
        return !hasVoiceWebhook && !hasSmsWebhook && !hasVoiceApplication && !hasSmsApplication && !hasEmergencyAddress;
      });

      // Sort by dateCreated ascending to prioritize oldest numbers for reuse
      cleanestNumbers.sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime());

      console.log(`📋 Found ${cleanestNumbers.length} cleanest phone numbers (no webhooks/applications/address) out of ${numbers.length} total numbers`);
      
      return cleanestNumbers.map(number => ({
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        voiceUrl: number.voiceUrl,
        smsUrl: number.smsUrl,
        voiceApplicationSid: number.voiceApplicationSid,
        smsApplicationSid: number.smsApplicationSid,
        emergencyAddressSid: number.emergencyAddressSid,
        dateCreated: number.dateCreated,
        capabilities: number.capabilities
      }));
    } catch (error) {
      console.error('Error finding cleanest phone numbers:', error);
      throw error;
    }
  }

  /**
   * Wipe all configuration from a phone number to make it like brand new
   * Removes webhooks, emergency address, friendly name, and applications
   */
  async wipePhoneNumberConfiguration(phoneSid: string): Promise<void> {
    try {
      console.log(`🧹 Wiping all configuration from phone number ${phoneSid}...`);
      
      // First, remove emergency address if it exists
      const currentNumber = await this.client.incomingPhoneNumbers(phoneSid).fetch();
      
      if (currentNumber.emergencyAddressSid) {
        console.log(`🗑️ Removing emergency address ${currentNumber.emergencyAddressSid}...`);
        await this.removeEmergencyAddress(phoneSid);
        
        // Wait for emergency address removal to complete (avoid "Emergency status is pending" error)
        await this.waitForEmergencyStatusClear(phoneSid);
      }
      
      // Now wipe all other configuration
      console.log('🧹 Clearing webhooks, applications, and friendly name...');
      await this.client.incomingPhoneNumbers(phoneSid).update({
        voiceUrl: '',
        smsUrl: '',
        statusCallback: '',
        voiceApplicationSid: '',
        smsApplicationSid: '',
        friendlyName: '',
        voiceFallbackUrl: '',
        smsFallbackUrl: ''
      });
      
      console.log(`✅ Phone number ${phoneSid} wiped clean successfully`);
    } catch (error: any) {
      console.error(`❌ Error wiping phone number configuration:`, error);
      throw error;
    }
  }

  /**
   * Wait for Twilio emergency address status to clear before proceeding
   * Implements exponential backoff retry logic
   */
  private async waitForEmergencyStatusClear(phoneSid: string, maxRetries: number = 5): Promise<void> {
    let retryCount = 0;
    const baseDelay = 2000; // Start with 2 seconds
    
    while (retryCount < maxRetries) {
      try {
        // Check if we can update the number (emergency status clear)
        const number = await this.client.incomingPhoneNumbers(phoneSid).fetch();
        
        // If no emergency address, we're clear
        if (!number.emergencyAddressSid) {
          console.log('✅ Emergency address status cleared');
          return;
        }
        
        // Wait with exponential backoff
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`⏳ Emergency status still pending, waiting ${delay}ms before retry ${retryCount + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        retryCount++;
      } catch (error) {
        console.warn(`⚠️ Error checking emergency status: ${error}`);
        retryCount++;
      }
    }
    
    console.warn(`⚠️ Emergency status did not clear after ${maxRetries} retries, proceeding anyway`);
  }

  /**
   * Remove emergency address from phone number
   */
  async removeEmergencyAddress(phoneSid: string): Promise<void> {
    try {
      await this.client.incomingPhoneNumbers(phoneSid).update({
        emergencyAddressSid: ''
      });
      console.log(`✅ Emergency address removed from ${phoneSid}`);
    } catch (error: any) {
      console.error(`❌ Error removing emergency address:`, error);
      throw error;
    }
  }

  /**
   * Make outbound call
   */
  async makeCall(to: string, restaurantName: string): Promise<any> {
    if (!this.phoneNumber) {
      throw new Error('No phone number configured. Please purchase a phone number first.');
    }
    
    try {
      const call = await this.client.calls.create({
        twiml: this.handleIncomingCall(restaurantName),
        to: to,
        from: this.phoneNumber
      });
      return call;
    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  }

  /**
   * Format phone number to E.164 format for Twilio
   * @param phone - Phone number in any format
   * @returns Phone number in E.164 format (+15551234567)
   */
  private formatPhoneToE164(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If already has + prefix and is valid length, return as-is
    if (cleaned.startsWith('+') && cleaned.length >= 11) {
      return cleaned;
    }

    // If it's a 10-digit US number, add +1 prefix
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    // If it's an 11-digit number starting with 1, add + prefix
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    // If it starts with + but no digits follow, remove the + and try again
    if (cleaned === '+' || cleaned.length < 10) {
      throw new Error(`Invalid phone number format: ${phone}. Must be at least 10 digits.`);
    }

    // Otherwise, assume it needs +1 prefix (US default)
    return `+1${cleaned}`;
  }

  /**
   * Send SMS message
   * @param to - Recipient phone number (any format - will be converted to E.164)
   * @param body - Message content
   * @param fromNumber - Optional sender phone number (uses default if not provided)
   */
  async sendSMS(to: string, body: string, fromNumber?: string): Promise<any> {
    const senderNumber = fromNumber || this.phoneNumber;

    if (!senderNumber) {
      throw new Error('No phone number configured. Please purchase a phone number first.');
    }

    // Format the recipient phone number to E.164 format
    let formattedTo: string;
    try {
      formattedTo = this.formatPhoneToE164(to);
      console.log(`📱 Formatted recipient phone: ${to} → ${formattedTo}`);
    } catch (formatError: any) {
      console.error(`❌ Phone number formatting failed: ${formatError.message}`);
      throw new Error(`Invalid recipient phone number format: ${to}. Please use E.164 format (e.g., +15551234567) or a valid 10-digit number.`);
    }

    try {
      console.log(`📱 Sending SMS from ${senderNumber} to ${formattedTo}`);
      const message = await this.client.messages.create({
        body: body,
        from: senderNumber,
        to: formattedTo
      });
      console.log(`✅ SMS sent successfully to ${formattedTo}, SID: ${message.sid}, Status: ${message.status}, Error Code: ${message.errorCode || 'none'}`);

      if (message.errorCode) {
        console.warn(`⚠️ SMS Error Code: ${message.errorCode}, Message: ${message.errorMessage}`);
      }

      return message;
    } catch (error: any) {
      console.error('❌ Error sending SMS:', error);
      console.error(`❌ Original recipient: ${to}, Formatted: ${formattedTo || 'N/A'}`);
      if (error.code === 21614) {
        console.error('❌ SMS Error: Phone number is not SMS-capable. Need to enable SMS on this number in Twilio console.');
      } else if (error.code === 21211) {
        console.error(`❌ SMS Error: Invalid "To" phone number. Original: ${to}, Formatted: ${formattedTo}`);
      } else if (error.code === 21608) {
        console.error('❌ SMS Error: Unverified number. For trial accounts, verify the recipient number in Twilio.');
      } else if (error.code === 21610) {
        console.error('❌ SMS Error: Recipient opted out of receiving messages.');
      }
      throw error;
    }
  }

  /**
   * Transfer an active call to another phone number
   * @param callSid - Twilio Call SID of the active call
   * @param toNumber - Phone number to transfer the call to (any format - will be converted to E.164)
   * @param agentId - Retell Agent ID (optional, for reconnecting to AI after timeout)
   * @returns Updated call object
   */
  async transferCall(callSid: string, toNumber: string, agentId?: string): Promise<any> {
    try {
      console.log(`📞 Transferring call ${callSid} to ${toNumber}`);

      // Format the phone number to E.164 format for Twilio
      let formattedNumber: string;
      try {
        formattedNumber = this.formatPhoneToE164(toNumber);
        console.log(`📱 Formatted transfer number: ${toNumber} → ${formattedNumber}`);
      } catch (formatError) {
        console.error(`❌ Invalid phone number format: ${toNumber}`, formatError);
        throw new Error(`Invalid transfer phone number: ${toNumber}. Please use E.164 format (e.g., +15551234567) or a valid 10-digit number.`);
      }

      // Get base URL for status callbacks
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : `https://${process.env.REPL_SLUG}.${process.env.REPLIT_CLUSTER || 'replit'}.repl.co`;

      // Construct action URL for redirecting back to AI if transfer fails/times out
      const transferActionUrl = agentId
        ? `${baseUrl}/api/twilio/transfer-action?agentId=${agentId}`
        : undefined;

      // Update the call to transfer it to the new number
      // timeout="20": rings for 20 seconds before timing out
      // action: URL to redirect to if transfer fails, times out, or completes
      const actionAttr = transferActionUrl ? ` action="${transferActionUrl}" method="POST"` : '';
      const call = await this.client.calls(callSid).update({
        twiml: `<Response>
  <Dial timeout="20"${actionAttr} statusCallback="${baseUrl}/api/twilio/call-status" statusCallbackEvent="initiated,ringing,answered,completed" statusCallbackMethod="POST">
    <Number statusCallback="${baseUrl}/api/twilio/call-status" statusCallbackEvent="initiated,ringing,answered,completed">${formattedNumber}</Number>
  </Dial>
</Response>`
      });

      console.log(`✅ Call transferred successfully with 20s timeout${transferActionUrl ? ' and AI reconnect fallback' : ''}`);
      return call;
    } catch (error) {
      console.error('Error transferring call:', error);
      throw error;
    }
  }

  /**
   * End a call by setting status to 'completed'
   * This immediately terminates the call
   */
  async endCall(callSid: string): Promise<any> {
    try {
      console.log(`📞 Ending call ${callSid} by setting status to completed`);

      const call = await this.client.calls(callSid).update({
        status: 'completed'
      });

      console.log(`✅ Call ended successfully - Status: ${call.status}`);
      return call;
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  /**
   * Update a call with custom TwiML
   */
  async updateCallWithTwiML(callSid: string, twiml: string): Promise<any> {
    try {
      console.log(`📞 Updating call ${callSid} with TwiML`);

      const call = await this.client.calls(callSid).update({
        twiml: twiml
      });

      console.log(`✅ Call updated successfully`);
      return call;
    } catch (error) {
      console.error('Error updating call with TwiML:', error);
      throw error;
    }
  }

  /**
   * Create an outbound call with AMD for smart transfer
   * This allows us to detect voicemail BEFORE bridging
   */
  async createTransferCallWithAMD(options: {
    to: string;
    from: string;
    statusCallback: string;
    machineDetectionTimeout?: number;
  }): Promise<any> {
    try {
      console.log(`📞 Creating transfer call with AMD to ${options.to}`);

      const call = await this.client.calls.create({
        to: options.to,
        from: options.from,
        machineDetection: 'Enable',
        machineDetectionTimeout: 3, // Very short - detect voicemail quickly
        timeout: 15, // Only ring for 15 seconds max
        statusCallback: options.statusCallback,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        // Just ring - no audio needed for agent side
        twiml: '<Response><Pause length="20"/></Response>'
      });

      console.log(`✅ Transfer call created with 15s timeout: ${call.sid}`);
      return call;
    } catch (error) {
      console.error('Error creating transfer call with AMD:', error);
      throw error;
    }
  }

  /**
   * Get call logs
   */
  async getCallLogs(limit: number = 50): Promise<any[]> {
    try {
      const calls = await this.client.calls.list({ limit });
      return calls.map(call => ({
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        direction: call.direction,
        price: call.price,
        priceUnit: call.priceUnit
      }));
    } catch (error) {
      console.error('Error fetching call logs:', error);
      throw error;
    }
  }

  /**
   * Get recording details
   */
  async getRecording(recordingSid: string): Promise<any> {
    try {
      const recording = await this.client.recordings(recordingSid).fetch();
      return {
        sid: recording.sid,
        callSid: recording.callSid,
        duration: recording.duration,
        dateCreated: recording.dateCreated,
        uri: recording.uri,
        mediaUrl: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`
      };
    } catch (error) {
      console.error('Error fetching recording:', error);
      throw error;
    }
  }

  /**
   * Get transcription
   */
  async getTranscription(transcriptionSid: string): Promise<any> {
    try {
      const transcription = await this.client.transcriptions(transcriptionSid).fetch();
      return {
        sid: transcription.sid,
        transcriptionText: transcription.transcriptionText,
        status: transcription.status,
        dateCreated: transcription.dateCreated
      };
    } catch (error) {
      console.error('Error fetching transcription:', error);
      throw error;
    }
  }

  /**
   * Search for available phone numbers with intelligent fallback options
   */
  async searchAvailablePhoneNumbers(options: {
    areaCode?: string;
    contains?: string;
    smsEnabled?: boolean;
    voiceEnabled?: boolean;
    country?: string;
    type?: 'local' | 'toll-free';
    limit?: number;
  }): Promise<any[]> {
    try {
      // In test mode, return mock available phone numbers
      if (this.isTestMode) {
        console.log('🧪 Test mode: Returning mock available phone numbers');
        const areaCode = options.areaCode || '555';
        const limit = options.limit || 10;
        const mockNumbers = [];
        
        for (let i = 0; i < limit; i++) {
          const randomNumber = Math.floor(1000 + Math.random() * 9000);
          mockNumbers.push({
            phoneNumber: `+1${areaCode}555${randomNumber}`,
            friendlyName: `(${areaCode}) 555-${randomNumber}`,
            locality: 'Test City',
            region: 'CA',
            postalCode: '90210',
            isoCountry: 'US',
            capabilities: {
              voice: true,
              SMS: true,
              MMS: true
            },
            addressRequirements: 'none',
            beta: false
          });
        }
        
        return mockNumbers;
      }
      
      const searchOptions: any = {
        smsEnabled: options.smsEnabled !== false, // Default to true
        voiceEnabled: options.voiceEnabled !== false, // Default to true
        limit: options.limit || 10
      };

      console.log(`🔍 Starting phone number search with options:`, { 
        areaCode: options.areaCode, 
        type: options.type, 
        country: options.country || 'US' 
      });

      // First attempt: Try with specified area code if provided
      if (options.areaCode) {
        searchOptions.areaCode = options.areaCode;
        console.log(`🎯 Searching with specific area code: ${options.areaCode}`);
        
        try {
          let phoneNumbers;
          if (options.type === 'toll-free') {
            phoneNumbers = await this.client.availablePhoneNumbers(options.country || 'US').tollFree.list(searchOptions);
          } else {
            phoneNumbers = await this.client.availablePhoneNumbers(options.country || 'US').local.list(searchOptions);
          }

          if (phoneNumbers.length > 0) {
            console.log(`✅ Found ${phoneNumbers.length} numbers with area code ${options.areaCode}`);
            return this.formatPhoneNumbers(phoneNumbers);
          }
          
          console.log(`⚠️ No numbers found with area code ${options.areaCode}, trying without area code restriction`);
        } catch (areaCodeError) {
          console.log(`⚠️ Area code search failed: ${areaCodeError.message}, trying broader search`);
        }
      }

      // Second attempt: Search without area code restriction (broader search)
      const broadSearchOptions = { ...searchOptions };
      delete broadSearchOptions.areaCode; // Remove area code restriction
      
      console.log(`🌐 Searching for any available numbers without area code restriction`);
      
      try {
        let phoneNumbers;
        if (options.type === 'toll-free') {
          phoneNumbers = await this.client.availablePhoneNumbers(options.country || 'US').tollFree.list(broadSearchOptions);
        } else {
          phoneNumbers = await this.client.availablePhoneNumbers(options.country || 'US').local.list(broadSearchOptions);
        }

        if (phoneNumbers.length > 0) {
          console.log(`✅ Found ${phoneNumbers.length} numbers in broader search`);
          return this.formatPhoneNumbers(phoneNumbers);
        }
      } catch (broadError) {
        console.log(`⚠️ Broad search failed: ${broadError.message}, trying toll-free as fallback`);
      }

      // Third attempt: Try toll-free numbers as fallback if local search failed
      if (options.type !== 'toll-free') {
        console.log(`📞 Trying toll-free numbers as fallback`);
        
        try {
          const tollFreeNumbers = await this.client.availablePhoneNumbers(options.country || 'US').tollFree.list(broadSearchOptions);
          
          if (tollFreeNumbers.length > 0) {
            console.log(`✅ Found ${tollFreeNumbers.length} toll-free numbers as fallback`);
            return this.formatPhoneNumbers(tollFreeNumbers);
          }
        } catch (tollFreeError) {
          console.log(`⚠️ Toll-free search failed: ${tollFreeError.message}`);
        }
      }

      // If all attempts fail, throw comprehensive error
      const errorMessage = options.areaCode 
        ? `No available phone numbers found (tried area code ${options.areaCode}, broad search, and toll-free fallback)`
        : `No available phone numbers found (tried local and toll-free search)`;
        
      console.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);

    } catch (error) {
      console.error('Error searching phone numbers:', error);
      throw error;
    }
  }

  /**
   * Format phone number results consistently
   */
  private formatPhoneNumbers(phoneNumbers: any[]): any[] {
    return phoneNumbers.map(phone => ({
      phoneNumber: phone.phoneNumber,
      friendlyName: phone.friendlyName,
      locality: phone.locality,
      region: phone.region,
      postalCode: phone.postalCode,
      isoCountry: phone.isoCountry,
      capabilities: phone.capabilities,
      addressRequirements: phone.addressRequirements,
      beta: phone.beta
    }));
  }

  /**
   * Purchase a phone number
   */
  async purchasePhoneNumber(phoneNumber: string, options: {
    voiceUrl?: string;
    smsUrl?: string;
    statusCallback?: string;
    addressSid?: string;
    emergencyAddressSid?: string;
    friendlyName?: string;
  }): Promise<any> {
    try {
      // In test mode, return a mock phone number purchase since test credentials can't purchase real numbers
      if (this.isTestMode) {
        console.log('🧪 Test mode: Returning mock phone number purchase (test credentials cannot purchase real numbers)');
        const mockSid = `PN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        return {
          sid: mockSid,
          phoneNumber: phoneNumber,
          friendlyName: options.friendlyName || phoneNumber,
          voiceUrl: options.voiceUrl,
          smsUrl: options.smsUrl,
          statusCallback: options.statusCallback,
          dateCreated: new Date().toISOString()
        };
      }
      
      const purchaseOptions: any = {
        phoneNumber: phoneNumber
      };

      if (options.voiceUrl) {
        purchaseOptions.voiceUrl = options.voiceUrl;
        purchaseOptions.voiceMethod = 'POST';
      }

      if (options.smsUrl) {
        purchaseOptions.smsUrl = options.smsUrl;
        purchaseOptions.smsMethod = 'POST';
      }

      if (options.statusCallback) {
        purchaseOptions.statusCallback = options.statusCallback;
      }

      if (options.addressSid) {
        purchaseOptions.addressSid = options.addressSid;
      }

      if (options.emergencyAddressSid) {
        purchaseOptions.emergencyAddressSid = options.emergencyAddressSid;
      }

      if (options.friendlyName) {
        purchaseOptions.friendlyName = options.friendlyName;
      }

      const incomingPhoneNumber = await this.client.incomingPhoneNumbers.create(purchaseOptions);

      return {
        sid: incomingPhoneNumber.sid,
        phoneNumber: incomingPhoneNumber.phoneNumber,
        friendlyName: incomingPhoneNumber.friendlyName,
        voiceUrl: incomingPhoneNumber.voiceUrl,
        smsUrl: incomingPhoneNumber.smsUrl,
        statusCallback: incomingPhoneNumber.statusCallback,
        dateCreated: incomingPhoneNumber.dateCreated
      };
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      throw error;
    }
  }

  /**
   * Release (delete) a phone number back to Twilio
   */
  async releasePhoneNumber(phoneNumberSid: string): Promise<boolean> {
    try {
      await this.client.incomingPhoneNumbers(phoneNumberSid).remove();
      console.log(`✅ Successfully released phone number SID: ${phoneNumberSid}`);
      return true;
    } catch (error) {
      console.error('Error releasing phone number:', error);
      throw error;
    }
  }

  /**
   * Delete all call records from Twilio for a specific phone number
   * This removes call logs from Twilio's account portal and API
   */
  async deleteCallRecordsForPhoneNumber(phoneNumber: string): Promise<{ deleted: number; failed: number }> {
    try {
      console.log(`🗑️ Deleting Twilio call records for phone number: ${phoneNumber}`);

      let deleted = 0;
      let failed = 0;

      // Fetch all calls for this phone number (both to and from)
      const calls = await this.client.calls.list({
        to: phoneNumber,
        limit: 1000 // Twilio API limit per request
      });

      const callsFrom = await this.client.calls.list({
        from: phoneNumber,
        limit: 1000
      });

      // Combine both lists
      const allCalls = [...calls, ...callsFrom];
      console.log(`📞 Found ${allCalls.length} call records to delete from Twilio`);

      // Delete each call record
      for (const call of allCalls) {
        try {
          await this.client.calls(call.sid).remove();
          deleted++;
        } catch (error: any) {
          console.warn(`⚠️ Failed to delete call ${call.sid}:`, error.message);
          failed++;
        }
      }

      console.log(`✅ Deleted ${deleted} call records from Twilio (${failed} failed)`);
      return { deleted, failed };
    } catch (error: any) {
      console.error('❌ Error deleting call records from Twilio:', error);
      throw error;
    }
  }

  /**
   * Delete all message records from Twilio for a specific phone number
   * This removes SMS/MMS logs from Twilio's account portal and API
   */
  async deleteMessageRecordsForPhoneNumber(phoneNumber: string): Promise<{ deleted: number; failed: number }> {
    try {
      console.log(`🗑️ Deleting Twilio message records for phone number: ${phoneNumber}`);

      let deleted = 0;
      let failed = 0;

      // Fetch all messages for this phone number (both to and from)
      const messages = await this.client.messages.list({
        to: phoneNumber,
        limit: 1000
      });

      const messagesFrom = await this.client.messages.list({
        from: phoneNumber,
        limit: 1000
      });

      // Combine both lists
      const allMessages = [...messages, ...messagesFrom];
      console.log(`💬 Found ${allMessages.length} message records to delete from Twilio`);

      // Delete each message record
      for (const message of allMessages) {
        try {
          await this.client.messages(message.sid).remove();
          deleted++;
        } catch (error: any) {
          console.warn(`⚠️ Failed to delete message ${message.sid}:`, error.message);
          failed++;
        }
      }

      console.log(`✅ Deleted ${deleted} message records from Twilio (${failed} failed)`);
      return { deleted, failed };
    } catch (error: any) {
      console.error('❌ Error deleting message records from Twilio:', error);
      throw error;
    }
  }

  /**
   * Delete all call recordings from Twilio for a specific phone number
   * This removes audio recordings from Twilio storage
   */
  async deleteRecordingsForPhoneNumber(phoneNumber: string): Promise<{ deleted: number; failed: number }> {
    try {
      console.log(`🗑️ Deleting Twilio call recordings for phone number: ${phoneNumber}`);

      let deleted = 0;
      let failed = 0;

      // First, get all calls for this phone number
      const calls = await this.client.calls.list({
        to: phoneNumber,
        limit: 1000
      });

      const callsFrom = await this.client.calls.list({
        from: phoneNumber,
        limit: 1000
      });

      const allCalls = [...calls, ...callsFrom];
      console.log(`🎙️ Checking ${allCalls.length} calls for recordings`);

      // For each call, check if it has recordings and delete them
      for (const call of allCalls) {
        try {
          const recordings = await this.client.recordings.list({
            callSid: call.sid
          });

          for (const recording of recordings) {
            try {
              await this.client.recordings(recording.sid).remove();
              deleted++;
            } catch (error: any) {
              console.warn(`⚠️ Failed to delete recording ${recording.sid}:`, error.message);
              failed++;
            }
          }
        } catch (error: any) {
          console.warn(`⚠️ Failed to fetch recordings for call ${call.sid}:`, error.message);
        }
      }

      console.log(`✅ Deleted ${deleted} recordings from Twilio (${failed} failed)`);
      return { deleted, failed };
    } catch (error: any) {
      console.error('❌ Error deleting recordings from Twilio:', error);
      throw error;
    }
  }

  /**
   * Comprehensive cleanup of all Twilio data for a phone number
   * Deletes calls, messages, and recordings
   */
  async deleteAllTwilioDataForPhoneNumber(phoneNumber: string): Promise<{
    calls: { deleted: number; failed: number };
    messages: { deleted: number; failed: number };
    recordings: { deleted: number; failed: number };
  }> {
    console.log(`🧹 Starting comprehensive Twilio data cleanup for: ${phoneNumber}`);

    const [calls, messages, recordings] = await Promise.all([
      this.deleteCallRecordsForPhoneNumber(phoneNumber),
      this.deleteMessageRecordsForPhoneNumber(phoneNumber),
      this.deleteRecordingsForPhoneNumber(phoneNumber)
    ]);

    console.log(`✅ Twilio cleanup complete for ${phoneNumber}`);
    console.log(`   - Calls: ${calls.deleted} deleted, ${calls.failed} failed`);
    console.log(`   - Messages: ${messages.deleted} deleted, ${messages.failed} failed`);
    console.log(`   - Recordings: ${recordings.deleted} deleted, ${recordings.failed} failed`);

    return { calls, messages, recordings };
  }

  /**
   * Create or update emergency address for phone number
   */
  async createEmergencyAddress(address: {
    customerName: string;
    street: string;
    city: string;
    region: string;
    postalCode: string;
    isoCountry?: string;
  }): Promise<any> {
    try {
      console.log('🏢 Creating emergency address for:', address.customerName);
      
      // In test mode, return a mock emergency address since Twilio test credentials can't create real addresses
      if (this.isTestMode) {
        console.log('🧪 Test mode: Returning mock emergency address (test credentials cannot create real addresses)');
        const mockSid = `AD${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        return {
          sid: mockSid,
          customerName: address.customerName,
          street: address.street,
          city: address.city,
          region: address.region,
          postalCode: address.postalCode,
          isoCountry: address.isoCountry || 'US'
        };
      }
      
      const emergencyAddress = await this.client.addresses.create({
        customerName: address.customerName,
        street: address.street,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        isoCountry: address.isoCountry || 'US',
        emergencyEnabled: true,
        autoCorrectAddress: true
      });

      console.log('✅ Emergency address created successfully:', emergencyAddress.sid);

      return {
        sid: emergencyAddress.sid,
        customerName: emergencyAddress.customerName,
        street: emergencyAddress.street,
        city: emergencyAddress.city,
        region: emergencyAddress.region,
        postalCode: emergencyAddress.postalCode,
        isoCountry: emergencyAddress.isoCountry
      };
    } catch (error) {
      console.error('❌ Error creating emergency address:', error);
      throw error;
    }
  }

  /**
   * Create emergency address from business data with enhanced parsing and Google Maps integration
   */
  async createEmergencyAddressFromBusiness(business: {
    businessName: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessWebsite?: string;
  }): Promise<any> {
    try {
      console.log('🏢 Creating emergency address for business:', business.businessName);
      
      // Parse address components from businessAddress if individual fields not available
      let street = business.street;
      let city = business.city;
      let state = business.state;
      let zipCode = business.zipCode;
      
      // Enhanced address parsing from businessAddress
      if (!street && business.businessAddress) {
        console.log('📍 Parsing address from businessAddress:', business.businessAddress);
        const parseResult = this.parseFullAddress(business.businessAddress);
        if (parseResult) {
          street = parseResult.street;
          city = parseResult.city;
          state = parseResult.state;
          zipCode = parseResult.zipCode;
        }
      }

      // If still incomplete, try to search for the business using Google Maps
      if ((!street || !city || !state || !zipCode) && process.env.GOOGLE_API_KEY) {
        console.log('🔍 Searching for business address using Google Maps API...');
        const searchResult = await this.searchBusinessAddressWithGoogleMaps(business);
        if (searchResult) {
          // Always prefer Google Maps results when available (most accurate)
          street = searchResult.street;
          city = searchResult.city;
          state = searchResult.state;
          zipCode = searchResult.zipCode;
        }
      }

      // Check if we have enough data now
      if (!street || !city || !state || !zipCode) {
        // Create an incomplete address record for dashboard completion
        const incompleteAddress = {
          businessName: business.businessName,
          street: street || '',
          city: city || '',
          state: state || '',
          zipCode: zipCode || '',
          businessAddress: business.businessAddress || '',
          status: 'incomplete'
        };

        console.log('⚠️ Incomplete address data, will need dashboard completion:', incompleteAddress);
        
        throw new Error(
          `Incomplete address data for ${business.businessName}. ` +
          `Found: ${street ? 'street' : ''}${city ? ', city' : ''}${state ? ', state' : ''}${zipCode ? ', zip' : ''}. ` +
          `Need: street, city, state, and zip code. Please complete address information in the dashboard.`
        );
      }

      // Validate state code (convert full name to abbreviation if needed)
      const stateAbbr = this.normalizeStateCode(state);

      // Validate address components before calling Twilio
      const validation = this.validateAddressComponents({
        street,
        city,
        state: stateAbbr,
        zipCode
      });

      if (!validation.isValid) {
        console.error('❌ Address validation failed:', validation.errors);
        throw new Error(
          `Address validation failed for ${business.businessName}: ${validation.errors.join(', ')}. ` +
          `Please provide a complete US address with street, city, 2-letter state code, and 5-digit ZIP code.`
        );
      }

      console.log('✅ Address validation passed');

      const addressData = {
        customerName: business.businessName,
        street: street,
        city: city,
        region: stateAbbr,
        postalCode: zipCode,
        isoCountry: business.country || 'US'
      };

      console.log('📍 Complete address data:', addressData);

      return await this.createEmergencyAddress(addressData);
    } catch (error) {
      console.error('❌ Error creating emergency address from business data:', error);
      throw error;
    }
  }

  /**
   * Enhanced address parsing with multiple formats support
   * Handles multi-location businesses by extracting the first valid address
   */
  private parseFullAddress(fullAddress: string): {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  } | null {
    try {
      let address = fullAddress.trim();

      // CRITICAL: Handle multi-location businesses (addresses separated by semicolons)
      // Example: "123 Main St, City, TX 12345; 456 Oak Ave, Town, TX 67890"
      if (address.includes(';')) {
        console.log('📍 Multi-location address detected, extracting first location...');
        const locations = address.split(';').map(loc => loc.trim()).filter(Boolean);

        // Try each location until we find one that parses successfully
        for (const location of locations) {
          const parsed = this.parseFullAddress(location); // Recursive call
          if (parsed) {
            console.log(`✅ Successfully parsed first valid location: ${location}`);
            return parsed;
          }
        }

        console.warn('⚠️ Could not parse any location from multi-location address');
        return null;
      }

      // Format 1: "123 Main St, New York, NY 10001"
      let match = address.match(/^(.+),\s*(.+),\s*([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);
      if (match) {
        return {
          street: match[1].trim(),
          city: match[2].trim(),
          state: match[3].toUpperCase(),
          zipCode: match[4]
        };
      }

      // Format 2: "123 Main St, New York NY 10001"
      match = address.match(/^(.+),\s*(.+)\s+([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);
      if (match) {
        return {
          street: match[1].trim(),
          city: match[2].trim(),
          state: match[3].toUpperCase(),
          zipCode: match[4]
        };
      }

      // Format 3: "123 Main Street New York NY 10001" (no commas)
      match = address.match(/^(\d+\s+.+)\s+([A-Za-z\s]+)\s+([A-Z]{2})\s+(\d{5}(-\d{4})?)$/);
      if (match) {
        const streetAndCity = match[1] + ' ' + match[2];
        const parts = streetAndCity.split(/\s+/);
        const street = parts.slice(0, 3).join(' '); // Take first 3 words as street
        const city = parts.slice(3).join(' '); // Rest as city

        return {
          street: street,
          city: city,
          state: match[3].toUpperCase(),
          zipCode: match[4]
        };
      }

      // Format 4: Basic comma separation
      const parts = address.split(',').map(part => part.trim());
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/i);

        if (stateZipMatch) {
          return {
            street: parts[0],
            city: parts[1],
            state: stateZipMatch[1].toUpperCase(),
            zipCode: stateZipMatch[2]
          };
        }
      }

      console.log('⚠️ Could not parse address format:', address);
      return null;
    } catch (error) {
      console.error('❌ Error parsing address:', error);
      return null;
    }
  }

  /**
   * Search for business address using Google Maps API
   */
  private async searchBusinessAddressWithGoogleMaps(business: {
    businessName: string;
    businessPhone?: string;
    businessWebsite?: string;
    businessAddress?: string;
  }): Promise<{
    street: string;
    city: string;
    state: string;
    zipCode: string;
  } | null> {
    try {
      const axios = await import('axios');
      const apiKey = process.env.GOOGLE_API_KEY;
      
      if (!apiKey) {
        console.log('⚠️ Google API key not available for address search');
        return null;
      }

      // Create search query
      let query = business.businessName;
      if (business.businessAddress) {
        query += ` ${business.businessAddress}`;
      }

      console.log('🔍 Searching Google Maps for:', query);

      const response = await axios.default.get(
        `https://maps.googleapis.com/maps/api/place/textsearch/json`, 
        {
          params: {
            query: query,
            key: apiKey,
            fields: 'formatted_address,name,place_id'
          }
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const place = response.data.results[0];
        console.log('📍 Found Google Maps result:', place.name, '-', place.formatted_address);
        
        // Get detailed place information
        const detailsResponse = await axios.default.get(
          `https://maps.googleapis.com/maps/api/place/details/json`,
          {
            params: {
              place_id: place.place_id,
              key: apiKey,
              fields: 'address_components,formatted_address'
            }
          }
        );

        if (detailsResponse.data.result?.address_components) {
          const components = detailsResponse.data.result.address_components;
          
          let street = '';
          let city = '';
          let state = '';
          let zipCode = '';

          for (const component of components) {
            const types = component.types;
            
            if (types.includes('street_number')) {
              street = component.long_name + ' ';
            }
            if (types.includes('route')) {
              street += component.long_name;
            }
            if (types.includes('locality')) {
              city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            }
            if (types.includes('postal_code')) {
              zipCode = component.long_name;
            }
          }

          if (street && city && state && zipCode) {
            console.log('✅ Successfully extracted address from Google Maps');
            return { street, city, state, zipCode };
          }
        }
      }

      console.log('⚠️ Could not find complete address information from Google Maps');
      return null;
    } catch (error) {
      console.error('❌ Error searching Google Maps for business address:', error);
      return null;
    }
  }

  /**
   * Normalize state code to 2-letter abbreviation
   */
  private normalizeStateCode(state: string): string {
    const stateMap: { [key: string]: string } = {
      'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
      'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
      'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
      'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
      'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
      'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
      'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
      'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
      'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
      'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
    };

    // If already 2 letters and uppercase, return as is
    if (state.length === 2 && state === state.toUpperCase()) {
      return state;
    }

    // Try to find full name match
    const normalized = stateMap[state.toLowerCase()];
    if (normalized) {
      return normalized;
    }

    // If not found, assume it's already an abbreviation and convert to uppercase
    return state.toUpperCase().substring(0, 2);
  }

  /**
   * Validate address components before calling Twilio API
   * Prevents API errors by checking data quality upfront
   */
  private validateAddressComponents(address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate street address
    if (!address.street || address.street.trim().length < 3) {
      errors.push('Street address is too short or missing');
    }

    // Validate city
    if (!address.city || address.city.trim().length < 2) {
      errors.push('City name is too short or missing');
    }

    // Validate state (must be 2 letter code)
    if (!address.state || address.state.length !== 2 || !/^[A-Z]{2}$/.test(address.state)) {
      errors.push(`State code must be 2 uppercase letters (e.g., TX, NY), got: "${address.state}"`);
    }

    // Validate ZIP code (must be 5 digits or 5+4 format)
    if (!address.zipCode || !/^\d{5}(-\d{4})?$/.test(address.zipCode)) {
      errors.push(`ZIP code must be 5 digits or ZIP+4 format (e.g., 12345 or 12345-6789), got: "${address.zipCode}"`);
    }

    // Check for suspicious patterns that indicate incomplete parsing
    if (address.street && address.street.includes(';')) {
      errors.push('Street address contains semicolons - multi-location data not properly parsed');
    }

    if (address.city && address.city.length > 50) {
      errors.push('City name is unusually long - may contain extra data');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Search and purchase phone number with emergency address
   */
  async searchAndPurchaseNumberWithEmergencyAddress(options: {
    areaCode?: string;
    emergencyAddressSid: string;
    voiceUrl?: string;
    smsUrl?: string;
    limit?: number;
  }): Promise<{
    phoneNumber: string;
    phoneNumberSid: string;
    voiceUrl: string;
    smsUrl: string;
  }> {
    try {
      console.log('🔍 Searching for available phone numbers with emergency address:', options.emergencyAddressSid);
      
      // Search for available numbers
      const availableNumbers = await this.searchAvailablePhoneNumbers({
        areaCode: options.areaCode,
        voiceEnabled: true,
        smsEnabled: true,
        limit: options.limit || 10
      });

      if (availableNumbers.length === 0) {
        throw new Error(`No available phone numbers found${options.areaCode ? ` for area code ${options.areaCode}` : ''}`);
      }

      // Purchase the first available number with emergency address
      const selectedNumber = availableNumbers[0];
      console.log('📞 Purchasing phone number:', selectedNumber.phoneNumber);

      const purchaseResult = await this.purchasePhoneNumber(selectedNumber.phoneNumber, {
        emergencyAddressSid: options.emergencyAddressSid,
        voiceUrl: options.voiceUrl,
        smsUrl: options.smsUrl
      });

      console.log('✅ Successfully purchased phone number:', purchaseResult.phoneNumber);

      return {
        phoneNumber: purchaseResult.phoneNumber,
        phoneNumberSid: purchaseResult.sid,
        voiceUrl: purchaseResult.voiceUrl || options.voiceUrl || '',
        smsUrl: purchaseResult.smsUrl || options.smsUrl || ''
      };
    } catch (error) {
      console.error('❌ Error searching and purchasing phone number:', error);
      throw error;
    }
  }

  /**
   * Register phone number for SMS messaging (A2P 10DLC)
   * This enables SMS capabilities by associating the phone number with a messaging service
   */
  async registerPhoneNumberForSMS(phoneNumberSid: string, options: {
    businessName?: string;
    messagingServiceSid?: string;
  }): Promise<{ success: boolean; messagingServiceSid?: string; error?: string }> {
    try {
      console.log(`📧 Registering phone number for SMS messaging: ${phoneNumberSid}`);
      
      // Check if phone number has SMS capabilities
      const phoneNumber = await this.client.incomingPhoneNumbers(phoneNumberSid).fetch();
      
      if (!phoneNumber.capabilities.sms) {
        console.warn('⚠️ Phone number does not have SMS capabilities');
        return {
          success: false,
          error: 'Phone number does not support SMS messaging'
        };
      }
      
      console.log(`✅ Phone number ${phoneNumber.phoneNumber} has SMS capabilities`);
      
      // If messaging service SID is provided, add phone number to that service
      if (options.messagingServiceSid) {
        try {
          await this.client.messaging.v1
            .services(options.messagingServiceSid)
            .phoneNumbers
            .create({ phoneNumberSid: phoneNumberSid });
          
          console.log(`✅ Phone number added to messaging service: ${options.messagingServiceSid}`);
          return {
            success: true,
            messagingServiceSid: options.messagingServiceSid
          };
        } catch (messagingError: any) {
          console.warn(`⚠️ Could not add to messaging service: ${messagingError.message}`);
          // Continue anyway - SMS can still work without a messaging service
        }
      }
      
      console.log(`✅ SMS registration complete for phone number`);
      return {
        success: true
      };
      
    } catch (error: any) {
      console.error('❌ Error registering phone number for SMS:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ensure a purchased phone number is added to a Twilio Messaging Service.
   * Uses TWILIO_MESSAGING_SERVICE_SID env var if set (platform-wide service),
   * otherwise creates a new per-business Messaging Service.
   * Returns the messaging service SID on success, or null on failure.
   */
  async ensurePhoneInMessagingService(phoneNumberSid: string, businessName: string): Promise<string | null> {
    try {
      let messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

      if (!messagingServiceSid) {
        console.log(`📧 No platform Messaging Service SID configured — creating one for: ${businessName}`);
        const service = await this.client.messaging.v1.services.create({
          friendlyName: `${businessName} AI Receptionist`,
        });
        messagingServiceSid = service.sid;
        console.log(`✅ Messaging Service created: ${messagingServiceSid}`);
      }

      await this.client.messaging.v1
        .services(messagingServiceSid)
        .phoneNumbers
        .create({ phoneNumberSid });

      console.log(`✅ Phone ${phoneNumberSid} added to Messaging Service ${messagingServiceSid}`);
      return messagingServiceSid;
    } catch (error: any) {
      console.error('❌ Error adding phone to Messaging Service:', error.message);
      return null;
    }
  }

  /**
   * Helper method to retry an operation with exponential backoff
   * Specifically handles "Emergency status is pending" errors from Twilio
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5,
    initialDelayMs: number = 1000,
    errorMessageCheck?: string
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if this is the specific error we want to retry
        const shouldRetry = errorMessageCheck 
          ? (error.message && error.message.includes(errorMessageCheck))
          : true;
        
        if (!shouldRetry || attempt === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms (Error: ${error.message})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Update phone number configuration
   */
  async updatePhoneNumberConfiguration(phoneNumberSid: string, options: {
    voiceUrl?: string;
    smsUrl?: string;
    statusCallback?: string;
    emergencyAddressSid?: string;
    friendlyName?: string;
    enableSMS?: boolean;
  }): Promise<any> {
    try {
      const updateOptions: any = {};

      if (options.voiceUrl) {
        updateOptions.voiceUrl = options.voiceUrl;
        updateOptions.voiceMethod = 'POST';
      }

      if (options.smsUrl) {
        updateOptions.smsUrl = options.smsUrl;
        updateOptions.smsMethod = 'POST';
      }

      if (options.statusCallback) {
        updateOptions.statusCallback = options.statusCallback;
      }

      if (options.emergencyAddressSid) {
        updateOptions.emergencyAddressSid = options.emergencyAddressSid;
      }

      if (options.friendlyName) {
        updateOptions.friendlyName = options.friendlyName;
      }

      try {
        // Use retry logic with exponential backoff for emergency status pending errors
        const updatedNumber = await this.retryWithBackoff(
          () => this.client.incomingPhoneNumbers(phoneNumberSid).update(updateOptions),
          5, // max retries
          1000, // initial delay 1 second
          'Emergency status is pending'
        );

        // If SMS should be enabled, register the phone number for SMS messaging
        if (options.enableSMS) {
          console.log('📧 Enabling SMS messaging for phone number...');
          const smsRegistration = await this.registerPhoneNumberForSMS(phoneNumberSid, {
            businessName: options.friendlyName
          });
          
          if (smsRegistration.success) {
            console.log('✅ SMS messaging enabled successfully');
          } else {
            console.warn(`⚠️ SMS registration failed: ${smsRegistration.error}`);
          }
        }

        return {
          sid: updatedNumber.sid,
          phoneNumber: updatedNumber.phoneNumber,
          friendlyName: updatedNumber.friendlyName,
          voiceUrl: updatedNumber.voiceUrl,
          smsUrl: updatedNumber.smsUrl,
          statusCallback: updatedNumber.statusCallback,
          smsEnabled: options.enableSMS
        };
      } catch (updateError: any) {
        // If error is about existing emergency address, remove it first then retry
        if (updateError.message && updateError.message.includes('emergency address') && 
            !updateError.message.includes('Emergency status is pending')) {
          console.log('⚠️ Phone number has existing emergency address, removing it first...');

          // Remove the existing emergency address by setting it to empty string
          // Use retry logic here as well in case the removal triggers pending status
          await this.retryWithBackoff(
            () => this.client.incomingPhoneNumbers(phoneNumberSid).update({
              emergencyAddressSid: ''
            }),
            5,
            1000,
            'Emergency status is pending'
          );

          console.log('✅ Existing emergency address removed, retrying configuration update...');

          // Retry the update with the new emergency address with exponential backoff
          const updatedNumber = await this.retryWithBackoff(
            () => this.client.incomingPhoneNumbers(phoneNumberSid).update(updateOptions),
            5,
            1000,
            'Emergency status is pending'
          );

          // If SMS should be enabled, register the phone number for SMS messaging
          if (options.enableSMS) {
            console.log('📧 Enabling SMS messaging for phone number...');
            const smsRegistration = await this.registerPhoneNumberForSMS(phoneNumberSid, {
              businessName: options.friendlyName
            });
            
            if (smsRegistration.success) {
              console.log('✅ SMS messaging enabled successfully');
            } else {
              console.warn(`⚠️ SMS registration failed: ${smsRegistration.error}`);
            }
          }

          return {
            sid: updatedNumber.sid,
            phoneNumber: updatedNumber.phoneNumber,
            friendlyName: updatedNumber.friendlyName,
            voiceUrl: updatedNumber.voiceUrl,
            smsUrl: updatedNumber.smsUrl,
            statusCallback: updatedNumber.statusCallback,
            smsEnabled: options.enableSMS
          };
        }

        // If it's a different error, throw it
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating phone number configuration:', error);
      throw error;
    }
  }


  /**
   * Get pricing for phone numbers
   */
  async getPhoneNumberPricing(country: string = 'US'): Promise<any> {
    try {
      const pricing = await this.client.pricing.v1.phoneNumbers.countries(country).fetch();
      return {
        country: pricing.country,
        isoCountry: pricing.isoCountry,
        phoneNumberPrices: pricing.phoneNumberPrices,
        priceUnit: pricing.priceUnit
      };
    } catch (error) {
      console.error('Error fetching phone number pricing:', error);
      throw error;
    }
  }

  /**
   * Get usage records for tracking phone minutes
   */
  async getUsageRecords(options: {
    startDate?: string; // Format: YYYY-MM-DD
    endDate?: string;   // Format: YYYY-MM-DD
    category?: string;  // Default: 'calls'
    phoneNumber?: string; // Optional filter by specific phone number
  } = {}): Promise<{
    totalMinutes: number;
    totalCost: number;
    records: Array<{
      category: string;
      usage: number;
      usageUnit: string;
      price: number;
      priceUnit: string;
      count: number;
      startDate: string;
      endDate: string;
    }>;
  }> {
    try {
      // Default to current month if no dates provided
      const now = new Date();
      const startDate = options.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = options.endDate || now.toISOString().split('T')[0];

      const requestOptions: any = {
        category: options.category || 'calls',
        startDate: startDate,
        endDate: endDate
      };

      // Add phone number filter if provided
      if (options.phoneNumber) {
        requestOptions.phoneNumber = options.phoneNumber;
      }

      console.log('📊 Fetching Twilio usage records with options:', requestOptions);
      const records = await this.client.usage.records.list(requestOptions);

      let totalMinutes = 0;
      let totalCost = 0;

      const processedRecords = records.map(record => {
        const usage = parseFloat(record.usage || '0');
        const price = parseFloat(record.price || '0');
        
        // Convert usage to minutes if it's in seconds
        const minutes = record.usageUnit === 'seconds' ? usage / 60 : usage;
        
        totalMinutes += minutes;
        totalCost += price;

        return {
          category: record.category,
          usage: minutes, // Always return in minutes
          usageUnit: 'minutes',
          price: price,
          priceUnit: record.priceUnit,
          count: parseInt(record.count || '0'),
          startDate: record.startDate || startDate,
          endDate: record.endDate || endDate
        };
      });

      console.log(`📊 Usage summary: ${totalMinutes.toFixed(2)} minutes, $${totalCost.toFixed(2)} total cost`);

      return {
        totalMinutes: Math.round(totalMinutes * 100) / 100, // Round to 2 decimal places
        totalCost: Math.round(totalCost * 100) / 100,
        records: processedRecords
      };
    } catch (error) {
      console.error('Error fetching usage records:', error);
      throw error;
    }
  }

  /**
   * Get call history for a phone number within date range
   */
  async getCallHistory(options: {
    phoneNumber: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    try {
      const { phoneNumber, startDate, endDate, limit = 100 } = options;
      
      console.log(`📞 Fetching Twilio call history for ${phoneNumber} from ${startDate?.toISOString()} to ${endDate?.toISOString()}`);
      
      const callOptions: any = {
        limit: Math.min(limit, 1000), // Twilio max per request
      };
      
      // Add date filters if provided
      if (startDate) {
        callOptions.startTimeAfter = startDate;
      }
      if (endDate) {
        callOptions.startTimeBefore = endDate;
      }
      
      // Get calls where this phone number was involved (inbound or outbound)
      const inboundCalls = await this.client.calls.list({
        ...callOptions,
        to: phoneNumber
      });
      
      const outboundCalls = await this.client.calls.list({
        ...callOptions,
        from: phoneNumber
      });
      
      // Combine and deduplicate by SID
      const allCalls = [...inboundCalls, ...outboundCalls];
      const uniqueCalls = allCalls.filter((call, index, self) => 
        index === self.findIndex(c => c.sid === call.sid)
      );
      
      console.log(`✅ Retrieved ${uniqueCalls.length} unique calls for ${phoneNumber}`);
      
      return uniqueCalls;
    } catch (error) {
      console.error(`❌ Failed to fetch Twilio call history for ${options.phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get call recordings for a specific call SID
   */
  async getCallRecordings(callSid: string): Promise<any[]> {
    try {
      console.log(`🎵 Fetching recordings for call: ${callSid}`);

      const recordings = await this.client.recordings.list({
        callSid: callSid,
        limit: 20
      });

      console.log(`✅ Retrieved ${recordings.length} recordings for call ${callSid}`);

      return recordings.map(recording => ({
        sid: recording.sid,
        duration: recording.duration,
        dateCreated: recording.dateCreated,
        uri: recording.uri,
        mediaUrl: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`
      }));
    } catch (error) {
      console.error(`❌ Failed to fetch recordings for call ${callSid}:`, error);
      return [];
    }
  }

  /**
   * Get SMS message history for a phone number
   * @param phoneNumber - Phone number to get messages for
   * @param options - Optional filters (to, from, dateSent)
   */
  async getSMSMessages(options: {
    to?: string;
    from?: string;
    dateSentAfter?: Date;
    dateSentBefore?: Date;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      const queryOptions: any = {
        limit: options.limit || 100
      };

      if (options.to) {
        queryOptions.to = options.to;
      }
      if (options.from) {
        queryOptions.from = options.from;
      }
      if (options.dateSentAfter) {
        queryOptions.dateSentAfter = options.dateSentAfter;
      }
      if (options.dateSentBefore) {
        queryOptions.dateSentBefore = options.dateSentBefore;
      }

      console.log(`📱 Fetching SMS messages from Twilio with options:`, queryOptions);

      const messages = await this.client.messages.list(queryOptions);

      console.log(`✅ Retrieved ${messages.length} SMS messages from Twilio`);

      return messages.map(message => ({
        sid: message.sid,
        from: message.from,
        to: message.to,
        body: message.body,
        status: message.status,
        direction: message.direction,
        price: message.price,
        priceUnit: message.priceUnit,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateSent: message.dateSent,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated
      }));
    } catch (error) {
      console.error('❌ Error fetching SMS messages from Twilio:', error);
      throw error;
    }
  }

  /**
   * Get current month usage for a specific user's phone number using call logs
   */
  async getCurrentMonthUsage(phoneNumber: string): Promise<{
    minutes: number;
    cost: number;
  }> {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date();

      console.log(`📞 Fetching call usage for phone number: ${phoneNumber} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Get calls made TO this phone number (inbound)
      const inboundCalls = await this.client.calls.list({
        to: phoneNumber,
        startTimeAfter: startDate,
        startTimeBefore: endDate,
        limit: 1000 // Reasonable limit to avoid huge requests
      });

      // Get calls made FROM this phone number (outbound) 
      const outboundCalls = await this.client.calls.list({
        from: phoneNumber,
        startTimeAfter: startDate,
        startTimeBefore: endDate,
        limit: 1000
      });

      let totalMinutes = 0;
      let totalCost = 0;

      // Process inbound calls
      for (const call of inboundCalls) {
        if (call.duration && parseInt(call.duration) > 0) {
          const callMinutes = parseInt(call.duration) / 60;
          totalMinutes += callMinutes;
          
          // Add cost if available (Twilio provides this per call)
          // Twilio prices are negative by convention, so we need to make them positive
          if (call.price) {
            totalCost += Math.abs(parseFloat(call.price));
          }
        }
      }

      // Process outbound calls
      for (const call of outboundCalls) {
        if (call.duration && parseInt(call.duration) > 0) {
          const callMinutes = parseInt(call.duration) / 60;
          totalMinutes += callMinutes;
          
          if (call.price) {
            totalCost += Math.abs(parseFloat(call.price));
          }
        }
      }

      console.log(`📊 Usage for ${phoneNumber}: ${totalMinutes.toFixed(2)} minutes, $${totalCost.toFixed(2)} (${inboundCalls.length} inbound, ${outboundCalls.length} outbound calls)`);

      return {
        minutes: Math.round(totalMinutes * 100) / 100, // Round to 2 decimal places
        cost: Math.round(totalCost * 100) / 100
      };
    } catch (error) {
      console.error(`Error fetching current month usage for ${phoneNumber}:`, error);
      return { minutes: 0, cost: 0 }; // Return default values on error
    }
  }
}

export const twilioService = new TwilioService();