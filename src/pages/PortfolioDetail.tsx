import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useProjects } from '@/hooks/useProjects';
import {
  usePortfolio,
  usePortfolioProjects,
  useAddProjectToPortfolio,
  useRemoveProjectFromPortfolio,
} from '@/hooks/usePortfolios';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import {
  TrendingUp,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Plus,
  Trash2,
  FolderKanban,
  ChevronLeft,
  X,
  Search,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';

type HealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'complete';

const HEALTH_CONFIG: Record<HealthStatus, { label: string; color: string; bg: string; icon: typeof TrendingUp }> = {
  on_track:  { label: 'On Track',  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/30',  icon: TrendingUp },
  at_risk:   { label: 'At Risk',   color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30', icon: AlertTriangle },
  off_track: { label: 'Off Track', color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/30',       icon: XCircle },
  complete:  { label: 'Complete',  color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/30',     icon: CheckCircle2 },
};

interface ProjectStats {
  total: number;
  done: number;
  overdue: number;
  progress: number;
  health: HealthStatus;
}

export default function PortfolioDetail() {
  const { id: portfolioId } = useParams<{ id: string }>();
  const { currentWorkspace } = useWorkspaceStore();

  const { data: portfolio, isLoading: loadingPortfolio } = usePortfolio(portfolioId);
  const { data: portfolioProjects = [], isLoading: loadingProjects } = usePortfolioProjects(portfolioId);
  const { data: allProjects = [] } = useProjects(currentWorkspace?.id);

  usePageTitle(portfolio?.name ?? 'Portfolio');

  const addProject = useAddProjectToPortfolio(portfolioId);
  const removeProject = useRemoveProjectFromPortfolio(portfolioId);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch] = useState('');

  // Projects already in this portfolio
  const portfolioProjectIds = useMemo(
    () => new Set(portfolioProjects.map((p) => p.id)),
    [portfolioProjects]
  );

  // Projects available to add (not already in portfolio)
  const availableProjects = useMemo(
    () =>
      allProjects.filter(
        (p) =>
          !portfolioProjectIds.has(p.id) &&
          (!search || p.name.toLowerCase().includes(search.toLowerCase()))
      ),
    [allProjects, portfolioProjectIds, search]
  );

  // Fetch task stats for portfolio projects
  const { data: taskCounts = {} } = useQuery({
    queryKey: ['portfolio-detail-task-counts', portfolioId, portfolioProjects.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (!portfolioProjects.length) return {};
      const projectIds = portfolioProjects.map((p) => p.id);
      const { data, error } = await supabase
        .from('tasks')
        .select('project_id, status, due_date')
        .in('project_id', projectIds)
        .is('parent_task_id', null);
      if (error) throw error;

      const counts: Record<string, ProjectStats> = {};
      (data || []).forEach((t) => {
        if (!t.project_id) return;
        if (!counts[t.project_id])
          counts[t.project_id] = { total: 0, done: 0, overdue: 0, progress: 0, health: 'on_track' };
        const c = counts[t.project_id];
        c.total++;
        if (t.status === 'done') c.done++;
        if (t.due_date && t.status !== 'done' && isPast(parseISO(t.due_date))) c.overdue++;
      });
      Object.values(counts).forEach((c) => {
        c.progress = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
        if (c.progress >= 100) c.health = 'complete';
        else if (c.overdue > c.total * 0.3) c.health = 'off_track';
        else if (c.overdue > 0) c.health = 'at_risk';
        else c.health = 'on_track';
      });
      return counts;
    },
    enabled: portfolioProjects.length > 0,
  });

  const getStats = (projectId: string): ProjectStats =>
    taskCounts[projectId] || { total: 0, done: 0, overdue: 0, progress: 0, health: 'on_track' };

  if (loadingPortfolio) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48" />
          <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-64" />
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center py-16">
        <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-slate-700" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Portfolio not found</h3>
        <Link to="/portfolios" className="text-sm text-[#4B7C6F] hover:underline">← Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        to="/portfolios"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Projects
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{portfolio.description}</p>
          )}
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            {portfolioProjects.length} project{portfolioProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#4B7C6F] text-white rounded-lg hover:bg-[#3d6559] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add project
        </button>
      </div>

      {/* Summary stats */}
      {portfolioProjects.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(['on_track', 'at_risk', 'off_track', 'complete'] as HealthStatus[]).map((status) => {
            const cfg = HEALTH_CONFIG[status];
            const Icon = cfg.icon;
            const count = portfolioProjects.filter((p) => getStats(p.id).health === status).length;
            return (
              <div key={status} className={cn('flex items-center gap-3 p-3 rounded-xl border', cfg.bg, 'border-transparent')}>
                <Icon className={cn('w-5 h-5', cfg.color)} />
                <div>
                  <div className={cn('text-xl font-bold', cfg.color)}>{count}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{cfg.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loadingProjects && portfolioProjects.length === 0 && (
        <div className="text-center py-16">
          <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-slate-700" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No projects yet</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Add projects to track their progress in this portfolio.</p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#4B7C6F] text-white rounded-lg hover:bg-[#3d6559] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add project
          </button>
        </div>
      )}

      {/* Projects table */}
      {portfolioProjects.length > 0 && (
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
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {portfolioProjects.map((project) => {
                const stats = getStats(project.id);
                const health = HEALTH_CONFIG[stats.health];
                const HealthIcon = health.icon;
                return (
                  <tr key={project.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 group">
                    <td className="px-4 py-3">
                      <Link to={`/projects/${project.id}`} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: project.color || '#4B7C6F' }}
                        >
                          {project.name[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white hover:text-[#4B7C6F]">
                          {project.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {project.owner && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0"
                            style={{ backgroundColor: getAvatarColor(project.owner.id) }}
                          >
                            {getInitials(project.owner.full_name)}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-slate-300">{project.owner.full_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', health.bg, health.color)}>
                        <HealthIcon className="w-3 h-3" />
                        {health.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full">
                          <div
                            className={cn('h-full rounded-full transition-all', stats.health === 'off_track' ? 'bg-red-500' : stats.health === 'at_risk' ? 'bg-yellow-500' : stats.health === 'complete' ? 'bg-blue-500' : 'bg-green-500')}
                            style={{ width: `${stats.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{stats.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {stats.done}/{stats.total}
                      {stats.overdue > 0 && <span className="text-red-500 ml-1">({stats.overdue} overdue)</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {project.due_date ? format(parseISO(project.due_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (project.portfolio_project_id) {
                            removeProject.mutate(project.portfolio_project_id);
                          }
                        }}
                        className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                        title="Remove from portfolio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add project dialog */}
      {showAddDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => { setShowAddDialog(false); setSearch(''); }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add project to {portfolio.name}</h2>
              <button
                onClick={() => { setShowAddDialog(false); setSearch(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4B7C6F]"
              />
            </div>

            {/* Project list */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {availableProjects.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                  {search ? 'No matching projects' : 'All projects are already in this portfolio'}
                </p>
              )}
              {availableProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={async () => {
                    await addProject.mutateAsync({ projectId: project.id });
                    setShowAddDialog(false);
                    setSearch('');
                  }}
                  disabled={addProject.isPending}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: project.color || '#4B7C6F' }}
                  >
                    {project.name[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
