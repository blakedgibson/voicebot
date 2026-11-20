/**
 * Integrations Library Component
 *
 * Discovery view showing all available integration templates with search and filtering.
 */

import React, { useState, useMemo } from 'react';
import { IntegrationTemplate, IntegrationCategory, Integration } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getAllTemplates,
  getTemplatesByCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from './integrationTemplates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Search } from 'lucide-react';

interface IntegrationsLibraryProps {
  connectedIntegrations: Integration[];
  onSelectTemplate: (template: IntegrationTemplate) => void;
  onBackToMyIntegrations: () => void;
  initialCategory?: IntegrationCategory;
}

// Map Retell AI function names to integration template IDs
const FUNCTION_TO_INTEGRATION_MAP: Record<string, string[]> = {
  // POS/Order Management Functions
  'place_order': ['square', 'clover', 'toast', 'stripe_terminal'],
  'process_payment': ['square', 'clover', 'toast', 'stripe_terminal'],
  'check_order_status': ['square', 'clover', 'toast'],
  
  // Appointment/Calendar Functions
  'book_appointment': ['google_calendar', 'calendly', 'cal_com', 'mindbody', 'boulevard', 'meevo', 'servicetitan', 'housecall_pro', 'vagaro', 'fresha', 'square_appointments'],
  'modify_appointment': ['google_calendar', 'calendly', 'cal_com', 'mindbody', 'boulevard', 'meevo', 'servicetitan', 'housecall_pro', 'vagaro', 'fresha', 'square_appointments'],
  'cancel_appointment': ['google_calendar', 'calendly', 'cal_com', 'mindbody', 'boulevard', 'meevo', 'servicetitan', 'housecall_pro', 'vagaro', 'fresha', 'square_appointments'],
  'check_availability': ['google_calendar', 'calendly', 'cal_com', 'mindbody', 'boulevard', 'meevo', 'servicetitan', 'housecall_pro', 'vagaro', 'fresha', 'square_appointments'],
  'book_calendar_event': ['google_calendar', 'calendly', 'cal_com', 'mindbody', 'boulevard', 'meevo', 'servicetitan', 'housecall_pro', 'vagaro', 'fresha', 'square_appointments'],
  
  // Reservation Functions
  'create_reservation': ['opentable', 'resy', 'yelp'],
  'modify_reservation': ['opentable', 'resy', 'yelp'],
  'cancel_reservation': ['opentable', 'resy', 'yelp'],
  
  // Delivery Functions
  'schedule_delivery': ['doordash', 'ubereats', 'grubhub'],
  'track_delivery': ['doordash', 'ubereats', 'grubhub'],
  
  // CRM Functions
  'get_customer_memory': ['contact_memory', 'salesforce', 'hubspot', 'zoho_crm', 'pipedrive'],
  'update_customer_memory': ['contact_memory', 'salesforce', 'hubspot', 'zoho_crm', 'pipedrive'],
  'get_customer_profile': ['contact_memory', 'salesforce', 'hubspot', 'zoho_crm', 'pipedrive'],
  'update_customer_profile': ['contact_memory', 'salesforce', 'hubspot', 'zoho_crm', 'pipedrive'],
  
  // Messaging Functions
  'send_email': ['sendgrid', 'mailchimp'],

  // Call Actions
  'transfer_call': ['twilio'],
  'end_call': ['twilio'],

  // Magic Browser Automation
  'trigger_magic_action': ['newo_magic'],
  'create_magic_actor': ['newo_magic'],
  'get_magic_settings': ['newo_magic'],
};


