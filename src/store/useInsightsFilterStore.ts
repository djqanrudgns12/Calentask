import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DateRange } from 'react-day-picker';
import { ActivityTypeFilter } from '@/components/insights/DashboardFilterBar';

interface InsightsFilterState {
  period: 'week' | 'month' | 'year' | 'single' | 'custom';
  customDateRange: DateRange | undefined;
  singleDate: Date | undefined;
  activityType: ActivityTypeFilter;
  selectedCategoryIds: string[];
  
  setPeriod: (period: 'week' | 'month' | 'year' | 'single' | 'custom') => void;
  setCustomDateRange: (range: DateRange | undefined) => void;
  setSingleDate: (date: Date | undefined) => void;
  setActivityType: (type: ActivityTypeFilter) => void;
  setSelectedCategoryIds: (ids: string[]) => void;
  resetFilter: () => void;
}

export const useInsightsFilterStore = create<InsightsFilterState>()(
  persist(
    (set) => ({
      period: 'week',
      customDateRange: undefined,
      singleDate: new Date(),
      activityType: 'ALL',
      selectedCategoryIds: [],
      
      setPeriod: (period) => set({ period }),
      setCustomDateRange: (range) => set({ customDateRange: range }),
      setSingleDate: (date) => set({ singleDate: date }),
      setActivityType: (type) => set({ activityType: type }),
      setSelectedCategoryIds: (ids) => set({ selectedCategoryIds: ids }),
      resetFilter: () => set({
        period: 'week',
        customDateRange: undefined,
        singleDate: new Date(),
        activityType: 'ALL',
        selectedCategoryIds: []
      })
    }),
    {
      name: 'insights-filter-storage',
      // Map Date objects properly when restoring from localStorage
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState,
          singleDate: persistedState.singleDate ? new Date(persistedState.singleDate) : new Date(),
          customDateRange: persistedState.customDateRange ? {
            from: persistedState.customDateRange.from ? new Date(persistedState.customDateRange.from) : undefined,
            to: persistedState.customDateRange.to ? new Date(persistedState.customDateRange.to) : undefined,
          } : undefined
        };
      }
    }
  )
);
