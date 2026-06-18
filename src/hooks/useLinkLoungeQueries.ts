import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLinkBookmarks,
  createLinkBookmark,
  updateLinkBookmark,
  deleteLinkBookmark,
  getDeletedLinkBookmarks,
  restoreLinkBookmark,
  hardDeleteLinkBookmark,
  emptyLinkTrash,
  importLinkBookmarks,
  getLinkCategories,
  updateCategories,
  deleteCategory,
} from '@/app/actions/link_lounge'
import type { Bookmark } from '@/store/useLinkLoungeStore'

export function useLinkLoungeBookmarks() {
  return useQuery({
    queryKey: ['link_lounge_bookmarks'],
    queryFn: () => getLinkBookmarks(),
  })
}

export function useLinkLoungeCategories() {
  return useQuery({
    queryKey: ['link_lounge_categories'],
    queryFn: () => getLinkCategories(),
    initialData: ['기타'],
  })
}

export function useDeletedLinkBookmarks() {
  return useQuery({
    queryKey: ['deleted_link_bookmarks'],
    queryFn: () => getDeletedLinkBookmarks(),
  })
}

export function useLinkLoungeMutations() {
  const queryClient = useQueryClient()

  const createBookmark = useMutation({
    mutationFn: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>) => createLinkBookmark(bookmark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link_lounge_bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['link_lounge_categories'] })
    },
  })

  const updateBookmark = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>> }) => updateLinkBookmark(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link_lounge_bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['link_lounge_categories'] })
    },
  })

  const removeBookmark = useMutation({
    mutationFn: (id: string) => deleteLinkBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link_lounge_bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['deleted_link_bookmarks'] })
    },
  })

  const importBookmarks = useMutation({
    mutationFn: (items: Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>[]) => importLinkBookmarks(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link_lounge_bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['link_lounge_categories'] })
    },
  })

  const updateCategoriesMutation = useMutation({
    mutationFn: (categories: string[]) => updateCategories(categories),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link_lounge_categories'] })
    },
  })

  const removeCategory = useMutation({
    mutationFn: ({ name, deleteLinks }: { name: string; deleteLinks: boolean }) => deleteCategory(name, deleteLinks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link_lounge_categories'] })
      queryClient.invalidateQueries({ queryKey: ['link_lounge_bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['deleted_link_bookmarks'] })
    },
  })

  return {
    createBookmark,
    updateBookmark,
    removeBookmark,
    importBookmarks,
    updateCategories: updateCategoriesMutation,
    removeCategory,
  }
}

export function useDeletedLinkLoungeMutations() {
  const queryClient = useQueryClient()

  const restoreBookmark = useMutation({
    mutationFn: (id: string) => restoreLinkBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_link_bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['link_lounge_bookmarks'] })
    },
  })

  const hardDeleteBookmark = useMutation({
    mutationFn: (id: string) => hardDeleteLinkBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_link_bookmarks'] })
    },
  })

  const emptyTrash = useMutation({
    mutationFn: () => emptyLinkTrash(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_link_bookmarks'] })
    },
  })

  return {
    restoreBookmark,
    hardDeleteBookmark,
    emptyTrash,
  }
}
