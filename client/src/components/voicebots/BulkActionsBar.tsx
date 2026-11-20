/**
 * Bulk Actions Bar Component for Voicebots
 *
 * Displays when voicebots are selected and provides bulk action buttons.
 * Allows operations on multiple voicebots simultaneously.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Voicebot } from './types';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedVoicebots: Voicebot[];
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  selectedVoicebots,
  onActivate,
  onDeactivate,
  onDelete,
  onExport,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  const hasActiveVoicebots = selectedVoicebots.some(v => !!v.phoneNumber);
  const hasInactiveVoicebots = selectedVoicebots.some(v => !v.phoneNumber);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-4xl mx-auto premium-card rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {selectedCount}
            </div>
            <span className="text-white text-sm">
              {selectedCount} voicebot{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            {/* Activate - show if any selected voicebots are inactive */}
            {hasInactiveVoicebots && (
              <Button
                onClick={onActivate}
                variant="outline"
                size="sm"
                className="border-gray-800 text-green-400 hover:bg-green-900/30 hover:border-green-600 w-full sm:w-auto"
              >
                <i className="fas fa-check-circle mr-2"></i>
                Activate
              </Button>
            )}

            {/* Deactivate - show if any selected voicebots are active */}
            {hasActiveVoicebots && (
              <Button
                onClick={onDeactivate}
                variant="outline"
                size="sm"
                className="border-gray-800 text-orange-400 hover:bg-orange-900/30 hover:border-orange-600 w-full sm:w-auto"
              >
                <i className="fas fa-pause-circle mr-2"></i>
                Deactivate
              </Button>
            )}

            {/* Export */}
            <Button
              onClick={onExport}
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-300 hover:bg-gray-800 w-full sm:w-auto"
            >
              <i className="fas fa-download mr-2"></i>
              Export
            </Button>

            {/* Delete */}
            <Button
              onClick={onDelete}
              variant="outline"
              size="sm"
              className="border-gray-800 text-red-400 hover:bg-red-900/30 hover:border-red-600 w-full sm:w-auto"
            >
              <i className="fas fa-trash mr-2"></i>
              Delete
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
