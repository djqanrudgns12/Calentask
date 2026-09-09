'use client'

import { useEffect, useMemo } from 'react'
import { endOfWeek, startOfWeek } from 'date-fns'
import type { Activity } from '@/app/actions/calendar'
import { useActivities } from '@/hooks/useCalendarQueries'
import { useAnniversaryOverlay } from '@/hooks/useAnniversaryOverlay'
import { useAgendaStore } from '@/store/useAgendaStore'
import { useCalendarStore, type ViewMode } from '@/store/useCalendarStore'
import { DaySummarySheet } from '@/components/calendar/DaySummarySheet'
import { ListView } from '@/components/calendar/ListView'
import { SemesterView } from '@/components/calendar/SemesterView'
import { WeeklyViewWithDnd } from '@/components/calendar/WeeklyViewWithDnd'

interface LegacyCalendarViewsProps {
  viewMode: Extract<ViewMode, 'weekly' | 'list' | 'semester'>
  currentDate: Date
}

export function LegacyCalendarViews({ viewMode, currentDate }: LegacyCalendarViewsProps) {
  const semesterYear = useCalendarStore(state => state.semesterYear)
  const semesterTerm = useCalendarStore(state => state.semesterTerm)
  const weekStartsOn = useCalendarStore(state => state.weekStartsOn)
  const activeCategories = useCalendarStore(state => state.activeCategories)
  const selectedDaySummary = useCalendarStore(state => state.selectedDaySummary)
  const { tasks, fetchTasks, isInitialized } = useAgendaStore()

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const semesterStart = new Date(semesterYear, semesterTerm === 1 ? 2 : 8, 1)
  const semesterEnd = new Date(
    semesterTerm === 1 ? semesterYear : semesterYear + 1,
    semesterTerm === 1 ? 7 : 1,
    semesterTerm === 1 ? 31 : 28,
  )
  const queryStart = viewMode === 'semester'
    ? startOfWeek(semesterStart, { weekStartsOn })
    : startOfWeek(monthStart, { weekStartsOn })
  const queryEnd = viewMode === 'semester'
    ? endOfWeek(semesterEnd, { weekStartsOn })
    : endOfWeek(monthEnd, { weekStartsOn })
  const startDateStr = queryStart.toISOString()
  const endDateStr = queryEnd.toISOString()
  const { data: activities } = useActivities(startDateStr, endDateStr)
  const { data: anniversaries } = useAnniversaryOverlay(startDateStr, endDateStr)

  useEffect(() => {
    if (!isInitialized) void fetchTasks()
  }, [fetchTasks, isInitialized])

  const agendaEvents = useMemo(() => tasks
    .filter(task => task.status !== 'trash' && task.deadline && task.is_calendar_registered === true)
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
    }) as unknown as Activity[], [tasks])

  const events = useMemo(() => {
    const merged = [
      ...(activities ?? []),
      ...((anniversaries ?? []) as unknown as Activity[]),
      ...agendaEvents,
    ]
    if (activeCategories.length === 0) return merged
    return merged.filter(event => event.categories?.some(category => (
      activeCategories.includes(category.id) || category.id === 'agenda-category'
    )))
  }, [activities, activeCategories, agendaEvents, anniversaries])

  return (
    <>
      {viewMode === 'weekly' && (
        <WeeklyViewWithDnd
          currentDate={currentDate}
          events={events}
          startDateStr={startDateStr}
          endDateStr={endDateStr}
        />
      )}
      {viewMode === 'list' && <ListView currentDate={currentDate} events={events} />}
      {viewMode === 'semester' && <SemesterView currentDate={currentDate} events={events} />}
      {selectedDaySummary && <DaySummarySheet events={events} />}
    </>
  )
}
