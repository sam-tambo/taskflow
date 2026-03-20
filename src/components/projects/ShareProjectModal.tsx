import { useState, useEffect } from 'react';
import { X, Link2, ChevronDown, Search, UserPlus, Globe, Lock, Trash2, Mail } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useProjectMembers, useAddProjectMember, useUpdateProjectMember, useRemoveProjectMember } from '@/hooks/useProjectMembers';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { toast } from 'sonner';
import type { Project, ProjectRole, Profile } from '@/types';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ShareProjectModalProps {
  open: boolean;
  onClose: () => void;
  project: Project;
}

const ROLE_OPTIONS: { value: ProjectRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Admin', description: 'Can manage members and all project settings' },
  { value: 'editor', label: 'Editor', description: 'Can add and edit tasks' },
  { value: 'commenter', label: 'Commenter', description: 'Can comment on tasks only' },
  { value: 'viewer', label: 'Viewer', description: 'Can view tasks only' },
];

export function ShareProjectModal({ open, onClose, project }: ShareProjectModalProps) {
  const { members: workspaceMembers, currentWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: projectMembers = [] } = useProjectMembers(project.id);
  const addMember = useAddProjectMember(project.id);
  const updateMember = useUpdateProjectMember(project.id);
  const removeMember = useRemoveProjectMember(project.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('editor');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [notifyOnAdd, setNotifyOnAdd] = useState(true);
  const [showAccessDropdown, setShowAccessDropdown] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [profileResults, setProfileResults] = useState<Profile[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);

  const updatePrivacy = useMutation({
    mutationFn: async (privacy: 'workspace' | 'private') => {
      const { error } = await supabase
        .from('projects')
        .update({ privacy })
        .eq('id', project.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Access updated');
    },
  });

  // Search profiles directly from DB when workspace members don't match
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setProfileResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingProfiles(true);
      const q = searchQuery.toLowerCase();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(10);
      setProfileResults(data || []);
      setSearchingProfiles(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!open) return null;

  const existingUserIds = new Set(projectMembers.map(m => m.user_id));

  // Filter workspace members for invite suggestions
  const filteredWorkspaceMembers = workspaceMembers.filter(wm => {
    if (existingUserIds.has(wm.user_id)) return false;
    if (!searchQuery) return false;
    const name = wm.profiles?.full_name || '';
    const email = wm.profiles?.email || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  // Combine workspace members with profile search results (deduped)
  const workspaceMemberUserIds = new Set(filteredWorkspaceMembers.map(wm => wm.user_id));
  const additionalProfiles = profileResults.filter(p =>
    !existingUserIds.has(p.id) &&
    !workspaceMemberUserIds.has(p.id) &&
    p.id !== user?.id
  );

  const hasResults = filteredWorkspaceMembers.length > 0 || additionalProfiles.length > 0;
  const isEmailQuery = searchQuery.includes('@') && searchQuery.includes('.');

  const handleInvite = async (memberProfile: Profile) => {
    if (!user || !currentWorkspace) return;

    // Ensure the user is also a workspace member
    const isWorkspaceMember = workspaceMembers.some(wm => wm.user_id === memberProfile.id);
    if (!isWorkspaceMember) {
      // Add them as a workspace member first
      const { error: wmError } = await supabase
        .from('workspace_members')
        .upsert(
          { workspace_id: currentWorkspace.id, user_id: memberProfile.id, role: 'employee' },
          { onConflict: 'workspace_id,user_id' }
        );
      if (wmError) {
        console.warn('Failed to add workspace member:', wmError.message);
      }
    }

    addMember.mutate({
      project_id: project.id,
      user_id: memberProfile.id,
      role: selectedRole,
      invited_by: user.id,
      status: 'active',
      invited_email: memberProfile.email,
      notify_on_task_add: notifyOnAdd,
    });
    setSearchQuery('');
  };

  const handleInviteByEmail = async () => {
    if (!user || !currentWorkspace || !isEmailQuery) return;
    const email = searchQuery.trim().toLowerCase();

    // Check if profile exists for this email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      handleInvite(existingProfile);
      return;
    }

    // User doesn't have an account yet - show a message
    toast.error('This user needs to sign up first before they can be invited. Share the workspace invite link instead.');
    setSearchQuery('');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/projects/${project.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Share "{project.name}"</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Invite input row */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isEmailQuery && !hasResults) {
                      handleInviteByEmail();
                    }
                  }}
                  placeholder="Invite with name or email..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-[#4B7C6F]/30 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                {/* Suggestions dropdown */}
                {searchQuery.length >= 2 && (hasResults || isEmailQuery) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                    {/* Workspace members */}
                    {filteredWorkspaceMembers.map((wm) => (
                      <button
                        key={wm.user_id}
                        onClick={() => wm.profiles && handleInvite(wm.profiles)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 text-left"
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(wm.user_id) }}>
                          {getInitials(wm.profiles?.full_name || null)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{wm.profiles?.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{wm.profiles?.email}</p>
                        </div>
                      </button>
                    ))}

                    {/* Additional profiles (not workspace members) */}
                    {additionalProfiles.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => handleInvite(profile)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 text-left"
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(profile.id) }}>
                          {getInitials(profile.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{profile.full_name || profile.email}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{profile.email}</p>
                        </div>
                      </button>
                    ))}

                    {/* Invite by email option when no results */}
                    {!hasResults && isEmailQuery && (
                      <button
                        onClick={handleInviteByEmail}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 text-left"
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#4B7C6F]/10 flex-shrink-0">
                          <Mail className="w-3.5 h-3.5 text-[#4B7C6F]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Invite {searchQuery.trim()}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Send invite by email</p>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Role picker */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 whitespace-nowrap"
                >
                  {ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showRoleDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-10 py-1">
                    {ROLE_OPTIONS.map((role) => (
                      <button
                        key={role.value}
                        onClick={() => { setSelectedRole(role.value); setShowRoleDropdown(false); }}
                        className={cn('w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700', selectedRole === role.value && 'bg-[#4B7C6F]/5')}
                      >
                        <p className={cn('text-sm font-medium', selectedRole === role.value ? 'text-[#4B7C6F]' : 'text-gray-900 dark:text-white')}>{role.label}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{role.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notify checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnAdd}
                onChange={(e) => setNotifyOnAdd(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#4B7C6F] focus:ring-[#4B7C6F]"
              />
              <span className="text-xs text-gray-500 dark:text-slate-400">Notify when tasks are added</span>
            </label>
          </div>

          {/* Access settings */}
          <div className="relative">
            <button
              onClick={() => setShowAccessDropdown(!showAccessDropdown)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              {project.privacy === 'workspace' ? (
                <Globe className="w-4 h-4 text-[#4B7C6F]" />
              ) : (
                <Lock className="w-4 h-4 text-yellow-500" />
              )}
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {project.privacy === 'workspace' ? 'Workspace' : 'Private to members'}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {project.privacy === 'workspace' ? 'Anyone in this workspace can access' : 'Only invited members can access'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {showAccessDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-10 py-1">
                <button
                  onClick={() => { updatePrivacy.mutate('workspace'); setShowAccessDropdown(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Globe className="w-4 h-4 text-[#4B7C6F]" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Workspace</p>
                    <p className="text-xs text-gray-500">Anyone in this workspace can access</p>
                  </div>
                </button>
                <button
                  onClick={() => { updatePrivacy.mutate('private'); setShowAccessDropdown(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Lock className="w-4 h-4 text-yellow-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Private to members</p>
                    <p className="text-xs text-gray-500">Only invited members can access</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Who has access */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">Who has access</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {projectMembers.map((pm) => (
                <div key={pm.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(pm.user_id) }}>
                    {getInitials(pm.profiles?.full_name || null)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {pm.profiles?.full_name || pm.invited_email || 'Unknown'}
                      {pm.user_id === user?.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                    </p>
                    {pm.status === 'pending' && <span className="text-xs text-yellow-600">Pending invite</span>}
                  </div>

                  {/* Role dropdown per member */}
                  <div className="relative">
                    <button
                      onClick={() => setEditingRoleId(editingRoleId === pm.id ? null : pm.id)}
                      disabled={pm.role === 'owner'}
                      className={cn(
                        'text-xs px-2 py-1 rounded-md',
                        pm.role === 'owner'
                          ? 'text-gray-400 cursor-default'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer'
                      )}
                    >
                      {pm.role.charAt(0).toUpperCase() + pm.role.slice(1)}
                      {pm.role !== 'owner' && <ChevronDown className="w-3 h-3 inline ml-0.5" />}
                    </button>
                    {editingRoleId === pm.id && pm.role !== 'owner' && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-10 py-1">
                        {ROLE_OPTIONS.map((role) => (
                          <button
                            key={role.value}
                            onClick={() => {
                              updateMember.mutate({ id: pm.id, role: role.value });
                              setEditingRoleId(null);
                            }}
                            className={cn('w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700', pm.role === role.value ? 'text-[#4B7C6F] font-medium' : 'text-gray-700 dark:text-slate-300')}
                          >
                            {role.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  {pm.role !== 'owner' && pm.user_id !== user?.id && (
                    <button
                      onClick={() => removeMember.mutate(pm.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {projectMembers.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No members yet. Invite someone above.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <Link2 className="w-4 h-4" />
            Copy link
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white bg-[#4B7C6F] rounded-lg hover:bg-[#3d6b5e]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
