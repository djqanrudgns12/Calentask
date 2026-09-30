import type { getCalendarMonthSnapshot } from '@/app/actions/calendarMonth'
import type { getAllTemplatesSummary, getOverviewDashboardSnapshot, getInsightsData, getExecutionAnalytics } from '@/app/actions/insights'
import type { CalendarMonthKey } from '@/types/calendarMonth'

interface PeriodParameters { startDate: string; endDate: string }
interface ComparisonParameters extends PeriodParameters { prevStartDate: string; prevEndDate: string }

export interface ViewDataParameters {
  month: { monthKey: CalendarMonthKey }
  templates: ComparisonParameters & { trendType: 'daily' | 'weekly' | 'monthly' }
  overview: ComparisonParameters & { periodType: string; yearStart: string; yearEnd: string }
  time: PeriodParameters
  execution: PeriodParameters
}
export interface ViewDataResults {
  month: Awaited<ReturnType<typeof getCalendarMonthSnapshot>>
  templates: Awaited<ReturnType<typeof getAllTemplatesSummary>>
  overview: Awaited<ReturnType<typeof getOverviewDashboardSnapshot>>
  time: Awaited<ReturnType<typeof getInsightsData>>
  execution: Awaited<ReturnType<typeof getExecutionAnalytics>>
}
export type ViewDataRequest = { [K in keyof ViewDataParameters]: ViewDataParameters[K] & { kind: K } }[keyof ViewDataParameters]

const validDate = (value: unknown): value is string => typeof value === 'string' && value.length <= 35
  && /^(19|20|21)\d{2}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))
const validRange = (start: unknown, end: unknown) => validDate(start) && validDate(end)
  && Date.parse(start) <= Date.parse(end) && Date.parse(end) - Date.parse(start) <= 102 * 366 * 86400000

export function isViewDataRequest(value: unknown): value is ViewDataRequest {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  if (data.kind === 'month') return typeof data.monthKey === 'string' && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(data.monthKey)
  if (!['templates', 'overview', 'time', 'execution'].includes(String(data.kind))) return false
  if (!validRange(data.startDate, data.endDate)) return false
  if (data.kind === 'time' || data.kind === 'execution') return true
  if (!validRange(data.prevStartDate, data.prevEndDate)) return false
  if (data.kind === 'templates') return ['daily', 'weekly', 'monthly'].includes(String(data.trendType))
  return typeof data.periodType === 'string' && data.periodType.length <= 30
    && validRange(data.yearStart, data.yearEnd)
}
