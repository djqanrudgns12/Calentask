import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PeriodPreset = 'this_month' | 'semester1' | 'semester2' | 'this_year' | 'all' | 'custom';

export interface PeriodDates {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  trendType: 'daily' | 'weekly' | 'monthly';
  currentLabel: string;
  prevLabel: string;
}

interface SharedPeriodState {
  preset: PeriodPreset;
  customRange: { start: string; end: string };
  isLoaded: boolean;
  setPreset: (preset: PeriodPreset) => void;
  setCustomRange: (start: string, end: string) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useSharedPeriodStore = create<SharedPeriodState>()(
  persist(
    (set) => ({
      preset: 'this_month',
      customRange: { start: '', end: '' },
      isLoaded: false,
      setPreset: (preset) => set({ preset }),
      setCustomRange: (start, end) => set({ customRange: { start, end }, preset: 'custom' }),
      setLoaded: (loaded) => set({ isLoaded: loaded }),
    }),
    {
      name: 'shared-period-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoaded(true);
        }
      },
    }
  )
);

export function getDatesForPreset(preset: PeriodPreset, customRange: { start: string; end: string }): PeriodDates {
  const now = new Date();
  const year = now.getFullYear();
  const academicYear = now.getMonth() < 2 ? year - 1 : year; // 1~2월이면 작년도를 당해 학년도로 간주

  let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date;
  let trendType: 'daily' | 'weekly' | 'monthly' = 'daily';
  let currentLabel = '올해';
  let prevLabel = '작년';

  switch (preset) {
    case 'this_month':
      startDate = new Date(year, now.getMonth(), 1);
      endDate = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);
      prevStartDate = new Date(year, now.getMonth() - 1, 1);
      prevEndDate = new Date(year, now.getMonth(), 0, 23, 59, 59);
      trendType = 'daily';
      currentLabel = '이번 달';
      prevLabel = '저번 달';
      break;

    case 'semester1':
      startDate = new Date(academicYear, 2, 1); // 3월 1일
      endDate = new Date(academicYear, 8, 0, 23, 59, 59); // 8월 말일
      prevStartDate = new Date(academicYear - 1, 8, 1); // 작년 2학기 (9월 1일)
      prevEndDate = new Date(academicYear, 2, 0, 23, 59, 59); // 올해 2월 말일
      trendType = 'weekly';
      currentLabel = '1학기';
      prevLabel = '저번 학기';
      break;

    case 'semester2':
      startDate = new Date(academicYear, 8, 1); // 9월 1일
      endDate = new Date(academicYear + 1, 2, 0, 23, 59, 59); // 내년 2월 말일
      prevStartDate = new Date(academicYear, 2, 1); // 올해 1학기 (3월 1일)
      prevEndDate = new Date(academicYear, 8, 0, 23, 59, 59); // 올해 8월 말일
      trendType = 'weekly';
      currentLabel = '2학기';
      prevLabel = '저번 학기';
      break;

    case 'this_year':
      startDate = new Date(academicYear, 0, 1); // 1월 1일
      endDate = new Date(academicYear, 12, 0, 23, 59, 59); // 12월 말일
      prevStartDate = new Date(academicYear - 1, 0, 1); // 작년 1월 1일
      prevEndDate = new Date(academicYear - 1, 12, 0, 23, 59, 59); // 작년 12월 말일
      trendType = 'monthly';
      currentLabel = `${academicYear}년`;
      prevLabel = '작년';
      break;

    case 'custom': {
      if (!customRange.start || !customRange.end) {
        // 기본값 폴백 (이번 달)
        startDate = new Date(year, now.getMonth(), 1);
        endDate = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);
        prevStartDate = new Date(year, now.getMonth() - 1, 1);
        prevEndDate = new Date(year, now.getMonth(), 0, 23, 59, 59);
        trendType = 'daily';
        currentLabel = '사용자 지정';
        prevLabel = '직전 동일 기간';
        break;
      }
      
      startDate = new Date(`${customRange.start}T00:00:00`);
      endDate = new Date(`${customRange.end}T23:59:59`);
      
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // 이전 기간: 선택한 일수만큼 뒤로
      prevStartDate = new Date(startDate.getTime() - diffTime);
      prevEndDate = new Date(endDate.getTime() - diffTime);
      
      if (diffDays <= 31) trendType = 'daily';
      else if (diffDays <= 180) trendType = 'weekly';
      else trendType = 'monthly';
      
      const startStr = customRange.start.replace(/-/g, '.');
      const endStr = customRange.end.replace(/-/g, '.');
      currentLabel = `${startStr} ~ ${endStr}`;
      prevLabel = '직전 동일 기간';
      break;
    }

    case 'all':
    default:
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2100, 11, 31, 23, 59, 59);
      prevStartDate = new Date(1900, 0, 1); // Dummy
      prevEndDate = new Date(1900, 11, 31, 23, 59, 59);
      trendType = 'monthly';
      currentLabel = '전체 기간';
      prevLabel = '비교 안함';
      break;
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    prevStartDate: prevStartDate.toISOString(),
    prevEndDate: prevEndDate.toISOString(),
    trendType,
    currentLabel,
    prevLabel
  };
}
