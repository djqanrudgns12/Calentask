import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { mock, test } from 'node:test';
import { DOCUMENT_FONT_STYLES, loadDocumentFonts } from '../src/lib/documentFonts';
import { isChunkLoadError } from '../src/lib/chunkLoadError';
import { clearPwaResourceCaches, reloadAppResources } from '../src/lib/pwaResources';

const origin = 'https://calentask.test';
const workerCode = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function worker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const entries = new Map<string, Response>();
  const cache = {
    match: mock.fn(async (request: Request) => entries.get(request.url)?.clone()),
    put: mock.fn(async (request: Request, response: Response) => { entries.set(request.url, response); }),
  };
  const storage = {
    keys: mock.fn(async () => ['calentask-pwa-cache-v5', 'calentask-pwa-cache-v6', '다른-기능-캐시']),
    delete: mock.fn(async (name: string) => name.startsWith('calentask-pwa-cache-')),
    open: mock.fn(async () => cache),
  };
  const network = mock.fn(async () => new Response('편집기 스타일', { headers: { 'Content-Type': 'text/css' } }));
  const claim = mock.fn(async () => {});
  runInNewContext(workerCode, {
    URL, caches: storage, fetch: network,
    self: { location: { origin }, clients: { claim }, skipWaiting() {},
      addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, listener) },
  });
  function request(path: string, method = 'GET') {
    let response: Promise<Response> | undefined;
    listeners.get('fetch')!({ request: new Request(new URL(path, origin), { method }),
      respondWith(pending: Promise<Response>) { response = pending; } });
    return response;
  }
  return { listeners, storage, cache, network, claim, request };
}

test('글꼴 스타일 실패가 편집기 청크의 필수 의존성에 포함되지 않는다', () => {
  const css = readFileSync(new URL('../src/components/archive/boards/DocumentBoardFonts.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /^\s*@import\b/m);
  const links = new Map<string, HTMLLinkElement>();
  const target = {
    getElementById: (id: string) => links.get(id),
    createElement: () => ({}),
    head: { append(link: HTMLLinkElement) { links.set(link.id, link); } },
  } as unknown as Document;
  assert.equal(loadDocumentFonts(target), undefined);
  loadDocumentFonts(target);
  assert.equal(links.size, DOCUMENT_FONT_STYLES.length);
  for (const link of links.values()) {
    assert.equal(link.rel, 'stylesheet');
    assert.equal(link.onerror, undefined);
  }
});

test('CSS·JS 청크 오류만 파일 재로딩 대상으로 구분한다', () => {
  for (const error of [
    { name: 'ChunkLoadError', message: '청크 실패' },
    new Error('Failed to load chunk /_next/static/chunks/editor.css?dpl=build-a from module 231255'),
    new Error('Loading CSS chunk 12 failed.'),
    new Error('Failed to fetch dynamically imported module'),
    new Error('Importing a module script failed.'),
  ]) assert.equal(isChunkLoadError(error), true);
  for (const error of [null, '조회 실패', new Error('DB 연결 실패'), new TypeError('Failed to fetch')]) {
    assert.equal(isChunkLoadError(error), false);
  }
});

test('HTML·RSC·API·외부 글꼴·POST 요청은 서비스 워커 캐시를 통과한다', () => {
  const state = worker();
  for (const path of ['/', '/archive/notes', '/?_rsc=abc', '/api/view-data', '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Jua', `${origin}.example.com/_next/static/editor.css`]) {
    assert.equal(state.request(path), undefined);
  }
  assert.equal(state.request('/_next/static/chunks/editor.css', 'POST'), undefined);
  assert.equal(state.network.mock.callCount(), 0);
  assert.equal(state.storage.open.mock.callCount(), 0);
});

test('같은 배포의 스타일을 재사용하고 다른 배포의 파일로 대체하지 않는다', async () => {
  const state = worker();
  assert.equal(await (await state.request('/_next/static/chunks/editor.css?dpl=build-a'))!.text(), '편집기 스타일');
  await state.request('/_next/static/chunks/editor.css?dpl=build-a');
  assert.equal(state.network.mock.callCount(), 1);
  await state.request('/_next/static/chunks/editor.css?dpl=build-b');
  assert.equal(state.network.mock.callCount(), 2);
});

test('404 또는 HTML 오류 응답은 CSS 캐시를 오염시키지 않는다', async () => {
  const state = worker();
  state.network.mock.mockImplementation(async () => new Response('파일 없음', { status: 404 }));
  assert.equal((await state.request('/_next/static/chunks/missing.css'))!.status, 404);
  state.network.mock.mockImplementation(async () => new Response('로그인 문서', { headers: { 'Content-Type': 'text/html' } }));
  await state.request('/_next/static/chunks/editor.css');
  assert.equal(state.cache.put.mock.callCount(), 0);
});

test('캐시 접근 실패나 저장 공간 부족은 파일 조회를 막지 않는다', async () => {
  const state = worker();
  state.storage.open.mock.mockImplementation(async () => { throw new Error('저장소 차단'); });
  assert.equal((await state.request('/_next/static/chunks/editor.css'))!.status, 200);
  state.storage.open.mock.mockImplementation(async () => state.cache);
  state.cache.put.mock.mockImplementation(async () => { throw new Error('저장 공간 부족'); });
  assert.equal((await state.request('/_next/static/chunks/editor.css'))!.status, 200);
});

test('워커 업데이트는 이전 앱 캐시만 정리한다', async () => {
  const state = worker();
  let completed: Promise<unknown> | undefined;
  state.listeners.get('activate')!({ waitUntil(pending: Promise<unknown>) { completed = pending; } });
  await completed;
  assert.deepEqual(state.storage.delete.mock.calls.map(call => call.arguments[0]), ['calentask-pwa-cache-v5']);
  assert.equal(state.claim.mock.callCount(), 1);
});

test('파일 재시도 캐시 정리는 다른 기능의 저장소를 보존한다', async () => {
  const state = worker();
  await clearPwaResourceCaches(state.storage as unknown as CacheStorage);
  assert.deepEqual(state.storage.delete.mock.calls.map(call => call.arguments[0]),
    ['calentask-pwa-cache-v5', 'calentask-pwa-cache-v6']);
});

test('파일 오류 재시도는 캐시 실패에도 실제 페이지를 다시 불러온다', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const reload = mock.fn();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    caches: { keys: async () => { throw new Error('캐시 차단'); } }, location: { reload },
    get localStorage() { throw new Error('노트 저장소를 건드리면 안 된다'); },
  } });
  try {
    await reloadAppResources();
    assert.equal(reload.mock.callCount(), 1);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('캐시 조회가 멈춰도 재시도는 제한 시간 뒤에 완료된다', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const reload = mock.fn();
  mock.timers.enable({ apis: ['setTimeout'] });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    caches: { keys: () => new Promise(() => {}) }, location: { reload },
  } });
  try {
    const pending = reloadAppResources();
    mock.timers.tick(1500);
    await pending;
    assert.equal(reload.mock.callCount(), 1);
  } finally {
    mock.timers.reset();
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
