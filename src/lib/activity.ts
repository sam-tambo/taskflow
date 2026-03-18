import type { SupabaseClient } from '@supabase/supabase-js';

export async function logActivity(
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    projectId?: string;
    taskId?: string;
    action: string;
    fieldChanged?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity_log').insert({
    workspace_id: params.workspaceId,
    project_id: params.projectId,
    task_id: params.taskId,
    user_id: user.id,
    action: params.action,
    field_changed: params.fieldChanged,
    old_value: params.oldValue,
    new_value: params.newValue,
    metadata: params.metadata ?? {}
  });
}
