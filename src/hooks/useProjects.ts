import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Project, Section } from '@/types';
import { toast } from 'sonner';

export function useProjects(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*, owner:profiles!owner_id(*)')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!workspaceId,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*, owner:profiles!owner_id(*)')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

export function useSections(projectId: string | undefined) {
  return useQuery({
    queryKey: ['sections', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('project_id', projectId)
        .order('position');
      if (error) throw error;
      return data as Section[];
    },
    enabled: !!projectId,
  });
}

export function useCreateProject(workspaceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (project: Partial<Project>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Project was not created. Check RLS policies.');
      // Add creator as project member (non-blocking — don't fail the whole flow)
      if (data.owner_id) {
        const { error: memberError } = await supabase.from('project_members').insert({
          project_id: data.id,
          user_id: data.owner_id,
          role: 'owner',
        });
        if (memberError) console.warn('Failed to add project member:', memberError.message);
      }
      // Create default sections (non-blocking)
      const defaultSections = ['To Do', 'In Progress', 'Done'];
      for (let i = 0; i < defaultSections.length; i++) {
        const { error: sectionError } = await supabase.from('sections').insert({
          project_id: data.id,
          name: defaultSections[i],
          position: i,
        });
        if (sectionError) console.warn('Failed to create section:', sectionError.message);
      }
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      toast.success('Project created');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create project');
    },
  });
}

export function useCreateSection(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (section: Partial<Section>) => {
      const { data, error } = await supabase
        .from('sections')
        .insert(section)
        .select()
        .single();
      if (error) throw error;
      return data as Section;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', projectId] });
    },
  });
}

export function useUpdateSection(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Section> & { id: string }) => {
      const { data, error } = await supabase
        .from('sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Section;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', projectId] });
    },
  });
}