export const IntegrationsLibrary: React.FC<IntegrationsLibraryProps> = ({
  connectedIntegrations,
  onSelectTemplate,
  onBackToMyIntegrations,
  initialCategory = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>(initialCategory);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Get all templates
  const allTemplates = useMemo(() => getAllTemplates(), []);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: allTemplates.length,
      calendar: getTemplatesByCategory('calendar').length,
      crm: getTemplatesByCategory('crm').length,
      pos: getTemplatesByCategory('pos').length,
      messaging: getTemplatesByCategory('messaging').length,
      callactions: getTemplatesByCategory('callactions').length,
      custom: getTemplatesByCategory('custom').length,
    };
  }, [allTemplates]);

  // Filter templates based on search, category, and industry
  const filteredTemplates = useMemo(() => {
    let templates =
      selectedCategory === 'all'
        ? allTemplates
        : getTemplatesByCategory(selectedCategory);

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query)
      );
    }

    return templates;
  }, [allTemplates, selectedCategory, searchQuery]);

  // Check if a template is already connected
  const isConnected = (templateId: string): boolean => {
    return connectedIntegrations.some((integration) => integration.type === templateId);
  };

  // Category options
  const categories: IntegrationCategory[] = ['all', 'calendar', 'crm', 'pos', 'messaging', 'custom'];

  const getCategoryLabel = (category: IntegrationCategory) => {
    if (category === 'all') return 'All Integrations';
    return CATEGORY_LABELS[category] || 'All';
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
    setSelectedCategory(category);
    setIsCategoryDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Search, Category Dropdown and Back Button */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 max-w-[calc(100%-4.5rem)] md:flex-auto md:max-w-none md:min-w-[300px] relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder=""
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-transparent border-gray-800 text-gray-300"
            data-testid="input-search-library"
          />
        </div>

        {/* Category Filter Dropdown */}
        <DropdownMenu open={isCategoryDropdownOpen} onOpenChange={setIsCategoryDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[180px] bg-transparent border-gray-800 text-gray-300 hover:bg-gray-800 justify-between"
              data-testid="select-category-filter-library"
            >
              <span className="truncate">{getCategoryLabel(selectedCategory)}</span>
              <ChevronDown className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 premium-card text-white">
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

        {/* Back to My Integrations Button - Only show if user has connected integrations */}
        {connectedIntegrations.length > 0 && (
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 px-4 md:px-6 py-2 rounded-lg font-medium transition-colors"
            onClick={onBackToMyIntegrations}
            data-testid="button-back-to-my-integrations"
          >
            <i className="fas fa-arrow-left md:mr-2"></i>
            <span className="hidden md:inline">My Integrations</span>
          </Button>
        )}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => {
            const isAlreadyConnected = isConnected(template.id);

            return (
              <div
                key={template.id}
                className="premium-card relative p-6 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => !isAlreadyConnected && onSelectTemplate(template)}
              >
                {/* Connected Badge - Top Right */}
                {isAlreadyConnected && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-500 text-white">
                      <i className="fas fa-check-circle mr-1"></i>
                      Connected
                    </Badge>
                  </div>
                )}

                {/* Icon/Logo */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-4"
                  style={{ backgroundColor: template.color }}
                >
                  {template.logoUrl ? (
                    <img
                      src={template.logoUrl}
                      alt={template.name}
                      className="w-12 h-12 rounded-full object-contain"
                    />
                  ) : (
                    <i className={template.icon}></i>
                  )}
                </div>

                {/* Service Name */}
                <h3 className="text-lg font-semibold text-white mb-2">
                  {template.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                  {template.description}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="premium-card rounded-lg">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <i className="fas fa-search text-2xl text-gray-500"></i>
            </div>
            <h4 className="text-lg font-medium text-white mb-2">No integrations found</h4>
            <p className="text-gray-400 mb-4">
              Try adjusting your search query or filters.
            </p>
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              <i className="fas fa-redo mr-2"></i>
              Clear Search
            </Button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <div className="flex items-start">
          <i className="fas fa-info-circle text-blue-400 mt-1 mr-3"></i>
          <div>
            <h4 className="font-medium text-blue-300 mb-1">Can't find what you're looking for?</h4>
            <p className="text-sm text-blue-200/80">
              You can create a custom integration using webhooks to connect with n8n, Zapier,
              Make.com, or any custom API endpoint.
            </p>
            {selectedCategory !== 'custom' && (
              <Button
                variant="link"
                className="text-blue-400 hover:text-blue-300 p-0 h-auto mt-2"
                onClick={() => setSelectedCategory('custom')}
              >
                View Custom Integration <i className="fas fa-arrow-right ml-1"></i>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
