'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useAgendaStore } from '@/store/useAgendaStore'
import { useArchiveStore } from '@/store/useArchiveStore'

interface RefreshButtonProps {
  className?: string
}

/**
 * 현재 탭의 데이터를 전체 페이지 새로고침 없이 다시 불러오는 공용 버튼.
 *
 * - React Query 기반 탭(캘린더/기념일/휴지통/링크 라운지/인사이트 등): 전체 무효화.
 *   비활성 쿼리는 stale 표시만 되고, 실제 재조회는 현재 마운트된 탭의 쿼리에서만 일어나므로
 *   사실상 "현재 탭만" 갱신된다.
 * - Zustand 기반 탭(Agenda 할일/노트): React Query 무효화 대상이 아니므로 스토어 fetch를 직접 호출.
 */
export function RefreshButton({ className = '' }: RefreshButtonProps) {
  const queryClient = useQueryClient()
  const viewMode = useCalendarStore((s) => s.viewMode)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const tasks: Promise<unknown>[] = [queryClient.invalidateQueries()]

      // 홈 대시보드와 Agenda 탭은 할일(agenda) 스토어 데이터를 보여준다.
      if (viewMode === 'archive_agenda' || viewMode === 'home') {
        tasks.push(useAgendaStore.getState().fetchTasks())
      }
      // 노트 탭은 아카이브 스토어 데이터를 보여준다(fetchTabs가 활성 탭 노트까지 갱신).
      if (viewMode === 'archive_notes') {
        tasks.push(useArchiveStore.getState().fetchTabs())
      }

      await Promise.all(tasks)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className={`p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      title="새로고침"
      aria-label="새로고침"
    >
      <RefreshCw className={`w-5 h-5 group-hover:scale-110 transition-transform ${refreshing ? 'animate-spin' : ''}`} />
    </button>
  )
}
