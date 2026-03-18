import { useMemo, useState, useRef } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspaceMilestones } from '@/hooks/useMilestones';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  format, differenceInDays, addDays, startOfMonth, endOfMonth,
  eachDayOfInterval, isToday, parseISO, isSameMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Diamond, FolderKanban } from 'lucide-react';
import type { Task, Project, ProjectMilestone } from '@/types';

type Zoom = 'days' | 'weeks' | 'months';

export default function GanttChart() {
  usePageTitle('Gantt Chart');
  const { currentWorkspace } = useWorkspaceStore();
  const { data: projects = [] } = useProjects(currentWorkspace?.id);
  const { data: milestones = [] } = useWorkspaceMilestones(currentWorkspace?.id);
  const [zoom, setZoom] = useState<Zoom>('weeks');
  const [monthOffset, setMonthOffset] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all tasks for all projects
  const projectIds = projects.map(p => p.id);
  const { data: allTasks = [] } = useQuery({
    queryKey: ['gantt-tasks', projectIds.join(',')],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assignee_id_fkey(*), project:projects(*)')
        .in('project_id', projectIds)
        .or('start_date.not.is.null,due_date.not.is.null')
        .order('position');
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    enabled: projectIds.length > 0,
  });

  const today = new Date();
  const baseMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const start = startOfMonth(baseMonth);
  const end = endOfMonth(addDays(baseMonth, 90));
  const days = eachDayOfInterval({ start, end });

  const dayWidth = zoom === 'days' ? 36 : zoom === 'weeks' ? 16 : 5;
  const totalWidth = days.length * dayWidth;
  const todayOffset = differenceInDays(today, start) * dayWidth;

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    projects.forEach(p => map.set(p.id, []));
    allTasks.forEach(t => {
      if (t.project_id && map.has(t.project_id)) {
        map.get(t.project_id)!.push(t);
      }
    });
    return map;
  }, [allTasks, projects]);

  const milestonesByProject = useMemo(() => {
    const map = new Map<string, ProjectMilestone[]>();
    milestones.forEach(m => {
      if (!map.has(m.project_id)) map.set(m.project_id, []);
      map.get(m.project_id)!.push(m);
    });
    return map;
  }, [milestones]);

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getBarStyle = (startDate: string | null, endDate: string | null) => {
    const s = startDate ? parseISO(startDate) : endDate ? parseISO(endDate) : today;
    const e = endDate ? parseISO(endDate) : addDays(s, 3);
    const left = Math.max(0, differenceInDays(s, start)) * dayWidth;
    const width = Math.max(1, differenceInDays(e, s) + 1) * dayWidth;
    return { left, width };
  };

  // Build rows
  type Row = { type: 'project'; project: Project } | { type: 'task'; task: Task; project: Project } | { type: 'milestone'; milestone: ProjectMilestone; project: Project };
  const rows: Row[] = [];

  projects.forEach(project => {
    const projectTasks = tasksByProject.get(project.id) || [];
    const projectMilestones = milestonesByProject.get(project.id) || [];
    if (projectTasks.length === 0 && projectMilestones.length === 0) return;

    rows.push({ type: 'project', project });
    if (expandedProjects.has(project.id)) {
      projectTasks.forEach(task => rows.push({ type: 'task', task, project }));
      projectMilestones.forEach(milestone => rows.push({ type: 'milestone', milestone, project }));
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Gantt Chart</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Cross-project timeline view</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMonthOffset(m => m - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-white min-w-[120px] text-center">
            {format(baseMonth, 'MMMM yyyy')}
          </span>
          <button onClick={() => setMonthOffset(m => m + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setMonthOffset(0)} className="text-sm text-[#4B7C6F] hover:underline ml-2">Today</button>
          <div className="flex gap-1 ml-4 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
            {(['days', 'weeks', 'months'] as Zoom[]).map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={cn('px-2.5 py-1 text-xs rounded-md transition-colors', zoom === z ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}
              >
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - project/task list */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-slate-800 overflow-y-auto bg-white dark:bg-slate-900">
          {rows.map((row, i) => {
            if (row.type === 'project') {
              return (
                <div
                  key={`p-${row.project.id}`}
                  onClick={() => toggleProject(row.project.id)}
                  className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 bg-gray-50/50 dark:bg-slate-800/20"
                >
                  <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: row.project.color }} />
                  <FolderKanban className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{row.project.name}</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{(tasksByProject.get(row.project.id) || []).length}</span>
                </div>
              );
            }
            if (row.type === 'task') {
              return (
                <div key={`t-${row.task.id}`} className="flex items-center gap-2 px-3 py-2 pl-8 border-b border-gray-50 dark:border-slate-800/50 text-sm">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', row.task.status === 'done' ? 'bg-green-400' : 'bg-gray-300 dark:bg-slate-600')} />
                  <span className="truncate text-gray-700 dark:text-slate-300">{row.task.title}</span>
                </div>
              );
            }
            return (
              <div key={`m-${row.milestone.id}`} className="flex items-center gap-2 px-3 py-2 pl-8 border-b border-gray-50 dark:border-slate-800/50 text-sm">
                <Diamond className="w-3 h-3 text-[#4B7C6F] flex-shrink-0" />
                <span className="truncate text-[#4B7C6F] font-medium">{row.milestone.title}</span>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400">No tasks with dates</p>
              <p className="text-xs text-gray-400 mt-1">Add start/due dates to tasks to see them here</p>
            </div>
          )}
        </div>

        {/* Right panel - timeline */}
        <div ref={containerRef} className="flex-1 overflow-auto relative">
          {/* Date headers */}
          <div className="sticky top-0 z-10 flex bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800" style={{ width: totalWidth }}>
            {days.map((day, i) => (
              <div
                key={i}
                className={cn(
                  'flex-shrink-0 text-center text-[10px] py-2 border-r border-gray-100 dark:border-slate-800/50',
                  isToday(day) && 'bg-[#4B7C6F]/10 font-semibold text-[#4B7C6F]',
                  !isSameMonth(day, baseMonth) && 'text-gray-300 dark:text-slate-600'
                )}
                style={{ width: dayWidth }}
              >
                {zoom === 'days' && format(day, 'd')}
                {zoom === 'weeks' && (day.getDay() === 1 || i === 0) && format(day, 'MMM d')}
                {zoom === 'months' && day.getDate() === 1 && format(day, 'MMM')}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="relative" style={{ width: totalWidth }}>
            {/* Today line */}
            {todayOffset > 0 && todayOffset < totalWidth && (
              <div className="absolute top-0 bottom-0 w-px bg-red-400/60 z-20" style={{ left: todayOffset + dayWidth / 2 }} />
            )}

            {rows.map((row, i) => {
              if (row.type === 'project') {
                // Project summary bar
                const projectTasks = tasksByProject.get(row.project.id) || [];
                const projectMs = milestonesByProject.get(row.project.id) || [];
                const allDates = [
                  ...projectTasks.flatMap(t => [t.start_date, t.due_date].filter(Boolean) as string[]),
                  ...projectMs.map(m => m.due_date).filter(Boolean) as string[],
                ];
                if (allDates.length === 0) return <div key={`pr-${row.project.id}`} style={{ height: 41 }} />;
                const earliest = allDates.reduce((a, b) => a < b ? a : b);
                const latest = allDates.reduce((a, b) => a > b ? a : b);
                const { left, width } = getBarStyle(earliest, latest);
                return (
                  <div key={`pr-${row.project.id}`} className="relative bg-gray-50/30 dark:bg-slate-800/10" style={{ height: 41 }}>
                    <div
                      className="absolute top-2.5 h-4 rounded-full opacity-30"
                      style={{ left, width: Math.max(width, dayWidth), backgroundColor: row.project.color }}
                    />
                  </div>
                );
              }
              if (row.type === 'task') {
                const { left, width } = getBarStyle(row.task.start_date, row.task.due_date);
                return (
                  <div key={`tr-${row.task.id}`} className="relative" style={{ height: 36 }}>
                    <div
                      className={cn('absolute top-1.5 h-5 rounded-full cursor-pointer hover:opacity-80 transition-opacity', row.task.status === 'done' ? 'bg-green-400' : '')}
                      style={{ left, width: Math.max(width, dayWidth), backgroundColor: row.task.status !== 'done' ? row.project.color : undefined }}
                      title={row.task.title}
                    >
                      {zoom !== 'months' && (
                        <span className="text-[9px] text-white font-medium px-1.5 truncate block leading-5">{row.task.title}</span>
                      )}
                    </div>
                  </div>
                );
              }
              // Milestone
              if (!row.milestone.due_date) return <div key={`mr-${row.milestone.id}`} style={{ height: 36 }} />;
              const msLeft = Math.max(0, differenceInDays(parseISO(row.milestone.due_date), start)) * dayWidth;
              return (
                <div key={`mr-${row.milestone.id}`} className="relative" style={{ height: 36 }}>
                  <div className="absolute top-2" style={{ left: msLeft }}>
                    <Diamond className={cn('w-4 h-4', row.milestone.status === 'completed' ? 'text-green-500 fill-green-500' : 'text-[#4B7C6F] fill-[#4B7C6F]')} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
