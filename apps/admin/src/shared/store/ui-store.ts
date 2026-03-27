import { create } from 'zustand'

type UiStore = {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
  },
  closeSidebar: () => {
    set({ isSidebarOpen: false })
  },
}))
