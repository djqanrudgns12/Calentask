import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Activity, Category } from '@/app/actions/calendar'

export type ViewMode = 'monthly' | 'weekly' | 'list' | 'semester'

interface CalendarState {
  currentDate: Date
  viewMode: ViewMode
  activeCategories: string[]
  semesterYear: number
  semesterTerm: 1 | 2
  isAddEventOpen: boolean
  addEventDate: Date | null
  editingEvent: Activity | null
  deletingEventId: string | null
  editingCategory: Category | null
  showHolidays: boolean
  setCurrentDate: (date: Date) => void
  setViewMode: (mode: ViewMode) => void
  setActiveCategories: (categories: string[]) => void
  setSemesterYear: (year: number) => void
  setSemesterTerm: (term: 1 | 2) => void
  openAddEvent: (date?: Date) => void
  openEditEvent: (event: Activity) => void
  closeAddEvent: () => void
  openDeleteConfirm: (id: string) => void
  closeDeleteConfirm: () => void
  openEditCategory: (category: Category) => void
  closeEditCategory: () => void
  setShowHolidays: (show: boolean) => void
  resetStore: () => void
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
      editingEvent: null,
      deletingEventId: null,
      editingCategory: null,
      showHolidays: true,
      setCurrentDate: (date) => set({ currentDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setActiveCategories: (categories) => set({ activeCategories: categories }),
      setSemesterYear: (year) => set({ semesterYear: year }),
      setSemesterTerm: (term) => set({ semesterTerm: term }),
      openAddEvent: (date) => set({ isAddEventOpen: true, addEventDate: date || null, editingEvent: null }),
      openEditEvent: (event) => set({ isAddEventOpen: true, addEventDate: new Date(event.start_time), editingEvent: event }),
      closeAddEvent: () => set({ isAddEventOpen: false, addEventDate: null, editingEvent: null }),
      openDeleteConfirm: (id) => set({ deletingEventId: id }),
      closeDeleteConfirm: () => set({ deletingEventId: null }),
      openEditCategory: (category) => set({ editingCategory: category }),
      closeEditCategory: () => set({ editingCategory: null }),
      setShowHolidays: (show) => set({ showHolidays: show }),
      resetStore: () => set({
        currentDate: new Date(),
        viewMode: 'monthly',
        activeCategories: [],
        semesterYear: new Date().getFullYear(),
        semesterTerm: new Date().getMonth() >= 2 && new Date().getMonth() <= 7 ? 1 : 2,
        isAddEventOpen: false,
        addEventDate: null,
        editingEvent: null,
        deletingEventId: null,
        editingCategory: null,
        showHolidays: true,
      }),
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        currentDate: state.currentDate,
        viewMode: state.viewMode,
        activeCategories: state.activeCategories,
        semesterYear: state.semesterYear,
        semesterTerm: state.semesterTerm,
        showHolidays: state.showHolidays,
      }),
      merge: (persistedState: unknown, currentState) => {
        const state = persistedState as Partial<CalendarState>
        return {
          ...currentState,
          ...state,
          currentDate: state.currentDate 
            ? new Date(state.currentDate) 
            : currentState.currentDate,
        }
      },
    }
  )
)
