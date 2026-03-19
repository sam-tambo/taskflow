import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUIStore } from '@/stores/useUIStore';
import { useUpdateTask } from '@/hooks/useTasks';
import { cn, formatDueDate, getDueDateColor, getPriorityColor, getInitials, getAvatarColor } from '@/lib/utils';
import { Check, Calendar, ChevronDown, ChevronRight, Inbox, ListTodo } from 'lucide-react';
import { isToday, isTomorrow, isThisWeek, isPast, parseISO, isAfter, addDays } from 'date-fns';
import type { Task } from '@/types';

type GroupBy = 'due_date' | 'project' | 'priority';

export default function MyTasks() {
  usePageTitle('My Tasks');
  const { user } = useAuth();
  const { openTaskDetail } = useUIStore();
  const updateTask = useUpdateTask();
  const [groupBy, setGroupBy] = useState<GroupBy>('due_date');
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*), project:projects(id, name, color)')
        .eq('assignee_id', user.id)
        .is('parent_task_id', null)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });

  const { active, completed } = useMemo(() => ({
    active: tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled'),
    completed: tasks.filter(t => t.status === 'done'),
  }), [tasks]);

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; tasks: Task[]; color?: string }[] = [];

    if (groupBy === 'due_date') {
      const overdue: Task[] = [], today: Task[] = [], tomorrow: Task[] = [], thisWeek: Task[] = [], later: Task[] = [], noDue: Task[] = [];
      active.forEach(t => {
        if (!t.due_date) { noDue.push(t); return; }
        const d = parseISO(t.due_date);
        if (isPast(d) && !isToday(d)) overdue.push(t);
        else if (isToday(d)) today.push(t);
        else if (isTomorrow(d)) tomorrow.push(t);
        else if (isThisWeek(d)) thisWeek.push(t);
        else later.push(t);
      });
      if (overdue.length) groups.push({ key: 'overdue', label: 'Overdue', tasks: overdue });
      if (today.length) groups.push({ key: 'today', label: 'Today', tasks: today });
      if (tomorrow.length) groups.push({ key: 'tomorrow', label: 'Tomorrow', tasks: tomorrow });
      if (thisWeek.length) groups.push({ key: 'thisWeek', label: 'This Week', tasks: thisWeek });
      if (later.length) groups.push({ key: 'later', label: 'Later', tasks: later });
      if (noDue.length) groups.push({ key: 'noDue', label: 'No Due Date', tasks: noDue });
    } else if (groupBy === 'project') {
      const projectMap = new Map<string, { label: string; tasks: Task[]; color: string }>();
      active.forEach(t => {
        const key = t.project?.id || 'none';
        if (!projectMap.has(key)) {
          projectMap.set(key, { label: t.project?.name || 'No Project', tasks: [], color: t.project?.color || '#94A3B8' });
        }
        projectMap.get(key)!.tasks.push(t);
      });
      projectMap.forEach((v, k) => groups.push({ key: k, label: v.label, tasks: v.tasks, color: v.color }));
    } else {
      const priorities = ['urgent', 'high', 'medium', 'low', 'none'];
      priorities.forEach(p => {
        const matching = active.filter(t => t.priority === p);
        if (matching.length) groups.push({ key: p, label: p === 'none' ? 'No Priority' : p.charAt(0).toUpperCase() + p.slice(1), tasks: matching });
      });
    }

    return groups;
  }, [active, groupBy]);

  const handleComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, status: 'done', completed_at: new Date().toISOString() });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        <div className="skeleton h-10 w-48 rounded-lg" />
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#4B7C6F]/10 rounded-xl flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-[#4B7C6F]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">{active.length} open, {completed.length} completed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="due_date">Group by Due Date</option>
            <option value="project">Group by Project</option>
            <option value="priority">Group by Priority</option>
          </select>
        </div>
      </div>

      {active.length === 0 && (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400">No tasks assigned to you</p>
        </div>
      )}

      {/* Task groups */}
      <div className="space-y-4">
        {grouped.map(group => (
          <TaskGroup
            key={group.key}
            label={group.label}
            tasks={group.tasks}
            color={group.color}
            onComplete={handleComplete}
            onOpen={(id) => openTaskDetail(id)}
          />
        ))}
      </div>

      {/* Completed section */}
      {completed.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 mb-2"
          >
            {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="space-y-0.5 opacity-60">
              {completed.slice(0, 20).map(task => (
                <TaskItem key={task.id} task={task} onComplete={(e) => handleComplete(e, task)} onOpen={() => openTaskDetail(task.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskGroup({ label, tasks, color, onComplete, onOpen }: {
  label: string;
  tasks: Task[];
  color?: string;
  onComplete: (e: React.MouseEvent, task: Task) => void;
  onOpen: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-1 group"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        {color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs text-gray-400">({tasks.length})</span>
      </button>
      {!collapsed && (
        <div className="space-y-0.5 ml-1">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} onComplete={(e) => onComplete(e, task)} onOpen={() => onOpen(task.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, onComplete, onOpen }: { task: Task; onComplete: (e: React.MouseEvent) => void; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
    >
      <button
        onClick={onComplete}
        className={cn(
          'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0',
          task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 hover:border-[#4B7C6F]'
        )}
      >
        {task.status === 'done' && <Check className="w-2.5 h-2.5 text-white" />}
      </button>
      <span className={cn('flex-1 text-sm', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white')}>
        {task.title}
      </span>
      {task.project && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
          {task.project.name}
        </span>
      )}
      {task.priority !== 'none' && (
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize font-medium', getPriorityColor(task.priority))}>{task.priority}</span>
      )}
      {task.due_date && (
        <span className={cn('text-xs flex items-center gap-1 flex-shrink-0', getDueDateColor(task.due_date))}>
          <Calendar className="w-3 h-3" />
          {formatDueDate(task.due_date)}
        </span>
      )}
    </div>
  );
}
