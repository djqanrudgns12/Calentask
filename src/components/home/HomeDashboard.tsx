'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useUserProfile } from '@/hooks/useCalendarQueries'
import { useAgendaStore } from '@/store/useAgendaStore'
import { useActivities } from '@/hooks/useCalendarQueries'
import { useAnniversaryOverlay } from '@/hooks/useAnniversaryOverlay'
import type { Activity } from '@/app/actions/calendar'
import { TodayTimeline } from './TodayTimeline'
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

export function HomeDashboard() {
  const { data: profile } = useUserProfile()
  const { tasks, isInitialized } = useAgendaStore()

  // 오늘의 일정 데이터 가져오기
  const today = useMemo(() => new Date(), [])
  const todayStart = useMemo(() => {
    const d = new Date(today)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [today])
  const todayEnd = useMemo(() => {
    const d = new Date(today)
    d.setHours(23, 59, 59, 999)
    return d.toISOString()
  }, [today])

  const { data: activitiesData } = useActivities(todayStart, todayEnd)
  const { data: anniversaryEvents } = useAnniversaryOverlay(todayStart, todayEnd)

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

  const todayEvents = useMemo(() => {
    return [
      ...(activitiesData || []),
      ...((anniversaryEvents || []) as unknown as Activity[]),
      ...agendaEvents,
    ].filter(event => {
      const eventDate = new Date(event.start_time)
      const todayDate = new Date()
      return (
        eventDate.getFullYear() === todayDate.getFullYear() &&
        eventDate.getMonth() === todayDate.getMonth() &&
        eventDate.getDate() === todayDate.getDate()
      ) || event.is_all_day
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [activitiesData, anniversaryEvents, agendaEvents])

  // 할 일 통계
  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'trash' && t.status !== 'done')
  }, [tasks])

  const greeting = getGreeting()
  const userName = profile?.full_name || ''
  const dateString = format(today, 'yyyy년 M월 d일 EEEE', { locale: ko })

  // 요약 문구
  const summaryParts: string[] = []
  if (todayEvents.length > 0) summaryParts.push(`${todayEvents.length}개의 일정`)
  if (activeTasks.length > 0) summaryParts.push(`${activeTasks.length}개의 할 일`)
  const summaryText = summaryParts.length > 0
    ? `오늘은 ${summaryParts.join('과 ')}이 기다리고 있어요.`
    : '오늘은 여유로운 하루예요. 🎉'

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
          <TodayTimeline events={todayEvents} />
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
