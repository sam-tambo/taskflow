import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useUIStore } from '@/stores/useUIStore';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { useWorkspaceLoader } from '@/hooks/useWorkspaceLoader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConnectionBanner } from '@/components/ConnectionBanner';

export default function AppShell() {
  const { sidebarCollapsed, taskDetailId, closeTaskDetail } = useUIStore();
  useWorkspaceLoader();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {!sidebarCollapsed && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50" onClick={() => useUIStore.getState().setSidebarCollapsed(true)} />
          <div className="relative z-50 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        <ConnectionBanner />
        <TopBar />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      {taskDetailId && (
        <>
          <div className="fixed inset-0 z-30" onClick={closeTaskDetail} />
          <div className="fixed right-0 top-0 h-screen w-full sm:w-[480px] z-40">
            <ErrorBoundary>
              <TaskDetailPanel taskId={taskDetailId} />
            </ErrorBoundary>
          </div>
        </>
      )}
    </div>
  );
}
