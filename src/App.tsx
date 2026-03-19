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
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
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
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const GanttChart = lazy(() => import('@/pages/GanttChart'));
const ClientReport = lazy(() => import('@/pages/ClientReport'));
const Favorites = lazy(() => import('@/pages/Favorites'));
const Teams = lazy(() => import('@/pages/Teams'));
const MyTasks = lazy(() => import('@/pages/MyTasks'));
const NotFound = lazy(() => import('@/pages/NotFound'));

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
