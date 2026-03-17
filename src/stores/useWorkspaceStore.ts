import { create } from 'zustand';
import type { Workspace, WorkspaceMember, Profile, Team } from '@/types';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: WorkspaceMember[];
  teams: Team[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setMembers: (members: WorkspaceMember[]) => void;
  setTeams: (teams: Team[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  workspaces: [],
  members: [],
  teams: [],
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setMembers: (members) => set({ members }),
  setTeams: (teams) => set({ teams }),
}));
