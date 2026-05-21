/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { Button } from '@/components/ui/button'
import { Menu, ChevronLeft, ChevronRight, Plus, Tags, Database } from 'lucide-react'

import { format, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addDays } from 'date-fns'
import { useActivities, useCategories } from '@/hooks/useCalendarQueries'
import { AddEventDialog } from '@/components/calendar/AddEventDialog'
import { MonthlyView } from '@/components/calendar/MonthlyView'
import { WeeklyView } from '@/components/calendar/WeeklyView'
import { ListView } from '@/components/calendar/ListView'
import { SemesterView } from '@/components/calendar/SemesterView'
import { CsvUploader } from '@/components/calendar/CsvUploader'
import { GlobalCategoryFilter } from '@/components/calendar/GlobalCategoryFilter'
import { DeleteConfirmDialog } from '@/components/calendar/DeleteConfirmDialog'
import { EditCategoryDialog } from '@/components/calendar/EditCategoryDialog'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'
import { SettingsModal } from '@/components/profile/SettingsModal'

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'display' | 'tags' | 'data'>('profile')
  const { 
    currentDate, viewMode, setCurrentDate, setViewMode,
    semesterYear, semesterTerm, setSemesterYear, setSemesterTerm, activeCategories 
  } = useCalendarStore()

  // 현재 달 기준 날짜 계산 (전체 일정 패치를 위해)
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = startOfWeek(monthStart)
  
  // 학기 뷰일 경우 해당 학기 분량의 데이터를 패치 (1학기: 3.1~8.31, 2학기: 9.1~익년 2.28)
  const semesterStartDate = new Date(semesterYear, semesterTerm === 1 ? 2 : 8, 1) // 3월 또는 9월
  const semesterEndDate = new Date(semesterTerm === 1 ? semesterYear : semesterYear + 1, semesterTerm === 1 ? 7 : 1, semesterTerm === 1 ? 31 : 28)
  
  const queryStartDate = viewMode === 'semester' ? startOfWeek(semesterStartDate) : startDate
  const queryEndDate = viewMode === 'semester' ? endOfWeek(semesterEndDate) : endOfWeek(monthEnd)
  
  // React Query Fetching
  const { data: activitiesData } = useActivities(queryStartDate.toISOString(), queryEndDate.toISOString())
  let events = activitiesData || []

  // 글로벌 카테고리 필터 적용
  if (activeCategories.length > 0) {
    events = events.filter(event => 
      event.categories?.some(cat => activeCategories.includes(cat.id))
    )
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="flex h-screen w-full items-center justify-center bg-[#f7f9fb]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }
  
  const handlePrev = () => {
    if (viewMode === 'semester') {
      if (semesterTerm === 1) {
        setSemesterTerm(2)
        setSemesterYear(semesterYear - 1)
      } else {
        setSemesterTerm(1)
      }
    } else {
      setCurrentDate(subMonths(currentDate, 1))
    }
  }

  const handleNext = () => {
    if (viewMode === 'semester') {
      if (semesterTerm === 2) {
        setSemesterTerm(1)
        setSemesterYear(semesterYear + 1)
      } else {
        setSemesterTerm(2)
      }
    } else {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }

  const handleToday = () => {
    if (viewMode === 'semester') {
      setSemesterYear(new Date().getFullYear())
      setSemesterTerm(new Date().getMonth() >= 2 && new Date().getMonth() <= 7 ? 1 : 2)
    } else {
      setCurrentDate(new Date())
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f2f2f7] text-slate-900 font-sans">
      {/* Sidebar - Clean, no borders, soft shadow */}
      <aside className="w-64 flex-shrink-0 bg-white shadow-apple-soft flex flex-col hidden md:flex z-10">
        <div className="p-6 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              C
            </span>
            <span>Calentask</span>
          </h1>
        </div>
        
        <div className="px-4 py-4 flex flex-col space-y-1">
          <button className="text-left px-4 py-3 rounded-2xl text-base font-semibold transition-colors bg-blue-50 text-blue-600">
            나의 캘린더
          </button>
        </div>

        <div className="px-4 py-6 flex flex-col space-y-1 flex-1">
          {/* Keep uploader and trash at the bottom or below */}
          <div className="mt-auto px-2 flex flex-col space-y-3">
            <CsvUploader />
            <Button
              variant="outline"
              className="w-full text-sm font-medium border-gray-300 flex items-center justify-center text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setSettingsTab('tags')
                setIsSettingsOpen(true)
              }}
            >
              <Tags className="w-4 h-4 mr-2" />
              태그 관리소
            </Button>
            <Button
              variant="outline"
              className="w-full text-sm font-medium border-gray-300 flex items-center justify-center text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setSettingsTab('data')
                setIsSettingsOpen(true)
              }}
            >
              <Database className="w-4 h-4 mr-2" />
              데이터 허브
            </Button>
          </div>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header - Glassmorphic / clean white */}
        <header className="flex flex-col justify-center px-8 py-6 bg-transparent gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <button className="md:hidden p-2 text-gray-600"><Menu className="w-5 h-5" /></button>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 min-w-[150px]">
                {viewMode === 'semester' 
                  ? `${semesterYear}년 ${semesterTerm}학기` 
                  : format(currentDate, 'yyyy년 M월')}
              </h2>
              
              {/* Date Nav - Segmented Control Style */}
              <div className="flex items-center bg-gray-200/60 rounded-xl p-1 space-x-1">
                <button onClick={handlePrev} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-600 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={handleToday} className="px-3 py-1.5 rounded-lg hover:bg-white/50 text-sm font-semibold text-gray-700 transition-colors">
                  오늘
                </button>
                <button onClick={handleNext} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-600 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* View Switcher Segmented Control */}
              <div className="flex items-center bg-gray-200/60 p-1 rounded-xl overflow-x-auto hide-scrollbar w-full sm:w-auto">
                {(['monthly', 'weekly', 'list', 'semester'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none text-center ${
                      viewMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 shadow-none'
                    }`}
                  >
                    {mode === 'monthly' ? '월' : mode === 'weekly' ? '주' : mode === 'list' ? '목록' : '학기'}
                  </button>
                ))}
              </div>

              <div className="hidden sm:block">
                <ProfileDropdown onOpenSettings={() => {
                  setSettingsTab('profile')
                  setIsSettingsOpen(true)
                }} />
              </div>
            </div>
          </div>
          
          {/* Global Category Filter Moved Here! (Top Left) */}
          <div className="flex items-center justify-start overflow-x-auto hide-scrollbar pb-1">
            <GlobalCategoryFilter />
          </div>
        </header>

        {/* Dynamic Views Area - Add padding for floating effect */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          {viewMode === 'monthly' && <MonthlyView currentDate={currentDate} events={events} />}
          {viewMode === 'weekly' && <WeeklyView currentDate={currentDate} events={events} />}
          {viewMode === 'list' && <ListView currentDate={currentDate} events={events} />}
          {viewMode === 'semester' && <SemesterView currentDate={currentDate} events={events} />}
        </div>
      </main>

      {/* Floating Action Button - Apple Style BIG Circle */}
      <AddEventDialog>
        <button className="absolute bottom-10 right-10 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-apple-float hover:scale-105 transition-transform flex items-center justify-center">
          <Plus className="w-8 h-8" />
        </button>
      </AddEventDialog>

      {/* Settings Modal */}
      <SettingsModal 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        initialTab={settingsTab} 
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog />
      
      {/* Edit Category Dialog */}
      <EditCategoryDialog />
    </div>
  )
}
