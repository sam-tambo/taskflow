import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { supabase } from '@/lib/supabase';

export function useWorkspaceLoader() {
  const { user } = useAuth();
  const { setWorkspaces, setCurrentWorkspace, setMembers, setTeams, currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setMembers([]);
      setTeams([]);
      return;
    }

    async function loadWorkspaces() {
      // Get workspace memberships
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user!.id);

      if (!memberships || memberships.length === 0) return;

      const wsIds = memberships.map(m => m.workspace_id);
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', wsIds);

      if (workspaces && workspaces.length > 0) {
        setWorkspaces(workspaces);
        // Read current value directly from store to avoid stale closure
        const current = useWorkspaceStore.getState().currentWorkspace;
        if (!current || !workspaces.find(w => w.id === current.id)) {
          setCurrentWorkspace(workspaces[0]);
        }
      }
    }

    loadWorkspaces();
  }, [user]);

  // Load members and teams when workspace changes
  useEffect(() => {
    if (!currentWorkspace) return;

    async function loadWorkspaceData() {
      const [membersRes, teamsRes] = await Promise.all([
        supabase
          .from('workspace_members')
          .select('*, profiles:profiles!user_id(*)')
          .eq('workspace_id', currentWorkspace!.id),
        supabase
          .from('teams')
          .select('*')
          .eq('workspace_id', currentWorkspace!.id),
      ]);

      if (membersRes.data) setMembers(membersRes.data);
      if (teamsRes.data) setTeams(teamsRes.data);
    }

    loadWorkspaceData();
  }, [currentWorkspace?.id]);
}
