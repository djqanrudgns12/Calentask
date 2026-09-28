import pLimit from 'p-limit';
import { buildQueries } from './queries';
import { assembleStats, FRESH_MS, STALE_MAX_MS, type FetchMode, type StatsData, type StatsInput } from './model';
import { StatsError, type QueryResult, type RefreshMode } from './transport';

export type Config = { key: string; project: string };
export type Runner = (config: Config, sql: string, refresh: RefreshMode, signal: AbortSignal) => Promise<QueryResult | null>;
/** 백그라운드 작업을 응답 이후까지 유지한다. 라우트에서는 next/server의 after를 넘긴다. */
export type Schedule = (task: Promise<unknown>) => void;
/** 쿼리 하나의 정상 결과. refreshedAt은 PostHog가 실제로 계산한 시각이다. */
type Entry = { result: QueryResult; refreshedAt: number };
type Resolved = { entry: Entry; cached: boolean; revalidating: boolean };

const REQUEST_BUDGET_MS = 45_000;   // Vercel 함수 60초 안에서 응답하도록 요청 전체 제한
const BACKGROUND_BUDGET_MS = 50_000;
const PROBE_TIMEOUT_MS = 8_000;
const MAX_ENTRIES = 64;
const MAX_RETRY_WAIT_MS = 5_000;
const timeout = () => new StatsError('TIMEOUT', '통계 집계 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.', 504);

/**
 * PostHog 집계 실행기. 인스턴스 단위 L1 캐시(SQL별 LRU)와 진행 중 계산을 공유해
 * 같은 SQL은 요청·기간·버전이 달라도 한 번만 계산한다.
 */
