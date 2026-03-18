import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { useSubtasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import type { Task } from '@/types';

interface SubtaskListProps {
  parentTask: Task;
}

export function SubtaskList({ parentTask }: SubtaskListProps) {
  const { data: subtasks = [] } = useSubtasks(parentTask.id);
  const createTask = useCreateTask(parentTask.project_id || undefined);
  const updateTask = useUpdateTask(parentTask.project_id || undefined);
  const deleteTask = useDeleteTask(parentTask.project_id || undefined);
  const { user } = useAuth();
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!newTitle.trim()) { setIsAdding(false); return; }
    createTask.mutate({
      title: newTitle.trim(),
      parent_task_id: parentTask.id,
      project_id: parentTask.project_id,
      workspace_id: parentTask.workspace_id,
      section_id: parentTask.section_id,
      position: subtasks.length,
      created_by: user?.id,
    });
    setNewTitle('');
  };

  const toggleComplete = (subtask: Task) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({ id: subtask.id, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null });
  };

  const completed = subtasks.filter(s => s.status === 'done').length;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
          Subtasks {subtasks.length > 0 && `(${completed}/${subtasks.length})`}
        </span>
        {subtasks.length > 0 && (
          <div className="w-24 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completed / subtasks.length) * 100}%` }} />
          </div>
        )}
      </div>

      {subtasks.map((subtask) => (
        <div key={subtask.id} className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50">
          <button onClick={() => toggleComplete(subtask)} className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0', subtask.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600')}>
            {subtask.status === 'done' && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
          <span className={cn('text-sm flex-1', subtask.status === 'done' && 'line-through text-gray-400')}>{subtask.title}</span>
          {subtask.assignee && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium" style={{ backgroundColor: getAvatarColor(subtask.assignee.id) }}>
              {getInitials(subtask.assignee.full_name)}
            </div>
          )}
          <button onClick={() => deleteTask.mutate(subtask.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-slate-600 flex-shrink-0" />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setNewTitle(''); setIsAdding(false); } }}
            onBlur={handleAdd}
            placeholder="Subtask name"
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white"
            autoFocus
          />
        </div>
      ) : (
        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-[#4B7C6F]">
          <Plus className="w-3.5 h-3.5" /> Add subtask
        </button>
      )}
    </div>
  );
}
