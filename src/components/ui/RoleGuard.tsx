import type { ReactNode } from 'react';
import { useRBAC, hasMinRole } from '@/hooks/useRBAC';
import { ShieldAlert } from 'lucide-react';
import type { WorkspaceRole } from '@/types';

interface RoleGuardProps {
  minRole: WorkspaceRole;
  children: ReactNode;
  fallback?: ReactNode;
}

function DefaultFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <ShieldAlert className="w-6 h-6 text-gray-400 dark:text-slate-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Access restricted</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm">
        You don't have permission to view this section. Contact a workspace admin for access.
      </p>
    </div>
  );
}

export function RoleGuard({ minRole, children, fallback }: RoleGuardProps) {
  const { role } = useRBAC();

  if (!hasMinRole(role, minRole)) {
    return <>{fallback ?? <DefaultFallback />}</>;
  }

  return <>{children}</>;
}
