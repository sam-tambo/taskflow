import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/useUIStore';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { setCommandPaletteOpen, toggleSidebar } = useUIStore();

  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        || target.contentEditable === 'true'
        || target.closest('[role="textbox"]') !== null;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Always-active shortcuts
      if (mod && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true); return; }
      if (mod && e.key === '\\') { e.preventDefault(); toggleSidebar(); return; }
      if (mod && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        const store = useUIStore.getState();
        store.setTheme(store.theme === 'dark' ? 'light' : 'dark');
        return;
      }

      // Only when NOT typing
      if (isTyping) return;

      // Sequential: g + key navigation
      if (gPressed) {
        clearTimeout(gTimer);
        gPressed = false;
        const routes: Record<string, string> = {
          h: '/',
          t: '/my-tasks',
          i: '/inbox',
          f: '/favorites',
          p: '/portfolios',
          r: '/reports',
          g: '/goals',
          w: '/workload',
          m: '/members',
          s: '/settings',
        };
        const route = routes[e.key];
        if (route) navigate(route);
        return;
      }

      if (e.key === 'g') {
        gPressed = true;
        gTimer = setTimeout(() => { gPressed = false; }, 800);
        return;
      }

      // Single key shortcuts
      switch (e.key) {
        case '/': e.preventDefault(); setCommandPaletteOpen(true); break;
        case '?': e.preventDefault(); useUIStore.getState().setShortcutsModalOpen(true); break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, setCommandPaletteOpen, toggleSidebar]);
}
