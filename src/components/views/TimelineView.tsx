import { useMemo, useState, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useSections } from '@/hooks/useProjects';
import { useUIStore } from '@/stores/useUIStore';
import { cn, getAvatarColor, getInitials, getPriorityColor } from '@/lib/utils';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, startOfWeek, isToday, parseISO } from 'date-fns';
import { Diamond, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '@/types';

interface TimelineViewProps {
  projectId: string;
  workspaceId: string;
}

type Zoom = 'days' | 'weeks' | 'months';

export default function TimelineView({ projectId }: TimelineViewProps) {
  const { data: tasks = [] } = useTasks(projectId);
  const { data: sections = [] } = useSections(projectId);
  const { openTaskDetail } = useUIStore();
  const [zoom, setZoom] = useState<Zoom>('weeks');
  const [monthOffset, setMonthOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const baseMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const start = startOfMonth(baseMonth);
  const end = endOfMonth(addDays(baseMonth, 60));
  const days = eachDayOfInterval({ start, end });

  const dayWidth = zoom === 'days' ? 40 : zoom === 'weeks' ? 20 : 6;
  const totalWidth = days.length * dayWidth;

  const tasksWithDates = tasks.filter(t => t.start_date || t.due_date);

  const getBarStyle = (task: Task) => {
    const taskStart = task.start_date ? parseISO(task.start_date) : task.due_date ? parseISO(task.due_date) : today;
    const taskEnd = task.due_date ? parseISO(task.due_date) : addDays(taskStart, 3);
    const left = Math.max(0, differenceInDays(taskStart, start)) * dayWidth;
    const width = Math.max(1, differenceInDays(taskEnd, taskStart) + 1) * dayWidth;
    return { left, width };
  };

  const todayOffset = differenceInDays(today, start) * dayWidth;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-slate-800">
        <button onClick={() => setMonthOffset(m => m - 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-white">{format(baseMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setMonthOffset(m => m + 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="ml-auto flex gap-1">
          {(['days', 'weeks', 'months'] as Zoom[]).map((z) => (
            <button key={z} onClick={() => setZoom(z)} className={cn('px-2 py-1 text-xs rounded', zoom === z ? 'bg-[#16A34A] text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800')}>
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Task list */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-slate-800 overflow-y-auto">
          {tasksWithDates.map((task) => (
            <div key={task.id} onClick={() => openTaskDetail(task.id)} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer text-sm">
              {task.is_milestone ? (
                <Diamond className="w-3.5 h-3.5 text-[#4B7C6F] flex-shrink-0" />
              ) : (
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: task.assignee ? getAvatarColor(task.assignee.id) : '#ccc' }} />
              )}
              <span className="truncate text-gray-900 dark:text-white">{task.title}</span>
            </div>
          ))}
          {tasksWithDates.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-400">No tasks with dates</p>
              <p className="text-xs text-gray-400 mt-1">Add start/due dates to see tasks on the timeline</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div ref={containerRef} className="flex-1 overflow-auto relative">
          {/* Date headers */}
          <div className="sticky top-0 z-10 flex bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800" style={{ width: totalWidth }}>
            {days.map((day, i) => (
              <div key={i} className={cn('flex-shrink-0 text-center text-xs py-2 border-r border-gray-100 dark:border-slate-800', isToday(day) && 'bg-[#4B7C6F]/10 font-semibold text-[#4B7C6F]')} style={{ width: dayWidth }}>
                {zoom === 'days' && format(day, 'd')}
                {zoom === 'weeks' && (day.getDay() === 1 || i === 0) && format(day, 'MMM d')}
                {zoom === 'months' && day.getDate() === 1 && format(day, 'MMM')}
              </div>
            ))}
          </div>

          {/* Task bars */}
          <div className="relative" style={{ width: totalWidth }}>
            {/* Today line */}
            {todayOffset > 0 && todayOffset < totalWidth && (
              <div className="absolute top-0 bottom-0 w-px bg-red-500 z-20" style={{ left: todayOffset + dayWidth / 2 }} />
            )}

            {tasksWithDates.map((task, index) => {
              const { left, width } = getBarStyle(task);
              return (
                <div key={task.id} className="relative" style={{ height: 36 }}>
                  {task.is_milestone ? (
                    <div
                      onClick={() => openTaskDetail(task.id)}
                      className="absolute top-2 cursor-pointer z-10"
                      style={{ left: left + width / 2 - 8 }}
                    >
                      <Diamond className="w-4 h-4 text-[#4B7C6F] fill-[#4B7C6F]" />
                    </div>
                  ) : (
                    <div
                      onClick={() => openTaskDetail(task.id)}
                      className={cn('absolute top-1.5 h-6 rounded-full cursor-pointer transition-opacity hover:opacity-80', task.status === 'done' ? 'bg-green-400' : 'bg-[#16A34A]')}
                      style={{ left, width: Math.max(width, dayWidth) }}
                      title={task.title}
                    >
                      <span className="text-[10px] text-white font-medium px-2 truncate block leading-6">{task.title}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
