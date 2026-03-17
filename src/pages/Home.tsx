import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMyTasks } from '@/hooks/useTasks';
import { TaskRow } from '@/components/tasks/TaskRow';
import { useUIStore } from '@/stores/useUIStore';
import { isToday, isBefore, isThisWeek, parseISO, addDays } from 'date-fns';
import { ClipboardList, Sun, CalendarClock, Calendar, CircleDashed } from 'lucide-react';
import type { Task } from '@/types';

export default function Home() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useMyTasks(user?.id);

  const sections = useMemo(() => {
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const later: Task[] = [];
    const noDate: Task[] = [];

    tasks.forEach((task) => {
      if (!task.due_date) {
        noDate.push(task);
      } else {
        const date = parseISO(task.due_date);
        if (isToday(date) || isBefore(date, new Date())) {
          today.push(task);
        } else if (isThisWeek(date)) {
          upcoming.push(task);
        } else {
          later.push(task);
        }
      }
    });

    return [
      { id: 'today', label: 'Today', icon: Sun, tasks: today, color: 'text-coral' },
      { id: 'upcoming', label: 'Upcoming', icon: CalendarClock, tasks: upcoming, color: 'text-blue-500' },
      { id: 'later', label: 'Later', icon: Calendar, tasks: later, color: 'text-gray-500' },
      { id: 'no-date', label: 'No Due Date', icon: CircleDashed, tasks: noDate, color: 'text-gray-400' },
    ];
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="skeleton h-12 w-48 rounded-xl" />
        {[1,2,3].map(i => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you</p>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-20 h-20 mx-auto mb-4 text-gray-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">You're all caught up!</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Tasks assigned to you will appear here.</p>
        </div>
      )}

      {sections.map(({ id, label, icon: Icon, tasks: sectionTasks, color }) => (
        sectionTasks.length > 0 && (
          <div key={id} className="mb-6">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{label}</h2>
              <span className="text-xs text-gray-400">{sectionTasks.length}</span>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
              {sectionTasks.map((task) => (
                <TaskRow key={task.id} task={task} projectId={task.project_id || undefined} />
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}
