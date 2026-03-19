import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useUIStore } from '@/stores/useUIStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TaskRow } from '@/components/tasks/TaskRow';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { Search as SearchIcon, SlidersHorizontal, X, User, FolderKanban, Calendar } from 'lucide-react';
import type { Task, Project, Section } from '@/types';
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
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { currentWorkspace, members } = useWorkspaceStore();
  const { openTaskDetail } = useUIStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  const debouncedQuery = useDebounce(query, 300);

  // Search tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['search-tasks', currentWorkspace?.id, debouncedQuery, statusFilter, priorityFilter, assigneeFilter, projectFilter, dueDateFilter],
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
      if (assigneeFilter !== 'all') q = q.eq('assignee_id', assigneeFilter);
      if (projectFilter !== 'all') q = q.eq('project_id', projectFilter);
      if (dueDateFilter === 'overdue') q = q.lt('due_date', new Date().toISOString().split('T')[0]).neq('status', 'done');
      if (dueDateFilter === 'today') q = q.eq('due_date', new Date().toISOString().split('T')[0]);
      if (dueDateFilter === 'week') {
        const d = new Date(); d.setDate(d.getDate() + 7);
        q = q.lte('due_date', d.toISOString().split('T')[0]).gte('due_date', new Date().toISOString().split('T')[0]);
      }
      if (dueDateFilter === 'no_date') q = q.is('due_date', null);
      const { data, error } = await q;
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!currentWorkspace?.id && !!debouncedQuery.trim(),
  });

  // Search projects
  const { data: projects = [] } = useQuery({
    queryKey: ['search-projects', currentWorkspace?.id, debouncedQuery],
    queryFn: async () => {
      if (!currentWorkspace?.id || !debouncedQuery.trim()) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*, owner:profiles!owner_id(*)')
        .eq('workspace_id', currentWorkspace.id)
        .ilike('name', `%${debouncedQuery}%`)
        .limit(10);
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!currentWorkspace?.id && !!debouncedQuery.trim(),
  });

  // Search sections
  const { data: sections = [] } = useQuery({
    queryKey: ['search-sections', currentWorkspace?.id, debouncedQuery],
    queryFn: async () => {
      if (!currentWorkspace?.id || !debouncedQuery.trim()) return [];
      const { data, error } = await supabase
        .from('sections')
        .select('*, project:projects!project_id(id, name, color)')
        .ilike('name', `%${debouncedQuery}%`)
        .limit(10);
      if (error) throw error;
      return (data || []) as (Section & { project?: Project })[];
    },
    enabled: !!currentWorkspace?.id && !!debouncedQuery.trim(),
  });

  // All projects for filter dropdown
  const { data: allProjects = [] } = useQuery({
    queryKey: ['all-projects-filter', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase.from('projects').select('id, name, color').eq('workspace_id', currentWorkspace.id).eq('status', 'active');
      if (error) throw error;
      return data as { id: string; name: string; color: string }[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const totalResults = projects.length + sections.length + tasks.length;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, totalResults - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    }
    if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const projectEnd = projects.length;
      const sectionEnd = projectEnd + sections.length;
      if (selectedIndex < projectEnd) {
        // Navigate to project handled by link
      } else if (selectedIndex < sectionEnd) {
        // Navigate to section's project
      } else {
        const task = tasks[selectedIndex - sectionEnd];
        if (task) openTaskDetail(task.id);
      }
    }
  }, [selectedIndex, totalResults, projects, sections, tasks, openTaskDetail]);

  useEffect(() => { setSelectedIndex(-1); }, [debouncedQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSearchParams({ q: query.trim() });
  };

  const activeFilters = [statusFilter, priorityFilter, assigneeFilter, projectFilter, dueDateFilter].filter(f => f !== 'all').length;

  return (
    <div className="p-6 max-w-4xl mx-auto" onKeyDown={handleKeyDown}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Search</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, projects, sections..."
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
            className={cn(
              'px-4 py-3 rounded-xl border transition-colors relative',
              showFilters ? 'border-[#4B7C6F] bg-[#4B7C6F]/5 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#4B7C6F] text-white text-[10px] rounded-full flex items-center justify-center">{activeFilters}</span>
            )}
          </button>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 flex gap-3 flex-wrap p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="text-sm px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 cursor-pointer">
                <option value="all">All</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as PriorityFilter)} className="text-sm px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 cursor-pointer">
                <option value="all">All</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Assignee</label>
              <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="text-sm px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 cursor-pointer">
                <option value="all">All</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Project</label>
              <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="text-sm px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 cursor-pointer">
                <option value="all">All</option>
                {allProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Due Date</label>
              <select value={dueDateFilter} onChange={e => setDueDateFilter(e.target.value)} className="text-sm px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 cursor-pointer">
                <option value="all">All</option>
                <option value="overdue">Overdue</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="no_date">No date</option>
              </select>
            </div>
            {activeFilters > 0 && (
              <div className="flex items-end">
                <button
                  onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setAssigneeFilter('all'); setProjectFilter('all'); setDueDateFilter('all'); }}
                  className="text-xs text-red-500 hover:underline px-2 py-1.5"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project results */}
      {projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5" /> Projects ({projects.length})
          </h2>
          <div className="space-y-1">
            {projects.map((project, i) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800',
                  selectedIndex === i && 'ring-2 ring-[#4B7C6F]'
                )}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: project.color }}>
                  {project.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</p>
                  {project.description && <p className="text-xs text-gray-500 truncate max-w-md">{project.description}</p>}
                </div>
                {project.owner && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium" style={{ backgroundColor: getAvatarColor(project.owner.id) }}>
                      {getInitials(project.owner.full_name)}
                    </div>
                    {project.owner.full_name}
                  </div>
                )}
                <span className={cn('text-xs px-2 py-0.5 rounded-full', project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500')}>
                  {project.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Section results */}
      {sections.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">Sections ({sections.length})</h2>
          <div className="space-y-1">
            {sections.map((section) => {
              const proj = (section as any).project as Project | undefined;
              return (
                <Link
                  key={section.id}
                  to={proj ? `/projects/${proj.id}` : '#'}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  {section.color && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: section.color }} />}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{section.name}</span>
                  {proj && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                      {proj.name}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Task results */}
      {debouncedQuery.trim() && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Tasks ({tasks.length})
          </h2>
          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : tasks.length > 0 ? (
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
              {tasks.map((task, i) => {
                const absIdx = projects.length + sections.length + i;
                return (
                  <div key={task.id} className={cn(selectedIndex === absIdx && 'ring-2 ring-inset ring-[#4B7C6F]')}>
                    <TaskRow task={task} projectId={task.project_id || undefined} showProject />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No tasks found for &quot;{debouncedQuery}&quot;</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!debouncedQuery.trim() && (
        <div className="text-center py-16">
          <SearchIcon className="w-16 h-16 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Search your workspace</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Find tasks, projects, and sections by name</p>
          <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
            <span>Use filters to narrow results</span>
            <span>Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 rounded">↑↓</kbd> to navigate</span>
          </div>
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
