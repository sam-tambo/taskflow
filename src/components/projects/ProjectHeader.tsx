import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { QuickAddTaskModal } from '@/components/tasks/QuickAddTaskModal';
import { ShareProjectModal } from '@/components/projects/ShareProjectModal';
import { List, Columns3, GanttChart, CalendarDays, Filter, ArrowUpDown, Plus, Share2, Download, Copy, MoreHorizontal, LayoutDashboard, Archive, Trash2, FolderOpen, ChevronRight, Check } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useCreateProject, useSections } from '@/hooks/useProjects';
import { usePortfolios, useAddProjectToPortfolio, usePortfolioProjects } from '@/hooks/usePortfolios';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Project } from '@/types';

interface ProjectHeaderProps {
  project: Project;
  currentView: string;
  onViewChange: (view: 'overview' | 'list' | 'board' | 'timeline' | 'calendar') => void;
}

const views = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'list' as const, label: 'List', icon: List },
  { id: 'board' as const, label: 'Board', icon: Columns3 },
  { id: 'timeline' as const, label: 'Timeline', icon: GanttChart },
  { id: 'calendar' as const, label: 'Calendar', icon: CalendarDays },
];

export function ProjectHeader({ project, currentView, onViewChange }: ProjectHeaderProps) {
  const { data: tasks = [] } = useTasks(project.id);
  const { data: projectMembers = [] } = useProjectMembers(project.id);
  const [showExport, setShowExport] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showPortfolioMenu, setShowPortfolioMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const { data: sections = [] } = useSections(project.id);
  const createProject = useCreateProject(currentWorkspace?.id);
  const { data: portfolios = [] } = usePortfolios(currentWorkspace?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleNameSave = async () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) {
      const { error } = await supabase.from('projects').update({ name: trimmed }).eq('id', project.id);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['project', project.id] });
        toast.success('Project name updated');
      } else {
        toast.error('Failed to update name');
        setEditName(project.name);
      }
    } else {
      setEditName(project.name);
    }
    setIsEditingName(false);
  };

  const handleDuplicate = async () => {
    if (!currentWorkspace?.id || !user?.id) return;
    try {
      const { data: newProject, error: projErr } = await supabase
        .from('projects')
        .insert({
          name: `${project.name} (copy)`,
          description: project.description,
          color: project.color,
          icon: project.icon,
          privacy: project.privacy,
          workspace_id: currentWorkspace.id,
          owner_id: user.id,
          status: 'active' as const,
          default_view: project.default_view,
        })
        .select()
        .single();
      if (projErr || !newProject) throw projErr;

      // Duplicate sections and map old->new IDs
      const sectionMap = new Map<string, string>();
      for (const s of sections) {
        const { data: newSection } = await supabase
          .from('sections')
          .insert({ project_id: newProject.id, name: s.name, position: s.position, color: s.color })
          .select()
          .single();
        if (newSection) sectionMap.set(s.id, newSection.id);
      }

      // Duplicate tasks (top-level only)
      for (const t of tasks) {
        await supabase.from('tasks').insert({
          workspace_id: currentWorkspace.id,
          project_id: newProject.id,
          section_id: t.section_id ? sectionMap.get(t.section_id) || null : null,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          position: t.position,
          tags: t.tags,
          estimated_hours: t.estimated_hours,
          created_by: user.id,
        });
      }

      toast.success('Project duplicated with tasks');
      navigate(`/projects/${newProject.id}`);
      setShowMore(false);
    } catch {
      toast.error('Failed to duplicate project');
    }
  };
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: project.color }}>
          <span className="text-white text-sm font-bold">{project.name[0]}</span>
        </div>
        <div className="flex-1">
          {isEditingName ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditName(project.name); setIsEditingName(false); } }}
              className="text-lg font-semibold bg-transparent border-b border-[#4B7C6F] outline-none text-gray-900 dark:text-white w-full"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => { setEditName(project.name); setIsEditingName(true); }}
              className="text-lg font-semibold text-gray-900 dark:text-white cursor-text hover:text-[#4B7C6F] transition-colors"
              title="Click to edit project name"
            >
              {project.name}
            </h1>
          )}
          {project.description && <p className="text-xs text-gray-500 dark:text-slate-400">{project.description}</p>}
        </div>
        {/* Member avatars */}
        <div className="flex items-center -space-x-1.5">
          {projectMembers.filter(m => m.status === 'active').slice(0, 4).map((pm) => (
            <div key={pm.id} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium ring-2 ring-white dark:ring-slate-900" style={{ backgroundColor: getAvatarColor(pm.user_id) }} title={pm.profiles?.full_name || ''}>
              {getInitials(pm.profiles?.full_name || null)}
            </div>
          ))}
          {projectMembers.filter(m => m.status === 'active').length > 4 && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900">
              +{projectMembers.filter(m => m.status === 'active').length - 4}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowShare(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
          </div>
          <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">{percentage}% ({completed}/{total})</span>
        </div>
      )}

      {/* View tabs and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                currentView === id ? 'bg-[#4B7C6F]/10 text-[#4B7C6F] font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#16A34A] hover:bg-[#16A34A]/90 rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
            <ArrowUpDown className="w-4 h-4" /> Sort
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-20">
                <button
                  onClick={async () => { const { exportTasksAsCsv } = await import('@/lib/exportCsv'); exportTasksAsCsv(tasks, project.name); setShowExport(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Export as CSV
                </button>
                <button
                  onClick={async () => { const { exportProjectAsPdf } = await import('@/lib/exportPdf'); exportProjectAsPdf(project, tasks); setShowExport(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Export as PDF
                </button>
              </div>
            )}
          <div className="relative">
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMore && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-20">
                <button
                  onClick={handleDuplicate}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <Copy className="w-4 h-4" /> Duplicate project
                </button>
                <button
                  onClick={async () => {
                    const newStatus = project.status === 'archived' ? 'active' : 'archived';
                    await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
                    queryClient.invalidateQueries({ queryKey: ['projects'] });
                    queryClient.invalidateQueries({ queryKey: ['project', project.id] });
                    toast.success(newStatus === 'archived' ? 'Project archived' : 'Project restored');
                    if (newStatus === 'archived') navigate('/');
                    setShowMore(false);
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <Archive className="w-4 h-4" /> {project.status === 'archived' ? 'Restore project' : 'Archive project'}
                </button>
                {/* Add to portfolio */}
                <div className="relative">
                  <button
                    onClick={() => setShowPortfolioMenu(!showPortfolioMenu)}
                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span className="flex-1">Add to portfolio</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {showPortfolioMenu && (
                    <div className="absolute right-full top-0 mr-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-30">
                      {portfolios.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-400">No portfolios yet</p>
                      ) : (
                        portfolios.map(pf => (
                          <PortfolioMenuItem
                            key={pf.id}
                            portfolioId={pf.id}
                            portfolioName={pf.name}
                            projectId={project.id}
                            onDone={() => { setShowPortfolioMenu(false); setShowMore(false); }}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                <hr className="my-1 border-gray-100 dark:border-slate-700" />
                <button
                  onClick={async () => {
                    if (!confirm('Permanently delete this project and all its tasks? This cannot be undone.')) return;
                    await supabase.from('projects').delete().eq('id', project.id);
                    // Remove immediately so sidebar doesn't show stale entry,
                    // then invalidate so any surviving queries refetch cleanly.
                    queryClient.removeQueries({ queryKey: ['projects'] });
                    queryClient.removeQueries({ queryKey: ['project', project.id] });
                    toast.success('Project deleted');
                    navigate('/');
                    setShowMore(false);
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" /> Delete project
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
      <QuickAddTaskModal open={showQuickAdd} onClose={() => setShowQuickAdd(false)} projectId={project.id} />
      <ShareProjectModal open={showShare} onClose={() => setShowShare(false)} project={project} />
    </div>
  );
}

// Sub-component: single portfolio item in the submenu — shows checkmark if already added
function PortfolioMenuItem({ portfolioId, portfolioName, projectId, onDone }: {
  portfolioId: string;
  portfolioName: string;
  projectId: string;
  onDone: () => void;
}) {
  const { data: portfolioProjects = [] } = usePortfolioProjects(portfolioId);
  const addToPortfolio = useAddProjectToPortfolio(portfolioId);
  const queryClient = useQueryClient();

  const isAlreadyAdded = portfolioProjects.some(p => p.id === projectId);

  const handleClick = async () => {
    if (isAlreadyAdded) return;
    await addToPortfolio.mutateAsync({ projectId, position: portfolioProjects.length });
    queryClient.invalidateQueries({ queryKey: ['all-portfolio-projects'] });
    onDone();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isAlreadyAdded || addToPortfolio.isPending}
      className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-60"
    >
      <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="flex-1 truncate">{portfolioName}</span>
      {isAlreadyAdded && <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
    </button>
  );
}
