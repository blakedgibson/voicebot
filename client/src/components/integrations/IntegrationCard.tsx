/**
 * Integration Card Component
 *
 * Displays a single integration with status, configuration summary, and last activity.
 * Entire card is clickable to open the details/edit modal.
 */

import React, { useState } from 'react';
import { IntegrationWithMeta } from './types';
import { getTemplateById } from './integrationTemplates';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IntegrationCardProps {
  integration: IntegrationWithMeta;
  onClick: () => void;
  onDelete?: (id: number) => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onClick,
  onDelete,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const template = getTemplateById(integration.type || 'custom');

  // Generate configuration summary
  const getConfigSummary = () => {
    if (integration.configSummary) {
      return integration.configSummary;
    }

    // Auto-configured integrations - return null to hide this section
    if (template?.autoConfigured) {
      return null;
    }

    // Generate a default summary based on authentication method
    if (integration.isOAuthIntegration) {
      return 'Connected via OAuth';
    } else if (integration.apiKey) {
      return 'Connected via API Key';
    } else if (integration.webhookUrl) {
      return `Webhook: ${integration.webhookUrl.substring(0, 40)}...`;
    } else {
      return 'Configuration required';
    }
  };

  // Get last activity text
  const getLastActivity = () => {
    if (integration.lastActivityText) {
      return integration.lastActivityText;
    }

    if (integration.lastHealthCheck) {
      return `Last checked ${formatDistanceToNow(new Date(integration.lastHealthCheck), { addSuffix: true })}`;
    }

    // Don't show "Updated X days ago"
    return null;
  };

  return (
    <div
      onClick={onClick}
      className="premium-card relative p-6 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors group"
    >
      {/* Three-dot Menu - Top Right */}
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 w-8 h-8 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-all"
              onClick={(e) => e.stopPropagation()}
              data-testid={`menu-integration-${integration.id}`}
            >
              <i className="fas fa-ellipsis-v text-sm"></i>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 premium-card text-white">
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <i className="fas fa-edit mr-2 text-blue-400"></i>
              Edit Integration
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <i className="fas fa-chart-line mr-2 text-green-400"></i>
              View Activity
            </DropdownMenuItem>
            {template?.documentationUrl && (
              <DropdownMenuItem
                className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(template.documentationUrl, '_blank');
                }}
              >
                <i className="fas fa-book mr-2 text-purple-400"></i>
                View Documentation
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-red-400 focus:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <i className="fas fa-trash mr-2"></i>
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Icon/Logo */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-4"
        style={{ backgroundColor: template?.color || '#6B7280' }}
      >
        <i className={template?.icon || 'fas fa-plug'}></i>
      </div>

      {/* Service Name */}
      <h3 className="text-lg font-semibold text-white mb-2">
        {integration.name}
      </h3>

      {/* Description (if available) */}
      {integration.description && (
        <p className="text-sm text-gray-400 mb-3">
          {integration.description}
        </p>
      )}

      {/* Configuration Summary */}
      {getConfigSummary() && (
        <div className="flex items-center text-sm text-gray-400 mb-2">
          <i className="fas fa-cog mr-2 text-gray-500"></i>
          <span className="truncate">{getConfigSummary()}</span>
        </div>
      )}

      {/* Last Activity */}
      {getLastActivity() && (
        <div className="flex items-center text-sm text-gray-400">
          <i className="fas fa-clock mr-2 text-gray-500"></i>
          <span>{getLastActivity()}</span>
        </div>
      )}

      {/* Error Message (if in error state) */}
      {integration.status === 'error' && integration.errorMessage && (
        <div className="mt-3 p-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
          <i className="fas fa-exclamation-triangle mr-1"></i>
          {integration.errorMessage}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="premium-card border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Disconnect Integration</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to disconnect "{integration.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(false);
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete && integration.id) {
                  onDelete(integration.id as number);
                }
                setShowDeleteDialog(false);
              }}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
