import { getCalendarMonthSnapshot } from '@/app/actions/calendarMonth'
import { getAllTemplatesSummary, getOverviewDashboardSnapshot, getInsightsData, getExecutionAnalytics } from '@/app/actions/insights'
import { isViewDataRequest } from '@/types/viewData'

export const maxDuration = 60
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }

export async function POST(request: Request) {
  const started = performance.now()
  let parameters: unknown
  try { parameters = await request.json() } catch {
    return Response.json({ error: '조회 조건이 올바르지 않습니다.' }, { status: 400, headers })
  }
  if (!isViewDataRequest(parameters)) return Response.json({ error: '조회 조건이 올바르지 않습니다.' }, { status: 400, headers })
  try {
    // 각 조회 함수가 getUser()로 확인한 계정의 데이터만 조회한다.
    let data: unknown
    switch (parameters.kind) {
      case 'month': data = await getCalendarMonthSnapshot(parameters.monthKey); break
      case 'templates': data = await getAllTemplatesSummary(parameters.startDate, parameters.endDate, parameters.prevStartDate, parameters.prevEndDate, parameters.trendType); break
      case 'overview': data = await getOverviewDashboardSnapshot(parameters.startDate, parameters.endDate, parameters.prevStartDate, parameters.prevEndDate, parameters.periodType, parameters.yearStart, parameters.yearEnd); break
      case 'time': data = await getInsightsData(parameters.startDate, parameters.endDate); break
      case 'execution': data = await getExecutionAnalytics(parameters.startDate, parameters.endDate); break
    }
    return Response.json(data, { headers: { ...headers, 'Server-Timing': `view;dur=${(performance.now() - started).toFixed(1)}` } })
  } catch (error) {
    const unauthorized = error instanceof Error && (error.message === 'Not authenticated' || error.message.includes('로그인이 필요'))
    return Response.json({ error: unauthorized ? '다시 로그인해 주세요.' : '화면 데이터를 불러오지 못했습니다.' }, { status: unauthorized ? 401 : 500, headers })
  }
}
