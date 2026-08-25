'use server'

import { createClient } from '@/lib/supabase/server'
import { expandActivities } from '@/lib/expandActivities'
import { getCalendarMonthRange, sortCalendarEventSummaries } from '@/lib/calendarMonth'
import { getSpecialDaysForYear } from '@/lib/specialDays.server'
import { calculateOverlays, type Anniversary } from '@/utils/anniversaryCalculator'
import { updateActivity, updateRecurringActivity, type Activity, type Category } from '@/app/actions/calendar'
import { updateAgendaTask } from '@/app/actions/agenda'
import type {
  CalendarEventSource,
  CalendarEventSummary,
  CalendarMonthKey,
  CalendarMonthSnapshot,
  MoveCalendarEventCommand,
} from '@/types/calendarMonth'

const ACTIVITY_SUMMARY_SELECT = `
  id, user_id, title, start_time, end_time, is_all_day, type, hex_color,
  template_id, deleted_at, recurrence_rule, parent_activity_id,
  original_start_time, google_event_id,
  activity_category_map(categories(id, name, hex_color, is_default, user_id))
`

const SEOUL_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

type ActivitySummaryRow = Activity & {
  activity_category_map?: Array<{ categories: Category | null }>
}

type AgendaSummaryRow = {
  id: string
  title: string
  deadline: string
  categories: Pick<Category, 'id' | 'name' | 'hex_color'> | Array<Pick<Category, 'id' | 'name' | 'hex_color'>> | null
}

type AcademicSummaryRow = {
  id: string
  event_date: string
  title: string
  academic_sources?: {
    categories?: Pick<Category, 'id' | 'name' | 'hex_color'> | null
  } | null
}

