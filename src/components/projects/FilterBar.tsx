import { useState } from 'react';
import { Filter, X, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';

export interface TaskFilters {
  status: string[];
  priority: string[];
  assigneeId: string | null;
  hasDueDate: boolean | null;
  sortBy: 'position' | 'due_date' | 'priority' | 'created_at' | 'title';
  sortDir: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: TaskFilters = {
  status: [],
  priority: [],
  assigneeId: null,
  hasDueDate: null,
  sortBy: 'position',
  sortDir: 'asc',
};

interface FilterBarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'None' },
];

const SORT_OPTIONS = [
  { value: 'position', label: 'Manual order' },
  { value: 'due_date', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created_at', label: 'Created date' },
  { value: 'title', label: 'Name' },
];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const { members } = useWorkspaceStore();
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const activeFilterCount =
    filters.status.length +
    filters.priority.length +
    (filters.assigneeId ? 1 : 0) +
    (filters.hasDueDate !== null ? 1 : 0);

  const toggleStatus = (s: string) => {
    const next = filters.status.includes(s) ? filters.status.filter(x => x !== s) : [...filters.status, s];
    onChange({ ...filters, status: next });
  };

  const togglePriority = (p: string) => {
    const next = filters.priority.includes(p) ? filters.priority.filter(x => x !== p) : [...filters.priority, p];
    onChange({ ...filters, priority: next });
  };

  const clearFilters = () => onChange(DEFAULT_FILTERS);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-slate-800">
      {/* Filter toggle */}
      <div className="relative">
        <button
          onClick={() => { setShowFilters(!showFilters); setShowSort(false); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
            showFilters || activeFilterCount > 0
              ? 'bg-[#4B7C6F]/10 text-[#4B7C6F] font-medium'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
          )}
        >
          <Filter className="w-4 h-4" /> Filter
          {activeFilterCount > 0 && (
            <span className="text-[10px] bg-[#4B7C6F] text-white px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
        </button>

        {showFilters && (
          <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-20 p-3 space-y-3">
            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => toggleStatus(s.value)}
                    className={cn('text-xs px-2 py-1 rounded-full border', filters.status.includes(s.value) ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => togglePriority(p.value)}
                    className={cn('text-xs px-2 py-1 rounded-full border', filters.priority.includes(p.value) ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assignee</label>
              <select
                value={filters.assigneeId || ''}
                onChange={(e) => onChange({ ...filters, assigneeId: e.target.value || null })}
                className="w-full mt-1 text-sm px-2 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300"
              >
                <option value="">Anyone</option>
                <option value="unassigned">Unassigned</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Due Date</label>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => onChange({ ...filters, hasDueDate: filters.hasDueDate === true ? null : true })}
                  className={cn('text-xs px-2 py-1 rounded-full border', filters.hasDueDate === true ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400')}
                >
                  Has due date
                </button>
                <button
                  onClick={() => onChange({ ...filters, hasDueDate: filters.hasDueDate === false ? null : false })}
                  className={cn('text-xs px-2 py-1 rounded-full border', filters.hasDueDate === false ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400')}
                >
                  No due date
                </button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sort */}
      <div className="relative">
        <button
          onClick={() => { setShowSort(!showSort); setShowFilters(false); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
            filters.sortBy !== 'position'
              ? 'bg-[#4B7C6F]/10 text-[#4B7C6F] font-medium'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
          )}
        >
          <ArrowUpDown className="w-4 h-4" /> Sort
        </button>

        {showSort && (
          <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1">
            {SORT_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => {
                  if (filters.sortBy === s.value) {
                    onChange({ ...filters, sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' });
                  } else {
                    onChange({ ...filters, sortBy: s.value as TaskFilters['sortBy'], sortDir: 'asc' });
                  }
                }}
                className={cn('w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between', filters.sortBy === s.value ? 'text-[#4B7C6F] font-medium' : 'text-gray-700 dark:text-slate-300')}
              >
                {s.label}
                {filters.sortBy === s.value && (
                  <span className="text-xs">{filters.sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 ml-2">
          {filters.status.map(s => (
            <span key={s} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded-full">
              {s.replace('_', ' ')}
              <button onClick={() => toggleStatus(s)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
          {filters.priority.map(p => (
            <span key={p} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded-full">
              {p}
              <button onClick={() => togglePriority(p)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to apply filters to a task array
export function applyFilters(tasks: any[], filters: TaskFilters) {
  let result = [...tasks];

  if (filters.status.length > 0) {
    result = result.filter(t => filters.status.includes(t.status));
  }
  if (filters.priority.length > 0) {
    result = result.filter(t => filters.priority.includes(t.priority));
  }
  if (filters.assigneeId === 'unassigned') {
    result = result.filter(t => !t.assignee_id);
  } else if (filters.assigneeId) {
    result = result.filter(t => t.assignee_id === filters.assigneeId);
  }
  if (filters.hasDueDate === true) {
    result = result.filter(t => !!t.due_date);
  } else if (filters.hasDueDate === false) {
    result = result.filter(t => !t.due_date);
  }

  // Sort
  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
  if (filters.sortBy !== 'position') {
    result.sort((a, b) => {
      let cmp = 0;
      if (filters.sortBy === 'due_date') {
        const ad = a.due_date || '9999-99-99';
        const bd = b.due_date || '9999-99-99';
        cmp = ad.localeCompare(bd);
      } else if (filters.sortBy === 'priority') {
        cmp = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
      } else if (filters.sortBy === 'created_at') {
        cmp = a.created_at.localeCompare(b.created_at);
      } else if (filters.sortBy === 'title') {
        cmp = a.title.localeCompare(b.title);
      }
      return filters.sortDir === 'desc' ? -cmp : cmp;
    });
  }

  return result;
}
