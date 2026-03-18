import { cn } from '@/lib/utils';

interface AvatarUser {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface AvatarProps {
  user: AvatarUser;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTooltip?: boolean;
  className?: string;
}

const sizeMap: Record<string, number> = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
};

const fontSizeMap: Record<string, string> = {
  xs: 'text-[8px]',
  sm: 'text-[9px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-lg',
};

const colors = [
  '#4B7C6F', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#3B82F6', '#84CC16', '#6366F1',
];

function getColorFromId(userId: string): string {
  const idx = parseInt(userId.replace(/-/g, '').slice(0, 8), 16) % colors.length;
  return colors[idx];
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ user, size = 'md', showTooltip = true, className }: AvatarProps) {
  const px = sizeMap[size];
  const tooltip = showTooltip ? (user.full_name || undefined) : undefined;

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name || 'Avatar'}
        title={tooltip}
        className={cn('rounded-full object-cover flex-shrink-0', className)}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      title={tooltip}
      className={cn(
        'rounded-full flex items-center justify-center text-white font-medium flex-shrink-0',
        fontSizeMap[size],
        className,
      )}
      style={{
        width: px,
        height: px,
        backgroundColor: getColorFromId(user.id),
      }}
    >
      {getInitials(user.full_name)}
    </div>
  );
}
