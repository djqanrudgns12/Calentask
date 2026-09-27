import { ACTIONS, periodBounds, type StatsInput } from './model';

// 사용자 입력 SQL은 받지 않는다. 입력은 parseInput에서 검증한 기간·버전만 허용한다.
export function buildQueries(input: StatsInput, now = new Date()) {
  const bounds = periodBounds(input.days, now);
  const date = (s: string) => `toDateTime('${s.slice(0, 19).replace('T', ' ')}', 'UTC')`;
  // PostHog 프로젝트의 최신 내부/테스트 계정 필터를 서버에서 적용한다.
  const base = `properties.environment = 'production' AND {filters} AND timestamp < ${date(bounds.until)} AND timestamp <= now()`;
  const version = input.version === 'all' ? '' : ` AND properties.app_version = '${input.version}'`;
  const current = `timestamp >= ${date(bounds.from)}`;
  const where = `${base} AND ${current}${version}`;
  const previous = `timestamp < ${date(bounds.from)} AND timestamp <= now() - INTERVAL ${input.days} DAY`;
  const queries = {
    summary: `SELECT
      uniqExactIf(distinct_id, event = 'active_minute' AND ${current}),
      uniqExactIf(distinct_id, event = 'active_minute' AND ${previous}),
      uniqExactIf(distinct_id, event = 'installation_first_seen' AND ${current}),
      countIf(event = 'active_minute' AND ${current}),
      countIf(event = 'session_started' AND ${current}),
      uniqExactIf(distinct_id, event = 'app_error' AND ${current}),
      countIf(${current}),
      uniqExactIf(distinct_id, event = 'active_minute' AND toFloat(properties.schema_version) >= 2 AND ${current}),
      maxIf(timestamp, ${current})
      FROM events WHERE ${base} AND timestamp >= ${date(bounds.previousFrom)}${version}`,
    daily: `SELECT toString(toDate(toTimeZone(timestamp, 'Asia/Seoul'))),
      uniqExactIf(distinct_id, event = 'active_minute'),
      uniqExactIf(distinct_id, event = 'installation_first_seen'), countIf(event = 'active_minute'), count()
      FROM events WHERE ${where} GROUP BY 1 ORDER BY 1 LIMIT 90`,
    tools: `SELECT coalesce(nullIf(toString(properties.window_kind), ''), 'other'), uniqExact(distinct_id), count()
      FROM events WHERE ${where} AND event = 'tool_active_minute' GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 100`,
    // 전체 버전 선택 목록을 유지한다. 버전 분포는 선택 기간의 모든 버전이다.
    versions: `SELECT coalesce(nullIf(toString(properties.app_version), ''), '미확인'), uniqExact(distinct_id), count()
      FROM events WHERE ${base} AND ${current} AND event = 'active_minute' GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 100`,
    actions: `SELECT event, count(), sum(coalesce(toFloat(properties.count), 0)), uniqExact(distinct_id)
      FROM events WHERE ${where} AND event IN (${ACTIONS.map(a => `'${a[0]}'`).join(',')}) GROUP BY event LIMIT 30`,
    errors: `SELECT coalesce(nullIf(toString(properties.error_code), ''), '분류 없음'), count(), uniqExact(distinct_id)
      FROM events WHERE ${where} AND event = 'app_error' GROUP BY 1 ORDER BY 2 DESC LIMIT 50`,
  };
  return { bounds, queries };
}
