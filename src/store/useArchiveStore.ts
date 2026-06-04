import { create } from 'zustand';
import { Database } from '@/types/supabase';
import { 
  getArchiveTabs, createArchiveTab, updateArchiveTab, deleteArchiveTab,
  getArchiveNotes, createArchiveNote, updateArchiveNote, deleteArchiveNote 
} from '@/app/actions/archive';

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
}

export const useArchiveStore = create<ArchiveState>()((set, get) => ({
  isPinLocked: false, // Secure by default
  setPinLocked: (locked) => set({ isPinLocked: locked }),

  activeTabId: null,
  setActiveTabId: (id) => set({ activeTabId: id }),
  tabs: [],
  
  fetchTabs: async () => {
    try {
      const data = await getArchiveTabs();
      set({ tabs: data });
      if (data.length > 0 && !get().activeTabId) {
        set({ activeTabId: data[0].id });
      }
    } catch (error) {
      console.error('Failed to fetch archive tabs:', error);
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
        // Note: we could rollback here by fetching tabs, but since it's debounced,
        // rolling back to a stale prevTabs might be tricky. For now, rely on error logs.
      }
      delete tabUpdateTimers[id];
    }, 500);
  },

  deleteTab: async (id) => {
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
      const data = await getArchiveNotes(boardId);
      const parsedItems: BoardItem[] = data.map((note: any) => {
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
      });
      parsedItems.sort((a, b) => a.position - b.position);
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
      // In a real production app, we might want a bulk update endpoint, 
      // but for now we update one by one or rely on local state ordering mostly.
      // We will loop and update position in background
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
}));

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
