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
import Onboarding from '@/pages/Onboarding';
import Home from '@/pages/Home';
import Inbox from '@/pages/Inbox';
import Project from '@/pages/Project';
import Search from '@/pages/Search';
import Portfolios from '@/pages/Portfolios';
import Members from '@/pages/Members';
import Settings from '@/pages/Settings';
import { useEffect, type ReactNode } from 'react';

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        // TODO: show shortcuts modal
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen, toggleSidebar]);

  // Cmd+\ to toggle sidebar
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

  return null;
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
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
            <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
              <Route path="/" element={<Home />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/projects/:projectId" element={<Project />} />
              <Route path="/search" element={<Search />} />
              <Route path="/portfolios" element={<Portfolios />} />
              <Route path="/members" element={<Members />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
