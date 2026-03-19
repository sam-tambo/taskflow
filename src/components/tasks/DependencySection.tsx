import { useState } from 'react';
import { Search, X, Link, Check } from 'lucide-react';
import { useTaskDependencies, useAddDependency, useRemoveDependency } from '@/hooks/useTaskDependencies';
import { useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface DependencySectionProps {
  taskId: string;
  projectId: string | null;
}

export function DependencySection({ taskId, projectId }: DependencySectionProps) {
  const { data: dependencies = [] } = useTaskDependencies(taskId);
  const { data: allTasks = [] } = useTasks(projectId || undefined);
  const addDependency = useAddDependency(taskId);
  const removeDependency = useRemoveDependency(taskId);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const existingDepIds = new Set(dependencies.map(d => d.depends_on_id));

  const filteredTasks = allTasks.filter(t => {
    if (t.id === taskId) return false;
    if (existingDepIds.has(t.id)) return false;
    if (!search) return false;
    return t.title.toLowerCase().includes(search.toLowerCase());
  });

  const handleAdd = (depTaskId: string) => {
    addDependency.mutate({ task_id: taskId, depends_on_id: depTaskId });
    setSearch('');
    setShowSearch(false);
  };

  const statusIcon = (status: string) => {
    if (status === 'done') return <Check className="w-3 h-3 text-green-500" />;
    return <div className={cn('w-2.5 h-2.5 rounded-full border-2', status === 'in_progress' ? 'border-blue-500' : 'border-gray-300 dark:border-slate-600')} />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
          Dependencies ({dependencies.length})
        </span>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="text-xs text-[#4B7C6F] hover:underline flex items-center gap-1"
        >
          <Link className="w-3 h-3" /> Add
        </button>
      </div>

      {/* Existing dependencies */}
      {dependencies.map((dep) => (
        <div key={dep.id} className="group flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg">
          {statusIcon(dep.depends_on?.status || 'todo')}
          <span className={cn('text-sm flex-1 truncate', dep.depends_on?.status === 'done' && 'line-through text-gray-400')}>
            {dep.depends_on?.title || 'Unknown task'}
          </span>
          {dep.depends_on?.status !== 'done' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">Blocking</span>
          )}
          <button
            onClick={() => removeDependency.mutate(dep.id)}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* Search to add */}
      {showSearch && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks to add as dependency..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-[#4B7C6F]/30 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
          {filteredTasks.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-10 max-h-40 overflow-y-auto py-1">
              {filteredTasks.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleAdd(t.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white"
                >
                  {statusIcon(t.status)}
                  <span className="truncate">{t.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {dependencies.length === 0 && !showSearch && (
        <p className="text-xs text-gray-400">No dependencies</p>
      )}
    </div>
  );
}
