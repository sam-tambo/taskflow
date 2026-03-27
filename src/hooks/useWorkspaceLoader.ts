import { useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { supabase } from '@/lib/supabase';

export function useWorkspaceLoader() {
  const { setWorkspaces, setCurrentWorkspace, setMembers, setTeams } = useWorkspaceStore();

  useEffect(() => {
    async function loadWorkspaces() {
      // Call supabase.auth.getUser() directly instead of relying on useAuth
      // which may have null user when the effect runs
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWorkspaces([]);
        setCurrentWorkspace(null);
        setMembers([]);
        setTeams([]);
        return;
      }

      // Step 1: Get workspace memberships
      const { data: memberships, error: memErr } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id);

      if (memErr) {
        console.error('[workspace] Error fetching memberships:', memErr.message);
      }

      let wsIds = (memberships ?? []).map(m => m.workspace_id);

      // Step 2: If no memberships, check if user owns a workspace directly
      if (wsIds.length === 0) {
        const { data: owned } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id);

        if (owned && owned.length > 0) {
          // Repair missing workspace_members rows
          for (const ws of owned) {
            await supabase.from('workspace_members')
              .upsert(
                { workspace_id: ws.id, user_id: user.id, role: 'admin' },
                { onConflict: 'workspace_id,user_id' }
              );
          }
          wsIds = owned.map(w => w.id);
        }
      }

      // Step 3: If still no workspace, auto-create one
      if (wsIds.length === 0) {
        const email = user.email ?? 'user';
        const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)
          + '-' + Math.random().toString(36).slice(2, 6);
        const { data: newWs, error: createErr } = await supabase
          .from('workspaces')
          .insert({ name: 'Revenue Precision', slug, owner_id: user.id })
          .select()
          .single();

        if (createErr) {
          console.error('[workspace] Error creating workspace:', createErr.message);
          return;
        }

        if (newWs) {
          await supabase.from('workspace_members')
            .insert({ workspace_id: newWs.id, user_id: user.id, role: 'admin' });
          setWorkspaces([newWs]);
          setCurrentWorkspace(newWs);
          return;
        }
      }

      // Step 4: Fetch full workspace objects + member counts so we can prefer the most active workspace
      const [workspacesRes, memberCountsRes] = await Promise.all([
        supabase.from('workspaces').select('*').in('id', wsIds),
        supabase.from('workspace_members').select('workspace_id').in('workspace_id', wsIds),
      ]);

      const workspaces = workspacesRes.data ?? [];

      if (workspaces.length > 0) {
        // Sort: workspaces with more members come first (picks the shared main workspace over auto-created solo ones)
        const memberCounts = new Map<string, number>();
        (memberCountsRes.data ?? []).forEach((r: { workspace_id: string }) => {
          memberCounts.set(r.workspace_id, (memberCounts.get(r.workspace_id) ?? 0) + 1);
        });
        workspaces.sort((a, b) => (memberCounts.get(b.id) ?? 0) - (memberCounts.get(a.id) ?? 0));

        setWorkspaces(workspaces);
        const current = useWorkspaceStore.getState().currentWorkspace;
        const best = workspaces[0];
        const bestCount = memberCounts.get(best.id) ?? 0;
        const currentCount = memberCounts.get(current?.id ?? '') ?? 0;
        // Always prefer the workspace with the most members (the main shared workspace).
        // This overrides stale currentWorkspace set to an empty auto-created solo workspace.
        if (!current || !workspaces.find(w => w.id === current.id) || bestCount > currentCount) {
          setCurrentWorkspace(best);
        }
      }
    }

    loadWorkspaces();

    // Re-run when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadWorkspaces();
      }
      if (event === 'SIGNED_OUT') {
        setWorkspaces([]);
        setCurrentWorkspace(null);
        setMembers([]);
        setTeams([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load members and teams when workspace changes
  const currentWorkspace = useWorkspaceStore(s => s.currentWorkspace);
  useEffect(() => {
    if (!currentWorkspace) return;

    async function loadWorkspaceData() {
      const { data: { user } } = await supabase.auth.getUser();

      const [membersRes, allTeamsRes, userTeamMembershipsRes] = await Promise.all([
        supabase
          .from('workspace_members')
          .select('*, profiles:profiles!user_id(*)')
          .eq('workspace_id', currentWorkspace!.id),
        supabase
          .from('teams')
          .select('*')
          .eq('workspace_id', currentWorkspace!.id),
        user
          ? supabase.from('team_members').select('team_id').eq('user_id', user.id)
          : Promise.resolve({ data: [] as { team_id: string }[] }),
      ]);

      // Only show teams the user belongs to in the sidebar.
      // Workspace admins who need to manage other teams can do so via the Teams settings page.
      const userTeamIds = new Set((userTeamMembershipsRes.data ?? []).map(t => t.team_id));
      const userTeams = (allTeamsRes.data ?? []).filter(t => userTeamIds.has(t.id));

      if (membersRes.data) setMembers(membersRes.data);
      setTeams(userTeams);
    }

    loadWorkspaceData();
  }, [currentWorkspace?.id]);
}
