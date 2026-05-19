'use client'

import { useState, useEffect } from 'react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { Button } from '@/components/ui/button'
import { Menu, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

import { format, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addDays } from 'date-fns'
import { useActivities, useCategories } from '@/hooks/useCalendarQueries'
import { AddEventDialog } from '@/components/calendar/AddEventDialog'
import { MonthlyView } from '@/components/calendar/MonthlyView'
import { WeeklyView } from '@/components/calendar/WeeklyView'
import { ListView } from '@/components/calendar/ListView'
import { SemesterView } from '@/components/calendar/SemesterView'
import { CsvUploader } from '@/components/calendar/CsvUploader'
import { TrashDialog } from '@/components/calendar/TrashDialog'

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false)
  const { currentDate, viewMode, activeFilter, setCurrentDate, setViewMode, setActiveFilter } = useCalendarStore()

  // 현재 달 기준 날짜 계산 (전체 일정 패치를 위해)
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = startOfWeek(monthStart)
  
  // 학기 뷰일 경우 16주 분량의 데이터를 패치, 그 외에는 현재 달 분량 패치
  const endDate = viewMode === 'semester' 
    ? addDays(startDate, 16 * 7 - 1) 
    : endOfWeek(monthEnd)
  
  // React Query Fetching (반드시 조건문/Early Return 이전에 호출되어야 함)
  const { data: activitiesData } = useActivities(startDate.toISOString(), endDate.toISOString())
  const events = activitiesData || [] // 임시 데이터 대신 API 데이터 활용

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="flex h-screen w-full items-center justify-center bg-[#f7f9fb]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }
  
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

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
            <TrashDialog />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header - Glassmorphic / clean white */}
        <header className="h-24 flex items-center justify-between px-8 bg-transparent">
          <div className="flex items-center space-x-4">
            <button className="md:hidden p-2 text-gray-600"><Menu className="w-5 h-5" /></button>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 min-w-[180px]">
              {format(currentDate, 'yyyy년 M월')}
            </h2>
            
            {/* Date Nav - Segmented Control Style */}
            <div className="flex items-center bg-gray-200/60 rounded-xl p-1 space-x-1">
              <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={handleToday} className="px-3 py-1.5 rounded-lg hover:bg-white/50 text-sm font-semibold text-gray-700 transition-colors">
                오늘
              </button>
              <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* View Switcher Segmented Control */}
            <div className="flex items-center bg-gray-200/60 p-1 rounded-xl">
              {(['monthly', 'weekly', 'list', 'semester'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 shadow-none'
                  }`}
                >
                  {mode === 'monthly' ? '월' : mode === 'weekly' ? '주' : mode === 'list' ? '목록' : '학기'}
                </button>
              ))}
            </div>

            {/* Category Filter Segmented Control */}
            <div className="flex items-center bg-gray-200/60 p-1 rounded-xl">
              {(['all', 'work', 'personal'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    activeFilter === filter ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 shadow-none'
                  }`}
                >
                  {filter === 'all' ? '전체' : filter === 'work' ? '업무' : '개인'}
                </button>
              ))}
            </div>

            <div className="w-10 h-10 rounded-full bg-slate-200 shadow-sm flex items-center justify-center text-sm font-bold text-slate-600">
              U
            </div>
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
    </div>
  )
}
