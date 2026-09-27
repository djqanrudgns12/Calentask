export class StatsError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
export type QueryResult = { results: unknown[][]; is_cached?: boolean; last_refresh?: string };
export async function runQuery(config: { key: string; project: string }, sql: string, force: boolean, signal: AbortSignal, request: typeof fetch = fetch): Promise<QueryResult> {
  const response = await request(`https://us.posthog.com/api/projects/${config.project}/query/`, {
    method: 'POST', cache: 'no-store', signal,
    headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
    // 날짜는 검증된 SQL에서 한 번만 제한한다. 기본 7일 필터가 비교 기간을 자르지 않게 all을 지정한다.
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql, filters: { dateRange: { date_from: 'all' }, filterTestAccounts: true } }, refresh: force ? 'force_blocking' : 'blocking', name: 'Calentask Tidy Task 통계' }),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new StatsError('POSTHOG_ACCESS', 'PostHog 키와 프로젝트 접근 권한, Query의 Read 권한을 확인해 주세요.');
    if (response.status === 429) throw new StatsError('RATE_LIMIT', '조회 요청이 많습니다. 잠시 후 다시 갱신해 주세요.', 429);
    throw new StatsError('POSTHOG_ERROR', 'PostHog에서 통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  const result = await response.json();
  // 비동기 실행 중인 응답·잘린 결과·SQL 오류를 빈 통계로 처리하지 않는다.
  if (result.error || result.query_status?.error || result.query_status?.complete === false || result.hasMore === true ||
      !Array.isArray(result.results) || !result.results.every((r: unknown) => Array.isArray(r))) {
    throw new StatsError('INCOMPLETE', '집계가 아직 완료되지 않았거나 결과가 불완전합니다. 잠시 후 다시 갱신해 주세요.');
  }
  return result;
}
