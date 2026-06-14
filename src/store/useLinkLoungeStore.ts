import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  createdAt: string;
}

interface LinkLoungeState {
  bookmarks: Bookmark[];
  viewMode: 'lineup' | 'showcase' | 'focus';
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  deleteBookmark: (id: string) => void;
  setViewMode: (mode: 'lineup' | 'showcase' | 'focus') => void;
}

export const useLinkLoungeStore = create<LinkLoungeState>()(
  persist(
    (set) => ({
      bookmarks: [],
      viewMode: 'showcase',
      
      addBookmark: (bookmarkData) => set((state) => ({
        bookmarks: [
          {
            ...bookmarkData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
          },
          ...state.bookmarks
        ]
      })),
      
      updateBookmark: (id, updates) => set((state) => ({
        bookmarks: state.bookmarks.map((bookmark) => 
          bookmark.id === id ? { ...bookmark, ...updates } : bookmark
        )
      })),
      
      deleteBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id)
      })),
      
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'calentask-link-lounge-storage',
    }
  )
);
