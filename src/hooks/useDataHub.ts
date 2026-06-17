import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  useDeletedActivities, useRestoreActivity, useHardDeleteActivity, useEmptyTrash 
} from '@/hooks/useCalendarQueries'
import { 
  getDeletedArchiveTabs, restoreArchiveTab, hardDeleteArchiveTab, emptyArchiveTrash 
} from '@/app/actions/archive'
import { 
  getDeletedActivities, restoreActivity, hardDeleteActivity, emptyTrash
} from '@/app/actions/calendar'
import { createClient } from '@/lib/supabase/client'
import { useLinkLoungeStore } from '@/store/useLinkLoungeStore'
import type { Activity } from '@/app/actions/calendar'
import type { AgendaTask } from '@/app/actions/agenda'

// ─── 통합 휴지통 항목 타입 ───

export type TrashItemType = 'calendar' | 'agenda' | 'archive' | 'anniversary' | 'link'

export interface TrashItem {
  id: string
  type: TrashItemType
  title: string
  subtitle?: string
  deletedAt: string
  icon?: string
  meta?: Record<string, unknown>
  originalData?: unknown
}

// ─── 개별 모듈 조회 훅 ───

function useDeletedAgendaTasks() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['deleted_agenda_tasks'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return []
      
      const { data, error } = await supabase
        .from('agenda_tasks')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('status', 'trash')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      
      if (error) return []
      return data as AgendaTask[]
    }
  })
}

function useDeletedArchiveTabs() {
  return useQuery({
    queryKey: ['deleted_archive_tabs'],
    queryFn: () => getDeletedArchiveTabs(),
  })
}

function useDeletedAnniversaries() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['deleted_anniversaries'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return []
      
      const { data, error } = await supabase
        .from('anniversaries')
        .select('*')
        .eq('user_id', userData.user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      
      if (error) return []
      return data || []
    }
  })
}

// ─── 통합 데이터 허브 훅 ───

