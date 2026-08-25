'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type {
  DayCellContentArg,
  EventContentArg,
  EventDropArg,
  EventInput,
  MoreLinkArg,
} from '@fullcalendar/core'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { moveCalendarEvent } from '@/app/actions/calendarMonth'
import { useCalendarStore } from '@/store/useCalendarStore'
import { formatCalendarDateKey } from '@/lib/calendarMonth'
import { getCalendarFontClasses } from '@/lib/calendarFontSize'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent } from '@/components/ui/tooltip'
import type {
  CalendarEventSummary,
  CalendarMonthSnapshot,
  RecurringMoveScope,
  SpecialDay,
  SpecialDaysMap,
} from '@/types/calendarMonth'

type PendingDrop = {
  summary: CalendarEventSummary
  start: string
  end: string
  revert: () => void
}

interface MonthlyViewProps {
  currentDate: Date
  events: CalendarEventSummary[]
  specialDays: SpecialDaysMap
  isLoading?: boolean
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const SOURCE_LABELS = {
  activity: '일정',
  agenda: '아젠다',
  anniversary: '기념일',
  academic: '학사일정',
} as const

function specialDayVisible(day: SpecialDay, settings: {
  showHolidays: boolean
  showNationalDays: boolean
  showAnniversaries: boolean
  showTraditionalTerms: boolean
}) {
  if (day.type === 'holiday') return settings.showHolidays
  if (day.type === 'national') return settings.showNationalDays
  if (day.type === 'anniversary') return settings.showAnniversaries
  return settings.showTraditionalTerms
}

function eventAriaLabel(event: CalendarEventSummary) {
  const start = new Date(event.start).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  const end = new Date(event.end).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  const period = event.allDay && event.end.slice(0, 10) !== event.start.slice(0, 10)
    ? `${start}부터 ${end} 전까지`
    : start
  return `${SOURCE_LABELS[event.source]}, ${event.title}, ${period}`
}

function eventStripe(summary: CalendarEventSummary) {
  const stripe = summary.categories.length > 1
    ? `linear-gradient(180deg, ${summary.categories.map((category, index) => `${category.hexColor} ${index / summary.categories.length * 100}% ${(index + 1) / summary.categories.length * 100}%`).join(', ')})`
    : summary.color
  return stripe
}

export const MonthlyView = React.memo(function MonthlyView({
  currentDate,
  events,
  specialDays,
  isLoading = false,
}: MonthlyViewProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const queryClient = useQueryClient()
  const [activeTooltip, setActiveTooltip] = useState<{ summary: CalendarEventSummary; anchor: HTMLElement } | null>(null)
  const openDaySummary = useCalendarStore(state => state.openDaySummary)
  const showHolidays = useCalendarStore(state => state.showHolidays)
  const showHolidaysAsTags = useCalendarStore(state => state.showHolidaysAsTags)
  const showNationalDays = useCalendarStore(state => state.showNationalDays)
  const showAnniversaries = useCalendarStore(state => state.showAnniversaries)
  const showTraditionalTerms = useCalendarStore(state => state.showTraditionalTerms)
  const showSaturdayBlue = useCalendarStore(state => state.showSaturdayBlue)
  const calendarFontSize = useCalendarStore(state => state.calendarFontSize)
  const weekStartsOn = useCalendarStore(state => state.weekStartsOn)
  const [isCompact, setIsCompact] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [moveScope, setMoveScope] = useState<RecurringMoveScope>('THIS_EVENT')
  const [isMoving, setIsMoving] = useState(false)
  const fontClasses = getCalendarFontClasses(calendarFontSize)

  const specialDaySettings = useMemo(() => ({
    showHolidays,
    showNationalDays,
    showAnniversaries,
    showTraditionalTerms,
  }), [showAnniversaries, showHolidays, showNationalDays, showTraditionalTerms])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    const target = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    if (api.getDate().getFullYear() !== target.getFullYear() || api.getDate().getMonth() !== target.getMonth()) {
      if (process.env.NEXT_PUBLIC_CALENDAR_PERF_MARKS === '1') performance.mark('calendar:navigation-start')
      api.gotoDate(target)
    }
  }, [currentDate])

