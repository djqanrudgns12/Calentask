import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQueries } from '../src/lib/tidy-stats/queries';
import { fillDays, isAllowedUser, parseInput, periodBounds } from '../src/lib/tidy-stats/model';
import { runQuery, StatsError } from '../src/lib/tidy-stats/transport';

test('한국 자정 경계와 연도 경계에서 기간이 일치한다', () => {
  assert.equal(periodBounds(1, new Date('2026-09-27T14:59:59Z')).through, '2026-09-27');
  assert.equal(periodBounds(1, new Date('2026-09-27T15:00:00Z')).from, '2026-09-27T15:00:00.000Z');
  assert.equal(periodBounds(7, new Date('2026-01-01T01:00:00Z')).from, '2025-12-25T15:00:00.000Z');
});
test('기간 확장·SQL 삽입·잘못된 갱신 값은 거부한다', () => {
  for (const v of [{ days: 3650 }, { days: '30' }, { version: "5.6.3' OR 1=1 --" }, { refresh: 'true' }, []]) assert.throws(() => parseInput(v));
  assert.deepEqual(parseInput({ days: 7, version: '5.6.3', refresh: true }), { days: 7, version: '5.6.3', refresh: true });
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
test('모든 집계에 운영 필터와 시간 상한·하한이 있다', () => {
  const { queries } = buildQueries(parseInput({ days: 30, version: '5.6.3' }));
  for (const sql of Object.values(queries)) {
    assert.match(sql, /properties.environment = 'production'/);
    assert.match(sql, /\{filters\}/);
    assert.match(sql, /timestamp >=/); assert.match(sql, /timestamp </);
  }
  assert.match(queries.summary, /uniqExactIf\(distinct_id/);
  assert.match(queries.tools, /tool_active_minute/);
  assert.doesNotMatch(queries.tools, /window_used/);
  assert.match(queries.daily, /Asia\/Seoul/);
  assert.match(queries.actions, /sum\(coalesce\(toFloat\(properties.count\)/);
});
const config = { key: 'test-secret', project: '615314' };
test('강제 갱신은 force_blocking이고 토큰은 인증 헤더에만 넣는다', async () => {
  await runQuery(config, 'SELECT 1', true, new AbortController().signal, (async (url, init) => {
    assert.equal(url, 'https://us.posthog.com/api/projects/615314/query/');
    assert.equal(init?.cache, 'no-store');
    assert.equal(JSON.parse(String(init?.body)).refresh, 'force_blocking');
    assert.deepEqual(JSON.parse(String(init?.body)).query.filters, { dateRange: { date_from: 'all' }, filterTestAccounts: true });
    assert.doesNotMatch(String(init?.body), /test-secret/);
    return Response.json({ results: [[1]] });
  }) as typeof fetch);
});
test('실패·미완료 응답을 빈 통계로 바꾸지 않고 원본 오류/키를 노출하지 않는다', async () => {
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(() => runQuery(config, 'SELECT 1', true, new AbortController().signal,
      (async () => new Response('test-secret upstream stack', { status })) as typeof fetch),
      (e: unknown) => e instanceof StatsError && !e.message.includes('test-secret'));
  }
  for (const body of [{ query_status: { complete: false } }, { results: [], error: 'oops' }, { results: [], hasMore: true }, { results: [3] }]) {
    await assert.rejects(() => runQuery(config, 'SELECT 1', false, new AbortController().signal,
      (async () => Response.json(body)) as typeof fetch));
  }
});
