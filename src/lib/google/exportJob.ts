/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/server'
import {
  syncBatchActivitiesToGoogle,
  reconcileGoogleDuplicates,
  type SyncProgressEvent,
} from '@/lib/google-calendar'

/**
 * 구글 캘린더 내보내기(배치 push)를 **서버가** 끝까지 진행하는 작업 러너.
 *
 * 이전에는 브라우저가 오케스트레이터였다. 모달 안의 while 루프가 청크를 하나씩 fetch 했고,
 * 모달을 닫으면 AbortController가 발동해 동기화가 그 자리에서 죽었다. 그래서 사용자는
 * 진행이 끝날 때까지 그 화면에 붙잡혀 있어야 했다.
 *
 * 이제 클라이언트는 작업을 "시작"만 시키고 진행 상황을 Realtime으로 구독한다.
 * 창을 닫든 다른 화면으로 가든 서버는 계속 진행한다.
 */

/** 한 번에 DB에서 읽어 처리할 활동 수. */
const CHUNK_SIZE = 25

/**
 * 한 번의 서버리스 실행에서 작업할 수 있는 시간(ms).
 * 라우트의 maxDuration(300s)보다 넉넉히 짧게 잡아, 한도에 걸려 강제 종료되기 전에
 * 스스로 PAUSED로 내려앉아 이어할 수 있게 한다.
 */
const SOFT_DEADLINE_MS = 240_000

/** 진행 상황 행을 갱신하는 최소 간격. 항목마다 쓰면 DB와 Realtime이 불필요하게 시달린다. */
const FLUSH_INTERVAL_MS = 700

/** UI 로그 피드에 유지할 최근 항목 수. */
const RECENT_LOG_LIMIT = 60

/**
 * heartbeat가 이보다 오래 멈춰 있으면 실행하던 인스턴스가 죽은 것으로 본다.
 * (서버리스는 언제든 중단될 수 있고, 그때 status는 RUNNING인 채로 남는다.)
 */
export const STALE_HEARTBEAT_MS = 90_000

export type JobStatus = 'RUNNING' | 'PAUSED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'

export interface SyncJob {
  id: string
  user_id: string
  mode: 'FULL' | 'RETRY'
  status: JobStatus
  total: number
  processed: number
  synced: number
  skipped: number
  task_skipped: number
  failed: number
  cursor: number
  activity_ids: string[]
  failed_items: Array<{ id: string; title: string; error: string }>
  recent_log: Array<{ title: string; status: SyncProgressEvent['status']; error?: string }>
  error_message: string | null
  heartbeat_at: string
  created_at: string
  updated_at: string
}

/** 아직 살아있다고 볼 수 있는(= 이어하기 대상이 아닌) 작업인지. */
export function isJobActive(job: Pick<SyncJob, 'status' | 'heartbeat_at'>): boolean {
  if (job.status !== 'RUNNING') return false
  return Date.now() - new Date(job.heartbeat_at).getTime() < STALE_HEARTBEAT_MS
}

