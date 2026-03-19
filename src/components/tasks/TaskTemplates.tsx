import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { cn, getPriorityColor } from '@/lib/utils';
import { BookTemplate, Plus, Trash2, X, Flag, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/types';

interface TaskTemplate {
  id: string;
  workspace_id: string;
  name: string;
  title: string;
  description: string | null;
  priority: string;
  estimated_hours: number | null;
  tags: string[];
  created_by: string;
  created_at: string;
}

interface TaskTemplatesProps {
  projectId: string;
  workspaceId: string;
  sectionId?: string;
  onCreateFromTemplate: (template: TaskTemplate) => void;
}

export function TaskTemplates({ projectId, workspaceId, sectionId, onCreateFromTemplate }: TaskTemplatesProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['task-templates', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');
      if (error) throw error;
      return data as TaskTemplate[];
    },
    enabled: !!currentWorkspace && isOpen,
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success('Template deleted');
    },
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-xs text-[#4B7C6F] hover:underline"
      >
        <BookTemplate className="w-3 h-3" /> Templates
      </button>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700 dark:text-slate-300 flex items-center gap-1">
          <BookTemplate className="w-3.5 h-3.5" /> Task Templates
        </span>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {templates.length === 0 && (
        <p className="text-xs text-gray-400 py-2">No templates yet. Save a task as template from the task detail panel.</p>
      )}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {templates.map(template => (
          <div key={template.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer">
            <button
              onClick={() => { onCreateFromTemplate(template); setIsOpen(false); }}
              className="flex-1 text-left"
            >
              <span className="text-sm text-gray-900 dark:text-white">{template.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                {template.priority !== 'none' && (
                  <span className={cn('text-[10px]', getPriorityColor(template.priority))}>{template.priority}</span>
                )}
                {template.estimated_hours && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{template.estimated_hours}h</span>
                )}
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteTemplate.mutate(template.id); }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Save task as template button for task detail panel
export function SaveAsTemplateButton({ task }: { task: Task }) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [showNameInput, setShowNameInput] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const saveTemplate = useMutation({
    mutationFn: async (name: string) => {
      if (!currentWorkspace || !user) throw new Error('Not logged in');
      const { error } = await supabase.from('task_templates').insert({
        workspace_id: currentWorkspace.id,
        name,
        title: task.title,
        description: task.description,
        priority: task.priority,
        estimated_hours: task.estimated_hours,
        tags: task.tags || [],
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success('Task saved as template');
      setShowNameInput(false);
      setTemplateName('');
    },
    onError: () => toast.error('Failed to save template'),
  });

  if (showNameInput) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Template name"
          className="text-xs px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded outline-none text-gray-900 dark:text-white w-32"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && templateName.trim()) saveTemplate.mutate(templateName.trim());
            if (e.key === 'Escape') { setShowNameInput(false); setTemplateName(''); }
          }}
        />
        <button
          onClick={() => templateName.trim() && saveTemplate.mutate(templateName.trim())}
          className="text-xs text-[#4B7C6F] hover:underline"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowNameInput(true)}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
    >
      <BookTemplate className="w-4 h-4" /> Save as template
    </button>
  );
}
