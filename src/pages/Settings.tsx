import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { User, Palette, Building2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'workspace' | 'appearance';

export default function Settings() {
  usePageTitle('Settings');
  const { user, profile, updateProfile } = useAuth();
  const { theme, setTheme } = useUIStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

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

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'workspace' as const, label: 'Workspace', icon: Building2 },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Tab nav */}
        <div className="w-48 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors', tab === id ? 'bg-coral/10 text-coral font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800')}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'profile' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-coral/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                <input value={profile?.email || ''} disabled className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-500 cursor-not-allowed" />
              </div>
              <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-xl hover:bg-coral-dark disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
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
                      className={cn('px-4 py-2 text-sm rounded-xl border transition-colors', theme === t ? 'border-coral bg-coral/10 text-coral font-medium' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700')}
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
        </div>
      </div>
    </div>
  );
}
