import React, { useEffect, useState, useRef, useMemo, useTransition, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, addViewAsUserIdParam } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from 'dompurify';
import { useNotifications, useUnreadCount, useMarkNotificationsSeen } from '@/hooks/useNotifications';
import { NotificationList } from '@/components/NotificationList';
import { NotificationSettingsModal } from '@/components/NotificationSettingsModal';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SyntaxHighlightedTextarea } from "@/components/SyntaxHighlightedTextarea";
import { ChevronDown, ChevronRight, Settings, LogOut, User, Menu, X, Home, Phone, BarChart3, CreditCard, Cog, Moon, Sun, Bell, TrendingUp, Calendar, Users, Mail, Shield, Clock, Bot, ShoppingBag, Lock, UserPlus, Copy, MoreVertical, Edit, Trash2, Key, Globe, Eye, EyeOff, AlertTriangle, Store, Plus, Upload, FileText, Type, Check } from "lucide-react";
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";
import { OVERAGE_RATE_PER_MINUTE, PLAN_DETAILS, USAGE_WARNING_THRESHOLD } from "@shared/constants";
import { RETELL_FUNCTIONS_BY_INDUSTRY } from "@shared/retellFunctionsConfig";
import CallHistoryTable from "@/components/CallHistoryTable";
import { LiveCallsDisplay } from "@/components/LiveCallsDisplay";
import CustomerContactsTable from "@/components/CustomerContactsTable";
import TestAnalytics from "@/components/analytics/TestAnalytics";
import CallsAnalytics from "@/components/analytics/CallsAnalytics";
import CustomersAnalytics from "@/components/analytics/CustomersAnalytics";
import PerformanceAnalytics from "@/components/analytics/PerformanceAnalytics";
import { useInvitationHandler } from "@/hooks/useInvitationHandler";
import { IntegrationsTab } from "@/components/integrations";
import { InvitationSignupModal } from "@/components/InvitationSignupModal";
import { InvitationLoginModal } from "@/components/InvitationLoginModal";
import { useUserIndustry } from "@/hooks/useUserIndustry";
import { getMetricCards } from "@/lib/industryHelpers";
import type { Industry } from "@shared/industryConfig";
import { getCustomFunctionsForIndustry } from "@shared/retellFunctionsConfig";
import { MembersTable } from "@/components/team/MembersTable";
import { VoicebotTable } from "@/components/voicebots/VoicebotTable";
import { FunctionEditorPanel } from "@/components/FunctionEditorPanel";
import { getNativeActionsForCategory, filterNativeActionsByIndustry, type NativeActionTemplate } from "@/components/nativeActionTemplates";
import { ConversationFlowBuilder } from "@/components/ConversationFlowBuilder";
import BillingPage from "@/components/BillingPage";
import { MessagingPage } from "@/components/messaging/MessagingPage";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { HIPAA_INDUSTRIES } from "@shared/conversationFlowTemplates";
import { SetupCompletionModal } from "@/components/SetupCompletionModal";

// Text File Viewer Component
const TextFileViewer = ({ file }: { file: File }) => {
  const [content, setContent] = useState<string>('Loading...');

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setContent(e.target?.result as string || 'Error loading file');
    };
    reader.onerror = () => {
      setContent('Error loading file');
    };
    reader.readAsText(file);
  }, [file]);

  return <>{content}</>;
};

// PDF Viewer Component - Renders PDF as HTML canvas elements for seamless parent page scrolling
const PDFViewer = ({ file }: { file: File }) => {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create object URL for the file
        const url = URL.createObjectURL(file);
        
        // For now, use a simple image-based approach
        // In production, you'd use a library like pdf.js or react-pdf
        // Since we want seamless scrolling, we'll render each page as an image
        
        // Create a simple fallback: render the PDF as a single embedded image
        // This is a simplified approach - for production, use PDF.js to render pages as canvas
        const img = new Image();
        img.onload = () => {
          setPageImages([url]);
          setLoading(false);
        };
        img.onerror = () => {
          setError('Failed to load PDF. Please try a different file.');
          setLoading(false);
        };
        img.src = url;
        
      } catch (err) {
        setError('Error loading PDF file');
        setLoading(false);
      }
    };

    loadPDF();
    
    return () => {
      // Cleanup object URLs
      pageImages.forEach(url => URL.revokeObjectURL(url));
    };
  }, [file]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <p className="text-red-400">{error}</p>
          <p className="text-gray-500 text-sm mt-2">The file will be processed when saved</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* PDF pages rendered as images for seamless scrolling */}
      <div className="bg-gray-800 rounded p-4">
        <embed
          src={URL.createObjectURL(file)}
          type="application/pdf"
          className="w-full"
          style={{ minHeight: '800px', border: 'none' }}
        />
      </div>
      <div className="text-xs text-gray-500 text-center">
        PDF preview • The file will be fully processed when saved
      </div>
    </div>
  );
};

// Phone number formatting utilities
const formatPhoneForDisplay = (phone: string | null | undefined): string => {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it starts with 1, remove it (US country code)
  const withoutCountryCode = digits.startsWith('1') ? digits.slice(1) : digits;
  
  // Format as (XXX) XXX-XXXX
  if (withoutCountryCode.length === 10) {
    return `(${withoutCountryCode.slice(0, 3)}) ${withoutCountryCode.slice(3, 6)}-${withoutCountryCode.slice(6, 10)}`;
  }
  
  // Return original if not 10 digits
  return phone;
};

const formatPhoneForStorage = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it's 11 digits and starts with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it already has +, return as is
  if (phone.startsWith('+')) {
    return phone.replace(/\D/g, (match, index) => index === 0 ? match : '');
  }
  
  // Otherwise add + and return
  return `+${digits}`;
};

// Get role-based avatar styling (matches Members table)
const getRoleAvatarStyle = (role: string) => {
  const roleStyles: Record<string, { from: string; to: string; icon: string }> = {
    owner: { from: 'from-yellow-500', to: 'to-yellow-600', icon: 'fas fa-crown' },
    manager: { from: 'from-purple-500', to: 'to-purple-600', icon: 'fas fa-user-tie' },
    employee: { from: 'from-blue-500', to: 'to-blue-600', icon: 'fas fa-user' },
    custom: { from: 'from-gray-500', to: 'to-gray-600', icon: 'fas fa-cog' },
  };

  return roleStyles[role] || roleStyles.employee;
};

// Component for account avatar with progress ring
const AccountAvatarWithProgress = ({
  role,
  minutesUsed,
  minutesLimit
}: {
  role: string;
  minutesUsed: number;
  minutesLimit: number;
}) => {
  const roleStyle = getRoleAvatarStyle(role);
  const usagePercent = minutesLimit > 0 ? Math.min((minutesUsed / minutesLimit) * 100, 150) : 0;
  const displayPercent = minutesLimit > 0 ? Math.round((minutesUsed / minutesLimit) * 100) : 0;

  const getRingColor = () => {
    if (usagePercent >= 100) return '#ef4444';
    if (usagePercent >= 80) return '#f59e0b';
    return '#10b981';
  };

  const ringColor = getRingColor();

  const SIZE = 40;
  const BORDER_WIDTH = 2;
  const progress = Math.min(usagePercent, 100);

  return (
    <div className="relative group">
      {/* Progress ring wrapper with conic-gradient */}
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: SIZE,
          height: SIZE,
          background: `conic-gradient(${ringColor} 0% ${progress}%, #374151 ${progress}% 100%)`,
          transition: 'background 0.3s ease',
          position: 'relative',
        }}
      >
        {/* Avatar with border creating the "cutout" gap effect */}
        <div
          className="group-hover:opacity-0 transition-opacity duration-200 rounded-full flex items-center justify-center"
          style={{
            width: '88%',
            height: '88%',
            border: `${BORDER_WIDTH}px solid rgb(17, 24, 39)`, // matches bg-gray-900
            position: 'relative',
          }}
        >
          <div
            className={`bg-gradient-to-br ${roleStyle.from} ${roleStyle.to} rounded-full flex items-center justify-center text-white w-full h-full`}
          >
            <i className={roleStyle.icon} style={{ fontSize: SIZE * 0.35 }} />
          </div>
        </div>

        {/* Hover percentage overlay */}
        <div
          className="absolute rounded-full flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-900"
          style={{
            width: '88%',
            height: '88%',
            fontSize: 9,
            border: `${BORDER_WIDTH}px solid rgb(17, 24, 39)`,
          }}
        >
          {displayPercent}%
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading, authError } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's industry for industry-specific UI
  const { data: userIndustryData } = useUserIndustry({ enabled: isAuthenticated });
  const userIndustry: Industry = (userIndustryData?.industry as Industry) || 'restaurant';

  // Check if current user is a team member and get the owner's ID
  const { data: membershipData } = useQuery({
    queryKey: ['/api/team/my-membership'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch user's organizations
  const { data: organizationsData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['/api/organizations'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch current organization
  const { data: currentOrgData } = useQuery({
    queryKey: ['/api/organizations/current'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch team members to get current user's role and avatar styling
  const { data: teamMembersData, isLoading: isLoadingTeamMembers } = useQuery({
    queryKey: ['/api/team/members'],
    enabled: isAuthenticated,
    staleTime: 60000,
    placeholderData: { members: [] },
  });

  // Get current user's role from team members
  const currentUserMember = teamMembersData?.members?.find((m: any) => m.isCurrentUser);
  const currentUserRole = currentUserMember?.role || 'employee';

  // Switch organization mutation
  const switchOrganizationMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      await apiRequest('/api/organizations/switch', {
        method: 'POST',
        body: JSON.stringify({ organizationId }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      // Refresh all queries after switching organizations
      queryClient.invalidateQueries();
      toast({
        title: "Organization Switched",
        description: "You've successfully switched to a different organization",
      });
      // Reload page to ensure all data reflects the new organization
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Switch Failed",
        description: error.message || "Failed to switch organization",
        variant: "destructive",
      });
    },
  });

  // Use owner's ID if user is a team member, otherwise use their own ID
  const activeUserId = membershipData?.isTeamMember ? membershipData.ownerId : user?.id;

  // Get user permissions (team members have role-based permissions, owners have full access)
  const userPermissions = membershipData?.permissions || {
    home: { enabled: true },
    calls: { enabled: true, history: true, contacts: true },
    analytics: { enabled: true, calls: true, services: true },
    settings: { enabled: true, agents: true, memory: true, integrations: true, members: true, account: true }
  };

  // Helper function to check if user has permission for a feature
  const hasPermission = (feature: string): boolean => {
    const parts = feature.split('.');
    if (parts.length === 1) {
      // Top-level permission (e.g., "home", "calls")
      return (userPermissions as any)[parts[0]]?.enabled || false;
    }
    if (parts.length === 2) {
      // Sub-permission (e.g., "calls.history", "settings.agents")
      const [section, subsection] = parts;
      const sectionPerms = (userPermissions as any)[section];
      if (!sectionPerms || !sectionPerms.enabled) return false;
      return sectionPerms[subsection] || false;
    }
    return false;
  };

  // Store the activeUserId in localStorage so all queries can use it
  useEffect(() => {
    if (membershipData) {
      if (membershipData.isTeamMember && membershipData.ownerId) {
        // User is a team member, store owner's ID
        localStorage.setItem('viewingOwnerId', membershipData.ownerId);
      } else {
        // User is not a team member, clear the stored owner ID
        localStorage.removeItem('viewingOwnerId');
      }
    }
  }, [membershipData]);

  // Fetch subscription to check for one-time setup notification
  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscription/current'],
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  useEffect(() => {
    const notification = (subscriptionData as any)?.subscription?.setupNotification;
    if (notification) {
      // If the notification is a JSON gap_analysis payload, it was already consumed by
      // LoadingDashboard via sessionStorage → MVO modal. Just clear it silently.
      let isGapPayload = false;
      try {
        const parsed = JSON.parse(notification);
        isGapPayload = parsed?.type === 'gap_analysis';
      } catch {
        // plain-text notification — show as toast
      }

      if (!isGapPayload) {
        toast({
          title: "Your AI agent is ready",
          description: notification,
          duration: 8000,
        });
      }
      // Clear the notification so it only shows once
      apiRequest('POST', '/api/subscription/clear-notification').catch(() => {});
    }
  }, [subscriptionData]);

  // Check for invitation modal flags - initialize from sessionStorage immediately
  const [showSignupModal, setShowSignupModal] = useState(() => {
    return sessionStorage.getItem('showSignupModal') === 'true';
  });
  const [showLoginModal, setShowLoginModal] = useState(() => {
    return sessionStorage.getItem('showLoginModal') === 'true';
  });
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    return sessionStorage.getItem('inviteToken');
  });

  useEffect(() => {
    // Check if we need to show signup or login modal for invitation
    const signupFlag = sessionStorage.getItem('showSignupModal');
    const loginFlag = sessionStorage.getItem('showLoginModal');
    const token = sessionStorage.getItem('inviteToken');

    // Only show modals if user is not authenticated and invitation token exists
    if (token && !isAuthenticated) {
      setInviteToken(token);
      if (signupFlag === 'true') {
        setShowSignupModal(true);
      } else if (loginFlag === 'true') {
        setShowLoginModal(true);
      }
    }
  }, [isAuthenticated]);

  // Persist modal state on every render to handle page refreshes
  useEffect(() => {
    const token = sessionStorage.getItem('inviteToken');
    const signupFlag = sessionStorage.getItem('showSignupModal');
    const loginFlag = sessionStorage.getItem('showLoginModal');

    if (token && !isAuthenticated) {
      setInviteToken(token);
      // Re-show modals if they were active before refresh
      if (signupFlag === 'true' && !showSignupModal) {
        setShowSignupModal(true);
      } else if (loginFlag === 'true' && !showLoginModal) {
        setShowLoginModal(true);
      }
    }
  }, []); // Run only once on mount to restore modal state after refresh

  // Handle invitation acceptance after authentication
  useInvitationHandler(isAuthenticated);

  // Handle invitation acceptance from Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteAccepted = params.get('inviteAccepted');
    const ownerId = params.get('ownerId');

    if (inviteAccepted === 'true' && ownerId && isAuthenticated) {
      // Store the owner ID to view their dashboard
      localStorage.setItem('viewingOwnerId', ownerId);

      toast({
        title: "Welcome to the team!",
        description: "You've successfully joined the team via Google.",
      });

      // Clean up URL params
      window.history.replaceState({}, '', '/dashboard');

      // Reload to show owner's dashboard
      window.location.reload();
    }
  }, [isAuthenticated, toast]);

  // Handle URL parameters for tab/subtab navigation and OAuth callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const subtab = params.get('subtab');
    const success = params.get('success');
    const error = params.get('error');
    const agentIdFromUrl = params.get('agentId');

    // Handle agent selection from URL
    if (agentIdFromUrl) {
      setSelectedAgentId(agentIdFromUrl);
    }

    // Handle tab navigation from URL
    if (tab && ['home', 'calls', 'billing', 'settings', 'integrations', 'agent', 'memory', 'contacts', 'messaging', 'account', 'voicebots', 'members'].includes(tab)) {
      setActiveTab(tab as 'home'|'calls'|'members'|'billing'|'agent'|'memory'|'integrations'|'contacts'|'messaging'|'account'|'voicebots');
    }

    // Handle subtab navigation from URL
    if (subtab && tab === 'settings') {
      setActiveSubtab(prev => ({ ...prev, settings: subtab }));
    } else if (subtab && tab === 'calls') {
      setActiveSubtab(prev => ({ ...prev, calls: subtab }));
    }

    // Handle Google Calendar OAuth success
    if (success === 'google_calendar_connected') {
      toast({
        title: "Google Calendar Connected!",
        description: "Your Google Calendar has been successfully integrated and tested. Reservations will now sync automatically.",
      });

      // Invalidate agent-specific integration queries to refresh the list
      if (agentIdFromUrl) {
        queryClient.invalidateQueries({ queryKey: ['/api/integrations/custom', agentIdFromUrl] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/custom'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business-settings/integrations'] });

      // Clean up URL params but keep agentId and tab=integrations
      const cleanUrl = agentIdFromUrl
        ? `/dashboard?tab=integrations&agentId=${agentIdFromUrl}`
        : '/dashboard?tab=integrations';
      window.history.replaceState({}, '', cleanUrl);
    }

    // Handle Stripe Checkout success return
    const checkout = params.get('checkout');
    const sessionId = params.get('session_id');
    if (checkout === 'success' && sessionId) {
      // Sync subscription from Stripe then refetch all data
      apiRequest('POST', '/api/billing/sync-checkout', { sessionId })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/receptionists'] });
          queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          toast({
            title: "Subscription Activated!",
            description: "Your plan is now active. Welcome aboard!",
          });
        })
        .catch(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/receptionists'] });
          queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
        });
      window.history.replaceState({}, '', '/dashboard?tab=billing');
    }

    // Handle OAuth errors
    if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: "Failed to connect Google Calendar. Please try again.",
        token_exchange_failed: "Failed to exchange authorization code. Please try again.",
        calendar_fetch_failed: "Failed to fetch your calendar. Please check permissions.",
        no_calendar_found: "No calendar found in your Google account.",
        not_authenticated: "You must be logged in to connect integrations.",
        agent_id_required: "Agent selection is required to connect Google Calendar."
      };

      toast({
        title: "Integration Error",
        description: errorMessages[error] || "An error occurred while connecting your integration.",
        variant: "destructive"
      });

      // Clean up URL params but keep agentId and tab=integrations
      const cleanUrl = agentIdFromUrl
        ? `/dashboard?tab=integrations&agentId=${agentIdFromUrl}`
        : '/dashboard?tab=integrations';
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [toast, queryClient]);

  // Close location suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#location-input') && !target.closest('[data-suggestion-item]')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedPeriod, setSelectedPeriod] = useState("This Month");
  const [sortBy, setSortBy] = useState("date");
  // Initialize activeTab from URL parameter or default to 'home'
  const [activeTab, setActiveTab] = useState<'home'|'calls'|'members'|'billing'|'agent'|'memory'|'integrations'|'contacts'|'messaging'|'account'|'voicebots'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['home', 'calls', 'billing', 'agent', 'memory', 'integrations', 'contacts', 'messaging', 'account', 'voicebots', 'members'].includes(tab)) {
      return tab as 'home'|'calls'|'members'|'billing'|'agent'|'memory'|'integrations'|'contacts'|'messaging'|'account'|'voicebots';
    }
    return 'home';
  });
  // useTransition defers the heavy re-render so sidebar clicks feel instant
  const [, startTabTransition] = useTransition();
  const switchTab = useCallback((tab: 'home'|'calls'|'members'|'billing'|'agent'|'memory'|'integrations'|'contacts'|'messaging'|'account'|'voicebots') => {
    startTabTransition(() => setActiveTab(tab));
  }, []);
  const [timeFilter, setTimeFilter] = useState<'today'|'week'|'month'>('today');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const [activeSubtab, setActiveSubtab] = useState({
    calls: 'history'
  });
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isScrolled, setIsScrolled] = useState(false);

  // Notifications
  const { data: notificationsData } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markSeenMutation = useMarkNotificationsSeen();
  const [notifFilter, setNotifFilter] = useState<'unread' | 'all'>('unread');
  const snapshotUnreadCountRef = useRef(0);
  const [showNotifSettingsModal, setShowNotifSettingsModal] = useState(false);

  const [openCallId, setOpenCallId] = useState<string | null>(null);

  const handleNotificationClick = (notification: any) => {
    if (notification.actionUrl) {
      if (notification.actionUrl.includes('/billing')) switchTab('billing');
      else if (notification.actionUrl.includes('/account')) switchTab('account');
      else if (notification.actionUrl.includes('/calls')) switchTab('calls');
    }
    setIsNotificationsDropdownOpen(false);
  };

  const handleViewMoreCall = (callId: string) => {
    setOpenCallId(callId);
    switchTab('calls');
    setIsNotificationsDropdownOpen(false);
  };

  const handleUnflagCall = async (callId: string, agentId: string) => {
    try {
      const response = await fetch(`/api/restaurant/${agentId}/calls/${callId}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ flagged: false }),
      });
      if (!response.ok) throw new Error('Failed to unflag');
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedAgentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/call-stats', selectedAgentId] });
    } catch {
      // silent — the flag will stay if it fails
    }
  };

  // Edit states for account settings
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editNameValue, setEditNameValue] = useState(user?.name || '');
  const [editEmailValue, setEditEmailValue] = useState(user?.email || '');
  const [editPhoneValue, setEditPhoneValue] = useState(user?.phoneNumber || '');
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);

  // Transfer phone settings state
  const [transferPhoneNumber, setTransferPhoneNumber] = useState('');
  const [enableTransfer, setEnableTransfer] = useState(true);
  const [isLoadingTransferSettings, setIsLoadingTransferSettings] = useState(false);

  // Members management state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteAssignedAgents, setInviteAssignedAgents] = useState<string[]>([]);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [newRole, setNewRole] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Contact Us modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Messaging state - for switching from calls to messaging with selected contact
  const [selectedMessagingPhone, setSelectedMessagingPhone] = useState<string | null>(null);

  // Agent management state - persist selected agent across page refreshes
  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => {
    const saved = localStorage.getItem('selectedAgentId');
    return saved || '';
  });
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentDropdownPointerMoved, setAgentDropdownPointerMoved] = useState(false);
  const [isMobileAgentDropdownOpen, setIsMobileAgentDropdownOpen] = useState(false);
  const [mobileAgentDropdownPointerMoved, setMobileAgentDropdownPointerMoved] = useState(false);
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [agentOnboardingStep, setAgentOnboardingStep] = useState<'extraction' | 'business-info'>('extraction');
  const [extractionMethod, setExtractionMethod] = useState<'location' | 'website'>('location');
  const [isExtracting, setIsExtracting] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [websiteInput, setWebsiteInput] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newAgentForm, setNewAgentForm] = useState({
    businessName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phoneNumber: '',
    website: '',
    businessInfo: ''
  });
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  
  // Business info suggestion states
  const [businessInfoSuggestions, setBusinessInfoSuggestions] = useState<string[]>([]);
  const [showBusinessInfoSuggestions, setShowBusinessInfoSuggestions] = useState(false);
  const [businessInfoSuggestionPosition, setBusinessInfoSuggestionPosition] = useState({ top: 0, left: 0 });
  const [businessInfoCursorPosition, setBusinessInfoCursorPosition] = useState(0);
  const businessInfoTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Update document title based on active tab
  useEffect(() => {
    const tabTitles: Record<string, string> = {
      home: 'Home',
      calls: 'Calls',
      messaging: 'Messaging',
      contacts: 'Contacts',
      agent: 'Flow',
      memory: 'Memory',
      integrations: 'Integrations',
      analytics: 'Analytics',
      members: 'Members',
      voicebots: 'Voicebots',
      billing: 'Billing',
      account: 'Account'
    };

    const title = tabTitles[activeTab] || 'Dashboard';
    document.title = `${title} | VoiceBot`;
  }, [activeTab]);

  // Update URL when active tab changes (for state persistence on refresh)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentTab = params.get('tab');

    // Only update URL if the tab has actually changed
    if (currentTab !== activeTab) {
      // Preserve other URL parameters (like agentId, subtab, etc.)
      params.set('tab', activeTab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  }, [activeTab]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['home', 'calls', 'billing', 'agent', 'memory', 'integrations', 'contacts', 'messaging', 'account', 'voicebots', 'members'].includes(tab)) {
        setActiveTab(tab as 'home'|'calls'|'members'|'billing'|'agent'|'memory'|'integrations'|'contacts'|'messaging'|'account'|'voicebots');
      } else {
        setActiveTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auto-fill https:// when website extraction method is selected
  useEffect(() => {
    if (extractionMethod === 'website' && !websiteInput) {
      setWebsiteInput('https://');
    }
  }, [extractionMethod, websiteInput]);

  // Load transfer settings on mount
  useEffect(() => {
    loadTransferSettings();
  }, []);

  // Suggestion categories for business info textarea
  const businessInfoSuggestionCategories = {
    basic: [
      'Business Name: ',
      'Address: ',
      'Phone: ',
      'Website: ',
      'Email: ',
    ],
    hours: [
      'Hours: Mon-Fri 9am-5pm, Sat-Sun Closed',
      'Hours: Mon-Sun 24/7',
      'Hours: Mon-Fri 11am-10pm, Sat-Sun 12pm-11pm',
    ],
    services: [
      'Services: Dine-in, Takeout, Delivery',
      'Services: ',
      'Delivery: Available within 10 miles',
      'Catering: Available for events',
    ],
    description: [
      'Description: ',
      'Menu: ',
      'Specialties: ',
    ],
  };

  // Function legend collapsed state
  const [collapsedFunctionCategories, setCollapsedFunctionCategories] = useState<Record<string, boolean>>({});

  // Custom permissions modal state
  const [showCustomPermissionsModal, setShowCustomPermissionsModal] = useState(false);
  const [customPermissionsSource, setCustomPermissionsSource] = useState<'invite' | 'edit' | null>(null);
  const [customPermissions, setCustomPermissions] = useState({
    home: { enabled: false },
    calls: {
      enabled: false,
      history: false,
      contacts: false
    },
    settings: {
      enabled: false,
      agents: false,
      memory: false,
      integrations: false,
      members: false,
      account: false
    }
  });

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isLoadingBillingPortal, setIsLoadingBillingPortal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Refs for auto-focusing inputs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Webhook testing state
  const [isTestingWebhooks, setIsTestingWebhooks] = useState(false);
  const [webhookTestResults, setWebhookTestResults] = useState<Array<{
    endpoint: string;
    success: boolean;
    message: string;
    timestamp: string;
    response?: any;
  }>>([]);

  // Integration card collapse state
  const [squareCollapsed, setSquareCollapsed] = useState(true);
  const [toastCollapsed, setToastCollapsed] = useState(true);
  const [cloverCollapsed, setCloverCollapsed] = useState(true);
  const [googleCollapsed, setGoogleCollapsed] = useState(true);

  // Add new integration modal state
  const [showAddIntegrationModal, setShowAddIntegrationModal] = useState(false);
  const [showConfigureIntegrationModal, setShowConfigureIntegrationModal] = useState(false);
  const [editingIntegrationId, setEditingIntegrationId] = useState<string | null>(null);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [integrationToRemove, setIntegrationToRemove] = useState<{ id: string; name: string } | null>(null);
  const [newIntegrationForm, setNewIntegrationForm] = useState({
    // Basic Info
    name: '',
    description: '',
    type: '', // Integration type (e.g., 'POS', 'Calendar', 'CRM')
    customFunction: '', // Retell AI custom function that triggers this integration

    // Authentication
    apiKey: '',
    applicationId: '',
    clientSecret: '',
    webhookSecret: '',

    // Server Configuration
    apiEndpointUrl: '',
    method: 'POST' as 'GET' | 'POST' | 'PUT' | 'DELETE',
    timeout: 10000,
    webhookUrl: '',

    // Headers
    authorization: '',
    contentType: 'application/json',
    customHeaders: [] as Array<{ key: string; value: string }>,

    // Query Parameters
    locationId: '',
    timeZone: '',
    customQueryParams: [] as Array<{ key: string; value: string }>,

    // Payload / Body
    jsonPayloadSchema: '',

    // Response Variables
    responseVariables: '',

    // Security
    hmacSignature: '',

    // Testing
    sandboxMode: false,

    // OAuth Integration Flag
    isOAuthIntegration: false,

    // Trigger Functions - which Retell AI custom functions should trigger this integration
    triggerFunctions: [] as string[],

    // Agent ID - associate integration with specific agent
    agentId: undefined as string | undefined
  });

  // Custom integrations state
  type CustomIntegration = {
    id: string;
    name: string;
    description: string;
    apiKey: string;
    applicationId: string;
    clientSecret: string;
    webhookSecret: string;
    apiEndpointUrl: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    timeout: number;
    webhookUrl: string;
    authorization: string;
    contentType: string;
    customHeaders: Array<{ key: string; value: string }>;
    locationId: string;
    timeZone: string;
    customQueryParams: Array<{ key: string; value: string }>;
    jsonPayloadSchema: string;
    responseVariables: string;
    hmacSignature: string;
    sandboxMode: boolean;
    agentId?: string;
    type?: string;
    calendarName?: string;
    connectedAt?: string;
    serverType?: string;
    serverUrl?: string;
  };

  const [customIntegrations, setCustomIntegrations] = useState<CustomIntegration[]>([]);
  const [originalCustomIntegrations, setOriginalCustomIntegrations] = useState<CustomIntegration[] | null>(null);

  // Greeting form state
  const [greetingForm, setGreetingForm] = useState({
    businessHours: '',
    afterHours: ''
  });

  // Behavior form state
  const [behaviorForm, setBehaviorForm] = useState({
    globalPrompt: '',
    businessHoursGreeting: '',
    afterHoursGreeting: ''
  });

  // Agent general prompt state (for agent subtab)
  const [agentGeneralPrompt, setAgentGeneralPrompt] = useState('');
  const [originalAgentGeneralPrompt, setOriginalAgentGeneralPrompt] = useState('');
  const [isLoadingAgentPrompt, setIsLoadingAgentPrompt] = useState(false);
  const [isFunctionEditorOpen, setIsFunctionEditorOpen] = useState(false);
  const [selectedFunctionName, setSelectedFunctionName] = useState<string | null>(null);
  const [isCreateFunctionMode, setIsCreateFunctionMode] = useState(false);
  const [createFunctionCategory, setCreateFunctionCategory] = useState<string | null>(null);
  const [selectedNativeActionKey, setSelectedNativeActionKey] = useState<string | null>(null);
  const [addActionDropdownState, setAddActionDropdownState] = useState<'categories' | 'native-actions'>('categories');
  const [selectedCategoryForNativeActions, setSelectedCategoryForNativeActions] = useState<string | null>(null);
  const [showDeleteFunctionDialog, setShowDeleteFunctionDialog] = useState(false);
  const [functionToDelete, setFunctionToDelete] = useState<string | null>(null);
  const [isDeletingFunction, setIsDeletingFunction] = useState(false);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [hasAgentChanges, setHasAgentChanges] = useState(false);
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [agentSaveStatus, setAgentSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [agentSaveError, setAgentSaveError] = useState<string | null>(null);
  const [agentLastSaveTime, setAgentLastSaveTime] = useState<Date | null>(null);
  const [agentHistory, setAgentHistory] = useState<string[]>([]);
  const [agentHistoryIndex, setAgentHistoryIndex] = useState(-1);
  const selectedFunctionElementRef = useRef<HTMLElement | null>(null);
  const agentSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Autocomplete state for Prompt editor
  const [showPromptAutocomplete, setShowPromptAutocomplete] = useState(false);
  const [promptAutocompleteFilter, setPromptAutocompleteFilter] = useState('');
  const promptAutocompleteFilterRef = useRef(''); // CRITICAL: Ref for immediate filter access
  const [promptAutocompletePosition, setPromptAutocompletePosition] = useState({ top: 0, left: 0 });
  const [promptSlashStartPosition, setPromptSlashStartPosition] = useState<{ node: Node; offset: number } | null>(null);
  const [selectedPromptAutocompleteIndex, setSelectedPromptAutocompleteIndex] = useState(0);

  // Agent title state
  const [agentTitle, setAgentTitle] = useState('');
  const [hasAgentTitleChanges, setHasAgentTitleChanges] = useState(false);
  const agentTitleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTitleRef = useRef<string>('');

  // Memory text state (for memory subtab)
  const [businessInfoText, setBusinessInfoText] = useState('');
  const [originalBusinessInfoText, setOriginalBusinessInfoText] = useState('');
  const [businessInfoTitle, setBusinessInfoTitle] = useState('Business Information');
  const [hasMemoryChanges, setHasMemoryChanges] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memorySaveStatus, setMemorySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [memorySaveError, setMemorySaveError] = useState<string | null>(null);
  const [memoryLastSaveTime, setMemoryLastSaveTime] = useState<Date | null>(null);
  const [memoryHistory, setMemoryHistory] = useState<string[]>([]);
  const [memoryHistoryIndex, setMemoryHistoryIndex] = useState(-1);
  const businessInfoEditableRef = useRef<HTMLDivElement>(null);
  const addTextEditableRef = useRef<HTMLDivElement>(null);
  const textSourceEditableRef = useRef<HTMLDivElement>(null);
  const memorySaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  // Knowledge base sources state (files and URLs)
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [memoryMode, setMemoryMode] = useState<'business' | 'customer'>('business');
  const [uploadMethod, setUploadMethod] = useState<'files' | 'webpages'>('files');
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [addSourceMethod, setAddSourceMethod] = useState<'files' | 'webpages' | null>(null);

  // Mobile modal states (persisted to localStorage)
  const [agentFunctionsModalOpen, setAgentFunctionsModalOpen] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('agentFunctionsModalOpen');
        return saved === 'true';
      }
    } catch (e) {
      console.error('Error reading agentFunctionsModalOpen from localStorage:', e);
    }
    return false;
  });
  const [memoryKnowledgeModalOpen, setMemoryKnowledgeModalOpen] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('memoryKnowledgeModalOpen');
        return saved === 'true';
      }
    } catch (e) {
      console.error('Error reading memoryKnowledgeModalOpen from localStorage:', e);
    }
    return false;
  });

  // Persist mobile modal states to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('agentFunctionsModalOpen', String(agentFunctionsModalOpen));
      }
    } catch (e) {
      console.error('Error saving agentFunctionsModalOpen to localStorage:', e);
    }
  }, [agentFunctionsModalOpen]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('memoryKnowledgeModalOpen', String(memoryKnowledgeModalOpen));
      }
    } catch (e) {
      console.error('Error saving memoryKnowledgeModalOpen to localStorage:', e);
    }
  }, [memoryKnowledgeModalOpen]);

  // Inline editing state for knowledge sources
  const [editingSource, setEditingSource] = useState<'file' | 'webpage' | 'text' | null>(null);
  const [pendingSourceData, setPendingSourceData] = useState<{
    file?: File;
    url?: string;
    autoRefresh?: boolean;
    textContent?: string;
    fileName?: string;
    title?: string;
  }>({});

  // Selected source viewing state
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedSourceData, setSelectedSourceData] = useState<any>(null);
  const [viewingScrapedData, setViewingScrapedData] = useState(false);
  const [scrapedDataContent, setScrapedDataContent] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingSource, setIsDeletingSource] = useState(false);
  const [hasTitleChanges, setHasTitleChanges] = useState(false);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const customerTitleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const customerContentSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Multi-select state for bulk actions
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());

  // Track if changes have been made in editing mode
  const [hasEditingChanges, setHasEditingChanges] = useState(false);

  // Customer memory text editing state
  const [isEditingCustomerMemory, setIsEditingCustomerMemory] = useState(false);
  const [customerMemoryText, setCustomerMemoryText] = useState('');
  const [customerMemoryTitle, setCustomerMemoryTitle] = useState('');
  const [selectedCustomerMemoryId, setSelectedCustomerMemoryId] = useState<string | null>(null);
  const [selectedCustomerMemoryData, setSelectedCustomerMemoryData] = useState<any>(null);
  const [isCustomerMemorySaving, setIsCustomerMemorySaving] = useState(false);
  const customerMemoryEditableRef = useRef<HTMLDivElement>(null);

  // Activity logs modal state
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Sticky save button state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  // Integration form state
  const [integrationForm, setIntegrationForm] = useState({
    platform: 'square', // Default to Square POS
    squareAppId: '',
    squareAccessToken: '',
    squareLocationId: '',
    toastClientKey: '', // Toast POS credentials
    toastClientSecret: '',
    toastLocationId: '',
    cloverAppId: '', // Clover POS credentials
    cloverAppSecret: '',
    cloverMerchantId: '',
    googleClientId: '',
    googleClientSecret: '',
    googleCalendarId: ''
  });

  // Business settings state - Expanded with all advanced setup inputs
  const [businessSettings, setBusinessSettings] = useState({
    // Basic settings
    acceptOrders: true,
    acceptReservations: true,
    acceptAfterHours: false,
    businessHours: {
      monday: { open: '09:00', close: '22:00', isOpen: true },
      tuesday: { open: '09:00', close: '22:00', isOpen: true },
      wednesday: { open: '09:00', close: '22:00', isOpen: true },
      thursday: { open: '09:00', close: '22:00', isOpen: true },
      friday: { open: '09:00', close: '22:00', isOpen: true },
      saturday: { open: '09:00', close: '22:00', isOpen: true },
      sunday: { open: '10:00', close: '21:00', isOpen: true }
    },
    timezone: 'America/New_York',
    orderCutoffTime: '21:30',
    reservationLeadTime: 60,
    useExistingPhone: false,
    // Owner fallback settings
    enableOwnerFallback: false,
    ownerPhoneNumber: '',

    // Advanced Business Information
    businessName: '',
    industry: 'restaurant',
    physicalAddress: '',
    phoneNumber: '',
    website: '',
    email: '',
    socialMedia: '',
    keyStaffContacts: '',

    // Extended Operating Details
    holidayHours: '',
    peakHours: 'Fri 6–8 PM, Sat 12–2 PM',
    tableTurnoverTime: 60,

    // Services Offered
    services: {
      dineIn: true,
      takeout: true,
      delivery: true,
      catering: false,
      reservations: true,
      curbsidePickup: false,
      driveThru: false
    },
    deliveryRadius: 10,
    eventBasedServices: '',

    // Menu & Pricing
    menuSource: 'website',
    menuText: '',
    menuWebsite: '',
    itemModifiers: '',
    dietaryOptions: {
      vegan: false,
      vegetarian: false,
      glutenFree: false,
      nutFree: false,
      dairyFree: false,
      halal: false,
      kosher: false
    },
    dietaryOptionsText: '',
    specialsPromotions: '',
    menuAvailability: '',
    popularItems: '',
    allergenInfo: '',

    // Reservations Management
    reservationPolicy: 'recommended',
    maxPartySize: 10,
    tableOptimization: 'automatic',
    specialBookingTypes: '',
    dynamicAvailability: true,
    waitlistManagement: false,

    // Ordering & Payment
    orderingMethods: {
      phone: true,
      online: true,
      app: false,
      assisted: true
    },
    paymentOptions: {
      card: true,
      cash: true,
      app: false,
      giftCards: false
    },
    paymentPolicies: '',
    allowModifications: true,
    paymentByPhone: false,
    tipsGratuity: '',

    // Delivery & Third-Party Integration
    deliveryPlatforms: {
      uberEats: false,
      doorDash: false,
      grubhub: false
    },
    posIntegration: true,
    deliveryETAFees: '',
    kitchenTicketIntegration: true,
    platformLimitations: '',
    preferredDeliveryPartner: '',

    // Catering Services
    cateringMenu: '',
    minimumOrderSize: 20,
    cateringDelivery: 'both',
    paymentInstructions: '',
    customizableItems: '',
    eventDeadlines: '',

    // Customer Interaction / FAQ
    commonQuestions: '',
    allergiesAccessibility: '',
    loyaltyRewards: '',
    promotionsCoupons: '',
    refundPolicy: '',
    vipGreeting: 'Welcome back!',

    // Business Policies
    policies: {
      callTransfer: true,
      orderModification: true,
      paymentByPhone: false,
      multiLanguage: false
    },
    afterHoursMessage: '',
    interactionStyle: 'friendly',

    // Restaurant Ambiance & Experience
    eventsLiveMusic: '',
    ambiance: 'casual',
    dressCode: '',
    waitTimes: true,
    birthdayPackages: '',
    noiseLevel: '',
    vipPerks: '',
    parkingInfo: '',
    accessibility: '',

    // Staff Information
    staffNames: '',
    managerName: '',
    ownerName: '',
    keyStaffRoles: '',

    // Special Hours & Policies
    holidayHoursInfo: '',
    reservationChangePolicy: '',
    reservationCancellationPolicy: '',
    specialEvents: '',

    // Real-Time & Operational Details
    avgPrepTimes: '',
    dynamicCapacity: true,
    tableAvailability: true,
    staffAvailability: true,
    liveWaitTime: true,

    // Marketing & Promotions
    currentCampaigns: '',
    birthdayAnniversary: '',
    loyaltyPoints: '',
    socialMediaRules: '',

    // Brand & Communication
    brandTone: 'friendly',
    languageSupport: {
      english: true,
      spanish: false,
      french: false,
      chinese: false,
      other: false
    },
    faqList: []
  });

  // Phone connection form state
  const [phoneConnectionForm, setPhoneConnectionForm] = useState({
    businessPhoneNumber: '',
    carrier: '',
    connectionMethod: 'call_forwarding',
    sipServer: '',
    sipUsername: '',
    sipPassword: '',
    sipPort: undefined,
    notes: '',
    // 🆕 Backup Answering System Configuration
    backupAnsweringEnabled: false,
    ringTimeoutSeconds: 20,
    afterHoursMode: 'immediate_ai',
    escalationEnabled: true,
    escalationPhoneNumber: '',
    backupAnsweringInstructions: ''
  });

  // Phone connection saving state
  const [phoneConnectionSaving, setPhoneConnectionSaving] = useState(false);

  // Fetch user's receptionists and data
  const { data: receptionistData, isLoading: isLoadingReceptionist } = useQuery({
    queryKey: ['/api/receptionists'],
    enabled: isAuthenticated,
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: { receptionists: [], user_subscription: null } // Show empty data immediately while loading
  });

  // Fetch conversation history
  const { data: conversationData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['/api/conversations', selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append('agentId', selectedAgentId);
      const url = addViewAsUserIdParam(`/api/conversations?${params.toString()}`);
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds — balance between freshness and performance
    refetchInterval: 60000, // Refetch every 60 seconds to keep metrics current
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    placeholderData: { conversations: [] }
  });

  // Fetch ALL agents' conversations for billing calculation
  const { data: allConversationsData } = useQuery({
    queryKey: ['/api/conversations/all'],
    queryFn: async () => {
      // Don't pass agentId to get ALL agents' conversations
      const url = addViewAsUserIdParam('/api/conversations');
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch all conversations');
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    placeholderData: { conversations: [] }
  });

  // Server-side call stats — accurate counts and minutes across the full call history
  const { data: callStatsData } = useQuery({
    queryKey: ['/api/dashboard/call-stats', selectedAgentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.append('agentId', selectedAgentId);
      const url = addViewAsUserIdParam(`/api/dashboard/call-stats?${params.toString()}`);
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch call stats');
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    placeholderData: {
      callsToday: 0, callsThisWeek: 0, callsThisMonth: 0, callsLast3Months: 0, callsTotal: 0,
      callsBillingPeriod: 0,
      minutesToday: 0, minutesThisWeek: 0, minutesThisMonth: 0, minutesLast3Months: 0, minutesTotal: 0,
      minutesBillingPeriod: 0, billingPeriodStart: null,
    }
  });

  // Helper function to get date range for selectedPeriod
  const getDateRangeForPeriod = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedPeriod) {
      case 'Today':
        return { startDate: today.toISOString(), endDate: new Date().toISOString() };
      case 'This Week':
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { startDate: weekStart.toISOString(), endDate: new Date().toISOString() };
      case 'This Month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: monthStart.toISOString(), endDate: new Date().toISOString() };
      case 'Last 3 Months':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return { startDate: threeMonthsAgo.toISOString(), endDate: new Date().toISOString() };
      case 'Total':
      default:
        return {}; // No date filter for total
    }
  };

  // Fetch orders metrics with auto-refresh for real-time updates
  const { data: ordersData } = useQuery({
    queryKey: ['/api/orders/metrics', selectedPeriod, selectedAgentId],
    queryFn: async () => {
      const dateRange = getDateRangeForPeriod();
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (selectedAgentId) params.append('agentId', selectedAgentId);
      const url = addViewAsUserIdParam(`/api/orders/metrics?${params.toString()}`);
      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: activeTab === 'home' ? 30000 : false, // Auto-refresh every 30 seconds for real-time order updates only when on home tab
    refetchOnWindowFocus: true, // Refresh when user returns to the tab
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: { successfulOrders: 0, totalRevenue: 0, totalTips: 0, cateringRevenue: 0 } // Show 0 immediately while loading
  });

  // Fetch reservations metrics
  const { data: reservationsData } = useQuery({
    queryKey: ['/api/reservations/metrics', selectedPeriod, selectedAgentId],
    queryFn: async () => {
      const dateRange = getDateRangeForPeriod();
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (selectedAgentId) params.append('agentId', selectedAgentId);
      const url = addViewAsUserIdParam(`/api/reservations/metrics?${params.toString()}`);
      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch reservations');
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: { total: 0, totalDeposits: 0 } // Show 0 immediately while loading
  });

  // Fetch user's phone number
  const { data: phoneData, isLoading: phoneLoading } = useQuery({
    queryKey: ['/api/user/phone-number'],
    enabled: isAuthenticated,
    staleTime: 300000, // Data is fresh for 5 minutes (phone number rarely changes)
    placeholderData: { phoneNumber: null, isProvisioned: false } // Show placeholder immediately while loading
  });

  // Fetch all voice agents for the user
  const { data: voiceAgentsData, isLoading: isLoadingAgents } = useQuery({
    queryKey: ['/api/voice-agents'],
    enabled: isAuthenticated,
    staleTime: 300000, // Data is fresh for 5 minutes
    placeholderData: [] // Show empty array immediately while loading
  });

  // Persist selected agent to localStorage
  useEffect(() => {
    if (selectedAgentId) {
      localStorage.setItem('selectedAgentId', selectedAgentId);
    }
  }, [selectedAgentId]);

  // Validate and set selected agent
  useEffect(() => {
    if (voiceAgentsData) {
      // Check if selectedAgentId is valid (belongs to current user's agents)
      const isValidAgent = selectedAgentId && voiceAgentsData.some((agent: any) => agent.id === selectedAgentId);
      
      if (!isValidAgent) {
        // Clear invalid agent ID from localStorage
        if (selectedAgentId) {
          console.log('🧹 Clearing invalid selectedAgentId from localStorage:', selectedAgentId);
          localStorage.removeItem('selectedAgentId');
        }
        
        // Set to first agent if available, otherwise clear
        if (voiceAgentsData.length > 0) {
          setSelectedAgentId(voiceAgentsData[0].id);
        } else {
          setSelectedAgentId('');
        }
      }
    }
  }, [voiceAgentsData, selectedAgentId]);

  // Get currently selected agent
  const selectedAgent = voiceAgentsData?.find((agent: any) => agent.id === selectedAgentId) || voiceAgentsData?.[0];

  // ── Setup Completion Banner + Auto-trigger from post-provisioning gap analysis ──
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [mvoData, setMvoData] = useState<{
    agentId?: string;
    industry?: string;
    confidenceScore?: number;
    missingFields?: string[];
    foundFields?: string[];
    prefillData?: Record<string, string>;
  } | null>(null);

  // On first mount, check if LoadingDashboard stored a gap analysis in sessionStorage.
  // If so, auto-open the MVO modal immediately after the dashboard renders.
  useEffect(() => {
    const stored = sessionStorage.getItem('mvoSetupRequired');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.missingFields?.length > 0) {
          setMvoData(parsed);
          // Brief delay so the dashboard renders fully before the modal appears
          setTimeout(() => setShowSetupModal(true), 800);
        }
      } catch {
        // Malformed — ignore
      }
      // Only show once — clear immediately after reading
      sessionStorage.removeItem('mvoSetupRequired');
    }
  }, []);

  const { data: restaurantMeta } = useQuery({
    queryKey: ['/api/restaurant', selectedAgentId, 'meta'],
    queryFn: async () => {
      if (!selectedAgentId) return null;
      const res = await fetch(`/api/restaurant/${selectedAgentId}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated && !!selectedAgentId,
    staleTime: 60000,
  });
  const onboardingStatus = (restaurantMeta as any)?.onboardingStatus;
  const confidenceScore = mvoData?.confidenceScore ?? ((restaurantMeta as any)?.dataConfidenceScore ?? 100);
  const missingFields: string[] = mvoData?.missingFields ?? ((restaurantMeta as any)?.missingDataFields ?? []);
  const foundFields: string[] = mvoData?.foundFields ?? [];
  const prefillData: Record<string, string> = mvoData?.prefillData ?? {};
  const showSetupBanner = !showSetupModal && (onboardingStatus === 'incomplete' || onboardingStatus === 'draft' || confidenceScore < 40);

  // Fetch business settings with auto-refresh for real-time order count updates
  const { data: businessSettingsData, isLoading: isLoadingBusinessSettings } = useQuery({
    queryKey: ['/api/business-settings'],
    enabled: isAuthenticated,
    refetchInterval: 120000, // Background refresh every 2 minutes
    refetchOnWindowFocus: false,
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: {} // Show empty object immediately while loading
  });

  // Fetch saved business data for form pre-population
  const { data: savedBehaviorSettings } = useQuery({
    queryKey: ['/api/business-settings/behavior'],
    enabled: isAuthenticated && activeTab === 'agent',
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: { globalPrompt: '', businessHoursGreeting: '', afterHoursGreeting: '' } // Show empty data immediately while loading
  });

  // Fetch agent general prompt from Retell API
  const { data: agentGeneralPromptData, isLoading: isAgentPromptLoading } = useQuery({
    queryKey: ['/api/agent/general-prompt', selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return { generalPrompt: '' };
      const response = await fetch(`/api/agent/general-prompt?agentId=${selectedAgentId}`, { 
        credentials: 'include' 
      });
      if (!response.ok) throw new Error('Failed to fetch agent general prompt');
      return response.json();
    },
    enabled: isAuthenticated && activeTab === 'agent' && !!selectedAgentId && selectedAgentId.trim() !== '',
    retry: false,
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: { generalPrompt: '' } // Show empty prompt immediately while loading
  });

  // Conversation flow agent detection — true when the Retell agent uses a conversation flow (not an LLM)
  const isConversationFlowAgent = !!(agentGeneralPromptData as any)?.conversationFlowId;

  // Fetch custom functions from Retell AI for the selected agent
  const { data: retellCustomFunctions } = useQuery({
    queryKey: ['/api/integrations/retell-functions', selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return [];
      const response = await fetch(`/api/integrations/retell-functions?agentId=${selectedAgentId}`, { 
        credentials: 'include' 
      });
      if (!response.ok) throw new Error('Failed to fetch Retell custom functions');
      return response.json();
    },
    enabled: isAuthenticated && activeTab === 'agent' && !!selectedAgentId && selectedAgentId.trim() !== '',
    retry: false,
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: [] // Show empty array immediately while loading
  });

  // Integration status for action warning badges (which actions are missing required integrations)
  const { data: actionIntegrationStatus } = useQuery({
    queryKey: ['/api/agents/integration-status', selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return null;
      const response = await fetch(`/api/agents/${selectedAgentId}/integration-status`, { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: isAuthenticated && activeTab === 'agent' && !!selectedAgentId,
    staleTime: 60000,
    placeholderData: null
  });

  const { data: savedBusinessInfo } = useQuery({
    queryKey: ['/api/business-settings/info'],
    enabled: isAuthenticated,
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: {} // Show empty object immediately while loading
  });

  // Fetch knowledge base content from Retell AI (for memory tab)
  const { data: knowledgeBaseContent, isLoading: isLoadingKnowledgeBase } = useQuery({
    queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content'],
    queryFn: async () => {
      if (!selectedAgentId) return { content: '', source: 'none' };
      const response = await fetch(`/api/restaurant/${selectedAgentId}/knowledge-base-content`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch knowledge base content');
      return response.json();
    },
    enabled: isAuthenticated && (activeTab === 'home' || activeTab === 'memory' || activeTab === 'calls' || activeTab === 'contacts') && !!selectedAgentId && selectedAgentId.trim() !== '',
    staleTime: 60000, // 1 minute — avoid re-fetching every time tab is opened
    placeholderData: { content: '', source: 'loading' }
  });

  // Fetch knowledge base sources (files and URLs) for selected agent
  const { data: knowledgeSources, isLoading: isLoadingKnowledgeSources } = useQuery({
    queryKey: ['/api/knowledge-sources', selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return [];
      const response = await fetch(`/api/knowledge-sources/${selectedAgentId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch knowledge sources');
      return response.json();
    },
    enabled: isAuthenticated && activeTab === 'memory' && !!selectedAgentId && selectedAgentId.trim() !== '',
    staleTime: 30000, // Fresh for 30 seconds
    placeholderData: []
  });

  // Fetch customer memories for selected agent
  const { data: customerMemoriesData, isLoading: isLoadingCustomerMemories } = useQuery({
    queryKey: ['/api/customer-memories', selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return { memories: [] };
      const response = await fetch(`/api/customer-memories/${selectedAgentId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch customer memories');
      return response.json();
    },
    enabled: isAuthenticated && activeTab === 'memory' && !!selectedAgentId && selectedAgentId.trim() !== '',
    staleTime: 30000, // Fresh for 30 seconds
    placeholderData: { memories: [] }
  });


  const { data: savedIntegrationSettings } = useQuery({
    queryKey: ['/api/business-settings/integrations'],
    enabled: isAuthenticated && activeTab === 'integrations',
    staleTime: 60000, // Data is fresh for 1 minute
    placeholderData: {} // Show empty object immediately while loading
  });

  // Fetch custom integrations
  const { data: savedCustomIntegrations } = useQuery({
    queryKey: ['/api/integrations/custom', selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return [];
      const params = new URLSearchParams({ agentId: selectedAgentId });
      const url = addViewAsUserIdParam(`/api/integrations/custom?${params.toString()}`);
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch integrations');
      return response.json();
    },
    enabled: isAuthenticated && activeTab === 'integrations' && !!selectedAgentId && selectedAgentId.trim() !== '', // Only fetch when Integrations tab is active
    staleTime: 60000, // 1 minute — avoid re-fetching every time tab is opened
    placeholderData: [] // Show empty array immediately while loading
  });

  // Check business data status for new users
  const { data: businessDataStatus, isLoading: isLoadingBusinessStatus } = useQuery({
    queryKey: ['/api/user/business-data-status'],
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 120000, // Data is fresh for 2 minutes
    placeholderData: { hasBusinessData: false, hasPhoneNumber: false } // Show placeholder immediately while loading
  });

  // Business settings mutation
  const saveBusinessSettingsMutation = useMutation({
    mutationFn: async (settings: typeof businessSettings) => {
      return await apiRequest('/api/business-settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
    },
    onSuccess: () => {
      toast({
        title: "Business Settings Saved",
        description: "Your business settings have been updated successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save business settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // User profile mutations
  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('PATCH', '/api/user/profile', { name });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Name Updated",
        description: "Your name has been updated successfully.",
        variant: "default",
      });
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update name. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('PATCH', '/api/user/profile', { email });
      return await response.json();
    },
    onSuccess: () => {
      // After updating email, trigger verification email
      sendVerificationEmailMutation.mutate();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePhoneNumberMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest('PATCH', '/api/user/profile', { phoneNumber });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Phone Number Updated",
        description: "Your phone number has been updated successfully.",
      });
      setIsEditingPhone(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update phone number. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating SMS alerts setting
  const updateSMSAlertsMutation = useMutation({
    mutationFn: async (enableSMS: boolean) => {
      const response = await apiRequest('PATCH', '/api/user/profile', { enableSMS });
      return await response.json();
    },
    onSuccess: (_, enableSMS) => {
      toast({
        title: enableSMS ? "SMS Alerts Enabled" : "SMS Alerts Disabled",
        description: enableSMS 
          ? "You will receive text notifications for important events" 
          : "SMS notifications have been disabled",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update SMS alerts setting. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Desktop notification permission state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const handleToggleDesktopNotifications = async (checked: boolean) => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Your browser does not support desktop notifications.",
        variant: "destructive",
      });
      return;
    }
    if (checked) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        new Notification('Notifications Enabled!', {
          body: 'You will now see alerts for new calls.',
        });
        toast({ title: "Notifications Enabled", description: "You'll receive desktop alerts for new calls." });
      } else {
        toast({
          title: "Permission Denied",
          description: "To enable notifications, allow them in your browser's site settings and try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "To Disable Notifications",
        description: "Click the lock icon in your browser's address bar, then set Notifications to 'Block'.",
      });
    }
  };

  // Separate mutation for sending verification emails
  const sendVerificationEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/user/verify-email', {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Updated & Verification Sent",
        description: "Your email has been updated successfully. Please check your email for the verification link.",
        variant: "default",
      });
      setIsEditingEmail(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      console.error('Verification email error:', error);
      toast({
        title: "Email Updated",
        description: "Your email was updated but we couldn't send the verification email. Please try again later.",
        variant: "default",
      });
      setIsEditingEmail(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('POST', '/api/user/change-password', { currentPassword, newPassword });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
        variant: "default",
      });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Avatar upload mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      return await apiRequest('/api/user/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatarUrl })
      });
    },
    onSuccess: () => {
      toast({
        title: "Avatar Uploaded",
        description: "Your profile picture has been updated successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Avatar delete mutation
  const deleteAvatarMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/user/avatar', {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Avatar Deleted",
        description: "Your profile picture has been removed.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete avatar. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (passwordData: typeof passwordForm) => {
      return await apiRequest('/api/user/password', {
        method: 'POST',
        body: JSON.stringify(passwordData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
        variant: "default",
      });
      setShowPasswordChangeForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({agentId, file}: {agentId: string, file: File}) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agentId', agentId);

      const response = await fetch('/api/knowledge-sources/upload-file', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to upload file');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "File Uploaded",
        description: "Your file has been uploaded to the knowledge base successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });
      setIsUploadingFile(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      setIsUploadingFile(false);
    },
  });

  // URL scraping mutation
  const scrapeUrlMutation = useMutation({
    mutationFn: async ({agentId, url, autoRefresh}: {agentId: string, url: string, autoRefresh: boolean}) => {
      const response = await apiRequest('POST', '/api/knowledge-sources/scrape-url', { agentId, url, autoRefresh });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to scrape URL');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Website Scraped",
        description: "The website has been added to the knowledge base successfully.",
        variant: "default",
      });
      setWebsiteUrl(''); // Clear the URL input
      setIsScrapingUrl(false);
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });
    },
    onError: (error: any) => {
      toast({
        title: "Scraping Failed",
        description: error.message || "Failed to scrape website. Please try again.",
        variant: "destructive",
      });
      setIsScrapingUrl(false);
    },
  });

  // Handle payment completion and authentication
  useEffect(() => {
    const paymentCompleted = localStorage.getItem('paymentCompleted') === 'true';
    
    if (paymentCompleted) {
      // Clear the payment completed flag
      localStorage.removeItem('paymentCompleted');
      
      // Show success message
      toast({
        title: "Payment Successful!",
        description: "Welcome to VoiceBot! Your account is now active.",
        variant: "default",
      });
    }
    
    // Handle authentication for dashboard access
    if (!isLoading && !isAuthenticated) {
      // Check if we're in preview panel (iframe) or new tab context
      const isInIframe = window.self !== window.top;
      
      if (isInIframe) {
        // Preview panel: Open dashboard in new tab
        console.log('Dashboard: Preview panel detected, opening in new tab for authentication');
        
        setTimeout(() => {
          window.open('/dashboard', '_blank');
        }, 1000);
      } else {
        // New tab: Redirect to login page (supports both email/password and OAuth)
        console.log('Dashboard: Not authenticated, redirecting to login');
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?returnTo=${returnTo}`;
      }
    }
  }, [isAuthenticated, isLoading, toast]);

  // Update business settings from server data when available
  useEffect(() => {
    if (businessSettingsData) {
      setBusinessSettings(prev => ({
        ...prev,
        acceptOrders: businessSettingsData.acceptOrders ?? prev.acceptOrders,
        acceptReservations: businessSettingsData.acceptReservations ?? prev.acceptReservations,
        acceptAfterHours: businessSettingsData.acceptAfterHours ?? prev.acceptAfterHours,
        businessHours: businessSettingsData.businessHours || prev.businessHours,
        timezone: businessSettingsData.timezone || prev.timezone,
        orderCutoffTime: businessSettingsData.orderCutoffTime || prev.orderCutoffTime,
        reservationLeadTime: businessSettingsData.reservationLeadTime || prev.reservationLeadTime,
      }));
    }
  }, [businessSettingsData]);

  // Update business info from saved data when available
  useEffect(() => {
    if (savedBusinessInfo) {
      setBusinessSettings(prev => ({
        ...prev,
        businessName: savedBusinessInfo.businessName || prev.businessName,
        industry: savedBusinessInfo.industry || prev.industry,
        physicalAddress: savedBusinessInfo.physicalAddress || prev.physicalAddress,
        phoneNumber: savedBusinessInfo.phoneNumber || prev.phoneNumber,
        website: savedBusinessInfo.website || prev.website,
        email: savedBusinessInfo.email || prev.email,
        socialMedia: savedBusinessInfo.socialMedia || prev.socialMedia,
        keyStaffContacts: savedBusinessInfo.keyStaffContacts || prev.keyStaffContacts,
        // Handle businessHours - if it's an object with day structure, use it; if it's a string, keep default
        businessHours: (savedBusinessInfo.businessHours && typeof savedBusinessInfo.businessHours === 'object' && savedBusinessInfo.businessHours.monday)
          ? savedBusinessInfo.businessHours
          : prev.businessHours,
      }));
    }
  }, [savedBusinessInfo]);

  // Check business data status (without aggressive redirects)
  useEffect(() => {
    if (businessDataStatus && !isLoadingBusinessStatus && isAuthenticated) {
      const { hasBusinessData, needsBusinessOnboarding, currentStep } = businessDataStatus as any;
      
      // Only show a gentle info message if business data is missing, don't force redirect
      if (needsBusinessOnboarding && !hasBusinessData) {
        console.log('ℹ️ User may need to complete business onboarding. Current step:', currentStep);
      }
    }
  }, [businessDataStatus, isLoadingBusinessStatus, isAuthenticated, toast]);

  // Get user's AI receptionist data
  const receptionist = receptionistData?.receptionists?.[0];
  const userSubscription = receptionistData?.user_subscription;
  const selectedPlan = userSubscription?.plan || localStorage.getItem('selectedPlan') || 'Professional';
  
  // Calculate stats from real data
  const conversations = conversationData?.conversations || [];

  const now = new Date();
  const today = now.toDateString();
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  // Use server-side aggregated stats for accuracy (avoids the 50-record API limit)
  const callsToday = callStatsData?.callsToday ?? 0;
  const callsThisWeek = callStatsData?.callsThisWeek ?? 0;

  // Calls for the current billing period (plan renewal → now)
  const getCallsForPeriod = () => callStatsData?.callsBillingPeriod ?? 0;

  const callsForPeriod = getCallsForPeriod();

  // Helper function for relative time formatting
  const getRelativeTime = (date: Date | string) => {
    const now = new Date();
    const then = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
  };

  // Phone minutes for the current billing period (plan renewal → now)
  const getPhoneMinutesForPeriod = () => callStatsData?.minutesBillingPeriod ?? 0;

  const phoneMinutesForPeriod = getPhoneMinutesForPeriod();

  // Total minutes for billing period — from server-side (all agents, accurate)
  const totalMinutesThisMonthAllAgents = callStatsData?.minutesBillingPeriod ?? 0;

  // Get average duration for selected period
  const getAverageDurationForPeriod = () => {
    if (!conversations) return 0;

    let filteredConversations = conversations;

    switch (selectedPeriod) {
      case 'Today':
        filteredConversations = conversations.filter(c => new Date(c.started_at).toDateString() === today);
        break;
      case 'This Week':
        filteredConversations = conversations.filter(c => new Date(c.started_at) >= thisWeek);
        break;
      case 'This Month':
        filteredConversations = conversations.filter(c => new Date(c.started_at) >= thisMonth);
        break;
      case 'Last 3 Months':
        filteredConversations = conversations.filter(c => new Date(c.started_at) >= last3Months);
        break;
      case 'Total':
      default:
        filteredConversations = conversations;
        break;
    }

    const conversationsWithDuration = filteredConversations.filter(c => c.duration && c.duration > 0);
    return conversationsWithDuration.length > 0
      ? conversationsWithDuration.reduce((sum, c) => sum + c.duration, 0) / conversationsWithDuration.length
      : 0;
  };

  const averageDurationForPeriod = getAverageDurationForPeriod();

  // Calculate average duration from actual conversations (for stats object, kept for backward compatibility)
  const conversationsWithDuration = conversations?.filter(c => c.duration && c.duration > 0) || [];
  const averageDuration = conversationsWithDuration.length > 0
    ? conversationsWithDuration.reduce((sum, c) => sum + c.duration, 0) / conversationsWithDuration.length
    : 0;
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to format phone number as +1 (XXX) XXX-XXXX
  const formatPhoneNumber = (phoneNumber: string | undefined | null) => {
    if (!phoneNumber || phoneNumber === 'undefined' || phoneNumber === 'null') return '';
    
    // Ensure phoneNumber is a string
    const phone = String(phoneNumber);
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format as +1 (XXX) XXX-XXXX
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone; // Return original if format doesn't match
  };

  const stats = useMemo(() => ({
    callsToday,
    callsThisWeek,
    phoneMinutesThisMonth: totalMinutesThisMonthAllAgents, // Use ALL agents' minutes for billing
    averageCallDuration: formatDuration(averageDuration),
    missedCalls: conversations?.filter(c => c.outcome === 'Missed').length || 0,
    aiRating: receptionist?.performance?.average_rating || 0
  }), [callsToday, callsThisWeek, totalMinutesThisMonthAllAgents, averageDuration, conversations, receptionist]);

  // Get business data from receptionist API response
  const rawBusinessData = receptionistData?.receptionists?.[0]?.businessData || {};

  // Business and AI receptionist data from real API - memoized to prevent expensive transformation on every render
  const businessData = useMemo(() => ({
    businessName: rawBusinessData?.businessName || receptionist?.business_name || "Your Business",
    phoneNumber: phoneData?.phoneNumber || receptionist?.phone_number || '',
    address: rawBusinessData?.address || 'N/A',
    phone: rawBusinessData?.phone || phoneData?.phoneNumber || receptionist?.phone_number || 'N/A',
    website: rawBusinessData?.website || 'N/A',
    businessHours: rawBusinessData?.hours ?
      (typeof rawBusinessData.hours === 'object' ?
        Object.entries(rawBusinessData.hours).map(([day, hours]: [string, any]) =>
          `${day}: ${hours?.open || 'Closed'} - ${hours?.close || 'Closed'}`
        ).join('\n') : rawBusinessData.hours) : 'N/A',
    services: rawBusinessData?.services ?
      (Array.isArray(rawBusinessData.services) ? rawBusinessData.services.join(', ') : rawBusinessData.services) : 'N/A',
    menuItems: rawBusinessData?.menuItems ?
      (Array.isArray(rawBusinessData.menuItems) ?
        rawBusinessData.menuItems.map((item: any) =>
          `${item.name || item.item} - ${item.price ? '$' + item.price : 'Price TBD'}${item.description ? ' (' + item.description + ')' : ''}`
        ).join('\n') : rawBusinessData.menuItems) : 'N/A',
    orderingPolicy: rawBusinessData?.orderingPolicy || 'N/A',
    reservationPolicy: rawBusinessData?.reservationPolicy || 'N/A',
    reservationInfo: rawBusinessData?.reservationInfo || 'N/A',
    faq: rawBusinessData?.faq ?
      (Array.isArray(rawBusinessData.faq) ?
        rawBusinessData.faq.map((item: any) =>
          `Q: ${item.question || item.q}\nA: ${item.answer || item.a}`
        ).join('\n\n') : rawBusinessData.faq) : 'N/A',
    googleMapsData: rawBusinessData?.googleMapsData ?
      (typeof rawBusinessData.googleMapsData === 'object' ?
        `Rating: ${rawBusinessData.googleMapsData.rating || 'N/A'}\nReviews: ${rawBusinessData.googleMapsData.reviews || 'N/A'}\nCategory: ${rawBusinessData.googleMapsData.category || 'N/A'}` :
        rawBusinessData.googleMapsData) : 'N/A',
    // System data
    phoneStatus: phoneData?.status || 'active',
    monthlyCost: phoneData?.monthlyCost || 0,
    elevenLabsEnabled: phoneData?.elevenLabsEnabled || false,
    elevenLabsAgentId: phoneData?.elevenLabsAgentId || null,
    retellEnabled: phoneData?.retellEnabled || false,
    retellAgentId: phoneData?.retellAgentId || null,
    emergencyAddressId: phoneData?.emergencyAddressId || null
  }), [rawBusinessData, receptionist, phoneData]);

  const planDetails = PLAN_DETAILS;

  // Use actual subscription data when available, fallback to PLAN_DETAILS
  const currentPlan = userSubscription ? {
    minutes: userSubscription.minute_limit,
    price: userSubscription.price_display
  } : (planDetails[selectedPlan?.toLowerCase() as keyof typeof planDetails] || planDetails['medium']);

  const monthlyLimit = userSubscription?.minute_limit || currentPlan.minutes;
  const usagePercentage = (stats.phoneMinutesThisMonth / monthlyLimit) * 100;

  // Calculate overage charges using shared constant
  const overageRate = (currentPlan as any).overageRate ?? OVERAGE_RATE_PER_MINUTE;
  const overageMinutes = Math.max(0, stats.phoneMinutesThisMonth - monthlyLimit);
  const overageCharges = (overageMinutes * overageRate).toFixed(2);
  const hasOverage = overageMinutes > 0;

  // Get the selected agent's industry for dynamic card rendering
  const selectedAgentIndustry = (selectedAgent?.industry as Industry) || 'restaurant';

  // Get industry-specific metric cards
  const industryMetricCards = getMetricCards(selectedAgentIndustry);

  // Calculate revenue: sum each billing-period call using the same priority chain as the Calls tab.
  // Uses the raw KB text to match service names (same parseKbItems + expandAbbreviations logic).
  const knowledgeBaseRevenue = useMemo(() => {
    const kbText = knowledgeBaseContent?.content || '';

    // Parse "$price" entries from raw KB text (same as CallHistoryTable)
    function expandAbbr(text: string): string {
      return text
        .replace(/\bpedi\b/gi, 'pedicure')
        .replace(/\bmani\b/gi, 'manicure')
        .replace(/\blash\b/gi, 'eyelash')
        .replace(/\bbrow\b/gi, 'eyebrow');
    }
    const kbItems: Array<{ name: string; phrase: string; price: number }> = [];
    if (kbText) {
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
          if (name === name.toUpperCase() && name.replace(/\s/g, '').length > 3) continue;
          const phrase = expandAbbr(name.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim());
          if (phrase) kbItems.push({ name, phrase, price });
        }
      }
    }

    const billingStart = callStatsData?.billingPeriodStart
      ? new Date(callStatsData.billingPeriodStart)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    let total = 0;
    const periodCalls = conversations.filter((c: any) => new Date(c.started_at) >= billingStart);
    for (const call of periodCalls) {
      // 1. Direct order_amount stamped by send_sms_confirmation
      if (call.order_amount != null) {
        const direct = parseFloat(call.order_amount);
        if (!isNaN(direct) && direct > 0) { total += direct; continue; }
      }

      // 2. KB phrase matching against transcript, summary, service type, and interaction type
      if (kbItems.length === 0) continue;
      const rawCorpus = [
        (call as any).transcriptionText || '',
        (call as any).summary || '',
        (call as any).call_summary || '',
        (call as any).service_type || '',
        (call as any).interactionType || '',
      ].join(' ');
      const corpus = expandAbbr(rawCorpus.replace(/[-_]/g, ' ').replace(/\s+/g, ' ')).toLowerCase();
      for (const item of kbItems) {
        if (corpus.includes(item.phrase)) { total += item.price; break; }
      }
    }
    return total;
  }, [knowledgeBaseContent, conversations, callStatsData?.billingPeriodStart]);

  // Map metric card IDs to actual values and icons based on industry
  const getMetricCardValue = (cardId: string): { value: string | number; icon: string; color: string } => {
    const metricMap: Record<string, { value: string | number; icon: string; color: string }> = {
      'calls': { value: callsForPeriod, icon: 'fa-phone', color: 'cyan' },
      'orders': { value: ordersData?.successfulOrders || 0, icon: 'fa-shopping-cart', color: 'purple' },
      'reservations': { value: reservationsData?.total || 0, icon: 'fa-calendar', color: 'blue' },
      'average_duration': { value: formatDuration(averageDurationForPeriod), icon: 'fa-clock', color: 'blue' },
      'revenue': { value: `$${knowledgeBaseRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: 'fa-dollar-sign', color: 'green' },
      'phone_minutes': { value: phoneMinutesForPeriod, icon: 'fa-phone-volume', color: 'purple' },
      // Industry-specific metrics
      'appointments': { value: reservationsData?.total || 0, icon: 'fa-calendar-check', color: 'blue' },
      'services': { value: ordersData?.successfulOrders || 0, icon: 'fa-briefcase', color: 'purple' },
      'events': { value: ordersData?.cateringOrders || 0, icon: 'fa-calendar-alt', color: 'blue' },
      'prescriptions': { value: ordersData?.specialOrders || 0, icon: 'fa-prescription', color: 'green' },
      'estimates': { value: ordersData?.pendingOrders || 0, icon: 'fa-file-invoice-dollar', color: 'yellow' },
      'sessions': { value: reservationsData?.total || 0, icon: 'fa-dumbbell', color: 'orange' },
      'memberships': { value: ordersData?.subscriptions || 0, icon: 'fa-id-card', color: 'purple' },
      'emergencies': { value: ordersData?.urgentRequests || 0, icon: 'fa-ambulance', color: 'red' },
      'showings': { value: reservationsData?.tours || 0, icon: 'fa-home', color: 'blue' },
      'maintenance': { value: ordersData?.serviceRequests || 0, icon: 'fa-wrench', color: 'orange' },
      'leasing': { value: ordersData?.applications || 0, icon: 'fa-file-signature', color: 'blue' },
      'treatments': { value: ordersData?.procedures || 0, icon: 'fa-syringe', color: 'purple' },
      'bookings': { value: reservationsData?.total || 0, icon: 'fa-calendar-day', color: 'blue' },
      'enrollment': { value: ordersData?.newSignups || 0, icon: 'fa-user-plus', color: 'green' },
      'scheduling': { value: reservationsData?.total || 0, icon: 'fa-calendar-week', color: 'blue' },
      'classes': { value: reservationsData?.total || 0, icon: 'fa-users', color: 'purple' },
      'procedures': { value: ordersData?.specialOrders || 0, icon: 'fa-tooth', color: 'blue' },
    };

    return metricMap[cardId] || { value: 0, icon: 'fa-question', color: 'gray' };
  };

  // Use conversation data for call history (it's already being fetched successfully)
  const enhancedCallHistory = conversations;
  const isLoadingCalls = isLoadingConversations;

  // Ensure enhancedCallHistory is always an array
  const safeCallHistory = enhancedCallHistory || [];

  // Fetch SMS messages. Sync from Twilio fires in background (non-blocking) so the
  // tab feels instant. The refetchInterval will pick up newly synced messages.
  const { data: smsMessagesData, isLoading: isLoadingSmsMessages, refetch: refetchSmsMessages } = useQuery({
    queryKey: ['/api/messaging/sms'],
    queryFn: async () => {
      // Fire Twilio sync in background — don't await it so the tab shows immediately
      fetch('/api/messaging/sync-sms', { method: 'POST', credentials: 'include' })
        .catch(() => {}); // ignore errors silently

      const response = await fetch('/api/messaging/sms', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch SMS messages');
      return response.json();
    },
    enabled: isAuthenticated && activeTab === 'messaging',
    staleTime: 30000, // 30 seconds — don't refetch when revisiting within 30s
    refetchInterval: 60000, // Background refresh every 60 seconds
  });

  const smsMessages = smsMessagesData?.messages || [];


  // Build contacts list from call history (same as Contacts tab) - only compute when on contacts tab
  const contactsFromCallHistory = useMemo(() => {
    // Skip expensive computation if not on contacts tab
    if (activeTab !== 'contacts') return [];

    const contactMap = new Map();

    safeCallHistory.forEach((call: any) => {
      const phoneNumber = call.fromNumber || call.from_number || call.normalizedPhone || '';
      const customerName = call.customerName || call.customer_name || call.callerName || 'Unknown';

      if (!phoneNumber) return;

      if (!contactMap.has(phoneNumber)) {
        contactMap.set(phoneNumber, {
          id: phoneNumber,
          phoneNumber: phoneNumber,
          customerName: customerName,
          lastCallDate: call.startTime || call.timestamp || call.createdAt || new Date().toISOString(),
          totalCalls: 1
        });
      } else {
        const contact = contactMap.get(phoneNumber);
        contact.totalCalls += 1;
        // Update to most recent call date
        const currentDate = new Date(call.startTime || call.timestamp || call.createdAt || new Date().toISOString());
        const existingDate = new Date(contact.lastCallDate);
        if (currentDate > existingDate) {
          contact.lastCallDate = call.startTime || call.timestamp || call.createdAt;
          contact.customerName = customerName; // Update name to most recent
        }
      }
    });

    return Array.from(contactMap.values()).sort((a, b) =>
      new Date(b.lastCallDate).getTime() - new Date(a.lastCallDate).getTime()
    );
  }, [safeCallHistory, activeTab]);

  // Transform SMS messages and call history into messaging contacts - only compute when on messaging tab
  const messagingContacts = useMemo(() => {
    // Skip expensive computation if not on messaging tab
    if (activeTab !== 'messaging') return [];

    const contactMap = new Map();

    // First, add all contacts from call history (like the Contacts tab)
    safeCallHistory.forEach((call: any) => {
      const phoneNumber = call.fromNumber || call.from_number || call.normalizedPhone || '';
      const customerName = call.customerName || call.customer_name || call.callerName || 'Unknown';
      const timestamp = call.startTime || call.timestamp || call.createdAt || new Date().toISOString();

      if (!phoneNumber) return;

      if (!contactMap.has(phoneNumber)) {
        contactMap.set(phoneNumber, {
          id: phoneNumber,
          name: customerName,
          phoneNumber: phoneNumber,
          messageCount: 0,
          lastMessageTime: timestamp,
          lastMessage: '',
          messages: []
        });
      }

      // Update last contact time if this call is more recent (for sorting)
      const contact = contactMap.get(phoneNumber);
      if (new Date(timestamp) > new Date(contact.lastMessageTime)) {
        contact.lastMessageTime = timestamp;
      }
    });

    // Then, overlay SMS messages onto the contacts
    smsMessages.forEach((sms: any) => {
      // Determine the other party's phone number (not the user's phone)
      const phoneNumber = sms.direction === 'inbound' ? sms.fromNumber : sms.toNumber;
      const timestamp = sms.createdAt || new Date().toISOString();

      if (!phoneNumber) return;

      // Try to find customer name from call history
      const relatedCall = safeCallHistory.find((call: any) =>
        (call.fromNumber === phoneNumber || call.normalizedPhone === phoneNumber)
      );
      const customerName = relatedCall?.customerName || relatedCall?.customer_name || relatedCall?.callerName || 'Unknown';

      if (!contactMap.has(phoneNumber)) {
        contactMap.set(phoneNumber, {
          id: phoneNumber,
          name: customerName,
          phoneNumber: phoneNumber,
          messageCount: 0,
          lastMessageTime: timestamp,
          lastMessage: sms.body?.substring(0, 50) || '',
          messages: []
        });
      }

      const contact = contactMap.get(phoneNumber);

      // Add the message to the contact's messages array
      contact.messages.push({
        id: sms.id || sms.twilioMessageSid,
        content: sms.body,
        timestamp: timestamp,
        direction: sms.direction === 'outbound' ? 'sent' : 'received',
        status: sms.status
      });

      contact.messageCount++;

      // Update last message time if this message is more recent
      if (new Date(timestamp) > new Date(contact.lastMessageTime)) {
        contact.lastMessageTime = timestamp;
        contact.lastMessage = sms.body?.substring(0, 50) || '';
      }
    });

    // Sort messages within each contact by timestamp
    contactMap.forEach((contact) => {
      contact.messages.sort((a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });

    return Array.from(contactMap.values()).sort((a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [smsMessages, safeCallHistory, activeTab]);

  // Filter call history based on selected time period
  const getFilteredCallHistory = () => {
    if (!safeCallHistory) return [];

    const now = new Date();

    switch (selectedPeriod) {
      case 'Today':
        const todayStr = now.toDateString();
        return safeCallHistory.filter((call: any) =>
          new Date(call.startTime || call.timestamp || call.createdAt).toDateString() === todayStr
        );

      case 'This Week':
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return safeCallHistory.filter((call: any) =>
          new Date(call.startTime || call.timestamp || call.createdAt) >= weekStart
        );

      case 'This Month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return safeCallHistory.filter((call: any) =>
          new Date(call.startTime || call.timestamp || call.createdAt) >= monthStart
        );

      case 'All':
      default:
        return safeCallHistory;
    }
  };

  // Apply sorting to filtered call history
  const getSortedCallHistory = (calls: any[]) => {
    if (!calls) return [];

    return [...calls].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.startTime || b.timestamp || b.createdAt).getTime() -
                 new Date(a.startTime || a.timestamp || a.createdAt).getTime();
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'status':
          return (a.callStatus || a.outcome || '').localeCompare(b.callStatus || b.outcome || '');
        default:
          return 0;
      }
    });
  };

  const filteredCallHistory = useMemo(() =>
    getSortedCallHistory(getFilteredCallHistory()),
    [safeCallHistory, selectedPeriod, sortBy]
  );

  const formatCallDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400'; 
      default: return 'text-gray-400';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'successful': return 'bg-green-500';
      case 'escalated': return 'bg-yellow-500';
      case 'incomplete': return 'bg-red-500';
      case 'follow_up_needed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getCallTypeDisplay = (callType: string) => {
    const types: Record<string, string> = {
      'reservation': '🍽️ Reservation',
      'order_status': '📦 Order Status', 
      'menu_inquiry': '📋 Menu Inquiry',
      'hours_location': '🏪 Hours/Location',
      'promotions': '🎉 Promotions',
      'general_question': '❓ General Question',
      'escalation': '🚨 Escalation',
      'unknown': '❔ Other'
    };
    return types[callType] || '❔ Other';
  };

  // Initialize greeting form with default values once businessData is available
  useEffect(() => {
    if (businessData?.name && greetingForm.businessHours === '') {
      const businessName = businessData.name !== 'Your Business' ? businessData.name : '[Restaurant Name]';
      setGreetingForm({
        businessHours: `Hello! Welcome to ${businessName}. How can I help you today?`,
        afterHours: `Hi, thanks for calling ${businessName}. We're currently closed, but I can still assist you. How may I help you?`
      });
    }
  }, [businessData?.name, greetingForm.businessHours]);

  // Update edit form values when user data changes
  useEffect(() => {
    if (user) {
      setEditNameValue(user.name || '');
      setEditEmailValue(user.email || '');
    }
  }, [user]);

  // Populate behavior form with business data when it loads
  useEffect(() => {
    if (businessSettingsData) {
      setBehaviorForm({
        globalPrompt: businessSettingsData.globalPrompt || '',
        businessHoursGreeting: businessSettingsData.businessHoursGreeting || '',
        afterHoursGreeting: businessSettingsData.afterHoursGreeting || ''
      });
      
      // Set original data for change detection
      setOriginalData(prev => ({
        ...prev,
        info: businessSettingsData,
        behavior: {
          globalPrompt: businessSettingsData.globalPrompt || '',
          businessHoursGreeting: businessSettingsData.businessHoursGreeting || '',
          afterHoursGreeting: businessSettingsData.afterHoursGreeting || ''
        }
      }));
    }
  }, [businessSettingsData]);

  // Change detection logic
  const checkForChanges = () => {
    if (activeTab === 'memory') {
      return businessInfoText !== originalBusinessInfoText;
    } else if (activeTab === 'agent') {
      return agentGeneralPrompt !== originalAgentGeneralPrompt;
    }
    return false;
  };

  // Change detection logic - only trigger when user actively changes data
  useEffect(() => {
    // Reset unsaved changes when switching tabs or when original data loads initially
    if (activeTab === 'agent' || activeTab === 'memory' || activeTab === 'integrations') {
      setHasUnsavedChanges(false);
    }
  }, [activeTab]);

  // Check for changes only when forms are updated (not on initial load or tab switch)
  useEffect(() => {
    // Check for changes based on current tab
    if (activeTab === 'memory') {
      setHasUnsavedChanges(checkForChanges());
    } else if (activeTab === 'agent') {
      setHasUnsavedChanges(checkForChanges());
    }
  }, [businessSettings, behaviorForm, integrationForm, agentGeneralPrompt, originalAgentGeneralPrompt, businessInfoText, originalBusinessInfoText, activeTab]);

  // Populate customer memory contentEditable when memory is selected
  useEffect(() => {
    if (customerMemoryEditableRef.current && isEditingCustomerMemory) {
      // Check if the element is currently focused (user is actively typing)
      const isFocused = document.activeElement === customerMemoryEditableRef.current;

      // Only update if NOT focused to prevent cursor jumping while typing
      if (!isFocused) {
        // Convert line breaks to <br> tags and sanitize for safe rendering
        const htmlContent = customerMemoryText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        customerMemoryEditableRef.current.innerHTML = DOMPurify.sanitize(htmlContent);
      }
    }
  }, [customerMemoryText, isEditingCustomerMemory, selectedCustomerMemoryId]);

  // Handle scroll behavior for responsive subtabs
  useEffect(() => {
    const handleScroll = () => {
      // Check scroll on the main content area instead of window
      const mainContent = document.querySelector('.main-content-scroll');
      const scrolled = mainContent ? mainContent.scrollTop > 50 : window.scrollY > 50;
      setIsScrolled(scrolled);
    };

    const mainContent = document.querySelector('.main-content-scroll');
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    } else {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Auto-focus inputs when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingEmail && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [isEditingEmail]);

  useEffect(() => {
    if (isEditingPhone && phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, [isEditingPhone]);

  // Edit/Verify handlers for account settings
  const handleEditName = () => {
    setEditNameValue(user?.name || '');
    setIsEditingName(true);
  };

  const handleVerifyName = () => {
    if (editNameValue.trim() && editNameValue !== user?.name) {
      updateNameMutation.mutate(editNameValue.trim());
    } else if (editNameValue === user?.name) {
      setIsEditingName(false);
    } else {
      toast({
        title: "Error", 
        description: "Name cannot be empty.",
        variant: "destructive"
      });
    }
  };

  const handleCancelEditName = () => {
    setEditNameValue(user?.name || '');
    setIsEditingName(false);
  };

  const handleEditEmail = () => {
    setEditEmailValue(user?.email || '');
    setIsEditingEmail(true);
  };

  const handleVerifyEmail = () => {
    if (editEmailValue.trim() && editEmailValue !== user?.email) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editEmailValue)) {
        toast({
          title: "Error",
          description: "Please enter a valid email address.",
          variant: "destructive"
        });
        return;
      }
      updateEmailMutation.mutate(editEmailValue.trim());
    } else if (editEmailValue === user?.email) {
      setIsEditingEmail(false);
    } else {
      toast({
        title: "Error",
        description: "Email cannot be empty.",
        variant: "destructive"
      });
    }
  };

  const handleCancelEditEmail = () => {
    setEditEmailValue(user?.email || '');
    setIsEditingEmail(false);
  };

  const handleShowPasswordForm = () => {
    setShowPasswordChangeForm(true);
  };

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Password validation helper
  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleSaveName = () => {
    if (!editNameValue || editNameValue.trim() === '') {
      toast({
        title: "Error",
        description: "Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    updateNameMutation.mutate(editNameValue.trim());
  };

  const handleSaveEmail = () => {
    if (!editEmailValue || editEmailValue.trim() === '') {
      toast({
        title: "Error",
        description: "Email cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmailValue.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    updateEmailMutation.mutate(editEmailValue.trim());
  };

  const handleSavePhone = () => {
    if (!editPhoneValue || editPhoneValue.trim() === '') {
      toast({
        title: "Error",
        description: "Phone number cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    // Remove all non-digit characters for validation
    const digitsOnly = editPhoneValue.replace(/\D/g, '');
    
    // Validate phone number (must be 10 or 11 digits)
    if (digitsOnly.length !== 10 && digitsOnly.length !== 11) {
      toast({
        title: "Error",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }

    // Format to E.164 format before saving
    const formattedPhone = formatPhoneForStorage(editPhoneValue);
    updatePhoneNumberMutation.mutate(formattedPhone);
  };

  const handleChangePassword = () => {
    // Form validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "All password fields are required.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  // Load transfer settings
  const loadTransferSettings = async () => {
    try {
      const response = await fetch('/api/business-settings');
      if (response.ok) {
        const data = await response.json();
        setTransferPhoneNumber(data.transferPhoneNumber || '');
        setEnableTransfer(data.enableTransfer !== false); // Default to true if not set
      }
    } catch (error) {
      console.error('Error loading transfer settings:', error);
    }
  };

  // Ensure knowledge base is connected to agent
  const ensureKnowledgeBaseConnected = async () => {
    if (!selectedAgentId) {
      toast({
        title: "Error",
        description: "No agent selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/agents/${selectedAgentId}/ensure-knowledge-base`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to connect knowledge base');
      }

      if (result.success && !result.alreadyConnected) {
        toast({
          title: "Knowledge Base Connected",
          description: "Successfully created and connected a new knowledge base to your AI receptionist.",
        });
      }
      // If already connected, no need to show a toast
    } catch (error: any) {
      console.error('Error ensuring knowledge base:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect knowledge base. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw so caller knows it failed
    }
  };

  // Save transfer settings
  const handleSaveTransferSettings = async () => {
    setIsLoadingTransferSettings(true);
    try {
      const response = await fetch('/api/business-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferPhoneNumber,
          enableTransfer
        })
      });

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Transfer settings have been updated successfully.",
        });
      } else {
        throw new Error('Failed to save transfer settings');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save transfer settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransferSettings(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('paymentCompleted');
        
        toast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
          variant: "default"
        });

        // Redirect to home
        window.location.href = '/';
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Error", 
        description: "Failed to logout properly. Redirecting anyway...",
        variant: "destructive"
      });
      
      // Clear local storage and redirect anyway
      localStorage.removeItem('authToken');
      localStorage.removeItem('selectedPlan');
      localStorage.removeItem('paymentCompleted');
      window.location.href = '/';
    }
  };

  const handleManageSubscription = async () => {
    setIsLoadingBillingPortal(true);
    console.log('🔄 Opening Stripe billing portal...');
    
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Billing portal response status:', response.status);

      if (response.status === 401) {
        // User is not authenticated, redirect to login
        toast({
          title: "Authentication Required",
          description: "Please log in again to access billing settings.",
          variant: "destructive"
        });
        setIsLoadingBillingPortal(false);
        window.location.href = '/';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Billing portal error response:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Billing portal URL received:', data.url ? 'Yes' : 'No');
      
      if (data.url) {
        console.log('🔄 Redirecting to Stripe Customer Portal...');
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
        // Note: Don't set loading to false here since we're redirecting away
      } else {
        throw new Error('No portal URL received from server');
      }
    } catch (error) {
      console.error('❌ Billing portal error:', error);
      setIsLoadingBillingPortal(false);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to access billing portal.";
      
      // Check if it's a Stripe configuration error
      if (errorMessage.includes('configuration') || errorMessage.includes('customer portal settings')) {
        toast({
          title: "Stripe Configuration Required", 
          description: "The Stripe Customer Portal needs to be configured first. Please contact support or configure it at https://dashboard.stripe.com/settings/billing/portal",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Billing Portal Error", 
          description: errorMessage,
          variant: "destructive"
        });
      }
    }
  };


  const handleEmailVerification = async () => {
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send verification email');
      }

      const result = await response.json();
      toast({
        title: "Successfully sent a verification",
        description: result.message || "Please check your email for the verification link.",
        variant: "default"
      });

    } catch (error) {
      console.error('Email verification error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send verification email. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSaveGreetings = async () => {
    try {
      // Check if we have an agent ID to update
      if (!businessData.elevenLabsAgentId) {
        toast({
          title: "No Agent Found",
          description: "No AI agent is configured. Please set up your AI receptionist first.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/voice/update-agent-greeting', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId: businessData.elevenLabsAgentId,
          businessHoursGreeting: greetingForm.businessHours,
          afterHoursGreeting: greetingForm.afterHours
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update agent greeting');
      }

      const result = await response.json();
      toast({
        title: "Success",
        description: "AI agent greetings updated successfully!",
        variant: "default"
      });

    } catch (error) {
      console.error('Update greeting error:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update agent greetings. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Server-side encryption handles all credential security
  // Client sends plaintext over HTTPS and server encrypts using AES-256-GCM

  // Load user credentials on page load
  const { data: squareCredentials } = useQuery({
    queryKey: ['/api/user/credentials/square_pos'],
    enabled: isAuthenticated && activeTab === 'integrations',
    select: (data) => {
      if (!Array.isArray(data)) return {};
      return data.reduce((acc, cred) => ({
        ...acc,
        [cred.credentialName]: true // Just check existence, don't expose values
      }), {});
    },
    staleTime: 300000, // Data is fresh for 5 minutes (credentials rarely change)
    placeholderData: [] // Show empty array immediately while loading
  });

  const { data: googleCredentials } = useQuery({
    queryKey: ['/api/user/credentials/google_calendar'],
    enabled: isAuthenticated && activeTab === 'integrations',
    staleTime: 300000, // Data is fresh for 5 minutes (credentials rarely change)
    placeholderData: [], // Show empty array immediately while loading
    select: (data) => {
      if (!Array.isArray(data)) return {};
      return data.reduce((acc, cred) => ({
        ...acc,
        [cred.credentialName]: true // Just check existence, don't expose values
      }), {});
    }
  });

  // Save integration credentials
  const saveCredentialsMutation = useMutation({
    mutationFn: async (credentials: Array<{integrationType: string, credentialName: string, value: string}>) => {
      const promises = credentials
        .filter(cred => cred.value.trim()) // Only save non-empty values
        .map(cred => 
          apiRequest('/api/user/credentials', {
            method: 'POST',
            body: {
              integrationType: cred.integrationType,
              credentialName: cred.credentialName,
              value: cred.value // Send plaintext - server encrypts with AES-256-GCM
            }
          })
        );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Integration Credentials Saved",
        description: "Your API keys and credentials have been securely stored.",
        variant: "default"
      });
      // Clear form for security
      setIntegrationForm({
        squareAppId: '',
        squareAccessToken: '',
        squareLocationId: '',
        googleClientId: '',
        googleClientSecret: '',
        googleCalendarId: ''
      });
      // Invalidate credentials queries to refresh status
      queryClient.invalidateQueries({ queryKey: ['/api/user/credentials'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save integration credentials. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Save behavior settings mutation
  const saveBehaviorMutation = useMutation({
    mutationFn: async (behaviorData: typeof behaviorForm) => {
      return await apiRequest('POST', '/api/business-settings/behavior', behaviorData);
    },
    onSuccess: () => {
      toast({
        title: "Behavior Settings Saved",
        description: "Your AI receptionist behavior has been updated and conversation flow updated.",
        variant: "default"
      });
      setOriginalData(prev => ({ ...prev, behavior: behaviorForm }));
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save behavior settings.",
        variant: "destructive"
      });
    }
  });

  // Save info settings mutation
  const saveInfoMutation = useMutation({
    mutationFn: async (infoData: typeof businessSettings) => {
      return await apiRequest('POST', '/api/business-settings/info', infoData);
    },
    onSuccess: () => {
      toast({
        title: "Business Information Saved",
        description: "Your business information has been updated in all systems.",
        variant: "default"
      });
      setOriginalData(prev => ({ ...prev, info: businessSettings }));
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save business information.",
        variant: "destructive"
      });
    }
  });

  // Save integrations mutation
  const saveIntegrationsMutation = useMutation({
    mutationFn: async (integrationData: typeof integrationForm) => {
      return await apiRequest('POST', '/api/business-settings/integrations', integrationData);
    },
    onSuccess: () => {
      toast({
        title: "Integrations Saved",
        description: "Your integration settings have been saved.",
        variant: "default"
      });
      setOriginalData(prev => ({ ...prev, integrations: integrationForm }));
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save integrations.",
        variant: "destructive"
      });
    }
  });

  // Team invitation mutation
  const inviteTeamMemberMutation = useMutation({
    mutationFn: async ({ email, role, assignedAgentIds }: { email: string; role: string; assignedAgentIds?: string[] }) => {
      return await apiRequest('POST', '/api/team/invite', { email, role, assignedAgentIds });
    },
    onSuccess: (data: any, variables) => {
      const roleDisplay = variables.role.charAt(0).toUpperCase() + variables.role.slice(1);
      toast({
        title: "Invitation Sent",
        description: `An email has been sent to ${variables.email} inviting them to join your VoiceBot dashboard as ${roleDisplay}.`,
        variant: "default"
      });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('');
      setInviteAssignedAgents([]);
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Invitation Failed",
        description: error?.message || "Failed to send team invitation.",
        variant: "destructive"
      });
    }
  });

  // Remove team member mutation
  const removeTeamMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest('DELETE', `/api/team/members/${memberId}`);
    },
    onSuccess: () => {
      toast({
        title: "Member Removed",
        description: "Team member has been removed successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove team member.",
        variant: "destructive"
      });
    }
  });

  // Update team member role mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      return await apiRequest('PATCH', `/api/team/members/${memberId}`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "Team member role has been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update team member role.",
        variant: "destructive"
      });
    }
  });

  // Webhook testing mutation
  const testWebhooksMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/webhook/test-all', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      setWebhookTestResults(data.testResults || []);
      toast({
        title: "Webhook Tests Completed",
        description: `${data.summary?.passed || 0}/${data.summary?.total || 0} tests passed`,
        variant: data.summary?.failed > 0 ? "destructive" : "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Webhook Test Failed",
        description: error.message || "Failed to test webhooks.",
        variant: "destructive"
      });
    }
  });

  // Helper functions for trigger function selection
  const handleSelectAllFunctions = () => {
    const allFunctions = getCustomFunctionsForIndustry(selectedAgentIndustry);
    const allFunctionNames = allFunctions.map(func => func.name);
    setNewIntegrationForm(prev => ({ ...prev, triggerFunctions: allFunctionNames }));
  };

  const handleSelectNoneFunctions = () => {
    setNewIntegrationForm(prev => ({ ...prev, triggerFunctions: [] }));
  };

  const handleToggleFunction = (functionName: string) => {
    setNewIntegrationForm(prev => {
      const isSelected = prev.triggerFunctions.includes(functionName);
      if (isSelected) {
        return { ...prev, triggerFunctions: prev.triggerFunctions.filter(f => f !== functionName) };
      } else {
        return { ...prev, triggerFunctions: [...prev.triggerFunctions, functionName] };
      }
    });
  };

  const handleSaveIntegrations = async () => {
    const credentials = [
      // Platform preference
      { integrationType: 'platform', credentialName: 'selected_platform', value: integrationForm.platform },
      
      // Square POS credentials (when selected)
      ...(integrationForm.platform === 'square' ? [
        { integrationType: 'square_pos', credentialName: 'app_id', value: integrationForm.squareAppId },
        { integrationType: 'square_pos', credentialName: 'access_token', value: integrationForm.squareAccessToken },
        { integrationType: 'square_pos', credentialName: 'location_id', value: integrationForm.squareLocationId }
      ] : []),
      
      // Toast POS credentials (when selected)
      ...(integrationForm.platform === 'toast' ? [
        { integrationType: 'toast_pos', credentialName: 'client_key', value: integrationForm.toastClientKey },
        { integrationType: 'toast_pos', credentialName: 'client_secret', value: integrationForm.toastClientSecret },
        { integrationType: 'toast_pos', credentialName: 'location_id', value: integrationForm.toastLocationId }
      ] : []),
      
      // Clover POS credentials (when selected)
      ...(integrationForm.platform === 'clover' ? [
        { integrationType: 'clover_pos', credentialName: 'app_id', value: integrationForm.cloverAppId },
        { integrationType: 'clover_pos', credentialName: 'app_secret', value: integrationForm.cloverAppSecret },
        { integrationType: 'clover_pos', credentialName: 'merchant_id', value: integrationForm.cloverMerchantId }
      ] : []),
      
      // Google Calendar credentials (always saved regardless of platform)
      { integrationType: 'google_calendar', credentialName: 'client_id', value: integrationForm.googleClientId },
      { integrationType: 'google_calendar', credentialName: 'client_secret', value: integrationForm.googleClientSecret },
      { integrationType: 'google_calendar', credentialName: 'calendar_id', value: integrationForm.googleCalendarId }
    ];
    
    saveCredentialsMutation.mutate(credentials);
  };

  const handleSaveBusinessSettings = async () => {
    saveBusinessSettingsMutation.mutate(businessSettings);
  };

  // Delete knowledge source handler (supports both single and bulk delete)
  const handleDeleteSource = async () => {
    if (!selectedAgentId) return;

    // If we're in editing mode (adding a new source), just cancel the editing - don't delete from server
    if (editingSource) {
      setEditingSource(null);
      setPendingSourceData({});
      setShowDeleteDialog(false);
      return;
    }

    // If we're viewing the main Business Information (no selectedSourceId), clear it
    if (!selectedSourceId && !editingSource) {
      setIsDeletingSource(true);
      try {
        // Get agent to find knowledge base ID
        const agent = voiceAgentsData?.find((a: any) => a.id === selectedAgentId);

        // Delete from Retell AI knowledge base first (if exists)
        if (agent?.retellLlmId) {
          try {
            // Get knowledge base content to find the text source ID
            const kbContentResponse = await fetch(`/api/restaurant/${selectedAgentId}/knowledge-base-content`);
            if (kbContentResponse.ok) {
              const kbData = await kbContentResponse.json();

              // Try to get knowledge base ID from LLM
              const llmResponse = await fetch(`https://api.retellai.com/get-retell-llm/${agent.retellLlmId}`, {
                headers: {
                  'Authorization': `Bearer ${process.env.RETELL_API_KEY}`
                }
              });

              if (llmResponse.ok) {
                const llmData = await llmResponse.json();
                const knowledgeBaseId = llmData.knowledge_base_ids?.[0];

                if (knowledgeBaseId) {
                  // Get knowledge base details to find the business info source
                  const kbResponse = await fetch(`https://api.retellai.com/get-knowledge-base/${knowledgeBaseId}`, {
                    headers: {
                      'Authorization': `Bearer ${process.env.RETELL_API_KEY}`
                    }
                  });

                  if (kbResponse.ok) {
                    const kbDetails = await kbResponse.json();
                    const textSources = kbDetails.knowledge_base_sources?.filter((s: any) => s.type === 'text') || [];

                    // Delete all text sources (business info is stored as text)
                    for (const source of textSources) {
                      try {
                        await fetch(`https://api.retellai.com/delete-knowledge-base-source/${knowledgeBaseId}/source/${source.source_id}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${process.env.RETELL_API_KEY}`
                          }
                        });
                        console.log('✅ Deleted business info from Retell AI knowledge base');
                      } catch (err) {
                        console.error('❌ Failed to delete from Retell AI:', err);
                      }
                    }
                  }
                }
              }
            }
          } catch (retellError) {
            console.error('⚠️ Error deleting from Retell AI (non-critical):', retellError);
            // Continue with database deletion even if Retell deletion fails
          }
        }

        // Save empty business info to server to persist the deletion
        await apiRequest('PATCH', `/api/restaurant/${selectedAgentId}`, {
          rawBusinessInfo: ''
        });

        setBusinessInfoText('');
        setOriginalBusinessInfoText('');
        setHasMemoryChanges(false);
        setShowDeleteDialog(false);

        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({
          queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content']
        });

        toast({
          title: "Business Information Cleared",
          description: "Business information has been cleared successfully.",
        });
      } catch (error: any) {
        console.error('Error clearing business information:', error);
        toast({
          title: "Clear Failed",
          description: error.message || "Failed to clear business information. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsDeletingSource(false);
      }
      return;
    }

    // Determine if this is a bulk delete or single delete
    const isBulkDelete = selectedSourceIds.size > 0;
    const sourceIdsToDelete = isBulkDelete
      ? Array.from(selectedSourceIds)
      : (selectedSourceId ? [selectedSourceId] : []);

    if (sourceIdsToDelete.length === 0) return;

    setIsDeletingSource(true);
    try {
      // Delete all sources in parallel
      const deletePromises = sourceIdsToDelete.map(sourceId =>
        fetch(`/api/knowledge-sources/${sourceId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }).then(response => {
          if (!response.ok) {
            return response.json().then(errorData => {
              throw new Error(errorData.message || 'Failed to delete source');
            });
          }
          return response;
        })
      );

      await Promise.all(deletePromises);

      toast({
        title: isBulkDelete ? "Sources Deleted" : "Source Deleted",
        description: isBulkDelete
          ? `${sourceIdsToDelete.length} knowledge source${sourceIdsToDelete.length > 1 ? 's have' : ' has'} been removed successfully.`
          : "Knowledge source has been removed successfully.",
      });

      // Clear selections and close dialog
      setSelectedSourceId(null);
      setSelectedSourceData(null);
      setSelectedSourceIds(new Set());
      setShowDeleteDialog(false);

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['/api/knowledge-sources', selectedAgentId]
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content']
      });

    } catch (error: any) {
      console.error('Error deleting source(s):', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete knowledge source(s). Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingSource(false);
    }
  };

  // Delete function handler
  const handleDeleteFunction = async () => {
    if (!selectedAgentId || !functionToDelete) {
      console.error('❌ Missing required data:', { selectedAgentId, functionToDelete });
      return;
    }

    console.log('🗑️ Starting function deletion:', { agentId: selectedAgentId, functionName: functionToDelete });
    setIsDeletingFunction(true);
    try {
      const url = `/api/agents/${selectedAgentId}/functions/${functionToDelete}`;
      console.log('🗑️ DELETE request URL:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include'
      });

      console.log('🗑️ Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Delete failed:', errorData);
        throw new Error(errorData.message || 'Failed to delete action');
      }

      const result = await response.json();
      console.log('✅ Delete successful:', result);

      toast({
        title: "Action Deleted",
        description: "The action has been successfully removed from Retell AI and your actions list.",
      });

      // Close the dialog
      setShowDeleteFunctionDialog(false);
      setFunctionToDelete(null);

      // Refresh the actions list
      console.log('🔄 Invalidating queries to refresh actions list');
      queryClient.invalidateQueries({
        queryKey: ['/api/integrations/retell-functions', selectedAgentId]
      });
    } catch (error: any) {
      console.error('❌ Error deleting function:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingFunction(false);
    }
  };

  // Multi-select computed values
  const hasBusinessInfo = businessInfoText && businessInfoText.trim();
  const totalSources = (knowledgeSources?.length || 0) + (hasBusinessInfo ? 1 : 0);
  const allSourcesSelected = totalSources > 0 && selectedSourceIds.size === totalSources;
  const someSourcesSelected = selectedSourceIds.size > 0 && selectedSourceIds.size < totalSources;

  // Multi-select handlers for bulk actions
  const handleSelectSource = (id: string) => {
    const newSelection = new Set(selectedSourceIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedSourceIds(newSelection);
  };

  const handleSelectAllSources = () => {
    if (!knowledgeSources || knowledgeSources.length === 0) return;

    // Count total sources including Business Information if it exists
    const hasBusinessInfo = businessInfoText && businessInfoText.trim();
    const totalSources = knowledgeSources.length + (hasBusinessInfo ? 1 : 0);

    if (selectedSourceIds.size === totalSources) {
      setSelectedSourceIds(new Set());
    } else {
      const allIds = knowledgeSources.map((s: any) => s.id);
      if (hasBusinessInfo) {
        allIds.push('business-info');
      }
      setSelectedSourceIds(new Set(allIds));
    }
  };

  const handleClearSelection = () => {
    setSelectedSourceIds(new Set());
  };

  // Save memory changes (for bulk selection bar)
  const handleSaveMemory = async () => {
    if (!selectedAgentId) {
      toast({
        title: "Error",
        description: "No agent selected.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingMemory(true);
    try {
      // Save business info if it has changes
      if (businessInfoText !== originalBusinessInfoText) {
        await apiRequest('PATCH', `/api/restaurant/${selectedAgentId}`, {
          rawBusinessInfo: businessInfoText
        });
      }

      // Save selected source if it has changes
      if (selectedSourceId && selectedSourceData && hasMemoryChanges) {
        await fetch(`/api/knowledge-sources/${selectedSourceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: selectedSourceData.title,
            textContent: selectedSourceData.textContent,
            url: selectedSourceData.url,
            autoRefresh: selectedSourceData.autoRefresh
          })
        });
      }

      setIsSavingMemory(false);
      setHasMemoryChanges(false);
      setOriginalBusinessInfoText(businessInfoText);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content'] });
      
      toast({
        title: "Changes Saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      console.error('Error saving memory:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save changes. Please try again.",
        variant: "destructive",
      });
      setIsSavingMemory(false);
    }
  };

  // Revert memory changes
  const handleRevertMemory = () => {
    // Revert business info
    setBusinessInfoText(originalBusinessInfoText);
    if (businessInfoEditableRef.current) {
      businessInfoEditableRef.current.textContent = originalBusinessInfoText;
    }

    // Revert selected source if needed
    if (selectedSourceId && selectedSourceData) {
      // Reload the source data from the server
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });
      setSelectedSourceData(null);
      setSelectedSourceId(null);
    }

    setHasMemoryChanges(false);
    toast({
      title: "Changes Reverted",
      description: "All changes have been discarded.",
    });
  };

  // Undo/Redo handlers for Business Information
  const handleMemoryUndo = () => {
    if (memoryHistoryIndex > 0) {
      const newIndex = memoryHistoryIndex - 1;
      const previousText = memoryHistory[newIndex];
      setMemoryHistoryIndex(newIndex);
      setBusinessInfoText(previousText);
      if (businessInfoEditableRef.current) {
        // Use textContent instead of innerHTML for safe plain text rendering
        businessInfoEditableRef.current.textContent = previousText;
      }
    }
  };

  const handleMemoryRedo = () => {
    if (memoryHistoryIndex < memoryHistory.length - 1) {
      const newIndex = memoryHistoryIndex + 1;
      const nextText = memoryHistory[newIndex];
      setMemoryHistoryIndex(newIndex);
      setBusinessInfoText(nextText);
      if (businessInfoEditableRef.current) {
        // Use textContent instead of innerHTML for safe plain text rendering
        businessInfoEditableRef.current.textContent = nextText;
      }
    }
  };

  // Undo/Redo handlers for Agent
  const handleAgentUndo = () => {
    if (agentHistoryIndex > 0) {
      const newIndex = agentHistoryIndex - 1;
      const previousText = agentHistory[newIndex];
      setAgentHistoryIndex(newIndex);
      setAgentGeneralPrompt(previousText);
      if (contentEditableRef.current) {
        contentEditableRef.current.textContent = previousText;
      }
    }
  };

  const handleAgentRedo = () => {
    if (agentHistoryIndex < agentHistory.length - 1) {
      const newIndex = agentHistoryIndex + 1;
      const nextText = agentHistory[newIndex];
      setAgentHistoryIndex(newIndex);
      setAgentGeneralPrompt(nextText);
      if (contentEditableRef.current) {
        contentEditableRef.current.textContent = nextText;
      }
    }
  };

  // Export selected knowledge sources
  const handleExportSources = () => {
    if (!knowledgeSources || selectedSourceIds.size === 0) return;

    // Get selected sources
    const selectedSources = knowledgeSources.filter((s: any) => selectedSourceIds.has(s.id));

    // Prepare export data
    const exportData = selectedSources.map((source: any) => ({
      id: source.id,
      type: source.type,
      title: source.type === 'file' ? source.fileName :
             source.type === 'text' ? (source.title || 'Text Content') :
             source.url,
      url: source.type === 'url' ? source.url : undefined,
      fileName: source.type === 'file' ? source.fileName : undefined,
      fileSize: source.type === 'file' ? source.fileSize : undefined,
      textContent: source.type === 'text' ? source.textContent : undefined,
      autoRefresh: source.autoRefresh || false,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt
    }));

    // Create JSON blob
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `knowledge-sources-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `${selectedSourceIds.size} source${selectedSourceIds.size > 1 ? 's' : ''} exported successfully.`,
    });
  };

  // Sync/Refresh selected URL sources
  const handleSyncRefreshSources = async () => {
    if (!knowledgeSources || !selectedAgentId || selectedSourceIds.size === 0) return;

    // Get selected URL sources only
    const selectedUrlSources = knowledgeSources.filter(
      (s: any) => selectedSourceIds.has(s.id) && s.type === 'url'
    );

    if (selectedUrlSources.length === 0) {
      toast({
        title: "No URL Sources",
        description: "Please select at least one URL source to sync/refresh.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Syncing Sources",
      description: `Refreshing ${selectedUrlSources.length} URL source${selectedUrlSources.length > 1 ? 's' : ''}...`,
    });

    try {
      // Trigger refresh for each URL source by making a PATCH request
      const refreshPromises = selectedUrlSources.map((source: any) =>
        fetch(`/api/knowledge-sources/${source.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refresh: true // Trigger re-scraping
          })
        }).then(response => {
          if (!response.ok) {
            return response.json().then(errorData => {
              throw new Error(errorData.message || 'Failed to refresh source');
            });
          }
          return response;
        })
      );

      await Promise.all(refreshPromises);

      toast({
        title: "Sync Complete",
        description: `${selectedUrlSources.length} URL source${selectedUrlSources.length > 1 ? 's have' : ' has'} been refreshed successfully.`,
      });

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['/api/knowledge-sources', selectedAgentId]
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content']
      });

    } catch (error: any) {
      console.error('Error refreshing source(s):', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to refresh URL source(s). Please try again.",
        variant: "destructive",
      });
    }
  };

  // View activity logs for a knowledge source
  const handleViewActivity = async () => {
    if (selectedSourceIds.size !== 1) return;

    const sourceId = Array.from(selectedSourceIds)[0];
    setIsLoadingActivity(true);
    setShowActivityModal(true);

    try {
      const response = await fetch(`/api/knowledge-sources/${sourceId}/activity`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      setActivityLogs(data.activity || []);
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: "Failed to Load Activity",
        description: error.message || "Could not load activity logs. Please try again.",
        variant: "destructive",
      });
      setShowActivityModal(false);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Sticky save button handler - saves all forms and updates Retell AI conversation flow
  const handleStickySave = async () => {
    try {
      // Validate integrations before saving
      if (activeTab === 'integrations') {
        for (const integration of customIntegrations) {
          // Validate required fields
          const requiredFields = {
            'Name': integration.name,
            'Description': integration.description,
            'API Key': integration.apiKey,
            'Application ID': integration.applicationId,
            'Client Secret': integration.clientSecret,
            'Webhook Secret': integration.webhookSecret,
            'API Endpoint URL': integration.apiEndpointUrl,
            'Webhook URL': integration.webhookUrl,
            'Authorization': integration.authorization,
            'JSON Payload Schema': integration.jsonPayloadSchema,
            'Response Variables': integration.responseVariables
          };

          const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([field, _]) => field);

          if (missingFields.length > 0) {
            toast({
              title: "Invalid Integration Configuration",
              description: `Integration "${integration.name}" is missing: ${missingFields.join(', ')}`,
              variant: "destructive"
            });
            return;
          }

          // Validate URLs
          try {
            new URL(integration.apiEndpointUrl);
          } catch (e) {
            toast({
              title: "Invalid API Endpoint URL",
              description: `Integration "${integration.name}" has an invalid API Endpoint URL`,
              variant: "destructive"
            });
            return;
          }

          try {
            new URL(integration.webhookUrl);
          } catch (e) {
            toast({
              title: "Invalid Webhook URL",
              description: `Integration "${integration.name}" has an invalid Webhook URL`,
              variant: "destructive"
            });
            return;
          }

          // Validate JSON schema
          if (integration.jsonPayloadSchema) {
            try {
              JSON.parse(integration.jsonPayloadSchema);
            } catch (e) {
              toast({
                title: "Invalid JSON Payload Schema",
                description: `Integration "${integration.name}" has invalid JSON in the payload schema`,
                variant: "destructive"
              });
              return;
            }
          }

          // Validate timeout
          if (integration.timeout <= 0) {
            toast({
              title: "Invalid Timeout",
              description: `Integration "${integration.name}" has an invalid timeout value`,
              variant: "destructive"
            });
            return;
          }
        }
      }

      // Save inline source editing if active - handle EXCLUSIVELY (don't save other forms)
      if (editingSource && selectedAgentId) {
        if (editingSource === 'file' && pendingSourceData.file) {
          // Upload file directly
          setIsUploadingFile(true);
          const formData = new FormData();
          formData.append('file', pendingSourceData.file);
          formData.append('agentId', selectedAgentId);

          try {
            const response = await fetch('/api/knowledge-sources/upload-file', {
              method: 'POST',
              body: formData,
              credentials: 'include',
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.message || 'Failed to upload file');
            }

            const data = await response.json();
            setIsUploadingFile(false);
            queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });

            // Clear editing state and redirect to the new source
            setEditingSource(null);
            setPendingSourceData({});
            if (data.source) {
              setSelectedSourceId(data.source.id);
              setSelectedSourceData(data.source);
            }

            toast({
              title: "File Uploaded",
              description: "Your file has been uploaded to the knowledge base successfully.",
              variant: "default",
            });
            return; // Exit early - don't save other forms
          } catch (error: any) {
            setIsUploadingFile(false);
            throw error;
          }
        } else if (editingSource === 'webpage' && pendingSourceData.url) {
          // Validate and format URL
          let url = pendingSourceData.url.trim();

          // Auto-prepend https:// if no protocol is present
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
          }

          // Scrape URL directly
          setIsScrapingUrl(true);
          try {
            const response = await apiRequest('POST', '/api/knowledge-sources/scrape-url', {
              agentId: selectedAgentId,
              url: url,
              title: pendingSourceData.title || url.split('/')[0],
              autoRefresh: pendingSourceData.autoRefresh || false
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.message || 'Failed to scrape URL');
            }

            const data = await response.json();
            setIsScrapingUrl(false);
            queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });

            // Clear editing state and redirect to the new source
            setEditingSource(null);
            setPendingSourceData({});
            if (data.source) {
              setSelectedSourceId(data.source.id);
              setSelectedSourceData(data.source);
            }

            toast({
              title: "Website Scraped",
              description: "The website has been added to the knowledge base successfully.",
              variant: "default",
            });
            return; // Exit early - don't save other forms
          } catch (error: any) {
            setIsScrapingUrl(false);
            throw error;
          }
        } else if (editingSource === 'text' && pendingSourceData.textContent) {
          // Add text to knowledge base
          setIsSaving(true);
          try {
            const response = await apiRequest('POST', '/api/knowledge-sources/add-text', {
              agentId: selectedAgentId,
              textContent: pendingSourceData.textContent,
              title: pendingSourceData.title || 'Untitled'
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.message || 'Failed to add text');
            }

            const data = await response.json();
            setIsSaving(false);
            queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });

            // Clear editing state and redirect to the new source
            setEditingSource(null);
            setPendingSourceData({});
            if (data.source) {
              setSelectedSourceId(data.source.id);
              setSelectedSourceData(data.source);
            }

            toast({
              title: "Text Added",
              description: "Your text has been added to the knowledge base successfully.",
              variant: "default",
            });
            return; // Exit early - don't save other forms
          } catch (error: any) {
            setIsSaving(false);
            throw error;
          }
        } else {
          // No data to save
          toast({
            title: "Missing Data",
            description: `Please ${editingSource === 'file' ? 'select a file' : editingSource === 'webpage' ? 'enter a URL' : 'enter text content'} before saving.`,
            variant: "destructive"
          });
          return;
        }
      }

      // Handle updates to existing selected source
      if (selectedSourceId && selectedSourceData && hasMemoryChanges && selectedAgentId) {
        setIsSaving(true);
        try {
          const response = await fetch(`/api/knowledge-sources/${selectedSourceId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              title: selectedSourceData.title,
              textContent: selectedSourceData.textContent,
              url: selectedSourceData.url,
              autoRefresh: selectedSourceData.autoRefresh
            })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update source');
          }

          await response.json();
          setIsSaving(false);
          setHasMemoryChanges(false);
          queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });
          queryClient.invalidateQueries({ queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content'] });
          toast({
            title: "Changes Saved",
            description: "Knowledge source has been updated successfully.",
            variant: "default",
          });
          return; // Exit early - don't save other forms
        } catch (error: any) {
          setIsSaving(false);
          throw error;
        }
      }

      // Save all form data based on what has changes (only if NOT doing inline editing)
      const promises = [];

      // Save memory changes if they exist
      if (businessInfoText !== originalBusinessInfoText) {
        setIsSavingMemory(true);
        // Save the business info to the selected agent's restaurant data
        if (!selectedAgentId) {
          setIsSavingMemory(false);
          throw new Error('No agent selected');
        }
        promises.push(
          apiRequest('PATCH', `/api/restaurant/${selectedAgentId}`, {
            rawBusinessInfo: businessInfoText
          }).then((result) => {
            setIsSavingMemory(false);
            // Invalidate the knowledge base content query to refetch from Retell AI
            queryClient.invalidateQueries({ queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content'] });
            return result;
          }).catch((error) => {
            setIsSavingMemory(false);
            throw error;
          })
        );
      }

      // Save agent changes if they exist
      if (agentGeneralPrompt !== originalAgentGeneralPrompt) {
        setIsSavingAgent(true);
        promises.push(
          apiRequest('PATCH', '/api/agent/general-prompt', {
            generalPrompt: agentGeneralPrompt,
            agentId: selectedAgentId
          }).then((result) => {
            setIsSavingAgent(false);
            return result;
          }).catch((error) => {
            setIsSavingAgent(false);
            throw error;
          })
        );
      }
      
      // Save behavior form changes if they exist
      if (JSON.stringify(behaviorForm) !== JSON.stringify(originalData.agent || {})) {
        promises.push(apiRequest('POST', '/api/business-settings/behavior', behaviorForm));
      }

      // Save integration changes if they exist
      if (JSON.stringify(customIntegrations) !== JSON.stringify(originalCustomIntegrations)) {
        if (!selectedAgentId) {
          throw new Error('No agent selected');
        }
        // Save custom integrations with agentId
        promises.push(apiRequest('POST', '/api/integrations/custom', {
          agentId: selectedAgentId,
          integrations: customIntegrations
        }));
      }

      // Wait for all saves to complete - use allSettled to handle partial failures
      if (promises.length === 0) {
        toast({
          title: "No Changes",
          description: "There are no unsaved changes to save.",
          variant: "default"
        });
        return;
      }
      
      const results = await Promise.allSettled(promises);
      
      // Check for failures
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        const firstError: any = failures[0];
        const errorMessage = firstError.reason?.message || 'Unknown error';
        
        // Check if it's an authentication error
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          throw new Error('Unauthorized');
        }
        
        throw new Error(errorMessage);
      }

      // Track what was changed BEFORE updating state (for success message)
      const agentChanged = agentGeneralPrompt !== originalAgentGeneralPrompt || JSON.stringify(behaviorForm) !== JSON.stringify(originalData.agent || {});
      const memoryChanged = businessInfoText !== originalBusinessInfoText;
      const integrationsChanged = JSON.stringify(customIntegrations) !== JSON.stringify(originalCustomIntegrations);

      // Update Retell AI conversation flow with dynamic variables
      if (businessData.retellAgentId) {
        const dynamicVariables = {
          business_hours: businessSettings.businessHours || 'Please contact us for our hours',
          after_hours_greeting: behaviorForm.afterHoursGreeting || 'We are currently closed. Please call back during business hours.',
          global_prompt: behaviorForm.globalPrompt || 'You are a helpful AI receptionist.',
          business_info: `${businessSettings.businessName || 'Your Business'} - ${businessSettings.businessDescription || 'Full-service business'}`,
          business_name: businessSettings.businessName || businessData.businessName || 'Your Business',
          delivery_radius: businessSettings.deliveryRadius ? `${businessSettings.deliveryRadius} miles` : '10 miles',
          phone_number: businessData.phoneNumber || 'Please contact us for our phone number'
        };

        await apiRequest('POST', '/api/retell/update-conversation-flow', {
          agentId: businessData.retellAgentId,
          dynamicVariables
        });
      }

      // Update local state
      setOriginalData(prev => ({
        ...prev,
        info: businessSettings,
        behavior: behaviorForm,
        integrations: integrationForm
      }));

      // Update original agent general prompt if it was changed
      if (agentGeneralPrompt !== originalAgentGeneralPrompt) {
        setOriginalAgentGeneralPrompt(agentGeneralPrompt);
        setHasAgentChanges(false);
      }

      // Update original business info text if it was changed
      if (businessInfoText !== originalBusinessInfoText) {
        setOriginalBusinessInfoText(businessInfoText);
        setHasMemoryChanges(false);
      }

      // Update original custom integrations if they were changed
      if (JSON.stringify(customIntegrations) !== JSON.stringify(originalCustomIntegrations)) {
        setOriginalCustomIntegrations(customIntegrations);
        setHasUnsavedChanges(false);
        // Invalidate query to refetch integrations with agentId
        queryClient.invalidateQueries({ queryKey: ['/api/integrations/custom', selectedAgentId] });
      }

      // Build descriptive success message based on what was saved
      const savedItems = [];
      if (agentChanged) {
        savedItems.push("agent settings");
      }
      if (memoryChanged) {
        savedItems.push("business information");
      }
      if (integrationsChanged) {
        savedItems.push("integrations");
      }

      // Only show generic success toast if something other than inline editing was saved
      // (inline editing shows its own specific toast)
      if (savedItems.length > 0) {
        toast({
          title: "Settings Saved",
          description: `Your ${savedItems.join(', ')} have been successfully updated.`,
          variant: "default"
        });
      }

    } catch (error: any) {
      console.error('Save error:', error);
      
      // Check if it's an authentication error
      if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please refresh the page and log in again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Save Failed",
          description: error.message || "Failed to save settings. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Categorize custom functions from Retell AI
  const categorizedFunctions = useMemo(() => {
    const allFunctions = Array.isArray(retellCustomFunctions) ? retellCustomFunctions : [];

    // Filter out deprecated SMS functions (send_sms_confirmation, sms_alert)
    const functions = allFunctions.filter((func: any) => {
      const funcName = func.name || '';
      return funcName !== 'send_sms_confirmation' && funcName !== 'sms_alert';
    });

    // Define category mapping with comprehensive patterns
    const categories = {
      appointmentSetting: {
        name: 'Appointment Setting',
        color: 'blue',
        icon: 'calendar',
        functions: [] as any[],
        patterns: ['book', 'appointment', 'reservation', 'schedule', 'calendar', 'availability', 'reschedule', 'modify_appointment', 'cancel_appointment', 'cancel_service', 'cancel_booking', 'modify_booking', 'modify_service']
      },
      crm: {
        name: 'CRM',
        color: 'purple',
        icon: 'users',
        functions: [] as any[],
        patterns: ['customer', 'memory', 'contact', 'client', 'profile', 'feedback', 'inquiry', 'patient', 'membership', 'lookup', 'note']
      },
      pointOfSale: {
        name: 'Point of Sale',
        color: 'green',
        icon: 'shopping-cart',
        functions: [] as any[],
        patterns: ['order', 'place', 'purchase', 'payment', 'transaction', 'cart', 'checkout', 'estimate', 'service_status']
      },
      messaging: {
        name: 'Messaging',
        color: 'orange',
        icon: 'comment',
        functions: [] as any[],
        patterns: ['sms', 'message', 'text', 'notification', 'alert', 'email', 'send', 'confirmation', 'confirm']
      },
      callActions: {
        name: 'Call Actions',
        color: 'cyan',
        icon: 'phone',
        functions: [] as any[],
        patterns: ['transfer', 'end_call', 'hangup', 'disconnect']
      },
      customIntegration: {
        name: 'Custom Integration',
        color: 'yellow',
        icon: 'plug',
        functions: [] as any[],
        patterns: ['custom', 'webhook', 'external', 'api']
      }
    };

    // Build a lookup of function name → verbose config description so we can detect
    // functions whose description has never been customized by the user.
    const verboseDescLookup: Record<string, string> = {};
    Object.values(RETELL_FUNCTIONS_BY_INDUSTRY).forEach((cfg: any) => {
      cfg.functions.forEach((fn: any) => { verboseDescLookup[fn.name] = fn.description; });
    });

    // Format a snake_case name into Title Case for display as a title.
    const formatTitle = (name: string) =>
      name.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Map savedCategory keys to category bucket keys
    const savedCategoryToKey: Record<string, string> = {
      appointmentSetting: 'appointmentSetting',
      crm: 'crm',
      pointOfSale: 'pointOfSale',
      messaging: 'messaging',
      callActions: 'callActions',
      customIntegration: 'customIntegration',
      custom: 'customIntegration'
    };

    // Categorize each function
    functions.forEach((func: any) => {
      const functionName = func.name || '';
      const functionNameLower = functionName.toLowerCase();

      // Determine the display title.
      // Priority: savedDisplayTitle (user-customised) > formatted function name
      // The function name is always the title — descriptions are too long to use as labels.
      let displayTitle: string;
      if (func.savedDisplayTitle) {
        // Use the saved display title from database (highest priority, preserves user edits)
        displayTitle = func.savedDisplayTitle;
      } else {
        // Format the function name to Title Case for all functions:
        // "book_appointment" → "Book Appointment", "Lookup" → "Lookup", "Add Note" → "Add Note"
        displayTitle = formatTitle(functionName);
      }

      const enrichedFunc = { ...func, displayTitle };

      // 1. Use the saved category from the database first (highest priority)
      if (func.savedCategory && savedCategoryToKey[func.savedCategory]) {
        const bucketKey = savedCategoryToKey[func.savedCategory] as keyof typeof categories;
        categories[bucketKey].functions.push(enrichedFunc);
        return;
      }

      // 2. Handle common single-word function names (e.g. "cancel", "modify", "update")
      //    that won't match any pattern substring but clearly belong to a category.
      const singleWordAppointment = new Set(['cancel', 'modify', 'reschedule', 'rebook']);
      const singleWordCrm = new Set(['update', 'lookup', 'lookup_customer']);
      if (singleWordAppointment.has(functionNameLower)) {
        categories.appointmentSetting.functions.push(enrichedFunc);
        return;
      }
      if (singleWordCrm.has(functionNameLower)) {
        categories.crm.functions.push(enrichedFunc);
        return;
      }

      // 3. Fall back to pattern matching on the function name
      let categorized = false;
      for (const [key, category] of Object.entries(categories)) {
        if (category.patterns.some(pattern => functionNameLower.includes(pattern))) {
          category.functions.push(enrichedFunc);
          categorized = true;
          break;
        }
      }

      // 4. If no pattern matched, add to Custom Integration
      if (!categorized) {
        categories.customIntegration.functions.push(enrichedFunc);
      }
    });

    // Sort functions within each category alphabetically
    Object.values(categories).forEach(category => {
      category.functions.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });

    console.log('📋 Categorized functions:', {
      total: functions.length,
      appointmentSetting: categories.appointmentSetting.functions.length,
      crm: categories.crm.functions.length,
      pointOfSale: categories.pointOfSale.functions.length,
      messaging: categories.messaging.functions.length,
      callActions: categories.callActions.functions.length,
      customIntegration: categories.customIntegration.functions.length
    });

    return categories;
  }, [retellCustomFunctions]);

  // Effects to populate forms with saved data
  useEffect(() => {
    if (savedBehaviorSettings && activeTab === 'agent') {
      setBehaviorForm({
        globalPrompt: savedBehaviorSettings.globalPrompt || '',
        businessHoursGreeting: savedBehaviorSettings.businessHoursGreeting || '',
        afterHoursGreeting: savedBehaviorSettings.afterHoursGreeting || ''
      });
      setOriginalData(prev => ({ ...prev, behavior: savedBehaviorSettings }));
      console.log('📝 Pre-populated behavior form with saved data');
    }
  }, [savedBehaviorSettings, activeTab]);

  // Note: Removed the clearing effect as it interferes with data loading when switching agents

  useEffect(() => {
    // Populate Memory tab with knowledge base content from Retell AI or database

    // Only process if we're in the memory tab
    if (activeTab !== 'memory') {
      return;
    }

    // Skip if we're still loading (placeholder data)
    if (knowledgeBaseContent?.source === 'loading' || isLoadingKnowledgeBase) {
      console.log('⏳ Skipping - still loading knowledge base');
      return;
    }

    // Use content from knowledge-base-content endpoint (includes database fallback)
    if (knowledgeBaseContent?.content !== undefined && knowledgeBaseContent?.source !== 'loading') {
      const content = knowledgeBaseContent.content || '';
      setBusinessInfoText(content);
      setOriginalBusinessInfoText(content);
      console.log('📝 Populated business info from knowledge base endpoint:', {
        length: content.length,
        source: knowledgeBaseContent.source
      });
    }
  }, [knowledgeBaseContent, selectedAgentId, activeTab, isLoadingKnowledgeBase]);

  useEffect(() => {
    if (savedIntegrationSettings && activeTab === 'integrations') {
      setIntegrationForm(prev => ({ ...prev, ...savedIntegrationSettings }));
      setOriginalData(prev => ({ ...prev, integrations: savedIntegrationSettings }));
      console.log('📝 Pre-populated integration form with saved data');
    }
  }, [savedIntegrationSettings, activeTab]);

  // Populate custom integrations from server
  useEffect(() => {
    if (savedCustomIntegrations !== undefined && activeTab === 'integrations') {
      const integrations = Array.isArray(savedCustomIntegrations) ? savedCustomIntegrations : [];
      setCustomIntegrations(integrations);
      setOriginalCustomIntegrations(integrations);
      console.log('📝 Pre-populated custom integrations from server for agent:', selectedAgentId, integrations);
    }
  }, [savedCustomIntegrations, selectedAgentId, activeTab]);

  // Populate agent general prompt from Retell API
  useEffect(() => {
    if (agentGeneralPromptData && activeTab === 'agent') {
      const prompt = agentGeneralPromptData.generalPrompt || '';
      setAgentGeneralPrompt(prompt);
      setOriginalAgentGeneralPrompt(prompt);
      console.log('📝 Pre-populated agent general prompt from Retell API for agent:', selectedAgentId);
    }
  }, [agentGeneralPromptData, activeTab, selectedAgentId]);

  // Auto-sync webhook URLs for conversation-flow agents when Agent tab opens
  // Silently fixes stale picard.replit.dev URLs so functions trigger correctly
  const webhookSyncedRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (activeTab !== 'agent' || !selectedAgentId || !isAuthenticated) return;
    if (webhookSyncedRef.current === selectedAgentId) return; // Already synced this session
    webhookSyncedRef.current = selectedAgentId;

    fetch(`/api/agents/${selectedAgentId}/sync-webhooks`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(r => r.json())
      .then((result: any) => {
        if (result?.urlsFixed > 0) {
          console.log(`✅ Synced ${result.urlsFixed} webhook URL(s) for agent ${selectedAgentId}`);
        }
      })
      .catch(err => console.warn('⚠️ Webhook URL sync failed (non-critical):', err));
  }, [activeTab, selectedAgentId, isAuthenticated]);

  // Initialize agent title from selectedAgent
  useEffect(() => {
    if (selectedAgent && activeTab === 'agent') {
      const serverTitle = selectedAgent.businessName || selectedAgent.name || '';

      console.log('🔧 Agent Title Initialization Effect:', {
        serverTitle,
        currentAgentTitle: agentTitle,
        lastSavedTitle: lastSavedTitleRef.current,
        selectedAgentBusinessName: selectedAgent.businessName,
        selectedAgentName: selectedAgent.name
      });

      // If we just saved a value and the server hasn't caught up yet, keep our saved value
      if (lastSavedTitleRef.current) {
        console.log('🔒 Waiting for server to catch up with saved value:', lastSavedTitleRef.current);
        // We just saved this value, check if server now matches what we saved
        if (serverTitle === lastSavedTitleRef.current) {
          // Server has caught up, clear the flag
          console.log('✅ Server caught up! Clearing lastSavedTitleRef');
          lastSavedTitleRef.current = '';
        }
        // Otherwise, keep our saved value and wait for server to catch up
        return;
      }

      // Normal initialization: update to server value
      console.log('📝 Setting agent title to server value:', serverTitle);
      setAgentTitle(serverTitle);
      setHasAgentTitleChanges(false);
    }
  }, [selectedAgent, selectedAgentId, activeTab]);

  // Set up global function for clicking functions in contenteditable
  useEffect(() => {
    (window as any).openFunctionEditor = (functionName: string) => {
      setSelectedFunctionName(functionName);
      setIsFunctionEditorOpen(true);
    };

    return () => {
      delete (window as any).openFunctionEditor;
    };
  }, []);

  // Memoize function map and regex for syntax highlighting to prevent rebuilding on every render
  const functionMapForHighlighting = useMemo(() => {
    const functionMap = new Map<string, { name: string; color: string; category: string }>();

    if (Array.isArray(retellCustomFunctions)) {
      retellCustomFunctions.forEach((func: any) => {
        const funcName = func.name || '';
        const funcDescription = func.description || '';

        let color = 'gray-300';
        let category = 'Custom Integration';

        const appointmentFunctions = ['book_appointment', 'modify_appointment', 'create_reservation', 'book_service', 'book_calendar_event', 'cancel_session', 'book_class', 'cancel_appointment', 'reschedule_appointment', 'check_current_appointment', 'modify_appointment_details', 'book_daycare', 'book_training', 'book_showing', 'schedule_class', 'enroll_student'];
        const crmFunctions = ['customer_memory', 'get_customer_details', 'update_customer_preferences', 'log_feedback', 'log_inquiry', 'update_patient_record', 'manage_membership', 'update_membership', 'cancel_membership', 'update_pet_record', 'update_client_record', 'update_student_record', 'add_client_note', 'record_feedback', 'log_customer_request'];
        const posFunctions = ['place_order', 'update_service_status', 'request_estimate', 'update_treatment_request', 'update_service_request', 'update_procedure', 'update_job_status', 'request_prescription_refill', 'submit_maintenance_request', 'update_lease'];
        const callActionsFunctions = ['transfer_call', 'end_call', 'hangup', 'disconnect_call'];
        const messagingFunctions = ['notify_team', 'sms_order_confirmation', 'sms_reservation_confirmation', 'sms_delivery_tracking', 'sms_appointment_confirmation', 'sms_modification_alert', 'sms_catering_confirmation', 'sms_feedback_confirmation'];

        if (appointmentFunctions.includes(funcName)) {
          color = 'blue-400';
          category = 'Appointment Setting';
        } else if (crmFunctions.includes(funcName)) {
          color = 'purple-400';
          category = 'CRM';
        } else if (posFunctions.includes(funcName)) {
          color = 'green-400';
          category = 'Point of Sale';
        } else if (callActionsFunctions.includes(funcName)) {
          color = 'cyan-400';
          category = 'Call Actions';
        } else if (messagingFunctions.includes(funcName)) {
          color = 'orange-400';
          category = 'Messaging';
        }

        // Pattern-based fallback for functions not in the exact-name lists
        if (color === 'gray-300') {
          const n = funcName.toLowerCase();
          if (n === 'cancel' || n === 'modify' || n === 'reschedule' || n === 'rebook' ||
              /^(book|schedule|cancel|modify|reschedule|rebook)_/.test(n)) {
            color = 'blue-400'; category = 'Appointment Setting';
          } else if (n === 'update' || n === 'lookup' || /^(update_customer|get_customer|log_|add_client|record_|update_patient|update_pet|update_client|update_student|manage_member|update_member|cancel_member)/.test(n)) {
            color = 'purple-400'; category = 'CRM';
          } else if (/^(sms_|send_sms|notify_|send_text)/.test(n)) {
            color = 'orange-400'; category = 'Messaging';
          } else if (/^(transfer|end_call|hangup|disconnect)/.test(n)) {
            color = 'cyan-400'; category = 'Call Actions';
          }
        }

        functionMap.set(funcName, { name: funcName, color, category });
        if (funcDescription && funcDescription !== funcName) {
          functionMap.set(funcDescription, { name: funcName, color, category });
        }
      });
    }

    return functionMap;
  }, [retellCustomFunctions]);

  // Memoize regex pattern for syntax highlighting
  const functionRegexForHighlighting = useMemo(() => {
    const functionPatterns = Array.from(functionMapForHighlighting.keys())
      .filter(key => key.length > 0)
      .map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    return functionPatterns ? new RegExp(`(${functionPatterns})`, 'g') : null;
  }, [functionMapForHighlighting]);

  // Update contenteditable div when agentGeneralPrompt changes OR when Agent tab becomes active
  useEffect(() => {
    // Use a small timeout to ensure the ref is attached after React renders
    const timer = setTimeout(() => {
      if (contentEditableRef.current && agentGeneralPrompt !== undefined && activeTab === 'agent') {
        // CRITICAL FIX: Don't update innerHTML while user is actively typing
        // This prevents cursor jumping and lag
        if (document.activeElement === contentEditableRef.current) {
          return; // User is typing, skip update
        }

        // Use innerText for comparison to properly handle line breaks
        const currentInnerText = contentEditableRef.current.innerText || '';
        if (currentInnerText !== agentGeneralPrompt || currentInnerText === '') {

          // Use memoized function map and regex for better performance
          let formattedHTML = agentGeneralPrompt;

          if (functionRegexForHighlighting) {
            formattedHTML = agentGeneralPrompt.split(functionRegexForHighlighting).map((part) => {
              const functionInfo = functionMapForHighlighting.get(part);

              if (functionInfo) {
                const { name, color, category } = functionInfo;
                return `<span contenteditable="false" class="text-${color} font-semibold cursor-pointer hover:underline" data-function="${name}" title="${category} - Click to edit">${part}</span>`;
              }
              // Escape HTML entities and convert line breaks to <br> tags
              return part.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            }).join('');
          } else {
            // No functions to highlight, just escape HTML
            formattedHTML = agentGeneralPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          }

          // Sanitize HTML to prevent XSS attacks
          contentEditableRef.current.innerHTML = DOMPurify.sanitize(formattedHTML);
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [agentGeneralPrompt, activeTab, functionMapForHighlighting, functionRegexForHighlighting]);


  // Force browser to initialize editing mode ("warm-up") to prevent initial freeze
  useEffect(() => {
    if (activeTab === 'agent' && contentEditableRef.current) {
      const timer = setTimeout(() => {
        const element = contentEditableRef.current;
        if (element) {
          // Force browser to initialize editing engine in the background
          // Delayed to let rendering finish first
          element.focus();
          element.blur();
          console.log('✅ Editable area initialized in the background');
        }
      }, 100); // Increased delay to let rendering complete
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedAgentId]);

  // Close autocomplete on click outside or handle keyboard navigation
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showPromptAutocomplete && !target.closest('[data-testid="contenteditable-agent-prompt"]') && !target.closest('.autocomplete-dropdown')) {
        setShowPromptAutocomplete(false);
        setSelectedPromptAutocompleteIndex(0);
        promptAutocompleteFilterRef.current = '';
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showPromptAutocomplete) return;

      // CRITICAL FIX: Use ref to get current filter and compute filtered functions synchronously
      // This ensures we always use the most recent filter, even if state hasn't updated yet
      const currentFilter = promptAutocompleteFilterRef.current;
      const filteredFunctions = computeFilteredFunctions(currentFilter);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setShowPromptAutocomplete(false);
          setSelectedPromptAutocompleteIndex(0);
          promptAutocompleteFilterRef.current = '';
          break;

        case 'ArrowDown':
          e.preventDefault();
          setSelectedPromptAutocompleteIndex(prev =>
            prev < filteredFunctions.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedPromptAutocompleteIndex(prev =>
            prev > 0 ? prev - 1 : filteredFunctions.length - 1
          );
          break;

        case 'Enter':
          e.preventDefault();
          if (filteredFunctions.length > 0) {
            // CRITICAL FIX: Always use the selected index, but ensure it's within bounds
            // If index is somehow out of bounds, use the first item (index 0)
            const safeIndex = selectedPromptAutocompleteIndex < filteredFunctions.length
              ? selectedPromptAutocompleteIndex
              : 0;
            handlePromptAutocompleteSelect(filteredFunctions[safeIndex]);
          }
          break;

        case 'Tab':
          // Allow Tab to select like Enter
          if (filteredFunctions.length > 0) {
            e.preventDefault();
            // Use the same safe index logic as Enter
            const safeIndex = selectedPromptAutocompleteIndex < filteredFunctions.length
              ? selectedPromptAutocompleteIndex
              : 0;
            handlePromptAutocompleteSelect(filteredFunctions[safeIndex]);
          }
          break;
      }
    };

    if (showPromptAutocomplete) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showPromptAutocomplete, selectedPromptAutocompleteIndex, retellCustomFunctions]);

  // Update contenteditable div when businessInfoText changes OR when Memory tab becomes active
  useEffect(() => {
    // Use a small timeout to ensure the ref is attached after React renders
    const timer = setTimeout(() => {
      if (businessInfoEditableRef.current && businessInfoText !== undefined && activeTab === 'memory') {
        // Check if the element is currently focused (user is actively typing)
        const isFocused = document.activeElement === businessInfoEditableRef.current;

        // Use innerText for comparison to properly handle line breaks
        const currentInnerText = businessInfoEditableRef.current.innerText || '';
        console.log('🔄 Memory text update check:', {
          currentTextLength: currentInnerText.length,
          businessInfoTextLength: businessInfoText.length,
          isEmpty: currentInnerText === '',
          isFocused,
          activeTab
        });

        // Only update if:
        // 1. The element is NOT currently focused (not being edited by user)
        // 2. AND (text is different OR element is empty)
        // This prevents cursor jumping while user is typing
        if (!isFocused && (currentInnerText !== businessInfoText || currentInnerText === '')) {
          console.log('✅ Updating Memory contenteditable');
          // Convert line breaks to <br> tags and sanitize for safe rendering
          const htmlContent = businessInfoText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          businessInfoEditableRef.current.innerHTML = DOMPurify.sanitize(htmlContent);
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [businessInfoText, activeTab]);

  // Update text source contenteditable div when selectedSourceData changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        textSourceEditableRef.current &&
        selectedSourceData?.type === 'text' &&
        selectedSourceData?.textContent !== undefined &&
        activeTab === 'memory'
      ) {
        // Check if the element is currently focused (user is actively typing)
        const isFocused = document.activeElement === textSourceEditableRef.current;

        // Use innerText for comparison to properly handle line breaks
        const currentInnerText = textSourceEditableRef.current.innerText || '';
        const sourceText = selectedSourceData.textContent || '';

        // Only update if NOT focused AND (text is different OR element is empty)
        // This prevents cursor jumping while user is typing
        if (!isFocused && (currentInnerText !== sourceText || currentInnerText === '')) {
          // Convert line breaks to <br> tags and sanitize for safe rendering
          const htmlContent = sourceText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          textSourceEditableRef.current.innerHTML = DOMPurify.sanitize(htmlContent);
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedSourceData, activeTab]);

  // Update URL source contenteditable div when selectedSourceData changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        textSourceEditableRef.current &&
        selectedSourceData?.type === 'url' &&
        selectedSourceData?.url !== undefined &&
        activeTab === 'memory'
      ) {
        const currentText = textSourceEditableRef.current.textContent || '';
        // Remove protocol from URL for display (since we have a static "https://" prefix)
        const sourceUrl = (selectedSourceData.url || '').replace(/^https?:\/\//, '');

        // Only update if text is different OR if the element is empty (just mounted)
        if (currentText !== sourceUrl || currentText === '') {
          // Use textContent for safe plain text rendering (no XSS risk)
          textSourceEditableRef.current.textContent = sourceUrl;
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedSourceData, activeTab]);

  // Sync selectedSourceData when knowledgeSources is refetched with updated data
  useEffect(() => {
    if (selectedSourceId && knowledgeSources && Array.isArray(knowledgeSources)) {
      const updatedSource = knowledgeSources.find((s: any) => s.id === selectedSourceId);
      if (updatedSource && updatedSource.textContent !== selectedSourceData?.textContent) {
        // Update selectedSourceData with the freshly fetched data
        setSelectedSourceData(updatedSource);
      }
    }
  }, [knowledgeSources, selectedSourceId]);

  // Force browser to initialize editing mode ("warm-up") for Memory to prevent initial freeze
  useEffect(() => {
    if (activeTab === 'memory' && businessInfoEditableRef.current) {
      const timer = setTimeout(() => {
        const element = businessInfoEditableRef.current;
        if (element) {
          // Force browser to initialize editing engine in the background
          // Delayed to let rendering finish first
          element.focus();
          element.blur();
          console.log('✅ Memory editable area initialized in the background');
        }
      }, 100); // Increased delay to let rendering complete
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedAgentId]);

  // Update contenteditable div for Add Text interface
  useEffect(() => {
    const timer = setTimeout(() => {
      if (addTextEditableRef.current && editingSource === 'text') {
        const textContent = pendingSourceData.textContent || '';
        if (addTextEditableRef.current.textContent !== textContent) {
          addTextEditableRef.current.textContent = textContent;
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [editingSource, pendingSourceData.textContent]);

  // Update contenteditable div for Add Webpage interface
  useEffect(() => {
    const timer = setTimeout(() => {
      if (addTextEditableRef.current && editingSource === 'webpage') {
        const urlWithoutProtocol = (pendingSourceData.url || '').replace(/^https?:\/\//, '');
        if (addTextEditableRef.current.textContent !== urlWithoutProtocol) {
          addTextEditableRef.current.textContent = urlWithoutProtocol;
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [editingSource, pendingSourceData.url]);

  // Update contenteditable div for viewing saved webpage sources
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textSourceEditableRef.current && !editingSource && selectedSourceData?.type === 'url') {
        const urlWithoutProtocol = (selectedSourceData.url || '').replace(/^https?:\/\//, '');
        if (textSourceEditableRef.current.textContent !== urlWithoutProtocol) {
          textSourceEditableRef.current.textContent = urlWithoutProtocol;
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [editingSource, selectedSourceData?.url, selectedSourceData?.type]);

  // Set loading state for agent prompt
  useEffect(() => {
    setIsLoadingAgentPrompt(isAgentPromptLoading);
  }, [isAgentPromptLoading]);

  // Detect changes in agent general prompt
  useEffect(() => {
    setHasAgentChanges(agentGeneralPrompt !== originalAgentGeneralPrompt);
  }, [agentGeneralPrompt, originalAgentGeneralPrompt]);

  // Detect changes in memory business info text
  useEffect(() => {
    setHasMemoryChanges(businessInfoText !== originalBusinessInfoText);
  }, [businessInfoText, originalBusinessInfoText]);

  // Auto-save Business Information with debouncing
  useEffect(() => {
    // Clear any existing timeout
    if (memorySaveTimeoutRef.current) {
      clearTimeout(memorySaveTimeoutRef.current);
    }

    // Only auto-save if there are changes
    if (businessInfoText !== originalBusinessInfoText && selectedAgentId) {
      // Set saving status after debounce delay
      memorySaveTimeoutRef.current = setTimeout(async () => {
        setMemorySaveStatus('saving');
        setMemorySaveError(null);
        
        try {
          await apiRequest('PATCH', `/api/restaurant/${selectedAgentId}`, {
            rawBusinessInfo: businessInfoText
          });

          setMemorySaveStatus('saved');
          setMemoryLastSaveTime(new Date());
          setOriginalBusinessInfoText(businessInfoText);
          setHasMemoryChanges(false);
          
          // Invalidate the knowledge base content query
          queryClient.invalidateQueries({ queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content'] });
          
          // Reset to idle after 2 seconds
          setTimeout(() => setMemorySaveStatus('idle'), 2000);
        } catch (error) {
          console.error('❌ Auto-save error (Business Info):', error);
          setMemorySaveStatus('error');
          setMemorySaveError(error instanceof Error ? error.message : 'Failed to save');
          // Keep error status for 3 seconds
          setTimeout(() => setMemorySaveStatus('idle'), 3000);
        }
      }, 1500); // 1.5 second debounce
    }

    return () => {
      if (memorySaveTimeoutRef.current) {
        clearTimeout(memorySaveTimeoutRef.current);
      }
    };
  }, [businessInfoText, originalBusinessInfoText, selectedAgentId, queryClient]);

  // Auto-save Text Content sources with debouncing
  useEffect(() => {
    // Only auto-save if viewing a text source (not editing a new one) and there are changes
    if (selectedSourceId && selectedSourceData?.type === 'text' && hasMemoryChanges && !editingSource && selectedAgentId) {
      // Clear any existing timeout
      if (memorySaveTimeoutRef.current) {
        clearTimeout(memorySaveTimeoutRef.current);
      }

      // Set saving status after debounce delay
      memorySaveTimeoutRef.current = setTimeout(async () => {
        setMemorySaveStatus('saving');

        try {
          const response = await fetch(`/api/knowledge-sources/${selectedSourceId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              title: selectedSourceData.title,
              textContent: selectedSourceData.textContent,
            })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update source');
          }

          const updatedSource = await response.json();
          setMemorySaveStatus('saved');
          setMemoryLastSaveTime(new Date());
          setHasMemoryChanges(false);

          // Update selectedSourceData with the saved content
          setSelectedSourceData({
            ...selectedSourceData,
            textContent: selectedSourceData.textContent,
            updatedAt: new Date()
          });

          // Add this save point to history for undo/redo
          const newHistory = memoryHistory.slice(0, memoryHistoryIndex + 1);
          newHistory.push(selectedSourceData.textContent || '');
          if (newHistory.length > 50) {
            newHistory.shift();
          }
          setMemoryHistory(newHistory);
          setMemoryHistoryIndex(newHistory.length - 1);

          queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });
          queryClient.invalidateQueries({ queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content'] });

          // Reset to idle after 2 seconds
          setTimeout(() => setMemorySaveStatus('idle'), 2000);
        } catch (error) {
          console.error('❌ Auto-save error (Text Content):', error);
          setMemorySaveStatus('error');
          setTimeout(() => setMemorySaveStatus('idle'), 3000);
        }
      }, 1500); // 1.5 second debounce

      return () => {
        if (memorySaveTimeoutRef.current) {
          clearTimeout(memorySaveTimeoutRef.current);
        }
      };
    }
  }, [selectedSourceData?.textContent, hasMemoryChanges, selectedSourceId, editingSource, selectedAgentId, queryClient]);

  // Keyboard shortcut for Ctrl+S to save text when editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();

        // Only save if we're editing a text source and have content
        if (editingSource === 'text' && pendingSourceData.textContent && hasEditingChanges) {
          handleStickySave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSource, pendingSourceData, hasEditingChanges]);

  // Auto-save for new text entries with debouncing
  useEffect(() => {
    // Only auto-save if we're in text editing mode and have content
    if (editingSource === 'text' && pendingSourceData.textContent && hasEditingChanges && selectedAgentId) {
      // Clear any existing timeout
      if (memorySaveTimeoutRef.current) {
        clearTimeout(memorySaveTimeoutRef.current);
      }

      // Set saving status after debounce delay
      memorySaveTimeoutRef.current = setTimeout(async () => {
        setMemorySaveStatus('saving');

        try {
          const response = await apiRequest('POST', '/api/knowledge-sources/add-text', {
            agentId: selectedAgentId,
            textContent: pendingSourceData.textContent,
            title: pendingSourceData.title || 'Untitled'
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to add text');
          }

          const data = await response.json();
          setMemorySaveStatus('saved');
          setMemoryLastSaveTime(new Date());
          setHasEditingChanges(false);

          // Clear editing state to remove temporary "New Text..." entry
          setEditingSource(null);
          setPendingSourceData({});

          // Select the newly created permanent entry
          if (data.source) {
            setSelectedSourceId(data.source.id);
            setSelectedSourceData(data.source);
          }

          queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });
          queryClient.invalidateQueries({ queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content'] });

          // Reset to idle after 2 seconds
          setTimeout(() => setMemorySaveStatus('idle'), 2000);
        } catch (error) {
          console.error('❌ Auto-save error (New Text):', error);
          setMemorySaveStatus('error');
          setTimeout(() => setMemorySaveStatus('idle'), 3000);
        }
      }, 1500); // 1.5 second debounce

      return () => {
        if (memorySaveTimeoutRef.current) {
          clearTimeout(memorySaveTimeoutRef.current);
        }
      };
    }
  }, [pendingSourceData?.textContent, hasEditingChanges, editingSource, selectedAgentId, queryClient]);

  // Auto-save Title changes (for files, webpages, and text entries) with debouncing
  useEffect(() => {
    // Only auto-save if viewing a source (not editing a new one) and title has changed
    if (selectedSourceId && selectedSourceData && hasTitleChanges && !editingSource && selectedAgentId) {
      // Clear any existing timeout
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }

      // Set saving status after debounce delay
      titleSaveTimeoutRef.current = setTimeout(async () => {
        setMemorySaveStatus('saving');

        try {
          // Prepare the update payload based on source type
          const updatePayload: any = {};
          
          if (selectedSourceData.type === 'file') {
            updatePayload.fileName = selectedSourceData.fileName;
          } else if (selectedSourceData.type === 'url') {
            updatePayload.url = selectedSourceData.url;
          } else if (selectedSourceData.type === 'text') {
            updatePayload.title = selectedSourceData.title;
          }

          const response = await fetch(`/api/knowledge-sources/${selectedSourceId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updatePayload)
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update title');
          }

          setMemorySaveStatus('saved');
          setMemoryLastSaveTime(new Date());
          setHasTitleChanges(false);

          // Invalidate queries to update the Business Memory list in real-time
          queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });
          queryClient.invalidateQueries({ queryKey: ['/api/restaurant', selectedAgentId, 'knowledge-base-content'] });

          // Reset to idle after 2 seconds
          setTimeout(() => setMemorySaveStatus('idle'), 2000);
        } catch (error) {
          console.error('❌ Auto-save error (Title):', error);
          setMemorySaveStatus('error');
          setTimeout(() => setMemorySaveStatus('idle'), 3000);
        }
      }, 1500); // 1.5 second debounce

      return () => {
        if (titleSaveTimeoutRef.current) {
          clearTimeout(titleSaveTimeoutRef.current);
        }
      };
    }
  }, [selectedSourceData?.title, selectedSourceData?.fileName, selectedSourceData?.url, hasTitleChanges, selectedSourceId, editingSource, selectedAgentId, selectedSourceData?.type, queryClient]);

  // Auto-save Agent Title changes with debouncing
  useEffect(() => {
    // Only auto-save if agent title has changed and we have a valid agent
    if (hasAgentTitleChanges && selectedAgentId && agentTitle !== undefined && activeTab === 'agent') {
      // Clear any existing timeout
      if (agentTitleSaveTimeoutRef.current) {
        clearTimeout(agentTitleSaveTimeoutRef.current);
      }

      console.log('⏰ Setting auto-save timeout for agent title...');

      // Set saving status after debounce delay
      agentTitleSaveTimeoutRef.current = setTimeout(async () => {
        console.log('💾 Executing agent title save...', { agentTitle, selectedAgentId });
        setAgentSaveStatus('saving');

        try {
          console.log('📤 Sending PATCH request to /api/agents/' + selectedAgentId, {
            businessName: agentTitle,
            name: agentTitle
          });

          const response = await fetch(`/api/agents/${selectedAgentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ businessName: agentTitle, name: agentTitle })
          });

          if (!response.ok) {
            const data = await response.json();
            console.error('❌ Agent title save failed:', data);
            throw new Error(data.message || 'Failed to update agent title');
          }

          const responseData = await response.json();
          console.log('✅ Agent title saved successfully:', responseData);

          setAgentSaveStatus('saved');
          setAgentLastSaveTime(new Date());
          setHasAgentTitleChanges(false);

          // Store the saved value to prevent reinitialization
          lastSavedTitleRef.current = agentTitle;
          console.log('📌 Stored lastSavedTitleRef:', agentTitle);

          // Refetch queries to update the agent list in real-time (force refetch even if stale)
          console.log('🔄 Refetching voice-agents query...');
          await queryClient.refetchQueries({ queryKey: ['/api/voice-agents'] });
          console.log('✅ Query refetched successfully with updated data');

          // Reset to idle after 2 seconds
          setTimeout(() => setAgentSaveStatus('idle'), 2000);
        } catch (error) {
          console.error('❌ Auto-save error (Agent Title):', error);
          setAgentSaveStatus('error');
          setTimeout(() => setAgentSaveStatus('idle'), 3000);
        }
      }, 1500); // 1.5 second debounce

      return () => {
        if (agentTitleSaveTimeoutRef.current) {
          clearTimeout(agentTitleSaveTimeoutRef.current);
        }
      };
    }
  }, [agentTitle, hasAgentTitleChanges, selectedAgentId, activeTab, queryClient]);

  // Auto-save Agent General Prompt with debouncing
  useEffect(() => {
    // Clear any existing timeout
    if (agentSaveTimeoutRef.current) {
      clearTimeout(agentSaveTimeoutRef.current);
    }

    // Only auto-save if there are changes
    if (agentGeneralPrompt !== originalAgentGeneralPrompt && selectedAgentId) {
      // Set saving status after debounce delay
      agentSaveTimeoutRef.current = setTimeout(async () => {
        setAgentSaveStatus('saving');
        setAgentSaveError(null);
        
        try {
          await apiRequest('PATCH', '/api/agent/general-prompt', {
            generalPrompt: agentGeneralPrompt,
            agentId: selectedAgentId
          });

          setAgentSaveStatus('saved');
          setAgentLastSaveTime(new Date());
          setOriginalAgentGeneralPrompt(agentGeneralPrompt);
          setHasAgentChanges(false);
          
          // Update the query cache directly with the saved data so it's immediately available when navigating back
          queryClient.setQueryData(['/api/agent/general-prompt', selectedAgentId], { generalPrompt: agentGeneralPrompt });
          
          // Reset to idle after 2 seconds
          setTimeout(() => setAgentSaveStatus('idle'), 2000);
        } catch (error) {
          console.error('❌ Auto-save error (Agent):', error);
          setAgentSaveStatus('error');
          setAgentSaveError(error instanceof Error ? error.message : 'Failed to save');
          // Keep error status for 3 seconds
          setTimeout(() => setAgentSaveStatus('idle'), 3000);
        }
      }, 1500); // 1.5 second debounce
    }

    return () => {
      if (agentSaveTimeoutRef.current) {
        clearTimeout(agentSaveTimeoutRef.current);
      }
    };
  }, [agentGeneralPrompt, originalAgentGeneralPrompt, selectedAgentId, queryClient]);

  // Automatic contact sync when viewing contacts tab
  useEffect(() => {
    const shouldSyncContacts =
      activeTab === 'calls' &&
      activeSubtab.calls === 'contacts' &&
      isAuthenticated &&
      safeCallHistory.length > 0;

    if (shouldSyncContacts) {
      // Sync contacts automatically in the background
      fetch('/api/contacts/sync-from-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log(`✅ Auto-synced contacts: ${data.created} created, ${data.updated} updated`);
            // Silently refresh contacts data
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }
        })
        .catch(error => {
          console.error('Auto-sync contacts error:', error);
        });
    }
  }, [activeTab, activeSubtab.calls, isAuthenticated, safeCallHistory, queryClient]);

  // Phone connection handlers
  const handlePhoneConnectionSetup = async () => {
    if (!phoneConnectionForm.businessPhoneNumber) {
      toast({
        title: "Error",
        description: "Business phone number is required.",
        variant: "destructive"
      });
      return;
    }

    setPhoneConnectionSaving(true);

    try {
      const response = await apiRequest('/api/phone/setup-existing-connection', {
        method: 'POST',
        body: JSON.stringify({
          businessPhoneNumber: phoneConnectionForm.businessPhoneNumber,
          carrier: phoneConnectionForm.carrier,
          connectionMethod: phoneConnectionForm.connectionMethod,
          sipServer: phoneConnectionForm.sipServer,
          sipUsername: phoneConnectionForm.sipUsername,
          sipPassword: phoneConnectionForm.sipPassword,
          sipPort: phoneConnectionForm.sipPort,
          notes: phoneConnectionForm.notes,
          // 🆕 Backup Answering System Configuration
          backupAnsweringEnabled: phoneConnectionForm.backupAnsweringEnabled,
          ringTimeoutSeconds: phoneConnectionForm.ringTimeoutSeconds,
          afterHoursMode: phoneConnectionForm.afterHoursMode,
          escalationEnabled: phoneConnectionForm.escalationEnabled,
          escalationPhoneNumber: phoneConnectionForm.escalationPhoneNumber,
          backupAnsweringInstructions: phoneConnectionForm.backupAnsweringInstructions
        })
      });

      if (response.success) {
        toast({
          title: "Success!",
          description: "Phone connection has been configured successfully. You'll receive setup instructions via email.",
          variant: "default"
        });
        
        // Refresh business settings data
        queryClient.invalidateQueries({ queryKey: ['/api/business/settings'] });
      } else {
        throw new Error(response.error || 'Failed to setup phone connection');
      }
    } catch (error: any) {
      console.error('Phone connection setup error:', error);
      toast({
        title: "Connection Setup Failed",
        description: error.message || "Failed to configure phone connection. Please check your details and try again.",
        variant: "destructive"
      });
    } finally {
      setPhoneConnectionSaving(false);
    }
  };

  const handleTestPhoneConnection = async () => {
    if (!phoneConnectionForm.businessPhoneNumber) {
      toast({
        title: "Error",
        description: "Business phone number is required for testing.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest('/api/phone/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          businessPhoneNumber: phoneConnectionForm.businessPhoneNumber,
          connectionMethod: phoneConnectionForm.connectionMethod
        })
      });

      if (response.success) {
        toast({
          title: "Test Call Initiated",
          description: "A test call has been placed to your number. Please answer to verify the connection.",
          variant: "default"
        });
      } else {
        throw new Error(response.error || 'Failed to initiate test call');
      }
    } catch (error: any) {
      console.error('Phone connection test error:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to initiate test call. Please check your phone number and try again.",
        variant: "destructive"
      });
    }
  };

  const testWebhook = async (webhookType: string) => {
    setIsTestingWebhooks(true);
    
    try {
      const timestamp = new Date().toLocaleTimeString();
      let endpoint = '';
      let payload = {};
      
      switch (webhookType) {
        case 'voice-webhook':
          endpoint = '/api/twilio/voice-webhook';
          payload = {
            CallSid: 'CA' + Math.random().toString(36).substring(2, 15),
            From: '+15551234567',
            To: phoneData?.phoneNumber || '+15559876543',
            CallStatus: 'ringing'
          };
          break;
        case 'call-status':
          endpoint = '/api/twilio/call-status';
          payload = {
            CallSid: 'CA' + Math.random().toString(36).substring(2, 15),
            CallStatus: 'completed',
            Duration: '120',
            CallDirection: 'inbound'
          };
          break;
        case 'recording-status':
          endpoint = '/api/twilio/recording-status';
          payload = {
            CallSid: 'CA' + Math.random().toString(36).substring(2, 15),
            RecordingSid: 'RE' + Math.random().toString(36).substring(2, 15),
            RecordingUrl: 'https://api.twilio.com/test-recording.wav',
            RecordingStatus: 'completed'
          };
          break;
        default:
          throw new Error(`Unknown webhook type: ${webhookType}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload).toString()
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const testResult = {
        endpoint: webhookType.replace('-', ' ').toUpperCase(),
        success: response.ok,
        message: response.ok 
          ? `✅ Webhook test successful (${response.status})` 
          : `❌ Webhook test failed (${response.status})`,
        timestamp,
        response: responseData
      };

      setWebhookTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results

      if (response.ok) {
        toast({
          title: "Webhook Test Successful",
          description: `${webhookType.replace('-', ' ')} webhook is working correctly`,
          variant: "default"
        });
        
        // Refresh call history to see if test data appears
        queryClient.invalidateQueries({ queryKey: ['/api/telephony/calls'] });
      } else {
        toast({
          title: "Webhook Test Failed",
          description: `${webhookType.replace('-', ' ')} webhook returned error: ${response.status}`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error(`Webhook test error (${webhookType}):`, error);
      const testResult = {
        endpoint: webhookType.replace('-', ' ').toUpperCase(),
        success: false,
        message: `❌ Test failed: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        response: null
      };

      setWebhookTestResults(prev => [testResult, ...prev.slice(0, 9)]);

      toast({
        title: "Webhook Test Failed",
        description: error.message || "Failed to test webhook endpoint",
        variant: "destructive"
      });
    } finally {
      setIsTestingWebhooks(false);
    }
  };

  // Handler for location autocomplete
  const handleLocationInputChange = async (value: string) => {
    setLocationInput(value);

    if (value.trim().length >= 3) {
      try {
        const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.suggestions) {
            setLocationSuggestions(data.suggestions);
            setShowSuggestions(true);
          } else {
            setLocationSuggestions([]);
            setShowSuggestions(false);
          }
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handler for website input (prevents removing https://)
  const handleWebsiteInputChange = (value: string) => {
    if (!value.startsWith('https://')) {
      setWebsiteInput('https://');
    } else {
      setWebsiteInput(value);
    }
  };

  // Handler for extraction
  const handleExtractBusinessInfo = async () => {
    const inputValue = extractionMethod === 'location' ? locationInput : websiteInput;

    if (!inputValue || (extractionMethod === 'website' && inputValue === 'https://')) {
      toast({
        title: "Missing Information",
        description: `Please enter a ${extractionMethod === 'location' ? 'location' : 'website'}`,
        variant: "destructive"
      });
      return;
    }

    setIsExtracting(true);

    try {
      const response = await fetch('/api/business/extract-and-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          searchQuery: extractionMethod === 'location' ? locationInput : undefined,
          website: extractionMethod === 'website' ? websiteInput : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.formattedInfo) {
          // Set the formatted business information
          setNewAgentForm({
            businessName: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            phoneNumber: '',
            website: '',
            businessInfo: result.formattedInfo
          });

          // Move to business info step
          setAgentOnboardingStep('business-info');

          const industryText = result.industry ? ` as a ${result.industry}` : '';
          toast({
            title: "Success!",
            description: `Business information extracted${industryText}`,
          });
        } else {
          throw new Error(result.message || result.error || 'Failed to extract business information');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to extract business information' }));
        throw new Error(errorData.error || errorData.message || 'Failed to extract business information');
      }
    } catch (error: any) {
      console.error('Extraction error:', error);
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract business information",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle business info textarea changes with suggestions
  const handleBusinessInfoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewAgentForm(prev => ({ ...prev, businessInfo: newValue }));
    setBusinessInfoCursorPosition(cursorPos);

    // Get the current line
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];

    // Show suggestions based on context
    let suggestions: string[] = [];
    
    if (currentLine.trim() === '' || currentLine.endsWith('\n')) {
      // Start of new line - show all basic suggestions
      suggestions = [...businessInfoSuggestionCategories.basic];
    } else if (currentLine.toLowerCase().includes('hour')) {
      suggestions = businessInfoSuggestionCategories.hours;
    } else if (currentLine.toLowerCase().includes('service') || currentLine.toLowerCase().includes('deliver')) {
      suggestions = businessInfoSuggestionCategories.services;
    } else if (currentLine.toLowerCase().includes('descr') || currentLine.toLowerCase().includes('menu')) {
      suggestions = businessInfoSuggestionCategories.description;
    }

    setBusinessInfoSuggestions(suggestions);
    setShowBusinessInfoSuggestions(suggestions.length > 0);

    // Calculate suggestion position
    if (businessInfoTextareaRef.current && suggestions.length > 0) {
      const textarea = businessInfoTextareaRef.current;
      const { top, left } = getCaretCoordinates(textarea, cursorPos);
      setBusinessInfoSuggestionPosition({ top, left });
    }
  };

  // Get caret coordinates in textarea
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div');
    const style = getComputedStyle(element);
    
    // Copy styles
    ['font', 'letterSpacing', 'padding', 'border', 'lineHeight'].forEach(prop => {
      (div.style as any)[prop] = (style as any)[prop];
    });
    
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.width = element.offsetWidth + 'px';
    
    document.body.appendChild(div);
    
    const text = element.value.substring(0, position);
    div.textContent = text;
    
    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);
    
    const rect = element.getBoundingClientRect();
    const coordinates = {
      top: span.offsetTop + rect.top - element.scrollTop,
      left: span.offsetLeft + rect.left - element.scrollLeft
    };
    
    document.body.removeChild(div);
    return coordinates;
  };

  // Insert suggestion at cursor position
  const handleInsertBusinessInfoSuggestion = (suggestion: string) => {
    if (!businessInfoTextareaRef.current) return;

    const textarea = businessInfoTextareaRef.current;
    const currentValue = newAgentForm.businessInfo;
    const cursorPos = businessInfoCursorPosition;

    // Find the start of the current line
    const textBeforeCursor = currentValue.substring(0, cursorPos);
    const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
    const lineStart = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;

    // Replace current line with suggestion
    const newValue = currentValue.substring(0, lineStart) + suggestion + currentValue.substring(cursorPos);
    
    setNewAgentForm(prev => ({ ...prev, businessInfo: newValue }));
    setShowBusinessInfoSuggestions(false);

    // Set cursor position after suggestion
    setTimeout(() => {
      const newCursorPos = lineStart + suggestion.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handler for creating a new AI agent
  const handleCreateAgent = async () => {
    setIsCreatingAgent(true);

    try {
      // Send businessInfo and businessName to backend - no validation required
      const response = await fetch('/api/voice-agents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          businessInfo: newAgentForm.businessInfo,
          businessName: newAgentForm.businessName || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create agent');
      }

      // Extract agent name and phone number from result for toast message
      const agentName = result.agent?.name || 'Your agent';
      const phoneNumber = result.agent?.phoneNumber || result.phoneNumber;

      // Refresh the agents list first to ensure the dropdown is updated
      await queryClient.invalidateQueries({ queryKey: ['/api/voice-agents'] });

      // Select the new agent in the dropdown
      if (result.agent?.id) {
        setSelectedAgentId(result.agent.id);
      }

      // Show success message with agent details
      toast({
        title: "🎉 Agent Created Successfully!",
        description: `${agentName} has been created${phoneNumber ? ` with phone number ${phoneNumber}` : ''} and is ready to use.`,
        variant: "default",
      });

      // Close modal and reset form
      setShowNewAgentModal(false);
      setAgentOnboardingStep('extraction');
      setExtractionMethod('location');
      setLocationInput('');
      setWebsiteInput('');
      setLocationSuggestions([]);
      setShowSuggestions(false);
      setNewAgentForm({
        businessName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phoneNumber: '',
        website: '',
        businessInfo: ''
      });

    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        title: "Failed to Create Agent",
        description: error.message || "An error occurred while creating the agent. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAgent(false);
    }
  };

  // CRITICAL: All hooks must be called BEFORE any early returns
  // Helper function to build function list with colors for autocomplete - MEMOIZED for performance
  const allFunctionsForAutocomplete = useMemo(() => {
    const functionList: { name: string; displayText: string; color: string; category: string; description: string }[] = [];

    if (Array.isArray(retellCustomFunctions)) {
      retellCustomFunctions.forEach((func: any) => {
        const funcName = func.name || '';
        const funcDescription = func.description || '';

        // Determine category and color based on function name
        let color = 'gray-300';
        let category = 'Custom Integration';

        const appointmentFunctions = ['book_appointment', 'modify_appointment', 'create_reservation', 'book_service', 'book_calendar_event', 'cancel_session', 'book_class', 'cancel_appointment', 'reschedule_appointment', 'check_current_appointment', 'modify_appointment_details', 'book_daycare', 'book_training', 'book_showing', 'schedule_class', 'enroll_student'];
        const crmFunctions = ['customer_memory', 'get_customer_details', 'update_customer_preferences', 'log_feedback', 'log_inquiry', 'update_patient_record', 'manage_membership', 'update_membership', 'cancel_membership', 'update_pet_record', 'update_client_record', 'update_student_record', 'add_client_note', 'record_feedback', 'log_customer_request'];
        const posFunctions = ['place_order', 'update_service_status', 'request_estimate', 'update_treatment_request', 'update_service_request', 'update_procedure', 'update_job_status', 'request_prescription_refill', 'submit_maintenance_request', 'update_lease'];
        const callActionsFunctions = ['transfer_call', 'end_call', 'hangup', 'disconnect_call'];
        const messagingFunctions = ['notify_team', 'sms_order_confirmation', 'sms_reservation_confirmation', 'sms_delivery_tracking', 'sms_appointment_confirmation', 'sms_modification_alert', 'sms_catering_confirmation', 'sms_feedback_confirmation'];

        if (appointmentFunctions.includes(funcName)) {
          color = 'blue-400';
          category = 'Appointment Setting';
        } else if (crmFunctions.includes(funcName)) {
          color = 'purple-400';
          category = 'CRM';
        } else if (posFunctions.includes(funcName)) {
          color = 'green-400';
          category = 'Point of Sale';
        } else if (callActionsFunctions.includes(funcName)) {
          color = 'cyan-400';
          category = 'Call Actions';
        } else if (messagingFunctions.includes(funcName)) {
          color = 'orange-400';
          category = 'Messaging';
        }

        // Use formatted function name (with spaces) as display text
        const formattedName = funcName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        functionList.push({ name: funcName, displayText: formattedName, color, category, description: funcDescription });
      });
    }

    return functionList;
  }, [retellCustomFunctions]);

  // Helper function to compute filtered functions from a filter string
  const computeFilteredFunctions = (filter: string) => {
    if (!filter) {
      return allFunctionsForAutocomplete;
    }
    return allFunctionsForAutocomplete.filter(func =>
      func.name.toLowerCase().includes(filter) ||
      func.displayText.toLowerCase().includes(filter)
    );
  };

  // Get filtered functions for autocomplete - MEMOIZED for performance
  const getFilteredFunctionsForAutocomplete = useMemo(() => {
    return computeFilteredFunctions(promptAutocompleteFilter);
  }, [allFunctionsForAutocomplete, promptAutocompleteFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D0D0D' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't redirect immediately - let useEffect handle authentication context-aware logic

  // Handle autocomplete selection for Prompt editor
  const handlePromptAutocompleteSelect = (func: { name: string; displayText: string; color: string; category: string }) => {
    const editor = contentEditableRef.current;
    if (!editor || !promptSlashStartPosition) return;

    try {
      // CRITICAL FIX: Calculate the end position based on "/" position + filter length
      // Don't use current selection as it may have moved when user clicked dropdown
      const startNode = promptSlashStartPosition.node;
      const startOffset = promptSlashStartPosition.offset;

      // CRITICAL FIX: Use ref instead of state to get the actual current filter length
      // State might be stale if Enter was pressed quickly after typing
      const filterLength = promptAutocompleteFilterRef.current.length;
      const endOffset = startOffset + 1 + filterLength; // +1 for the "/"

      // Create a range to delete the "/" and any partial text
      const range = document.createRange();
      range.setStart(startNode, startOffset);

      // Check if we're still in the same text node
      if (startNode.nodeType === Node.TEXT_NODE && startNode.textContent) {
        // Make sure end offset doesn't exceed text length
        const safeEndOffset = Math.min(endOffset, startNode.textContent.length);
        range.setEnd(startNode, safeEndOffset);
      } else {
        // Fallback: just delete from start position
        range.setEnd(startNode, startOffset + 1);
      }

      // Delete the "/" and any partial text
      range.deleteContents();

      // Create the HTML for the function chip
      const htmlToInsert = `<span contenteditable="false" class="text-${func.color} font-semibold cursor-pointer hover:underline" data-function="${func.name}" title="${func.category} - Click to edit">${func.displayText}</span>&nbsp;`;

      // Insert the HTML at the range position
      const fragment = range.createContextualFragment(htmlToInsert);

      // CRITICAL FIX: Store reference to nodes before insertion (fragment empties after insert)
      const nodesToInsert = Array.from(fragment.childNodes);
      range.insertNode(fragment);

      // CRITICAL FIX: Position cursor after the last inserted node
      if (nodesToInsert.length > 0) {
        const lastNode = nodesToInsert[nodesToInsert.length - 1];
        range.setStartAfter(lastNode);
        range.setEndAfter(lastNode);
        range.collapse(true); // Collapse to start (which is now after the last node)
      }

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // Update state using innerText to get the plain text representation
      const updatedContent = editor.innerText || '';
      setAgentGeneralPrompt(updatedContent);
      setHasAgentChanges(updatedContent !== originalAgentGeneralPrompt);
    } catch (error) {
      console.error('Error inserting autocomplete:', error);
    }

    // Hide autocomplete
    setShowPromptAutocomplete(false);
    setPromptAutocompleteFilter('');
    promptAutocompleteFilterRef.current = ''; // Clear ref as well
    setPromptSlashStartPosition(null);
    setSelectedPromptAutocompleteIndex(0);

    // Refocus editor
    editor.focus();
  };

  return (
    <div className="min-h-screen text-white flex overflow-hidden relative" style={{ backgroundColor: '#0D0D0D' }}>
      {/* Background Elements matching signup page */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-50"></div>
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
      </div>
      
      {/* Main content wrapper */}
      <div className="relative z-10 flex w-full overflow-hidden">
      {/* Premium Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-56 fixed top-0 left-0 bg-black border-r border-white/[0.08] text-white h-screen overflow-hidden z-[100]" style={{ isolation: 'isolate', contain: 'layout style' }}>
        {/* Logo & Brand */}
        <div className="pt-3 px-2 pb-0.5" style={{ willChange: 'transform' }}>
          <div
            className="w-full flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-gray-800 hover:opacity-80 transition-all duration-300 rounded-lg"
            onClick={() => switchTab('home')}
            data-testid="logo-home-link"
            style={{ transform: 'translate3d(0, 0, 0)' }}
          >
            <img src={logoImage} alt="VoiceBot Logo" className="h-5 w-5 object-contain filter brightness-0 invert flex-shrink-0" style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden', willChange: 'transform' }} />
            <span className="text-lg lg:text-xl font-display font-bold text-white" style={{ transform: 'translate3d(0, 0, 0)' }}>
              VoiceBot
            </span>
          </div>
        </div>

        {/* Agent Selection Dropdown */}
        <div className="px-2 pb-4 pt-0.5">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId} open={isAgentDropdownOpen} onOpenChange={(open) => { setIsAgentDropdownOpen(open); if (open) setAgentDropdownPointerMoved(false); }}>
            <SelectTrigger className="bg-transparent border-0 text-white w-full p-2 rounded-xl text-sm [&>svg]:hidden transition-all duration-300 h-auto focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 outline-none ring-0 hover:bg-gray-800" style={{ outline: 'none', boxShadow: 'none' }}>
              <div className="flex items-center justify-between w-full">
                {selectedAgentId && voiceAgentsData && voiceAgentsData.length > 0 ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0 items-start">
                      <span className="truncate text-sm font-medium text-left w-full">
                        {voiceAgentsData.find((a: any) => a.id === selectedAgentId)?.businessName || voiceAgentsData.find((a: any) => a.id === selectedAgentId)?.name || 'Unnamed Agent'}
                      </span>
                      <span className="truncate text-xs text-gray-400 font-mono text-left w-full">
                        {formatPhoneForDisplay(voiceAgentsData.find((a: any) => a.id === selectedAgentId)?.phoneNumber)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <SelectValue placeholder={isLoadingAgents ? "Loading..." : "Select agent"} />
                )}
                {isAgentDropdownOpen ? (
                  <ChevronRight className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                ) : (
                  <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                )}
              </div>
            </SelectTrigger>
            <SelectContent side="right" align="end" sideOffset={8} onPointerMove={() => setAgentDropdownPointerMoved(true)}>
              {voiceAgentsData && voiceAgentsData.length > 0 ? (
                voiceAgentsData.map((agent: any) => {
                  // Format agent display with name and phone number
                  const agentName = agent.businessName || agent.name || 'Unnamed Agent';

                  // Extract city from address if available
                  let city = agent.city;
                  if (!city && agent.address) {
                    const addressParts = agent.address.split(',');
                    if (addressParts.length >= 2) {
                      city = addressParts[addressParts.length - 2]?.trim() || '';
                    }
                  }

                  const formattedPhone = formatPhoneForDisplay(agent.phoneNumber);
                  const phoneForLink = agent.phoneNumber?.replace(/\D/g, '');

                  return (
                    <SelectItem key={agent.id} value={agent.id} className={`[&>span.absolute]:hidden pl-2 rounded-lg cursor-pointer transition-colors${!agentDropdownPointerMoved ? ' focus:!bg-transparent focus:!text-current' : ' hover:bg-gray-800 focus:bg-gray-800'}`}>
                      <div className="flex items-start gap-3 w-full">
                        {/* Bot icon with checkmark overlay */}
                        <div className="relative w-10 h-10 shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                            <Bot className="w-6 h-6" />
                          </div>

                          {/* Checkmark overlay when selected */}
                          {selectedAgentId === agent.id && (
                            <div className="absolute inset-0 bg-gray-800/50 rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Name and info */}
                        <div className="flex flex-col gap-0.5 py-0.5 flex-1 min-w-0">
                          <div className="font-medium">{agentName}</div>
                          {(city || formattedPhone) && (
                            <div className="text-xs text-muted-foreground">
                              {city && <span>{city}</span>}
                              {city && formattedPhone && <span> • </span>}
                              {formattedPhone && phoneForLink && (
                                <a
                                  href={`tel:${phoneForLink}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {formattedPhone}
                                </a>
                              )}
                              {formattedPhone && !phoneForLink && <span>{formattedPhone}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })
              ) : (
                <SelectItem value="none" disabled>No agents available</SelectItem>
              )}

              {/* Sticky Manage Voicebots Button */}
              <div className="sticky bottom-0">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                  onClick={() => {
                    setIsAgentDropdownOpen(false);
                    switchTab('voicebots');
                  }}
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Manage Voicebots
                </Button>
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overscroll-contain">
          {hasPermission('home') && (
            <button
              onClick={() => switchTab('home')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                activeTab === 'home'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              data-testid="link-home"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
          )}

          {hasPermission('calls') && (
            <button
              onClick={() => switchTab('calls')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                activeTab === 'calls'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              data-testid="link-call-history"
            >
              <Phone className="w-4 h-4" />
              <span>Calls</span>
            </button>
          )}

          <button
            onClick={() => switchTab('messaging')}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
              activeTab === 'messaging'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            data-testid="link-messaging"
          >
            <Mail className="w-4 h-4" />
            <span>Messaging</span>
          </button>

          {hasPermission('calls.contacts') && (
            <button
              onClick={() => switchTab('contacts')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                activeTab === 'contacts'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              data-testid="link-contacts"
            >
              <Users className="w-4 h-4" />
              <span>Contacts</span>
            </button>
          )}

          {hasPermission('settings.agents') && (
            <button
              onClick={() => switchTab('agent')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                activeTab === 'agent'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              data-testid="link-agent"
            >
              <Bot className="w-4 h-4" />
              <span>Flow</span>
            </button>
          )}

          {hasPermission('settings.memory') && (
            <button
              onClick={() => switchTab('memory')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                activeTab === 'memory'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              data-testid="link-memory"
            >
              <FileText className="w-4 h-4" />
              <span>Memory</span>
            </button>
          )}

          {hasPermission('settings.integrations') && (
            <button
              onClick={() => switchTab('integrations')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                activeTab === 'integrations'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              data-testid="link-integrations"
            >
              <Globe className="w-4 h-4" />
              <span>Integrations</span>
            </button>
          )}


          {hasPermission('settings.members') && (
            <button
              onClick={() => switchTab('members')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                activeTab === 'members'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              data-testid="link-members"
            >
              <Users className="w-4 h-4" />
              <span>Members</span>
            </button>
          )}
        </nav>

        {/* Bottom Section - Notifications & User Account */}
        <div className="px-2 py-3 flex flex-col items-center space-y-2">
          {/* Notifications Dropdown */}
          <DropdownMenu open={isNotificationsDropdownOpen} onOpenChange={(open) => {
            setIsNotificationsDropdownOpen(open);
            if (open) {
              snapshotUnreadCountRef.current = unreadCount || 0;
              setNotifFilter(snapshotUnreadCountRef.current > 0 ? 'unread' : 'all');
              markSeenMutation.mutate();
            }
          }}>
            <DropdownMenuTrigger asChild>
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm text-gray-400 hover:bg-gray-800 hover:text-white focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 active:outline-none border-0 outline-none ring-0"
                style={{ outline: 'none', boxShadow: 'none' }}
                data-testid="notifications-dropdown"
              >
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Bell className="w-4 h-4" />
                    {unreadCount !== undefined && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                  <span>Notifications</span>
                </div>
                {unreadCount !== undefined && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-80 premium-card text-white ml-2 p-0">
              {/* Header bar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setNotifFilter('unread')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${notifFilter === 'unread' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Unread ({snapshotUnreadCountRef.current})
                  </button>
                  <button
                    onClick={() => setNotifFilter('all')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${notifFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    All
                  </button>
                </div>
                <button
                  onClick={() => { setIsNotificationsDropdownOpen(false); setShowNotifSettingsModal(true); }}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                  title="Notification Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              {/* Notification list */}
              <div className="max-h-96 overflow-y-auto p-2">
                <NotificationList
                  notifications={
                    notifFilter === 'unread'
                      ? (notificationsData || []).slice(0, snapshotUnreadCountRef.current)
                      : (notificationsData || [])
                  }
                  onNotificationClick={handleNotificationClick}
                  onViewMoreClick={handleViewMoreCall}
                  onUnflagClick={handleUnflagCall}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Account */}
          <DropdownMenu open={isAccountDropdownOpen} onOpenChange={setIsAccountDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-start p-2 hover:bg-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 outline-none ring-0 group"
                style={{ outline: 'none', boxShadow: 'none' }}
                data-testid="user-account-dropdown"
              >
                <div className="flex items-center w-full">
                  <AccountAvatarWithProgress
                    role={currentUserRole}
                    minutesUsed={stats.phoneMinutesThisMonth}
                    minutesLimit={monthlyLimit}
                  />
                  <div className="flex-1 ml-2 min-w-0">
                    <p className="text-sm font-medium text-white text-left truncate" data-testid="user-name">
                      {user?.name || user?.firstName || 'User'}
                    </p>
                  </div>
                  {isAccountDropdownOpen ? (
                    <ChevronRight className="w-3 h-3 text-gray-400 ml-1" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-400 ml-1" />
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-64 premium-card text-white ml-2">
              {/* Organizations Section */}
              {organizationsData?.organizations && organizationsData.organizations.length > 0 && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Organizations</p>
                  </div>
                  {organizationsData.organizations.map((org: any) => {
                    const isCurrent = currentOrgData?.currentOrganization?.id === org.id;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        className={`hover:bg-gray-800 focus:bg-gray-800 cursor-pointer ${
                          isCurrent ? 'bg-gray-800/50' : ''
                        }`}
                        data-testid={`org-${org.id}`}
                        onClick={() => {
                          if (!isCurrent) {
                            switchOrganizationMutation.mutate(org.id);
                          }
                        }}
                      >
                        <Store className="w-4 h-4 mr-2" />
                        <div className="flex-1">
                          <div className="font-medium">{org.name}</div>
                          <div className="text-xs text-gray-400">{org.role}</div>
                        </div>
                        {isCurrent && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator className="bg-gray-800" />
                </>
              )}
              
              {/* Menu Items */}
              <DropdownMenuItem
                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                data-testid="contact-us"
                onClick={() => {
                  setShowContactModal(true);
                  setIsAccountDropdownOpen(false);
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Us
              </DropdownMenuItem>
              
              {/* Billing - Show for primary owners, billing contacts, OR users without organizations (legacy users) */}
              {(!currentOrgData?.currentOrganization || 
                currentOrgData?.currentOrganization?.accountType === 'owner' || 
                currentOrgData?.currentOrganization?.isBillingContact === true) && (
                <DropdownMenuItem
                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                  data-testid="billing"
                  onClick={() => {
                    switchTab('billing');
                    setIsAccountDropdownOpen(false);
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Billing
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem
                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                data-testid="account-settings"
                onClick={() => {
                  switchTab('account');
                  setIsAccountDropdownOpen(false);
                }}
              >
                <User className="w-4 h-4 mr-2" />
                Account
              </DropdownMenuItem>
              
              <DropdownMenuItem
                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                data-testid="voicebots"
                onClick={() => {
                  switchTab('voicebots');
                  setIsAccountDropdownOpen(false);
                }}
              >
                <Bot className="w-4 h-4 mr-2" />
                Manage Voicebots
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem
                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-red-400 focus:text-red-400"
                onClick={handleLogout}
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation */}
      <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <SheetContent side="left" className="w-80 sm:w-1/2 sm:max-w-[50%] bg-black text-white">
          <SheetHeader>
            <SheetTitle className="text-white text-left flex items-center space-x-3 p-3 rounded-xl">
              <img src={logoImage} alt="VoiceBot Logo" className="h-8 w-8 object-contain filter brightness-0 invert flex-shrink-0" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }} />
              <span className="font-display font-bold text-xl">
                VoiceBot
              </span>
            </SheetTitle>
          </SheetHeader>

          {/* Agent Selection Dropdown for Mobile */}
          <div className="px-2 py-3 mt-4 border-b border-white/[0.08]">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId} open={isMobileAgentDropdownOpen} onOpenChange={(open) => { setIsMobileAgentDropdownOpen(open); if (open) setMobileAgentDropdownPointerMoved(false); }}>
              <SelectTrigger className="bg-transparent border-gray-800 text-gray-300 w-full px-3 py-2 rounded-lg text-sm [&>svg]:hidden" data-testid="mobile-agent-selector">
                <div className="flex items-center justify-between w-full">
                  {selectedAgentId && voiceAgentsData && voiceAgentsData.length > 0 ? (
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                        <Bot className="w-2.5 h-2.5" />
                      </div>
                      <span className="truncate">
                        {voiceAgentsData.find((a: any) => a.id === selectedAgentId)?.businessName || voiceAgentsData.find((a: any) => a.id === selectedAgentId)?.name || 'Unnamed Agent'}
                      </span>
                    </div>
                  ) : (
                    <SelectValue placeholder={isLoadingAgents ? "Loading..." : "Select agent"} />
                  )}
                  {isMobileAgentDropdownOpen ? (
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  )}
                </div>
              </SelectTrigger>
              <SelectContent side="right" align="end" sideOffset={8} onPointerMove={() => setMobileAgentDropdownPointerMoved(true)}>
                {voiceAgentsData && voiceAgentsData.length > 0 ? (
                  voiceAgentsData.map((agent: any) => {
                    // Format agent display with name and phone number
                    const agentName = agent.businessName || agent.name || 'Unnamed Agent';

                    // Extract city from address if available
                    let city = agent.city;
                    if (!city && agent.address) {
                      const addressParts = agent.address.split(',');
                      if (addressParts.length >= 2) {
                        city = addressParts[addressParts.length - 2]?.trim() || '';
                      }
                    }

                    const formattedPhone = formatPhoneForDisplay(agent.phoneNumber);
                    const phoneForLink = agent.phoneNumber?.replace(/\D/g, '');

                    return (
                      <SelectItem key={agent.id} value={agent.id} className={`[&>span.absolute]:hidden pl-2 rounded-lg cursor-pointer transition-colors${!mobileAgentDropdownPointerMoved ? ' focus:!bg-transparent focus:!text-current' : ' hover:bg-gray-800 focus:bg-gray-800'}`}>
                        <div className="flex items-start gap-3 w-full">
                          {/* Avatar with checkmark overlay */}
                          <div className="relative w-10 h-10 shrink-0">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={agent.avatarUrl} alt={agentName} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                                {agentName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            {/* Checkmark overlay when selected */}
                            {selectedAgentId === agent.id && (
                              <div className="absolute inset-0 bg-gray-800/50 rounded-full flex items-center justify-center">
                                <Check className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Name and info */}
                          <div className="flex flex-col gap-0.5 py-0.5 flex-1 min-w-0">
                            <div className="font-medium">{agentName}</div>
                            {(city || formattedPhone) && (
                              <div className="text-xs text-muted-foreground">
                                {city && <span>{city}</span>}
                                {city && formattedPhone && <span> • </span>}
                                {formattedPhone && phoneForLink && (
                                  <a
                                    href={`tel:${phoneForLink}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {formattedPhone}
                                  </a>
                                )}
                                {formattedPhone && !phoneForLink && <span>{formattedPhone}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="none" disabled>No agents available</SelectItem>
                )}

                {/* Sticky Manage Voicebots Button */}
                <div className="sticky bottom-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                    onClick={() => {
                      setIsMobileAgentDropdownOpen(false);
                      setShowMobileMenu(false);
                      setActiveTab('voicebots');
                    }}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Manage Voicebots
                  </Button>
                </div>
              </SelectContent>
            </Select>
          </div>

          <nav className="mt-6 space-y-1 px-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            {hasPermission('home') && (
              <button
                onClick={() => {
                  setActiveTab('home');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                  activeTab === 'home'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                data-testid="mobile-link-home"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            )}

            {hasPermission('calls') && (
              <button
                onClick={() => {
                  setActiveTab('calls');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                  activeTab === 'calls'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                data-testid="mobile-link-calls"
              >
                <Phone className="w-4 h-4" />
                <span>Calls</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('messaging');
                setShowMobileMenu(false);
              }}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                activeTab === 'messaging'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              data-testid="mobile-link-messaging"
            >
              <Mail className="w-4 h-4" />
              <span>Messaging</span>
            </button>

            {hasPermission('calls.contacts') && (
              <button
                onClick={() => {
                  setActiveTab('contacts');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                  activeTab === 'contacts'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                data-testid="mobile-link-contacts"
              >
                <Users className="w-4 h-4" />
                <span>Contacts</span>
              </button>
            )}

            {hasPermission('settings.agents') && (
              <button
                onClick={() => {
                  setActiveTab('agent');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                  activeTab === 'agent'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                data-testid="mobile-link-agent"
              >
                <Bot className="w-4 h-4" />
                <span>Flow</span>
              </button>
            )}

            {hasPermission('settings.memory') && (
              <button
                onClick={() => {
                  setActiveTab('memory');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                  activeTab === 'memory'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                data-testid="mobile-link-memory"
              >
                <FileText className="w-4 h-4" />
                <span>Memory</span>
              </button>
            )}

            {hasPermission('settings.integrations') && (
              <button
                onClick={() => {
                  setActiveTab('integrations');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                  activeTab === 'integrations'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                data-testid="mobile-link-integrations"
              >
                <Globe className="w-4 h-4" />
                <span>Integrations</span>
              </button>
            )}


            {hasPermission('settings.members') && (
              <button
                onClick={() => {
                  setActiveTab('members');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm ${
                  activeTab === 'members'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                data-testid="mobile-link-members"
              >
                <Users className="w-4 h-4" />
                <span>Members</span>
              </button>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-56">
        {/* Sticky Top Bar - show on mobile for all tabs, desktop for non-home tabs */}
        <div className={`fixed top-0 left-0 right-0 lg:left-56 z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} text-white py-4 px-6 lg:px-8`}>
            <div className="max-w-7xl mx-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className={`flex items-center gap-4 transition-all duration-300 ${isScrolled ? 'gap-6' : ''}`}>
                    {/* Mobile Menu Button */}
                    <div className="lg:hidden flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 hover:bg-gray-800 text-white rounded-xl transition-all duration-300"
                        aria-label="Open navigation menu"
                        data-testid="mobile-menu-button"
                        onClick={() => setShowMobileMenu(true)}
                      >
                        <Menu className="w-5 h-5" />
                      </Button>
                    </div>
                    <h1 className="text-lg lg:text-xl font-bold text-white transition-colors duration-200 capitalize truncate">{activeTab === 'agent' ? 'Flow' : activeTab}</h1>
                  </div>
                </div>

                {/* Mobile Notifications & Account Buttons - Fixed positioning to always stay on screen */}
                <div className="lg:hidden flex items-center gap-2 flex-shrink-0">
                  {/* Mobile Notifications Button */}
                  <DropdownMenu onOpenChange={(open) => {
                    if (open) {
                      markSeenMutation.mutate();
                    }
                  }}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative p-2 hover:bg-gray-800 text-white rounded-xl transition-all duration-300 min-w-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 outline-none ring-0"
                        style={{ outline: 'none', boxShadow: 'none' }}
                        onMouseDown={(e) => e.preventDefault()}
                        data-testid="mobile-notifications-dropdown"
                      >
                        <Bell className="w-5 h-5" />
                        {unreadCount !== undefined && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-80 premium-card text-white"
                      sideOffset={8}
                      alignOffset={0}
                      avoidCollisions={true}
                      collisionPadding={20}
                    >
                      <div className="max-h-96 overflow-y-auto">
                        <NotificationList
                          notifications={notificationsData || []}
                          onNotificationClick={handleNotificationClick}
                          onViewMoreClick={handleViewMoreCall}
                          onUnflagClick={handleUnflagCall}
                        />
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Mobile Account Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center p-2 hover:bg-gray-800 rounded-xl transition-all duration-300 min-w-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 outline-none ring-0 group"
                        style={{ outline: 'none', boxShadow: 'none' }}
                        data-testid="mobile-user-account-dropdown"
                      >
                        <AccountAvatarWithProgress
                          role={currentUserRole}
                          minutesUsed={stats.phoneMinutesThisMonth}
                          minutesLimit={monthlyLimit}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 premium-card text-white"
                      sideOffset={8}
                      alignOffset={0}
                      avoidCollisions={true}
                      collisionPadding={20}
                    >
                      <div className="px-3 py-2 border-b border-gray-800">
                        <p className="text-xs font-medium text-white truncate">
                          {user?.name || user?.firstName || 'User'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user?.email || 'Loading...'}
                        </p>
                      </div>
                      <DropdownMenuItem
                        className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                        data-testid="mobile-contact-us"
                        onClick={() => {
                          setShowContactModal(true);
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Contact Us
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                        data-testid="mobile-billing"
                        onClick={() => {
                          setActiveTab('billing');
                        }}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Billing
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                        data-testid="mobile-account-settings"
                        onClick={() => {
                          setActiveTab('account');
                        }}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Account
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                        data-testid="mobile-voicebots"
                        onClick={() => {
                          setActiveTab('voicebots');
                        }}
                      >
                        <Bot className="w-4 h-4 mr-2" />
                        Manage Voicebots
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-800" />
                      <DropdownMenuItem
                        className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-red-400 focus:text-red-400"
                        onClick={handleLogout}
                        data-testid="mobile-logout-button"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        {/* Main Content with Premium Background */}
        <div className={`flex-1 ${activeTab === 'agent' || activeTab === 'memory' ? 'p-0' : 'p-6 lg:p-8 pb-32 md:pb-6 lg:pb-8'} ${activeTab === 'calls' || activeTab === 'contacts' || activeTab === 'messaging' || activeTab === 'members' || activeTab === 'agent' || activeTab === 'memory' ? 'overflow-hidden' : 'overflow-y-auto'} overflow-x-hidden main-content-scroll ${activeTab === 'agent' || activeTab === 'memory' ? '' : 'pt-16'}`} style={{ backgroundColor: '#0D0D0D' }}>
          <div className={`${activeTab === 'agent' || activeTab === 'memory' ? 'w-full' : 'max-w-7xl mx-auto'} ${activeTab === 'calls' || activeTab === 'contacts' || activeTab === 'messaging' || activeTab === 'members' || activeTab === 'agent' || activeTab === 'memory' ? 'h-full' : 'space-y-6'}`}>

        {/* Main Dashboard Content */}
        <Tabs value={activeTab} className={activeTab === 'calls' || activeTab === 'contacts' || activeTab === 'messaging' || activeTab === 'members' || activeTab === 'agent' || activeTab === 'memory' ? 'h-full' : 'space-y-6'}>

          {/* ── Finish Setup Banner ───────────────────────────────────────── */}
          {showSetupBanner && selectedAgent && (
            <div className="mx-0 mb-4 mt-2 flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm text-amber-300">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg flex-shrink-0">⚡</span>
                <div className="min-w-0">
                  <span className="font-semibold">Finish setting up {selectedAgent.name}.</span>
                  <span className="ml-2 text-amber-400/80 hidden sm:inline">
                    {confidenceScore < 40
                      ? "We couldn't find enough data about your business. A 2-minute form will get your AI agent fully ready."
                      : "A few details are missing. Complete setup to improve your agent's accuracy."}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSetupModal(true)}
                className="flex-shrink-0 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 transition-colors"
              >
                Finish Setup
              </button>
            </div>
          )}

          {/* ── Setup Completion Modal ─────────────────────────────────────── */}
          {showSetupModal && selectedAgent && (
            <SetupCompletionModal
              open={showSetupModal}
              onClose={() => { setShowSetupModal(false); setMvoData(null); }}
              agentId={mvoData?.agentId || selectedAgent.id}
              businessName={prefillData['businessName'] || selectedAgent.name}
              industry={mvoData?.industry || userIndustry}
              confidenceScore={confidenceScore}
              missingFields={missingFields}
              foundFields={foundFields}
              prefillData={prefillData}
            />
          )}

          {/* Overview Tab */}
          <TabsContent value="home" className="space-y-6 mt-8">
            {/* AI Receptionist Info */}
            <div className="premium-card rounded-2xl">
              <div className="p-8">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Bot Icon Avatar - matches Manage Voicebots tab */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                    <Bot className="w-10 h-10" />
                  </div>

                  <div className="flex flex-col gap-1 flex-1 min-w-0 items-start">
                    <span className="truncate text-xl font-semibold text-left w-full">
                      {selectedAgentId && voiceAgentsData && voiceAgentsData.length > 0
                        ? (voiceAgentsData.find((a: any) => a.id === selectedAgentId)?.businessName || voiceAgentsData.find((a: any) => a.id === selectedAgentId)?.name || 'Unnamed Agent')
                        : (isLoadingAgents ? 'Loading...' : 'No AI Receptionist')}
                    </span>
                    <span className="truncate text-base text-gray-400 font-mono text-left w-full">
                      {selectedAgentId && voiceAgentsData && voiceAgentsData.length > 0
                        ? (formatPhoneForDisplay(voiceAgentsData.find((a: any) => a.id === selectedAgentId)?.phoneNumber) || 'No phone number')
                        : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Retell AI Agent Section */}
            {businessData.retellEnabled && businessData.retellAgentId && (
              <div className="premium-card rounded-2xl">
                <div className="space-y-4 p-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-800/60 p-4 rounded-2xl">
                      <p className="text-sm text-gray-400">Agent ID</p>
                      <p className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent font-mono text-xs break-all">
                        {businessData.retellAgentId}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-black/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Features</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="text-white">Real-time Voice</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="text-white">Emergency Address</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="text-white">Auto Transcription</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="text-white">Live Analytics</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ElevenLabs AI Agent Section */}
            {businessData.elevenLabsEnabled && businessData.elevenLabsAgentId && (
              <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/50 rounded-lg">
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-purple-400">
                        Agent ID: {businessData.elevenLabsAgentId}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-green-500 text-white">
                          🤖 Active
                        </Badge>
                        <span className="text-gray-400 text-sm">Real-time Conversational AI</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Agent Type</p>
                      <p className="text-lg font-medium text-white">ElevenLabs Conversational AI</p>
                      <p className="text-purple-400 text-sm">Natural conversation flow</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Voice Processing:</span>
                      <span className="text-green-400">✓ Native Speech-to-Speech</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-400">Response Time:</span>
                      <span className="text-green-400">✓ Ultra-low latency</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-400">Business Knowledge:</span>
                      <span className="text-green-400">✓ Custom trained</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                      data-testid="button-test-agent"
                    >
                      <i className="fas fa-phone mr-2"></i>
                      Test Agent
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                      data-testid="button-manage-agent"
                    >
                      <i className="fas fa-cog mr-2"></i>
                      Manage Agent
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Metric Cards - Fixed: Calls, Revenue, Phone Minutes for all industries */}
            {(() => {
              const homeCards = [
                { id: 'calls', label: 'Calls' },
                { id: 'revenue', label: 'Revenue' },
                { id: 'phone_minutes', label: 'Phone Minutes' },
              ];
              const colorClasses: Record<string, { bg: string; text: string }> = {
                cyan: { bg: 'bg-cyan-500/20', text: 'text-blue-400' },
                blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
                purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
                green: { bg: 'bg-green-500/20', text: 'text-green-400' },
                orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
                red: { bg: 'bg-red-500/20', text: 'text-red-400' },
                yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
                gray: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
              };
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {isLoadingCalls ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="premium-card rounded-lg">
                        <div className="p-3 md:p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                            <div className="flex-1 space-y-2">
                              <div className="h-3 w-20 bg-gray-700 rounded skeleton"></div>
                              <div className="h-8 w-16 bg-gray-700 rounded skeleton"></div>
                            </div>
                            <div className="w-8 md:w-12 h-8 md:h-12 bg-gray-700 rounded-lg skeleton self-start"></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    homeCards.map((card) => {
                      const cardData = getMetricCardValue(card.id);
                      const colors = colorClasses[cardData.color] || colorClasses.gray;
                      const isRevenueLoading = card.id === 'revenue' && isLoadingKnowledgeBase;
                      return (
                        <div key={card.id} className="premium-card rounded-lg">
                          <div className="p-3 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                              <div className="flex-1">
                                <p className="text-gray-400 text-xs md:text-sm">{card.label}</p>
                                {isRevenueLoading ? (
                                  <div className="h-8 w-20 bg-gray-700 rounded skeleton mt-1"></div>
                                ) : (
                                  <p className="text-xl md:text-3xl font-bold text-white">{cardData.value}</p>
                                )}
                              </div>
                              <div className={`w-8 md:w-12 h-8 md:h-12 ${colors.bg} rounded-lg flex items-center justify-center self-start`}>
                                <i className={`fas ${cardData.icon} ${colors.text} text-sm md:text-base`}></i>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {/* Live Calls */}
            <div className="premium-card rounded-2xl overflow-hidden max-h-[800px] flex flex-col">
              <div className="overflow-y-auto flex-1 p-6">
                <LiveCallsDisplay agentId={selectedAgentId} />
              </div>
            </div>

            {/* Overage Fees Tracking Section */}
            {(hasOverage || usagePercentage > 80) && (
              <div className={`${hasOverage ? 'bg-red-900/30 border-red-500/50' : 'bg-yellow-900/30 border-yellow-500/50'} border rounded-lg`}>
                <div className="space-y-6 p-6">
                  {/* Current Overage Status */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/60 p-4 rounded-2xl">
                      <p className="text-gray-400 text-sm mb-1">Overage Minutes</p>
                      <p className={`text-2xl font-bold ${hasOverage ? 'text-red-400' : 'text-yellow-400'}`} data-testid="overage-minutes">
                        {hasOverage ? overageMinutes : 0}
                      </p>
                      <p className="text-gray-500 text-xs">minutes over limit</p>
                    </div>
                    
                    <div className="bg-gray-800/60 p-4 rounded-2xl">
                      <p className="text-gray-400 text-sm mb-1">Overage Charges</p>
                      <p className={`text-2xl font-bold ${hasOverage ? 'text-red-400' : 'text-yellow-400'}`} data-testid="overage-charges">
                        ${hasOverage ? overageCharges : '0.00'}
                      </p>
                      <p className="text-gray-500 text-xs">additional this month</p>
                    </div>
                    
                    <div className="bg-gray-800/60 p-4 rounded-2xl">
                      <p className="text-gray-400 text-sm mb-1">Rate per Minute</p>
                      <p className="text-2xl font-bold text-white" data-testid="overage-rate">
                        ${overageRate.toFixed(2)}
                      </p>
                      <p className="text-gray-500 text-xs">per minute over</p>
                    </div>
                  </div>

                  {/* Overage Details */}
                  <div className="bg-black/20 p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <i className="fas fa-calculator text-blue-400"></i>
                      Overage Breakdown
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Monthly Limit:</span>
                        <span className="text-white">{monthlyLimit} minutes</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Minutes Used:</span>
                        <span className="text-white">{stats.phoneMinutesThisMonth} minutes</span>
                      </div>
                      <div className="border-t border-gray-800 pt-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className={`${hasOverage ? 'text-red-400' : 'text-gray-400'} font-medium`}>
                            Minutes Over Limit:
                          </span>
                          <span className={`${hasOverage ? 'text-red-400' : 'text-white'} font-medium`}>
                            {hasOverage ? `+${overageMinutes}` : '0'} minutes
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className={`${hasOverage ? 'text-red-400' : 'text-gray-400'} font-medium`}>
                            Total Overage Cost:
                          </span>
                          <span className={`${hasOverage ? 'text-red-400' : 'text-white'} font-bold`}>
                            ${hasOverage ? overageCharges : '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Historical Overage (Mock Data) */}
                  <div className="bg-black/20 p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <i className="fas fa-history text-blue-400"></i>
                      Recent Overage History
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Last Month:</span>
                        <span className="text-gray-300">$0.00 (no overage)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">2 Months Ago:</span>
                        <span className="text-gray-300">$12.50 (25 min over)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">3 Months Ago:</span>
                        <span className="text-gray-300">$0.00 (no overage)</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {hasOverage && (
                      <Button 
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                        onClick={handleManageSubscription}
                        disabled={isLoadingBillingPortal}
                        data-testid="button-upgrade-plan-overage"
                      >
                        {isLoadingBillingPortal ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Opening Portal...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-arrow-up mr-2"></i>
                            Upgrade Plan to Avoid Overages
                          </>
                        )}
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      className={`flex-1 ${hasOverage ? 'border-red-500/50 text-red-400 hover:bg-red-500/20' : 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20'}`}
                      onClick={() => switchTab('billing')}
                      data-testid="button-view-billing-overage"
                    >
                      <i className="fas fa-file-invoice mr-2"></i>
                      View Billing Details
                    </Button>
                  </div>

                  {/* Warning or Info Message */}
                  {hasOverage ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm font-medium">
                        <i className="fas fa-exclamation-triangle mr-2"></i>
                        You are currently being charged overage fees. Consider upgrading your plan to avoid future charges.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-sm font-medium">
                        <i className="fas fa-info-circle mr-2"></i>
                        You're approaching your monthly limit. Overage charges of ${overageRate.toFixed(2)}/minute will apply if you exceed {monthlyLimit} minutes.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Calls Tab (formerly History) */}
          {hasPermission('calls') && (
            <TabsContent value="calls" className="h-full overflow-hidden mt-8">
              <div className="h-full">
                <CallHistoryTable
                  calls={filteredCallHistory || []}
                  isLoading={isLoadingCalls}
                  conversations={conversations}
                  isLoadingConversations={isLoadingConversations}
                  industry={selectedAgentIndustry}
                  agentId={selectedAgentId || undefined}
                  openCallId={openCallId}
                  onOpenCallHandled={() => setOpenCallId(null)}
                  onRefresh={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedAgentId] });
                    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/call-stats', selectedAgentId] });
                  }}
                  onSwitchToMessaging={(phoneNumber: string) => {
                    setSelectedMessagingPhone(phoneNumber);
                    setActiveTab('messaging');
                  }}
                  businessData={rawBusinessData}
                  kbContent={knowledgeBaseContent?.content || ''}
                />
              </div>
            </TabsContent>
          )}

          {/* Members Tab */}
          {hasPermission('settings.members') && (
            <TabsContent value="members" className="h-full overflow-hidden mt-8">
              <div className="h-full">
                <MembersTable
                  selectedAgentId={selectedAgentId}
                  defaultCallTransferMemberId={selectedAgent?.defaultCallTransferMemberId}
                  onOpenInviteModal={() => setShowInviteModal(true)}
                />
              </div>
            </TabsContent>
          )}

          {/* Contacts Tab */}
          {hasPermission('calls.contacts') && (
            <TabsContent value="contacts" className="mt-8 h-full overflow-hidden">
              <div className="h-full">
                <CustomerContactsTable
                  calls={safeCallHistory}
                  isLoading={false}
                  onRefresh={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedAgentId] });
                    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/call-stats', selectedAgentId] });
                  }}
                  selectedAgentId={selectedAgentId}
                  industry={selectedAgentIndustry}
                  businessData={rawBusinessData}
                  kbContent={knowledgeBaseContent?.content || ''}
                />
              </div>
            </TabsContent>
          )}

          {/* Messaging Tab */}
          <TabsContent value="messaging" className="mt-8 h-full overflow-hidden">
            <MessagingPage
              contacts={messagingContacts}
              isLoading={isLoadingSmsMessages}
              initialSelectedPhone={selectedMessagingPhone}
              onNavigateToContacts={(contactPhone: string) => {
                // Switch to contacts tab
                setActiveTab('contacts');
                // The CustomerContactsTable will handle opening the contact details
                // when the tab switches
              }}
              onRefreshMessages={() => {
                refetchSmsMessages();
              }}
            />
          </TabsContent>

          {/* Memory Tab */}
          {hasPermission('settings') && (
            <TabsContent value="memory" className="h-full overflow-hidden mt-14 px-6 lg:px-8">
              <div className="h-full flex flex-col">
                {selectedAgent ? (
                  <>
                    {/* Business Info Mode (default view) */}
                    {memoryMode === 'business' && !editingSource && !selectedSourceId && (
                      <div className="flex gap-8 h-full mr-0 lg:mr-[416px]">
                        {/* Left Side: Top Bar + Editor (or no-KB placeholder) */}
                        <div className="flex-1 relative h-full">
                          {knowledgeBaseContent?.source === 'no_kb' && !isLoadingKnowledgeBase ? (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-16">
                              <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-2">
                                <i className="fas fa-database text-gray-500 text-xl"></i>
                              </div>
                              <div>
                                <p className="text-gray-300 font-medium text-base mb-1">No knowledge base connected</p>
                                <p className="text-gray-500 text-sm max-w-xs">Add a file, webpage, or text source from the panel on the right to create one and start teaching your AI receptionist.</p>
                              </div>
                            </div>
                          ) : (
                          <>
                          {/* Top Bar with Delete, Title, Metadata and Controls - Fixed position */}
                          <div className={`fixed top-[3.75rem] left-6 lg:left-[16rem] right-6 lg:right-[28rem] z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} flex items-center justify-between px-0 py-3 border-b border-gray-800`} style={{ backgroundColor: '#0D0D0D' }}>
                            {/* Left: Save Status Icon + Title Input */}
                            <div className="flex items-center gap-3 flex-1">
                              {/* Save Status Icon - appears LEFT of title, only takes space when visible */}
                              {(memorySaveStatus === 'saving' ||
                                (memorySaveStatus === 'saved' && memoryLastSaveTime) ||
                                memorySaveStatus === 'error' ||
                                (memorySaveStatus === 'idle' && memoryLastSaveTime)) && (
                                <div className="flex items-center flex-shrink-0">
                                  {memorySaveStatus === 'saving' && (
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" title="Saving..."></div>
                                  )}
                                  {memorySaveStatus === 'saved' && memoryLastSaveTime && (
                                    <i className="fas fa-check text-green-400 cursor-help" title={`Last saved: ${memoryLastSaveTime.toLocaleDateString()} at ${memoryLastSaveTime.toLocaleTimeString()}`}></i>
                                  )}
                                  {memorySaveStatus === 'error' && (
                                    <i className="fas fa-exclamation-triangle text-red-400" title="Error saving"></i>
                                  )}
                                  {memorySaveStatus === 'idle' && memoryLastSaveTime && (
                                    <i className="fas fa-check text-gray-500 cursor-help" title={`Last saved: ${memoryLastSaveTime.toLocaleDateString()} at ${memoryLastSaveTime.toLocaleTimeString()}`}></i>
                                  )}
                                </div>
                              )}

                              {/* Title Input - editable */}
                              <input
                                type="text"
                                value={businessInfoTitle}
                                onChange={(e) => setBusinessInfoTitle(e.target.value)}
                                placeholder="Business Information"
                                maxLength={50}
                                className="bg-transparent border-none outline-none text-gray-300 text-sm font-semibold placeholder-gray-600 focus:placeholder-gray-500 transition-colors"
                                style={{ width: '200px' }}
                                data-testid="input-business-info-title"
                              />
                            </div>

                            {/* Right: Undo/Redo */}
                            <div className="flex items-center gap-3">
                              {/* Undo Button */}
                              <button
                                onClick={handleMemoryUndo}
                                disabled={memoryHistoryIndex <= 0}
                                className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                title="Undo (Ctrl+Z)"
                                data-testid="button-undo-memory"
                              >
                                <i className="fas fa-undo text-sm"></i>
                              </button>

                              {/* Redo Button */}
                              <button
                                onClick={handleMemoryRedo}
                                disabled={memoryHistoryIndex >= memoryHistory.length - 1}
                                className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                title="Redo (Ctrl+Y)"
                                data-testid="button-redo-memory"
                              >
                                <i className="fas fa-redo text-sm"></i>
                              </button>

                              {/* Mobile Three Dots Menu Button */}
                              <button
                                onClick={() => setMemoryKnowledgeModalOpen(true)}
                                className="lg:hidden text-gray-300 hover:text-white transition-colors ml-3"
                                title="View knowledge sources"
                                data-testid="button-memory-mobile-menu"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Contenteditable inline editor */}
                          <div
                            key={`memory-editor-${selectedAgentId}-${activeTab}`}
                            ref={businessInfoEditableRef}
                            contentEditable
                            suppressContentEditableWarning
                            spellCheck={false}
                            autoCorrect="off"
                            autoComplete="off"
                            autoCapitalize="off"
                            className="h-full pt-16 font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-300 outline-none overflow-auto"
                          onInput={(e) => {
                            // Update state with new content (use innerText to preserve line breaks)
                            const newContent = e.currentTarget.innerText || '';
                            setBusinessInfoText(newContent);
                            setHasMemoryChanges(newContent !== originalBusinessInfoText);
                            
                            // Track history for undo/redo
                            if (memoryHistory.length === 0 || memoryHistory[memoryHistory.length - 1] !== newContent) {
                              const newHistory = memoryHistory.slice(0, memoryHistoryIndex + 1);
                              newHistory.push(newContent);
                              // Limit history to last 50 states
                              if (newHistory.length > 50) {
                                newHistory.shift();
                              }
                              setMemoryHistory(newHistory);
                              setMemoryHistoryIndex(newHistory.length - 1);
                            }
                          }}
                          data-testid="contenteditable-business-info"
                          />
                          </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Selected Source Viewing/Editing Mode - Text Content */}
                    {memoryMode === 'business' && !editingSource && selectedSourceId && selectedSourceData && selectedSourceData.type === 'text' && (
                      <div className="flex-1 relative h-full mr-0 lg:mr-[416px]">
                        {/* Top Bar with Delete, Title, Metadata and Controls - Fixed position */}
                        <div className={`fixed top-[3.75rem] left-6 lg:left-[16rem] right-6 lg:right-[28rem] z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} flex items-center justify-between px-0 py-3 border-b border-gray-800`} style={{ backgroundColor: '#0D0D0D' }}>
                          {/* Left: Save Status Icon + Title Input */}
                          <div className="flex items-center gap-3 flex-1">
                            {/* Save Status Icon - appears LEFT of title, only takes space when visible */}
                            {(memorySaveStatus === 'saving' ||
                              (memorySaveStatus === 'saved' && memoryLastSaveTime) ||
                              memorySaveStatus === 'error' ||
                              (memorySaveStatus === 'idle' && memoryLastSaveTime)) && (
                              <div className="flex items-center flex-shrink-0">
                                {memorySaveStatus === 'saving' && (
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" title="Saving..."></div>
                                )}
                                {memorySaveStatus === 'saved' && memoryLastSaveTime && (
                                  <i className="fas fa-check text-green-400 cursor-help" title={`Last saved: ${memoryLastSaveTime.toLocaleDateString()} at ${memoryLastSaveTime.toLocaleTimeString()}`}></i>
                                )}
                                {memorySaveStatus === 'error' && (
                                  <i className="fas fa-exclamation-triangle text-red-400" title="Error saving"></i>
                                )}
                                {memorySaveStatus === 'idle' && memoryLastSaveTime && (
                                  <i className="fas fa-check text-gray-500 cursor-help" title={`Last saved: ${memoryLastSaveTime.toLocaleDateString()} at ${memoryLastSaveTime.toLocaleTimeString()}`}></i>
                                )}
                              </div>
                            )}

                            {/* Title Input */}
                            <input
                              type="text"
                              value={selectedSourceData.title || ''}
                              onChange={(e) => {
                                setSelectedSourceData({ ...selectedSourceData, title: e.target.value });
                                setHasTitleChanges(true);
                              }}
                              placeholder="Untitled"
                              maxLength={50}
                              className="bg-transparent border-none outline-none text-gray-300 text-sm font-semibold placeholder-gray-600 focus:placeholder-gray-500 transition-colors"
                              style={{ width: '200px' }}
                              data-testid="input-text-source-title"
                            />
                          </div>

                          {/* Right: Undo/Redo */}
                          <div className="flex items-center gap-3">
                            {/* Undo Button */}
                            <button
                              onClick={handleMemoryUndo}
                              disabled={memoryHistoryIndex <= 0}
                              className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                              title="Undo to last saved version (Ctrl+Z)"
                              data-testid="button-undo-memory"
                            >
                              <i className="fas fa-undo text-sm"></i>
                            </button>

                            {/* Redo Button */}
                            <button
                              onClick={handleMemoryRedo}
                              disabled={memoryHistoryIndex >= memoryHistory.length - 1}
                              className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                              title="Redo to next saved version (Ctrl+Y)"
                              data-testid="button-redo-memory"
                            >
                              <i className="fas fa-redo text-sm"></i>
                            </button>

                            {/* Mobile Three Dots Menu Button */}
                            <button
                              onClick={() => setMemoryKnowledgeModalOpen(true)}
                              className="lg:hidden text-gray-300 hover:text-white transition-colors ml-3"
                              title="View knowledge sources"
                              data-testid="button-memory-mobile-menu"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Contenteditable text area - EXACT same style as Business Information */}
                        <div
                          key={`text-source-editor-${selectedSourceId}`}
                          ref={textSourceEditableRef}
                          contentEditable
                          suppressContentEditableWarning
                          spellCheck={false}
                          autoCorrect="off"
                          autoComplete="off"
                          autoCapitalize="off"
                          className="h-full pt-16 font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-300 outline-none overflow-auto"
                          onInput={(e) => {
                            // Use innerText to preserve line breaks
                            const newContent = e.currentTarget.innerText || '';
                            setSelectedSourceData({ ...selectedSourceData, textContent: newContent });
                            setHasMemoryChanges(true);
                          }}
                        />
                      </div>
                    )}

                    {/* Selected Source Viewing/Editing Mode - File */}
                    {memoryMode === 'business' && !editingSource && selectedSourceId && selectedSourceData && selectedSourceData.type === 'file' && (
                      <div className="flex-1 relative h-full mr-0 lg:mr-[416px]">
                        {/* Top Bar with Delete, Title, Metadata and Controls - Fixed position */}
                        <div className={`fixed top-[3.75rem] left-6 lg:left-[16rem] right-6 lg:right-[28rem] z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} flex items-center justify-between px-0 py-3 border-b border-gray-800`} style={{ backgroundColor: '#0D0D0D' }}>
                          {/* Left: Delete Button + Save Status Icon + Title Input */}
                          <div className="flex items-center gap-4 flex-1">
                            {/* Delete Button */}
                            <button
                              onClick={() => setShowDeleteDialog(true)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete"
                            >
                              <i className="fas fa-trash text-sm"></i>
                            </button>

                            {/* Save Status Icon - appears LEFT of title, only takes space when visible */}
                            {(memorySaveStatus === 'saving' ||
                              (memorySaveStatus === 'saved' && memoryLastSaveTime) ||
                              memorySaveStatus === 'error' ||
                              (memorySaveStatus === 'idle' && memoryLastSaveTime)) && (
                              <div className="flex items-center flex-shrink-0 -ml-2">
                                {memorySaveStatus === 'saving' && (
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" title="Saving..."></div>
                                )}
                                {memorySaveStatus === 'saved' && memoryLastSaveTime && (
                                  <i className="fas fa-check text-green-400 cursor-help" title={`Last saved: ${memoryLastSaveTime.toLocaleDateString()} at ${memoryLastSaveTime.toLocaleTimeString()}`}></i>
                                )}
                                {memorySaveStatus === 'error' && (
                                  <i className="fas fa-exclamation-triangle text-red-400" title="Error saving"></i>
                                )}
                                {memorySaveStatus === 'idle' && memoryLastSaveTime && (
                                  <i className="fas fa-check text-gray-500 cursor-help" title={`Last saved: ${memoryLastSaveTime.toLocaleDateString()} at ${memoryLastSaveTime.toLocaleTimeString()}`}></i>
                                )}
                              </div>
                            )}

                            {/* Title Input - shows file name */}
                            <input
                              type="text"
                              value={selectedSourceData.fileName || ''}
                              onChange={(e) => {
                                setSelectedSourceData({ ...selectedSourceData, fileName: e.target.value });
                                setHasTitleChanges(true);
                              }}
                              placeholder="No file name"
                              maxLength={50}
                              className="bg-transparent border-none outline-none text-gray-300 text-sm font-semibold placeholder-gray-600 focus:placeholder-gray-500 transition-colors"
                              style={{ width: '200px' }}
                              data-testid="input-file-source-title"
                            />
                          </div>

                          {/* Right: Change File Button + Mobile Menu */}
                          <div className="flex items-center gap-3">
                            {/* Change File Button */}
                            <button
                              onClick={() => document.getElementById('change-file-input')?.click()}
                              className="px-3 py-1.5 rounded-lg text-xs bg-transparent text-gray-300 border border-gray-800 hover:border-gray-800 transition-all flex items-center gap-2"
                            >
                              <i className="fas fa-sync-alt"></i>
                              Change File
                            </button>
                            <input
                              id="change-file-input"
                              type="file"
                              accept=".pdf,.txt,.docx"
                              className="hidden"
                              onChange={async (e) => {
                                const files = e.target.files;
                                if (files && files.length > 0 && selectedAgentId && selectedSourceId) {
                                  const file = files[0];
                                  if (file.size > 50 * 1024 * 1024) {
                                    toast({
                                      title: "File Too Large",
                                      description: "File must be under 50MB.",
                                      variant: "destructive",
                                    });
                                    e.target.value = '';
                                    return;
                                  }

                                  // Update file using PATCH endpoint with Retell AI sync
                                  setIsUploadingFile(true);
                                  setMemorySaveStatus('saving');
                                  const formData = new FormData();
                                  formData.append('file', file);

                                  try {
                                    const response = await fetch(`/api/knowledge-sources/${selectedSourceId}/file`, {
                                      method: 'PATCH',
                                      body: formData,
                                      credentials: 'include',
                                    });

                                    if (!response.ok) {
                                      const data = await response.json();
                                      throw new Error(data.message || 'Failed to update file');
                                    }

                                    const data = await response.json();
                                    setIsUploadingFile(false);
                                    setMemorySaveStatus('saved');
                                    setMemoryLastSaveTime(new Date());

                                    // Update the selected source data with the new file info
                                    setSelectedSourceData(data);

                                    queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });

                                    toast({
                                      title: "File Changed",
                                      description: "Your file has been updated and synced with Retell AI successfully.",
                                      variant: "default",
                                    });

                                    // Reset status after 2 seconds
                                    setTimeout(() => setMemorySaveStatus('idle'), 2000);
                                  } catch (error: any) {
                                    setIsUploadingFile(false);
                                    setMemorySaveStatus('error');
                                    toast({
                                      title: "Update Failed",
                                      description: error.message || "Failed to update file. Please try again.",
                                      variant: "destructive",
                                    });
                                    // Reset error status after 3 seconds
                                    setTimeout(() => setMemorySaveStatus('idle'), 3000);
                                  }
                                  e.target.value = '';
                                }
                              }}
                            />

                            {/* Mobile Three Dots Menu Button */}
                            <button
                              onClick={() => setMemoryKnowledgeModalOpen(true)}
                              className="lg:hidden text-gray-300 hover:text-white transition-colors"
                              title="View knowledge sources"
                              data-testid="button-file-mobile-menu"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* File Preview Section - Takes up whole area */}
                        <div
                          className="flex-1 pt-4 pb-0 overflow-y-auto"
                          style={{
                            height: '100%'
                          }}
                        >
                          {/* File Preview */}
                          {selectedSourceData?.fileName?.toLowerCase().endsWith('.pdf') ? (
                            /* PDF Preview using object tag for better compatibility */
                            <object
                              data={selectedSourceData.fileUrl}
                              type="application/pdf"
                              className="w-full"
                              style={{ height: '100vh', minHeight: '800px' }}
                            >
                              <div className="flex flex-col items-center justify-center text-center p-8">
                                <i className="fas fa-file-pdf text-6xl text-red-400 mb-4"></i>
                                <p className="text-white font-medium mb-2">{selectedSourceData.fileName}</p>
                                <p className="text-gray-400 text-sm mb-4">
                                  Your browser doesn't support PDF preview
                                </p>
                                <a
                                  href={selectedSourceData.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
                                >
                                  <i className="fas fa-external-link-alt"></i>
                                  Open PDF
                                </a>
                              </div>
                            </object>
                          ) : selectedSourceData?.fileName?.toLowerCase().endsWith('.txt') ? (
                            /* Text File Preview - rendered as native HTML */
                            <div className="font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {selectedSourceData.textContent || 'Loading...'}
                            </div>
                          ) : (
                            /* Other file types (DOCX, etc.) */
                            <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: '500px' }}>
                              <i className="fas fa-file-alt text-6xl text-gray-600 mb-4"></i>
                              <p className="text-white font-medium mb-2">{selectedSourceData?.fileName || 'Unknown File'}</p>
                              <p className="text-gray-400 text-sm mb-4">
                                Preview not available for this file type
                              </p>
                              {selectedSourceData?.fileUrl && (
                                <a
                                  href={selectedSourceData.fileUrl}
                                  download={selectedSourceData.fileName}
                                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
                                >
                                  <i className="fas fa-download"></i>
                                  Download File
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Selected Source Viewing/Editing Mode - Website */}
                    {memoryMode === 'business' && !editingSource && selectedSourceId && selectedSourceData && selectedSourceData.type === 'url' && (
                      <div className="flex-1 relative h-full mr-0 lg:mr-[416px]">
                        {/* Top Bar with Title Input, Metadata and Controls - Fixed position */}
                        <div className={`fixed top-[3.75rem] left-6 lg:left-[16rem] right-6 lg:right-[28rem] z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} flex items-center justify-between px-0 py-3 border-b border-gray-800`} style={{ backgroundColor: '#0D0D0D' }}>
                          {/* Left: Delete Button + Title Input + Metadata */}
                          <div className="flex items-center gap-4 flex-1">
                            {/* Delete Button */}
                            <button
                              onClick={() => setShowDeleteDialog(true)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete"
                            >
                              <i className="fas fa-trash text-sm"></i>
                            </button>

                            {/* Title Input - shows URL without protocol */}
                            <input
                              type="text"
                              value={selectedSourceData.url?.replace(/^https?:\/\//, '') || ''}
                              onChange={(e) => {
                                // Preserve the protocol when updating
                                const protocol = selectedSourceData.url?.match(/^https?:\/\//)?.[0] || 'https://';
                                setSelectedSourceData({ ...selectedSourceData, url: protocol + e.target.value });
                                setHasTitleChanges(true);
                              }}
                              placeholder="No URL entered"
                              maxLength={50}
                              className="bg-transparent border-none outline-none text-gray-300 text-sm font-semibold placeholder-gray-600 focus:placeholder-gray-500 transition-colors"
                              style={{ width: '180px' }}
                              data-testid="input-webpage-source-title"
                            />

                            {/* Metadata */}
                            <div className="text-xs text-gray-400">
                              {selectedSourceData.lastRefreshed && (
                                <span
                                  title={`${(typeof selectedSourceData.lastRefreshed === 'string' ? new Date(selectedSourceData.lastRefreshed) : selectedSourceData.lastRefreshed).toLocaleDateString()} at ${(typeof selectedSourceData.lastRefreshed === 'string' ? new Date(selectedSourceData.lastRefreshed) : selectedSourceData.lastRefreshed).toLocaleTimeString()}`}
                                  className="cursor-help"
                                >
                                  {getRelativeTime(selectedSourceData.lastRefreshed)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: View, Auto-refresh, Cancel and Save Buttons */}
                          <div className="flex items-center gap-3">
                            {/* View Button */}
                            <button
                              onClick={() => {
                                const url = selectedSourceData.url?.trim();
                                if (url) {
                                  const fullUrl = url.startsWith('http://') || url.startsWith('https://')
                                    ? url
                                    : `https://${url}`;
                                  window.open(fullUrl, '_blank');
                                }
                              }}
                              disabled={!selectedSourceData.url}
                              className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                              title="View Website"
                            >
                              <i className="fas fa-external-link-alt text-sm"></i>
                            </button>

                            {/* Cancel Button */}
                            <button
                              onClick={() => {
                                // Reload original source data from the list
                                const originalSource = knowledgeSources?.find((s: any) => s.id === selectedSourceId);
                                if (originalSource) {
                                  setSelectedSourceData(originalSource);
                                }
                                setHasMemoryChanges(false);
                              }}
                              className="px-4 py-1.5 rounded-lg text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all flex items-center gap-2"
                            >
                              <i className="fas fa-times"></i>
                              Cancel
                            </button>

                            {/* Save Button */}
                            <button
                              onClick={handleStickySave}
                              disabled={!selectedSourceData.url || memorySaveStatus === 'saving' || !hasMemoryChanges}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2"
                            >
                              {memorySaveStatus === 'saving' ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-save"></i>
                                  Save
                                </>
                              )}
                            </button>

                            {/* Mobile Three Dots Menu Button */}
                            <button
                              onClick={() => setMemoryKnowledgeModalOpen(true)}
                              className="lg:hidden text-gray-300 hover:text-white transition-colors"
                              title="View knowledge sources"
                              data-testid="button-webpage-mobile-menu"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Webpage URL Interface with https:// prefix */}
                        <div className="flex-1 pt-4 pb-0 overflow-y-auto" style={{ height: '100%' }}>
                          {/* https:// prefix with inline input */}
                          <div className="flex items-start gap-0">
                            <span className="font-mono text-sm text-gray-500 select-none">https://</span>
                            <div
                              key={`url-source-editor-${selectedSourceId}`}
                              ref={textSourceEditableRef}
                              contentEditable
                              suppressContentEditableWarning
                              spellCheck={false}
                              autoCorrect="off"
                              autoComplete="off"
                              autoCapitalize="off"
                              className="font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-300 outline-none flex-1"
                              style={{
                                minHeight: '400px'
                              }}
                              onInput={(e) => {
                                const urlWithoutProtocol = e.currentTarget.textContent || '';
                                const protocol = selectedSourceData.url?.match(/^https?:\/\//)?.[0] || 'https://';
                                setSelectedSourceData({ ...selectedSourceData, url: protocol + urlWithoutProtocol });
                                setHasMemoryChanges(true);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Inline Source Editing Mode */}
                    {memoryMode === 'business' && editingSource && (
                      <>
                        {editingSource === 'file' && (
                          <div className="flex-1 relative h-full mr-0 lg:mr-[416px]">
                            {/* Hidden file input for upload */}
                            <input
                              ref={fileUploadInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                              style={{ display: 'none' }}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !selectedAgentId) return;

                                if (file.size > 50 * 1024 * 1024) {
                                  toast({
                                    title: "File Too Large",
                                    description: "File must be under 50MB.",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                // Upload file directly
                                setIsUploadingFile(true);
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('agentId', selectedAgentId);

                                try {
                                  const response = await fetch('/api/knowledge-sources/upload-file', {
                                    method: 'POST',
                                    body: formData,
                                    credentials: 'include',
                                  });

                                  if (!response.ok) {
                                    const data = await response.json();
                                    throw new Error(data.message || 'Failed to upload file');
                                  }

                                  const data = await response.json();
                                  setIsUploadingFile(false);

                                  setEditingSource(null);
                                  setPendingSourceData({});
                                  if (data.source) {
                                    const sourceData = { ...data.source, type: data.source.type || 'file' };
                                    setSelectedSourceId(sourceData.id);
                                    setSelectedSourceData(sourceData);
                                  }

                                  queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });

                                  toast({
                                    title: "File Uploaded",
                                    description: "Your file has been uploaded to the knowledge base successfully.",
                                    variant: "default",
                                  });
                                } catch (error: any) {
                                  setIsUploadingFile(false);
                                  toast({
                                    title: "Upload Failed",
                                    description: error.message || "Failed to upload file. Please try again.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            />

                            {/* Top Bar with Title Input, Metadata and Controls */}
                            <div className={`fixed top-[3.75rem] left-6 lg:left-[16rem] right-6 lg:right-[28rem] z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} flex items-center justify-between px-0 py-3 border-b border-gray-800`} style={{ backgroundColor: '#0D0D0D' }}>
                              {/* Left: Delete Button + Title Input + Metadata */}
                              <div className="flex items-center gap-4 flex-1">
                                {/* Delete Button */}
                                <button
                                  onClick={() => setShowDeleteDialog(true)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Delete"
                                >
                                  <i className="fas fa-trash text-sm"></i>
                                </button>

                                {/* Title Input - shows file name or placeholder */}
                                <input
                                  type="text"
                                  value={pendingSourceData.fileName || ''}
                                  onChange={(e) => {
                                    setPendingSourceData({ ...pendingSourceData, fileName: e.target.value });
                                    setHasEditingChanges(true);
                                  }}
                                  placeholder="No file selected"
                                  className="bg-transparent border-none outline-none text-gray-300 text-sm font-semibold placeholder-gray-600 focus:placeholder-gray-500 transition-colors"
                                  style={{ width: '200px' }}
                                />

                                {/* Metadata */}
                                <div className="text-xs text-gray-400">
                                  {pendingSourceData.file && (
                                    <span>
                                      Size: {(pendingSourceData.file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  )}
                                </div>
                              </div>

                            </div>

                            {/* File Preview Area - Seamless Parent Page Scrolling */}
                            <div
                              className="pt-16 pb-4 h-full overflow-auto"
                            >
                              {pendingSourceData.file && pendingSourceData.fileName ? (
                                <div className="w-full">
                                  {/* File Viewer Content - Rendered as HTML for seamless scrolling */}
                                  {pendingSourceData.fileName.toLowerCase().endsWith('.pdf') ? (
                                    <div className="w-full bg-gray-900 rounded-lg p-6">
                                      <PDFViewer file={pendingSourceData.file} />
                                    </div>
                                  ) : pendingSourceData.fileName.toLowerCase().endsWith('.txt') ? (
                                    <div className="w-full bg-gray-900 rounded-lg p-6 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                      <TextFileViewer file={pendingSourceData.file} />
                                    </div>
                                  ) : pendingSourceData.fileName.toLowerCase().endsWith('.docx') ? (
                                    <div className="w-full bg-gray-900 rounded-lg p-8 text-center flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
                                      <i className="fas fa-file-word text-6xl text-blue-500 mb-4"></i>
                                      <p className="text-white font-medium mb-2">{pendingSourceData.fileName}</p>
                                      <p className="text-gray-400 text-sm">Word document preview not available</p>
                                      <p className="text-gray-500 text-xs mt-2">
                                        The file will be processed when saved
                                      </p>
                                      <p className="text-gray-500 text-xs mt-1">
                                        Size: {(pendingSourceData.file.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="w-full bg-gray-900 rounded-lg p-8 text-center flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
                                      <i className="fas fa-file text-6xl text-gray-400 mb-4"></i>
                                      <p className="text-white font-medium mb-2">{pendingSourceData.fileName}</p>
                                      <p className="text-gray-400 text-sm">File preview not available</p>
                                      <p className="text-gray-500 text-xs mt-2">
                                        Size: {(pendingSourceData.file.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div
                                  onClick={() => fileUploadInputRef.current?.click()}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '';
                                  }}
                                  onDrop={async (e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = '';
                                    const files = e.dataTransfer.files;
                                    if (files && files.length > 0) {
                                      const file = files[0];
                                      if (file.size > 50 * 1024 * 1024) {
                                        toast({
                                          title: "File Too Large",
                                          description: "File must be under 50MB.",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      // Upload file directly
                                      if (selectedAgentId) {
                                        setIsUploadingFile(true);
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        formData.append('agentId', selectedAgentId);

                                        try {
                                          const response = await fetch('/api/knowledge-sources/upload-file', {
                                            method: 'POST',
                                            body: formData,
                                            credentials: 'include',
                                          });

                                          if (!response.ok) {
                                            const data = await response.json();
                                            throw new Error(data.message || 'Failed to upload file');
                                          }

                                          const data = await response.json();
                                          setIsUploadingFile(false);

                                          // Clear editing state and redirect to the new source (viewing mode)
                                          // This will show the same interface as clicking the entry in the list
                                          setEditingSource(null);
                                          setPendingSourceData({});
                                          if (data.source) {
                                            // Ensure the source has type 'file' for viewing mode to render correctly
                                            const sourceData = { ...data.source, type: data.source.type || 'file' };
                                            setSelectedSourceId(sourceData.id);
                                            setSelectedSourceData(sourceData);
                                          }

                                          // Invalidate queries to update the Business Memory list
                                          queryClient.invalidateQueries({ queryKey: ['/api/knowledge-sources', selectedAgentId] });

                                          toast({
                                            title: "File Uploaded",
                                            description: "Your file has been uploaded to the knowledge base successfully.",
                                            variant: "default",
                                          });
                                        } catch (error: any) {
                                          setIsUploadingFile(false);
                                          toast({
                                            title: "Upload Failed",
                                            description: error.message || "Failed to upload file. Please try again.",
                                            variant: "destructive",
                                          });
                                        }
                                      }
                                    }
                                  }}
                                  className="flex items-center justify-center h-full text-gray-500 w-full max-w-4xl cursor-pointer hover:bg-gray-800/30 transition-colors border-2 border-dashed border-gray-700 hover:border-gray-800 rounded-lg"
                                  style={{ height: '450px' }}
                                >
                                  <div className="text-center">
                                    <i className="fas fa-cloud-upload-alt text-6xl text-gray-600 mb-4"></i>
                                    <p className="text-gray-400 font-medium">Upload or drop file</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {editingSource === 'webpage' && (
                          <div className="flex-1 relative h-full mr-0 lg:mr-[416px]">
                            {/* Top Bar with Title Input, Metadata and Controls */}
                            <div className={`fixed top-[3.75rem] left-6 lg:left-[16rem] right-6 lg:right-[28rem] z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} flex items-center justify-between px-0 py-3 border-b border-gray-800`} style={{ backgroundColor: '#0D0D0D' }}>
                              {/* Left: Delete Button + Title Input + Metadata */}
                              <div className="flex items-center gap-4 flex-1">
                                {/* Delete Button */}
                                <button
                                  onClick={() => {
                                    setEditingSource(null);
                                    setPendingSourceData({});
                                    setHasEditingChanges(false);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Delete"
                                >
                                  <i className="fas fa-trash text-sm"></i>
                                </button>

                                {/* Title Input - shows extracted title from URL */}
                                <input
                                  type="text"
                                  value={pendingSourceData.title || ''}
                                  onChange={(e) => {
                                    setPendingSourceData({ ...pendingSourceData, title: e.target.value });
                                  }}
                                  placeholder="Untitled"
                                  maxLength={50}
                                  className="bg-transparent border-none outline-none text-gray-300 text-sm font-semibold placeholder-gray-600 focus:placeholder-gray-500 transition-colors"
                                  style={{ width: '200px' }}
                                  data-testid="input-webpage-title"
                                />

                                {/* Metadata - Word count */}
                                <div className="text-xs text-gray-400">
                                  {pendingSourceData.url && (
                                    <span>{pendingSourceData.url.split(/\s+/).filter((w: string) => w.length > 0).length} words</span>
                                  )}
                                </div>
                              </div>

                              {/* Right: View and Save Buttons */}
                              <div className="flex items-center gap-3">
                                {/* View Button */}
                                <button
                                  onClick={() => {
                                    const url = pendingSourceData.url?.trim();
                                    if (url) {
                                      const fullUrl = url.startsWith('http://') || url.startsWith('https://')
                                        ? url
                                        : `https://${url}`;
                                      window.open(fullUrl, '_blank');
                                    }
                                  }}
                                  disabled={!pendingSourceData.url}
                                  className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                  title="View Website"
                                >
                                  <i className="fas fa-external-link-alt text-sm"></i>
                                </button>

                                {/* Save Button - Matches Prompt tab style */}
                                <button
                                  onClick={handleStickySave}
                                  disabled={!pendingSourceData.url || isScrapingUrl || !hasEditingChanges}
                                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2"
                                >
                                  {isScrapingUrl ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-save"></i>
                                      Save
                                    </>
                                  )}
                                </button>

                                {/* Mobile Three Dots Menu Button */}
                                <button
                                  onClick={() => setMemoryKnowledgeModalOpen(true)}
                                  className="lg:hidden text-gray-300 hover:text-white transition-colors"
                                  title="View knowledge sources"
                                  data-testid="button-webpage-add-mobile-menu"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {/* Webpage URL Interface with https:// prefix */}
                            <div className="pt-16 pb-4 h-full overflow-auto">
                              {/* https:// prefix with inline input */}
                              <div className="flex items-start gap-0">
                                <span className="font-mono text-sm text-gray-500 select-none">https://</span>
                                <div
                                  key={`add-webpage-editor-${selectedAgentId}`}
                                  ref={addTextEditableRef}
                                  contentEditable
                                  suppressContentEditableWarning
                                  spellCheck={false}
                                  autoCorrect="off"
                                  autoComplete="off"
                                  autoCapitalize="off"
                                  className="font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-300 outline-none flex-1"
                                  style={{
                                    minHeight: '400px'
                                  }}
                                  onInput={(e) => {
                                    const newUrl = e.currentTarget.textContent || '';

                                    // Auto-extract title from URL (domain + first path segment)
                                    if (newUrl && !pendingSourceData.title) {
                                      try {
                                        const urlParts = newUrl.split('/');
                                        const domain = urlParts[0] || '';
                                        const firstPath = urlParts[1] || '';
                                        const autoTitle = firstPath ? `${domain}/${firstPath}` : domain;
                                        setPendingSourceData({ ...pendingSourceData, url: newUrl, title: autoTitle });
                                      } catch {
                                        setPendingSourceData({ ...pendingSourceData, url: newUrl });
                                      }
                                    } else {
                                      setPendingSourceData({ ...pendingSourceData, url: newUrl });
                                    }
                                    setHasEditingChanges(true);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {editingSource === 'text' && (
                          <div className="flex-1 relative h-full mr-0 lg:mr-[416px]">
                            {/* Top Bar with Delete, Title, Metadata and Controls */}
                            <div className={`fixed top-[3.75rem] left-6 lg:left-[16rem] right-6 lg:right-[28rem] z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} flex items-center justify-between px-0 py-3 border-b border-gray-800`} style={{ backgroundColor: '#0D0D0D' }}>
                              {/* Left: Delete Button + Title Input + Metadata + Status */}
                              <div className="flex items-center gap-4 flex-1">
                                {/* Delete Button */}
                                <button
                                  onClick={() => setShowDeleteDialog(true)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Delete"
                                >
                                  <i className="fas fa-trash text-sm"></i>
                                </button>

                                {/* Save Status Icon - appears LEFT of title, only takes space when visible */}
                                {(memorySaveStatus === 'saving' ||
                                  (memorySaveStatus === 'saved' && memoryLastSaveTime) ||
                                  memorySaveStatus === 'error' ||
                                  (memorySaveStatus === 'idle' && memoryLastSaveTime)) && (
                                  <div className="flex items-center flex-shrink-0 -ml-2">
                                    {memorySaveStatus === 'saving' && (
                                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" title="Saving..."></div>
                                    )}
                                    {memorySaveStatus === 'saved' && memoryLastSaveTime && (
                                      <i className="fas fa-check text-green-400 cursor-help" title={`Last saved: ${memoryLastSaveTime.toLocaleDateString()} at ${memoryLastSaveTime.toLocaleTimeString()}`}></i>
                                    )}
                                    {memorySaveStatus === 'error' && (
                                      <i className="fas fa-exclamation-triangle text-red-400" title="Error saving"></i>
                                    )}
                                    {memorySaveStatus === 'idle' && memoryLastSaveTime && (
                                      <i className="fas fa-check text-gray-500 cursor-help" title={`Last saved: ${memoryLastSaveTime.toLocaleDateString()} at ${memoryLastSaveTime.toLocaleTimeString()}`}></i>
                                    )}
                                  </div>
                                )}

                                {/* Title Input */}
                                <input
                                  type="text"
                                  value={pendingSourceData.title || ''}
                                  onChange={(e) => {
                                    setPendingSourceData({ ...pendingSourceData, title: e.target.value });
                                    setHasEditingChanges(true);
                                  }}
                                  placeholder="Untitled"
                                  maxLength={50}
                                  className="bg-transparent border-none outline-none text-gray-300 text-sm font-semibold placeholder-gray-600 focus:placeholder-gray-500 transition-colors"
                                  style={{ width: '200px' }}
                                />
                              </div>

                              {/* Right: Undo/Redo */}
                              <div className="flex items-center gap-3">
                                {/* Undo Button */}
                                <button
                                  onClick={handleMemoryUndo}
                                  disabled={memoryHistoryIndex <= 0}
                                  className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                  title="Undo (Ctrl+Z)"
                                  data-testid="button-undo-memory"
                                >
                                  <i className="fas fa-undo text-sm"></i>
                                </button>

                                {/* Redo Button */}
                                <button
                                  onClick={handleMemoryRedo}
                                  disabled={memoryHistoryIndex >= memoryHistory.length - 1}
                                  className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                  title="Redo (Ctrl+Y)"
                                  data-testid="button-redo-memory"
                                >
                                  <i className="fas fa-redo text-sm"></i>
                                </button>

                                {/* Mobile Three Dots Menu Button */}
                                <button
                                  onClick={() => setMemoryKnowledgeModalOpen(true)}
                                  className="lg:hidden text-gray-300 hover:text-white transition-colors ml-3"
                                  title="View knowledge sources"
                                  data-testid="button-memory-mobile-menu"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {/* Text Input Interface - Same as Business Information */}
                            <div
                              key={`add-text-editor-${selectedAgentId}`}
                              ref={addTextEditableRef}
                              contentEditable
                              suppressContentEditableWarning
                              spellCheck={false}
                              autoCorrect="off"
                              autoComplete="off"
                              autoCapitalize="off"
                              className="h-full pt-16 font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-300 outline-none overflow-auto"
                              onInput={(e) => {
                                const newContent = e.currentTarget.textContent || '';
                                setPendingSourceData({ ...pendingSourceData, textContent: newContent });
                                setHasEditingChanges(true);

                                // Track history for undo/redo
                                if (memoryHistory.length === 0 || memoryHistory[memoryHistory.length - 1] !== newContent) {
                                  const newHistory = memoryHistory.slice(0, memoryHistoryIndex + 1);
                                  newHistory.push(newContent);
                                  // Limit history to last 50 states
                                  if (newHistory.length > 50) {
                                    newHistory.shift();
                                  }
                                  setMemoryHistory(newHistory);
                                  setMemoryHistoryIndex(newHistory.length - 1);
                                }
                              }}
                              data-placeholder="Enter your text content here..."
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Customer Memory Mode */}
                    {memoryMode === 'customer' && (
                      <>
                        {isEditingCustomerMemory ? (
                          <>
                            {/* Top Bar with Delete, Title, Metadata, and Save Status */}
                            <div className={`sticky-tab-header z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} flex items-center justify-between px-6 lg:px-8 py-3 border-b border-gray-800 mr-0 lg:mr-[416px]`}>
                              {/* Left: Delete Button + Title */}
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {selectedCustomerMemoryId && (
                                  <button
                                    onClick={async () => {
                                      if (!selectedCustomerMemoryId) return;
                                      if (!window.confirm('Are you sure you want to delete this customer memory?')) return;
                                      
                                      try {
                                        await apiRequest(`/api/customer-memories/${selectedCustomerMemoryId}`, {
                                          method: 'DELETE',
                                        });
                                        
                                        // Invalidate query and close editor
                                        queryClient.invalidateQueries({ queryKey: ['/api/customer-memories', selectedAgentId] });
                                        setIsEditingCustomerMemory(false);
                                        setSelectedCustomerMemoryId(null);
                                        setSelectedCustomerMemoryData(null);
                                        setCustomerMemoryText('');
                                        setCustomerMemoryTitle('');
                                        
                                        toast({
                                          title: "Deleted",
                                          description: "Customer memory deleted successfully",
                                        });
                                      } catch (error: any) {
                                        toast({
                                          title: "Error",
                                          description: error.message || "Failed to delete customer memory",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="text-gray-400 hover:text-red-400 transition-colors p-1"
                                    title="Delete customer memory"
                                    data-testid="button-delete-customer-memory"
                                  >
                                    <i className="fas fa-trash text-sm"></i>
                                  </button>
                                )}
                                
                                <input
                                  type="text"
                                  value={customerMemoryTitle}
                                  onChange={(e) => {
                                    const newTitle = e.target.value;
                                    setCustomerMemoryTitle(newTitle);
                                    
                                    // Auto-save title with debounce (dedicated ref to avoid cancelling content saves)
                                    if (selectedCustomerMemoryId) {
                                      if (customerTitleSaveTimeoutRef.current) {
                                        clearTimeout(customerTitleSaveTimeoutRef.current);
                                      }

                                      customerTitleSaveTimeoutRef.current = setTimeout(async () => {
                                        setIsCustomerMemorySaving(true);
                                        try {
                                          await apiRequest(`/api/customer-memories/${selectedCustomerMemoryId}`, {
                                            method: 'PATCH',
                                            body: JSON.stringify({ title: newTitle }),
                                            headers: { 'Content-Type': 'application/json' },
                                          });
                                          queryClient.invalidateQueries({ queryKey: ['/api/customer-memories', selectedAgentId] });
                                        } catch (error: any) {
                                          console.error('Failed to save title:', error);
                                          toast({
                                            title: "Couldn't save title",
                                            description: error?.message || "Please try again.",
                                            variant: "destructive",
                                          });
                                        } finally {
                                          setIsCustomerMemorySaving(false);
                                        }
                                      }, 1500);
                                    }
                                  }}
                                  placeholder={selectedCustomerMemoryData?.customerProfile?.name || selectedCustomerMemoryData?.customerProfile?.phoneNumber || "Customer Memory"}
                                  className="bg-transparent text-sm text-white font-medium outline-none border-none placeholder:text-gray-500 flex-1 min-w-0"
                                  data-testid="input-customer-memory-title"
                                />
                              </div>

                              {/* Right: Metadata + Save Status */}
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                {selectedCustomerMemoryData?.updatedAt && (
                                  <span>{getRelativeTime(selectedCustomerMemoryData.updatedAt)}</span>
                                )}
                                <span>•</span>
                                <span>{customerMemoryText.split(/\s+/).filter(w => w.length > 0).length} words</span>
                                <div className="w-px h-4 bg-gray-600"></div>
                                {isCustomerMemorySaving && (
                                  <span className="text-gray-500 italic flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                                    Saving…
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Customer Memory Contenteditable Text Area - Same style as Business Memory */}
                            <div
                              key={`customer-memory-editor-${selectedCustomerMemoryId || 'new'}`}
                              ref={customerMemoryEditableRef}
                              contentEditable
                              suppressContentEditableWarning
                              spellCheck={false}
                              autoCorrect="off"
                              autoComplete="off"
                              autoCapitalize="off"
                              className="font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-300 outline-none py-4 pl-6 lg:pl-8 mr-0 lg:mr-[416px]"
                              style={{
                                minHeight: '500px'
                              }}
                              onInput={(e) => {
                                // Use innerText to preserve line breaks
                                const newContent = e.currentTarget.innerText || '';
                                setCustomerMemoryText(newContent);
                                
                                // Auto-save content with debounce (dedicated ref so it never cancels title saves)
                                if (selectedCustomerMemoryId) {
                                  if (customerContentSaveTimeoutRef.current) {
                                    clearTimeout(customerContentSaveTimeoutRef.current);
                                  }

                                  customerContentSaveTimeoutRef.current = setTimeout(async () => {
                                    setIsCustomerMemorySaving(true);
                                    try {
                                      await apiRequest(`/api/customer-memories/${selectedCustomerMemoryId}`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({ content: newContent }),
                                        headers: { 'Content-Type': 'application/json' },
                                      });
                                      queryClient.invalidateQueries({ queryKey: ['/api/customer-memories', selectedAgentId] });
                                    } catch (error: any) {
                                      console.error('Failed to save content:', error);
                                      toast({
                                        title: "Couldn't save changes",
                                        description: error?.message || "Please try again.",
                                        variant: "destructive",
                                      });
                                    } finally {
                                      setIsCustomerMemorySaving(false);
                                    }
                                  }, 1500);
                                }
                              }}
                              data-testid="contenteditable-customer-memory"
                              data-placeholder="Enter customer memory text here..."
                            />
                          </>
                        ) : (
                          <div className="px-6 lg:px-8 py-4 mr-0 lg:mr-[416px]">
                            {isLoadingCustomerMemories ? (
                              <div className="flex flex-col items-center gap-3 text-gray-500 mt-16">
                                <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                                <p className="text-sm">Loading customer memories…</p>
                              </div>
                            ) : (customerMemoriesData as any)?.memories?.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs text-gray-500 mb-3">
                                  {(customerMemoriesData as any).memories.length} customer{(customerMemoriesData as any).memories.length !== 1 ? 's' : ''} with saved memory
                                </p>
                                {((customerMemoriesData as any).memories as any[]).map((mem: any) => {
                                  const cName = mem.customerProfile?.name || mem.title || 'Unknown';
                                  const cPhone = mem.customerProfile?.phoneNumber || '';
                                  const nameParts = cName.trim().split(/\s+/);
                                  const initials = nameParts.length >= 2
                                    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
                                    : cName.substring(0, 2).toUpperCase();
                                  let parsedContent: any = {};
                                  try { parsedContent = JSON.parse(mem.content || '{}'); } catch {}
                                  return (
                                    <div
                                      key={mem.id}
                                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/60 cursor-pointer transition-colors border border-gray-800 hover:border-gray-700"
                                      onClick={() => {
                                        setSelectedCustomerMemoryId(mem.id);
                                        setSelectedCustomerMemoryData(mem);
                                        setCustomerMemoryText(mem.content || '');
                                        setIsEditingCustomerMemory(true);
                                      }}
                                    >
                                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                                        {initials}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{cName}</p>
                                        {cPhone && <p className="text-xs text-gray-500">{cPhone}</p>}
                                        {parsedContent.preferred_service && (
                                          <p className="text-xs text-gray-400 truncate mt-0.5">
                                            Usual: {parsedContent.preferred_service}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-600 flex-shrink-0">
                                        {mem.updatedAt ? getRelativeTime(mem.updatedAt) : ''}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center" style={{ minHeight: '500px' }}>
                                <div className="text-center">
                                  <i className="fas fa-users h-12 w-12 mx-auto mb-4 text-gray-400" style={{ fontSize: '3rem' }}></i>
                                  <h3 className="text-lg font-semibold text-white mb-2">No Customer Memory Yet</h3>
                                  <p className="text-gray-400">
                                    Customer memory is built automatically from calls once the AI receptionist is active.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Right: Business Information Panel (Fixed to right edge) - Desktop only */}
                    <div className="hidden lg:block fixed top-[6.9375rem] right-0 w-96 space-y-5 h-fit pr-6 lg:pr-8" style={{ maxHeight: 'calc(100vh - 6rem)', overflowY: 'auto' }}>
                      {/* Cardless Knowledge Sources Section */}
                      <div className="space-y-5">
                        {/* Business Memory Section */}
                        <div className="space-y-2">
                          <div className="sticky top-0 z-10 py-3 flex items-center justify-between pl-3" style={{ backgroundColor: '#0D0D0D' }}>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-300 text-sm font-semibold">Business</span>
                            </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                                    title="Add knowledge source"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 premium-card text-white">
                                  <DropdownMenuItem
                                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                    onClick={async () => {
                                      await ensureKnowledgeBaseConnected();
                                      setEditingSource('file');
                                      setPendingSourceData({});
                                      setHasEditingChanges(false);
                                    }}
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Files
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                    onClick={async () => {
                                      await ensureKnowledgeBaseConnected();
                                      setEditingSource('webpage');
                                      setPendingSourceData({ autoRefresh: false });
                                      setHasEditingChanges(false);
                                    }}
                                  >
                                    <Globe className="w-4 h-4 mr-2" />
                                    Add Webpage
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                    onClick={async () => {
                                      await ensureKnowledgeBaseConnected();
                                      // Clear any current selections
                                      setSelectedSourceId(null);
                                      setSelectedSourceData(null);

                                      // Set editing mode to text
                                      setEditingSource('text');
                                      setPendingSourceData({});
                                      setHasEditingChanges(false);
                                    }}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Add Text
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                          {isLoadingKnowledgeSources ? (
                            <div className="text-gray-500 text-xs italic flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div> Loading sources...
                            </div>
                          ) : (businessInfoText && businessInfoText.trim()) || (knowledgeSources && knowledgeSources.length > 0) || editingSource ? (
                              <div className="divide-y divide-gray-800">
                                {/* Business Info Text as first source */}
                                {businessInfoText && businessInfoText.trim() && (
                                  <div
                                    className={`p-3 text-sm transition-colors cursor-pointer ${
                                      selectedSourceId === null && !editingSource
                                        ? 'bg-gray-800 text-white'
                                        : 'hover:bg-gray-800/50'
                                    }`}
                                    onClick={() => {
                                      setSelectedSourceId(null);
                                      setSelectedSourceData(null);
                                      setEditingSource(null);
                                      setViewingScrapedData(false);
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        {/* Type icon */}
                                        <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center transition-all flex-shrink-0">
                                          <i className="fas fa-file-text text-xl text-purple-400"></i>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <span className={`font-medium ${selectedSourceId === null && !editingSource ? 'text-white' : 'text-gray-300'}`}>Business Information</span>
                                        </div>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-36 premium-card text-white">
                                          <DropdownMenuItem
                                            className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-red-400 hover:text-red-300"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedSourceId(null);
                                              setSelectedSourceData(null);
                                              setShowDeleteDialog(true);
                                            }}
                                          >
                                            <i className="fas fa-trash text-xs mr-2"></i>
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                )}

                                {/* Other sources from API */}
                                {knowledgeSources && knowledgeSources.map((source: any, index: number) => (
                                  <div
                                    key={index}
                                    className={`p-3 text-sm transition-colors cursor-pointer ${
                                      selectedSourceId === source.id
                                        ? 'bg-gray-800 text-white'
                                        : 'hover:bg-gray-800/50'
                                    }`}
                                    onClick={() => {
                                      setSelectedSourceId(source.id);
                                      setSelectedSourceData(source);
                                      setEditingSource(null);
                                      setViewingScrapedData(false);
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        {/* Type icon */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                                          source.type === 'file' ? 'bg-blue-600/20' :
                                          source.type === 'text' ? 'bg-purple-600/20' :
                                          'bg-green-600/20'
                                        }`}>
                                          <i className={`fas ${
                                            source.type === 'file' ? 'fa-file-alt' :
                                            source.type === 'text' ? 'fa-file-text' :
                                            'fa-globe'
                                          } text-xl ${
                                            source.type === 'file' ? 'text-blue-400' :
                                            source.type === 'text' ? 'text-purple-400' :
                                            'text-green-400'
                                          }`}></i>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className={`font-medium truncate ${
                                            selectedSourceId === source.id ? 'text-white' : 'text-gray-300'
                                          }`}>
                                            {/* Use selectedSourceData for real-time title updates when this source is selected */}
                                            {selectedSourceId === source.id && selectedSourceData ? (
                                              selectedSourceData.type === 'file' ? selectedSourceData.fileName :
                                              selectedSourceData.type === 'text' ? (selectedSourceData.title || 'Text Content') :
                                              selectedSourceData.url?.replace(/^https?:\/\//, '')
                                            ) : (
                                              source.type === 'file' ? source.fileName :
                                              source.type === 'text' ? (source.title || 'Text Content') :
                                              source.url?.replace(/^https?:\/\//, '')
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {source.type === 'url' && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const url = source.url?.trim();
                                              if (url) {
                                                const fullUrl = url.startsWith('http://') || url.startsWith('https://')
                                                  ? url
                                                  : `https://${url}`;
                                                window.open(fullUrl, '_blank');
                                              }
                                            }}
                                            className="text-gray-400 hover:text-white transition-colors p-1"
                                            title="Open URL"
                                          >
                                            <i className="fas fa-external-link-alt text-xs"></i>
                                          </button>
                                        )}
                                        {source.autoRefresh && (
                                          <span className="text-green-400 text-xs flex-shrink-0 px-1">
                                            <i className="fas fa-sync-alt"></i>
                                          </span>
                                        )}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              onClick={(e) => e.stopPropagation()}
                                              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded"
                                            >
                                              <MoreVertical className="w-4 h-4" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-36 premium-card text-white">
                                            <DropdownMenuItem
                                              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-red-400 hover:text-red-300"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSourceId(source.id);
                                                setSelectedSourceData(source);
                                                setEditingSource(null);
                                                setShowDeleteDialog(true);
                                              }}
                                            >
                                              <i className="fas fa-trash text-xs mr-2"></i>
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* Temporary editing row */}
                                {editingSource && (
                                  <div className="bg-gray-800/50 p-3 text-sm border-l-2 border-blue-500 animate-pulse">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        {editingSource === 'file' && <Upload className="w-4 h-4 text-blue-400" />}
                                        {editingSource === 'webpage' && <Globe className="w-4 h-4 text-blue-400" />}
                                        {editingSource === 'text' && <FileText className="w-4 h-4 text-blue-400" />}
                                        <span className="text-gray-300 font-medium italic">
                                          {editingSource === 'file' && (pendingSourceData.fileName || 'New File...')}
                                          {editingSource === 'webpage' && (pendingSourceData.url?.replace(/^https?:\/\//, '') || 'New Webpage...')}
                                          {editingSource === 'text' && 'New Text...'}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-gray-500 text-xs italic">
                                      {editingSource === 'file' && 'Select a file to upload'}
                                      {editingSource === 'webpage' && 'Enter a URL to scrape'}
                                      {editingSource === 'text' && 'Enter text content'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-500 text-xs italic">
                                No sources yet
                              </div>
                            )}
                        </div>

                        {/* Contacts Section */}
                        <div className="space-y-2">
                          <div className="sticky top-0 z-10 py-3 pl-3" style={{ backgroundColor: '#0D0D0D' }}>
                            <span className="text-gray-300 text-sm font-semibold">Contacts</span>
                          </div>
                          {isLoadingCalls ? (
                            <div className="text-gray-500 text-xs italic flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div> Loading contacts...
                            </div>
                          ) : contactsFromCallHistory && contactsFromCallHistory.length > 0 ? (
                              <div className="divide-y divide-gray-800">
                                {contactsFromCallHistory.map((contact: any) => {
                                  // Get customer initials from name or phone
                                  const getCustomerInitials = (name?: string, phone?: string) => {
                                    if (name) {
                                      const nameParts = name.trim().split(/\s+/);
                                      if (nameParts.length >= 2) {
                                        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
                                      }
                                      return name.substring(0, 2).toUpperCase();
                                    }
                                    if (phone) {
                                      const digits = phone.replace(/\D/g, '');
                                      return digits.substring(digits.length - 2);
                                    }
                                    return '??';
                                  };

                                  const customerName = contact.customerName || 'Unknown';
                                  const initials = getCustomerInitials(contact.customerName, contact.phoneNumber);

                                  return (
                                    <div
                                      key={contact.id}
                                      className="p-3 text-sm transition-colors cursor-pointer hover:bg-gray-800/50"
                                      onClick={() => {
                                        // Navigate to Contacts tab
                                        setActiveTab('contacts');
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          {/* Customer initials icon */}
                                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                                            {initials}
                                          </div>

                                          <div className="flex-1 min-w-0">
                                            <span className="font-medium truncate block text-gray-300">
                                              {customerName}
                                            </span>
                                            <p className="text-xs mt-1 text-gray-500">
                                              {contact.totalCalls} call{contact.totalCalls !== 1 ? 's' : ''}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-gray-500 text-xs italic">
                                No contacts yet
                              </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Bulk Actions Bar - Only show when sources selected AND not in inline editing mode AND not viewing individual source */}
                    {(() => {
                      const shouldShow = memoryMode === 'business' && selectedSourceIds.size > 0 && !editingSource && !selectedSourceId;
                      return shouldShow && (
                        <div className="fixed bottom-4 left-4 right-4 lg:left-60 z-50">
                          <div className="max-w-4xl mx-auto premium-card rounded-2xl p-4 sm:p-6 shadow-2xl">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {selectedSourceIds.size}
                              </div>
                              <span className="text-white text-sm">
                                {selectedSourceIds.size} source{selectedSourceIds.size > 1 ? 's' : ''} selected
                              </span>
                            </div>

                            {/* Show normal bulk action buttons when not editing */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                              {/* Delete */}
                              <button
                                onClick={() => setShowDeleteDialog(true)}
                                className="border border-gray-800 text-red-400 hover:bg-red-900/30 hover:border-red-600 px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-trash"></i>
                                Delete
                              </button>

                              {/* Export Data */}
                              <button
                                onClick={handleExportSources}
                                className="border border-gray-800 text-gray-300 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-download"></i>
                                Export Data
                              </button>

                              {/* Sync/Refresh - Only show if at least one URL source is selected */}
                              {(() => {
                                const selectedSources = knowledgeSources?.filter((s: any) => selectedSourceIds.has(s.id)) || [];
                                const hasUrlSource = selectedSources.some((s: any) => s.type === 'url');
                                return hasUrlSource && (
                                  <button
                                    onClick={handleSyncRefreshSources}
                                    className="border border-gray-800 text-blue-400 hover:bg-blue-900/30 hover:border-blue-600 px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                                  >
                                    <i className="fas fa-sync-alt"></i>
                                    Sync/Refresh
                                  </button>
                                );
                              })()}

                              {/* View Activity/Logs - Only show when exactly 1 item selected */}
                              {selectedSourceIds.size === 1 && (
                                <button
                                  onClick={handleViewActivity}
                                  className="border border-gray-800 text-gray-300 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                                >
                                  <i className="fas fa-history"></i>
                                  View Activity/Logs
                                </button>
                              )}

                              {/* View External Link - Only show when exactly 1 URL source selected */}
                              {selectedSourceIds.size === 1 && (() => {
                                const selectedSources = knowledgeSources?.filter((s: any) => selectedSourceIds.has(s.id)) || [];
                                const urlSource = selectedSources.find((s: any) => s.type === 'url');
                                return urlSource && (
                                  <button
                                    onClick={() => {
                                      window.open(urlSource.url, '_blank');
                                    }}
                                    className="border border-gray-800 text-gray-300 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                                  >
                                    <i className="fas fa-external-link-alt"></i>
                                    View Link
                                  </button>
                                );
                              })()}

                              {/* Clear Selection */}
                              <button
                                onClick={handleClearSelection}
                                className="border border-gray-800 text-gray-300 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-times"></i>
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })()}

                  </>
                ) : null}

                {/* Mobile Knowledge Sources Modal */}
                <Dialog open={memoryKnowledgeModalOpen} onOpenChange={setMemoryKnowledgeModalOpen}>
                  <DialogContent className="premium-card text-white max-w-full h-full m-0 p-6 overflow-y-auto">
                    <div className="space-y-4">
                      {/* Business Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm font-semibold">Business</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                                  title="Add knowledge source"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 premium-card text-white">
                                <DropdownMenuItem
                                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                  onClick={() => {
                                    setEditingSource('file');
                                    setPendingSourceData({});
                                    setHasEditingChanges(false);
                                    setMemoryKnowledgeModalOpen(false);
                                  }}
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload Files
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                  onClick={() => {
                                    setEditingSource('webpage');
                                    setPendingSourceData({ autoRefresh: false });
                                    setHasEditingChanges(false);
                                    setMemoryKnowledgeModalOpen(false);
                                  }}
                                >
                                  <Globe className="w-4 h-4 mr-2" />
                                  Add Webpage
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                  onClick={() => {
                                    setSelectedSourceId(null);
                                    setSelectedSourceData(null);
                                    setEditingSource('text');
                                    setPendingSourceData({});
                                    setHasEditingChanges(false);
                                    setMemoryKnowledgeModalOpen(false);
                                  }}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Add Text
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {isLoadingKnowledgeSources ? (
                          <div className="text-gray-500 text-xs italic flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div> Loading sources...
                          </div>
                        ) : (businessInfoText && businessInfoText.trim()) || (knowledgeSources && knowledgeSources.length > 0) ? (
                            <div className="divide-y divide-gray-800">
                              {businessInfoText && businessInfoText.trim() && (
                                <div
                                  className="p-3 text-sm hover:bg-gray-800/50 transition-colors cursor-pointer"
                                  onClick={() => {
                                    setSelectedSourceId(null);
                                    setSelectedSourceData(null);
                                    setEditingSource(null);
                                    setMemoryKnowledgeModalOpen(false);
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                                      <i className="fas fa-file-text text-xl text-purple-400"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium text-gray-300 block">Business Information</span>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {selectedAgent?.updatedAt ? getRelativeTime(selectedAgent.updatedAt) : 'Never updated'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {knowledgeSources && knowledgeSources.map((source: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-3 text-sm hover:bg-gray-800/50 transition-colors cursor-pointer"
                                  onClick={() => {
                                    setSelectedSourceId(source.id);
                                    setSelectedSourceData(source);
                                    setEditingSource(null);
                                    setMemoryKnowledgeModalOpen(false);
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      source.type === 'file' ? 'bg-blue-600/20' :
                                      source.type === 'text' ? 'bg-purple-600/20' :
                                      'bg-green-600/20'
                                    }`}>
                                      <i className={`fas ${
                                        source.type === 'file' ? 'fa-file-alt' :
                                        source.type === 'text' ? 'fa-file-text' :
                                        'fa-globe'
                                      } text-xl ${
                                        source.type === 'file' ? 'text-blue-400' :
                                        source.type === 'text' ? 'text-purple-400' :
                                        'text-green-400'
                                      }`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-300 truncate">
                                        {source.type === 'file' ? source.fileName :
                                         source.type === 'text' ? (source.title || 'Text Content') :
                                         source.url?.replace(/^https?:\/\//, '')}
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {source.updatedAt || source.lastRefreshed || source.createdAt ?
                                          getRelativeTime(source.updatedAt || source.lastRefreshed || source.createdAt) :
                                          'Never updated'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-xs italic">No knowledge sources yet</div>
                          )
                        }
                      </div>

                      {/* Contacts Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm font-semibold">Contacts</span>
                        </div>
                        {isLoadingCalls ? (
                          <div className="text-gray-500 text-xs italic flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div> Loading contacts...
                          </div>
                        ) : contactsFromCallHistory && contactsFromCallHistory.length > 0 ? (
                            <div className="divide-y divide-gray-800">
                              {contactsFromCallHistory.map((contact: any) => {
                                // Get customer initials from name or phone
                                const getCustomerInitials = (name?: string, phone?: string) => {
                                  if (name) {
                                    const nameParts = name.trim().split(/\s+/);
                                    if (nameParts.length >= 2) {
                                      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
                                    }
                                    return name.substring(0, 2).toUpperCase();
                                  }
                                  if (phone) {
                                    const digits = phone.replace(/\D/g, '');
                                    return digits.substring(digits.length - 2);
                                  }
                                  return '??';
                                };

                                const customerName = contact.customerName || 'Unknown';
                                const initials = getCustomerInitials(contact.customerName, contact.phoneNumber);

                                return (
                                  <div
                                    key={contact.id}
                                    className="p-3 text-sm hover:bg-gray-800/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                      setMemoryKnowledgeModalOpen(false);
                                      setMemoryMode('customer');
                                      // Find and select this contact's customer memory
                                      const allMemories: any[] = (customerMemoriesData as any)?.memories || [];
                                      const match = allMemories.find(
                                        (m: any) => m.customerProfile?.phoneNumber === contact.phoneNumber
                                      );
                                      if (match) {
                                        setSelectedCustomerMemoryId(match.id);
                                        setSelectedCustomerMemoryData(match);
                                        setCustomerMemoryText(match.content || '');
                                        setIsEditingCustomerMemory(true);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                                        {initials}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="font-medium text-gray-300 block truncate">
                                          {customerName}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {contact.totalCalls} call{contact.totalCalls !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-xs italic">
                              No contacts yet
                            </div>
                          )
                        }
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>
          )}

          {/* Agent Tab */}
          {hasPermission('settings') && (
            <TabsContent value="agent" className="h-full overflow-hidden mt-14 px-6 lg:px-8">
              <div className="h-full">
                {agentGeneralPrompt !== null ? (
                  <div className="flex gap-8 h-full mr-0 lg:mr-[416px]">
                    {/* Left Side: Top Bar + Editor */}
                    <div className="flex-1 relative h-full">
                      {/* Top Bar with Metadata and Controls - Fixed position */}
                      <div className={`fixed top-[3.75rem] left-6 lg:left-[16rem] right-6 lg:right-[28rem] z-[50] navbar-blur transition-all duration-300 ${isScrolled ? 'scrolled' : ''} flex items-center justify-between px-0 py-3 border-b border-gray-800`} style={{ backgroundColor: '#0D0D0D' }}>
                        {/* Left: Save Status Icon + Title Input */}
                        <div className="flex items-center gap-3 flex-1">
                          {/* Save Status Icon - appears LEFT of title, only takes space when visible */}
                          {(agentSaveStatus === 'saving' ||
                            (agentSaveStatus === 'saved' && agentLastSaveTime) ||
                            agentSaveStatus === 'error' ||
                            (agentSaveStatus === 'idle' && agentLastSaveTime)) && (
                            <div className="flex items-center flex-shrink-0">
                              {agentSaveStatus === 'saving' && (
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" title="Saving..."></div>
                              )}
                              {agentSaveStatus === 'saved' && agentLastSaveTime && (
                                <i className="fas fa-check text-green-400 cursor-help" title={`Last saved: ${agentLastSaveTime.toLocaleDateString()} at ${agentLastSaveTime.toLocaleTimeString()}`}></i>
                              )}
                              {agentSaveStatus === 'error' && (
                                <i className="fas fa-exclamation-triangle text-red-400" title="Error saving"></i>
                              )}
                              {agentSaveStatus === 'idle' && agentLastSaveTime && (
                                <i className="fas fa-check text-gray-500 cursor-help" title={`Last saved: ${agentLastSaveTime.toLocaleDateString()} at ${agentLastSaveTime.toLocaleTimeString()}`}></i>
                              )}
                            </div>
                          )}

                          {/* Title Input */}
                          <input
                            type="text"
                            value={agentTitle}
                            onChange={(e) => {
                              setAgentTitle(e.target.value);
                              setHasAgentTitleChanges(true);
                            }}
                            placeholder="Untitled Prompt"
                            maxLength={20}
                            className="bg-transparent border-none outline-none text-gray-300 text-sm font-semibold placeholder-gray-600 focus:placeholder-gray-500 transition-colors"
                            style={{ width: '300px' }}
                            data-testid="input-agent-title"
                          />
                        </div>

                        {/* Right: Undo/Redo */}
                        <div className="flex items-center gap-3">
                          {/* Undo Button */}
                          <button
                            onClick={handleAgentUndo}
                            disabled={agentHistoryIndex <= 0}
                            className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                            title="Undo (Ctrl+Z)"
                            data-testid="button-undo-agent"
                          >
                            <i className="fas fa-undo text-sm"></i>
                          </button>

                          {/* Redo Button */}
                          <button
                            onClick={handleAgentRedo}
                            disabled={agentHistoryIndex >= agentHistory.length - 1}
                            className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                            title="Redo (Ctrl+Y)"
                            data-testid="button-redo-agent"
                          >
                            <i className="fas fa-redo text-sm"></i>
                          </button>

                          {/* Mobile Three Dots Menu Button */}
                          <button
                            onClick={() => setAgentFunctionsModalOpen(true)}
                            className="lg:hidden text-gray-300 hover:text-white transition-colors ml-3"
                            title="View functions"
                            data-testid="button-agent-mobile-menu"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* ── Conversation Flow Builder (for flow-based agents) ── */}
                      {isConversationFlowAgent && selectedAgentId ? (
                        <div className="absolute inset-0 top-[3.75rem] overflow-hidden">
                          <ConversationFlowBuilder agentId={selectedAgentId} />
                        </div>
                      ) : (
                      <>
                      {/* Contenteditable inline editor */}
                      <div
                        key={`agent-editor-${selectedAgentId}-${activeTab}`}
                        ref={contentEditableRef}
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        autoCorrect="off"
                        autoComplete="off"
                        autoCapitalize="off"
                        className="h-full pt-16 font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-300 outline-none overflow-auto"
                      onInput={(e) => {
                        // CRITICAL FIX: Minimize state updates to eliminate lag
                        const newContent = e.currentTarget.innerText || '';

                        // Clear all debounce timers
                        if (agentSaveTimeoutRef.current) {
                          clearTimeout(agentSaveTimeoutRef.current);
                        }

                        // Debounce ALL state updates to prevent re-renders during typing
                        agentSaveTimeoutRef.current = setTimeout(() => {
                          // Update state only after user stops typing for 300ms
                          setAgentGeneralPrompt(newContent);
                          setHasAgentChanges(newContent !== originalAgentGeneralPrompt);

                          // Save to history
                          if (agentHistory.length === 0 || agentHistory[agentHistory.length - 1] !== newContent) {
                            const newHistory = agentHistory.slice(0, agentHistoryIndex + 1);
                            newHistory.push(newContent);
                            if (newHistory.length > 50) {
                              newHistory.shift();
                            } else {
                              setAgentHistoryIndex(prev => prev + 1);
                            }
                            setAgentHistory(newHistory);
                          }
                        }, 300);

                        // Check if user typed "/" for autocomplete (only check, don't update state yet)
                        const selection = window.getSelection();
                        if (!selection || selection.rangeCount === 0) return;

                        const range = selection.getRangeAt(0);
                        const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
                        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

                        if (lastSlashIndex !== -1) {
                          const filterText = textBeforeCursor.substring(lastSlashIndex + 1);

                          if (!filterText.includes('\n')) {
                            // CRITICAL FIX: Capture currentTarget before requestAnimationFrame
                            // React's synthetic events are pooled, so e.currentTarget becomes null
                            const editorElement = e.currentTarget;

                            // CRITICAL FIX: Update filter BOTH in state AND ref immediately
                            // Ref provides synchronous access for Enter key handler
                            const filterLower = filterText.toLowerCase();
                            promptAutocompleteFilterRef.current = filterLower;
                            setPromptAutocompleteFilter(filterLower);
                            setSelectedPromptAutocompleteIndex(0);
                            setShowPromptAutocomplete(true);
                            setPromptSlashStartPosition({
                              node: range.startContainer,
                              offset: lastSlashIndex
                            });

                            // Only defer position calculation to avoid forced layout
                            requestAnimationFrame(() => {
                              if (range.startContainer.parentElement && editorElement) {
                                const rect = range.getBoundingClientRect();
                                const editorRect = editorElement.getBoundingClientRect();
                                setPromptAutocompletePosition({
                                  top: rect.bottom - editorRect.top + 4,
                                  left: rect.left - editorRect.left
                                });
                              }
                            });
                          } else {
                            setShowPromptAutocomplete(false);
                            setSelectedPromptAutocompleteIndex(0);
                            promptAutocompleteFilterRef.current = '';
                          }
                        } else if (showPromptAutocomplete) {
                          // Only hide if currently showing
                          setShowPromptAutocomplete(false);
                          setSelectedPromptAutocompleteIndex(0);
                          promptAutocompleteFilterRef.current = '';
                        }
                      }}
                      onClick={(e) => {
                        // Clear selection when clicking elsewhere in the editor
                        const target = e.target as HTMLElement;
                        if (!target.hasAttribute || !target.hasAttribute('data-function')) {
                          if (selectedFunctionElementRef.current) {
                            selectedFunctionElementRef.current.classList.remove('is-selected');
                            selectedFunctionElementRef.current = null;
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        // Handle clickable function names
                        const target = e.target as HTMLElement;
                        if (target.hasAttribute && target.hasAttribute('data-function')) {
                          // Stop browser's default cursor placement/selection immediately
                          e.preventDefault();
                          e.stopPropagation();

                          // Clear previous selection
                          if (selectedFunctionElementRef.current) {
                            selectedFunctionElementRef.current.classList.remove('is-selected');
                          }

                          // Highlight new selection
                          target.classList.add('is-selected');
                          selectedFunctionElementRef.current = target;

                          const functionName = target.getAttribute('data-function');
                          if (functionName) {
                            // Use short delay to keep event handler fast and non-blocking
                            setTimeout(() => {
                              setSelectedFunctionName(functionName);
                              setIsFunctionEditorOpen(true);
                            }, 10);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // Save final state immediately when user stops editing
                        if (agentSaveTimeoutRef.current) {
                          clearTimeout(agentSaveTimeoutRef.current);
                        }
                        const finalContent = e.currentTarget.innerText || '';

                        // Update main state
                        setAgentGeneralPrompt(finalContent);
                        setHasAgentChanges(finalContent !== originalAgentGeneralPrompt);

                        // Save to history
                        if (agentHistory.length === 0 || agentHistory[agentHistory.length - 1] !== finalContent) {
                          const newHistory = agentHistory.slice(0, agentHistoryIndex + 1);
                          newHistory.push(finalContent);
                          if (newHistory.length > 50) {
                            newHistory.shift();
                          } else {
                            setAgentHistoryIndex(prev => prev + 1);
                          }
                          setAgentHistory(newHistory);
                        }
                      }}
                      data-testid="contenteditable-agent-prompt"
                      />

                      {/* Autocomplete Dropdown */}
                      {showPromptAutocomplete && (
                        <div
                          className="autocomplete-dropdown absolute z-50 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                          style={{
                            top: `${promptAutocompletePosition.top}px`,
                            left: `${promptAutocompletePosition.left}px`,
                            minWidth: '250px'
                          }}
                        >
                          {getFilteredFunctionsForAutocomplete.length > 0 ? (
                            getFilteredFunctionsForAutocomplete.map((func, index) => (
                              <div
                                key={func.name}
                                onClick={() => handlePromptAutocompleteSelect(func)}
                                onMouseEnter={() => setSelectedPromptAutocompleteIndex(index)}
                                className={`relative flex flex-col w-full cursor-pointer select-none rounded-sm py-2 px-3 text-sm outline-none transition-colors ${
                                  index === selectedPromptAutocompleteIndex
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-accent/50'
                                }`}
                              >
                                <span className={`font-semibold text-${func.color}`}>
                                  {func.displayText}
                                </span>
                                <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {func.description}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-muted-foreground text-sm">
                              No matching actions
                            </div>
                          )}
                        </div>
                      )}
                      </>
                      )}
                    </div>

                    {/* Right: Actions Panel - Cardless like Memory tab */}
                    <div className="hidden lg:block fixed top-[6.9375rem] right-0 w-96 space-y-5 h-fit pr-6 lg:pr-8" style={{ maxHeight: 'calc(100vh - 6rem)', overflowY: 'auto' }}>
                      <div className="space-y-2">
                        {/* Sticky Header */}
                        <div className="sticky top-0 z-10 py-3 flex items-center justify-between pl-3" style={{ backgroundColor: '#0D0D0D' }}>
                          <span className="text-gray-300 text-sm font-semibold">Actions</span>
                          <DropdownMenu onOpenChange={(open) => {
                            if (open) {
                              // Reset to categories view when opening
                              setAddActionDropdownState('categories');
                              setSelectedCategoryForNativeActions(null);
                            }
                          }}>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                                title="Add action"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 premium-card text-white">
                              {addActionDropdownState === 'categories' ? (
                                // Show action categories
                                [
                                  { key: 'appointmentSetting', label: 'Appointment Setting', icon: 'fa-calendar', color: 'text-blue-400' },
                                  { key: 'crm',               label: 'CRM',                  icon: 'fa-users',         color: 'text-purple-400' },
                                  { key: 'pointOfSale',       label: 'POS',                  icon: 'fa-shopping-cart', color: 'text-green-400' },
                                  { key: 'messaging',         label: 'Messaging',            icon: 'fa-comment',       color: 'text-orange-400' },
                                  { key: 'callActions',       label: 'Call Actions',         icon: 'fa-phone',         color: 'text-cyan-400' },
                                  { key: 'customIntegration', label: 'Custom',               icon: 'fa-plug',          color: 'text-yellow-400' },
                                ].map(({ key, label, icon, color }) => {
                                  const nativeActions = getNativeActionsForCategory(key);
                                  const hasNativeActions = nativeActions.length > 0;

                                  return (
                                    <DropdownMenuItem
                                      key={key}
                                      className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                                      onClick={(e) => {
                                        if (hasNativeActions) {
                                          // Show native actions for this category
                                          e.preventDefault();
                                          setSelectedCategoryForNativeActions(key);
                                          setAddActionDropdownState('native-actions');
                                        } else {
                                          // No native actions, go directly to create custom action
                                          setCreateFunctionCategory(key);
                                          setIsCreateFunctionMode(true);
                                          setSelectedFunctionName(null);
                                          setSelectedNativeActionKey(null);
                                          setIsFunctionEditorOpen(true);
                                        }
                                      }}
                                    >
                                      <span className="flex items-center">
                                        <i className={`fas ${icon} mr-2 ${color}`}></i>
                                        {label}
                                      </span>
                                      {hasNativeActions && (
                                        <ChevronRight className="w-4 h-4 ml-2 text-gray-400" />
                                      )}
                                    </DropdownMenuItem>
                                  );
                                })
                              ) : (
                                // Show native actions for selected category
                                <>
                                  {/* Back button */}
                                  <DropdownMenuItem
                                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer font-semibold border-b border-gray-700 mb-1"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setAddActionDropdownState('categories');
                                      setSelectedCategoryForNativeActions(null);
                                    }}
                                  >
                                    <i className="fas fa-arrow-left mr-2 text-gray-400"></i>
                                    Back
                                  </DropdownMenuItem>

                                  {/* Native actions for the selected category */}
                                  {selectedCategoryForNativeActions && getNativeActionsForCategory(selectedCategoryForNativeActions).map((nativeAction) => (
                                    <DropdownMenuItem
                                      key={nativeAction.key}
                                      className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                      onClick={() => {
                                        setCreateFunctionCategory(selectedCategoryForNativeActions);
                                        setIsCreateFunctionMode(true);
                                        setSelectedFunctionName(null);
                                        setSelectedNativeActionKey(nativeAction.key);
                                        setIsFunctionEditorOpen(true);
                                      }}
                                    >
                                      <i className={`fas ${
                                        selectedCategoryForNativeActions === 'appointmentSetting' ? 'fa-calendar' :
                                        selectedCategoryForNativeActions === 'crm' ? 'fa-users' :
                                        selectedCategoryForNativeActions === 'pointOfSale' ? 'fa-shopping-cart' :
                                        selectedCategoryForNativeActions === 'messaging' ? 'fa-comment' :
                                        selectedCategoryForNativeActions === 'callActions' ? 'fa-phone' :
                                        'fa-plug'
                                      } mr-2 ${
                                        selectedCategoryForNativeActions === 'appointmentSetting' ? 'text-blue-400' :
                                        selectedCategoryForNativeActions === 'crm' ? 'text-purple-400' :
                                        selectedCategoryForNativeActions === 'pointOfSale' ? 'text-green-400' :
                                        selectedCategoryForNativeActions === 'messaging' ? 'text-orange-400' :
                                        selectedCategoryForNativeActions === 'callActions' ? 'text-cyan-400' :
                                        'text-yellow-400'
                                      }`}></i>
                                      {nativeAction.label}
                                    </DropdownMenuItem>
                                  ))}

                                  {/* Create Action button */}
                                  <DropdownMenuSeparator className="bg-gray-700" />
                                  <DropdownMenuItem
                                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer font-semibold"
                                    onClick={() => {
                                      setCreateFunctionCategory(selectedCategoryForNativeActions);
                                      setIsCreateFunctionMode(true);
                                      setSelectedFunctionName(null);
                                      setSelectedNativeActionKey(null);
                                      setIsFunctionEditorOpen(true);
                                    }}
                                  >
                                    <Plus className="w-4 h-4 mr-2 text-green-400" />
                                    Create Action
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {categorizedFunctions && (() => {
                          const allFunctions: any[] = [];
                          Object.entries(categorizedFunctions).forEach(([categoryKey, category]: [string, any]) => {
                            category.functions.forEach((func: any) => {
                              allFunctions.push({ ...func, category: category.name, categoryKey, color: category.color, updatedAt: func.updatedAt || new Date().toISOString() });
                            });
                          });

                          return allFunctions.length > 0 ? (
                            <div className="divide-y divide-gray-800">
                              {allFunctions.map((func: any) => (
                                <div
                                  key={func.name}
                                  className="p-3 text-sm hover:bg-gray-800/50 transition-colors group"
                                  data-testid={`button-function-${func.name}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                      onClick={() => {
                                        setSelectedFunctionName(func.name);
                                        setIsFunctionEditorOpen(true);
                                      }}
                                    >
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        func.color === 'blue' ? 'bg-blue-600/20' :
                                        func.color === 'purple' ? 'bg-purple-600/20' :
                                        func.color === 'green' ? 'bg-green-600/20' :
                                        func.color === 'orange' ? 'bg-orange-600/20' :
                                        func.color === 'cyan' ? 'bg-cyan-600/20' :
                                        'bg-yellow-600/20'
                                      }`}>
                                        <i className={`fas ${
                                          func.categoryKey === 'appointmentSetting' ? 'fa-calendar' :
                                          func.categoryKey === 'crm' ? 'fa-users' :
                                          func.categoryKey === 'pointOfSale' ? 'fa-shopping-cart' :
                                          func.categoryKey === 'messaging' ? 'fa-comment' :
                                          func.categoryKey === 'callActions' ? 'fa-phone' :
                                          'fa-plug'
                                        } text-xl ${
                                          func.color === 'blue' ? 'text-blue-400' :
                                          func.color === 'purple' ? 'text-purple-400' :
                                          func.color === 'green' ? 'text-green-400' :
                                          func.color === 'orange' ? 'text-orange-400' :
                                          func.color === 'cyan' ? 'text-cyan-400' :
                                          'text-yellow-400'
                                        }`}></i>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="font-medium text-gray-300 block text-sm">
                                          {func.displayTitle}
                                        </span>
                                        {/* Warning badge for missing integration */}
                                        {actionIntegrationStatus?.warnings?.[func.name] && (
                                          <span
                                            className="inline-flex items-center gap-1 text-xs text-yellow-400 mt-0.5 cursor-pointer"
                                            title={actionIntegrationStatus.warnings[func.name].message}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveTab('integrations');
                                            }}
                                          >
                                            <i className="fas fa-exclamation-triangle text-xs"></i>
                                            No {actionIntegrationStatus.warnings[func.name].missing} linked
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Three-dot menu */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-all"
                                          onClick={(e) => e.stopPropagation()}
                                          data-testid={`menu-function-${func.name}`}
                                        >
                                          <i className="fas fa-ellipsis-v text-sm"></i>
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-40 premium-card text-white">
                                        <DropdownMenuItem
                                          className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                          onClick={() => {
                                            setSelectedFunctionName(func.name);
                                            setIsFunctionEditorOpen(true);
                                          }}
                                        >
                                          <i className="fas fa-edit mr-2 text-blue-400"></i>
                                          Edit Action
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-red-400 focus:text-red-400"
                                          onClick={() => {
                                            setFunctionToDelete(func.name);
                                            setShowDeleteFunctionDialog(true);
                                          }}
                                        >
                                          <i className="fas fa-trash mr-2"></i>
                                          Delete Action
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-xs italic">No functions configured</div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                      <i className="fas fa-file-alt text-2xl text-gray-500"></i>
                    </div>
                    <p className="text-gray-400">No agent configuration available yet.</p>
                    <p className="text-gray-500 text-sm mt-2">The AI agent will be configured with default settings.</p>
                  </div>
                )}

                {/* Function Editor Side Panel */}
                <FunctionEditorPanel
                  isOpen={isFunctionEditorOpen}
                  isCreateMode={isCreateFunctionMode}
                  initialCategory={createFunctionCategory}
                  nativeActionKey={selectedNativeActionKey}
                  industry={selectedAgent?.industry ?? null}
                  businessLocations={(businessSettingsData as any)?.businessLocations ?? []}
                  integrationWarning={selectedFunctionName && actionIntegrationStatus?.warnings?.[selectedFunctionName] ? actionIntegrationStatus.warnings[selectedFunctionName] : null}
                  onClose={() => {
                    setIsFunctionEditorOpen(false);
                    setSelectedFunctionName(null);
                    setIsCreateFunctionMode(false);
                    setCreateFunctionCategory(null);
                    setSelectedNativeActionKey(null);
                  }}
                  functionName={selectedFunctionName}
                  agentId={selectedAgentId}
                  onNavigateToIntegrations={() => {
                    setActiveTab('integrations');
                  }}
                  onSave={async (functionData) => {
                    try {
                      if (!selectedAgentId) throw new Error('No agent selected');
                      if (!functionData.name) throw new Error('Function name is required');

                      let response: Response;

                      if (functionData.isCreate) {
                        // ── CREATE a brand-new action ──────────────────────────────────
                        // Send the title with spaces - backend will convert to snake_case for function name
                        // title = display title (e.g., "My Custom Action")
                        // Backend converts it to function name (e.g., "my_custom_action")

                        // Build parameters schema from user-entered Required Details (same logic as PATCH)
                        const createProperties: Record<string, any> = {};
                        const createRequired: string[] = [];
                        functionData.parameters.forEach((param: any) => {
                          if (!param.name) return;
                          const snakeCaseName = param.name.toLowerCase().replace(/\s+/g, '_');
                          const paramSchema: any = { type: param.type, description: param.description };
                          if (param.type === 'array' && param.arrayItemType) {
                            paramSchema.items = { type: param.arrayItemType };
                          }
                          createProperties[snakeCaseName] = paramSchema;
                          if (param.required) createRequired.push(snakeCaseName);
                        });

                        const requestBody = {
                          title: functionData.name, // Display title with spaces preserved
                          description: functionData.description, // Verbose description
                          category: functionData.category,
                          speakDuringExecution: functionData.speakDuringExecution,
                          speakDuringText: functionData.speakDuringText,
                          speakAfterExecution: functionData.speakAfterExecution,
                          smsMessageType: functionData.smsMessageType,
                          smsContent: functionData.smsContent,
                          recipientPhone: functionData.recipientPhone,
                          useCallerPhoneByDefault: (functionData as any).useCallerPhoneByDefault ?? false,
                          callActionType: functionData.callActionType,
                          transferPhoneNumber: functionData.transferPhoneNumber,
                          transferDestinationType: functionData.transferDestinationType,
                          transferTeamMember: functionData.transferTeamMember,
                          transferVoicebot: functionData.transferVoicebot,
                          transferType: functionData.transferType,
                          postCallActions: functionData.postCallActions,
                          selectedIntegrationId: functionData.selectedIntegrationId,
                          parameters: Object.keys(createProperties).length > 0
                            ? { type: 'object', properties: createProperties, required: createRequired.length > 0 ? createRequired : undefined }
                            : undefined
                        };

                        console.log('🎯 CREATE ACTION - Category being sent:', functionData.category);
                        console.log('🎯 CREATE ACTION - Full request body:', requestBody);

                        response = await fetch(`/api/agents/${selectedAgentId}/functions`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(requestBody)
                        });
                      } else {
                        // ── UPDATE an existing action ───────────────────────────────────
                        const properties: Record<string, any> = {};
                        const required: string[] = [];
                        functionData.parameters.forEach((param: any) => {
                          if (!param.name) return;
                          // Convert parameter name with spaces to snake_case
                          const snakeCaseName = param.name.toLowerCase().replace(/\s+/g, '_');
                          const paramSchema: any = { type: param.type, description: param.description };
                          if (param.type === 'array' && param.arrayItemType) {
                            paramSchema.items = { type: param.arrayItemType };
                          }
                          properties[snakeCaseName] = paramSchema;
                          if (param.required) required.push(snakeCaseName);
                        });

                        const patchBody = {
                          displayTitle: (functionData as any).displayTitle,
                          verboseDescription: (functionData as any).verboseDescription,
                          parameters: { type: 'object', properties, required: required.length > 0 ? required : undefined },
                          speakDuringExecution: functionData.speakDuringExecution,
                          speakDuringText: functionData.speakDuringText,
                          speakAfterExecution: functionData.speakAfterExecution,
                          smsMessageType: functionData.smsMessageType,
                          smsContent: functionData.smsContent,
                          recipientPhone: functionData.recipientPhone,
                          useCallerPhoneByDefault: (functionData as any).useCallerPhoneByDefault ?? false,
                          callActionType: functionData.callActionType,
                          transferPhoneNumber: functionData.transferPhoneNumber,
                          transferDestinationType: functionData.transferDestinationType,
                          transferTeamMember: functionData.transferTeamMember,
                          transferVoicebot: functionData.transferVoicebot,
                          transferType: functionData.transferType,
                          postCallActions: functionData.postCallActions,
                          selectedIntegrationId: functionData.selectedIntegrationId
                        };

                        console.log('🟢 === DASHBOARD SENDING PATCH ===');
                        console.log('🟢 Function Name:', functionData.name);
                        console.log('🟢 Display Title:', patchBody.displayTitle);
                        console.log('🟢 Verbose Description:', patchBody.verboseDescription);
                        console.log('🟢 Full PATCH Body:', JSON.stringify(patchBody, null, 2));

                        response = await fetch(`/api/agents/${selectedAgentId}/functions/${functionData.name}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(patchBody)
                        });
                      }

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || errorData.error || 'Failed to save action');
                      }

                      // Refresh the actions list
                      queryClient.invalidateQueries({
                        queryKey: ['/api/integrations/retell-functions', selectedAgentId]
                      });
                      // Reset create mode state
                      setIsCreateFunctionMode(false);
                      setCreateFunctionCategory(null);

                      toast({
                        title: functionData.isCreate ? 'Action Created' : 'Action Updated',
                        description: functionData.isCreate
                          ? `"${functionData.name}" has been created successfully.`
                          : 'The action has been updated successfully.',
                      });
                    } catch (error: any) {
                      console.error('❌ Error in Dashboard.onSave:', error);
                      toast({
                        title: "Error",
                        description: error.message || "Failed to save action. Please try again.",
                        variant: "destructive"
                      });
                      throw error; // Re-throw so the panel knows save failed
                    }
                  }}
                />

                {/* Mobile Actions Modal */}
                <Dialog open={agentFunctionsModalOpen} onOpenChange={setAgentFunctionsModalOpen}>
                  <DialogContent className="premium-card text-white max-w-full h-full m-0 p-6 overflow-y-auto [&>button]:ring-0 [&>button]:ring-offset-0 [&>button:focus]:ring-0">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                      <DialogTitle className="text-white text-left">Actions</DialogTitle>
                      <Button
                        onClick={() => {
                          // Open integrations library to add new actions
                          setAgentFunctionsModalOpen(false);
                          setActiveTab('integrations');
                        }}
                        variant="outline"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </DialogHeader>
                    <div className="space-y-3">
                      {categorizedFunctions && (() => {
                        const allFunctions: any[] = [];
                        Object.entries(categorizedFunctions).forEach(([categoryKey, category]: [string, any]) => {
                          category.functions.forEach((func: any) => {
                            allFunctions.push({ ...func, category: category.name, categoryKey, color: category.color, updatedAt: func.updatedAt || new Date().toISOString() });
                          });
                        });

                        return allFunctions.length > 0 ? (
                          <div className="divide-y divide-gray-800">
                            {allFunctions.map((func: any) => (
                              <div
                                key={func.name}
                                className="p-3 text-sm hover:bg-gray-800/50 transition-colors group"
                                data-testid={`button-function-${func.name}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                    onClick={() => {
                                      setSelectedFunctionName(func.name);
                                      setIsFunctionEditorOpen(true);
                                      setAgentFunctionsModalOpen(false);
                                    }}
                                  >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      func.color === 'blue' ? 'bg-blue-600/20' :
                                      func.color === 'purple' ? 'bg-purple-600/20' :
                                      func.color === 'green' ? 'bg-green-600/20' :
                                      func.color === 'orange' ? 'bg-orange-600/20' :
                                      func.color === 'cyan' ? 'bg-cyan-600/20' :
                                      'bg-yellow-600/20'
                                    }`}>
                                      <i className={`fas ${
                                        func.categoryKey === 'appointmentSetting' ? 'fa-calendar' :
                                        func.categoryKey === 'crm' ? 'fa-users' :
                                        func.categoryKey === 'pointOfSale' ? 'fa-shopping-cart' :
                                        func.categoryKey === 'messaging' ? 'fa-comment' :
                                        func.categoryKey === 'callActions' ? 'fa-phone' :
                                        'fa-plug'
                                      } text-xl ${
                                        func.color === 'blue' ? 'text-blue-400' :
                                        func.color === 'purple' ? 'text-purple-400' :
                                        func.color === 'green' ? 'text-green-400' :
                                        func.color === 'orange' ? 'text-orange-400' :
                                        func.color === 'cyan' ? 'text-cyan-400' :
                                        'text-yellow-400'
                                      }`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium text-gray-300 block text-sm">{func.displayTitle || func.name}</span>
                                    </div>
                                  </div>

                                  {/* Three-dot menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        className="opacity-100 w-8 h-8 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-all"
                                        onClick={(e) => e.stopPropagation()}
                                        data-testid={`menu-function-mobile-${func.name}`}
                                      >
                                        <i className="fas fa-ellipsis-v text-sm"></i>
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 premium-card text-white">
                                      <DropdownMenuItem
                                        className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                                        onClick={() => {
                                          setSelectedFunctionName(func.name);
                                          setIsFunctionEditorOpen(true);
                                          setAgentFunctionsModalOpen(false);
                                        }}
                                      >
                                        <i className="fas fa-edit mr-2 text-blue-400"></i>
                                        Edit Action
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-red-400 focus:text-red-400"
                                        onClick={() => {
                                          setFunctionToDelete(func.name);
                                          setShowDeleteFunctionDialog(true);
                                          setAgentFunctionsModalOpen(false);
                                        }}
                                      >
                                        <i className="fas fa-trash mr-2"></i>
                                        Delete Action
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-xs italic">No functions configured</div>
                        );
                      })()}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>
          )}

          {/* Integrations Tab */}
          {hasPermission('settings') && (
            <TabsContent value="integrations" className="mt-8 h-auto">
              <IntegrationsTab selectedAgentId={selectedAgentId} />
            </TabsContent>
          )}

          {/* Settings Tab (for Notifications) */}
          {hasPermission('settings') && (
            <TabsContent value="settings" className="mt-8 h-auto">
            {/* Notifications Subtab Content */}
            {activeSubtab.settings === 'notifications' && (
              <div className="grid grid-cols-1 gap-6">
                <div className="premium-card rounded-lg">
                  <div className="p-6">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Mail className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-gray-400 text-lg mb-2">Email/SMS Alerts</p>
                      <p className="text-gray-500">Configure notification preferences</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </TabsContent>
          )}

          {/* Account Tab */}
          <TabsContent value="account" className="mt-8 h-auto">
              <div className="space-y-8">
                    {/* Full Name */}
                    <div>
                      <label className="text-gray-300 text-base mb-2 block">Full Name</label>
                      <div className="flex items-center justify-between bg-gray-800 border border-gray-800 rounded-lg px-4 h-10">
                        {isEditingName ? (
                          <input
                            ref={nameInputRef}
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="flex-1 bg-transparent text-white border-none outline-none"
                            placeholder="Enter your full name"
                            data-testid="input-edit-name"
                          />
                        ) : (
                          <span className="text-white">{user?.name || 'N/A'}</span>
                        )}
                        <div className="flex items-center space-x-3">
                          {isEditingName ? (
                            <>
                              <Button
                                variant="link"
                                className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                                data-testid="button-save-name"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSaveName();
                                }}
                                disabled={updateNameMutation.isPending}
                              >
                                {updateNameMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="link"
                                className="text-gray-400 hover:text-gray-300 p-0 h-auto"
                                data-testid="button-cancel-name"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setIsEditingName(false);
                                  setEditNameValue(user?.name || '');
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="link"
                              className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                              data-testid="button-edit-name"
                              onClick={(e) => {
                                e.preventDefault();
                                setEditNameValue(user?.name || '');
                                setIsEditingName(true);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Email address */}
                    <div>
                      <label className="text-gray-300 text-base mb-2 block">Email address</label>
                      <div className="flex items-center justify-between bg-gray-800 border border-gray-800 rounded-lg px-4 h-10">
                        {isEditingEmail ? (
                          <input
                            ref={emailInputRef}
                            type="email"
                            value={editEmailValue}
                            onChange={(e) => setEditEmailValue(e.target.value)}
                            className="flex-1 bg-transparent text-white border-none outline-none"
                            placeholder="Enter your email address"
                            data-testid="input-edit-email"
                          />
                        ) : (
                          <span className="text-white">{user?.email || 'N/A'}</span>
                        )}
                        <div className="flex items-center space-x-3">
                          {isEditingEmail ? (
                            <>
                              <Button
                                variant="link"
                                className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                                data-testid="button-save-email"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSaveEmail();
                                }}
                                disabled={updateEmailMutation.isPending}
                              >
                                {updateEmailMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="link"
                                className="text-gray-400 hover:text-gray-300 p-0 h-auto"
                                data-testid="button-cancel-email"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setIsEditingEmail(false);
                                  setEditEmailValue(user?.email || '');
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="link"
                              className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                              data-testid="button-edit-email"
                              onClick={(e) => {
                                e.preventDefault();
                                setEditEmailValue(user?.email || '');
                                setIsEditingEmail(true);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="text-gray-300 text-base mb-2 block">Phone Number</label>
                      <div className="flex items-center justify-between bg-gray-800 border border-gray-800 rounded-lg px-4 h-10">
                        {isEditingPhone ? (
                          <input
                            ref={phoneInputRef}
                            type="tel"
                            value={editPhoneValue}
                            onChange={(e) => setEditPhoneValue(e.target.value)}
                            className="flex-1 bg-transparent text-white border-none outline-none"
                            placeholder="Enter your phone number (e.g., 5551234567)"
                            data-testid="input-edit-phone"
                          />
                        ) : (
                          <span className="text-white">{formatPhoneForDisplay(user?.phoneNumber) || 'N/A'}</span>
                        )}
                        <div className="flex items-center space-x-3">
                          {isEditingPhone ? (
                            <>
                              <Button
                                variant="link"
                                className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                                data-testid="button-save-phone"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSavePhone();
                                }}
                                disabled={updatePhoneNumberMutation.isPending}
                              >
                                {updatePhoneNumberMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="link"
                                className="text-gray-400 hover:text-gray-300 p-0 h-auto"
                                data-testid="button-cancel-phone"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setIsEditingPhone(false);
                                  setEditPhoneValue(formatPhoneForDisplay(user?.phoneNumber) || '');
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="link"
                              className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                              data-testid="button-edit-phone"
                              onClick={(e) => {
                                e.preventDefault();
                                setEditPhoneValue(formatPhoneForDisplay(user?.phoneNumber) || '');
                                setIsEditingPhone(true);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="text-gray-300 text-base mb-2 block">Password</label>
                      <div className="flex items-center justify-between bg-gray-800 border border-gray-800 rounded-lg px-4 h-10">
                        <span className="text-white">••••••••</span>
                        <Button
                          variant="link"
                          className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                          onClick={() => setShowPasswordModal(true)}
                          data-testid="button-change-password"
                        >
                          Change Password
                        </Button>
                      </div>
                    </div>

              </div>
            </TabsContent>

          {/* Billing Tab */}
          {hasPermission('settings.account') && (
            <TabsContent value="billing" className="space-y-6 mt-8">
              <BillingPage
                userSubscription={userSubscription}
                currentPlan={currentPlan}
                stats={stats}
                usagePercentage={usagePercentage}
                hasOverage={hasOverage}
                overageMinutes={overageMinutes}
                overageCharges={overageCharges}
                handleManageSubscription={handleManageSubscription}
                isLoadingBillingPortal={isLoadingBillingPortal}
              />
            </TabsContent>
          )}

          {/* Voicebots Tab */}
          <TabsContent value="voicebots" className="space-y-6 mt-8">
            <div className="max-w-7xl mx-auto">
              <VoicebotTable
                voicebots={voiceAgentsData || []}
                isLoading={isLoadingAgents}
                onCreateVoicebot={() => setShowNewAgentModal(true)}
                onNavigateToAgent={(voicebot) => {
                  setSelectedAgentId(voicebot.id);
                  setActiveTab('agent');
                }}
                userSubscription={userSubscription}
                onDeleteSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/voice-agents'] })}
              />
            </div>
          </TabsContent>
        </Tabs>
          </div>
        </div>

      {/* Invite Member Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-3xl premium-card text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Email Address</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@yourrestaurant.com"
                className="bg-transparent border-gray-800 text-gray-300"
                data-testid="input-invite-email"
              />
            </div>

            {/* Agent Assignment Section */}
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Assign AI Agents</label>
              <p className="text-xs text-gray-400 mb-3">Select which AI agents this team member can access and manage</p>
              <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg p-3">
                {voiceAgentsData && voiceAgentsData.length > 0 ? (
                  voiceAgentsData.map((agent: any) => (
                    <div key={agent.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`agent-${agent.id}`}
                        checked={inviteAssignedAgents.includes(agent.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteAssignedAgents([...inviteAssignedAgents, agent.id]);
                          } else {
                            setInviteAssignedAgents(inviteAssignedAgents.filter(id => id !== agent.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-800 rounded focus:ring-blue-500"
                        data-testid={`checkbox-agent-${agent.id}`}
                      />
                      <label htmlFor={`agent-${agent.id}`} className="text-sm text-white cursor-pointer flex-1">
                        {agent.name}
                        {agent.industry && <span className="text-gray-400 ml-2">({agent.industry})</span>}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No AI agents available. Create an agent first.</p>
                )}
              </div>
              {inviteAssignedAgents.length > 0 && (
                <p className="text-xs text-blue-400 mt-2">
                  {inviteAssignedAgents.length} agent{inviteAssignedAgents.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Role Selection with Detailed Access */}
            <div>
              <label className="text-gray-300 text-sm mb-3 block font-semibold">Select Role</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Owner Role */}
                <div
                  onClick={() => setInviteRole('owner')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    inviteRole === 'owner'
                      ? 'bg-green-900/30 border-green-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-white font-semibold text-lg">Owner</h5>
                    <Badge className="bg-green-900/20 text-green-400 border-green-800">Full Access</Badge>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700 pt-3">
                    <p className="font-semibold text-gray-300 mb-2">Can View:</p>
                    <p>✓ Home, Calls, Analytics, Billing, Settings</p>
                    <p>✓ All subtabs (History, Contacts, Agent, Account, Team, Integrations, etc.)</p>
                  </div>
                </div>

                {/* Manager Role */}
                <div
                  onClick={() => setInviteRole('manager')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    inviteRole === 'manager'
                      ? 'bg-blue-900/30 border-blue-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-white font-semibold text-lg">Manager</h5>
                    <Badge className="bg-blue-900/20 text-blue-400 border-blue-800">High Access</Badge>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700 pt-3">
                    <p className="font-semibold text-gray-300 mb-2">Can View:</p>
                    <p>✓ Home, Calls, Analytics</p>
                    <p>✓ Settings: Agent, Integrations</p>
                    <p>✗ Billing, Account, Team management</p>
                  </div>
                </div>

                {/* Employee Role */}
                <div
                  onClick={() => setInviteRole('employee')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    inviteRole === 'employee'
                      ? 'bg-yellow-900/30 border-yellow-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-white font-semibold text-lg">Employee</h5>
                    <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-800">Limited Access</Badge>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700 pt-3">
                    <p className="font-semibold text-gray-300 mb-2">Can View:</p>
                    <p>✓ Calls: History, Contacts</p>
                    <p>✓ Analytics: Calls only</p>
                    <p>✗ Home, Billing, Settings</p>
                  </div>
                </div>

                {/* Custom Role */}
                <div
                  onClick={() => setInviteRole('custom')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    inviteRole === 'custom'
                      ? 'bg-purple-900/30 border-purple-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-white font-semibold text-lg">Custom Role</h5>
                    <Badge className="bg-purple-900/20 text-purple-400 border-purple-800">Flexible Access</Badge>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700 pt-3">
                    <p className="font-semibold text-gray-300 mb-2">Can View:</p>
                    <p>Configure custom tab and subtab access</p>
                    <p className="text-purple-400">→ Click to configure permissions</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                onClick={() => {
                  if (inviteEmail && inviteRole) {
                    if (inviteRole === 'custom') {
                      // Open custom permissions modal
                      setCustomPermissionsSource('invite');
                      setShowCustomPermissionsModal(true);
                    } else {
                      // Directly send invite for predefined roles
                      inviteTeamMemberMutation.mutate({ 
                        email: inviteEmail, 
                        role: inviteRole,
                        assignedAgentIds: inviteAssignedAgents.length > 0 ? inviteAssignedAgents : undefined
                      });
                    }
                  } else {
                    toast({
                      title: "Missing Information",
                      description: "Please enter an email address and select a role.",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={inviteTeamMemberMutation.isPending}
                data-testid="button-send-invite"
              >
                {inviteTeamMemberMutation.isPending ? 'Sending...' : 'Send Invite'}
              </Button>
              <Button
                variant="outline"
                className="border-gray-800 text-gray-300 hover:bg-gray-800 flex-1"
                onClick={() => setShowInviteModal(false)}
                data-testid="button-cancel-invite"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        open={showNotifSettingsModal}
        onClose={() => setShowNotifSettingsModal(false)}
        notificationPermission={notificationPermission}
        onRequestDesktopPermission={handleToggleDesktopNotifications}
        smsEnabled={user?.enableSMS || false}
        onToggleSMS={(val) => updateSMSAlertsMutation.mutate(val)}
        smsPending={updateSMSAlertsMutation.isPending}
      />

      {/* Account Settings Modal */}
      <Dialog open={showAccountSettings} onOpenChange={setShowAccountSettings}>
        <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">General settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 p-4">
            {/* Profile Picture Section */}
            <div>
              <label className="text-gray-300 text-sm mb-3 block">Profile picture</label>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">{user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}</span>
                </div>
                <Button 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                  data-testid="button-upload-avatar"
                >
                  Upload Avatar
                </Button>
              </div>
            </div>

            {/* Full Name Section */}
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Full Name</label>
              <div className="flex items-center justify-between bg-transparent border border-gray-800 rounded-lg px-3 py-2">
                {isEditingName ? (
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    className="flex-1 bg-transparent text-white border-none outline-none"
                    placeholder="Enter your full name"
                    data-testid="input-edit-name"
                  />
                ) : (
                  <span className="text-white">{user?.name || 'User Account'}</span>
                )}
                <div className="flex items-center space-x-2 ml-3">
                  {isEditingName ? (
                    <>
                      <Button 
                        variant="link" 
                        className="text-green-400 hover:text-green-300 p-0 h-auto font-normal"
                        onClick={handleVerifyName}
                        disabled={updateNameMutation.isPending}
                        data-testid="button-verify-name"
                      >
                        {updateNameMutation.isPending ? 'Saving...' : 'Verify'}
                      </Button>
                      <Button 
                        variant="link" 
                        className="text-gray-400 hover:text-gray-300 p-0 h-auto font-normal"
                        onClick={handleCancelEditName}
                        data-testid="button-cancel-name"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="link" 
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal"
                      onClick={handleEditName}
                      data-testid="button-edit-name"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Email Address Section */}
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Email address</label>
              <div className="flex items-center justify-between bg-transparent border border-gray-800 rounded-lg px-3 py-2">
                {isEditingEmail ? (
                  <input
                    type="email"
                    value={editEmailValue}
                    onChange={(e) => setEditEmailValue(e.target.value)}
                    className="flex-1 bg-transparent text-white border-none outline-none"
                    placeholder="Enter your email address"
                    data-testid="input-edit-email"
                  />
                ) : (
                  <span className="text-white">{user?.email || 'user@example.com'}</span>
                )}
                <div className="flex items-center space-x-2 ml-3">
                  {isEditingEmail ? (
                    <>
                      <Button 
                        variant="link" 
                        className="text-green-400 hover:text-green-300 p-0 h-auto font-normal"
                        onClick={handleVerifyEmail}
                        disabled={updateEmailMutation.isPending || sendVerificationEmailMutation.isPending}
                        data-testid="button-verify-email"
                      >
                        {(updateEmailMutation.isPending || sendVerificationEmailMutation.isPending) ? 'Saving...' : 'Verify'}
                      </Button>
                      <Button 
                        variant="link" 
                        className="text-gray-400 hover:text-gray-300 p-0 h-auto font-normal"
                        onClick={handleCancelEditEmail}
                        data-testid="button-cancel-email"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="link" 
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal"
                      onClick={handleEditEmail}
                      data-testid="button-edit-email"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Password</label>
              <div className="bg-transparent border border-gray-800 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">••••••••</span>
                  <Button
                    variant="link"
                    className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal"
                    onClick={() => setShowPasswordModal(true)}
                    data-testid="button-change-password-settings"
                  >
                    Change
                  </Button>
                </div>
              </div>
            </div>


            {/* Manage Subscription Button */}
            <div className="pt-4">
              <Button 
                onClick={handleManageSubscription}
                disabled={isLoadingBillingPortal}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                data-testid="button-manage-subscription"
              >
                {isLoadingBillingPortal ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Opening Portal...
                  </>
                ) : (
                  <>
                    <i className="fas fa-credit-card mr-2"></i>
                    Manage Subscription
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Update Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-[95vw] md:max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold text-white">Update Payment Method</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update your credit card information for subscription billing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 md:space-y-6 p-2 md:p-4">
            {/* Current Payment Method */}
            <div className="bg-gray-800/60 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Current Payment Method</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">VISA</span>
                  </div>
                  <span className="text-white">•••• •••• •••• 4242</span>
                </div>
                <span className="text-gray-400 text-sm">Expires 12/27</span>
              </div>
            </div>

            {/* New Payment Method Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">New Payment Method</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm">Cardholder Name</label>
                  <input 
                    type="text" 
                    className="w-full mt-2 p-3 bg-transparent border border-gray-800 rounded-lg text-gray-300"
                    placeholder="John Doe"
                    data-testid="input-cardholder-name"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm">Card Number</label>
                  <input 
                    type="text" 
                    className="w-full mt-2 p-3 bg-transparent border border-gray-800 rounded-lg text-gray-300"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    data-testid="input-card-number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-sm">Expiry Date</label>
                    <input 
                      type="text" 
                      className="w-full mt-2 p-3 bg-transparent border border-gray-800 rounded-lg text-gray-300"
                      placeholder="MM/YY"
                      maxLength={5}
                      data-testid="input-expiry-date"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm">CVV</label>
                    <input 
                      type="text" 
                      className="w-full mt-2 p-3 bg-transparent border border-gray-800 rounded-lg text-gray-300"
                      placeholder="123"
                      maxLength={4}
                      data-testid="input-cvv"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-300 text-sm">Billing Address</label>
                  <input 
                    type="text" 
                    className="w-full mt-2 p-3 bg-transparent border border-gray-800 rounded-lg text-gray-300"
                    placeholder="123 Main Street"
                    data-testid="input-billing-address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-sm">City</label>
                    <input 
                      type="text" 
                      className="w-full mt-2 p-3 bg-transparent border border-gray-800 rounded-lg text-gray-300"
                      placeholder="New York"
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm">ZIP Code</label>
                    <input 
                      type="text" 
                      className="w-full mt-2 p-3 bg-transparent border border-gray-800 rounded-lg text-gray-300"
                      placeholder="10001"
                      data-testid="input-zip-code"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <i className="fas fa-shield-alt text-blue-400 mt-0.5"></i>
                <div>
                  <p className="text-blue-400 text-sm font-medium">Secure Payment</p>
                  <p className="text-gray-300 text-xs mt-1">
                    Your payment information is encrypted and processed securely through Stripe.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 border-gray-800 text-gray-300 hover:bg-gray-800"
                data-testid="button-cancel-payment-update"
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white"
                data-testid="button-save-payment-method"
              >
                <i className="fas fa-credit-card mr-2"></i>
                Update Payment Method
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-3xl premium-card text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Change Password</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Current Password</label>
              <input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-transparent text-gray-300 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-current-password-modal"
              />
            </div>

            <div>
              <label className="text-gray-300 text-sm mb-2 block">New Password</label>
              <input
                type="password"
                placeholder="Enter new password (min. 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-transparent text-gray-300 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-new-password-modal"
              />
            </div>

            <div>
              <label className="text-gray-300 text-sm mb-2 block">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-transparent text-gray-300 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-confirm-password-modal"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 border-gray-800 text-gray-300 hover:bg-gray-800"
                data-testid="button-cancel-password-modal"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!currentPassword || !newPassword || !confirmPassword) {
                    toast({
                      title: "Error",
                      description: "All password fields are required.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    toast({
                      title: "Error",
                      description: "New passwords do not match.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (newPassword.length < 8) {
                    toast({
                      title: "Error",
                      description: "New password must be at least 8 characters long.",
                      variant: "destructive",
                    });
                    return;
                  }
                  changePasswordMutation.mutate({ currentPassword, newPassword });
                }}
                disabled={changePasswordMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-save-password-modal"
              >
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Us Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="max-w-[95vw] md:max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold text-white">Contact Us</DialogTitle>
            <DialogDescription className="text-gray-400">
              Send us a message and we'll get back to you within 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-2 md:p-4">
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Message *</label>
              <Textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Tell us how we can help you..."
                rows={6}
                className="w-full bg-transparent text-gray-300 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="textarea-contact-message"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowContactModal(false);
                  setContactMessage('');
                }}
                className="flex-1 border-gray-800 text-gray-300 hover:bg-gray-800"
                data-testid="button-cancel-contact"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!contactMessage.trim()) {
                    toast({
                      title: "Error",
                      description: "Please enter a message.",
                      variant: "destructive",
                    });
                    return;
                  }

                  setIsSubmittingContact(true);

                  try {
                    const response = await fetch('/api/contact', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        name: user?.name || user?.firstName || 'Dashboard User',
                        email: user?.email || '',
                        subject: 'general',
                        message: contactMessage,
                      }),
                    });

                    if (response.ok) {
                      toast({
                        title: "Message sent successfully!",
                        description: "We'll get back to you within 24 hours.",
                      });
                      setContactMessage('');
                      setShowContactModal(false);
                    } else {
                      throw new Error('Failed to send message');
                    }
                  } catch (error) {
                    toast({
                      title: "Error sending message",
                      description: "Please try again or email us directly at bgibson@voicebot.one",
                      variant: "destructive"
                    });
                  } finally {
                    setIsSubmittingContact(false);
                  }
                }}
                disabled={isSubmittingContact}
                className="flex-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white"
                data-testid="button-send-contact"
              >
                {isSubmittingContact ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Integration Modal */}
      <Dialog open={showAddIntegrationModal} onOpenChange={(open) => {
        setShowAddIntegrationModal(open);
        if (!open) {
          setEditingIntegrationId(null);
        }
      }}>
        <DialogContent className="premium-card border border-gray-700 max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-4 pb-3 border-b border-gray-700">
            <div>
              <DialogTitle className="text-lg font-bold text-white">Add New Integration</DialogTitle>
              <p className="text-sm text-gray-400 mt-1">Select an integration to configure</p>
            </div>
          </DialogHeader>

          <div className="space-y-6 px-6 py-4 overflow-y-auto flex-1">
            {/* Request Integration Button */}
            <div className="p-6 pt-2">
              <button
                onClick={() => {
                  window.location.href = '/contact';
                }}
                className="w-full p-4 rounded-lg border-2 border-dashed border-violet-500/50 bg-violet-900/20 hover:bg-violet-900/30 hover:border-violet-400/70 transition-all"
              >
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center">
                    <i className="fas fa-paper-plane text-white"></i>
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-semibold">Request New Integration</h3>
                    <p className="text-sm text-gray-400">Don't see what you need? Contact us</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Integration Selection Grid */}
            <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[
                      { icon: "fab fa-google", name: "Google Calendar", category: "Appointment Setting", color: "text-red-400", isOAuth: true, fields: [] },
                      { icon: "fas fa-calendar", name: "Cal.com", category: "Appointment Setting", color: "text-blue-400", fields: [{label: "API Key", key: "apiKey", type: "password", required: true, placeholder: "Your Cal.com API key"}] },
                      { icon: "fas fa-calendar-check", name: "Calendly", category: "Appointment Setting", color: "text-blue-500", fields: [{label: "Personal Access Token", key: "apiKey", type: "password", required: true, placeholder: "Your Calendly PAT"}] },
                      { icon: "fas fa-home", name: "Housecall Pro", category: "Appointment Setting", color: "text-orange-400", fields: [{label: "API Key", key: "apiKey", type: "password", required: true}, {label: "Company ID", key: "applicationId", type: "text", required: true}] },
                      { icon: "fas fa-cut", name: "Meevo", category: "Appointment Setting", color: "text-pink-400", fields: [{label: "Meevo Token", key: "apiKey", type: "password", required: true}, {label: "Location ID", key: "locationId", type: "text", required: true}] },
                      { icon: "fas fa-spa", name: "Boulevard", category: "Appointment Setting", color: "text-purple-300", fields: [{label: "API Key", key: "apiKey", type: "password", required: true}, {label: "Business ID", key: "locationId", type: "text", required: true}] },
                      { icon: "fas fa-tools", name: "ServiceTitan", category: "Appointment Setting", color: "text-orange-500", fields: [{label: "Client ID", key: "applicationId", type: "text", required: true}, {label: "Client Secret", key: "clientSecret", type: "password", required: true}, {label: "Tenant ID", key: "locationId", type: "text", required: true}] },
                      { icon: "fas fa-hard-hat", name: "ServiceTrade", category: "Appointment Setting", color: "text-yellow-500", fields: [{label: "API Key", key: "apiKey", type: "password", required: true}] },
                      { icon: "fab fa-telegram", name: "Telegram", category: "Text Messaging", color: "text-cyan-400", fields: [{label: "Bot Token", key: "apiKey", type: "password", required: true, placeholder: "Your Telegram bot token"}, {label: "Chat ID", key: "locationId", type: "text", required: false, placeholder: "Optional: default chat ID"}] },
                      { icon: "fas fa-hammer", name: "Thumbtack", category: "Text Messaging", color: "text-blue-600", fields: [{label: "API Key", key: "apiKey", type: "password", required: true}] },
                      { icon: "fab fa-yelp", name: "Yelp Leads", category: "Text Messaging", color: "text-red-500", fields: [{label: "API Key", key: "apiKey", type: "password", required: true}, {label: "Business ID", key: "locationId", type: "text", required: true}] },
                      { icon: "fas fa-user-tie", name: "ZOHO", category: "CRM", color: "text-purple-400", fields: [{label: "Client ID", key: "applicationId", type: "text", required: true}, {label: "Client Secret", key: "clientSecret", type: "password", required: true}, {label: "Refresh Token", key: "apiKey", type: "password", required: true}] },
                      { icon: "fas fa-building", name: "Acculynx", category: "CRM", color: "text-indigo-400", fields: [{label: "API Key", key: "apiKey", type: "password", required: true}, {label: "Company ID", key: "locationId", type: "text", required: true}] },
                      { icon: "fas fa-users", name: "Bitrix", category: "CRM", color: "text-teal-400", fields: [{label: "Webhook URL", key: "webhookUrl", type: "url", required: true, placeholder: "Your Bitrix24 webhook URL"}] },
                      { icon: "fas fa-chart-line", name: "GoHighLevel", category: "CRM", color: "text-emerald-400", fields: [{label: "API Key", key: "apiKey", type: "password", required: true}, {label: "Location ID", key: "locationId", type: "text", required: true}] },
                      { icon: "fas fa-bullhorn", name: "HubSpot", category: "CRM", color: "text-orange-600", fields: [{label: "Access Token", key: "apiKey", type: "password", required: true, placeholder: "Your HubSpot private app token"}] },
                      { icon: "fas fa-key", name: "KeyCRM", category: "CRM", color: "text-yellow-400", fields: [{label: "API Key", key: "apiKey", type: "password", required: true}] },
                      { icon: "fas fa-funnel-dollar", name: "Pipedrive", category: "CRM", color: "text-green-500", fields: [{label: "API Token", key: "apiKey", type: "password", required: true, placeholder: "Your Pipedrive API token"}] },
                      { icon: "fas fa-cloud", name: "Salesforce", category: "CRM", color: "text-cyan-500", fields: [{label: "Consumer Key", key: "applicationId", type: "text", required: true}, {label: "Consumer Secret", key: "clientSecret", type: "password", required: true}, {label: "Access Token", key: "apiKey", type: "password", required: true}, {label: "Instance URL", key: "apiEndpointUrl", type: "url", required: true, placeholder: "https://your-instance.salesforce.com"}] },
                      { icon: "fas fa-credit-card", name: "Square POS", category: "Food Order", color: "text-green-400", fields: [{label: "Access Token", key: "apiKey", type: "password", required: true, placeholder: "Your Square access token"}, {label: "Location ID", key: "locationId", type: "text", required: true, placeholder: "Square location ID"}] },
                      { icon: "fas fa-shopping-bag", name: "Clover POS", category: "Food Order", color: "text-green-500", fields: [{label: "API Token", key: "apiKey", type: "password", required: true, placeholder: "Your Clover API token"}, {label: "Merchant ID", key: "locationId", type: "text", required: true, placeholder: "13-character merchant ID"}] },
                      { icon: "fas fa-plug", name: "Custom", category: "Custom Integration", color: "text-amber-400", fields: [{label: "Integration Name", key: "name", type: "text", required: true, placeholder: "e.g., My Custom Integration"}, {label: "n8n/Zapier Webhook URL", key: "webhookUrl", type: "url", required: true, placeholder: "Your webhook URL"}] },
                    ].map((integration, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setNewIntegrationForm(prev => ({
                            ...prev,
                            name: integration.name,
                            description: `${integration.name} integration for ${integration.category}`,
                            type: integration.category,
                            isOAuthIntegration: integration.isOAuth || false
                          }));
                          // Store selected integration fields
                          (window as any).selectedIntegrationFields = integration.fields;
                          // Close add modal and open configure modal
                          setShowAddIntegrationModal(false);
                          setShowConfigureIntegrationModal(true);
                        }}
                        className="p-4 rounded-lg border transition-all hover:scale-105 bg-gray-800/50 border-gray-700 hover:border-gray-800"
                      >
                        <div className={`w-12 h-12 mx-auto mb-3 rounded-lg bg-gray-900 flex items-center justify-center ${integration.color}`}>
                          <i className={`${integration.icon} text-xl`}></i>
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-1">{integration.name}</h3>
                        <p className="text-xs text-gray-400">{integration.category}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Configure Integration Modal */}
          <Dialog open={showConfigureIntegrationModal} onOpenChange={(open) => {
            setShowConfigureIntegrationModal(open);
            if (!open) {
              setEditingIntegrationId(null);
            }
          }}>
            <DialogContent className="premium-card border border-gray-700 max-w-4xl max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-4 pb-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg font-bold text-white">
                      Configure {newIntegrationForm.name}
                    </DialogTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewIntegrationForm({
                        name: '',
                        description: '',
                        type: '',
                        customFunction: '',
                        apiKey: '',
                        applicationId: '',
                        clientSecret: '',
                        webhookSecret: '',
                        apiEndpointUrl: '',
                        method: 'POST',
                        timeout: 10000,
                        webhookUrl: '',
                        authorization: '',
                        contentType: 'application/json',
                        customHeaders: [],
                        locationId: '',
                        timeZone: '',
                        customQueryParams: [],
                        jsonPayloadSchema: '',
                        responseVariables: '',
                        hmacSignature: '',
                        sandboxMode: false,
                        isOAuthIntegration: false
                      });
                      (window as any).selectedIntegrationFields = null;
                      setShowConfigureIntegrationModal(false);
                      setShowAddIntegrationModal(true);
                    }}
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Back to integrations
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6 px-6 py-4 overflow-y-auto flex-1">
                {/* Google Calendar OAuth Connect */}
                {newIntegrationForm.isOAuthIntegration && newIntegrationForm.name === 'Google Calendar' ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 p-8 rounded-lg border border-red-700/50 text-center">
                      <i className="fas fa-calendar-alt text-red-500 text-6xl mb-4"></i>
                      <h3 className="text-2xl font-bold text-white mb-3">Connect Your Google Calendar</h3>
                      <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                        Click the button below to securely connect your Google Calendar. Your AI receptionist will be able to check availability, book reservations, and manage your calendar automatically.
                      </p>
                      <a
                        href={`/api/integrations/google-calendar/connect?agentId=${selectedAgentId}`}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                        data-testid="button-connect-google-calendar"
                      >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Connect Google Calendar
                      </a>
                      <p className="text-gray-400 text-sm mt-4">
                        You'll be redirected to Google to grant permissions
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Integration Configuration Form */}
                    {(window as any).selectedIntegrationFields && (
                      <div className="p-6 space-y-4">
                        {/* Custom Function Selector - Only show for Custom integrations */}
                        {newIntegrationForm.name === 'Custom' && (
                          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                            <label className="block text-sm font-medium text-blue-300 mb-2">
                              Triggering Function <span className="text-red-400">*</span>
                            </label>
                            <Select 
                              value={newIntegrationForm.customFunction} 
                              onValueChange={(value) => setNewIntegrationForm(prev => ({ ...prev, customFunction: value }))}
                            >
                              <SelectTrigger className="w-full bg-gray-800 border-gray-800 text-white" data-testid="select-custom-function">
                                <SelectValue placeholder="Select a Retell AI function that triggers this integration" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {(() => {
                                  // Get selected agent to determine industry
                                  const agent = voiceAgentsData?.find((a: any) => a.id === selectedAgentId);
                                  const industry = agent?.industry || 'restaurant';
                                  const functions = RETELL_FUNCTIONS_BY_INDUSTRY[industry as keyof typeof RETELL_FUNCTIONS_BY_INDUSTRY]?.functions || [];
                                  
                                  return functions.map((func: any) => (
                                    <SelectItem key={func.name} value={func.name}>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{func.name}</span>
                                        <span className="text-xs text-gray-400">{func.description}</span>
                                      </div>
                                    </SelectItem>
                                  ));
                                })()}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400 mt-2">
                              Choose which Retell AI custom function will trigger this integration during live calls
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {((window as any).selectedIntegrationFields || []).map((field: any, idx: number) => (
                            <div key={idx}>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                {field.label} {field.required && <span className="text-red-400">*</span>}
                              </label>
                              <input
                                type={field.type}
                                value={(newIntegrationForm as any)[field.key] || ''}
                                onChange={(e) => setNewIntegrationForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="w-full p-3 bg-gray-800 border border-gray-800 rounded-lg text-white placeholder-gray-500"
                                placeholder={field.placeholder || field.label}
                                required={field.required}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Sandbox Toggle for integrations that support it */}
                        {['Square POS', 'Salesforce', 'ServiceTitan'].includes(newIntegrationForm.name) && (
                          <div className="flex items-center gap-3 pt-4">
                            <input
                              type="checkbox"
                              id="sandbox-mode"
                              checked={newIntegrationForm.sandboxMode}
                              onChange={(e) => setNewIntegrationForm(prev => ({ ...prev, sandboxMode: e.target.checked }))}
                              className="w-4 h-4 bg-gray-800 border-gray-800 rounded"
                            />
                            <label htmlFor="sandbox-mode" className="text-sm text-gray-300">
                              Use Sandbox/Test Environment
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

          {/* Action Buttons */}
          {!newIntegrationForm.isOAuthIntegration && (
            <div className="flex flex-col md:flex-row gap-3 px-6 py-4 border-t border-gray-700 bg-gray-900/50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfigureIntegrationModal(false);
                  setNewIntegrationForm({
                    name: '',
                    description: '',
                    type: '',
                    customFunction: '',
                    apiKey: '',
                    applicationId: '',
                    clientSecret: '',
                    webhookSecret: '',
                    apiEndpointUrl: '',
                    method: 'POST',
                    timeout: 10000,
                    webhookUrl: '',
                    authorization: '',
                    contentType: 'application/json',
                    customHeaders: [],
                    locationId: '',
                    timeZone: '',
                    customQueryParams: [],
                    jsonPayloadSchema: '',
                    responseVariables: '',
                    hmacSignature: '',
                    sandboxMode: false,
                    isOAuthIntegration: false
                  });
                }}
                className="flex-1 border-gray-800 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>

              <Button
              onClick={async () => {
                try {
                  // Validate required fields - only check name and description as minimum
                  if (!newIntegrationForm.name || !newIntegrationForm.description) {
                    toast({
                      title: "Missing Required Fields",
                      description: "Please fill in Name and Description",
                      variant: "destructive"
                    });
                    return;
                  }

                  // Test integration based on type
                  let testPassed = false;
                  let testData: any = null;

                  // Test Square integration
                  if (newIntegrationForm.name.toLowerCase().includes('square') && newIntegrationForm.apiKey) {
                    toast({
                      title: "Testing Square Integration",
                      description: "Validating credentials with Square API...",
                    });

                    const response = await fetch('/api/integrations/test-square', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        accessToken: newIntegrationForm.apiKey,
                        locationId: newIntegrationForm.locationId,
                        environment: newIntegrationForm.sandboxMode ? 'sandbox' : 'production',
                        saveIntegration: false
                      })
                    });

                    testData = await response.json();
                    testPassed = testData.success;

                    if (!testPassed) {
                      toast({
                        title: "❌ Square Integration Test Failed",
                        description: testData.message || testData.error || 'Invalid Square credentials',
                        variant: "destructive"
                      });
                      return;
                    }
                  }
                  // Test Clover integration
                  else if (newIntegrationForm.name.toLowerCase().includes('clover') && newIntegrationForm.apiKey && newIntegrationForm.locationId) {
                    toast({
                      title: "Testing Clover Integration",
                      description: "Validating credentials with Clover API...",
                    });

                    const response = await fetch('/api/integrations/test-clover', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        accessToken: newIntegrationForm.apiKey,
                        merchantId: newIntegrationForm.locationId,
                        environment: newIntegrationForm.sandboxMode ? 'sandbox' : 'production',
                        saveIntegration: false
                      })
                    });

                    testData = await response.json();
                    testPassed = testData.success;

                    if (!testPassed) {
                      const errorDetails = testData.details?.hint
                        ? `${testData.message}\n\n💡 ${testData.details.hint}`
                        : testData.message || testData.error || 'Invalid Clover credentials';

                      toast({
                        title: "❌ Clover Integration Test Failed",
                        description: errorDetails,
                        variant: "destructive",
                        duration: 10000 // Show longer for detailed error
                      });

                      console.error('Clover test failed:', testData);
                      return;
                    }
                  }
                  // Test Toast integration
                  else if (newIntegrationForm.name.toLowerCase().includes('toast') && newIntegrationForm.applicationId && newIntegrationForm.clientSecret) {
                    toast({
                      title: "Testing Toast Integration",
                      description: "Validating credentials with Toast API...",
                    });

                    const response = await fetch('/api/integrations/test-toast', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        clientId: newIntegrationForm.applicationId,
                        clientSecret: newIntegrationForm.clientSecret,
                        restaurantGuid: newIntegrationForm.locationId,
                        environment: newIntegrationForm.sandboxMode ? 'sandbox' : 'production',
                        saveIntegration: false
                      })
                    });

                    testData = await response.json();
                    testPassed = testData.success;

                    if (!testPassed) {
                      toast({
                        title: "❌ Toast Integration Test Failed",
                        description: testData.message || testData.error || 'Invalid Toast credentials',
                        variant: "destructive"
                      });
                      return;
                    }
                  }
                  // Test custom integrations with generic API endpoint test
                  else if (newIntegrationForm.apiEndpointUrl && newIntegrationForm.apiKey) {
                    toast({
                      title: "Testing Integration",
                      description: "Sending test request to API endpoint...",
                    });

                    try {
                      // Build test headers
                      const testHeaders: Record<string, string> = {
                        'Content-Type': newIntegrationForm.contentType || 'application/json'
                      };

                      // Add authorization header
                      if (newIntegrationForm.authorization) {
                        let auth = newIntegrationForm.authorization;
                        auth = auth.replace('{{api_key}}', newIntegrationForm.apiKey);
                        auth = auth.replace('{{access_token}}', newIntegrationForm.apiKey);
                        testHeaders['Authorization'] = auth;
                      }

                      // Add custom headers
                      if (newIntegrationForm.customHeaders && Array.isArray(newIntegrationForm.customHeaders)) {
                        newIntegrationForm.customHeaders.forEach((header: any) => {
                          if (header.key && header.value) {
                            testHeaders[header.key] = header.value;
                          }
                        });
                      }

                      // Build test URL with merchant/location ID if present
                      let testUrl = newIntegrationForm.apiEndpointUrl;
                      if (newIntegrationForm.locationId) {
                        testUrl = testUrl.replace('{{merchant_id}}', newIntegrationForm.locationId);
                        testUrl = testUrl.replace('{{location_id}}', newIntegrationForm.locationId);
                        testUrl = testUrl.replace('{{restaurant_guid}}', newIntegrationForm.locationId);
                      }

                      // Make a test request (GET for testing connectivity)
                      const testResponse = await fetch(testUrl, {
                        method: 'GET',
                        headers: testHeaders,
                        credentials: 'include'
                      });

                      // Accept 2xx, 401, 403, or 404 as valid responses (means endpoint exists)
                      if (testResponse.ok || testResponse.status === 401 || testResponse.status === 403 || testResponse.status === 404) {
                        testPassed = true;
                        toast({
                          title: "✅ Connection Test Passed",
                          description: `API endpoint is reachable (Status: ${testResponse.status})`,
                        });
                      } else {
                        toast({
                          title: "⚠️ Connection Test Warning",
                          description: `API returned status ${testResponse.status}. Proceed with caution.`,
                          variant: "destructive"
                        });
                        // Still allow saving even if test fails
                        testPassed = true;
                      }
                    } catch (error) {
                      console.error('Test API call error:', error);
                      toast({
                        title: "⚠️ Connection Test Failed",
                        description: `Could not reach API endpoint. Check URL and credentials. You can still save.`,
                        variant: "destructive"
                      });
                      // Still allow saving even if test fails
                      testPassed = true;
                    }
                  }
                  // For integrations without API endpoint or API key, skip test
                  else {
                    testPassed = true;
                  }

                  // If test passed, save the integration
                  if (testPassed) {
                    let updatedIntegrations;

                    // Check if we're editing an existing integration or adding a new one
                    if (editingIntegrationId) {
                      // Update existing integration
                      updatedIntegrations = customIntegrations.map(int =>
                        int.id === editingIntegrationId
                          ? { 
                              ...int, 
                              ...newIntegrationForm,
                              testStatus: 'passed',
                              testMessage: testData?.message || 'Integration test passed successfully',
                              lastTestedAt: new Date()
                            }
                          : int
                      );
                      console.log('Updating integration:', editingIntegrationId);
                    } else {
                      // Add new integration
                      const newIntegration = {
                        id: `integration-${Date.now()}`,
                        ...newIntegrationForm,
                        agentId: selectedAgent?.id, // Associate with currently selected agent
                        testStatus: 'passed',
                        testMessage: testData?.message || 'Integration test passed successfully',
                        lastTestedAt: new Date()
                      };
                      updatedIntegrations = [...customIntegrations, newIntegration];
                      console.log('Saving new integration:', newIntegration);
                    }

                    // Save to backend
                    if (!selectedAgentId) {
                      throw new Error('No agent selected');
                    }
                    const saveResponse = await fetch('/api/integrations/custom', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        agentId: selectedAgentId,
                        integrations: updatedIntegrations
                      })
                    });

                    if (!saveResponse.ok) {
                      throw new Error('Failed to save integration to backend');
                    }

                    // Update local state
                    setCustomIntegrations(updatedIntegrations);

                    // Show success message
                    const integrationName = testData?.merchant?.businessName || testData?.merchant?.name || testData?.restaurant?.name || newIntegrationForm.name;
                    toast({
                      title: "✅ Integration Saved!",
                      description: editingIntegrationId
                        ? `${newIntegrationForm.name} has been updated and saved successfully.`
                        : `Connected to ${integrationName} and saved successfully.`,
                      variant: "default"
                    });

                    if (editingIntegrationId) {
                      setEditingIntegrationId(null);
                    }

                    // Refresh integrations query with agentId
                    queryClient.invalidateQueries({ queryKey: ['/api/integrations/custom', selectedAgentId] });

                    // Close modal and reset form
                    setShowConfigureIntegrationModal(false);
                    setNewIntegrationForm({
                      name: '',
                      description: '',
                      type: '',
                      apiKey: '',
                      applicationId: '',
                      clientSecret: '',
                      webhookSecret: '',
                      apiEndpointUrl: '',
                      method: 'POST',
                      timeout: 10000,
                      webhookUrl: '',
                      authorization: '',
                      contentType: 'application/json',
                      customHeaders: [],
                      locationId: '',
                      timeZone: '',
                      customQueryParams: [],
                      jsonPayloadSchema: '',
                      responseVariables: '',
                      hmacSignature: '',
                      sandboxMode: false,
                      isOAuthIntegration: false,
                      triggerFunctions: [],
                      agentId: undefined
                    });
                  }
                } catch (error) {
                  console.error('Error testing/adding integration:', error);
                  toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
                    variant: "destructive"
                  });
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Integration
            </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Integration Confirmation Dialog */}
      <Dialog open={showRemoveConfirmDialog} onOpenChange={setShowRemoveConfirmDialog}>
        <DialogContent className="premium-card border border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Remove Integration</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">
              Are you sure you want to remove <span className="font-semibold text-white">{integrationToRemove?.name}</span>?
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveConfirmDialog(false);
                setIntegrationToRemove(null);
              }}
              className="border-gray-800 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (integrationToRemove) {
                  try {
                    let endpoint = '';

                    // Determine which endpoint to use based on integration type
                    if (integrationToRemove.id === 'googleCalendar') {
                      // Restaurant-level integration
                      endpoint = `/api/business-settings/integrations/googleCalendar`;
                    } else {
                      // Agent-specific custom integration
                      endpoint = `/api/integrations/${integrationToRemove.id}`;
                    }

                    // Delete integration from backend
                    const response = await fetch(endpoint, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      credentials: 'include'
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.message || 'Failed to remove integration');
                    }

                    // Update local state based on integration type
                    if (integrationToRemove.id === 'googleCalendar') {
                      // Refresh the integration settings query
                      queryClient.invalidateQueries({ queryKey: ['/api/business-settings/integrations'] });
                    } else {
                      // Update custom integrations list
                      setCustomIntegrations(prev => prev.filter(i => i.id !== integrationToRemove.id));

                      // Refresh integrations query with agentId
                      if (selectedAgentId) {
                        queryClient.invalidateQueries({ queryKey: ['/api/integrations/custom', selectedAgentId] });
                      }
                    }

                    toast({
                      title: "Integration Removed",
                      description: `${integrationToRemove.name} has been removed successfully.`,
                      variant: "default"
                    });
                  } catch (error) {
                    console.error('Error removing integration:', error);
                    toast({
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to remove integration. Please try again.",
                      variant: "destructive"
                    });
                  } finally {
                    setShowRemoveConfirmDialog(false);
                    setIntegrationToRemove(null);
                  }
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-remove-integration"
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      </div>
      </div>

      {/* Edit Role Modal */}
      <Dialog open={showEditRoleModal} onOpenChange={setShowEditRoleModal}>
        <DialogContent className="max-w-3xl premium-card text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Member Permissions</DialogTitle>
            <DialogDescription className="text-gray-400">
              Change the role for {editingMember?.name || editingMember?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Role Selection Cards */}
            <div>
              <label className="text-gray-300 text-sm mb-3 block font-semibold">Select Role</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Owner Role */}
                <div
                  onClick={() => setNewRole('owner')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    newRole === 'owner'
                      ? 'bg-green-900/30 border-green-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-white font-semibold text-lg">Owner</h5>
                    <Badge className="bg-green-900/20 text-green-400 border-green-800">Full Access</Badge>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700 pt-3">
                    <p className="font-semibold text-gray-300 mb-2">Can View:</p>
                    <p>✓ Home, Calls, Analytics, Billing, Settings</p>
                    <p>✓ All subtabs (History, Contacts, Agent, Account, Team, Integrations, etc.)</p>
                  </div>
                </div>

                {/* Manager Role */}
                <div
                  onClick={() => setNewRole('manager')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    newRole === 'manager'
                      ? 'bg-blue-900/30 border-blue-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-white font-semibold text-lg">Manager</h5>
                    <Badge className="bg-blue-900/20 text-blue-400 border-blue-800">High Access</Badge>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700 pt-3">
                    <p className="font-semibold text-gray-300 mb-2">Can View:</p>
                    <p>✓ Home, Calls, Analytics</p>
                    <p>✓ Settings: Agent, Integrations</p>
                    <p>✗ Billing, Account, Team management</p>
                  </div>
                </div>

                {/* Employee Role */}
                <div
                  onClick={() => setNewRole('employee')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    newRole === 'employee'
                      ? 'bg-yellow-900/30 border-yellow-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-white font-semibold text-lg">Employee</h5>
                    <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-800">Limited Access</Badge>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700 pt-3">
                    <p className="font-semibold text-gray-300 mb-2">Can View:</p>
                    <p>✓ Calls: History, Contacts</p>
                    <p>✓ Analytics: Calls only</p>
                    <p>✗ Home, Billing, Settings</p>
                  </div>
                </div>

                {/* Custom Role */}
                <div
                  onClick={() => setNewRole('custom')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    newRole === 'custom'
                      ? 'bg-purple-900/30 border-purple-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-white font-semibold text-lg">Custom Role</h5>
                    <Badge className="bg-purple-900/20 text-purple-400 border-purple-800">Flexible Access</Badge>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700 pt-3">
                    <p className="font-semibold text-gray-300 mb-2">Can View:</p>
                    <p>Configure custom tab and subtab access</p>
                    <p className="text-purple-400">→ Click to configure permissions</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => {
                  if (editingMember && newRole) {
                    if (newRole === 'custom') {
                      // Open custom permissions modal
                      setCustomPermissionsSource('edit');
                      setShowCustomPermissionsModal(true);
                    } else {
                      // Directly update for predefined roles
                      updateMemberRoleMutation.mutate({
                        memberId: editingMember.id,
                        role: newRole
                      });
                      setShowEditRoleModal(false);
                      setEditingMember(null);
                    }
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={updateMemberRoleMutation.isPending}
              >
                {updateMemberRoleMutation.isPending ? 'Updating...' : 'Update Role'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditRoleModal(false);
                  setEditingMember(null);
                }}
                className="flex-1 border-gray-800 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Permissions Modal */}
      <Dialog open={showCustomPermissionsModal} onOpenChange={setShowCustomPermissionsModal}>
        <DialogContent className="max-w-3xl premium-card text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Configure Custom Permissions</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select which tabs and subtabs this role can access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Home Tab */}
            <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-white font-semibold">Home Tab</h5>
                  <p className="text-gray-400 text-sm">Dashboard overview and key metrics</p>
                </div>
                <Switch
                  checked={customPermissions.home.enabled}
                  onCheckedChange={(checked) => {
                    setCustomPermissions({
                      ...customPermissions,
                      home: { enabled: checked }
                    });
                  }}
                />
              </div>
            </div>

            {/* Calls Tab */}
            <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h5 className="text-white font-semibold">Calls Tab</h5>
                  <p className="text-gray-400 text-sm">Call history and customer contacts</p>
                </div>
                <Switch
                  checked={customPermissions.calls.enabled}
                  onCheckedChange={(checked) => {
                    setCustomPermissions({
                      ...customPermissions,
                      calls: {
                        enabled: checked,
                        history: checked ? customPermissions.calls.history : false,
                        contacts: checked ? customPermissions.calls.contacts : false
                      }
                    });
                  }}
                />
              </div>
              {customPermissions.calls.enabled && (
                <div className="ml-6 space-y-3 border-l-2 border-gray-800 pl-4">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm">Call History</label>
                    <Switch
                      checked={customPermissions.calls.history}
                      onCheckedChange={(checked) => {
                        setCustomPermissions({
                          ...customPermissions,
                          calls: { ...customPermissions.calls, history: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm">Customer Contacts</label>
                    <Switch
                      checked={customPermissions.calls.contacts}
                      onCheckedChange={(checked) => {
                        setCustomPermissions({
                          ...customPermissions,
                          calls: { ...customPermissions.calls, contacts: checked }
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Members Tab */}
            <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-white font-semibold">Members Tab</h5>
                  <p className="text-gray-400 text-sm">Team management and access control</p>
                </div>
                <Switch
                  checked={customPermissions.settings.members}
                  onCheckedChange={(checked) => {
                    setCustomPermissions({
                      ...customPermissions,
                      settings: { ...customPermissions.settings, members: checked }
                    });
                  }}
                />
              </div>
            </div>

            {/* Settings Tab */}
            <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h5 className="text-white font-semibold">Settings Tab</h5>
                  <p className="text-gray-400 text-sm">System configuration and preferences</p>
                </div>
                <Switch
                  checked={customPermissions.settings.enabled}
                  onCheckedChange={(checked) => {
                    setCustomPermissions({
                      ...customPermissions,
                      settings: {
                        enabled: checked,
                        agents: checked ? customPermissions.settings.agents : false,
                        memory: checked ? customPermissions.settings.memory : false,
                        integrations: checked ? customPermissions.settings.integrations : false,
                        members: checked ? customPermissions.settings.members : false,
                        account: checked ? customPermissions.settings.account : false
                      }
                    });
                  }}
                />
              </div>
              {customPermissions.settings.enabled && (
                <div className="ml-6 space-y-3 border-l-2 border-gray-800 pl-4">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm">Agents</label>
                    <Switch
                      checked={customPermissions.settings.agents}
                      onCheckedChange={(checked) => {
                        setCustomPermissions({
                          ...customPermissions,
                          settings: { ...customPermissions.settings, agents: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm">Memory</label>
                    <Switch
                      checked={customPermissions.settings.memory}
                      onCheckedChange={(checked) => {
                        setCustomPermissions({
                          ...customPermissions,
                          settings: { ...customPermissions.settings, memory: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm">Integrations</label>
                    <Switch
                      checked={customPermissions.settings.integrations}
                      onCheckedChange={(checked) => {
                        setCustomPermissions({
                          ...customPermissions,
                          settings: { ...customPermissions.settings, integrations: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm">Account</label>
                    <Switch
                      checked={customPermissions.settings.account}
                      onCheckedChange={(checked) => {
                        setCustomPermissions({
                          ...customPermissions,
                          settings: { ...customPermissions.settings, account: checked }
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => {
                  // Handle confirmation based on source
                  if (customPermissionsSource === 'invite') {
                    // Send invite with custom permissions
                    inviteTeamMemberMutation.mutate({
                      email: inviteEmail,
                      role: 'custom',
                      permissions: customPermissions
                    });
                    setShowCustomPermissionsModal(false);
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteRole('');
                  } else if (customPermissionsSource === 'edit') {
                    // Update member with custom permissions
                    if (editingMember) {
                      updateMemberRoleMutation.mutate({
                        memberId: editingMember.id,
                        role: 'custom',
                        permissions: customPermissions
                      });
                      setShowCustomPermissionsModal(false);
                      setShowEditRoleModal(false);
                      setEditingMember(null);
                      setNewRole('');
                    }
                  }
                  // Reset permissions state
                  setCustomPermissions({
                    home: { enabled: false },
                    calls: { enabled: false, history: false, contacts: false },
                    analytics: { enabled: false, calls: false, services: false },
                    settings: { enabled: false, agents: false, memory: false, integrations: false, members: false, account: false }
                  });
                  setCustomPermissionsSource(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={inviteTeamMemberMutation.isPending || updateMemberRoleMutation.isPending}
              >
                {customPermissionsSource === 'invite'
                  ? (inviteTeamMemberMutation.isPending ? 'Sending...' : 'Send Invite')
                  : (updateMemberRoleMutation.isPending ? 'Updating...' : 'Update Permissions')
                }
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomPermissionsModal(false);
                  // Reset permissions state
                  setCustomPermissions({
                    home: { enabled: false },
                    calls: { enabled: false, history: false, contacts: false },
                    analytics: { enabled: false, calls: false, services: false },
                    settings: { enabled: false, agents: false, memory: false, integrations: false, members: false, account: false }
                  });
                  setCustomPermissionsSource(null);
                }}
                className="flex-1 border-gray-800 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invitation Modals */}
      {inviteToken && showSignupModal && (
        <InvitationSignupModal
          open={showSignupModal}
          inviteToken={inviteToken}
          onSwitchToLogin={() => {
            setShowSignupModal(false);
            setShowLoginModal(true);
            // Update sessionStorage to persist modal state on refresh
            sessionStorage.setItem('showSignupModal', 'false');
            sessionStorage.setItem('showLoginModal', 'true');
          }}
        />
      )}
      {inviteToken && showLoginModal && (
        <InvitationLoginModal
          open={showLoginModal}
          inviteToken={inviteToken}
          onSwitchToSignup={() => {
            setShowLoginModal(false);
            setShowSignupModal(true);
            // Update sessionStorage to persist modal state on refresh
            sessionStorage.setItem('showLoginModal', 'false');
            sessionStorage.setItem('showSignupModal', 'true');
          }}
        />
      )}

      {/* New Agent Modal */}
      <Sheet open={showNewAgentModal} onOpenChange={(open) => {
        setShowNewAgentModal(open);
        if (!open) {
          // Reset on close
          setAgentOnboardingStep('extraction');
          setExtractionMethod('location');
          setLocationInput('');
          setWebsiteInput('');
          setLocationSuggestions([]);
          setShowSuggestions(false);
          setNewAgentForm({
            businessName: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            phoneNumber: '',
            website: '',
            businessInfo: ''
          });
        }
      }}>
        <SheetContent className="w-full sm:w-1/2 sm:max-w-[50%] premium-card p-0 flex flex-col overflow-y-auto">
          <div className="p-6 pb-24">
            <SheetHeader className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <SheetTitle className="text-white">
                  {agentOnboardingStep === 'extraction' ? 'Extract Business Information' : 'Review and Create Agent'}
                </SheetTitle>

                {/* Back button when viewing business-info step */}
                {agentOnboardingStep === 'business-info' && (
                  <Button
                    variant="ghost"
                    onClick={() => setAgentOnboardingStep('extraction')}
                    className="text-gray-400 hover:text-white hover:bg-gray-800/50 px-3 py-1 text-sm"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Back to Extraction
                  </Button>
                )}

                {/* Back to extracted information button when viewing extraction and info exists */}
                {agentOnboardingStep === 'extraction' && newAgentForm.businessInfo.trim() && (
                  <Button
                    variant="ghost"
                    onClick={() => setAgentOnboardingStep('business-info')}
                    className="text-gray-400 hover:text-white hover:bg-gray-800/50 px-3 py-1 text-sm"
                  >
                    Back to extracted information
                    <i className="fas fa-arrow-right ml-2"></i>
                  </Button>
                )}
              </div>
              <SheetDescription className="text-gray-400">
                {agentOnboardingStep === 'extraction'
                  ? 'Extract your business information from Google Maps or your website'
                  : 'Review and edit your business information'}
              </SheetDescription>
            </SheetHeader>

          {agentOnboardingStep === 'extraction' ? (
            /* Extraction Card */
            <div className="space-y-6 mt-4">
              {/* Extraction Method Selection */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setExtractionMethod('location')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    extractionMethod === 'location'
                      ? 'bg-blue-900/30 border-blue-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <Store className="h-6 w-6 mb-2 text-blue-400" />
                  <h3 className="font-semibold text-white mb-1">Google Maps</h3>
                  <p className="text-xs text-gray-400">Search by business name and location</p>
                </button>

                <button
                  type="button"
                  onClick={() => setExtractionMethod('website')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    extractionMethod === 'website'
                      ? 'bg-purple-900/30 border-purple-600'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-800'
                  }`}
                >
                  <Globe className="h-6 w-6 mb-2 text-purple-400" />
                  <h3 className="font-semibold text-white mb-1">Website</h3>
                  <p className="text-xs text-gray-400">Extract from business website</p>
                </button>
              </div>

              {/* Location Input */}
              {extractionMethod === 'location' && (
                <div className="relative">
                  <Label htmlFor="location-input" className="text-gray-300 mb-2 block">
                    Business Location
                  </Label>
                  <Input
                    id="location-input"
                    placeholder="e.g., Craft Grill, The Woodlands, TX"
                    value={locationInput}
                    onChange={(e) => handleLocationInputChange(e.target.value)}
                    className="bg-transparent border-gray-800 text-gray-300"
                  />
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-transparent border border-gray-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {locationSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          data-suggestion-item
                          onClick={() => {
                            setLocationInput(suggestion.description);
                            setShowSuggestions(false);
                          }}
                          className="p-3 hover:bg-gray-700 cursor-pointer text-sm text-gray-300"
                        >
                          {suggestion.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Website Input */}
              {extractionMethod === 'website' && (
                <div>
                  <Label htmlFor="website-input" className="text-gray-300 mb-2 block">
                    Business Website
                  </Label>
                  <Input
                    id="website-input"
                    placeholder="https://www.example.com"
                    value={websiteInput}
                    onChange={(e) => handleWebsiteInputChange(e.target.value)}
                    className="bg-transparent border-gray-800 text-gray-300"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNewAgentModal(false)}
                  className="flex-1 border-gray-800 text-gray-300 hover:bg-gray-800"
                  disabled={isExtracting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExtractBusinessInfo}
                  disabled={isExtracting || (extractionMethod === 'location' && !locationInput) || (extractionMethod === 'website' && !websiteInput)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {isExtracting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Extracting... (This may take a moment)
                    </>
                  ) : (
                    'Extract Information'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Business Information Card */
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label htmlFor="businessInfo" className="text-gray-300 font-medium">
                  Business Information
                </Label>
                <p className="text-sm text-gray-400">
                  Review and edit your business information
                </p>
                <Textarea
                  id="businessInfo"
                  value={newAgentForm.businessInfo}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, businessInfo: e.target.value }))}
                  placeholder="Enter your business information here...&#10;&#10;Example:&#10;Business Name: My Restaurant&#10;Address: 123 Main St, City, State ZIP&#10;Phone: (555) 123-4567&#10;Website: www.myrestaurant.com&#10;Description: A family-friendly restaurant serving Italian cuisine&#10;Hours: Mon-Fri 11am-10pm, Sat-Sun 12pm-11pm&#10;Services: Dine-in, Takeout, Delivery&#10;Menu: Pizza, Pasta, Salads, Desserts"
                  className="min-h-[400px] bg-transparent border-gray-800 text-gray-300 placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setAgentOnboardingStep('extraction')}
                  disabled={isCreatingAgent}
                  className="border-gray-800 text-gray-300 hover:bg-gray-800"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back
                </Button>
                <Button
                  onClick={handleCreateAgent}
                  disabled={isCreatingAgent || !newAgentForm.businessInfo.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {isCreatingAgent ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating Agent... (This may take a moment)
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="premium-card text-white border-gray-700 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">
              Delete Knowledge Source
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-base">
              Are you sure you want to delete this knowledge source? This action cannot be undone.
              The source will be removed from your AI agent's knowledge base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingSource}
              className="bg-gray-800 text-white hover:bg-gray-700 border-gray-800"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSource}
              disabled={isDeletingSource}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingSource ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <i className="fas fa-trash mr-2"></i>
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Function Confirmation Dialog */}
      <AlertDialog open={showDeleteFunctionDialog} onOpenChange={setShowDeleteFunctionDialog}>
        <AlertDialogContent className="premium-card text-white border-gray-700 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">
              Delete Action
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-base">
              Are you sure you want to delete this action? This will permanently remove it from both Retell AI and your actions list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingFunction}
              className="bg-gray-800 text-white hover:bg-gray-700 border-gray-800"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFunction}
              disabled={isDeletingFunction}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingFunction ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <i className="fas fa-trash mr-2"></i>
                  Delete Action
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Logs Modal */}
      <Dialog open={showActivityModal} onOpenChange={setShowActivityModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <i className="fas fa-history text-blue-400"></i>
              Activity Logs
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {isLoadingActivity ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-300">Loading activity logs...</p>
                </div>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 mx-auto">
                  <i className="fas fa-history text-2xl text-gray-500"></i>
                </div>
                <h4 className="text-lg font-medium text-white mb-2">No Activity Yet</h4>
                <p className="text-gray-400">No activity logs found for this source.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activityLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      log.action === 'created' ? 'bg-green-600/20' :
                      log.action === 'updated' ? 'bg-blue-600/20' :
                      'bg-gray-600/20'
                    }`}>
                      <i className={`fas ${
                        log.action === 'created' ? 'fa-plus text-green-400' :
                        log.action === 'updated' ? 'fa-sync-alt text-blue-400' :
                        'fa-info-circle text-gray-400'
                      }`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{log.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        {log.user && (
                          <span className="text-xs text-gray-500">by {log.user}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowActivityModal(false)}
              className="border-gray-800 text-gray-300 hover:bg-gray-800"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}