  useEffect(() => {
    if (!isLoading && process.env.NEXT_PUBLIC_CALENDAR_PERF_MARKS === '1') {
      performance.mark('calendar:data-ready')
    }
  }, [events, isLoading])

  const visibleSpecialDays = useCallback((date: Date) => {
    const key = formatCalendarDateKey(date)
    return (specialDays[key] ?? []).filter(day => specialDayVisible(day, specialDaySettings))
  }, [specialDaySettings, specialDays])

  const calendarEvents = useMemo<EventInput[]>(() => {
    const result: EventInput[] = events.map(event => ({
      id: event.instanceId,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      editable: event.editable,
      startEditable: event.editable,
      durationEditable: false,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      extendedProps: {
        summary: event,
        orderPriority: event.allDay ? 1 : 2,
      },
    }))

    if (showHolidays && showHolidaysAsTags) {
      Object.entries(specialDays).forEach(([date, days]) => {
        days.filter(day => day.type === 'holiday').forEach((day, index) => {
          result.push({
            id: `holiday:${date}:${index}`,
            title: day.name,
            start: date,
            end: addOneDay(date),
            allDay: true,
            editable: false,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            extendedProps: { holiday: day, orderPriority: 0 },
          })
        })
      })
    }
    return result
  }, [events, showHolidays, showHolidaysAsTags, specialDays])

