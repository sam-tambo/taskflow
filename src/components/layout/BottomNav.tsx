import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores/useUIStore';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Home, Inbox, Search, MoreHorizontal, X, FolderKanban, BarChart3, Target, Settings, Users, LineChart, LayoutGrid, Zap } from 'lucide-react';

export function BottomNav() {
  const location = useLocation();
  const { setCommandPaletteOpen } = useUIStore();
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const [showMore, setShowMore] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const moreItems = [
    { path: '/portfolios', label: 'Portfolios', icon: BarChart3 },
    { path: '/goals', label: 'Goals', icon: Target },
    { path: '/reports', label: 'Reports', icon: LineChart },
    { path: '/workload', label: 'Workload', icon: LayoutGrid },
    { path: '/automations', label: 'Automations', icon: Zap },
    { path: '/members', label: 'Members', icon: Users },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* More menu slide-up */}
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-14 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl z-50 pb-safe">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">More</span>
              <button onClick={() => setShowMore(false)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-3">
              {moreItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs',
                    isActive(path) ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          <Link to="/" className={cn('flex flex-col items-center gap-0.5 px-3 py-1', isActive('/') ? 'text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400')}>
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link to="/inbox" className={cn('relative flex flex-col items-center gap-0.5 px-3 py-1', isActive('/inbox') ? 'text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400')}>
            <Inbox className="w-5 h-5" />
            <span className="text-[10px] font-medium">Inbox</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-500 dark:text-slate-400"
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn('flex flex-col items-center gap-0.5 px-3 py-1', showMore ? 'text-[#4B7C6F]' : 'text-gray-500 dark:text-slate-400')}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
