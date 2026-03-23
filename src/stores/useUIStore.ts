import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  taskDetailId: string | null;
  commandPaletteOpen: boolean;
  shortcutsModalOpen: boolean;
  quickAddOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setQuickAddOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const getInitialTheme = (): 'light' | 'dark' | 'system' => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('rp-theme') as 'light' | 'dark' | 'system') || 'system';
};

const getInitialSidebarState = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('rp-sidebar-collapsed') === 'true';
};

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: getInitialSidebarState(),
  taskDetailId: null,
  commandPaletteOpen: false,
  shortcutsModalOpen: false,
  quickAddOpen: false,
  theme: getInitialTheme(),
  toggleSidebar: () => set((state) => {
    const collapsed = !state.sidebarCollapsed;
    localStorage.setItem('rp-sidebar-collapsed', String(collapsed));
    return { sidebarCollapsed: collapsed };
  }),
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('rp-sidebar-collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },
  openTaskDetail: (taskId) => set({ taskDetailId: taskId }),
  closeTaskDetail: () => set({ taskDetailId: null }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
  setTheme: (theme) => {
    localStorage.setItem('rp-theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark');
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    }
    set({ theme });
  },
}));
