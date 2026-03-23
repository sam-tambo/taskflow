import { useState } from 'react';
import { X, Trash2, CheckCircle, Flag, User, FolderOpen, ChevronDown, Calendar, Layers } from 'lucide-react';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useSections } from '@/hooks/useProjects';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { Task } from '@/types';

interface BulkActionBarProps {
  projectId: string;
}

export function BulkActionBar({ projectId }: BulkActionBarProps) {
  const { selectedTaskIds, deselectAll } = useSelectionStore();
  const { members } = useWorkspaceStore();
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const { data: sections = [] } = useSections(projectId);
  const [showAssignee, setShowAssignee] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showSection, setShowSection] = useState(false);
  const [showDueDate, setShowDueDate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const closeAll = () => { setShowAssignee(false); setShowPriority(false); setShowStatus(false); setShowSection(false); setShowDueDate(false); };

  const count = selectedTaskIds.size;
  if (count === 0) return null;

  const ids = Array.from(selectedTaskIds);

  const bulkUpdate = (updates: Partial<Task>) => {
    ids.forEach(id => updateTask.mutate({ id, ...updates }));
    toast.success(`Updated ${count} tasks`);
    deselectAll();
  };

  const bulkDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    ids.forEach(id => deleteTask.mutate(id));
    deselectAll();
    setShowDeleteConfirm(false);
  };

  return (
    <>
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-slate-700 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="w-px h-5 bg-gray-700 dark:bg-slate-600" />

      {/* Status */}
      <div className="relative">
        <button onClick={() => { closeAll(); setShowStatus(!showStatus); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm hover:bg-gray-800 dark:hover:bg-slate-600 rounded-lg">
          <CheckCircle className="w-4 h-4" /> Status <ChevronDown className="w-3 h-3" />
        </button>
        {showStatus && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 w-40">
            {(['todo', 'in_progress', 'done', 'cancelled'] as const).map(s => (
              <button key={s} onClick={() => { bulkUpdate({ status: s, completed_at: s === 'done' ? new Date().toISOString() : null }); setShowStatus(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700">
                {s === 'todo' ? 'To Do' : s === 'in_progress' ? 'In Progress' : s === 'done' ? 'Done' : 'Cancelled'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="relative">
        <button onClick={() => { closeAll(); setShowPriority(!showPriority); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm hover:bg-gray-800 dark:hover:bg-slate-600 rounded-lg">
          <Flag className="w-4 h-4" /> Priority <ChevronDown className="w-3 h-3" />
        </button>
        {showPriority && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 w-36">
            {(['urgent', 'high', 'medium', 'low', 'none'] as const).map(p => (
              <button key={p} onClick={() => { bulkUpdate({ priority: p }); setShowPriority(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 capitalize">
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assignee */}
      <div className="relative">
        <button onClick={() => { closeAll(); setShowAssignee(!showAssignee); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm hover:bg-gray-800 dark:hover:bg-slate-600 rounded-lg">
          <User className="w-4 h-4" /> Assign <ChevronDown className="w-3 h-3" />
        </button>
        {showAssignee && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 w-52 max-h-48 overflow-y-auto">
            <button onClick={() => { bulkUpdate({ assignee_id: null }); setShowAssignee(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-500">
              Unassigned
            </button>
            {members.map(m => (
              <button key={m.user_id} onClick={() => { bulkUpdate({ assignee_id: m.user_id }); setShowAssignee(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium" style={{ backgroundColor: getAvatarColor(m.user_id) }}>
                  {getInitials(m.profiles?.full_name || null)}
                </div>
                {m.profiles?.full_name || m.profiles?.email}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section */}
      {sections.length > 0 && (
        <div className="relative">
          <button onClick={() => { closeAll(); setShowSection(!showSection); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm hover:bg-gray-800 dark:hover:bg-slate-600 rounded-lg">
            <Layers className="w-4 h-4" /> Section <ChevronDown className="w-3 h-3" />
          </button>
          {showSection && (
            <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 w-44 max-h-48 overflow-y-auto">
              {sections.map(s => (
                <button key={s.id} onClick={() => { bulkUpdate({ section_id: s.id }); setShowSection(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700">
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Due Date */}
      <div className="relative">
        <button onClick={() => { closeAll(); setShowDueDate(!showDueDate); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm hover:bg-gray-800 dark:hover:bg-slate-600 rounded-lg">
          <Calendar className="w-4 h-4" /> Due
        </button>
        {showDueDate && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-3 w-48">
            <input type="date" onChange={(e) => { if (e.target.value) { bulkUpdate({ due_date: e.target.value }); setShowDueDate(false); } }} className="w-full text-sm bg-transparent outline-none text-gray-900 dark:text-white" autoFocus />
            <button onClick={() => { bulkUpdate({ due_date: null }); setShowDueDate(false); }} className="w-full text-left text-xs text-gray-500 hover:text-red-500 mt-2">
              Clear due date
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-gray-700 dark:bg-slate-600" />

      {/* Delete */}
      <button onClick={bulkDelete} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-red-400 hover:bg-red-900/30 rounded-lg">
        <Trash2 className="w-4 h-4" /> Delete
      </button>

      {/* Close */}
      <button onClick={deselectAll} className="p-1.5 hover:bg-gray-800 dark:hover:bg-slate-600 rounded-lg ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>

    {showDeleteConfirm && (
      <ConfirmModal
        message={`Delete ${count} task${count > 1 ? 's' : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    )}
    </>
  );
}
