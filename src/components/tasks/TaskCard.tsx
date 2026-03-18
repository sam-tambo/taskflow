import { Check, Calendar, MessageSquare, Paperclip, GitBranch } from 'lucide-react';
import { cn, formatDueDate, getDueDateColor, getPriorityBorderColor, getInitials, getAvatarColor } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useUpdateTask } from '@/hooks/useTasks';
import type { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  projectId?: string;
  isDragging?: boolean;
}

export function TaskCard({ task, projectId, isDragging }: TaskCardProps) {
  const { openTaskDetail } = useUIStore();
  const updateTask = useUpdateTask(projectId);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({ id: task.id, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null });
  };

  return (
    <div
      onClick={() => openTaskDetail(task.id)}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4',
        getPriorityBorderColor(task.priority),
        isDragging && 'opacity-60 rotate-2 shadow-xl'
      )}
    >
      {/* Title */}
      <div className="flex items-start gap-2 mb-2">
        <button
          onClick={handleComplete}
          className={cn(
            'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
            task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 hover:border-[#4B7C6F]'
          )}
        >
          {task.status === 'done' && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
        <span className={cn('text-sm font-medium', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white')}>
          {task.title}
        </span>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-purple/10 text-purple rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={cn('text-xs flex items-center gap-1', getDueDateColor(task.due_date))}>
              <Calendar className="w-3 h-3" />
              {formatDueDate(task.due_date)}
            </span>
          )}
          {(task.comments_count ?? 0) > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />{task.comments_count}
            </span>
          )}
          {(task.attachments_count ?? 0) > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Paperclip className="w-3 h-3" />{task.attachments_count}
            </span>
          )}
          {(task.subtasks_count ?? 0) > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <GitBranch className="w-3 h-3" />{task.subtasks_completed ?? 0}/{task.subtasks_count}
            </span>
          )}
        </div>
        {task.assignee && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: getAvatarColor(task.assignee.id) }} title={task.assignee.full_name || ''}>
            {getInitials(task.assignee.full_name)}
          </div>
        )}
      </div>
    </div>
  );
}
