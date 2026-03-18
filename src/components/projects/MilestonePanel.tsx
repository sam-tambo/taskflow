import { useState } from 'react';
import { useProjectMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useMilestones';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast } from 'date-fns';
import { Diamond, Plus, Check, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { ProjectMilestone } from '@/types';

interface MilestonePanelProps {
  projectId: string;
}

export function MilestonePanel({ projectId }: MilestonePanelProps) {
  const { data: milestones = [] } = useProjectMilestones(projectId);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMilestone.mutate({
      project_id: projectId,
      title: newTitle.trim(),
      due_date: newDate || null,
      status: 'pending',
      position: milestones.length,
    });
    setNewTitle('');
    setNewDate('');
    setAdding(false);
  };

  const toggleStatus = (ms: ProjectMilestone) => {
    const nextStatus = ms.status === 'completed' ? 'pending' : 'completed';
    updateMilestone.mutate({
      id: ms.id,
      status: nextStatus,
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const completed = milestones.filter(m => m.status === 'completed').length;

  return (
    <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-800/30 hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <Diamond className="w-4 h-4 text-[#4B7C6F]" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">Milestones</span>
        {milestones.length > 0 && (
          <span className="text-xs text-gray-400 ml-auto">{completed}/{milestones.length}</span>
        )}
      </button>

      {expanded && (
        <div className="divide-y divide-gray-50 dark:divide-slate-800">
          {milestones.map(ms => (
            <div key={ms.id} className="flex items-center gap-3 px-4 py-2.5 group">
              <button
                onClick={() => toggleStatus(ms)}
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  ms.status === 'completed'
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 dark:border-slate-600 hover:border-[#4B7C6F]'
                )}
              >
                {ms.status === 'completed' && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', ms.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white')}>
                  {ms.title}
                </p>
                {ms.due_date && (
                  <p className={cn('text-[11px]', ms.due_date && isPast(parseISO(ms.due_date)) && ms.status !== 'completed' ? 'text-red-500' : 'text-gray-400')}>
                    {format(parseISO(ms.due_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              <button
                onClick={() => deleteMilestone.mutate({ id: ms.id, projectId })}
                className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="px-4 py-3 space-y-2">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false); }}
                placeholder="Milestone name"
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4B7C6F]/30"
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="flex-1 text-sm px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none"
                />
                <button onClick={handleCreate} className="px-3 py-1.5 bg-[#16A34A] text-white rounded-lg text-sm hover:bg-[#15803d]">Add</button>
                <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-[#4B7C6F] hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add milestone
            </button>
          )}
        </div>
      )}
    </div>
  );
}
