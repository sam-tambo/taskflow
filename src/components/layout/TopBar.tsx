import { useLocation, Link } from 'react-router-dom';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { Bell, Search, Moon, Sun, ChevronRight, Menu } from 'lucide-react';

export default function TopBar() {
  const location = useLocation();
  const { setCommandPaletteOpen, theme, setTheme } = useUIStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { user, profile } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);

  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [];
    if (parts[0] === 'projects' && parts[1]) {
      crumbs.push({ label: 'Projects', path: '/projects' });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Home';
    if (path === '/inbox') return 'Inbox';
    if (path === '/members') return 'Members';
    if (path === '/settings') return 'Settings';
    if (path === '/portfolios') return 'Portfolios';
    if (path.startsWith('/projects/')) return '';
    return '';
  };

  return (
    <div className="h-14 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { const s = useUIStore.getState(); s.setSidebarCollapsed(!s.sidebarCollapsed); }}
          className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg -ml-2 mr-1"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        {breadcrumbs.map((crumb, i) => (
          <div key={i} className="flex items-center gap-2">
            <Link to={crumb.path} className="text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
              {crumb.label}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </div>
        ))}
        <span className="text-sm font-medium text-gray-900 dark:text-white">{getPageTitle()}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 dark:bg-slate-800 dark:text-slate-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-xs bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <Link to="/inbox" className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: getAvatarColor(user?.id || '') }}>
          {getInitials(profile?.full_name || null)}
        </div>
      </div>
    </div>
  );
}
