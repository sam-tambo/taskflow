import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import {
  useGoal,
  useGoalMilestones,
  useUpdateGoal,
  useDeleteGoal,
  useCreateMilestone,
  useUpdateMilestone,
  useLinkProject,
  useUnlinkProject,
} from '@/hooks/useGoals';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  Target,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowLeft,
  MoreHorizontal,
  Link2,
  X,
} from 'lucide-react';
import type { Goal, GoalMilestone, Project } from '@/types';

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
    <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className="h-2.5 rounded-full bg-blue-500 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function EditGoalModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const updateGoal = useUpdateGoal();
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Goal['status']>(goal.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGoal.mutate(
      {
        id: goal.id,
        title: titleRef.current?.value.trim() || goal.title,
        description: descRef.current?.value.trim() || null,
        status,
        due_date: dueDateRef.current?.value || null,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Edit Goal" className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl dark:shadow-gray-900/30" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              ref={titleRef}
              defaultValue={goal.title}
              autoFocus
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              ref={descRef}
              defaultValue={goal.description ?? ''}
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                defaultValue={goal.due_date ?? ''}
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
              disabled={updateGoal.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateGoal.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LinkProjectModal({
  goalId,
  linkedProjectIds,
  onClose,
}: {
  goalId: string;
  linkedProjectIds: string[];
  onClose: () => void;
}) {
  const { currentWorkspace } = useWorkspaceStore();
  const { data: allProjects = [] } = useProjects(currentWorkspace?.id ?? '');
  const linkProject = useLinkProject();
  const [search, setSearch] = useState('');

  const available = allProjects.filter(
    (p: Project) =>
      !linkedProjectIds.includes(p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Link Project" className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl dark:shadow-gray-900/30" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Link Project</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {available.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No projects available</p>
          ) : (
            available.map((project: Project) => (
              <button
                key={project.id}
                onClick={() => {
                  linkProject.mutate({ goalId, projectId: project.id }, { onSuccess: () => onClose() });
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              >
                <span
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: project.color || '#6366f1' }}
                />
                <span className="truncate">{project.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MilestonesSection({ goalId }: { goalId: string }) {
  const { data: milestones = [] } = useGoalMilestones(goalId);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const [adding, setAdding] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleRef.current?.value.trim()) return;
    createMilestone.mutate(
      {
        goal_id: goalId,
        title: titleRef.current.value.trim(),
        due_date: dueDateRef.current?.value || null,
        is_completed: false,
        position: milestones.length,
      },
      {
        onSuccess: () => {
          setAdding(false);
        },
      }
    );
  };

  const toggleComplete = (milestone: GoalMilestone) => {
    updateMilestone.mutate({
      id: milestone.id,
      is_completed: !milestone.is_completed,
      completed_at: !milestone.is_completed ? new Date().toISOString() : null,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Milestones</h3>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {milestones.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
            <button
              onClick={() => toggleComplete(m)}
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                m.is_completed
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
              )}
            >
              {m.is_completed && <Check className="h-3 w-3" />}
            </button>
            <span className={cn('flex-1 text-sm text-gray-900 dark:text-white', m.is_completed && 'line-through !text-gray-400 dark:!text-gray-500')}>
              {m.title}
            </span>
            {m.due_date && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{format(parseISO(m.due_date), 'MMM d, yyyy')}</span>
            )}
          </div>
        ))}
        {adding && (
          <form onSubmit={handleAdd} className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 px-3 py-2">
            <input
              ref={titleRef}
              autoFocus
              placeholder="Milestone title"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 text-gray-900 dark:text-white"
              required
            />
            <input
              ref={dueDateRef}
              type="date"
              className="text-xs text-gray-500 dark:text-gray-400 bg-transparent outline-none"
            />
            <button
              type="submit"
              disabled={createMilestone.isPending}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        )}
        {milestones.length === 0 && !adding && (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">No milestones yet</p>
        )}
      </div>
    </div>
  );
}

export default function GoalDetail() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { data: goal, isLoading } = useGoal(goalId);
  const deleteGoal = useDeleteGoal();
  const unlinkProject = useUnlinkProject();
  const { members } = useWorkspaceStore();

  const [showEdit, setShowEdit] = useState(false);
  const [showLinkProject, setShowLinkProject] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800 mb-6" />
        <div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <button onClick={() => navigate('/goals')} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Goals
        </button>
        <p className="text-gray-500 dark:text-gray-400">Goal not found.</p>
      </div>
    );
  }

  const memberMatch = members?.find((m) => m.user_id === goal.owner_id);
  const owner = goal.owner ?? memberMatch?.profiles ?? null;
  const linkedProjects = goal.projects ?? [];
  const progress = goal.target_value
    ? Math.round((goal.current_value / goal.target_value) * 100)
    : 0;

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this goal?')) {
      deleteGoal.mutate(goal.id, { onSuccess: () => navigate('/goals') });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Back link */}
      <button
        onClick={() => navigate('/goals')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Goals
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-6 w-6 text-blue-600 shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{goal.title}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <StatusBadge status={goal.status} />
            {owner && (
              <div className="flex items-center gap-1.5">
                {owner.avatar_url ? (
                  <img src={owner.avatar_url} className="h-5 w-5 rounded-full" alt="" />
                ) : (
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium text-white',
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
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg z-10">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowEdit(true);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Edit Goal
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleDelete();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete Goal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Description */}
      {goal.description && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{goal.description}</p>
        </div>
      )}

      {/* Linked Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Linked Projects</h3>
          <button
            onClick={() => setShowLinkProject(true)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Link2 className="h-3.5 w-3.5" />
            Link Project
          </button>
        </div>
        {linkedProjects.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            No linked projects
          </p>
        ) : (
          <div className="space-y-2">
            {linkedProjects.map((project: Project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
              >
                <span
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: project.color || '#6366f1' }}
                />
                <span
                  className="flex-1 text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {project.name}
                </span>
                <button
                  onClick={() => unlinkProject.mutate({ goalId: goal.id, projectId: project.id })}
                  className="text-gray-400 hover:text-red-500"
                  title="Unlink project"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestones */}
      <MilestonesSection goalId={goal.id} />

      {/* Modals */}
      {showEdit && <EditGoalModal goal={goal} onClose={() => setShowEdit(false)} />}
      {showLinkProject && (
        <LinkProjectModal
          goalId={goal.id}
          linkedProjectIds={linkedProjects.map((p: Project) => p.id)}
          onClose={() => setShowLinkProject(false)}
        />
      )}
    </div>
  );
}
