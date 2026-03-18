import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import {
  Home, Inbox, Search, BarChart3, Users, Settings, Plus, ChevronDown, ChevronRight,
  FolderKanban, LogOut, PanelLeftClose, PanelLeft, Sparkles, Hash,
  Target, Zap, LayoutGrid, LineChart
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed, setCommandPaletteOpen } = useUIStore();

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
    { path: '/inbox', icon: Inbox, label: 'Inbox', badge: unreadCount > 0 ? unreadCount : null },
  ];

  if (sidebarCollapsed) {
    return (
      <div className="fixed left-0 top-0 h-screen w-16 bg-slate-900 flex flex-col items-center py-4 z-30">
        <button onClick={toggleSidebar} className="mb-6 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
          <PanelLeft className="w-5 h-5" />
        </button>
        {navItems.map(({ path, icon: Icon, badge }) => (
          <Link key={path} to={path} className={cn('relative p-3 rounded-xl mb-1 transition-colors', isActive(path) ? 'bg-coral text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800')}>
            <Icon className="w-5 h-5" />
            {badge && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{badge}</span>}
          </Link>
        ))}
        <button onClick={() => setCommandPaletteOpen(true)} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl mb-1">
          <Search className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-60 bg-slate-900 flex flex-col z-30">
      {/* Workspace Header */}
      <div className="p-3 border-b border-slate-800">
        <button
          onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 text-white"
        >
          <div className="w-7 h-7 bg-coral rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold truncate flex-1 text-left">{currentWorkspace?.name || 'TaskFlow'}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {showWorkspaceSwitcher && (
          <div className="mt-2 bg-slate-800 rounded-lg p-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setCurrentWorkspace(ws); setShowWorkspaceSwitcher(false); }}
                className={cn('w-full text-left px-3 py-2 rounded-md text-sm', ws.id === currentWorkspace?.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700')}
              >
                {ws.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
          <span className="ml-auto text-xs bg-slate-700 px-1.5 py-0.5 rounded">⌘K</span>
        </button>
      </div>

      {/* Nav Items */}
      <nav className="px-3 pt-3 space-y-0.5">
        {navItems.map(({ path, icon: Icon, label, badge }) => (
          <Link
            key={path}
            to={path}
            onClick={handleNavClick}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors', isActive(path) ? 'bg-coral/20 text-coral' : 'text-slate-300 hover:bg-slate-800 hover:text-white')}
          >
            <Icon className="w-4 h-4" />
            <span className="flex-1">{label}</span>
            {badge && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{badge}</span>}
          </Link>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-3 border-t border-slate-800" />

      {/* Teams & Projects */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Projects</span>
          <button onClick={() => setShowCreateProject(true)} className="p-1 text-slate-500 hover:text-white rounded">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {teams.map((team) => (
          <div key={team.id}>
            <button onClick={() => toggleTeam(team.id)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-400 hover:text-white rounded-md hover:bg-slate-800">
              {expandedTeams.has(team.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="truncate">{team.name}</span>
            </button>
            {expandedTeams.has(team.id) && (
              <div className="ml-4 space-y-0.5">
                {projects.filter((p) => p.team_id === team.id).map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className={cn('flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors', isActive(`/projects/${project.id}`) ? 'bg-coral/20 text-coral' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                    <span className="truncate">{project.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Projects without team */}
        {projects.filter((p) => !p.team_id).map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className={cn('flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors', isActive(`/projects/${project.id}`) ? 'bg-coral/20 text-coral' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
            <span className="truncate">{project.name}</span>
          </Link>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="px-3 py-2 border-t border-slate-800 space-y-0.5">
        <Link onClick={handleNavClick} to="/goals" className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', isActive('/goals') ? 'bg-coral/20 text-coral' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
          <Target className="w-4 h-4" /> Goals
        </Link>
        <Link onClick={handleNavClick} to="/portfolios" className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', isActive('/portfolios') ? 'bg-coral/20 text-coral' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
          <BarChart3 className="w-4 h-4" /> Portfolios
        </Link>
        <Link onClick={handleNavClick} to="/reports" className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', isActive('/reports') ? 'bg-coral/20 text-coral' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
          <LineChart className="w-4 h-4" /> Reports
        </Link>
        <Link onClick={handleNavClick} to="/workload" className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', isActive('/workload') ? 'bg-coral/20 text-coral' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
          <LayoutGrid className="w-4 h-4" /> Workload
        </Link>
        <Link onClick={handleNavClick} to="/automations" className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', isActive('/automations') ? 'bg-coral/20 text-coral' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
          <Zap className="w-4 h-4" /> Automations
        </Link>
        <Link onClick={handleNavClick} to="/members" className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', isActive('/members') ? 'bg-coral/20 text-coral' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
          <Users className="w-4 h-4" /> Members
        </Link>
        <Link onClick={handleNavClick} to="/settings" className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', isActive('/settings') ? 'bg-coral/20 text-coral' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
          <Settings className="w-4 h-4" /> Settings
        </Link>
      </div>

      {/* User */}
      <div className="p-3 border-t border-slate-800">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(user?.id || '') }}>
              {getInitials(profile?.full_name || null)}
            </div>
            <span className="text-sm text-slate-300 truncate">{profile?.full_name || profile?.email || 'User'}</span>
          </button>
          {showUserMenu && (
            <div className="absolute bottom-full left-0 w-full mb-1 bg-slate-800 rounded-lg shadow-xl p-1">
              <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-md">
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 rounded-md">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>

        <button onClick={toggleSidebar} className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800">
          <PanelLeftClose className="w-4 h-4" />
          <span className="text-xs">Collapse</span>
        </button>
      </div>
      <CreateProjectModal open={showCreateProject} onClose={() => setShowCreateProject(false)} />
    </div>
  );
}
