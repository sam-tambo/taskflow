import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtime';
import { useUIStore } from '@/stores/useUIStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, UserPlus, MessageSquare, CheckCircle, Clock, AtSign, Trash2, Archive, Filter } from 'lucide-react';
import type { Notification } from '@/types';
import { toast } from 'sonner';

const notificationIcons: Record<string, typeof Bell> = {
  task_assigned: UserPlus,
  task_commented: MessageSquare,
  task_completed: CheckCircle,
  mentioned: AtSign,
  due_soon: Clock,
};

const typeLabels: Record<string, string> = {
  task_assigned: 'Assigned',
  task_commented: 'Comments',
  task_completed: 'Completed',
  mentioned: 'Mentions',
  due_soon: 'Due Soon',
};

type TabFilter = 'all' | 'unread' | 'task_assigned' | 'task_commented' | 'mentioned' | 'due_soon';

export default function Inbox() {
  usePageTitle('Inbox');
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead(user?.id);
  const { openTaskDetail } = useUIStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  useRealtimeNotifications(user?.id);

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'unread') return notifications.filter(n => !n.is_read);
    return notifications.filter(n => n.type === activeTab);
  }, [notifications, activeTab]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.resource_type === 'task' && notification.resource_id) {
      openTaskDetail(notification.resource_id);
    }
  };

  const tabs: { id: TabFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'mentioned', label: 'Mentions' },
    { id: 'task_assigned', label: 'Assigned' },
    { id: 'task_commented', label: 'Comments' },
    { id: 'due_soon', label: 'Due Soon' },
  ];

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        <div className="skeleton h-12 w-32" />
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inbox</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllAsRead.mutate()} className="flex items-center gap-1.5 text-sm text-[#4B7C6F] hover:underline">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 border-b border-gray-200 dark:border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-[#4B7C6F] text-[#4B7C6F] font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-16">
          <Bell className="w-16 h-16 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            {activeTab === 'unread' ? 'All caught up!' : 'No notifications'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {activeTab === 'unread' ? 'You have no unread notifications.' : 'Notifications will appear here.'}
          </p>
        </div>
      )}

      <div className="space-y-1">
        {filteredNotifications.map((n) => {
          const Icon = notificationIcons[n.type] || Bell;
          return (
            <div
              key={n.id}
              className={cn(
                'group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors',
                n.is_read ? 'hover:bg-gray-50 dark:hover:bg-slate-800/50' : 'bg-[#4B7C6F]/5 hover:bg-[#4B7C6F]/10'
              )}
            >
              <div onClick={() => handleClick(n)} className="flex items-start gap-3 flex-1 min-w-0">
                {n.actor ? (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(n.actor.id) }}>
                    {getInitials(n.actor.full_name)}
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{n.title}</span>
                    </p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', n.type === 'mentioned' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : n.type === 'due_soon' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700' : 'bg-gray-100 dark:bg-slate-800 text-gray-500')}>
                      {typeLabels[n.type] || n.type}
                    </span>
                  </div>
                  {n.body && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                {!n.is_read && (
                  <button onClick={(e) => { e.stopPropagation(); markAsRead.mutate(n.id); }} className="p-1.5 text-gray-400 hover:text-[#4B7C6F] rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800" title="Mark as read">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); deleteNotification.mutate(n.id); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#16A34A] flex-shrink-0 mt-3" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
