'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { format, addDays, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Utensils, Flame, AlertCircle, ChevronLeft, ChevronRight, CalendarIcon as CalendarLucide } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MealInfo } from './neisUtils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface Props {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  meals: MealInfo[]
  isLoading: boolean
}

export function MealDietCard({ currentDate, setCurrentDate, meals, isLoading }: Props) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1))
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1))

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 날짜 선택 헤더 */}
      <div className="flex items-center justify-center gap-4 py-4">
        <Button variant="ghost" size="icon" onClick={handlePrevDay} className="rounded-full hover:bg-orange-100 text-orange-600 hover:text-orange-700">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger render={
            <Button 
              variant="outline" 
              className={cn(
                "w-[240px] justify-center text-lg font-extrabold border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 text-slate-800 rounded-2xl h-14 shadow-sm",
                isCalendarOpen && "border-orange-400 bg-orange-50"
              )}
            >
              <CalendarLucide className="w-5 h-5 mr-3 text-orange-500" />
              {format(currentDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
            </Button>
          } />
          <PopoverContent className="w-auto p-0 rounded-2xl border-orange-100 shadow-xl" align="center">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => {
                if (date) {
                  setCurrentDate(date)
                  setIsCalendarOpen(false)
                }
              }}
              autoFocus
              locale={ko}
              className="p-3"
            />
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" onClick={handleNextDay} className="rounded-full hover:bg-orange-100 text-orange-600 hover:text-orange-700">
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* 로딩 상태 */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
          <p className="text-orange-600 font-bold">맛있는 급식을 준비하고 있어요...</p>
        </div>
      ) : meals.length === 0 ? (
        /* 빈 상태 (Empty State) */
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-dashed border-orange-200 dark:border-slate-700 rounded-3xl p-12 text-center shadow-sm"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center">
            <Utensils className="w-12 h-12 text-orange-300 dark:text-slate-500" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mb-2">오늘은 급식이 없는 날이에요!</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium">맛있는 집밥이나 외식으로 든든하게 채워보세요.</p>
        </motion.div>
      ) : (
        /* 식단 카드 리스트 */
        <div className={cn(
          "grid gap-6",
          meals.length === 1 && "max-w-md mx-auto grid-cols-1",
          meals.length === 2 && "max-w-3xl mx-auto md:grid-cols-2",
          meals.length >= 3 && "md:grid-cols-2 lg:grid-cols-3"
        )}>
          {meals.map((meal, index) => {
            const parseAllergens = (text: string) => {
              const items = text.split(/\d+\.\s*/).filter(Boolean).map(s => s.trim())
              if (items.length <= 1 && text.includes(',')) {
                return text.split(',').map(s => s.trim()).filter(Boolean)
              }
              return items.length > 0 ? items : [text]
            }
            
            return (
              <motion.div
                key={`${meal.mealType}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-orange-100 dark:border-slate-800 flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-5 flex items-center justify-between border-b border-orange-100/50 dark:border-slate-800">
                  <h4 className="text-xl font-extrabold text-orange-800 dark:text-orange-400 flex items-center gap-2">
                    <Utensils className="w-5 h-5" />
                    {meal.mealType}
                  </h4>
                  {meal.calories && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-100/80 px-2.5 py-1 rounded-full">
                      <Flame className="w-3.5 h-3.5" />
                      {meal.calories.replace('Kcal', 'kcal')}
                    </span>
                  )}
                </div>

                {/* 메뉴 리스트 (1줄 출력 원칙) */}
                <div className="p-5 flex-1">
                  <ul className="space-y-3">
                    {meal.menuItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-semibold group-hover:text-orange-900 dark:group-hover:text-orange-300 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        <span className="truncate">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 알레르기 정보 */}
                {meal.allergies && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">알레르기 유발 물질</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-6">
                      {parseAllergens(meal.allergies).map((allergen, idx) => (
                        <span key={idx} className="px-2 py-1 bg-orange-100/70 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md text-[11px] font-bold tracking-tight">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