function dateKeyInSeoul(value: string | Date) {
  const parts = SEOUL_DATE_FORMATTER.formatToParts(typeof value === 'string' ? new Date(value) : value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function addDateKeyDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  return date.toISOString().slice(0, 10)
}

function toActivity(row: ActivitySummaryRow): Activity {
  return {
    ...row,
    memo: null,
    categories: (row.activity_category_map ?? [])
      .map(mapping => mapping.categories)
      .filter((category): category is Category => Boolean(category)),
    attachments: [],
    reminders: [],
  }
}

function normalizeActivityDates(activity: Activity) {
  if (!activity.is_all_day) return { start: activity.start_time, end: activity.end_time }

  const start = dateKeyInSeoul(activity.start_time)
  const rawEnd = new Date(activity.end_time)
  const seoulTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(rawEnd)
  const endDateKey = dateKeyInSeoul(rawEnd)
  const end = seoulTime === '00:00:00' && endDateKey > start ? endDateKey : addDateKeyDays(endDateKey, 1)
  return { start, end: end > start ? end : addDateKeyDays(start, 1) }
}

function categorySummary(categories: Category[]) {
  return categories.map(category => ({
    id: category.id,
    name: category.name,
    hexColor: category.hex_color,
  }))
}

function activityEntityId(activity: Activity) {
  if (activity.parent_activity_id) return activity.parent_activity_id
  if (activity.recurrence_rule && activity.id.includes('_')) return activity.id.split('_')[0]
  return activity.id
}

function activityToSummary(activity: Activity): CalendarEventSummary {
  const dates = normalizeActivityDates(activity)
  const source: CalendarEventSource = activity.google_event_id === 'ACADEMIC_SHEET' ? 'academic' : 'activity'
  const categories = categorySummary(activity.categories ?? [])

  return {
    instanceId: activity.id,
    entityId: source === 'academic' ? activity.id.replace(/^academic:/, '') : activityEntityId(activity),
    source,
    title: activity.title,
    start: dates.start,
    end: dates.end,
    allDay: activity.is_all_day,
    color: categories[0]?.hexColor ?? activity.hex_color ?? (source === 'academic' ? '#0EA5E9' : '#4F46E5'),
    categories,
    editable: source === 'activity',
    recurrenceRule: activity.recurrence_rule,
    parentActivityId: activity.parent_activity_id,
    originalStartTime: activity.original_start_time,
  }
}

export async function getCalendarMonthSnapshot(monthKey: CalendarMonthKey): Promise<CalendarMonthSnapshot> {
  const range = getCalendarMonthRange(monthKey)
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('로그인이 필요합니다.')
  const userId = userData.user.id

  const overlapQuery = supabase
    .from('activities')
    .select(ACTIVITY_SUMMARY_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .lt('start_time', range.endIso)
    .gt('end_time', range.startIso)

  const recurringMasterQuery = supabase
    .from('activities')
    .select(ACTIVITY_SUMMARY_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('recurrence_rule', 'is', null)
    .lt('start_time', range.endIso)

  const exceptionOccurrenceQuery = supabase
    .from('activities')
    .select(ACTIVITY_SUMMARY_SELECT)
    .eq('user_id', userId)
    .not('parent_activity_id', 'is', null)
    .gte('original_start_time', range.startIso)
    .lt('original_start_time', range.endIso)

  const movedExceptionQuery = supabase
    .from('activities')
    .select(ACTIVITY_SUMMARY_SELECT)
    .eq('user_id', userId)
    .not('parent_activity_id', 'is', null)
    .lt('start_time', range.endIso)
    .gt('end_time', range.startIso)

  const agendaQuery = supabase
    .from('agenda_tasks')
    .select('id, title, memo, deadline, category_id, is_important, status, categories:category_id(id, name, hex_color)')
    .eq('user_id', userId)
    .eq('is_calendar_registered', true)
    .is('deleted_at', null)
    .neq('status', 'trash')
    .gte('deadline', range.startIso)
    .lt('deadline', range.endIso)

  const academicQuery = supabase
    .from('academic_events')
    .select('id, event_date, title, academic_sources!inner(category_id, categories:category_id(id, name, hex_color, is_default, user_id))')
    .eq('user_id', userId)
    .gte('event_date', range.startDate)
    .lte('event_date', range.endDate)
    .not('academic_sources.category_id', 'is', null)

  const anniversaryQuery = supabase
    .from('anniversaries')
    .select('id, user_id, preset_type, title, base_date, is_lunar, calculation_rule')
    .eq('user_id', userId)
    .is('deleted_at', null)

  const years = Array.from(new Set([Number(range.startDate.slice(0, 4)), Number(range.endDate.slice(0, 4))]))
  const [overlap, masters, occurrenceExceptions, movedExceptions, agenda, academic, anniversaries, specialDaysByYear] = await Promise.all([
    overlapQuery,
    recurringMasterQuery,
    exceptionOccurrenceQuery,
    movedExceptionQuery,
    agendaQuery,
    academicQuery,
    anniversaryQuery,
    Promise.all(years.map(getSpecialDaysForYear)),
  ])

  const databaseErrors = [overlap.error, masters.error, occurrenceExceptions.error, movedExceptions.error, agenda.error, academic.error, anniversaries.error].filter(Boolean)
  if (databaseErrors.length) throw new Error(databaseErrors[0]?.message ?? '월간 캘린더를 불러오지 못했습니다.')

  const activityRows = new Map<string, ActivitySummaryRow>()
  ;[overlap.data, masters.data, occurrenceExceptions.data, movedExceptions.data].forEach(rows => {
    ;((rows ?? []) as unknown as ActivitySummaryRow[]).forEach(row => activityRows.set(row.id, row))
  })

  const activities = expandActivities(
    Array.from(activityRows.values()).map(toActivity),
    range.startIso,
    range.endIso,
  )
    .filter(activity => new Date(activity.start_time) < new Date(range.endIso) && new Date(activity.end_time) > new Date(range.startIso))
    .map(activityToSummary)

  const agendaEvents: CalendarEventSummary[] = ((agenda.data ?? []) as unknown as AgendaSummaryRow[]).map(task => {
    const start = new Date(task.deadline)
    const category = Array.isArray(task.categories) ? task.categories[0] : task.categories
    const categories = category
      ? [{ id: category.id, name: category.name, hexColor: category.hex_color }]
      : [{ id: 'agenda-category', name: '아젠다', hexColor: '#3B82F6' }]

    return {
      instanceId: `agenda:${task.id}`,
      entityId: task.id,
      source: 'agenda',
      title: task.title,
      start: start.toISOString(),
      end: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
      allDay: false,
      color: categories[0].hexColor,
      categories,
      editable: true,
      recurrenceRule: null,
      parentActivityId: null,
      originalStartTime: null,
    }
  })

  const academicEvents: CalendarEventSummary[] = ((academic.data ?? []) as unknown as AcademicSummaryRow[]).map(event => {
    const category = event.academic_sources?.categories
    const categories = category ? [{ id: category.id, name: category.name, hexColor: category.hex_color }] : []
    return {
      instanceId: `academic:${event.id}`,
      entityId: event.id,
      source: 'academic',
      title: event.title,
      start: event.event_date,
      end: addDateKeyDays(event.event_date, 1),
      allDay: true,
      color: categories[0]?.hexColor ?? '#0EA5E9',
      categories,
      editable: false,
      recurrenceRule: null,
      parentActivityId: null,
      originalStartTime: null,
    }
  })

  const rangeStart = new Date(`${range.startDate}T00:00:00`)
  const rangeEnd = new Date(`${range.endDate}T23:59:59`)
  const anniversaryEvents: CalendarEventSummary[] = (anniversaries.data as Anniversary[] ?? []).flatMap(anniversary =>
    calculateOverlays(anniversary, rangeStart, rangeEnd).map(overlay => {
      const start = dateKeyInSeoul(overlay.start_time)
      return {
        instanceId: `anniversary:${overlay.id}`,
        entityId: anniversary.id,
        source: 'anniversary' as const,
        title: overlay.title,
        start,
        end: addDateKeyDays(start, 1),
        allDay: true,
        color: overlay.hex_color,
        categories: overlay.categories.map(category => ({ ...category, hexColor: category.hex_color })),
        editable: false,
        recurrenceRule: null,
        parentActivityId: null,
        originalStartTime: null,
      }
    }),
  )

  const specialDays = Object.assign({}, ...specialDaysByYear)
  const events = sortCalendarEventSummaries([...activities, ...agendaEvents, ...academicEvents, ...anniversaryEvents])

  return { monthKey, range, events, specialDays }
}

export async function getCalendarEventDetail(
  source: CalendarEventSource,
  entityId: string,
  instanceStart?: string,
): Promise<Activity | null> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('로그인이 필요합니다.')

  if (source === 'activity') {
    const { data, error } = await supabase
      .from('activities')
      .select(`*, activity_category_map(categories(*))`)
      .eq('id', entityId)
      .eq('user_id', userData.user.id)
      .single()
    if (error || !data) return null

    const activity = {
      ...data,
      categories: ((data.activity_category_map ?? []) as Array<{ categories: Category | null }>)
        .map(mapping => mapping.categories)
        .filter((category): category is Category => Boolean(category)),
    } as Activity
    if (instanceStart && activity.recurrence_rule) {
      const duration = new Date(activity.end_time).getTime() - new Date(activity.start_time).getTime()
      activity.start_time = instanceStart
      activity.end_time = new Date(new Date(instanceStart).getTime() + duration).toISOString()
      activity.original_start_time = instanceStart
    }
    activity.calendar_source = source
    activity.calendar_entity_id = entityId
    return activity
  }

  if (source === 'agenda') {
    const { data, error } = await supabase
      .from('agenda_tasks')
      .select('*')
      .eq('id', entityId)
      .eq('user_id', userData.user.id)
      .single()
    if (error || !data || !data.deadline) return null
    const start = new Date(data.deadline)
    return {
      id: `agenda:${data.id}`,
      user_id: data.user_id,
      title: data.title,
      start_time: start.toISOString(),
      end_time: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
      is_all_day: false,
      memo: data.memo,
      type: 'TASK',
      hex_color: '#3B82F6',
      template_id: null,
      deleted_at: data.deleted_at,
      categories: [],
      attachments: [],
      reminders: [],
      recurrence_rule: null,
      parent_activity_id: null,
      original_start_time: null,
      calendar_source: source,
      calendar_entity_id: entityId,
    }
  }

  return null
}

export async function moveCalendarEvent(command: MoveCalendarEventCommand) {
  const start = command.allDay ? new Date(`${command.start.slice(0, 10)}T00:00:00+09:00`).toISOString() : command.start
  const end = command.allDay ? new Date(`${command.end.slice(0, 10)}T00:00:00+09:00`).toISOString() : command.end
  if (command.source === 'agenda') {
    await updateAgendaTask(command.entityId, { deadline: start })
    return
  }

  // 시각만 옮기는 조작이다. categoryIds를 넘기지 않으면 기존 카테고리가 그대로 유지되고,
  // 그룹 라우팅도 근거를 잃지 않아 구글 캘린더가 바뀌지 않는다.
  const payload = { start_time: start, end_time: end, is_all_day: command.allDay }
  const recurring = Boolean(command.recurrenceRule || command.parentActivityId || command.originalStartTime)
  if (!recurring) {
    await updateActivity(command.entityId, payload, command.categoryIds)
    return
  }

  const scope = command.scope ?? 'THIS_EVENT'
  if (command.parentActivityId && scope === 'THIS_EVENT' && !command.instanceId.includes('_')) {
    await updateActivity(command.instanceId, payload, command.categoryIds)
    return
  }

  if (!command.originalStartTime) throw new Error('반복 일정의 원래 회차를 확인할 수 없습니다.')
  await updateRecurringActivity(
    command.entityId,
    payload,
    command.categoryIds,
    scope,
    command.originalStartTime,
  )
}
