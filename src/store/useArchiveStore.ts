import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Database } from '@/types/supabase';
import { dexieStorage } from '@/lib/dexie';

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
  addItem: (boardId: string, item: Partial<BoardItem>) => void;
  updateItem: (boardId: string, itemId: string, updates: Partial<BoardItem>) => void;
  deleteItem: (boardId: string, itemId: string) => void;
  reorderItems: (boardId: string, startIndex: number, endIndex: number) => void;
}

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set) => ({
      isPinLocked: true, // Secure by default
      setPinLocked: (locked) => set({ isPinLocked: locked }),

      activeTabId: null,
      setActiveTabId: (id) => set({ activeTabId: id }),
      tabs: [],
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
      addItem: (boardId, item) => set((state) => {
        const boardItems = state.items[boardId] || [];
        const newItem: BoardItem = {
          id: item.id || Date.now().toString(),
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
        return { items: { ...state.items, [boardId]: [...boardItems, newItem] } };
      }),
      updateItem: (boardId, itemId, updates) => set((state) => {
        const boardItems = state.items[boardId] || [];
        return {
          items: {
            ...state.items,
            [boardId]: boardItems.map(item => item.id === itemId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item)
          }
        };
      }),
      deleteItem: (boardId, itemId) => set((state) => {
        const boardItems = state.items[boardId] || [];
        return {
          items: {
            ...state.items,
            [boardId]: boardItems.filter(item => item.id !== itemId)
          }
        };
      }),
      reorderItems: (boardId, startIndex, endIndex) => set((state) => {
        const boardItems = Array.from(state.items[boardId] || []);
        const [removed] = boardItems.splice(startIndex, 1);
        boardItems.splice(endIndex, 0, removed);
        
        // Update positions
        const reordered = boardItems.map((item, idx) => ({ ...item, position: idx }));
        return {
          items: {
            ...state.items,
            [boardId]: reordered
          }
        };
      }),
    }),
    {
      name: 'archive-storage',
      storage: createJSONStorage(() => dexieStorage),
      partialize: (state) => ({ 
        tabs: state.tabs, 
        optimisticAgendaTasks: state.optimisticAgendaTasks,
        items: state.items,
        boardConfigs: state.boardConfigs
      }), // Persist tabs, items, configs and agenda tasks
    }
  )
);
