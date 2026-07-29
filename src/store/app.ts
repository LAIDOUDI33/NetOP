import { create } from 'zustand';
import type { ViewType, Technology } from '@/types';
import type { Locale } from '@/lib/i18n';

interface UserSession {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

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
  locale: Locale;
  setLocale: (locale: Locale) => void;
  user: UserSession | null;
  setUser: (user: UserSession | null) => void;
  allowedViews: Set<string>;
  setAllowedViews: (views: Set<string>) => void;
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
  locale: 'fr' as Locale,
  setLocale: (locale) => set({ locale }),
  user: null,
  setUser: (user) => set({ user }),
  allowedViews: new Set<string>(),
  setAllowedViews: (views) => set({ allowedViews: views }),
}));