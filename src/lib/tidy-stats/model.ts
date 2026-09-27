export const PERIODS = [1, 7, 30, 90] as const;
export type Period = typeof PERIODS[number];
export type StatsInput = { days: Period; version: string; refresh: boolean };
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
  queriedAt: string; calculatedAt: string; cached: boolean;
  summary: { active: number; previousActive: number; firstSeen: number; minutes: number; sessions: number; errors: number; events: number; supportedInstalls: number; lastEvent: string | null };
  daily: Daily[]; tools: Breakdown[]; versions: Breakdown[];
  actions: { event: string; count: number; items: number; installs: number }[];
  errors: { code: string; count: number; installs: number }[];
};
export function parseInput(value: unknown): StatsInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('조회 조건을 확인해 주세요.');
  const v = value as Record<string, unknown>;
  const days = v.days ?? 30;
  const version = v.version ?? 'all';
  if (!PERIODS.includes(days as Period) || typeof version !== 'string' ||
    (version !== 'all' && !/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-[a-zA-Z0-9.-]{1,20})?$/.test(version)) ||
    (v.refresh !== undefined && typeof v.refresh !== 'boolean')) throw new Error('지원하지 않는 조회 조건입니다.');
  return { days: days as Period, version, refresh: v.refresh === true };
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
