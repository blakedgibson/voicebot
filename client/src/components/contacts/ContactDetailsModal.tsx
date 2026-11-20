import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  User,
  TrendingUp,
  PhoneCall,
  FileText,
  X,
  Plus,
  Flag,
  Clock,
  Brain
} from 'lucide-react';

interface EnhancedCallRecord {
  id: string;
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration?: number;
  startTime: string;
  endTime?: string;
  recordingUrl?: string;
  transcriptionText?: string;
  aiResponse?: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'Positive' | 'Neutral' | 'Negative';
  sentimentScore?: number;
  actionTaken?: string;
  conversationData?: Array<{ role: 'user' | 'assistant', content: string }>;
  customerName?: string;
  interactionType?: string;
  summary?: string;
  tags?: string[];
  callOutcome?: string;
}

interface SmsMessage {
  id: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  body: string;
  timestamp: string;
  status: string;
}

interface CustomerContact {
  id: string;
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
  callHistory: EnhancedCallRecord[];
  smsMessages?: SmsMessage[];
  totalCalls: number;
  lastCallDate: string;
  averageDuration: number;
  totalDuration: number;
  sentimentScore: number;
  callTypeBreakdown: Record<string, number>;
  successfulCalls: number;
  revenue?: number;
  lifetimeValue?: number;
  segment?: string;
}

interface ContactDetailsModalProps {
  contact: CustomerContact | null;
  isOpen: boolean;
  onClose: () => void;
  industry?: string;
  agentId?: string;
  onUpdate?: () => void;
}

