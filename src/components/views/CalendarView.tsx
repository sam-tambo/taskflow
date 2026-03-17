import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, isSameMonth, isToday, isSameDay, parseISO, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { useTasks, useCreateTask } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/useUIStore';
import { cn, getDueDateColor } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Task } from '@/types';

interface CalendarViewProps {
  projectId: string;
  workspaceId: string;
}

export default function CalendarView({ projectId, workspaceId }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { data: tasks = [] } = useTasks(projectId);
  const { openTaskDetail } = useUIStore();
  const { user } = useAuth();
  const createTask = useCreateTask(projectId);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      if (t.due_date) {
        const key = t.due_date;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
    });
    return map;
  }, [tasks]);

  const selectedTasks = selectedDate ? (tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []) : [];

  const handleCreateOnDate = (date: Date) => {
    const title = prompt('Task name:');
    if (title?.trim()) {
      createTask.mutate({
        title: title.trim(),
        project_id: projectId,
        workspace_id: workspaceId,
        due_date: format(date, 'yyyy-MM-dd'),
        created_by: user?.id,
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Calendar grid */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setCurrentMonth(new Date())} className="text-sm text-coral hover:underline">Today</button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-slate-400 py-2">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 flex-1 gap-px bg-gray-200 dark:bg-slate-800 rounded-xl overflow-hidden">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={() => handleCreateOnDate(day)}
                className={cn(
                  'bg-white dark:bg-slate-900 p-1.5 min-h-[80px] cursor-pointer transition-colors',
                  !isCurrentMonth && 'opacity-40',
                  isSelected && 'ring-2 ring-coral ring-inset',
                  isToday(day) && 'bg-coral/5'
                )}
              >
                <div className={cn('text-xs font-medium mb-1', isToday(day) ? 'text-coral' : 'text-gray-700 dark:text-slate-300')}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      onClick={(e) => { e.stopPropagation(); openTaskDetail(task.id); }}
                      className="text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: task.project?.color || '#F97316', color: 'white' }}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1">+{dayTasks.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day sidebar */}
      {selectedDate && (
        <div className="w-64 border-l border-gray-200 dark:border-slate-800 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{format(selectedDate, 'EEEE, MMM d')}</h3>
          <p className="text-xs text-gray-500 mb-3">{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}</p>
          <div className="space-y-2">
            {selectedTasks.map(task => (
              <div key={task.id} onClick={() => openTaskDetail(task.id)} className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                {task.assignee && <p className="text-xs text-gray-500 mt-1">{task.assignee.full_name}</p>}
              </div>
            ))}
            {selectedTasks.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400">No tasks</p>
                <button onClick={() => handleCreateOnDate(selectedDate)} className="flex items-center gap-1 mx-auto mt-2 text-xs text-coral hover:underline">
                  <Plus className="w-3 h-3" /> Add task
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
