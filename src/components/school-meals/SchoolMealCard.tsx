'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Utensils, Flame, AlertCircle, Settings2, Link as LinkIcon, Trash2, Palette, RefreshCw } from 'lucide-react'
import { getSchoolMeals, MealInfo } from './neisUtils'
import { getColorClasses, CARD_COLORS } from './colorUtils'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

export interface SchoolConfig {
  id: string
  officeCode: string
  schoolCode: string
  schoolName: string
  themeColor: string
}

interface Props {
  config: SchoolConfig
  currentDate: Date
  onChangeSchool: (id: string) => void
  onChangeColor: (id: string, color: string) => void
  onDelete: (id: string) => void
}

export function SchoolMealCard({ config, currentDate, onChangeSchool, onChangeColor, onDelete }: Props) {
  const [meals, setMeals] = useState<MealInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchMeals = async () => {
      setIsLoading(true)
      try {
        const dateStr = format(currentDate, 'yyyyMMdd')
        const data = await getSchoolMeals(config.officeCode, config.schoolCode, dateStr)
        if (isMounted) setMeals(data)
      } catch (error) {
        console.error(error)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchMeals()
    return () => { isMounted = false }
  }, [currentDate, config.officeCode, config.schoolCode])

  const parseAllergens = (text: string) => {
    const items = text.split(/\d+\.\s*/).filter(Boolean).map(s => s.trim())
    if (items.length <= 1 && text.includes(',')) {
      return text.split(',').map(s => s.trim()).filter(Boolean)
    }
    return items.length > 0 ? items : [text]
  }

  const colorClasses = getColorClasses(config.themeColor)

  return (
    <div className={cn("relative flex flex-col h-full rounded-3xl overflow-hidden shadow-sm border transition-all duration-300 group", colorClasses)}>
      {/* 카드 헤더 */}
      <div className="p-5 pb-4 flex items-start justify-between border-b border-black/5 dark:border-white/5">
        <div>
          <h3 className="text-xl font-extrabold flex items-center gap-2 mb-1">
            {config.schoolName}
          </h3>
          <a 
            href={`https://search.naver.com/search.naver?query=${encodeURIComponent(config.schoolName + ' 홈페이지')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            홈페이지 검색
          </a>
        </div>
        
        {/* 설정 메뉴 */}
        <Popover>
          <PopoverTrigger render={
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 -mr-2 -mt-2">
              <Settings2 className="w-4 h-4" />
            </Button>
          } />
          <PopoverContent className="w-48 p-2 rounded-2xl" align="end">
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 mb-1">카드 색상</div>
              <div className="flex gap-2 px-2 pb-2">
                {CARD_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => onChangeColor(config.id, color)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      getColorClasses(color).split(' ')[0],
                      config.themeColor === color ? "border-slate-800 dark:border-white scale-110" : "border-transparent hover:scale-110"
                    )}
                  />
                ))}
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
              <Button variant="ghost" size="sm" onClick={() => onChangeSchool(config.id)} className="w-full justify-start text-slate-700 dark:text-slate-300">
                <RefreshCw className="w-4 h-4 mr-2" />
                학교 변경
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(config.id)} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                <Trash2 className="w-4 h-4 mr-2" />
                카드 삭제
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 급식 내용 영역 */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center space-y-3 opacity-60">
            <div className="w-8 h-8 border-3 border-current border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold">식단을 불러오는 중...</p>
          </div>
        ) : meals.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center space-y-4 opacity-70 text-center">
            <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
              <Utensils className="w-8 h-8 opacity-50" />
            </div>
            <div>
              <p className="font-bold text-lg mb-1">급식 정보가 없습니다</p>
              <p className="text-sm opacity-80">해당 날짜에는 등록된 식단이 없어요.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {meals.map((meal, idx) => (
              <div key={`${meal.mealType}-${idx}`} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold flex items-center gap-2">
                    <Utensils className="w-4 h-4 opacity-70" />
                    {meal.mealType}
                  </h4>
                  {showDetails && meal.calories && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      {meal.calories.replace('Kcal', 'kcal')}
                    </span>
                  )}
                </div>
                
                <ul className="space-y-2">
                  {meal.menuItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 font-medium opacity-90">
                      <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0" />
                      {/* 모바일 최적화: 한줄 말줄임 적용 */}
                      <span className="truncate" title={item}>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* 영양/알레르기 상세 정보 아코디언 */}
                <AnimatePresence>
                  {showDetails && meal.allergies && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2"
                    >
                      <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3">
                        <div className="flex items-start gap-1.5 mb-1.5">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 opacity-70 shrink-0" />
                          <span className="text-[11px] font-bold opacity-70">알레르기 유발 물질</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {parseAllergens(meal.allergies).map((allergen, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[10px] font-bold opacity-90">
                              {allergen}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 푸터 토글 */}
      {meals.length > 0 && (
        <div className="p-3 border-t border-black/5 dark:border-white/5 text-center bg-black/5 dark:bg-white/5">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-bold opacity-70 hover:opacity-100 transition-opacity"
          >
            {showDetails ? '간단히 보기' : '자세히 보기'}
          </button>
        </div>
      )}
    </div>
  )
}