/** 사용자의 가장 최근 작업 1건. */
export async function getLatestJob(supabase: any, userId: string): Promise<SyncJob | null> {
  const { data } = await supabase
    .from('google_sync_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as SyncJob) || null
}

/** 아직 끝나지 않은(RUNNING/PAUSED) 작업 1건. */
async function getUnfinishedJob(supabase: any, userId: string): Promise<SyncJob | null> {
  const { data } = await supabase
    .from('google_sync_jobs')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['RUNNING', 'PAUSED'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as SyncJob) || null
}

/**
 * 작업을 시작하거나, 멈춰 있던 작업을 이어받는다.
 *
 * 같은 사용자의 작업이 동시에 두 개 돌지 않도록 다음 규칙을 따른다:
 *  - 살아있는 RUNNING 작업이 있으면 그대로 반환한다(재시작하지 않음 = 멱등).
 *  - PAUSED이거나 heartbeat가 끊긴 RUNNING이면 그 작업을 이어받는다.
 *  - 그 외에는 새 작업을 만든다.
 */
export async function startOrResumeJob(
  userId: string,
  options: { mode?: 'FULL' | 'RETRY'; activityIds?: string[]; restart?: boolean } = {}
): Promise<{ job: SyncJob; started: boolean }> {
  const supabase = createAdminClient()
  const mode = options.mode || 'FULL'

  const existing = await getUnfinishedJob(supabase, userId)

  if (existing && !options.restart) {
    if (isJobActive(existing)) {
      // 이미 다른 인스턴스가 돌고 있다. 중복 실행은 구글 쿼터만 태운다.
      return { job: existing, started: false }
    }

    // PAUSED 또는 heartbeat 끊긴 RUNNING → 이어받기
    const { data } = await supabase
      .from('google_sync_jobs')
      .update({ status: 'RUNNING', heartbeat_at: new Date().toISOString(), error_message: null })
      .eq('id', existing.id)
      .select('*')
      .single()
    return { job: (data as SyncJob) || existing, started: true }
  }

  // 재시작 요청이면 진행 중이던 작업을 접는다.
  if (existing && options.restart) {
    await supabase.from('google_sync_jobs').update({ status: 'CANCELLED' }).eq('id', existing.id)
  }

  const total = await countTargets(supabase, userId, mode, options.activityIds || [])

  const { data, error } = await supabase
    .from('google_sync_jobs')
    .insert({
      user_id: userId,
      mode,
      status: 'RUNNING',
      total,
      activity_ids: options.activityIds || [],
      heartbeat_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw new Error(`동기화 작업을 생성하지 못했습니다: ${error.message}`)
  return { job: data as SyncJob, started: true }
}

async function countTargets(
  supabase: any,
  userId: string,
  mode: 'FULL' | 'RETRY',
  activityIds: string[]
): Promise<number> {
  if (mode === 'RETRY') return activityIds.length

  const { count } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)

  return count || 0
}

/** 사용자가 작업 중단을 요청한다. 러너는 청크 사이에서 이를 감지하고 멈춘다. */
export async function cancelJob(userId: string, jobId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('google_sync_jobs')
    .update({ status: 'CANCELLED' })
    .eq('id', jobId)
    .eq('user_id', userId)
    .in('status', ['RUNNING', 'PAUSED'])
}

/**
 * 작업을 실제로 진행한다. 라우트에서 `after()`로 호출되어 응답 이후에 돌아간다.
 *
 * 실행 시간 한도에 걸리기 전에 스스로 PAUSED로 내려앉으므로, 남은 분량은
 * 다음 요청(사용자가 페이지를 다시 열거나 버튼을 다시 누를 때)이 이어받는다.
 */
export async function runExportJob(jobId: string, userId: string): Promise<void> {
  const supabase = createAdminClient()
  const deadline = Date.now() + SOFT_DEADLINE_MS

  const { data: initial } = await supabase
    .from('google_sync_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!initial) return
  const job = initial as SyncJob

  const totals = {
    processed: job.processed,
    synced: job.synced,
    skipped: job.skipped,
    taskSkipped: job.task_skipped,
    failed: job.failed,
  }
  let failedItems = [...(job.failed_items || [])]
  let recentLog = [...(job.recent_log || [])]
  let cursor = job.cursor
  const total = job.total

  let lastFlush = 0
  const flush = async (patch: Record<string, any> = {}, force = false) => {
    if (!force && Date.now() - lastFlush < FLUSH_INTERVAL_MS) return
    lastFlush = Date.now()
    await supabase
      .from('google_sync_jobs')
      .update({
        processed: totals.processed,
        synced: totals.synced,
        skipped: totals.skipped,
        task_skipped: totals.taskSkipped,
        failed: totals.failed,
        cursor,
        total,
        failed_items: failedItems,
        recent_log: recentLog,
        heartbeat_at: new Date().toISOString(),
        ...patch,
      })
      .eq('id', jobId)
  }

  try {
    // 전체 내보내기를 처음 시작할 때, 캘린더에 흩어진 중복 사본을 먼저 정리한다.
    // 라우팅이 바뀔 때마다 이전 위치의 사본이 남던 문제를 실제로 걷어내야
    // 이후 push가 "정확히 하나"를 갱신하는 상태에서 출발할 수 있다.
    if (job.mode === 'FULL' && cursor === 0) {
      try {
        const { removed } = await reconcileGoogleDuplicates(userId)
        if (removed > 0) console.info(`[runExportJob] removed ${removed} duplicate google events`)
      } catch (err) {
        // 정리에 실패해도 내보내기 자체는 진행한다.
        console.warn('[runExportJob] duplicate reconciliation failed:', err)
      }
      await flush({}, true)
    }

    for (;;) {
      // 사용자가 중단을 눌렀는지 청크 경계마다 확인한다.
      const { data: fresh } = await supabase
        .from('google_sync_jobs')
        .select('status')
        .eq('id', jobId)
        .maybeSingle()

      if (!fresh || fresh.status === 'CANCELLED') {
        await flush({ status: 'CANCELLED' }, true)
        return
      }

      const chunk = await loadChunk(supabase, userId, job, cursor)

      // 커서는 **요청한 창 크기**만큼 전진시켜야 한다.
      // 돌아온 행 수로 전진시키면, 중간에 삭제된 항목이 있을 때(요청 25건 / 응답 20건)
      // 다음 창이 이미 처리한 구간과 겹쳐 같은 일정을 반복 처리하게 된다.
      // RETRY 모드에서 해당 구간이 통째로 사라졌다면 응답이 0건이 되어
      // "다 끝났다"고 잘못 판단하기까지 한다.
      if (chunk.windowSize === 0) {
        await flush({ status: 'SUCCEEDED' }, true)
        return
      }

      const activities = chunk.activities

      // 요청 구간에 있었지만 그 사이 삭제된 항목. 진행 이벤트가 발생하지 않으므로
      // 여기서 직접 반영해야 "synced + 건너뜀 + 할 일 + 실패 = 처리 건수" 등식이 유지된다.
      const vanished = chunk.windowSize - activities.length
      if (vanished > 0) {
        totals.processed += vanished
        totals.skipped += vanished
      }

      // 이 청크에서 새로 관측된 진행분만 누적한다.
      // (syncBatchActivitiesToGoogle의 current는 청크 내부 기준이라 그대로 쓰면 안 된다.)
      const onProgress = (event: SyncProgressEvent) => {
        totals.processed++
        if (event.status === 'synced') totals.synced++
        else if (event.status === 'skipped') totals.skipped++
        else if (event.status === 'task_skipped') totals.taskSkipped++
        else if (event.status === 'failed') totals.failed++

        recentLog.push({ title: event.title, status: event.status, error: event.error })
        if (recentLog.length > RECENT_LOG_LIMIT) recentLog = recentLog.slice(-RECENT_LOG_LIMIT)

        // await 하지 않는다: 진행 보고가 동기화 자체를 늦추면 안 된다.
        void flush()
      }

      const result = await syncBatchActivitiesToGoogle(userId, activities, onProgress)
      if (result.failedItems.length > 0) {
        failedItems = [...failedItems, ...result.failedItems]
      }

      cursor += chunk.windowSize
      await flush({}, true)

      if (chunk.isLastWindow || cursor >= total) {
        await flush({ status: 'SUCCEEDED' }, true)
        return
      }

      if (Date.now() > deadline) {
        // 실행 시간 한도가 가깝다. 여기까지를 저장하고 이어할 수 있게 남긴다.
        await flush({ status: 'PAUSED' }, true)
        return
      }
    }
  } catch (error: any) {
    console.error('[runExportJob] failed:', error)
    await flush({ status: 'FAILED', error_message: error.message || '알 수 없는 오류' }, true)
  }
}

interface Chunk {
  activities: any[]
  /** 이번에 요청한 구간의 크기. 커서는 응답 건수가 아니라 이 값만큼 전진한다. */
  windowSize: number
  /** 이 구간이 마지막임이 확실한지(응답이 요청보다 적음 = 끝에 도달). */
  isLastWindow: boolean
}

async function loadChunk(supabase: any, userId: string, job: SyncJob, cursor: number): Promise<Chunk> {
  if (job.mode === 'RETRY') {
    const ids = (job.activity_ids || []).slice(cursor, cursor + CHUNK_SIZE)
    if (ids.length === 0) return { activities: [], windowSize: 0, isLastWindow: true }

    const { data } = await supabase
      .from('activities')
      .select('*, activity_category_map(categories(*))')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('id', ids)

    // 요청한 id 중 일부가 이미 삭제됐을 수 있다. 그래도 커서는 요청 크기만큼 전진한다.
    return {
      activities: data || [],
      windowSize: ids.length,
      isLastWindow: cursor + ids.length >= (job.activity_ids || []).length,
    }
  }

  const { data } = await supabase
    .from('activities')
    .select('*, activity_category_map(categories(*))')
    .eq('user_id', userId)
    .is('deleted_at', null)
    // 안정적인 페이지네이션을 위해 결정적 정렬이 필요하다.
    // start_time만으로는 동률이 생겨 항목이 건너뛰거나 중복될 수 있으므로 id를 타이브레이커로 둔다.
    .order('start_time', { ascending: false })
    .order('id', { ascending: true })
    .range(cursor, cursor + CHUNK_SIZE - 1)

  const activities = data || []
  return {
    activities,
    windowSize: activities.length,
    // 요청보다 적게 왔다면 끝에 도달한 것. total 스냅샷이 어긋나 있어도 여기서 정확히 끝난다.
    isLastWindow: activities.length < CHUNK_SIZE,
  }
}
