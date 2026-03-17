import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { BarChart3, Plus, FolderKanban, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Project } from '@/types';

export default function Portfolios() {
  const { currentWorkspace } = useWorkspaceStore();
  const { data: projects = [] } = useProjects(currentWorkspace?.id);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getProjectStatus = (project: Project) => {
    // Simple heuristic based on name/status
    return project.status === 'active' ? 'on_track' : project.status;
  };

  const statuses = [
    { id: 'all', label: 'All', icon: BarChart3, color: 'text-gray-500' },
    { id: 'on_track', label: 'On Track', icon: TrendingUp, color: 'text-green-500' },
    { id: 'at_risk', label: 'At Risk', icon: AlertTriangle, color: 'text-yellow-500' },
    { id: 'off_track', label: 'Off Track', icon: XCircle, color: 'text-red-500' },
  ];

  const filteredProjects = statusFilter === 'all' ? projects : projects.filter(p => getProjectStatus(p) === statusFilter);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolios</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} across your workspace</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        {statuses.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setStatusFilter(id)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors', statusFilter === id ? 'bg-coral/10 text-coral font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800')}
          >
            <Icon className={cn('w-4 h-4', statusFilter === id ? 'text-coral' : color)} /> {label}
          </button>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-20 h-20 mx-auto mb-4 text-gray-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No projects yet</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Create projects to track them in your portfolio.</p>
        </div>
      )}

      {/* Project table */}
      {filteredProjects.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Project</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Owner</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Progress</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: project.color }}>
                        <FolderKanban className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</span>
                    </div>
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
                    <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-medium">On Track</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{project.due_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
