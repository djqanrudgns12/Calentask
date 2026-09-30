const CACHE_PREFIX = 'calentask-pwa-cache-';
const CACHE_NAME = `${CACHE_PREFIX}v6`;

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // 로그인 문서·RSC·API는 직접 요청한다. 이전 HTML과 새로운 배포의 파일을 섞지 않는다.
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
    !url.pathname.startsWith('/_next/static/') || !/\.(?:js|css|woff2?|ttf|otf)$/.test(url.pathname)) return;

  event.respondWith((async () => {
    // 해시와 배포 ID를 포함한 URL 그대로 조회한다. 다른 배포의 청크로 대체하지 않는다.
    let cache;
    try {
      cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
    } catch { /* 캐시 장애는 정상적인 네트워크 조회를 막지 않는다. */ }

    const response = await fetch(request);
    const contentType = response.headers.get('content-type') || '';
    const isScript = url.pathname.endsWith('.js');
    const isStyle = url.pathname.endsWith('.css');
    const expectedType = isScript ? /(?:java|ecma)script/i.test(contentType)
      : isStyle ? /text\/css/i.test(contentType) : /font|octet-stream/i.test(contentType);
    if (cache && response.status === 200 && !response.redirected && expectedType) {
      try { await cache.put(request, response.clone()); } catch { /* 저장 공간이 부족해도 화면은 열린다. */ }
    }
    return response;
  })());
});
