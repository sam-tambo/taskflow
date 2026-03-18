import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useProjectStore } from '@/stores/useProjectStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useRealtimeTasks } from '@/hooks/useRealtime';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import ListView from '@/components/views/ListView';
import BoardView from '@/components/views/BoardView';
import TimelineView from '@/components/views/TimelineView';
import CalendarView from '@/components/views/CalendarView';

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId);
  usePageTitle(project?.name ?? 'Project');
  const { setCurrentProject } = useProjectStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [view, setView] = useState<'list' | 'board' | 'timeline' | 'calendar'>('list');

  useRealtimeTasks(projectId);

  useEffect(() => {
    if (project) {
      setCurrentProject(project);
      setView(project.default_view || 'list');
    }
    return () => setCurrentProject(null);
  }, [project, setCurrentProject]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-16 rounded-xl" />
        <div className="skeleton h-10 w-64 rounded-lg" />
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-gray-500 dark:text-slate-400">Project not found</p>
        </div>
      </div>
    );
  }

  const workspaceId = currentWorkspace?.id || project.workspace_id;

  return (
    <div className="h-full flex flex-col">
      <ProjectHeader project={project} currentView={view} onViewChange={setView} />
      <div className="flex-1 overflow-hidden">
        {view === 'list' && <ListView projectId={project.id} workspaceId={workspaceId} />}
        {view === 'board' && <BoardView projectId={project.id} workspaceId={workspaceId} />}
        {view === 'timeline' && <TimelineView projectId={project.id} workspaceId={workspaceId} />}
        {view === 'calendar' && <CalendarView projectId={project.id} workspaceId={workspaceId} />}
      </div>
    </div>
  );
}
