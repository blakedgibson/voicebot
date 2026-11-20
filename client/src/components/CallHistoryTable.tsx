import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { getCallTypes } from "@/lib/industryHelpers";
import type { Industry } from "@shared/industryConfig";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  Clock,
  User,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Flag,
  Tag,
  FileText,
  Download,
  Search,
  Filter,
  Play,
  Pause,
  Square,
  Volume2,
  Loader2,
  PhoneCall,
  Mail,
  MoreHorizontal,
  Edit,
  UserPlus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
  ChevronLeft,
  Check
} from "lucide-react";

// Enhanced interface that aligns with the database schema
interface EnhancedCallRecord {
  id: string;
  twilioCallSid: string;
  fromNumber?: string;
  toNumber?: string;
  normalizedPhone?: string;
  direction: 'inbound' | 'outbound';
  status: string; // Twilio status
  callStatus?: string; // Our custom status
  duration?: number;
  startTime: string;
  endTime?: string;
  recordingUrl?: string;
  recordingSid?: string;
  transcriptionText?: string;
  aiResponse?: string;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  sentimentScore?: number;
  callOutcome?: string;
  actionTaken?: string;
  confidence?: number;
  conversationData?: Array<{ role: 'user' | 'assistant', content: string }>;
  // Enhanced fields
  customerName?: string;
  interactionType?: string;
  vip?: boolean;
  tags?: string[];
  notes?: string[];
  summary?: string;
  call_summary?: string;
  callSummary?: string;
  call_successful?: boolean;
  actions?: any[];
  flagged?: boolean;
  connectedRefs?: any;
  recordingProviderId?: string;
  disconnect_reason?: string;
  call_analysis?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface CallHistoryTableProps {
  calls: EnhancedCallRecord[];
  isLoading?: boolean;
  onRefresh?: () => void;
  conversations?: any[];
  isLoadingConversations?: boolean;
  industry?: Industry;
  agentId?: string;
  onSwitchToMessaging?: (phoneNumber: string) => void;
  openCallId?: string | null;
  onOpenCallHandled?: () => void;
  businessData?: any;
  kbContent?: string;
}

type SortField = 'startTime' | 'duration' | 'interactionType' | 'callStatus' | 'customerName' | 'callOutcome';
type SortDirection = 'asc' | 'desc';

// Audio playback state interface
interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentCallId: string | null;
  duration: number;
  currentTime: number;
  error: string | null;
}

// Expand common salon abbreviations so "Pedi Classic" matches "pedicure classic" in transcripts
function expandAbbreviations(text: string): string {
  return text
    .replace(/\bpedi\b/gi, 'pedicure')
    .replace(/\bmani\b/gi, 'manicure')
    .replace(/\blash\b/gi, 'eyelash')
    .replace(/\bbrow\b/gi, 'eyebrow');
}

// Parse "Item Name $price" pairs out of free-form knowledge-base text.
// Processes line-by-line so multi-section headers don't bleed into item names.
// Returns name + normalized phrase (for phrase-match) + price.
function parseKbItems(kbText: string): Array<{ name: string; phrase: string; price: number }> {
  const items: Array<{ name: string; phrase: string; price: number }> = [];
  if (!kbText) return items;

  const lineRe = /([A-Za-z][A-Za-z0-9 &'\/-]*?)\s*\$(\d+(?:\.\d{1,2})?)/g;

  for (const rawLine of kbText.split(/[\n\r]+/)) {
    const line = rawLine.trim();
    if (!line.includes('$')) continue;

    lineRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(line)) !== null) {
      const name = m[1].trim();
      const price = parseFloat(m[2]);
      if (!name || isNaN(price) || price <= 0) continue;
      // Skip all-caps section headers (e.g. "SERVICES", "PEDICURES")
      if (name === name.toUpperCase() && name.replace(/\s/g, '').length > 3) continue;
      // Normalized phrase: lowercase + expand abbreviations + collapse whitespace
      const phrase = expandAbbreviations(name.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim());
      if (!phrase) continue;
      items.push({ name, phrase, price });
    }
  }
  return items;
}

