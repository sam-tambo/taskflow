import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface InviteData {
  id: string;
  workspace_id: string;
  role: string;
  email: string | null;
  expires_at: string;
  accepted_at: string | null;
  workspaces: { id: string; name: string; logo_url: string | null };
}

type PageState = 'loading' | 'valid' | 'invalid' | 'expired' | 'already_used' | 'accepting' | 'success' | 'error';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [state, setState] = useState<PageState>('loading');
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('id, workspace_id, role, email, expires_at, accepted_at, workspaces!workspace_id(id, name, logo_url)')
        .eq('token', token!)
        .single();

      if (error || !data) { setState('invalid'); return; }

      const inviteData = data as unknown as InviteData;

      if (inviteData.accepted_at) { setState('already_used'); setInvite(inviteData); return; }
      if (new Date(inviteData.expires_at) < new Date()) { setState('expired'); setInvite(inviteData); return; }

      setInvite(inviteData);
      setState('valid');
    } catch {
      setState('invalid');
    }
  };

  const acceptInvite = async () => {
    if (!invite) return;

    if (!user) {
      sessionStorage.setItem('pending_invite_token', token ?? '');
      // Preserve the ?redirect= param so AcceptInvite can follow it after login
      const invitePath = redirectPath !== '/' ? `/invite/${token}?redirect=${encodeURIComponent(redirectPath)}` : `/invite/${token}`;
      navigate(`/login?redirect=${encodeURIComponent(invitePath)}`);
      return;
    }

    setState('accepting');
    try {
      // Ensure a profile row exists for this user before touching workspace_members.
      // The signup trigger can fail silently (e.g. metadata missing), leaving auth.users
      // without a matching profiles row — which causes workspace_members FK violations.
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email ?? '',
          full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );

      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: invite.workspace_id,
          user_id: user.id,
          role: invite.role,
        });

      // code 23505 = unique_violation (user is already a member — that's fine)
      if (memberError && memberError.code !== '23505') {
        throw memberError;
      }

      // Mark the invite as accepted. This may be a no-op if the user doesn't have
      // permission to update the invite record (non-admin), but that's non-fatal —
      // the workspace_members row was already created above.
      const { error: updateError } = await supabase
        .from('workspace_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      if (updateError) {
        // Non-fatal: log but don't block the user from joining
        console.warn('[AcceptInvite] Could not mark invite as accepted:', updateError.message);
      }

      // If the redirect is to a specific project, auto-add the user to that project
      // so they land on it with access (handles the "copy project link" invite flow).
      const projectMatch = redirectPath.match(/^\/projects\/([0-9a-f-]{36})/i);
      if (projectMatch) {
        const projectId = projectMatch[1];
        const { error: pmError } = await supabase
          .from('project_members')
          .insert({ project_id: projectId, user_id: user.id, role: 'editor' });
        if (pmError && pmError.code !== '23505') {
          // 23505 = already a member (fine). Other errors are non-fatal — log only.
          console.warn('[AcceptInvite] Could not add to project:', pmError.message);
        }
      }

      setState('success');
      // Use window.location.href instead of navigate() so the app fully reloads
      // and useWorkspaceLoader re-runs to pick up the newly joined workspace.
      // This is important for already-logged-in users who join a second workspace.
      setTimeout(() => { window.location.href = redirectPath; }, 2000);
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message ?? 'Failed to accept invitation');
    }
  };

  const roleLabel = (role: string) =>
    ({ owner: 'Owner', admin: 'Admin', employee: 'Employee', client: 'Client' } as Record<string, string>)[role] ?? role;

  const wrapper = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-12 h-12 bg-[#4B7C6F] rounded-xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-base font-bold">RP</span>
        </div>
        {children}
      </div>
    </div>
  );

  if (state === 'loading') return wrapper(
    <div className="space-y-3 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48 mx-auto" />
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-64 mx-auto" />
      <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-full mt-6" />
    </div>
  );

  if (state === 'invalid') return wrapper(
    <>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid invite</h1>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">This invite link doesn't exist or has been revoked.</p>
      <Link to="/" className="text-sm text-[#4B7C6F] hover:underline">Go to Revenue Precision</Link>
    </>
  );

  if (state === 'expired') return wrapper(
    <>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invite expired</h1>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-2">
        This invite to <strong>{invite?.workspaces?.name}</strong> has expired.
      </p>
      <p className="text-gray-400 dark:text-slate-500 text-xs mb-6">Ask a workspace admin for a new invite.</p>
      <Link to="/" className="text-sm text-[#4B7C6F] hover:underline">Go to Revenue Precision</Link>
    </>
  );

  if (state === 'already_used') return wrapper(
    <>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Already accepted</h1>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
        This invite has already been used. You may already be a member of <strong>{invite?.workspaces?.name}</strong>.
      </p>
      <Link to="/" className="inline-block px-6 py-2.5 bg-[#16A34A] text-white rounded-xl text-sm font-medium hover:bg-[#3d6b5e]">
        Go to workspace
      </Link>
    </>
  );

  if (state === 'accepting') return wrapper(
    <>
      <div className="animate-spin w-8 h-8 border-2 border-[#4B7C6F] border-t-transparent rounded-full mx-auto mb-4" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Joining workspace...</h1>
      <p className="text-gray-500 dark:text-slate-400 text-sm">Just a moment</p>
    </>
  );

  if (state === 'success') return wrapper(
    <>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You're in!</h1>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-2">
        You've joined <strong>{invite?.workspaces?.name}</strong> as a <strong>{roleLabel(invite?.role ?? 'member')}</strong>.
      </p>
      <p className="text-gray-400 dark:text-slate-500 text-xs">Redirecting you to the workspace...</p>
    </>
  );

  if (state === 'error') return wrapper(
    <>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">{errorMessage}</p>
      <button onClick={acceptInvite} className="px-6 py-2.5 bg-[#16A34A] text-white rounded-xl text-sm font-medium hover:bg-[#3d6b5e]">
        Try again
      </button>
    </>
  );

  // state === 'valid'
  return wrapper(
    <>
      <div className="w-16 h-16 rounded-xl bg-purple-500 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl text-white font-bold">
          {invite?.workspaces?.name?.charAt(0) ?? '?'}
        </span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You've been invited to join</h1>
      <p className="text-2xl font-bold text-[#4B7C6F] mb-1">{invite?.workspaces?.name}</p>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        You'll join as a <strong className="text-gray-700 dark:text-slate-300">{roleLabel(invite?.role ?? 'member')}</strong>
        {invite?.email && ` · Sent to ${invite.email}`}
      </p>

      {user ? (
        <div className="space-y-3">
          <button
            onClick={acceptInvite}
            className="w-full py-3 bg-[#16A34A] text-white rounded-xl font-semibold hover:bg-[#3d6b5e] transition-colors text-sm"
          >
            Accept invitation
          </button>
          <p className="text-xs text-gray-400 dark:text-slate-500">Joining as <strong>{user.email}</strong></p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Sign in or create an account to accept.</p>
          <Link
            to={`/login?redirect=/invite/${token}`}
            className="block w-full py-2.5 bg-[#16A34A] text-white rounded-xl font-medium hover:bg-[#3d6b5e] transition-colors text-sm text-center"
          >
            Sign in to accept
          </Link>
          <Link
            to={`/register?redirect=/invite/${token}`}
            className="block w-full py-2.5 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium hover:border-[#4B7C6F] hover:text-[#4B7C6F] transition-colors text-sm text-center"
          >
            Create account
          </Link>
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">Expires {new Date(invite?.expires_at ?? '').toLocaleDateString()}</p>
    </>
  );
}
