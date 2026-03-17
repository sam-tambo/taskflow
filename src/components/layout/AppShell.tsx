import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useUIStore } from '@/stores/useUIStore';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';

export default function AppShell() {
  const { sidebarCollapsed, taskDetailId } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      {taskDetailId && <TaskDetailPanel taskId={taskDetailId} />}
    </div>
  );
}
