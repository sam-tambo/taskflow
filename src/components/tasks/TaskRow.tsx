import { useState, useRef } from 'react';
import { Check, GripVertical, Calendar, Flag, User } from 'lucide-react';
import { cn, formatDueDate, getDueDateColor, getPriorityColor, getInitials, getAvatarColor } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useUpdateTask } from '@/hooks/useTasks';
import type { Task } from '@/types';

interface TaskRowProps {
  task: Task;
  projectId?: string;
  listeners?: any;
  attributes?: any;
  isDragging?: boolean;
}

export function TaskRow({ task, projectId, listeners, attributes, isDragging }: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openTaskDetail } = useUIStore();
  const updateTask = useUpdateTask(projectId);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({
      id: task.id,
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    });
  };

  const handleTitleSave = () => {
    if (title.trim() && title !== task.title) {
      updateTask.mutate({ id: task.id, title: title.trim() });
    } else {
      setTitle(task.title);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors',
        isDragging && 'opacity-50 bg-gray-100 dark:bg-slate-800',
        task.status === 'done' && 'task-complete-flash'
      )}
      onClick={() => openTaskDetail(task.id)}
    >
      {/* Drag handle */}
      <div {...listeners} {...attributes} className="opacity-0 group-hover:opacity-100 cursor-grab">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Checkbox */}
      <button
        onClick={handleComplete}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
          task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 hover:border-coral'
        )}
      >
        {task.status === 'done' && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setTitle(task.title); setIsEditing(false); } }}
          className="flex-1 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white"
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <span
          className={cn('flex-1 text-sm truncate', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white')}
          onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        >
          {task.title}
        </span>
      )}

      {/* Assignee */}
      {task.assignee ? (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(task.assignee.id) }} title={task.assignee.full_name || ''}>
          {getInitials(task.assignee.full_name)}
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <User className="w-3 h-3 text-gray-400" />
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <span className={cn('text-xs flex items-center gap-1 flex-shrink-0', getDueDateColor(task.due_date))}>
          <Calendar className="w-3 h-3" />
          {formatDueDate(task.due_date)}
        </span>
      )}

      {/* Priority */}
      {task.priority !== 'none' && (
        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0', getPriorityColor(task.priority))}>
          {task.priority}
        </span>
      )}
    </div>
  );
}
