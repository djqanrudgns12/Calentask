export const PWA_CACHE_PREFIX = 'calentask-pwa-cache-';

export async function clearPwaResourceCaches(storage: CacheStorage): Promise<void> {
  const names = await storage.keys();
  await Promise.all(names.filter(name => name.startsWith(PWA_CACHE_PREFIX)).map(name => storage.delete(name)));
}

export async function reloadAppResources(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if ('caches' in window) {
      // 캐시가 응답하지 않아도 재시도 버튼이 멈추지 않게 제한한다.
      await Promise.race([
        clearPwaResourceCaches(window.caches),
        new Promise<void>(resolve => { timer = setTimeout(resolve, 1500); }),
      ]);
    }
  } catch {
    // 저장소 접근이 차단되어도 최신 문서와 모듈을 다시 요청한다.
  } finally {
    if (timer) clearTimeout(timer);
    window.location.reload();
  }
}
