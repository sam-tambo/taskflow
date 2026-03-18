import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { supabaseMisconfigured } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/useUIStore';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import AppShell from '@/components/layout/AppShell';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import { lazy, Suspense, useState, useEffect, type ReactNode } from 'react';
import { PageSkeleton } from '@/components/ui/Skeleton';

// Lazy-loaded pages
const Home = lazy(() => import('@/pages/Home'));
const Inbox = lazy(() => import('@/pages/Inbox'));
const Project = lazy(() => import('@/pages/Project'));
const Search = lazy(() => import('@/pages/Search'));
const Portfolios = lazy(() => import('@/pages/Portfolios'));
const Members = lazy(() => import('@/pages/Members'));
const MemberProfile = lazy(() => import('@/pages/MemberProfile'));
const Settings = lazy(() => import('@/pages/Settings'));
const Reports = lazy(() => import('@/pages/Reports'));
const Workload = lazy(() => import('@/pages/Workload'));
const Automations = lazy(() => import('@/pages/Automations'));
const Goals = lazy(() => import('@/pages/Goals'));
const GoalDetail = lazy(() => import('@/pages/GoalDetail'));
const FormBuilder = lazy(() => import('@/pages/FormBuilder'));
const PublicForm = lazy(() => import('@/pages/PublicForm'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));

function ThemeInitializer() {
  const { theme } = useUIStore();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    }
  }, [theme]);
  return null;
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-2 border-coral border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin w-8 h-8 border-2 border-coral border-t-transparent rounded-full" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function KeyboardShortcuts() {
  const { setCommandPaletteOpen, toggleSidebar } = useUIStore();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        setShowShortcuts(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);

  useEffect(() => {
    if (!showShortcuts) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowShortcuts(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showShortcuts]);

  if (!showShortcuts) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6" role="dialog" aria-modal="true">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2 text-sm">
          {[
            ['Cmd + K', 'Open search'],
            ['Cmd + \\', 'Toggle sidebar'],
            ['N', 'New task (in project)'],
            ['C', 'Complete selected task'],
            ['Escape', 'Close panel/modal'],
            ['?', 'Show this help'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-slate-300">{desc}</span>
              <kbd className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-slate-300 font-mono">{key}</kbd>
            </div>
          ))}
        </div>
        <button onClick={() => setShowShortcuts(false)} className="mt-4 w-full px-4 py-2 text-sm text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
          Close
        </button>
      </div>
    </div>
  );
}

function ConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Configuration Required
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Supabase environment variables are not set. Add{' '}
          <code className="text-sm bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-sm bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>{' '}
          to your Vercel project environment variables, then redeploy.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (supabaseMisconfigured) {
    return <ConfigError />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ThemeInitializer />
          <KeyboardShortcuts />
          <CommandPalette />
          <Toaster position="bottom-right" richColors closeButton />
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
              <Route path="/forms/:slug" element={<PublicForm />} />
              <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
                <Route path="/" element={<Home />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/projects/:projectId" element={<Project />} />
                <Route path="/projects/:projectId/forms/:formId" element={<FormBuilder />} />
                <Route path="/search" element={<Search />} />
                <Route path="/portfolios" element={<Portfolios />} />
                <Route path="/members" element={<Members />} />
                <Route path="/members/:userId" element={<MemberProfile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/workload" element={<Workload />} />
                <Route path="/automations" element={<Automations />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/goals/:id" element={<GoalDetail />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
