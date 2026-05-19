import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'monthly' | 'weekly' | 'list' | 'semester'

interface CalendarState {
  currentDate: Date
  viewMode: ViewMode
  activeFilter: 'all' | 'work' | 'personal'
  isAddEventOpen: boolean
  addEventDate: Date | null
  setCurrentDate: (date: Date) => void
  setViewMode: (mode: ViewMode) => void
  setActiveFilter: (filter: 'all' | 'work' | 'personal') => void
  openAddEvent: (date?: Date) => void
  closeAddEvent: () => void
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      currentDate: new Date(),
      viewMode: 'monthly',
      activeFilter: 'all',
      isAddEventOpen: false,
      addEventDate: null,
      setCurrentDate: (date) => set({ currentDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      openAddEvent: (date) => set({ isAddEventOpen: true, addEventDate: date || null }),
      closeAddEvent: () => set({ isAddEventOpen: false, addEventDate: null }),
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        currentDate: state.currentDate,
        viewMode: state.viewMode,
        activeFilter: state.activeFilter,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        currentDate: persistedState.currentDate 
          ? new Date(persistedState.currentDate) 
          : currentState.currentDate,
      }),
    }
  )
)