export function useDataHub() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  // 각 모듈 삭제 데이터 조회
  const { data: deletedActivities = [], isLoading: isLoadingActivities } = useDeletedActivities()
  const { data: deletedAgendaTasks = [], isLoading: isLoadingAgenda } = useDeletedAgendaTasks()
  const { data: deletedArchiveTabs = [], isLoading: isLoadingArchive } = useDeletedArchiveTabs()
  const { data: deletedAnniversaries = [], isLoading: isLoadingAnniversaries } = useDeletedAnniversaries()
  
  // 링크 라운지 (Zustand)
  const deletedBookmarks = useLinkLoungeStore(state => state.bookmarks.filter(b => b.deletedAt != null))
  const restoreBookmarkStore = useLinkLoungeStore(state => state.restoreBookmark)
  const hardDeleteBookmarkStore = useLinkLoungeStore(state => state.hardDeleteBookmark)
  const emptyBookmarkTrashStore = useLinkLoungeStore(state => state.emptyBookmarkTrash)

  const isLoading = isLoadingActivities || isLoadingAgenda || isLoadingArchive || isLoadingAnniversaries

  // 통합 휴지통 아이템 목록 생성
  const trashItems: TrashItem[] = [
    ...deletedActivities.map((a: Activity) => ({
      id: a.id,
      type: 'calendar' as TrashItemType,
      title: a.title,
      subtitle: `${new Date(a.start_time).toLocaleDateString('ko-KR')} ${a.is_all_day ? '종일' : new Date(a.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`,
      deletedAt: a.deleted_at!,
      meta: { type: a.type },
      originalData: a,
    })),
    ...deletedAgendaTasks.map((t: AgendaTask) => ({
      id: t.id,
      type: 'agenda' as TrashItemType,
      title: t.title,
      subtitle: t.deadline ? `마감: ${new Date(t.deadline).toLocaleDateString('ko-KR')}` : '마감일 없음',
      deletedAt: t.deleted_at!,
      meta: { status: t.status },
      originalData: t,
    })),
    ...deletedArchiveTabs.map((tab: any) => ({
      id: tab.id,
      type: 'archive' as TrashItemType,
      title: tab.name,
      subtitle: tab.board_type === 'document' ? '📄 문서' : tab.board_type === 'canvas' ? '🎨 캔버스' : tab.board_type === 'spreadsheet' ? '📊 스프레드시트' : tab.board_type === 'masonry' ? '🧱 메이슨리' : tab.board_type,
      deletedAt: tab.deleted_at!,
      meta: { boardType: tab.board_type },
      originalData: tab,
    })),
    ...deletedAnniversaries.map((ann: any) => ({
      id: ann.id,
      type: 'anniversary' as TrashItemType,
      title: ann.title,
      subtitle: `${ann.is_lunar ? '음력 ' : ''}${ann.base_date}`,
      deletedAt: ann.deleted_at!,
      meta: { presetType: ann.preset_type },
      originalData: ann,
    })),
    ...deletedBookmarks.map((b) => ({
      id: b.id,
      type: 'link' as TrashItemType,
      title: b.title,
      subtitle: b.url,
      deletedAt: b.deletedAt!,
      icon: b.icon,
      meta: { category: b.category },
      originalData: b,
    })),
  ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())

  // ─── 복구 핸들러 ───
  const restoreActivityMutation = useRestoreActivity()
  const hardDeleteActivityMutation = useHardDeleteActivity()
  const emptyTrashMutation = useEmptyTrash()

  const restoreAgendaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_tasks')
        .update({ status: 'inbox', deleted_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_agenda_tasks'] })
      queryClient.invalidateQueries({ queryKey: ['agendaTasks'] })
    }
  })

  const restoreArchiveMutation = useMutation({
    mutationFn: (id: string) => restoreArchiveTab(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_archive_tabs'] })
    }
  })

  const hardDeleteArchiveMutation = useMutation({
    mutationFn: (id: string) => hardDeleteArchiveTab(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_archive_tabs'] })
    }
  })

  const restoreAnniversaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('anniversaries')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_anniversaries'] })
      queryClient.invalidateQueries({ queryKey: ['anniversaries_list'] })
      queryClient.invalidateQueries({ queryKey: ['anniversaries'] })
    }
  })

  const hardDeleteAnniversaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('anniversaries')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_anniversaries'] })
    }
  })

  const hardDeleteAgendaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_tasks')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_agenda_tasks'] })
    }
  })

  // ─── 통합 핸들러 ───

  const handleRestore = (item: TrashItem) => {
    switch (item.type) {
      case 'calendar':
        restoreActivityMutation.mutate(item.id)
        break
      case 'agenda':
        restoreAgendaMutation.mutate(item.id)
        break
      case 'archive':
        restoreArchiveMutation.mutate(item.id)
        break
      case 'anniversary':
        restoreAnniversaryMutation.mutate(item.id)
        break
      case 'link':
        restoreBookmarkStore(item.id)
        break
    }
  }

  const handleHardDelete = (item: TrashItem) => {
    if (confirm('이 항목을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      switch (item.type) {
        case 'calendar':
          hardDeleteActivityMutation.mutate(item.id)
          break
        case 'agenda':
          hardDeleteAgendaMutation.mutate(item.id)
          break
        case 'archive':
          hardDeleteArchiveMutation.mutate(item.id)
          break
        case 'anniversary':
          hardDeleteAnniversaryMutation.mutate(item.id)
          break
        case 'link':
          hardDeleteBookmarkStore(item.id)
          break
      }
    }
  }

  const handleEmptyTrash = () => {
    if (confirm('휴지통을 비우시겠습니까? 모든 항목이 영구 삭제됩니다.')) {
      emptyTrashMutation.mutate()
      emptyBookmarkTrashStore()
      emptyArchiveTrash().then(() => {
        queryClient.invalidateQueries({ queryKey: ['deleted_archive_tabs'] })
      })
      // 아젠다 전체 영구 삭제
      deletedAgendaTasks.forEach(t => hardDeleteAgendaMutation.mutate(t.id))
      // 기념일 전체 영구 삭제
      deletedAnniversaries.forEach((a: any) => hardDeleteAnniversaryMutation.mutate(a.id))
    }
  }

  // 30일 초과 항목 자동 정리
  const cleanupExpiredItems = async (days: number = 30) => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    
    // 캘린더
    const expiredActivities = deletedActivities.filter((a: Activity) => a.deleted_at && a.deleted_at < cutoff)
    for (const a of expiredActivities) {
      hardDeleteActivityMutation.mutate(a.id)
    }

    // 아젠다
    const expiredAgenda = deletedAgendaTasks.filter((t: AgendaTask) => t.deleted_at && t.deleted_at < cutoff)
    for (const t of expiredAgenda) {
      hardDeleteAgendaMutation.mutate(t.id)
    }

    // 아카이브
    await emptyArchiveTrash(days)
    queryClient.invalidateQueries({ queryKey: ['deleted_archive_tabs'] })

    // 기념일
    const expiredAnniversaries = deletedAnniversaries.filter((a: any) => a.deleted_at && a.deleted_at < cutoff)
    for (const a of expiredAnniversaries) {
      hardDeleteAnniversaryMutation.mutate(a.id)
    }

    // 링크 라운지
    useLinkLoungeStore.getState().cleanupExpiredBookmarks(days)
  }

  const isRestoring = restoreActivityMutation.isPending || restoreAgendaMutation.isPending || restoreArchiveMutation.isPending || restoreAnniversaryMutation.isPending
  const isHardDeleting = hardDeleteActivityMutation.isPending || hardDeleteAgendaMutation.isPending || hardDeleteArchiveMutation.isPending || hardDeleteAnniversaryMutation.isPending

  return {
    trashItems,
    isLoading,
    handleRestore,
    isRestoring,
    handleHardDelete,
    isHardDeleting,
    handleEmptyTrash,
    isEmptyingTrash: emptyTrashMutation.isPending,
    cleanupExpiredItems,
    // Legacy: 기존 호환
    deletedActivities,
  }
}
