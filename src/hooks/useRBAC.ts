import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import type { WorkspaceRole } from '@/types';

export interface RBACPermissions {
  role: WorkspaceRole | null;
  isAdmin: boolean;
  isEmployee: boolean;
  isClient: boolean;
  isOwner: boolean;
  canManageMembers: boolean;
  canManageProjects: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canViewReports: boolean;
  canViewAllComments: boolean;
  canExport: boolean;
  canManageAutomations: boolean;
  canManageSettings: boolean;
}

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  employee: 2,
  client: 1,
};

export function useRBAC(): RBACPermissions {
  const { user } = useAuth();
  const { members } = useWorkspaceStore();

  return useMemo(() => {
    const member = members.find(m => m.user_id === user?.id);
    const role = member?.role ?? null;

    const isOwner = role === 'owner';
    const isAdmin = role === 'admin' || isOwner;
    const isEmployee = role === 'employee' || isAdmin;
    const isClient = role === 'client';

    return {
      role,
      isOwner,
      isAdmin,
      isEmployee,
      isClient,
      canManageMembers: isAdmin,
      canManageProjects: isAdmin,
      canCreateTasks: isEmployee,
      canEditTasks: isEmployee,
      canDeleteTasks: isAdmin,
      canViewReports: isEmployee,
      canViewAllComments: isEmployee,
      canExport: isEmployee,
      canManageAutomations: isAdmin,
      canManageSettings: isAdmin,
    };
  }, [user?.id, members]);
}

export function hasMinRole(userRole: WorkspaceRole | null, minRole: WorkspaceRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
