/**
 * Voicebot Filters Component
 *
 * Provides search and filtering capabilities for the voicebots table.
 * Includes status dropdown filter and create voicebot button.
 */

import React, { useState } from 'react';
import { VoicebotFilters as VoicebotFiltersType, VoicebotStatus } from './types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoicebotFiltersProps {
  filters: VoicebotFiltersType;
  onFilterChange: (filters: VoicebotFiltersType) => void;
  statusCounts: Record<VoicebotStatus, number>;
  onCreateVoicebot: () => void;
  userSubscription?: any;
  voicebotCount: number;
}

export const VoicebotFilters: React.FC<VoicebotFiltersProps> = ({
  filters,
  onFilterChange,
  statusCounts,
  onCreateVoicebot,
  userSubscription,
  voicebotCount,
}) => {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const { toast } = useToast();

  // Check if user is on free trial
  const isFreeTrial = userSubscription?.status === 'trialing';
  const canCreateVoicebot = !isFreeTrial || voicebotCount === 0;

  const handleCreateClick = () => {
    if (!canCreateVoicebot) {
      toast({
        title: "Free Trial Limitation",
        description: "Free trial users can only create 1 voicebot. Please upgrade to create more voicebots.",
        variant: "destructive",
      });
      return;
    }
    onCreateVoicebot();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleStatusChange = (status: string) => {
    onFilterChange({ ...filters, status: status as VoicebotStatus });
    setIsStatusDropdownOpen(false);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      all: 'All Status',
      active: 'Active',
      inactive: 'Inactive',
    };
    return labels[status] || 'All Status';
  };

  return (
    <div className="flex items-center gap-4">
      {/* Search Input */}
      <div className="flex-1 relative">
        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
        <input
          type="text"
          placeholder="Search by name or phone number..."
          value={filters.search}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="input-search-voicebots"
        />
      </div>

      {/* Status Filter Dropdown */}
      <div className="hidden md:block">
        <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[180px] bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 justify-between"
              data-testid="select-status-filter"
            >
              <span>{getStatusLabel(filters.status)}</span>
              <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 premium-card text-white">
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleStatusChange('all')}
            >
              All Status ({statusCounts.all})
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleStatusChange('active')}
            >
              Active ({statusCounts.active})
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleStatusChange('inactive')}
            >
              Inactive ({statusCounts.inactive})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Filter Dropdown */}
      <div className="md:hidden">
        <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 justify-between"
              data-testid="select-status-filter-mobile"
            >
              <i className="fas fa-filter"></i>
              <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 premium-card text-white">
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Status</div>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleStatusChange('all')}
            >
              All Status ({statusCounts.all})
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleStatusChange('active')}
            >
              Active ({statusCounts.active})
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleStatusChange('inactive')}
            >
              Inactive ({statusCounts.inactive})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Create Voicebot Button */}
      <Button
        onClick={handleCreateClick}
        disabled={!canCreateVoicebot}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="button-create-voicebot"
      >
        <Plus className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">Create Voicebot</span>
      </Button>
    </div>
  );
};
