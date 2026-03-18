import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { supabase } from '@/lib/supabase';

export function useWorkspaceLoader() {
  const { user } = useAuth();
  const { setWorkspaces, setCurrentWorkspace, setMembers, setTeams } = useWorkspaceStore();

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setMembers([]);
      setTeams([]);
      return;
    }

    async function loadWorkspaces() {
      // Step 1: Get workspace memberships
      const { data: memberships, error: memErr } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user!.id);

      if (memErr) {
        console.error('[workspace] Error fetching memberships:', memErr.message);
      }

      let wsIds = (memberships ?? []).map(m => m.workspace_id);

      // Step 2: If no memberships, check if user owns a workspace directly
      if (wsIds.length === 0) {
        const { data: owned } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user!.id);

        if (owned && owned.length > 0) {
          // Repair missing workspace_members rows
          for (const ws of owned) {
            await supabase.from('workspace_members')
              .upsert(
                { workspace_id: ws.id, user_id: user!.id, role: 'admin' },
                { onConflict: 'workspace_id,user_id' }
              );
          }
          wsIds = owned.map(w => w.id);
        }
      }

      // Step 3: If still no workspace, auto-create one
      if (wsIds.length === 0) {
        const email = user!.email ?? 'user';
        const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)
          + '-' + Math.random().toString(36).slice(2, 6);
        const { data: newWs, error: createErr } = await supabase
          .from('workspaces')
          .insert({ name: 'Revenue Precision', slug, owner_id: user!.id })
          .select()
          .single();

        if (createErr) {
          console.error('[workspace] Error creating workspace:', createErr.message);
          return;
        }

        if (newWs) {
          await supabase.from('workspace_members')
            .insert({ workspace_id: newWs.id, user_id: user!.id, role: 'admin' });
          setWorkspaces([newWs]);
          setCurrentWorkspace(newWs);
          return;
        }
      }

      // Step 4: Fetch full workspace objects
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', wsIds);

      if (workspaces && workspaces.length > 0) {
        setWorkspaces(workspaces);
        const current = useWorkspaceStore.getState().currentWorkspace;
        if (!current || !workspaces.find(w => w.id === current.id)) {
          setCurrentWorkspace(workspaces[0]);
        }
      }
    }

    loadWorkspaces();
  }, [user]);

  // Load members and teams when workspace changes
  const currentWorkspace = useWorkspaceStore(s => s.currentWorkspace);
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
