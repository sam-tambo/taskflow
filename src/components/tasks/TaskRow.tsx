import { useState, useRef } from 'react';
import { Check, GripVertical, Calendar, User, MessageSquare, Paperclip, ListChecks, AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn, formatDueDate, getDueDateColor, getPriorityColor, getInitials, getAvatarColor } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { useUpdateTask, useSubtasks, useCreateTask } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import type { Task } from '@/types';

interface TaskRowProps {
  task: Task;
  projectId?: string;
  listeners?: any;
  attributes?: any;
  isDragging?: boolean;
  showProject?: boolean;
  selectable?: boolean;
  depth?: number; // indentation level for subtasks
}

export function TaskRow({ task, projectId, listeners, attributes, isDragging, showProject, selectable, depth = 0 }: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { openTaskDetail } = useUIStore();
  const { selectedTaskIds, toggle: toggleSelection } = useSelectionStore();
  const isSelected = selectedTaskIds.has(task.id);
  const updateTask = useUpdateTask(projectId);
  const { data: subtasks = [] } = useSubtasks(expanded || addingSubtask ? task.id : undefined);
  const createTask = useCreateTask(projectId);
  const { user } = useAuth();

  const hasSubtasks = (task.subtasks_count ?? 0) > 0;

  // Check if task has unresolved dependencies (blocked)
  const { data: depCount = 0 } = useQuery({
    queryKey: ['task-blocked', task.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('task_dependencies')
        .select('id, depends_on:tasks!depends_on_id(status)', { count: 'exact', head: false })
        .eq('task_id', task.id);
      if (error) return 0;
      return count || 0;
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

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) { setAddingSubtask(false); return; }
    createTask.mutate({
      title: newSubtaskTitle.trim(),
      parent_task_id: task.id,
      project_id: task.project_id,
      workspace_id: task.workspace_id,
      section_id: task.section_id,
      position: subtasks.length,
      created_by: user?.id,
    });
    setNewSubtaskTitle('');
    setExpanded(true);
  };

  const indentPx = depth * 28;

  return (
    <div className="relative">
      {/* Vertical line for indented subtasks */}
      {depth > 0 && (
        <div
          className="absolute top-0 bottom-0 border-l-2 border-gray-200 dark:border-slate-700"
          style={{ left: indentPx - 14 }}
        />
      )}

      <div
        className={cn(
          'group flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors',
          isDragging && 'opacity-50 bg-gray-100 dark:bg-slate-800',
          task.status === 'done' && 'task-complete-flash',
          isSelected && 'bg-[#4B7C6F]/5 dark:bg-[#4B7C6F]/10'
        )}
        style={{ paddingLeft: `${12 + indentPx}px` }}
        onClick={() => openTaskDetail(task.id)}
      >
        {/* Selection checkbox */}
        {selectable && depth === 0 && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); toggleSelection(task.id); }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-[#4B7C6F] focus:ring-[#4B7C6F] opacity-0 group-hover:opacity-100 checked:opacity-100"
          />
        )}

        {/* Drag handle (only top-level) */}
        {depth === 0 && (
          <div {...listeners} {...attributes} className="opacity-0 group-hover:opacity-100 cursor-grab">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {/* Expand/collapse arrow for tasks with subtasks */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={cn(
            'w-4 h-4 flex items-center justify-center flex-shrink-0 transition-transform',
            hasSubtasks || addingSubtask ? 'text-gray-400 hover:text-gray-600' : 'invisible'
          )}
        >
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>

        {/* Complete circle */}
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
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            <MessageSquare className="w-3 h-3 inline" />
          </span>
        )}
        {(task.subtasks_count ?? 0) > 0 && !expanded && (
          <span className="text-[10px] text-gray-500 dark:text-slate-400 flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded">
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
          <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <AlertTriangle className="w-3 h-3" />
          </span>
        )}

        {/* Project badge */}
        {showProject && task.project && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 flex-shrink-0 truncate max-w-[120px]">
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

        {/* Add subtask button (appears on hover) */}
        {depth === 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); setAddingSubtask(true); }}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-[#4B7C6F] flex-shrink-0 px-1"
            title="Add subtask"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Inline subtasks when expanded */}
      {(expanded || addingSubtask) && (
        <div>
          {subtasks.map((subtask) => (
            <TaskRow
              key={subtask.id}
              task={subtask}
              projectId={projectId}
              showProject={false}
              depth={depth + 1}
            />
          ))}

          {/* Add subtask inline input */}
          {addingSubtask ? (
            <div
              className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30"
              style={{ paddingLeft: `${12 + (depth + 1) * 28}px` }}
            >
              <div className="w-4 flex-shrink-0" />
              <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 dark:border-slate-600 flex-shrink-0" />
              <input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { handleAddSubtask(); }
                  if (e.key === 'Escape') { setNewSubtaskTitle(''); setAddingSubtask(false); }
                }}
                onBlur={() => { if (newSubtaskTitle.trim()) handleAddSubtask(); else setAddingSubtask(false); }}
                placeholder="Write a subtask name…"
                className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setAddingSubtask(true); }}
              className="flex items-center gap-2 py-1.5 text-xs text-gray-400 hover:text-[#4B7C6F] border-b border-gray-100 dark:border-slate-800 w-full"
              style={{ paddingLeft: `${12 + (depth + 1) * 28}px` }}
            >
              <Plus className="w-3 h-3" /> Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  );
}
