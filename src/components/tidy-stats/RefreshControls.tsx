'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, RefreshCw } from 'lucide-react';
import type { RefreshState } from './useTidyStats';
import motion from './TidyStatsMotion.module.css';

const COOLDOWN_MS = 15_000;

/** 보이는 동안 1초마다 현재 시각을 갱신한다. 이 컴포넌트만 다시 그린다. */
function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1_000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [active]);
  return now;
}
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const BUTTON = {
  idle: { Icon: RefreshCw, label: '새로고침', effect: '' },
  running: { Icon: RefreshCw, label: '갱신 중', effect: motion.spin },
  done: { Icon: Check, label: '갱신 완료', effect: motion.pop },
  unchanged: { Icon: Check, label: '변동 없음', effect: motion.pop },
  failed: { Icon: AlertCircle, label: '갱신 실패', effect: motion.shake },
} as const;

/** 수동 갱신 버튼. 진행 중에는 아이콘이 돌고, 끝나면 결과를 잠깐 보여 준 뒤 돌아온다. */
export function RefreshButton({ state, online, cooldownUntil, onClick, className }:
  { state: RefreshState; online: boolean; cooldownUntil: number; onClick: () => void; className: string }) {
  const { Icon, label, effect } = BUTTON[state];
  const blocked = state === 'running' || !online;
  return <button type="button" className={`${className} ${motion.refresh}`} data-state={state} data-offline={!online}
    aria-disabled={blocked} title={online ? 'PostHog에서 지금 다시 집계합니다.' : '오프라인에서는 갱신할 수 없습니다.'}
    onClick={() => { if (!blocked) onClick(); }}>
    <span key={`i-${state}`} className={`${motion.icon} ${effect}`}><Icon size={16} aria-hidden /></span>
    <span key={`l-${state}`} className={motion.label}>{label}</span>
    {cooldownUntil > 0 && <span key={cooldownUntil} className={motion.cooldown} style={{ animationDuration: `${COOLDOWN_MS}ms` }} aria-hidden />}
  </button>;
}

type AutoProps = {
  automatic: boolean; visible: boolean; online: boolean; fatal: boolean;
  fetching: boolean; manual: boolean; placeholder: boolean; revalidating: boolean; hasData: boolean; failed: boolean;
  nextRefreshAt: number | null; dataUpdatedAt: number; onToggle: () => void; className: string;
};

/** 자동 갱신 스위치이자 현재 상태 표시. 다음 갱신까지 남은 시간과 진행·완료를 보여 준다. */
export function AutoRefreshStatus(p: AutoProps) {
  const now = useNow(p.visible);
  const justUpdated = now !== null && p.dataUpdatedAt > 0 && now - p.dataUpdatedAt < 3_000;
  let dot: 'live' | 'busy' | 'done' | 'error' | 'paused' = 'live';
  let label: string;
  if (!p.online) { dot = 'paused'; label = '오프라인 · 연결되면 갱신'; }
  else if (p.fatal) { dot = 'error'; label = '자동 갱신 중지 · 설정 확인 필요'; }
  else if (p.fetching) {
    dot = 'busy';
    label = p.manual ? 'PostHog 재집계 중' : !p.hasData ? '사용 현황 불러오는 중' : p.placeholder ? '새 조건 집계 중' : p.revalidating ? '최신 집계 받는 중' : '자동 갱신 중';
  }
  else if (justUpdated) { dot = 'done'; label = '방금 갱신됨'; }
  else if (!p.automatic) { dot = 'paused'; label = '자동 갱신 꺼짐'; }
  else if (p.failed) { dot = 'error'; label = p.nextRefreshAt && now ? `연결 재시도 · ${clock(p.nextRefreshAt - now)} 후` : '연결 확인 필요'; }
  else if (!p.visible) { dot = 'paused'; label = '탭으로 돌아오면 갱신'; }
  else if (p.nextRefreshAt && now) { label = p.nextRefreshAt - now > 1_000 ? `자동 갱신 · ${clock(p.nextRefreshAt - now)} 후` : '곧 자동 갱신'; }
  else label = '자동 갱신 켜짐';
  return <button type="button" className={p.className} aria-pressed={p.automatic} onClick={p.onToggle}
    title="보고 있는 동안 집계가 5분을 넘기면 자동으로 최신 집계를 받습니다. 다른 탭에서는 멈추고, 돌아오면 확인합니다. 클릭하면 켜거나 끕니다.">
    <span className={motion.liveDot} data-state={dot} aria-hidden />
    <span className={motion.autoLabel}>{label}</span>
  </button>;
}

/** 조건 전환·오래된 집계 갱신 중임을 메타 줄에 표시한다. */
export function SyncBadge({ placeholder, revalidating }: { placeholder: boolean; revalidating: boolean }) {
  if (!placeholder && !revalidating) return null;
  return <span className={motion.syncBadge}><span className={motion.liveDot} data-state="busy" aria-hidden />{placeholder ? '새 조건 집계 중' : '최신 집계 받는 중'}</span>;
}

/**
 * 첫 조회 대기 중 단계와 경과 시간. 다른 탭·오프라인에서는 React Query가 재시도를 멈추므로(paused) 그 이유를 알린다.
 */
export function LoadingStatus({ paused, online, retries }: { paused: boolean; online: boolean; retries: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setElapsed(s => s + 1), 1_000);
    return () => clearInterval(timer);
  }, [paused]);
  const stage = paused ? (online ? '탭으로 돌아오면 이어서 불러옵니다' : '인터넷에 연결되면 이어서 불러옵니다')
    : retries > 0 ? `일시 오류로 다시 시도하고 있습니다 (${retries}/2)`
    : elapsed < 3 ? '저장된 집계를 확인하고 있습니다' : elapsed < 15 ? 'PostHog에서 사용 현황을 집계하고 있습니다' : '집계가 평소보다 오래 걸립니다 · 최대 45초';
  return <div role="status" className={motion.loadingStatus}>
    <span className={motion.liveDot} data-state={paused ? 'paused' : retries > 0 ? 'error' : 'busy'} aria-hidden /><strong key={stage} className={motion.label}>{stage}</strong>
    {!paused && <span className={motion.elapsed} aria-hidden>{elapsed}초</span>}
  </div>;
}
