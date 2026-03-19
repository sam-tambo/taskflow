import { useState, useRef } from 'react';
import { Check, GripVertical, Calendar, Flag, User, MessageSquare, Paperclip, ListChecks, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn, formatDueDate, getDueDateColor, getPriorityColor, getInitials, getAvatarColor } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { useUpdateTask } from '@/hooks/useTasks';
import type { Task } from '@/types';

interface TaskRowProps {
  task: Task;
  projectId?: string;
  listeners?: any;
  attributes?: any;
  isDragging?: boolean;
  showProject?: boolean;
  selectable?: boolean;
}

export function TaskRow({ task, projectId, listeners, attributes, isDragging, showProject, selectable }: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openTaskDetail } = useUIStore();
  const { selectedTaskIds, toggle: toggleSelection } = useSelectionStore();
  const isSelected = selectedTaskIds.has(task.id);
  const updateTask = useUpdateTask(projectId);

  // Check if task has unresolved dependencies (blocked)
  const { data: depCount = 0 } = useQuery({
    queryKey: ['task-blocked', task.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('task_dependencies')
        .select('id, depends_on:tasks!depends_on_id(status)', { count: 'exact', head: false })
        .eq('task_id', task.id);
      if (error) return 0;
      // Count dependencies where depends_on task is not done
      const blockedDeps = (count || 0);
      return blockedDeps;
    },
    enabled: task.status !== 'done',
    staleTime: 30000,
  });

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
        task.status === 'done' && 'task-complete-flash',
        isSelected && 'bg-[#4B7C6F]/5 dark:bg-[#4B7C6F]/10'
      )}
      onClick={() => openTaskDetail(task.id)}
    >
      {/* Selection checkbox */}
      {selectable && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => { e.stopPropagation(); toggleSelection(task.id); }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-[#4B7C6F] focus:ring-[#4B7C6F] opacity-0 group-hover:opacity-100 checked:opacity-100"
        />
      )}

      {/* Drag handle */}
      <div {...listeners} {...attributes} className="opacity-0 group-hover:opacity-100 cursor-grab">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Checkbox */}
      <button
        onClick={handleComplete}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
          task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 hover:border-[#4B7C6F]'
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

      {/* Metadata badges */}
      {task.description && (
        <span className="text-[10px] text-gray-400 flex-shrink-0" title={task.description.replace(/<[^>]*>/g, '').slice(0, 200)}>
          <MessageSquare className="w-3 h-3 inline" />
        </span>
      )}
      {(task.subtasks_count ?? 0) > 0 && (
        <span className="text-[10px] text-gray-400 flex-shrink-0 flex items-center gap-0.5" title={`${task.subtasks_completed ?? 0}/${task.subtasks_count} subtasks`}>
          <ListChecks className="w-3 h-3" />
          {task.subtasks_completed ?? 0}/{task.subtasks_count}
        </span>
      )}
      {(task.attachments_count ?? 0) > 0 && (
        <span className="text-[10px] text-gray-400 flex-shrink-0 flex items-center gap-0.5">
          <Paperclip className="w-3 h-3" />
          {task.attachments_count}
        </span>
      )}

      {/* Blocked indicator */}
      {depCount > 0 && task.status !== 'done' && (
        <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 rounded" title="Has dependencies">
          <AlertTriangle className="w-3 h-3" />
        </span>
      )}

      {/* Project badge */}
      {showProject && task.project && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 flex-shrink-0 truncate max-w-[120px]" title={task.project.name}>
          {task.project.name}
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
