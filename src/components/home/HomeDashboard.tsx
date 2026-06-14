'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, startOfYesterday, endOfYesterday, startOfToday, endOfToday, startOfTomorrow, endOfTomorrow, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useUserProfile } from '@/hooks/useCalendarQueries'
import { useAgendaStore } from '@/store/useAgendaStore'
import { useActivities } from '@/hooks/useCalendarQueries'
import { useAnniversaryOverlay } from '@/hooks/useAnniversaryOverlay'
import type { Activity } from '@/app/actions/calendar'
import { ScheduleTimeline } from './ScheduleTimeline'
import { SmartAgenda } from './SmartAgenda'
import { QuickActions } from './QuickActions'
import { DDayCard } from './DDayCard'
import { RecentNotes } from './RecentNotes'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return '좋은 아침이에요'
  if (hour >= 12 && hour < 18) return '좋은 오후예요'
  return '좋은 저녁이에요'
}

export type TimelineRange = 'yesterday' | 'today' | 'tomorrow' | 'last_month' | 'this_month' | 'next_month'

export function HomeDashboard() {
  const { data: profile } = useUserProfile()
  const { tasks, isInitialized } = useAgendaStore()

  const [selectedRange, setSelectedRange] = useState<TimelineRange>('today')

  useEffect(() => {
    const saved = localStorage.getItem('calentask_timeline_range') as TimelineRange | null
    if (saved) {
      setSelectedRange(saved)
    }
  }, [])

  const handleRangeChange = (range: TimelineRange) => {
    setSelectedRange(range)
    localStorage.setItem('calentask_timeline_range', range)
  }

  const { dateStart, dateEnd } = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date

    switch (selectedRange) {
      case 'yesterday':
        start = startOfYesterday()
        end = endOfYesterday()
        break
      case 'tomorrow':
        start = startOfTomorrow()
        end = endOfTomorrow()
        break
      case 'last_month':
        start = startOfMonth(subMonths(now, 1))
        end = endOfMonth(subMonths(now, 1))
        break
      case 'this_month':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case 'next_month':
        start = startOfMonth(addMonths(now, 1))
        end = endOfMonth(addMonths(now, 1))
        break
      case 'today':
      default:
        start = startOfToday()
        end = endOfToday()
        break
    }
    return { dateStart: start.toISOString(), dateEnd: end.toISOString() }
  }, [selectedRange])

  const { data: activitiesData } = useActivities(dateStart, dateEnd)
  const { data: anniversaryEvents } = useAnniversaryOverlay(dateStart, dateEnd)

  // 아젠다 이벤트 (캘린더 등록된 것만, 오늘 날짜 범위)
  const agendaEvents = useMemo(() => {
    return tasks
      .filter(task => task.status !== 'trash' && task.status !== 'done' && task.deadline && task.is_calendar_registered === true)
      .map(task => {
        const taskDate = new Date(task.deadline!)
        return {
          id: task.id,
          title: task.title,
          start_time: taskDate.toISOString(),
          end_time: new Date(taskDate.getTime() + 60 * 60 * 1000).toISOString(),
          categories: [{ id: 'agenda-category', name: 'Agenda', color: '#3b82f6', hex_color: '#3b82f6' }],
          is_all_day: false,
          memo: task.memo || 'From Archive Agenda',
          color: '#3b82f6',
          hex_color: '#3b82f6',
        }
      }) as unknown as Activity[]
  }, [tasks])

  const timelineEvents = useMemo(() => {
    const rangeStart = new Date(dateStart)
    const rangeEnd = new Date(dateEnd)

    return [
      ...(activitiesData || []),
      ...((anniversaryEvents || []) as unknown as Activity[]),
      ...agendaEvents,
    ].filter(event => {
      const eventStart = new Date(event.start_time)
      const eventEnd = event.end_time ? new Date(event.end_time) : eventStart
      
      return (eventStart <= rangeEnd && eventEnd >= rangeStart)
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [activitiesData, anniversaryEvents, agendaEvents, dateStart, dateEnd])

  // 할 일 통계
  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'trash' && t.status !== 'done')
  }, [tasks])

  const greeting = getGreeting()
  const userName = profile?.full_name || ''
  const dateString = format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })

  const getRangeLabelText = (range: TimelineRange) => {
    switch (range) {
      case 'yesterday': return '어제는'
      case 'tomorrow': return '내일은'
      case 'last_month': return '저번달은'
      case 'this_month': return '이번달은'
      case 'next_month': return '다음달은'
      case 'today':
      default: return '오늘은'
    }
  }

  const getSummaryText = () => {
    const parts: string[] = []
    if (timelineEvents.length > 0) parts.push(`${timelineEvents.length}개의 일정`)
    if (activeTasks.length > 0 && selectedRange === 'today') parts.push(`${activeTasks.length}개의 할 일`)

    if (parts.length === 0) {
      if (selectedRange === 'yesterday' || selectedRange === 'last_month') return `${getRangeLabelText(selectedRange)} 여유로웠어요. 🎉`
      return `${getRangeLabelText(selectedRange)} 여유로운 시간이에요. 🎉`
    }

    const joined = parts.join('과 ')
    if (selectedRange === 'yesterday' || selectedRange === 'last_month') return `${getRangeLabelText(selectedRange)} ${joined}이 있었어요.`
    return `${getRangeLabelText(selectedRange)} ${joined}이 기다리고 있어요.`
  }

  const summaryText = getSummaryText()

  return (
    <motion.div
      className="min-h-full px-4 md:px-8 py-6 md:py-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Briefing Header */}
      <motion.div variants={itemVariants} className="mb-6 md:mb-8">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-slate-400 tracking-wide">
            {dateString}
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              {greeting}
            </span>
            {userName && (
              <span className="text-slate-800">, {userName}님</span>
            )}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {summaryText}
          </p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="mb-6">
        <QuickActions />
      </motion.div>

      {/* Main BENTO Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        {/* 오늘의 타임라인 — 메인 영역 (2/3) */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <ScheduleTimeline 
            events={timelineEvents} 
            currentRange={selectedRange} 
            onRangeChange={handleRangeChange} 
          />
        </motion.div>

        {/* 할 일 — 사이드 영역 (1/3) */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SmartAgenda />
        </motion.div>
      </div>

      {/* Bottom Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mt-5 md:mt-6">
        <motion.div variants={itemVariants}>
          <DDayCard />
        </motion.div>
        <motion.div variants={itemVariants}>
          <RecentNotes />
        </motion.div>
      </div>
    </motion.div>
  )
}
