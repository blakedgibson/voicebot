import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react';

interface LiveCall {
  id: string;
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
  status: string;
  duration?: number;
  startTime: string;
  transcriptionText?: string;
  customerName?: string;
}

interface LiveCallsDisplayProps {
  agentId?: string;
}

export function LiveCallsDisplay({ agentId }: LiveCallsDisplayProps) {
  const [currentTimes, setCurrentTimes] = useState<Record<string, number>>({});
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch active calls. Poll every 5 seconds — fast enough to show live calls quickly
  // without hammering the server every second.
  const { data: activeCalls = [], isLoading } = useQuery<LiveCall[]>({
    queryKey: ['/api/telephony/calls/active', agentId],
    queryFn: async () => {
      const url = agentId
        ? `/api/telephony/calls/active?agentId=${agentId}`
        : `/api/telephony/calls/active`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch active calls');
      return response.json();
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    staleTime: 3000,
    placeholderData: (previousData) => previousData,
  });

  // Update live elapsed duration every second — only when there are active calls
  useEffect(() => {
    if (activeCalls.length === 0) return;

    const interval = setInterval(() => {
      const newTimes: Record<string, number> = {};
      activeCalls.forEach((call) => {
        const startTime = new Date(call.startTime).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        newTimes[call.id] = elapsed;
      });
      setCurrentTimes(newTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCalls]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !Object.values(buttonRefs.current).some(
          (ref) => ref && ref.contains(event.target as Node)
        )
      ) {
        setOpenActionId(null);
      }
    };

    if (openActionId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openActionId]);

  // Calculate dropdown position
  useEffect(() => {
    if (openActionId && buttonRefs.current[openActionId]) {
      const rect = buttonRefs.current[openActionId]!.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 180,
      });
    }
  }, [openActionId]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format phone number
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'Unknown';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.slice(1);
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handleActionClick = (callId: string) => {
    if (openActionId === callId) {
      setOpenActionId(null);
    } else {
      setOpenActionId(callId);
    }
  };

  if (isLoading || activeCalls.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No Active Calls</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 h-3 w-3 bg-green-500 rounded-full animate-ping"></div>
        </div>
        <h3 className="text-lg font-semibold text-white">
          Live Calls ({activeCalls.length})
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Name</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Phone Number</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Duration</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeCalls.map((call) => {
              const elapsed = currentTimes[call.id] || 0;
              const isRinging = call.status === 'ringing' || call.status === 'queued' || call.status === 'initiated';

              return (
                <tr
                  key={call.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  {/* Name */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                          <i className="fas fa-phone text-white text-sm"></i>
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                          <span
                            className={`h-3 w-3 rounded-full block ${
                              isRinging
                                ? 'bg-yellow-400 animate-pulse'
                                : 'bg-green-400'
                            }`}
                          ></span>
                        </div>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {call.customerName || 'Unknown Caller'}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {isRinging ? 'Ringing' : 'In Progress'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Phone Number */}
                  <td className="py-4 px-4">
                    <span className="text-gray-300 text-sm">
                      {formatPhoneNumber(call.fromNumber)}
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm">
                        {formatDuration(elapsed)}
                      </span>
                      <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-right">
                    <button
                      ref={(el) => { buttonRefs.current[call.id] = el; }}
                      onClick={() => handleActionClick(call.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                      data-testid={`button-actions-${call.id}`}
                    >
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dropdown Portal */}
      {openActionId && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-44 premium-card text-white rounded-lg shadow-xl z-[100]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          <div className="py-1">
            <button
              onClick={() => {
                console.log('View call details:', openActionId);
                setOpenActionId(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
            >
              <i className="fas fa-eye w-4 text-blue-400"></i>
              <span>View Details</span>
            </button>
            <button
              onClick={() => {
                console.log('Transfer call:', openActionId);
                setOpenActionId(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
            >
              <i className="fas fa-phone-alt w-4 text-green-400"></i>
              <span>Transfer Call</span>
            </button>
            <button
              onClick={() => {
                console.log('End call:', openActionId);
                setOpenActionId(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2 text-red-400"
            >
              <i className="fas fa-phone-slash w-4"></i>
              <span>End Call</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
