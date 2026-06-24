'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-10 pt-2 px-2 md:px-0">
      {/* 메인 콘텐츠 렌더링 */}
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
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="px-4 py-2 rounded-xl bg-orange-100/50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 font-bold border border-orange-200/50 dark:border-orange-900/30 inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                {schoolName}
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setCurrentDate(new Date())}
                  variant="outline"
                  className="bg-white/80 dark:bg-slate-800/80 border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/50 rounded-xl shadow-sm"
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  오늘
                </Button>
                <Button 
                  onClick={() => setIsChangingSchool(true)}
                  variant="outline"
                  className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  학교 변경
                </Button>
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
