import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useUpdateProject } from '@/hooks/useProjects';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { MilestonePanel } from './MilestonePanel';
import { StatusUpdatePanel } from './StatusUpdatePanel';
import { CheckCircle2, Clock, ListTodo, XCircle, Target, Users, Calendar } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import type { Project, ActivityLog } from '@/types';

interface ProjectOverviewProps {
  project: Project;
}

export default function ProjectOverview({ project }: ProjectOverviewProps) {
  const { data: tasks = [] } = useTasks(project.id);
  const { data: members = [] } = useProjectMembers(project.id);
  const updateProject = useUpdateProject(project.workspace_id);
  const [description, setDescription] = useState(project.description || '');

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['project-activity', project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, user:profiles!user_id(id, full_name, email)')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  const stats = useMemo(() => {
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;
    const total = tasks.length;
    const overdue = tasks.filter(t => t.due_date && t.status !== 'done' && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, inProgress, done, cancelled, total, overdue, completionRate };
  }, [tasks]);

  const roleLabel: Record<string, string> = { owner: 'Owner', editor: 'Editor', commenter: 'Commenter', viewer: 'Viewer' };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Description */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Project Description</h2>
        <RichTextEditor
          content={description}
          onBlur={(html) => {
            const cleaned = html === '<p></p>' ? '' : html;
            if (cleaned !== (project.description || '')) {
              setDescription(cleaned);
              updateProject.mutate({ id: project.id, description: cleaned });
            }
          }}
          placeholder="Describe this project's goals, scope, and key details..."
        />
      </div>

      {/* Stats cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Task Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: Target, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-slate-800' },
            { label: 'To Do', value: stats.todo, icon: ListTodo, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-[#4B7C6F]', bg: 'bg-[#f0f7f5] dark:bg-[#4B7C6F]/10' },
            { label: 'Done', value: stats.done, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-slate-800' },
            { label: 'Overdue', value: stats.overdue, icon: Calendar, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map(card => (
            <div key={card.label} className={cn('p-3 rounded-xl', card.bg)}>
              <div className="flex items-center gap-1.5 mb-1">
                <card.icon className={cn('w-3.5 h-3.5', card.color)} />
                <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">{card.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {stats.total > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${stats.completionRate}%` }} />
            </div>
            <span className="text-sm font-semibold text-[#4B7C6F]">{stats.completionRate}%</span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Members ({members.length})
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            {members.length === 0 && <p className="text-sm text-gray-400 p-4">No members assigned</p>}
            {members.map((member, idx) => (
              <div
                key={member.id}
                className={cn('flex items-center gap-3 px-4 py-2.5', idx < members.length - 1 && 'border-b border-gray-50 dark:border-slate-800')}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: getAvatarColor(member.user_id) }}>
                  {getInitials(member.profiles?.full_name || null)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">{member.profiles?.full_name || member.profiles?.email}</span>
                </div>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  member.role === 'owner' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                  member.role === 'editor' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                  member.role === 'commenter' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-500'
                )}>
                  {roleLabel[member.role] || member.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Recent Activity</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4 space-y-3 max-h-80 overflow-y-auto">
            {recentActivity.length === 0 && <p className="text-sm text-gray-400">No activity yet</p>}
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start gap-2 text-xs">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0 mt-0.5" style={{ backgroundColor: getAvatarColor(activity.user_id || '') }}>
                  {getInitials(activity.user?.full_name || null)}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-700 dark:text-slate-300">{activity.user?.full_name || 'User'}</span>{' '}
                  <span className="text-gray-500">
                    {activity.action === 'created' && 'created a task'}
                    {activity.action === 'updated' && `changed ${activity.field_changed}`}
                    {activity.action === 'completed' && 'completed a task'}
                    {activity.action === 'assigned' && `assigned to ${activity.new_value}`}
                    {activity.action === 'commented' && 'commented'}
                  </span>
                  <span className="text-gray-400 ml-1">{format(new Date(activity.created_at), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Milestones & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Milestones</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
            <MilestonePanel projectId={project.id} />
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Status Updates</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
            <StatusUpdatePanel projectId={project.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
