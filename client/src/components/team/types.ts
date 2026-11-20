/**
 * TypeScript types and interfaces for Team Management components
 */

// Member status
export type MemberStatus = 'active' | 'invited' | 'suspended';

// Member role
export type MemberRole = 'owner' | 'manager' | 'employee' | 'custom';

// Audit log action types
export type AuditAction =
  | 'invited'
  | 'role_changed'
  | 'suspended'
  | 'reactivated'
  | 'removed'
  | 'agents_updated'
  | 'invitation_resent'
  | 'invitation_revoked';

// Role permissions structure
export interface RolePermissions {
  home: { enabled: boolean };
  calls: { enabled: boolean; history: boolean; contacts: boolean };
  analytics: { enabled: boolean; calls: boolean; services: boolean };
  settings: {
    enabled: boolean;
    agents: boolean;
    memory: boolean;
    integrations: boolean;
    members: boolean;
    account: boolean;
  };
}

// Team member interface
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  permissions: RolePermissions | null;
  assignedAgentIds: string[] | null;
  phoneNumber?: string | null;
  enableSMS?: boolean;
  enableCallTransfer?: boolean;
  status: MemberStatus;
  joinedAt: string;
  lastActive: string | null;
  isOwner?: boolean;
  isCurrentUser?: boolean;
}

// Pending invitation interface
export interface PendingInvitation {
  id: string;
  email: string;
  role: MemberRole;
  permissions: RolePermissions | null;
  assignedAgentIds: string[] | null;
  status: 'pending' | 'expired' | 'revoked';
  inviterName: string;
  expiresAt: string;
  createdAt: string;
}

// Combined member/invitation type for table display
export interface TableMember extends TeamMember {
  isPending?: boolean;
  invitationId?: string;
  expiresAt?: string;
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  performedBy: {
    id: string;
    name: string;
    email: string;
  };
  previousValue: any;
  newValue: any;
  createdAt: string;
}

// Voice agent (simplified)
export interface VoiceAgent {
  id: string;
  agentName: string;
  industry: string;
}

// Filter state
export interface MemberFilters {
  search: string;
  role: MemberRole | 'all';
  status: MemberStatus | 'all';
}

// Bulk action type
export type BulkAction = 'change_role' | 'suspend' | 'reactivate' | 'remove';

// Form data for inviting member
export interface InviteMemberFormData {
  email: string;
  role: MemberRole;
  permissions?: RolePermissions;
  assignedAgentIds?: string[];
}

// Form data for editing member
export interface EditMemberFormData {
  role: MemberRole;
  permissions?: RolePermissions;
}

// Form data for managing agents
export interface ManageAgentsFormData {
  assignedAgentIds: string[];
}

// Bulk update payload
export interface BulkUpdatePayload {
  memberIds: string[];
  action: BulkAction;
  data?: {
    role?: MemberRole;
    permissions?: RolePermissions;
  };
}

// API response types
export interface MembersResponse {
  members: TeamMember[];
}

export interface InvitationsResponse {
  invitations: PendingInvitation[];
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
}

// Component props interfaces
export interface MembersTableProps {
  selectedAgentId: string | null;
}

export interface MemberRowProps {
  member: TableMember;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEditRole: (member: TableMember) => void;
  onManageAgents: (member: TableMember) => void;
  onSuspend: (member: TableMember) => void;
  onReactivate: (member: TableMember) => void;
  onResendInvite: (member: TableMember) => void;
  onRevokeInvite: (member: TableMember) => void;
  onRemove: (member: TableMember) => void;
  onViewHistory: (member: TableMember) => void;
  availableAgents: VoiceAgent[];
}

export interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: InviteMemberFormData) => Promise<void>;
  availableAgents: VoiceAgent[];
}

export interface EditMemberModalProps {
  isOpen: boolean;
  member: TableMember | null;
  onClose: () => void;
  onUpdate: (memberId: string, data: EditMemberFormData) => Promise<void>;
}

export interface ManageAgentsModalProps {
  isOpen: boolean;
  member: TableMember | null;
  onClose: () => void;
  onUpdate: (memberId: string, data: ManageAgentsFormData) => Promise<void>;
  availableAgents: VoiceAgent[];
}

export interface BulkActionsBarProps {
  selectedCount: number;
  onChangeRole: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onRemove: () => void;
  onClearSelection: () => void;
}

export interface MemberFiltersProps {
  filters: MemberFilters;
  onFilterChange: (filters: MemberFilters) => void;
  roleCounts: Record<MemberRole | 'all', number>;
  statusCounts: Record<MemberStatus | 'all', number>;
  onInvite: () => void;
}

export interface AuditLogModalProps {
  isOpen: boolean;
  member: TableMember | null;
  onClose: () => void;
}
