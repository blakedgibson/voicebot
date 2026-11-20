import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { X, Plus, Trash2, ExternalLink, ChevronLeft, ChevronRight, ChevronDown, Check, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RETELL_FUNCTIONS_BY_INDUSTRY, BUILT_IN_RETELL_FUNCTIONS, RetellFunction } from '@shared/retellFunctionsConfig';
import { getAllTemplates, CATEGORY_ICONS, CATEGORY_LABELS } from '@/components/integrations/integrationTemplates';
import { getNativeActionTemplate, getIndustryActionOverride, type BusinessLocation } from '@/components/nativeActionTemplates';
import DOMPurify from 'dompurify';
import { useToast } from '@/hooks/use-toast';

interface Parameter {
  id: string;
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  arrayItemType?: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  displayType?: 'text' | 'number' | 'date' | 'time'; // UI display type (text/date/time all map to 'string' in JSON Schema)
}

interface PostCallAction {
  id: string;
  action: string;
  trigger: string;
  destinationType: 'specific_number' | 'team_member' | 'voicebot';
  destinationValue: string;
}

interface CustomerMemoryEntry {
  id: string;
  name: string;
  description: string;
  memory: string; // HTML (may contain colored param tokens)
}

interface FunctionData {
  name: string;
  description: string;
  selectedIntegrationId: string | null; // DEPRECATED - use selectedIntegrationIds
  selectedIntegrationIds: string[]; // Array of integration IDs that execute independently in parallel
  parameters: Parameter[];
  enabled: boolean;
  speakDuringExecution: boolean;
  speakDuringText: string;
  speakAfterExecution: boolean;
  smsMessageType?: 'static' | 'prompt';
  smsContent?: string;
  recipientPhone?: string; // HTML (may contain colored param tokens), plain text = phone number
  useCallerPhoneByDefault?: boolean; // When true, send SMS to caller's phone unless customer provides preferred number
  callActionType?: 'transfer' | 'end' | 'hold' | 'post_call_actions'; // For Call Actions category
  transferPhoneNumber?: string; // Phone number to transfer to (for transfer action)
  transferDestinationType?: 'specific_number' | 'team_member' | 'voicebot'; // How to define transfer destination
  transferTeamMember?: string; // Team member ID or name
  transferVoicebot?: string; // VoiceBot ID
  transferType?: 'cold' | 'warm'; // Cold (straight through) or warm (with explanation)
  postCallActions?: PostCallAction[]; // For post-call actions configuration
  customerMemoryEntries?: CustomerMemoryEntry[]; // For CRM functions - customer memory storage
  /** Set to true when this is a new function being created (not an update) */
  isCreate?: boolean;
  /** The category selected when creating a new action */
  category?: string | null;
  /** Display title for the function (preserves spaces) */
  displayTitle?: string | null;
  /** Verbose description explaining what the function does */
  verboseDescription?: string | null;
}

interface FunctionEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  functionName: string | null;
  agentId: string | null;
  onSave: (functionData: FunctionData) => Promise<void>;
  onNavigateToIntegrations?: () => void;
  /** When true the panel is in "create new action" mode */
  isCreateMode?: boolean;
  /** Category key pre-selected when opening in create mode */
  initialCategory?: string | null;
  /** Native action template key (e.g., 'book_appointment', 'sms_confirmation') */
  nativeActionKey?: string | null;
  /** Industry of the selected agent — drives parameter descriptions and SMS templates */
  industry?: string | null;
  /** Detected business locations — enables multi-location routing params when length > 1 */
  businessLocations?: BusinessLocation[];
  /** Warning shown when this action is missing a required integration (e.g. no Calendar linked) */
  integrationWarning?: { missing: string; message: string } | null;
}

