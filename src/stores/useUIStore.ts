import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  taskDetailId: string | null;
  commandPaletteOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const getInitialTheme = (): 'light' | 'dark' | 'system' => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('taskflow-theme') as 'light' | 'dark' | 'system') || 'system';
};

const getInitialSidebarState = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('taskflow-sidebar-collapsed') === 'true';
};

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: getInitialSidebarState(),
  taskDetailId: null,
  commandPaletteOpen: false,
  theme: getInitialTheme(),
  toggleSidebar: () => set((state) => {
    const collapsed = !state.sidebarCollapsed;
    localStorage.setItem('taskflow-sidebar-collapsed', String(collapsed));
    return { sidebarCollapsed: collapsed };
  }),
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('taskflow-sidebar-collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },
  openTaskDetail: (taskId) => set({ taskDetailId: taskId }),
  closeTaskDetail: () => set({ taskDetailId: null }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setTheme: (theme) => {
    localStorage.setItem('taskflow-theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark');
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    }
    set({ theme });
  },
}));
