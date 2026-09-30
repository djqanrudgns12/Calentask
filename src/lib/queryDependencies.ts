import { QueryClient, matchQuery, type QueryKey, type InvalidateQueryFilters, type InvalidateOptions } from '@tanstack/react-query'

const ACTIVITY_DEPENDENTS = ['overviewDashboard', 'insights', 'subjectDetails', 'templatesSummary', 'templateFullAnalytics', 'templateLinkedActivities', 'categoryMonthlyTrend', 'annualGoalProgress', 'overviewKPI']

/** 원본 데이터의 변경이 파생 집계 캐시에도 전달되도록 방향을 한쪽으로 제한한다. */
export function dependentQueryRoots(root: unknown): readonly string[] {
  switch (root) {
    case 'activities': case 'calendar-month': return ACTIVITY_DEPENDENTS
    case 'categories': return [...ACTIVITY_DEPENDENTS, 'activityTemplates']
    case 'activityTemplates': return ['overviewDashboard', 'templatesSummary', 'templateFullAnalytics']
    case 'templateLinkedActivities': return ['overviewDashboard', 'templatesSummary', 'templateFullAnalytics']
    case 'templatesSummary': return ['overviewDashboard', 'templateFullAnalytics']
    case 'executionAnalytics': return ['overviewDashboard', 'overviewKPI']
    default: return []
  }
}

export function invalidateQueryRoots(queryClient: QueryClient, roots: readonly string[]) {
  const affected = new Set(roots)
  for (const root of affected) dependentQueryRoots(root).forEach(dependent => affected.add(dependent))
  return queryClient.invalidateQueries({ predicate: query => affected.has(String(query.queryKey[0])) })
}

/** 원본 캐시가 없거나 이미 stale이어도 변경 요청마다 파생 캐시를 함께 갱신한다. */
export class AppQueryClient extends QueryClient {
  override invalidateQueries<TTaggedQueryKey extends QueryKey = QueryKey>(
    filters?: InvalidateQueryFilters<TTaggedQueryKey>, options?: InvalidateOptions,
  ): Promise<void> {
    const roots = dependentQueryRoots(filters?.queryKey?.[0])
    if (!roots.length) return super.invalidateQueries(filters, options)
    return super.invalidateQueries({
      refetchType: filters?.refetchType,
      predicate: query => matchQuery(filters ?? {}, query) || roots.includes(String(query.queryKey[0])),
    }, options)
  }
}
