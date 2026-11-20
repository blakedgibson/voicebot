/**
 * Member Filters Component
 *
 * Provides search and filtering capabilities for the members table.
 * Includes role/status dropdown filters and invite member button.
 */

import React, { useState } from 'react';
import { MemberFilters as MemberFiltersType, MemberRole, MemberStatus } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Search, Check } from 'lucide-react';

interface MemberFiltersProps {
  filters: MemberFiltersType;
  onFilterChange: (filters: MemberFiltersType) => void;
  roleCounts: Record<MemberRole | 'all', number>;
  statusCounts: Record<MemberStatus | 'all', number>;
  onInvite: () => void;
}

export const MemberFilters: React.FC<MemberFiltersProps> = ({
  filters,
  onFilterChange,
  roleCounts,
  statusCounts,
  onInvite,
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isCombinedDropdownOpen, setIsCombinedDropdownOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleRoleChange = (role: string) => {
    onFilterChange({ ...filters, role: role as MemberRole | 'all' });
    setIsRoleDropdownOpen(false);
  };

  const handleStatusChange = (status: string) => {
    onFilterChange({ ...filters, status: status as MemberStatus | 'all' });
    setIsStatusDropdownOpen(false);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      all: 'All Roles',
      owner: 'Owner',
      manager: 'Manager',
      employee: 'Employee',
      custom: 'Custom',
    };
    return labels[role] || 'All Roles';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      all: 'All Status',
      active: 'Active',
      invited: 'Invited',
      suspended: 'Suspended',
    };
    return labels[status] || 'All Status';
  };

  return (
    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
      {/* Search Input */}
      <div className="flex-1 max-w-[calc(100%-4.5rem)] md:flex-auto md:max-w-none md:min-w-[300px] relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder=""
          value={filters.search}
          onChange={handleSearchChange}
          className="pl-10 bg-transparent border-gray-800 text-gray-300"
          data-testid="input-search-members"
        />
      </div>

      {/* Combined Filter Dropdown (Mobile Only) */}
      <div className="md:hidden">
        <DropdownMenu open={isCombinedDropdownOpen} onOpenChange={setIsCombinedDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 justify-between"
              data-testid="select-combined-filter"
            >
              <i className="fas fa-filter"></i>
              <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 premium-card text-white">
            {/* Role Section */}
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Role</div>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-between"
              onClick={() => { handleRoleChange('all'); setIsCombinedDropdownOpen(false); }}
            >
              <span>All Roles</span>
              {filters.role === 'all' && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-between"
              onClick={() => { handleRoleChange('owner'); setIsCombinedDropdownOpen(false); }}
            >
              <span>Owner</span>
              {filters.role === 'owner' && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-between"
              onClick={() => { handleRoleChange('manager'); setIsCombinedDropdownOpen(false); }}
            >
              <span>Manager</span>
              {filters.role === 'manager' && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-between"
              onClick={() => { handleRoleChange('employee'); setIsCombinedDropdownOpen(false); }}
            >
              <span>Employee</span>
              {filters.role === 'employee' && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-between"
              onClick={() => { handleRoleChange('custom'); setIsCombinedDropdownOpen(false); }}
            >
              <span>Custom</span>
              {filters.role === 'custom' && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>

            {/* Divider */}
            <div className="h-px bg-gray-700 my-2"></div>

            {/* Status Section */}
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Status</div>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-between"
              onClick={() => { handleStatusChange('all'); setIsCombinedDropdownOpen(false); }}
            >
              <span>All Status</span>
              {filters.status === 'all' && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-between"
              onClick={() => { handleStatusChange('active'); setIsCombinedDropdownOpen(false); }}
            >
              <span>Active</span>
              {filters.status === 'active' && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-between"
              onClick={() => { handleStatusChange('invited'); setIsCombinedDropdownOpen(false); }}
            >
              <span>Invited</span>
              {filters.status === 'invited' && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-between"
              onClick={() => { handleStatusChange('suspended'); setIsCombinedDropdownOpen(false); }}
            >
              <span>Suspended</span>
              {filters.status === 'suspended' && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Role Filter Dropdown (Desktop Only) */}
      <div className="hidden md:block">
        <DropdownMenu open={isRoleDropdownOpen} onOpenChange={setIsRoleDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[180px] bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 justify-between"
              data-testid="select-role-filter"
            >
              <span>{getRoleLabel(filters.role)}</span>
              <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 premium-card text-white">
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleRoleChange('all')}
            >
              All Roles
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleRoleChange('owner')}
            >
              Owner
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleRoleChange('manager')}
            >
              Manager
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleRoleChange('employee')}
            >
              Employee
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleRoleChange('custom')}
            >
              Custom
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status Filter Dropdown (Desktop Only) */}
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
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleStatusChange('active')}
            >
              Active
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleStatusChange('invited')}
            >
              Invited
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer transition-all duration-300"
              onClick={() => handleStatusChange('suspended')}
            >
              Suspended
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Invite Member Button */}
      <Button
        onClick={onInvite}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition-colors"
        data-testid="button-invite-member"
      >
        <i className="fas fa-user-plus md:mr-2"></i>
        <span className="hidden md:inline">Invite Member</span>
      </Button>
    </div>
  );
};
