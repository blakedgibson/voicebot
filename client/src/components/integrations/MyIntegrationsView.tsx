/**
 * My Integrations View Component
 *
 * Displays a grid of connected integrations with search/filter and empty state.
 */

import React, { useState, useMemo } from 'react';
import { IntegrationWithMeta, IntegrationsFilter, IntegrationCategory } from './types';
import { IntegrationCard } from './IntegrationCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CATEGORY_LABELS, CATEGORY_ICONS } from './integrationTemplates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Search, Check } from 'lucide-react';

interface MyIntegrationsViewProps {
  integrations: IntegrationWithMeta[];
  onIntegrationClick: (integration: IntegrationWithMeta) => void;
  onSwitchToLibrary: () => void;
  onSwitchToCustomLibrary: () => void;
  onDeleteIntegration?: (id: number) => void;
}

export const MyIntegrationsView: React.FC<MyIntegrationsViewProps> = ({
  integrations,
  onIntegrationClick,
  onSwitchToLibrary,
  onSwitchToCustomLibrary,
  onDeleteIntegration,
}) => {
  const [filter, setFilter] = useState<IntegrationsFilter>({
    search: '',
    category: 'all',
    status: 'all',
  });

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCombinedDropdownOpen, setIsCombinedDropdownOpen] = useState(false);

  // Filter integrations based on current filter state
  const filteredIntegrations = useMemo(() => {
    return integrations.filter((integration) => {
      // Search filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch =
          integration.name.toLowerCase().includes(searchLower) ||
          integration.description?.toLowerCase().includes(searchLower) ||
          integration.type?.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Category filter
      if (filter.category !== 'all') {
        const template = integration.template;
        if (template?.category !== filter.category) return false;
      }

      return true;
    });
  }, [integrations, filter]);

  // Count integrations by category
  const categoryCounts = useMemo(() => {
    const counts: Record<IntegrationCategory, number> = {
      all: integrations.length,
      calendar: integrations.filter((i) => i.template?.category === 'calendar').length,
      crm: integrations.filter((i) => i.template?.category === 'crm').length,
      pos: integrations.filter((i) => i.template?.category === 'pos').length,
      messaging: integrations.filter((i) => i.template?.category === 'messaging').length,
      callactions: integrations.filter((i) => i.template?.category === 'callactions').length,
      custom: integrations.filter((i) => i.template?.category === 'custom').length,
    };
    return counts;
  }, [integrations]);

  // Category filter options
  const categories: IntegrationCategory[] = ['all', 'calendar', 'crm', 'pos', 'messaging', 'custom'];

  const getCategoryLabel = (category: IntegrationCategory) => {
    return CATEGORY_LABELS[category] || 'All Integrations';
  };

  const getCategoryIconColor = (category: IntegrationCategory) => {
    switch (category) {
      case 'calendar':
        return 'text-blue-400';
      case 'crm':
        return 'text-purple-400';
      case 'pos':
        return 'text-green-400';
      case 'messaging':
        return 'text-orange-400';
      case 'callactions':
        return 'text-cyan-400';
      case 'custom':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleCategoryChange = (category: IntegrationCategory) => {
    setFilter({ ...filter, category });
    setIsCategoryDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Search, Dropdowns and Add Button - Matching Members Subtab */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 max-w-[calc(100%-4.5rem)] md:flex-auto md:max-w-none md:min-w-[300px] relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder=""
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-10 bg-transparent border-gray-800 text-gray-300"
            data-testid="input-search-integrations"
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
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer flex items-center justify-between"
                  onClick={() => { handleCategoryChange(category); setIsCombinedDropdownOpen(false); }}
                >
                  <span className="flex items-center">
                    <i className={`${CATEGORY_ICONS[category]} mr-2 ${getCategoryIconColor(category)}`}></i>
                    {getCategoryLabel(category)}
                  </span>
                  {filter.category === category && <Check className="h-4 w-4 text-blue-400" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Category Filter Dropdown (Desktop Only) */}
        <div className="hidden md:block">
          <DropdownMenu open={isCategoryDropdownOpen} onOpenChange={setIsCategoryDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-[180px] bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 justify-between"
                data-testid="select-category-filter"
              >
                <span>{getCategoryLabel(filter.category)}</span>
                <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 premium-card text-white">
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                  onClick={() => handleCategoryChange(category)}
                >
                  <i className={`${CATEGORY_ICONS[category]} mr-2 ${getCategoryIconColor(category)}`}></i>
                  {getCategoryLabel(category)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Add Integration Button */}
        <Button
          onClick={onSwitchToLibrary}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition-colors"
          data-testid="button-add-integration"
        >
          <i className="fas fa-plus md:mr-2"></i>
          <span className="hidden md:inline">Add Integration</span>
        </Button>
      </div>

      {/* Integrations Grid */}
      {filteredIntegrations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onClick={() => onIntegrationClick(integration)}
              onDelete={onDeleteIntegration}
            />
          ))}
        </div>
      )}
    </div>
  );
};
