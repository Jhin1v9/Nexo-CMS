/**
 * Estado LOCAL de UI (07§13: Selected Element / Open Panel / Viewport...).
 * NUNCA estado de domínio — server state vive no react-query (M3-CONTRACTS §2).
 */

import { create } from 'zustand';

interface UiState {
  /** Sidebar colapsada em desktop (ícones apenas) — preferência visual local. */
  sidebarCollapsed: boolean;
  /** Sidebar aberta como overlay em viewport mobile (07 §52). */
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
