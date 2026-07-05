'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { GraduationCap, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Database, Loader2, Inbox } from 'lucide-react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { getAcademicEvents } from '@/app/actions/academicData'
import { Activity } from '@/app/actions/calendar'
import { format, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'

import { AcademicMonthlyView } from './AcademicMonthlyView'
import { AcademicEventDetailPopover } from './AcademicEventDetailPopover'

export function SchoolScheduleClient() {
  const calendarFontSize = useCalendarStore(s => s.calendarFontSize)
  const weekStartsOn = useCalendarStore(s => s.weekStartsOn)
  const setViewMode = useCalendarStore(s => s.setViewMode)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [subView, setSubView] = useState<'monthly' | 'weekly' | 'semester'>('monthly')
  const [events, setEvents] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null)

  useEffect(() => {
    fetchEvents(currentDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate.getMonth(), currentDate.getFullYear()])

  const fetchEvents = async (date: Date) => {
    setLoading(true)
    try {
      // 보이는 달의 앞뒤로 넉넉히 가져옴 (날짜 문자열 YYYY-MM-DD)
      const from = format(subMonths(date, 1), 'yyyy-MM-dd')
      const to = format(addMonths(date, 2), 'yyyy-MM-dd')
      const res = await getAcademicEvents(from, to)
      setEvents(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrev = () => {
    if (subView === 'monthly') setCurrentDate(subMonths(currentDate, 1))
    if (subView === 'weekly') setCurrentDate(subWeeks(currentDate, 1))
    if (subView === 'semester') setCurrentDate(subMonths(currentDate, 6))
  }

  const handleNext = () => {
    if (subView === 'monthly') setCurrentDate(addMonths(currentDate, 1))
    if (subView === 'weekly') setCurrentDate(addWeeks(currentDate, 1))
    if (subView === 'semester') setCurrentDate(addMonths(currentDate, 6))
  }

  const handleToday = () => setCurrentDate(new Date())

  const headerText = useMemo(() => {
    if (subView === 'monthly') return format(currentDate, 'yyyy년 M월')
    if (subView === 'weekly') {
      const wStart = startOfWeek(currentDate, { weekStartsOn })
      const wEnd = endOfWeek(currentDate, { weekStartsOn })
      if (wStart.getMonth() !== wEnd.getMonth()) {
        return `${format(wStart, 'M월 d일')} ~ ${format(wEnd, 'M월 d일')}`
      }
      return `${format(currentDate, 'yyyy년 M월')} ${Math.ceil(currentDate.getDate() / 7)}주차`
    }
    if (subView === 'semester') {
      const m = currentDate.getMonth() + 1
      const isFirstSemester = m >= 3 && m <= 8
      return `${currentDate.getFullYear()}학년도 ${isFirstSemester ? '1학기' : '2학기'}`
    }
    return ''
  }, [currentDate, subView, weekStartsOn])

  const isEmpty = !loading && events.length === 0

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background relative overflow-hidden">
      {/* Header Area */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold">학사일정</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">등록한 구글 시트 학사일정을 달력으로 봅니다.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <button
            onClick={() => setViewMode('academic_data')}
            className="px-3 py-1.5 text-xs md:text-sm font-medium bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition-colors flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5" />
            데이터 관리
          </button>
          {/* SubView Selector */}
          <div className="flex p-1 bg-muted/50 rounded-lg shrink-0 border border-border/50">
            {(['monthly', 'weekly', 'semester'] as const).map(view => (
              <button
                key={view}
                onClick={() => setSubView(view)}
                className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${
                  subView === view ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-black/5'
                }`}
              >
                {view === 'monthly' ? '월' : view === 'weekly' ? '주' : '학기'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-background rounded-lg border shadow-sm p-0.5">
            <button onClick={handlePrev} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleToday} className="px-3 py-1 text-sm font-medium hover:bg-muted rounded-md transition-colors">
              오늘
            </button>
            <button onClick={handleNext} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-lg font-bold ml-2 tabular-nums tracking-tight">{headerText}</span>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-500 ml-2" />}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-dot-pattern">
        {subView === 'monthly' && (
          <>
            <AcademicMonthlyView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} />
            {isEmpty && (
              <div className="absolute inset-x-0 top-2 flex justify-center pointer-events-none">
                <button
                  onClick={() => setViewMode('academic_data')}
                  className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-medium shadow-lg hover:bg-teal-700 transition-colors"
                >
                  <Inbox className="w-4 h-4" />
                  등록된 학사일정이 없습니다 — 데이터 관리에서 시트를 등록하세요
                </button>
              </div>
            )}
          </>
        )}
        {subView === 'weekly' && (
          <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-2">
            <CalendarIcon className="w-8 h-8 opacity-20" />
            <p>주간 뷰 (구현 중)</p>
          </div>
        )}
        {subView === 'semester' && (
          <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-2">
            <GraduationCap className="w-8 h-8 opacity-20" />
            <p>학기 뷰 (구현 중)</p>
          </div>
        )}
      </div>

      {/* Detail Popover */}
      {selectedEvent && (
        <AcademicEventDetailPopover event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  )
}
