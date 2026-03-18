import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { User, Palette, Building2, Bell, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';

type Tab = 'profile' | 'workspace' | 'appearance' | 'notifications' | 'billing';

export default function Settings() {
  usePageTitle('Settings');
  const { user, profile, updateProfile } = useAuth();
  const { theme, setTheme } = useUIStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    task_assigned: true,
    task_commented: true,
    mentioned: true,
    task_completed: false,
    due_soon: true,
    email_digest: true,
    digest_frequency: 'daily' as 'daily' | 'weekly',
    email_task_assigned: false,
    email_mentioned: false,
    email_due_soon: false,
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    toast.success('Notification preferences saved');
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'workspace' as const, label: 'Workspace', icon: Building2 },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
  ];

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', checked ? 'bg-[#16A34A]' : 'bg-gray-300 dark:bg-slate-600')}
    >
      <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', checked ? 'translate-x-4.5' : 'translate-x-1')} />
    </button>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Tab nav */}
        <div className="flex sm:flex-col sm:w-48 gap-1 overflow-x-auto sm:overflow-visible">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap', tab === id ? 'bg-[#4B7C6F]/10 text-[#4B7C6F] font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800')}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4B7C6F]/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                  <input value={profile?.email || ''} disabled className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-500 cursor-not-allowed" />
                </div>
                <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 bg-[#16A34A] text-white text-sm font-medium rounded-xl hover:bg-[#3d6b5e] disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4B7C6F]/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4B7C6F]/30" />
                </div>
                <button onClick={handleChangePassword} disabled={passwordSaving || !newPassword} className="px-4 py-2 bg-[#16A34A] text-white text-sm font-medium rounded-xl hover:bg-[#3d6b5e] disabled:opacity-50">
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Theme</label>
                <div className="flex gap-3">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn('px-4 py-2 text-sm rounded-xl border transition-colors', theme === t ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F] font-medium' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700')}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'workspace' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Workspace Settings</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Workspace Name</label>
                <input value={currentWorkspace?.name || ''} disabled className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Slug</label>
                <input value={currentWorkspace?.slug || ''} disabled className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-500 cursor-not-allowed" />
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-red-500 mb-2">Danger Zone</h3>
                <button className="px-4 py-2 text-sm font-medium text-red-500 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                  Delete Workspace
                </button>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">In-App Notifications</h2>
                <div className="space-y-3">
                  {[
                    { key: 'task_assigned', label: 'Task assigned to me' },
                    { key: 'task_commented', label: 'Comment on my task' },
                    { key: 'mentioned', label: '@Mentioned in a comment' },
                    { key: 'task_completed', label: 'Task completed by others' },
                    { key: 'due_soon', label: 'Due date tomorrow' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
                      <Toggle checked={(notifPrefs as any)[key]} onChange={(v) => setNotifPrefs(p => ({ ...p, [key]: v }))} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Digest</h2>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-slate-300">Send me an email digest</span>
                  <Toggle checked={notifPrefs.email_digest} onChange={(v) => setNotifPrefs(p => ({ ...p, email_digest: v }))} />
                </div>
                {notifPrefs.email_digest && (
                  <div className="flex gap-3 ml-1">
                    {(['daily', 'weekly'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setNotifPrefs(p => ({ ...p, digest_frequency: f }))}
                        className={cn('px-3 py-1.5 text-sm rounded-lg border', notifPrefs.digest_frequency === f ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400')}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h2>
                <div className="space-y-3">
                  {[
                    { key: 'email_task_assigned', label: 'Task assigned to me (immediate)' },
                    { key: 'email_mentioned', label: '@Mentions (immediate)' },
                    { key: 'email_due_soon', label: 'Due date reminders' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
                      <Toggle checked={(notifPrefs as any)[key]} onChange={(v) => setNotifPrefs(p => ({ ...p, [key]: v }))} />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveNotifications} className="px-4 py-2 bg-[#16A34A] text-white text-sm font-medium rounded-xl hover:bg-[#3d6b5e]">
                Save Preferences
              </button>
            </div>
          )}

          {tab === 'billing' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing</h2>
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#4B7C6F]/10 text-[#4B7C6F] rounded-full text-sm font-medium mb-4">
                  <CreditCard className="w-4 h-4" /> Pro Plan
                </div>
                <p className="text-gray-500 dark:text-slate-400 mb-2">Payment management coming soon.</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Need help? Contact support@revenueprecision.app</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
