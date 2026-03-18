import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import type { Goal, GoalMilestone } from '@/types';
import { toast } from 'sonner';

export function useGoals(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['goals', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('goals')
        .select('*, owner:profiles!goals_owner_id_fkey(*), projects:goal_projects(project:projects(*))')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((g: any) => ({
        ...g,
        projects: g.projects?.map((gp: any) => gp.project).filter(Boolean) ?? [],
      })) as Goal[];
    },
    enabled: !!workspaceId,
  });
}

export function useGoal(goalId: string | undefined) {
  return useQuery({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      if (!goalId) return null;
      const { data, error } = await supabase
        .from('goals')
        .select('*, owner:profiles!goals_owner_id_fkey(*), projects:goal_projects(project:projects(*))')
        .eq('id', goalId)
        .single();

      if (error) throw error;

      return {
        ...data,
        projects: data.projects?.map((gp: any) => gp.project).filter(Boolean) ?? [],
      } as Goal;
    },
    enabled: !!goalId,
  });
}

export function useGoalMilestones(goalId: string | undefined) {
  return useQuery({
    queryKey: ['goal-milestones', goalId],
    queryFn: async () => {
      if (!goalId) return [];
      const { data, error } = await supabase
        .from('goal_milestones')
        .select('*')
        .eq('goal_id', goalId)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data ?? []) as GoalMilestone[];
    },
    enabled: !!goalId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (goal: Partial<Goal>) => {
      const { data, error } = await supabase
        .from('goals')
        .insert(goal)
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['goals', data.workspace_id] });
      toast.success('Goal created');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Goal> & { id: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['goals', data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['goal', data.id] });
      toast.success('Goal updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', currentWorkspace?.id] });
      toast.success('Goal deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (milestone: Partial<GoalMilestone>) => {
      const { data, error } = await supabase
        .from('goal_milestones')
        .insert(milestone)
        .select()
        .single();
      if (error) throw error;
      return data as GoalMilestone;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', data.goal_id] });
      toast.success('Milestone added');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GoalMilestone> & { id: string }) => {
      const { data, error } = await supabase
        .from('goal_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GoalMilestone;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', data.goal_id] });
      toast.success('Milestone updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useLinkProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, projectId }: { goalId: string; projectId: string }) => {
      const { error } = await supabase
        .from('goal_projects')
        .insert({ goal_id: goalId, project_id: projectId });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Project linked');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUnlinkProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, projectId }: { goalId: string; projectId: string }) => {
      const { error } = await supabase
        .from('goal_projects')
        .delete()
        .eq('goal_id', goalId)
        .eq('project_id', projectId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Project unlinked');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
