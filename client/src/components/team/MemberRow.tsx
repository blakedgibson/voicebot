/**
 * Member Row Component
 *
 * Renders a single row in the members table with member information,
 * call transfer stats, messages received, and action buttons.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TableMember, VoiceAgent } from './types';
import { formatDistanceToNow } from 'date-fns';

interface MemberRowProps {
  member: TableMember;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onManagePermissions: (member: TableMember) => void;
  onSuspend: (member: TableMember) => void;
  onReactivate: (member: TableMember) => void;
  onResendInvite: (member: TableMember) => void;
  onRevokeInvite: (member: TableMember) => void;
  onRemove: (member: TableMember) => void;
  onViewHistory: (member: TableMember) => void;
  onSetDefaultTransfer: (memberId: string) => void;
  availableAgents: VoiceAgent[];
  selectedAgentId: string | null;
  defaultCallTransferMemberId?: string | null;
}

export const MemberRow: React.FC<MemberRowProps> = ({
  member,
  isSelected,
  onSelect,
  onManagePermissions,
  onSuspend,
  onReactivate,
  onResendInvite,
  onRevokeInvite,
  onRemove,
  onViewHistory,
  onSetDefaultTransfer,
  availableAgents,
  selectedAgentId,
  defaultCallTransferMemberId,
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

  // Get role-based profile picture colors
  const getRoleColor = () => {
    const roleColors: Record<string, { from: string; to: string; icon: string }> = {
      owner: { from: 'from-yellow-500', to: 'to-yellow-600', icon: 'fas fa-crown' },
      manager: { from: 'from-purple-500', to: 'to-purple-600', icon: 'fas fa-user-tie' },
      employee: { from: 'from-blue-500', to: 'to-blue-600', icon: 'fas fa-user' },
      custom: { from: 'from-gray-500', to: 'to-gray-600', icon: 'fas fa-cog' },
    };

    return roleColors[member.role] || roleColors.employee;
  };

  // Get status badge
  const getStatusBadge = () => {
    const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
      active: { label: 'Active', icon: 'fas fa-check-circle', color: 'bg-green-600' },
      invited: { label: 'Invited', icon: 'fas fa-clock', color: 'bg-blue-600' },
      suspended: { label: 'Suspended', icon: 'fas fa-ban', color: 'bg-red-600' },
    };

    const config = statusConfig[member.status] || statusConfig.active;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${config.color} text-white text-xs font-medium`}>
        <i className={config.icon}></i>
        <span>{config.label}</span>
      </div>
    );
  };

  // Get assigned agents display
  const getAssignedAgents = () => {
    if (member.role === 'owner') {
      return <span className="text-gray-400 text-sm italic">All Agents</span>;
    }

    if (!member.assignedAgentIds || member.assignedAgentIds.length === 0) {
      return <span className="text-gray-500 text-sm italic">No agents</span>;
    }

    const assignedAgents = availableAgents.filter((agent) =>
      member.assignedAgentIds?.includes(agent.id)
    );

    if (assignedAgents.length === 0) {
      return (
        <span className="text-gray-500 text-sm italic">{member.assignedAgentIds.length} agent(s)</span>
      );
    }

    if (assignedAgents.length === 1) {
      return <span className="text-gray-300 text-sm">{assignedAgents[0].agentName}</span>;
    }

    return (
      <span className="text-gray-300 text-sm">
        {assignedAgents.length} agents
      </span>
    );
  };

  const isOwner = member.isOwner || member.role === 'owner';
  const isPending = member.isPending || member.status === 'invited';
  const canEdit = !member.isCurrentUser;
  const roleColor = getRoleColor();

  // Get member settings from data
  const callTransferCount = 0; // TODO: Get from member data
  const messagesReceivedCount = 0; // TODO: Get from member data
  const hasCallTransferEnabled = member.enableCallTransfer || false;
  const hasSMSEnabled = member.enableSMS || false;
  const isDefaultTransfer = defaultCallTransferMemberId === member.id;

  // Check if member can be set as default transfer (must be assigned to selected agent and have call transfer enabled)
  const canSetAsDefaultTransfer = 
    selectedAgentId && 
    hasCallTransferEnabled && 
    member.assignedAgentIds?.includes(selectedAgentId) &&
    !isDefaultTransfer;

  return (
    <tr 
      className={`transition-colors ${
        isSelected && canEdit 
          ? 'bg-gray-800/50' 
          : 'hover:bg-gray-800/30'
      } ${canEdit ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        // Only select if clicking on the row itself, not on buttons or interactive elements
        if (canEdit && !(e.target as HTMLElement).closest('button')) {
          onSelect(member.id);
        }
      }}
      data-testid={`row-${member.id}`}
    >
      {/* Role (avatar) */}
      <td className="px-3 sm:px-4 py-3">
        <div
          className="relative w-10 h-10 flex-shrink-0"
          data-testid={`avatar-${member.id}`}
        >
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColor.from} ${roleColor.to} flex items-center justify-center text-white font-semibold transition-all`}
          >
            <i className={roleColor.icon}></i>
          </div>
          {isSelected && canEdit && (
            <div className="absolute inset-0 bg-gray-800/50 rounded-full flex items-center justify-center">
              <i className="fas fa-check text-white text-lg"></i>
            </div>
          )}
        </div>
      </td>

      {/* Name */}
      <td className="px-3 sm:px-4 py-3">
        <span className="text-white font-medium text-sm sm:text-base">{member.name}</span>
      </td>

      {/* Email */}
      <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
        <span className="text-gray-400 text-sm">{member.email || ''}</span>
      </td>

      {/* Phone Number */}
      <td className="px-3 sm:px-4 py-3 hidden xl:table-cell">
        <span className="text-gray-400 text-sm">{member.phoneNumber || ''}</span>
      </td>

      {/* Voicebots - Hidden on smaller screens */}
      <td className="px-3 sm:px-4 py-3 hidden xl:table-cell">{getAssignedAgents()}</td>

      {/* Call Transfer - Hidden on smaller screens */}
      <td className="px-3 sm:px-4 py-3 hidden 2xl:table-cell">
        <span className="text-gray-300 text-sm">{callTransferCount}</span>
      </td>

      {/* Messages Received - Hidden on smaller screens */}
      <td className="px-3 sm:px-4 py-3 hidden 2xl:table-cell">
        <span className="text-gray-300 text-sm">{messagesReceivedCount}</span>
      </td>

      {/* Actions */}
      <td className="px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Call Transfer Icon */}
          {hasCallTransferEnabled && (
            <div 
              className={isDefaultTransfer ? "text-yellow-500" : "text-green-500"} 
              title={isDefaultTransfer ? "Default Call Transfer" : "Call Transfer Enabled"}
            >
              <i className={isDefaultTransfer ? "fas fa-phone-arrow-right fa-lg" : "fas fa-phone-arrow-right"}></i>
            </div>
          )}

          {/* SMS Icon */}
          {hasSMSEnabled && (
            <div className="text-blue-500" title="SMS Messaging Enabled">
              <i className="fas fa-sms"></i>
            </div>
          )}

          {/* Actions Menu */}
          {canEdit && (
            <>
              <button
                ref={buttonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                data-testid={`button-actions-${member.id}`}
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
                        onManagePermissions(member);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
                      data-testid={`action-manage-permissions-${member.id}`}
                    >
                      <i className="fas fa-shield-alt w-4"></i>
                      <span>Manage Permissions</span>
                    </button>

                    {/* Set as Default Call Transfer - only show for Owner viewing */}
                    {canSetAsDefaultTransfer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetDefaultTransfer(member.id);
                          setShowActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-yellow-400 hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
                        data-testid={`action-set-default-transfer-${member.id}`}
                      >
                        <i className="fas fa-star w-4"></i>
                        <span>Set as Default Transfer</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHistory(member);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
                      data-testid={`action-view-history-${member.id}`}
                    >
                      <i className="fas fa-history w-4"></i>
                      <span>View History</span>
                    </button>

                    <div className="border-t border-gray-800 my-1"></div>

                    {isPending ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onResendInvite(member);
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
                          data-testid={`action-resend-invite-${member.id}`}
                        >
                          <i className="fas fa-envelope w-4"></i>
                          <span>Resend Invite</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRevokeInvite(member);
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-orange-400 hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
                          data-testid={`action-revoke-invite-${member.id}`}
                        >
                          <i className="fas fa-ban w-4"></i>
                          <span>Revoke Invite</span>
                        </button>
                      </>
                    ) : member.status === 'suspended' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReactivate(member);
                          setShowActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
                        data-testid={`action-reactivate-${member.id}`}
                      >
                        <i className="fas fa-user-check w-4"></i>
                        <span>Reactivate</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSuspend(member);
                          setShowActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-orange-400 hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
                        data-testid={`action-suspend-${member.id}`}
                      >
                        <i className="fas fa-user-slash w-4"></i>
                        <span>Suspend</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(member);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center gap-2"
                      data-testid={`action-remove-${member.id}`}
                    >
                      <i className="fas fa-trash w-4"></i>
                      <span>Remove</span>
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
};
