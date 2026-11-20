import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ContactDetailsModal } from "@/components/contacts/ContactDetailsModal";
import {
  Phone,
  Clock,
  User,
  Star,
  Flag,
  Search,
  Filter,
  Download,
  Mail,
  PhoneCall,
  MoreHorizontal,
  UserPlus,
  Users,
  TrendingUp,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Edit,
  Plus,
  X,
  ChevronLeft,
  Check
} from "lucide-react";

// Enhanced call record interface (compatible with CallHistoryTable)
interface EnhancedCallRecord {
  id: string;
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
  normalizedPhone?: string;
  direction: 'inbound' | 'outbound';
  status: string;
  callStatus?: string;
  duration?: number;
  startTime: string;
  endTime?: string;
  recordingUrl?: string;
  recordingSid?: string;
  transcriptionText?: string;
  transcriptionSid?: string;
  aiResponse?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  actionTaken?: string;
  confidence?: number;
  conversationData?: Array<{ role: 'user' | 'assistant', content: string }>;
  price?: string;
  priceUnit?: string;
  // Enhanced fields
  customerName?: string;
  interactionType?: string;
  vip?: boolean;
  tags?: string[];
  notes?: string[];
  summary?: string;
  actions?: any[];
  flagged?: boolean;
  connectedRefs?: any;
  recordingProviderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Customer contact aggregated data interface - focused on persistent contact info
interface CustomerContact {
  id: string; // Based on phone number or customer name
  customerName: string;
  phoneNumber: string;
  phoneNumberSecondary?: string;
  normalizedPhone: string;
  email?: string;
  businessOrganization?: string;
  address?: string;
  notes: string;
  tags: string[];
  lastInteractionDate: string;
  interactionCount: number;
  vip: boolean;
  flagged: boolean;
  firstCallDate: string;
  callHistory: EnhancedCallRecord[]; // Link to all calls from this contact
  // Computed fields
  totalCalls: number;
  lastCallDate: string;
  averageDuration: number;
  totalDuration: number;
  sentimentScore: number;
  callTypeBreakdown: Record<string, number>;
  successfulCalls: number;
  revenue: number;
}

interface CustomerContactsTableProps {
  calls: EnhancedCallRecord[];
  isLoading?: boolean;
  onRefresh?: () => void;
  selectedAgentId?: string;
  industry?: string;
  businessData?: any;
  kbContent?: string;
}

type SortField = 'customerName' | 'interactionCount' | 'lastInteractionDate' | 'businessOrganization' | 'email';
type SortDirection = 'asc' | 'desc';

export default function CustomerContactsTable({ calls, isLoading = false, onRefresh, selectedAgentId, industry = 'restaurant', businessData, kbContent = '' }: CustomerContactsTableProps) {
  const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const [vipFilter, setVipFilter] = useState<string>("all");
  const [callTypeFilter, setCallTypeFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("Total");
  const [sortField, setSortField] = useState<SortField>('lastInteractionDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isCombinedDropdownOpen, setIsCombinedDropdownOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved contacts from database
  const { data: savedContactsData } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const response = await fetch('/api/contacts', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
    staleTime: 120000, // 2 minutes — search is now handled by the server
  });

  const savedContacts = savedContactsData?.contacts || [];

  // Fetch SMS messages for text count
  const { data: smsMessagesData } = useQuery({
    queryKey: ['/api/messaging/sms'],
    queryFn: async () => {
      const response = await fetch('/api/messaging/sms', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });

  const smsMessages = Array.isArray(smsMessagesData) ? smsMessagesData : [];

  // Determine which columns to show based on industry
  const showAppointments = ['salon', 'medical', 'auto', 'barbershop', 'fitness', 'veterinary', 'medical-spa', 'pet-daycare', 'home-service', 'dentist'].includes(industry);
  const showOrders = ['restaurant', 'hotel'].includes(industry);
  const showReservations = ['restaurant', 'hotel'].includes(industry);

  // Handle row click to open modal
  const handleContactClick = (contact: CustomerContact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContact(null);
  };

  // Utility functions
  const formatPhoneNumber = (phone: string | undefined | null) => {
    if (!phone || phone === 'undefined' || phone === 'null') return '—'; // Handle undefined/null/empty
    if (typeof phone !== 'string') return '—'; // Extra safety check
    if (phone.startsWith('+1')) {
      const cleaned = phone.slice(2);
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatContactDate = (dateString: string) => {
    const contactDate = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const contactDateMidnight = new Date(contactDate.getFullYear(), contactDate.getMonth(), contactDate.getDate());

    const timeStr = contactDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (contactDateMidnight.getTime() === today.getTime()) {
      return `Today, ${timeStr}`;
    }

    if (contactDateMidnight.getTime() === yesterday.getTime()) {
      return `Yesterday, ${timeStr}`;
    }

    const dateStr = contactDate.getFullYear() === now.getFullYear()
      ? contactDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : contactDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    return `${dateStr}, ${timeStr}`;
  };

  const generateInitials = (name: string) => {
    if (!name || name === 'Unknown') return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Returns true only if `name` is a real human name (not a phone number, placeholder, or greeting).
  const isValidCustomerName = (name: string | null | undefined): boolean => {
    if (!name) return false;
    const n = name.trim();
    if (!n) return false;
    const junk = ['unknown', 'default_customer', 'guest', 'n/a', 'na'];
    if (junk.includes(n.toLowerCase())) return false;
    // Reject strings that look like phone numbers (digits, spaces, +, -, (, ), .)
    if (/^\+?[\d\s().,-]{7,}$/.test(n)) return false;
    // Reject AI greeting messages / boilerplate
    if (/welcome to|^hello[,!\s]/i.test(n)) return false;
    // Reject very long strings — likely AI responses or business descriptions
    if (n.length > 60) return false;
    return true;
  };

  // Contact aggregation logic
  const aggregatedContacts = useMemo(() => {
    const contactMap = new Map<string, CustomerContact>();

    calls.forEach((call, index) => {
      // Try multiple field names for phone number (API may use different naming)
      const phoneNumber = call.fromNumber ||
                         call.from_number ||
                         call.callerPhone ||
                         call.caller_phone ||
                         call.phone_number ||
                         call.normalizedPhone;

      // Skip if no valid phone number
      if (!phoneNumber || phoneNumber === 'undefined' || phoneNumber === 'null') {
        console.warn(`⚠️ Skipping call ${index} with no valid phone number:`, {
          fromNumber: call.fromNumber,
          from_number: call.from_number,
          callerPhone: call.callerPhone,
          caller_phone: call.caller_phone,
          phone_number: call.phone_number,
          normalizedPhone: call.normalizedPhone,
          fullCall: call
        });
        return;
      }

      const key = phoneNumber;
      console.log('📞 Processing call with phone:', key, 'from call:', call);

      // Try multiple field names for customer name; validate to exclude phone numbers, greetings, etc.
      const rawCustomerName = call.customerName ||
                             call.customer_name ||
                             call.callerName ||
                             call.caller_name;
      const customerName = isValidCustomerName(rawCustomerName) ? (rawCustomerName as string).trim() : '';

      // Try multiple field names for timestamp
      const callTimestamp = call.startTime || call.start_time || call.timestamp || call.createdAt || call.created_at || new Date().toISOString();

      if (!contactMap.has(key)) {
        console.log('✅ Creating new contact for phone:', key);
        // Create new contact
        contactMap.set(key, {
          id: key,
          customerName,
          phoneNumber: phoneNumber,
          phoneNumberSecondary: undefined,
          normalizedPhone: call.normalizedPhone || call.normalized_phone || phoneNumber,
          email: undefined,
          businessOrganization: undefined,
          address: undefined,
          notes: '',
          tags: call.tags || [],
          lastInteractionDate: callTimestamp,
          interactionCount: 0,
          vip: call.vip || false,
          flagged: call.flagged || false,
          firstCallDate: callTimestamp,
          callHistory: [],
          // Initialize computed fields
          totalCalls: 0,
          lastCallDate: callTimestamp,
          averageDuration: 0,
          totalDuration: 0,
          sentimentScore: 0.5,
          callTypeBreakdown: {},
          successfulCalls: 0,
          revenue: 0
        });
      }

      const contact = contactMap.get(key)!;

      // Update contact data
      contact.interactionCount++;
      contact.callHistory.push(call);

      // Update name if we have a valid one and the contact doesn't have one yet
      if (isValidCustomerName(rawCustomerName) && !contact.customerName) {
        contact.customerName = (rawCustomerName as string).trim();
      }

      // Update dates
      if (new Date(callTimestamp) > new Date(contact.lastInteractionDate)) {
        contact.lastInteractionDate = callTimestamp;
        contact.lastCallDate = callTimestamp;
      }
      if (new Date(callTimestamp) < new Date(contact.firstCallDate)) {
        contact.firstCallDate = callTimestamp;
      }

      // Update VIP status (if any call is VIP, contact is VIP)
      if (call.vip) {
        contact.vip = true;
      }

      // Update flagged status (if any call is flagged, contact is flagged)
      if (call.flagged) {
        contact.flagged = true;
      }

      // Aggregate tags (unique)
      if (call.tags) {
        call.tags.forEach(tag => {
          if (!contact.tags.includes(tag)) {
            contact.tags.push(tag);
          }
        });
      }
    });

    // Build KB items once (shared across all contacts)
    function expandAbbr(text: string): string {
      return text
        .replace(/\bpedi\b/gi, 'pedicure')
        .replace(/\bmani\b/gi, 'manicure')
        .replace(/\blash\b/gi, 'eyelash')
        .replace(/\bbrow\b/gi, 'eyebrow');
    }
    const kbItems: Array<{ phrase: string; price: number }> = [];
    if (kbContent) {
      const lineRe = /([A-Za-z][A-Za-z0-9 &'\/-]*?)\s*\$(\d+(?:\.\d{1,2})?)/g;
      for (const rawLine of kbContent.split(/[\n\r]+/)) {
        const line = rawLine.trim();
        if (!line.includes('$')) continue;
        lineRe.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = lineRe.exec(line)) !== null) {
          const name = m[1].trim();
          const price = parseFloat(m[2]);
          if (!name || isNaN(price) || price <= 0) continue;
          if (name === name.toUpperCase() && name.replace(/\s/g, '').length > 3) continue;
          const phrase = expandAbbr(name.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim());
          if (phrase) kbItems.push({ phrase, price });
        }
      }
    }

    // Sort call history and compute statistics for each contact
    contactMap.forEach(contact => {
      contact.callHistory.sort((a, b) => {
        const aTime = a.startTime || a.start_time || a.timestamp || a.createdAt || a.created_at || new Date().toISOString();
        const bTime = b.startTime || b.start_time || b.timestamp || b.createdAt || b.created_at || new Date().toISOString();
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      // Compute statistics from call history
      contact.totalCalls = contact.callHistory.length;
      contact.totalDuration = contact.callHistory.reduce((sum, call) => sum + (call.duration || 0), 0);
      contact.averageDuration = contact.totalCalls > 0 ? contact.totalDuration / contact.totalCalls : 0;

      // Compute sentiment score (average)
      const sentimentScores = contact.callHistory
        .filter(call => call.sentimentScore !== undefined)
        .map(call => call.sentimentScore!);
      contact.sentimentScore = sentimentScores.length > 0
        ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
        : 0.5;

      // Count successful calls
      contact.successfulCalls = contact.callHistory.filter(call =>
        call.status === 'completed' || call.callStatus === 'completed'
      ).length;

      // Build call type breakdown from interaction types and tags
      contact.callTypeBreakdown = {};
      contact.callHistory.forEach(call => {
        const type = call.interactionType || 'other';
        contact.callTypeBreakdown[type] = (contact.callTypeBreakdown[type] || 0) + 1;
      });

      // Calculate revenue for this contact using KB phrase matching (same as Calls tab)
      let totalRevenue = 0;
      for (const call of contact.callHistory) {
        // 1. Direct order_amount stamped by send_sms_confirmation
        if ((call as any).order_amount != null) {
          const direct = parseFloat((call as any).order_amount);
          if (!isNaN(direct) && direct > 0) { totalRevenue += direct; continue; }
        }

        // 2. KB phrase matching against transcript, summary, service type, and interaction type
        if (kbItems.length === 0) continue;
        const rawCorpus = [
          call.transcriptionText || '',
          call.summary || '',
          (call as any).call_summary || '',
          (call as any).service_type || '',
          call.interactionType || '',
        ].join(' ');
        const corpus = expandAbbr(rawCorpus.replace(/[-_]/g, ' ').replace(/\s+/g, ' ')).toLowerCase();
        for (const item of kbItems) {
          if (corpus.includes(item.phrase)) { totalRevenue += item.price; break; }
        }
      }
      contact.revenue = totalRevenue;
    });

    const contacts = Array.from(contactMap.values());

    // Overlay saved contact data (names, notes/preferences) from database
    contacts.forEach(contact => {
      const savedContact = savedContacts.find((sc: any) =>
        sc.phoneNumber === contact.phoneNumber || sc.normalizedPhone === contact.normalizedPhone
      );

      if (savedContact) {
        // Use saved name if available
        if (savedContact.customerName) {
          contact.customerName = savedContact.customerName;
        }
        // Use saved notes/preferences if available
        if (savedContact.notes) {
          contact.notes = savedContact.notes;
        }
        // Use saved contact ID
        if (savedContact.id) {
          contact.id = savedContact.id;
        }
        // Merge other saved fields
        if (savedContact.email) contact.email = savedContact.email;
        if (savedContact.businessOrganization) contact.businessOrganization = savedContact.businessOrganization;
        if (savedContact.address) contact.address = savedContact.address;
        if (savedContact.tags && savedContact.tags.length > 0) {
          // Merge tags from saved contact
          savedContact.tags.forEach((tag: string) => {
            if (!contact.tags.includes(tag)) {
              contact.tags.push(tag);
            }
          });
        }
      }
    });

    console.log('🔍 CustomerContactsTable - aggregated contacts:', contacts.length, contacts);
    return contacts;
  }, [calls, savedContacts, smsMessages, kbContent]);

  // Contact summary metrics
  const contactMetrics = useMemo(() => {
    const totalContacts = aggregatedContacts.length;
    const repeatCallers = aggregatedContacts.filter(contact => contact.interactionCount > 1).length;
    const vipContacts = aggregatedContacts.filter(contact => contact.vip).length;
    const flaggedContacts = aggregatedContacts.filter(contact => contact.flagged).length;

    return {
      totalContacts,
      repeatCallers,
      vipContacts,
      flaggedContacts
    };
  }, [aggregatedContacts]);

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
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = [...aggregatedContacts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.customerName.toLowerCase().includes(query) ||
        contact.phoneNumber.includes(query) ||
        contact.normalizedPhone.includes(query)
      );
    }

    // Apply customer filter
    if (vipFilter === 'repeat') {
      filtered = filtered.filter(contact => contact.interactionCount > 1);
    } else if (vipFilter === 'flagged') {
      filtered = filtered.filter(contact => contact.flagged === true);
    } else if (vipFilter === 'vip') {
      filtered = filtered.filter(contact => contact.vip === true);
    }

    // Apply call type filter - now filter by tags since we removed callTypeBreakdown
    if (callTypeFilter !== 'all') {
      filtered = filtered.filter(contact => {
        return contact.tags.some(tag => tag.toLowerCase().includes(callTypeFilter));
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

      filtered = filtered.filter(contact => new Date(contact.lastInteractionDate) >= startDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'interactionCount':
          aValue = a.interactionCount;
          bValue = b.interactionCount;
          break;
        case 'businessOrganization':
          aValue = (a.businessOrganization || '').toLowerCase();
          bValue = (b.businessOrganization || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'customerName':
          aValue = a.customerName.toLowerCase();
          bValue = b.customerName.toLowerCase();
          break;
        case 'lastInteractionDate':
        default:
          aValue = new Date(a.lastInteractionDate).getTime();
          bValue = new Date(b.lastInteractionDate).getTime();
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

    console.log('🔍 CustomerContactsTable - filtered contacts:', filtered.length, {
      searchQuery,
      vipFilter,
      callTypeFilter,
      dateRangeFilter,
      sortField,
      sortDirection
    });

    return filtered;
  }, [aggregatedContacts, searchQuery, vipFilter, callTypeFilter, dateRangeFilter, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedContacts.length / itemsPerPage);
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedContacts.slice(startIndex, endIndex);
  }, [filteredAndSortedContacts, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, vipFilter, callTypeFilter, dateRangeFilter, sortField, sortDirection]);

  // Action handlers
  const handleViewCallHistory = (contact: CustomerContact) => {
    toast({
      title: "Opening Call History",
      description: `Viewing all ${contact.interactionCount} calls from ${contact.customerName}`,
    });
    // In real implementation, this would navigate to the History tab with a filter for this customer
  };

  const handleStartFollowUp = (contact: CustomerContact) => {
    toast({
      title: "Starting Follow-up",
      description: `Initiating follow-up sequence for ${contact.customerName}`,
    });
    // In real implementation, this would open a follow-up dialog or start an automated sequence
  };

  const handleExportContact = (contact: CustomerContact) => {
    const exportData = {
      customerName: contact.customerName,
      phoneNumber: contact.phoneNumber,
      totalCalls: contact.totalCalls,
      lastCallDate: contact.lastCallDate,
      firstCallDate: contact.firstCallDate,
      callTypeBreakdown: contact.callTypeBreakdown,
      vip: contact.vip,
      averageDuration: contact.averageDuration,
      totalDuration: contact.totalDuration,
      sentimentScore: contact.sentimentScore,
      tags: contact.tags,
      notes: contact.notes,
      callHistory: contact.callHistory.map(call => ({
        date: call.startTime || call.start_time || call.timestamp || call.createdAt || call.created_at,
        duration: call.duration,
        type: call.interactionType,
        status: call.callStatus || call.call_status || call.status,
        summary: call.summary
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact-${contact.customerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Contact information exported successfully.",
    });
  };

  const handleToggleVIP = (contact: CustomerContact) => {
    toast({
      title: contact.vip ? "VIP Status Removed" : "VIP Status Added",
      description: `${contact.customerName} ${contact.vip ? 'removed from' : 'added to'} VIP list.`,
    });
    // In real implementation, this would update the contact's VIP status in the database
  };

  const handleReturnCall = (contact: CustomerContact) => {
    toast({
      title: "Initiating Call",
      description: `Calling ${contact.customerName || formatPhoneNumber(contact.phoneNumber)}...`,
    });
    // In real implementation, this would initiate an outbound call
  };

  const handleSendText = (contact: CustomerContact) => {
    toast({
      title: "Opening Messaging",
      description: `Opening text conversation with ${contact.customerName || formatPhoneNumber(contact.phoneNumber)}`,
    });
    // In real implementation, this would open the messaging tab with this contact
  };

  const handleEditContact = (contact: CustomerContact) => {
    // Open the contact details modal for editing
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const handleBlockContact = (contact: CustomerContact) => {
    toast({
      title: "Contact Blocked",
      description: `${contact.customerName || formatPhoneNumber(contact.phoneNumber)} has been blocked.`,
    });
    // In real implementation, this would block the contact in the database
  };

  const handleDeleteContact = (contact: CustomerContact) => {
    toast({
      title: "Contact Deleted",
      description: `${contact.customerName || formatPhoneNumber(contact.phoneNumber)} has been deleted.`,
      variant: "destructive",
    });
    // In real implementation, this would delete the contact from the database
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return 'text-green-500';
    if (score <= 0.3) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 0.7) return 'Positive';
    if (score <= 0.3) return 'Negative';
    return 'Neutral';
  };

  return (
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
                    onClick={() => { setCallTypeFilter('all'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>All Types</span>
                    {callTypeFilter === 'all' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setCallTypeFilter('reservation'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Reservations</span>
                    {callTypeFilter === 'reservation' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setCallTypeFilter('order'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Orders</span>
                    {callTypeFilter === 'order' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setCallTypeFilter('catering'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Catering</span>
                    {callTypeFilter === 'catering' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setCallTypeFilter('faq'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>FAQ/Info</span>
                    {callTypeFilter === 'faq' && <Check className="h-4 w-4 text-blue-400" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => { setCallTypeFilter('other'); setIsCombinedDropdownOpen(false); }}
                  >
                    <span>Other</span>
                    {callTypeFilter === 'other' && <Check className="h-4 w-4 text-blue-400" />}
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
              <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
                <SelectTrigger className="w-[180px] bg-transparent border-gray-800 text-gray-300">
                  <SelectValue placeholder="Filter by Call Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="reservation">Reservations</SelectItem>
                  <SelectItem value="order">Orders</SelectItem>
                  <SelectItem value="catering">Catering</SelectItem>
                  <SelectItem value="faq">FAQ/Info</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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

          {filteredAndSortedContacts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-white mb-2">No Contacts Yet</h3>
                <p className="text-gray-400">
                  {searchQuery || vipFilter !== 'all' || callTypeFilter !== 'all' || dateRangeFilter !== 'all'
                    ? 'No contacts match your filters.'
                    : 'Customer contacts will appear here once calls are received.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Table View */}
              <div className="overflow-auto flex-1 w-full">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-800 h-[52px]">
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Name</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Phone</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Last Contact</th>
                      {showAppointments && (
                        <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Revenue</th>
                      )}
                      {showOrders && (
                        <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Orders</th>
                      )}
                      {showReservations && (
                        <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Reservations</th>
                      )}
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Calls</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {paginatedContacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className={`hover:bg-gray-800/50 cursor-pointer ${contact.vip ? 'bg-yellow-900/10' : ''}`}
                        onClick={() => handleContactClick(contact)}
                      >
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  {contact.customerName || ''}
                                </span>
                                {contact.vip && (
                                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-300 font-mono text-sm">
                              {formatPhoneNumber(contact.phoneNumber)}
                            </span>
                            {contact.phoneNumberSecondary && (
                              <span className="text-gray-400 font-mono text-xs">
                                {formatPhoneNumber(contact.phoneNumberSecondary)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 sm:px-4 py-3">
                          <span className="text-white text-sm sm:text-base">
                            {formatContactDate(contact.lastInteractionDate)}
                          </span>
                        </td>

                        {showAppointments && (
                          <td className="px-3 sm:px-4 py-3">
                            <span className="text-white font-semibold">
                              ${contact.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </td>
                        )}

                        {showOrders && (
                          <td className="px-3 sm:px-4 py-3">
                            <span className="text-white font-semibold">
                              {contact.callTypeBreakdown?.order || 0}
                            </span>
                          </td>
                        )}

                        {showReservations && (
                          <td className="px-3 sm:px-4 py-3">
                            <span className="text-white font-semibold">
                              {contact.callTypeBreakdown?.reservation || 0}
                            </span>
                          </td>
                        )}

                        <td className="px-3 sm:px-4 py-3">
                          <span className="text-white font-semibold">{contact.totalCalls}</span>
                        </td>

                        <td className="px-3 sm:px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="opacity-100 w-8 h-8 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-all"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <i className="fas fa-ellipsis-v text-sm"></i>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 premium-card text-white">
                              <DropdownMenuItem
                                onClick={() => handleReturnCall(contact)}
                                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                              >
                                <i className="fas fa-phone w-4 text-green-400 mr-2"></i>
                                <span>Call</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSendText(contact)}
                                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                              >
                                <i className="fas fa-comment w-4 text-blue-400 mr-2"></i>
                                <span>Text</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem
                                onClick={() => handleExportContact(contact)}
                                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                              >
                                <i className="fas fa-download w-4 text-purple-400 mr-2"></i>
                                <span>Download</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditContact(contact)}
                                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2 text-gray-400" />
                                <span>Edit Contact</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem
                                onClick={() => handleBlockContact(contact)}
                                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                              >
                                <X className="h-4 w-4 mr-2 text-red-400" />
                                <span>Block Contact</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteContact(contact)}
                                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                              >
                                <i className="fas fa-trash w-4 text-red-400 mr-2"></i>
                                <span>Delete Contact</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                            <Dialog style={{ display: 'none' }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setSelectedContact(contact)}
                                  style={{ display: 'none' }}
                                >
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-700">
                                <DialogHeader>
                                  <DialogTitle className="text-white flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(selectedContact?.customerName || '')}`}>
                                      {generateInitials(selectedContact?.customerName || '')}
                                    </div>
                                    Contact Details - {selectedContact?.customerName}
                                    {selectedContact?.vip && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
                                    {selectedContact?.flagged && <Flag className="h-4 w-4 text-red-400" />}
                                  </DialogTitle>
                                </DialogHeader>

                                <ScrollArea className="max-h-[70vh]">
                                  {selectedContact && (
                                    <div className="space-y-6 pr-4">
                                      {/* Contact Overview */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            Contact Information
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Name:</span>
                                              <span className="text-white font-medium">{selectedContact.customerName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Phone:</span>
                                              <span className="text-gray-300 font-mono">{formatPhoneNumber(selectedContact.phoneNumber)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">First Call:</span>
                                              <span className="text-gray-300">{new Date(selectedContact.firstCallDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Last Call:</span>
                                              <span className="text-gray-300">{new Date(selectedContact.lastCallDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Total Calls:</span>
                                              <span className="text-white font-medium">{selectedContact.totalCalls}</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div>
                                          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Call Statistics
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Avg Duration:</span>
                                              <span className="text-gray-300">{formatDuration(selectedContact.averageDuration)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Total Duration:</span>
                                              <span className="text-gray-300">{formatDuration(selectedContact.totalDuration)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Success Rate:</span>
                                              <span className="text-gray-300">
                                                {selectedContact.totalCalls > 0 ? Math.round((selectedContact.successfulCalls / selectedContact.totalCalls) * 100) : 0}%
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Sentiment:</span>
                                              <span className={getSentimentColor(selectedContact.sentimentScore)}>
                                                {getSentimentLabel(selectedContact.sentimentScore)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Call Type Breakdown */}
                                      <div>
                                        <h4 className="font-semibold text-white mb-3">Call Type Breakdown</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                          {Object.entries(selectedContact.callTypeBreakdown).map(([type, count]) => (
                                            <div key={type} className="bg-gray-800 rounded-lg p-3 text-center">
                                              <div className="text-xl font-bold text-white">{count}</div>
                                              <div className="text-sm text-gray-400 capitalize">{type}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Tags and Notes */}
                                      {(selectedContact.tags.length > 0 || selectedContact.notes.length > 0) && (
                                        <div>
                                          <h4 className="font-semibold text-white mb-3">Tags & Notes</h4>
                                          <div className="space-y-3">
                                            {selectedContact.tags.length > 0 && (
                                              <div>
                                                <span className="text-sm text-gray-400 block mb-2">Tags:</span>
                                                <div className="flex gap-2 flex-wrap">
                                                  {selectedContact.tags.map((tag, index) => (
                                                    <Badge key={index} variant="outline" className="border-gray-800 text-gray-300">
                                                      {tag}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {selectedContact.notes.length > 0 && (
                                              <div>
                                                <span className="text-sm text-gray-400 block mb-2">Notes:</span>
                                                <div className="space-y-1">
                                                  {selectedContact.notes.map((note, index) => (
                                                    <div key={index} className="text-sm text-gray-300 bg-gray-800 rounded p-2">
                                                      {note}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Recent Call History */}
                                      <div>
                                        <h4 className="font-semibold text-white mb-3">Recent Calls ({selectedContact.callHistory.length})</h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                          {selectedContact.callHistory.slice(0, 10).map((call) => {
                                            const callTime = call.startTime || call.start_time || call.timestamp || call.createdAt || call.created_at || new Date().toISOString();
                                            return (
                                            <div key={call.id} className="bg-gray-800 rounded p-3">
                                              <div className="flex justify-between items-start mb-2">
                                                <span className="text-white text-sm">
                                                  {new Date(callTime).toLocaleDateString()} {new Date(callTime).toLocaleTimeString()}
                                                </span>
                                                <Badge className="bg-blue-900/20 text-blue-400 text-xs">
                                                  {call.interactionType || 'other'}
                                                </Badge>
                                              </div>
                                              {call.summary && (
                                                <p className="text-gray-300 text-sm">{call.summary}</p>
                                              )}
                                              <div className="flex justify-between items-center mt-2">
                                                <span className="text-gray-400 text-xs">
                                                  Duration: {formatDuration(call.duration || 0)}
                                                </span>
                                                <span className="text-gray-400 text-xs">
                                                  {call.callStatus || call.call_status || call.status}
                                                </span>
                                              </div>
                                            </div>
                                            );
                                          })}
                                          {selectedContact.callHistory.length > 10 && (
                                            <div className="text-center py-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-gray-800 text-gray-300"
                                                onClick={() => handleViewCallHistory(selectedContact)}
                                              >
                                                View All {selectedContact.callHistory.length} Calls
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredAndSortedContacts.length > 0 && (
                <div className="flex items-center justify-between px-4 h-[52px] border-t border-gray-800 flex-shrink-0">
                  {/* Left: Contact count */}
                  <div className="text-sm text-gray-400">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedContacts.length)} of {filteredAndSortedContacts.length} contacts
                  </div>
                </div>
              )}
            </>
          )}

      {/* Contact Details Side Panel */}
      <ContactDetailsModal
        contact={selectedContact}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        industry={industry}
        agentId={selectedAgentId}
        onUpdate={async () => {
          // Invalidate contacts query to refetch saved contact data
          queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
          // Also call parent onRefresh to refetch calls
          if (onRefresh) {
            await onRefresh();
          }
        }}
      />
    </div>
  );
}
