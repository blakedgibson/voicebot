/**
 * Audit Log Modal Component
 *
 * Modal for viewing member activity history and changes.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuditLogModalProps, AuditLogEntry, AuditAction } from './types';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

const ACTION_LABELS: Record<AuditAction, string> = {
  invited: 'Invited',
  role_changed: 'Role Changed',
  suspended: 'Suspended',
  reactivated: 'Reactivated',
  removed: 'Removed',
  agents_updated: 'Agent Access Updated',
  invitation_resent: 'Invitation Resent',
  invitation_revoked: 'Invitation Revoked',
};

const ACTION_ICONS: Record<AuditAction, string> = {
  invited: 'fa-user-plus',
  role_changed: 'fa-user-edit',
  suspended: 'fa-user-slash',
  reactivated: 'fa-user-check',
  removed: 'fa-user-times',
  agents_updated: 'fa-robot',
  invitation_resent: 'fa-envelope',
  invitation_revoked: 'fa-ban',
};

const ACTION_COLORS: Record<AuditAction, string> = {
  invited: 'text-green-400',
  role_changed: 'text-blue-400',
  suspended: 'text-orange-400',
  reactivated: 'text-green-400',
  removed: 'text-red-400',
  agents_updated: 'text-purple-400',
  invitation_resent: 'text-blue-400',
  invitation_revoked: 'text-red-400',
};

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, member, onClose }) => {
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-log', member?.id],
    queryFn: async () => {
      if (!member) return { logs: [], total: 0 };
      const response = await fetch(`/api/team/members/${member.id}/audit-log`);
      if (!response.ok) throw new Error('Failed to fetch audit log');
      return response.json();
    },
    enabled: isOpen && !!member,
  });

  if (!isOpen || !member) return null;

  const logs: AuditLogEntry[] = auditData?.logs || [];

  const formatChangeDetails = (log: AuditLogEntry) => {
    switch (log.action) {
      case 'role_changed':
        return (
          <p className="text-gray-400 text-sm mt-1">
            Role changed from <span className="text-white font-medium">{log.previousValue}</span> to{' '}
            <span className="text-white font-medium">{log.newValue}</span>
          </p>
        );
      case 'agents_updated':
        const prevAgents = log.previousValue || [];
        const newAgents = log.newValue || [];
        const added = newAgents.filter((a: string) => !prevAgents.includes(a));
        const removed = prevAgents.filter((a: string) => !newAgents.includes(a));
        return (
          <div className="text-gray-400 text-sm mt-1">
            {added.length > 0 && (
              <p>
                <span className="text-green-400">+</span> Added: {added.join(', ')}
              </p>
            )}
            {removed.length > 0 && (
              <p>
                <span className="text-red-400">-</span> Removed: {removed.join(', ')}
              </p>
            )}
          </div>
        );
      case 'suspended':
        return log.newValue ? (
          <p className="text-gray-400 text-sm mt-1">Reason: {log.newValue}</p>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-semibold text-white">Activity History</h2>
            <p className="text-gray-400 mt-1">
              All changes and actions for {member.name || member.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            data-testid="button-close-audit-modal"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                <p className="text-gray-400">Loading activity history...</p>
              </div>
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                  data-testid={`audit-log-${log.id}`}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 ${ACTION_COLORS[log.action]}`}
                    >
                      <i className={`fas ${ACTION_ICONS[log.action]}`}></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium">{ACTION_LABELS[log.action]}</p>
                          <p className="text-gray-400 text-sm">
                            by {log.performedBy.name || log.performedBy.email}
                          </p>
                        </div>
                        <p className="text-gray-500 text-sm">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {formatChangeDetails(log)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-history text-2xl text-gray-500"></i>
              </div>
              <h4 className="text-lg font-medium text-white mb-2">No activity history</h4>
              <p className="text-gray-400">No changes have been recorded for this member yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex-shrink-0">
          <Button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white"
            data-testid="button-close-audit"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
