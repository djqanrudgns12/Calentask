'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Calendar as CalendarIcon, ChevronLeft, ChevronRight, School, Search, Loader2 } from 'lucide-react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useUserProfile } from '@/hooks/useCalendarQueries'
import { getAcademicSchedule } from './academicUtils'
import { Activity } from '@/app/actions/calendar'
import { format, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

import { AcademicMonthlyView } from './AcademicMonthlyView'
import { SchoolSearchCard } from '../school-meals/SchoolSearchCard'
import { AcademicEventDetailPopover } from './AcademicEventDetailPopover'

export function SchoolScheduleClient() {
  const { profile } = useUserProfile()
  const { calendarFontSize, weekStartsOn } = useCalendarStore()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [subView, setSubView] = useState<'monthly' | 'weekly' | 'semester'>('monthly')
  const [events, setEvents] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null)
  
  const [filterType, setFilterType] = useState<'ALL' | 'EXAM' | 'HOLIDAY' | 'EVENT'>('ALL')

  const hasSchool = !!(profile?.neis_office_code && profile?.neis_school_code)

  useEffect(() => {
    if (hasSchool) {
      fetchEvents(currentDate)
    }
  }, [hasSchool, currentDate.getMonth(), currentDate.getFullYear()])

  const fetchEvents = async (date: Date) => {
    if (!profile?.neis_office_code || !profile?.neis_school_code) return
    setLoading(true)
    try {
      // 해당 월의 앞뒤 1달 데이터를 넉넉히 가져옴 (임시)
      const from = format(subMonths(date, 1), 'yyyyMMdd')
      const to = format(addMonths(date, 2), 'yyyyMMdd')
      
      const res = await getAcademicSchedule(
        profile.neis_office_code, 
        profile.neis_school_code,
        from,
        to
      )
      setEvents(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return events
    return events.filter(e => {
      const isExam = e.google_event_id === 'NEIS_SCHEDULE_TYPE_EXAM'
      const isHoliday = e.google_event_id === 'NEIS_SCHEDULE_TYPE_HOLIDAY'
      const isEvent = e.google_event_id === 'NEIS_SCHEDULE_TYPE_EVENT'
      
      if (filterType === 'EXAM' && isExam) return true
      if (filterType === 'HOLIDAY' && isHoliday) return true
      if (filterType === 'EVENT' && isEvent) return true
      return false
    })
  }, [events, filterType])

  const handlePrev = () => {
    if (subView === 'monthly') setCurrentDate(subMonths(currentDate, 1))
    if (subView === 'weekly') setCurrentDate(subWeeks(currentDate, 1))
    if (subView === 'semester') setCurrentDate(subMonths(currentDate, 6)) // 대략 6개월
  }

  const handleNext = () => {
    if (subView === 'monthly') setCurrentDate(addMonths(currentDate, 1))
    if (subView === 'weekly') setCurrentDate(addWeeks(currentDate, 1))
    if (subView === 'semester') setCurrentDate(addMonths(currentDate, 6))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // 상단 바텍스트 포맷팅
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

  if (!hasSchool) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <SchoolSearchCard onSelect={(school) => {
            // SchoolMealsClient 쪽의 SchoolSearchCard가 알아서 프로필을 업데이트해줌
            window.location.reload()
          }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background relative overflow-hidden">
      
      {/* Header Area */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              {profile.neis_school_name} 학사일정
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <School className="w-3.5 h-3.5" />
              학교 공식 학사일정을 동기화하세요
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3">
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
      <div className="px-4 py-2 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-muted/20">
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
          <span className="text-lg font-bold ml-2 tabular-nums tracking-tight">
            {headerText}
          </span>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-500 ml-2" />}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {(['ALL', 'EXAM', 'HOLIDAY', 'EVENT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-full border whitespace-nowrap transition-colors ${
                filterType === f 
                ? 'bg-sky-100 border-sky-200 text-sky-700' 
                : 'bg-background border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {f === 'ALL' ? '전체' : f === 'EXAM' ? '📝 시험/평가' : f === 'HOLIDAY' ? '🏖️ 휴업일' : '🏫 교내행사'}
            </button>
          ))}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-dot-pattern">
        {subView === 'monthly' && (
          <AcademicMonthlyView 
            currentDate={currentDate} 
            events={filteredEvents} 
            onEventClick={setSelectedEvent} 
          />
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
        <AcademicEventDetailPopover 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </div>
  )
}
