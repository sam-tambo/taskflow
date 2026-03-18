import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useProjects } from '@/hooks/useProjects';
import { cn, getAvatarColor, getInitials } from '@/lib/utils';
import { BarChart3, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { format, subDays, parseISO, startOfDay, eachDayOfInterval } from 'date-fns';
import type { Task, Profile } from '@/types';

const CHART_COLORS = ['#4B7C6F', '#8B5CF6', '#3B82F6', '#10B981', '#EC4899', '#F59E0B', '#14B8A6', '#EF4444'];

export default function Reports() {
  usePageTitle('Reports');
  const { currentWorkspace, members } = useWorkspaceStore();
  const { data: projects = [] } = useProjects(currentWorkspace?.id);
  const [dateRange, setDateRange] = useState(30);

  // Fetch all tasks for workspace
  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(id, full_name, email), project:projects(id, name, color)')
        .eq('workspace_id', currentWorkspace.id)
        .is('parent_task_id', null);
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Summary stats
  const stats = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'done').length;
    const overdue = allTasks.filter(t => t.due_date && t.status !== 'done' && parseISO(t.due_date) < new Date()).length;
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
    return { total, completed, overdue, inProgress, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [allTasks]);

  // Incomplete tasks by project (bar chart)
  const tasksByProject = useMemo(() => {
    const map = new Map<string, { name: string; count: number; color: string }>();
    allTasks.filter(t => t.status !== 'done').forEach(t => {
      const proj = t.project;
      if (proj) {
        const key = proj.id;
        if (!map.has(key)) map.set(key, { name: proj.name, count: 0, color: proj.color || '#4B7C6F' });
        map.get(key)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [allTasks]);

  // Completed over time (line chart)
  const completedOverTime = useMemo(() => {
    const start = subDays(new Date(), dateRange);
    const end = new Date();
    const daysList = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
    const completedByDay = new Map<string, number>();
    allTasks.forEach(t => {
      if (t.completed_at) {
        const key = format(parseISO(t.completed_at), 'yyyy-MM-dd');
        completedByDay.set(key, (completedByDay.get(key) || 0) + 1);
      }
    });
    return daysList.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      return { date: format(day, 'MMM d'), count: completedByDay.get(key) || 0 };
    });
  }, [allTasks, dateRange]);

  // Workload by assignee
  const workloadByAssignee = useMemo(() => {
    const map = new Map<string, { name: string; id: string; open: number; done: number }>();
    allTasks.forEach(t => {
      if (t.assignee) {
        const key = t.assignee.id;
        if (!map.has(key)) map.set(key, { name: t.assignee.full_name || t.assignee.email, id: key, open: 0, done: 0 });
        const entry = map.get(key)!;
        if (t.status === 'done') entry.done++;
        else entry.open++;
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.open + b.done) - (a.open + a.done)).slice(0, 8);
  }, [allTasks]);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#94A3B8' : '#6B7280';
  const gridColor = isDark ? '#334155' : '#E5E7EB';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Overview of your workspace activity</p>
        </div>
        <select
          value={dateRange}
          onChange={e => setDateRange(Number(e.target.value))}
          className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white cursor-pointer"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: stats.total, icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-[#4B7C6F]', bg: 'bg-[#f0f7f5] dark:bg-orange-900/20' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(card => (
          <div key={card.label} className={cn('p-4 rounded-xl', card.bg)}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={cn('w-4 h-4', card.color)} />
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Completion rate */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Completion Rate</span>
          <span className="text-sm font-bold text-[#4B7C6F]">{stats.completionRate}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full">
          <div className="h-full bg-[#16A34A] rounded-full transition-all" style={{ width: `${stats.completionRate}%` }} />
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incomplete tasks by project */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Open Tasks by Project</h3>
          {tasksByProject.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tasksByProject} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: axisColor }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E5E7EB', color: isDark ? '#F1F5F9' : '#111827' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {tasksByProject.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No open tasks</p>
          )}
        </div>

        {/* Completed over time */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tasks Completed Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={completedOverTime} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor }} interval={Math.max(Math.floor(completedOverTime.length / 6), 1)} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E5E7EB', color: isDark ? '#F1F5F9' : '#111827' }} />
              <Line type="monotone" dataKey="count" stroke="#4B7C6F" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workload by assignee */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Workload by Assignee</h3>
        {workloadByAssignee.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workloadByAssignee} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E5E7EB', color: isDark ? '#F1F5F9' : '#111827' }} />
              <Bar dataKey="open" name="Open" fill="#4B7C6F" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="done" name="Done" fill="#10B981" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No assigned tasks</p>
        )}
      </div>
    </div>
  );
}
