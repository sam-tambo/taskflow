import { cn } from '@/lib/utils';
import { Shield, Briefcase, Eye } from 'lucide-react';
import type { WorkspaceRole } from '@/types';

interface RoleBadgeProps {
  role: WorkspaceRole;
  size?: 'sm' | 'md';
  className?: string;
}

const roleConfig: Record<WorkspaceRole, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  owner: { label: 'Owner', color: 'text-[#4B7C6F]', bg: 'bg-[#4B7C6F]/10', icon: Shield },
  admin: { label: 'Admin', color: 'text-[#4B7C6F]', bg: 'bg-[#4B7C6F]/10', icon: Shield },
  employee: { label: 'Employee', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Briefcase },
  client: { label: 'Client', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: Eye },
};

export function RoleBadge({ role, size = 'sm', className }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      config.color, config.bg,
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      className,
    )}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
}

export function getRoleLabel(role: WorkspaceRole): string {
  return roleConfig[role]?.label ?? role;
}
