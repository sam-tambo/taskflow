import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Profile } from '@/types';

export interface TaskFollower {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
  user?: Profile;
}

export function useTaskFollowers(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-followers', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_followers')
        .select('*, user:profiles!user_id(*)')
        .eq('task_id', taskId);
      if (error) throw error;
      return data as TaskFollower[];
    },
    enabled: !!taskId,
  });
}

export function useFollowTask(taskId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, user_id }: { task_id: string; user_id: string }) => {
      const { data, error } = await supabase
        .from('task_followers')
        .insert({ task_id, user_id })
        .select('*, user:profiles!user_id(*)')
        .single();
      if (error) throw error;
      return data as TaskFollower;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-followers', taskId] });
      toast.success('Following task');
    },
    onError: (err: Error) => {
      if (err.message?.includes('duplicate')) {
        toast.info('Already following this task');
      } else {
        toast.error('Failed to follow task');
      }
    },
  });
}

export function useUnfollowTask(taskId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, user_id }: { task_id: string; user_id: string }) => {
      const { error } = await supabase
        .from('task_followers')
        .delete()
        .eq('task_id', task_id)
        .eq('user_id', user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-followers', taskId] });
      toast.success('Unfollowed task');
    },
    onError: () => {
      toast.error('Failed to unfollow task');
    },
  });
}
