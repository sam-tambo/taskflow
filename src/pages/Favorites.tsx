import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUIStore } from '@/stores/useUIStore';
import { cn, formatDueDate, getDueDateColor, getPriorityColor, getInitials, getAvatarColor } from '@/lib/utils';
import { Star, Check, Calendar, Flag, MessageSquare, Folder } from 'lucide-react';
import { useUpdateTask } from '@/hooks/useTasks';
import type { Task } from '@/types';

export default function Favorites() {
  usePageTitle('My Favorites');
  const { user } = useAuth();
  const { openTaskDetail } = useUIStore();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['favorite-tasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*), project:projects(*)')
        .eq('is_favorite', true)
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });

  const updateTask = useUpdateTask();

  const grouped = useMemo(() => {
    const active = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    const completed = tasks.filter(t => t.status === 'done');
    return { active, completed };
  }, [tasks]);

  const handleComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({ id: task.id, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null });
  };

  const handleUnfavorite = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, is_favorite: false });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="skeleton h-10 w-48 rounded-lg" />
        <div className="skeleton h-14 rounded-xl" />
        <div className="skeleton h-14 rounded-xl" />
        <div className="skeleton h-14 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Favorites</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{tasks.length} starred {tasks.length === 1 ? 'task' : 'tasks'}</p>
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-16">
          <Star className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400 mb-1">No favorite tasks yet</p>
          <p className="text-sm text-gray-400 dark:text-slate-500">Star tasks to quickly find them here</p>
        </div>
      )}

      {/* Active tasks */}
      {grouped.active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Active ({grouped.active.length})</h2>
          <div className="space-y-1">
            {grouped.active.map(task => (
              <TaskRow key={task.id} task={task} onComplete={handleComplete} onUnfavorite={handleUnfavorite} onClick={() => openTaskDetail(task.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {grouped.completed.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Completed ({grouped.completed.length})</h2>
          <div className="space-y-1 opacity-60">
            {grouped.completed.map(task => (
              <TaskRow key={task.id} task={task} onComplete={handleComplete} onUnfavorite={handleUnfavorite} onClick={() => openTaskDetail(task.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onComplete, onUnfavorite, onClick }: {
  task: Task;
  onComplete: (e: React.MouseEvent, task: Task) => void;
  onUnfavorite: (e: React.MouseEvent, task: Task) => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
    >
      <button
        onClick={(e) => onComplete(e, task)}
        className={cn(
          'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
          task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 hover:border-[#4B7C6F]'
        )}
      >
        {task.status === 'done' && <Check className="w-2.5 h-2.5 text-white" />}
      </button>

      <span className={cn('flex-1 text-sm font-medium', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white')}>
        {task.title}
      </span>

      {task.project && (
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
          {task.project.name}
        </span>
      )}

      {task.priority && task.priority !== 'none' && (
        <span className={cn('text-xs capitalize', getPriorityColor(task.priority))}>{task.priority}</span>
      )}

      {task.due_date && (
        <span className={cn('text-xs flex items-center gap-1', getDueDateColor(task.due_date))}>
          <Calendar className="w-3 h-3" />
          {formatDueDate(task.due_date)}
        </span>
      )}

      {task.assignee && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: getAvatarColor(task.assignee.id) }}>
          {getInitials(task.assignee.full_name)}
        </div>
      )}

      <button
        onClick={(e) => onUnfavorite(e, task)}
        className="opacity-0 group-hover:opacity-100 p-1 text-yellow-500 hover:text-yellow-600 transition-opacity"
        title="Remove from favorites"
      >
        <Star className="w-3.5 h-3.5 fill-current" />
      </button>
    </div>
  );
}
