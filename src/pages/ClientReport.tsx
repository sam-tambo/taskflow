import { useMemo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspaceMilestones } from '@/hooks/useMilestones';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast } from 'date-fns';
import { CheckCircle2, Clock, AlertTriangle, Diamond, TrendingUp, FolderKanban } from 'lucide-react';
import type { Task, Project, ProjectMilestone } from '@/types';

export default function ClientReport() {
  usePageTitle('Client Report');
  const { currentWorkspace } = useWorkspaceStore();
  const { data: projects = [] } = useProjects(currentWorkspace?.id);
  const { data: milestones = [] } = useWorkspaceMilestones(currentWorkspace?.id);

  const projectIds = projects.map(p => p.id);
  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['client-report-tasks', projectIds.join(',')],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(*)')
        .in('project_id', projectIds);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    enabled: projectIds.length > 0,
  });

  const stats = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'done').length;
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
    const overdue = allTasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'done').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, overdue, completionRate };
  }, [allTasks]);

  const projectStats = useMemo(() => {
    return projects.map(project => {
      const tasks = allTasks.filter(t => t.project_id === project.id);
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'done').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const projectMilestones = milestones.filter(m => m.project_id === project.id);
      const completedMilestones = projectMilestones.filter(m => m.status === 'completed').length;
      return { project, total, completed, percentage, milestones: projectMilestones, completedMilestones };
    }).filter(ps => ps.total > 0);
  }, [projects, allTasks, milestones]);

  const upcomingMilestones = useMemo(() => {
    return milestones
      .filter(m => m.status !== 'completed' && m.due_date)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
      .slice(0, 8);
  }, [milestones]);

  const recentlyCompleted = useMemo(() => {
    return allTasks
      .filter(t => t.status === 'done' && t.completed_at)
      .sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1))
      .slice(0, 10);
  }, [allTasks]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Report</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Project status overview for {currentWorkspace?.name} · {format(new Date(), 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-[#4B7C6F]" />}
          label="Completion"
          value={`${stats.completionRate}%`}
          sublabel={`${stats.completed} of ${stats.total} tasks`}
          color="bg-[#4B7C6F]/10"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
          label="Completed"
          value={String(stats.completed)}
          sublabel="tasks done"
          color="bg-green-50 dark:bg-green-900/10"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          label="In Progress"
          value={String(stats.inProgress)}
          sublabel="tasks active"
          color="bg-blue-50 dark:bg-blue-900/10"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          label="Overdue"
          value={String(stats.overdue)}
          sublabel="tasks past due"
          color="bg-red-50 dark:bg-red-900/10"
        />
      </div>

      {/* Project progress */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Progress</h2>
        <div className="space-y-3">
          {projectStats.map(({ project, total, completed, percentage, milestones: ms, completedMilestones }) => (
            <div key={project.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: project.color }} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</span>
                <span className="text-xs text-gray-400 ml-auto">{completed}/{total} tasks</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-[#4B7C6F] rounded-full transition-all" style={{ width: `${percentage}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{percentage}% complete</span>
                {ms.length > 0 && (
                  <span className="text-xs text-gray-400">
                    <Diamond className="w-3 h-3 inline mr-1" />
                    {completedMilestones}/{ms.length} milestones
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming milestones */}
      {upcomingMilestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Milestones</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            {upcomingMilestones.map((ms, i) => (
              <div
                key={ms.id}
                className={cn('flex items-center gap-3 px-4 py-3', i < upcomingMilestones.length - 1 && 'border-b border-gray-50 dark:border-slate-800')}
              >
                <Diamond className={cn(
                  'w-4 h-4 flex-shrink-0',
                  ms.due_date && isPast(parseISO(ms.due_date)) ? 'text-red-500' : 'text-[#4B7C6F]'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ms.title}</p>
                  <p className="text-xs text-gray-400">{ms.project?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    'text-xs font-medium',
                    ms.due_date && isPast(parseISO(ms.due_date)) ? 'text-red-500' : 'text-gray-500'
                  )}>
                    {ms.due_date ? format(parseISO(ms.due_date), 'MMM d, yyyy') : 'No date'}
                  </p>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    ms.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                  )}>
                    {ms.status === 'in_progress' ? 'In Progress' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently completed */}
      {recentlyCompleted.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recently Completed</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            {recentlyCompleted.map((task, i) => (
              <div
                key={task.id}
                className={cn('flex items-center gap-3 px-4 py-2.5', i < recentlyCompleted.length - 1 && 'border-b border-gray-50 dark:border-slate-800')}
              >
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-slate-300 truncate">{task.title}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {task.completed_at ? format(parseISO(task.completed_at), 'MMM d') : ''}
                </span>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.project?.color || '#ccc' }} title={task.project?.name} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-xs text-gray-400 dark:text-slate-500">
        Generated by Revenue Precision · {format(new Date(), 'MMMM d, yyyy h:mm a')}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sublabel, color }: { icon: React.ReactNode; label: string; value: string; sublabel: string; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', color)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">{sublabel}</p>
    </div>
  );
}
