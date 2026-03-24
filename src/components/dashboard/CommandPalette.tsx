import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useProjects } from '@/hooks/useProjects';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import {
  Search, FolderKanban, CheckSquare, User, ArrowRight, X,
  Plus, Moon, Sun, Home, Inbox, BarChart3, Target, Settings,
  Star, ListTodo, Users, Zap, Hash
} from 'lucide-react';
import type { Task, Project, Profile } from '@/types';

type ResultItem = {
  type: string;
  id: string;
  label: string;
  sublabel?: string;
  icon: typeof Search;
  color?: string;
  action?: () => void;
  shortcut?: string;
  category?: string;
};

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, openTaskDetail, theme, setTheme } = useUIStore();
  const { currentWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useProjects(currentWorkspace?.id);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', query, currentWorkspace?.id],
    queryFn: async () => {
      if (!query.trim() || !currentWorkspace) return { tasks: [], projects: [], members: [] };
      const projectIds = projects.map(p => p.id);
      const [tasksRes, membersRes] = await Promise.all([
        projectIds.length > 0
          ? supabase.from('tasks').select('id, title, status, project_id').in('project_id', projectIds).ilike('title', `%${query}%`).limit(8)
          : Promise.resolve({ data: [] }),
        supabase.from('profiles').select('*').or(`full_name.ilike.%${query}%,email.ilike.%${query}%`).limit(5),
      ]);
      const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
      return {
        tasks: (tasksRes.data || []) as Task[],
        projects: filteredProjects,
        members: (membersRes.data || []) as Profile[],
      };
    },
    enabled: !!query.trim() && commandPaletteOpen && projects.length > 0,
  });

  // Quick actions available when no query
  const quickActions: ResultItem[] = useMemo(() => [
    { type: 'action', id: 'nav-home', label: 'Go to Home', icon: Home, shortcut: 'G H', category: 'Navigation', action: () => navigate('/') },
    { type: 'action', id: 'nav-tasks', label: 'Go to My Tasks', icon: ListTodo, shortcut: 'G T', category: 'Navigation', action: () => navigate('/my-tasks') },
    { type: 'action', id: 'nav-inbox', label: 'Go to Inbox', icon: Inbox, shortcut: 'G I', category: 'Navigation', action: () => navigate('/inbox') },
    { type: 'action', id: 'nav-favorites', label: 'Go to Favorites', icon: Star, category: 'Navigation', action: () => navigate('/favorites') },
    { type: 'action', id: 'nav-reports', label: 'Go to Reports', icon: BarChart3, category: 'Navigation', action: () => navigate('/reports') },
    { type: 'action', id: 'nav-goals', label: 'Go to Goals', icon: Target, category: 'Navigation', action: () => navigate('/goals') },
    { type: 'action', id: 'nav-members', label: 'Go to Members', icon: Users, category: 'Navigation', action: () => navigate('/members') },
    { type: 'action', id: 'nav-settings', label: 'Go to Settings', icon: Settings, category: 'Navigation', action: () => navigate('/settings') },
    { type: 'action', id: 'toggle-theme', label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode', icon: theme === 'dark' ? Sun : Moon, shortcut: 'T', category: 'Actions', action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
  ], [navigate, theme, setTheme]);

  // Project quick links
  const projectLinks: ResultItem[] = useMemo(() =>
    projects.slice(0, 6).map(p => ({
      type: 'project',
      id: p.id,
      label: p.name,
      icon: FolderKanban,
      color: p.color,
      category: 'Projects',
    })),
    [projects]
  );

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show quick actions and recent projects
      const filtered = [...quickActions, ...projectLinks];
      return filtered;
    }

    const items: ResultItem[] = [];
    const q = query.toLowerCase();

    // Filter quick actions by query
    const matchingActions = quickActions.filter(a => a.label.toLowerCase().includes(q));
    matchingActions.forEach(a => items.push(a));

    // Add search results
    if (searchResults) {
      searchResults.tasks.forEach(t => items.push({ type: 'task', id: t.id, label: t.title, sublabel: t.status, icon: CheckSquare, category: 'Tasks' }));
      searchResults.projects.forEach(p => items.push({ type: 'project', id: p.id, label: p.name, icon: FolderKanban, color: p.color, category: 'Projects' }));
      searchResults.members.forEach(m => items.push({ type: 'member', id: m.id, label: m.full_name || m.email, sublabel: m.email, icon: User, category: 'People' }));
    }

    return items;
  }, [searchResults, query, quickActions, projectLinks]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement;
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = useCallback((item: ResultItem) => {
    setCommandPaletteOpen(false);
    if (item.action) {
      item.action();
    } else if (item.type === 'task') {
      openTaskDetail(item.id);
    } else if (item.type === 'project') {
      navigate(`/projects/${item.id}`);
    }
  }, [setCommandPaletteOpen, openTaskDetail, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIndex]) { handleSelect(results[selectedIndex]); }
    if (e.key === 'Escape') setCommandPaletteOpen(false);
  };

  if (!commandPaletteOpen) return null;

  // Group results by category
  const categories = new Map<string, ResultItem[]>();
  results.forEach(item => {
    const cat = item.category || 'Results';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(item);
  });

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search or type a command..."
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSelectedIndex(0); }} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {isSearching && query.trim() && (
            <p className="text-xs text-gray-400 px-3 py-2">Searching...</p>
          )}
          {!isSearching && query.trim() && results.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-4 text-center">No results for &ldquo;{query}&rdquo;</p>
          )}
          {Array.from(categories.entries()).map(([category, items]) => (
            <div key={category}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 px-3 pt-2 pb-1">{category}</p>
              {items.map((item) => {
                const currentIndex = flatIndex++;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors', currentIndex === selectedIndex ? 'bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}
                  >
                    {item.color ? (
                      <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      </div>
                    ) : (
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      {item.sublabel && <p className="text-xs text-gray-400 truncate">{item.sublabel}</p>}
                    </div>
                    {item.shortcut && (
                      <kbd className="text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.shortcut}</kbd>
                    )}
                    {!item.shortcut && <ArrowRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-400">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
