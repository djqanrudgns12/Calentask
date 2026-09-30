import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQueries } from '../src/lib/tidy-stats/queries';
import { BREAKDOWN_LIMIT, FRESH_MS, fillDays, isAllowedUser, parseInput, periodBounds, splitBreakdown } from '../src/lib/tidy-stats/model';
import { retryAfter, runQuery, StatsError, type QueryResult, type RefreshMode } from '../src/lib/tidy-stats/transport';
import { createStatsEngine, type Runner } from '../src/lib/tidy-stats/engine';

test('한국 자정 경계와 연도 경계에서 기간이 일치한다', () => {
  assert.equal(periodBounds(1, new Date('2026-09-27T14:59:59Z')).through, '2026-09-27');
  assert.equal(periodBounds(1, new Date('2026-09-27T15:00:00Z')).from, '2026-09-27T15:00:00.000Z');
  assert.equal(periodBounds(7, new Date('2026-01-01T01:00:00Z')).from, '2025-12-25T15:00:00.000Z');
});
test('기간 확장·SQL 삽입·잘못된 조회 방식·알 수 없는 필드는 거부한다', () => {
  for (const v of [{ days: 3650 }, { days: '30' }, { version: "5.6.3' OR 1=1 --" }, { mode: 'force_blocking' }, { refresh: true }, []]) assert.throws(() => parseInput(v));
  assert.deepEqual(parseInput({ days: 7, version: '5.6.3', mode: 'force' }), { days: 7, version: '5.6.3', mode: 'force' });
  assert.deepEqual(parseInput({}), { days: 30, version: 'all', mode: 'fresh' });
});
test('허용 계정은 정확히 일치해야 하고 빈 설정은 차단한다', () => {
  assert.equal(isAllowedUser('owner', undefined), false);
  assert.equal(isAllowedUser('own', 'owner'), false);
  assert.equal(isAllowedUser('owner', ' one, owner '), true);
});
test('미관측 날짜는 null로 유지하고 관측된 0과 구분한다', () => {
  const rows = fillDays('2026-09-26T15:00:00Z', 7, [['2026-09-28', 0, 1, 0, 3]]);
  assert.equal(rows[0].active, null); assert.equal(rows[1].active, 0);
  assert.equal(rows.length, 7); assert.equal(rows[6].date, '2026-10-03');
});
test('모든 집계에 운영 필터와 시간 상한·하한이 있고 도구 집계는 window_used를 쓰지 않는다', () => {
  const { queries } = buildQueries(parseInput({ days: 30, version: '5.6.3' }));
  assert.deepEqual(Object.keys(queries), ['summary', 'daily', 'breakdown']);
  for (const sql of Object.values(queries)) {
    assert.match(sql, /properties.environment = 'production'/);
    assert.match(sql, /\{filters\}/);
    assert.match(sql, /timestamp >=/); assert.match(sql, /timestamp </);
    assert.match(sql, /timestamp <= toDateTime\(now\(\)\)/);
    assert.doesNotMatch(sql, /timestamp <= now\(\)/);
    assert.doesNotMatch(sql, /window_used/);
  }
  assert.match(queries.summary, /uniqExactIf\(distinct_id/);
  assert.match(queries.summary, /timestamp <= toDateTime\(now\(\)\) - INTERVAL 30 DAY/);
  // 이전 기간은 active_minute만 읽는다.
  assert.match(queries.summary, /AND \(timestamp >= toDateTime\('[^']+', 'UTC'\) OR event = 'active_minute'\)$/);
  assert.match(queries.daily, /Asia\/Seoul/);
  assert.match(queries.breakdown, /tool_active_minute/);
  assert.match(queries.breakdown, /sumIf\(coalesce\(toFloat\(properties.count\), 0\), event IN \('todo_created'/);
  assert.match(queries.breakdown, new RegExp(`LIMIT ${BREAKDOWN_LIMIT}$`));
  // 버전 분포(active_minute)는 버전 필터 밖, 나머지 이벤트는 버전 필터 안에 있다.
  assert.match(queries.breakdown, /\(event = 'active_minute' OR \(event IN \('tool_active_minute', 'app_error', [^)]+\) AND properties.app_version = '5\.6\.3'\)\)/);
  assert.doesNotMatch(buildQueries(parseInput({ days: 30 })).queries.breakdown, /app_version = /);
});
test('통합 집계를 패널별로 나누고 분리 쿼리 시절의 정렬을 유지한다', () => {
  const split = splitBreakdown([
    ['active_minute', '5.6.2', 50, 3, 0], ['active_minute', '5.6.3', 80, 9, 0], ['active_minute', '미확인', 5, 9, 0],
    ['tool_active_minute', 'dice', 12, 2, 0], ['tool_active_minute', 'tidy_task', 90, 7, 0],
    ['todo_created', '', 4, 2, 11], ['dice_rolled', '', 9, 3, 0],
    ['app_error', 'E2', 1, 1, 0], ['app_error', 'E1', 5, 2, 0],
  ]);
  assert.deepEqual(split.versions.map(v => v.key), ['5.6.3', '미확인', '5.6.2']);
  assert.deepEqual(split.tools.map(t => [t.key, t.minutes]), [['tidy_task', 90], ['dice', 12]]);
  assert.deepEqual(split.actions, [{ event: 'dice_rolled', count: 9, items: 0, installs: 3 }, { event: 'todo_created', count: 4, items: 11, installs: 2 }]);
  assert.deepEqual(split.errors.map(e => e.code), ['E1', 'E2']);
  assert.throws(() => splitBreakdown(Array.from({ length: BREAKDOWN_LIMIT }, () => ['active_minute', 'x', 1, 1, 0])));
  assert.throws(() => splitBreakdown([['active_minute', 'x', null, 1, 0]]));
});

const config = { key: 'test-secret', project: '615314' };
const signal = () => new AbortController().signal;
test('재집계는 force_blocking, 캐시 확인은 force_cache이고 토큰은 인증 헤더에만 넣는다', async () => {
  for (const mode of ['force_blocking', 'force_cache'] as RefreshMode[]) {
    await runQuery(config, 'SELECT 1', mode, signal(), (async (url, init) => {
      assert.equal(url, 'https://us.posthog.com/api/projects/615314/query/');
      assert.equal(init?.cache, 'no-store');
      assert.equal(JSON.parse(String(init?.body)).refresh, mode);
      assert.deepEqual(JSON.parse(String(init?.body)).query.filters, { dateRange: { date_from: 'all' }, filterTestAccounts: true });
      assert.doesNotMatch(String(init?.body), /test-secret/);
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-secret');
      return Response.json({ results: [[1]] });
    }) as typeof fetch);
  }
});
test('캐시 미스는 null, 재집계의 미완료는 오류로 구분한다', async () => {
  const reply = (body: unknown) => (async () => Response.json(body)) as typeof fetch;
  assert.equal(await runQuery(config, 'SELECT 1', 'force_cache', signal(), reply({ cache_key: 'k', query_status: null })), null);
  assert.equal(await runQuery(config, 'SELECT 1', 'force_cache', signal(), reply({ results: [[1]], query_status: { complete: false } })), null);
  await assert.rejects(() => runQuery(config, 'SELECT 1', 'force_blocking', signal(), reply({ cache_key: 'k' })), { code: 'INCOMPLETE' });
});
test('실패·미완료 응답을 빈 통계로 바꾸지 않고 원본 오류/키를 노출하지 않는다', async () => {
  for (const status of [401, 403, 429, 500, 502]) {
    await assert.rejects(() => runQuery(config, 'SELECT 1', 'force_blocking', signal(),
      (async () => new Response('test-secret upstream stack', { status })) as typeof fetch),
      (e: unknown) => e instanceof StatsError && !e.message.includes('test-secret'));
  }
  for (const body of [{ query_status: { complete: false } }, { results: [], error: 'oops' }, { results: [], hasMore: true }, { results: [3] }]) {
    await assert.rejects(() => runQuery(config, 'SELECT 1', 'force_blocking', signal(), (async () => Response.json(body)) as typeof fetch));
  }
});
test('일시 오류만 재시도 대상이고 Retry-After를 해석한다', async () => {
  const fail = (f: typeof fetch, s = signal()) => runQuery(config, 'SELECT 1', 'force_blocking', s, f).then(() => assert.fail('실패해야 합니다'), (e: StatsError) => e);
  const limited = await fail((async () => new Response('', { status: 429, headers: { 'retry-after': '3' } })) as typeof fetch);
  assert.equal(limited.retryable, true); assert.equal(limited.retryAfterMs, 3000);
  const network = await fail((async () => { throw new TypeError('fetch failed test-secret'); }) as typeof fetch);
  assert.equal(network.code, 'NETWORK'); assert.equal(network.retryable, true); assert.doesNotMatch(network.message, /test-secret/);
  const aborted = new AbortController(); aborted.abort();
  const timeout = await fail((async () => { throw new DOMException('aborted', 'AbortError'); }) as typeof fetch, aborted.signal);
  assert.equal(timeout.code, 'TIMEOUT'); assert.equal(timeout.retryable, false);
  assert.equal((await fail((async () => new Response('', { status: 401 })) as typeof fetch)).retryable, false);
  assert.equal(retryAfter('Wed, 21 Oct 2015 07:28:05 GMT', Date.parse('Wed, 21 Oct 2015 07:28:00 GMT')), 5000);
  assert.equal(retryAfter('abc'), undefined);
});

// ── 실행기: 가짜 PostHog로 캐시·중복 제거·백그라운드 재집계를 확인한다 ──
const kind = (sql: string) => sql.includes('GROUP BY 1, 2') ? 'breakdown' : sql.includes("'Asia/Seoul'") ? 'daily' : 'summary';
const rows = {
  summary: [[5, 3, 1, 100, 10, 0, 500, 2, '2026-09-28T01:00:00Z']],
  daily: [['2026-09-28', 5, 1, 100, 500]],
  breakdown: [['active_minute', '5.6.3', 100, 5, 0], ['tool_active_minute', 'dice', 10, 2, 0], ['todo_created', '', 3, 2, 7], ['app_error', 'E1', 1, 1, 0]],
};
function fakePostHog(start = Date.parse('2026-09-28T03:00:00Z')) {
  let clock = start;
  const calls: { kind: string; mode: RefreshMode }[] = [];
  const shared = new Map<string, QueryResult>();   // PostHog 공유 캐시
  const failures = new Map<string, StatsError[]>();
  const gates: (() => void)[] = [];
  let hold = false;
  const run: Runner = async (_config, sql, mode) => {
    calls.push({ kind: kind(sql), mode });
    if (mode === 'force_cache') return shared.get(sql) ?? null;
    const queued = failures.get(kind(sql))?.shift();
    if (queued) throw queued;
    if (hold) await new Promise<void>(r => gates.push(r));
    const result = { results: rows[kind(sql) as keyof typeof rows], last_refresh: new Date(clock).toISOString() };
    shared.set(sql, result);
    return result;
  };
  const scheduled: Promise<unknown>[] = [];
  const engine = createStatsEngine({ run, now: () => clock, sleep: async () => {}, random: () => 0.5 });
  return {
    engine, calls, shared, failures, scheduled, schedule: (t: Promise<unknown>) => { scheduled.push(t); },
    tick: (ms: number) => { clock += ms; },
    hold: () => { hold = true; }, release: () => { hold = false; gates.splice(0).forEach(g => g()); },
    computes: () => calls.filter(c => c.mode === 'force_blocking').length,
    probes: () => calls.filter(c => c.mode === 'force_cache').length,
  };
}
const input = (mode: 'swr' | 'fresh' | 'force', days: 1 | 7 = 7, version = 'all') => parseInput({ days, version, mode });

test('동시에 들어온 같은 조회는 쿼리마다 한 번만 계산한다', async () => {
  const p = fakePostHog();
  const [a, b] = await Promise.all([p.engine.getSnapshot(config, input('fresh')), p.engine.getSnapshot(config, input('fresh'))]);
  assert.equal(p.computes(), 3);
  assert.deepEqual(a.summary, b.summary);
  assert.equal(a.summary.active, 5); assert.equal(a.tools[0].key, 'dice'); assert.equal(a.actions[0].items, 7);
  assert.equal(a.stale, false); assert.equal(a.revalidating, false);
});
test('5분 안의 재조회는 인스턴스 캐시로 응답하고, 지나면 공유 캐시를 확인한 뒤 재집계한다', async () => {
  const p = fakePostHog();
  await p.engine.getSnapshot(config, input('fresh'));
  const before = p.calls.length;
  p.tick(FRESH_MS - 1_000);
  const cached = await p.engine.getSnapshot(config, input('fresh'));
  assert.equal(p.calls.length, before); assert.equal(cached.cached, true); assert.equal(cached.ageMs, FRESH_MS - 1_000);
  p.tick(2_000);
  const refreshed = await p.engine.getSnapshot(config, input('fresh'));
  assert.equal(p.probes(), 6); assert.equal(p.computes(), 6);   // 첫 조회·만료 후 조회 모두 공유 캐시를 먼저 본다
  assert.equal(refreshed.ageMs, 0); assert.equal(refreshed.stale, false);
});
test('다른 인스턴스가 계산한 최신 결과는 공유 캐시에서 계산 없이 받는다', async () => {
  const other = fakePostHog();
  await other.engine.getSnapshot(config, input('fresh'));
  const p = fakePostHog();
  for (const [sql, result] of other.shared) p.shared.set(sql, result);
  p.tick(60_000);
  const data = await p.engine.getSnapshot(config, input('fresh'));
  assert.equal(p.computes(), 0); assert.equal(p.probes(), 3);
  assert.equal(data.cached, true); assert.equal(data.ageMs, 60_000);
});
test('swr은 오래된 집계를 즉시 주고 뒤에서 재집계하며, 이어진 fresh 조회는 그 계산에 합류한다', async () => {
  const p = fakePostHog();
  await p.engine.getSnapshot(config, input('fresh'));
  p.tick(FRESH_MS + 60_000);
  p.hold();
  const stale = await p.engine.getSnapshot(config, input('swr'), p.schedule);
  assert.equal(stale.stale, true); assert.equal(stale.revalidating, true); assert.equal(stale.ageMs, FRESH_MS + 60_000);
  assert.equal(p.scheduled.length, 3);
  const follow = p.engine.getSnapshot(config, input('fresh'));
  p.release();
  const fresh = await follow;
  await Promise.all(p.scheduled);
  assert.equal(p.computes(), 6);   // 첫 계산 3 + 백그라운드 3. 후속 조회는 새로 계산하지 않는다.
  assert.equal(fresh.stale, false); assert.equal(fresh.ageMs, 0);
});
test('캐시가 없으면 swr도 계산을 기다리고, 수동 갱신은 최신 캐시가 있어도 재집계한다', async () => {
  const p = fakePostHog();
  const first = await p.engine.getSnapshot(config, input('swr'), p.schedule);
  assert.equal(first.revalidating, false); assert.equal(p.scheduled.length, 0); assert.equal(p.computes(), 3);
  p.tick(10_000);
  const forced = await p.engine.getSnapshot(config, input('force'));
  assert.equal(p.computes(), 6); assert.equal(forced.cached, false); assert.equal(forced.ageMs, 0);
});
test('일부 쿼리 실패는 스냅샷 전체 실패이며, 재시도는 실패한 쿼리만 다시 계산한다', async () => {
  const p = fakePostHog();
  p.failures.set('daily', [new StatsError('POSTHOG_ERROR', 'x')]);
  await assert.rejects(() => p.engine.getSnapshot(config, input('fresh')), { code: 'POSTHOG_ERROR' });
  const retried = await p.engine.getSnapshot(config, input('fresh'));
  assert.equal(p.computes(), 4); assert.equal(retried.summary.active, 5);
});
test('429·네트워크 오류는 제한된 횟수만 재시도하고 권한 오류는 즉시 실패한다', async () => {
  const p = fakePostHog();
  p.failures.set('summary', [new StatsError('RATE_LIMIT', 'x', 429, true, 1_000), new StatsError('NETWORK', 'x', 503, true)]);
  await p.engine.getSnapshot(config, input('fresh'));
  assert.equal(p.calls.filter(c => c.kind === 'summary' && c.mode === 'force_blocking').length, 3);
  const q = fakePostHog();
  q.failures.set('summary', Array.from({ length: 3 }, () => new StatsError('NETWORK', 'x', 503, true)));
  await assert.rejects(() => q.engine.getSnapshot(config, input('fresh', 1)), { code: 'NETWORK' });
  const r = fakePostHog();
  r.failures.set('summary', [new StatsError('RATE_LIMIT', 'x', 429, true, 60_000)]);
  await assert.rejects(() => r.engine.getSnapshot(config, input('fresh')), { code: 'RATE_LIMIT' });   // 대기가 너무 길면 바로 알린다
  const s = fakePostHog();
  s.failures.set('summary', [new StatsError('POSTHOG_ACCESS', 'x')]);
  await assert.rejects(() => s.engine.getSnapshot(config, input('fresh')), { code: 'POSTHOG_ACCESS' });
  assert.equal(s.calls.filter(c => c.kind === 'summary' && c.mode === 'force_blocking').length, 1);
});
test('버전별 조회는 서로 다른 캐시 항목을 쓰고, 같은 조건 재조회는 계산하지 않는다', async () => {
  const p = fakePostHog();
  await p.engine.getSnapshot(config, input('fresh', 7, 'all'));
  await p.engine.getSnapshot(config, input('fresh', 7, '5.6.3'));
  // 버전 필터는 세 쿼리 모두에 들어가므로 새로 3개.
  assert.equal(p.computes(), 6);
  await p.engine.getSnapshot(config, input('fresh', 7, '5.6.3'));
  assert.equal(p.computes(), 6);
});
