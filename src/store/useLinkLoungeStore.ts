import { create } from 'zustand';

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string;
  category: string;
  icon: string;
  createdAt: string;
  deletedAt?: string | null;
}

interface LinkLoungeState {
  viewMode: 'lineup' | 'showcase' | 'focus';
  setViewMode: (mode: 'lineup' | 'showcase' | 'focus') => void;
}

export const useLinkLoungeStore = create<LinkLoungeState>((set) => ({
  viewMode: 'showcase',
  setViewMode: (mode) => set({ viewMode: mode }),
}));
