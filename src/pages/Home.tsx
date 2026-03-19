import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/hooks/useAuth';
import { useMyTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { TaskRow } from '@/components/tasks/TaskRow';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { isToday, isBefore, isThisWeek, parseISO, format } from 'date-fns';
import {
  ClipboardList, Sun, CalendarClock, Calendar, CircleDashed,
  AlertTriangle, TrendingUp, Activity, FolderOpen, CheckCircle2
} from 'lucide-react';
import type { Task, ActivityLog } from '@/types';

export default function Home() {
  usePageTitle('My Tasks');
  const { user, profile } = useAuth();
  const { currentWorkspace } = useWorkspaceStore();
  const { data: tasks = [], isLoading } = useMyTasks(user?.id);
  const { data: projects = [] } = useProjects(currentWorkspace?.id);

  // Recent activity
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['recent-activity', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, user:profiles!user_id(*)')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const sections = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const later: Task[] = [];
    const noDate: Task[] = [];

    tasks.forEach((task) => {
      if (!task.due_date) {
        noDate.push(task);
      } else {
        const date = parseISO(task.due_date);
        if (isBefore(date, new Date()) && !isToday(date)) {
          overdue.push(task);
        } else if (isToday(date)) {
          today.push(task);
        } else if (isThisWeek(date)) {
          upcoming.push(task);
        } else {
          later.push(task);
        }
      }
    });

    return { overdue, today, upcoming, later, noDate };
  }, [tasks]);

  const taskSections = [
    { id: 'overdue', label: 'Overdue', icon: AlertTriangle, tasks: sections.overdue, color: 'text-red-500' },
    { id: 'today', label: 'Today', icon: Sun, tasks: sections.today, color: 'text-[#4B7C6F]' },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarClock, tasks: sections.upcoming, color: 'text-blue-500' },
    { id: 'later', label: 'Later', icon: Calendar, tasks: sections.later, color: 'text-gray-500' },
    { id: 'no-date', label: 'No Due Date', icon: CircleDashed, tasks: sections.noDate, color: 'text-gray-400' },
  ];

  // Project stats
  const projectStats = useMemo(() => {
    return projects.slice(0, 4).map(p => ({
      ...p,
      _totalTasks: 0,
      _completedTasks: 0,
    }));
  }, [projects]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="skeleton h-12 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you
          {sections.overdue.length > 0 && <span className="text-red-500 font-medium"> · {sections.overdue.length} overdue</span>}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={AlertTriangle} label="Overdue" value={sections.overdue.length} color="text-red-500" bg="bg-red-50 dark:bg-red-900/20" />
        <StatCard icon={Sun} label="Due Today" value={sections.today.length} color="text-[#4B7C6F]" bg="bg-[#4B7C6F]/10" />
        <StatCard icon={CalendarClock} label="This Week" value={sections.upcoming.length} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard icon={ClipboardList} label="Total" value={tasks.length} color="text-gray-600 dark:text-slate-400" bg="bg-gray-50 dark:bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task list - 2 cols */}
        <div className="lg:col-span-2">
          {tasks.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
              <CheckCircle2 className="w-16 h-16 text-green-200 dark:text-green-900 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">You're all caught up!</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">Tasks assigned to you will appear here.</p>
            </div>
          )}

          {taskSections.map(({ id, label, icon: Icon, tasks: sectionTasks, color }) => (
            sectionTasks.length > 0 && (
              <div key={id} className="mb-4">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{label}</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{sectionTasks.length}</span>
                </div>
                <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                  {sectionTasks.map((task) => (
                    <TaskRow key={task.id} task={task} projectId={task.project_id || undefined} showProject />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Sidebar - 1 col */}
        <div className="space-y-6">
          {/* Projects */}
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4" /> Projects
              </h3>
              <span className="text-xs text-gray-400">{projects.length}</span>
            </div>
            <div className="space-y-2">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: project.color }}>
                    {project.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 dark:text-slate-300 truncate block">{project.name}</span>
                    <ProjectProgressBar projectId={project.id} />
                  </div>
                </Link>
              ))}
              {projects.length === 0 && <p className="text-xs text-gray-400">No projects yet</p>}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5 mb-3">
              <Activity className="w-4 h-4" /> Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0 mt-0.5" style={{ backgroundColor: getAvatarColor(activity.user_id || '') }}>
                    {getInitials(activity.user?.full_name || null)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    <span className="font-medium text-gray-700 dark:text-slate-300">{activity.user?.full_name || 'User'}</span>{' '}
                    {activity.action === 'created' && 'created a task'}
                    {activity.action === 'updated' && `changed ${activity.field_changed}`}
                    {activity.action === 'completed' && 'completed a task'}
                    {activity.action === 'assigned' && 'assigned a task'}
                    {activity.action === 'commented' && 'commented'}
                    <span className="text-gray-400 block mt-0.5">{format(new Date(activity.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && <p className="text-xs text-gray-400">No recent activity</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn('rounded-xl p-4', bg)}>
      <Icon className={cn('w-5 h-5 mb-2', color)} />
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function ProjectProgressBar({ projectId }: { projectId: string }) {
  const { data: projectTasks = [] } = useQuery({
    queryKey: ['project-tasks-count', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', projectId)
        .is('parent_task_id', null);
      if (error) throw error;
      return data;
    },
  });
  const total = projectTasks.length;
  const done = projectTasks.filter(t => t.status === 'done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400">{pct}%</span>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
