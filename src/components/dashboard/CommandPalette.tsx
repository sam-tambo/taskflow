import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useProjects } from '@/hooks/useProjects';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { Search, FolderKanban, CheckSquare, User, ArrowRight, X } from 'lucide-react';
import type { Task, Project, Profile } from '@/types';

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, openTaskDetail } = useUIStore();
  const { currentWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: projects = [] } = useProjects(currentWorkspace?.id);

  const { data: searchResults } = useQuery({
    queryKey: ['search', query, currentWorkspace?.id],
    queryFn: async () => {
      if (!query.trim() || !currentWorkspace) return { tasks: [], projects: [], members: [] };
      const [tasksRes, membersRes] = await Promise.all([
        supabase.from('tasks').select('id, title, status, project_id').eq('workspace_id', currentWorkspace.id).ilike('title', `%${query}%`).limit(5),
        supabase.from('profiles').select('*').or(`full_name.ilike.%${query}%,email.ilike.%${query}%`).limit(5),
      ]);
      const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
      return {
        tasks: (tasksRes.data || []) as Task[],
        projects: filteredProjects,
        members: (membersRes.data || []) as Profile[],
      };
    },
    enabled: !!query.trim() && commandPaletteOpen,
  });

  const results = useMemo(() => {
    if (!searchResults) return [];
    const items: { type: string; id: string; label: string; sublabel?: string; icon: typeof Search; color?: string }[] = [];
    searchResults.tasks.forEach(t => items.push({ type: 'task', id: t.id, label: t.title, sublabel: t.status, icon: CheckSquare }));
    searchResults.projects.forEach(p => items.push({ type: 'project', id: p.id, label: p.name, icon: FolderKanban, color: p.color }));
    searchResults.members.forEach(m => items.push({ type: 'member', id: m.id, label: m.full_name || m.email, sublabel: m.email, icon: User }));
    return items;
  }, [searchResults]);

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

  const handleSelect = (item: typeof results[0]) => {
    setCommandPaletteOpen(false);
    if (item.type === 'task') openTaskDetail(item.id);
    else if (item.type === 'project') navigate(`/projects/${item.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIndex]) { handleSelect(results[selectedIndex]); }
    if (e.key === 'Escape') setCommandPaletteOpen(false);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects, people..."
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          <button onClick={() => setCommandPaletteOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {!query.trim() && (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-400">Start typing to search...</p>
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-400">No results found for "{query}"</p>
            </div>
          )}

          {results.map((item, index) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleSelect(item)}
              className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors', index === selectedIndex ? 'bg-coral/10 text-coral' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                {item.sublabel && <p className="text-xs text-gray-400 truncate">{item.sublabel}</p>}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-400">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
