import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Activity, Category } from '@/app/actions/calendar'

export type ViewMode = 'monthly' | 'weekly' | 'list' | 'semester' | 'nice_import' | 'anniversary' | 'insights' | 'archive_notes' | 'archive_agenda'

interface CalendarState {
  currentDate: Date
  viewMode: ViewMode
  activeCategories: string[]
  activePresetId: string | null
  activePresetName: string | null
  semesterYear: number
  semesterTerm: 1 | 2
  isAddEventOpen: boolean
  addEventDate: Date | null
  prefillAgendaTaskId: string | null
  prefillEventData: Partial<Activity> | null
  editingEvent: Activity | null
  deletingEventId: string | null
  editingCategory: Category | null
  showHolidays: boolean
  showHolidaysAsTags: boolean
  showNationalDays: boolean
  showAnniversaries: boolean
  showTraditionalTerms: boolean
  selectedDaySummary: Date | null
  selectedEventDetail: Activity | null
  setCurrentDate: (date: Date) => void
  setViewMode: (mode: ViewMode) => void
  setActiveCategories: (categories: string[]) => void
  setActivePreset: (id: string | null, name: string | null) => void
  setSemesterYear: (year: number) => void
  setSemesterTerm: (term: 1 | 2) => void
  openAddEvent: (date?: Date) => void
  openAddEventWithPrefill: (taskId: string, data: Partial<Activity>) => void
  openEditEvent: (event: Activity) => void
  closeAddEvent: () => void
  openDeleteConfirm: (id: string) => void
  closeDeleteConfirm: () => void
  openEditCategory: (category: Category) => void
  closeEditCategory: () => void
  setShowHolidays: (show: boolean) => void
  setShowHolidaysAsTags: (show: boolean) => void
  setShowNationalDays: (show: boolean) => void
  setShowAnniversaries: (show: boolean) => void
  setShowTraditionalTerms: (show: boolean) => void
  openDaySummary: (date: Date) => void
  closeDaySummary: () => void
  openEventDetail: (event: Activity) => void
  closeEventDetail: () => void
  updateTaskTime: (taskId: string, newStartTime: string, newEndTime: string) => void
  resetStore: () => void
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      currentDate: new Date(),
      viewMode: 'monthly',
      activeCategories: [], // Empty means all categories
      activePresetId: null,
      activePresetName: null,
      semesterYear: new Date().getFullYear(),
      semesterTerm: new Date().getMonth() >= 2 && new Date().getMonth() <= 7 ? 1 : 2,
      isAddEventOpen: false,
      addEventDate: null,
      prefillAgendaTaskId: null,
      prefillEventData: null,
      editingEvent: null,
      deletingEventId: null,
      editingCategory: null,
      showHolidays: true,
      showHolidaysAsTags: false,
      showNationalDays: true,
      showAnniversaries: false,
      showTraditionalTerms: false,
      selectedDaySummary: null,
      selectedEventDetail: null,
      setCurrentDate: (date) => set({ currentDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setActiveCategories: (categories) => set({ activeCategories: categories, activePresetId: null, activePresetName: null }),
      setActivePreset: (id, name) => set({ activePresetId: id, activePresetName: name }),
      setSemesterYear: (year) => set({ semesterYear: year }),
      setSemesterTerm: (term) => set({ semesterTerm: term }),
      openAddEvent: (date) => set({ isAddEventOpen: true, addEventDate: date || null, prefillAgendaTaskId: null, prefillEventData: null, editingEvent: null, selectedDaySummary: null, selectedEventDetail: null }),
      openAddEventWithPrefill: (taskId, data) => set({ isAddEventOpen: true, addEventDate: null, prefillAgendaTaskId: taskId, prefillEventData: data, editingEvent: null, selectedDaySummary: null, selectedEventDetail: null }),
      openEditEvent: (event) => set({ isAddEventOpen: true, addEventDate: new Date(event.start_time), editingEvent: event, prefillAgendaTaskId: null, prefillEventData: null, selectedDaySummary: null, selectedEventDetail: null }),
      closeAddEvent: () => set({ isAddEventOpen: false, addEventDate: null, prefillAgendaTaskId: null, prefillEventData: null, editingEvent: null }),
      openDeleteConfirm: (id) => set({ deletingEventId: id }),
      closeDeleteConfirm: () => set({ deletingEventId: null }),
      openEditCategory: (category) => set({ editingCategory: category }),
      closeEditCategory: () => set({ editingCategory: null }),
      setShowHolidays: (show) => set({ showHolidays: show }),
      setShowHolidaysAsTags: (show) => set({ showHolidaysAsTags: show }),
      setShowNationalDays: (show) => set({ showNationalDays: show }),
      setShowAnniversaries: (show) => set({ showAnniversaries: show }),
      setShowTraditionalTerms: (show) => set({ showTraditionalTerms: show }),
      openDaySummary: (date) => set({ selectedDaySummary: date, selectedEventDetail: null, isAddEventOpen: false }),
      closeDaySummary: () => set({ selectedDaySummary: null }),
      openEventDetail: (event) => set({ selectedEventDetail: event, selectedDaySummary: null, isAddEventOpen: false }),
      closeEventDetail: () => set({ selectedEventDetail: null }),
      updateTaskTime: (taskId, newStartTime, newEndTime) => set((state) => {
        // 이 부분은 향후 로컬 캐싱이나 낙관적 업데이트(Optimistic Update)를 위한 자리입니다.
        // 실제 DB 업데이트 로직은 컴포넌트 레벨에서 API를 호출하도록 설계됩니다.
        if (state.selectedEventDetail?.id === taskId) {
          return {
            selectedEventDetail: {
              ...state.selectedEventDetail,
              start_time: newStartTime,
              end_time: newEndTime
            }
          };
        }
        return state;
      }),
      resetStore: () => set((state) => ({
        // 유지할 상태들 (localStorage에 저장되는 항목들)
        currentDate: state.currentDate,
        viewMode: state.viewMode,
        activeCategories: state.activeCategories,
        activePresetId: state.activePresetId,
        activePresetName: state.activePresetName,
        semesterYear: state.semesterYear,
        semesterTerm: state.semesterTerm,
        showHolidays: state.showHolidays,
        showHolidaysAsTags: state.showHolidaysAsTags,
        showNationalDays: state.showNationalDays,
        showAnniversaries: state.showAnniversaries,
        showTraditionalTerms: state.showTraditionalTerms,
        
        // 초기화할 임시 상태들 (모달, 팝업 등)
        isAddEventOpen: false,
        addEventDate: null,
        prefillAgendaTaskId: null,
        prefillEventData: null,
        editingEvent: null,
        deletingEventId: null,
        editingCategory: null,
        selectedDaySummary: null,
        selectedEventDetail: null,
      })),
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        activeCategories: state.activeCategories,
        activePresetId: state.activePresetId,
        activePresetName: state.activePresetName,
        semesterYear: state.semesterYear,
        semesterTerm: state.semesterTerm,
        showHolidays: state.showHolidays,
        showHolidaysAsTags: state.showHolidaysAsTags,
        showNationalDays: state.showNationalDays,
        showAnniversaries: state.showAnniversaries,
        showTraditionalTerms: state.showTraditionalTerms,
      }),
      merge: (persistedState: unknown, currentState) => {
        const state = persistedState as Partial<CalendarState>
        return {
          ...currentState,
          ...state,
          currentDate: currentState.currentDate,
        }
      },
    }
  )
)