export function createStatsEngine({ run, now = Date.now, sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms)), random = Math.random }:
  { run: Runner; now?: () => number; sleep?: (ms: number) => Promise<void>; random?: () => number }) {
  const cache = new Map<string, Entry>();
  const computing = new Map<string, Promise<Entry>>();
  // 계산은 PostHog 팀 동시 쿼리 제한(3)보다 작게 2개. 캐시 확인은 계산하지 않으므로 별도 제한을 둔다.
  const computeLimit = pLimit(2);
  const probeLimit = pLimit(4);

  const age = (entry: Entry) => Math.max(0, now() - entry.refreshedAt);
  const isFresh = (entry: Entry | undefined): entry is Entry => !!entry && age(entry) < FRESH_MS;
  const isUsable = (entry: Entry | undefined): entry is Entry => !!entry && age(entry) <= STALE_MAX_MS;
  const keyOf = (config: Config, sql: string) => `${config.project}\n${sql}`;

  function toEntry(result: QueryResult): Entry {
    const parsed = Date.parse(result.last_refresh ?? '');
    // PostHog 시각이 없거나 서버 시계보다 앞서면 지금 계산된 것으로 본다.
    return { result, refreshedAt: Number.isFinite(parsed) ? Math.min(parsed, now()) : now() };
  }
  function recall(key: string) {
    const entry = cache.get(key);
    if (entry) { cache.delete(key); cache.set(key, entry); }
    return entry;
  }
  /** 더 최근에 계산된 결과만 남긴다(늦게 끝난 오래된 계산이 새 결과를 덮지 않게). */
  function remember(key: string, entry: Entry): Entry {
    const current = cache.get(key);
    const next = current && current.refreshedAt > entry.refreshedAt ? current : entry;
    cache.delete(key); cache.set(key, next);
    while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    return next;
  }

  /** 429·일시 네트워크 오류만 지수 백오프(지터 포함)로 재시도한다. 남은 시간을 넘기면 바로 실패한다. */
  async function withRetry<T>(attempt: () => Promise<T>, deadline: number, retries = 2): Promise<T> {
    for (let i = 0; ; i++) {
      try { return await attempt(); }
      catch (error) {
        if (!(error instanceof StatsError) || !error.retryable || i >= retries) throw error;
        const wait = Math.max(error.retryAfterMs ?? 0, 500 * 2 ** i * (0.5 + random()));
        if (wait > MAX_RETRY_WAIT_MS || now() + wait >= deadline - 1_000) throw error;
        await sleep(wait);
      }
    }
  }

  function compute(config: Config, key: string, sql: string, deadline: number): Promise<Entry> {
    const running = computing.get(key);
    if (running) return running;
    const task = withRetry(() => computeLimit(async () => {
      const remaining = deadline - now();
      if (remaining <= 0) throw timeout();
      const result = await run(config, sql, 'force_blocking', AbortSignal.timeout(remaining));
      if (!result) throw new StatsError('INCOMPLETE', '집계가 아직 완료되지 않았거나 결과가 불완전합니다. 잠시 후 다시 갱신해 주세요.');
      return result;
    }), deadline).then(result => remember(key, toEntry(result)))
      .finally(() => computing.delete(key));
    computing.set(key, task);
    return task;
  }

  /** PostHog 캐시(모든 인스턴스 공유)를 계산 없이 확인한다. 확인 실패는 미스로 보고 계산으로 넘긴다. */
  async function probe(config: Config, key: string, sql: string): Promise<Entry | undefined> {
    try {
      const result = await probeLimit(() => run(config, sql, 'force_cache', AbortSignal.timeout(PROBE_TIMEOUT_MS)));
      return result ? remember(key, toEntry(result)) : undefined;
    } catch (error) {
      // 키·권한 오류는 계산해도 같으므로 바로 알린다.
      if (error instanceof StatsError && error.code === 'POSTHOG_ACCESS') throw error;
      return undefined;
    }
  }

  async function resolve(config: Config, sql: string, mode: FetchMode, deadline: number, schedule?: Schedule): Promise<Resolved> {
    const key = keyOf(config, sql);
    // 수동 갱신: 진행 중인 재집계는 방금 시작된 최신 계산이므로 합류하고, 없으면 새로 계산한다.
    if (mode === 'force') return { entry: await compute(config, key, sql, deadline), cached: false, revalidating: false };
    let entry = recall(key);
    if (isFresh(entry)) return { entry, cached: true, revalidating: false };
    const running = computing.get(key);
    if (running) {
      if (mode === 'swr' && isUsable(entry)) return { entry, cached: true, revalidating: true };
      return { entry: await running, cached: false, revalidating: false };
    }
    // 다른 인스턴스가 더 최근에 계산했을 수 있으므로 공유 캐시를 먼저 본다(remember가 더 최근 것을 돌려준다).
    entry = await probe(config, key, sql) ?? entry;
    if (isFresh(entry)) return { entry, cached: true, revalidating: false };
    if (mode === 'swr' && isUsable(entry) && schedule) {
      // 저장된 집계를 먼저 보여 주고, 응답 뒤에 재집계해 다음 조회가 최신을 받게 한다.
      const background = computing.get(key) ?? compute(config, key, sql, now() + BACKGROUND_BUDGET_MS);
      schedule(background.catch(() => undefined));
      return { entry, cached: true, revalidating: true };
    }
    return { entry: await compute(config, key, sql, deadline), cached: false, revalidating: false };
  }

  async function getSnapshot(config: Config, input: StatsInput, schedule?: Schedule): Promise<StatsData> {
    const { bounds, queries } = buildQueries(input, new Date(now()));
    const deadline = now() + REQUEST_BUDGET_MS;
    // 무거운 순서로 시작한다. 셋 중 하나라도 실패하면 스냅샷 전체를 실패로 둔다(성공한 부분은 캐시에 남아 재시도가 빨라진다).
    const sqls = [queries.summary, queries.daily, queries.breakdown];
    const parts = await Promise.all(sqls.map(sql => resolve(config, sql, input.mode, deadline, schedule)));
    const [summary, daily, breakdown] = parts;
    const at = now();
    const oldest = Math.min(...parts.map(p => p.entry.refreshedAt));
    try {
      return assembleStats(input, bounds, { summary: summary.entry.result.results, daily: daily.entry.result.results, breakdown: breakdown.entry.result.results }, {
        queriedAt: new Date(at).toISOString(), calculatedAt: new Date(oldest).toISOString(), ageMs: Math.max(0, at - oldest),
        cached: parts.some(p => p.cached || p.entry.result.is_cached === true),
        stale: parts.some(p => !isFresh(p.entry)), revalidating: parts.some(p => p.revalidating),
      });
    } catch {
      // 형식이 어긋난 결과를 캐시에 남겨 재시도까지 실패시키지 않는다.
      for (const sql of sqls) cache.delete(keyOf(config, sql));
      throw new StatsError('INVALID_RESULT', '통계 응답을 확인하지 못했습니다. 다시 조회해 주세요.');
    }
  }

  return { getSnapshot };
}