  const eventCountByDate = useMemo(() => {
    const counts = new Map<string, number>()
    const increment = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1)
    events.forEach(event => {
      const start = new Date(event.start)
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const end = new Date(event.end)
      let guard = 0
      while (cursor < end && guard < 62) {
        increment(formatCalendarDateKey(cursor))
        cursor.setDate(cursor.getDate() + 1)
        guard++
      }
    })
    if (showHolidays && showHolidaysAsTags) {
      Object.entries(specialDays).forEach(([key, days]) => {
        days.filter(day => day.type === 'holiday').forEach(() => increment(key))
      })
    }
    return counts
  }, [events, showHolidays, showHolidaysAsTags, specialDays])

  const applyMove = useCallback(async (drop: PendingDrop, scope?: RecurringMoveScope) => {
    setIsMoving(true)
    await queryClient.cancelQueries({ queryKey: ['calendar-month'] })
    const previous = queryClient.getQueriesData<CalendarMonthSnapshot>({ queryKey: ['calendar-month'] })
    queryClient.setQueriesData<CalendarMonthSnapshot>({ queryKey: ['calendar-month'] }, snapshot => {
      if (!snapshot) return snapshot
      return {
        ...snapshot,
        events: snapshot.events.map(event => event.instanceId === drop.summary.instanceId
          ? { ...event, start: drop.start, end: drop.end }
          : event),
      }
    })

    try {
      await moveCalendarEvent({
        instanceId: drop.summary.instanceId,
        entityId: drop.summary.entityId,
        source: drop.summary.source as 'activity' | 'agenda',
        start: drop.start,
        end: drop.end,
        allDay: drop.summary.allDay,
        recurrenceRule: drop.summary.recurrenceRule,
        parentActivityId: drop.summary.parentActivityId,
        originalStartTime: drop.summary.originalStartTime,
        scope,
      })
      toast.success('일정을 이동했습니다.')
    } catch (error) {
      previous.forEach(([key, snapshot]) => queryClient.setQueryData(key, snapshot))
      drop.revert()
      toast.error(error instanceof Error ? error.message : '일정을 이동하지 못했습니다.')
    } finally {
      setIsMoving(false)
      setPendingDrop(null)
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] })
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    }
  }, [queryClient])

  const handleEventDrop = useCallback((arg: EventDropArg) => {
    const summary = arg.event.extendedProps.summary as CalendarEventSummary | undefined
    if (!summary || !summary.editable || !['activity', 'agenda'].includes(summary.source)) {
      arg.revert()
      return
    }

    const start = arg.event.allDay ? arg.event.startStr.slice(0, 10) : arg.event.start?.toISOString()
    const end = arg.event.allDay
      ? (arg.event.endStr || addOneDay(arg.event.startStr.slice(0, 10))).slice(0, 10)
      : arg.event.end?.toISOString()
    if (!start || !end) {
      arg.revert()
      return
    }

    const drop = { summary, start, end, revert: arg.revert }
    if (summary.recurrenceRule || summary.parentActivityId || summary.originalStartTime) {
      setMoveScope('THIS_EVENT')
      setPendingDrop(drop)
      return
    }
    void applyMove(drop)
  }, [applyMove])

  const renderEvent = useCallback((arg: EventContentArg) => {
    const holiday = arg.event.extendedProps.holiday as SpecialDay | undefined
    if (holiday) {
      const row = document.createElement('span')
      row.className = 'cal-month-event cal-month-event--holiday'
      const title = document.createElement('span')
      title.className = 'truncate'
      title.textContent = holiday.name
      row.append(title)
      return { domNodes: [row] }
    }

    const summary = arg.event.extendedProps.summary as CalendarEventSummary
    const row = document.createElement('span')
    row.className = `cal-month-event ${fontClasses.eventTitle}`
    row.style.setProperty('--cal-event-color', summary.color)
    row.style.setProperty('--cal-event-stripe', eventStripe(summary))
    const stripe = document.createElement('span')
    stripe.className = 'cal-month-event__stripe'
    stripe.setAttribute('aria-hidden', 'true')
    const title = document.createElement('span')
    title.className = 'cal-month-event__title'
    title.textContent = summary.title
    row.append(stripe, title)
    return { domNodes: [row] }
  }, [fontClasses.eventTitle])

  const renderDayCell = useCallback((arg: DayCellContentArg) => {
    const visible = visibleSpecialDays(arg.date)
    const holiday = visible.find(day => day.type === 'holiday' && day.isHoliday)
    const labels = visible
      .filter(day => !(showHolidaysAsTags && day.type === 'holiday'))
      .map(day => day.name)
    const day = arg.date.getDay()
    const tone = holiday || day === 0 ? 'coral' : day === 6 && showSaturdayBlue ? 'blue' : 'ink'

    return (
      <div className="cal-month-date-line">
        <span className={`cal-month-date cal-month-date--${tone} ${arg.isToday ? 'is-today' : ''}`}>
          {arg.dayNumberText.replace('일', '')}
        </span>
        {labels.length > 0 && <span className="cal-month-special-label">{labels.join(' · ')}</span>}
      </div>
    )
  }, [showHolidaysAsTags, showSaturdayBlue, visibleSpecialDays])

  return (
    <section className="monthly-calendar-v2 relative flex min-h-0 flex-1 flex-col" aria-label="월간 캘린더">
      <div className="cal-month-frame min-h-0 flex-1 overflow-hidden rounded-[18px] border border-[var(--cal-grid-line)] bg-[var(--cal-paper)]">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={currentDate}
          headerToolbar={false}
          firstDay={weekStartsOn}
          locale="ko"
          height="100%"
          expandRows
          fixedWeekCount={false}
          showNonCurrentDates
          displayEventTime={false}
          editable
          eventDurationEditable={false}
          eventStartEditable
          dragScroll
          dayMaxEvents={isCompact ? 1 : false}
          dayMaxEventRows={isCompact ? false : true}
          eventOrder="orderPriority,start,-duration,title"
          eventOrderStrict
          events={calendarEvents}
          dayHeaderContent={arg => <span>{DAY_LABELS[arg.date.getDay()]}</span>}
          dayHeaderClassNames={arg => [arg.date.getDay() === 0 ? 'is-sunday' : arg.date.getDay() === 6 && showSaturdayBlue ? 'is-saturday' : '']}
          dayCellContent={renderDayCell}
          dayCellClassNames={arg => [arg.isOther ? 'is-other-month' : '', visibleSpecialDays(arg.date).some(day => day.isHoliday) ? 'is-holiday' : '']}
          dayCellDidMount={arg => {
            const count = eventCountByDate.get(formatCalendarDateKey(arg.date)) ?? 0
            arg.el.tabIndex = 0
            arg.el.setAttribute('role', 'button')
            arg.el.setAttribute('aria-label', `${arg.date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}, 일정 ${count}개`)
            arg.el.onkeydown = event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openDaySummary(arg.date)
              }
            }
          }}
          dateClick={arg => openDaySummary(arg.date)}
          eventClick={arg => {
            const summary = arg.event.extendedProps.summary as CalendarEventSummary | undefined
            openDaySummary(summary ? new Date(summary.start) : (arg.event.start ?? new Date()))
          }}
          eventDrop={handleEventDrop}
          eventContent={renderEvent}
          eventClassNames={arg => {
            const classes = ['cal-month-segment']
            if (arg.event.extendedProps.holiday) classes.push('is-holiday-tag')
            if (arg.isStart) classes.push('is-start')
            if (arg.isEnd) classes.push('is-end')
            return classes
          }}
          eventDidMount={arg => {
            const summary = arg.event.extendedProps.summary as CalendarEventSummary | undefined
            if (!summary) return
            arg.el.tabIndex = 0
            arg.el.setAttribute('role', 'button')
            arg.el.setAttribute('aria-label', eventAriaLabel(summary))
            const showTooltip = () => setActiveTooltip({ summary, anchor: arg.el })
            const hideTooltip = () => setActiveTooltip(current => current?.anchor === arg.el ? null : current)
            arg.el.onmouseenter = showTooltip
            arg.el.onmouseleave = hideTooltip
            arg.el.onfocus = showTooltip
            arg.el.onblur = hideTooltip
            arg.el.onkeydown = event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                openDaySummary(new Date(summary.start))
              }
            }
          }}
          eventWillUnmount={arg => {
            setActiveTooltip(current => current?.anchor === arg.el ? null : current)
          }}
          eventAllow={(_dropInfo, draggedEvent) => Boolean((draggedEvent?.extendedProps.summary as CalendarEventSummary | undefined)?.editable)}
          moreLinkContent={arg => <span aria-label={`${arg.num}개의 숨은 일정`}>+{arg.num}</span>}
          moreLinkClick={(arg: MoreLinkArg) => {
            openDaySummary(arg.date)
          }}
          datesSet={() => {
            if (process.env.NEXT_PUBLIC_CALENDAR_PERF_MARKS === '1') performance.mark('calendar:grid-ready')
          }}
        />
      </div>

      {isLoading && (
        <div className="pointer-events-none absolute inset-x-0 top-9 bottom-0 grid grid-cols-7 overflow-hidden rounded-b-[18px]" aria-label="일정을 불러오는 중">
          {Array.from({ length: 21 }).map((_, index) => (
            <div key={index} className="border-r border-b border-[var(--cal-grid-line)] p-2">
              <div className="h-5 animate-pulse rounded bg-[var(--cal-skeleton)]" />
            </div>
          ))}
        </div>
      )}

      <Tooltip open={Boolean(activeTooltip)} onOpenChange={open => {
        if (!open) setActiveTooltip(null)
      }}>
        {activeTooltip && <TooltipContent anchor={activeTooltip.anchor}>{activeTooltip.summary.title}</TooltipContent>}
      </Tooltip>

      <Dialog
        open={Boolean(pendingDrop)}
        onOpenChange={open => {
          if (!open && pendingDrop && !isMoving) {
            pendingDrop.revert()
            setPendingDrop(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반복 일정 이동 범위</DialogTitle>
            <DialogDescription>이동할 반복 회차의 범위를 선택해 주세요.</DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2" disabled={isMoving}>
            {([
              ['THIS_EVENT', '이 회차만', '선택한 일정 한 건만 이동합니다.'],
              ['THIS_AND_FOLLOWING', '이후 일정', '이 회차부터 이후 반복 일정을 이동합니다.'],
              ['ALL_EVENTS', '전체 일정', '반복 일정 전체에 새 시간을 적용합니다.'],
            ] as const).map(([value, label, description]) => (
              <label key={value} className="flex cursor-pointer gap-3 rounded-lg border p-3 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-500/5">
                <input type="radio" name="recurring-move-scope" value={value} checked={moveScope === value} onChange={() => setMoveScope(value)} />
                <span><span className="block font-semibold">{label}</span><span className="text-xs text-muted-foreground">{description}</span></span>
              </label>
            ))}
          </fieldset>
          <DialogFooter>
            <Button variant="outline" disabled={isMoving} onClick={() => {
              pendingDrop?.revert()
              setPendingDrop(null)
            }}>취소</Button>
            <Button disabled={!pendingDrop || isMoving} onClick={() => pendingDrop && void applyMove(pendingDrop, moveScope)}>
              {isMoving ? '이동 중…' : '이동'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
})

function addOneDay(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
