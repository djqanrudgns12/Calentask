'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { focusManager, keepPreviousData, onlineManager, queryOptions, useQuery, useQueryClient, type QueryClient, type QueryState } from '@tanstack/react-query';
import { FRESH_MS, type FetchMode, type Period, type StatsData } from '@/lib/tidy-stats/model';

export class DashboardError extends Error {
  constructor(message: string, public code: string, public retryAfterMs?: number) { super(message); }
}

type StatsKey = readonly ['tidy-stats', Period, string];
export type RefreshState = 'idle' | 'running' | 'done' | 'unchanged' | 'failed';

/** 다시 시도해도 결과가 같은 오류: 자동 갱신·재시도를 멈춘다. */
const FATAL = new Set(['UNAUTHENTICATED', 'FORBIDDEN', 'SETUP_REQUIRED', 'POSTHOG_ACCESS', 'BAD_INPUT', 'ORIGIN']);
/** 열람 권한이 사라진 경우에는 이전 데이터도 숨긴다. */
const HIDE_DATA = new Set(['UNAUTHENTICATED', 'FORBIDDEN']);
/** 잠시 뒤 같은 요청이 성공할 수 있는 오류. */
const TRANSIENT = new Set(['NETWORK', 'RATE_LIMIT', 'POSTHOG_ERROR', 'INCOMPLETE', 'UNAVAILABLE', 'TIMEOUT']);
const CLIENT_TIMEOUT_MS = 65_000;   // 서버 함수 제한(60초)보다 조금 길게
const MIN_POLL_MS = 30_000;
const MAX_BACKOFF_MS = 15 * 60_000;
const COOLDOWN_MS = 15_000;
const INTENT_DELAY_MS = 150;

export const statsKey = (days: Period, version: string): StatsKey => ['tidy-stats', days, version];
const keyId = (key: StatsKey) => key.join('|');

// 화면을 나갔다 돌아와도 선택을 유지한다(탭 단위, 저장소에 남기지 않음).
const prefs: { days: Period; version: string; automatic: boolean } = { days: 7, version: 'all', automatic: true };
/** 수동 갱신 중인 키. 이 조회의 재시도까지 force로 보낸다. */
const forced = new Set<string>();
/** 마지막 성공 시점의 누적 실패 수. 연속 실패 수 = 현재 누적 실패 수 - 이 값. */
const failureBaseline = new Map<string, number>();

async function fetchStats(days: Period, version: string, mode: FetchMode, signal: AbortSignal): Promise<StatsData> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, CLIENT_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch('/api/tidy-stats', {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, version, mode }),
      });
    } catch (error) {
      if (signal.aborted) throw error;   // 화면 전환 등으로 React Query가 취소한 조회
      throw controller.signal.aborted
        ? new DashboardError('응답이 늦어 조회를 중단했습니다. 잠시 후 다시 시도합니다.', 'TIMEOUT')
        : new DashboardError('네트워크 연결을 확인해 주세요.', 'NETWORK');
    }
    if (response.redirected || response.headers.get('content-type')?.includes('text/html')) {
      throw new DashboardError('로그인이 만료되었습니다. 다시 로그인해 주세요.', 'UNAUTHENTICATED');
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) {
      const wait = Number(response.headers.get('retry-after'));
      throw new DashboardError(result?.error || '통계를 불러오지 못했습니다.', result?.code || 'UNAVAILABLE', Number.isFinite(wait) && wait > 0 ? wait * 1000 : undefined);
    }
    return result as StatsData;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

/** 집계 시각 기준으로 남은 신선 시간. 저장된 집계를 받았다면 그만큼 일찍 다시 확인한다. */
const freshFor = (data: StatsData | undefined) => !data || data.stale ? 0 : Math.max(0, FRESH_MS - data.ageMs);

