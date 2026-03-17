import { useState } from 'react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { UserPlus, Shield, Crown, User, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkspaceMember } from '@/types';

const roleIcons: Record<string, typeof Crown> = { owner: Crown, admin: Shield, member: User, guest: Eye };
const roleColors: Record<string, string> = { owner: 'text-yellow-500', admin: 'text-purple', member: 'text-blue-500', guest: 'text-gray-400' };

export default function Members() {
  const { currentWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*, profiles:user_id(*)')
        .eq('workspace_id', currentWorkspace.id);
      if (error) throw error;
      return data as WorkspaceMember[];
    },
    enabled: !!currentWorkspace,
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('workspace_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast.success('Member removed');
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        <div className="skeleton h-12 w-32" />
        {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Members</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Invite */}
      <div className="flex gap-2 mb-6">
        <input
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="Invite by email..."
          className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-coral/30"
          onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
        />
        <button onClick={handleInvite} className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-xl hover:bg-coral-dark flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" /> Invite
        </button>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {members.map((member) => {
          const profile = member.profiles;
          const RoleIcon = roleIcons[member.role] || User;
          return (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: getAvatarColor(member.user_id) }}>
                {getInitials(profile?.full_name || null)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.full_name || profile?.email || 'Unknown'}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{profile?.email}</p>
              </div>
              <div className={cn('flex items-center gap-1 text-xs font-medium', roleColors[member.role])}>
                <RoleIcon className="w-3.5 h-3.5" />
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </div>
              {member.role !== 'owner' && (
                <button onClick={() => removeMember.mutate(member.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
