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

      // Only when NOT typing
      if (isTyping) return;

      // Sequential: g + key navigation
      if (gPressed) {
        clearTimeout(gTimer);
        gPressed = false;
        switch (e.key) {
          case 'h': navigate('/'); return;
          case 'i': navigate('/inbox'); return;
          case 'p': navigate('/portfolios'); return;
          case 'r': navigate('/reports'); return;
          case 'g': navigate('/goals'); return;
          case 'w': navigate('/workload'); return;
          case 'm': navigate('/members'); return;
          case 's': navigate('/settings'); return;
        }
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