export function statsOptions(days: Period, version: string) {
  return queryOptions<StatsData, DashboardError, StatsData, StatsKey>({
    queryKey: statsKey(days, version),
    queryFn: async ({ signal, client, queryKey }) => {
      const id = keyId(queryKey);
      // 화면에 보여 줄 것이 없으면 저장된 집계부터(swr), 이미 있으면 최신 집계까지 기다린다(fresh).
      const mode: FetchMode = forced.has(id) ? 'force' : client.getQueryData(queryKey) ? 'fresh' : 'swr';
      const data = await fetchStats(days, version, mode, signal);
      failureBaseline.set(id, client.getQueryState(queryKey)?.errorUpdateCount ?? 0);
      return data;
    },
    staleTime: query => freshFor(query.state.data),
    gcTime: 30 * 60_000,
    // 일시 오류만 짧게 두 번 재시도한다(지수 백오프 + 지터, 서버가 알려 준 대기 시간 우선).
    retry: (count, error) => count < 2 && TRANSIENT.has(error.code),
    retryDelay: (count, error) => error.retryAfterMs ?? Math.min(8_000, 1_000 * 2 ** count) * (0.5 + Math.random()),
  });
}

/** 다음 자동 조회까지의 간격. 타이머가 매 렌더마다 초기화되지 않도록 조회 상태만으로 정해지는 값이어야 한다. */
function pollDelay(state: QueryState<StatsData, DashboardError> | undefined, key: StatsKey): number | false {
  if (!state) return false;
  const { status, data, error, errorUpdateCount, errorUpdatedAt } = state;
  if (status === 'error') {
    if (!error || FATAL.has(error.code)) return false;
    const failures = Math.max(1, errorUpdateCount - (failureBaseline.get(keyId(key)) ?? 0));
    const jitter = 0.8 + (errorUpdatedAt % 1000) / 2500;   // 0.8~1.2, 같은 실패에는 같은 값
    return Math.max(error.retryAfterMs ?? 0, Math.min(MAX_BACKOFF_MS, 60_000 * 2 ** (failures - 1)) * jitter);
  }
  if (!data || data.stale) return false;   // 오래된 집계는 아래 후속 조회가 바로 최신으로 바꾼다
  return Math.max(MIN_POLL_MS, freshFor(data) + 1_000);
}

/**
 * 메뉴 항목용 미리 받기. 잠시 머무르거나 초점·터치를 받으면 화면 코드와 마지막 조건의 집계를 동시에 받기 시작해
 * 화면 코드 다운로드 → 조회 시작의 직렬 대기를 없앤다. 스쳐 지나가는 마우스는 무시한다.
 */
export function tidyStatsWarmup(client: QueryClient, loadView: () => Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const warm = () => { clearTimeout(timer); void loadView(); void client.prefetchQuery(statsOptions(prefs.days, prefs.version)); };
  return {
    warm,
    handlers: {
      onPointerEnter: () => { clearTimeout(timer); timer = setTimeout(warm, INTENT_DELAY_MS); },
      onPointerLeave: () => clearTimeout(timer),
      onFocus: warm,
      onTouchStart: warm,
    },
  };
}

const subscribeFocus = (cb: () => void) => focusManager.subscribe(cb);
const subscribeOnline = (cb: () => void) => onlineManager.subscribe(cb);
const signature = (d: StatsData) => JSON.stringify([d.summary, d.daily, d.tools, d.versions, d.actions, d.errors]);

