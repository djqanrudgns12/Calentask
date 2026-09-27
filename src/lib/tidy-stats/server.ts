import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { buildQueries } from './queries';
import { fillDays, isAllowedUser, numeric, type StatsData, type StatsInput } from './model';
import { runQuery, StatsError, type QueryResult } from './transport';
import pLimit from 'p-limit';

export async function requireStatsUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new StatsError('UNAUTHENTICATED', '다시 로그인한 뒤 통계를 열어 주세요.', 401);
  if (!process.env.TIDY_STATS_ALLOWED_USER_IDS?.trim()) throw new StatsError('SETUP_REQUIRED', '통계 열람 계정 설정이 필요합니다. 배포 안내의 TIDY_STATS_ALLOWED_USER_IDS를 등록해 주세요.', 503);
  if (!isAllowedUser(user.id, process.env.TIDY_STATS_ALLOWED_USER_IDS)) throw new StatsError('FORBIDDEN', '이 계정에는 Tidy Task 통계 열람 권한이 없습니다.', 403);
  return user;
}
const cache = new Map<string, { expires: number; data: StatsData }>();
const pending = new Map<string, Promise<StatsData>>();
const queryLimit = pLimit(2);

export async function getStats(input: StatsInput): Promise<StatsData> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const project = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!key || !project || !/^\d+$/.test(project)) throw new StatsError('SETUP_REQUIRED', 'PostHog 연결 설정이 필요합니다. POSTHOG_PERSONAL_API_KEY와 POSTHOG_PROJECT_ID를 등록해 주세요.', 503);
  const { bounds, queries } = buildQueries(input);
  const cacheKey = `${project}:${input.days}:${input.version}:${bounds.through}`;
  const cached = cache.get(cacheKey);
  if (!input.refresh && cached && cached.expires > Date.now()) return { ...cached.data, cached: true, queriedAt: new Date().toISOString() };
  // 강제 갱신은 일반 조회와 다른 요청으로 실행하여 오래된 캐시로 대체되지 않게 한다.
  const pendingKey = `${cacheKey}:${input.refresh}`;
  const existing = pending.get(pendingKey);
  if (existing) return existing;
  const task = (async () => {
    const signal = AbortSignal.timeout(45_000);
    const entries = Object.entries(queries);
    const results: Record<string, QueryResult> = {};
    // 프로젝트 동시 쿼리 제한(3개)보다 작은 2개씩 요청한다.
    for (let i = 0; i < entries.length; i += 2) {
      await Promise.all(entries.slice(i, i + 2).map(async ([name, sql]) => {
        // 메모리 캐시가 만료되면 PostHog 자체 캐시도 재집계하여 자동 갱신의 신선도를 보장한다.
        results[name] = await queryLimit(() => runQuery({ key, project }, sql, true, signal));
      }));
    }
    const r = results.summary.results[0];
    if (!r || r.length !== 9) throw new StatsError('INVALID_RESULT', '통계 응답을 확인하지 못했습니다. 다시 조회해 주세요.');
    const breakdown = (name: string) => results[name].results.map(row => ({ key: String(row[0]), installs: numeric(row[1]), minutes: numeric(row[2]) }));
    const queriedAt = new Date().toISOString();
    const refreshTimes = Object.values(results).map(x => x.last_refresh).filter((x): x is string => !!x && Number.isFinite(Date.parse(x)));
    const data: StatsData = {
      days: input.days, version: input.version, from: bounds.from, through: bounds.through,
      queriedAt, calculatedAt: refreshTimes.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? queriedAt,
      cached: Object.values(results).some(x => x.is_cached === true),
      summary: { active: numeric(r[0]), previousActive: numeric(r[1]), firstSeen: numeric(r[2]), minutes: numeric(r[3]),
        sessions: numeric(r[4]), errors: numeric(r[5]), events: numeric(r[6]), supportedInstalls: numeric(r[7]), lastEvent: numeric(r[6]) > 0 ? String(r[8]) : null },
      daily: fillDays(bounds.from, input.days, results.daily.results), tools: breakdown('tools'), versions: breakdown('versions'),
      actions: results.actions.results.map(row => ({ event: String(row[0]), count: numeric(row[1]), items: numeric(row[2]), installs: numeric(row[3]) })),
      errors: results.errors.results.map(row => ({ code: String(row[0]), count: numeric(row[1]), installs: numeric(row[2]) })),
    };
    if (cache.size >= 32) cache.delete(cache.keys().next().value!);
    const current = cache.get(cacheKey);
    if (!current || Date.parse(current.data.calculatedAt) <= Date.parse(data.calculatedAt)) {
      cache.set(cacheKey, { expires: Date.now() + 5 * 60_000, data });
    }
    return data;
  })();
  pending.set(pendingKey, task);
  try { return await task; } finally { pending.delete(pendingKey); }
}
