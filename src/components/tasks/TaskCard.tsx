import { Check, Calendar, MessageSquare, Paperclip, GitBranch, Flag, Star, Repeat } from 'lucide-react';
import { cn, formatDueDate, getDueDateColor, getPriorityBorderColor, getInitials, getAvatarColor } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useUpdateTask } from '@/hooks/useTasks';
import type { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  projectId?: string;
  isDragging?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-400',
  none: 'text-transparent',
};

export function TaskCard({ task, projectId, isDragging }: TaskCardProps) {
  const { openTaskDetail } = useUIStore();
  const updateTask = useUpdateTask(projectId);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({ id: task.id, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null });
  };

  const subtaskTotal = task.subtasks_count ?? 0;
  const subtaskDone = task.subtasks_completed ?? 0;
  const subtaskPercent = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

  return (
    <div
      onClick={() => openTaskDetail(task.id)}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer transition-all group',
        isDragging && 'opacity-60 rotate-2 shadow-xl'
      )}
    >
      {/* Priority stripe */}
      <div className={cn('h-1 rounded-t-xl', {
        'bg-red-500': task.priority === 'urgent',
        'bg-orange-400': task.priority === 'high',
        'bg-yellow-400': task.priority === 'medium',
        'bg-blue-300': task.priority === 'low',
        'bg-transparent': task.priority === 'none' || !task.priority,
      })} />

      <div className="p-3">
        {/* Title row */}
        <div className="flex items-start gap-2 mb-1.5">
          <button
            onClick={handleComplete}
            className={cn(
              'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
              task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 hover:border-[#4B7C6F]'
            )}
          >
            {task.status === 'done' && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
          <span className={cn('text-sm font-medium leading-snug flex-1', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white')}>
            {task.title}
          </span>
          {task.is_favorite && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0 mt-0.5" />}
          {task.priority && task.priority !== 'none' && (
            <Flag className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', PRIORITY_COLORS[task.priority])} />
          )}
        </div>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-2 line-clamp-2 ml-[26px]">
            {task.description.replace(/<[^>]*>/g, '').slice(0, 80)}
          </p>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 ml-[26px]">
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-purple/10 text-purple rounded-full">{tag}</span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-400 rounded-full">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Subtask progress bar */}
        {subtaskTotal > 0 && (
          <div className="mb-2 ml-[26px]">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', subtaskPercent === 100 ? 'bg-green-500' : 'bg-[#4B7C6F]')}
                  style={{ width: `${subtaskPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{subtaskDone}/{subtaskTotal}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-1.5 ml-[26px]">
          <div className="flex items-center gap-2.5">
            {task.due_date && (
              <span className={cn('text-[11px] flex items-center gap-1 font-medium', getDueDateColor(task.due_date))}>
                <Calendar className="w-3 h-3" />
                {formatDueDate(task.due_date)}
              </span>
            )}
            {(task.comments_count ?? 0) > 0 && (
              <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />{task.comments_count}
              </span>
            )}
            {(task.attachments_count ?? 0) > 0 && (
              <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                <Paperclip className="w-3 h-3" />{task.attachments_count}
              </span>
            )}
            {task.recurrence && (
              <span className="text-[11px] text-[#4B7C6F] flex items-center" title="Recurring">
                <Repeat className="w-3 h-3" />
              </span>
            )}
          </div>
          {task.assignee && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium ring-2 ring-white dark:ring-slate-800"
              style={{ backgroundColor: getAvatarColor(task.assignee.id) }}
              title={task.assignee.full_name || ''}
            >
              {getInitials(task.assignee.full_name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
