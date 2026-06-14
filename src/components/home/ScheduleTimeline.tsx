'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { format, parseISO, isValid, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Clock, CalendarDays, Inbox, Sparkles, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCalendarStore } from '@/store/useCalendarStore'
import type { Activity } from '@/app/actions/calendar'
import type { TimelineRange } from './HomeDashboard'

interface ScheduleTimelineProps {
  events: Activity[]
  currentRange: TimelineRange
  onRangeChange: (range: TimelineRange) => void
}

const RANGE_LABELS: Record<TimelineRange, string> = {
  yesterday: '어제',
  today: '오늘',
  tomorrow: '내일',
  last_month: '저번달',
  this_month: '이번달',
  next_month: '다음달'
}

export const ScheduleTimeline = React.memo(function ScheduleTimeline({ events, currentRange, onRangeChange }: ScheduleTimelineProps) {
  const { openEventDetail, openAddEvent } = useCalendarStore()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 현재 진행 중인 일정 판별
  const now = new Date()
  const isEventActive = (event: Activity) => {
    const start = new Date(event.start_time)
    const end = new Date(event.end_time)
    return now >= start && now <= end
  }

  const formatTime = (event: Activity) => {
    if (event.is_all_day) return '하루 종일'
    const d = parseISO(event.start_time)
    if (!isValid(d)) return ''
    return format(d, 'HH:mm')
  }

  const formatEndTime = (event: Activity) => {
    const d = parseISO(event.end_time)
    if (!isValid(d)) return ''
    return format(d, 'HH:mm')
  }

  const handleAddEvent = () => {
    openAddEvent(new Date())
  }

  const isMonthly = ['last_month', 'this_month', 'next_month'].includes(currentRange)

  // 그룹화 로직
  const groupedEvents = useMemo(() => {
    if (!isMonthly) {
      // 일간 뷰: 종일/시간 분리
      const allDay: Activity[] = []
      const timed: Activity[] = []
      events.forEach(e => {
        if (e.is_all_day) allDay.push(e)
        else timed.push(e)
      })
      return { type: 'daily' as const, allDay, timed }
    } else {
      // 월간 뷰: 날짜별 그룹화
      const groups: Record<string, Activity[]> = {}
      events.forEach(e => {
        const d = parseISO(e.start_time)
        if (!isValid(d)) return
        const dateKey = format(d, 'yyyy-MM-dd')
        if (!groups[dateKey]) groups[dateKey] = []
        groups[dateKey].push(e)
      })
      
      const sortedKeys = Object.keys(groups).sort()
      return { 
        type: 'monthly' as const, 
        groups: sortedKeys.map(key => ({
          dateStr: key,
          dateObj: parseISO(key),
          items: groups[key]
        }))
      }
    }
  }, [events, isMonthly])

  // 빈 상태 메시지
  const getEmptyMessage = () => {
    switch (currentRange) {
      case 'yesterday': return '어제는 일정이 없었어요.'
      case 'tomorrow': return '내일은 일정이 없습니다.'
      case 'last_month': return '저번달에는 등록된 일정이 없었어요.'
      case 'this_month': return '이번달은 일정이 없습니다.'
      case 'next_month': return '다음달은 아직 계획된 일정이 없어요.'
      case 'today':
      default: return '오늘은 일정이 없습니다.'
    }
  }

  const renderEventCard = (event: Activity, compact: boolean = false) => {
    const color = event.categories?.[0]?.hex_color || event.hex_color || '#4f46e5'
    const active = isEventActive(event)
    const categoryName = event.categories?.[0]?.name

    if (compact) {
      // 월간 뷰를 위한 컴팩트 카드
      return (
        <motion.div
          key={event.id}
          whileHover={{ y: -1, scale: 1.01 }}
          onClick={() => openEventDetail(event)}
          className={`flex items-center justify-between p-2.5 rounded-xl transition-all border cursor-pointer ${
            active
              ? 'bg-gradient-to-r from-blue-50/80 to-white border-blue-100/60 shadow-[0_2px_10px_-3px_rgba(59,130,246,0.15)]'
              : 'bg-white/60 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div className="flex flex-col min-w-0">
              <h4 className="text-sm font-bold text-slate-800 truncate leading-tight">
                {event.is_all_day ? <Sparkles className="w-3 h-3 inline-block mr-1 text-slate-400" /> : null}
                {event.title}
              </h4>
              <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                {formatTime(event)} {event.is_all_day ? '' : `~ ${formatEndTime(event)}`}
              </span>
            </div>
          </div>
          {categoryName && (
            <span
              className="shrink-0 ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{ backgroundColor: `${color}12`, color: color, border: `1px solid ${color}20` }}
            >
              {categoryName}
            </span>
          )}
        </motion.div>
      )
    }

    // 기존 일간 뷰 카드
    return (
      <div
        key={event.id}
        onClick={() => openEventDetail(event)}
        className="relative pl-7 group cursor-pointer"
      >
        <div className="absolute -left-[6px] top-4 z-10">
          <div
            className="w-[11px] h-[11px] rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-125"
            style={{ backgroundColor: color }}
          />
          {active && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: color }}
              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
        <motion.div
          whileHover={{ y: -1 }}
          className={`flex flex-col p-3.5 rounded-2xl transition-all border ${
            active
              ? 'bg-gradient-to-r from-blue-50/80 to-white border-blue-100/60 shadow-[0_4px_20px_-6px_rgba(59,130,246,0.15)]'
              : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-100/50 hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.06)]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500 tracking-wide">
              {formatTime(event)} ~ {formatEndTime(event)}
            </span>
            {active && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-white" />
                </span>
                진행 중
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-800 leading-tight line-clamp-2">
            {event.title}
          </h4>
          {categoryName && (
            <div className="flex items-center mt-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
                style={{ backgroundColor: `${color}12`, color: color, border: `1px solid ${color}20` }}
              >
                {categoryName}
              </span>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col bg-white/85 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] overflow-hidden h-full max-h-[700px] min-h-[420px]">
      {/* 헤더 */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-inner border border-white/50">
            <CalendarDays className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              일정(캘린더)
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  {RANGE_LABELS[currentRange]}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full left-0 mt-1 w-24 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50"
                    >
                      {(Object.entries(RANGE_LABELS) as [TimelineRange, string][]).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => {
                            onRangeChange(val)
                            setIsDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-colors ${
                            currentRange === val ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {events.length > 0 ? `${events.length}개의 일정` : '등록된 일정이 없어요'}
            </p>
          </div>
        </div>
        <button
          onClick={handleAddEvent}
          className="px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors shrink-0"
        >
          + 일정 추가
        </button>
      </div>

      {/* 일간 뷰: 종일 일정 배너 */}
      {!isMonthly && groupedEvents.type === 'daily' && (
        <AnimatePresence>
          {groupedEvents.allDay.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 pb-3 shrink-0"
            >
              <div className="flex flex-wrap gap-2">
                {groupedEvents.allDay.map(event => {
                  const color = event.categories?.[0]?.hex_color || event.hex_color || '#8b5cf6'
                  return (
                    <button
                      key={event.id}
                      onClick={() => openEventDetail(event)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all hover:scale-[1.03] hover:shadow-md cursor-pointer"
                      style={{ backgroundColor: `${color}12`, color: color, border: `1px solid ${color}25` }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {event.title}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* 타임라인 바디 */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto hide-scrollbar relative">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center h-full">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl flex items-center justify-center mb-4 shadow-inner border border-slate-100">
              <Inbox className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">{getEmptyMessage()}</p>
            <p className="text-xs text-slate-300 mt-1">새 일정을 추가해 보세요!</p>
            <button
              onClick={handleAddEvent}
              className="mt-4 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
            >
              + 새 일정 만들기
            </button>
          </div>
        ) : groupedEvents.type === 'daily' ? (
          <div className="relative border-l-2 border-slate-100 ml-3 space-y-1">
            {groupedEvents.timed.map(event => renderEventCard(event, false))}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEvents.groups.map(group => {
              const dateStr = format(group.dateObj, 'M월 d일 EEEE', { locale: ko })
              const isToday = isSameDay(group.dateObj, now)
              return (
                <div key={group.dateStr} className="relative">
                  <div className="sticky top-0 z-20 py-2 -mx-2 px-2 bg-white/80 backdrop-blur-md mb-2">
                    <h3 className="text-xs font-extrabold text-slate-700 tracking-tight flex items-center gap-2">
                      {dateStr}
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700">오늘</span>
                      )}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {group.items.map(event => renderEventCard(event, true))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})
