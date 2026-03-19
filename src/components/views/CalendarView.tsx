import { useState, useMemo, useRef, useEffect } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { useTasks, useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/useUIStore';
import { cn, getDueDateColor, getPriorityColor, getInitials, getAvatarColor } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Check, Flag } from 'lucide-react';
import type { Task } from '@/types';

interface CalendarViewProps {
  projectId: string;
  workspaceId: string;
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-300',
};

export default function CalendarView({ projectId, workspaceId }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addingTaskDate, setAddingTaskDate] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const addTaskInputRef = useRef<HTMLInputElement>(null);
  const { data: tasks = [] } = useTasks(projectId);
  const { openTaskDetail } = useUIStore();
  const { user } = useAuth();
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);

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

  useEffect(() => {
    if (addingTaskDate && addTaskInputRef.current) {
      addTaskInputRef.current.focus();
    }
  }, [addingTaskDate]);

  const handleCreateOnDate = (date: Date) => {
    setAddingTaskDate(format(date, 'yyyy-MM-dd'));
    setNewTaskTitle('');
  };

  const handleSubmitNewTask = () => {
    if (!newTaskTitle.trim() || !addingTaskDate || !user?.id) {
      setAddingTaskDate(null);
      setNewTaskTitle('');
      return;
    }
    createTask.mutate({
      title: newTaskTitle.trim(),
      project_id: projectId,
      workspace_id: workspaceId,
      due_date: addingTaskDate,
      created_by: user.id,
    });
    setAddingTaskDate(null);
    setNewTaskTitle('');
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    if (draggedTaskId) {
      updateTask.mutate({ id: draggedTaskId, due_date: dateKey });
      setDraggedTaskId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleToggleComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({ id: task.id, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null });
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setCurrentMonth(new Date())} className="text-sm text-[#4B7C6F] hover:underline px-3 py-1 bg-[#4B7C6F]/5 rounded-lg">Today</button>
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
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dateKey)}
                className={cn(
                  'bg-white dark:bg-slate-900 p-1.5 min-h-[80px] cursor-pointer transition-colors',
                  !isCurrentMonth && 'opacity-40',
                  isSelected && 'ring-2 ring-[#4B7C6F] ring-inset',
                  isToday(day) && 'bg-[#4B7C6F]/5',
                  draggedTaskId && 'hover:bg-[#4B7C6F]/10'
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn(
                    'text-xs font-medium',
                    isToday(day) ? 'bg-[#4B7C6F] text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-gray-700 dark:text-slate-300'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[9px] text-gray-400 font-medium">{dayTasks.length}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      onClick={(e) => { e.stopPropagation(); openTaskDetail(task.id); }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded truncate cursor-grab active:cursor-grabbing hover:opacity-80 flex items-center gap-1',
                        task.status === 'done' ? 'line-through opacity-50' : ''
                      )}
                      style={{ backgroundColor: (task.project?.color || '#4B7C6F') + '20', color: task.project?.color || '#4B7C6F' }}
                    >
                      {task.priority && task.priority !== 'none' && (
                        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority])} />
                      )}
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1 font-medium">+{dayTasks.length - 3} more</div>
                  )}
                  {addingTaskDate === dateKey && (
                    <input
                      ref={addTaskInputRef}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmitNewTask();
                        if (e.key === 'Escape') { setAddingTaskDate(null); setNewTaskTitle(''); }
                      }}
                      onBlur={handleSubmitNewTask}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Task name"
                      className="w-full text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#4B7C6F] outline-none text-gray-900 dark:text-white"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day sidebar */}
      {selectedDate && (
        <div className="w-72 border-l border-gray-200 dark:border-slate-800 overflow-y-auto">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{format(selectedDate, 'EEEE, MMM d')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="p-3 space-y-2">
            {selectedTasks.map(task => (
              <div key={task.id} onClick={() => openTaskDetail(task.id)} className="group p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-start gap-2">
                  <button
                    onClick={(e) => handleToggleComplete(e, task)}
                    className={cn(
                      'w-[16px] h-[16px] rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                      task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 hover:border-[#4B7C6F]'
                    )}
                  >
                    {task.status === 'done' && <Check className="w-2 h-2 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white')}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.priority && task.priority !== 'none' && (
                        <span className={cn('text-[10px] capitalize', getPriorityColor(task.priority))}>{task.priority}</span>
                      )}
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-medium" style={{ backgroundColor: getAvatarColor(task.assignee.id) }}>
                            {getInitials(task.assignee.full_name)}
                          </div>
                          <span className="text-[10px] text-gray-400">{task.assignee.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => handleCreateOnDate(selectedDate)} className="flex items-center gap-1 w-full px-2 py-2 text-xs text-[#4B7C6F] hover:bg-[#4B7C6F]/5 rounded-lg transition-colors">
              <Plus className="w-3 h-3" /> Add task for {format(selectedDate, 'MMM d')}
            </button>
            {selectedTasks.length === 0 && !addingTaskDate && (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400">No tasks on this day</p>
                <p className="text-[10px] text-gray-400 mt-1">Double-click a day to quick-add</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
