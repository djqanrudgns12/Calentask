'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useSyncJobStore, isJobInFlight } from '@/store/useSyncJobStore'
import type { SyncJob } from '@/lib/google/exportJob'

/** heartbeat가 이보다 오래 멈춰 있으면 실행 인스턴스가 죽은 것으로 보고 이어받는다. */
const STALE_HEARTBEAT_MS = 90_000
/** Realtime이 막힌 환경(프록시/확장 프로그램 등)을 위한 폴백 폴링 간격. */
const POLL_INTERVAL_MS = 4000

async function postJob(body: Record<string, unknown>): Promise<SyncJob | null> {
  const res = await fetch('/api/calendar/sync/job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.error || '동기화 요청에 실패했습니다.')
  }
  const data = await res.json()
  return data.job ?? null
}

async function fetchJob(): Promise<SyncJob | null> {
  const res = await fetch('/api/calendar/sync/job')
  if (!res.ok) return null
  const data = await res.json()
  return data.job ?? null
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function isStalled(job: SyncJob): boolean {
  if (job.status === 'PAUSED') return true
  if (job.status !== 'RUNNING') return false
  return Date.now() - new Date(job.heartbeat_at).getTime() > STALE_HEARTBEAT_MS
}

/**
 * 구글 캘린더 내보내기 작업을 구독하고 제어한다.
 *
 * 작업은 서버(`/api/calendar/sync/job` → after())가 끝까지 진행하므로,
 * 이 훅은 진행 상황을 따라 읽고 멈춘 작업을 다시 밀어주는 역할만 한다.
 * 앱 셸에서 한 번만 호출한다(중복 구독 방지).
 */
export function useSyncJobSubscription() {
  const queryClient = useQueryClient()
  const setJob = useSyncJobStore((s) => s.setJob)
  const markNotified = useSyncJobStore((s) => s.markNotified)
  const resumingRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const apply = (next: SyncJob | null) => {
      if (cancelled || !next) return

      const { job: prev, notifiedJobId } = useSyncJobStore.getState()
      setJob(next)

      // 작업이 방금 끝났다면 한 번만 알린다.
      const justFinished = isJobInFlight(prev?.status) && !isJobInFlight(next.status)
      if (justFinished && notifiedJobId !== next.id) {
        markNotified(next.id)
        // 구글 연결 정보(google_event_id 등)가 갱신됐으므로 목록을 새로 읽는다.
        queryClient.invalidateQueries({ queryKey: ['activities'] })
        queryClient.invalidateQueries({ queryKey: ['userProfile'] })

        if (next.status === 'SUCCEEDED') {
          const parts = [`${next.synced}건 반영`]
          if (next.skipped > 0) parts.push(`${next.skipped}건 최신`)
          if (next.failed > 0) parts.push(`${next.failed}건 실패`)
          toast.success(`구글 캘린더 동기화 완료 — ${parts.join(', ')}`)
        } else if (next.status === 'FAILED') {
          toast.error(`동기화 실패: ${next.error_message || '알 수 없는 오류'}`)
        }
      }

      // 서버리스 실행 한도로 멈춰 있으면(PAUSED) 또는 실행 인스턴스가 죽었으면 이어받는다.
      // 이 덕분에 사용자는 화면에 머물 필요 없이, 앱이 열려 있기만 하면 남은 분량이 이어진다.
      if (isStalled(next) && !resumingRef.current) {
        resumingRef.current = true
        postJob({ action: 'start' })
          .catch((err) => console.warn('동기화 이어하기 실패:', err))
          .finally(() => {
            resumingRef.current = false
          })
      }
    }

    // 1) 초기 상태
    fetchJob().then(apply)

    // 2) Realtime 구독 (RLS가 본인 행만 내려보낸다)
    const channel = supabase
      .channel('google_sync_job')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'google_sync_jobs' },
        (payload) => apply(payload.new as SyncJob)
      )
      .subscribe()

    // 3) Realtime이 막힌 환경을 위한 폴백. 진행 중일 때만 돈다.
    pollTimer = setInterval(() => {
      const status = useSyncJobStore.getState().job?.status
      if (!isJobInFlight(status)) return
      fetchJob().then(apply)
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      supabase.removeChannel(channel)
    }
  }, [queryClient, setJob, markNotified])
}

/** 진행 상황 창과 플로팅 표시가 공유하는 제어 함수들. */
export function useSyncJobControls() {
  const setJob = useSyncJobStore((s) => s.setJob)
  const setSubmitting = useSyncJobStore((s) => s.setSubmitting)
  const openPanel = useSyncJobStore((s) => s.openPanel)

  const start = useCallback(
    async (options: { restart?: boolean } = {}) => {
      setSubmitting(true)
      openPanel()
      try {
        const job = await postJob({ action: 'start', restart: options.restart === true })
        setJob(job)
      } catch (err) {
        toast.error(errorMessage(err, '동기화를 시작하지 못했습니다.'))
      } finally {
        setSubmitting(false)
      }
    },
    [setJob, setSubmitting, openPanel]
  )

  const retryFailed = useCallback(
    async (activityIds: string[]) => {
      if (activityIds.length === 0) return
      setSubmitting(true)
      try {
        const job = await postJob({ action: 'start', mode: 'RETRY', activityIds, restart: true })
        setJob(job)
      } catch (err) {
        toast.error(errorMessage(err, '재시도를 시작하지 못했습니다.'))
      } finally {
        setSubmitting(false)
      }
    },
    [setJob, setSubmitting]
  )

  const cancel = useCallback(
    async (jobId: string) => {
      setSubmitting(true)
      try {
        await postJob({ action: 'cancel', jobId })
        setJob(await fetchJob())
      } catch (err) {
        toast.error(errorMessage(err, '중단하지 못했습니다.'))
      } finally {
        setSubmitting(false)
      }
    },
    [setJob, setSubmitting]
  )

  return { start, retryFailed, cancel }
}
