import { useState, useEffect, useRef } from 'react';
import { Clock, Plus, Trash2, Timer, Play, Square } from 'lucide-react';
import { useTimeEntries, useAddTimeEntry, useDeleteTimeEntry } from '@/hooks/useTimeTracking';
import { useAuth } from '@/hooks/useAuth';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { format } from 'date-fns';

interface TimeTrackerProps {
  taskId: string;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTimerDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Persist timer state in localStorage per task
function getTimerState(taskId: string): { running: boolean; startedAt: number } | null {
  try {
    const raw = localStorage.getItem(`timer-${taskId}`);
    if (raw) return JSON.parse(raw);
  } catch (_e) { /* ignore */ }
  return null;
}

function setTimerState(taskId: string, state: { running: boolean; startedAt: number } | null) {
  if (state) {
    localStorage.setItem(`timer-${taskId}`, JSON.stringify(state));
  } else {
    localStorage.removeItem(`timer-${taskId}`);
  }
}

export function TimeTracker({ taskId }: TimeTrackerProps) {
  const { user } = useAuth();
  const { data: entries = [] } = useTimeEntries(taskId);
  const addEntry = useAddTimeEntry(taskId);
  const deleteEntry = useDeleteTimeEntry(taskId);
  const [isAdding, setIsAdding] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  // Restore timer on mount
  useEffect(() => {
    const saved = getTimerState(taskId);
    if (saved?.running) {
      const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
      setElapsedSeconds(elapsed);
      startedAtRef.current = saved.startedAt;
      setTimerRunning(true);
    }
  }, [taskId]);

  // Timer interval
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const startTimer = () => {
    const now = Date.now();
    startedAtRef.current = now;
    setElapsedSeconds(0);
    setTimerRunning(true);
    setTimerState(taskId, { running: true, startedAt: now });
  };

  const stopTimer = () => {
    setTimerRunning(false);
    setTimerState(taskId, null);
    if (timerRef.current) clearInterval(timerRef.current);

    const totalMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    if (user) {
      addEntry.mutate({
        task_id: taskId,
        user_id: user.id,
        duration_minutes: totalMinutes,
        description: 'Timer session',
      });
    }
    setElapsedSeconds(0);
  };

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);

  const handleAdd = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const total = h * 60 + m;
    if (total <= 0) return;
    if (!user) return;

    addEntry.mutate({
      task_id: taskId,
      user_id: user.id,
      duration_minutes: total,
      description: description.trim() || undefined,
    });
    setHours('');
    setMinutes('');
    setDescription('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5" /> Time Tracked
          {totalMinutes > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-semibold">
              {formatDuration(totalMinutes)}
            </span>
          )}
        </span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs text-[#4B7C6F] hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Log time
        </button>
      </div>

      {/* Timer widget */}
      <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
        {timerRunning ? (
          <>
            <div className="flex-1">
              <span className="text-lg font-mono font-bold text-[#4B7C6F]">{formatTimerDisplay(elapsedSeconds)}</span>
              <span className="text-xs text-gray-400 ml-2">Running...</span>
            </div>
            <button
              onClick={stopTimer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
            >
              <Square className="w-3 h-3" /> Stop
            </button>
          </>
        ) : (
          <>
            <div className="flex-1">
              <span className="text-sm text-gray-500 dark:text-slate-400">Start a timer</span>
            </div>
            <button
              onClick={startTimer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#4B7C6F] rounded-lg hover:bg-[#3d6b5e]"
            >
              <Play className="w-3 h-3" /> Start
            </button>
          </>
        )}
      </div>

      {/* Manual log form */}
      {isAdding && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Log time manually</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-medium text-gray-400 block mb-0.5">Hours</label>
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md outline-none text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-medium text-gray-400 block mb-0.5">Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on? (optional)"
            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md outline-none text-gray-900 dark:text-white"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <div className="flex gap-2">
            <button onClick={() => setIsAdding(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={(!hours && !minutes) || addEntry.isPending}
              className="text-xs text-white bg-[#4B7C6F] px-3 py-1 rounded-md hover:bg-[#3d6b5e] disabled:opacity-50"
            >
              Log
            </button>
          </div>
        </div>
      )}

      {/* Entries */}
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.id} className="group flex items-center gap-2 py-1 px-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(entry.user_id || '') }}>
                {getInitials(entry.user?.full_name || null)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{formatDuration(entry.duration_minutes)}</span>
                {entry.description && <span className="text-xs text-gray-500 ml-1.5">— {entry.description}</span>}
              </div>
              <span className="text-[10px] text-gray-400">{format(new Date(entry.created_at), 'MMM d')}</span>
              <button
                onClick={() => deleteEntry.mutate(entry.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !isAdding && !timerRunning && (
        <p className="text-xs text-gray-400">No time logged</p>
      )}
    </div>
  );
}
