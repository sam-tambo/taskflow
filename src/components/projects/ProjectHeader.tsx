import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { QuickAddTaskModal } from '@/components/tasks/QuickAddTaskModal';
import { List, Columns3, GanttChart, CalendarDays, Filter, ArrowUpDown, Plus, Share2, Download } from 'lucide-react';
import type { Project } from '@/types';

interface ProjectHeaderProps {
  project: Project;
  currentView: string;
  onViewChange: (view: 'list' | 'board' | 'timeline' | 'calendar') => void;
}

const views = [
  { id: 'list' as const, label: 'List', icon: List },
  { id: 'board' as const, label: 'Board', icon: Columns3 },
  { id: 'timeline' as const, label: 'Timeline', icon: GanttChart },
  { id: 'calendar' as const, label: 'Calendar', icon: CalendarDays },
];

export function ProjectHeader({ project, currentView, onViewChange }: ProjectHeaderProps) {
  const { data: tasks = [] } = useTasks(project.id);
  const [showExport, setShowExport] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: project.color }}>
          <span className="text-white text-sm font-bold">{project.name[0]}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h1>
          {project.description && <p className="text-xs text-gray-500 dark:text-slate-400">{project.description}</p>}
        </div>
        {project.owner && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: getAvatarColor(project.owner.id) }} title={project.owner.full_name || ''}>
            {getInitials(project.owner.full_name)}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
          </div>
          <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">{percentage}% ({completed}/{total})</span>
        </div>
      )}

      {/* View tabs and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                currentView === id ? 'bg-coral/10 text-coral font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-coral hover:bg-coral/90 rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
            <ArrowUpDown className="w-4 h-4" /> Sort
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-20">
                <button
                  onClick={async () => { const { exportTasksAsCsv } = await import('@/lib/exportCsv'); exportTasksAsCsv(tasks, project.name); setShowExport(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Export as CSV
                </button>
                <button
                  onClick={async () => { const { exportProjectAsPdf } = await import('@/lib/exportPdf'); exportProjectAsPdf(project, tasks); setShowExport(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <QuickAddTaskModal open={showQuickAdd} onClose={() => setShowQuickAdd(false)} projectId={project.id} />
    </div>
  );
}
