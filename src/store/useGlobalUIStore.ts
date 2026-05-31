import { create } from 'zustand'

interface GlobalUIState {
  isShortcutsModalOpen: boolean
  openShortcutsModal: () => void
  closeShortcutsModal: () => void
  toggleShortcutsModal: () => void
}

export const useGlobalUIStore = create<GlobalUIState>((set) => ({
  isShortcutsModalOpen: false,
  openShortcutsModal: () => set({ isShortcutsModalOpen: true }),
  closeShortcutsModal: () => set({ isShortcutsModalOpen: false }),
  toggleShortcutsModal: () => set((state) => ({ isShortcutsModalOpen: !state.isShortcutsModalOpen })),
}))
