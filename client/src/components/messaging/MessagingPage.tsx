import React, { useState, useMemo, useEffect } from 'react';
import { Send, Search, Phone, Info, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ContactDetailsModal } from '@/components/contacts/ContactDetailsModal';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  direction: 'sent' | 'received';
  status?: 'sent' | 'delivered' | 'read';
}

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  messageCount: number;
  lastMessageTime: string;
  lastMessage?: string;
  messages: Message[];
}

interface MessagingPageProps {
  contacts?: Contact[];
  isLoading?: boolean;
  onNavigateToContacts?: (contactPhone: string) => void;
  onRefreshMessages?: () => void;
  initialSelectedPhone?: string | null;
}

export const MessagingPage: React.FC<MessagingPageProps> = ({ contacts = [], isLoading = false, onNavigateToContacts, onRefreshMessages, initialSelectedPhone }) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isMakingCall, setIsMakingCall] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const { toast } = useToast();

  // Auto-select contact when initialSelectedPhone is provided
  useEffect(() => {
    if (initialSelectedPhone && contacts.length > 0) {
      const contact = contacts.find(c => c.phoneNumber === initialSelectedPhone);
      if (contact && (!selectedContact || selectedContact.phoneNumber !== initialSelectedPhone)) {
        handleContactSelect(contact);
      }
    }
  }, [initialSelectedPhone, contacts]);

  // Fetch conversation history from Twilio when a contact is selected
  const fetchConversationHistory = async (phoneNumber: string) => {
    setIsLoadingConversation(true);
    try {
      console.log(`📱 Fetching conversation history for: ${phoneNumber}`);
      const response = await fetch(`/api/messaging/sms/conversation?contactPhone=${encodeURIComponent(phoneNumber)}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ Could not fetch conversation history:', errorData.error);
        return;
      }

      const data = await response.json();
      console.log(`✅ Loaded ${data.messages?.length || 0} messages from Twilio`);
      
      if (data.messages && data.messages.length > 0) {
        setConversationMessages(data.messages);
      }
    } catch (error) {
      console.error('❌ Error fetching conversation history:', error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setConversationMessages(contact.messages || []);
    // Fetch fresh conversation history from Twilio
    fetchConversationHistory(contact.phoneNumber);
  };

  // Update selected contact when contacts change (e.g., new messages arrive)
  useEffect(() => {
    if (selectedContact) {
      const updatedContact = contacts.find(c => c.phoneNumber === selectedContact.phoneNumber);
      if (updatedContact) {
        setSelectedContact(updatedContact);
        // Merge with conversation messages fetched from Twilio
        if (conversationMessages.length === 0) {
          setConversationMessages(updatedContact.messages || []);
        }
      }
    }
  }, [contacts]);

  // Generate initials from name
  const generateInitials = (name: string) => {
    if (!name || name === 'Unknown') return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Get avatar color based on name
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

  // Get relative time (same format as Calls page)
  const getRelativeTime = (date: Date | string) => {
    const now = new Date();
    const then = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
    return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format phone number
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.phoneNumber.includes(query)
    );
  }, [contacts, searchQuery]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContact || isSendingMessage) return;

    const messageToSend = messageInput;
    setIsSendingMessage(true);
    
    // Optimistically add the message to the conversation
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageToSend,
      timestamp: new Date().toISOString(),
      direction: 'sent',
      status: 'sent'
    };
    setConversationMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');
    
    try {
      const response = await fetch('/api/messaging/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedContact.phoneNumber,
          body: messageToSend,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        // Remove optimistic message on failure
        setConversationMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        throw new Error(data.error || 'Failed to send message');
      }

      toast({
        title: "Message Sent",
        description: `Your message was sent to ${selectedContact.name}`,
      });

      // Refresh messages from server
      if (onRefreshMessages) {
        onRefreshMessages();
      }

      // Refresh conversation from Twilio after a short delay to get the actual message
      setTimeout(() => {
        fetchConversationHistory(selectedContact.phoneNumber);
      }, 1500);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to Send",
        description: error.message || 'Could not send message. Please try again.',
        variant: 'destructive',
      });
      // Restore message input on failure
      setMessageInput(messageToSend);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle making a call
  const handleMakeCall = async () => {
    if (!selectedContact || isMakingCall) return;

    setIsMakingCall(true);
    try {
      const response = await fetch('/api/messaging/make-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedContact.phoneNumber,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to make call');
      }

      toast({
        title: "Call Initiated",
        description: `Calling ${selectedContact.name} at ${formatPhoneNumber(selectedContact.phoneNumber)}`,
      });
    } catch (error: any) {
      console.error('Error making call:', error);
      toast({
        title: "Call Failed",
        description: error.message || 'Could not initiate call. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsMakingCall(false);
    }
  };

  // Handle mobile back button
  const handleBackToContacts = () => {
    setSelectedContact(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Contacts List */}
        <div className={`${selectedContact ? 'hidden lg:flex' : 'flex'} lg:w-[380px] w-full flex-col h-full overflow-hidden`}>
          {/* Header */}
          <div className="mb-6 flex-shrink-0 px-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border-gray-800 text-gray-300 placeholder-gray-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Contacts List */}
          <ScrollArea className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                  <Send className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">No conversations yet</h3>
                <p className="text-gray-500 text-sm">
                  {searchQuery ? 'No contacts match your search' : 'Start a conversation to see it here'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleContactSelect(contact)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-gray-800/50 transition-colors ${
                      selectedContact?.id === contact.id ? 'bg-gray-800/70' : ''
                    }`}
                  >
                    {/* Contact Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-300 truncate">{contact.name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {getRelativeTime(contact.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 truncate">
                          {formatPhoneNumber(contact.phoneNumber)}
                        </span>
                        <span className="text-xs text-gray-600 ml-2 flex-shrink-0">
                          {contact.messageCount} msg{contact.messageCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Side - Messaging Area */}
        <div className={`${selectedContact ? 'flex' : 'hidden lg:flex'} flex-1 flex-col min-w-0 h-full overflow-hidden border-l border-gray-800`}>
          {selectedContact ? (
            <>
              {/* Message Header - Sticky at top of conversation area */}
              <div className="bg-[#0D0D0D] pb-4 px-6 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={handleBackToContacts}
                    className="lg:hidden p-2 hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-300" />
                  </button>

                  {/* Contact Name & Phone */}
                  <div>
                    <h3 className="font-semibold text-gray-300">{selectedContact.name || 'Unknown'}</h3>
                    <p className="text-xs text-gray-500">{formatPhoneNumber(selectedContact.phoneNumber)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowContactDetails(true)}
                    className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                    title="View contact details"
                  >
                    <Info className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {isLoadingConversation ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-gray-500 text-sm">Loading conversation...</p>
                      </div>
                    </div>
                  ) : conversationMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    conversationMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] sm:max-w-[60%] rounded-2xl px-4 py-2 ${
                            message.direction === 'sent'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <p className={`text-xs mt-1 ${message.direction === 'sent' ? 'text-blue-200' : 'text-gray-400'}`}>
                            {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Message Input - Sticky at bottom of conversation area */}
              <div className="sticky bottom-0 bg-[#0D0D0D] p-4 border-t border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="iMessage"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="bg-transparent border-gray-800 text-gray-300 placeholder-gray-500 rounded-full pr-12 focus:border-blue-500"
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isSendingMessage}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingMessage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // Empty State - No Contact Selected
            <div className="hidden lg:flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-12 h-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a contact from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Details Modal */}
      {selectedContact && (
        <ContactDetailsModal
          contact={{
            id: selectedContact.id,
            customerName: selectedContact.name,
            phoneNumber: selectedContact.phoneNumber,
            email: '',
            lastCallTime: selectedContact.lastMessageTime,
            totalCalls: selectedContact.messageCount,
            averageDuration: 0,
            notes: [],
            tags: [],
            segment: 'Standard',
            lifetimeValue: 0,
            callHistory: []
          }}
          isOpen={showContactDetails}
          onClose={() => setShowContactDetails(false)}
          onViewCallHistory={() => {}}
        />
      )}
    </div>
  );
};
