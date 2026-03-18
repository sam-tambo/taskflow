import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtime';
import { useUIStore } from '@/stores/useUIStore';
import { useNavigate } from 'react-router-dom';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { format } from 'date-fns';
import { Bell, CheckCheck, UserPlus, MessageSquare, CheckCircle, Clock, AtSign } from 'lucide-react';

const notificationIcons: Record<string, typeof Bell> = {
  task_assigned: UserPlus,
  task_commented: MessageSquare,
  task_completed: CheckCircle,
  mentioned: AtSign,
  due_soon: Clock,
};

export default function Inbox() {
  usePageTitle('Inbox');
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead(user?.id);
  const navigate = useNavigate();
  const { openTaskDetail } = useUIStore();

  useRealtimeNotifications(user?.id);

  const handleClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.resource_type === 'task' && notification.resource_id) {
      openTaskDetail(notification.resource_id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        <div className="skeleton h-12 w-32" />
        {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inbox</h1>
        {notifications.some(n => !n.is_read) && (
          <button onClick={() => markAllAsRead.mutate()} className="flex items-center gap-1.5 text-sm text-coral hover:underline">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-20 h-20 mx-auto mb-4 text-gray-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No notifications</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">You're all caught up! New notifications will appear here.</p>
        </div>
      )}

      <div className="space-y-1">
        {notifications.map((n) => {
          const Icon = notificationIcons[n.type] || Bell;
          return (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors',
                n.is_read ? 'hover:bg-gray-50 dark:hover:bg-slate-800/50' : 'bg-coral/5 hover:bg-coral/10'
              )}
            >
              {n.actor ? (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(n.actor.id) }}>
                  {getInitials(n.actor.full_name)}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">{n.title}</span>
                </p>
                {n.body && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{n.body}</p>}
                <p className="text-xs text-gray-400 mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
              </div>
              {!n.is_read && <div className="w-2 h-2 rounded-full bg-coral flex-shrink-0 mt-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
