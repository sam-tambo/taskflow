import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Mail, UserPlus, Copy, Check, MoreHorizontal, Shield, User, Eye, Crown, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { InvitePanel } from '@/components/members/InvitePanel';
import type { WorkspaceMember } from '@/types';

export default function Members() {
  usePageTitle('Members');
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceStore();
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*, profiles:user_id(*)')
        .eq('workspace_id', currentWorkspace.id)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return data as WorkspaceMember[];
    },
    enabled: !!currentWorkspace,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['workspace-invites', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('workspace_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', currentWorkspace?.id] });
      toast.success('Member removed');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to remove member'),
  });

  const changeRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase.from('workspace_members').update({ role }).eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', currentWorkspace?.id] });
      toast.success('Role updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update role'),
  });

  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.from('workspace_invites').delete().eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', currentWorkspace?.id] });
      toast.success('Invite revoked');
    },
  });

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-3.5 h-3.5 text-yellow-500" />;
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-purple-500" />;
    if (role === 'guest') return <Eye className="w-3.5 h-3.5 text-gray-400" />;
    return <User className="w-3.5 h-3.5 text-blue-500" />;
  };

  const roleLabel = (role: string) =>
    ({ owner: 'Owner', admin: 'Admin', member: 'Member', guest: 'Guest' } as Record<string, string>)[role] ?? role;

  const grouped = {
    owner: members.filter(m => m.role === 'owner'),
    admin: members.filter(m => m.role === 'admin'),
    member: members.filter(m => m.role === 'member'),
    guest: members.filter(m => m.role === 'guest'),
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        <div className="skeleton h-12 w-32" />
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Members</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {members.length} member{members.length !== 1 ? 's' : ''} in {currentWorkspace?.name}
          </p>
        </div>
        <button
          onClick={() => setShowInvitePanel(true)}
          className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-xl text-sm font-medium hover:bg-coral-dark transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite members
        </button>
      </div>

      {/* Member groups */}
      <div className="space-y-6">
        {(['owner', 'admin', 'member', 'guest'] as const).map(role => {
          const group = grouped[role];
          if (group.length === 0) return null;
          return (
            <div key={role}>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                {roleLabel(role)}s ({group.length})
              </h3>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                {group.map((member, idx) => {
                  const profile = member.profiles;
                  const isYou = profile?.id === user?.id;
                  const isOwner = member.role === 'owner';

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3',
                        idx < group.length - 1 && 'border-b border-gray-50 dark:border-slate-800'
                      )}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                        style={{ backgroundColor: getAvatarColor(profile?.id || member.user_id) }}
                      >
                        {getInitials(profile?.full_name || null)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {profile?.full_name ?? 'Unknown'}
                          </span>
                          {isYou && <span className="text-xs text-gray-400 dark:text-slate-500">(you)</span>}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{profile?.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {roleIcon(member.role)}
                        <span className="text-xs text-gray-500 dark:text-slate-400">{roleLabel(member.role)}</span>
                      </div>
                      {!isYou && !isOwner && (
                        <MemberMenu
                          currentRole={member.role}
                          onChangeRole={(r) => changeRole.mutate({ memberId: member.id, role: r })}
                          onRemove={() => {
                            if (confirm(`Remove ${profile?.full_name || 'this member'} from workspace?`)) {
                              removeMember.mutate(member.id);
                            }
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Pending invitations ({invites.length})
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            {invites.map((invite: any, idx: number) => (
              <div
                key={invite.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  idx < invites.length - 1 && 'border-b border-gray-50 dark:border-slate-800'
                )}
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {invite.email ? <Mail className="w-4 h-4 text-gray-400" /> : <Link2 className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-slate-300 truncate">
                    {invite.email ?? 'Invite link'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {roleLabel(invite.role)} · Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </p>
                </div>
                {!invite.email && <CopyLinkButton token={invite.token} />}
                <button
                  onClick={() => revokeInvite.mutate(invite.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvitePanel && (
        <InvitePanel
          workspaceId={currentWorkspace?.id ?? ''}
          userId={user?.id ?? ''}
          onClose={() => setShowInvitePanel(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['workspace-invites', currentWorkspace?.id] });
          }}
        />
      )}
    </div>
  );
}

function MemberMenu({
  currentRole,
  onChangeRole,
  onRemove,
}: {
  currentRole: string;
  onChangeRole: (role: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[160px]">
            {['admin', 'member', 'guest'].filter(r => r !== currentRole).map(role => (
              <button
                key={role}
                onClick={() => { onChangeRole(role); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Make {role}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
            <button
              onClick={() => { onRemove(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Remove from workspace
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/invite/${token}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}
