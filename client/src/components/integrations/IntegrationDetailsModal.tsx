/**
 * Integration Details Modal Component
 *
 * Unified modal for viewing, editing, and configuring integrations.
 * Includes tabs for Configuration, Activity Logs, and Documentation.
 */

import React, { useState, useEffect } from 'react';
import {
  Integration,
  IntegrationTemplate,
  IntegrationFormData,
  IntegrationTestResult,
  IntegrationLog,
} from './types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IntegrationLogs } from './IntegrationLogs';
import { getTemplateById } from './integrationTemplates';

const ACTION_MAPPING_FIELDS = [
  { key: 'clientName', label: 'Client name', placeholder: 'e.g. input[name="client_name"]' },
  { key: 'serviceType', label: 'Service type', placeholder: 'e.g. select#service-type' },
  { key: 'date', label: 'Date', placeholder: 'e.g. input[type="date"]' },
  { key: 'time', label: 'Time', placeholder: 'e.g. input[name="time"]' },
  { key: 'phone', label: 'Phone number', placeholder: 'e.g. input[type="tel"]' },
];

interface IntegrationDetailsModalProps {
  integration?: Integration; // undefined for new integration
  template?: IntegrationTemplate;
  selectedAgentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IntegrationFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  onTest?: (id: number) => Promise<IntegrationTestResult>;
  onPause?: (id: number) => Promise<void>;
  onResume?: (id: number) => Promise<void>;
  logs?: IntegrationLog[];
  isLoadingLogs?: boolean;
}

