import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { Plus, Users, Pencil, Trash2, UserPlus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Team, TeamMember, WorkspaceMember } from '@/types';

const TEAM_COLORS = ['#4B7C6F', '#8B5CF6', '#EC4899', '#3B82F6', '#EF4444', '#F59E0B', '#14B8A6', '#6366F1', '#84CC16', '#F97316'];

export default function Teams() {
  usePageTitle('Teams');
  const { user } = useAuth();
  const { currentWorkspace, members: workspaceMembers } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!currentWorkspace,
  });

  const { data: allTeamMembers = [] } = useQuery({
    queryKey: ['team-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace || teams.length === 0) return [];
      const { data, error } = await supabase
        .from('team_members')
        .select('*, profiles:user_id(id, full_name, email, avatar_url)')
        .in('team_id', teams.map(t => t.id));
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!currentWorkspace && teams.length > 0,
  });

  const createTeam = useMutation({
    mutationFn: async (team: { name: string; description: string; color: string }) => {
      const { error } = await supabase.from('teams').insert({
        ...team,
        workspace_id: currentWorkspace!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created');
      setShowCreate(false);
    },
    onError: () => toast.error('Failed to create team'),
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; color?: string }) => {
      const { error } = await supabase.from('teams').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team updated');
      setEditingTeam(null);
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted');
    },
  });

  const addTeamMember = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Member added to team');
    },
    onError: () => toast.error('Failed to add member'),
  });

  const removeTeamMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  const getMembersForTeam = (teamId: string) => allTeamMembers.filter(m => m.team_id === teamId);

  const getAvailableMembers = (teamId: string) => {
    const existing = new Set(getMembersForTeam(teamId).map(m => m.user_id));
    return workspaceMembers.filter(m => !existing.has(m.user_id));
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="skeleton h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {teams.length} team{teams.length !== 1 ? 's' : ''} in {currentWorkspace?.name}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-medium hover:bg-[#3d6b5e] transition-colors"
        >
          <Plus className="w-4 h-4" /> New Team
        </button>
      </div>

      {/* Create/Edit form */}
      {(showCreate || editingTeam) && (
        <TeamForm
          team={editingTeam}
          onSubmit={(data) => {
            if (editingTeam) {
              updateTeam.mutate({ id: editingTeam.id, ...data });
            } else {
              createTeam.mutate(data);
            }
          }}
          onCancel={() => { setShowCreate(false); setEditingTeam(null); }}
        />
      )}

      {/* Team cards */}
      {teams.length === 0 && !showCreate && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400 mb-1">No teams yet</p>
          <p className="text-sm text-gray-400 dark:text-slate-500">Create teams to organize members and projects</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map(team => {
          const members = getMembersForTeam(team.id);
          const available = getAvailableMembers(team.id);
          return (
            <div key={team.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-50 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: team.color + '20' }}>
                    <Users className="w-5 h-5" style={{ color: team.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{team.name}</h3>
                    {team.description && <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{team.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingTeam(team)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete team "${team.name}"?`)) deleteTeam.mutate(team.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Members */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => setAddMemberTeamId(addMemberTeamId === team.id ? null : team.id)}
                    className="text-xs text-[#4B7C6F] hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" /> Add
                  </button>
                </div>

                {/* Add member dropdown */}
                {addMemberTeamId === team.id && available.length > 0 && (
                  <div className="mb-3 bg-gray-50 dark:bg-slate-800 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                    {available.map(wm => (
                      <button
                        key={wm.user_id}
                        onClick={() => addTeamMember.mutate({ teamId: team.id, userId: wm.user_id })}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-left"
                      >
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium" style={{ backgroundColor: getAvatarColor(wm.user_id) }}>
                          {getInitials(wm.profiles?.full_name || null)}
                        </div>
                        <span className="text-xs text-gray-700 dark:text-slate-300 truncate">{wm.profiles?.full_name || wm.profiles?.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {addMemberTeamId === team.id && available.length === 0 && (
                  <p className="text-xs text-gray-400 mb-3">All workspace members are in this team</p>
                )}

                {/* Member list */}
                <div className="space-y-1">
                  {members.map(member => (
                    <div key={member.id} className="group flex items-center gap-2 py-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-medium" style={{ backgroundColor: getAvatarColor(member.user_id) }}>
                        {getInitials(member.profiles?.full_name || null)}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-slate-300 flex-1 truncate">{member.profiles?.full_name || member.profiles?.email}</span>
                      <button
                        onClick={() => removeTeamMember.mutate(member.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {members.length === 0 && <p className="text-xs text-gray-400">No members yet</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamForm({ team, onSubmit, onCancel }: {
  team: Team | null;
  onSubmit: (data: { name: string; description: string; color: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(team?.name || '');
  const [description, setDescription] = useState(team?.description || '');
  const [color, setColor] = useState(team?.color || TEAM_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), color });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4 space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-white">{team ? 'Edit Team' : 'Create Team'}</h3>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Team name"
        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#4B7C6F]/30 text-gray-900 dark:text-white"
        autoFocus
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-gray-900 dark:text-white"
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Color:</span>
        {TEAM_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={cn('w-6 h-6 rounded-full transition-transform', color === c && 'ring-2 ring-offset-2 ring-gray-400 scale-110')}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
        <button type="submit" disabled={!name.trim()} className="text-sm text-white bg-[#4B7C6F] px-4 py-1.5 rounded-lg hover:bg-[#3d6b5e] disabled:opacity-50">
          {team ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  );
}