export const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({
  contact,
  isOpen,
  onClose,
  industry = 'restaurant',
  agentId,
  onUpdate
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedPreferences, setEditedPreferences] = useState({
    stylist: '',
    service: '',
    appointmentDuration: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [callHistoryPage, setCallHistoryPage] = useState(0);
  const [memories, setMemories] = useState<Array<{ id: string; name: string; value: string }>>([]);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newMemoryName, setNewMemoryName] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [aiMemory, setAiMemory] = useState<Record<string, any> | null>(null);
  const [isLoadingAiMemory, setIsLoadingAiMemory] = useState(false);

  // Load memories from contact notes
  React.useEffect(() => {
    if (contact && contact.notes && typeof contact.notes === 'string') {
      try {
        const parsed = JSON.parse(contact.notes);
        if (parsed && typeof parsed === 'object') {
          // Convert object to array of memories
          const memoryArray = Object.entries(parsed)
            .filter(([key]) => key !== 'stylist' && key !== 'service' && key !== 'appointmentDuration') // Exclude old preference fields
            .map(([key, value]) => ({
              id: Math.random().toString(36).substr(2, 9),
              name: key,
              value: String(value)
            }));
          setMemories(memoryArray);
        }
      } catch (e) {
        // If parsing fails, initialize empty memories
        setMemories([]);
      }
    } else {
      setMemories([]);
    }
  }, [contact?.notes]);

  // Fetch AI-generated memory from customerMemories table
  useEffect(() => {
    if (!contact?.phoneNumber || !agentId || !isOpen) {
      setAiMemory(null);
      return;
    }
    setIsLoadingAiMemory(true);
    fetch(`/api/customer-memories/${agentId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { memories: [] })
      .then(data => {
        const memories: any[] = data.memories || [];
        const match = memories.find(
          (m: any) => m.customerProfile?.phoneNumber === contact.phoneNumber
        );
        if (match?.content) {
          try {
            const parsed = JSON.parse(match.content);
            setAiMemory(parsed);
          } catch {
            setAiMemory(null);
          }
        } else {
          setAiMemory(null);
        }
      })
      .catch(() => setAiMemory(null))
      .finally(() => setIsLoadingAiMemory(false));
  }, [contact?.phoneNumber, agentId, isOpen]);

  if (!contact) return null;

  // Debug: Log contact data
  console.log('👤 ContactDetailsModal - Contact data:', {
    id: contact.id,
    phoneNumber: contact.phoneNumber,
    normalizedPhone: contact.normalizedPhone,
    customerName: contact.customerName,
    notes: contact.notes
  });

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('+1')) {
      const cleaned = phone.slice(2);
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      // Today - show "Today" + time
      if (dateMidnight.getTime() === today.getTime()) {
        return `Today, ${date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`;
      }

      // Yesterday
      if (dateMidnight.getTime() === yesterday.getTime()) {
        return `Yesterday, ${date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`;
      }

      // Within this year
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }

      // Other years
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
    }
  };

  // Extract preferences from call history or saved notes
  const extractPreferences = () => {
    // First, try to load from saved notes
    if (contact.notes && typeof contact.notes === 'string') {
      try {
        const saved = JSON.parse(contact.notes);
        if (saved && typeof saved === 'object') {
          return {
            stylist: saved.stylist || null,
            service: saved.service || null,
            appointmentDuration: saved.appointmentDuration || null
          };
        }
      } catch (e) {
        // If parsing fails, fall through to extraction from call history
      }
    }

    // Otherwise, extract from call history
    const preferences: any = {
      stylist: null,
      service: null,
      appointmentDuration: null
    };

    // Count stylist mentions in summaries
    const stylistMentions: Record<string, number> = {};
    const serviceMentions: Record<string, number> = {};

    contact.callHistory.forEach(call => {
      const summary = call.summary || call.aiResponse || '';
      const lower = summary.toLowerCase();

      // Look for common stylist/staff names (you can enhance this with actual data)
      const staffMatch = summary.match(/(?:with|by|booked|scheduled)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (staffMatch && staffMatch[1]) {
        const name = staffMatch[1];
        stylistMentions[name] = (stylistMentions[name] || 0) + 1;
      }

      // Look for service mentions
      if (lower.includes('lash') || lower.includes('lashes')) {
        serviceMentions['Classic Lashes'] = (serviceMentions['Classic Lashes'] || 0) + 1;
      }
      if (lower.includes('manicure') || lower.includes('nails')) {
        serviceMentions['Manicure'] = (serviceMentions['Manicure'] || 0) + 1;
      }
      if (lower.includes('massage')) {
        serviceMentions['Massage'] = (serviceMentions['Massage'] || 0) + 1;
      }
      if (lower.includes('haircut') || lower.includes('hair cut')) {
        serviceMentions['Haircut'] = (serviceMentions['Haircut'] || 0) + 1;
      }
    });

    // Get most mentioned stylist
    const topStylist = Object.entries(stylistMentions).sort((a, b) => b[1] - a[1])[0];
    if (topStylist) {
      preferences.stylist = `${topStylist[0]} (Booked ${topStylist[1]}x)`;
    }

    // Get most mentioned service
    const topService = Object.entries(serviceMentions).sort((a, b) => b[1] - a[1])[0];
    if (topService) {
      preferences.service = topService[0];
    }

    return preferences;
  };

  const preferences = extractPreferences();

  const handleSaveName = async (newName: string) => {
    if (!newName.trim() || newName === contact.customerName) {
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);
    try {
      // Ensure phone number is properly formatted
      let phoneNumber = contact.phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        // If it's a 10-digit number, add +1
        const digits = phoneNumber.replace(/\D/g, '');
        if (digits.length === 10) {
          phoneNumber = `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
          phoneNumber = `+${digits}`;
        } else {
          phoneNumber = `+${digits}`;
        }
      }

      const requestBody = {
        phoneNumber: phoneNumber,
        normalizedPhone: contact.normalizedPhone || phoneNumber,
        customerName: newName.trim()
      };

      console.log('💾 Saving contact name:', requestBody);

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to save contact name - Status:', response.status, 'Error:', errorData);
        alert(`Failed to save name: ${JSON.stringify(errorData)}`);
        throw new Error('Failed to update contact name');
      }

      const result = await response.json();
      console.log('✅ Contact name saved successfully:', result);

      setIsEditingName(false);

      // Notify parent component to refresh data
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error: any) {
      console.error('Error saving name:', error);
      if (!error.message.includes('Failed to update contact name')) {
        alert(`Failed to save name. Error: ${error.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreference = async (field: string, value: string) => {
    const currentPrefs = extractPreferences();
    const updatedPrefs = {
      ...currentPrefs,
      [field]: value.trim()
    };

    setIsSaving(true);
    try {
      console.log('💾 Saving preference:', {
        phoneNumber: contact.phoneNumber,
        field,
        value: value.trim(),
        allPrefs: updatedPrefs,
        notesString: JSON.stringify(updatedPrefs)
      });

      // Ensure phone number is properly formatted
      let phoneNumber = contact.phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        // If it's a 10-digit number, add +1
        const digits = phoneNumber.replace(/\D/g, '');
        if (digits.length === 10) {
          phoneNumber = `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
          phoneNumber = `+${digits}`;
        } else {
          phoneNumber = `+${digits}`;
        }
      }

      const requestBody = {
        phoneNumber: phoneNumber,
        normalizedPhone: contact.normalizedPhone || phoneNumber,
        customerName: contact.customerName || 'Guest',
        notes: JSON.stringify(updatedPrefs)
      };

      console.log('📤 Request body:', requestBody);

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to save preference - Status:', response.status, 'Error:', errorData);
        alert(`Failed to save preference: ${JSON.stringify(errorData)}`);
        throw new Error('Failed to update preference');
      }

      const result = await response.json();
      console.log('✅ Preference saved successfully:', result);

      setEditingField(null);

      // Notify parent component to refresh data
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error: any) {
      console.error('Error saving preference:', error);
      if (!error.message.includes('Failed to update preference')) {
        alert(`Failed to save preference. Error: ${error.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMemories = async (updatedMemories: Array<{ id: string; name: string; value: string }>) => {
    setIsSaving(true);
    try {
      // Convert memories array to object
      const memoriesObject: Record<string, string> = {};
      updatedMemories.forEach(memory => {
        memoriesObject[memory.name] = memory.value;
      });

      // Ensure phone number is properly formatted
      let phoneNumber = contact.phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        const digits = phoneNumber.replace(/\D/g, '');
        if (digits.length === 10) {
          phoneNumber = `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
          phoneNumber = `+${digits}`;
        } else {
          phoneNumber = `+${digits}`;
        }
      }

      const requestBody = {
        phoneNumber: phoneNumber,
        normalizedPhone: contact.normalizedPhone || phoneNumber,
        customerName: contact.customerName || 'Guest',
        notes: JSON.stringify(memoriesObject)
      };

      console.log('💾 Saving memories:', requestBody);

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to save memories - Status:', response.status, 'Error:', errorData);
        alert(`Failed to save memories: ${JSON.stringify(errorData)}`);
        throw new Error('Failed to update memories');
      }

      const result = await response.json();
      console.log('✅ Memories saved successfully:', result);

      // Notify parent component to refresh data
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error: any) {
      console.error('Error saving memories:', error);
      if (!error.message.includes('Failed to update memories')) {
        alert(`Failed to save memories. Error: ${error.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemoryName.trim() || !newMemoryValue.trim()) {
      alert('Please provide both memory name and value');
      return;
    }

    const newMemory = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMemoryName.trim(),
      value: newMemoryValue.trim()
    };

    const updatedMemories = [...memories, newMemory];
    setMemories(updatedMemories);
    setIsAddingMemory(false);
    setNewMemoryName('');
    setNewMemoryValue('');

    await handleSaveMemories(updatedMemories);
  };

  const handleDeleteMemory = async (memoryId: string) => {
    const updatedMemories = memories.filter(m => m.id !== memoryId);
    setMemories(updatedMemories);
    await handleSaveMemories(updatedMemories);
  };

  const handleUpdateMemory = async (memoryId: string, name: string, value: string) => {
    const updatedMemories = memories.map(m =>
      m.id === memoryId ? { ...m, name: name.trim(), value: value.trim() } : m
    );
    setMemories(updatedMemories);
    setEditingMemoryId(null);
    await handleSaveMemories(updatedMemories);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-1/2 sm:max-w-[50%] premium-card p-0 flex flex-col overflow-y-auto [&>button]:hidden">
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* A. Header Card - Identity */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    {isEditingName ? (
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="bg-transparent border-none text-white text-xl font-semibold p-0 m-0 h-auto leading-tight focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                        style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}
                        autoFocus
                        disabled={isSaving}
                        onBlur={() => {
                          handleSaveName(editedName);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveName(editedName);
                          } else if (e.key === 'Escape') {
                            setIsEditingName(false);
                          }
                        }}
                      />
                    ) : (
                      <h2
                        className="text-xl font-semibold text-white cursor-text leading-tight"
                        onClick={() => {
                          setEditedName(contact.customerName || 'Guest');
                          setIsEditingName(true);
                        }}
                      >
                        {contact.customerName || 'Guest'}
                      </h2>
                    )}
                    <p className="text-gray-400 text-sm font-mono">
                      {formatPhoneNumber(contact.phoneNumber)}
                    </p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white ml-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* AI-Generated Memory */}
            {agentId && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-400" />
                  AI-Learned Memory
                </h3>
                {isLoadingAiMemory ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin" />
                    Loading AI memory…
                  </div>
                ) : aiMemory && Object.keys(aiMemory).filter(k => k !== 'booking_history' && aiMemory[k]).length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(aiMemory)
                      .filter(([k, v]) => k !== 'booking_history' && v)
                      .map(([key, value]) => (
                        <div key={key} className="flex gap-3 items-start bg-gray-800/40 rounded-lg px-3 py-2">
                          <span className="text-xs text-gray-400 min-w-[140px] capitalize font-medium">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-white">{String(value)}</span>
                        </div>
                      ))}
                    {aiMemory.booking_history && Array.isArray(aiMemory.booking_history) && aiMemory.booking_history.length > 0 && (
                      <div className="bg-gray-800/40 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-400 font-medium mb-1">Booking History</p>
                        <div className="space-y-1">
                          {(aiMemory.booking_history as any[]).slice(-5).reverse().map((b: any, i: number) => (
                            <p key={i} className="text-xs text-white">
                              {b.date ? new Date(b.date).toLocaleDateString() : ''} — {b.service}{b.staff ? ` with ${b.staff}` : ''}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    No AI memory yet. Memory is built automatically during calls.
                  </p>
                )}
              </div>
            )}

            {agentId && <Separator className="bg-gray-700" />}

            {/* B. Memory Bank - Customer Memory */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-400" />
                    Manual Notes
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    <i className="fas fa-info-circle mr-1"></i>
                    Store manual notes and preferences that the AI can reference during calls.
                  </p>
                </div>
                <Button
                  onClick={() => setIsAddingMemory(true)}
                  variant="outline"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  disabled={isAddingMemory || isSaving}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 whitespace-nowrap">
                        Memory Name
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 whitespace-nowrap">
                        Memory Value
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-300 whitespace-nowrap w-20">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {/* Add new memory row */}
                    {isAddingMemory && (
                      <tr className="bg-blue-900/20">
                        <td className="px-3 py-3">
                          <Input
                            value={newMemoryName}
                            onChange={(e) => setNewMemoryName(e.target.value)}
                            placeholder="e.g., Customer Name"
                            className="bg-transparent border-gray-800 text-gray-300 text-sm"
                            autoFocus
                            disabled={isSaving}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            value={newMemoryValue}
                            onChange={(e) => setNewMemoryValue(e.target.value)}
                            placeholder="e.g., Jeff Seid"
                            className="bg-transparent border-gray-800 text-gray-300 text-sm"
                            disabled={isSaving}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddMemory();
                              } else if (e.key === 'Escape') {
                                setIsAddingMemory(false);
                                setNewMemoryName('');
                                setNewMemoryValue('');
                              }
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={handleAddMemory}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                              disabled={isSaving}
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => {
                                setIsAddingMemory(false);
                                setNewMemoryName('');
                                setNewMemoryValue('');
                              }}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              disabled={isSaving}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Display existing memories */}
                    {memories.map((memory) => (
                      <tr key={memory.id} className="hover:bg-gray-800/50">
                        <td className="px-3 py-3">
                          {editingMemoryId === memory.id ? (
                            <Input
                              defaultValue={memory.name}
                              id={`edit-name-${memory.id}`}
                              className="bg-transparent border-gray-800 text-gray-300 text-sm"
                              disabled={isSaving}
                            />
                          ) : (
                            <span className="text-sm text-white font-medium">{memory.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingMemoryId === memory.id ? (
                            <Input
                              defaultValue={memory.value}
                              id={`edit-value-${memory.id}`}
                              className="bg-transparent border-gray-800 text-gray-300 text-sm"
                              disabled={isSaving}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const nameInput = document.getElementById(`edit-name-${memory.id}`) as HTMLInputElement;
                                  const valueInput = document.getElementById(`edit-value-${memory.id}`) as HTMLInputElement;
                                  handleUpdateMemory(memory.id, nameInput.value, valueInput.value);
                                } else if (e.key === 'Escape') {
                                  setEditingMemoryId(null);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-sm text-gray-300">{memory.value}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {editingMemoryId === memory.id ? (
                              <>
                                <Button
                                  onClick={() => {
                                    const nameInput = document.getElementById(`edit-name-${memory.id}`) as HTMLInputElement;
                                    const valueInput = document.getElementById(`edit-value-${memory.id}`) as HTMLInputElement;
                                    handleUpdateMemory(memory.id, nameInput.value, valueInput.value);
                                  }}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                                  disabled={isSaving}
                                >
                                  Save
                                </Button>
                                <Button
                                  onClick={() => setEditingMemoryId(null)}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  disabled={isSaving}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  onClick={() => setEditingMemoryId(memory.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 hover:bg-gray-700"
                                  disabled={isSaving}
                                >
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleDeleteMemory(memory.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 hover:bg-red-900/30 hover:text-red-400"
                                  disabled={isSaving}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty state message */}
              {memories.length === 0 && !isAddingMemory && (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No customer memory entries yet. Click "Add" to create one.</p>
                </div>
              )}
            </div>

            {/* D. Call History */}
            <Separator className="bg-gray-700" />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-cyan-400" />
                Call History
              </h3>

              {contact.callHistory.length === 0 ? (
                <div className="premium-card rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-500">No call history recorded yet</p>
                </div>
              ) : (() => {
                const CALLS_PER_PAGE = 5;
                const totalPages = Math.ceil(contact.callHistory.length / CALLS_PER_PAGE);
                const pagedCalls = contact.callHistory.slice(
                  callHistoryPage * CALLS_PER_PAGE,
                  (callHistoryPage + 1) * CALLS_PER_PAGE
                );
                return (
                <div className="space-y-3">
                  {pagedCalls.map((call) => {
                    const getInteractionTypeColor = (type?: string) => {
                      const colorMap: Record<string, string> = {
                        'reservation': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                        'appointment': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                        'order': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
                        'delivery': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
                        'catering': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
                        'faq': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
                        'other': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
                      };
                      return colorMap[type || 'other'] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
                    };

                    const getCallOutcomeColor = (outcome?: string) => {
                      if (!outcome) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
                      const outcomeLower = outcome.toLowerCase();
                      if (outcomeLower.includes('booked') || outcomeLower.includes('placed') || outcomeLower.includes('scheduled')) {
                        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
                      }
                      if (outcomeLower.includes('faq') || outcomeLower.includes('inquiry')) {
                        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
                      }
                      if (outcomeLower.includes('transfer')) {
                        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
                      }
                      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
                    };

                    return (
                      <div
                        key={call.id}
                        className="premium-card rounded-lg p-4 hover:bg-gray-800/50 transition-colors space-y-3"
                      >
                        {/* Header: Date/Time, Type, Outcome, and Flag */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white">
                              {formatDateTime(call.startTime)}
                            </span>
                            <Badge className={getInteractionTypeColor(call.interactionType)}>
                              {call.interactionType || ''}
                            </Badge>
                            <Badge className={getCallOutcomeColor(call.callOutcome)}>
                              {call.callOutcome || ''}
                            </Badge>
                          </div>

                          {/* Flagged Icon */}
                          {call.flagged && (
                            <Flag className="h-4 w-4 text-orange-400 fill-orange-400 flex-shrink-0" />
                          )}
                        </div>

                        {/* Duration */}
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>Duration: {formatDuration(call.duration || 0)}</span>
                        </div>

                        {/* AI Summary */}
                        {(call.summary || call.aiResponse) && (
                          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
                            <p className="text-sm text-blue-200">
                              {call.summary || call.aiResponse}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setCallHistoryPage(p => Math.max(0, p - 1))}
                        disabled={callHistoryPage === 0}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-gray-500">
                        {callHistoryPage * CALLS_PER_PAGE + 1}–{Math.min((callHistoryPage + 1) * CALLS_PER_PAGE, contact.callHistory.length)} of {contact.callHistory.length}
                      </span>
                      <button
                        onClick={() => setCallHistoryPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={callHistoryPage >= totalPages - 1}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
                );
              })()}
            </div>

            {/* Quick Stats */}
            <Separator className="bg-gray-700" />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Quick Stats
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Calls Card */}
                <div className="premium-card rounded-lg">
                  <div className="p-3 md:p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                      <div className="flex-1">
                        <p className="text-gray-400 text-xs md:text-sm">Calls</p>
                        <p className="text-xl md:text-2xl font-bold text-white">{contact.totalCalls}</p>
                      </div>
                      <div className="w-8 md:w-10 h-8 md:h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center self-start">
                        <i className="fas fa-phone text-blue-400 text-sm"></i>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Revenue Card */}
                <div className="premium-card rounded-lg">
                  <div className="p-3 md:p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                      <div className="flex-1">
                        <p className="text-gray-400 text-xs md:text-sm">Revenue</p>
                        <p className="text-xl md:text-2xl font-bold text-white">${(contact.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="w-8 md:w-10 h-8 md:h-10 bg-green-500/20 rounded-lg flex items-center justify-center self-start">
                        <i className="fas fa-dollar-sign text-green-400 text-sm"></i>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Since Card */}
                <div className="premium-card rounded-lg">
                  <div className="p-3 md:p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                      <div className="flex-1">
                        <p className="text-gray-400 text-xs md:text-sm">Customer Since</p>
                        <p className="text-sm md:text-base font-bold text-white">{formatDate(contact.firstCallDate)}</p>
                      </div>
                      <div className="w-8 md:w-10 h-8 md:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center self-start">
                        <i className="fas fa-user-clock text-purple-400 text-sm"></i>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Last Active Card */}
                <div className="premium-card rounded-lg">
                  <div className="p-3 md:p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                      <div className="flex-1">
                        <p className="text-gray-400 text-xs md:text-sm">Last Active</p>
                        <p className="text-sm md:text-base font-bold text-white">{formatDate(contact.lastCallDate)}</p>
                      </div>
                      <div className="w-8 md:w-10 h-8 md:h-10 bg-orange-500/20 rounded-lg flex items-center justify-center self-start">
                        <i className="fas fa-history text-orange-400 text-sm"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
