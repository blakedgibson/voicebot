import type { TelephonyCallLog } from '@shared/schema';

interface EnhancedCallHistory {
  id: string;
  timestamp: Date;
  callerName?: string;
  callerPhone: string;
  customerId?: string;
  callType: 'reservation' | 'order' | 'catering' | 'faq_info' | 'other';
  intent?: string;
  conversationSummary: string;
  fullTranscript?: string;
  callSummary?: string;
  call_summary?: string;
  callSuccessful?: boolean;
  call_successful?: boolean;
  serviceType?: string;
  service_type?: string;
  interactionType?: string;
  callOutcome?: string;
  call_outcome?: string;
  aiActionsTaken: string[];
  orderId?: string;
  orderStatus?: string;
  customerNotes?: string[];
  outcome: 'successful' | 'escalated' | 'incomplete' | 'follow_up_needed';
  recordingUrl?: string;
  transcriptUrl?: string;
  duration: number;
  cost?: number;
  direction: 'inbound' | 'outbound';
  status: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  tags: string[];
  followUpReminder?: Date;
  confidence?: number;
  twilioCallSid?: string;
  retellCallId?: string;
  flagged?: boolean;
}

interface CallHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  callType?: string[];
  outcome?: string[];
  sentiment?: string[];
  phoneNumbers?: string[];
  tags?: string[];
  limit?: number;
  offset?: number;
}

export class CallHistoryService {
  async getEnhancedCallHistory(
    userId: string,
    phoneNumbers: string[],
    filters: CallHistoryFilters = {}
  ): Promise<EnhancedCallHistory[]> {
    if (!phoneNumbers || phoneNumbers.length === 0) return [];

    const { limit = 1000, offset = 0, startDate, endDate } = filters;

    try {
      const { storage } = await import('../storage');
      const rawCallLogs = await storage.getTelephonyCallLogsByPhoneNumbers(
        phoneNumbers,
        limit,
        offset,
        startDate,
        endDate
      );

      // Filter out child calls (those that were merged into a parent after a failed transfer).
      // parentCallId is set on reconnected calls so they don't appear as duplicate entries.
      const dbCallLogs = rawCallLogs.filter((log: any) => !log.parentCallId);

      // Identify calls that have a Retell call ID but are missing analytics.
      // We'll fetch from Retell API for these and store results so future loads are instant.
      const needsEnrichment = dbCallLogs.filter(log => {
        const cd = (log.conversationData as any) || {};
        const retellCallId = cd.retell_call_id || cd.retellCallId;
        if (!retellCallId) return false;
        // Enrich if call_summary is missing OR post_call_analytics is empty/absent
        const hasCallSummary = !!cd.call_summary;
        const hasRealAnalytics = cd.post_call_analytics &&
          typeof cd.post_call_analytics === 'object' &&
          Object.keys(cd.post_call_analytics).length > 0;
        return !hasCallSummary && !hasRealAnalytics;
      });

      if (needsEnrichment.length > 0) {
        console.log(`🔄 Enriching ${needsEnrichment.length} calls from Retell AI (will cache in DB)`);
        const enriched = await this.enrichFromRetell(needsEnrichment, storage);

        // Merge enriched data back into the dbCallLogs array
        const enrichedMap = new Map(enriched.map(e => [e.id, e]));
        for (let i = 0; i < dbCallLogs.length; i++) {
          if (enrichedMap.has(dbCallLogs[i].id)) {
            dbCallLogs[i] = enrichedMap.get(dbCallLogs[i].id)!;
          }
        }
      }

      return dbCallLogs.map(log => this.dbCallToEnhanced(log));
    } catch (error) {
      console.error('❌ Error fetching call history:', error);
      return [];
    }
  }

