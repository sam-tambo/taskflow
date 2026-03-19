import { create } from 'zustand';

interface SelectionState {
  selectedTaskIds: Set<string>;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedTaskIds: new Set(),
  toggle: (id) => set(state => {
    const next = new Set(state.selectedTaskIds);
    next.has(id) ? next.delete(id) : next.add(id);
    return { selectedTaskIds: next };
  }),
  selectAll: (ids) => set({ selectedTaskIds: new Set(ids) }),
  deselectAll: () => set({ selectedTaskIds: new Set() }),
  isSelected: (id) => get().selectedTaskIds.has(id),
}));
