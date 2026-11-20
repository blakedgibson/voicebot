/**
 * Integrations Tab Component
 *
 * Main container component that manages the integrations UI state and coordinates
 * between MyIntegrationsView, IntegrationsLibrary, and IntegrationDetailsModal.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Integration,
  IntegrationWithMeta,
  IntegrationTemplate,
  IntegrationFormData,
  IntegrationsView,
  IntegrationLog,
  IntegrationTestResult,
} from './types';
import { MyIntegrationsView } from './MyIntegrationsView';
import { IntegrationsLibrary } from './IntegrationsLibrary';
import { IntegrationDetailsModal } from './IntegrationDetailsModal';
import { getTemplateById } from './integrationTemplates';
import { useToast } from '@/hooks/use-toast';

interface IntegrationsTabProps {
  selectedAgentId: string;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({ selectedAgentId }) => {
  const [currentView, setCurrentView] = useState<IntegrationsView>('my-integrations');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<IntegrationTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialLibraryCategory, setInitialLibraryCategory] = useState<'all' | 'custom'>('all');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch integrations for the selected agent
  const {
    data: integrations = [],
    isLoading: isLoadingIntegrations,
    error: integrationsError,
  } = useQuery<Integration[]>({
    queryKey: ['integrations', selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return [];

      const response = await fetch(`/api/integrations/custom?agentId=${selectedAgentId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }
      return response.json();
    },
    enabled: !!selectedAgentId,
  });

  // Fetch configured custom functions from Retell AI
  const {
    data: configuredFunctions = [],
    isLoading: isLoadingFunctions,
  } = useQuery<any[]>({
    queryKey: ['retell-functions', selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return [];

      const response = await fetch(`/api/integrations/retell-functions?agentId=${selectedAgentId}`);
      if (!response.ok) {
        console.warn('Failed to fetch Retell AI functions');
        return [];
      }
      return response.json();
    },
    enabled: !!selectedAgentId,
  });

  // Fetch logs for selected integration
  const {
    data: integrationLogs = [],
    isLoading: isLoadingLogs,
  } = useQuery<IntegrationLog[]>({
    queryKey: ['integration-logs', selectedIntegration?.id],
    queryFn: async () => {
      if (!selectedIntegration?.id) return [];

      const response = await fetch(
        `/api/integrations/logs?integrationId=${selectedIntegration.id}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      return response.json();
    },
    enabled: !!selectedIntegration?.id && isModalOpen,
  });

  // Enrich integrations with template metadata
  const enrichedIntegrations: IntegrationWithMeta[] = integrations.map((integration) => {
    const template = getTemplateById(integration.type || 'custom');
    return {
      ...integration,
      template,
    };
  });

  // Save integration mutation
  const saveIntegrationMutation = useMutation({
    mutationFn: async (data: IntegrationFormData) => {
      // For new integrations, use the bulk endpoint with array format
      // For updates, use the individual endpoint
      if (selectedIntegration) {
        // Update existing integration
        const response = await fetch(`/api/integrations/custom/${selectedIntegration.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...data,
            agentId: selectedAgentId,
            status: 'connected',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update integration');
        }

        return response.json();
      } else {
        // Create new integration - backend expects array format
        const newIntegration = {
          ...data,
          agentId: selectedAgentId,
          status: 'connected',
        };

        const response = await fetch('/api/integrations/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            agentId: selectedAgentId,
            integrations: [newIntegration], // Wrap in array as backend expects
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to save integration');
        }

        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', selectedAgentId] });
      toast({
        title: 'Success',
        description: selectedIntegration
          ? 'Integration updated successfully'
          : 'Integration created successfully',
      });
      setIsModalOpen(false);
      setSelectedIntegration(null);
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete integration mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete integration');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', selectedAgentId] });
      toast({
        title: 'Success',
        description: 'Integration disconnected successfully',
      });
      setIsModalOpen(false);
      setSelectedIntegration(null);
      // Switch to my-integrations view after deletion
      setCurrentView('my-integrations');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Test integration mutation
  const testIntegrationMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const isMagicIntegration = selectedIntegration?.type === 'newo_magic';
      const url = isMagicIntegration
        ? `/api/integrations/magic/test/${integrationId}`
        : `/api/integrations/test/${integrationId}`;

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Test failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      return data;
    },
  });

  // Pause integration mutation
  const pauseIntegrationMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const response = await fetch(`/api/integrations/${integrationId}/pause`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to pause integration');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', selectedAgentId] });
      toast({
        title: 'Success',
        description: 'Integration paused',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Resume integration mutation
  const resumeIntegrationMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const response = await fetch(`/api/integrations/${integrationId}/resume`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to resume integration');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', selectedAgentId] });
      toast({
        title: 'Success',
        description: 'Integration resumed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle integration click
  const handleIntegrationClick = (integration: IntegrationWithMeta) => {
    setSelectedIntegration(integration as Integration);
    setSelectedTemplate(integration.template || null);
    setIsModalOpen(true);
  };

  // Handle template selection from library
  const handleTemplateSelect = (template: IntegrationTemplate) => {
    setSelectedTemplate(template);
    setSelectedIntegration(null);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedIntegration(null);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* View Content - Show library if no integrations, otherwise show the selected view */}
      {integrations.length === 0 && !isLoadingIntegrations ? (
        <IntegrationsLibrary
          connectedIntegrations={integrations}
          onSelectTemplate={handleTemplateSelect}
          onBackToMyIntegrations={() => setCurrentView('my-integrations')}
          initialCategory={initialLibraryCategory}
        />
      ) : currentView === 'my-integrations' ? (
        <MyIntegrationsView
          integrations={enrichedIntegrations}
          onIntegrationClick={handleIntegrationClick}
          onSwitchToLibrary={() => { setInitialLibraryCategory('all'); setCurrentView('library'); }}
          onSwitchToCustomLibrary={() => { setInitialLibraryCategory('custom'); setCurrentView('library'); }}
          onDeleteIntegration={(id) => deleteIntegrationMutation.mutateAsync(id)}
        />
      ) : (
        <IntegrationsLibrary
          connectedIntegrations={integrations}
          onSelectTemplate={handleTemplateSelect}
          onBackToMyIntegrations={() => setCurrentView('my-integrations')}
          initialCategory={initialLibraryCategory}
        />
      )}

      {/* Integration Details Modal */}
      <IntegrationDetailsModal
        integration={selectedIntegration || undefined}
        template={selectedTemplate || undefined}
        selectedAgentId={selectedAgentId}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={(data) => saveIntegrationMutation.mutateAsync(data)}
        onDelete={
          selectedIntegration
            ? (id) => deleteIntegrationMutation.mutateAsync(id)
            : undefined
        }
        onTest={
          selectedIntegration
            ? (id) => testIntegrationMutation.mutateAsync(id)
            : undefined
        }
        onPause={
          selectedIntegration
            ? (id) => pauseIntegrationMutation.mutateAsync(id)
            : undefined
        }
        onResume={
          selectedIntegration
            ? (id) => resumeIntegrationMutation.mutateAsync(id)
            : undefined
        }
        logs={integrationLogs}
        isLoadingLogs={isLoadingLogs}
      />
    </div>
  );
};
