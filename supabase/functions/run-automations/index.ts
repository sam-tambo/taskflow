import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { event, task, workspaceId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch active automation rules for this workspace
    const { data: rules } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)

    const results = []

    for (const rule of rules ?? []) {
      if (rule.trigger_type !== event.type) continue

      // Check trigger config matches
      if (event.type === 'status_changed') {
        const cfg = rule.trigger_config
        if (cfg.from && cfg.from !== event.from) continue
        if (cfg.to && cfg.to !== event.to) continue
      }
      if (event.type === 'due_date_approaching') {
        const daysUntilDue = Math.ceil(
          (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        if (daysUntilDue !== rule.trigger_config.days_before) continue
      }

      // Check conditions
      const conditions = rule.condition_config?.conditions ?? []
      const conditionsMet = conditions.every((cond: any) => {
        const taskValue = task[cond.field]
        if (cond.operator === 'equals') return taskValue === cond.value
        if (cond.operator === 'not_equals') return taskValue !== cond.value
        if (cond.operator === 'is_empty') return !taskValue
        return true
      })
      if (!conditionsMet) continue

      // Execute action
      let updatePayload: Record<string, any> = {}

      switch (rule.action_type) {
        case 'assign_to':
          updatePayload.assignee_id = rule.action_config.user_id
          break
        case 'move_to_section':
          updatePayload.section_id = rule.action_config.section_id
          break
        case 'set_priority':
          updatePayload.priority = rule.action_config.priority
          break
        case 'add_tag':
          updatePayload.tags = [...(task.tags ?? []), rule.action_config.tag]
          break
        case 'send_notification':
          if (task.assignee_id) {
            await supabase.from('notifications').insert({
              user_id: task.assignee_id,
              type: 'automation',
              title: rule.action_config.message,
              resource_type: 'task',
              resource_id: task.id
            })
          }
          break
      }

      if (Object.keys(updatePayload).length > 0) {
        await supabase.from('tasks').update(updatePayload).eq('id', task.id)
      }

      // Log run
      await supabase.from('automation_runs').insert({
        rule_id: rule.id,
        task_id: task.id,
        success: true
      })
      await supabase.from('automation_rules')
        .update({ run_count: (rule.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
        .eq('id', rule.id)

      results.push({ rule_id: rule.id, action: rule.action_type, success: true })
    }

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
