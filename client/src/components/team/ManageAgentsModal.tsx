/**
 * Manage Agents Modal Component
 *
 * Modal for assigning/removing agent access for team members.
 */

import React, { useState, useEffect } from 'react';
import { ManageAgentsModalProps } from './types';
import { Button } from '@/components/ui/button';

export const ManageAgentsModal: React.FC<ManageAgentsModalProps> = ({
  isOpen,
  member,
  onClose,
  onUpdate,
  availableAgents,
}) => {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setSelectedAgentIds(member.assignedAgentIds || []);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onUpdate(member.id, {
        assignedAgentIds: selectedAgentIds,
      });
      onClose();
    } catch (error) {
      console.error('Error updating agent access:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-semibold text-white">Manage Agent Access</h2>
            <p className="text-gray-400 mt-1">
              Select which AI agents {member.name || member.email} can access
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            data-testid="button-close-agents-modal"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Agent Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              AI Agents <span className="text-gray-500">(Select all that apply)</span>
            </label>
            {availableAgents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableAgents.map((agent) => {
                  const isSelected = selectedAgentIds.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handleAgentToggle(agent.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-800'
                      }`}
                      data-testid={`button-agent-${agent.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <i className="fas fa-robot text-white"></i>
                            </div>
                            <div>
                              <p className="text-white font-medium">{agent.agentName}</p>
                              <p className="text-gray-400 text-sm capitalize">
                                {agent.industry.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <i className="fas fa-check-circle text-blue-500 text-xl"></i>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-800/50 rounded-lg">
                <i className="fas fa-robot text-4xl text-gray-600 mb-3"></i>
                <p className="text-gray-400">No AI agents available</p>
                <p className="text-gray-500 text-sm mt-1">
                  Create an AI agent first to assign access
                </p>
              </div>
            )}
          </div>

          {/* Selected Count */}
          {selectedAgentIds.length > 0 && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-400 text-sm">
                <i className="fas fa-info-circle mr-2"></i>
                {selectedAgentIds.length} agent{selectedAgentIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-gray-800 text-gray-300 hover:bg-gray-800"
              data-testid="button-cancel-agents"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-agents"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
