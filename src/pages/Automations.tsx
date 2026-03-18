import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Zap,
  Plus,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  X,
  ChevronRight,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Pencil,
  Trash2,
  History,
} from 'lucide-react';
import type { AutomationRule } from '@/types';

// ── Constants ──────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: 'task_created', label: 'Task is created', description: 'When a new task is added' },
  { value: 'status_changed', label: 'Status changes', description: 'When a task status is updated' },
  { value: 'priority_changed', label: 'Priority changes', description: 'When task priority is updated' },
  { value: 'assignee_changed', label: 'Assignee changes', description: 'When a task is reassigned' },
  { value: 'task_completed', label: 'Task is completed', description: 'When a task is marked complete' },
  { value: 'due_date_approaching', label: 'Due date approaching', description: 'Before a task is due' },
];

const ACTION_TYPES = [
  { value: 'assign_to', label: 'Assign to member' },
  { value: 'move_to_section', label: 'Move to section' },
  { value: 'set_priority', label: 'Set priority' },
  { value: 'send_notification', label: 'Send notification' },
  { value: 'add_tag', label: 'Add tag' },
];

const CONDITION_FIELDS = [
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'assignee_id', label: 'Assignee' },
  { value: 'title', label: 'Title' },
];

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const PRIORITY_OPTIONS = ['none', 'low', 'medium', 'high', 'urgent'];
const STATUS_OPTIONS = ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'];

// ── Types ──────────────────────────────────────────────────────────────

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface RuleFormState {
  name: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: Condition[];
  action_type: string;
  action_config: Record<string, any>;
  project_id: string | null;
}

const defaultForm: RuleFormState = {
  name: '',
  trigger_type: '',
  trigger_config: {},
  conditions: [],
  action_type: '',
  action_config: {},
  project_id: null,
};

// ── Main Page ──────────────────────────────────────────────────────────

