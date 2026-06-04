import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Database } from '@/types/supabase';
import { 
  getArchiveTabs, createArchiveTab, updateArchiveTab, deleteArchiveTab,
  getArchiveNotes, createArchiveNote, updateArchiveNote, deleteArchiveNote 
} from '@/app/actions/archive';
import { fetchTabsDirect, fetchNotesDirect, fetchAllNotesDirect } from '@/lib/archive-queries';

// Debounce timers for updateItem and updateTab to avoid flooding the server during typing
const updateTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const tabUpdateTimers: Record<string, ReturnType<typeof setTimeout>> = {};

type ArchiveTab = Database['public']['Tables']['archive_tabs']['Row'];
type Note = Database['public']['Tables']['notes']['Row'];
type AgendaTask = Database['public']['Tables']['agenda_tasks']['Row'];

export interface BoardItem {
  id: string;
  boardId: string;
  title: string;
  content?: string;
  status?: 'todo' | 'in-progress' | 'done';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  position: number;
  data?: Record<string, any>; // 다양한 보드(좌표, 서식, 썸네일 등)의 커스텀 데이터를 저장하는 필드
}

interface ArchiveState {
  // Security
  isPinLocked: boolean;
  setPinLocked: (locked: boolean) => void;

  // Tabs
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  tabs: ArchiveTab[];
  fetchTabs: () => Promise<void>;
  addTab: (tab: Partial<ArchiveTab>) => Promise<void>;
  updateTab: (id: string, updates: Partial<ArchiveTab>) => Promise<void>;
  deleteTab: (id: string) => Promise<void>;
  
  // Legacy setTabs for compatibility
  setTabs: (tabs: ArchiveTab[]) => void;

  // Global Command Palette (Cmd + K)
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Drag and Drop optimistic state
  optimisticAgendaTasks: AgendaTask[];
  setOptimisticAgendaTasks: (tasks: AgendaTask[]) => void;

  // Board Data Items
  items: Record<string, BoardItem[]>;
  boardConfigs: Record<string, any>;
  setBoardConfig: (boardId: string, config: any) => void;
  
  fetchItems: (boardId: string) => Promise<void>;
  addItem: (boardId: string, item: Partial<BoardItem>) => Promise<void>;
  updateItem: (boardId: string, itemId: string, updates: Partial<BoardItem>) => Promise<void>;
  deleteItem: (boardId: string, itemId: string) => Promise<void>;
  reorderItems: (boardId: string, startIndex: number, endIndex: number) => Promise<void>;
  flushPendingUpdates: () => Promise<void>;
  
  isPrefetched: boolean;
  prefetchArchive: () => Promise<void>;
}

// ============================================================
// 헬퍼: 노트 데이터를 BoardItem으로 변환
// ============================================================
function parseNoteToBoardItem(note: any): BoardItem {
  const content = note.content_data as any || {};
  return {
    id: note.id,
    boardId: note.tab_id,
    title: content.title || '무제',
    content: content.content || '',
    status: content.status || 'todo',
    tags: note.tags || [],
    createdAt: note.created_at || new Date().toISOString(),
    updatedAt: note.updated_at || new Date().toISOString(),
    position: content.position || 0,
    data: content.data || {}
  };
}

