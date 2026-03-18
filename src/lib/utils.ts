import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isTomorrow, isThisWeek, isPast, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getAvatarColor(id: string): string {
  const colors = [
    '#4B7C6F', '#8B5CF6', '#EC4899', '#14B8A6', '#3B82F6',
    '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#84CC16',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getDueDateColor(dateStr: string | null): string {
  if (!dateStr) return 'text-gray-400';
  const date = parseISO(dateStr);
  if (isPast(date) && !isToday(date)) return 'text-red-500';
  if (isToday(date)) return 'text-[#4B7C6F]';
  if (isTomorrow(date) || isThisWeek(date)) return 'text-yellow-600';
  return 'text-gray-500';
}

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-red-500 bg-red-50';
    case 'high': return 'text-[#4B7C6F] bg-[#f0f7f5]';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-blue-500 bg-blue-50';
    default: return 'text-gray-400 bg-gray-50';
  }
}

export function getPriorityBorderColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'border-l-red-500';
    case 'high': return 'border-l-orange-500';
    case 'medium': return 'border-l-yellow-500';
    case 'low': return 'border-l-blue-500';
    default: return 'border-l-gray-200';
  }
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
