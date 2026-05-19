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

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="flex h-screen w-full items-center justify-center bg-[#f7f9fb]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  // 현재 달 기준 날짜 계산 (전체 일정 패치를 위해)
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = startOfWeek(monthStart)
  
  // 학기 뷰일 경우 16주 분량의 데이터를 패치, 그 외에는 현재 달 분량 패치
  const endDate = viewMode === 'semester' 
    ? addDays(startDate, 16 * 7 - 1) 
    : endOfWeek(monthEnd)
  
  // React Query Fetching
  const { data: activitiesData } = useActivities(startDate.toISOString(), endDate.toISOString())
  const events = activitiesData || [] // 임시 데이터 대신 API 데이터 활용
  
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f7f9fb] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calentask</h1>
        </div>
        
        <div className="px-4 py-2 flex flex-col space-y-1">
          <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">뷰 선택</p>
          {(['monthly', 'weekly', 'list', 'semester'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === mode ? 'bg-slate-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {mode === 'monthly' ? '월간 (Monthly)' : mode === 'weekly' ? '주간 (Weekly)' : mode === 'list' ? '목록 (List)' : '학기 (Semester)'}
            </button>
          ))}
        </div>

        <div className="px-4 py-6 flex flex-col space-y-1 flex-1">
          <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">카테고리</p>
          {(['all', 'work', 'personal'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter ? 'bg-slate-100 text-slate-900' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filter === 'all' ? '전체 보기' : filter === 'work' ? '업무용 (Work)' : '개인용 (Personal)'}
            </button>
          ))}
          <div className="mt-4 px-3 flex flex-col space-y-2">
            <CsvUploader />
            <TrashDialog />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-white/50 backdrop-blur-md border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button className="md:hidden p-2 text-gray-600"><Menu className="w-5 h-5" /></button>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {format(currentDate, 'yyyy년 M월')}
            </h2>
            <div className="flex items-center bg-gray-100 rounded-lg p-1 space-x-1">
              <button onClick={handlePrevMonth} className="p-1.5 rounded-md hover:bg-white text-gray-600 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleToday} className="px-3 py-1.5 rounded-md hover:bg-white text-sm font-medium text-gray-700 transition-colors">
                오늘
              </button>
              <button onClick={handleNextMonth} className="p-1.5 rounded-md hover:bg-white text-gray-600 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-sm font-bold text-slate-600">
              U
            </div>
          </div>
        </header>

        {/* Dynamic Views */}
        {viewMode === 'monthly' && <MonthlyView currentDate={currentDate} events={events} />}
        {viewMode === 'weekly' && <WeeklyView currentDate={currentDate} events={events} />}
        {viewMode === 'list' && <ListView currentDate={currentDate} events={events} />}
        {viewMode === 'semester' && <SemesterView currentDate={currentDate} events={events} />}
      </main>

      {/* Floating Action Button */}
      <AddEventDialog>
        <button className="absolute bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center">
          <Plus className="w-6 h-6" />
        </button>
      </AddEventDialog>
    </div>
  )
}
