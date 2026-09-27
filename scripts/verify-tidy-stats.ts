/** 실제 서버 환경변수로 읽기 전용 집계를 검증한다. 키·사용자 식별자는 출력하지 않는다. */
import { loadEnvConfig } from '@next/env';
import { buildQueries } from '../src/lib/tidy-stats/queries';
import { runQuery } from '../src/lib/tidy-stats/transport';
import { numeric, parseInput } from '../src/lib/tidy-stats/model';

async function main() {
  loadEnvConfig(process.cwd());
  const key = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const project = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!key || !project || !/^\d+$/.test(project)) throw new Error('PostHog 환경변수가 필요합니다.');
  const allowed = process.env.TIDY_STATS_ALLOWED_USER_IDS?.split(',').filter(v => v.trim());
  if (!allowed?.length) throw new Error('열람 허용 계정 설정이 필요합니다.');
  const { queries } = buildQueries(parseInput({ days: 30 }));
  for (const [name, sql] of Object.entries(queries)) {
    const result = await runQuery({ key, project }, sql, true, AbortSignal.timeout(30_000));
    if (name === 'summary') {
      if (result.results[0]?.length !== 9) throw new Error('종합 집계 응답 불일치');
      result.results[0].slice(0, 8).forEach(numeric);
      console.log('종합 집계 정상:', { activeInstalls: result.results[0][0], observedMinutes: result.results[0][3] });
    }
    console.log(`${name}: 정상 (${result.results.length}행)`);
  }
  console.log('PostHog 실제 키·Query 권한·6개 집계 쿼리 검증 완료');
}
main().catch(error => { console.error(error instanceof Error ? error.message : '검증 실패'); process.exitCode = 1; });
