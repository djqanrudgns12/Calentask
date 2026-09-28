export const PERIODS = [1, 7, 30, 90] as const;
export type Period = typeof PERIODS[number];
/** swr: 오래된 캐시라도 즉시 응답하고 뒤에서 재집계. fresh: 신선한 집계까지 대기. force: 캐시 무시하고 재집계. */
export const FETCH_MODES = ['swr', 'fresh', 'force'] as const;
export type FetchMode = typeof FETCH_MODES[number];
export type StatsInput = { days: Period; version: string; mode: FetchMode };
/** 이 시간 안의 집계는 최신으로 본다. 자동 갱신 주기와 같다. */
export const FRESH_MS = 5 * 60_000;
/** swr 조회에서 즉시 보여 줄 수 있는 가장 오래된 집계. SQL이 날짜별로 달라 실제로는 당일 집계만 해당한다. */
export const STALE_MAX_MS = 6 * 3600_000;
/** 도구·버전·기능·오류 통합 집계의 최대 행 수. 이 값에 닿으면 잘린 결과로 보고 실패 처리한다. */
export const BREAKDOWN_LIMIT = 1000;
export const TOOL_NAMES: Record<string, string> = {
  tidy_task: '할 일', tiny_note: '작은 메모', toolkit: '도구 모음', roster: '학급 명렬표',
  noticeboard: '알림판', picker: '뽑기', tournament: '토너먼트', focus_bell: '집중 신호',
  dice: '주사위', clock: '시계', thermometer: '소음 온도계', vote: '투표', seating: '자리 배치',
  scoreboard: '점수판', meal: '급식', meal_search: '급식 검색', meal_settings: '급식 설정',
  settings: '환경설정', timer_digital: '디지털 타이머', timer_analog: '아날로그 타이머',
  timer_hourglass: '모래시계', timer_stopwatch: '스톱워치', other: '기타·이전 버전 미분류',
};
export const ACTIONS = [
  ['todo_created', '할 일 생성', '개', false, true], ['todo_completed', '할 일 완료', '개', false, true],
  ['dice_rolled', '주사위 굴리기', '회', true, false], ['timer_started', '타이머 시작', '회', true, false],
  ['timer_completed', '타이머 완료', '회', true, false], ['vote_created', '투표 생성', '회', true, false],
  ['vote_counting_started', '개표 시작', '회', true, false], ['vote_completed', '투표 완료', '회', true, false],
  ['note_archived', '메모 보관', '회', false, false], ['meal_navigated', '급식 날짜 탐색', '회', false, false],
  ['update_install_started', '업데이트 설치 시작', '회', false, false],
  ['update_install_failed', '업데이트 설치 실패', '회', false, false],
] as const;
export type Daily = { date: string; active: number | null; firstSeen: number | null; minutes: number | null; events: number };
export type Breakdown = { key: string; installs: number; minutes: number };
export type StatsData = {
  days: Period; version: string; from: string; through: string;
  /** queriedAt: 서버 응답 시각. calculatedAt: 가장 오래된 부분 집계의 계산 시각. ageMs: 응답 시점의 집계 경과 시간. */
  queriedAt: string; calculatedAt: string; ageMs: number;
  /** cached: 일부라도 저장된 집계. stale: 최신 기준(5분)을 넘긴 집계. revalidating: 서버가 뒤에서 재집계 중. */
  cached: boolean; stale: boolean; revalidating: boolean;
  summary: { active: number; previousActive: number; firstSeen: number; minutes: number; sessions: number; errors: number; events: number; supportedInstalls: number; lastEvent: string | null };
  daily: Daily[]; tools: Breakdown[]; versions: Breakdown[];
  actions: { event: string; count: number; items: number; installs: number }[];
  errors: { code: string; count: number; installs: number }[];
};
export type SnapshotMeta = Pick<StatsData, 'queriedAt' | 'calculatedAt' | 'ageMs' | 'cached' | 'stale' | 'revalidating'>;

