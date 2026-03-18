import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProjectMilestone } from '@/types';
import { toast } from 'sonner';

export function useProjectMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*, project:projects(*)')
        .eq('project_id', projectId)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProjectMilestone[];
    },
    enabled: !!projectId,
  });
}

export function useWorkspaceMilestones(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-milestones', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*, project:projects(*)')
        .eq('project.workspace_id', workspaceId)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) {
        // Fallback: query through projects
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('workspace_id', workspaceId);
        if (!projects?.length) return [];
        const projectIds = projects.map(p => p.id);
        const { data: milestones, error: msError } = await supabase
          .from('project_milestones')
          .select('*, project:projects(*)')
          .in('project_id', projectIds)
          .order('due_date', { ascending: true, nullsFirst: false });
        if (msError) throw msError;
        return (milestones ?? []) as ProjectMilestone[];
      }
      return (data ?? []) as ProjectMilestone[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (milestone: Partial<ProjectMilestone>) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .insert(milestone)
        .select('*, project:projects(*)')
        .single();
      if (error) throw error;
      return data as ProjectMilestone;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-milestones'] });
      toast.success('Milestone created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectMilestone> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', id)
        .select('*, project:projects(*)')
        .single();
      if (error) throw error;
      return data as ProjectMilestone;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-milestones'] });
      toast.success('Milestone updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_milestones').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-milestones'] });
      toast.success('Milestone deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
