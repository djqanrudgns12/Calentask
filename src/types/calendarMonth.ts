export type CalendarMonthKey = `${number}-${string}`

export type CalendarEventSource = 'activity' | 'agenda' | 'anniversary' | 'academic'

export type CalendarCategorySummary = {
  id: string
  name: string
  hexColor: string
}

export type CalendarEventSummary = {
  instanceId: string
  entityId: string
  source: CalendarEventSource
  title: string
  start: string
  end: string
  allDay: boolean
  color: string
  categories: CalendarCategorySummary[]
  editable: boolean
  recurrenceRule: string | null
  parentActivityId: string | null
  originalStartTime: string | null
}

export type SpecialDayType = 'holiday' | 'national' | 'anniversary' | 'traditional'

export type SpecialDay = {
  name: string
  isHoliday: boolean
  type: SpecialDayType
}

export type SpecialDaysMap = Record<string, SpecialDay[]>

export type CalendarMonthRange = {
  startDate: string
  endDate: string
  startIso: string
  endIso: string
}

export type CalendarMonthSnapshot = {
  monthKey: CalendarMonthKey
  range: CalendarMonthRange
  events: CalendarEventSummary[]
  specialDays: SpecialDaysMap
}

export type RecurringMoveScope = 'THIS_EVENT' | 'THIS_AND_FOLLOWING' | 'ALL_EVENTS'

export type MoveCalendarEventCommand = {
  instanceId: string
  entityId: string
  source: 'activity' | 'agenda'
  start: string
  end: string
  allDay: boolean
  /** 지정하면 카테고리를 그 값으로 교체한다. 생략하면 건드리지 않는다(시각만 이동). */
  categoryIds?: string[]
  recurrenceRule: string | null
  parentActivityId: string | null
  originalStartTime: string | null
  scope?: RecurringMoveScope
}
