import { useState, useEffect, useRef } from 'react';
import { X, Calendar, Flag } from 'lucide-react';
import { useCreateTask } from '@/hooks/useTasks';
import { useProjects, useSections } from '@/hooks/useProjects';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { cn, getPriorityColor } from '@/lib/utils';
import { toast } from 'sonner';
import type { Task } from '@/types';

export function GlobalQuickAdd() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('none');
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentWorkspace, members } = useWorkspaceStore();
  const { user } = useAuth();
  const { data: projects = [] } = useProjects(currentWorkspace?.id);
  const { data: sections = [] } = useSections(projectId || undefined);
  const createTask = useCreateTask(projectId || undefined);

  // Listen for 'Q' key to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      if (e.key === 'q' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDueDate('');
      setPriority('none');
      if (projects.length > 0 && !projectId) setProjectId(projects[0].id);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, projects, projectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !currentWorkspace?.id) return;

    createTask.mutate(
      {
        title: title.trim(),
        project_id: projectId,
        section_id: sections[0]?.id || null,
        workspace_id: currentWorkspace.id,
        created_by: user?.id,
        due_date: dueDate || null,
        priority,
        position: 0,
      },
      {
        onSuccess: () => {
          toast.success('Task created');
          setOpen(false);
        },
      }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <input
              ref={inputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task name..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400 font-medium"
              onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
            />
            <button type="button" onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 outline-none"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="text-xs bg-transparent outline-none text-gray-700 dark:text-slate-300"
                />
              </div>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Task['priority'])}
                className={cn('text-xs px-2 py-1 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none', getPriorityColor(priority))}
              >
                <option value="none">No priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Quick date buttons */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 mr-1">Quick:</span>
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: 'Next week', days: 7 },
              ].map(({ label, days }) => {
                const d = new Date();
                d.setDate(d.getDate() + days);
                const val = d.toISOString().split('T')[0];
                return (
                  <button key={label} type="button" onClick={() => setDueDate(val)} className={cn('text-[10px] px-1.5 py-0.5 rounded border', dueDate === val ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:border-[#4B7C6F]')}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
            <div className="text-[10px] text-gray-400">
              Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[9px]">Q</kbd> to open · <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[9px]">Enter</kbd> to create
            </div>
            <button
              type="submit"
              disabled={!title.trim() || !projectId || createTask.isPending}
              className="px-3 py-1.5 text-sm text-white bg-[#16A34A] rounded-lg hover:bg-[#3d6b5e] disabled:opacity-50 font-medium"
            >
              {createTask.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