  /**
   * Fetch post-call analytics from Retell API for calls that are missing data.
   * Results are stored in the DB so subsequent loads are served instantly.
   * Concurrency is capped at 5 to avoid rate limits.
   */
  private async enrichFromRetell(
    callLogs: TelephonyCallLog[],
    storage: any
  ): Promise<TelephonyCallLog[]> {
    const { RetellProvider } = await import('./RetellProvider');
    const retellProvider = new RetellProvider();

    const CONCURRENCY = 5;
    const results: TelephonyCallLog[] = [];

    for (let i = 0; i < callLogs.length; i += CONCURRENCY) {
      const batch = callLogs.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(log => this.enrichOneCall(log, retellProvider, storage))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j];
        results.push(r.status === 'fulfilled' ? r.value : batch[j]);
      }
    }

    return results;
  }

  private async enrichOneCall(
    log: TelephonyCallLog,
    retellProvider: any,
    storage: any
  ): Promise<TelephonyCallLog> {
    const cd = (log.conversationData as any) || {};
    const retellCallId = cd.retell_call_id || cd.retellCallId;
    if (!retellCallId) return log;

    try {
      const details = await retellProvider.getCallDetails(retellCallId);
      if (!details) return log;

      // Only use customer_name if it's a real name (not a phone number)
      const rawName = details.customer_name;
      const customerName = (rawName && rawName !== 'Unknown' && !/^\+?\d{7,}$/.test(rawName))
        ? rawName : undefined;
      const interactionType = details.service_type || details.call_type;
      const callSummary = details.call_summary;
      const callOutcome = details.call_outcome;
      const sentiment = details.sentiment;
      const transcript = details.transcript;
      const recordingUrl = details.recording_url || log.recordingUrl;

      // Calculate proper duration from Retell timestamps when available
      let duration = log.duration;
      if (!duration || duration <= 2) {
        if (details.duration_ms) {
          duration = Math.round(details.duration_ms / 1000);
        } else if (log.startTime && log.endTime) {
          duration = Math.round((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000);
        }
      }

      const updatedConversationData = {
        ...(cd || {}),
        retell_call_id: retellCallId,
        customer_name: customerName,
        service_type: interactionType,
        call_summary: callSummary,
        call_outcome: callOutcome,
        sentiment: sentiment,
        call_successful: details.call_successful,
        post_call_analytics: details.call_analysis || {}
      };

      const isNegative = sentiment?.toLowerCase() === 'negative';
      const isEscalated = callOutcome?.toLowerCase() === 'escalated';
      const isFailed = details.call_successful === false;
      const shouldFlag = isNegative || isEscalated || isFailed || (log.flagged ?? false);

      // Determine safe customerName: never overwrite with a phone number
      const existingNameIsPhone = !log.customerName ||
        log.customerName === 'Unknown' ||
        /^\+?\d{7,}$/.test(log.customerName);
      const finalCustomerName = customerName || (existingNameIsPhone ? undefined : log.customerName);

      // Persist to DB so future loads are instant (fire-and-forget style — don't await)
      storage.updateTelephonyCallLog(log.id, {
        customerName: finalCustomerName || null,
        interactionType: interactionType || log.interactionType,
        transcriptionText: transcript || log.transcriptionText,
        callOutcome: callOutcome || log.callOutcome,
        sentiment: sentiment || log.sentiment,
        recordingUrl: recordingUrl || log.recordingUrl,
        duration: duration || log.duration,
        flagged: shouldFlag,
        summary: callSummary && callSummary !== 'No summary available' ? callSummary : undefined,
        conversationData: updatedConversationData
      }).catch((err: any) => console.error(`❌ Failed to cache Retell data for ${log.id}:`, err));

      // Return enriched log immediately without waiting for DB write
      return {
        ...log,
        customerName: finalCustomerName || null,
        interactionType: interactionType || log.interactionType,
        transcriptionText: transcript || log.transcriptionText,
        callOutcome: callOutcome || log.callOutcome,
        sentiment: sentiment || log.sentiment,
        recordingUrl: recordingUrl || log.recordingUrl,
        duration: duration || log.duration,
        flagged: shouldFlag,
        summary: callSummary && callSummary !== 'No summary available' ? callSummary : undefined,
        conversationData: updatedConversationData
      };
    } catch (error) {
      console.error(`❌ Failed to enrich call ${retellCallId} from Retell:`, error);
      return log;
    }
  }

  /**
   * The DB stores conversation data in two different formats:
   *
   *  A) Old Twilio/Whisper calls: conversationData is an ARRAY of {role, content}
   *     objects — this IS the transcript.
   *
   *  B) Retell AI calls: conversationData is an OBJECT with retell_call_id
   *     and post-call analytics fields (after enrichment).
   */
  private dbCallToEnhanced(dbCall: TelephonyCallLog): EnhancedCallHistory {
    const raw = dbCall.conversationData;
    const isTranscriptArray = Array.isArray(raw);

    const cdObj = (!isTranscriptArray && raw && typeof raw === 'object') ? (raw as any) : {};
    const analytics = cdObj.post_call_analytics || {};
    const transcriptArray: Array<{ role: string; content: string }> = isTranscriptArray ? (raw as any) : [];

    // Build full transcript string
    let fullTranscript: string | undefined;
    if (dbCall.transcriptionText && dbCall.transcriptionText.length > 20) {
      fullTranscript = dbCall.transcriptionText;
    } else if (transcriptArray.length > 0) {
      fullTranscript = transcriptArray
        .filter(m => m.content && m.content !== 'Transcription failed')
        .map(m => `${m.role === 'user' ? 'Caller' : 'Agent'}: ${m.content}`)
        .join('\n');
    }

    const retellCallId: string | undefined = cdObj.retell_call_id || cdObj.retellCallId;

    // Only use real names — filter out phone numbers and 'Unknown'
    const isRealName = (n?: string | null) =>
      !!(n && n !== 'Unknown' && !/^\+?\d{7,}$/.test(n));

    const callerName: string | undefined =
      isRealName(dbCall.customerName) ? dbCall.customerName! :
      isRealName(cdObj.customer_name) ? cdObj.customer_name :
      isRealName(analytics?.customer_name) ? analytics.customer_name :
      isRealName(analytics?.custom_analysis_data?.customer_name)
        ? analytics.custom_analysis_data.customer_name
        : undefined;

    const callSummary: string | undefined =
      cdObj.call_summary ||
      analytics?.call_summary ||
      (dbCall as any).summary ||  // also read from the summary DB column
      undefined;

    const callOutcome: string | undefined =
      dbCall.callOutcome ||
      cdObj.call_outcome ||
      analytics?.call_outcome ||
      undefined;

    const serviceType: string | undefined =
      dbCall.interactionType ||
      cdObj.service_type ||
      analytics?.service_type ||
      analytics?.custom_analysis_data?.service_type ||
      undefined;

    const sentiment = (dbCall.sentiment as any) || undefined;

    const callType = this.resolveCallType(serviceType, fullTranscript);

    // Calculate duration from start/end times (more accurate than the stored column)
    let duration = 0;
    if (dbCall.startTime && dbCall.endTime) {
      const startMs = new Date(dbCall.startTime).getTime();
      const endMs = new Date(dbCall.endTime).getTime();
      if (endMs > startMs) {
        duration = Math.round((endMs - startMs) / 1000);
      }
    }
    if (duration === 0 && dbCall.duration && dbCall.duration > 2) {
      duration = dbCall.duration;
    }

    const conversationSummary: string =
      callSummary ||
      (fullTranscript ? fullTranscript.slice(0, 200) : '') ||
      'Call with AI receptionist';

    const outcome = this.resolveOutcome(dbCall.status, callOutcome, dbCall.sentiment);

    return {
      id: dbCall.id,
      timestamp: dbCall.startTime || dbCall.createdAt || new Date(),

      callerPhone: dbCall.fromNumber || 'Unknown',
      callerName,
      customerId: cdObj.customerId,

      callType,
      intent: cdObj.intent,

      conversationSummary,
      fullTranscript,
      callSummary,
      call_summary: callSummary,
      callSuccessful: cdObj.call_successful ?? analytics?.call_successful,
      call_successful: cdObj.call_successful ?? analytics?.call_successful,

      serviceType,
      service_type: serviceType,
      interactionType: serviceType,
      callOutcome,
      call_outcome: callOutcome,

      aiActionsTaken: ['Responded to customer inquiry'],

      orderId: cdObj.orderId,
      orderStatus: cdObj.orderStatus,
      orderAmount: cdObj.order_amount ?? analytics?.custom_analysis_data?.order_amount ?? undefined,

      customerNotes: [],

      outcome,

      recordingUrl: dbCall.recordingUrl || undefined,
      transcriptUrl: dbCall.recordingUrl || undefined,

      duration,
      cost: 0,
      direction: (dbCall.direction || 'inbound') as 'inbound' | 'outbound',
      status: dbCall.status || 'completed',

      sentiment,
      sentimentScore: dbCall.sentimentScore || undefined,
      confidence: dbCall.confidence || undefined,
      tags: this.buildTags(dbCall, duration),
      followUpReminder: undefined,

      twilioCallSid: dbCall.twilioCallSid || undefined,
      retellCallId,
      flagged: dbCall.flagged || false,
    };
  }

  private resolveCallType(
    serviceType?: string,
    transcript?: string
  ): EnhancedCallHistory['callType'] {
    const rawType = (serviceType || '').toLowerCase();

    if (rawType.includes('reservation') || rawType.includes('booking')) return 'reservation';
    if (rawType.includes('order') || rawType.includes('delivery')) return 'order';
    if (rawType.includes('catering')) return 'catering';
    if (rawType.includes('faq') || rawType.includes('inquiry') || rawType.includes('general') || rawType.includes('info')) return 'faq_info';
    if (rawType.includes('appointment')) return 'reservation';

    const text = (transcript || '').toLowerCase();
    if (text.includes('reservation') || text.includes('table') || text.includes('book a table')) return 'reservation';
    if (text.includes('appointment') || text.includes('book an appointment')) return 'reservation';
    if (text.includes('catering')) return 'catering';
    if (text.includes('order') || text.includes('delivery')) return 'order';
    if (text.includes('menu') || text.includes('hours') || text.includes('located') || text.includes('location')) return 'faq_info';

    return 'other';
  }

  private resolveOutcome(
    status?: string | null,
    callOutcome?: string,
    sentiment?: string | null
  ): EnhancedCallHistory['outcome'] {
    if (callOutcome === 'escalated') return 'escalated';
    if (callOutcome === 'successful' || callOutcome === 'resolved') return 'successful';
    if (callOutcome === 'incomplete' || callOutcome === 'abandoned') return 'incomplete';
    if (status === 'completed') return 'successful';
    if (status === 'busy' || status === 'no-answer' || status === 'failed') return 'incomplete';
    return 'successful';
  }

  private buildTags(dbCall: TelephonyCallLog, computedDuration: number): string[] {
    const tags: string[] = [];
    if (computedDuration > 300) tags.push('long-call');
    if (dbCall.sentiment === 'positive') tags.push('positive');
    if (dbCall.sentiment === 'negative') tags.push('follow-up');
    if (dbCall.flagged) tags.push('flagged');
    if (dbCall.recordingUrl) tags.push('recorded');
    return tags;
  }
}

export const callHistoryService = new CallHistoryService();
