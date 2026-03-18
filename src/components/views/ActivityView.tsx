import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/stores/useUIStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { format, isToday, isYesterday, parseISO, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import type { ActivityLog } from '@/types';

const PAGE_SIZE = 30;

const ACTION_DESCRIPTIONS: Record<string, string> = {
  task_created: 'created',
  task_completed: 'completed',
  task_uncompleted: 'marked incomplete',
  title_changed: 'renamed a task',
  description_changed: 'updated description of',
  assignee_changed: 'reassigned',
  due_date_changed: 'changed due date of',
  priority_changed: 'changed priority of',
  status_changed: 'changed status of',
  comment_added: 'commented on',
  section_moved: 'moved',
};

function getActionSuffix(action: string): string | null {
  if (action === 'section_moved') return 'to section';
  return null;
}

function hasTaskLink(action: string): boolean {
  return action !== 'title_changed';
}

function getDayLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d, yyyy');
}

function formatTimestamp(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  return format(date, 'h:mm a');
}

function groupByDay(entries: ActivityLog[]): { label: string; entries: ActivityLog[] }[] {
  const groups: Map<string, ActivityLog[]> = new Map();

  for (const entry of entries) {
    const label = getDayLabel(entry.created_at);
    const existing = groups.get(label);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(label, [entry]);
    }
  }

  return Array.from(groups.entries()).map(([label, entries]) => ({ label, entries }));
}

export default function ActivityView({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(0);
  const openTaskDetail = useUIStore((s) => s.openTaskDetail);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity', projectId, page],
    queryFn: async () => {
      // Fetch activity log entries
      const { data: activities, error: actError } = await supabase
        .from('activity_log')
        .select('*, user:profiles(id, full_name, email, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(0, (page + 1) * PAGE_SIZE - 1);

      if (actError) throw actError;

      // Fetch task titles for reference
      const taskIds = [...new Set((activities || []).map((a: ActivityLog) => a.task_id).filter(Boolean))];
      let taskMap: Record<string, string> = {};

      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', taskIds);

        if (tasks) {
          taskMap = Object.fromEntries(tasks.map((t: { id: string; title: string }) => [t.id, t.title]));
        }
      }

      // Fetch comments for the project's tasks and merge as activity entries
      const { data: projectTasks } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('project_id', projectId);

      let commentEntries: ActivityLog[] = [];
      if (projectTasks && projectTasks.length > 0) {
        const ptIds = projectTasks.map((t: { id: string }) => t.id);
        const { data: comments } = await supabase
          .from('comments')
          .select('*, user:profiles(id, full_name, email, avatar_url)')
          .in('task_id', ptIds)
          .order('created_at', { ascending: false })
          .range(0, (page + 1) * PAGE_SIZE - 1);

        if (comments) {
          const ptMap = Object.fromEntries(projectTasks.map((t: { id: string; title: string }) => [t.id, t.title]));
          commentEntries = comments.map((c: Record<string, unknown>) => ({
            id: `comment-${c.id}`,
            workspace_id: '',
            user_id: c.user_id as string | null,
            task_id: c.task_id as string,
            project_id: projectId,
            action: 'comment_added',
            field_changed: null,
            old_value: null,
            new_value: (c.body as string)?.slice(0, 120) || null,
            created_at: c.created_at as string,
            user: c.user as ActivityLog['user'],
            _taskTitle: ptMap[c.task_id as string],
          }));

          // Add project task titles to taskMap
          Object.assign(taskMap, ptMap);
        }
      }

      // Merge and sort
      const allEntries = [...(activities || []), ...commentEntries]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Deduplicate comment_added from activity_log if also fetched from comments
      const seen = new Set<string>();
      const deduped: ActivityLog[] = [];
      for (const entry of allEntries) {
        const key = entry.id;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(entry);
        }
      }

      const paginated = deduped.slice(0, (page + 1) * PAGE_SIZE);
      const hasMore = deduped.length > paginated.length;

      return { entries: paginated, taskMap, hasMore };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Failed to load activity. Please try again.
      </div>
    );
  }

  const entries = data?.entries || [];
  const taskMap = data?.taskMap || {};
  const hasMore = data?.hasMore || false;

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No activity yet</p>
        <p className="text-xs mt-1">Activity will appear here as changes are made.</p>
      </div>
    );
  }

  const groups = groupByDay(entries);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {groups.map((group) => (
        <div key={group.label} className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {group.label}
          </h3>
          <div className="space-y-1">
            {group.entries.map((entry) => {
              const userObj = entry.user as any;
              const userName =
                userObj?.full_name as string ||
                userObj?.email as string ||
                'Unknown';
              const initials = getInitials(userName);
              const avatarColor = getAvatarColor(userName);
              const actionDesc = ACTION_DESCRIPTIONS[entry.action] || entry.action;
              const taskTitle =
                (entry as any)._taskTitle as string ||
                (entry.task_id ? taskMap[entry.task_id] : null) ||
                'a task';
              const suffix = getActionSuffix(entry.action);
              const showTaskLink = hasTaskLink(entry.action) && entry.task_id;
              const showFieldChange =
                entry.action !== 'comment_added' &&
                entry.action !== 'task_created' &&
                entry.action !== 'task_completed' &&
                entry.action !== 'task_uncompleted' &&
                (entry.old_value || entry.new_value);
              const isComment = entry.action === 'comment_added';

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white mt-0.5',
                      avatarColor
                    )}
                  >
                    {initials}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1 flex-wrap text-sm">
                      <span className="font-semibold text-foreground">{userName}</span>
                      <span className="text-muted-foreground">{actionDesc}</span>
                      {showTaskLink ? (
                        <button
                          onClick={() => openTaskDetail(entry.task_id)}
                          className="font-medium text-primary hover:underline truncate max-w-[200px] text-left"
                        >
                          {taskTitle}
                        </button>
                      ) : null}
                      {suffix && (
                        <span className="text-muted-foreground">{suffix}</span>
                      )}
                      {suffix && entry.new_value && (
                        <span className="font-medium text-foreground">{entry.new_value}</span>
                      )}
                    </div>

                    {/* Field change details */}
                    {showFieldChange && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.old_value && (
                          <span className="line-through">{entry.old_value}</span>
                        )}
                        {entry.old_value && entry.new_value && (
                          <span className="mx-1">&rarr;</span>
                        )}
                        {entry.new_value && !suffix && (
                          <span>{entry.new_value}</span>
                        )}
                      </div>
                    )}

                    {/* Comment body snippet */}
                    {isComment && entry.new_value && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                        &ldquo;{entry.new_value}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="flex-shrink-0 text-xs text-muted-foreground mt-0.5">
                    {formatTimestamp(entry.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-md hover:bg-muted"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
