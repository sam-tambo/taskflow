import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useProjects } from '@/hooks/useProjects';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { BarChart3, FolderKanban, TrendingUp, AlertTriangle, XCircle, CheckCircle2, LayoutGrid, List } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import type { Project } from '@/types';
import { Link } from 'react-router-dom';

type HealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'complete';

const HEALTH_CONFIG: Record<HealthStatus, { label: string; color: string; bg: string; icon: typeof TrendingUp }> = {
  on_track: { label: 'On Track', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', icon: TrendingUp },
  at_risk: { label: 'At Risk', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30', icon: AlertTriangle },
  off_track: { label: 'Off Track', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', icon: XCircle },
  complete: { label: 'Complete', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', icon: CheckCircle2 },
};

interface ProjectStats {
  total: number;
  done: number;
  overdue: number;
  progress: number;
  health: HealthStatus;
}

export default function Portfolios() {
  usePageTitle('Portfolios');
  const { currentWorkspace } = useWorkspaceStore();
  const { data: projects = [] } = useProjects(currentWorkspace?.id);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Fetch task counts per project
  const { data: projectTaskCounts = {} } = useQuery({
    queryKey: ['portfolio-task-counts', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return {};
      const { data, error } = await supabase
        .from('tasks')
        .select('project_id, status, due_date')
        .eq('workspace_id', currentWorkspace.id)
        .is('parent_task_id', null);
      if (error) throw error;

      const counts: Record<string, ProjectStats> = {};
      (data || []).forEach(t => {
        if (!t.project_id) return;
        if (!counts[t.project_id]) counts[t.project_id] = { total: 0, done: 0, overdue: 0, progress: 0, health: 'on_track' };
        const c = counts[t.project_id];
        c.total++;
        if (t.status === 'done') c.done++;
        if (t.due_date && t.status !== 'done' && isPast(parseISO(t.due_date))) c.overdue++;
      });

      // Calculate health
      Object.values(counts).forEach(c => {
        c.progress = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
        if (c.progress >= 100) c.health = 'complete';
        else if (c.overdue > c.total * 0.3) c.health = 'off_track';
        else if (c.overdue > 0) c.health = 'at_risk';
        else c.health = 'on_track';
      });

      return counts;
    },
    enabled: !!currentWorkspace?.id,
  });

  const getStats = (projectId: string): ProjectStats =>
    projectTaskCounts[projectId] || { total: 0, done: 0, overdue: 0, progress: 0, health: 'on_track' };

  const statuses = [
    { id: 'all', label: 'All', icon: BarChart3, color: 'text-gray-500' },
    { id: 'on_track', label: 'On Track', icon: TrendingUp, color: 'text-green-500' },
    { id: 'at_risk', label: 'At Risk', icon: AlertTriangle, color: 'text-yellow-500' },
    { id: 'off_track', label: 'Off Track', icon: XCircle, color: 'text-red-500' },
    { id: 'complete', label: 'Complete', icon: CheckCircle2, color: 'text-blue-500' },
  ];

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return projects;
    return projects.filter(p => getStats(p.id).health === statusFilter);
  }, [projects, statusFilter, projectTaskCounts]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length, on_track: 0, at_risk: 0, off_track: 0, complete: 0 };
    projects.forEach(p => { counts[getStats(p.id).health]++; });
    return counts;
  }, [projects, projectTaskCounts]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolios</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} across your workspace</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded', viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-gray-500')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('table')} className={cn('p-1.5 rounded', viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-gray-500')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statuses.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setStatusFilter(id)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors', statusFilter === id ? 'bg-[#4B7C6F]/10 text-[#4B7C6F] font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800')}
          >
            <Icon className={cn('w-4 h-4', statusFilter === id ? 'text-[#4B7C6F]' : color)} />
            {label}
            {statusCounts[id] > 0 && <span className="text-[10px] px-1 py-0.5 rounded-full bg-gray-200 dark:bg-slate-700">{statusCounts[id]}</span>}
          </button>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-16">
          <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-slate-700" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No projects yet</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Create projects to track them in your portfolio.</p>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const stats = getStats(project.id);
            const health = HEALTH_CONFIG[stats.health];
            const HealthIcon = health.icon;
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: project.color }}>
                    {project.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
                    {project.owner && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium" style={{ backgroundColor: getAvatarColor(project.owner.id) }}>
                          {getInitials(project.owner.full_name)}
                        </div>
                        <span className="text-xs text-gray-500 truncate">{project.owner.full_name}</span>
                      </div>
                    )}
                  </div>
                  <span className={cn('flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full', health.bg, health.color)}>
                    <HealthIcon className="w-3 h-3" />
                    {health.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{stats.done}/{stats.total} tasks</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{stats.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full">
                    <div
                      className={cn('h-full rounded-full transition-all', stats.health === 'off_track' ? 'bg-red-500' : stats.health === 'at_risk' ? 'bg-yellow-500' : stats.health === 'complete' ? 'bg-blue-500' : 'bg-green-500')}
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  {stats.overdue > 0 && <span className="text-red-500">{stats.overdue} overdue</span>}
                  {project.due_date && <span>Due {format(parseISO(project.due_date), 'MMM d')}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && filteredProjects.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Project</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Owner</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Health</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Progress</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Tasks</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const stats = getStats(project.id);
                const health = HEALTH_CONFIG[stats.health];
                const HealthIcon = health.icon;
                return (
                  <tr key={project.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link to={`/projects/${project.id}`} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: project.color }}>
                          {project.name[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white hover:text-[#4B7C6F]">{project.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {project.owner && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: getAvatarColor(project.owner.id) }}>
                            {getInitials(project.owner.full_name)}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-slate-300">{project.owner.full_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', health.bg, health.color)}>
                        <HealthIcon className="w-3 h-3" /> {health.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full">
                          <div className={cn('h-full rounded-full', stats.health === 'off_track' ? 'bg-red-500' : 'bg-green-500')} style={{ width: `${stats.progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{stats.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {stats.done}/{stats.total}
                      {stats.overdue > 0 && <span className="text-red-500 ml-1">({stats.overdue} overdue)</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{project.due_date ? format(parseISO(project.due_date), 'MMM d, yyyy') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
