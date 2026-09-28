/** 실제 서버 환경변수로 읽기 전용 집계를 검증한다. 키·사용자 식별자·설치 ID는 출력하지 않는다. */
import { loadEnvConfig } from '@next/env';
import { buildQueries } from '../src/lib/tidy-stats/queries';
import { runQuery } from '../src/lib/tidy-stats/transport';
import { createStatsEngine } from '../src/lib/tidy-stats/engine';
import { assembleStats, parseInput, splitBreakdown } from '../src/lib/tidy-stats/model';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(`검증 실패: ${message}`);
}
const ms = (from: number) => `${Math.round(performance.now() - from)}ms`;

async function main() {
  loadEnvConfig(process.cwd());
  const key = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const project = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!key || !project || !/^\d+$/.test(project)) throw new Error('PostHog 환경변수가 필요합니다.');
  const allowed = process.env.TIDY_STATS_ALLOWED_USER_IDS?.split(',').filter(v => v.trim());
  if (!allowed?.length) throw new Error('열람 허용 계정 설정이 필요합니다.');
  const config = { key, project };

  // 1) 쿼리 3개를 강제 재집계로 실행하고 형식을 확인한다. 불변식이 수집 중인 오늘 이벤트에 흔들리지 않게 이틀 전에 끝난 기간을 쓴다.
  const past = new Date(Date.now() - 2 * 86400_000);
  const input = parseInput({ days: 30 });
  const { bounds, queries } = buildQueries(input, past);
  const results: Record<string, unknown[][]> = {};
  for (const [name, sql] of Object.entries(queries)) {
    const started = performance.now();
    const result = await runQuery(config, sql, 'force_blocking', AbortSignal.timeout(40_000));
    results[name] = result.results;
    console.log(`${name}: 정상 (${result.results.length}행, ${ms(started)})`);
  }
  const data = assembleStats(input, bounds, { summary: results.summary, daily: results.daily, breakdown: results.breakdown },
    { queriedAt: '', calculatedAt: '', ageMs: 0, cached: false, stale: false, revalidating: false });

  // 2) 쿼리 사이의 불변식: 같은 조건의 합계는 서로 일치해야 한다.
  const sum = (values: (number | null)[]) => values.reduce<number>((a, v) => a + (v ?? 0), 0);
  check(sum(data.daily.map(d => d.minutes)) === data.summary.minutes, '일별 활동 분 합계 = 종합 활동 분');
  check(sum(data.daily.map(d => d.events)) === data.summary.events, '일별 이벤트 합계 = 종합 이벤트 수');
  check(sum(data.versions.map(v => v.minutes)) === data.summary.minutes, '버전별 활동 분 합계 = 종합 활동 분(전체 버전)');
  check(data.summary.active >= Math.max(0, ...data.daily.map(d => d.active ?? 0)), '기간 고유 설치 ≥ 하루 최대 고유 설치');
  console.log('불변식 정상:', { activeInstalls: data.summary.active, observedMinutes: data.summary.minutes, tools: data.tools.length, versions: data.versions.length, actions: data.actions.length, errors: data.errors.length });

  // 3) 버전 필터: 버전 분포는 전체 버전을 유지하고 나머지는 선택 버전만 센다.
  const top = data.versions.find(v => /^\d+\.\d+\.\d+/.test(v.key));
  if (top) {
    const filtered = buildQueries(parseInput({ days: 30, version: top.key }), past);
    const summary = await runQuery(config, filtered.queries.summary, 'force_blocking', AbortSignal.timeout(40_000));
    const breakdown = splitBreakdown((await runQuery(config, filtered.queries.breakdown, 'force_blocking', AbortSignal.timeout(40_000))).results);
    check(Number(summary.results[0][3]) === top.minutes, '선택 버전 활동 분 = 버전 분포의 해당 버전 활동 분');
    check(breakdown.versions.length === data.versions.length, '버전 필터에서도 버전 분포는 전체 버전 유지');
    console.log('버전 필터 정상');
  }

  // 4) PostHog 공유 캐시 확인(force_cache): 방금 계산한 결과가 계산 없이 바로 돌아와야 빠른 경로가 동작한다.
  let started = performance.now();
  const probed = await runQuery(config, queries.summary, 'force_cache', AbortSignal.timeout(10_000));
  if (probed) console.log(`공유 캐시 확인 정상 (${ms(started)}, 계산 시각 ${probed.last_refresh ?? '없음'})`);
  else console.warn('경고: force_cache가 미스를 반환했습니다. 정확성에는 영향이 없지만 캐시 빠른 경로가 동작하지 않습니다.');

  // 5) 실행기 전체 경로: 첫 조회(캐시 활용)와 같은 조건 재조회(L1)의 소요 시간.
  const engine = createStatsEngine({ run: runQuery });
  for (const mode of ['swr', 'fresh', 'fresh'] as const) {
    started = performance.now();
    const snapshot = await engine.getSnapshot(config, parseInput({ days: 7, mode }), task => void task);
    console.log(`실행기 ${mode}: ${ms(started)} (저장 ${snapshot.cached}, 오래됨 ${snapshot.stale}, 경과 ${Math.round(snapshot.ageMs / 1000)}초)`);
  }
  console.log('PostHog 실제 키·Query 권한·집계 3개·불변식·공유 캐시 검증 완료');
}
main().catch(error => { console.error(error instanceof Error ? error.message : '검증 실패'); process.exitCode = 1; });
