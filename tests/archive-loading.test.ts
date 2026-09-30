import assert from 'node:assert/strict';
import { after, before, beforeEach, mock, test } from 'node:test';
import type { Database } from '../src/types/supabase';

type Tab = Database['public']['Tables']['archive_tabs']['Row'];
type Note = Database['public']['Tables']['notes']['Row'];
const tab = { id: 'tab-a', name: '기존 문서', board_type: 'list', position: 0 } as Tab;
const note = { id: 'note-a', tab_id: tab.id, content_data: { title: '기존 문서', content: '보존할 내용' }, tags: [], created_at: '2026-09-30T00:00:00Z' } as unknown as Note;
const tabs = mock.fn(async (): Promise<Tab[] | null> => [tab]);
const notes = mock.fn(async (): Promise<Note[] | null> => [note]);
const fallbackTabs = mock.fn(async (): Promise<Tab[]> => [tab]);
const fallbackNotes = mock.fn(async (): Promise<Note[]> => [note]);

// 외부 조회만 대체하고 실제 저장소의 초기화·탭 전환·오류 처리를 실행한다.
mock.module('../src/lib/archive-queries.ts', { namedExports: {
  fetchTabsDirect: tabs, fetchNotesDirect: notes, fetchAllNotesDirect: async () => [note],
} });
mock.module('../src/app/actions/archive.ts', { namedExports: {
  getArchiveTabs: fallbackTabs, getArchiveNotes: fallbackNotes,
  createArchiveTab: async () => tab, createArchiveNote: async () => note,
  updateArchiveTab: async () => {}, deleteArchiveTab: async () => {},
  updateArchiveNote: async () => {}, deleteArchiveNote: async () => {},
} });
let useArchiveStore: typeof import('../src/store/useArchiveStore').useArchiveStore;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
before(async () => {
  const saved = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (name: string) => saved.get(name) ?? null,
    setItem: (name: string, value: string) => { saved.set(name, value); },
    removeItem: (name: string) => { saved.delete(name); },
  } });
  ({ useArchiveStore } = await import('../src/store/useArchiveStore'));
});
after(() => {
  mock.restoreAll();
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

beforeEach(() => {
  for (const fn of [tabs, notes, fallbackTabs, fallbackNotes]) fn.mock.resetCalls();
  tabs.mock.mockImplementation(async () => [tab]);
  notes.mock.mockImplementation(async () => [note]);
  fallbackTabs.mock.mockImplementation(async () => [tab]);
  fallbackNotes.mock.mockImplementation(async () => [note]);
  useArchiveStore.setState({ tabs: [], items: {}, activeTabId: null, isPrefetched: false, loadError: null, itemLoadErrors: {} });
});

test('홈 사전 로딩 없이 노트에 직접 진입해도 문서 로딩을 완료한다', async () => {
  await useArchiveStore.getState().fetchTabs();
  const state = useArchiveStore.getState();
  assert.equal(state.isPrefetched, true);
  assert.equal(state.activeTabId, tab.id);
  assert.equal(state.items[tab.id][0].content, '보존할 내용');
  assert.equal(state.loadError, null);
});

test('삭제된 활성 탭은 첫 탭으로 복구하고 노트가 없으면 선택을 해제한다', async () => {
  useArchiveStore.setState({ activeTabId: '삭제된 탭' });
  await useArchiveStore.getState().fetchTabs();
  assert.equal(useArchiveStore.getState().activeTabId, tab.id);
  tabs.mock.mockImplementation(async () => []);
  await useArchiveStore.getState().fetchTabs();
  assert.equal(useArchiveStore.getState().activeTabId, null);
  assert.equal(useArchiveStore.getState().isPrefetched, true);
});

test('동시 초기화와 같은 탭 조회는 기존 요청을 공유한다', async () => {
  await Promise.all([useArchiveStore.getState().fetchTabs(), useArchiveStore.getState().fetchTabs()]);
  assert.equal(tabs.mock.callCount(), 1);
  assert.equal(notes.mock.callCount(), 1);
  notes.mock.resetCalls();
  await Promise.all([useArchiveStore.getState().fetchItems(tab.id), useArchiveStore.getState().fetchItems(tab.id)]);
  assert.equal(notes.mock.callCount(), 1);
});

test('노트 조회 실패는 빈 문서로 바꾸지 않고 재시도로 복구한다', async () => {
  const log = mock.method(console, 'error', () => {});
  try {
    notes.mock.mockImplementation(async () => null);
    fallbackNotes.mock.mockImplementation(async () => { throw new Error('연결 실패'); });
    await useArchiveStore.getState().fetchTabs();
    assert.equal(useArchiveStore.getState().isPrefetched, false);
    assert.equal(useArchiveStore.getState().items[tab.id], undefined);
    assert.ok(useArchiveStore.getState().loadError);
    assert.ok(useArchiveStore.getState().itemLoadErrors[tab.id]);
    notes.mock.mockImplementation(async () => [note]);
    await useArchiveStore.getState().fetchTabs();
    assert.equal(useArchiveStore.getState().isPrefetched, true);
    assert.equal(useArchiveStore.getState().loadError, null);
    assert.equal(useArchiveStore.getState().itemLoadErrors[tab.id], undefined);
  } finally { log.mock.restore(); }
});

test('탭 전환은 해당 탭 조회가 성공한 뒤에만 빈 결과를 확정한다', async () => {
  await useArchiveStore.getState().fetchTabs();
  useArchiveStore.getState().setActiveTabId('tab-b');
  assert.equal(useArchiveStore.getState().items['tab-b'], undefined);
  notes.mock.mockImplementation(async () => []);
  assert.equal(await useArchiveStore.getState().fetchItems('tab-b'), true);
  assert.deepEqual(useArchiveStore.getState().items['tab-b'], []);
  assert.equal(useArchiveStore.getState().items[tab.id][0].content, '보존할 내용');
});

test('직접 조회 실패 시 서버 조회로 문서 내용을 복구한다', async () => {
  tabs.mock.mockImplementation(async () => null);
  notes.mock.mockImplementation(async () => null);
  await useArchiveStore.getState().fetchTabs();
  assert.equal(fallbackTabs.mock.callCount(), 1);
  assert.equal(fallbackNotes.mock.callCount(), 1);
  assert.equal(useArchiveStore.getState().isPrefetched, true);
  assert.equal(useArchiveStore.getState().items[tab.id][0].content, '보존할 내용');
});

test('서버 폴백이 응답하지 않아도 제한 시간 뒤에 오류로 복구한다', async () => {
  const log = mock.method(console, 'error', () => {});
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    notes.mock.mockImplementation(async () => null);
    fallbackNotes.mock.mockImplementation(() => new Promise(() => {}));
    const pending = useArchiveStore.getState().fetchItems(tab.id);
    await Promise.resolve();
    mock.timers.tick(15_000);
    assert.equal(await pending, false);
    assert.equal(useArchiveStore.getState().items[tab.id], undefined);
    assert.ok(useArchiveStore.getState().itemLoadErrors[tab.id]);
  } finally { mock.timers.reset(); log.mock.restore(); }
});
