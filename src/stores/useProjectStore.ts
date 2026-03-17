import { create } from 'zustand';
import type { Project, Section } from '@/types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  sections: Section[];
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setSections: (sections: Section[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  sections: [],
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setSections: (sections) => set({ sections }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    currentProject: state.currentProject?.id === id ? { ...state.currentProject, ...updates } : state.currentProject,
  })),
}));
