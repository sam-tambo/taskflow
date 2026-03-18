import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '@/types';

export type AutomationEvent = {
  type: 'task_created' | 'status_changed' | 'priority_changed' | 'assignee_changed' | 'task_completed' | 'due_date_approaching';
  oldValue?: string;
  newValue?: string;
};

interface Rule {
  id: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  condition_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  run_count: number;
}

export async function runAutomations(
  event: AutomationEvent,
  task: Task,
  supabase: SupabaseClient,
  workspaceId: string
) {
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  for (const rule of rules ?? []) {
    if (!triggerMatches(rule, event)) continue;
    if (!conditionsMatch(rule, task)) continue;

    try {
      await executeAction(rule, task, supabase);
      await supabase.from('automation_runs').insert({
        rule_id: rule.id,
        task_id: task.id,
        success: true,
      });
      await supabase
        .from('automation_rules')
        .update({
          run_count: (rule.run_count || 0) + 1,
          last_run_at: new Date().toISOString(),
        })
        .eq('id', rule.id);
    } catch (err: any) {
      await supabase.from('automation_runs').insert({
        rule_id: rule.id,
        task_id: task.id,
        success: false,
        error_message: err.message,
      });
    }
  }
}

function triggerMatches(rule: Rule, event: AutomationEvent): boolean {
  if (rule.trigger_type !== event.type) return false;

  const config = rule.trigger_config;
  if (!config || Object.keys(config).length === 0) return true;

  switch (event.type) {
    case 'status_changed':
      if (config.from && config.from !== event.oldValue) return false;
      if (config.to && config.to !== event.newValue) return false;
      return true;

    case 'priority_changed':
      if (config.from && config.from !== event.oldValue) return false;
      if (config.to && config.to !== event.newValue) return false;
      return true;

    case 'assignee_changed':
      if (config.to && config.to !== event.newValue) return false;
      return true;

    case 'due_date_approaching':
      if (config.days_before && event.newValue) {
        const dueDate = new Date(event.newValue);
        const now = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= Number(config.days_before) && diffDays >= 0;
      }
      return true;

    case 'task_created':
    case 'task_completed':
      return true;

    default:
      return false;
  }
}

function conditionsMatch(rule: Rule, task: Task): boolean {
  const config = rule.condition_config;
  if (!config || Object.keys(config).length === 0) return true;

  const conditions: Array<{ field: string; operator: string; value: string }> =
    config.conditions ?? [];

  if (conditions.length === 0) return true;

  return conditions.every((condition) => {
    const taskValue = getTaskFieldValue(task, condition.field);

    switch (condition.operator) {
      case 'equals':
        return taskValue === condition.value;
      case 'not_equals':
        return taskValue !== condition.value;
      case 'contains':
        return typeof taskValue === 'string' && taskValue.includes(condition.value);
      case 'is_empty':
        return !taskValue || taskValue === '';
      case 'is_not_empty':
        return !!taskValue && taskValue !== '';
      default:
        return true;
    }
  });
}

function getTaskFieldValue(task: Task, field: string): string {
  switch (field) {
    case 'priority':
      return task.priority ?? '';
    case 'status':
      return task.status ?? '';
    case 'assignee_id':
      return task.assignee_id ?? '';
    case 'section_id':
      return task.section_id ?? '';
    case 'title':
      return task.title ?? '';
    default:
      return (task as any)[field] ?? '';
  }
}

async function executeAction(
  rule: Rule,
  task: Task,
  supabase: SupabaseClient
): Promise<void> {
  const config = rule.action_config;

  switch (rule.action_type) {
    case 'assign_to':
      if (!config.assignee_id) throw new Error('No assignee_id configured');
      await supabase
        .from('tasks')
        .update({ assignee_id: config.assignee_id })
        .eq('id', task.id);
      break;

    case 'move_to_section':
      if (!config.section_id) throw new Error('No section_id configured');
      await supabase
        .from('tasks')
        .update({ section_id: config.section_id })
        .eq('id', task.id);
      break;

    case 'set_priority':
      if (!config.priority) throw new Error('No priority configured');
      await supabase
        .from('tasks')
        .update({ priority: config.priority })
        .eq('id', task.id);
      break;

    case 'send_notification':
      if (!config.user_id || !config.message)
        throw new Error('Notification requires user_id and message');
      await supabase.from('notifications').insert({
        user_id: config.user_id,
        message: config.message.replace('{{task_title}}', task.title),
        type: 'automation',
        task_id: task.id,
      });
      break;

    case 'add_tag':
      if (!config.tag) throw new Error('No tag configured');
      const currentTags = (task as any).tags ?? [];
      if (!currentTags.includes(config.tag)) {
        await supabase
          .from('tasks')
          .update({ tags: [...currentTags, config.tag] })
          .eq('id', task.id);
      }
      break;

    default:
      throw new Error(`Unknown action type: ${rule.action_type}`);
  }
}
