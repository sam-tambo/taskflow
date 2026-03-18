import { useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isWithinInterval,
  isSameDay,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Users, Settings, X, GripVertical } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Task {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  due_date: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  assignee?: Profile;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: string;
  profiles?: Profile;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-400 text-white',
  medium: 'bg-yellow-400 text-yellow-900',
  low: 'bg-blue-400 text-white',
  none: 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
};

function getCapacityHours(): number {
  const stored = localStorage.getItem('taskflow_capacity_hours');
  if (stored) {
    const n = Number(stored);
    if (!isNaN(n) && n > 0) return n;
  }
  return 8;
}

function hoursStyle(hours: number) {
  if (hours === 0) return 'text-gray-400 dark:text-gray-500';
  if (hours <= 6) return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400';
  if (hours <= 8) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400';
  return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
}

function taskVisibleOnDay(task: Task, day: Date, today: Date): boolean {
  const start = task.start_date ? parseISO(task.start_date) : null;
  const end = task.due_date ? parseISO(task.due_date) : null;

  if (start && end) {
    return isWithinInterval(day, { start, end });
  }
  if (start && !end) {
    return isSameDay(day, start) || day > start;
  }
  if (!start && end) {
    return isSameDay(day, end) || day < end;
  }
  // No dates – show on today
  return isSameDay(day, today);
}

function taskSpanInfo(task: Task, weekDays: Date[], today: Date) {
  const start = task.start_date ? parseISO(task.start_date) : null;
  const end = task.due_date ? parseISO(task.due_date) : null;

  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < weekDays.length; i++) {
    if (taskVisibleOnDay(task, weekDays[i], today)) {
      if (startIdx === -1) startIdx = i;
      endIdx = i;
    }
  }

  return { startIdx, endIdx, span: endIdx - startIdx + 1 };
}

function hoursForDay(task: Task, day: Date, today: Date): number {
  if (!taskVisibleOnDay(task, day, today)) return 0;
  const est = task.estimated_hours ?? 0;
  if (est === 0) return 0;

  const start = task.start_date ? parseISO(task.start_date) : null;
  const end = task.due_date ? parseISO(task.due_date) : null;

  if (start && end) {
    const days = eachDayOfInterval({ start, end });
    const totalDays = days.length || 1;
    return est / totalDays;
  }

  return est;
}

// ---------------------------------------------------------------------------
// DraggableTaskChip
// ---------------------------------------------------------------------------

