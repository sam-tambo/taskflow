import { useState } from 'react';
import { X, Link2, ChevronDown, Search, Globe, Lock, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { usePortfolioMembers, useAddPortfolioMember, useUpdatePortfolioMember, useRemovePortfolioMember } from '@/hooks/usePortfolioMembers';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { toast } from 'sonner';
import type { Portfolio, PortfolioRole, Profile } from '@/types';

interface SharePortfolioModalProps {
  open: boolean;
  onClose: () => void;
  portfolio: Portfolio;
}

const ROLE_OPTIONS: { value: PortfolioRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Can manage members and all portfolio settings' },
  { value: 'editor', label: 'Editor', description: 'Can add and remove projects' },
  { value: 'commenter', label: 'Commenter', description: 'Can comment on projects only' },
  { value: 'viewer', label: 'Viewer', description: 'Can view portfolio only' },
];

export function SharePortfolioModal({ open, onClose, portfolio }: SharePortfolioModalProps) {
  const { members: workspaceMembers } = useWorkspaceStore();
  const { user } = useAuth();
  const { data: portfolioMembers = [] } = usePortfolioMembers(portfolio.id);
  const addMember = useAddPortfolioMember(portfolio.id);
  const updateMember = useUpdatePortfolioMember(portfolio.id);
  const removeMember = useRemovePortfolioMember(portfolio.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<PortfolioRole>('editor');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  if (!open) return null;

  const existingUserIds = new Set(portfolioMembers.map(m => m.user_id));
  // Also exclude the portfolio owner from invite suggestions
  existingUserIds.add(portfolio.owner_id);

  const filteredMembers = workspaceMembers.filter(wm => {
    if (existingUserIds.has(wm.user_id)) return false;
    if (!searchQuery) return false;
    const name = wm.profiles?.full_name || '';
    const email = wm.profiles?.email || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const handleInvite = (memberProfile: Profile) => {
    if (!user) return;
    addMember.mutate({
      portfolio_id: portfolio.id,
      user_id: memberProfile.id,
      role: selectedRole,
      invited_by: user.id,
      invited_email: memberProfile.email,
    });
    setSearchQuery('');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/portfolios`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Find owner profile from workspace members
  const ownerProfile = workspaceMembers.find(wm => wm.user_id === portfolio.owner_id)?.profiles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Share "{portfolio.name}"</h2>
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
                  placeholder="Invite with name or email..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-[#4B7C6F]/30 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                {filteredMembers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                    {filteredMembers.map((wm) => (
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
          </div>

          {/* Access info */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg">
            <Globe className="w-4 h-4 text-[#4B7C6F]" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Workspace</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Anyone in this workspace can access</p>
            </div>
          </div>

          {/* Who has access */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">Who has access</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {/* Portfolio owner - always shown first */}
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(portfolio.owner_id) }}>
                  {getInitials(ownerProfile?.full_name || null)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {ownerProfile?.full_name || 'Owner'}
                    {portfolio.owner_id === user?.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-md text-gray-400 cursor-default">Admin</span>
              </div>

              {/* Portfolio members */}
              {portfolioMembers.map((pm) => (
                <div key={pm.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(pm.user_id) }}>
                    {getInitials(pm.profiles?.full_name || null)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {pm.profiles?.full_name || pm.invited_email || 'Unknown'}
                      {pm.user_id === user?.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                    </p>
                  </div>

                  {/* Role dropdown per member */}
                  <div className="relative">
                    <button
                      onClick={() => setEditingRoleId(editingRoleId === pm.id ? null : pm.id)}
                      className="text-xs px-2 py-1 rounded-md text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer"
                    >
                      {pm.role.charAt(0).toUpperCase() + pm.role.slice(1)}
                      <ChevronDown className="w-3 h-3 inline ml-0.5" />
                    </button>
                    {editingRoleId === pm.id && (
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
                  {pm.user_id !== user?.id && (
                    <button
                      onClick={() => removeMember.mutate(pm.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
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
