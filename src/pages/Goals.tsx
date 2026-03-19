import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useGoals, useGoalMilestones, useCreateGoal, useUpdateGoal } from '@/hooks/useGoals';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Target, Plus, ChevronDown, ChevronRight, Check, Pencil, MoreHorizontal } from 'lucide-react';
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
      {status === 'completed' ? <Check className="h-3 w-3" /> : <span className={cn('h-2 w-2 rounded-full', config.color)} />}
      {config.label}
    </span>
  );
}

function ProgressBar({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  const color = value >= 100 ? 'bg-green-500' : value >= 50 ? 'bg-blue-500' : value >= 25 ? 'bg-yellow-500' : 'bg-gray-400';
  return (
    <div className={cn(h, 'w-full rounded-full bg-gray-200 dark:bg-gray-700')}>
      <div className={cn(h, 'rounded-full transition-all duration-300', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
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
          <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', m.is_completed ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-gray-600')}>
            {m.is_completed && <Check className="h-3 w-3" />}
          </span>
          <span className={cn(m.is_completed && 'line-through text-gray-400 dark:text-gray-500')}>{m.title}</span>
          {m.due_date && <span className="text-xs text-gray-400 dark:text-gray-500">{format(parseISO(m.due_date), 'MMM d')}</span>}
        </li>
      ))}
    </ul>
  );
}

function GoalCard({ goal, onEditProgress }: { goal: Goal; onEditProgress: (goal: Goal) => void }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { members } = useWorkspaceStore();

  const memberMatch = members?.find((m) => m.user_id === goal.owner_id);
  const owner = goal.owner ?? memberMatch?.profiles ?? null;
  const projectCount = goal.projects?.length ?? 0;
  const progress = goal.target_value ? Math.round((goal.current_value / goal.target_value) * 100) : 0;

  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md dark:shadow-gray-900/20 transition-shadow cursor-pointer"
      onClick={() => navigate(`/goals/${goal.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
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
                  <span className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-medium text-white" style={{ backgroundColor: getAvatarColor(owner.id) }}>
                    {getInitials(owner.full_name ?? owner.email)}
                  </span>
                  <span>{owner.full_name ?? owner.email}</span>
                </div>
              )}
              {goal.due_date && <span>Due {format(parseISO(goal.due_date), 'MMM d, yyyy')}</span>}
              {projectCount > 0 && <span>{projectCount} project{projectCount !== 1 ? 's' : ''}</span>}
            </div>
            <div className="flex items-center gap-2">
              <ProgressBar value={progress} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 w-8 text-right">{progress}%</span>
              <button
                onClick={(e) => { e.stopPropagation(); onEditProgress(goal); }}
                className="p-0.5 text-gray-400 hover:text-[#4B7C6F] opacity-0 group-hover:opacity-100"
                title="Update progress"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            {/* Linked project chips */}
            {projectCount > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {goal.projects!.slice(0, 4).map(p => (
                  <span key={p.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                ))}
                {projectCount > 4 && <span className="text-[10px] text-gray-400">+{projectCount - 4}</span>}
              </div>
            )}
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

function ProgressModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const updateGoal = useUpdateGoal();
  const [value, setValue] = useState(goal.current_value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Update Progress: {goal.title}</h3>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="range"
            min={0}
            max={goal.target_value}
            value={value}
            onChange={e => setValue(Number(e.target.value))}
            className="flex-1 accent-[#4B7C6F]"
          />
          <span className="text-sm font-bold text-gray-900 dark:text-white w-12 text-right">
            {goal.target_value ? Math.round((value / goal.target_value) * 100) : 0}%
          </span>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button
            onClick={() => {
              updateGoal.mutate({ id: goal.id, current_value: value });
              onClose();
            }}
            className="text-sm text-white bg-[#4B7C6F] px-4 py-1.5 rounded-lg hover:bg-[#3d6b5e]"
          >
            Save
          </button>
        </div>
      </div>
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
      <div role="dialog" aria-modal="true" aria-label="New Goal" className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl dark:shadow-gray-900/30" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">New Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input ref={titleRef} autoFocus className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-[#4B7C6F] focus:outline-none focus:ring-1 focus:ring-[#4B7C6F]" placeholder="e.g. Increase quarterly revenue" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea ref={descRef} rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-[#4B7C6F] focus:outline-none focus:ring-1 focus:ring-[#4B7C6F]" placeholder="What does this goal aim to achieve?" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Goal['status'])} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="missed">Missed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input ref={dueDateRef} type="date" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={createGoal.isPending} className="rounded-lg bg-[#4B7C6F] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d6b5e] disabled:opacity-50">
              {createGoal.isPending ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type StatusTab = 'all' | Goal['status'];

export default function Goals() {
  usePageTitle('Goals');
  const { currentWorkspace } = useWorkspaceStore();
  const { data: goals = [], isLoading } = useGoals(currentWorkspace?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');

  const filteredGoals = useMemo(() => {
    if (activeTab === 'all') return goals;
    return goals.filter(g => g.status === activeTab);
  }, [goals, activeTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: goals.length, on_track: 0, at_risk: 0, missed: 0, completed: 0 };
    goals.forEach(g => counts[g.status]++);
    return counts;
  }, [goals]);

  const tabs: { id: StatusTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'on_track', label: 'On Track' },
    { id: 'at_risk', label: 'At Risk' },
    { id: 'missed', label: 'Missed' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-[#4B7C6F]" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4B7C6F] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d6b5e]">
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-2 text-sm border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-[#4B7C6F] text-[#4B7C6F] font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {tab.label}
            {statusCounts[tab.id] > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{statusCounts[tab.id]}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16">
          <Target className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {activeTab === 'all' ? 'No goals yet. Create your first goal to get started.' : `No ${STATUS_CONFIG[activeTab as Goal['status']]?.label.toLowerCase()} goals.`}
          </p>
          {activeTab === 'all' && (
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4B7C6F] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d6b5e]">
              <Plus className="h-4 w-4" /> New Goal
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEditProgress={setProgressGoal} />
          ))}
        </div>
      )}

      {showCreate && <CreateGoalModal onClose={() => setShowCreate(false)} />}
      {progressGoal && <ProgressModal goal={progressGoal} onClose={() => setProgressGoal(null)} />}
    </div>
  );
}
