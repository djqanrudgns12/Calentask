import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Database } from '@/types/supabase';

type ArchiveTab = Database['public']['Tables']['archive_tabs']['Row'];
type Note = Database['public']['Tables']['notes']['Row'];
type AgendaTask = Database['public']['Tables']['agenda_tasks']['Row'];

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
    }),
    {
      name: 'archive-storage',
      partialize: (state) => ({ 
        tabs: state.tabs, 
        optimisticAgendaTasks: state.optimisticAgendaTasks 
      }), // Persist tabs and agenda tasks, keep security state ephemeral
    }
  )
);