function DraggableTaskChip({
  task,
  span,
}: {
  task: Task;
  span: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style: React.CSSProperties = {
    gridColumn: `span ${span}`,
    ...(transform
      ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
      : {}),
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        'flex items-center gap-1 rounded px-2 py-1 text-xs font-medium truncate cursor-grab select-none',
        PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.none,
        isDragging && 'opacity-50 shadow-lg ring-2 ring-indigo-400 z-50'
      )}
      title={task.title}
    >
      <GripVertical className="h-3 w-3 shrink-0 opacity-60" />
      <span className="truncate">{task.title}</span>
      {task.estimated_hours ? (
        <span className="ml-auto shrink-0 opacity-75">{task.estimated_hours}h</span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DroppablePersonRow
// ---------------------------------------------------------------------------

function DroppablePersonRow({
  memberId,
  profile,
  tasks,
  weekDays,
  today,
  capacity,
}: {
  memberId: string;
  profile: Profile | null;
  tasks: Task[];
  weekDays: Date[];
  today: Date;
  capacity: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: memberId });

  const dailyHours = useMemo(() => {
    return weekDays.map((day) => {
      let total = 0;
      for (const t of tasks) {
        total += hoursForDay(t, day, today);
      }
      return Math.round(total * 10) / 10;
    });
  }, [tasks, weekDays, today]);

  const displayName = profile?.full_name || profile?.email || 'Unknown';
  const initials = profile ? getInitials(profile.full_name || profile.email) : '?';
  const avatarColor = profile ? getAvatarColor(profile.full_name || profile.email) : 'bg-gray-400';

  // Build task bar rows – each task gets its own row
  const taskRows = useMemo(() => {
    return tasks
      .map((task) => {
        const info = taskSpanInfo(task, weekDays, today);
        if (info.startIdx === -1) return null;
        return { task, ...info };
      })
      .filter(Boolean) as { task: Task; startIdx: number; endIdx: number; span: number }[];
  }, [tasks, weekDays, today]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-b border-gray-200 dark:border-gray-700 transition-colors',
        isOver && 'bg-indigo-50 dark:bg-indigo-900/20'
      )}
    >
      {/* Header row: avatar + daily hours */}
      <div className="grid grid-cols-[200px_repeat(7,1fr)] items-center">
        <div className="flex items-center gap-2 px-3 py-2 border-r border-gray-200 dark:border-gray-700">
          <div
            className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0',
              avatarColor
            )}
          >
            {initials}
          </div>
          <span className="text-sm font-medium truncate text-gray-900 dark:text-white">{displayName}</span>
        </div>
        {dailyHours.map((h, i) => (
          <div
            key={i}
            className={cn(
              'text-center text-xs font-semibold py-2 border-r border-gray-100 dark:border-gray-700 last:border-r-0',
              hoursStyle(h)
            )}
          >
            {h}h
          </div>
        ))}
      </div>

      {/* Task chip rows */}
      {taskRows.length > 0 && (
        <div className="pl-[200px]">
          {taskRows.map(({ task, startIdx, span }) => (
            <div
              key={task.id}
              className="grid grid-cols-7 py-0.5 px-1"
            >
              {/* Spacer columns before the chip */}
              {startIdx > 0 && <div style={{ gridColumn: `span ${startIdx}` }} />}
              <DraggableTaskChip task={task} span={span} />
              {/* Spacer columns after the chip */}
              {startIdx + span < 7 && (
                <div style={{ gridColumn: `span ${7 - startIdx - span}` }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CapacityModal
// ---------------------------------------------------------------------------

function CapacityModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [hours, setHours] = useState(() => getCapacityHours());
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleSave() {
    const val = Math.max(1, Math.min(24, hours));
    localStorage.setItem('taskflow_capacity_hours', String(val));
    toast.success(`Capacity set to ${val} hours/day`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Capacity Settings" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/30 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Capacity Settings</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Working hours per day
        </label>
        <input
          ref={inputRef}
          type="number"
          min={1}
          max={24}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Days with hours exceeding this value will be marked as over-capacity.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workload Page
// ---------------------------------------------------------------------------

export default function Workload() {
  const { currentWorkspace, members } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [capacityOpen, setCapacityOpen] = useState(false);

  const capacity = getCapacityHours();
  const today = useMemo(() => new Date(), []);

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 }),
    [today, weekOffset]
  );
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  const workspaceId = currentWorkspace?.id;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['workload-tasks', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*)')
        .eq('workspace_id', workspaceId)
        .is('parent_task_id', null);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    enabled: !!workspaceId,
  });

  // Group tasks by assignee
  const { assignedGroups, unassignedTasks } = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const unassigned: Task[] = [];

    for (const task of tasks) {
      if (task.status === 'cancelled' || task.status === 'done') continue;
      if (!task.assignee_id) {
        unassigned.push(task);
      } else {
        if (!groups[task.assignee_id]) groups[task.assignee_id] = [];
        groups[task.assignee_id].push(task);
      }
    }

    return { assignedGroups: groups, unassignedTasks: unassigned };
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const newAssigneeId = over.id as string;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // "unassigned" droppable id means set assignee to null
      const targetAssigneeId = newAssigneeId === 'unassigned' ? null : newAssigneeId;

      if (task.assignee_id === targetAssigneeId) return;

      // Find target member name
      let targetName = 'Unassigned';
      if (targetAssigneeId) {
        const member = members.find((m: WorkspaceMember) => m.user_id === targetAssigneeId);
        targetName = member?.profiles?.full_name || member?.profiles?.email || 'member';
      }

      // Optimistic update
      queryClient.setQueryData(
        ['workload-tasks', workspaceId],
        (old: Task[] | undefined) =>
          (old ?? []).map((t) =>
            t.id === taskId ? { ...t, assignee_id: targetAssigneeId } : t
          )
      );

      toast.success(`Task reassigned to ${targetName}`);

      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: targetAssigneeId })
        .eq('id', taskId);

      if (error) {
        toast.error('Failed to reassign task');
        queryClient.invalidateQueries({ queryKey: ['workload-tasks', workspaceId] });
      }
    },
    [tasks, members, queryClient, workspaceId]
  );

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Select a workspace to view workload.
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Workload</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Week navigation */}
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[180px] text-center">
              Week of {format(weekStart, 'MMM d')} &ndash; {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-1"
              >
                Today
              </button>
            )}

            <button
              onClick={() => setCapacityOpen(true)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title="Capacity settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 shrink-0">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-r border-gray-200 dark:border-gray-700">
            Team Member
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'text-center py-2 text-xs font-semibold border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                isSameDay(day, today)
                  ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              <div>{format(day, 'EEE')}</div>
              <div className="text-[11px] font-normal">{format(day, 'MMM d')}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500 text-sm">
              Loading workload data...
            </div>
          ) : (
            <>
              {/* Member rows */}
              {members.map((member: WorkspaceMember) => {
                const userId = member.user_id;
                const profile = member.profiles ?? null;
                const memberTasks = assignedGroups[userId] ?? [];

                return (
                  <DroppablePersonRow
                    key={userId}
                    memberId={userId}
                    profile={profile}
                    tasks={memberTasks}
                    weekDays={weekDays}
                    today={today}
                    capacity={capacity}
                  />
                );
              })}

              {/* Unassigned section */}
              <div className="border-t-2 border-gray-300 dark:border-gray-600 mt-2">
                <DroppablePersonRow
                  memberId="unassigned"
                  profile={{
                    id: 'unassigned',
                    email: 'unassigned',
                    full_name: 'Unassigned',
                    avatar_url: null,
                  }}
                  tasks={unassignedTasks}
                  weekDays={weekDays}
                  today={today}
                  capacity={capacity}
                />
              </div>

              {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                  <Users className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">No tasks found in this workspace.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CapacityModal open={capacityOpen} onClose={() => setCapacityOpen(false)} />
    </DndContext>
  );
}
