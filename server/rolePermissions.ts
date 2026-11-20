// Default permissions for each role type
// These permissions control what tabs and features each role can access

export interface RolePermissions {
  home: {
    enabled: boolean;
  };
  calls: {
    enabled: boolean;
    history: boolean;
    contacts: boolean;
  };
  analytics: {
    enabled: boolean;
    calls: boolean;
    services: boolean;
  };
  settings: {
    enabled: boolean;
    agents: boolean;
    memory: boolean;
    integrations: boolean;
    members: boolean;
    account: boolean;
  };
}

// Owner: Full access to everything
export const OWNER_PERMISSIONS: RolePermissions = {
  home: { enabled: true },
  calls: {
    enabled: true,
    history: true,
    contacts: true
  },
  analytics: {
    enabled: true,
    calls: true,
    services: true
  },
  settings: {
    enabled: true,
    agents: true,
    memory: true,
    integrations: true,
    members: true,
    account: true
  }
};

// Manager: Can manage most things except account settings
export const MANAGER_PERMISSIONS: RolePermissions = {
  home: { enabled: true },
  calls: {
    enabled: true,
    history: true,
    contacts: true
  },
  analytics: {
    enabled: true,
    calls: true,
    services: true
  },
  settings: {
    enabled: true,
    agents: true,
    memory: true,
    integrations: true,
    members: true,
    account: false // Managers can't access account billing/subscription
  }
};

// Employee: Can view data and edit customer records, but limited settings access
export const EMPLOYEE_PERMISSIONS: RolePermissions = {
  home: { enabled: true },
  calls: {
    enabled: true,
    history: true,
    contacts: true
  },
  analytics: {
    enabled: true,
    calls: true,
    services: false // No service analytics
  },
  settings: {
    enabled: false, // No settings access by default
    agents: false,
    memory: false,
    integrations: false,
    members: false,
    account: false
  }
};

/**
 * Get default permissions for a given role
 * @param role The role name (owner, manager, employee, custom)
 * @returns RolePermissions object or null for custom roles
 */
export function getDefaultPermissions(role: string): RolePermissions | null {
  const normalizedRole = role.toLowerCase();

  switch (normalizedRole) {
    case 'owner':
      return OWNER_PERMISSIONS;
    case 'manager':
      return MANAGER_PERMISSIONS;
    case 'employee':
      return EMPLOYEE_PERMISSIONS;
    case 'custom':
      // Custom roles must have permissions explicitly defined
      return null;
    default:
      // Default to employee permissions for unknown roles
      return EMPLOYEE_PERMISSIONS;
  }
}

/**
 * Check if a user has permission to access a specific feature
 * @param permissions The user's permission object
 * @param feature The feature path (e.g., "settings.agents", "calls.history")
 * @returns boolean indicating if access is granted
 */
export function hasPermission(
  permissions: RolePermissions | null,
  feature: string
): boolean {
  if (!permissions) return false;

  const parts = feature.split('.');

  if (parts.length === 1) {
    // Top-level permission (e.g., "home", "calls")
    const section = parts[0] as keyof RolePermissions;
    return permissions[section]?.enabled || false;
  }

  if (parts.length === 2) {
    // Sub-permission (e.g., "calls.history", "settings.agents")
    const [section, subsection] = parts;
    const sectionPerms = permissions[section as keyof RolePermissions];

    if (!sectionPerms || typeof sectionPerms !== 'object') return false;

    // Check if section is enabled first
    if ('enabled' in sectionPerms && !sectionPerms.enabled) return false;

    // Check subsection
    return (sectionPerms as any)[subsection] || false;
  }

  return false;
}

/**
 * Merge custom permissions with default role permissions
 * For custom roles, permissions can be partially defined
 * @param role The role name
 * @param customPermissions Custom permission overrides
 * @returns Complete RolePermissions object
 */
export function mergePermissions(
  role: string,
  customPermissions: Partial<RolePermissions> | null
): RolePermissions {
  const defaultPerms = getDefaultPermissions(role);

  // For custom roles or when no defaults exist, start with all disabled
  const basePerms: RolePermissions = defaultPerms || {
    home: { enabled: false },
    calls: { enabled: false, history: false, contacts: false },
    analytics: { enabled: false, calls: false, services: false },
    settings: { enabled: false, agents: false, memory: false, integrations: false, members: false, account: false }
  };

  // If no custom permissions, return base permissions
  if (!customPermissions) return basePerms;

  // Deep merge custom permissions with base
  return {
    home: { ...basePerms.home, ...customPermissions.home },
    calls: { ...basePerms.calls, ...customPermissions.calls },
    analytics: { ...basePerms.analytics, ...customPermissions.analytics },
    settings: { ...basePerms.settings, ...customPermissions.settings }
  };
}