export default function CallHistoryTable({ calls, isLoading = false, onRefresh, conversations = [], isLoadingConversations = false, industry = 'restaurant', agentId, onSwitchToMessaging, openCallId, onOpenCallHandled, businessData, kbContent = '' }: CallHistoryTableProps) {
  const [selectedCall, setSelectedCall] = useState<EnhancedCallRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [vipFilter, setVipFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("Total");
  const [isCombinedDropdownOpen, setIsCombinedDropdownOpen] = useState(false);
  const [localCalls, setLocalCalls] = useState<EnhancedCallRecord[]>(calls);


  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Fetch saved contacts (manually-edited names override call-derived names)
  const { data: contactsData } = useQuery({
    queryKey: ['/api/contacts', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/contacts?limit=1000', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
    staleTime: 120000, // 2 minutes
  });

  const savedContacts = contactsData?.contacts || [];

  // Rejects phone numbers, placeholders, greetings, and other non-name strings.
  const isValidContactName = (name: string | null | undefined): boolean => {
    if (!name) return false;
    const n = name.trim();
    if (!n) return false;
    const junk = ['unknown', 'default_customer', 'guest', 'n/a', 'na'];
    if (junk.includes(n.toLowerCase())) return false;
    if (/^\+?[\d\s().,-]{7,}$/.test(n)) return false;
    if (/welcome to|^hello[,!\s]/i.test(n)) return false;
    if (n.length > 60) return false;
    return true;
  };

  // Build a phone→name map from call history (mirrors Contacts tab derivation logic).
  // Key = last 10 digits of the phone number.
  const phoneToNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    calls.forEach(call => {
      const phone = (call.fromNumber || '').replace(/\D/g, '').slice(-10);
      if (!phone) return;
      // Skip if we already have a valid name for this number
      if (map.has(phone)) return;
      const name = call.customerName ||
                   (call.conversationData as any)?.customer_name ||
                   call.callerName ||
                   (call as any).caller_name;
      if (isValidContactName(name)) {
        map.set(phone, name.trim());
      }
    });
    return map;
  }, [calls]);

  // Resolve the display name for a phone number.
  // Priority 1: manually-saved contact name from database
  // Priority 2: name derived from call history (same logic as Contacts tab)
  const getContactNameFromPhone = (phoneNumber: string): string | null => {
    if (!phoneNumber) return null;
    const normalized10 = phoneNumber.replace(/\D/g, '').slice(-10);

    // Priority 1: saved contact name (set when user edits a contact)
    if (savedContacts.length > 0) {
      const saved = savedContacts.find((c: any) => {
        const cp = (c.phoneNumber || '').replace(/\D/g, '');
        return cp.slice(-10) === normalized10;
      });
      if (saved?.customerName || saved?.name) return saved.customerName || saved.name;
    }

    // Priority 2: derive from call history
    return phoneToNameMap.get(normalized10) || null;
  };

  // Update local calls when props change
  React.useEffect(() => {
    setLocalCalls(calls);
  }, [calls]);

  // Auto-open side panel for a specific call (from notification "View More")
  React.useEffect(() => {
    if (!openCallId || !localCalls.length) return;
    const target = localCalls.find(c => c.id === openCallId);
    if (target) {
      setSelectedCall(target);
      onOpenCallHandled?.();
    }
  }, [openCallId, localCalls]);

  // Toggle VIP status
  const handleToggleVIP = async (call: EnhancedCallRecord) => {
    if (!agentId) {
      toast({
        title: "Error",
        description: "Cannot update call: Agent ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimistic update
      setLocalCalls(prev => prev.map(c => c.id === call.id ? { ...c, vip: !c.vip } : c));

      const response = await fetch(`/api/restaurant/${agentId}/calls/${call.id}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vip: !call.vip })
      });

      if (!response.ok) throw new Error('Failed to update');

      toast({
        title: call.vip ? "VIP Removed" : "VIP Added",
        description: `${call.customerName || 'Caller'} ${call.vip ? 'removed from' : 'added to'} VIP list`,
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      // Revert on error
      setLocalCalls(prev => prev.map(c => c.id === call.id ? { ...c, vip: call.vip } : c));
      toast({
        title: "Error",
        description: "Failed to update VIP status",
        variant: "destructive",
      });
    }
  };

  // Toggle flag status
  const handleToggleFlag = async (call: EnhancedCallRecord) => {
    if (!agentId) {
      toast({
        title: "Error",
        description: "Cannot update call: Agent ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimistic update
      setLocalCalls(prev => prev.map(c => c.id === call.id ? { ...c, flagged: !c.flagged } : c));

      const response = await fetch(`/api/restaurant/${agentId}/calls/${call.id}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ flagged: !call.flagged })
      });

      if (!response.ok) throw new Error('Failed to update');

      toast({
        title: call.flagged ? "Flag Removed" : "Call Flagged",
        description: call.flagged ? "Call unflagged" : "Call flagged for follow-up - notification sent",
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      // Revert on error
      setLocalCalls(prev => prev.map(c => c.id === call.id ? { ...c, flagged: call.flagged } : c));
      toast({
        title: "Error",
        description: "Failed to update flag status",
        variant: "destructive",
      });
    }
  };

  // Get industry-specific call types
  const industryCallTypes = getCallTypes(industry);
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Actions dropdown state (portal-based like MembersTable)

  // Audio playback state
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    currentCallId: null,
    duration: 0,
    currentTime: 0,
    error: null
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequestIdRef = useRef<number>(0);
  const { toast } = useToast();

  const processedCalls = React.useMemo(() => {
    return localCalls;
  }, [localCalls]);

  // Utility functions
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCallDate = (dateString: string) => {
    const callDate = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const callDateMidnight = new Date(callDate.getFullYear(), callDate.getMonth(), callDate.getDate());

    const timeStr = callDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (callDateMidnight.getTime() === today.getTime()) {
      return `Today, ${timeStr}`;
    }

    if (callDateMidnight.getTime() === yesterday.getTime()) {
      return `Yesterday, ${timeStr}`;
    }

    const dateStr = callDate.getFullYear() === now.getFullYear()
      ? callDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : callDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    return `${dateStr}, ${timeStr}`;
  };

  const formatPhoneNumber = (phone?: string | null) => {
    if (!phone) return '';
    if (phone.startsWith('+1')) {
      const cleaned = phone.slice(2);
      // Display digit by digit for clarity as requested
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getCallType = (call: any) => {
    // Determine call type from multiple possible fields
    // Priority: conversationData.service_type (Retell AI classification) > callType > interactionType > analysis
    
    // Get valid call type IDs for this industry
    const validCallTypeIds = industryCallTypes.map(ct => ct.id);
    
    // Helper function to match a raw value to an industry call type
    const matchCallType = (rawValue: string): string => {
      if (!rawValue) return 'other';
      
      const normalized = rawValue.toLowerCase().trim();
      
      // 1. Try exact match first
      if (validCallTypeIds.includes(normalized)) {
        return normalized;
      }
      
      // 2. Try matching against labels and IDs
      for (const validType of industryCallTypes) {
        const typeId = validType.id.toLowerCase();
        const typeLabel = validType.label.toLowerCase();
        
        // Check if the raw value matches the type ID or label
        if (normalized === typeId || normalized === typeLabel) {
          return validType.id;
        }
        
        // Check if the raw value contains the type ID or label
        if (normalized.includes(typeId) || typeId.includes(normalized)) {
          return validType.id;
        }
        
        if (normalized.includes(typeLabel) || typeLabel.includes(normalized)) {
          return validType.id;
        }
      }
      
      // 3. Try keyword matching for common variations
      const keywords: Record<string, string[]> = {
        'reservation': ['reservation', 'booking', 'book', 'table', 'reserve'],
        'appointment': ['appointment', 'appt', 'visit', 'checkup', 'consultation'],
        'order': ['order', 'pickup', 'takeout', 'take-out', 'to-go'],
        'delivery': ['delivery', 'deliver'],
        'catering': ['catering', 'event', 'party'],
        'faq': ['faq', 'question', 'info', 'information', 'hours', 'location', 'general'],
        'prescription': ['prescription', 'refill', 'medication', 'med', 'rx'],
        'emergency': ['emergency', 'urgent', 'asap', 'critical'],
        'service': ['service', 'treatment'],
        'estimate': ['estimate', 'quote', 'pricing'],
        'showing': ['showing', 'tour', 'viewing'],
        'maintenance': ['maintenance', 'repair', 'fix'],
        'leasing': ['lease', 'leasing', 'rent', 'rental'],
        'membership': ['membership', 'member', 'join'],
        'session': ['session', 'class'],
        'enrollment': ['enrollment', 'enroll', 'register'],
        'scheduling': ['scheduling', 'schedule'],
        'procedure': ['procedure', 'dental', 'surgery'],
        'booking': ['booking', 'book'],
      };
      
      for (const validType of industryCallTypes) {
        const keywordList = keywords[validType.id] || [validType.id];
        for (const keyword of keywordList) {
          if (normalized.includes(keyword)) {
            return validType.id;
          }
        }
      }
      
      return 'other';
    };

    // Check in priority order
    const sources = {
      'conversationData.service_type': call.conversationData?.service_type,
      'callType': call.callType,
      'interactionType': call.interactionType,
      'call_analysis.service_type': call.call_analysis?.service_type,
      'intent/purpose': call.intent || call.purpose || call.call_analysis?.intent,
      'summary': call.conversationData?.call_summary || call.call_analysis?.call_summary
    };
    
    // Try each source in priority order
    for (const [sourceName, sourceValue] of Object.entries(sources)) {
      if (sourceValue) {
        const matched = matchCallType(sourceValue);
        if (matched !== 'other') {
          // Only log in development for debugging
          if (import.meta.env.DEV) {
            console.log(`✅ Call type "${matched}" detected from ${sourceName}: "${sourceValue}"`);
          }
          return matched;
        }
      }
    }

    // Log when we couldn't determine the call type (development only)
    if (import.meta.env.DEV) {
      console.log('⚠️ Could not determine call type, defaulting to "other"', { 
        callId: call.id,
        availableData: sources 
      });
    }
    
    return 'other';
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getCallOutcomeColor = (outcome?: string) => {
    if (!outcome) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';

    const outcomeLower = outcome.toLowerCase();

    // Success outcomes (green)
    if (outcomeLower.includes('booked') || outcomeLower.includes('placed') || outcomeLower.includes('scheduled') ||
        outcomeLower.includes('signup') || outcomeLower.includes('enrollment') || outcomeLower.includes('reservation')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }

    // Handled/Neutral outcomes (blue)
    if (outcomeLower.includes('faq') || outcomeLower.includes('inquiry') || outcomeLower.includes('question')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }

    // Transfer outcomes (yellow)
    if (outcomeLower.includes('transfer')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }

    // Failed/Negative outcomes (red)
    if (outcomeLower.includes('hung up') || outcomeLower.includes('failed') || outcomeLower.includes('emergency')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }

    // Default gray
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  };

  const getCallTypeLabel = (callTypeId: string): string => {
    const callType = industryCallTypes.find(ct => ct.id === callTypeId);
    return callType?.label || callTypeId;
  };

  // Parse KB items once per render (memoized via useMemo-like pattern inside the fn if needed)
  const kbItems = parseKbItems(kbContent);

  // Calculate revenue for a single call.
  // Priority:
  //  1. Direct order_amount stamp (from send_sms_confirmation — most authoritative)
  //  2. KB phrase matching against transcript + summary
  //  3. Legacy menu-item keyword matching
  const calculateCallRevenue = (call: any): number => {
    // 1. Prefer the direct order_amount stamped on the call log by send_sms_confirmation
    if (call.order_amount != null) {
      const direct = parseFloat(call.order_amount);
      if (!isNaN(direct) && direct > 0) return direct;
    }

    // 2. KB phrase matching: item's full name must appear as a phrase in the transcript.
    //    Expand abbreviations in both the corpus and the item phrases to normalize spelling
    //    (e.g. "Pedi Classic" → "pedicure classic" matches "pedicure classic" in transcript).
    if (kbItems.length > 0) {
      const rawCorpus = [
        call.transcriptionText || call.transcript || '',
        call.call_summary || call.summary || call.callSummary || '',
        call.service_type || call.interactionType || '',
      ].join(' ').toLowerCase();

      // Normalize the corpus the same way we normalize item phrases
      const corpus = expandAbbreviations(rawCorpus.replace(/[-_]/g, ' ').replace(/\s+/g, ' '));

      if (corpus.trim().length > 0) {
        let total = 0;
        for (const item of kbItems) {
          // Primary: full phrase must appear verbatim in the corpus
          if (corpus.includes(item.phrase)) {
            total += item.price;
            continue;
          }
          // Fallback for add-on style items ("Shellac Add-on" → core "shellac"):
          // strip "add on / add-on" and check the remaining core word as a whole word
          const corePhrase = item.phrase.replace(/\badd[\s-]?on\b/g, '').replace(/\s+/g, ' ').trim();
          if (corePhrase.length >= 4 && corePhrase !== item.phrase) {
            const coreRe = new RegExp(`\\b${corePhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
            if (coreRe.test(corpus)) {
              total += item.price;
            }
          }
        }
        if (total > 0) return total;
      }
    }

    // 4. Fall back to structured menuItems keyword matching (legacy)
    if (!businessData) return 0;
    const menuItemsList: any[] = Array.isArray(businessData?.menuItems) ? businessData.menuItems : [];
    const priceEntries: Array<{ keywords: string[]; price: number }> = [];

    for (const item of menuItemsList) {
      const name = (item.name || item.item || '').trim();
      const price = parseFloat(item.price || item.amount || '0');
      if (name && price > 0) {
        priceEntries.push({
          keywords: name.toLowerCase().split(/[\s,\/\-]+/).filter((w: string) => w.length > 2),
          price,
        });
      }
    }

    if (priceEntries.length === 0) return 0;

    const searchText = [
      analytics.call_summary || '',
      analytics.service_type || '',
      call.interactionType || '',
    ].join(' ').toLowerCase();

    let bestMatch: { keywords: string[]; price: number } | null = null;
    let bestScore = 0;

    for (const entry of priceEntries) {
      const matchCount = entry.keywords.filter((kw: string) => searchText.includes(kw)).length;
      const score = matchCount * entry.keywords.length;
      if (matchCount > 0 && score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    return bestMatch ? bestMatch.price : 0;
  };

  const getInteractionTypeColor = (type?: string) => {
    // Generate consistent colors for different call types
    const colorMap: Record<string, string> = {
      'reservation': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'appointment': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'order': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'delivery': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'catering': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'event': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'faq': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'service': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
      'prescription': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      'estimate': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      'emergency': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'booking': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'session': 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
      'membership': 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400',
      'class': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
      'showing': 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400',
      'maintenance': 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
      'leasing': 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400',
      'treatment': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/20 dark:text-fuchsia-400',
      'enrollment': 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400',
      'scheduling': 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400',
      'procedure': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    };
    return colorMap[type || 'other'] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  };

  const getCallStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'missed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'incompleted': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'transferred': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getFailureReason = (call: EnhancedCallRecord): string | null => {
    // Only return failure reason if call is flagged or unsuccessful
    if (!call.flagged && call.call_successful !== false && (call.conversationData as any)?.call_successful !== false) {
      return null;
    }

    // Get the call summary from various possible fields
    const summary = (
      call.call_summary || 
      call.summary || 
      call.callSummary || 
      (call.conversationData as any)?.call_summary || 
      ''
    ).toLowerCase();

    // Get service type from multiple possible sources for context-aware detection
    const callAnalysis = call.call_analysis;
    const callType = getCallType(call).toLowerCase();
    const serviceType = (
      callAnalysis?.service_type || 
      call.interactionType || 
      callType ||
      ''
    ).toLowerCase();

    // Check for connection issues first (highest priority)
    if (
      summary.includes('connection lost') ||
      summary.includes('connection failed') ||
      summary.includes('network error') ||
      summary.includes('internet issue') ||
      summary.includes('connection issue') ||
      summary.includes('disconnected unexpectedly') ||
      call.disconnect_reason?.toLowerCase().includes('network')
    ) {
      return 'Connection Lost';
    }

    // Check for EXPLICIT user hanging up
    if (
      summary.includes('hung up') ||
      summary.includes('ended abruptly') ||
      summary.includes('abruptly ended') ||
      summary.includes('call ended suddenly') ||
      summary.includes('customer hung up') ||
      summary.includes('caller hung up') ||
      summary.includes('user hung up') ||
      summary.includes('terminated early') ||
      summary.includes('ended in the middle') ||
      summary.includes('disconnected mid') ||
      summary.includes('interrupted and unclear') ||
      summary.includes('conversation was interrupted')
    ) {
      return 'User Hung Up Abruptly';
    }

    // Check for EXPLICIT order processing errors
    if (
      summary.includes('error processing the order') ||
      summary.includes('error processing order') ||
      summary.includes('failed to process order') ||
      summary.includes('order processing failed') ||
      summary.includes('could not process order') ||
      summary.includes('unable to process order') ||
      summary.includes('error placing order') ||
      summary.includes('order error') ||
      summary.includes('failed order') ||
      summary.includes('could not be processed') ||
      summary.includes('order could not')
    ) {
      return 'Error Processing Order';
    }

    // Check for EXPLICIT reservation booking errors
    if (
      summary.includes('error booking reservation') ||
      summary.includes('error making reservation') ||
      summary.includes('failed to book reservation') ||
      summary.includes('reservation booking failed') ||
      summary.includes('could not book reservation') ||
      summary.includes('unable to book reservation') ||
      summary.includes('reservation error') ||
      summary.includes('failed reservation') ||
      summary.includes('booking failed') ||
      summary.includes('issue creating your reservation') ||
      summary.includes('issue with creating your reservation') ||
      summary.includes('problem creating your reservation') ||
      summary.includes('problem with the reservation')
    ) {
      return 'Error Booking Reservation';
    }

    // Check for GENERIC technical/system errors (but NOT hang-ups)
    const hasExplicitSystemError = 
      summary.includes('technical issue') ||
      summary.includes('technical issues') ||
      summary.includes('system issue') ||
      summary.includes('persistent issue') ||
      summary.includes('encountered an issue') ||
      summary.includes('encountered a problem') ||
      summary.includes('issue preventing') ||
      summary.includes('failure to complete');

    if (hasExplicitSystemError) {
      // These are real system errors, determine type by service
      if (serviceType.includes('order')) {
        return 'Error Processing Order';
      }
      if (serviceType.includes('reservation') || serviceType.includes('booking')) {
        return 'Error Booking Reservation';
      }
      if (serviceType.includes('catering')) {
        return 'Error Processing Request';
      }
    }

    // If call was unsuccessful but no explicit error found, assume user hung up
    if (call.call_successful === false || (call.conversationData as any)?.call_successful === false) {
      return 'User Hung Up Abruptly';
    }

    // Check voicemail detection
    if (call.disconnect_reason?.toLowerCase().includes('machine_detection')) {
      return 'Voicemail Detected';
    }

    // Default for flagged calls without specific reason
    return 'Flagged for Review';
  };

  // Sorting function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  // Apply filtering and sorting
  const filteredAndSortedCalls = React.useMemo(() => {
    let filtered = [...processedCalls];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(call => {
        // Contact name from Contacts tab (PRIORITY)
        const contactName = getContactNameFromPhone(call.fromNumber || '');
        const contactMatch = contactName?.toLowerCase().includes(query);

        // Customer name from call data
        const customerMatch = call.customerName?.toLowerCase().includes(query);

        // Phone number
        const phoneMatch =
          call.fromNumber?.toLowerCase().includes(query) ||
          call.normalizedPhone?.toLowerCase().includes(query) ||
          formatPhoneNumber(call.fromNumber)?.toLowerCase().includes(query);

        // Date & Time - search in formatted date/time
        const callDate = new Date(call.startTime || call.timestamp || call.started_at || call.createdAt);
        const dateString = callDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).toLowerCase();
        const dateMatch = dateString.includes(query);

        // Type (interaction type)
        const callType = getCallType(call);
        const typeMatch = callType?.toLowerCase().includes(query);

        // Duration - search in formatted duration
        const durationString = formatDuration(call.duration)?.toLowerCase();
        const durationMatch = durationString?.includes(query);

        // Status
        const statusMatch = call.callStatus?.toLowerCase().includes(query) ||
          call.status?.toLowerCase().includes(query);

        // Tags
        const tagsMatch = call.tags?.some(tag => tag.toLowerCase().includes(query));

        // Notes
        const notesMatch = call.notes?.some(note => note.toLowerCase().includes(query));

        // Summary
        const summaryMatch = call.summary?.toLowerCase().includes(query) ||
          call.call_summary?.toLowerCase().includes(query) ||
          call.callSummary?.toLowerCase().includes(query);

        // Transcript
        const transcriptMatch = call.transcriptionText?.toLowerCase().includes(query) ||
          call.fullTranscript?.toLowerCase().includes(query) ||
          call.conversationSummary?.toLowerCase().includes(query);

        return contactMatch || customerMatch || phoneMatch || dateMatch || typeMatch ||
               durationMatch || statusMatch || tagsMatch || notesMatch || summaryMatch || transcriptMatch;
      });
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'New Callers') {
        // Filter for first-time callers (only called once)
        const phoneCallCounts = new Map<string, number>();
        processedCalls.forEach(call => {
          const phone = call.normalizedPhone || call.fromNumber;
          if (phone) {
            phoneCallCounts.set(phone, (phoneCallCounts.get(phone) || 0) + 1);
          }
        });
        filtered = filtered.filter(call => {
          const phone = call.normalizedPhone || call.fromNumber;
          return phone && (phoneCallCounts.get(phone) || 0) === 1;
        });
      } else if (typeFilter === 'Transferred Callers') {
        // Filter for calls that were transferred
        filtered = filtered.filter(call => {
          const outcome = (call.callOutcome || call.actionTaken || '').toLowerCase();
          const summary = (call.summary || call.call_summary || call.callSummary || '').toLowerCase();
          const status = (call.callStatus || call.status || '').toLowerCase();
          return outcome.includes('transfer') || summary.includes('transfer') || status.includes('transfer');
        });
      } else {
        // Standard call type filtering
        filtered = filtered.filter(call => getCallType(call) === typeFilter);
      }
    }

    // Apply caller filter (repeat/flagged)
    if (vipFilter === 'repeat') {
      // Group by normalized phone to find repeat callers
      const phoneCallCounts = new Map<string, number>();
      processedCalls.forEach(call => {
        const phone = call.normalizedPhone || call.fromNumber;
        if (phone) {
          phoneCallCounts.set(phone, (phoneCallCounts.get(phone) || 0) + 1);
        }
      });
      filtered = filtered.filter(call => {
        const phone = call.normalizedPhone || call.fromNumber;
        return phone && (phoneCallCounts.get(phone) || 0) > 1;
      });
    } else if (vipFilter === 'flagged') {
      filtered = filtered.filter(call => call.flagged === true);
    }

    // Apply date range filter
    if (dateRangeFilter !== 'Total') {
      const now = new Date();
      let startDate: Date;

      switch (dateRangeFilter) {
        case 'Today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'This Week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'This Month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'Last 3 Months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(call =>
        new Date(call.startTime || call.createdAt || call.timestamp) >= startDate
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'interactionType':
          // Use service_type from Retell AI for sorting
          aValue = (a.conversationData as any)?.service_type ||
                   (a.conversationData as any)?.post_call_analytics?.service_type ||
                   getCallType(a);
          bValue = (b.conversationData as any)?.service_type ||
                   (b.conversationData as any)?.post_call_analytics?.service_type ||
                   getCallType(b);
          break;
        case 'callStatus':
          aValue = a.callStatus || '';
          bValue = b.callStatus || '';
          break;
        case 'customerName':
          // Prioritize contact names from Contacts tab
          aValue = getContactNameFromPhone(a.fromNumber || '') || a.customerName || '';
          bValue = getContactNameFromPhone(b.fromNumber || '') || b.customerName || '';
          break;
        case 'callOutcome':
          // Prioritize call_outcome from Retell AI for sorting
          aValue = (a.conversationData as any)?.call_outcome ||
                   (a.conversationData as any)?.post_call_analytics?.call_outcome ||
                   a.callOutcome || '';
          bValue = (b.conversationData as any)?.call_outcome ||
                   (b.conversationData as any)?.post_call_analytics?.call_outcome ||
                   b.callOutcome || '';
          break;
        case 'startTime':
        default:
          aValue = new Date(a.startTime).getTime();
          bValue = new Date(b.startTime).getTime();
          break;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [searchQuery, typeFilter, vipFilter, dateRangeFilter, sortField, sortDirection, processedCalls]);

  // Apply pagination
  const totalPages = Math.ceil(filteredAndSortedCalls.length / itemsPerPage);
  const paginatedCalls = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedCalls.slice(startIndex, endIndex);
  }, [filteredAndSortedCalls, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, vipFilter, dateRangeFilter]);

  // Filter conversations based on search query
  const filteredConversations = React.useMemo(() => {
    let filtered = [...conversations];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((call: any) => {
        const callerName = call.callerName || call.caller_name || call.customer_name || '';
        const phoneNumber = call.callerPhone || call.caller_phone || call.from_number || call.phone_number || '';
        const transcript = call.fullTranscript || call.transcript || call.summary || '';

        return (
          callerName.toLowerCase().includes(query) ||
          phoneNumber.toLowerCase().includes(query) ||
          transcript.toLowerCase().includes(query)
        );
      });
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((call: any) => {
        const callType = call.callType || call.interactionType || '';
        const callTypeLower = callType.toLowerCase();
        return callTypeLower.includes(typeFilter);
      });
    }

    // Apply date range filter
    if (dateRangeFilter !== 'Total') {
      const now = new Date();
      let startDate: Date;

      switch (dateRangeFilter) {
        case 'Today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'This Week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'This Month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'Last 3 Months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((call: any) => {
        const callDate = new Date(call.timestamp || call.started_at || call.created_at || call.startTime);
        return callDate >= startDate;
      });
    }

    return filtered;
  }, [conversations, searchQuery, typeFilter, dateRangeFilter]);

  // Audio control functions (full implementation)
  const playRecording = async (callId: string) => {
    try {
      if (audioState.currentCallId === callId && audioState.isPlaying) {
        // Pause current recording
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setAudioState(prev => ({ ...prev, isPlaying: false }));
        return;
      }

      // Stop any currently playing audio
      stopRecording();

      setAudioState(prev => ({
        ...prev,
        isLoading: true,
        currentCallId: callId,
        error: null
      }));

      // Invalidate previous requests and create new request token
      const requestId = ++currentRequestIdRef.current;

      // Abort any existing fetch before starting new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this fetch
      abortControllerRef.current = new AbortController();

      // For demo purposes, we'll use a placeholder URL
      // In real implementation, this would fetch from your API endpoint
      const agentId = "demo-agent-id"; // This would come from context

      try {
        // Fetch recording URL from API with proper auth headers
        const response = await fetch(`/api/restaurant/${agentId}/calls/${callId}/recording`, {
          method: 'GET',
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
            // Add auth headers when authentication is available
            // 'Authorization': `Bearer ${authToken}`
          }
        });

        if (response.status === 404) {
          throw new Error('Recording not found for this call');
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch recording: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        // Check if this request is still current (not superseded by Stop or new Play)
        if (requestId !== currentRequestIdRef.current) {
          // Request is stale, don't create object URL
          return;
        }

        const audioUrl = URL.createObjectURL(blob);

        try {
          // Clean up previous audio URL to prevent memory leaks
          if (audioRef.current?.src && audioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
          }

          // Create and configure audio element
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
          } else {
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            // Add event listeners
            audio.onloadedmetadata = () => {
              setAudioState(prev => ({
                ...prev,
                duration: audio.duration,
                isLoading: false
              }));
            };

            audio.ontimeupdate = () => {
              setAudioState(prev => ({
                ...prev,
                currentTime: audio.currentTime
              }));
            };

            audio.onplay = () => {
              setAudioState(prev => ({ ...prev, isPlaying: true }));
            };

            audio.onpause = () => {
              setAudioState(prev => ({ ...prev, isPlaying: false }));
            };

            audio.onended = () => {
              setAudioState(prev => ({
                ...prev,
                isPlaying: false,
                currentTime: 0,
                currentCallId: null
              }));
            };

            audio.onerror = () => {
              // Clean up the blob URL on error
              if (audioUrl && audioUrl.startsWith('blob:')) {
                URL.revokeObjectURL(audioUrl);
              }

              setAudioState(prev => ({
                ...prev,
                error: 'Failed to load recording',
                isLoading: false,
                isPlaying: false
              }));
              toast({
                title: "Audio Error",
                description: "Failed to load call recording. Please try again.",
                variant: "destructive",
              });
            };

            await audio.play();
          }
        } catch (audioError) {
          // Clean up the URL if audio setup fails
          URL.revokeObjectURL(audioUrl);
          throw audioError;
        }
      } catch (fetchError) {
        // If API endpoint doesn't exist yet, show a demo message
        toast({
          title: "Demo Mode",
          description: "Call recording playback will be available when audio recordings are configured.",
        });
        setAudioState(prev => ({
          ...prev,
          isLoading: false
        }));
        return;
      }

    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError') {
        return;
      }

      console.error('Error playing recording:', error);
      setAudioState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
        isPlaying: false
      }));

      toast({
        title: "Playback Error",
        description: "Failed to play call recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    // Invalidate any in-flight requests by incrementing the token
    currentRequestIdRef.current++;

    // Abort any pending fetch to prevent stale audio playback
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (audioRef.current) {
      // Clean up blob URL to prevent memory leaks
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioState({
      isPlaying: false,
      isLoading: false,
      currentCallId: null,
      duration: 0,
      currentTime: 0,
      error: null
    });
  };

  // Download recording function
  const downloadRecording = async (call: EnhancedCallRecord) => {
    try {
      if (!call.recordingUrl) {
        toast({
          title: "No Recording",
          description: "No recording available for this call.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Downloading Recording",
        description: "Starting download of call recording...",
      });

      // For demo purposes, we'll create a download link
      // In real implementation, this would fetch the actual recording
      const agentId = "demo-agent-id";

      try {
        const response = await fetch(`/api/restaurant/${agentId}/calls/${call.id}/recording`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Recording not available');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${call.id}-${new Date(call.startTime).toISOString().split('T')[0]}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Download Complete",
          description: "Call recording downloaded successfully.",
        });
      } catch (fetchError) {
        // Demo fallback - create a placeholder file
        const demoContent = `Call Recording - ${call.customerName || 'Unknown Customer'}\nDate: ${new Date(call.startTime).toLocaleString()}\nDuration: ${formatDuration(call.duration)}\n\nThis is a placeholder for the actual call recording.\nIn production, this would be the actual audio file.`;

        const blob = new Blob([demoContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-recording-${call.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Demo Download",
          description: "Downloaded demo call information. Audio recordings will be available when configured.",
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download call recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up any active audio and abort requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioRef.current?.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Quick action functions
  const handleReturnCall = async (call: EnhancedCallRecord) => {
    if (!agentId) {
      toast({
        title: "Error",
        description: "Cannot place call: Agent ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Initiating Return Call",
        description: `Calling ${call.customerName || formatPhoneNumber(call.fromNumber)}...`,
      });

      const response = await fetch(`/api/restaurant/${agentId}/calls/outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: call.fromNumber || call.normalizedPhone,
          callId: call.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate call');
      }

      const data = await response.json();

      toast({
        title: "Call Initiated",
        description: `Outbound call to ${formatPhoneNumber(call.fromNumber)} has been started.`,
      });
    } catch (error: any) {
      console.error('Error initiating call:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate outbound call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendFollowUp = async (call: EnhancedCallRecord) => {
    if (!onSwitchToMessaging) {
      toast({
        title: "Error",
        description: "Messaging feature is not available",
        variant: "destructive",
      });
      return;
    }

    const phoneNumber = call.fromNumber || call.normalizedPhone;
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "No phone number available for this call",
        variant: "destructive",
      });
      return;
    }

    // Switch to messaging tab with this customer selected
    onSwitchToMessaging(phoneNumber);

    toast({
      title: "Opening Messaging",
      description: `Switched to messaging with ${call.customerName || formatPhoneNumber(phoneNumber)}`,
    });
  };

  const handleExportCall = async (call: EnhancedCallRecord) => {
    try {
      if (!agentId) {
        toast({
          title: "Error",
          description: "Cannot export: Agent ID not found",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Exporting Call Data",
        description: "Preparing call data for export...",
      });

      // Export comprehensive call data including recording
      const exportData = {
        callId: call.id,
        twilioCallSid: call.twilioCallSid,
        customer: call.customerName || 'Unknown',
        phone: call.fromNumber,
        normalizedPhone: call.normalizedPhone,
        date: new Date(call.startTime).toISOString(),
        duration: call.duration,
        type: call.interactionType,
        callType: getCallType(call),
        status: call.callStatus,
        sentiment: call.sentiment,
        sentimentScore: call.sentimentScore,
        callOutcome: call.callOutcome,
        transcript: call.transcriptionText,
        summary: call.summary || call.call_summary || call.callSummary,
        tags: call.tags,
        notes: call.notes,
        vip: call.vip,
        flagged: call.flagged,
        recordingUrl: call.recordingUrl,
        recordingSid: call.recordingSid,
        actions: call.actions,
        conversationData: call.conversationData,
        call_analysis: call.call_analysis,
        disconnect_reason: call.disconnect_reason
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-${call.id}-${new Date(call.startTime).toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Call data exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting call:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export call data. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <div className="text-gray-400">Loading call history...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col gap-6">
        {/* Search and Filters */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <div className="flex-1 max-w-[calc(100%-4.5rem)] md:flex-auto md:max-w-none md:min-w-[300px] relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border-gray-800 text-gray-300"
              />
            </div>

            {/* Combined Filter Dropdown (Mobile Only) */}
            <div className="md:hidden">
              <DropdownMenu open={isCombinedDropdownOpen} onOpenChange={setIsCombinedDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 justify-between"
                  >
                    <Filter className="h-4 w-4" />
                    <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 premium-card text-white">
                  {/* Callers Section */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Callers</div>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setVipFilter('all'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>All Callers</span>
                    {vipFilter === 'all' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setVipFilter('repeat'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Repeat Callers</span>
                    {vipFilter === 'repeat' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setVipFilter('flagged'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Flagged Callers</span>
                    {vipFilter === 'flagged' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>

                  <div className="h-px bg-gray-700 my-2"></div>

                  {/* Call Type Section */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Call Type</div>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setTypeFilter('all'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>All Types</span>
                    {typeFilter === 'all' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  {industryCallTypes.map((callType) => (
                    <DropdownMenuItem
                      key={callType.id}
                      className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                      onClick={() => { setTypeFilter(callType.id); setIsCombinedDropdownOpen(false); }}
                    >
                      <span>{callType.label}</span>
                      {typeFilter === callType.id && <Check className="h-4 w-4 text-blue-400" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setTypeFilter('New Callers'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>New Callers</span>
                    {typeFilter === 'New Callers' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setTypeFilter('Transferred Callers'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Transferred Callers</span>
                    {typeFilter === 'Transferred Callers' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>

                  <div className="h-px bg-gray-700 my-2"></div>

                  {/* Date Range Section */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Date Range</div>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setDateRangeFilter('Today'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Today</span>
                    {dateRangeFilter === 'Today' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setDateRangeFilter('This Week'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>This Week</span>
                    {dateRangeFilter === 'This Week' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setDateRangeFilter('This Month'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>This Month</span>
                    {dateRangeFilter === 'This Month' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setDateRangeFilter('Last 3 Months'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Last 3 Months</span>
                    {dateRangeFilter === 'Last 3 Months' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setDateRangeFilter('Total'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Total</span>
                    {dateRangeFilter === 'Total' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Separate Dropdowns (Desktop Only) */}
            <div className="hidden md:block">
              <Select value={vipFilter} onValueChange={setVipFilter}>
                <SelectTrigger className="w-[180px] bg-transparent border-gray-800 text-gray-300">
                  <SelectValue placeholder="Filter Callers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Callers</SelectItem>
                  <SelectItem value="repeat">Repeat Callers</SelectItem>
                  <SelectItem value="flagged">Flagged Callers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:block">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px] bg-transparent border-gray-800 text-gray-300">
                  <SelectValue placeholder="Filter by Call Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {industryCallTypes.map((callType) => (
                    <SelectItem key={callType.id} value={callType.id}>
                      {callType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:block">
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="w-[180px] bg-transparent border-gray-800 text-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="This Week">This Week</SelectItem>
                  <SelectItem value="This Month">This Month</SelectItem>
                  <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                  <SelectItem value="Total">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAndSortedCalls.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Phone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-white mb-2">No Calls Yet</h3>
                <p className="text-gray-400">
                  {searchQuery || typeFilter !== 'all' || vipFilter !== 'all' || dateRangeFilter !== 'Total'
                    ? 'No calls match your filters.'
                    : 'Call history will appear here once calls are received.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Table View */}
              <div className="overflow-x-auto overflow-y-auto flex-1 w-full">
                <table className="w-full min-w-[900px]">
                  <thead className="sticky top-0 z-10 bg-[#0D0D0D]">
                    <tr className="border-b border-gray-800 h-[52px]">
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                        Date & Time
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                        Name
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Phone Number</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                        Type
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                        Duration
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                        Outcome
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                        Revenue
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {paginatedCalls.map((call) => (
                      <tr
                        key={call.id}
                        className="transition-colors hover:bg-gray-800/30 cursor-pointer"
                        onClick={() => setSelectedCall(call)}
                      >
                        <td className="px-3 sm:px-4 py-3">
                          <span className="text-white text-sm sm:text-base">
                            {formatCallDate(call.startTime || call.timestamp || call.started_at || call.created_at)}
                          </span>
                        </td>

                        <td className="px-3 sm:px-4 py-3">
                          {(() => {
                            // PRIORITY 1: Check if there's a contact name from Contacts tab
                            const contactName = getContactNameFromPhone(call.fromNumber || '');
                            if (contactName) {
                              return <span className="text-white text-sm sm:text-base font-medium">{contactName}</span>;
                            }

                            // PRIORITY 2: Get customer name from call data (real names only)
                            const c = call as any;
                            const name = call.customerName ||
                                       c.callerName ||
                                       c.caller_name ||
                                       c.customer_name;

                            if (name && name !== 'Unknown' && !name.match(/^\+?\d{7,}$/)) {
                              return <span className="text-white text-sm sm:text-base font-medium">{name}</span>;
                            }

                            // PRIORITY 3: Show formatted phone number as fallback
                            const phone = call.fromNumber || c.callerPhone || c.caller_phone || c.from_number;
                            if (phone) {
                              return <span className="text-gray-500 text-sm font-mono">{formatPhoneNumber(phone)}</span>;
                            }

                            return <span className="text-gray-600 text-sm">—</span>;
                          })()}
                        </td>

                        <td className="px-3 sm:px-4 py-3">
                          {(call.fromNumber || call.callerPhone || call.caller_phone || call.from_number || call.phone_number) ? (
                            <span className="text-gray-400 font-mono text-sm">
                              {formatPhoneNumber(call.fromNumber || call.callerPhone || call.caller_phone || call.from_number || call.phone_number)}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>

                        <td className="px-3 sm:px-4 py-3">
                          {(() => {
                            const serviceType = call.interactionType ||
                                              (call.conversationData as any)?.service_type ||
                                              (call.conversationData as any)?.post_call_analytics?.service_type ||
                                              '';
                            if (!serviceType) return <span className="text-gray-600 text-sm">—</span>;
                            return (
                              <Badge className={getInteractionTypeColor(getCallType(call))}>
                                {serviceType}
                              </Badge>
                            );
                          })()}
                        </td>

                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-300 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(call.duration)}</span>
                          </div>
                        </td>

                        <td className="px-3 sm:px-4 py-3">
                          {(() => {
                            // Get call_outcome directly from Retell AI post-call analysis (no fallback)
                            const callOutcome = call.callOutcome ||
                                              (call.conversationData as any)?.call_outcome ||
                                              (call.conversationData as any)?.post_call_analytics?.call_outcome ||
                                              '';

                            return (
                              <Badge className={getCallOutcomeColor(callOutcome)}>
                                {callOutcome}
                              </Badge>
                            );
                          })()}
                        </td>

                        <td className="px-3 sm:px-4 py-3">
                          {(() => {
                            const revenue = calculateCallRevenue(call);
                            if (revenue > 0) {
                              return (
                                <span className="text-green-400 font-semibold">
                                  ${revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                              );
                            }
                            return <span className="text-gray-400">$0</span>;
                          })()}
                        </td>

                        <td className="px-3 sm:px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 items-center justify-end">
                            {/* Orange flag: manually flagged OR AI-detected failed call (unless explicitly unflagged) */}
                            {(call.flagged === true || (
                              (call.call_successful === false || (call.conversationData as any)?.call_successful === false)
                              && call.flagged !== false
                            )) && (
                              <Flag className="h-4 w-4 text-orange-400 fill-orange-400" title="Flagged for review" />
                            )}

                            {/* Three Dots Actions Button */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                                  data-testid={`button-actions-${call.id}`}
                                >
                                  <i className="fas fa-ellipsis-v"></i>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 premium-card text-white">
                                <DropdownMenuItem
                                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                  onClick={() => handleToggleFlag(call)}
                                >
                                  <Flag className={`w-4 h-4 mr-2 ${call.flagged ? 'text-red-400 fill-current' : 'text-gray-400'}`} />
                                  <span>{call.flagged ? 'Unflag' : 'Flag'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem
                                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                  onClick={() => handleReturnCall(call)}
                                >
                                  <i className="fas fa-phone w-4 text-green-400 mr-2"></i>
                                  <span>Call</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                  onClick={() => handleSendFollowUp(call)}
                                >
                                  <i className="fas fa-comment w-4 text-blue-400 mr-2"></i>
                                  <span>Text</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem
                                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                  onClick={() => handleExportCall(call)}
                                >
                                  <i className="fas fa-download w-4 text-purple-400 mr-2"></i>
                                  <span>Download</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="sticky bottom-0 z-10 bg-[#0D0D0D] flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[52px] border-t border-gray-800 flex-shrink-0">
                {/* Left: Call count */}
                <div className="text-sm text-gray-400">
                  {filteredAndSortedCalls.length > 0 ? (
                    <>
                      {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedCalls.length)} of {filteredAndSortedCalls.length} calls
                    </>
                  ) : (
                    '0 calls'
                  )}
                </div>

                {/* Right: Page navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      data-testid="button-prev-page"
                    >
                      &lt; Prev
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={currentPage === pageNum 
                              ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" 
                              : "border-gray-700 text-gray-300 hover:bg-gray-800"
                            }
                            data-testid={`button-page-${pageNum}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      data-testid="button-next-page"
                    >
                      Next &gt;
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      {/* Call Details Side Panel */}
      {selectedCall && (
        <Sheet open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
          <SheetContent className="w-full sm:w-1/2 sm:max-w-[50%] premium-card p-0 flex flex-col overflow-y-auto [&>button]:hidden">
            <div className="p-6 pb-24">
              {/* Header: Name/Phone + Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {(() => {
                        // PRIORITY 1: Check if there's a contact name from Contacts tab
                        const contactName = getContactNameFromPhone(selectedCall.fromNumber || '');
                        if (contactName) {
                          return contactName;
                        }

                        // PRIORITY 2: Get customer name from call data
                        const name = selectedCall.customerName ||
                                   (selectedCall.conversationData as any)?.customer_name ||
                                   selectedCall.callerName ||
                                   selectedCall.caller_name ||
                                   selectedCall.customer_name;

                        if (!name || name === 'Unknown' || name.match(/^\+?\d{10,}$/)) {
                          return formatPhoneNumber(selectedCall.fromNumber || selectedCall.callerPhone || selectedCall.caller_phone || selectedCall.from_number || selectedCall.phone_number);
                        }
                        return name;
                      })()}
                    </h2>
                    {(() => {
                      // PRIORITY 1: Check if there's a contact name from Contacts tab
                      const contactName = getContactNameFromPhone(selectedCall.fromNumber || '');
                      if (contactName) {
                        return (
                          <p className="text-gray-400 text-sm font-mono">
                            {formatPhoneNumber(selectedCall.fromNumber || selectedCall.callerPhone || selectedCall.caller_phone || selectedCall.from_number || selectedCall.phone_number)}
                          </p>
                        );
                      }

                      // PRIORITY 2: Get customer name from call data
                      const name = selectedCall.customerName ||
                                 (selectedCall.conversationData as any)?.customer_name ||
                                 selectedCall.callerName ||
                                 selectedCall.caller_name ||
                                 selectedCall.customer_name;

                      if (name && name !== 'Unknown' && !name.match(/^\+?\d{10,}$/)) {
                        return (
                          <p className="text-gray-400 text-sm font-mono">
                            {formatPhoneNumber(selectedCall.fromNumber || selectedCall.callerPhone || selectedCall.caller_phone || selectedCall.from_number || selectedCall.phone_number)}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  <Badge className={getCallOutcomeColor(
                    selectedCall.callOutcome ||
                    (selectedCall.conversationData as any)?.call_outcome ||
                    (selectedCall.conversationData as any)?.post_call_analytics?.call_outcome ||
                    ''
                  )}>
                    {selectedCall.callOutcome ||
                     (selectedCall.conversationData as any)?.call_outcome ||
                     (selectedCall.conversationData as any)?.post_call_analytics?.call_outcome ||
                     ''}
                  </Badge>
                  {selectedCall.vip && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
                  {(selectedCall.flagged === true || (
                    (selectedCall.call_successful === false || (selectedCall.conversationData as any)?.call_successful === false)
                    && selectedCall.flagged !== false
                  )) && <Flag className="h-4 w-4 text-orange-400 fill-orange-400" />}
                  {/* Close button */}
                  <button 
                    onClick={() => setSelectedCall(null)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white ml-2"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Info: Duration + Started */}
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 border-b border-gray-800 pb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(selectedCall.duration)}</span>
                </div>
                <span className="text-gray-600">•</span>
                <span>{formatCallDate(selectedCall.startTime || selectedCall.timestamp || selectedCall.started_at || selectedCall.created_at)}</span>
                <span className="text-gray-600">•</span>
                <Badge className={getInteractionTypeColor(getCallType(selectedCall))}>
                  {(selectedCall.conversationData as any)?.service_type ||
                   (selectedCall.conversationData as any)?.post_call_analytics?.service_type ||
                   selectedCall.interactionType || ''}
                </Badge>
              </div>

              <div className="space-y-6">
                {/* Result Card */}
                {(() => {
                  const serviceType = (selectedCall.conversationData as any)?.service_type ||
                                    (selectedCall.conversationData as any)?.post_call_analytics?.service_type ||
                                    selectedCall.interactionType;
                  const callOutcome = selectedCall.callOutcome || 
                                    (selectedCall.conversationData as any)?.call_outcome ||
                                    (selectedCall.conversationData as any)?.post_call_analytics?.call_outcome;
                  
                  if (serviceType || callOutcome) {
                    return (
                      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/50 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <i className="fas fa-check-circle text-green-400"></i>
                          Result
                        </h4>
                        {(() => {
                          const rev = calculateCallRevenue(selectedCall);
                          return (
                            <div className={`grid gap-4 text-sm ${rev > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                              <div>
                                <span className="text-gray-400 block">Service</span>
                                <span className="text-white font-medium">{serviceType || ''}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Time</span>
                                <span className="text-white font-medium">
                                  {new Date(selectedCall.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Outcome</span>
                                <span className="text-white font-medium">{callOutcome || ''}</span>
                              </div>
                              {rev > 0 && (
                                <div>
                                  <span className="text-gray-400 block">Revenue</span>
                                  <span className="text-green-400 font-semibold">
                                    ${rev.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* AI Summary */}
                {(selectedCall.summary || selectedCall.call_summary || selectedCall.callSummary || (selectedCall.conversationData as any)?.call_summary) && (
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      AI Summary
                    </h4>
                    <p className="text-sm text-blue-200">{selectedCall.summary || selectedCall.call_summary || selectedCall.callSummary || (selectedCall.conversationData as any)?.call_summary}</p>
                  </div>
                )}

                {/* Transcript with Chat Bubbles */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                    Transcript
                  </h4>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {(selectedCall.fullTranscript || selectedCall.transcript || selectedCall.transcriptionText || selectedCall.conversationSummary) ? (
                      (selectedCall.fullTranscript || selectedCall.transcript || selectedCall.transcriptionText || selectedCall.conversationSummary)
                        .split('\n')
                        .filter((line: string) => line.trim())
                        .map((line: string, index: number) => {
                          const lowerLine = line.toLowerCase();
                          const isAgent = lowerLine.startsWith('agent:') || lowerLine.startsWith('assistant:') || lowerLine.startsWith('ai:');
                          const isUser = lowerLine.startsWith('user:') || lowerLine.startsWith('customer:') || lowerLine.startsWith('caller:');
                          
                          // Extract the message content (remove the prefix)
                          const content = line.replace(/^(agent|assistant|ai|user|customer|caller):\s*/i, '');

                          if (isAgent) {
                            return (
                              <div key={index} className="flex justify-start">
                                <div className="bg-blue-600/30 border border-blue-500/30 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%]">
                                  <p className="text-xs text-blue-300 mb-1">AI Agent</p>
                                  <p className="text-white text-sm">{content}</p>
                                </div>
                              </div>
                            );
                          } else if (isUser) {
                            return (
                              <div key={index} className="flex justify-end">
                                <div className="bg-gray-700/50 border border-gray-800/30 rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
                                  <p className="text-xs text-gray-400 mb-1">Customer</p>
                                  <p className="text-white text-sm">{content}</p>
                                </div>
                              </div>
                            );
                          } else if (line.trim()) {
                            return (
                              <div key={index} className="text-center">
                                <p className="text-gray-500 text-xs italic">{line}</p>
                              </div>
                            );
                          }
                          return null;
                        })
                    ) : (
                      <p className="text-sm text-gray-500 italic text-center py-4">No transcript available</p>
                    )}
                  </div>
                </div>

                {/* Connected Systems */}
                {selectedCall.connectedRefs && Object.keys(selectedCall.connectedRefs).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-white mb-3">Connected Systems</h4>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <pre className="text-sm text-gray-300">
                        {JSON.stringify(selectedCall.connectedRefs, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
