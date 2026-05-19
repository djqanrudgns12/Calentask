import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'monthly' | 'weekly' | 'list' | 'semester'

interface CalendarState {
  currentDate: Date
  viewMode: ViewMode
  activeFilter: 'all' | 'work' | 'personal'
  setCurrentDate: (date: Date) => void
  setViewMode: (mode: ViewMode) => void
  setActiveFilter: (filter: 'all' | 'work' | 'personal') => void
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      currentDate: new Date(),
      viewMode: 'monthly',
      activeFilter: 'all',
      setCurrentDate: (date) => set({ currentDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
    }),
    {
      name: 'calendar-storage',
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
