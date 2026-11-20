/**
 * Bulk Actions Bar Component
 *
 * Displays when members are selected and provides bulk action buttons.
 * Allows operations on multiple members simultaneously.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { TableMember } from './types';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedMembers: TableMember[];
  onManagePermissions: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onRemove: () => void;
  onClearSelection: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  selectedMembers,
  onManagePermissions,
  onSuspend,
  onReactivate,
  onRemove,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  // Check if any selected members are suspended
  const hasSuspendedMembers = selectedMembers.some(m => m.status === 'suspended');
  // Check if ALL selected members are suspended
  const allSuspended = selectedMembers.length > 0 && selectedMembers.every(m => m.status === 'suspended');

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-4xl mx-auto premium-card rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {selectedCount}
            </div>
            <span className="text-white text-sm">
              {selectedCount} member{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            {/* Manage Permissions */}
            <Button
              onClick={onManagePermissions}
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-300 hover:bg-gray-800 w-full sm:w-auto"
            >
              <i className="fas fa-shield-alt mr-2"></i>
              Manage Permissions
            </Button>

            {/* Suspend - hide if all selected members are suspended */}
            {!allSuspended && (
              <Button
                onClick={onSuspend}
                variant="outline"
                size="sm"
                className="border-gray-800 text-orange-400 hover:bg-orange-900/30 hover:border-orange-600 w-full sm:w-auto"
              >
                <i className="fas fa-user-slash mr-2"></i>
                Suspend
              </Button>
            )}

            {/* Reactivate - only show if there are suspended members */}
            {hasSuspendedMembers && (
              <Button
                onClick={onReactivate}
                variant="outline"
                size="sm"
                className="border-gray-800 text-green-400 hover:bg-green-900/30 hover:border-green-600 w-full sm:w-auto"
              >
                <i className="fas fa-user-check mr-2"></i>
                Reactivate
              </Button>
            )}

            {/* Remove */}
            <Button
              onClick={onRemove}
              variant="outline"
              size="sm"
              className="border-gray-800 text-red-400 hover:bg-red-900/30 hover:border-red-600 w-full sm:w-auto"
            >
              <i className="fas fa-trash mr-2"></i>
              Remove
            </Button>

            {/* Clear */}
            <Button
              onClick={onClearSelection}
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-300 hover:bg-gray-800 w-full sm:w-auto"
            >
              <i className="fas fa-times mr-2"></i>
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
