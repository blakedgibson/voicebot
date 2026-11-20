/**
 * Members Table Component
 *
 * Main container component for team member management.
 * Handles data fetching, filtering, selection, and all member operations.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TeamMember,
  TableMember,
  MemberFilters as MemberFiltersType,
  MemberRole,
  MemberStatus,
  VoiceAgent,
} from './types';
import { MemberFilters } from './MemberFilters';
import { MemberRow } from './MemberRow';
import { BulkActionsBar } from './BulkActionsBar';
import { ManagePermissionsModal } from './ManagePermissionsModal';
import { AuditLogModal } from './AuditLogModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MembersTableProps {
  selectedAgentId: string | null;
  onOpenInviteModal: () => void;
  defaultCallTransferMemberId?: string | null;
}

export const MembersTable: React.FC<MembersTableProps> = ({ selectedAgentId, onOpenInviteModal, defaultCallTransferMemberId }) => {
  const [filters, setFilters] = useState<MemberFiltersType>({
    search: '',
    role: 'all',
    status: 'all',
  });
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedMember, setSelectedMember] = useState<TableMember | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'remove' | 'suspend' | 'reactivate', member?: TableMember }>({ type: 'remove' });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch team members
  const {
    data: membersData,
    isLoading: isLoadingMembers,
  } = useQuery<{ members: TeamMember[] }>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const response = await fetch('/api/team/members');
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    },
  });

  // Fetch voice agents for agent assignment
  const {
    data: voiceAgents = [],
  } = useQuery<VoiceAgent[]>({
    queryKey: ['voice-agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to fetch voice agents');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const members = membersData?.members || [];

  // Filter members
  const filteredMembers = useMemo(() => {
    let filtered = [...members] as TableMember[];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower)
      );
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter((m) => m.role === filters.role);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((m) => m.status === filters.status);
    }

    // Agent filter (when specific agent selected in sidebar)
    if (selectedAgentId) {
      filtered = filtered.filter(
        (m) =>
          m.role === 'owner' ||
          m.assignedAgentIds?.includes(selectedAgentId) ||
          false
      );
    }

    return filtered;
  }, [members, filters, selectedAgentId]);

  // Calculate counts for filter chips
  const roleCounts = useMemo(() => {
    const counts: Record<MemberRole | 'all', number> = {
      all: members.length,
      owner: 0,
      manager: 0,
      employee: 0,
      custom: 0,
    };

    members.forEach((m) => {
      counts[m.role as MemberRole] = (counts[m.role as MemberRole] || 0) + 1;
    });

    return counts;
  }, [members]);

  const statusCounts = useMemo(() => {
    const counts: Record<MemberStatus | 'all', number> = {
      all: members.length,
      active: 0,
      invited: 0,
      suspended: 0,
    };

    members.forEach((m) => {
      counts[m.status as MemberStatus] = (counts[m.status as MemberStatus] || 0) + 1;
    });

    return counts;
  }, [members]);

  // Selection handlers
  const handleSelectMember = (id: string) => {
    const newSelection = new Set(selectedMemberIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMemberIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.size === filteredMembers.filter((m) => !m.isCurrentUser).length) {
      setSelectedMemberIds(new Set());
    } else {
      const allIds = filteredMembers
        .filter((m) => !m.isCurrentUser)
        .map((m) => m.id);
      setSelectedMemberIds(new Set(allIds));
    }
  };

  // Check if all filtered members are selected
  const selectableMembers = filteredMembers.filter((m) => !m.isCurrentUser);
  const allSelected = selectableMembers.length > 0 && selectedMemberIds.size === selectableMembers.length;
  const someSelected = selectedMemberIds.size > 0 && selectedMemberIds.size < selectableMembers.length;

  const handleClearSelection = () => {
    setSelectedMemberIds(new Set());
  };

  // Member action handlers
  const handleManagePermissions = (member: TableMember) => {
    setSelectedMember(member);
    setShowPermissionsModal(true);
  };

  const handleViewHistory = (member: TableMember) => {
    setSelectedMember(member);
    setShowAuditModal(true);
  };

  const handleSuspend = (member: TableMember) => {
    setConfirmAction({ type: 'suspend', member });
    setShowConfirmModal(true);
  };

  const executeSuspend = async (member: TableMember) => {
    try {
      const response = await fetch(`/api/team/members/${member.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Suspended by admin' }),
      });

      if (!response.ok) throw new Error('Failed to suspend member');

      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: `${member.name} has been suspended`,
      });
      setShowConfirmModal(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to suspend member',
        variant: 'destructive',
      });
    }
  };

  const handleReactivate = (member: TableMember) => {
    setConfirmAction({ type: 'reactivate', member });
    setShowConfirmModal(true);
  };

  const executeReactivate = async (member: TableMember) => {
    try {
      const response = await fetch(`/api/team/members/${member.id}/reactivate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to reactivate member');

      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: `${member.name} has been reactivated`,
      });
      setShowConfirmModal(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reactivate member',
        variant: 'destructive',
      });
    }
  };

  const handleResendInvite = async (member: TableMember) => {
    if (!member.invitationId) return;

    try {
      const response = await fetch(`/api/team/invitations/${member.invitationId}/resend`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to resend invitation');

      toast({
        title: 'Success',
        description: `Invitation resent to ${member.email}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend invitation',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeInvite = async (member: TableMember) => {
    if (!member.invitationId) return;
    if (!confirm(`Are you sure you want to revoke the invitation for ${member.email}?`)) return;

    try {
      const response = await fetch(`/api/team/invitations/${member.invitationId}/revoke`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to revoke invitation');

      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: `Invitation revoked for ${member.email}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke invitation',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = (member: TableMember) => {
    setConfirmAction({ type: 'remove', member });
    setShowConfirmModal(true);
  };

  const executeRemove = async (member: TableMember) => {
    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove member');

      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: `${member.name} has been removed`,
      });
      setShowConfirmModal(false);
      setSelectedMemberIds(new Set()); // Clear selections
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  // Get selected members
  const selectedMembers = filteredMembers.filter(m => selectedMemberIds.has(m.id));

  // Bulk action handlers
  const handleBulkManagePermissions = () => {
    // Open permissions modal for first selected member
    if (selectedMembers.length > 0) {
      handleManagePermissions(selectedMembers[0]);
    }
  };

  const handleBulkSuspend = () => {
    setConfirmAction({ type: 'suspend' });
    setShowConfirmModal(true);
  };

  const handleBulkReactivate = () => {
    setConfirmAction({ type: 'reactivate' });
    setShowConfirmModal(true);
  };

  const executeBulkReactivate = async () => {
    const promises = Array.from(selectedMemberIds).map(id =>
      fetch(`/api/team/members/${id}/reactivate`, { method: 'POST' })
    );

    try {
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: `${selectedMemberIds.size} member(s) reactivated`,
      });
      setShowConfirmModal(false);
      setSelectedMemberIds(new Set());
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reactivate members',
        variant: 'destructive',
      });
    }
  };

  const handleBulkRemove = () => {
    setConfirmAction({ type: 'remove' });
    setShowConfirmModal(true);
  };

  const executeBulkSuspend = async () => {
    const promises = Array.from(selectedMemberIds).map(async (id) => {
      const member = filteredMembers.find(m => m.id === id);
      if (member) {
        return fetch(`/api/team/members/${id}/suspend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Suspended by admin' }),
        });
      }
    });

    try {
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: `${selectedMemberIds.size} member(s) suspended`,
      });
      setShowConfirmModal(false);
      setSelectedMemberIds(new Set());
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to suspend members',
        variant: 'destructive',
      });
    }
  };

  const executeBulkRemove = async () => {
    const promises = Array.from(selectedMemberIds).map(id =>
      fetch(`/api/team/members/${id}`, { method: 'DELETE' })
    );

    try {
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: `${selectedMemberIds.size} member(s) removed`,
      });
      setShowConfirmModal(false);
      setSelectedMemberIds(new Set());
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove members',
        variant: 'destructive',
      });
    }
  };

  // Invite member handler
  const handleInviteMember = async (data: any) => {
    try {
      const response = await apiRequest('/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to send invitation');

      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: `Invitation sent to ${data.email}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Update member role handler
  const handleUpdateMemberRole = async (memberId: string, data: any) => {
    try {
      console.log('🔧 Updating member role:', { memberId, data });
      const response = await apiRequest('PATCH', `/api/team/members/${memberId}`, data);

      console.log('✅ Role update successful');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
    } catch (error) {
      console.error('❌ Role update error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update member role',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Update member agents handler
  const handleUpdateMemberAgents = async (memberId: string, data: any) => {
    try {
      const response = await apiRequest('PATCH', `/api/team/members/${memberId}/agents`, data);

      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({
        title: 'Success',
        description: 'Agent access updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update agent access',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Set default call transfer member handler
  const handleSetDefaultTransfer = async (memberId: string) => {
    if (!selectedAgentId) {
      toast({
        title: 'Error',
        description: 'Please select an agent first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiRequest('PATCH', `/api/agents/${selectedAgentId}/default-transfer-member`, {
        memberId
      });

      queryClient.invalidateQueries({ queryKey: ['voice-agents'] });
      queryClient.invalidateQueries({ queryKey: ['selected-agent'] });
      toast({
        title: 'Success',
        description: 'Default call transfer member updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set default call transfer member',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Filters */}
      <MemberFilters
        filters={filters}
        onFilterChange={setFilters}
        roleCounts={roleCounts}
        statusCounts={statusCounts}
        onInvite={onOpenInviteModal}
      />

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto flex-1 w-full">
        <table className="w-full min-w-max">
          <thead className="sticky top-0 z-10 bg-[#0D0D0D]">
            <tr className="border-b border-gray-800 h-[52px]">
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                Role
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                Name
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap hidden lg:table-cell">
                Email
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap hidden xl:table-cell">
                Phone Number
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap hidden xl:table-cell">
                Voicebots
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap hidden 2xl:table-cell">
                Call Transfer
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap hidden 2xl:table-cell">
                Messages Received
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                        <i className="fas fa-users text-2xl text-gray-500"></i>
                      </div>
                      <h4 className="text-lg font-medium text-white mb-2">No members found</h4>
                      <p className="text-gray-400">
                        {filters.search || filters.role !== 'all' || filters.status !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Invite your first team member to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isSelected={selectedMemberIds.has(member.id)}
                    onSelect={handleSelectMember}
                    onManagePermissions={handleManagePermissions}
                    onSuspend={handleSuspend}
                    onReactivate={handleReactivate}
                    onResendInvite={handleResendInvite}
                    onRevokeInvite={handleRevokeInvite}
                    onRemove={handleRemove}
                    onViewHistory={handleViewHistory}
                    onSetDefaultTransfer={handleSetDefaultTransfer}
                    availableAgents={voiceAgents}
                    selectedAgentId={selectedAgentId}
                    defaultCallTransferMemberId={defaultCallTransferMemberId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedMemberIds.size}
        selectedMembers={selectedMembers}
        onManagePermissions={handleBulkManagePermissions}
        onSuspend={handleBulkSuspend}
        onReactivate={handleBulkReactivate}
        onRemove={handleBulkRemove}
        onClearSelection={handleClearSelection}
      />

      {/* Modals */}
      <ManagePermissionsModal
        isOpen={showPermissionsModal}
        member={selectedMember}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedMember(null);
        }}
        onUpdate={async (memberId, data) => {
          try {
            // Update role
            if (data.role) {
              await handleUpdateMemberRole(memberId, { role: data.role });
            }
            // Update agents
            if (data.assignedAgentIds !== undefined) {
              await handleUpdateMemberAgents(memberId, { assignedAgentIds: data.assignedAgentIds });
            }
          } catch (error) {
            throw error;
          }
        }}
        availableAgents={voiceAgents}
      />
      <AuditLogModal
        isOpen={showAuditModal}
        member={selectedMember}
        onClose={() => {
          setShowAuditModal(false);
          setSelectedMember(null);
        }}
      />
      <ConfirmActionModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          if (confirmAction.type === 'remove') {
            if (confirmAction.member) {
              executeRemove(confirmAction.member);
            } else {
              executeBulkRemove();
            }
          } else if (confirmAction.type === 'suspend') {
            if (confirmAction.member) {
              executeSuspend(confirmAction.member);
            } else {
              executeBulkSuspend();
            }
          } else if (confirmAction.type === 'reactivate') {
            if (confirmAction.member) {
              executeReactivate(confirmAction.member);
            } else {
              executeBulkReactivate();
            }
          }
        }}
        title={
          confirmAction.type === 'remove'
            ? 'Remove Member(s)'
            : confirmAction.type === 'suspend'
            ? 'Suspend Member(s)'
            : 'Reactivate Member(s)'
        }
        message={
          confirmAction.type === 'remove'
            ? confirmAction.member
              ? `Are you sure you want to remove ${confirmAction.member.name}? This action cannot be undone.`
              : `Are you sure you want to remove ${selectedMemberIds.size} member(s)? This action cannot be undone.`
            : confirmAction.type === 'suspend'
              ? confirmAction.member
                ? `Are you sure you want to suspend ${confirmAction.member.name}?`
                : `Are you sure you want to suspend ${selectedMemberIds.size} member(s)?`
              : confirmAction.member
                ? `Are you sure you want to reactivate ${confirmAction.member.name}?`
                : `Are you sure you want to reactivate ${selectedMemberIds.size} member(s)?`
        }
        confirmText={
          confirmAction.type === 'remove'
            ? 'Remove'
            : confirmAction.type === 'suspend'
            ? 'Suspend'
            : 'Reactivate'
        }
        confirmButtonClass={
          confirmAction.type === 'remove'
            ? 'bg-red-600 hover:bg-red-700'
            : confirmAction.type === 'suspend'
            ? 'bg-orange-600 hover:bg-orange-700'
            : 'bg-green-600 hover:bg-green-700'
        }
        icon={
          confirmAction.type === 'remove'
            ? 'fa-trash'
            : confirmAction.type === 'suspend'
            ? 'fa-user-slash'
            : 'fa-user-check'
        }
      />
    </div>
  );
};
