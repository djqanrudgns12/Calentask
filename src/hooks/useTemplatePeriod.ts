import { useState, useEffect } from 'react'

export type PeriodPreset = 'this_month' | 'semester1' | 'semester2' | 'this_year' | 'all'

export interface PeriodDates {
  startDate: string
  endDate: string
  prevStartDate: string
  prevEndDate: string
  trendType: 'daily' | 'weekly' | 'monthly'
  currentLabel: string
  prevLabel: string
}

export function useTemplatePeriod() {
  const [preset, setPreset] = useState<PeriodPreset>('this_year')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('templateCenterPeriod') as PeriodPreset
    if (saved && ['this_month', 'semester1', 'semester2', 'this_year', 'all'].includes(saved)) {
      setPreset(saved)
    }
    setIsLoaded(true)
  }, [])

  const handleSetPreset = (newPreset: PeriodPreset) => {
    setPreset(newPreset)
    localStorage.setItem('templateCenterPeriod', newPreset)
  }

  // Calculate dates based on current preset
  const getDatesForPreset = (p: PeriodPreset): PeriodDates => {
    const now = new Date()
    const year = now.getFullYear()
    const academicYear = now.getMonth() < 2 ? year - 1 : year // 1~2월이면 작년도를 당해 학년도로 간주

    let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date
    let trendType: 'daily' | 'weekly' | 'monthly' = 'daily'
    let currentLabel = '올해'
    let prevLabel = '작년'

    switch (p) {
      case 'this_month':
        startDate = new Date(year, now.getMonth(), 1)
        endDate = new Date(year, now.getMonth() + 1, 0, 23, 59, 59)
        prevStartDate = new Date(year, now.getMonth() - 1, 1)
        prevEndDate = new Date(year, now.getMonth(), 0, 23, 59, 59)
        trendType = 'daily'
        currentLabel = '이번 달'
        prevLabel = '저번 달'
        break

      case 'semester1':
        startDate = new Date(academicYear, 2, 1) // 3월 1일
        endDate = new Date(academicYear, 8, 0, 23, 59, 59) // 8월 말일
        prevStartDate = new Date(academicYear - 1, 8, 1) // 작년 2학기 (9월 1일)
        prevEndDate = new Date(academicYear, 2, 0, 23, 59, 59) // 올해 2월 말일
        trendType = 'weekly'
        currentLabel = '1학기'
        prevLabel = '저번 학기'
        break

      case 'semester2':
        startDate = new Date(academicYear, 8, 1) // 9월 1일
        endDate = new Date(academicYear + 1, 2, 0, 23, 59, 59) // 내년 2월 말일
        prevStartDate = new Date(academicYear, 2, 1) // 올해 1학기 (3월 1일)
        prevEndDate = new Date(academicYear, 8, 0, 23, 59, 59) // 올해 8월 말일
        trendType = 'weekly'
        currentLabel = '2학기'
        prevLabel = '저번 학기'
        break

      case 'this_year':
        startDate = new Date(academicYear, 0, 1) // 1월 1일
        endDate = new Date(academicYear, 12, 0, 23, 59, 59) // 12월 말일
        prevStartDate = new Date(academicYear - 1, 0, 1) // 작년 1월 1일
        prevEndDate = new Date(academicYear - 1, 12, 0, 23, 59, 59) // 작년 12월 말일
        trendType = 'monthly'
        currentLabel = `${academicYear}년`
        prevLabel = '작년'
        break

      case 'all':
      default:
        startDate = new Date(2000, 0, 1)
        endDate = new Date(2100, 11, 31, 23, 59, 59)
        prevStartDate = new Date(1900, 0, 1) // Dummy
        prevEndDate = new Date(1900, 11, 31, 23, 59, 59)
        trendType = 'monthly'
        currentLabel = '전체 기간'
        prevLabel = '비교 안함'
        break
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      prevStartDate: prevStartDate.toISOString(),
      prevEndDate: prevEndDate.toISOString(),
      trendType,
      currentLabel,
      prevLabel
    }
  }

  const periodDates = getDatesForPreset(preset)

  return {
    preset,
    setPreset: handleSetPreset,
    isLoaded,
    ...periodDates
  }
}
