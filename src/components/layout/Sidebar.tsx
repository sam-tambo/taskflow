import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { useRBAC } from '@/hooks/useRBAC';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { NotificationBell } from '@/components/layout/NotificationBell';
import {
  Home, Inbox, Search, BarChart3, Users, Settings, Plus, ChevronDown, ChevronRight,
  LogOut, PanelLeftClose, PanelLeft, Star, ListTodo,
  Target, Zap, LayoutGrid, LineChart, GanttChart, FileText
} from 'lucide-react';


const STATUS_COLORS: Record<string, string> = {
  on_track: '#22c55e',
  at_risk: '#f59e0b',
  off_track: '#ef4444',
  on_hold: '#6b7280',
  complete: '#3b82f6',
};

function ProjectStatusDot({ projectId }: { projectId: string }) {
  const { data } = useQuery({
    queryKey: ['project-latest-status', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_status_updates')
        .select('status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data?.status as string | null;
    },
    staleTime: 60000,
  });
  if (!data) return null;
  return <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[data] || '#6b7280' }} title={data.replace('_', ' ')} />;
}

function ProjectAvatars({ projectId }: { projectId: string }) {
  const { data: members = [] } = useProjectMembers(projectId);
  const active = members.filter(m => m.status === 'active').slice(0, 3);
  if (active.length === 0) return null;
  return (
    <div className="flex -space-x-1 ml-auto">
      {active.map((m) => (
        <div key={m.id} className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[7px] font-medium ring-1 ring-white dark:ring-slate-900" style={{ backgroundColor: getAvatarColor(m.user_id) }} title={m.profiles?.full_name || ''}>
          {getInitials(m.profiles?.full_name || null)}
        </div>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed, setCommandPaletteOpen, setQuickAddOpen } = useUIStore();

  // Auto-close sidebar on mobile when navigating
  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };
  const { currentWorkspace, workspaces, teams, setCurrentWorkspace } = useWorkspaceStore();
  const { user, profile, signOut } = useAuth();
  const { data: projects = [] } = useProjects(currentWorkspace?.id);
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const rbac = useRBAC();
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home', badge: null },
    { path: '/my-tasks', icon: ListTodo, label: 'My Tasks', badge: null },
    { path: '/inbox', icon: Inbox, label: 'Inbox', badge: unreadCount > 0 ? unreadCount : null },
    { path: '/favorites', icon: Star, label: 'Favorites', badge: null },
    { path: '/portfolios', icon: BarChart3, label: 'Projects', badge: null },
    { path: '/goals', icon: Target, label: 'Goals', badge: null },
  ];

  if (sidebarCollapsed) {
    return (
      <div className="fixed left-0 top-0 h-screen w-16 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col items-center py-4 z-30">
        <button onClick={toggleSidebar} className="mb-4 p-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
          <PanelLeft className="w-5 h-5" />
        </button>
        {/* Collapsed Create task button */}
        <button
          onClick={() => setQuickAddOpen(true)}
          title="Create task"
          className="mb-4 w-9 h-9 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg flex items-center justify-center shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
        {navItems.map(({ path, icon: Icon, badge }) => (
          <Link key={path} to={path} className={cn('relative p-3 rounded-xl mb-1 transition-colors', isActive(path) ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800')}>
            <Icon className="w-5 h-5" />
            {badge && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{badge}</span>}
          </Link>
        ))}
        <button onClick={() => setCommandPaletteOpen(true)} className="p-3 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl mb-1">
          <Search className="w-5 h-5" />
        </button>
        <NotificationBell collapsed />
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-60 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col z-30">
      {/* Workspace Header */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white"
        >
          <div className="w-7 h-7 bg-[#4B7C6F] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">RP</span>
          </div>
          <span className="text-sm font-semibold truncate flex-1 text-left">{currentWorkspace?.name || 'Revenue Precision'}</span>
          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-400" />
        </button>

        {showWorkspaceSwitcher && (
          <div className="mt-2 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setCurrentWorkspace(ws); setShowWorkspaceSwitcher(false); }}
                className={cn('w-full text-left px-3 py-2 rounded-md text-sm', ws.id === currentWorkspace?.id ? 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700')}
              >
                {ws.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create task button */}
      <div className="px-3 pt-3">
        <button
          onClick={() => setQuickAddOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#16A34A] hover:bg-[#15803d] rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create task</span>
          <span className="ml-auto text-[10px] opacity-60 font-normal">Q</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
          <span className="ml-auto text-xs bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">⌘K</span>
        </button>
      </div>

      {/* Nav Items */}
      <nav className="px-3 pt-3 space-y-0.5">
        {navItems.map(({ path, icon: Icon, label, badge }) => (
          <Link
            key={path}
            to={path}
            onClick={handleNavClick}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors', isActive(path) ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}
          >
            <Icon className="w-4 h-4" />
            <span className="flex-1">{label}</span>
            {badge && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{badge}</span>}
          </Link>
        ))}
      </nav>

      {/* Notification Bell */}
      <div className="px-3 pt-1">
        <NotificationBell />
      </div>

      {/* Divider */}
      <div className="mx-3 my-3 border-t border-gray-200 dark:border-slate-800" />

      {/* Teams & Projects */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">My Projects</span>
          <button
            onClick={() => setShowCreateProject(true)}
            className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white rounded"
            title="New project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Teams — each shows its owned projects */}
        {teams.map((team) => {
          const teamProjects = projects.filter(p => p.team_id === team.id);
          const isExpanded = expandedTeams.has(team.id);
          return (
            <div key={team.id}>
              <button
                onClick={() => toggleTeam(team.id)}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 min-w-0"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                <div className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: team.color + '30' }}>
                  <Users className="w-2.5 h-2.5" style={{ color: team.color }} />
                </div>
                <span className="truncate flex-1 text-left font-medium">{team.name}</span>
              </button>
              {isExpanded && (
                <div className="ml-6 space-y-0.5">
                  {teamProjects.map(project => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      onClick={handleNavClick}
                      className={cn('flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors', isActive(`/projects/${project.id}`) ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                      <span className="truncate flex-1">{project.name}</span>
                      <ProjectStatusDot projectId={project.id} />
                    </Link>
                  ))}
                  {teamProjects.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-slate-600 px-2 py-1">No projects yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Projects not assigned to any team — flat */}
        {projects.filter((p) => !p.team_id).map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            onClick={handleNavClick}
            className={cn('flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors', isActive(`/projects/${project.id}`) ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
            <span className="truncate flex-1">{project.name}</span>
            <ProjectAvatars projectId={project.id} />
          </Link>
        ))}
      </div>

      {/* Bottom nav — compact secondary links */}
      <div className="px-3 py-1.5 border-t border-gray-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-0.5">
          {rbac.isEmployee && !rbac.isClient && (
            <>
              <Link onClick={handleNavClick} to="/reports" title="Reports" className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs', isActive('/reports') ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}>
                <LineChart className="w-3.5 h-3.5" /> Reports
              </Link>
              <Link onClick={handleNavClick} to="/workload" title="Workload" className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs', isActive('/workload') ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}>
                <LayoutGrid className="w-3.5 h-3.5" /> Workload
              </Link>
              <Link onClick={handleNavClick} to="/gantt" title="Gantt Chart" className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs', isActive('/gantt') ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}>
                <GanttChart className="w-3.5 h-3.5" /> Gantt
              </Link>
            </>
          )}
          <Link onClick={handleNavClick} to="/client-report" title="Client Report" className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs', isActive('/client-report') ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}>
            <FileText className="w-3.5 h-3.5" /> Client
          </Link>
          {rbac.isAdmin && (
            <>
              <Link onClick={handleNavClick} to="/automations" title="Automations" className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs', isActive('/automations') ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}>
                <Zap className="w-3.5 h-3.5" /> Auto
              </Link>
              <Link onClick={handleNavClick} to="/members" title="Members" className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs', isActive('/members') ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}>
                <Users className="w-3.5 h-3.5" /> Members
              </Link>
              <Link onClick={handleNavClick} to="/teams" title="Teams" className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs', isActive('/teams') ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}>
                <Users className="w-3.5 h-3.5" /> Teams
              </Link>
            </>
          )}
          {!rbac.isClient && (
            <Link onClick={handleNavClick} to="/settings" title="Settings" className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs', isActive('/settings') ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white')}>
              <Settings className="w-3.5 h-3.5" /> Settings
            </Link>
          )}
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-gray-200 dark:border-slate-800">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(user?.id || '') }}>
              {getInitials(profile?.full_name || null)}
            </div>
            <span className="text-sm text-gray-700 dark:text-slate-300 truncate flex-1">{profile?.full_name || profile?.email || 'User'}</span>
            {rbac.role && <RoleBadge role={rbac.role} />}
          </button>
          {showUserMenu && (
            <div className="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 p-1">
              <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>

        <button onClick={toggleSidebar} className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
          <PanelLeftClose className="w-4 h-4" />
          <span className="text-xs">Collapse</span>
        </button>
      </div>
      <CreateProjectModal open={showCreateProject} onClose={() => setShowCreateProject(false)} />
    </div>
  );
}
