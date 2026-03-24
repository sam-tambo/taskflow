import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { supabaseMisconfigured } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/useUIStore';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { ShortcutsModal } from '@/components/ShortcutsModal';
import { GlobalQuickAdd } from '@/components/tasks/GlobalQuickAdd';
import AppShell from '@/components/layout/AppShell';
import { RoleGuard } from '@/components/ui/RoleGuard';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import { lazy, Suspense, useEffect, type ReactNode, type ComponentType } from 'react';
import { PageSkeleton } from '@/components/ui/Skeleton';

// Retry wrapper for lazy imports — handles stale chunks after Vercel redeployments
function lazyWithRetry(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    importFn().catch((error) => {
      // Only reload once to avoid infinite loops
      const key = 'chunk_reload';
      const hasReloaded = sessionStorage.getItem(key);
      if (!hasReloaded) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise(() => {}); // Never resolves — page is reloading
      }
      sessionStorage.removeItem(key);
      throw error;
    })
  );
}

// Lazy-loaded pages
const Home = lazyWithRetry(() => import('@/pages/Home'));
const Inbox = lazyWithRetry(() => import('@/pages/Inbox'));
const Project = lazyWithRetry(() => import('@/pages/Project'));
const Search = lazyWithRetry(() => import('@/pages/Search'));
const Portfolios = lazyWithRetry(() => import('@/pages/Portfolios'));
const PortfolioDetail = lazyWithRetry(() => import('@/pages/PortfolioDetail'));
const Members = lazyWithRetry(() => import('@/pages/Members'));
const MemberProfile = lazyWithRetry(() => import('@/pages/MemberProfile'));
const Settings = lazyWithRetry(() => import('@/pages/Settings'));
const Reports = lazyWithRetry(() => import('@/pages/Reports'));
const Workload = lazyWithRetry(() => import('@/pages/Workload'));
const Automations = lazyWithRetry(() => import('@/pages/Automations'));
const Goals = lazyWithRetry(() => import('@/pages/Goals'));
const GoalDetail = lazyWithRetry(() => import('@/pages/GoalDetail'));
const FormBuilder = lazyWithRetry(() => import('@/pages/FormBuilder'));
const PublicForm = lazyWithRetry(() => import('@/pages/PublicForm'));
const AcceptInvite = lazyWithRetry(() => import('@/pages/AcceptInvite'));
const Onboarding = lazyWithRetry(() => import('@/pages/Onboarding'));
const GanttChart = lazyWithRetry(() => import('@/pages/GanttChart'));
const ClientReport = lazyWithRetry(() => import('@/pages/ClientReport'));
const Favorites = lazyWithRetry(() => import('@/pages/Favorites'));
const Teams = lazyWithRetry(() => import('@/pages/Teams'));
const MyTasks = lazyWithRetry(() => import('@/pages/MyTasks'));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));

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
        <div className="animate-spin w-8 h-8 border-2 border-[#4B7C6F] border-t-transparent rounded-full" />
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
        <div className="animate-spin w-8 h-8 border-2 border-[#4B7C6F] border-t-transparent rounded-full" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
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
          <CommandPalette />
          <ShortcutsModal />
          <GlobalQuickAdd />
          <Toaster position="bottom-right" richColors closeButton />
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
              <Route path="/forms/:slug" element={<PublicForm />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
                <Route path="/" element={<Home />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/projects/:projectId" element={<Project />} />
                <Route path="/projects/:projectId/forms/:formId" element={<FormBuilder />} />
                <Route path="/search" element={<Search />} />
                <Route path="/portfolios" element={<Portfolios />} />
                <Route path="/portfolios/:id" element={<PortfolioDetail />} />
                <Route path="/members" element={<RoleGuard minRole="admin"><Members /></RoleGuard>} />
                <Route path="/teams" element={<RoleGuard minRole="admin"><Teams /></RoleGuard>} />
                <Route path="/members/:userId" element={<RoleGuard minRole="admin"><MemberProfile /></RoleGuard>} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/reports" element={<RoleGuard minRole="employee"><Reports /></RoleGuard>} />
                <Route path="/workload" element={<RoleGuard minRole="employee"><Workload /></RoleGuard>} />
                <Route path="/automations" element={<RoleGuard minRole="admin"><Automations /></RoleGuard>} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/goals/:id" element={<GoalDetail />} />
                <Route path="/gantt" element={<RoleGuard minRole="employee"><GanttChart /></RoleGuard>} />
                <Route path="/client-report" element={<ClientReport />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
