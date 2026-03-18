import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useGoals, useGoalMilestones, useCreateGoal } from '@/hooks/useGoals';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Target, Plus, ChevronDown, ChevronRight, Check } from 'lucide-react';
import type { Goal, GoalMilestone } from '@/types';

const STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; bg: string }> = {
  on_track: { label: 'On Track', color: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  at_risk: { label: 'At Risk', color: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  missed: { label: 'Missed', color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  completed: { label: 'Completed', color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
};

function StatusBadge({ status }: { status: Goal['status'] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', config.bg)}>
      {status === 'completed' ? (
        <Check className="h-3 w-3" />
      ) : (
        <span className={cn('h-2 w-2 rounded-full', config.color)} />
      )}
      {config.label}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className="h-2 rounded-full bg-blue-500 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function MilestoneList({ goalId }: { goalId: string }) {
  const { data: milestones = [] } = useGoalMilestones(goalId);
  if (milestones.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1 pl-4">
      {milestones.map((m) => (
        <li key={m.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
              m.is_completed ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-gray-600'
            )}
          >
            {m.is_completed && <Check className="h-3 w-3" />}
          </span>
          <span className={cn(m.is_completed && 'line-through text-gray-400 dark:text-gray-500')}>{m.title}</span>
          {m.due_date && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{format(parseISO(m.due_date), 'MMM d')}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { members } = useWorkspaceStore();

  const memberMatch = members?.find((m) => m.user_id === goal.owner_id);
  const owner = goal.owner ?? memberMatch?.profiles ?? null;
  const projectCount = goal.projects?.length ?? 0;

  // Calculate progress from linked projects (placeholder: use current_value/target_value or 0)
  const progress = goal.target_value
    ? Math.round((goal.current_value / goal.target_value) * 100)
    : 0;

  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md dark:shadow-gray-900/20 transition-shadow cursor-pointer"
      onClick={() => navigate(`/goals/${goal.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={goal.status} />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{goal.title}</h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
              {owner && (
                <div className="flex items-center gap-1">
                  {owner.avatar_url ? (
                    <img src={owner.avatar_url} className="h-4 w-4 rounded-full" alt="" />
                  ) : (
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-medium text-white',
                        getAvatarColor(owner.full_name ?? owner.email)
                      )}
                    >
                      {getInitials(owner.full_name ?? owner.email)}
                    </span>
                  )}
                  <span>{owner.full_name ?? owner.email}</span>
                </div>
              )}
              {goal.due_date && <span>Due {format(parseISO(goal.due_date), 'MMM d, yyyy')}</span>}
              {projectCount > 0 && (
                <span>
                  {projectCount} project{projectCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ProgressBar value={progress} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t dark:border-gray-700 pt-3" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Milestones</p>
          <MilestoneList goalId={goal.id} />
        </div>
      )}
    </div>
  );
}

function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const createGoal = useCreateGoal();
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Goal['status']>('on_track');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !titleRef.current?.value.trim()) return;
    createGoal.mutate(
      {
        workspace_id: currentWorkspace.id,
        title: titleRef.current.value.trim(),
        description: descRef.current?.value.trim() || null,
        owner_id: user?.id ?? null,
        status,
        due_date: dueDateRef.current?.value || null,
        current_value: 0,
        target_value: 100,
        unit: '%',
        color: '#4f46e5',
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div
        role="dialog" aria-modal="true" aria-label="New Goal"
        className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl dark:shadow-gray-900/30"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">New Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              ref={titleRef}
              autoFocus
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Increase quarterly revenue"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              ref={descRef}
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="What does this goal aim to achieve?"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Goal['status'])}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="missed">Missed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                ref={dueDateRef}
                type="date"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createGoal.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createGoal.isPending ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Goals() {
  usePageTitle('Goals');
  const { currentWorkspace } = useWorkspaceStore();
  const { data: goals = [], isLoading } = useGoals(currentWorkspace?.id);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Goal
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16">
          <Target className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No goals yet. Create your first goal to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {showCreate && <CreateGoalModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
