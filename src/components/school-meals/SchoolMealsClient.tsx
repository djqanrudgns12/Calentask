'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Utensils, CalendarDays, ChevronLeft, ChevronRight, Loader2, CalendarIcon as CalendarLucide } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from '@/hooks/useCalendarQueries'
import { updateUserProfile } from '@/app/actions/profile'
import { SchoolSearchCard } from './SchoolSearchCard'
import { SchoolMealCard, SchoolConfig } from './SchoolMealCard'
import { AddSchoolPlaceholderCard } from './AddSchoolPlaceholderCard'
import { getAvailableColor } from './colorUtils'
import { SchoolInfo } from './neisUtils'
import { Button } from '@/components/ui/button'
import { format, addDays, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableItem } from './SortableItem'
import { useSwipeable } from 'react-swipeable'

export function SchoolMealsClient() {
  const queryClient = useQueryClient()
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useUserProfile()
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  
  const [schoolConfigs, setSchoolConfigs] = useState<SchoolConfig[]>([])
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [changingSchoolId, setChangingSchoolId] = useState<string | null>(null) // null = adding new, string = replacing existing

  // 마이그레이션: 기존 단일 학교 정보가 있는데 neis_schools_config가 비어있을 경우
  useEffect(() => {
    if (!profile) return

    let configs: SchoolConfig[] = []
    
    // DB에 배열로 저장된 설정이 있으면 로드
    if (profile.neis_schools_config && Array.isArray(profile.neis_schools_config)) {
      configs = profile.neis_schools_config as SchoolConfig[]
    } else if (profile.neis_office_code && profile.neis_school_code) {
      // 기존 단일 학교 데이터 마이그레이션
      configs = [{
        id: 'legacy-school',
        officeCode: profile.neis_office_code,
        schoolCode: profile.neis_school_code,
        schoolName: profile.neis_school_name || '학교',
        themeColor: getAvailableColor([])
      }]
      // 즉시 서버에 저장
      handleSaveConfigs(configs)
    }

    setSchoolConfigs(configs)
  }, [profile])

  const handleSaveConfigs = async (newConfigs: SchoolConfig[]) => {
    setSchoolConfigs(newConfigs)
    try {
      await updateUserProfile({
        neis_schools_config: newConfigs
      })
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    } catch (error) {
      console.error(error)
      alert('설정을 저장하는데 실패했습니다.')
    }
  }

  const handleSelectSchool = async (school: SchoolInfo) => {
    let newConfigs = [...schoolConfigs]

    if (changingSchoolId) {
      // 교체
      newConfigs = newConfigs.map(c => 
        c.id === changingSchoolId 
          ? { ...c, officeCode: school.officeCode, schoolCode: school.schoolCode, schoolName: school.schoolName }
          : c
      )
    } else {
      // 새로 추가 (최대 4개)
      if (newConfigs.length >= 4) return
      
      const newColor = getAvailableColor(newConfigs.map(c => c.themeColor))
      newConfigs.push({
        id: crypto.randomUUID(),
        officeCode: school.officeCode,
        schoolCode: school.schoolCode,
        schoolName: school.schoolName,
        themeColor: newColor
      })
    }

    await handleSaveConfigs(newConfigs)
    setIsSearchModalOpen(false)
    setChangingSchoolId(null)
  }

  const handleDeleteCard = async (id: string) => {
    const newConfigs = schoolConfigs.filter(c => c.id !== id)
    await handleSaveConfigs(newConfigs)
  }

  const handleChangeColor = async (id: string, color: string) => {
    const newConfigs = schoolConfigs.map(c => c.id === id ? { ...c, themeColor: color } : c)
    await handleSaveConfigs(newConfigs)
  }

  // Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = schoolConfigs.findIndex(item => item.id === active.id)
      const newIndex = schoolConfigs.findIndex(item => item.id === over.id)
      const newConfigs = arrayMove(schoolConfigs, oldIndex, newIndex)
      await handleSaveConfigs(newConfigs)
    }
  }

  // Swipe handlers
  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1))
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1))

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNextDay(),
    onSwipedRight: () => handlePrevDay(),
    preventScrollOnSwipe: true,
    trackMouse: false
  })

  if (isProfileLoading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-10 pt-2 px-4 md:px-0" {...swipeHandlers}>
      {/* 날짜 선택 헤더 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Utensils className="w-6 h-6 text-orange-500" />
          급식 대시보드
        </h2>

        <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-800 backdrop-blur-md">
          <Button variant="ghost" size="icon" onClick={handlePrevDay} className="rounded-full hover:bg-orange-100 text-orange-600 hover:text-orange-700 w-10 h-10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger render={
              <Button 
                variant="ghost" 
                className={cn(
                  "w-[180px] justify-center text-base font-extrabold hover:bg-orange-50 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 rounded-full h-10 px-0",
                  isCalendarOpen && "bg-orange-50 dark:bg-slate-800 text-orange-600 dark:text-orange-400"
                )}
              >
                <CalendarLucide className="w-4 h-4 mr-2 text-orange-500" />
                {format(currentDate, 'yyyy-MM-dd (EEE)', { locale: ko })}
              </Button>
            } />
            <PopoverContent className="w-auto p-0 rounded-2xl border-orange-100 dark:border-slate-800 shadow-xl" align="center">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => {
                  if (date) {
                    setCurrentDate(date)
                    setIsCalendarOpen(false)
                  }
                }}
                locale={ko}
                className="p-3"
              />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={handleNextDay} className="rounded-full hover:bg-orange-100 text-orange-600 hover:text-orange-700 w-10 h-10">
            <ChevronRight className="w-5 h-5" />
          </Button>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <Button 
            onClick={() => setCurrentDate(new Date())}
            variant="ghost"
            size="sm"
            className="rounded-full px-3 text-sm font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50"
          >
            오늘
          </Button>
        </div>
      </div>

      {/* 2x2 그리드 레이아웃 */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={schoolConfigs.map(c => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {schoolConfigs.map((config) => (
              <SortableItem key={config.id} id={config.id}>
                <SchoolMealCard
                  config={config}
                  currentDate={currentDate}
                  onChangeSchool={(id) => {
                    setChangingSchoolId(id)
                    setIsSearchModalOpen(true)
                  }}
                  onChangeColor={handleChangeColor}
                  onDelete={handleDeleteCard}
                />
              </SortableItem>
            ))}

            {/* 내 학교 찾기 (Placeholder) - 4개 미만일 때만 노출 */}
            {schoolConfigs.length < 4 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full"
              >
                <AddSchoolPlaceholderCard 
                  onClick={() => {
                    setChangingSchoolId(null)
                    setIsSearchModalOpen(true)
                  }} 
                />
              </motion.div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* 학교 검색 모달 */}
      <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-transparent border-0 shadow-none">
          <DialogTitle className="sr-only">학교 검색</DialogTitle>
          <SchoolSearchCard onSelectSchool={handleSelectSchool} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
