import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 북마크 단일 항목 인터페이스
// - category: 단일 카테고리 (폴더 개념, 기본값 '기타')
// - icon: 파비콘 data URI 또는 URL (크롬 북마크 가져오기 시 활용)
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
  bookmarks: Bookmark[];
  categories: string[];
  viewMode: 'lineup' | 'showcase' | 'focus';
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  deleteBookmark: (id: string) => void;
  setViewMode: (mode: 'lineup' | 'showcase' | 'focus') => void;
  // 벌크 가져오기 액션 — 크롬 북마크 Import 시 사용
  importBookmarks: (items: Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>[]) => void;
  // 카테고리 관리 함수
  addCategory: (name: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  deleteCategory: (name: string, deleteLinks: boolean) => void;
  reorderCategories: (newOrder: string[]) => void;
  // 북마크 순서 변경
  reorderBookmarks: (activeId: string, overId: string) => void;
  // 휴지통 관련 함수
  getDeletedBookmarks: () => Bookmark[];
  restoreBookmark: (id: string) => void;
  hardDeleteBookmark: (id: string) => void;
  emptyBookmarkTrash: () => void;
  cleanupExpiredBookmarks: (days: number) => void;
}

export const useLinkLoungeStore = create<LinkLoungeState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      categories: ['기타'],
      viewMode: 'showcase',
      
      addBookmark: (bookmarkData) => set((state) => {
        const category = bookmarkData.category?.trim() || '기타';
        const newCategories = state.categories.includes(category) 
          ? state.categories 
          : [...state.categories, category];
          
        return {
          categories: newCategories,
          bookmarks: [
            {
              ...bookmarkData,
              category,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              deletedAt: null
            },
            ...state.bookmarks
          ]
        };
      }),
      
      updateBookmark: (id, updates) => set((state) => {
        const updatedCategory = updates.category !== undefined ? updates.category.trim() || '기타' : undefined;
        let newCategories = state.categories;
        if (updatedCategory && !state.categories.includes(updatedCategory)) {
          newCategories = [...state.categories, updatedCategory];
        }
        
        return {
          categories: newCategories,
          bookmarks: state.bookmarks.map((bookmark) => 
            bookmark.id === id 
              ? { 
                  ...bookmark, 
                  ...updates,
                  ...(updatedCategory !== undefined ? { category: updatedCategory } : {})
                } 
              : bookmark
          )
        };
      }),
      
      // 소프트 삭제: deletedAt 타임스탬프 추가
      deleteBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.map((bookmark) => 
          bookmark.id === id
            ? { ...bookmark, deletedAt: new Date().toISOString() }
            : bookmark
        )
      })),
      
      setViewMode: (mode) => set({ viewMode: mode }),

      // 벌크 가져오기
      importBookmarks: (items) => set((state) => {
        const newCategoriesSet = new Set(state.categories);
        const newBookmarks = items.map((item) => {
          const category = item.category?.trim() || '기타';
          newCategoriesSet.add(category);
          return {
            ...item,
            category,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            deletedAt: null as string | null
          };
        });
        
        return {
          categories: Array.from(newCategoriesSet),
          bookmarks: [...newBookmarks, ...state.bookmarks]
        };
      }),

      addCategory: (name) => set((state) => {
        const trimmed = name.trim();
        if (!trimmed || state.categories.includes(trimmed)) return state;
        return { categories: [...state.categories, trimmed] };
      }),

      renameCategory: (oldName, newName) => set((state) => {
        const trimmed = newName.trim();
        if (!trimmed || state.categories.includes(trimmed)) return state;
        return {
          categories: state.categories.map(c => c === oldName ? trimmed : c),
          bookmarks: state.bookmarks.map(b => b.category === oldName ? { ...b, category: trimmed } : b)
        };
      }),

      deleteCategory: (name, deleteLinks) => set((state) => {
        const newCategories = state.categories.filter(c => c !== name);
        if (!deleteLinks && !newCategories.includes('기타')) {
          newCategories.push('기타');
        }

        return {
          categories: newCategories,
          bookmarks: state.bookmarks.map(b => {
            if (b.category === name && b.deletedAt == null) {
              if (deleteLinks) {
                return { ...b, deletedAt: new Date().toISOString() };
              } else {
                return { ...b, category: '기타' };
              }
            }
            return b;
          })
        };
      }),

      reorderCategories: (newOrder) => set({ categories: newOrder }),

      reorderBookmarks: (activeId, overId) => set((state) => {
        const oldIndex = state.bookmarks.findIndex(b => b.id === activeId);
        const newIndex = state.bookmarks.findIndex(b => b.id === overId);
        if (oldIndex === -1 || newIndex === -1) return state;

        const newBookmarks = [...state.bookmarks];
        const [movedItem] = newBookmarks.splice(oldIndex, 1);
        newBookmarks.splice(newIndex, 0, movedItem);

        return { bookmarks: newBookmarks };
      }),

      // 삭제된 북마크 조회
      getDeletedBookmarks: () => {
        return get().bookmarks.filter(b => b.deletedAt != null);
      },

      // 북마크 복구
      restoreBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.map((bookmark) =>
          bookmark.id === id
            ? { ...bookmark, deletedAt: null }
            : bookmark
        )
      })),

      // 영구 삭제
      hardDeleteBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id)
      })),

      // 휴지통 비우기
      emptyBookmarkTrash: () => set((state) => ({
        bookmarks: state.bookmarks.filter((bookmark) => bookmark.deletedAt == null)
      })),

      // 30일 초과 항목 자동 정리
      cleanupExpiredBookmarks: (days) => set((state) => {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return {
          bookmarks: state.bookmarks.filter((bookmark) => {
            if (bookmark.deletedAt == null) return true;
            return new Date(bookmark.deletedAt).getTime() > cutoff;
          })
        };
      }),
    }),
    {
      name: 'calentask-link-lounge-storage',
      // 버전 관리: 기존 tags 배열 → 단일 category 문자열로 마이그레이션, 그리고 categories 배열 추가
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version === 0 || version === undefined) {
          // v0 → v1: tags[] → category, icon 필드 추가
          const state = persistedState as any;
          if (state.bookmarks && Array.isArray(state.bookmarks)) {
            state.bookmarks = state.bookmarks.map((bm: any) => {
              const category = Array.isArray(bm.tags) && bm.tags.length > 0
                ? bm.tags[0].trim() || '기타'
                : '기타';
              const { tags, ...rest } = bm;
              return {
                ...rest,
                category,
                icon: rest.icon || '',
                deletedAt: null,
              };
            });
          }
        }
        if (version <= 1) {
          // v1 → v2: deletedAt 필드 추가
          const state = persistedState as any;
          if (state.bookmarks && Array.isArray(state.bookmarks)) {
            state.bookmarks = state.bookmarks.map((bm: any) => ({
              ...bm,
              deletedAt: bm.deletedAt || null,
            }));
          }
        }
        if (version <= 2) {
          // v2 → v3: categories 배열 명시적 추가
          const state = persistedState as any;
          const extractedCategories = new Set<string>();
          if (state.bookmarks && Array.isArray(state.bookmarks)) {
            state.bookmarks.forEach((bm: any) => {
              if (bm.category && bm.deletedAt == null) {
                extractedCategories.add(bm.category);
              }
            });
          }
          if (extractedCategories.size === 0 || !extractedCategories.has('기타')) {
            extractedCategories.add('기타');
          }
          state.categories = Array.from(extractedCategories);
        }
        return persistedState as LinkLoungeState;
      },
    }
  )
);
