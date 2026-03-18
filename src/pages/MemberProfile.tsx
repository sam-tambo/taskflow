import { useParams, Link } from 'react-router-dom';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { ArrowLeft, Shield, Crown, User, Eye, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import type { WorkspaceMember, Task } from '@/types';

const roleIcons: Record<string, typeof Crown> = { owner: Crown, admin: Shield, member: User, guest: Eye };
const roleLabels: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Member', guest: 'Guest' };
const roleColors: Record<string, string> = {
  owner: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  admin: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  member: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  guest: 'text-gray-400 bg-gray-50 dark:bg-gray-800',
};

const priorityColors: Record<string, string> = {
  urgent: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-400',
  none: 'text-gray-300',
};

export default function MemberProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { currentWorkspace } = useWorkspaceStore();

  // Fetch member info
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['member-profile', currentWorkspace?.id, userId],
    queryFn: async () => {
      if (!currentWorkspace || !userId) return null;
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*, profiles:user_id(*)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data as WorkspaceMember;
    },
    enabled: !!currentWorkspace && !!userId,
  });

  // Fetch assigned tasks (open)
  const { data: assignedTasks = [] } = useQuery({
    queryKey: ['member-tasks', currentWorkspace?.id, userId],
    queryFn: async () => {
      if (!currentWorkspace || !userId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:project_id(id, name, color)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('assignee_id', userId)
        .in('status', ['todo', 'in_progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!currentWorkspace && !!userId,
  });

  // Fetch recently completed tasks
  const { data: completedTasks = [] } = useQuery({
    queryKey: ['member-completed-tasks', currentWorkspace?.id, userId],
    queryFn: async () => {
      if (!currentWorkspace || !userId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:project_id(id, name, color)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('assignee_id', userId)
        .eq('status', 'done')
        .order('completed_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!currentWorkspace && !!userId,
  });

  if (memberLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-500 dark:text-slate-400">Member not found</p>
        <Link to="/members" className="text-coral text-sm mt-2 inline-block hover:underline">Back to Members</Link>
      </div>
    );
  }

  const profile = member.profiles;
  const RoleIcon = roleIcons[member.role] || User;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link to="/members" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Members
      </Link>

      {/* Profile card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mb-6">
        <div className="flex items-start gap-4">
          <Avatar
            user={{ id: member.user_id, full_name: profile?.full_name, avatar_url: profile?.avatar_url }}
            size="xl"
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {profile?.full_name || 'Unknown'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{profile?.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium',
                roleColors[member.role],
              )}>
                <RoleIcon className="w-3.5 h-3.5" />
                {roleLabels[member.role]}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">
                Joined {format(new Date(member.joined_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Tasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Assigned Tasks</h2>
          <Link
            to={`/search?assignee=${userId}`}
            className="text-xs text-coral hover:underline"
          >
            View all assigned tasks
          </Link>
        </div>
        {assignedTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 text-center">
            <p className="text-sm text-gray-400 dark:text-slate-500">No open tasks assigned</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700">
            {assignedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                <Circle className={cn('w-4 h-4 flex-shrink-0', priorityColors[task.priority])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">{task.title}</p>
                  {task.project && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{task.project.name}</p>
                  )}
                </div>
                {task.due_date && (
                  <span className={cn(
                    'text-xs flex-shrink-0',
                    new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-gray-400 dark:text-slate-500',
                  )}>
                    {format(new Date(task.due_date), 'MMM d')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently Completed */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recently Completed</h2>
        {completedTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 text-center">
            <p className="text-sm text-gray-400 dark:text-slate-500">No completed tasks yet</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700">
            {completedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 dark:text-slate-400 line-through truncate">{task.title}</p>
                  {task.project && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{task.project.name}</p>
                  )}
                </div>
                {task.completed_at && (
                  <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">
                    {format(new Date(task.completed_at), 'MMM d')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
