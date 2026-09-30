'use client'

import { useEffect } from 'react';
import { clearPwaResourceCaches } from '@/lib/pwaResources';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    async function register() {
      if (process.env.NODE_ENV === 'production') {
        await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      } else {
        // 개발 서버에는 이전 프로덕션 청크와 HTML 캐시를 적용하지 않는다.
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.filter(registration => {
          const worker = registration.active ?? registration.waiting ?? registration.installing;
          return worker?.scriptURL === new URL('/sw.js', window.location.origin).href;
        }).map(registration => registration.unregister()));
        if ('caches' in window) await clearPwaResourceCaches(window.caches);
      }
    }
    void register().catch(error => { console.warn('[SW] 등록 또는 정리 실패:', error); });
  }, []);
  return null;
}
