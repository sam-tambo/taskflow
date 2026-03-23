import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useProjectStore } from '@/stores/useProjectStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useRealtimeTasks } from '@/hooks/useRealtime';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { FilterBar, DEFAULT_FILTERS, type TaskFilters } from '@/components/projects/FilterBar';
import ListView from '@/components/views/ListView';
import BoardView from '@/components/views/BoardView';
import TimelineView from '@/components/views/TimelineView';
import CalendarView from '@/components/views/CalendarView';
import ProjectOverview from '@/components/projects/ProjectOverview';
import { MilestonePanel } from '@/components/projects/MilestonePanel';
import { StatusUpdatePanel } from '@/components/projects/StatusUpdatePanel';
import { useProjectMembers, useAddProjectMember } from '@/hooks/useProjectMembers';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId);
  usePageTitle(project?.name ?? 'Project');
  const { setCurrentProject } = useProjectStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'overview' | 'list' | 'board' | 'timeline' | 'calendar'>('list');
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [isJoining, setIsJoining] = useState(false);

  const { data: projectMembers = [] } = useProjectMembers(project?.id);
  const addMember = useAddProjectMember(project?.id);

  useRealtimeTasks(projectId);

  useEffect(() => {
    if (project) {
      setCurrentProject(project);
      setView(project.default_view || 'list');
    }
    return () => setCurrentProject(null);
  }, [project, setCurrentProject]);

  // Check if current user is already a project member
  const isMember = user ? projectMembers.some(m => m.user_id === user.id) : false;

  const handleJoinProject = () => {
    if (!user || !project || isJoining) return;
    setIsJoining(true);
    addMember.mutate(
      {
        project_id: project.id,
        user_id: user.id,
        role: 'editor',
        invited_by: user.id,
        status: 'active',
      },
      {
        onSuccess: () => {
          // Invalidate all project list queries so this project appears in sidebar
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          setIsJoining(false);
        },
        onError: () => setIsJoining(false),
      }
    );
  };

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
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access required</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            You don't have permission to view this project. Ask the project owner to invite you, or check that the link is correct.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#4B7C6F] rounded-lg hover:bg-[#3d6b5e] transition-colors"
          >
            Go to my projects
          </a>
        </div>
      </div>
    );
  }

  const workspaceId = currentWorkspace?.id || project.workspace_id;

  return (
    <div className="h-full flex flex-col">
      {/* Join Project banner — shown when user is viewing but not yet a member */}
      {user && !isMember && projectMembers.length > 0 && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#4B7C6F]/5 border-b border-[#4B7C6F]/20 dark:bg-[#4B7C6F]/10 dark:border-[#4B7C6F]/30 flex-shrink-0">
          <p className="text-sm text-[#3d6b5e] dark:text-[#6fa898]">
            You're viewing this project. Join to track it in your sidebar and receive updates.
          </p>
          <button
            onClick={handleJoinProject}
            disabled={isJoining}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-[#4B7C6F] rounded-lg hover:bg-[#3d6b5e] transition-colors disabled:opacity-60 flex-shrink-0 ml-4"
          >
            <UserPlus className="w-4 h-4" />
            {isJoining ? 'Joining...' : 'Join project'}
          </button>
        </div>
      )}
      <ProjectHeader project={project} currentView={view} onViewChange={setView} />
      {view === 'overview' ? (
        <div className="flex-1 overflow-y-auto">
          <ProjectOverview project={project} />
        </div>
      ) : (
        <>
          <FilterBar filters={filters} onChange={setFilters} />
          <div className="flex-1 min-w-0 overflow-hidden flex">
            <div className="flex-1 min-w-0 overflow-hidden">
              {view === 'list' && <ListView projectId={project.id} workspaceId={workspaceId} filters={filters} />}
              {view === 'board' && <BoardView projectId={project.id} workspaceId={workspaceId} filters={filters} />}
              {view === 'timeline' && <TimelineView projectId={project.id} workspaceId={workspaceId} />}
              {view === 'calendar' && <CalendarView projectId={project.id} workspaceId={workspaceId} />}
            </div>
            <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-slate-800 overflow-y-auto p-4 hidden lg:block space-y-6">
              <StatusUpdatePanel projectId={project.id} />
              <MilestonePanel projectId={project.id} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
