import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProjectMember, ProjectRole } from '@/types';
import { toast } from 'sonner';

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_members')
        .select('*, profiles:profiles!user_id(*)')
        .eq('project_id', projectId)
        .order('role');
      if (error) throw error;
      return data as ProjectMember[];
    },
    enabled: !!projectId,
  });
}

export function useAddProjectMember(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (member: {
      project_id: string;
      user_id: string;
      role: ProjectRole;
      invited_by: string;
      status?: 'active' | 'pending';
      invited_email?: string;
      notify_on_task_add?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('project_members')
        .insert(member)
        .select('*, profiles:profiles!user_id(*)')
        .single();
      if (error) throw error;
      return data as ProjectMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Member added');
    },
    onError: (err: Error) => {
      if (err.message?.includes('duplicate')) {
        toast.error('Already a member of this project');
      } else {
        toast.error('Failed to add member');
      }
    },
  });
}

export function useUpdateProjectMember(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectMember> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_members')
        .update(updates)
        .eq('id', id)
        .select('*, profiles:profiles!user_id(*)')
        .single();
      if (error) throw error;
      return data as ProjectMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
    onError: () => {
      toast.error('Failed to update member role');
    },
  });
}

export function useRemoveProjectMember(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Member removed');
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });
}
