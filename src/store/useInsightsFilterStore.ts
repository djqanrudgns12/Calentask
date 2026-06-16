import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ActivityTypeFilter } from '@/components/insights/DashboardFilterBar';

export type InsightsTab = 'overview' | 'time' | 'execution';


interface InsightsFilterState {
  activeTab: InsightsTab;
  activityType: ActivityTypeFilter;
  selectedCategoryIds: string[];
  
  setActiveTab: (tab: InsightsTab) => void;
  setActivityType: (type: ActivityTypeFilter) => void;
  setSelectedCategoryIds: (ids: string[]) => void;
  resetFilter: () => void;
}

export const useInsightsFilterStore = create<InsightsFilterState>()(
  persist(
    (set) => ({
      activeTab: 'overview' as const,
      activityType: 'ALL',
      selectedCategoryIds: [],
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActivityType: (type) => set({ activityType: type }),
      setSelectedCategoryIds: (ids) => set({ selectedCategoryIds: ids }),
      resetFilter: () => set({
        activityType: 'ALL',
        selectedCategoryIds: []
      })
    }),
    {
      name: 'insights-filter-storage',
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState
        };
      }
    }
  )
);
