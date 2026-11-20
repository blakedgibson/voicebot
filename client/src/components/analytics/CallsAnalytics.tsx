import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Phone,
  Clock,
  TrendingUp,
  Bot,
  Users,
  CheckCircle,
  Search,
  User,
  ShoppingBag,
  Calendar,
  Truck,
  UtensilsCrossed,
  HelpCircle,
  Boxes,
  Flag
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getCallTypesForIndustry, DEFAULT_INDUSTRY, type Industry } from "@shared/industryConfig";

interface CallsAnalyticsProps {
  selectedPeriod?: string;
  industry?: Industry;
  selectedAgentId?: string;
}

export default function CallsAnalytics({ selectedPeriod: propSelectedPeriod = "This Month", industry = 'restaurant', selectedAgentId = '' }: CallsAnalyticsProps) {
  const { isAuthenticated } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState(propSelectedPeriod);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync local state with prop when it changes (for timeline dropdown in top bar)
  useEffect(() => {
    setSelectedPeriod(propSelectedPeriod);
  }, [propSelectedPeriod]);

  // Get industry-specific call types
  const industryCallTypes = getCallTypesForIndustry(industry);

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedPeriod) {
      case "Today":
        return {
          startDate: today.toISOString(),
          endDate: new Date().toISOString()
        };
      case "This Week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          startDate: weekStart.toISOString(),
          endDate: new Date().toISOString()
        };
      case "This Month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: monthStart.toISOString(),
          endDate: new Date().toISOString()
        };
      case "Last 3 Months":
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        return {
          startDate: threeMonthsAgo.toISOString(),
          endDate: new Date().toISOString()
        };
      case "Total":
        return null;
      default:
        return null;
    }
  }, [selectedPeriod]);

  // Fetch conversation history filtered by selected agent
  const { data: conversationData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['/api/conversations', selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append('agentId', selectedAgentId);
      const response = await fetch(`/api/conversations?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: { conversations: [] } // Show empty array immediately while loading
  });

  const conversations = conversationData?.conversations || [];

  // Filter calls by date range
  const calls = useMemo(() => {
    if (!dateRange || !conversations.length) return conversations;

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    return conversations.filter((call: any) => {
      const callDate = new Date(call.startTime || call.timestamp || call.started_at || call.created_at);
      return callDate >= startDate && callDate <= endDate;
    });
  }, [conversations, dateRange]);

  // Debug: Log a sample call to see available fields
  console.log('📊 CallsAnalytics - Sample call data:', calls.length > 0 ? calls[0] : 'No calls');

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter((call: any) => {
      const callerName = call.callerName || call.caller_name || call.customer_name || '';
      const phoneNumber = call.callerPhone || call.caller_phone || call.from_number || call.phone_number || '';
      const transcript = call.fullTranscript || call.transcript || call.summary || '';

      return (
        callerName.toLowerCase().includes(query) ||
        phoneNumber.toLowerCase().includes(query) ||
        transcript.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery]);

  // Calculate metrics from call history
  const totalCalls = calls.length;

  // Calculate transferred calls (check callStatus field)
  const transferred = calls.filter((call: any) => {
    const callStatus = (call.callStatus || call.call_status || '').toLowerCase();
    const outcome = (call.outcome || '').toLowerCase();
    // Check callStatus for 'transferred' or outcome for 'escalated'
    return callStatus === 'transferred' || outcome === 'escalated' || outcome === 'transferred';
  }).length;

  // Debug: Log transfer detection
  console.log('📞 CallsAnalytics - Transfer Detection:', {
    transferred,
    totalCalls: calls.length,
    sampleStatuses: calls.slice(0, 3).map((c: any) => ({
      callStatus: c.callStatus,
      call_status: c.call_status,
      outcome: c.outcome
    }))
  });

  // Calculate average duration
  const totalDuration = calls.reduce((sum: number, call: any) => {
    const duration = call.duration || 0;
    return sum + duration;
  }, 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  const transferredPercentage = totalCalls > 0 ? (transferred / totalCalls) * 100 : 0;

  // Customer metrics - improved logic for new vs repeat callers
  const uniquePhones = new Set(
    calls.map((call: any) => call.fromNumber || call.from)
      .filter(Boolean)
  );
  
  const uniqueCallers = uniquePhones.size;

  // Get all calls from all time for comparison
  const allTimePhoneCalls = conversations.reduce((acc: any, call: any) => {
    const phone = call.fromNumber || call.from;
    if (phone) {
      if (!acc[phone]) {
        acc[phone] = [];
      }
      acc[phone].push(call);
    }
    return acc;
  }, {});

  // Calculate new vs repeat for the selected period
  let newCallers = 0;
  let repeatCallers = 0;

  uniquePhones.forEach((phone: string) => {
    const allCallsForPhone = allTimePhoneCalls[phone] || [];
    const callsInPeriod = calls.filter((c: any) => (c.fromNumber || c.from) === phone);
    
    if (callsInPeriod.length > 0) {
      // Check if this phone number's FIRST call ever is in the selected period
      const sortedCalls = [...allCallsForPhone].sort((a: any, b: any) => {
        const dateA = new Date(a.startTime || a.timestamp || a.started_at || a.created_at);
        const dateB = new Date(b.startTime || b.timestamp || b.started_at || b.created_at);
        return dateA.getTime() - dateB.getTime();
      });
      
      const firstCall = sortedCalls[0];
      const firstCallDate = new Date(firstCall.startTime || firstCall.timestamp || firstCall.started_at || firstCall.created_at);
      
      if (dateRange) {
        const periodStart = new Date(dateRange.startDate);
        const periodEnd = new Date(dateRange.endDate);
        
        // If first call is in this period, they're a new caller
        if (firstCallDate >= periodStart && firstCallDate <= periodEnd) {
          newCallers++;
        } else if (allCallsForPhone.length > 1) {
          // If they've called before this period and called again in this period, they're a repeat caller
          repeatCallers++;
        }
      } else {
        // For "Total" period, use simple logic based on call count
        if (allCallsForPhone.length === 1) {
          newCallers++;
        } else {
          repeatCallers++;
        }
      }
    }
  });

  const repeatPercentage = uniqueCallers > 0 ? (repeatCallers / uniqueCallers) * 100 : 0;

  // Debug: Log caller metrics
  console.log('👥 CallsAnalytics - Caller Metrics:', {
    totalCalls,
    transferred,
    uniqueCallers,
    newCallers,
    repeatCallers,
    dateRange,
    periodHasCalls: calls.length,
    allTimeCalls: conversations.length
  });

  // Calculate unique flagged callers (unique phone numbers with VIP or flagged calls)
  const flaggedCallersSet = new Set<string>();
  calls.forEach((call: any) => {
    if (call.vip === true || call.flagged === true) {
      const phone = call.fromNumber || call.from || call.callerPhone || call.caller_phone || call.from_number;
      if (phone) {
        flaggedCallersSet.add(phone);
      }
    }
  });
  const flaggedCallers = flaggedCallersSet.size;

  // Debug: Log flagged callers
  console.log('🚩 CallsAnalytics - Flagged Callers:', {
    flaggedCallers,
    totalCallsChecked: calls.length,
    sampleVIPFlags: calls.slice(0, 3).map((c: any) => ({ vip: c.vip, flagged: c.flagged, phone: c.callerPhone }))
  });

  // Calculate industry-specific call type counts from call history
  const callTypeCounts = useMemo(() => {
    // Get call type using the same logic as CallHistoryTable
    const getCallType = (call: any) => {
      // Determine call type from multiple possible fields
      let callType = 'other';

      if (call.callType) {
        callType = call.callType.toLowerCase();
      } else if (call.interactionType) {
        callType = call.interactionType.toLowerCase();
      } else {
        const purpose = (call.intent || call.purpose || call.call_analysis?.intent || '').toLowerCase();

        // Try to match with industry call types based on purpose
        for (const industryCallType of industryCallTypes) {
          const typeId = industryCallType.id.toLowerCase();
          const typeLabel = industryCallType.label.toLowerCase();

          if (purpose.includes(typeId) || purpose.includes(typeLabel)) {
            callType = industryCallType.id;
            break;
          }
        }

        // If no match found from purpose, keep as 'other'
      }

      // Normalize the call type to match industry call types
      let normalizedType = 'other';
      for (const industryCallType of industryCallTypes) {
        const typeId = industryCallType.id.toLowerCase();
        const typeLabel = industryCallType.label.toLowerCase();

        if (callType.includes(typeId) || callType.includes(typeLabel) || callType === typeId) {
          normalizedType = industryCallType.id;
          break;
        }
      }

      return normalizedType;
    };

    const counts: Record<string, number> = {};

    // Initialize counts for each industry call type
    industryCallTypes.forEach(callType => {
      counts[callType.id] = 0;
    });

    if (!Array.isArray(calls)) return counts;

    calls.forEach((call: any) => {
      const callType = getCallType(call);
      if (counts[callType] !== undefined) {
        counts[callType]++;
      }
    });

    return counts;
  }, [calls, industryCallTypes]);

  // Get icon and color classes for call type
  const getCallTypeIcon = (callTypeId: string) => {
    switch (callTypeId) {
      case 'order':
        return {
          Icon: ShoppingBag,
          bgColor: 'bg-green-900/20',
          textColor: 'text-green-400'
        };
      case 'reservation':
        return {
          Icon: Calendar,
          bgColor: 'bg-purple-900/20',
          textColor: 'text-purple-400'
        };
      case 'delivery':
        return {
          Icon: Truck,
          bgColor: 'bg-blue-900/20',
          textColor: 'text-blue-400'
        };
      case 'catering':
        return {
          Icon: UtensilsCrossed,
          bgColor: 'bg-orange-900/20',
          textColor: 'text-orange-400'
        };
      case 'appointment':
        return {
          Icon: Calendar,
          bgColor: 'bg-purple-900/20',
          textColor: 'text-purple-400'
        };
      case 'service':
        return {
          Icon: Bot,
          bgColor: 'bg-cyan-900/20',
          textColor: 'text-cyan-400'
        };
      case 'faq':
        return {
          Icon: HelpCircle,
          bgColor: 'bg-yellow-900/20',
          textColor: 'text-yellow-400'
        };
      case 'emergency':
        return {
          Icon: Phone,
          bgColor: 'bg-red-900/20',
          textColor: 'text-red-400'
        };
      case 'estimate':
        return {
          Icon: CheckCircle,
          bgColor: 'bg-cyan-900/20',
          textColor: 'text-cyan-400'
        };
      case 'membership':
        return {
          Icon: Users,
          bgColor: 'bg-blue-900/20',
          textColor: 'text-blue-400'
        };
      case 'session':
      case 'class':
        return {
          Icon: Users,
          bgColor: 'bg-purple-900/20',
          textColor: 'text-purple-400'
        };
      case 'showing':
        return {
          Icon: Bot,
          bgColor: 'bg-blue-900/20',
          textColor: 'text-blue-400'
        };
      case 'maintenance':
        return {
          Icon: Bot,
          bgColor: 'bg-orange-900/20',
          textColor: 'text-orange-400'
        };
      case 'leasing':
        return {
          Icon: CheckCircle,
          bgColor: 'bg-purple-900/20',
          textColor: 'text-purple-400'
        };
      case 'treatment':
      case 'procedure':
        return {
          Icon: Bot,
          bgColor: 'bg-cyan-900/20',
          textColor: 'text-cyan-400'
        };
      case 'prescription':
        return {
          Icon: CheckCircle,
          bgColor: 'bg-blue-900/20',
          textColor: 'text-blue-400'
        };
      case 'booking':
        return {
          Icon: Calendar,
          bgColor: 'bg-purple-900/20',
          textColor: 'text-purple-400'
        };
      case 'event':
        return {
          Icon: Calendar,
          bgColor: 'bg-orange-900/20',
          textColor: 'text-orange-400'
        };
      case 'enrollment':
        return {
          Icon: Users,
          bgColor: 'bg-blue-900/20',
          textColor: 'text-blue-400'
        };
      case 'scheduling':
        return {
          Icon: Clock,
          bgColor: 'bg-purple-900/20',
          textColor: 'text-purple-400'
        };
      case 'other':
      default:
        return {
          Icon: Boxes,
          bgColor: 'bg-gray-700/20',
          textColor: 'text-gray-400'
        };
    }
  };

  // Utility functions
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'Unknown';
    if (phone.startsWith('+1')) {
      const cleaned = phone.slice(2);
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const maskPhoneNumber = (phone: string) => {
    if (!phone) return '***-***-****';
    const formatted = formatPhoneNumber(phone);
    // Mask middle digits: (555) 123-4567 -> (555) ***-4567
    return formatted.replace(/(\d{3})\) (\d{3})-/, '$1) ***-');
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome.toLowerCase()) {
      case 'order':
        return 'bg-green-900/20 text-green-400 border-green-800';
      case 'reservation':
        return 'bg-blue-900/20 text-blue-400 border-blue-800';
      case 'info_request':
      case 'inquiry':
        return 'bg-purple-900/20 text-purple-400 border-purple-800';
      case 'missed':
        return 'bg-red-900/20 text-red-400 border-red-800';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const getOutcomeLabel = (outcome: string) => {
    return outcome.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Period Selector - Mobile only */}
      <div className="flex justify-end lg:hidden">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48 bg-transparent border-gray-800 text-gray-300">
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

      {/* Call Volume Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calls */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Calls</p>
                <p className="text-2xl font-bold text-white">{totalCalls}</p>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-full">
                <Phone className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transferred */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Transferred</p>
                <p className="text-2xl font-bold text-white">{transferred}</p>
              </div>
              <div className="p-3 bg-orange-900/20 rounded-full">
                <Users className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Call Duration */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Call Duration</p>
                <p className="text-2xl font-bold text-white">{formatDuration(avgDuration)}</p>
              </div>
              <div className="p-3 bg-purple-900/20 rounded-full">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Engagement Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Flagged Callers */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Flagged Callers</p>
                <p className="text-2xl font-bold text-white">{flaggedCallers}</p>
              </div>
              <div className="p-3 bg-yellow-900/20 rounded-full">
                <Flag className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Repeat Callers */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Repeat Callers</p>
                <p className="text-2xl font-bold text-white">{repeatCallers}</p>
              </div>
              <div className="p-3 bg-green-900/20 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Callers */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">New Callers</p>
                <p className="text-2xl font-bold text-white">{newCallers}</p>
              </div>
              <div className="p-3 bg-purple-900/20 rounded-full">
                <User className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Type Breakdown - Industry-Specific */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {industryCallTypes.map((callType) => {
          const { Icon, bgColor, textColor } = getCallTypeIcon(callType.id);
          const count = callTypeCounts[callType.id] || 0;
          const percentage = totalCalls > 0 ? ((count / totalCalls) * 100).toFixed(1) : 0;

          return (
            <Card key={callType.id} className="premium-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{callType.label}</p>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {percentage}% of total
                    </p>
                  </div>
                  <div className={`p-3 ${bgColor} rounded-full`}>
                    <Icon className={`h-6 w-6 ${textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
