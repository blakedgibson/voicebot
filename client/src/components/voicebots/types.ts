/**
 * Voicebot Types
 *
 * TypeScript interfaces for voicebot components
 */

export type VoicebotStatus = 'active' | 'inactive' | 'all';

export interface VoicebotFilters {
  search: string;
  status: VoicebotStatus;
}

export interface VoicebotMetrics {
  minutesUsed: number;
  totalCalls: number;
  textsSent: number;
  contactsGathered: number;
  membersAssigned: number;
  knowledgeBaseItems: number;
  activeIntegrations: number;
}

export interface Voicebot {
  id: string;
  name: string;
  businessName?: string;
  phoneNumber?: string;
  industry?: string;
  city?: string;
  state?: string;
  retellAgentId?: string;
  createdAt?: string;
  updatedAt?: string;
  metrics?: VoicebotMetrics;
}
