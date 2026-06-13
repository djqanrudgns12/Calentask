'use client'

import React, { useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Clock, CalendarDays, Inbox, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCalendarStore } from '@/store/useCalendarStore'
import type { Activity } from '@/app/actions/calendar'

interface TodayTimelineProps {
  events: Activity[]
}

export const TodayTimeline = React.memo(function TodayTimeline({ events }: TodayTimelineProps) {
  const { openEventDetail, openAddEvent } = useCalendarStore()

  // 종일 일정과 시간 일정 분리
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: Activity[] = []
    const timed: Activity[] = []
    events.forEach(e => {
      if (e.is_all_day) {
        allDay.push(e)
      } else {
        timed.push(e)
      }
    })
    return { allDayEvents: allDay, timedEvents: timed }
  }, [events])

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

  return (
    <div className="relative bg-white/85 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-inner border border-white/50">
            <CalendarDays className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight">오늘의 일정</h2>
            <p className="text-xs text-slate-400 font-medium">
              {events.length > 0 ? `${events.length}개의 일정` : '등록된 일정이 없어요'}
            </p>
          </div>
        </div>
        <button
          onClick={handleAddEvent}
          className="px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors"
        >
          + 일정 추가
        </button>
      </div>

      {/* 종일 일정 배너 */}
      <AnimatePresence>
        {allDayEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 pb-3"
          >
            <div className="flex flex-wrap gap-2">
              {allDayEvents.map(event => {
                const color = event.categories?.[0]?.hex_color || event.hex_color || '#8b5cf6'
                return (
                  <button
                    key={event.id}
                    onClick={() => openEventDetail(event)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all hover:scale-[1.03] hover:shadow-md cursor-pointer"
                    style={{
                      backgroundColor: `${color}12`,
                      color: color,
                      border: `1px solid ${color}25`,
                    }}
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

      {/* 타임라인 */}
      <div className="px-6 pb-6 max-h-[420px] overflow-y-auto hide-scrollbar">
        {timedEvents.length === 0 && allDayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl flex items-center justify-center mb-4 shadow-inner border border-slate-100">
              <Inbox className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">오늘은 일정이 없습니다</p>
            <p className="text-xs text-slate-300 mt-1">새 일정을 추가해 보세요!</p>
            <button
              onClick={handleAddEvent}
              className="mt-4 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
            >
              + 새 일정 만들기
            </button>
          </div>
        ) : timedEvents.length === 0 ? null : (
          <div className="relative border-l-2 border-slate-100 ml-3 space-y-1">
            {timedEvents.map((event) => {
              const color = event.categories?.[0]?.hex_color || event.hex_color || '#4f46e5'
              const active = isEventActive(event)
              const categoryName = event.categories?.[0]?.name

              return (
                <div
                  key={event.id}
                  onClick={() => openEventDetail(event)}
                  className="relative pl-7 group cursor-pointer"
                >
                  {/* 타임라인 Dot */}
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

                  {/* 이벤트 카드 */}
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
                          style={{
                            backgroundColor: `${color}12`,
                            color: color,
                            border: `1px solid ${color}20`,
                          }}
                        >
                          {categoryName}
                        </span>
                      </div>
                    )}
                  </motion.div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})
