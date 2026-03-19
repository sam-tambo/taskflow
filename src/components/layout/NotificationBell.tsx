import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import { useUIStore } from '@/stores/useUIStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, UserPlus, MessageSquare, CheckCircle, Clock, AtSign } from 'lucide-react';
import type { Notification } from '@/types';

const notificationIcons: Record<string, typeof Bell> = {
  task_assigned: UserPlus,
  task_commented: MessageSquare,
  task_completed: CheckCircle,
  mentioned: AtSign,
  due_soon: Clock,
};

export function NotificationBell({ collapsed }: { collapsed?: boolean }) {
  const { user } = useAuth();
  const { data: notifications = [] } = useNotifications(user?.id);
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead(user?.id);
  const { openTaskDetail } = useUIStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const recent = notifications.slice(0, 8);

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    if (n.resource_type === 'task' && n.resource_id) openTaskDetail(n.resource_id);
    setOpen(false);
  };

  if (collapsed) {
    return (
      <button onClick={() => setOpen(!open)} className="relative p-3 rounded-xl mb-1 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
          open ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
        )}
      >
        <Bell className="w-4 h-4" />
        <span className="flex-1 text-left">Notifications</span>
        {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute left-full bottom-0 ml-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={() => markAllAsRead.mutate()} className="text-xs text-[#4B7C6F] hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> Read all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              recent.map((n) => {
                const Icon = notificationIcons[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50',
                      !n.is_read && 'bg-[#4B7C6F]/5'
                    )}
                  >
                    {n.actor ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(n.actor.id) }}>
                        {getInitials(n.actor.full_name)}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#16A34A] flex-shrink-0 mt-2" />}
                  </button>
                );
              })
            )}
          </div>

          <button
            onClick={() => { navigate('/inbox'); setOpen(false); }}
            className="w-full px-4 py-2.5 text-sm text-center text-[#4B7C6F] hover:bg-gray-50 dark:hover:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 font-medium"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
