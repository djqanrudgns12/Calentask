export class StatsError extends Error {
  constructor(public code: string, message: string, public status = 502, public retryable = false, public retryAfterMs?: number) { super(message); }
}
export type QueryResult = { results: unknown[][]; is_cached?: boolean; last_refresh?: string };
type Config = { key: string; project: string };
/** force_blocking: 항상 재집계. force_cache: PostHog 캐시만 확인하고 계산하지 않는다(미스면 null). */
export type RefreshMode = 'force_blocking' | 'force_cache';

export async function runQuery(config: Config, sql: string, refresh: 'force_blocking', signal: AbortSignal, request?: typeof fetch): Promise<QueryResult>;
export async function runQuery(config: Config, sql: string, refresh: RefreshMode, signal: AbortSignal, request?: typeof fetch): Promise<QueryResult | null>;
export async function runQuery(config: Config, sql: string, refresh: RefreshMode, signal: AbortSignal, request: typeof fetch = fetch): Promise<QueryResult | null> {
  let response: Response;
  try {
    response = await request(`https://us.posthog.com/api/projects/${config.project}/query/`, {
      method: 'POST', cache: 'no-store', signal,
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
      // 날짜는 검증된 SQL에서 한 번만 제한한다. 기본 7일 필터가 비교 기간을 자르지 않게 all을 지정한다.
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql, filters: { dateRange: { date_from: 'all' }, filterTestAccounts: true } }, refresh, name: 'Calentask Tidy Task 통계' }),
    });
  } catch {
    if (signal.aborted) throw new StatsError('TIMEOUT', '통계 집계 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.', 504);
    // 연결 단절·DNS 같은 일시 오류다. 원본 메시지는 노출하지 않는다.
    throw new StatsError('NETWORK', 'PostHog 연결이 일시적으로 끊겼습니다. 잠시 후 다시 시도해 주세요.', 503, true);
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new StatsError('POSTHOG_ACCESS', 'PostHog 키와 프로젝트 접근 권한, Query의 Read 권한을 확인해 주세요.');
    if (response.status === 429) throw new StatsError('RATE_LIMIT', '조회 요청이 많습니다. 잠시 후 다시 갱신해 주세요.', 429, true, retryAfter(response.headers.get('retry-after')));
    throw new StatsError('POSTHOG_ERROR', 'PostHog에서 통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 502, response.status === 502 || response.status === 503);
  }
  const result = await response.json().catch(() => null);
  if (isComplete(result)) return result;
  // 캐시 확인의 미스·미완료는 계산으로 넘긴다.
  if (refresh === 'force_cache') return null;
  // 비동기 실행 중인 응답·잘린 결과·SQL 오류를 빈 통계로 처리하지 않는다.
  throw new StatsError('INCOMPLETE', '집계가 아직 완료되지 않았거나 결과가 불완전합니다. 잠시 후 다시 갱신해 주세요.');
}

function isComplete(result: unknown): result is QueryResult {
  if (!result || typeof result !== 'object') return false;
  const r = result as { error?: unknown; query_status?: { error?: unknown; complete?: boolean } | null; hasMore?: boolean; results?: unknown };
  return !r.error && !r.query_status?.error && r.query_status?.complete !== false && r.hasMore !== true &&
    Array.isArray(r.results) && r.results.every(row => Array.isArray(row));
}

/** Retry-After(초 또는 HTTP 날짜)를 밀리초로 바꾼다. 해석할 수 없으면 undefined. */
export function retryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(ms) && ms >= 0 ? Math.min(ms, 15 * 60_000) : undefined;
}
