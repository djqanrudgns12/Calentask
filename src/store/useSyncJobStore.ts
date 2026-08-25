import { create } from 'zustand'
import type { SyncJob } from '@/lib/google/exportJob'

/**
 * 구글 캘린더 내보내기 작업의 클라이언트 측 단일 상태.
 *
 * 작업 자체는 서버가 진행하므로 여기 있는 값은 전부 "서버 행의 사본"이다.
 * 진행 상황 모달과 최소화된 플로팅 표시가 같은 상태를 봐야 하므로 전역 스토어에 둔다.
 * 모달을 닫아도 이 상태와 구독은 그대로 살아 있고, 작업은 서버에서 계속된다.
 */

export type SyncJobStatus = SyncJob['status']

interface SyncJobState {
  job: SyncJob | null
  /** 진행 상황 창을 크게 띄운 상태인지. 닫아도 작업은 계속된다. */
  isPanelOpen: boolean
  /** 서버에 시작/이어하기 요청을 보내는 중인지. */
  isSubmitting: boolean
  /** 완료를 이미 알린 작업 id (같은 완료를 두 번 알리지 않기 위함). */
  notifiedJobId: string | null

  setJob: (job: SyncJob | null) => void
  openPanel: () => void
  closePanel: () => void
  setSubmitting: (value: boolean) => void
  markNotified: (jobId: string) => void
}

export const useSyncJobStore = create<SyncJobState>()((set) => ({
  job: null,
  isPanelOpen: false,
  isSubmitting: false,
  notifiedJobId: null,

  setJob: (job) => set({ job }),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  setSubmitting: (value) => set({ isSubmitting: value }),
  markNotified: (jobId) => set({ notifiedJobId: jobId }),
}))

/** 아직 진행 중(또는 이어할 수 있는) 작업인지. */
export function isJobInFlight(status?: SyncJobStatus | null): boolean {
  return status === 'RUNNING' || status === 'PAUSED'
}
