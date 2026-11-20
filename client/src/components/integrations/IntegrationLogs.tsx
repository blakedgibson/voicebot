/**
 * Integration Logs Component
 *
 * Displays activity logs for an integration with expandable details.
 */

import React, { useState } from 'react';
import { IntegrationLog, IntegrationEventType } from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';

interface IntegrationLogsProps {
  integrationId: number;
  logs: IntegrationLog[];
  isLoading?: boolean;
}

export const IntegrationLogs: React.FC<IntegrationLogsProps> = ({
  integrationId,
  logs,
  isLoading = false,
}) => {
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<IntegrationEventType | 'all'>('all');

  // Get event type badge
  const getEventTypeBadge = (eventType: IntegrationEventType) => {
    switch (eventType) {
      case 'call':
        return (
          <Badge className="bg-blue-500 text-white">
            <i className="fas fa-phone mr-1"></i>
            Call
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500 text-white">
            <i className="fas fa-exclamation-circle mr-1"></i>
            Error
          </Badge>
        );
      case 'test':
        return (
          <Badge className="bg-purple-500 text-white">
            <i className="fas fa-flask mr-1"></i>
            Test
          </Badge>
        );
      case 'status_change':
        return (
          <Badge className="bg-yellow-500 text-white">
            <i className="fas fa-exchange-alt mr-1"></i>
            Status Change
          </Badge>
        );
      case 'created':
        return (
          <Badge className="bg-green-500 text-white">
            <i className="fas fa-plus-circle mr-1"></i>
            Created
          </Badge>
        );
      case 'updated':
        return (
          <Badge className="bg-orange-500 text-white">
            <i className="fas fa-edit mr-1"></i>
            Updated
          </Badge>
        );
      case 'deleted':
        return (
          <Badge className="bg-gray-500 text-white">
            <i className="fas fa-trash mr-1"></i>
            Deleted
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {eventType}
          </Badge>
        );
    }
  };

  // Get status code color
  const getStatusCodeColor = (statusCode: number | null): string => {
    if (!statusCode) return 'text-gray-600';
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600';
    if (statusCode >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  // Filter logs by event type
  const filteredLogs =
    eventTypeFilter === 'all'
      ? logs
      : logs.filter((log) => log.eventType === eventTypeFilter);

  // Event type filter options
  const eventTypes: Array<{ value: IntegrationEventType | 'all'; label: string }> = [
    { value: 'all', label: 'All Events' },
    { value: 'call', label: 'Calls' },
    { value: 'error', label: 'Errors' },
    { value: 'test', label: 'Tests' },
    { value: 'status_change', label: 'Status Changes' },
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-600 mb-3"></i>
          <p className="text-gray-400">Loading logs...</p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <i className="fas fa-clipboard-list text-2xl text-gray-500"></i>
        </div>
        <h4 className="text-lg font-medium text-white mb-2">No activity logs yet</h4>
        <p className="text-gray-400">
          Integration activity and events will appear here once the integration is used.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {eventTypes.map((type) => (
          <Button
            key={type.value}
            variant={eventTypeFilter === type.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEventTypeFilter(type.value)}
            className={
              eventTypeFilter === type.value
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : ''
            }
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Logs Count */}
      <div className="text-sm text-gray-400">
        {filteredLogs.length} event{filteredLogs.length !== 1 ? 's' : ''}
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredLogs.map((log) => {
          const isExpanded = expandedLogId === log.id;

          return (
            <div
              key={log.id}
              className="border border-gray-700 rounded-lg bg-gray-800/50 overflow-hidden"
            >
              {/* Log Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800"
                onClick={() =>
                  setExpandedLogId(isExpanded ? null : log.id as number)
                }
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Event Type Badge */}
                  <div className="flex-shrink-0">{getEventTypeBadge(log.eventType)}</div>

                  {/* Timestamp */}
                  <div className="text-sm text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </div>

                  {/* Status Code */}
                  {log.statusCode && (
                    <div
                      className={`text-sm font-mono font-medium flex-shrink-0 ${getStatusCodeColor(
                        log.statusCode
                      )}`}
                    >
                      {log.statusCode}
                    </div>
                  )}

                  {/* Duration */}
                  {log.duration && (
                    <div className="text-sm text-gray-400 flex-shrink-0">
                      <i className="fas fa-clock mr-1"></i>
                      {log.duration}ms
                    </div>
                  )}

                  {/* Error Message Preview */}
                  {log.errorMessage && (
                    <div className="text-sm text-red-400 truncate flex-1 min-w-0">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      {log.errorMessage}
                    </div>
                  )}
                </div>

                {/* Expand/Collapse Icon */}
                <div className="flex-shrink-0 ml-2">
                  <i
                    className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-500`}
                  ></i>
                </div>
              </div>

              {/* Log Details (Expanded) */}
              {isExpanded && (
                <div className="p-4 bg-gray-900/50 border-t border-gray-700 space-y-4">
                  {/* Full Timestamp */}
                  <div className="text-sm">
                    <span className="font-medium text-gray-300">Timestamp:</span>{' '}
                    <span className="text-gray-400">
                      {format(new Date(log.createdAt), 'PPpp')}
                    </span>
                  </div>

                  {/* Error Message (Full) */}
                  {log.errorMessage && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-300">Error:</span>
                      <div className="mt-1 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 font-mono text-xs">
                        {log.errorMessage}
                      </div>
                    </div>
                  )}

                  {/* Request Data */}
                  {log.requestData && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-300">Request Data:</span>
                      <div className="mt-1 p-3 bg-gray-900 border border-gray-700 rounded overflow-x-auto">
                        <pre className="text-xs font-mono text-gray-300">
                          {JSON.stringify(log.requestData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Response Data */}
                  {log.responseData && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-300">Response Data:</span>
                      <div className="mt-1 p-3 bg-gray-900 border border-gray-700 rounded overflow-x-auto">
                        <pre className="text-xs font-mono text-gray-300">
                          {JSON.stringify(log.responseData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