// ============================================================
// 헬퍼: 특정 boardId에 대기 중인 수정 타이머가 있는지 확인
// (Race condition 방어: 사용자 수정 중이면 서버 데이터 덮어쓰기 방지)
// ============================================================
function hasPendingUpdatesForBoard(boardId: string): boolean {
  return Object.keys(updateTimers).some(k => k.startsWith(boardId + ':'));
}

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set, get) => ({
  isPinLocked: false, // Secure by default
  setPinLocked: (locked) => set({ isPinLocked: locked }),

  activeTabId: null,
  setActiveTabId: (id) => set({ activeTabId: id }),
  tabs: [],
  
  isPrefetched: false,
  
  // ============================================================
  // 전략 1+2+4: 직접 호출 + 병렬 프리패칭 + 일괄 로딩
  // ============================================================
  prefetchArchive: async () => {
    if (get().isPrefetched) return;
    
    // 캐시가 있으면 즉시 탭 UI를 보여주되, isPrefetched는 아직 false로 유지
    // (isPrefetched가 true여야만 DocumentBoard가 빈 문서 자동 생성을 시도하므로,
    //  서버에서 노트 데이터가 도착하기 전까지 빈 문서 생성을 차단하는 핵심 안전장치)
    
    try {
      // 전략 1: 클라이언트에서 Supabase 직접 호출 (Server Action 우회)
      // 실패 시 Server Action 폴백
      let tabs = await fetchTabsDirect();
      if (!tabs) {
        tabs = await getArchiveTabs();
      }
      
      if (tabs.length > 0) {
        const firstTabId = get().activeTabId || tabs[0].id;
        // 탭은 먼저 세팅하되, isPrefetched는 아직 false 유지
        set({ tabs, activeTabId: firstTabId });
        
        // 전략 4: 모든 노트를 한 번의 쿼리로 일괄 로딩
        const allNotes = await fetchAllNotesDirect();
        if (allNotes) {
          // tab_id별 그룹핑
          const grouped: Record<string, BoardItem[]> = {};
          for (const note of allNotes) {
            const tabId = note.tab_id;
            if (!grouped[tabId]) grouped[tabId] = [];
            grouped[tabId].push(parseNoteToBoardItem(note));
          }
          // 각 그룹을 position 순으로 정렬
          for (const key of Object.keys(grouped)) {
            grouped[key].sort((a, b) => a.position - b.position);
          }
          
          // Race condition 방어: 수정 중인 탭은 서버 데이터로 덮어쓰지 않음
          const safeItems = { ...get().items };
          for (const [tabId, items] of Object.entries(grouped)) {
            if (!hasPendingUpdatesForBoard(tabId)) {
              safeItems[tabId] = items;
            }
          }
          // 노트 데이터 로딩이 완전히 끝난 후에야 isPrefetched를 true로 전환
          // → 이 시점부터 DocumentBoard의 빈 문서 자동 생성이 허용됨
          set({ items: safeItems, isPrefetched: true });
        } else {
          // 폴백: 활성 탭만 개별 로딩 후 isPrefetched 전환
          await get().fetchItems(firstTabId);
          set({ isPrefetched: true });
        }
      } else {
        set({ tabs, isPrefetched: true });
      }
    } catch (error) {
      console.error('Failed to prefetch archive:', error);
      // 최종 폴백: 기존 Server Action 방식
      try {
        const tabs = await getArchiveTabs();
        if (tabs.length > 0) {
          const firstTabId = tabs[0].id;
          await get().fetchItems(firstTabId);
          set({ tabs, activeTabId: firstTabId, isPrefetched: true });
        } else {
          set({ tabs, isPrefetched: true });
        }
      } catch (e) {
        console.error('Fallback also failed:', e);
        set({ isPrefetched: true }); // UI가 멈추지 않도록
      }
    }
  },

  fetchTabs: async () => {
    try {
      // 전략 1: 클라이언트 직접 호출 (폴백 포함)
      let data = await fetchTabsDirect();
      if (!data) {
        data = await getArchiveTabs();
      }
      
      let newActiveTabId = get().activeTabId;
      
      if (data.length > 0 && !newActiveTabId) {
        newActiveTabId = data[0].id;
      }
      
      // 전략 2: fetchItems 내부에서 백그라운드 최신화 처리
      if (newActiveTabId) {
        get().fetchItems(newActiveTabId);
      }
      
      set({ tabs: data, activeTabId: newActiveTabId });
    } catch (error) {
      console.error('Failed to fetch tabs:', error);
    }
  },

  addTab: async (tab) => {
    try {
      const created = await createArchiveTab({
        name: tab.name || '새 노트',
        board_type: tab.board_type || 'list',
        position: get().tabs.length,
        icon: tab.icon || null,
        is_secure: tab.is_secure || false
      });
      set(state => ({
        tabs: [...state.tabs, created],
        activeTabId: created.id
      }));
    } catch (error) {
      console.error('Failed to create tab:', error);
    }
  },

  updateTab: async (id, updates) => {
    // Optimistic update
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    
    // Debounced server sync
    if (tabUpdateTimers[id]) clearTimeout(tabUpdateTimers[id]);
    
    tabUpdateTimers[id] = setTimeout(async () => {
      try {
        const updatedTab = get().tabs.find(t => t.id === id);
        if (updatedTab) {
          await updateArchiveTab(id, {
            name: updatedTab.name,
            icon: updatedTab.icon,
            position: updatedTab.position,
            is_secure: updatedTab.is_secure,
            board_type: updatedTab.board_type
          });
        }
      } catch (error) {
        console.error('Failed to update tab:', error);
      }
      delete tabUpdateTimers[id];
    }, 500);
  },

  deleteTab: async (id) => {
    // 삭제 대상 탭과 소속 아이템들의 대기 중인 디바운스 타이머를 모두 정리
    if (tabUpdateTimers[id]) {
      clearTimeout(tabUpdateTimers[id]);
      delete tabUpdateTimers[id];
    }
    for (const key of Object.keys(updateTimers)) {
      if (key.startsWith(`${id}:`)) {
        clearTimeout(updateTimers[key]);
        delete updateTimers[key];
      }
    }

    const prevTabs = get().tabs;
    set(state => ({
      tabs: state.tabs.filter(t => t.id !== id),
      activeTabId: state.activeTabId === id ? (state.tabs.find(t => t.id !== id)?.id || null) : state.activeTabId
    }));
    try {
      await deleteArchiveTab(id);
    } catch (error) {
      console.error('Failed to delete tab:', error);
      set({ tabs: prevTabs }); // Rollback
    }
  },

  setTabs: (tabs) => set({ tabs }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  optimisticAgendaTasks: [],
  setOptimisticAgendaTasks: (tasks) => set({ optimisticAgendaTasks: tasks }),

  items: {},
  boardConfigs: {},
  setBoardConfig: (boardId, config) => set((state) => ({
    boardConfigs: { ...state.boardConfigs, [boardId]: { ...(state.boardConfigs[boardId] || {}), ...config } }
  })),

  fetchItems: async (boardId) => {
    try {
      // 전략 2: 이미 캐시에 있으면 백그라운드에서만 최신화
      const existingItems = get().items[boardId];
      
      // 전략 1: 클라이언트 직접 호출 (폴백 포함)
      let data = await fetchNotesDirect(boardId);
      if (!data) {
        data = await getArchiveNotes(boardId);
      }
      
      const parsedItems: BoardItem[] = data.map(parseNoteToBoardItem);
      parsedItems.sort((a, b) => a.position - b.position);
      
      // Race condition 방어: 수정 중이면 서버 데이터 적용 스킵
      if (hasPendingUpdatesForBoard(boardId)) {
        return; // 사용자 입력 우선
      }
      
      // Stale cache flash 방지: 데이터가 동일하면 리렌더링 스킵
      if (existingItems && JSON.stringify(existingItems) === JSON.stringify(parsedItems)) {
        return;
      }
      
      set(state => ({ items: { ...state.items, [boardId]: parsedItems } }));
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  },

  addItem: async (boardId, item) => {
    // 임시 ID 대신 클라이언트에서 UUID를 생성하여 고정시킵니다.
    // 이를 통해 생성 직후 연속된 타이핑(updateItem) 시 발생하는 ID 불일치에 의한 저장 누락을 방지합니다.
    const tempId = item.id || crypto.randomUUID();
    const boardItems = get().items[boardId] || [];
    const newItem: BoardItem = {
      id: tempId,
      boardId,
      title: item.title || '',
      content: item.content || '',
      status: item.status || 'todo',
      tags: item.tags || [],
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      position: item.position !== undefined ? item.position : boardItems.length,
      data: item.data || {},
      ...item
    };
    
    set(state => ({ items: { ...state.items, [boardId]: [...(state.items[boardId] || []), newItem] } }));
    
    try {
      const created = await createArchiveNote({
        id: tempId, // 생성한 UUID를 DB에 그대로 전달
        tab_id: boardId,
        tags: newItem.tags,
        is_pinned: false,
        content_data: {
          title: newItem.title,
          content: newItem.content,
          status: newItem.status,
          position: newItem.position,
          data: newItem.data
        }
      });
      
      const createdItem: BoardItem = { ...newItem, id: created.id };
      set(state => ({
        items: {
          ...state.items,
          [boardId]: (state.items[boardId] || []).map(i => i.id === tempId ? createdItem : i)
        }
      }));
    } catch (error) {
      console.error('Failed to create item:', error);
      set(state => ({
        items: {
          ...state.items,
          [boardId]: (state.items[boardId] || []).filter(i => i.id !== tempId)
        }
      }));
    }
  },

  updateItem: async (boardId, itemId, updates) => {
    // 1. Optimistic local update (instant)
    set(state => {
      const boardItems = state.items[boardId] || [];
      return {
        items: {
          ...state.items,
          [boardId]: boardItems.map(item => item.id === itemId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item)
        }
      };
    });

    // 2. Debounced server sync (500ms after last call)
    const timerKey = `${boardId}:${itemId}`;
    if (updateTimers[timerKey]) clearTimeout(updateTimers[timerKey]);
    
    updateTimers[timerKey] = setTimeout(async () => {
      try {
        const updatedItem = get().items[boardId]?.find(i => i.id === itemId);
        if (updatedItem) {
          await updateArchiveNote(itemId, {
            tags: updatedItem.tags,
            content_data: {
              title: updatedItem.title,
              content: updatedItem.content,
              status: updatedItem.status,
              position: updatedItem.position,
              data: updatedItem.data
            }
          });
        }
      } catch (error) {
        console.error('Failed to update item:', error);
      }
      delete updateTimers[timerKey];
    }, 500);
  },

  deleteItem: async (boardId, itemId) => {
    // 삭제 대상에 대한 대기 중인 디바운스 타이머를 먼저 정리하여 유령 업데이트 방지
    const timerKey = `${boardId}:${itemId}`;
    if (updateTimers[timerKey]) {
      clearTimeout(updateTimers[timerKey]);
      delete updateTimers[timerKey];
    }

    const prevItems = get().items;
    set(state => ({
      items: {
        ...state.items,
        [boardId]: (state.items[boardId] || []).filter(item => item.id !== itemId)
      }
    }));

    try {
      await deleteArchiveNote(itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
      set({ items: prevItems });
    }
  },

  reorderItems: async (boardId, startIndex, endIndex) => {
    const prevItems = get().items;
    let reordered: BoardItem[] = [];
    
    set(state => {
      const boardItems = Array.from(state.items[boardId] || []);
      const [removed] = boardItems.splice(startIndex, 1);
      boardItems.splice(endIndex, 0, removed);
      
      reordered = boardItems.map((item, idx) => ({ ...item, position: idx }));
      return {
        items: { ...state.items, [boardId]: reordered }
      };
    });

    try {
      for (const item of reordered) {
        await updateArchiveNote(item.id, {
          content_data: {
            title: item.title,
            content: item.content,
            status: item.status,
            position: item.position,
            data: item.data
          }
        });
      }
    } catch (error) {
      console.error('Failed to reorder items:', error);
      set({ items: prevItems });
    }
  },

  flushPendingUpdates: async () => {
    const promises: Promise<void>[] = [];
    
    // Flush tab timers
    for (const id of Object.keys(tabUpdateTimers)) {
      clearTimeout(tabUpdateTimers[id]);
      const updatedTab = get().tabs.find(t => t.id === id);
      if (updatedTab) {
        promises.push(updateArchiveTab(id, {
          name: updatedTab.name,
          icon: updatedTab.icon,
          position: updatedTab.position,
          is_secure: updatedTab.is_secure,
          board_type: updatedTab.board_type
        }).catch(console.error).then(() => {}));
      }
      delete tabUpdateTimers[id];
    }

    // Flush item timers
    for (const key of Object.keys(updateTimers)) {
      clearTimeout(updateTimers[key]);
      const [boardId, itemId] = key.split(':');
      const updatedItem = get().items[boardId]?.find(i => i.id === itemId);
      if (updatedItem) {
        promises.push(updateArchiveNote(itemId, {
          tags: updatedItem.tags,
          content_data: {
            title: updatedItem.title,
            content: updatedItem.content,
            status: updatedItem.status,
            position: updatedItem.position,
            data: updatedItem.data
          }
        }).catch(console.error).then(() => {}));
      }
      delete updateTimers[key];
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  },
    }),
    {
      name: 'archive-store',
      version: 1,
      // 전략 3: 탭 목록과 설정만 localStorage에 캐싱
      // 노트 데이터(items)는 캐싱하지 않음 → 항상 서버에서 최신 데이터를 받아와야 함
      // (다른 컴퓨터에서 작성한 내용이 현재 컴퓨터에서 보이지 않는 문제의 근본 원인이었음)
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        boardConfigs: state.boardConfigs,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        isPrefetched: false, // 매 로드마다 서버에서 노트를 새로 가져오도록 강제
        items: {},           // 캐시된 노트 데이터 무시 → 서버 데이터만 사용
      }),
      // localStorage 용량 초과 시 graceful 처리
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            // QuotaExceededError 등: 캐시 저장 실패해도 앱은 정상 작동
            console.warn('[archive-store] localStorage save failed, clearing old cache:', e);
            try {
              localStorage.removeItem(name);
              localStorage.setItem(name, JSON.stringify(value));
            } catch {
              // 완전히 실패해도 무시 — 캐시 없이 서버만 사용
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // 무시
          }
        },
      },
    }
  )
);

// 페이지 이탈 시 데이터 유실 방지(Unload Protection) 안전장치
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (Object.keys(updateTimers).length > 0 || Object.keys(tabUpdateTimers).length > 0) {
      // 강제로 즉시 동기화 시도 (네트워크 환경에 따라 보장되지 않을 수 있으므로 경고창 띄움)
      useArchiveStore.getState().flushPendingUpdates();
      
      e.preventDefault();
      e.returnValue = '변경사항이 아직 저장되지 않았습니다. 나가시겠습니까?';
      return e.returnValue;
    }
  });
}
