/**
 * Voicebot Table Component
 *
 * Main container component for voicebot management.
 * Handles filtering, selection, and all voicebot operations.
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Voicebot,
  VoicebotFilters as VoicebotFiltersType,
  VoicebotStatus,
  VoicebotMetrics,
} from './types';
import { VoicebotFilters } from './VoicebotFilters';
import { VoicebotRow } from './VoicebotRow';
import { BulkActionsBar } from './BulkActionsBar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface VoicebotTableProps {
  voicebots: any[]; // Voice agents data from API
  isLoading: boolean;
  onCreateVoicebot: () => void;
  onNavigateToAgent: (voicebot: Voicebot) => void;
  userSubscription?: any; // User subscription data for trial restrictions
  onDeleteSuccess?: () => void;
}

export const VoicebotTable: React.FC<VoicebotTableProps> = ({
  voicebots = [],
  isLoading,
  onCreateVoicebot,
  onNavigateToAgent,
  userSubscription,
  onDeleteSuccess,
}) => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<VoicebotFiltersType>({
    search: '',
    status: 'all',
  });
  const [selectedVoicebotIds, setSelectedVoicebotIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [voicebotToDelete, setVoicebotToDelete] = useState<Voicebot | null>(null);
  const [isDeletingVoicebot, setIsDeletingVoicebot] = useState(false);

  // Fetch real metrics from the backend
  const { data: metricsData } = useQuery<Record<string, VoicebotMetrics>>({
    queryKey: ['/api/voice-agents/metrics'],
  });

  // Transform voicebots data to include metrics
  const transformedVoicebots: Voicebot[] = useMemo(() => {
    return voicebots.map((agent) => {
      const agentMetrics = metricsData?.[agent.id];
      const metrics: VoicebotMetrics = {
        minutesUsed: agentMetrics?.minutesUsed ?? 0,
        totalCalls: agentMetrics?.totalCalls ?? 0,
        textsSent: agentMetrics?.textsSent ?? 0,
        contactsGathered: agentMetrics?.contactsGathered ?? 0,
        membersAssigned: agentMetrics?.membersAssigned ?? 0,
        knowledgeBaseItems: agentMetrics?.knowledgeBaseItems ?? 0,
        activeIntegrations: agentMetrics?.activeIntegrations ?? 0,
      };

      return {
        id: agent.id,
        name: agent.name,
        businessName: agent.businessName,
        phoneNumber: agent.phoneNumber,
        industry: agent.industry,
        city: agent.city,
        state: agent.state,
        retellAgentId: agent.retellAgentId,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        metrics,
      };
    });
  }, [voicebots, metricsData]);

  // Filter voicebots
  const filteredVoicebots = useMemo(() => {
    let filtered = [...transformedVoicebots];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchDigits = filters.search.replace(/\D/g, '');
      filtered = filtered.filter(
        (v) => {
          const nameMatch = v.name && v.name.toLowerCase().includes(searchLower);
          const bizMatch = v.businessName && v.businessName.toLowerCase().includes(searchLower);
          let phoneMatch = v.phoneNumber && v.phoneNumber.includes(searchLower);
          // Normalize phone search: strip non-digits and match if 3+ digits
          if (!phoneMatch && searchDigits.length >= 3 && v.phoneNumber) {
            const phoneDigits = v.phoneNumber.replace(/\D/g, '');
            phoneMatch = phoneDigits.includes(searchDigits);
          }
          return nameMatch || bizMatch || phoneMatch;
        }
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      const isActive = filters.status === 'active';
      filtered = filtered.filter((v) => (isActive ? !!v.phoneNumber : !v.phoneNumber));
    }

    return filtered;
  }, [transformedVoicebots, filters]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts: Record<VoicebotStatus, number> = {
      all: transformedVoicebots.length,
      active: 0,
      inactive: 0,
    };

    transformedVoicebots.forEach((v) => {
      if (v.phoneNumber) {
        counts.active++;
      } else {
        counts.inactive++;
      }
    });

    return counts;
  }, [transformedVoicebots]);

  // Selection handlers
  const handleSelectVoicebot = (id: string) => {
    const newSelection = new Set(selectedVoicebotIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedVoicebotIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedVoicebotIds.size === filteredVoicebots.length) {
      setSelectedVoicebotIds(new Set());
    } else {
      const allIds = filteredVoicebots.map((v) => v.id);
      setSelectedVoicebotIds(new Set(allIds));
    }
  };

  const handleClearSelection = () => {
    setSelectedVoicebotIds(new Set());
  };

  // Check if all filtered voicebots are selected
  const allSelected = filteredVoicebots.length > 0 && selectedVoicebotIds.size === filteredVoicebots.length;
  const someSelected = selectedVoicebotIds.size > 0 && selectedVoicebotIds.size < filteredVoicebots.length;

  // Get selected voicebots
  const selectedVoicebots = filteredVoicebots.filter((v) => selectedVoicebotIds.has(v.id));

  // Voicebot action handlers
  const handleEdit = (voicebot: Voicebot) => {
    onNavigateToAgent(voicebot);
  };

  const handleDelete = (voicebot: Voicebot) => {
    if (voicebots.length <= 1) {
      toast({
        title: "Cannot Delete Voicebot",
        description: "You must have at least one voicebot. Create a new voicebot before deleting this one.",
        variant: "destructive",
      });
      return;
    }

    setVoicebotToDelete(voicebot);
    setShowDeleteDialog(true);
  };

  const confirmDeleteVoicebot = async () => {
    if (!voicebotToDelete) return;

    setIsDeletingVoicebot(true);
    try {
      const response = await fetch(`/api/voice-agents/${voicebotToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete voicebot');
      }

      toast({
        title: "Voicebot Deleted",
        description: `${voicebotToDelete.name || voicebotToDelete.businessName || 'Voicebot'} has been deleted successfully.`,
      });

      setShowDeleteDialog(false);
      setVoicebotToDelete(null);
      onDeleteSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete voicebot",
        variant: "destructive",
      });
    } finally {
      setIsDeletingVoicebot(false);
    }
  };

  // Bulk action handlers
  const handleBulkActivate = () => {
    toast({
      title: "Phone Provisioning Required",
      description: "To activate a voicebot, please open it and assign a phone number in Agent Settings. Bulk phone provisioning must be done per-agent.",
    });
  };

  const handleBulkDeactivate = () => {
    toast({
      title: "Phone Deprovisioning Required",
      description: "To deactivate a voicebot, please open it and remove the phone number in Agent Settings. Bulk phone deprovisioning must be done per-agent.",
    });
  };

  const handleBulkDelete = async () => {
    if (selectedVoicebots.length === 0) return;

    // Guard: don't delete the last bot
    if (voicebots.length <= selectedVoicebots.length) {
      toast({
        title: "Cannot Delete All Voicebots",
        description: "You must keep at least one voicebot. Please deselect some bots before deleting.",
        variant: "destructive",
      });
      return;
    }

    const ids = selectedVoicebots.map((v) => v.id);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        const response = await fetch(`/api/voice-agents/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast({
        title: "Voicebots Deleted",
        description: `Successfully deleted ${successCount} voicebot${successCount !== 1 ? 's' : ''}.`,
      });
    } else {
      toast({
        title: "Partial Delete",
        description: `Deleted ${successCount} voicebot${successCount !== 1 ? 's' : ''}. ${failCount} failed.`,
        variant: "destructive",
      });
    }

    setSelectedVoicebotIds(new Set());
    onDeleteSuccess?.();
  };

  const handleBulkExport = () => {
    const headers = ['Name', 'Business', 'Phone', 'Industry', 'City', 'State', 'Status', 'Created'];
    const rows = selectedVoicebots.map((v) => [
      v.name ?? '',
      v.businessName ?? '',
      v.phoneNumber ?? '',
      v.industry ?? '',
      v.city ?? '',
      v.state ?? '',
      v.phoneNumber ? 'Active' : 'Inactive',
      v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'voicebots.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filters Skeleton */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-10 bg-gray-800 rounded-lg animate-pulse"></div>
          <div className="hidden md:block w-[180px] h-10 bg-gray-800 rounded-lg animate-pulse"></div>
          <div className="w-32 h-10 bg-gray-800 rounded-lg animate-pulse"></div>
        </div>

        {/* Table Skeleton */}
        <div className="premium-card rounded-lg p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-800 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <VoicebotFilters
        filters={filters}
        onFilterChange={setFilters}
        statusCounts={statusCounts}
        onCreateVoicebot={onCreateVoicebot}
        userSubscription={userSubscription}
        voicebotCount={voicebots.length}
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-3 sm:px-4 py-3 text-left">
                {/* Select All Button */}
                <button
                  onClick={handleSelectAll}
                  disabled={filteredVoicebots.length === 0}
                  className={`w-10 h-10 flex items-center justify-center transition-all rounded-full ${
                    filteredVoicebots.length === 0
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-gray-800/30 cursor-pointer'
                  } ${
                    allSelected
                      ? 'text-white bg-gray-800/50'
                      : someSelected
                      ? 'text-gray-400'
                      : 'text-gray-600'
                  }`}
                  data-testid="button-select-all"
                >
                  {allSelected ? (
                    <i className="fas fa-check-square text-lg"></i>
                  ) : someSelected ? (
                    <i className="fas fa-minus-square text-lg"></i>
                  ) : (
                    <i className="far fa-square text-lg"></i>
                  )}
                </button>
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                Name
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap hidden xl:table-cell">
                Minutes
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap hidden xl:table-cell">
                Calls
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap hidden xl:table-cell">
                Texts
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                Contacts
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                Members
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                Memory
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                Integrations
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap hidden sm:table-cell">
                Status
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-300 whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredVoicebots.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                      <i className="fas fa-robot text-2xl text-blue-400"></i>
                    </div>
                    <h4 className="text-lg font-medium text-white mb-2">
                      {filters.search || filters.status !== 'all'
                        ? 'No voicebots found'
                        : 'No voicebots yet'}
                    </h4>
                    <p className="text-gray-400 mb-6">
                      {filters.search || filters.status !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first AI voice agent to get started'}
                    </p>
                    {filters.search === '' && filters.status === 'all' && (
                      <button
                        onClick={onCreateVoicebot}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Create Your First Voicebot
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredVoicebots.map((voicebot) => (
                <VoicebotRow
                  key={voicebot.id}
                  voicebot={voicebot}
                  isSelected={selectedVoicebotIds.has(voicebot.id)}
                  onSelect={handleSelectVoicebot}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onNavigateToAgent={onNavigateToAgent}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedVoicebotIds.size}
        selectedVoicebots={selectedVoicebots}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        onClearSelection={handleClearSelection}
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="premium-card text-white border-gray-700 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">
              Delete Voicebot
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-base">
              Are you sure you want to delete <span className="text-white font-semibold">{voicebotToDelete?.name || voicebotToDelete?.businessName || 'this voicebot'}</span>? This action cannot be undone.
              All associated data, including call history and configurations, will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingVoicebot}
              className="bg-gray-800 text-white hover:bg-gray-700 border-gray-800"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVoicebot}
              disabled={isDeletingVoicebot}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingVoicebot ? (
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
    </div>
  );
};