export default function Automations() {
  const { currentWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation_rules', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AutomationRule[];
    },
    enabled: !!currentWorkspace,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
    },
    onError: () => toast.error('Failed to update automation'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Automation deleted');
    },
    onError: () => toast.error('Failed to delete automation'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (rule: AutomationRule) => {
      const { error } = await supabase.from('automation_rules').insert({
        workspace_id: rule.workspace_id,
        project_id: rule.project_id,
        name: `${rule.name} (copy)`,
        is_active: false,
        trigger_type: rule.trigger_type,
        trigger_config: rule.trigger_config,
        condition_config: rule.condition_config,
        action_type: rule.action_type,
        action_config: rule.action_config,
        run_count: 0,
        created_by: rule.created_by,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Automation duplicated');
    },
    onError: () => toast.error('Failed to duplicate automation'),
  });

  function handleEdit(rule: AutomationRule) {
    setEditingRule(rule);
    setShowBuilder(true);
    setOpenMenuId(null);
  }

  function handleDuplicate(rule: AutomationRule) {
    duplicateMutation.mutate(rule);
    setOpenMenuId(null);
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
    setOpenMenuId(null);
  }

  function handleCloseBuilder() {
    setShowBuilder(false);
    setEditingRule(null);
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Automations</h1>
              <p className="text-sm text-zinc-400">
                Automate repetitive tasks with rules
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingRule(null);
              setShowBuilder(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Automation
          </button>
        </div>

        {/* Rules list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-zinc-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <EmptyState onCreateClick={() => setShowBuilder(true)} />
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                isMenuOpen={openMenuId === rule.id}
                onToggleMenu={() => setOpenMenuId(openMenuId === rule.id ? null : rule.id)}
                onToggleActive={(active) =>
                  toggleMutation.mutate({ id: rule.id, is_active: active })
                }
                onEdit={() => handleEdit(rule)}
                onDuplicate={() => handleDuplicate(rule)}
                onDelete={() => handleDelete(rule.id)}
                onViewHistory={() => {
                  setShowHistory(rule.id);
                  setOpenMenuId(null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showBuilder && (
        <RuleBuilderModal
          editingRule={editingRule}
          onClose={handleCloseBuilder}
        />
      )}

      {showHistory && (
        <RunHistoryModal
          ruleId={showHistory}
          onClose={() => setShowHistory(null)}
        />
      )}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
        <Zap className="w-10 h-10 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">
        No automations yet
      </h3>
      <p className="text-sm text-zinc-400 mb-6 max-w-md">
        Create rules to automate repetitive tasks. For example, automatically assign tasks
        or change priorities when certain conditions are met.
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create your first automation
      </button>
    </div>
  );
}

// ── Rule Card ──────────────────────────────────────────────────────────

function RuleCard({
  rule,
  isMenuOpen,
  onToggleMenu,
  onToggleActive,
  onEdit,
  onDuplicate,
  onDelete,
  onViewHistory,
}: {
  rule: AutomationRule;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onToggleActive: (active: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggleMenu();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMenuOpen, onToggleMenu]);

  const triggerLabel =
    TRIGGER_TYPES.find((t) => t.value === rule.trigger_type)?.label ?? rule.trigger_type;
  const actionLabel =
    ACTION_TYPES.find((a) => a.value === rule.action_type)?.label ?? rule.action_type;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border transition-colors',
        rule.is_active
          ? 'bg-zinc-800/60 border-zinc-700'
          : 'bg-zinc-800/30 border-zinc-800 opacity-60'
      )}
    >
      {/* Toggle */}
      <button
        onClick={() => onToggleActive(!rule.is_active)}
        className="shrink-0"
        title={rule.is_active ? 'Disable' : 'Enable'}
      >
        {rule.is_active ? (
          <ToggleRight className="w-8 h-5 text-indigo-400" />
        ) : (
          <ToggleLeft className="w-8 h-5 text-zinc-500" />
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-white truncate">{rule.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
          <span className="px-1.5 py-0.5 rounded bg-zinc-700/60 truncate max-w-[120px] sm:max-w-none">{triggerLabel}</span>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span className="px-1.5 py-0.5 rounded bg-zinc-700/60 truncate max-w-[120px] sm:max-w-none">{actionLabel}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-500 shrink-0">
        <div className="flex items-center gap-1" title="Total runs">
          <Play className="w-3 h-3" />
          {rule.run_count ?? 0}
        </div>
        {rule.last_run_at && (
          <div className="flex items-center gap-1" title="Last run">
            <Clock className="w-3 h-3" />
            {new Date(rule.last_run_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={onToggleMenu}
          className="p-1 rounded hover:bg-zinc-700 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4 text-zinc-400" />
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 top-8 w-44 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
            <MenuButton icon={Pencil} label="Edit" onClick={onEdit} />
            <MenuButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
            <MenuButton icon={History} label="Run history" onClick={onViewHistory} />
            <div className="border-t border-zinc-700 my-1" />
            <MenuButton icon={Trash2} label="Delete" onClick={onDelete} danger />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors',
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-zinc-300 hover:bg-zinc-700'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ── Rule Builder Modal ─────────────────────────────────────────────────

function RuleBuilderModal({
  editingRule,
  onClose,
}: {
  editingRule: AutomationRule | null;
  onClose: () => void;
}) {
  const { currentWorkspace, members } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<RuleFormState>(() => {
    if (editingRule) {
      return {
        name: editingRule.name,
        trigger_type: editingRule.trigger_type,
        trigger_config: editingRule.trigger_config ?? {},
        conditions: editingRule.condition_config?.conditions ?? [],
        action_type: editingRule.action_type,
        action_config: editingRule.action_config ?? {},
        project_id: editingRule.project_id,
      };
    }
    return { ...defaultForm };
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const payload = {
        workspace_id: currentWorkspace.id,
        project_id: form.project_id,
        name: form.name || 'Untitled Automation',
        trigger_type: form.trigger_type,
        trigger_config: form.trigger_config,
        condition_config: { conditions: form.conditions },
        action_type: form.action_type,
        action_config: form.action_config,
        is_active: true,
      };

      if (editingRule) {
        const { error } = await supabase
          .from('automation_rules')
          .update(payload)
          .eq('id', editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('automation_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success(editingRule ? 'Automation updated' : 'Automation created');
      onClose();
    },
    onError: () => toast.error('Failed to save automation'),
  });

  const steps = ['Trigger', 'Conditions', 'Action'];

  const canAdvance = () => {
    if (step === 0) return !!form.trigger_type;
    if (step === 1) return true; // conditions are optional
    if (step === 2) return !!form.action_type && !!form.name.trim();
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Automation Rule" className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">
            {editingRule ? 'Edit Automation' : 'New Automation'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-zinc-800">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
              <button
                onClick={() => i <= step && setStep(i)}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                  i === step
                    ? 'bg-indigo-600 text-white'
                    : i < step
                    ? 'bg-zinc-700 text-zinc-300 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-500'
                )}
              >
                {label}
              </button>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {step === 0 && (
            <TriggerStep form={form} onChange={setForm} />
          )}
          {step === 1 && (
            <ConditionsStep form={form} onChange={setForm} members={members} />
          )}
          {step === 2 && (
            <ActionStep form={form} onChange={setForm} members={members} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {step > 0 ? 'Back' : 'Cancel'}
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!canAdvance() || saveMutation.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saveMutation.isPending
                ? 'Saving...'
                : editingRule
                ? 'Update Automation'
                : 'Create Automation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Trigger ────────────────────────────────────────────────────

function TriggerStep({
  form,
  onChange,
}: {
  form: RuleFormState;
  onChange: (f: RuleFormState) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400 mb-4">
        Choose what event will trigger this automation.
      </p>
      {TRIGGER_TYPES.map((trigger) => (
        <label
          key={trigger.value}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
            form.trigger_type === trigger.value
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-zinc-700 hover:border-zinc-600'
          )}
        >
          <input
            type="radio"
            name="trigger"
            value={trigger.value}
            checked={form.trigger_type === trigger.value}
            onChange={() =>
              onChange({ ...form, trigger_type: trigger.value, trigger_config: {} })
            }
            className="mt-0.5 accent-indigo-500"
          />
          <div>
            <div className="text-sm font-medium text-white">{trigger.label}</div>
            <div className="text-xs text-zinc-400">{trigger.description}</div>
          </div>
        </label>
      ))}

      {/* Extra config for status_changed */}
      {form.trigger_type === 'status_changed' && (
        <div className="ml-6 mt-2 space-y-2 p-3 bg-zinc-800/50 rounded-lg">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">From status (optional)</label>
            <select
              value={form.trigger_config.from ?? ''}
              onChange={(e) =>
                onChange({
                  ...form,
                  trigger_config: { ...form.trigger_config, from: e.target.value || undefined },
                })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
            >
              <option value="">Any</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">To status (optional)</label>
            <select
              value={form.trigger_config.to ?? ''}
              onChange={(e) =>
                onChange({
                  ...form,
                  trigger_config: { ...form.trigger_config, to: e.target.value || undefined },
                })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
            >
              <option value="">Any</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Extra config for priority_changed */}
      {form.trigger_type === 'priority_changed' && (
        <div className="ml-6 mt-2 space-y-2 p-3 bg-zinc-800/50 rounded-lg">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">To priority (optional)</label>
            <select
              value={form.trigger_config.to ?? ''}
              onChange={(e) =>
                onChange({
                  ...form,
                  trigger_config: { ...form.trigger_config, to: e.target.value || undefined },
                })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
            >
              <option value="">Any</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Extra config for due_date_approaching */}
      {form.trigger_type === 'due_date_approaching' && (
        <div className="ml-6 mt-2 p-3 bg-zinc-800/50 rounded-lg">
          <label className="block text-xs text-zinc-400 mb-1">Days before due date</label>
          <input
            type="number"
            min={1}
            max={30}
            value={form.trigger_config.days_before ?? 1}
            onChange={(e) =>
              onChange({
                ...form,
                trigger_config: { ...form.trigger_config, days_before: Number(e.target.value) },
              })
            }
            className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
      )}
    </div>
  );
}

// ── Step 2: Conditions ─────────────────────────────────────────────────

function ConditionsStep({
  form,
  onChange,
  members,
}: {
  form: RuleFormState;
  onChange: (f: RuleFormState) => void;
  members: any[];
}) {
  const conditions = form.conditions;

  function updateCondition(index: number, patch: Partial<Condition>) {
    const updated = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ ...form, conditions: updated });
  }

  function addCondition() {
    onChange({
      ...form,
      conditions: [...conditions, { field: 'priority', operator: 'equals', value: '' }],
    });
  }

  function removeCondition(index: number) {
    onChange({ ...form, conditions: conditions.filter((_, i) => i !== index) });
  }

  const needsValueInput = (op: string) => op !== 'is_empty' && op !== 'is_not_empty';

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Optionally add conditions. All conditions must match (AND logic).
      </p>

      {conditions.map((cond, i) => (
        <div key={i} className="flex items-start gap-2 p-3 bg-zinc-800/50 rounded-lg">
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={cond.field}
                onChange={(e) => updateCondition(i, { field: e.target.value, value: '' })}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
              >
                {CONDITION_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <select
                value={cond.operator}
                onChange={(e) => updateCondition(i, { operator: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
              >
                {CONDITION_OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {needsValueInput(cond.operator) && (
              <FieldValueInput
                field={cond.field}
                value={cond.value}
                onChangeValue={(v) => updateCondition(i, { value: v })}
                members={members}
              />
            )}
          </div>
          <button
            onClick={() => removeCondition(i)}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        onClick={addCondition}
        className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add condition
      </button>
    </div>
  );
}

function FieldValueInput({
  field,
  value,
  onChangeValue,
  members,
}: {
  field: string;
  value: string;
  onChangeValue: (v: string) => void;
  members: any[];
}) {
  if (field === 'priority') {
    return (
      <select
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
      >
        <option value="">Select...</option>
        {PRIORITY_OPTIONS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    );
  }

  if (field === 'status') {
    return (
      <select
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
      >
        <option value="">Select...</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s.replace('_', ' ')}</option>
        ))}
      </select>
    );
  }

  if (field === 'assignee_id') {
    return (
      <select
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
      >
        <option value="">Select...</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {m.profiles?.full_name ?? m.user_id}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChangeValue(e.target.value)}
      placeholder="Value..."
      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder:text-zinc-500"
    />
  );
}

// ── Step 3: Action ─────────────────────────────────────────────────────

function ActionStep({
  form,
  onChange,
  members,
}: {
  form: RuleFormState;
  onChange: (f: RuleFormState) => void;
  members: any[];
}) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Automation name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Auto-assign urgent tasks"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500"
        />
      </div>

      {/* Action type */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Action
        </label>
        <div className="space-y-2">
          {ACTION_TYPES.map((action) => (
            <label
              key={action.value}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                form.action_type === action.value
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              )}
            >
              <input
                type="radio"
                name="action"
                value={action.value}
                checked={form.action_type === action.value}
                onChange={() =>
                  onChange({ ...form, action_type: action.value, action_config: {} })
                }
                className="accent-indigo-500"
              />
              <span className="text-sm text-white">{action.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Action config */}
      {form.action_type === 'assign_to' && (
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <label className="block text-xs text-zinc-400 mb-1">Assign to</label>
          <select
            value={form.action_config.assignee_id ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                action_config: { ...form.action_config, assignee_id: e.target.value },
              })
            }
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="">Select member...</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profiles?.full_name ?? m.user_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {form.action_type === 'move_to_section' && (
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <label className="block text-xs text-zinc-400 mb-1">Section ID</label>
          <input
            type="text"
            value={form.action_config.section_id ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                action_config: { ...form.action_config, section_id: e.target.value },
              })
            }
            placeholder="Enter section ID"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder:text-zinc-500"
          />
        </div>
      )}

      {form.action_type === 'set_priority' && (
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <label className="block text-xs text-zinc-400 mb-1">Set priority to</label>
          <select
            value={form.action_config.priority ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                action_config: { ...form.action_config, priority: e.target.value },
              })
            }
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="">Select...</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {form.action_type === 'send_notification' && (
        <div className="p-3 bg-zinc-800/50 rounded-lg space-y-2">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notify user</label>
            <select
              value={form.action_config.user_id ?? ''}
              onChange={(e) =>
                onChange({
                  ...form,
                  action_config: { ...form.action_config, user_id: e.target.value },
                })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
            >
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profiles?.full_name ?? m.user_id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Message (use {'{{task_title}}'} for task name)
            </label>
            <input
              type="text"
              value={form.action_config.message ?? ''}
              onChange={(e) =>
                onChange({
                  ...form,
                  action_config: { ...form.action_config, message: e.target.value },
                })
              }
              placeholder="Task {{task_title}} needs attention"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder:text-zinc-500"
            />
          </div>
        </div>
      )}

      {form.action_type === 'add_tag' && (
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <label className="block text-xs text-zinc-400 mb-1">Tag name</label>
          <input
            type="text"
            value={form.action_config.tag ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                action_config: { ...form.action_config, tag: e.target.value },
              })
            }
            placeholder="e.g. urgent-review"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder:text-zinc-500"
          />
        </div>
      )}
    </div>
  );
}

// ── Run History Modal ──────────────────────────────────────────────────

function RunHistoryModal({
  ruleId,
  onClose,
}: {
  ruleId: string;
  onClose: () => void;
}) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['automation_runs', ruleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_runs')
        .select('*')
        .eq('rule_id', ruleId)
        .order('triggered_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Run History" className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md mx-4 shadow-2xl max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-base font-semibold text-white">Run History</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-zinc-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 py-8">
              No runs yet
            </p>
          ) : (
            <div className="space-y-2">
              {runs.map((run: any) => (
                <div
                  key={run.id}
                  className="flex items-start gap-3 p-3 bg-zinc-800/40 rounded-lg"
                >
                  {run.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-zinc-400">
                      {new Date(run.triggered_at).toLocaleString()}
                    </div>
                    {run.error_message && (
                      <div className="text-xs text-red-400 mt-1 truncate">
                        {run.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