export function FunctionEditorPanel({ isOpen, onClose, functionName, agentId, onSave, onNavigateToIntegrations, isCreateMode = false, initialCategory = null, nativeActionKey = null, industry = null, businessLocations = [], integrationWarning = null }: FunctionEditorPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnectingContacts, setIsConnectingContacts] = useState(false);

  const [functionData, setFunctionData] = useState<FunctionData>({
    name: '',
    description: '',
    selectedIntegrationId: null, // DEPRECATED
    selectedIntegrationIds: [], // NEW - initialize as empty array
    parameters: [],
    enabled: true,
    speakDuringExecution: false,
    speakDuringText: '',
    speakAfterExecution: true,
    smsMessageType: 'prompt',
    smsContent: '',
    customerMemoryEntries: []
  });

  const [originalData, setOriginalData] = useState<FunctionData | null>(null);
  const [originalIntegrationType, setOriginalIntegrationType] = useState<string>('Custom');
  const [isSaving, setIsSaving] = useState(false);
  const [isAiEnhancing, setIsAiEnhancing] = useState(false);
  const titleInputRef = useRef<HTMLHeadingElement>(null);
  const descriptionInputRef = useRef<HTMLParagraphElement>(null);
  const smsContentRef = useRef<HTMLDivElement>(null);
  const smsPromptRef = useRef<HTMLDivElement>(null);

  // Autocomplete dropdown state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteFilter, setAutocompleteFilter] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [slashStartPosition, setSlashStartPosition] = useState<{ node: Node; offset: number } | null>(null);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);

  // SMS history for undo/redo
  const [smsHistory, setSmsHistory] = useState<string[]>(['']);
  const [smsHistoryIndex, setSmsHistoryIndex] = useState(0);

  // Phone number recipient
  const [phoneRecipient, setPhoneRecipient] = useState('');
  const phoneRecipientRef = useRef<HTMLDivElement>(null);
  const [showPhoneAutocomplete, setShowPhoneAutocomplete] = useState(false);
  const [phoneAutocompletePosition, setPhoneAutocompletePosition] = useState({ top: 0, left: 0 });
  const [phoneSlashStartPosition, setPhoneSlashStartPosition] = useState<{ node: Node; offset: number } | null>(null);
  const [selectedPhoneAutocompleteIndex, setSelectedPhoneAutocompleteIndex] = useState(0);

  // Transfer phone number with chip support
  const [transferPhone, setTransferPhone] = useState('');
  const transferPhoneRef = useRef<HTMLDivElement>(null);
  const [showTransferPhoneAutocomplete, setShowTransferPhoneAutocomplete] = useState(false);
  const [transferPhoneAutocompletePosition, setTransferPhoneAutocompletePosition] = useState({ top: 0, left: 0 });
  const [transferPhoneSlashStartPosition, setTransferPhoneSlashStartPosition] = useState<{ node: Node; offset: number } | null>(null);
  const [selectedTransferPhoneAutocompleteIndex, setSelectedTransferPhoneAutocompleteIndex] = useState(0);

  // Phone number formatter to E.164
  const formatToE164 = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If it starts with country code, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    // If it's a 10-digit US number, add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If it already has more digits (international), just add +
    if (digits.length > 10) {
      return `+${digits}`;
    }

    // Return as-is if too short
    return phone;
  };

  // Test function state
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testParameters, setTestParameters] = useState<Record<string, any>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; data?: any; error?: string} | null>(null);

  // Fetch agent integrations filtered by agent ID
  const { data: agentIntegrations } = useQuery({
    queryKey: ['integrations', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      const response = await fetch(`/api/integrations/custom?agentId=${agentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }
      return response.json();
    },
    enabled: isOpen && (functionName !== null || isCreateMode) && agentId !== null
  });

  // Fetch team members for transfer destination dropdown
  const { data: teamMembersData } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const response = await fetch('/api/team/members', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const data = await response.json();
      return data.members || [];
    },
    enabled: isOpen && (functionName !== null || isCreateMode)
  });

  // Fetch voice agents for transfer destination dropdown
  const { data: voiceAgentsData } = useQuery({
    queryKey: ['/api/voice-agents'],
    queryFn: async () => {
      const response = await fetch('/api/voice-agents', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch voice agents');
      }
      return response.json();
    },
    enabled: isOpen && (functionName !== null || isCreateMode)
  });

  // Fetch available actions for post-call actions dropdown
  const { data: availableActionsData } = useQuery({
    queryKey: ['/api/integrations/retell-functions', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      const response = await fetch(`/api/integrations/retell-functions?agentId=${agentId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch available actions');
      }
      return response.json();
    },
    enabled: isOpen && (functionName !== null || isCreateMode) && agentId !== null
  });

  // Determine function category
  const getFunctionCategory = (name: string): { color: string; label: string; integrationType: string } => {
    // Calendar/Appointment functions - all booking, scheduling, and calendar-related functions
    const appointmentFunctions = [
      'book_appointment', 'cancel_appointment', 'reschedule_appointment', 'modify_appointment',
      'check_current_appointment', 'modify_appointment_details', 'update_appointment',
      'create_reservation', 'modify_reservation', 'book_service', 'book_calendar_event',
      'book_event', 'cancel_session', 'book_session', 'book_class', 'schedule_class',
      'book_showing', 'enroll_student', 'check_calendar_availability', 'check_availability',
      'book_daycare', 'book_training'
    ];

    // CRM functions - customer data, preferences, notes, and records
    const crmFunctions = [
      'get_customer_memory', 'update_customer_memory', 'customer_memory', 'log_feedback',
      'log_inquiry', 'log_emergency', 'update_patient_record', 'manage_membership',
      'update_membership', 'cancel_membership', 'update_pet_record', 'update_client_record',
      'update_student_record', 'add_client_note', 'get_customer_details',
      'update_customer_preferences', 'record_feedback', 'log_customer_request'
    ];

    // POS/Service functions - orders, estimates, service status, procedures
    const posFunctions = [
      'place_order', 'update_service_status', 'request_estimate', 'update_treatment_request',
      'update_service_request', 'update_procedure', 'update_job_status',
      'request_prescription_refill', 'submit_maintenance_request', 'update_lease'
    ];

    // Messaging functions - ALL SMS and messaging-related functions
    const messagingFunctions = [
      'notify_team',
      'sms_order_confirmation',
      'sms_reservation_confirmation',
      'sms_delivery_tracking',
      'sms_appointment_confirmation',
      'sms_modification_alert',
      'sms_catering_confirmation',
      'sms_feedback_confirmation'
    ];

    // Delivery functions
    const deliveryFunctions = ['schedule_delivery'];

    // Call Actions functions (transfer, end call, etc.)
    const callActionFunctions = ['transfer_call', 'end_call'];

    if (appointmentFunctions.includes(name)) return { color: 'bg-blue-400', label: 'Appointment Setting', integrationType: 'Calendar' };
    if (crmFunctions.includes(name)) return { color: 'bg-purple-400', label: 'CRM', integrationType: 'CRM' };
    if (posFunctions.includes(name)) return { color: 'bg-green-400', label: 'Point of Sale', integrationType: 'POS' };
    if (messagingFunctions.includes(name)) return { color: 'bg-orange-400', label: 'Messaging', integrationType: 'Messaging' };
    if (deliveryFunctions.includes(name)) return { color: 'bg-yellow-400', label: 'Delivery', integrationType: 'Delivery' };
    if (callActionFunctions.includes(name)) return { color: 'bg-cyan-400', label: 'Call Actions', integrationType: 'CallActions' };
    return { color: 'bg-yellow-400', label: 'Custom Integration', integrationType: 'Custom' };
  };

  // Map function names to integration types using category
  const getFunctionIntegrationType = (funcName: string): string => {
    const category = getFunctionCategory(funcName);
    return category.integrationType;
  };

  // Initialize function data when panel opens
  useEffect(() => {
    if (isOpen && functionName && agentId) {
      // Find function from retellFunctionsConfig
      const allFunctions = [
        ...Object.values(RETELL_FUNCTIONS_BY_INDUSTRY).flatMap(config => config.functions),
        ...BUILT_IN_RETELL_FUNCTIONS
      ];
      
      const functionConfig = allFunctions.find(fn => fn.name === functionName);
      
      if (functionConfig) {
        // Convert parameters from retellFunctionsConfig format to FunctionData format
        const parametersArray: Parameter[] = functionConfig.parameters?.properties
          ? Object.entries(functionConfig.parameters.properties).map(([key, value]: [string, any], index) => ({
              id: `param-${index}`,
              name: key,
              description: value.description || '',
              type: value.type || 'string',
              arrayItemType: value.items?.type,
              required: functionConfig.parameters?.required?.includes(key) || false,
              displayType: value.type === 'number' ? 'number' : 'text' // Default display type
            }))
          : [];

        // Determine the integration type for this function and store it
        const integrationType = getFunctionIntegrationType(functionConfig.name);
        setOriginalIntegrationType(integrationType);

        // Filter integrations by type and get the most recent one
        let defaultIntegrationId: string | null = null;
        if (integrationType && agentIntegrations) {
          const allTemplates = getAllTemplates();
          const matchingIntegrations = agentIntegrations
            .filter((integration: any) => {
              // Exact match
              if (integration.type === integrationType) return true;

              // For Messaging functions, match any integration with 'messaging' in the type
              // This includes 'sms_messaging', 'Messaging', 'telegram_messaging', etc.
              if (integrationType === 'Messaging' &&
                  integration.type?.toLowerCase().includes('messaging')) {
                return true;
              }

              // For CRM functions, match integrations with CRM category
              // This includes 'contact_memory' and other CRM-type integrations
              if (integrationType === 'CRM') {
                const integrationTemplate = allTemplates.find(t => t.id === integration.type);
                if (integrationTemplate?.category === 'crm') {
                  return true;
                }
              }

              return false;
            })
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          if (matchingIntegrations.length > 0) {
            defaultIntegrationId = matchingIntegrations[0].id;
          }
        }

        // Fetch saved SMS settings and category from database
        const fetchSmsSettings = async () => {
          try {
            const response = await fetch(`/api/agents/${agentId}/functions/${functionName}/sms-settings`, {
              credentials: 'include'
            });
            if (response.ok) {
              const data = await response.json();

              // Migration logic: use new field, fallback to converting old field
              let integrationIds = data.selectedIntegrationIds || [];
              if (integrationIds.length === 0 && data.selectedIntegrationId) {
                integrationIds = [data.selectedIntegrationId];
              }

              return {
                smsMessageType: data.smsMessageType || 'prompt',
                smsContent: data.smsContent || '',
                category: data.category || null,
                recipientPhone: data.recipientPhone || '',
                useCallerPhoneByDefault: data.useCallerPhoneByDefault || false,
                selectedIntegrationId: data.selectedIntegrationId || null, // DEPRECATED
                selectedIntegrationIds: integrationIds, // NEW
                displayTitle: data.displayTitle || null,
                verboseDescription: data.verboseDescription || null,
                callActionType: data.callActionType || null,
                transferPhoneNumber: data.transferPhoneNumber || null,
                transferDestinationType: data.transferDestinationType || null,
                transferTeamMember: data.transferTeamMember || null,
                transferVoicebot: data.transferVoicebot || null,
                transferType: data.transferType || null,
                postCallActions: data.postCallActions || []
              };
            }
          } catch (error) {
            console.error('Error fetching SMS settings:', error);
          }
          return { smsMessageType: 'prompt' as const, smsContent: '', category: null, recipientPhone: '', useCallerPhoneByDefault: false, selectedIntegrationId: null, selectedIntegrationIds: [], displayTitle: null, verboseDescription: null, callActionType: null, transferPhoneNumber: null, transferDestinationType: null, transferTeamMember: null, transferVoicebot: null, transferType: null, postCallActions: [] };
        };

        // Fetch current function data from Retell AI to get saved changes
        const fetchRetellFunction = async () => {
          try {
            const response = await fetch(`/api/agents/${agentId}/functions/${functionName}/current`, {
              credentials: 'include'
            });
            if (response.ok) {
              const data = await response.json();

              // Convert Retell AI parameters (JSON Schema) to internal Parameter[] format
              let savedParameters: Parameter[] = [];
              if (data.parameters?.properties) {
                savedParameters = Object.entries(data.parameters.properties).map(([key, value]: [string, any], index) => ({
                  id: `param-${index}`,
                  name: key,
                  description: value.description || '',
                  type: value.type || 'string',
                  arrayItemType: value.items?.type,
                  required: data.parameters?.required?.includes(key) || false,
                  displayType: value.type === 'number' ? 'number' : 'text'
                }));
              }

              return {
                description: data.description || functionConfig.description || '',
                speakDuringExecution: data.speakDuringExecution ?? true,
                speakDuringText: data.speakDuringText || 'Let me check that for you.',
                speakAfterExecution: data.speakAfterExecution ?? true,
                parameters: savedParameters.length > 0 ? savedParameters : null
              };
            }
          } catch (error) {
            console.error('Error fetching function from Retell AI:', error);
          }
          // Fallback to static config
          return {
            description: functionConfig.description || '',
            speakDuringExecution: true,
            speakDuringText: 'Let me check that for you.',
            speakAfterExecution: true,
            parameters: null
          };
        };

        // Load both SMS settings and Retell function data
        Promise.all([fetchSmsSettings(), fetchRetellFunction()]).then(([smsSettings, retellData]) => {
          // If we have a saved category, use it to override the derived integrationType
          if (smsSettings.category) {
            // Map the saved category to an integration type
            const categoryToIntegration: Record<string, string> = {
              appointmentSetting: 'Calendar',
              crm: 'CRM',
              pointOfSale: 'POS',
              messaging: 'Messaging',
              callActions: 'CallActions',
              customIntegration: 'Custom',
              custom: 'Custom'
            };
            const savedIntegrationType = categoryToIntegration[smsSettings.category] || integrationType;
            setOriginalIntegrationType(savedIntegrationType);

            // Re-filter integrations with the correct type
            if (agentIntegrations) {
              const allTemplates = getAllTemplates();
              const matchingIntegrations = agentIntegrations
                .filter((integration: any) => {
                  // Exact match
                  if (integration.type === savedIntegrationType) return true;

                  // For Messaging functions, match any integration with 'messaging' in the type
                  if (savedIntegrationType === 'Messaging' &&
                      integration.type?.toLowerCase().includes('messaging')) {
                    return true;
                  }

                  // For CRM functions, match integrations with CRM category
                  // This includes 'contact_memory' and other CRM-type integrations
                  if (savedIntegrationType === 'CRM') {
                    const integrationTemplate = allTemplates.find(t => t.id === integration.type);
                    if (integrationTemplate?.category === 'crm') {
                      return true;
                    }
                  }

                  return false;
                })
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

              if (matchingIntegrations.length > 0) {
                defaultIntegrationId = matchingIntegrations[0].id;
              }
            }
          }

          // Derive a clean title for display:
          // Priority: saved displayTitle > Retell description (if customized) > formatted name
          const formattedName = (functionConfig.name || functionName)
            .split('_')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          const isDefaultVerbose = retellData.description === functionConfig.description;
          const retellTitle = (retellData.description && !isDefaultVerbose) ? retellData.description : formattedName;
          const displayTitle = (smsSettings as any).displayTitle || retellTitle;

          // Use parameters from Retell AI if available, otherwise fall back to static config
          const finalParameters = retellData.parameters || parametersArray;

          // For description: use saved verboseDescription if available, otherwise use the config description
          const verboseDesc = (smsSettings as any).verboseDescription || functionConfig.description || '';

          const initialData = {
            name: displayTitle,
            description: verboseDesc, // Verbose description explaining what the function does
            selectedIntegrationId: (smsSettings as any).selectedIntegrationId || defaultIntegrationId,
            selectedIntegrationIds: (smsSettings as any).selectedIntegrationIds || (defaultIntegrationId ? [defaultIntegrationId] : []),
            parameters: finalParameters,
            enabled: true,
            speakDuringExecution: retellData.speakDuringExecution,
            speakDuringText: retellData.speakDuringText,
            speakAfterExecution: retellData.speakAfterExecution,
            smsMessageType: smsSettings.smsMessageType as 'static' | 'prompt',
            smsContent: smsSettings.smsContent,
            recipientPhone: (smsSettings as any).recipientPhone || '',
            useCallerPhoneByDefault: (smsSettings as any).useCallerPhoneByDefault === true,
            callActionType: (smsSettings as any).callActionType as 'transfer' | 'end' | 'hold' | 'post_call_actions' | undefined,
            transferPhoneNumber: (smsSettings as any).transferPhoneNumber || '',
            transferDestinationType: (smsSettings as any).transferDestinationType || 'specific_number',
            transferTeamMember: (smsSettings as any).transferTeamMember || '',
            transferVoicebot: (smsSettings as any).transferVoicebot || '',
            transferType: (smsSettings as any).transferType || 'cold',
            postCallActions: (smsSettings as any).postCallActions || []
          };

          console.log('📥 Loading function data - useCallerPhoneByDefault:', initialData.useCallerPhoneByDefault);
          setFunctionData(initialData);
          setOriginalData(initialData);

          // Populate phone recipient state — the ref is populated by the phoneRecipient useEffect below
          if ((smsSettings as any).recipientPhone) {
            setPhoneRecipient((smsSettings as any).recipientPhone);
          }

          // Populate transfer phone state — the ref is populated by the transferPhone useEffect below
          if ((smsSettings as any).transferPhoneNumber) {
            setTransferPhone((smsSettings as any).transferPhoneNumber);
          }
        });
      } else {
        // User-created custom function (not in static config) — still load from API
        const categoryToIntegration: Record<string, string> = {
          appointmentSetting: 'Calendar',
          crm: 'CRM',
          pointOfSale: 'POS',
          messaging: 'Messaging',
          callActions: 'CallActions',
          customIntegration: 'Custom',
          custom: 'Custom'
        };

        const fetchSmsSettings = async () => {
          try {
            const response = await fetch(`/api/agents/${agentId}/functions/${functionName}/sms-settings`, { credentials: 'include' });
            if (response.ok) {
              const data = await response.json();

              // Migration logic: use new field, fallback to converting old field
              let integrationIds = data.selectedIntegrationIds || [];
              if (integrationIds.length === 0 && data.selectedIntegrationId) {
                integrationIds = [data.selectedIntegrationId];
              }

              return {
                smsMessageType: (data.smsMessageType || 'prompt') as 'static' | 'prompt',
                smsContent: data.smsContent || '',
                category: data.category || null,
                recipientPhone: data.recipientPhone || '',
                useCallerPhoneByDefault: data.useCallerPhoneByDefault || false,
                selectedIntegrationId: data.selectedIntegrationId || null, // DEPRECATED
                selectedIntegrationIds: integrationIds, // NEW
                displayTitle: data.displayTitle || null,
                verboseDescription: data.verboseDescription || null,
                callActionType: data.callActionType || null,
                transferPhoneNumber: data.transferPhoneNumber || null,
                transferDestinationType: data.transferDestinationType || null,
                transferTeamMember: data.transferTeamMember || null,
                transferVoicebot: data.transferVoicebot || null,
                transferType: data.transferType || null,
                postCallActions: data.postCallActions || []
              };
            }
          } catch (e) { console.error('Error fetching SMS settings for custom function:', e); }
          return { smsMessageType: 'prompt' as const, smsContent: '', category: null, recipientPhone: '', useCallerPhoneByDefault: false, selectedIntegrationId: null, selectedIntegrationIds: [], displayTitle: null, verboseDescription: null, callActionType: null, transferPhoneNumber: null, transferDestinationType: null, transferTeamMember: null, transferVoicebot: null, transferType: null, postCallActions: [] };
        };

        const fetchRetellFunction = async () => {
          try {
            const response = await fetch(`/api/agents/${agentId}/functions/${functionName}/current`, { credentials: 'include' });
            if (response.ok) {
              const data = await response.json();
              let savedParameters: Parameter[] = [];
              if (data.parameters?.properties) {
                savedParameters = Object.entries(data.parameters.properties).map(([key, value]: [string, any], index) => ({
                  id: `param-${index}`,
                  name: key,
                  description: value.description || '',
                  type: value.type || 'string',
                  arrayItemType: value.items?.type,
                  required: data.parameters?.required?.includes(key) || false,
                  displayType: value.type === 'number' ? 'number' : 'text'
                }));
              }
              return {
                description: data.description || '',
                speakDuringExecution: data.speakDuringExecution ?? true,
                speakDuringText: data.speakDuringText || 'Let me check that for you.',
                speakAfterExecution: data.speakAfterExecution ?? true,
                parameters: savedParameters.length > 0 ? savedParameters : []
              };
            }
          } catch (e) { console.error('Error fetching Retell function for custom function:', e); }
          return { description: '', speakDuringExecution: true, speakDuringText: '', speakAfterExecution: true, parameters: [] };
        };

        Promise.all([fetchSmsSettings(), fetchRetellFunction()]).then(([smsSettings, retellData]) => {
          const savedCategory = smsSettings.category;
          const integrationType = savedCategory ? (categoryToIntegration[savedCategory] || 'Custom') : 'Custom';
          setOriginalIntegrationType(integrationType);

          // Pick matching integration
          let defaultIntegrationId = smsSettings.selectedIntegrationId;
          if (!defaultIntegrationId && agentIntegrations) {
            const allTemplates = getAllTemplates();
            const matching = agentIntegrations
              .filter((i: any) => {
                if (i.type === integrationType) return true;
                if (integrationType === 'Messaging' && i.type?.toLowerCase().includes('messaging')) return true;
                if (integrationType === 'CRM') {
                  const template = allTemplates.find(t => t.id === i.type);
                  if (template?.category === 'crm') return true;
                }
                return false;
              })
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (matching.length > 0) defaultIntegrationId = matching[0].id;
          }

          // Use the saved displayTitle (highest priority), then Retell AI description, then format the function name
          // This preserves the original title with spaces for user-created functions
          const displayTitle = (smsSettings as any).displayTitle || retellData.description || functionName!.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

          // For description: ONLY use verboseDescription, never fall back to retellData.description
          // This keeps title and description completely independent
          const verboseDesc = (smsSettings as any).verboseDescription || '';

          console.log('📥 === LOADING USER-CREATED FUNCTION ===');
          console.log('📥 Function Name:', functionName);
          console.log('📥 Saved Display Title:', (smsSettings as any).displayTitle);
          console.log('📥 Saved Verbose Description:', (smsSettings as any).verboseDescription);
          console.log('📥 Retell AI Description:', retellData.description);
          console.log('📥 Final Title to Display:', displayTitle);
          console.log('📥 Final Description to Display:', verboseDesc);

          const initialData: FunctionData = {
            name: displayTitle,
            description: verboseDesc,
            selectedIntegrationId: defaultIntegrationId,
            selectedIntegrationIds: (smsSettings as any).selectedIntegrationIds || (defaultIntegrationId ? [defaultIntegrationId] : []),
            parameters: retellData.parameters,
            enabled: true,
            speakDuringExecution: retellData.speakDuringExecution,
            speakDuringText: retellData.speakDuringText,
            speakAfterExecution: retellData.speakAfterExecution,
            smsMessageType: smsSettings.smsMessageType,
            smsContent: smsSettings.smsContent,
            recipientPhone: smsSettings.recipientPhone,
            useCallerPhoneByDefault: (smsSettings as any).useCallerPhoneByDefault === true,
            callActionType: (smsSettings as any).callActionType as 'transfer' | 'end' | 'hold' | 'post_call_actions' | undefined,
            transferPhoneNumber: (smsSettings as any).transferPhoneNumber || '',
            transferDestinationType: (smsSettings as any).transferDestinationType || 'specific_number',
            transferTeamMember: (smsSettings as any).transferTeamMember || '',
            transferVoicebot: (smsSettings as any).transferVoicebot || '',
            transferType: (smsSettings as any).transferType || 'cold',
            postCallActions: (smsSettings as any).postCallActions || []
          };

          console.log('📥 Loading function data - useCallerPhoneByDefault:', initialData.useCallerPhoneByDefault);
          setFunctionData(initialData);
          setOriginalData(initialData);

          // Populate phone recipient state — the ref is populated by the phoneRecipient useEffect below
          if (smsSettings.recipientPhone) {
            setPhoneRecipient(smsSettings.recipientPhone);
          }

          // Populate transfer phone state — the ref is populated by the transferPhone useEffect below
          if ((smsSettings as any).transferPhoneNumber) {
            setTransferPhone((smsSettings as any).transferPhoneNumber);
          }
        });
      }
    }
  }, [isOpen, functionName, agentIntegrations, agentId]);

  // Initialize blank state when opening in create mode
  useEffect(() => {
    if (isOpen && isCreateMode && agentId) {
      // Map the category key to an integration type for the integrations slider
      const categoryToIntegration: Record<string, string> = {
        appointmentSetting: 'Calendar',
        crm: 'CRM',
        pointOfSale: 'POS',
        messaging: 'Messaging',
        callActions: 'CallActions',
        customIntegration: 'Custom',
        custom: 'Custom'
      };
      const integrationType = initialCategory ? (categoryToIntegration[initialCategory] || 'Custom') : 'Custom';
      setOriginalIntegrationType(integrationType);

      // Pick the most recent matching integration as the default selection
      let defaultIntegrationId = null;
      if (agentIntegrations) {
        const allTemplates = getAllTemplates();
        const matching = agentIntegrations
          .filter((i: any) => {
            if (i.type === integrationType) return true;
            if (integrationType === 'Messaging' && i.type?.toLowerCase().includes('messaging')) return true;
            if (integrationType === 'CRM') {
              const template = allTemplates.find(t => t.id === i.type);
              if (template?.category === 'crm') return true;
            }
            return false;
          })
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (matching.length > 0) defaultIntegrationId = matching[0].id;
      }

      // Check if a native action template is selected
      let initialData: FunctionData;

      if (nativeActionKey) {
        // Initialize with native action template
        const template = getNativeActionTemplate(nativeActionKey);

        if (template) {
          // Get industry-specific overrides (param descriptions, extra params, SMS content)
          const industryOverride = getIndustryActionOverride(nativeActionKey, industry, businessLocations);

          // Convert template parameters to FunctionData parameters format,
          // applying any industry-specific description overrides
          const templateParameters: Parameter[] = template.parameters.map((param, index) => {
            const descOverride = industryOverride?.parameterOverrides?.[param.name];
            return {
              id: `param-${index}`,
              name: param.name,
              description: descOverride?.description ?? param.description,
              type: param.type,
              arrayItemType: param.arrayItemType,
              required: descOverride?.required ?? param.required,
              displayType: param.displayType || 'text'
            };
          });

          // Append any industry-specific extra parameters
          const extraParams: Parameter[] = (industryOverride?.extraParameters || []).map((p, i) => ({
            id: `param-extra-${i}`,
            name: p.name,
            description: p.description,
            type: p.type,
            required: p.required,
            displayType: p.displayType || 'text'
          }));

          const finalParameters = [...templateParameters, ...extraParams];
          const finalSmsContent = industryOverride?.smsContent ?? template.smsContent ?? '';
          const finalSpeakText = industryOverride?.speakDuringText ?? template.speakDuringText ?? 'Let me take care of that for you.';

          initialData = {
            name: template.displayTitle,
            description: template.description,
            selectedIntegrationId: defaultIntegrationId,
            selectedIntegrationIds: defaultIntegrationId ? [defaultIntegrationId] : [],
            parameters: finalParameters,
            enabled: true,
            speakDuringExecution: template.speakDuringExecution ?? false,
            speakDuringText: finalSpeakText,
            speakAfterExecution: template.speakAfterExecution ?? true,
            smsMessageType: template.smsMessageType || 'prompt',
            smsContent: finalSmsContent,
            recipientPhone: template.recipientPhone || '',
            useCallerPhoneByDefault: false,
            callActionType: template.callActionType,
            transferPhoneNumber: template.transferPhoneNumber || '',
            transferDestinationType: 'specific_number',
            transferTeamMember: '',
            transferVoicebot: '',
            transferType: 'cold',
            postCallActions: template.postCallActions || [],
            category: initialCategory
          };

          // Populate contentEditable refs with template data
          setTimeout(() => {
            if (titleInputRef.current) titleInputRef.current.innerText = template.displayTitle;
            if (descriptionInputRef.current) descriptionInputRef.current.innerText = template.description;
            if (smsContentRef.current && finalSmsContent) {
              smsContentRef.current.innerHTML = DOMPurify.sanitize(finalSmsContent);
            }
            if (phoneRecipientRef.current && template.recipientPhone) {
              setPhoneRecipient(template.recipientPhone);
              // Render any {{parameter}} placeholders as colored chips
              const phoneHtml = renderSmsContentAsChips(template.recipientPhone);
              phoneRecipientRef.current.innerHTML = DOMPurify.sanitize(phoneHtml, {
                ADD_ATTR: ['class', 'contenteditable', 'data-param', 'title']
              });
            }
            if (transferPhoneRef.current && template.transferPhoneNumber) {
              setTransferPhone(template.transferPhoneNumber);
              // Render any {{parameter}} placeholders as colored chips
              const transferHtml = renderSmsContentAsChips(template.transferPhoneNumber);
              transferPhoneRef.current.innerHTML = DOMPurify.sanitize(transferHtml, {
                ADD_ATTR: ['class', 'contenteditable', 'data-param', 'title']
              });
            }
          }, 0);
        } else {
          // Template not found, use blank data
          initialData = {
            name: '',
            description: '',
            selectedIntegrationId: defaultIntegrationId,
            selectedIntegrationIds: defaultIntegrationId ? [defaultIntegrationId] : [],
            parameters: [],
            enabled: true,
            speakDuringExecution: false,
            speakDuringText: 'Let me take care of that for you.',
            speakAfterExecution: true,
            smsMessageType: 'prompt',
            smsContent: '',
            useCallerPhoneByDefault: false,
            category: initialCategory,
            // Set default callActionType for Call Actions
            callActionType: initialCategory === 'callActions' ? 'transfer' : undefined,
            transferPhoneNumber: initialCategory === 'callActions' ? '' : undefined,
            transferDestinationType: initialCategory === 'callActions' ? 'specific_number' : undefined,
            transferTeamMember: initialCategory === 'callActions' ? '' : undefined,
            transferVoicebot: initialCategory === 'callActions' ? '' : undefined,
            transferType: initialCategory === 'callActions' ? 'cold' : undefined
          };
        }
      } else {
        // No native action selected, use blank data
        initialData = {
          name: '',
          description: '',
          selectedIntegrationId: defaultIntegrationId,
          selectedIntegrationIds: defaultIntegrationId ? [defaultIntegrationId] : [],
          parameters: [],
          enabled: true,
          speakDuringExecution: false,
          speakDuringText: 'Let me take care of that for you.',
          speakAfterExecution: true,
          smsMessageType: 'prompt',
          smsContent: '',
          category: initialCategory,
          // Set default callActionType for Call Actions
          callActionType: initialCategory === 'callActions' ? 'transfer' : undefined,
          transferPhoneNumber: initialCategory === 'callActions' ? '' : undefined,
          transferDestinationType: initialCategory === 'callActions' ? 'specific_number' : undefined,
          transferTeamMember: initialCategory === 'callActions' ? '' : undefined,
          transferVoicebot: initialCategory === 'callActions' ? '' : undefined,
          transferType: initialCategory === 'callActions' ? 'cold' : undefined
        };

        // Clear contentEditable refs so they start empty
        setTimeout(() => {
          if (titleInputRef.current) titleInputRef.current.innerText = '';
          if (descriptionInputRef.current) descriptionInputRef.current.innerText = '';
        }, 0);
      }

      setFunctionData(initialData);
      setOriginalData(initialData);
    }
  }, [isOpen, isCreateMode, initialCategory, nativeActionKey, agentIntegrations, agentId, industry, businessLocations]);

  // Check if data has changed
  const hasChanges = originalData ? JSON.stringify(functionData) !== JSON.stringify(originalData) : false;

  // AI-powered type inference based ONLY on name (not description)
  const inferParameterType = (name: string): { type: 'string' | 'number'; displayType: 'text' | 'number' | 'date' | 'time' } => {
    const nameLower = name.toLowerCase();

    // Number patterns (check in parameter name only)
    const numberPatterns = ['amount', 'price', 'cost', 'total', 'quantity', 'count', 'number_of', 'num_', 'age', 'duration', 'radius', 'distance'];
    if (numberPatterns.some(pattern => nameLower.includes(pattern)) || /\b(number|quantity|count|amount|price|cost|total|numeric)\b/.test(nameLower)) {
      return { type: 'number', displayType: 'number' };
    }

    // Date patterns (check in parameter name only)
    const datePatterns = ['date', '_date', 'day', 'birthday', 'dob', 'scheduled', 'appointment_date'];
    if (datePatterns.some(pattern => nameLower.includes(pattern)) || /\b(date|day|birthday|scheduled)\b/.test(nameLower)) {
      return { type: 'string', displayType: 'date' };
    }

    // Time patterns (check in parameter name only)
    const timePatterns = ['time', '_time', 'hour', 'appointment_time', 'scheduled_time', 'pickup_time', 'delivery_time'];
    if (timePatterns.some(pattern => nameLower.includes(pattern)) || /\b(time|hour)\b/.test(nameLower)) {
      return { type: 'string', displayType: 'time' };
    }

    // Default to text
    return { type: 'string', displayType: 'text' };
  };

  // Get color for parameter based on action type category
  const getParameterColor = (paramName: string): string => {
    const nameLower = paramName.toLowerCase();

    // Built-in parameters with specific colors
    if (nameLower === 'caller phone' || nameLower === 'caller_phone') return 'cyan-400'; // Call Actions color

    // Map parameter names to colors based on action type
    if (category?.color === 'bg-blue-400') return 'blue-400'; // Appointment Setting
    if (category?.color === 'bg-purple-400') return 'purple-400'; // CRM
    if (category?.color === 'bg-green-400') return 'green-400'; // Point of Sale
    if (category?.color === 'bg-orange-400') return 'orange-400'; // Messaging
    if (category?.color === 'bg-cyan-400') return 'cyan-400'; // Call Actions

    return 'yellow-400'; // Default/Custom
  };

  // Convert innerHTML from smsContentRef into clean template text with {{param}} placeholders
  const extractTemplateText = (html: string): string => {
    let text = html;
    // Convert <br> variants to newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Convert <span data-param="X">...</span> → {{X}}
    text = text.replace(/<span[^>]*data-param="([^"]+)"[^>]*>[\s\S]*?<\/span>/gi, '{{$1}}');
    // Strip all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return text;
  };

  // Render stored smsContent (which may have {{param}} placeholders) as chip HTML
  const renderSmsContentAsChips = (content: string): string => {
    if (!content) return '';

    // Always match ALL {{...}} patterns, even if they're not in the parameters list
    // This ensures saved content always displays as colored chips, never as raw {{}} brackets
    const regex = /\{\{([^}]+)\}\}/g;

    let lastIndex = 0;
    let result = '';
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add the text before this placeholder (escaped)
      const textBefore = content.substring(lastIndex, match.index);
      result += textBefore
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

      // Add the placeholder as a colored chip
      const paramName = match[1].trim();
      const displayName = paramName.replace(/_/g, ' ');
      const color = getParameterColor(paramName);

      result += `<span contenteditable="false" class="text-${color} font-semibold cursor-pointer hover:underline" data-param="${paramName}" title="Required Detail: ${displayName}">${displayName}</span>`;

      lastIndex = regex.lastIndex;
    }

    // Add any remaining text after the last placeholder (escaped)
    const textAfter = content.substring(lastIndex);
    result += textAfter
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    return result;
  };

  const addParameter = () => {
    const newParam: Parameter = {
      id: `param-${Date.now()}`,
      name: '',
      description: '',
      type: 'string',
      required: false,
      displayType: 'text'
    };
    setFunctionData(prev => ({
      ...prev,
      parameters: [...prev.parameters, newParam]
    }));
  };

  const removeParameter = (id: string) => {
    setFunctionData(prev => ({
      ...prev,
      parameters: prev.parameters.filter(p => p.id !== id)
    }));
  };

  const updateParameter = (id: string, updates: Partial<Parameter>) => {
    setFunctionData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  // Customer Memory Entry handlers
  const addCustomerMemoryEntry = () => {
    const newEntry: CustomerMemoryEntry = {
      id: `memory-${Date.now()}`,
      name: '',
      description: '',
      memory: ''
    };
    setFunctionData(prev => ({
      ...prev,
      customerMemoryEntries: [...(prev.customerMemoryEntries || []), newEntry]
    }));
  };

  const removeCustomerMemoryEntry = (id: string) => {
    setFunctionData(prev => ({
      ...prev,
      customerMemoryEntries: (prev.customerMemoryEntries || []).filter(e => e.id !== id)
    }));
  };

  const updateCustomerMemoryEntry = (id: string, updates: Partial<CustomerMemoryEntry>) => {
    setFunctionData(prev => ({
      ...prev,
      customerMemoryEntries: (prev.customerMemoryEntries || []).map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const hasParams = functionData.parameters.some(p => p.name);
    if (hasParams || isCreateMode) {
      setIsAiEnhancing(true);
    }
    try {
      console.log('🔵 ============ SAVE STARTED ============');
      console.log('🔵 handleSave called for function:', functionName);

      // Debug refs
      console.log('🔵 Ref Status:', {
        titleRef: titleInputRef.current ? 'exists' : 'null',
        descriptionRef: descriptionInputRef.current ? 'exists' : 'null',
        smsContentRef: smsContentRef.current ? 'exists' : 'null',
        smsPromptRef: smsPromptRef.current ? 'exists' : 'null'
      });

      // Read from refs with detailed logging
      const titleFromRef = titleInputRef.current?.innerText;
      const descriptionFromRef = descriptionInputRef.current?.innerText;

      console.log('🔵 Values from refs:', {
        titleFromRef,
        descriptionFromRef,
        titleRefLength: titleFromRef?.length || 0,
        descriptionRefLength: descriptionFromRef?.length || 0
      });

      // Get final values
      // Use ?? (nullish coalescing) to allow empty strings (user can intentionally clear fields)
      const currentName = titleFromRef ?? functionData.name;
      const currentDescription = descriptionFromRef ?? functionData.description;

      // Get SMS content from refs based on current message type
      // Use extractTemplateText (reads innerHTML) so {{param}} placeholders are stored, not display names
      let currentSmsContent = functionData.smsContent;
      if ((functionData.smsMessageType === 'static' || functionData.smsMessageType === 'prompt') && smsContentRef.current) {
        const smsFromRef = extractTemplateText(smsContentRef.current.innerHTML);
        console.log('🔵 SMS from ref (template):', smsFromRef, 'length:', smsFromRef?.length || 0);
        currentSmsContent = smsFromRef || functionData.smsContent || '';
      }

      // Read phone recipient from its ref and extract template text (convert chips back to {{param}} format)
      const recipientPhoneHTML = phoneRecipientRef.current?.innerHTML || phoneRecipient || '';
      const currentRecipientPhone = recipientPhoneHTML ? extractTemplateText(recipientPhoneHTML) : '';
      console.log('🔵 Recipient phone from ref (extracted):', currentRecipientPhone);

      // Read transfer phone from its ref and extract template text (convert chips back to {{param}} format)
      const transferPhoneHTML = transferPhoneRef.current?.innerHTML || transferPhone || '';
      const currentTransferPhone = transferPhoneHTML ? extractTemplateText(transferPhoneHTML) : '';
      console.log('🔵 Transfer phone from ref (extracted):', currentTransferPhone);

      console.log('🔵 functionData.parameters:', JSON.stringify(functionData.parameters, null, 2));

      const updatedFunctionData = {
        ...functionData,
        name: currentName,
        description: currentDescription,
        smsContent: currentSmsContent,
        recipientPhone: currentRecipientPhone,
        transferPhoneNumber: currentTransferPhone,
        // Ensure array field is always set
        selectedIntegrationIds: functionData.selectedIntegrationIds || []
      };

      console.log('🔵 Updated function data:', JSON.stringify({
        name: updatedFunctionData.name,
        description: updatedFunctionData.description,
        parameters: updatedFunctionData.parameters,
        speakDuringExecution: updatedFunctionData.speakDuringExecution,
        speakDuringText: updatedFunctionData.speakDuringText,
        speakAfterExecution: updatedFunctionData.speakAfterExecution,
        smsMessageType: updatedFunctionData.smsMessageType,
        smsContent: updatedFunctionData.smsContent,
        selectedIntegrationIds: updatedFunctionData.selectedIntegrationIds
      }, null, 2));

      // Build the payload differently for create vs. edit mode
      let dataToSave: FunctionData;

      if (isCreateMode) {
        // Create mode: title is the user's chosen action title, description is the AI prompt
        if (!currentName.trim()) {
          throw new Error('Please enter an action title');
        }
        if (!currentDescription.trim()) {
          throw new Error('Please enter a description so the AI can build the action');
        }

        console.log('🎯 FunctionEditorPanel - Creating action with category:', initialCategory);

        dataToSave = {
          ...updatedFunctionData,
          name: currentName,        // Title → used as display name and to derive snake_case name
          description: currentDescription, // Description → AI prompt for schema generation
          isCreate: true,
          category: initialCategory // Send as 'category' so backend can read it
        };

        console.log('🎯 FunctionEditorPanel - dataToSave:', dataToSave);
      } else {
        // Edit mode: original function name is the immutable identifier
        if (!functionName) {
          throw new Error('Function name is required');
        }
        dataToSave = {
          ...updatedFunctionData,
          name: functionName,           // Keep original snake_case name as identifier
          displayTitle: currentName,    // The edited title (preserves spaces)
          verboseDescription: currentDescription  // The edited description
        };
      }

      console.log('🔵 === SAVE STARTED ===');
      console.log('🔵 Current Name (Title):', currentName);
      console.log('🔵 Current Description:', currentDescription);
      console.log('🔵 Data being sent to onSave:', JSON.stringify(dataToSave, null, 2));

      await onSave(dataToSave);

      console.log('✅ === SAVE COMPLETED SUCCESSFULLY ===');
      console.log('✅ Saved Title:', dataToSave.displayTitle || dataToSave.name);
      console.log('✅ Saved Description:', dataToSave.verboseDescription || dataToSave.description);

      onClose();
    } catch (error) {
      console.error('❌ Failed to save function:', error);
      // Don't throw - let the error be handled by the parent's toast
    } finally {
      setIsSaving(false);
      setIsAiEnhancing(false);
    }
  };

  // Convert form parameters to JSON Schema
  const generateJsonSchema = () => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    functionData.parameters.forEach(param => {
      if (!param.name) return;

      let paramSchema: any = {
        type: param.type,
        description: param.description
      };

      if (param.type === 'array' && param.arrayItemType) {
        paramSchema.items = { type: param.arrayItemType };
      }

      properties[param.name] = paramSchema;

      if (param.required) {
        required.push(param.name);
      }
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  };

  const rawCategory = functionName ? getFunctionCategory(functionName) : null;
  // For user-created functions (returns 'Custom'), override with the DB-stored integration type
  const category = (() => {
    if (!rawCategory || rawCategory.integrationType !== 'Custom') return rawCategory;
    switch (originalIntegrationType) {
      case 'Messaging': return { color: 'bg-orange-400', label: 'Messaging', integrationType: 'Messaging' };
      case 'Calendar': return { color: 'bg-blue-400', label: 'Appointment Setting', integrationType: 'Calendar' };
      case 'CRM': return { color: 'bg-purple-400', label: 'CRM', integrationType: 'CRM' };
      case 'POS': return { color: 'bg-green-400', label: 'Point of Sale', integrationType: 'POS' };
      case 'CallActions': return { color: 'bg-cyan-400', label: 'Call Actions', integrationType: 'CallActions' };
      default: return rawCategory;
    }
  })();

  // Initialize contentEditable fields when data is loaded, but prevent updates during active editing
  useEffect(() => {
    if (titleInputRef.current && originalData) {
      // Only update if the element is not currently focused (not being edited)
      if (document.activeElement !== titleInputRef.current) {
        const titleValue = functionData.name || '';
        titleInputRef.current.innerText = titleValue;
        console.log('📝 Title field populated with:', titleValue);
      }
    }
  }, [originalData, functionName]); // Run when data is loaded or function changes

  useEffect(() => {
    if (descriptionInputRef.current && originalData) {
      // Only update if the element is not currently focused (not being edited)
      if (document.activeElement !== descriptionInputRef.current) {
        const descValue = functionData.description || '';
        descriptionInputRef.current.innerText = descValue;
        console.log('📝 Description field populated with:', descValue);
      }
    }
  }, [originalData, functionName]); // Run when data is loaded or function changes

  useEffect(() => {
    if (smsContentRef.current && (functionData.smsMessageType === 'static' || functionData.smsMessageType === 'prompt') && originalData) {
      // Only update if not currently focused (not being edited)
      if (document.activeElement !== smsContentRef.current) {
        const formattedHTML = renderSmsContentAsChips(functionData.smsContent || '');
        // Configure DOMPurify to preserve class attributes for colored chips
        smsContentRef.current.innerHTML = DOMPurify.sanitize(formattedHTML, {
          ADD_ATTR: ['class', 'contenteditable', 'data-param', 'title']
        });
      }
    }
  }, [originalData, functionName, functionData.smsMessageType, functionData.smsContent, functionData.parameters]); // Update when data loads or changes

  // Handle "/" autocomplete in SMS content
  const handleSmsInput = (e: React.FormEvent<HTMLDivElement>) => {
    // Use innerText to preserve plain text content
    const newContent = e.currentTarget.innerText || '';
    setFunctionData(prev => ({ ...prev, smsContent: newContent }));

    // Track history for undo/redo
    if (smsHistory.length === 0 || smsHistory[smsHistory.length - 1] !== newContent) {
      const newHistory = smsHistory.slice(0, smsHistoryIndex + 1);
      newHistory.push(newContent);
      // Limit history to last 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setSmsHistoryIndex(prev => prev + 1);
      }
      setSmsHistory(newHistory);
    }

    // Check if user typed "/" for autocomplete
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';

    // Find the last "/" in the text before cursor
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      // Extract the text after the last "/"
      const filterText = textBeforeCursor.substring(lastSlashIndex + 1);

      // Show autocomplete - allow spaces in filter text
      if (!filterText.includes('\n')) {
        setAutocompleteFilter(filterText.toLowerCase());
        setShowAutocomplete(true);
        setSelectedAutocompleteIndex(0); // Reset selection when filter changes

        // Store the position where "/" was typed
        setSlashStartPosition({
          node: range.startContainer,
          offset: lastSlashIndex
        });

        // Calculate dropdown position relative to the editor
        const rect = range.getBoundingClientRect();
        const editorRect = e.currentTarget.getBoundingClientRect();
        setAutocompletePosition({
          top: rect.bottom - editorRect.top + 4, // 4px spacing
          left: rect.left - editorRect.left
        });
      } else {
        setShowAutocomplete(false);
        setSelectedAutocompleteIndex(0);
      }
    } else {
      setShowAutocomplete(false);
      setSelectedAutocompleteIndex(0);
    }
  };

  // Handle autocomplete selection
  const handleAutocompleteSelect = (paramName: string) => {
    const editor = smsContentRef.current;
    if (!editor || !slashStartPosition) return;

    const selection = window.getSelection();
    if (!selection) return;

    try {
      // Create a range from the slash position to current cursor
      const range = document.createRange();
      range.setStart(slashStartPosition.node, slashStartPosition.offset);

      // Get current cursor position
      if (selection.rangeCount > 0) {
        const currentRange = selection.getRangeAt(0);
        range.setEnd(currentRange.endContainer, currentRange.endOffset);

        // Delete the "/" and any partial text
        range.deleteContents();

        // Find the original parameter name (with underscores) from the display name (with spaces)
        const originalParam = functionData.parameters.find(p =>
          p.name.replace(/_/g, ' ').toLowerCase() === paramName.toLowerCase()
        );
        // For built-in parameters, use lowercase snake_case
        const actualParamName = originalParam ? originalParam.name : paramName.toLowerCase().replace(/\s+/g, '_');

        // Get the color for this parameter based on action type
        const color = getParameterColor(actualParamName);

        // Display name with spaces for UI
        const displayName = paramName;

        // Create the HTML for the parameter chip (matching Prompt tab style)
        const htmlToInsert = `<span contenteditable="false" class="text-${color} font-semibold cursor-pointer hover:underline" data-param="${actualParamName}" title="Required Detail: ${displayName}">${displayName}</span>&nbsp;`;

        // Insert the HTML using insertHTML command
        document.execCommand('insertHTML', false, htmlToInsert);

        // Update state using innerText to get the plain text representation
        setFunctionData(prev => ({ ...prev, smsContent: editor.innerText }));
      }
    } catch (error) {
      console.error('Error inserting autocomplete:', error);
    }

    // Hide autocomplete
    setShowAutocomplete(false);
    setAutocompleteFilter('');
    setSlashStartPosition(null);

    // Refocus editor
    editor.focus();
  };

  // Get filtered parameter list for autocomplete
  const getFilteredParameters = (): string[] => {
    // Add built-in parameters (always available)
    const builtInParams = ['Caller Phone'];

    // Get user-defined parameters from functionData
    const userParams = functionData.parameters.map(p => p.name.replace(/_/g, ' ')).filter(n => n);

    // Combine built-in and user-defined parameters
    const allParams = [...builtInParams, ...userParams];

    if (!autocompleteFilter) {
      return allParams;
    }

    return allParams.filter(name =>
      name.toLowerCase().replace(/\s+/g, '').includes(autocompleteFilter.replace(/\s+/g, ''))
    );
  };


  // Populate the phone recipient contentEditable ref after the SMS section renders
  useEffect(() => {
    if (phoneRecipient && phoneRecipientRef.current) {
      if (document.activeElement !== phoneRecipientRef.current) {
        // Render any {{parameter}} placeholders as colored chips (same as SMS content)
        const formattedHTML = renderSmsContentAsChips(phoneRecipient);
        // Configure DOMPurify to preserve class attributes for colored chips
        phoneRecipientRef.current.innerHTML = DOMPurify.sanitize(formattedHTML, {
          ADD_ATTR: ['class', 'contenteditable', 'data-param', 'title']
        });
      }
    }
  }, [phoneRecipient, originalData, originalIntegrationType]);

  // Populate the transfer phone contentEditable ref when data changes
  useEffect(() => {
    if (transferPhone && transferPhoneRef.current) {
      if (document.activeElement !== transferPhoneRef.current) {
        // Render any {{parameter}} placeholders as colored chips
        const formattedHTML = renderSmsContentAsChips(transferPhone);
        // Configure DOMPurify to preserve class attributes for colored chips
        transferPhoneRef.current.innerHTML = DOMPurify.sanitize(formattedHTML, {
          ADD_ATTR: ['class', 'contenteditable', 'data-param', 'title']
        });
      }
    }
  }, [transferPhone, originalData]);

  // Initialize SMS history when originalData is loaded
  useEffect(() => {
    if (originalData && originalData.smsContent) {
      setSmsHistory([originalData.smsContent]);
      setSmsHistoryIndex(0);
    }
  }, [originalData]);

  // SMS Undo/Redo handlers
  const handleSmsUndo = () => {
    if (smsHistoryIndex > 0) {
      const newIndex = smsHistoryIndex - 1;
      const previousText = smsHistory[newIndex];
      setSmsHistoryIndex(newIndex);
      setFunctionData(prev => ({ ...prev, smsContent: previousText }));

      // Update the content editable element with chip rendering
      if (smsContentRef.current) {
        // Configure DOMPurify to preserve class attributes for colored chips
        smsContentRef.current.innerHTML = DOMPurify.sanitize(renderSmsContentAsChips(previousText), {
          ADD_ATTR: ['class', 'contenteditable', 'data-param', 'title']
        });
      }
    }
  };

  const handleSmsRedo = () => {
    if (smsHistoryIndex < smsHistory.length - 1) {
      const newIndex = smsHistoryIndex + 1;
      const nextText = smsHistory[newIndex];
      setSmsHistoryIndex(newIndex);
      setFunctionData(prev => ({ ...prev, smsContent: nextText }));

      // Update the content editable element with chip rendering
      if (smsContentRef.current) {
        // Configure DOMPurify to preserve class attributes for colored chips
        smsContentRef.current.innerHTML = DOMPurify.sanitize(renderSmsContentAsChips(nextText), {
          ADD_ATTR: ['class', 'contenteditable', 'data-param', 'title']
        });
      }
    }
  };

  // Format phone number to E.164 format for Twilio
  const formatPhoneForTwilio = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If it's already in E.164 format (starts with +), return as is
    if (phone.startsWith('+')) {
      return phone.replace(/[^\d+]/g, '');
    }

    // If it's a 10-digit US number, add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If it's 11 digits and starts with 1, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    // Otherwise, just add + if not already there
    return `+${digits}`;
  };

  // Handle phone recipient input with parameter autocomplete
  const handlePhoneRecipientInput = (e: React.FormEvent<HTMLDivElement>) => {
    // Extract template text with {{param}} format from HTML
    const htmlContent = e.currentTarget.innerHTML || '';
    const newContent = htmlContent ? extractTemplateText(htmlContent) : '';
    setPhoneRecipient(newContent);

    // Check if user typed "/" for autocomplete
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';

    // Find the last "/" in the text before cursor
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      // Extract the text after the last "/"
      const filterText = textBeforeCursor.substring(lastSlashIndex + 1);

      // Show autocomplete
      if (!filterText.includes('\n')) {
        setAutocompleteFilter(filterText.toLowerCase());
        setShowPhoneAutocomplete(true);
        setSelectedPhoneAutocompleteIndex(0);

        // Store the position where "/" was typed
        setPhoneSlashStartPosition({
          node: range.startContainer,
          offset: lastSlashIndex
        });

        // Calculate dropdown position relative to the editor
        const rect = range.getBoundingClientRect();
        const editorRect = e.currentTarget.getBoundingClientRect();
        setPhoneAutocompletePosition({
          top: rect.bottom - editorRect.top + 4,
          left: rect.left - editorRect.left
        });
      } else {
        setShowPhoneAutocomplete(false);
        setSelectedPhoneAutocompleteIndex(0);
      }
    } else {
      setShowPhoneAutocomplete(false);
      setSelectedPhoneAutocompleteIndex(0);
    }
  };

  // Handle autocomplete selection for phone field
  const handlePhoneAutocompleteSelect = (paramName: string) => {
    const editor = phoneRecipientRef.current;
    if (!editor || !phoneSlashStartPosition) return;

    const selection = window.getSelection();
    if (!selection) return;

    try {
      const range = document.createRange();
      range.setStart(phoneSlashStartPosition.node, phoneSlashStartPosition.offset);

      if (selection.rangeCount > 0) {
        const currentRange = selection.getRangeAt(0);
        range.setEnd(currentRange.endContainer, currentRange.endOffset);
        range.deleteContents();

        const originalParam = functionData.parameters.find(p =>
          p.name.replace(/_/g, ' ').toLowerCase() === paramName.toLowerCase()
        );
        // For built-in parameters, use lowercase snake_case
        const actualParamName = originalParam ? originalParam.name : paramName.toLowerCase().replace(/\s+/g, '_');
        const color = getParameterColor(actualParamName);
        const displayName = paramName;

        const htmlToInsert = `<span contenteditable="false" class="text-${color} font-semibold cursor-pointer hover:underline" data-param="${actualParamName}" title="Required Detail: ${displayName}">${displayName}</span>&nbsp;`;
        document.execCommand('insertHTML', false, htmlToInsert);

        // Extract template text with {{param}} format from HTML
        setPhoneRecipient(extractTemplateText(editor.innerHTML));
      }
    } catch (error) {
      console.error('Error inserting autocomplete in phone field:', error);
    }

    setShowPhoneAutocomplete(false);
    setAutocompleteFilter('');
    setPhoneSlashStartPosition(null);
    editor.focus();
  };

  // Handle transfer phone input with parameter autocomplete
  const handleTransferPhoneInput = (e: React.FormEvent<HTMLDivElement>) => {
    // Extract template text with {{param}} format from HTML
    const htmlContent = e.currentTarget.innerHTML || '';
    const newContent = htmlContent ? extractTemplateText(htmlContent) : '';
    setTransferPhone(newContent);

    // Check if user typed "/" for autocomplete
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';

    // Find the last "/" in the text before cursor
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      // Extract the text after the last "/"
      const filterText = textBeforeCursor.substring(lastSlashIndex + 1);

      // Show autocomplete
      if (!filterText.includes('\n')) {
        setAutocompleteFilter(filterText.toLowerCase());
        setShowTransferPhoneAutocomplete(true);
        setSelectedTransferPhoneAutocompleteIndex(0);

        // Store the position where "/" was typed
        setTransferPhoneSlashStartPosition({
          node: range.startContainer,
          offset: lastSlashIndex
        });

        // Calculate dropdown position relative to the editor
        const rect = range.getBoundingClientRect();
        const editorRect = e.currentTarget.getBoundingClientRect();
        setTransferPhoneAutocompletePosition({
          top: rect.bottom - editorRect.top + 4,
          left: rect.left - editorRect.left
        });
      } else {
        setShowTransferPhoneAutocomplete(false);
        setSelectedTransferPhoneAutocompleteIndex(0);
      }
    } else {
      setShowTransferPhoneAutocomplete(false);
      setSelectedTransferPhoneAutocompleteIndex(0);
    }
  };

  // Handle autocomplete selection for transfer phone field
  const handleTransferPhoneAutocompleteSelect = (paramName: string) => {
    const editor = transferPhoneRef.current;
    if (!editor || !transferPhoneSlashStartPosition) return;

    const selection = window.getSelection();
    if (!selection) return;

    try {
      const range = document.createRange();
      range.setStart(transferPhoneSlashStartPosition.node, transferPhoneSlashStartPosition.offset);

      if (selection.rangeCount > 0) {
        const currentRange = selection.getRangeAt(0);
        range.setEnd(currentRange.endContainer, currentRange.endOffset);
        range.deleteContents();

        const originalParam = functionData.parameters.find(p =>
          p.name.replace(/_/g, ' ').toLowerCase() === paramName.toLowerCase()
        );
        // For built-in parameters, use lowercase snake_case
        const actualParamName = originalParam ? originalParam.name : paramName.toLowerCase().replace(/\s+/g, '_');
        const color = getParameterColor(actualParamName);
        const displayName = paramName;

        const htmlToInsert = `<span contenteditable="false" class="text-${color} font-semibold cursor-pointer hover:underline" data-param="${actualParamName}" title="Required Detail: ${displayName}">${displayName}</span>&nbsp;`;
        document.execCommand('insertHTML', false, htmlToInsert);

        // Extract template text with {{param}} format from HTML
        setTransferPhone(extractTemplateText(editor.innerHTML));
      }
    } catch (error) {
      console.error('Error inserting autocomplete in transfer phone field:', error);
    }

    setShowTransferPhoneAutocomplete(false);
    setAutocompleteFilter('');
    setTransferPhoneSlashStartPosition(null);
    editor.focus();
  };

  // Handle test function
  const handleTestFunction = async () => {
    if (!functionName || !agentId) {
      toast({
        title: "Cannot Test",
        description: "Function must be saved before testing.",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/functions/${functionName}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parameters: testParameters })
      });

      const result = await response.json();

      if (!response.ok) {
        setTestResult({ success: false, error: result.message || 'Test failed' });
        toast({
          title: "Test Failed",
          description: result.message || "Failed to test function",
          variant: "destructive"
        });
      } else {
        setTestResult({ success: true, data: result });
        toast({
          title: "Test Successful",
          description: "Function executed successfully"
        });
      }
    } catch (error: any) {
      console.error('Test error:', error);
      setTestResult({ success: false, error: error.message });
      toast({
        title: "Test Error",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Initialize test parameters from function parameters
  useEffect(() => {
    if (functionData.parameters.length > 0) {
      const initialParams: Record<string, any> = {};
      functionData.parameters.forEach(param => {
        initialParams[param.name] = '';
      });
      setTestParameters(initialParams);
    }
  }, [functionData.parameters]);

  // Close autocomplete on click outside or handle keyboard navigation
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showAutocomplete && !target.closest('#sms-content') && !target.closest('.autocomplete-dropdown')) {
        setShowAutocomplete(false);
        setSelectedAutocompleteIndex(0);
      }
      if (showPhoneAutocomplete && !target.closest('[data-phone-input]') && !target.closest('.autocomplete-dropdown')) {
        setShowPhoneAutocomplete(false);
        setSelectedPhoneAutocompleteIndex(0);
      }
      if (showTransferPhoneAutocomplete && !target.closest('[data-transfer-phone-input]') && !target.closest('.autocomplete-dropdown')) {
        setShowTransferPhoneAutocomplete(false);
        setSelectedTransferPhoneAutocompleteIndex(0);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle SMS content autocomplete
      if (showAutocomplete) {
        const filteredParams = getFilteredParameters();

        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            setShowAutocomplete(false);
            setSelectedAutocompleteIndex(0);
            break;

          case 'ArrowDown':
            e.preventDefault();
            setSelectedAutocompleteIndex(prev =>
              prev < filteredParams.length - 1 ? prev + 1 : 0
            );
            break;

          case 'ArrowUp':
            e.preventDefault();
            setSelectedAutocompleteIndex(prev =>
              prev > 0 ? prev - 1 : filteredParams.length - 1
            );
            break;

          case 'Enter':
            e.preventDefault();
            if (filteredParams.length > 0) {
              handleAutocompleteSelect(filteredParams[selectedAutocompleteIndex]);
            }
            break;

          case 'Tab':
            if (filteredParams.length > 0) {
              e.preventDefault();
              handleAutocompleteSelect(filteredParams[selectedAutocompleteIndex]);
            }
            break;
        }
      }

      // Handle phone autocomplete
      if (showPhoneAutocomplete) {
        const filteredParams = getFilteredParameters();

        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            setShowPhoneAutocomplete(false);
            setSelectedPhoneAutocompleteIndex(0);
            break;

          case 'ArrowDown':
            e.preventDefault();
            setSelectedPhoneAutocompleteIndex(prev =>
              prev < filteredParams.length - 1 ? prev + 1 : 0
            );
            break;

          case 'ArrowUp':
            e.preventDefault();
            setSelectedPhoneAutocompleteIndex(prev =>
              prev > 0 ? prev - 1 : filteredParams.length - 1
            );
            break;

          case 'Enter':
            e.preventDefault();
            if (filteredParams.length > 0) {
              handlePhoneAutocompleteSelect(filteredParams[selectedPhoneAutocompleteIndex]);
            }
            break;

          case 'Tab':
            if (filteredParams.length > 0) {
              e.preventDefault();
              handlePhoneAutocompleteSelect(filteredParams[selectedPhoneAutocompleteIndex]);
            }
            break;
        }
      }

      // Handle transfer phone autocomplete
      if (showTransferPhoneAutocomplete) {
        const filteredParams = getFilteredParameters();

        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            setShowTransferPhoneAutocomplete(false);
            setSelectedTransferPhoneAutocompleteIndex(0);
            break;

          case 'ArrowDown':
            e.preventDefault();
            setSelectedTransferPhoneAutocompleteIndex(prev =>
              prev < filteredParams.length - 1 ? prev + 1 : 0
            );
            break;

          case 'ArrowUp':
            e.preventDefault();
            setSelectedTransferPhoneAutocompleteIndex(prev =>
              prev > 0 ? prev - 1 : filteredParams.length - 1
            );
            break;

          case 'Enter':
            e.preventDefault();
            if (filteredParams.length > 0) {
              handleTransferPhoneAutocompleteSelect(filteredParams[selectedTransferPhoneAutocompleteIndex]);
            }
            break;

          case 'Tab':
            if (filteredParams.length > 0) {
              e.preventDefault();
              handleTransferPhoneAutocompleteSelect(filteredParams[selectedTransferPhoneAutocompleteIndex]);
            }
            break;
        }
      }
    };

    if (showAutocomplete || showPhoneAutocomplete || showTransferPhoneAutocomplete) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showAutocomplete, selectedAutocompleteIndex, showPhoneAutocomplete, selectedPhoneAutocompleteIndex, showTransferPhoneAutocomplete, selectedTransferPhoneAutocompleteIndex]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-1/2 sm:max-w-[50%] premium-card p-0 flex flex-col overflow-y-auto">
        <div className="p-6 pb-24">
            {/* Integration warning banner */}
            {integrationWarning && (
              <div className="mb-4 flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3">
                <i className="fas fa-exclamation-triangle text-yellow-400 mt-0.5 flex-shrink-0"></i>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-yellow-300 font-medium">No {integrationWarning.missing} connected</p>
                  <p className="text-xs text-yellow-400/80 mt-0.5">{integrationWarning.message}</p>
                  {onNavigateToIntegrations && (
                    <button
                      className="mt-1.5 text-xs text-yellow-400 underline hover:text-yellow-300"
                      onClick={onNavigateToIntegrations}
                    >
                      Go to Integrations →
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Redesigned Header - Similar to Call Details side panel */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Logo/Icon */}
                  {isCreateMode ? (
                    // In create mode derive icon from the chosen category
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      initialCategory === 'appointmentSetting' ? 'bg-blue-600/20' :
                      initialCategory === 'crm' ? 'bg-purple-600/20' :
                      initialCategory === 'pointOfSale' ? 'bg-green-600/20' :
                      initialCategory === 'messaging' ? 'bg-orange-600/20' :
                      initialCategory === 'callActions' ? 'bg-cyan-600/20' :
                      'bg-yellow-600/20'
                    }`}>
                      <i className={`fas ${
                        initialCategory === 'appointmentSetting' ? 'fa-calendar' :
                        initialCategory === 'crm' ? 'fa-users' :
                        initialCategory === 'pointOfSale' ? 'fa-shopping-cart' :
                        initialCategory === 'messaging' ? 'fa-comment' :
                        initialCategory === 'callActions' ? 'fa-phone' :
                        'fa-plug'
                      } text-xl ${
                        initialCategory === 'appointmentSetting' ? 'text-blue-400' :
                        initialCategory === 'crm' ? 'text-purple-400' :
                        initialCategory === 'pointOfSale' ? 'text-green-400' :
                        initialCategory === 'messaging' ? 'text-orange-400' :
                        initialCategory === 'callActions' ? 'text-cyan-400' :
                        'text-yellow-400'
                      }`}></i>
                    </div>
                  ) : category && (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      category.color === 'bg-blue-400' ? 'bg-blue-600/20' :
                      category.color === 'bg-purple-400' ? 'bg-purple-600/20' :
                      category.color === 'bg-green-400' ? 'bg-green-600/20' :
                      category.color === 'bg-orange-400' ? 'bg-orange-600/20' :
                      category.color === 'bg-cyan-400' ? 'bg-cyan-600/20' :
                      'bg-yellow-600/20'
                    }`}>
                      <i className={`fas ${
                        category.integrationType === 'Calendar' ? 'fa-calendar' :
                        category.integrationType === 'CRM' ? 'fa-users' :
                        category.integrationType === 'POS' ? 'fa-shopping-cart' :
                        category.integrationType === 'Messaging' ? 'fa-comment' :
                        category.integrationType === 'CallActions' ? 'fa-phone' :
                        'fa-plug'
                      } text-xl ${category.color.replace('bg-', 'text-')}`}></i>
                    </div>
                  )}

                  {/* Title and Description */}
                  <div className="flex-1 min-w-0">
                    {/* Inline Editable Title */}
                    <h2
                      ref={titleInputRef}
                      contentEditable
                      suppressContentEditableWarning
                      suppressHydrationWarning
                      onInput={(e) => {
                        const currentValue = e.currentTarget.innerText || '';
                        // Remove prohibited characters (only allow letters, numbers, and spaces)
                        // This matches the backend validation: /[^a-z0-9\s]/g
                        const sanitizedValue = currentValue.replace(/[^a-zA-Z0-9\s]/g, '');

                        // If sanitization changed the value, update the contentEditable element
                        if (sanitizedValue !== currentValue) {
                          const selection = window.getSelection();
                          const range = selection?.getRangeAt(0);
                          const cursorPosition = range?.startOffset || 0;

                          e.currentTarget.innerText = sanitizedValue;

                          // Restore cursor position
                          if (selection && range && e.currentTarget.firstChild) {
                            try {
                              const newRange = document.createRange();
                              const textNode = e.currentTarget.firstChild;
                              const newPosition = Math.min(cursorPosition, sanitizedValue.length);
                              newRange.setStart(textNode, newPosition);
                              newRange.collapse(true);
                              selection.removeAllRanges();
                              selection.addRange(newRange);
                            } catch (err) {
                              // Cursor restoration failed, continue anyway
                            }
                          }
                        }

                        setFunctionData(prev => ({ ...prev, name: sanitizedValue }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      data-placeholder={isCreateMode ? 'Action title...' : undefined}
                      className="text-white text-lg font-semibold cursor-text outline-none focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600"
                      style={{ minHeight: '1.5rem' }}
                    />

                    {/* Inline Editable Description */}
                    <p
                      ref={descriptionInputRef}
                      contentEditable
                      suppressContentEditableWarning
                      suppressHydrationWarning
                      onInput={(e) => {
                        const newValue = e.currentTarget.innerText || '';
                        setFunctionData(prev => ({ ...prev, description: newValue }));
                      }}
                      data-placeholder={isCreateMode ? 'e.g. When a customer wants to book an appointment, collect their name, preferred date, service type, and any special requests...' : undefined}
                      className="text-gray-400 text-sm mt-2 cursor-text outline-none focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600"
                      style={{ minHeight: isCreateMode ? '4rem' : '1.25rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Section 1: Integrations - Horizontal Slider (hidden for Call Actions) */}
              {category?.integrationType !== 'CallActions' && (
                <div className="space-y-4">
                  {(() => {
                    // Use originalIntegrationType instead of deriving from current name
                    const integrationType = originalIntegrationType;

                    // Get all integration templates for category matching
                    const allTemplates = getAllTemplates();

                    const matchingIntegrations = agentIntegrations
                      ? agentIntegrations
                          .filter((integration: any) => {
                            // Exact match
                            if (integration.type === integrationType) return true;

                            // For Messaging functions, match any integration with 'messaging' in the type
                            if (integrationType === 'Messaging' &&
                                integration.type?.toLowerCase().includes('messaging')) {
                              return true;
                            }

                            // For CRM functions, match integrations with CRM category
                            // This includes 'contact_memory' and other CRM-type integrations
                            if (integrationType === 'CRM') {
                              const integrationTemplate = allTemplates.find(t => t.id === integration.type);
                              if (integrationTemplate?.category === 'crm') {
                                return true;
                              }
                            }

                            return false;
                          })
                          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      : [];

                    if (matchingIntegrations.length === 0) {
                      const isCRMType = integrationType === 'CRM';
                      return (
                        <div className="space-y-2">
                          {/* For CRM functions: auto-connect Contacts (built-in, no credentials needed) */}
                          {isCRMType && (
                            <Button
                              onClick={async () => {
                                if (!agentId || isConnectingContacts) return;
                                setIsConnectingContacts(true);
                                try {
                                  const res = await fetch('/api/integrations/custom', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                      agentId,
                                      integrations: [{
                                        name: 'Contacts',
                                        type: 'contact_memory',
                                        description: 'Built-in customer contact memory from Contacts tab',
                                      }],
                                    }),
                                  });
                                  if (res.ok) {
                                    await queryClient.invalidateQueries({ queryKey: ['integrations', agentId] });
                                    await queryClient.invalidateQueries({ queryKey: ['/api/agents', agentId, 'integration-status'] });
                                    toast({ title: 'Contacts connected', description: 'Customer memory will now pull from your Contacts tab.' });
                                  } else {
                                    toast({ title: 'Error', description: 'Could not connect Contacts integration.', variant: 'destructive' });
                                  }
                                } catch {
                                  toast({ title: 'Error', description: 'Could not connect Contacts integration.', variant: 'destructive' });
                                } finally {
                                  setIsConnectingContacts(false);
                                }
                              }}
                              variant="outline"
                              size="sm"
                              disabled={isConnectingContacts}
                              className="w-full bg-purple-500/10 border-purple-500/40 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200"
                              data-testid="button-connect-contacts"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              {isConnectingContacts ? 'Connecting…' : 'Connect to Contacts'}
                            </Button>
                          )}
                          {onNavigateToIntegrations && (
                            <Button
                              onClick={() => {
                                onClose();
                                onNavigateToIntegrations();
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 hover:text-white"
                              data-testid="button-connect-integration"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {isCRMType ? 'Use External CRM Instead' : 'Connect Integration'}
                            </Button>
                          )}
                        </div>
                      );
                    }

                    // Find the currently selected integration
                    const selectedIntegration = matchingIntegrations.find(
                      (integration: any) => integration.id === functionData.selectedIntegrationId
                    );
                    const selectedTemplate = selectedIntegration
                      ? allTemplates.find(t => t.id === selectedIntegration.type)
                      : null;

                    return (
                      <div className="space-y-3">
                        {/* Selected Integrations Display (Tags/Chips) */}
                        {functionData.selectedIntegrationIds.length > 0 && (
                          <div className="space-y-2">
                            {functionData.selectedIntegrationIds.map((integrationId) => {
                              const integration = matchingIntegrations.find(
                                (int: any) => int.id === integrationId
                              );
                              if (!integration) return null;

                              const template = allTemplates.find(t => t.id === integration.type);

                              return (
                                <div
                                  key={integrationId}
                                  className="w-full bg-transparent border border-gray-800 text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md flex items-center justify-between transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {/* Integration Icon */}
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                                      style={{ backgroundColor: template?.color || '#6B7280' }}
                                    >
                                      {template?.logoUrl ? (
                                        <img
                                          src={template.logoUrl}
                                          alt={integration.name}
                                          className="w-3 h-3 rounded-full object-contain"
                                        />
                                      ) : (
                                        <i className={template?.icon || 'fas fa-plug'}></i>
                                      )}
                                    </div>

                                    {/* Integration Name */}
                                    <span>{integration.name}</span>
                                  </div>

                                  {/* Remove Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFunctionData(prev => ({
                                        ...prev,
                                        selectedIntegrationIds: prev.selectedIntegrationIds.filter(
                                          id => id !== integrationId
                                        )
                                      }));
                                    }}
                                    className="hover:bg-gray-700 rounded-full p-0.5 transition-colors"
                                    data-testid={`remove-integration-${integrationId}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add Integration Dropdown */}
                        <div className="relative">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 hover:text-white justify-between"
                                data-testid="button-add-integration"
                              >
                                <div className="flex items-center gap-2">
                                  <Plus className="w-4 h-4" />
                                  <span>
                                    {functionData.selectedIntegrationIds.length === 0
                                      ? 'Connect Integration'
                                      : 'Add Another Integration'}
                                  </span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-80 premium-card text-white max-h-80 overflow-y-auto">
                              {matchingIntegrations.map((integration: any) => {
                                const template = allTemplates.find(t => t.id === integration.type);
                                const isSelected = functionData.selectedIntegrationIds.includes(integration.id);

                                return (
                                  <DropdownMenuItem
                                    key={integration.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        // Remove if already selected
                                        setFunctionData(prev => ({
                                          ...prev,
                                          selectedIntegrationIds: prev.selectedIntegrationIds.filter(
                                            id => id !== integration.id
                                          )
                                        }));
                                      } else {
                                        // Add to selection (prevent duplicates)
                                        setFunctionData(prev => ({
                                          ...prev,
                                          selectedIntegrationIds: prev.selectedIntegrationIds.includes(integration.id)
                                            ? prev.selectedIntegrationIds // Already exists, no-op
                                            : [...prev.selectedIntegrationIds, integration.id] // Add to end
                                        }));
                                      }
                                    }}
                                    className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between p-3"
                                    data-testid={`integration-option-${integration.id}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      {/* Icon */}
                                      <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                                        style={{ backgroundColor: template?.color || '#6B7280' }}
                                      >
                                        {template?.logoUrl ? (
                                          <img
                                            src={template.logoUrl}
                                            alt={integration.name}
                                            className="w-6 h-6 rounded-full object-contain"
                                          />
                                        ) : (
                                          <i className={template?.icon || 'fas fa-plug'}></i>
                                        )}
                                      </div>

                                      {/* Name and Status */}
                                      <div className="flex flex-col">
                                        <span className="text-white font-medium text-sm">
                                          {integration.name}
                                        </span>
                                        {integration.testStatus === 'failed' && (
                                          <Badge className="bg-red-500/20 text-red-400 text-xs border-red-500/30 w-fit mt-1">
                                            <i className="fas fa-times-circle mr-1"></i>
                                            Error
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Check mark for selected */}
                                    {isSelected && (
                                      <Check className="w-4 h-4 text-blue-400" />
                                    )}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Section 2: Call Actions Configuration (for callActions category only) */}
              {/* Section 2: Required Details (Parameters) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300 text-base font-semibold">Required Details</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      If the client doesn't provide this, the AI will ask for it automatically.
                    </p>
                  </div>
                  <Button
                    onClick={addParameter}
                    variant="outline"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                    data-testid="button-add-parameter"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                {/* Regular Parameters Table (show for all action types) */}
                {functionData.parameters.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 whitespace-nowrap">
                            Name
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 whitespace-nowrap">
                            Description
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 whitespace-nowrap">
                            Required
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {functionData.parameters.map((param, index) => (
                          <tr key={param.id} className="transition-colors hover:bg-gray-800/30">
                            <td className="px-3 py-3">
                              <Input
                                value={param.name.replace(/_/g, ' ')}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  const inferredType = inferParameterType(newName);
                                  updateParameter(param.id, { name: newName, ...inferredType });
                                }}
                                className="bg-transparent border-gray-800 text-gray-300 text-xs h-8"
                                placeholder="name"
                                data-testid={`input-param-name-${index}`}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                value={param.description}
                                onChange={(e) => {
                                  const newDesc = e.target.value;
                                  // Only update description, do NOT infer type from description
                                  updateParameter(param.id, { description: newDesc });
                                }}
                                className="bg-transparent border-gray-800 text-gray-300 text-xs h-8"
                                placeholder="description"
                                data-testid={`input-param-description-${index}`}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={param.required}
                                  onCheckedChange={(checked) => updateParameter(param.id, { required: checked as boolean })}
                                  className="border-gray-800"
                                  data-testid={`checkbox-param-required-${index}`}
                                />
                                <Button
                                  onClick={() => removeParameter(param.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-6 w-6 p-0"
                                  data-testid={`button-remove-parameter-${index}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 2.5: Customer Memory (show for CRM functions only) */}
              {category?.integrationType === 'CRM' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-300 text-base font-semibold">Customer Memory</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        <i className="fas fa-info-circle mr-1"></i>
                        Store customer preferences and details that the AI can reference during calls.
                      </p>
                    </div>
                    <Button
                      onClick={addCustomerMemoryEntry}
                      variant="outline"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                      data-testid="button-add-memory-entry"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  {/* Customer Memory Table */}
                  {(functionData.customerMemoryEntries || []).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 whitespace-nowrap">
                              Name
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 whitespace-nowrap">
                              Description
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 whitespace-nowrap">
                              Memory
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {(functionData.customerMemoryEntries || []).map((entry, index) => (
                            <tr key={entry.id} className="transition-colors hover:bg-gray-800/30">
                              <td className="px-3 py-3">
                                <Input
                                  value={entry.name}
                                  onChange={(e) => updateCustomerMemoryEntry(entry.id, { name: e.target.value })}
                                  className="bg-transparent border-gray-800 text-gray-300 text-xs h-8"
                                  placeholder="e.g., Preferred Stylist"
                                  data-testid={`input-memory-name-${index}`}
                                />
                              </td>
                              <td className="px-3 py-3">
                                <Input
                                  value={entry.description}
                                  onChange={(e) => updateCustomerMemoryEntry(entry.id, { description: e.target.value })}
                                  className="bg-transparent border-gray-800 text-gray-300 text-xs h-8"
                                  placeholder="e.g., Customer's favorite stylist"
                                  data-testid={`input-memory-description-${index}`}
                                />
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 relative">
                                    <Input
                                      value={entry.memory}
                                      onChange={(e) => updateCustomerMemoryEntry(entry.id, { memory: e.target.value })}
                                      className="bg-transparent border-gray-800 text-gray-300 text-xs h-8 font-mono"
                                      placeholder="Type / to insert parameters..."
                                      data-testid={`input-memory-content-${index}`}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => removeCustomerMemoryEntry(entry.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-6 w-6 p-0"
                                    data-testid={`button-remove-memory-${index}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-gray-500">
                      No customer memory entries yet. Click "Add" to create one.
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: Transfer Destination (show for transfer call actions only) */}
              {category?.integrationType === 'CallActions' && functionData.callActionType === 'transfer' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300 text-base font-semibold">Transfer Destination</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Choose how to define where the call will be transferred.
                    </p>
                  </div>

                  {/* Destination Type Selector */}
                  <div className="space-y-3">
                    <select
                      value={functionData.transferDestinationType || 'specific_number'}
                      onChange={(e) => setFunctionData(prev => ({
                        ...prev,
                        transferDestinationType: e.target.value as any,
                        // Clear other fields when switching type
                        transferPhoneNumber: e.target.value === 'specific_number' ? prev.transferPhoneNumber : '',
                        transferTeamMember: e.target.value === 'team_member' ? prev.transferTeamMember : '',
                        transferVoicebot: e.target.value === 'voicebot' ? prev.transferVoicebot : ''
                      }))}
                      className="w-full bg-transparent border-gray-800 text-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="specific_number">Phone Number</option>
                      <option value="team_member">Team Member</option>
                      <option value="voicebot">VoiceBot</option>
                    </select>

                    {/* Phone Number Input with Chip Support */}
                      {functionData.transferDestinationType === 'specific_number' && (
                        <div className="space-y-2">
                          <div className="relative">
                            <div
                              ref={transferPhoneRef}
                              contentEditable
                              suppressContentEditableWarning
                              spellCheck={false}
                              className="font-mono text-sm text-gray-300 outline-none bg-gray-800 border border-gray-700 rounded-md px-3 py-2 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600 min-h-[38px]"
                              onInput={handleTransferPhoneInput}
                              data-placeholder="+1 234 567 8900 or /parameter"
                              data-transfer-phone-input="true"
                            />
                            {/* Transfer Phone Autocomplete Dropdown */}
                            {showTransferPhoneAutocomplete && (
                              <div
                                className="autocomplete-dropdown absolute z-50 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                                style={{
                                  top: `${transferPhoneAutocompletePosition.top}px`,
                                  left: `${transferPhoneAutocompletePosition.left}px`,
                                  minWidth: '200px'
                                }}
                              >
                                {getFilteredParameters().length > 0 ? (
                                  getFilteredParameters().map((paramName, index) => (
                                    <div
                                      key={paramName}
                                      onClick={() => handleTransferPhoneAutocompleteSelect(paramName)}
                                      onMouseEnter={() => setSelectedTransferPhoneAutocompleteIndex(index)}
                                      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors ${
                                        index === selectedTransferPhoneAutocompleteIndex
                                          ? 'bg-accent text-accent-foreground'
                                          : 'hover:bg-accent/50'
                                      }`}
                                    >
                                      <span className={`font-semibold text-${getParameterColor(paramName)}`}>
                                        {paramName}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-muted-foreground text-sm">
                                    No matching parameters
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Team Member Selector */}
                      {functionData.transferDestinationType === 'team_member' && (
                        <div className="space-y-2">
                          <select
                            value={functionData.transferTeamMember || ''}
                            onChange={(e) => setFunctionData(prev => ({ ...prev, transferTeamMember: e.target.value }))}
                            className="w-full bg-transparent border-gray-800 text-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="">Select team member...</option>
                            {teamMembersData && teamMembersData
                              .filter((member: any) => member.status === 'active')
                              .map((member: any) => (
                                <option key={member.id} value={member.id}>
                                  {member.name} {member.isOwner ? '(Owner)' : ''}
                                </option>
                              ))
                            }
                          </select>
                          {(!teamMembersData || teamMembersData.filter((m: any) => m.status === 'active').length === 0) && (
                            <p className="text-xs text-yellow-500">
                              <i className="fas fa-exclamation-triangle mr-1"></i>
                              No active team members found. Add team members in the Team tab.
                            </p>
                          )}
                        </div>
                      )}

                      {/* VoiceBot Selector */}
                      {functionData.transferDestinationType === 'voicebot' && (
                        <div className="space-y-2">
                          <select
                            value={functionData.transferVoicebot || ''}
                            onChange={(e) => setFunctionData(prev => ({ ...prev, transferVoicebot: e.target.value }))}
                            className="w-full bg-transparent border-gray-800 text-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="">Select VoiceBot...</option>
                            {voiceAgentsData && voiceAgentsData.map((agent: any) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.agentName || agent.name || `Agent ${agent.id}`}
                              </option>
                            ))}
                          </select>
                          {(!voiceAgentsData || voiceAgentsData.length === 0) && (
                            <p className="text-xs text-yellow-500">
                              <i className="fas fa-exclamation-triangle mr-1"></i>
                              No VoiceBots found. Create a VoiceBot first in the VoiceBots tab.
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Section 4: Transfer Type (show for transfer call actions only) */}
              {category?.integrationType === 'CallActions' && functionData.callActionType === 'transfer' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300 text-base font-semibold">Transfer Type</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Choose whether to introduce the call or transfer directly.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFunctionData(prev => ({ ...prev, transferType: 'cold' }))}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        functionData.transferType === 'cold' || !functionData.transferType
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-800'
                      }`}
                    >
                      <div className="font-semibold text-white mb-1">Cold Transfer</div>
                      <div className="text-xs text-gray-400">Call goes straight through, no introduction</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunctionData(prev => ({ ...prev, transferType: 'warm' }))}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        functionData.transferType === 'warm'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-800'
                      }`}
                    >
                      <div className="font-semibold text-white mb-1">Warm Transfer</div>
                      <div className="text-xs text-gray-400">Bot explains to recipient why they're getting the call</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Section 5: Post-Call Actions Configuration (show for post_call_actions only) */}
              {category?.integrationType === 'CallActions' && functionData.callActionType === 'post_call_actions' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300 text-base font-semibold">Post-Call Actions</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Configure automated actions that trigger after a call ends based on specific conditions.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Post-Call Actions Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-2 px-3 text-gray-400 font-medium">Action</th>
                            <th className="text-left py-2 px-3 text-gray-400 font-medium">Trigger</th>
                            <th className="text-left py-2 px-3 text-gray-400 font-medium">Destination</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(functionData.postCallActions || []).map((postCallAction, index) => (
                            <tr key={postCallAction.id} className="border-b border-gray-800">
                              {/* Action Dropdown */}
                              <td className="py-3 px-3">
                                <select
                                  value={postCallAction.action}
                                  onChange={(e) => {
                                    const updatedActions = [...(functionData.postCallActions || [])];
                                    updatedActions[index] = { ...updatedActions[index], action: e.target.value };
                                    setFunctionData(prev => ({ ...prev, postCallActions: updatedActions }));
                                  }}
                                  className="w-full bg-transparent border-gray-800 text-gray-300 rounded-md px-2 py-1.5 text-sm"
                                >
                                  <option value="">Select action...</option>
                                  {availableActionsData && availableActionsData.map((action: any) => (
                                    <option key={action.name} value={action.name}>
                                      {action.displayTitle || action.name}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Trigger Dropdown */}
                              <td className="py-3 px-3">
                                <select
                                  value={postCallAction.trigger}
                                  onChange={(e) => {
                                    const updatedActions = [...(functionData.postCallActions || [])];
                                    updatedActions[index] = { ...updatedActions[index], trigger: e.target.value };
                                    setFunctionData(prev => ({ ...prev, postCallActions: updatedActions }));
                                  }}
                                  className="w-full bg-transparent border-gray-800 text-gray-300 rounded-md px-2 py-1.5 text-sm"
                                >
                                  <option value="">Select trigger...</option>
                                  <option value="flagged_call">Flagged Call</option>
                                </select>
                              </td>

                              {/* Destination Configuration */}
                              <td className="py-3 px-3">
                                <div className="space-y-2">
                                  {/* Destination Type Selector */}
                                  <select
                                    value={postCallAction.destinationType}
                                    onChange={(e) => {
                                      const updatedActions = [...(functionData.postCallActions || [])];
                                      updatedActions[index] = {
                                        ...updatedActions[index],
                                        destinationType: e.target.value as 'specific_number' | 'team_member' | 'voicebot',
                                        destinationValue: '' // Reset value when type changes
                                      };
                                      setFunctionData(prev => ({ ...prev, postCallActions: updatedActions }));
                                    }}
                                    className="w-full bg-transparent border-gray-800 text-gray-300 rounded-md px-2 py-1.5 text-sm"
                                  >
                                    <option value="specific_number">Phone Number</option>
                                    <option value="team_member">Team Member</option>
                                    <option value="voicebot">VoiceBot</option>
                                  </select>

                                  {/* Destination Value Input */}
                                  {postCallAction.destinationType === 'specific_number' && (
                                    <input
                                      type="text"
                                      value={postCallAction.destinationValue}
                                      onChange={(e) => {
                                        const updatedActions = [...(functionData.postCallActions || [])];
                                        updatedActions[index] = { ...updatedActions[index], destinationValue: e.target.value };
                                        setFunctionData(prev => ({ ...prev, postCallActions: updatedActions }));
                                      }}
                                      placeholder="+1 234 567 8900"
                                      className="w-full bg-transparent border-gray-800 text-gray-300 rounded-md px-2 py-1.5 text-sm"
                                    />
                                  )}

                                  {postCallAction.destinationType === 'team_member' && (
                                    <select
                                      value={postCallAction.destinationValue}
                                      onChange={(e) => {
                                        const updatedActions = [...(functionData.postCallActions || [])];
                                        updatedActions[index] = { ...updatedActions[index], destinationValue: e.target.value };
                                        setFunctionData(prev => ({ ...prev, postCallActions: updatedActions }));
                                      }}
                                      className="w-full bg-transparent border-gray-800 text-gray-300 rounded-md px-2 py-1.5 text-sm"
                                    >
                                      <option value="">Select team member...</option>
                                      {teamMembersData && teamMembersData
                                        .filter((member: any) => member.status === 'active')
                                        .map((member: any) => (
                                          <option key={member.id} value={member.id}>
                                            {member.name} {member.isOwner ? '(Owner)' : ''}
                                          </option>
                                        ))
                                      }
                                    </select>
                                  )}

                                  {postCallAction.destinationType === 'voicebot' && (
                                    <select
                                      value={postCallAction.destinationValue}
                                      onChange={(e) => {
                                        const updatedActions = [...(functionData.postCallActions || [])];
                                        updatedActions[index] = { ...updatedActions[index], destinationValue: e.target.value };
                                        setFunctionData(prev => ({ ...prev, postCallActions: updatedActions }));
                                      }}
                                      className="w-full bg-transparent border-gray-800 text-gray-300 rounded-md px-2 py-1.5 text-sm"
                                    >
                                      <option value="">Select VoiceBot...</option>
                                      {voiceAgentsData && voiceAgentsData.map((agent: any) => (
                                        <option key={agent.id} value={agent.id}>
                                          {agent.agentName || agent.name || `Agent ${agent.id}`}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </td>

                              {/* Delete Button */}
                              <td className="py-3 px-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedActions = (functionData.postCallActions || []).filter((_, i) => i !== index);
                                    setFunctionData(prev => ({ ...prev, postCallActions: updatedActions }));
                                  }}
                                  className="text-gray-400 hover:text-red-400 transition-colors"
                                >
                                  <i className="fas fa-trash text-sm"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add New Post-Call Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newAction: PostCallAction = {
                          id: `post-call-${Date.now()}`,
                          action: '',
                          trigger: 'flagged_call',
                          destinationType: 'specific_number',
                          destinationValue: ''
                        };
                        setFunctionData(prev => ({
                          ...prev,
                          postCallActions: [...(prev.postCallActions || []), newAction]
                        }));
                      }}
                      className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md text-white text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-plus"></i>
                      Add Post-Call Action
                    </button>
                  </div>
                </div>
              )}

              {/* Section 6: Send a Text Message (SMS Content) - For Messaging Functions only */}
              {(category?.integrationType === 'Messaging' ||
                originalIntegrationType === 'Messaging') && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-0 py-3 border-b border-gray-800">
                      {/* Left: Phone Number Input */}
                      <div className="flex items-center gap-2 flex-1">
                        <Label className="text-gray-400 text-xs whitespace-nowrap">To:</Label>
                        <div className="relative flex-1 max-w-xs">
                          <div
                            ref={phoneRecipientRef}
                            contentEditable
                            suppressContentEditableWarning
                            spellCheck={false}
                            className="font-mono text-sm text-gray-300 outline-none bg-transparent empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600 px-2 py-1"
                            onInput={handlePhoneRecipientInput}
                            data-placeholder="+1 234 567 8900 or /parameter"
                            data-phone-input="true"
                          />
                          {/* Phone Autocomplete Dropdown */}
                          {showPhoneAutocomplete && (
                            <div
                              className="autocomplete-dropdown absolute z-50 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                              style={{
                                top: `${phoneAutocompletePosition.top}px`,
                                left: `${phoneAutocompletePosition.left}px`,
                                minWidth: '200px'
                              }}
                            >
                              {getFilteredParameters().length > 0 ? (
                                getFilteredParameters().map((paramName, index) => (
                                  <div
                                    key={paramName}
                                    onClick={() => handlePhoneAutocompleteSelect(paramName)}
                                    onMouseEnter={() => setSelectedPhoneAutocompleteIndex(index)}
                                    className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors ${
                                      index === selectedPhoneAutocompleteIndex
                                        ? 'bg-accent text-accent-foreground'
                                        : 'hover:bg-accent/50'
                                    }`}
                                  >
                                    <span className={`font-semibold text-${getParameterColor(paramName)}`}>
                                      {paramName}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-muted-foreground text-sm">
                                  No matching parameters
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Undo/Redo */}
                      <div className="flex items-center gap-3">
                      {/* Undo Button */}
                      <button
                        onClick={handleSmsUndo}
                        disabled={smsHistoryIndex <= 0}
                        className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        title="Undo (Ctrl+Z)"
                        data-testid="button-undo-sms"
                      >
                        <i className="fas fa-undo text-sm"></i>
                      </button>

                      {/* Redo Button */}
                      <button
                        onClick={handleSmsRedo}
                        disabled={smsHistoryIndex >= smsHistory.length - 1}
                        className="text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        title="Redo (Ctrl+Y)"
                        data-testid="button-redo-sms"
                      >
                        <i className="fas fa-redo text-sm"></i>
                      </button>
                    </div>
                  </div>

                    {/* Smart Phone Number Checkbox */}
                    <div className="flex items-start gap-2 px-0 pb-2">
                      <Checkbox
                        id="use-caller-phone"
                        checked={functionData.useCallerPhoneByDefault === true}
                        onCheckedChange={(checked) => {
                          const newValue = checked === true;
                          const PREF_PHONE_NAME = 'Preferred Phone Number';
                          const PREF_PHONE_PLACEHOLDER = '{{Preferred Phone Number}}';

                          if (newValue) {
                            // Add the optional "Preferred Phone Number" parameter if not already present
                            setFunctionData(prev => {
                              const alreadyHas = prev.parameters.some(p =>
                                p.name.toLowerCase().replace(/[\s_]/g, '') === 'preferredphonenumber'
                              );
                              return {
                                ...prev,
                                useCallerPhoneByDefault: true,
                                parameters: alreadyHas ? prev.parameters : [
                                  ...prev.parameters,
                                  {
                                    id: `param-${Date.now()}`,
                                    name: PREF_PHONE_NAME,
                                    description: 'The preferred phone number that the caller wants to use',
                                    type: 'string' as const,
                                    required: false,
                                    displayType: 'text' as const,
                                  }
                                ],
                              };
                            });
                            // Set "To:" to the placeholder
                            setPhoneRecipient(PREF_PHONE_PLACEHOLDER);
                          } else {
                            // Remove the auto-added parameter and reset "To:" if it's the placeholder
                            setFunctionData(prev => ({
                              ...prev,
                              useCallerPhoneByDefault: false,
                              parameters: prev.parameters.filter(p =>
                                p.name.toLowerCase().replace(/[\s_]/g, '') !== 'preferredphonenumber'
                              ),
                            }));
                            if (phoneRecipient === PREF_PHONE_PLACEHOLDER) {
                              setPhoneRecipient('');
                              if (phoneRecipientRef.current) {
                                phoneRecipientRef.current.innerHTML = '';
                              }
                            }
                          }
                        }}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor="use-caller-phone"
                        className="text-xs text-gray-400 cursor-pointer leading-tight"
                      >
                        Send to the number the customer is calling from unless given a preferred phone number
                      </label>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="pt-3">
                      <div
                        ref={smsContentRef}
                        id="sms-content"
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        className="font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-300 outline-none bg-transparent empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600"
                        style={{ minHeight: '180px', paddingBottom: '3rem' }}
                        onInput={handleSmsInput}
                        data-placeholder="Type your message here. Use / to insert Required Details..."
                      />

                      {/* Autocomplete Dropdown */}
                      {showAutocomplete && (
                        <div
                          className="autocomplete-dropdown absolute z-50 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                          style={{
                            top: `${autocompletePosition.top}px`,
                            left: `${autocompletePosition.left}px`,
                            minWidth: '200px'
                          }}
                        >
                          {getFilteredParameters().length > 0 ? (
                            getFilteredParameters().map((paramName, index) => (
                              <div
                                key={paramName}
                                onClick={() => handleAutocompleteSelect(paramName)}
                                onMouseEnter={() => setSelectedAutocompleteIndex(index)}
                                className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors ${
                                  index === selectedAutocompleteIndex
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-accent/50'
                                }`}
                              >
                                <span className={`font-semibold text-${getParameterColor(paramName)}`}>
                                  {paramName}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-muted-foreground text-sm">
                              No matching parameters
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Sticky Footer Buttons - Always at bottom */}
        <div className="sticky bottom-0 left-0 right-0 premium-card border-t border-gray-700 p-4 mt-auto">
          <div className="flex justify-end gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 text-sm"
              data-testid="button-cancel-function"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              data-testid="button-save-function"
            >
              {isAiEnhancing ? (
                <span className="flex items-center gap-2">
                  <i className="fas fa-sparkles animate-pulse"></i>
                  AI Enhancing...
                </span>
              ) : isSaving ? (isCreateMode ? 'Creating...' : 'Saving...') : (isCreateMode ? 'Create Action' : 'Save Function')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
