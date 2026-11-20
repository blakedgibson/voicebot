import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
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
  AlertTriangle
} from "lucide-react";

// Enhanced interface with all caller data fields
interface EnhancedTelephonyCallLog {
  id: string;
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
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
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
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
  actions?: any[];
  flagged?: boolean;
  recordingProviderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CallLogsResponse {
  calls: EnhancedTelephonyCallLog[];
  total: number;
  page: number;
  pageSize: number;
}

// Audio playback state interface
interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentCallId: string | null;
  duration: number;
  currentTime: number;
  error: string | null;
}

export default function CallLogs() {
  const [selectedCall, setSelectedCall] = useState<EnhancedTelephonyCallLog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [vipFilter, setVipFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Call data state - use useState instead of const for actual updates
  const [calls, setCalls] = useState<EnhancedTelephonyCallLog[]>([]);
  
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

  // For now, using a dummy agentId - in real app this would come from route params or user context
  const agentId = "demo-agent-id";

  // Enable React Query for real backend integration when authentication is available
  const { data: callLogsData, isLoading, error } = useQuery<CallLogsResponse>({
    queryKey: ['/api/restaurant', agentId, 'calls/enhanced', { 
      page, 
      pageSize, 
      q: searchQuery,
      statuses: statusFilter ? [statusFilter] : undefined,
      types: typeFilter ? [typeFilter] : undefined,
      vip: vipFilter ? (vipFilter === 'true') : undefined
    }],
    enabled: false // TODO: Enable when authentication is properly set up
  });

  // Initialize with mock data after component mounts
  useEffect(() => {
    setCalls(mockCallLogs);
  }, []);

  // Mock data for demonstration
  const mockCallLogs: EnhancedTelephonyCallLog[] = [
    {
      id: "call-1",
      twilioCallSid: "CA123456789",
      fromNumber: "+15551234567",
      toNumber: "+15559876543",
      normalizedPhone: "+15551234567",
      direction: "inbound",
      status: "completed",
      callStatus: "completed",
      duration: 180,
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() - 3400000).toISOString(),
      customerName: "John Smith",
      interactionType: "reservation",
      vip: true,
      tags: ["dinner", "party-of-4"],
      notes: ["Requested window table", "Regular customer"],
      summary: "Customer made dinner reservation for 4 people on Friday evening",
      sentiment: "positive",
      sentimentScore: 0.85,
      actionTaken: "reservation",
      confidence: 92,
      flagged: false,
      transcriptionText: "Hi, I'd like to make a reservation for 4 people this Friday at 7 PM please.",
      aiResponse: "I'd be happy to help you with a reservation for 4 people this Friday at 7 PM. Let me check our availability."
    },
    {
      id: "call-2", 
      twilioCallSid: "CA987654321",
      fromNumber: "+15555678901",
      toNumber: "+15559876543",
      normalizedPhone: "+15555678901",
      direction: "inbound",
      status: "completed",
      callStatus: "completed", 
      duration: 120,
      startTime: new Date(Date.now() - 7200000).toISOString(),
      endTime: new Date(Date.now() - 7080000).toISOString(),
      customerName: "Sarah Johnson",
      interactionType: "order",
      vip: false,
      tags: ["takeout", "delivery"],
      notes: ["Delivery address verified"],
      summary: "Customer placed takeout order for pasta and salad",
      sentiment: "neutral",
      sentimentScore: 0.65,
      actionTaken: "order",
      confidence: 88,
      flagged: false,
      transcriptionText: "I'd like to order the chicken alfredo and a Caesar salad for pickup.",
      aiResponse: "I'll be happy to take your order. The chicken alfredo and Caesar salad will be ready in about 20 minutes."
    },
    {
      id: "call-3",
      twilioCallSid: "CA456789123", 
      fromNumber: "+15552345678",
      toNumber: "+15559876543",
      normalizedPhone: "+15552345678",
      direction: "inbound",
      status: "completed",
      callStatus: "transferred",
      duration: 45,
      startTime: new Date(Date.now() - 10800000).toISOString(),
      endTime: new Date(Date.now() - 10755000).toISOString(),
      customerName: "Mike Wilson", 
      interactionType: "catering",
      vip: false,
      tags: ["catering", "large-order"],
      notes: ["Transferred to manager", "Corporate event inquiry"],
      summary: "Customer inquiry about catering for corporate event, transferred to manager",
      sentiment: "neutral",
      sentimentScore: 0.7,
      actionTaken: "transfer",
      confidence: 75,
      flagged: true,
      transcriptionText: "Hi, I'm calling about catering options for a corporate event with about 50 people.",
      aiResponse: "For catering orders of that size, let me transfer you to our catering manager who can better assist you."
    }
  ];

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'N/A';
    if (phone.startsWith('+1')) {
      const cleaned = phone.slice(2);
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getInteractionTypeColor = (type?: string) => {
    switch (type) {
      case 'reservation': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'order': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'catering': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'faq': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getCallStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'missed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'transferred': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Audio control functions
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
      } finally {
        // Clear the controller reference
        if (abortControllerRef.current) {
          abortControllerRef.current = null;
        }
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

  // Quick action functions
  const handleReturnCall = async (call: EnhancedTelephonyCallLog) => {
    try {
      toast({
        title: "Initiating Return Call",
        description: `Starting outbound call to ${call.customerName || formatPhoneNumber(call.fromNumber)}...`,
      });
      
      // In a real implementation, this would integrate with Twilio or Retell to initiate an outbound call
      // For now, we'll show a mock success message
      setTimeout(() => {
        toast({
          title: "Call Initiated",
          description: "Return call started successfully. Check your phone.",
        });
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Call Failed",
        description: "Failed to initiate return call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendFollowUp = async (call: EnhancedTelephonyCallLog) => {
    try {
      toast({
        title: "Sending Follow-up",
        description: `Sending follow-up message to ${call.customerName || 'customer'}...`,
      });
      
      // In a real implementation, this would send an SMS or email
      setTimeout(() => {
        toast({
          title: "Follow-up Sent",
          description: "Follow-up message sent successfully.",
        });
      }, 1500);
      
    } catch (error) {
      toast({
        title: "Message Failed",
        description: "Failed to send follow-up message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportCall = async (call: EnhancedTelephonyCallLog) => {
    try {
      const exportData = {
        callId: call.id,
        customer: call.customerName || 'Unknown',
        phone: call.fromNumber,
        date: new Date(call.startTime).toISOString(),
        duration: call.duration,
        type: call.interactionType,
        status: call.callStatus,
        sentiment: call.sentiment,
        transcript: call.transcriptionText,
        summary: call.summary,
        tags: call.tags,
        notes: call.notes
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
      toast({
        title: "Export Failed",
        description: "Failed to export call data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleVIP = async (call: EnhancedTelephonyCallLog) => {
    try {
      // Update local state optimistically
      setCalls(prevCalls => 
        prevCalls.map(c => 
          c.id === call.id ? { ...c, vip: !c.vip } : c
        )
      );
      
      // In a real implementation, this would call the PATCH API endpoint
      // await apiRequest(`/api/restaurant/${agentId}/calls/${call.id}/meta`, {
      //   method: 'PATCH',
      //   body: { vip: !call.vip }
      // });
      
      toast({
        title: call.vip ? "VIP Status Removed" : "VIP Status Added",
        description: `${call.customerName || 'Customer'} ${call.vip ? 'removed from' : 'added to'} VIP list.`,
      });
      
    } catch (error) {
      // Revert optimistic update on error
      setCalls(prevCalls => 
        prevCalls.map(c => 
          c.id === call.id ? { ...c, vip: call.vip } : c
        )
      );
      
      toast({
        title: "Update Failed",
        description: "Failed to update VIP status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFlag = async (call: EnhancedTelephonyCallLog) => {
    try {
      // Update local state optimistically
      setCalls(prevCalls => 
        prevCalls.map(c => 
          c.id === call.id ? { ...c, flagged: !c.flagged } : c
        )
      );
      
      // In a real implementation, this would call the PATCH API endpoint
      // await apiRequest(`/api/restaurant/${agentId}/calls/${call.id}/meta`, {
      //   method: 'PATCH', 
      //   body: { flagged: !call.flagged }
      // });
      
      toast({
        title: call.flagged ? "Flag Removed" : "Call Flagged",
        description: `Call ${call.flagged ? 'unflagged' : 'flagged'} for follow-up.`,
      });
      
    } catch (error) {
      // Revert optimistic update on error
      setCalls(prevCalls => 
        prevCalls.map(c => 
          c.id === call.id ? { ...c, flagged: call.flagged } : c
        )
      );
      
      toast({
        title: "Update Failed",
        description: "Failed to update flag status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Export filtered call data
  const handleExportFilteredCalls = () => {
    try {
      const exportData = filteredAndSortedLogs.map(call => ({
        id: call.id,
        customerName: call.customerName || 'Unknown',
        fromNumber: call.fromNumber,
        startTime: call.startTime,
        duration: call.duration,
        interactionType: call.interactionType,
        callStatus: call.callStatus,
        sentiment: call.sentiment,
        confidence: call.confidence,
        vip: call.vip,
        flagged: call.flagged,
        notes: call.notes
      }));
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Exported ${exportData.length} call records to file.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export call data. Please try again.",
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

  // Define sorting configuration
  const [sortBy, setSortBy] = useState<'createdAt' | 'duration' | 'interactionType' | 'callStatus'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Apply filtering, sorting, and pagination to call data
  const filteredAndSortedLogs = React.useMemo(() => {
    let filtered = [...calls];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(call => 
        (call.customerName?.toLowerCase().includes(query)) ||
        call.fromNumber.includes(query) ||
        call.normalizedPhone?.includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(call => 
        call.callStatus === statusFilter || call.status === statusFilter
      );
    }
    
    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter(call => call.interactionType === typeFilter);
    }
    
    // Apply VIP filter
    if (vipFilter === 'true') {
      filtered = filtered.filter(call => call.vip === true);
    } else if (vipFilter === 'false') {
      filtered = filtered.filter(call => call.vip === false);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return sortDir === 'asc' 
            ? (a.duration || 0) - (b.duration || 0)
            : (b.duration || 0) - (a.duration || 0);
        case 'interactionType':
          return sortDir === 'asc'
            ? (a.interactionType || '').localeCompare(b.interactionType || '')
            : (b.interactionType || '').localeCompare(a.interactionType || '');
        case 'callStatus':
          return sortDir === 'asc'
            ? (a.callStatus || '').localeCompare(b.callStatus || '')
            : (b.callStatus || '').localeCompare(a.callStatus || '');
        case 'createdAt':
        default:
          return sortDir === 'asc'
            ? new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            : new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      }
    });
    
    return filtered;
  }, [searchQuery, statusFilter, typeFilter, vipFilter, sortBy, sortDir, calls]);
  
  // Apply pagination
  const totalAllCalls = calls.length;
  const totalFilteredCalls = filteredAndSortedLogs.length;
  const startIndex = (page - 1) * pageSize;
  const callLogs = filteredAndSortedLogs.slice(startIndex, startIndex + pageSize);

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading call logs...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">Failed to load call logs</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Call History</h1>
        <p className="text-gray-400 mt-2">Comprehensive caller data with advanced filtering and analytics</p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Calls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                data-testid="search-calls"
                placeholder="Search customers, phone numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border-gray-800 text-gray-300"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="filter-status" className="bg-transparent border-gray-800 text-gray-300">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger data-testid="filter-type" className="bg-transparent border-gray-800 text-gray-300">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="reservation">Reservations</SelectItem>
                <SelectItem value="order">Orders</SelectItem>
                <SelectItem value="catering">Catering</SelectItem>
                <SelectItem value="faq">FAQ/Info</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vipFilter} onValueChange={setVipFilter}>
              <SelectTrigger data-testid="filter-vip" className="bg-transparent border-gray-800 text-gray-300">
                <SelectValue placeholder="Filter by VIP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Customers</SelectItem>
                <SelectItem value="true">VIP Only</SelectItem>
                <SelectItem value="false">Regular Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Showing {callLogs.length} of {totalFilteredCalls} calls{totalFilteredCalls !== totalAllCalls ? ` (filtered from ${totalAllCalls} total)` : ''}
            </div>
            <Button 
              data-testid="export-calls"
              variant="outline" 
              size="sm"
              onClick={() => handleExportFilteredCalls()}
              className="border-gray-800 text-gray-300 hover:bg-gray-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call History Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Call History</CardTitle>
          <CardDescription className="text-gray-400">
            Detailed view of all customer interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {callLogs.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-white mb-2">No Call Logs Yet</h3>
              <p className="text-gray-400">
                Once customers start calling your AI receptionist, call logs will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Date & Time</TableHead>
                    <TableHead className="text-gray-300">Customer</TableHead>
                    <TableHead className="text-gray-300">Phone Number</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Duration</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Sentiment</TableHead>
                    <TableHead className="text-gray-300">Tags</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callLogs.map((call) => (
                    <TableRow 
                      key={call.id} 
                      className="border-gray-700 hover:bg-gray-800/50"
                      data-testid={`call-row-${call.id}`}
                    >
                      <TableCell className="text-gray-300">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(call.startTime).toLocaleDateString()}
                          </span>
                          <span className="text-sm text-gray-400">
                            {new Date(call.startTime).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-white font-medium"
                                data-testid={`customer-name-${call.id}`}
                              >
                                {call.customerName || 'Unknown'}
                              </span>
                              {call.vip && (
                                <Star 
                                  className="h-4 w-4 text-yellow-400 fill-current" 
                                  data-testid={`vip-indicator-${call.id}`}
                                />
                              )}
                              {call.flagged && (
                                <Flag 
                                  className="h-4 w-4 text-red-400" 
                                  data-testid={`flagged-indicator-${call.id}`}
                                />
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span 
                          className="text-gray-300 font-mono text-sm"
                          data-testid={`phone-number-${call.id}`}
                        >
                          {formatPhoneNumber(call.fromNumber)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          className={getInteractionTypeColor(call.interactionType)}
                          data-testid={`interaction-type-${call.id}`}
                        >
                          {call.interactionType || 'other'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1 text-gray-300">
                          <Clock className="h-4 w-4" />
                          <span data-testid={`duration-${call.id}`}>
                            {formatDuration(call.duration)}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          className={getCallStatusColor(call.callStatus)}
                          data-testid={`call-status-${call.id}`}
                        >
                          {call.callStatus || call.status}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {call.sentiment && (
                          <div className="flex items-center gap-2">
                            {getSentimentIcon(call.sentiment)}
                            <Badge 
                              className={getSentimentColor(call.sentiment)}
                              data-testid={`sentiment-${call.id}`}
                            >
                              {call.sentiment}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {call.tags?.slice(0, 2).map((tag, index) => (
                            <Badge 
                              key={index}
                              variant="outline" 
                              className="border-gray-800 text-gray-400 text-xs"
                              data-testid={`tag-${call.id}-${index}`}
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {call.tags && call.tags.length > 2 && (
                            <Badge variant="outline" className="border-gray-800 text-gray-400 text-xs">
                              +{call.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-2">
                          {/* Recording Play Button */}
                          {call.recordingUrl && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => playRecording(call.id)}
                              disabled={audioState.isLoading && audioState.currentCallId === call.id}
                              data-testid={`play-recording-${call.id}`}
                            >
                              {audioState.isLoading && audioState.currentCallId === call.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : audioState.isPlaying && audioState.currentCallId === call.id ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {/* Quick Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0"
                                data-testid={`quick-actions-${call.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-gray-800 border-gray-700">
                              <DropdownMenuItem 
                                onClick={() => handleReturnCall(call)}
                                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                                data-testid={`return-call-${call.id}`}
                              >
                                <PhoneCall className="h-4 w-4 mr-2" />
                                Return Call
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleSendFollowUp(call)}
                                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                                data-testid={`follow-up-${call.id}`}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Follow-up
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleExportCall(call)}
                                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                                data-testid={`export-call-${call.id}`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export Call Data
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                onClick={() => handleToggleVIP(call)}
                                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                                data-testid={`toggle-vip-${call.id}`}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                {call.vip ? 'Remove from VIP' : 'Mark as VIP'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleToggleFlag(call)}
                                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                                data-testid={`toggle-flag-${call.id}`}
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                {call.flagged ? 'Remove Flag' : 'Flag for Follow-up'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          {/* Call Details Side Panel */}
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setSelectedCall(call)}
                                data-testid={`view-details-${call.id}`}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full sm:w-1/2 sm:max-w-[50%] premium-card p-0 flex flex-col overflow-y-auto">
                              <div className="p-6 pb-24">
                                <SheetHeader className="mb-6">
                                  <div className="flex items-center justify-between mb-2">
                                    <SheetTitle className="text-white flex items-center gap-3">
                                      <div className="w-3 h-3 bg-blue-400 rounded"></div>
                                      Call Details - {selectedCall?.customerName || 'Unknown Customer'}
                                      {selectedCall?.vip && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
                                      {selectedCall?.flagged && <Flag className="h-4 w-4 text-red-400" />}
                                    </SheetTitle>
                                  </div>
                                  <SheetDescription className="text-gray-400">
                                    Detailed call information and conversation analysis
                                  </SheetDescription>
                                </SheetHeader>

                                {selectedCall && (
                                  <div className="space-y-6">
                                    {/* Call Overview */}
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-gray-300 flex items-center gap-2">
                                          <Phone className="h-4 w-4" />
                                          Call Information
                                        </Label>
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2 text-sm mt-2">
                                          <div className="flex justify-between">
                                            <span className="text-gray-400">Customer:</span>
                                            <span className="text-white font-medium">{selectedCall.customerName || 'Unknown'}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-400">Phone:</span>
                                            <span className="text-gray-300 font-mono">{formatPhoneNumber(selectedCall.fromNumber)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-400">Direction:</span>
                                            <span className="text-gray-300">{selectedCall.direction === 'inbound' ? 'Incoming' : 'Outgoing'}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-400">Started:</span>
                                            <span className="text-gray-300">{new Date(selectedCall.startTime).toLocaleString()}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-400">Duration:</span>
                                            <span className="text-gray-300">{formatDuration(selectedCall.duration)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-400">Status:</span>
                                            <Badge className={getCallStatusColor(selectedCall.callStatus)}>
                                              {selectedCall.callStatus || selectedCall.status}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <Label className="text-gray-300 flex items-center gap-2">
                                          <TrendingUp className="h-4 w-4" />
                                          AI Analysis
                                        </Label>
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2 text-sm mt-2">
                                          <div className="flex justify-between">
                                            <span className="text-gray-400">Type:</span>
                                            <Badge className={getInteractionTypeColor(selectedCall.interactionType)}>
                                              {selectedCall.interactionType || 'other'}
                                            </Badge>
                                          </div>
                                          {selectedCall.sentiment && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Sentiment:</span>
                                              <Badge className={getSentimentColor(selectedCall.sentiment)}>
                                                <span className="flex items-center gap-1">
                                                  {getSentimentIcon(selectedCall.sentiment)}
                                                  {selectedCall.sentiment}
                                                </span>
                                              </Badge>
                                            </div>
                                          )}
                                          {selectedCall.confidence && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Confidence:</span>
                                              <span className="text-gray-300">{Math.round(selectedCall.confidence)}%</span>
                                            </div>
                                          )}
                                          {selectedCall.actionTaken && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Action:</span>
                                              <span className="text-gray-300">{selectedCall.actionTaken}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Tags and Notes */}
                                    {(selectedCall.tags?.length || selectedCall.notes?.length) && (
                                      <div className="space-y-4">
                                        <Label className="text-gray-300 flex items-center gap-2">
                                          <Tag className="h-4 w-4" />
                                          Tags & Notes
                                        </Label>
                                        <div className="space-y-3">
                                          {selectedCall.tags && selectedCall.tags.length > 0 && (
                                            <div>
                                              <span className="text-sm text-gray-300 block mb-2">Tags:</span>
                                              <div className="flex gap-2 flex-wrap">
                                                {selectedCall.tags.map((tag, index) => (
                                                  <Badge key={index} variant="outline" className="border-gray-800 text-gray-300">
                                                    {tag}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {selectedCall.notes && selectedCall.notes.length > 0 && (
                                            <div>
                                              <span className="text-sm text-gray-300 block mb-2">Notes:</span>
                                              <div className="space-y-1">
                                                {selectedCall.notes.map((note, index) => (
                                                  <div key={index} className="text-sm text-gray-300 bg-gray-900 rounded p-2">
                                                    {note}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Call Recording Player */}
                                    {selectedCall.recordingUrl && (
                                      <div className="space-y-4">
                                        <Label className="text-gray-300 flex items-center gap-2">
                                          <Volume2 className="h-4 w-4" />
                                          Call Recording
                                        </Label>
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-2">
                                          <div className="flex items-center gap-4">
                                            <Button

                                              variant="outline"
                                              size="sm"
                                              onClick={() => playRecording(selectedCall.id)}
                                              disabled={audioState.isLoading && audioState.currentCallId === selectedCall.id}
                                              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                            >
                                              {audioState.isLoading && audioState.currentCallId === selectedCall.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                              ) : audioState.isPlaying && audioState.currentCallId === selectedCall.id ? (
                                                <Pause className="h-4 w-4 mr-2" />
                                              ) : (
                                                <Play className="h-4 w-4 mr-2" />
                                              )}
                                              {audioState.isLoading && audioState.currentCallId === selectedCall.id 
                                                ? 'Loading...' 
                                                : audioState.isPlaying && audioState.currentCallId === selectedCall.id 
                                                  ? 'Pause' 
                                                  : 'Play Recording'
                                              }
                                            </Button>
                                            
                                            {audioState.currentCallId === selectedCall.id && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={stopRecording}
                                                className="text-gray-400 hover:text-gray-300"
                                              >
                                                <Square className="h-4 w-4 mr-2" />
                                                Stop
                                              </Button>
                                            )}
                                            
                                            {audioState.currentCallId === selectedCall.id && audioState.duration > 0 && (
                                              <div className="flex-1 max-w-md">
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                  <span>
                                                    {Math.floor(audioState.currentTime / 60)}:{Math.floor(audioState.currentTime % 60).toString().padStart(2, '0')}
                                                  </span>
                                                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                                                    <div 
                                                      className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                                                      style={{ 
                                                        width: `${(audioState.currentTime / audioState.duration) * 100}%` 
                                                      }}
                                                    />
                                                  </div>
                                                  <span>
                                                    {Math.floor(audioState.duration / 60)}:{Math.floor(audioState.duration % 60).toString().padStart(2, '0')}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {audioState.error && audioState.currentCallId === selectedCall.id && (
                                            <div className="mt-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-2">
                                              ⚠️ {audioState.error}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Summary */}
                                    {selectedCall.summary && (
                                      <div className="space-y-4">
                                        <Label className="text-gray-300 flex items-center gap-2">
                                          <FileText className="h-4 w-4" />
                                          Call Summary
                                        </Label>
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-2">
                                          <p className="text-sm text-gray-300">{selectedCall.summary}</p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Conversation */}
                                    {selectedCall.conversationData && selectedCall.conversationData.length > 0 && (
                                      <div className="space-y-4">
                                        <Label className="text-gray-300 flex items-center gap-2">
                                          <MessageSquare className="h-4 w-4" />
                                          Conversation
                                        </Label>
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-2">
                                          <ScrollArea className="h-64 w-full">
                                          <div className="space-y-3">
                                            {selectedCall.conversationData.map((message, index) => (
                                              <div key={index}>
                                                <div className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                                    message.role === 'assistant' 
                                                      ? 'bg-blue-600 text-white' 
                                                      : 'bg-gray-700 text-gray-100'
                                                  }`}>
                                                    <div className="text-xs font-medium mb-1 opacity-75">
                                                      {message.role === 'assistant' ? 'AI Assistant' : 'Customer'}
                                                    </div>
                                                    <p className="text-sm">{message.content}</p>
                                                  </div>
                                                </div>
                                                {index < selectedCall.conversationData!.length - 1 && (
                                                  <Separator className="my-2 bg-gray-700" />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </ScrollArea>
                                        </div>
                                      </div>
                                    )}

                                    {/* Full Transcription */}
                                    {selectedCall.transcriptionText && (
                                      <div className="space-y-4">
                                        <Label className="text-gray-300">Full Transcription</Label>
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-2">
                                          <p className="text-sm text-gray-300 whitespace-pre-wrap">
                                            {selectedCall.transcriptionText}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* AI Response */}
                                    {selectedCall.aiResponse && (
                                      <div className="space-y-4">
                                        <Label className="text-gray-300">AI Response</Label>
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-2">
                                          <p className="text-sm text-gray-300">
                                            {selectedCall.aiResponse}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </SheetContent>
                          </Sheet>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}