export const IntegrationDetailsModal: React.FC<IntegrationDetailsModalProps> = ({
  integration,
  template: providedTemplate,
  selectedAgentId,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onTest,
  onPause,
  onResume,
  logs = [],
  isLoadingLogs = false,
}) => {
  const [activeTab, setActiveTab] = useState<'configuration' | 'logs' | 'documentation'>(
    'configuration'
  );
  const [formData, setFormData] = useState<Partial<IntegrationFormData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<IntegrationTestResult | null>(null);
  const [recordingMessage, setRecordingMessage] = useState<string | null>(null);

  // Determine if this is edit mode or create mode
  const isEditMode = !!integration;

  // Get the template
  const template =
    providedTemplate || (integration?.type ? getTemplateById(integration.type) : null);

  // Initialize form data
  useEffect(() => {
    if (integration) {
      // Edit mode - populate from integration
      setFormData({
        name: integration.name,
        description: integration.description || '',
        type: integration.type || template?.id,
        apiKey: integration.apiKey || '',
        applicationId: integration.applicationId || '',
        clientSecret: integration.clientSecret || '',
        webhookSecret: integration.webhookSecret || '',
        apiEndpointUrl: integration.apiEndpointUrl || '',
        method: integration.method || 'POST',
        timeout: integration.timeout || 10000,
        webhookUrl: integration.webhookUrl || '',
        locationId: integration.locationId || '',
        timeZone: integration.timeZone || '',
        oauthCalendarId: integration.oauthCalendarId || '',
        sandboxMode: integration.sandboxMode || false,
        customQueryParams: integration.customQueryParams || {},
        jsonPayloadSchema: integration.jsonPayloadSchema || {},
        // Google Calendar configuration
        calendarSyncEnabled: integration.calendarSyncEnabled !== false,
        calendarMeetingDuration: integration.calendarMeetingDuration || 30,
        calendarBufferTime: integration.calendarBufferTime || 0,
        calendarMaxConcurrent: integration.calendarMaxConcurrent || 1,
        calendarEventTemplate: integration.calendarEventTemplate || '',
        calendarConfirmationMessage: integration.calendarConfirmationMessage || '',
        calendarReminderEnabled: integration.calendarReminderEnabled !== false,
        calendarReminderTime: integration.calendarReminderTime || 60,
        // Calendar selection
        enabledCalendars: integration.enabledCalendars || [],
      });
    } else if (template) {
      // Create mode - initialize with template defaults
      setFormData({
        name: template.name,
        description: template.description,
        type: template.id,
        method: 'POST',
        timeout: 10000,
        sandboxMode: false,
        ...(template.id === 'newo_magic' ? {
          customQueryParams: {
            magicSession: { keepAlive: true, reloginFrequency: 'on_failure', headlessMode: true },
          },
          jsonPayloadSchema: { actionMappings: {} },
        } : {}),
      });
    }
  }, [integration, template]);

  // Handle form field change
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);

    try {
      await onSave(formData as IntegrationFormData);
      onClose();
    } catch (error) {
      console.error('Error saving integration:', error);
      setTestResult({
        success: false,
        message: 'Failed to save integration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle test connection
  const handleTest = async () => {
    if (!integration?.id) {
      setTestResult({
        success: false,
        message: 'Please save the integration before testing',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await onTest!(integration.id as number);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Handle OAuth flow
  const handleOAuthConnect = async () => {
    if (template?.id === 'google_calendar') {
      try {
        // Construct URL as plain string to avoid template literal issues
        const checkUrl = '/api/integrations/google-calendar/check-config';
        console.log('Checking OAuth config at:', checkUrl);
        
        const checkResponse = await fetch(checkUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });

        console.log('Check response status:', checkResponse.status);

        if (!checkResponse.ok) {
          throw new Error('Server responded with status ' + checkResponse.status);
        }

        const checkData = await checkResponse.json();
        console.log('Check response data:', checkData);

        if (!checkData.configured) {
          const missingItems = [];
          if (checkData.missing?.clientId) missingItems.push('GOOGLE_OAUTH_CLIENT_ID');
          if (checkData.missing?.clientSecret) missingItems.push('GOOGLE_CALENDAR_CLIENT_SECRET');

          setTestResult({
            success: false,
            message: checkData.message || 'Google Calendar OAuth is not configured.',
            error: missingItems.length > 0
              ? 'Missing environment variables: ' + missingItems.join(', ') + '\n\nGet credentials from: ' + (checkData.setupUrl || 'https://console.cloud.google.com/apis/credentials')
              : 'Setup instructions: ' + (checkData.setupUrl || 'https://console.cloud.google.com/apis/credentials')
          });
          return;
        }

        // If configured, redirect to OAuth flow using plain string concatenation
        const connectUrl = '/api/integrations/google-calendar/connect?agentId=' + encodeURIComponent(selectedAgentId || '');
        console.log('Redirecting to OAuth:', connectUrl);
        window.location.href = connectUrl;
      } catch (error) {
        console.error('OAuth connection error:', error);
        setTestResult({
          success: false,
          message: 'Failed to check OAuth configuration.',
          error: error instanceof Error ? error.message : 'Unknown error. Please check the server logs.'
        });
      }
    }
  };

  // Magic integration helpers
  const isMagic = template?.id === 'newo_magic';
  const magicSession = isMagic
    ? ((formData.customQueryParams as any)?.magicSession || { keepAlive: true, reloginFrequency: 'on_failure', headlessMode: true })
    : null;
  const actionMappings = isMagic
    ? ((formData.jsonPayloadSchema as any)?.actionMappings || {})
    : null;

  const updateMagicSession = (key: string, value: any) => {
    const current = (formData.customQueryParams as Record<string, any>) || {};
    handleFieldChange('customQueryParams', {
      ...current,
      magicSession: { ...(current.magicSession || {}), [key]: value },
    });
  };

  const updateActionMapping = (field: string, value: string) => {
    const current = (formData.jsonPayloadSchema as Record<string, any>) || {};
    handleFieldChange('jsonPayloadSchema', {
      ...current,
      actionMappings: { ...(current.actionMappings || {}), [field]: value },
    });
  };

  // System → default login URL mapping (mirrors server/services/magicBrowserService.ts)
  const SYSTEM_LOGIN_URLS: Record<string, string> = {
    vagaro: 'https://www.vagaro.com/login',
    mindbody: 'https://clients.mindbodyonline.com',
    square_appointments: 'https://squareup.com/login',
    acuity: 'https://secure.acuityscheduling.com/login.php',
    booksy: 'https://booksy.com/en-us',
    fresha: 'https://partners.fresha.com/login',
    boulevard: 'https://dashboard.blvd.com/login',
    zenoti: 'https://app.zenoti.com',
    glossgenius: 'https://app.glossgenius.com/login',
    styleseat: 'https://www.styleseat.com/login',
    timely: 'https://app.gettimely.com/login',
    generic: '',
  };

  // When booking system is selected, persist in magicSession AND auto-fill login URL
  const handleSystemSelect = (system: string) => {
    const loginUrl = SYSTEM_LOGIN_URLS[system] || '';
    const current = (formData.customQueryParams as Record<string, any>) || {};
    setFormData((prev) => ({
      ...prev,
      selectedSystem: system,
      apiEndpointUrl: prev.apiEndpointUrl && prev.apiEndpointUrl !== '' &&
        !Object.values(SYSTEM_LOGIN_URLS).includes(prev.apiEndpointUrl as string)
        ? prev.apiEndpointUrl  // preserve custom URL
        : loginUrl,
      customQueryParams: {
        ...current,
        magicSession: { ...(current.magicSession || {}), selectedSystem: system },
      },
    }));
  };

  // Get status badge
  const getStatusBadge = () => {
    if (!integration) return null;

    switch (integration.status) {
      case 'connected':
        return (
          <Badge className="bg-green-500 text-white">
            <i className="fas fa-check-circle mr-1"></i>
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500 text-white">
            <i className="fas fa-exclamation-circle mr-1"></i>
            Error
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-yellow-500 text-white">
            <i className="fas fa-pause-circle mr-1"></i>
            Paused
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge className="bg-gray-400 text-white">
            <i className="fas fa-clock mr-1"></i>
            Pending
          </Badge>
        );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-1/2 sm:max-w-[50%] premium-card p-0 flex flex-col overflow-y-auto">
        <div className="p-6 pb-24">
          <SheetHeader>
            <div className="flex items-start justify-between pr-8">
              <div className="flex items-start gap-4">
                {/* Logo */}
                {template && (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0"
                    style={{ backgroundColor: template.color }}
                  >
                    <i className={template.icon}></i>
                  </div>
                )}

                <div>
                  <SheetTitle className="text-2xl mb-1 text-white">
                    {isEditMode ? integration.name : template?.name || 'New Integration'}
                  </SheetTitle>
                  <SheetDescription className="text-gray-400">
                    {isEditMode
                      ? 'View and manage integration settings'
                      : template?.description || 'Configure your integration'}
                  </SheetDescription>
                </div>
              </div>

              {/* Status Badge */}
              {isEditMode && <div className="flex-shrink-0">{getStatusBadge()}</div>}
            </div>
          </SheetHeader>

          {/* Tabs - Matching Subtab Styling (text-only) */}
          <div className="flex gap-4 mt-6 overflow-x-auto scrollbar-hide border-b border-gray-700 pb-2">
            <button
              className={`text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${
                activeTab === 'configuration'
                  ? 'text-white border-b-2 border-gray-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('configuration')}
              data-testid="tab-configuration"
            >
              Configuration
            </button>
            {isEditMode && (
              <button
                className={`text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'text-white border-b-2 border-gray-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('logs')}
                data-testid="tab-logs"
              >
                Activity
                {logs.length > 0 && (
                  <span className="ml-1 text-xs">({logs.length})</span>
                )}
              </button>
            )}
            {template?.documentationUrl && (
              <button
                className={`text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${
                  activeTab === 'documentation'
                    ? 'text-white border-b-2 border-gray-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('documentation')}
                data-testid="tab-documentation"
              >
                Documentation
              </button>
            )}
          </div>
        </div>

        {/* Tab Content - Scrollable Area with Fixed Height */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          {/* Configuration Tab */}
          {activeTab === 'configuration' && (
            <div className="space-y-6">
              {/* Auto-Configured Integration Notice */}
              {template?.autoConfigured && isEditMode && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                    <div className="flex items-start">
                      <i className="fas fa-check-circle text-green-400 mt-1 mr-3"></i>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-300 mb-1">
                          Automatically Configured
                        </h4>
                        <p className="text-sm text-green-200/80">
                          This integration has been automatically set up for you during account creation.
                          It's ready to use with your business phone number and requires no additional configuration.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connected Functions */}
                  {integration?.triggerFunctions && integration.triggerFunctions.length > 0 && (
                    <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                      <div className="flex items-start">
                        <i className="fas fa-plug text-blue-400 mt-1 mr-3"></i>
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-300 mb-2">
                            Connected Functions ({integration.triggerFunctions.length})
                          </h4>
                          <p className="text-sm text-blue-200/80 mb-3">
                            This integration automatically handles the following AI functions:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {integration.triggerFunctions.map((funcName: string) => (
                              <span
                                key={funcName}
                                className="px-2 py-1 bg-blue-800/30 border border-blue-700 rounded text-xs text-blue-200 font-mono"
                              >
                                {funcName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OAuth Integration */}
              {template?.isOAuth && !integration?.oauthAccessToken && (
                <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                  <div className="flex items-start">
                    <i className="fas fa-shield-alt text-blue-400 mt-1 mr-3"></i>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-300 mb-1">
                        OAuth Authentication Required
                      </h4>
                      <p className="text-sm text-blue-200/80 mb-3">
                        This integration requires OAuth authentication. Click the button below
                        to connect your account securely.
                      </p>
                      <Button
                        onClick={handleOAuthConnect}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <i className="fas fa-sign-in-alt mr-2"></i>
                        Connect with OAuth
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Form Fields */}
              {template?.requiredFields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>

                  {field.type === 'textarea' ? (
                    <Textarea
                      id={field.name}
                      placeholder={field.placeholder}
                      value={(formData as any)[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      rows={4}
                    />
                  ) : field.type === 'select' && field.options ? (
                    <Select
                      value={
                        field.name === 'selectedSystem'
                          ? ((formData.customQueryParams as any)?.magicSession?.selectedSystem || (formData as any)[field.name] || '')
                          : ((formData as any)[field.name] || field.defaultValue || '')
                      }
                      onValueChange={(value) =>
                        field.name === 'selectedSystem' && isMagic
                          ? handleSystemSelect(value)
                          : handleFieldChange(field.name, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'toggle' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={field.name}
                        checked={(formData as any)[field.name] || false}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-600">{field.helpText}</span>
                    </div>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={(formData as any)[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    />
                  )}

                  {field.helpText && field.type !== 'toggle' && (
                    <p className="text-sm text-gray-500">{field.helpText}</p>
                  )}
                </div>
              ))}

              {/* Magic Integration Sections */}
              {isMagic && (
                <>
                  {/* Test Connection Button */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={handleTest}
                      disabled={isTesting || !integration?.id}
                      variant="outline"
                      className="border-violet-600 text-violet-300 hover:bg-violet-900/20"
                    >
                      {isTesting ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i>Testing...</>
                      ) : (
                        <><i className="fas fa-plug mr-2"></i>Test Connection</>
                      )}
                    </Button>
                    {!integration?.id && (
                      <span className="text-xs text-gray-500">Save first to test connection</span>
                    )}
                  </div>

                  {/* Section 2: Session Settings */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                      <i className="fas fa-clock text-violet-400"></i>
                      Session Settings
                    </h3>

                    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div>
                        <div className="text-sm font-medium text-white">Keep session alive</div>
                        <div className="text-xs text-gray-400">Recommended — reduces re-login overhead</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={magicSession?.keepAlive !== false}
                          onChange={(e) => updateMagicSession('keepAlive', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <Label>Re-login Frequency</Label>
                      <Select
                        value={magicSession?.reloginFrequency || 'on_failure'}
                        onValueChange={(value) => updateMagicSession('reloginFrequency', value)}
                      >
                        <SelectTrigger className="bg-gray-800/50 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="every_call">On every call</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="on_failure">On failure (recommended)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div>
                        <div className="text-sm font-medium text-white">Headless mode</div>
                        <div className="text-xs text-gray-400">On by default. Turn off to see the browser UI while debugging.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={magicSession?.headlessMode !== false}
                          onChange={(e) => updateMagicSession('headlessMode', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Section 3: Action Mapping */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                        <i className="fas fa-arrows-left-right text-violet-400"></i>
                        Action Mapping
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-violet-600 text-violet-300 hover:bg-violet-900/20 text-xs"
                        onClick={() => setRecordingMessage('Walk through the booking once in your browser and the steps will be recorded automatically. This feature requires the Magic desktop recorder to be running.')}
                      >
                        <i className="fas fa-circle-dot mr-1.5 text-red-400"></i>
                        Record new action
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Map what the AI agent collects from the caller to the fields in your booking form.
                    </p>

                    {recordingMessage && (
                      <div className="p-3 bg-violet-900/20 border border-violet-700 rounded-lg text-xs text-violet-200 flex items-start gap-2">
                        <i className="fas fa-info-circle text-violet-400 mt-0.5 flex-shrink-0"></i>
                        <span>{recordingMessage}</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      {ACTION_MAPPING_FIELDS.map(({ key, label, placeholder }) => (
                        <div key={key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div className="text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded border border-gray-700 truncate">
                            {label}
                          </div>
                          <i className="fas fa-arrow-right text-gray-500 text-xs"></i>
                          <Input
                            placeholder={placeholder}
                            value={(actionMappings as any)?.[key] || ''}
                            onChange={(e) => updateActionMapping(key, e.target.value)}
                            className="bg-gray-800/50 border-gray-700 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 4: Test & Debug */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                      <i className="fas fa-flask text-violet-400"></i>
                      Test & Debug
                    </h3>

                    <Button
                      variant="outline"
                      disabled={!integration?.id || isTesting}
                      onClick={handleTest}
                      className="border-violet-600 text-violet-300 hover:bg-violet-900/20"
                    >
                      {isTesting ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i>Running test booking...</>
                      ) : (
                        <><i className="fas fa-vial mr-2"></i>Run test booking</>
                      )}
                    </Button>

                    {magicSession?.headlessMode === false && (
                      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <i className="fas fa-display text-gray-400"></i>
                          <span className="text-sm text-gray-300">Live Browser Preview</span>
                        </div>
                        <div className="bg-gray-900 rounded border border-gray-700 h-48 flex items-center justify-center">
                          <div className="text-center text-gray-500 text-sm">
                            <i className="fas fa-eye text-2xl mb-2 block text-gray-600"></i>
                            Browser preview available during an active test run
                          </div>
                        </div>
                      </div>
                    )}

                    {logs.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-400 uppercase font-medium tracking-wide">Recent Executions</div>
                        <div className="space-y-1.5">
                          {logs.slice(0, 5).map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between p-2.5 bg-gray-800/50 rounded border border-gray-700 text-xs"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <i className={`fas ${log.errorMessage ? 'fa-xmark text-red-400' : 'fa-check text-green-400'} flex-shrink-0`}></i>
                                <span className="text-gray-300 capitalize flex-shrink-0">{log.eventType}</span>
                                {log.errorMessage && (
                                  <span className="text-red-400 truncate">{log.errorMessage}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-gray-500 flex-shrink-0 ml-2">
                                {log.duration != null && <span>{log.duration}ms</span>}
                                <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Google Calendar Configuration Section */}
              {integration?.type === 'Calendar' && integration?.isOAuthIntegration && (
                <div className="space-y-6 pt-6">
                  {/* Available Calendars List */}
                  {integration.availableCalendars && Array.isArray(integration.availableCalendars) && integration.availableCalendars.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-base">
                        Available Calendars
                        <span className="text-xs text-gray-400 ml-2">
                          (Enable calendars to allow appointment booking)
                        </span>
                      </Label>
                      <div className="space-y-2 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        {integration.availableCalendars.map((calendar: any) => {
                          const isEnabled = Array.isArray(formData.enabledCalendars) 
                            ? formData.enabledCalendars.includes(calendar.id)
                            : Array.isArray(integration.enabledCalendars) 
                            ? integration.enabledCalendars.includes(calendar.id)
                            : calendar.primary;

                          return (
                            <div 
                              key={calendar.id} 
                              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900/80 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {/* Calendar Color Indicator */}
                                <div 
                                  className="w-4 h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: calendar.backgroundColor || '#4285F4' }}
                                ></div>
                                
                                {/* Calendar Info */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">{calendar.summary}</span>
                                    {calendar.primary && (
                                      <Badge className="bg-blue-500 text-white text-xs">Primary</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {calendar.accessRole} • {calendar.timeZone}
                                  </div>
                                </div>
                              </div>

                              {/* Toggle Switch */}
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={(e) => {
                                    const currentEnabled = Array.isArray(formData.enabledCalendars)
                                      ? formData.enabledCalendars
                                      : Array.isArray(integration.enabledCalendars)
                                      ? integration.enabledCalendars
                                      : [calendar.id];

                                    const newEnabled = e.target.checked
                                      ? [...currentEnabled.filter((id: string) => id !== calendar.id), calendar.id]
                                      : currentEnabled.filter((id: string) => id !== calendar.id);

                                    handleFieldChange('enabledCalendars', newEnabled);
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500">
                        <i className="fas fa-info-circle mr-1"></i>
                        The AI will check availability and book appointments in all enabled calendars
                      </p>
                    </div>
                  )}

                  {/* Real-Time Sync */}
                  <div className="space-y-2">
                    <Label htmlFor="calendarSyncEnabled" className="flex items-center gap-2">
                      Real-Time Sync
                      <span className="text-xs text-gray-400">(Two-way data flow)</span>
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="calendarSyncEnabled"
                        checked={formData.calendarSyncEnabled !== false}
                        onChange={(e) => handleFieldChange('calendarSyncEnabled', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-400">
                        Automatically sync calendar updates to prevent double bookings
                      </span>
                    </div>
                  </div>

                  {/* Meeting Duration */}
                  <div className="space-y-2">
                    <Label htmlFor="calendarMeetingDuration">
                      Default Meeting Duration (minutes)
                    </Label>
                    <Input
                      id="calendarMeetingDuration"
                      type="number"
                      min="5"
                      max="480"
                      placeholder="30"
                      value={formData.calendarMeetingDuration ?? 30}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 30 : parseInt(e.target.value, 10);
                        handleFieldChange('calendarMeetingDuration', isNaN(val) ? 30 : val);
                      }}
                    />
                    <p className="text-sm text-gray-500">
                      Default length for appointments booked by the AI
                    </p>
                  </div>

                  {/* Buffer Time */}
                  <div className="space-y-2">
                    <Label htmlFor="calendarBufferTime">
                      Gap/Buffer Time (minutes)
                    </Label>
                    <Input
                      id="calendarBufferTime"
                      type="number"
                      min="0"
                      max="120"
                      placeholder="0"
                      value={formData.calendarBufferTime ?? 0}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        handleFieldChange('calendarBufferTime', isNaN(val) ? 0 : val);
                      }}
                    />
                    <p className="text-sm text-gray-500">
                      Buffer time required between appointments
                    </p>
                  </div>

                  {/* Concurrent Events */}
                  <div className="space-y-2">
                    <Label htmlFor="calendarMaxConcurrent">
                      Maximum Concurrent Appointments
                    </Label>
                    <Input
                      id="calendarMaxConcurrent"
                      type="number"
                      min="1"
                      max="10"
                      placeholder="1"
                      value={formData.calendarMaxConcurrent ?? 1}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                        handleFieldChange('calendarMaxConcurrent', isNaN(val) ? 1 : val);
                      }}
                    />
                    <p className="text-sm text-gray-500">
                      How many overlapping appointments can be scheduled at the same time
                    </p>
                  </div>

                  {/* Event Description Template */}
                  <div className="space-y-2">
                    <Label htmlFor="calendarEventTemplate">
                      Event Description Template
                    </Label>
                    <Textarea
                      id="calendarEventTemplate"
                      placeholder="Customer: {name}&#10;Phone: {phone}&#10;Email: {email}&#10;Reason: {reason}&#10;&#10;Booked via AI Assistant"
                      value={formData.calendarEventTemplate || ''}
                      onChange={(e) => handleFieldChange('calendarEventTemplate', e.target.value)}
                      rows={6}
                    />
                    <p className="text-sm text-gray-500">
                      Template for event descriptions. Use {'{name}'}, {'{phone}'}, {'{email}'}, {'{reason}'} as placeholders
                    </p>
                  </div>

                  {/* Confirmation Message */}
                  <div className="space-y-2">
                    <Label htmlFor="calendarConfirmationMessage">
                      Confirmation Message
                    </Label>
                    <Textarea
                      id="calendarConfirmationMessage"
                      placeholder="Your appointment has been scheduled for {date} at {time}. We'll send you a reminder shortly."
                      value={formData.calendarConfirmationMessage || ''}
                      onChange={(e) => handleFieldChange('calendarConfirmationMessage', e.target.value)}
                      rows={3}
                    />
                    <p className="text-sm text-gray-500">
                      Message sent to customers after booking. Use {'{date}'}, {'{time}'} as placeholders
                    </p>
                  </div>

                  {/* Reminders */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.calendarReminderEnabled !== false}
                        onChange={(e) => handleFieldChange('calendarReminderEnabled', e.target.checked)}
                        className="w-4 h-4"
                      />
                      Send Appointment Reminders
                    </Label>
                    
                    {formData.calendarReminderEnabled !== false && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="calendarReminderTime">
                          Reminder Time (minutes before appointment)
                        </Label>
                        <Input
                          id="calendarReminderTime"
                          type="number"
                          min="5"
                          max="1440"
                          placeholder="60"
                          value={formData.calendarReminderTime ?? 60}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 60 : parseInt(e.target.value, 10);
                            handleFieldChange('calendarReminderTime', isNaN(val) ? 60 : val);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Test Result */}
              {testResult && (
                <div
                  className={`p-4 rounded-lg border ${
                    testResult.success
                      ? 'bg-green-900/20 border-green-800'
                      : 'bg-red-900/30 border-red-700'
                  }`}
                >
                  <div className="flex items-start">
                    <i
                      className={`${
                        testResult.success
                          ? 'fas fa-check-circle text-green-400'
                          : 'fas fa-exclamation-circle text-red-400'
                      } mt-1 mr-3`}
                    ></i>
                    <div className="flex-1">
                      <h4
                        className={`font-medium mb-1 ${
                          testResult.success ? 'text-green-300' : 'text-red-300'
                        }`}
                      >
                        {testResult.success ? 'Test Successful' : 'Test Failed'}
                      </h4>
                      <p
                        className={`text-sm ${
                          testResult.success ? 'text-green-200/80' : 'text-red-200/80'
                        }`}
                      >
                        {testResult.message}
                      </p>
                      {testResult.error && (
                        <pre className="mt-2 text-xs bg-gray-900 p-2 rounded border border-red-800 overflow-x-auto text-red-200">
                          {testResult.error}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity Logs Tab */}
          {activeTab === 'logs' && integration && (
            <IntegrationLogs
              integrationId={integration.id as number}
              logs={logs}
              isLoading={isLoadingLogs}
            />
          )}

          {/* Documentation Tab */}
          {activeTab === 'documentation' && (
            <div className="space-y-4">
              <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-white">
                  <i className="fas fa-book mr-2 text-blue-400"></i>
                  Integration Documentation
                </h3>

                {template?.setupGuideUrl && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-300 mb-2">Setup Guide</h4>
                    <a
                      href={template.setupGuideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      View step-by-step setup instructions
                      <i className="fas fa-external-link-alt ml-2 text-xs"></i>
                    </a>
                  </div>
                )}

                {template?.documentationUrl && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-300 mb-2">API Documentation</h4>
                    <a
                      href={template.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      View official API documentation
                      <i className="fas fa-external-link-alt ml-2 text-xs"></i>
                    </a>
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded">
                  <p className="text-sm text-blue-200/80">
                    <i className="fas fa-info-circle mr-2"></i>
                    Need help? Contact support or check our knowledge base for common
                    integration issues.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end border-t border-gray-700 pt-6 px-6 pb-6 flex-shrink-0">
          <div className="flex items-center gap-3">

            {/* Save Button */}
            {activeTab === 'configuration' && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    {isEditMode ? 'Save Changes' : 'Create Integration'}
                  </>
                )}
              </Button>
            )}

            {/* Close Button */}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
