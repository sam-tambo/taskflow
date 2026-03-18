import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

export function useWorkspaceLoader() {
  const { setCurrentWorkspace, setWorkspaces, setMembers, setTeams, currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    async function loadWorkspace() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load workspaces the user is a member of
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, workspaces(*)')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) return;

      const workspaces = memberships
        .map((m) => m.workspaces as any)
        .filter(Boolean);

      setWorkspaces(workspaces);

      // Set current workspace if not already set
      if (!currentWorkspace && workspaces.length > 0) {
        setCurrentWorkspace(workspaces[0]);
      }

      // Load the active workspace's members and teams
      const activeWs = currentWorkspace || workspaces[0];
      if (!activeWs) return;

      const [membersResult, teamsResult] = await Promise.all([
        supabase
          .from('workspace_members')
          .select('*, profiles(*)')
          .eq('workspace_id', activeWs.id),
        supabase
          .from('teams')
          .select('*')
          .eq('workspace_id', activeWs.id)
          .order('name'),
      ]);

      if (membersResult.data) setMembers(membersResult.data);
      if (teamsResult.data) setTeams(teamsResult.data);
    }

    loadWorkspace();

    // Re-run when auth state changes to SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadWorkspace();
      }
    });

    return () => subscription.unsubscribe();
  }, [currentWorkspace?.id]);
}