export function useTidyStats() {
  const client = useQueryClient();
  const [days, setDaysState] = useState<Period>(prefs.days);
  const [version, setVersionState] = useState(prefs.version);
  const [automatic, setAutomatic] = useState(prefs.automatic);
  const [notice, setNotice] = useState('');
  const [refreshState, setRefreshState] = useState<RefreshState>('idle');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const visible = useSyncExternalStore(subscribeFocus, () => focusManager.isFocused(), () => true);
  const online = useSyncExternalStore(subscribeOnline, () => onlineManager.isOnline(), () => true);

  const query = useQuery({
    ...statsOptions(days, version),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: automatic,
    refetchOnReconnect: automatic,
    refetchIntervalInBackground: false,
    refetchInterval: q => automatic ? pollDelay(q.state, q.queryKey) : false,
  });
  const { data: rawData, error, isFetching, isPlaceholderData, dataUpdatedAt, status, refetch } = query;
  const hidden = HIDE_DATA.has(error?.code ?? '');
  const data = hidden ? undefined : rawData;

  // swr로 받은 오래된 집계는 서버가 재집계를 시작했으므로 바로 최신 집계를 이어서 받는다.
  const followed = useRef(0);
  useEffect(() => {
    if (status !== 'success' || isPlaceholderData || isFetching || !rawData?.stale || followed.current === dataUpdatedAt) return;
    followed.current = dataUpdatedAt;
    void refetch({ cancelRefetch: false });
  }, [status, isPlaceholderData, isFetching, rawData, dataUpdatedAt, refetch]);

  // 안내 문구는 잠시 보여 준 뒤 사라진다.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4_500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (refreshState === 'idle' || refreshState === 'running') return;
    const timer = setTimeout(() => setRefreshState('idle'), refreshState === 'failed' ? 2_600 : 2_000);
    return () => clearTimeout(timer);
  }, [refreshState]);

  const refresh = useCallback(async () => {
    if (refreshState === 'running') return;
    if (Date.now() < cooldownUntil) { setNotice(`${Math.ceil((cooldownUntil - Date.now()) / 1000)}초 후 다시 갱신할 수 있습니다.`); return; }
    const id = keyId(statsKey(days, version));
    const before = client.getQueryData<StatsData>(statsKey(days, version));
    setCooldownUntil(Date.now() + COOLDOWN_MS);
    setNotice(''); setRefreshState('running');
    forced.add(id);
    try {
      // 진행 중인 자동 조회가 있으면 취소하고 강제 재집계로 바꾼다(서버는 진행 중 계산에 합류한다).
      const result = await refetch({ cancelRefetch: true });
      if (result.isError || !result.data) { setRefreshState('failed'); return; }
      const changed = !before || signature(before) !== signature(result.data);
      setRefreshState(changed ? 'done' : 'unchanged');
      setNotice(changed ? '최신 집계를 반영했습니다.' : '최신 집계를 확인했습니다 · 변동 없음');
    } finally { forced.delete(id); }
  }, [client, cooldownUntil, days, refreshState, refetch, version]);

  const prefetch = useCallback((d: Period, v: string) => { void client.prefetchQuery(statsOptions(d, v)); }, [client]);
  // 마우스를 잠시 올리거나 키보드로 초점을 옮기면 미리 불러온다. 스쳐 지나가는 경우는 무시한다.
  const intentTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const intent = useCallback((d: Period, v: string) => ({
    onPointerEnter: () => { clearTimeout(intentTimer.current); intentTimer.current = setTimeout(() => prefetch(d, v), INTENT_DELAY_MS); },
    onPointerLeave: () => clearTimeout(intentTimer.current),
    onFocus: () => prefetch(d, v),
  }), [prefetch]);
  useEffect(() => () => clearTimeout(intentTimer.current), []);

  const delay = automatic && !isFetching ? pollDelay(client.getQueryState<StatsData, DashboardError>(statsKey(days, version)), statsKey(days, version)) : false;
  const settledAt = Math.max(dataUpdatedAt, query.errorUpdatedAt);
  const nextRefreshAt = delay === false || !settledAt ? null : settledAt + delay;

  return {
    data, days, version, automatic, visible, online, notice, query, refresh, refreshState, cooldownUntil, nextRefreshAt,
    /** 기간·버전 전환 중 이전 조건의 집계를 보여 주는 상태 */
    isPlaceholder: !!data && isPlaceholderData,
    /** 저장된 집계를 보여 주면서 최신 집계를 받는 중 */
    isRevalidating: !!data?.stale && !isPlaceholderData,
    fatal: FATAL.has(error?.code ?? ''),
    intent,
    setDays: (value: Period) => { prefs.days = value; setDaysState(value); setNotice(''); },
    setVersion: (value: string) => { prefs.version = value; setVersionState(value); setNotice(''); },
    toggleAutomatic: () => setAutomatic(a => (prefs.automatic = !a)),
  };
}
