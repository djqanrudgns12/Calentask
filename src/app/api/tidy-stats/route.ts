import { after } from 'next/server';
import { parseInput, type StatsInput } from '@/lib/tidy-stats/model';
import { getStats, requireStatsUser } from '@/lib/tidy-stats/server';
import { StatsError } from '@/lib/tidy-stats/transport';

export const runtime = 'nodejs';
export const maxDuration = 60;
const baseHeaders = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie' };

export async function POST(request: Request) {
  // 브라우저 개발자 도구 Network → Timing에서 인증·집계 시간을 확인할 수 있다.
  const timing: string[] = [];
  let last = performance.now();
  const mark = (name: string) => { const at = performance.now(); timing.push(`${name};dur=${(at - last).toFixed(0)}`); last = at; };
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) throw new StatsError('ORIGIN', '현재 Calentask 화면에서 다시 시도해 주세요.', 403);
    // 메뉴 노출 여부와 별개로 모든 요청에서 서버 인증·권한을 확인한다. 본문 해석은 인증과 겹쳐서 진행한다.
    const [body] = await Promise.all([request.json().catch(() => undefined), requireStatsUser()]);
    mark('auth');
    let input: StatsInput;
    try { input = parseInput(body); }
    catch { return Response.json({ code: 'BAD_INPUT', error: '조회 조건을 확인해 주세요.' }, { status: 400, headers: { ...baseHeaders, 'Server-Timing': timing.join(', ') } }); }
    const data = await getStats(input, task => after(task));
    mark(`stats;desc="${data.revalidating ? 'stale-while-revalidate' : data.cached ? 'cache' : 'posthog'}"`);
    return Response.json(data, { headers: { ...baseHeaders, 'Server-Timing': timing.join(', ') } });
  } catch (error) {
    mark('failed');
    const known = error instanceof StatsError;
    return Response.json({ code: known ? error.code : 'UNAVAILABLE', error: known ? error.message : '통계 조회가 지연되거나 연결이 끊겼습니다. 잠시 후 다시 시도해 주세요.' }, {
      status: known ? error.status : 503,
      headers: { ...baseHeaders, 'Server-Timing': timing.join(', '), ...(known && error.retryAfterMs ? { 'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)) } : {}) },
    });
  }
}
