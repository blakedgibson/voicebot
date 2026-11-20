/**
 * Invite Member Modal Component
 *
 * Modal for inviting new team members with role, permissions, and agent assignment.
 */

import React, { useState, useEffect } from 'react';
import { InviteMemberFormData, MemberRole, RolePermissions, VoiceAgent } from './types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: InviteMemberFormData) => Promise<void>;
  availableAgents: VoiceAgent[];
}

const EMPTY_PERMISSIONS: RolePermissions = {
  home: { enabled: false },
  calls: { enabled: false, history: false, contacts: false },
  analytics: { enabled: false, calls: false, services: false },
  settings: {
    enabled: false,
    agents: false,
    memory: false,
    integrations: false,
    members: false,
    account: false,
  },
};

const DEFAULT_PERMISSIONS: Record<MemberRole, RolePermissions | null> = {
  owner: null, // Owner gets all permissions by default
  manager: {
    home: { enabled: true },
    calls: { enabled: true, history: true, contacts: true },
    analytics: { enabled: true, calls: true, services: true },
    settings: {
      enabled: true,
      agents: true,
      memory: true,
      integrations: true,
      members: true,
      account: false,
    },
  },
  employee: {
    home: { enabled: true },
    calls: { enabled: true, history: true, contacts: true },
    analytics: { enabled: true, calls: true, services: false },
    settings: {
      enabled: false,
      agents: false,
      memory: false,
      integrations: false,
      members: false,
      account: false,
    },
  },
  custom: null,
};

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  availableAgents,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('employee');
  const [permissions, setPermissions] = useState<RolePermissions | null>(DEFAULT_PERMISSIONS.employee);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: MemberRole) => {
    setRole(newRole);
    if (newRole !== 'custom') {
      setPermissions(DEFAULT_PERMISSIONS[newRole]);
    } else {
      setPermissions(JSON.parse(JSON.stringify(EMPTY_PERMISSIONS)));
    }
  };

  const handlePermissionChange = (path: string[], value: boolean) => {
    if (!permissions) return;

    const newPermissions = JSON.parse(JSON.stringify(permissions));
    let current: any = newPermissions;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;

    setPermissions(newPermissions);
  };

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one agent is selected for non-owner roles
    if (role !== 'owner' && selectedAgentIds.length === 0 && availableAgents.length > 0) {
      return; // Don't submit if no agents selected
    }

    setIsSubmitting(true);

    try {
      await onInvite({
        email,
        role,
        permissions: role === 'custom' ? permissions : undefined,
        assignedAgentIds: role === 'owner' ? undefined : selectedAgentIds,
      });

      // Reset form
      setEmail('');
      setRole('employee');
      setPermissions(DEFAULT_PERMISSIONS.employee);
      setSelectedAgentIds([]);
      onClose();
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl premium-card text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Invite Team Member</DialogTitle>
          <DialogDescription className="text-gray-400">
            Send an invitation to join your team
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="teammate@example.com"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Role
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['owner', 'manager', 'employee', 'custom'] as MemberRole[]).map((roleOption) => {
                const roleConfig: Record<string, { title: string; description: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
                  owner: {
                    title: 'Owner',
                    description: 'Full access to everything',
                    icon: 'fas fa-crown',
                    color: 'text-yellow-400',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500',
                  },
                  manager: {
                    title: 'Manager',
                    description: 'Full access except billing',
                    icon: 'fas fa-user-tie',
                    color: 'text-purple-400',
                    bgColor: 'bg-purple-500/10',
                    borderColor: 'border-purple-500',
                  },
                  employee: {
                    title: 'Employee',
                    description: 'View calls & contacts only',
                    icon: 'fas fa-user',
                    color: 'text-green-400',
                    bgColor: 'bg-green-500/10',
                    borderColor: 'border-green-500',
                  },
                  custom: {
                    title: 'Custom',
                    description: 'Define custom permissions',
                    icon: 'fas fa-cog',
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500',
                  },
                };

                const config = roleConfig[roleOption];
                const isSelected = role === roleOption;

                return (
                  <button
                    key={roleOption}
                    type="button"
                    onClick={() => handleRoleChange(roleOption)}
                    className={`p-4 rounded-lg border-2 transition-all relative ${
                      isSelected
                        ? `${config.borderColor} ${config.bgColor}`
                        : 'border-gray-700 hover:border-gray-800 bg-gray-800/50'
                    }`}
                    data-testid={`button-role-${roleOption}`}
                  >
                    <div className="flex gap-3">
                      {/* Profile Picture */}
                      <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <i className={`${config.icon} ${config.color}`}></i>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-white mb-1">{config.title}</div>
                        <div className="text-xs text-gray-400">{config.description}</div>
                      </div>
                    </div>
                    
                    {/* Checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <i className={`fas fa-check-circle ${config.color}`}></i>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Permissions */}
          {role === 'custom' && permissions && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Custom Permissions</h3>

              {/* Home */}
              <div className="space-y-2 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300">Home Dashboard</label>
                  <Switch
                    checked={permissions.home.enabled}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(['home', 'enabled'], checked)
                    }
                    data-testid="switch-home-enabled"
                  />
                </div>
              </div>

              {/* Calls */}
              <div className="space-y-2 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-300 font-medium">Calls</label>
                  <Switch
                    checked={permissions.calls.enabled}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(['calls', 'enabled'], checked)
                    }
                    data-testid="switch-calls-enabled"
                  />
                </div>
                {permissions.calls.enabled && (
                  <>
                    <div className="flex items-center justify-between pl-4">
                      <label className="text-gray-400 text-sm">Call History</label>
                      <Switch
                        checked={permissions.calls.history}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(['calls', 'history'], checked)
                        }
                        data-testid="switch-calls-history"
                      />
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      <label className="text-gray-400 text-sm">Contacts</label>
                      <Switch
                        checked={permissions.calls.contacts}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(['calls', 'contacts'], checked)
                        }
                        data-testid="switch-calls-contacts"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Analytics */}
              <div className="space-y-2 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-300 font-medium">Analytics</label>
                  <Switch
                    checked={permissions.analytics.enabled}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(['analytics', 'enabled'], checked)
                    }
                    data-testid="switch-analytics-enabled"
                  />
                </div>
                {permissions.analytics.enabled && (
                  <>
                    <div className="flex items-center justify-between pl-4">
                      <label className="text-gray-400 text-sm">Call Analytics</label>
                      <Switch
                        checked={permissions.analytics.calls}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(['analytics', 'calls'], checked)
                        }
                        data-testid="switch-analytics-calls"
                      />
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      <label className="text-gray-400 text-sm">Service Analytics</label>
                      <Switch
                        checked={permissions.analytics.services}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(['analytics', 'services'], checked)
                        }
                        data-testid="switch-analytics-services"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-2 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-300 font-medium">Settings</label>
                  <Switch
                    checked={permissions.settings.enabled}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(['settings', 'enabled'], checked)
                    }
                    data-testid="switch-settings-enabled"
                  />
                </div>
                {permissions.settings.enabled && (
                  <>
                    <div className="flex items-center justify-between pl-4">
                      <label className="text-gray-400 text-sm">Agents</label>
                      <Switch
                        checked={permissions.settings.agents}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(['settings', 'agents'], checked)
                        }
                        data-testid="switch-settings-agents"
                      />
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      <label className="text-gray-400 text-sm">Memory</label>
                      <Switch
                        checked={permissions.settings.memory}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(['settings', 'memory'], checked)
                        }
                        data-testid="switch-settings-memory"
                      />
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      <label className="text-gray-400 text-sm">Integrations</label>
                      <Switch
                        checked={permissions.settings.integrations}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(['settings', 'integrations'], checked)
                        }
                        data-testid="switch-settings-integrations"
                      />
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      <label className="text-gray-400 text-sm">Members</label>
                      <Switch
                        checked={permissions.settings.members}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(['settings', 'members'], checked)
                        }
                        data-testid="switch-settings-members"
                      />
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      <label className="text-gray-400 text-sm">Account</label>
                      <Switch
                        checked={permissions.settings.account}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(['settings', 'account'], checked)
                        }
                        data-testid="switch-settings-account"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Agent Assignment */}
          {role !== 'owner' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Assign AI Agents <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1">
                {availableAgents.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No agents available</p>
                ) : (
                  availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handleAgentToggle(agent.id)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-800/50 rounded cursor-pointer transition-colors text-left"
                    >
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        {selectedAgentIds.includes(agent.id) ? (
                          <i className="fas fa-check-square text-lg text-white"></i>
                        ) : (
                          <i className="far fa-square text-lg text-gray-600"></i>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                        <i className="fas fa-robot"></i>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">{agent.agentName}</div>
                        <div className="text-gray-400 text-xs">{agent.industry}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <p className={`text-xs mt-2 ${selectedAgentIds.length === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {selectedAgentIds.length === 0
                  ? 'Please select at least one agent'
                  : `Selected ${selectedAgentIds.length} agent(s)`}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-gray-800 text-gray-300 hover:bg-gray-800"
              data-testid="button-cancel-permissions"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !email || (role !== 'owner' && selectedAgentIds.length === 0 && availableAgents.length > 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-permissions"
            >
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
