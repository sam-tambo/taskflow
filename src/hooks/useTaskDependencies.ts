import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TaskDependency } from '@/types';
import { toast } from 'sonner';

export function useTaskDependencies(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_dependencies')
        .select('*, depends_on:tasks!depends_on_id(id, title, status, priority)')
        .eq('task_id', taskId);
      if (error) throw error;
      return data as TaskDependency[];
    },
    enabled: !!taskId,
  });
}

export function useBlockedBy(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-blocked-by', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_dependencies')
        .select('*, task:tasks!task_id(id, title, status, priority)')
        .eq('depends_on_id', taskId);
      if (error) throw error;
      return data as TaskDependency[];
    },
    enabled: !!taskId,
  });
}

export function useAddDependency(taskId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, depends_on_id }: { task_id: string; depends_on_id: string }) => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .insert({ task_id, depends_on_id, dependency_type: 'finish_to_start' })
        .select('*, depends_on:tasks!depends_on_id(id, title, status, priority)')
        .single();
      if (error) throw error;
      return data as TaskDependency;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
      toast.success('Dependency added');
    },
    onError: (err: Error) => {
      if (err.message?.includes('duplicate')) {
        toast.error('Dependency already exists');
      } else {
        toast.error('Failed to add dependency');
      }
    },
  });
}

export function useRemoveDependency(taskId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dependencyId: string) => {
      const { error } = await supabase.from('task_dependencies').delete().eq('id', dependencyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
      toast.success('Dependency removed');
    },
    onError: () => {
      toast.error('Failed to remove dependency');
    },
  });
}
