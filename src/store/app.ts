import { create } from 'zustand';
import type { ViewType, Technology } from '@/types';

interface AppState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  selectedTechnology: Technology;
  setSelectedTechnology: (tech: Technology) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
  selectedTechnology: '4G',
  setSelectedTechnology: (tech) => set({ selectedTechnology: tech }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));