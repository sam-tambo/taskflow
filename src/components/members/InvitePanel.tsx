import { useState } from 'react';
import { Link2, Mail, Copy, Check, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InvitePanelProps {
  workspaceId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type InviteMode = 'link' | 'email';
type Role = 'admin' | 'member' | 'guest';

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Can manage members and all projects',
  member: 'Can create and edit projects and tasks',
  guest: 'View and comment on shared projects only',
};

export function InvitePanel({ workspaceId, userId, onClose, onSuccess }: InvitePanelProps) {
  const [mode, setMode] = useState<InviteMode>('link');
  const [role, setRole] = useState<Role>('member');
  const [emails, setEmails] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('workspace_invites')
        .insert({
          workspace_id: workspaceId,
          invited_by: userId,
          role,
          email: null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('token')
        .single();
      if (error) throw error;
      return data.token as string;
    },
    onSuccess: (token) => {
      setGeneratedLink(`${window.location.origin}/invite/${token}`);
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to generate link'),
  });

  const sendEmailInvites = useMutation({
    mutationFn: async () => {
      const emailList = emails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e && e.includes('@'));
      if (emailList.length === 0) throw new Error('No valid email addresses');
      const rows = emailList.map(email => ({
        workspace_id: workspaceId,
        invited_by: userId,
        role,
        email,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));
      const { data, error } = await supabase
        .from('workspace_invites')
        .insert(rows)
        .select('token, email');
      if (error) throw error;
      return data;
    },
    onSuccess: (invites) => {
      toast.success(`${invites.length} invitation${invites.length > 1 ? 's' : ''} created`);
      setEmails('');
      onSuccess();
      onClose();
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to send invitations'),
  });

  const copyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite members</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => { setMode('link'); setGeneratedLink(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all',
                mode === 'link' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'
              )}
            >
              <Link2 className="w-4 h-4" /> Invite link
            </button>
            <button
              onClick={() => setMode('email')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all',
                mode === 'email' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'
              )}
            >
              <Mail className="w-4 h-4" /> By email
            </button>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Role</label>
            <div className="space-y-2">
              {(['admin', 'member', 'guest'] as Role[]).map(r => (
                <label
                  key={r}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    role === r ? 'border-coral bg-coral/5' : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'
                  )}
                >
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-0.5 accent-coral" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{r}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{ROLE_DESCRIPTIONS[r]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Link mode */}
          {mode === 'link' && (
            <div className="space-y-3">
              {!generatedLink ? (
                <>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Generate a shareable link. Anyone with the link can join as a <strong>{role}</strong>. Expires in 7 days.
                  </p>
                  <button
                    onClick={() => generateLink.mutate()}
                    disabled={generateLink.isPending}
                    className="w-full py-2.5 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark disabled:opacity-50 transition-colors"
                  >
                    {generateLink.isPending ? 'Generating...' : 'Generate invite link'}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Invite link generated — expires in 7 days</p>
                  <div className="flex gap-2">
                    <input readOnly value={generatedLink} className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-400 font-mono truncate" />
                    <button onClick={copyLink} className="px-3 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark shrink-0">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <button onClick={() => setGeneratedLink(null)} className="text-xs text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
                    Generate new link
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Email mode */}
          {mode === 'email' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Email addresses</label>
                <textarea
                  value={emails}
                  onChange={e => setEmails(e.target.value)}
                  placeholder="john@example.com, sarah@example.com"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-coral text-sm resize-none"
                />
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Separate multiple emails with commas or new lines</p>
              </div>
              <button
                onClick={() => sendEmailInvites.mutate()}
                disabled={!emails.trim() || sendEmailInvites.isPending}
                className="w-full py-2.5 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark disabled:opacity-50 transition-colors"
              >
                {sendEmailInvites.isPending ? 'Sending...' : 'Send invitations'}
              </button>
              <p className="text-xs text-gray-400 dark:text-slate-500 text-center">Invitees will receive a link to join this workspace</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
