import { create } from 'zustand';

import type { AppRouteKey } from '@/config/navigation';

interface UiState {
  activeRoute: AppRouteKey;
  sidebarOpen: boolean;
  setActiveRoute: (route: AppRouteKey) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeRoute: 'cockpit',
  sidebarOpen: false,
  setActiveRoute: (route) => set({ activeRoute: route }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
