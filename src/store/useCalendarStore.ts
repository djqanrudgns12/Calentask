import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'monthly' | 'weekly' | 'list' | 'semester'

interface CalendarState {
  currentDate: Date
  viewMode: ViewMode
  activeCategories: string[]
  semesterYear: number
  semesterTerm: 1 | 2
  isAddEventOpen: boolean
  addEventDate: Date | null
  setCurrentDate: (date: Date) => void
  setViewMode: (mode: ViewMode) => void
  setActiveCategories: (categories: string[]) => void
  setSemesterYear: (year: number) => void
  setSemesterTerm: (term: 1 | 2) => void
  openAddEvent: (date?: Date) => void
  closeAddEvent: () => void
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      currentDate: new Date(),
      viewMode: 'monthly',
      activeCategories: [], // Empty means all categories
      semesterYear: new Date().getFullYear(),
      semesterTerm: new Date().getMonth() >= 2 && new Date().getMonth() <= 7 ? 1 : 2,
      isAddEventOpen: false,
      addEventDate: null,
      setCurrentDate: (date) => set({ currentDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setActiveCategories: (categories) => set({ activeCategories: categories }),
      setSemesterYear: (year) => set({ semesterYear: year }),
      setSemesterTerm: (term) => set({ semesterTerm: term }),
      openAddEvent: (date) => set({ isAddEventOpen: true, addEventDate: date || null }),
      closeAddEvent: () => set({ isAddEventOpen: false, addEventDate: null }),
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        currentDate: state.currentDate,
        viewMode: state.viewMode,
        activeCategories: state.activeCategories,
        semesterYear: state.semesterYear,
        semesterTerm: state.semesterTerm,
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
