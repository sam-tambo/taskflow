import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Project, Section } from '@/types';
import { toast } from 'sonner';

export function useProjects(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Check this user's role in the workspace
      const { data: myMembership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      const isGuest = myMembership?.role === 'guest' || myMembership?.role === 'client';

      if (isGuest) {
        // Guests only see projects linked to teams they belong to,
        // plus any projects they're explicitly added to via project_members.
        const [{ data: myTeams }, { data: myProjectMemberships }] = await Promise.all([
          supabase.from('team_members').select('team_id').eq('user_id', user.id),
          supabase.from('project_members').select('project_id').eq('user_id', user.id),
        ]);

        const myTeamIds = (myTeams || []).map(t => t.team_id);
        const myProjectIds = new Set((myProjectMemberships || []).map(m => m.project_id));

        const { data: allWsProjects, error } = await supabase
          .from('projects')
          .select('*, owner:profiles!owner_id(*)')
          .eq('workspace_id', workspaceId)
          .eq('status', 'active')
          .order('name');
        if (error) throw error;

        return (allWsProjects as Project[]).filter(p =>
          (p.team_id && myTeamIds.includes(p.team_id)) || myProjectIds.has(p.id)
        );
      }

      // Non-guests see all workspace projects
      const { data: workspaceProjects, error } = await supabase
        .from('projects')
        .select('*, owner:profiles!owner_id(*)')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;

      // Also fetch private projects where user is a member (handles invitations)
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (!memberRows || memberRows.length === 0) return workspaceProjects as Project[];

      const workspaceProjectIds = new Set((workspaceProjects || []).map(p => p.id));
      const missingProjectIds = memberRows
        .map(m => m.project_id)
        .filter(id => !workspaceProjectIds.has(id));

      if (missingProjectIds.length === 0) return workspaceProjects as Project[];

      // Fetch private projects that weren't returned by the workspace query
      const { data: memberProjects } = await supabase
        .from('projects')
        .select('*, owner:profiles!owner_id(*)')
        .in('id', missingProjectIds)
        .eq('status', 'active');

      const allProjects = [...(workspaceProjects || []), ...(memberProjects || [])];
      allProjects.sort((a, b) => a.name.localeCompare(b.name));
      return allProjects as Project[];
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
      if (error) {
        // PGRST116 = no rows returned — project doesn't exist or RLS blocked access
        if (error.code === 'PGRST116') return null;
        throw error;
      }
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
          role: 'admin',
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

export function useUpdateProject(workspaceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
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
    onError: (err: Error) => {
      toast.error(err.message?.includes('row-level security') ? "You don't have permission to add sections to this project." : 'Failed to create section');
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
