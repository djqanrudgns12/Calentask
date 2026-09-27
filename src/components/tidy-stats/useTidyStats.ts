'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Period, StatsData } from '@/lib/tidy-stats/model';

class DashboardError extends Error {
  constructor(message: string, public code: string) { super(message); }
}

export function useTidyStats() {
  const [days, setDays] = useState<Period>(7);
  const [version, setVersion] = useState('all');
  const [automatic, setAutomatic] = useState(true);
  const [visible, setVisible] = useState(true);
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState('');
  const force = useRef(false);
  const cooldown = useRef(0);

  useEffect(() => {
    const update = () => { setVisible(document.visibilityState === 'visible'); setOnline(navigator.onLine); };
    update();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const query = useQuery<StatsData, DashboardError>({
    queryKey: ['tidy-stats', days, version], staleTime: 5 * 60_000, retry: false,
    refetchOnWindowFocus: automatic, refetchOnReconnect: automatic,
    refetchIntervalInBackground: false,
    refetchInterval: q => !automatic || !visible || !online ||
      ['UNAUTHENTICATED', 'FORBIDDEN', 'SETUP_REQUIRED', 'POSTHOG_ACCESS'].includes(q.state.error?.code ?? '')
      ? false : q.state.error ? Math.min(15 * 60_000, 60_000 * 2 ** Math.min(q.state.errorUpdateCount, 4)) : 5 * 60_000,
    queryFn: async ({ signal }) => {
      const refresh = force.current;
      force.current = false;
      const response = await fetch('/api/tidy-stats', {
        method: 'POST', cache: 'no-store', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, version, refresh }),
      });
      if (response.redirected || response.headers.get('content-type')?.includes('text/html')) {
        throw new DashboardError('로그인이 만료되었습니다. 다시 로그인해 주세요.', 'UNAUTHENTICATED');
      }
      const result = await response.json();
      if (!response.ok) throw new DashboardError(result.error || '통계를 불러오지 못했습니다.', result.code);
      return result;
    },
  });

  const refresh = useCallback(async () => {
    if (query.isFetching) return;
    if (Date.now() < cooldown.current) { setNotice('15초 후 다시 갱신할 수 있습니다.'); return; }
    cooldown.current = Date.now() + 15_000;
    setNotice(''); force.current = true;
    const result = await query.refetch();
    if (!result.isError) setNotice('최신 집계로 갱신했습니다.');
  }, [query]);

  const data = ['UNAUTHENTICATED', 'FORBIDDEN'].includes(query.error?.code ?? '') ? undefined : query.data;
  return { data, days, version, automatic, visible, online, notice, query, refresh,
    setDays: (value: Period) => { setDays(value); setNotice(''); },
    setVersion: (value: string) => { setVersion(value); setNotice(''); },
    toggleAutomatic: () => setAutomatic(a => !a) };
}
