import { format } from 'date-fns'
import type {
  CalendarEventSummary,
  CalendarMonthKey,
  CalendarMonthRange,
} from '@/types/calendarMonth'
import type { Activity } from '@/app/actions/calendar'

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000
const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

export function toCalendarMonthKey(date: Date): CalendarMonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` as CalendarMonthKey
}

export function parseCalendarMonthKey(monthKey: string) {
  const match = MONTH_KEY_PATTERN.exec(monthKey)
  if (!match) throw new Error('Invalid calendar month')

  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
  }
}

function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateKeyToSeoulIso(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day) - SEOUL_OFFSET_MS).toISOString()
}

/**
 * 일요일/월요일 시작 월간 그리드를 모두 포함하는 canonical 조회 범위입니다.
 * endIso는 캘린더와 동일하게 exclusive입니다.
 */
function addUtcDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * 24 * 60 * 60 * 1000)
}

export function getCalendarMonthRange(monthKey: CalendarMonthKey): CalendarMonthRange {
  const { year, monthIndex } = parseCalendarMonthKey(monthKey)
  const monthStart = new Date(Date.UTC(year, monthIndex, 1))
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0))

  const startDay = monthStart.getUTCDay()
  const endDay = monthEnd.getUTCDay()
  const sundayStart = addUtcDays(monthStart, -startDay)
  const mondayStart = addUtcDays(monthStart, -((startDay + 6) % 7))
  const sundayEnd = addUtcDays(monthEnd, 6 - endDay)
  const mondayEnd = addUtcDays(monthEnd, (7 - endDay) % 7)

  const start = sundayStart < mondayStart ? sundayStart : mondayStart
  const endInclusive = sundayEnd > mondayEnd ? sundayEnd : mondayEnd
  const endExclusive = addUtcDays(endInclusive, 1)
  const startDate = utcDateKey(start)
  const endDate = utcDateKey(endInclusive)

  return {
    startDate,
    endDate,
    startIso: dateKeyToSeoulIso(startDate),
    endIso: dateKeyToSeoulIso(utcDateKey(endExclusive)),
  }
}

export function calendarSummaryToActivity(event: CalendarEventSummary): Activity {
  return {
    id: event.instanceId,
    user_id: '',
    title: event.title,
    start_time: event.start,
    end_time: event.end,
    is_all_day: event.allDay,
    memo: null,
    type: event.source === 'agenda' ? 'TASK' : 'EVENT',
    hex_color: event.color,
    template_id: null,
    deleted_at: null,
    categories: event.categories.map(category => ({
      id: category.id,
      user_id: '',
      name: category.name,
      hex_color: category.hexColor,
      is_default: false,
    })),
    attachments: [],
    reminders: [],
    recurrence_rule: event.recurrenceRule,
    parent_activity_id: event.parentActivityId,
    original_start_time: event.originalStartTime,
    google_event_id: event.source === 'academic' ? 'ACADEMIC_SHEET' : null,
    calendar_source: event.source,
    calendar_entity_id: event.entityId,
    calendar_is_summary: true,
  }
}

export function isCalendarEventOnDate(event: CalendarEventSummary, date: Date) {
  const start = new Date(event.start)
  const end = new Date(event.end)
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  return start < dayEnd && end > dayStart
}

export function getAdjacentMonthKey(monthKey: CalendarMonthKey, delta: -1 | 1): CalendarMonthKey {
  const { year, monthIndex } = parseCalendarMonthKey(monthKey)
  const date = new Date(year, monthIndex + delta, 1)
  return toCalendarMonthKey(date)
}

export function formatCalendarDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

export function sortCalendarEventSummaries(events: CalendarEventSummary[]) {
  return [...events].sort((a, b) => {
    const start = a.start.localeCompare(b.start)
    if (start) return start
    const allDay = Number(b.allDay) - Number(a.allDay)
    if (allDay) return allDay
    const durationA = new Date(a.end).getTime() - new Date(a.start).getTime()
    const durationB = new Date(b.end).getTime() - new Date(b.start).getTime()
    if (durationA !== durationB) return durationB - durationA
    return a.title.localeCompare(b.title, 'ko') || a.instanceId.localeCompare(b.instanceId)
  })
}
