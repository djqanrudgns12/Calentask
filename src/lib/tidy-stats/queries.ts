import { ACTIONS, BREAKDOWN_LIMIT, periodBounds, type StatsInput } from './model';

// 사용자 입력 SQL은 받지 않는다. 입력은 parseInput에서 검증한 기간·버전만 허용한다.
export function buildQueries(input: Pick<StatsInput, 'days' | 'version'>, now = new Date()) {
  const bounds = periodBounds(input.days, now);
  const date = (s: string) => `toDateTime('${s.slice(0, 19).replace('T', ' ')}', 'UTC')`;
  // 현재 PostHog에서는 DateTime64 컬럼과 now()를 직접 비교하면 Decimal overflow가 난다.
  // 현재 시각만 DateTime으로 명시해 기간 인덱스와 초 단위의 기존 경계를 유지한다.
  const queryNow = 'toDateTime(now())';
  // PostHog 프로젝트의 최신 내부/테스트 계정 필터를 서버에서 적용한다.
  const base = `properties.environment = 'production' AND {filters} AND timestamp < ${date(bounds.until)} AND timestamp <= ${queryNow}`;
  const version = input.version === 'all' ? '' : ` AND properties.app_version = '${input.version}'`;
  const current = `timestamp >= ${date(bounds.from)}`;
  const where = `${base} AND ${current}${version}`;
  const previous = `timestamp < ${date(bounds.from)} AND timestamp <= ${queryNow} - INTERVAL ${input.days} DAY`;
  const actions = ACTIONS.map(a => `'${a[0]}'`).join(', ');
  const queries = {
    // 이전 기간 값은 active_minute만 쓰므로 이전 기간에서는 그 이벤트만 읽는다(현재 기간은 전체 이벤트).
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
      FROM events WHERE ${base} AND timestamp >= ${date(bounds.previousFrom)}${version} AND (${current} OR event = 'active_minute')`,
    daily: `SELECT toString(toDate(toTimeZone(timestamp, 'Asia/Seoul'))),
      uniqExactIf(distinct_id, event = 'active_minute'),
      uniqExactIf(distinct_id, event = 'installation_first_seen'), countIf(event = 'active_minute'), count()
      FROM events WHERE ${where} GROUP BY 1 ORDER BY 1 LIMIT 90`,
    // 도구·버전·기능·오류를 한 번에 읽는다. 행: [event, key, 횟수, 고유 설치, properties.count 합계].
    // 버전 분포(active_minute)는 선택 목록 유지를 위해 버전 필터 없이 전체 버전, 나머지는 선택 버전 기준이다.
    breakdown: `SELECT event,
      if(event = 'active_minute', coalesce(nullIf(toString(properties.app_version), ''), '미확인'),
        if(event = 'tool_active_minute', coalesce(nullIf(toString(properties.window_kind), ''), 'other'),
          if(event = 'app_error', coalesce(nullIf(toString(properties.error_code), ''), '분류 없음'), ''))),
      count(), uniqExact(distinct_id), sumIf(coalesce(toFloat(properties.count), 0), event IN (${actions}))
      FROM events WHERE ${base} AND ${current}
        AND (event = 'active_minute' OR (event IN ('tool_active_minute', 'app_error', ${actions})${version}))
      GROUP BY 1, 2 LIMIT ${BREAKDOWN_LIMIT}`,
  };
  return { bounds, queries };
}
