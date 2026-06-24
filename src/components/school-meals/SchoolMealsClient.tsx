'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Utensils, CalendarDays, Settings2, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from '@/hooks/useCalendarQueries'
import { updateUserProfile } from '@/app/actions/profile'
import { SchoolSearchCard } from './SchoolSearchCard'
import { MealDietCard } from './MealDietCard'
import { getSchoolMeals, SchoolInfo, MealInfo } from './neisUtils'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export function SchoolMealsClient() {
  const queryClient = useQueryClient()
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useUserProfile()
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [meals, setMeals] = useState<MealInfo[]>([])
  const [isMealsLoading, setIsMealsLoading] = useState(false)
  const [isChangingSchool, setIsChangingSchool] = useState(false)

  const officeCode = profile?.neis_office_code
  const schoolCode = profile?.neis_school_code
  const schoolName = profile?.neis_school_name
  const hasSchoolSet = !!(officeCode && schoolCode)

  useEffect(() => {
    if (hasSchoolSet && !isChangingSchool) {
      fetchMeals(currentDate)
    }
  }, [currentDate, hasSchoolSet, isChangingSchool, officeCode, schoolCode])

  const fetchMeals = async (date: Date) => {
    if (!officeCode || !schoolCode) return
    setIsMealsLoading(true)
    try {
      const dateStr = format(date, 'yyyyMMdd')
      const data = await getSchoolMeals(officeCode, schoolCode, dateStr)
      setMeals(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsMealsLoading(false)
    }
  }

  const handleSelectSchool = async (school: SchoolInfo) => {
    try {
      await updateUserProfile({
        neis_office_code: school.officeCode,
        neis_school_code: school.schoolCode,
        neis_school_name: school.schoolName
      })
      await refetchProfile()
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      setIsChangingSchool(false)
    } catch (error) {
      console.error(error)
      alert('학교 정보를 저장하는데 실패했습니다.')
    }
  }

  if (isProfileLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-10 pt-4 md:pt-8 px-2 md:px-0">
      {/* 1. 상단 배너 (GoogleSyncTab과 통일성 유지 및 독자적 아이덴티티) */}
      <div className="relative rounded-3xl overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 dark:border-slate-800 p-[2px]">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-300 to-red-400 opacity-20 animate-pulse" />
        
        <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[1.4rem] overflow-hidden">
          <div className="p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-900/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold flex items-center gap-3 text-slate-800 dark:text-slate-100 tracking-tight">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/50 dark:to-red-900/50 flex items-center justify-center shadow-inner border border-white/60 dark:border-white/10">
                    <Utensils className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  학교 급식 대시보드
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2 ml-15 max-w-lg">
                  매일매일 기다려지는 맛있는 학교 급식 식단과 영양 정보를 한눈에 확인하세요.
                </p>
              </div>
              
              {hasSchoolSet && !isChangingSchool && (
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                  <Button 
                    onClick={() => setCurrentDate(new Date())}
                    variant="outline"
                    className="bg-white/80 dark:bg-slate-800/80 border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/50 rounded-xl"
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    오늘
                  </Button>
                  <Button 
                    onClick={() => setIsChangingSchool(true)}
                    variant="outline"
                    className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    학교 변경
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 메인 콘텐츠 렌더링 */}
      <AnimatePresence mode="wait">
        {!hasSchoolSet || isChangingSchool ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {isChangingSchool && (
              <div className="mb-4">
                <Button variant="ghost" onClick={() => setIsChangingSchool(false)} className="text-slate-500">
                  ← 취소하고 돌아가기
                </Button>
              </div>
            )}
            <SchoolSearchCard onSelectSchool={handleSelectSchool} />
          </motion.div>
        ) : (
          <motion.div
            key="meals"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="mb-6 flex items-center gap-2">
              <div className="px-4 py-2 rounded-xl bg-orange-100/50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 font-bold border border-orange-200/50 dark:border-orange-900/30 inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                {schoolName}
              </div>
            </div>
            
            <MealDietCard 
              currentDate={currentDate} 
              setCurrentDate={setCurrentDate} 
              meals={meals} 
              isLoading={isMealsLoading} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
