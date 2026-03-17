import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/types';
import { toast } from 'sonner';

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*), section:sections(*)')
        .eq('project_id', projectId)
        .is('parent_task_id', null)
        .order('position');
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId,
  });
}

export function useMyTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-tasks', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*), project:projects(*), section:sections(*)')
        .eq('assignee_id', userId)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!userId,
  });
}

export function useSubtasks(parentTaskId: string | undefined) {
  return useQuery({
    queryKey: ['subtasks', parentTaskId],
    queryFn: async () => {
      if (!parentTaskId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*)')
        .eq('parent_task_id', parentTaskId)
        .order('position');
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!parentTaskId,
  });
}

export function useCreateTask(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select('*, assignee:profiles!assignee_id(*), section:sections(*)')
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId || data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });
}

export function useUpdateTask(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select('*, assignee:profiles!assignee_id(*), section:sections(*)')
        .single();
      if (error) throw error;
      return data as Task;
    },
    onMutate: async (update) => {
      const key = ['tasks', projectId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old: Task[] | undefined) =>
        old?.map((t) => (t.id === update.id ? { ...t, ...update } : t)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', projectId], context.previous);
      }
      toast.error('Failed to update task');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

export function useDeleteTask(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Task deleted');
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });
}
