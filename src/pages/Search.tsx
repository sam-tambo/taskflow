import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useUIStore } from '@/stores/useUIStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TaskRow } from '@/components/tasks/TaskRow';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { Search as SearchIcon, Filter, SlidersHorizontal, X } from 'lucide-react';
import type { Task, Project } from '@/types';
import { Link } from 'react-router-dom';

type StatusFilter = 'all' | 'todo' | 'in_progress' | 'done' | 'cancelled';
type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low' | 'none';

export default function Search() {
  usePageTitle('Search');
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  const debouncedQuery = useDebounce(query, 300);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['search-tasks', currentWorkspace?.id, debouncedQuery, statusFilter, priorityFilter],
    queryFn: async () => {
      if (!currentWorkspace?.id || !debouncedQuery.trim()) return [];
      let q = supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*), project:projects(*), section:sections(*)')
        .eq('workspace_id', currentWorkspace.id)
        .ilike('title', `%${debouncedQuery}%`)
        .is('parent_task_id', null)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (priorityFilter !== 'all') q = q.eq('priority', priorityFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!currentWorkspace?.id && !!debouncedQuery.trim(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['search-projects', currentWorkspace?.id, debouncedQuery],
    queryFn: async () => {
      if (!currentWorkspace?.id || !debouncedQuery.trim()) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .ilike('name', `%${debouncedQuery}%`)
        .limit(10);
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!currentWorkspace?.id && !!debouncedQuery.trim(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Search</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, projects..."
              className="w-full pl-11 pr-4 py-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#4B7C6F]/30 text-gray-900 dark:text-white"
              autoFocus
            />
            {query && (
              <button onClick={() => { setQuery(''); setSearchParams({}); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn('px-4 py-3 rounded-xl border transition-colors', showFilters ? 'border-[#4B7C6F] bg-[#4B7C6F]/5 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800')}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 flex gap-3 flex-wrap">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="text-sm px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                className="text-sm px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Project results */}
      {projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">Projects ({projects.length})</h2>
          <div className="space-y-1">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: project.color }}>
                  {project.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</p>
                  {project.description && <p className="text-xs text-gray-500 truncate max-w-md">{project.description}</p>}
                </div>
                <span className={cn('ml-auto text-xs px-2 py-0.5 rounded-full', project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {project.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Task results */}
      {debouncedQuery.trim() && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">Tasks ({tasks.length})</h2>
          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : tasks.length > 0 ? (
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} projectId={task.project_id || undefined} showProject />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No tasks found for "{debouncedQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!debouncedQuery.trim() && (
        <div className="text-center py-16">
          <SearchIcon className="w-16 h-16 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Search your workspace</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Find tasks and projects by name</p>
        </div>
      )}
    </div>
  );
}

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
