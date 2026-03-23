import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useCreateTask } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import type { Task } from '@/types';

interface TaskFormProps {
  projectId: string;
  sectionId?: string;
  workspaceId: string;
  position: number;
  autoOpen?: number;
  defaultStatus?: Task['status'];
}

export function TaskForm({ projectId, sectionId, workspaceId, position, autoOpen, defaultStatus }: TaskFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask(projectId);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (autoOpen && autoOpen > 0) {
      setIsOpen(true);
    }
  }, [autoOpen]);

  const handleSubmit = () => {
    if (!title.trim()) {
      setIsOpen(false);
      return;
    }
    createTask.mutate({
      title: title.trim(),
      project_id: projectId,
      section_id: (!sectionId || sectionId === 'no-section') ? null : sectionId,
      workspace_id: workspaceId,
      position,
      created_by: user?.id,
      ...(defaultStatus ? { status: defaultStatus } : {}),
    });
    setTitle('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-[#4B7C6F] hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add task
      </button>
    );
  }

  return (
    <div className="px-3 py-2">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') { setTitle(''); setIsOpen(false); }
        }}
        onBlur={handleSubmit}
        placeholder="Task name"
        className="w-full text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
      />
    </div>
  );
}
