/**
 * Voicebot Row Component
 *
 * Renders a single row in the voicebots table with voicebot information,
 * metrics, and action buttons.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Voicebot } from './types';
import { Bot } from 'lucide-react';

interface VoicebotRowProps {
  voicebot: Voicebot;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (voicebot: Voicebot) => void;
  onDelete: (voicebot: Voicebot) => void;
  onNavigateToAgent: (voicebot: Voicebot) => void;
}

export const VoicebotRow: React.FC<VoicebotRowProps> = ({
  voicebot,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onNavigateToAgent,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const actionsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position
  useEffect(() => {
    if (showActions && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 224, // 224px = width of dropdown (w-56)
      });
    }
  }, [showActions]);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActions]);

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

  // Get status badge
  const getStatusBadge = () => {
    const isActive = !!voicebot.phoneNumber;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
        isActive ? 'bg-green-600' : 'bg-gray-500/20'
      } ${isActive ? 'text-white' : 'text-gray-400'} text-xs font-medium`}>
        <i className={isActive ? 'fas fa-check-circle' : 'fas fa-clock'}></i>
        <span>{isActive ? 'Active' : 'Inactive'}</span>
      </div>
    );
  };

  const displayName = voicebot.businessName || voicebot.name || 'Unnamed Agent';
  const location = voicebot.city && voicebot.state
    ? `${voicebot.city}, ${voicebot.state}`
    : voicebot.city || voicebot.state || '';

  // Get metrics with defaults
  const metrics = voicebot.metrics || {
    minutesUsed: 0,
    totalCalls: 0,
    textsSent: 0,
    contactsGathered: 0,
    membersAssigned: 0,
    knowledgeBaseItems: 0,
    activeIntegrations: 0,
  };

  return (
    <tr
      className={`transition-colors ${
        isSelected
          ? 'bg-gray-800/50'
          : 'hover:bg-gray-800/30'
      } cursor-pointer`}
      onClick={(e) => {
        // Only select if clicking on the row itself, not on buttons or interactive elements
        if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('a')) {
          onSelect(voicebot.id);
        }
      }}
      data-testid={`row-${voicebot.id}`}
    >
      {/* Avatar with Bot Icon */}
      <td className="px-3 sm:px-4 py-3">
        <div
          className="relative w-10 h-10 cursor-pointer"
          data-testid={`avatar-${voicebot.id}`}
        >
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white transition-all"
          >
            <Bot className="w-6 h-6" />
          </div>

          {/* Overlay with checkmark when selected */}
          {isSelected && (
            <div className="absolute inset-0 bg-gray-800/50 rounded-full flex items-center justify-center">
              <i className="fas fa-check text-white text-lg"></i>
            </div>
          )}
        </div>
      </td>

      {/* Name with City and Phone subtext */}
      <td className="px-3 sm:px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-white font-medium text-sm sm:text-base hover:text-blue-400 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToAgent(voicebot);
            }}
          >
            {displayName}
          </span>
          {/* City and Phone on second line */}
          {(location || voicebot.phoneNumber) && (
            <div className="text-xs text-gray-400">
              {location && <span>{location}</span>}
              {location && voicebot.phoneNumber && <span> • </span>}
              {voicebot.phoneNumber && (
                <a
                  href={`tel:${voicebot.phoneNumber}`}
                  className="hover:text-blue-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {formatPhoneNumber(voicebot.phoneNumber)}
                </a>
              )}
            </div>
          )}
        </div>
      </td>

      {/* Minutes - Hidden on smaller screens */}
      <td className="px-3 sm:px-4 py-3 hidden xl:table-cell">
        <span className="text-gray-300 text-sm">{metrics.minutesUsed.toLocaleString()}</span>
      </td>

      {/* Calls - Hidden on smaller screens */}
      <td className="px-3 sm:px-4 py-3 hidden xl:table-cell">
        <span className="text-gray-300 text-sm">{metrics.totalCalls.toLocaleString()}</span>
      </td>

      {/* Texts - Hidden on smaller screens */}
      <td className="px-3 sm:px-4 py-3 hidden xl:table-cell">
        <span className="text-gray-300 text-sm">{metrics.textsSent.toLocaleString()}</span>
      </td>

      {/* Contacts */}
      <td className="px-3 sm:px-4 py-3">
        <span className="text-gray-300 text-sm">{metrics.contactsGathered.toLocaleString()}</span>
      </td>

      {/* Members */}
      <td className="px-3 sm:px-4 py-3">
        <span className="text-gray-300 text-sm">{metrics.membersAssigned}</span>
      </td>

      {/* Memory */}
      <td className="px-3 sm:px-4 py-3">
        <span className="text-gray-300 text-sm">{metrics.knowledgeBaseItems}</span>
      </td>

      {/* Integrations */}
      <td className="px-3 sm:px-4 py-3">
        <span className="text-gray-300 text-sm">{metrics.activeIntegrations}</span>
      </td>

      {/* Status - Hidden on mobile, shown on tablet+ */}
      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
        {getStatusBadge()}
      </td>

      {/* Actions */}
      <td className="px-3 sm:px-4 py-3">
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          data-testid={`button-actions-${voicebot.id}`}
        >
          <i className="fas fa-ellipsis-v"></i>
        </button>

        {showActions && createPortal(
          <div
            ref={actionsRef}
            className="fixed w-56 premium-card text-white rounded-lg shadow-xl z-[100]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <div className="py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(voicebot);
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
                data-testid={`action-edit-${voicebot.id}`}
              >
                <i className="fas fa-edit text-gray-400"></i>
                <span>Edit Voicebot</span>
              </button>

              <div className="h-px bg-gray-700 my-1"></div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(voicebot);
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2 text-red-400"
                data-testid={`action-delete-${voicebot.id}`}
              >
                <i className="fas fa-trash"></i>
                <span>Delete Voicebot</span>
              </button>
            </div>
          </div>,
          document.body
        )}
      </td>
    </tr>
  );
};
