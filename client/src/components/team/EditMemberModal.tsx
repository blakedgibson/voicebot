/**
 * Edit Member Modal Component
 *
 * Modal for editing member role and permissions.
 */

import React, { useState, useEffect } from 'react';
import { EditMemberModalProps, MemberRole, RolePermissions } from './types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

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

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  member,
  onClose,
  onUpdate,
}) => {
  const [role, setRole] = useState<MemberRole>(member?.role || 'employee');
  const [permissions, setPermissions] = useState<RolePermissions | null>(
    member?.permissions || DEFAULT_PERMISSIONS.employee
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setPermissions(member.permissions || DEFAULT_PERMISSIONS[member.role]);
    }
  }, [member]);

  if (!isOpen || !member) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onUpdate(member.id, {
        role,
        permissions: role === 'custom' ? permissions || undefined : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error updating member:', error);
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
            <h2 className="text-2xl font-semibold text-white">Edit Member Role</h2>
            <p className="text-gray-400 mt-1">
              Update role and permissions for {member.name || member.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            data-testid="button-close-edit-modal"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['manager', 'employee', 'custom'] as MemberRole[]).map((roleOption) => (
                <button
                  key={roleOption}
                  type="button"
                  onClick={() => handleRoleChange(roleOption)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    role === roleOption
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-800'
                  }`}
                  data-testid={`button-role-${roleOption}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium capitalize">{roleOption}</span>
                    {role === roleOption && (
                      <i className="fas fa-check-circle text-blue-500"></i>
                    )}
                  </div>
                </button>
              ))}
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

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-gray-800 text-gray-300 hover:bg-gray-800"
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-edit"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