export function parseInput(value: unknown): StatsInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('조회 조건을 확인해 주세요.');
  const v = value as Record<string, unknown>;
  const days = v.days ?? 30;
  const version = v.version ?? 'all';
  const mode = v.mode ?? 'fresh';
  if (Object.keys(v).some(k => k !== 'days' && k !== 'version' && k !== 'mode') ||
    !PERIODS.includes(days as Period) || typeof version !== 'string' ||
    (version !== 'all' && !/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-[a-zA-Z0-9.-]{1,20})?$/.test(version)) ||
    !FETCH_MODES.includes(mode as FetchMode)) throw new Error('지원하지 않는 조회 조건입니다.');
  return { days: days as Period, version, mode: mode as FetchMode };
}
export function isAllowedUser(id: string, list: string | undefined) {
  return !!list?.split(',').map(s => s.trim()).filter(Boolean).includes(id);
}
export function periodBounds(days: Period, now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  const midnight = new Date(`${kst}T00:00:00+09:00`).getTime();
  const start = midnight - (days - 1) * 86400_000;
  return { from: new Date(start).toISOString(), through: kst,
    previousFrom: new Date(start - days * 86400_000).toISOString(),
    until: new Date(midnight + 86400_000).toISOString() };
}
export function fillDays(from: string, days: Period, rows: unknown[][]): Daily[] {
  const map = new Map(rows.map(row => [String(row[0]), row]));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(new Date(from).getTime() + i * 86400_000 + 9 * 3600_000).toISOString().slice(0, 10);
    const r = map.get(date);
    return { date, active: r ? numeric(r[1]) : null, firstSeen: r ? numeric(r[2]) : null,
      minutes: r ? numeric(r[3]) : null, events: r ? numeric(r[4]) : 0 };
  });
}
export function numeric(value: unknown): number {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n) || n < 0) throw new Error('집계 응답 형식이 올바르지 않습니다.');
  return n;
}

const byInstalls = (a: Breakdown, b: Breakdown) => b.installs - a.installs || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
/**
 * 통합 집계 행 [event, key, count, installs, items]을 패널별 목록으로 나눈다.
 * 각 목록의 정렬·개수 상한은 분리 쿼리 시절(버전·도구 100, 기능 30, 오류 50)과 같다.
 */
export function splitBreakdown(rows: unknown[][]) {
  if (rows.length >= BREAKDOWN_LIMIT) throw new Error('통합 집계가 행 상한에 닿았습니다.');
  const tools: Breakdown[] = [], versions: Breakdown[] = [];
  const actions: StatsData['actions'] = [], errors: StatsData['errors'] = [];
  for (const row of rows) {
    const event = String(row[0]), key = String(row[1]);
    const count = numeric(row[2]), installs = numeric(row[3]);
    if (event === 'active_minute') versions.push({ key, installs, minutes: count });
    else if (event === 'tool_active_minute') tools.push({ key, installs, minutes: count });
    else if (event === 'app_error') errors.push({ code: key, count, installs });
    else actions.push({ event, count, items: numeric(row[4]), installs });
  }
  return {
    versions: versions.sort(byInstalls).slice(0, 100), tools: tools.sort(byInstalls).slice(0, 100),
    actions: actions.sort((a, b) => (a.event < b.event ? -1 : 1)).slice(0, 30),
    errors: errors.sort((a, b) => b.count - a.count || (a.code < b.code ? -1 : 1)).slice(0, 50),
  };
}

export function assembleStats(input: Pick<StatsInput, 'days' | 'version'>, bounds: ReturnType<typeof periodBounds>,
  results: { summary: unknown[][]; daily: unknown[][]; breakdown: unknown[][] }, meta: SnapshotMeta): StatsData {
  const r = results.summary[0];
  if (!r || r.length !== 9) throw new Error('종합 집계 응답 형식이 올바르지 않습니다.');
  const events = numeric(r[6]);
  return {
    days: input.days, version: input.version, from: bounds.from, through: bounds.through, ...meta,
    summary: { active: numeric(r[0]), previousActive: numeric(r[1]), firstSeen: numeric(r[2]), minutes: numeric(r[3]),
      sessions: numeric(r[4]), errors: numeric(r[5]), events, supportedInstalls: numeric(r[7]), lastEvent: events > 0 ? String(r[8]) : null },
    daily: fillDays(bounds.from, input.days, results.daily),
    ...splitBreakdown(results.breakdown),
  };
}
