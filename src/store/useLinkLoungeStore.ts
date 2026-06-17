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
  viewMode: 'lineup' | 'showcase' | 'focus';
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  deleteBookmark: (id: string) => void;
  setViewMode: (mode: 'lineup' | 'showcase' | 'focus') => void;
  // 벌크 가져오기 액션 — 크롬 북마크 Import 시 사용
  importBookmarks: (items: Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>[]) => void;
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
      viewMode: 'showcase',
      
      addBookmark: (bookmarkData) => set((state) => ({
        bookmarks: [
          {
            ...bookmarkData,
            // 카테고리 정규화: 공백 제거, 빈 문자열은 '기타'로 대체
            category: bookmarkData.category?.trim() || '기타',
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            deletedAt: null
          },
          ...state.bookmarks
        ]
      })),
      
      updateBookmark: (id, updates) => set((state) => ({
        bookmarks: state.bookmarks.map((bookmark) => 
          bookmark.id === id 
            ? { 
                ...bookmark, 
                ...updates,
                // 카테고리가 업데이트되는 경우 정규화 적용
                ...(updates.category !== undefined 
                  ? { category: updates.category.trim() || '기타' } 
                  : {})
              } 
            : bookmark
        )
      })),
      
      // 소프트 삭제: deletedAt 타임스탬프 추가
      deleteBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.map((bookmark) => 
          bookmark.id === id
            ? { ...bookmark, deletedAt: new Date().toISOString() }
            : bookmark
        )
      })),
      
      setViewMode: (mode) => set({ viewMode: mode }),

      // 벌크 가져오기: 여러 북마크를 한 번에 추가
      // 동일 카테고리명은 자연스럽게 기존 카테고리에 합류 (별도 엔티티가 아닌 문자열 필드)
      importBookmarks: (items) => set((state) => ({
        bookmarks: [
          ...items.map((item) => ({
            ...item,
            category: item.category?.trim() || '기타',
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            deletedAt: null as string | null
          })),
          ...state.bookmarks
        ]
      })),

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
      // 버전 관리: 기존 tags 배열 → 단일 category 문자열로 마이그레이션
      version: 2,
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
                icon: rest.icon || '', // 기존 데이터에 icon 필드가 없으면 빈 문자열
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
        return persistedState as LinkLoungeState;
      },
    }
  )
);
