'use client'

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Minus,
  SkipForward,
  ListChecks,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSyncJobStore, isJobInFlight } from '@/store/useSyncJobStore'
import { useSyncJobControls } from '@/hooks/useSyncJob'
import type { SyncJob } from '@/lib/google/exportJob'

type LogStatus = 'synced' | 'skipped' | 'failed' | 'task_skipped'

const STATUS_ICON: Record<LogStatus, string> = {
  synced: '✅',
  skipped: '⏸️',
  failed: '❌',
  task_skipped: '⏭️',
}

const STATUS_LABEL: Record<LogStatus, string> = {
  synced: '동기화 완료',
  skipped: '변경 없음 (건너뜀)',
  failed: '실패',
  task_skipped: '할 일 (대상 아님)',
}

const STATUS_CLASS: Record<LogStatus, string> = {
  synced: 'text-emerald-400',
  skipped: 'text-blue-300',
  failed: 'text-red-400',
  task_skipped: 'text-slate-500',
}

/**
 * 구글 캘린더 내보내기 진행 상황 창.
 *
 * 이 창은 **작업을 소유하지 않는다**. 작업은 서버가 진행하고 있고 여기는 그 상태를
 * 비추기만 한다. 그래서 최소화하거나 닫아도 동기화는 계속된다.
 * (예전에는 이 컴포넌트의 while 루프가 곧 동기화였고, 닫으면 abort되어 중단됐다.)
 */
export function SyncProgressModal() {
  const job = useSyncJobStore((s) => s.job)
  const isPanelOpen = useSyncJobStore((s) => s.isPanelOpen)
  const closePanel = useSyncJobStore((s) => s.closePanel)
  const isSubmitting = useSyncJobStore((s) => s.isSubmitting)
  const { start, retryFailed, cancel } = useSyncJobControls()

  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [job?.processed])

  if (!isPanelOpen || !job) return null

  const inFlight = isJobInFlight(job.status)
  const percentage = job.total > 0 ? Math.min(Math.round((job.processed / job.total) * 100), 100) : 0
  const failedItems = job.failed_items || []
  const recentLog = job.recent_log || []

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
      >
        <div className="p-6 md:p-8 relative">
          {/* 최소화: 작업은 계속 돌고, 표시만 접는다 */}
          <button
            onClick={closePanel}
            title="최소화 (동기화는 계속 진행됩니다)"
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Header Icons */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 shadow-sm">
              <Cloud className="w-7 h-7" />
            </div>
            <div className="text-slate-300">
              <ArrowRight className={`w-6 h-6 ${inFlight ? 'animate-pulse text-indigo-400' : ''}`} />
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
              <Calendar className="w-7 h-7" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">
              {job.status === 'RUNNING' && '구글 캘린더로 일정 내보내는 중...'}
              {job.status === 'PAUSED' && '이어서 진행하는 중...'}
              {job.status === 'SUCCEEDED' && job.failed === 0 && '모든 일정이 동기화되었습니다!'}
              {job.status === 'SUCCEEDED' && job.failed > 0 && '일부 일정 동기화 실패'}
              {job.status === 'FAILED' && '동기화 중 오류 발생'}
              {job.status === 'CANCELLED' && '동기화를 중단했습니다'}
            </h3>

            {job.total > 0 && (
              <p className="text-sm font-medium text-slate-500 mt-2">
                {job.processed} / {job.total} ({percentage}%)
              </p>
            )}

            {inFlight && (
              <p className="text-xs text-slate-400 mt-1.5">
                창을 닫아도 동기화는 계속 진행됩니다.
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-4 shadow-inner">
            <motion.div
              className={`absolute top-0 left-0 h-full rounded-full ${
                job.status === 'FAILED'
                  ? 'bg-red-500'
                  : job.status === 'CANCELLED'
                    ? 'bg-slate-400'
                    : job.status === 'SUCCEEDED' && job.failed === 0
                      ? 'bg-emerald-500'
                      : job.failed > 0
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            {inFlight && (
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            )}
          </div>

          {/* Stats — 합계가 처리 건수와 정확히 맞아떨어진다 */}
          <div className="grid grid-cols-4 gap-1.5 text-[11px] font-medium text-slate-600 mb-4">
            <StatCell
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              label="동기화"
              value={job.synced}
            />
            <StatCell
              icon={<SkipForward className="w-3.5 h-3.5 text-blue-400" />}
              label="변경 없음"
              value={job.skipped}
            />
            <StatCell
              icon={<ListChecks className="w-3.5 h-3.5 text-slate-400" />}
              label="할 일"
              value={job.task_skipped}
            />
            <StatCell
              icon={<XCircle className="w-3.5 h-3.5 text-red-400" />}
              label="실패"
              value={job.failed}
            />
          </div>

          {/* 실시간 로그 피드 */}
          {recentLog.length > 0 && (
            <div className="bg-slate-900 rounded-lg p-3 mb-4 max-h-36 overflow-y-auto font-mono text-[11px] leading-relaxed scroll-smooth">
              {recentLog.map((entry, idx) => (
                <div
                  key={`${entry.title}-${idx}`}
                  className={`flex items-start gap-1.5 py-0.5 ${STATUS_CLASS[entry.status as LogStatus] ?? 'text-slate-400'}`}
                >
                  <span className="shrink-0">{STATUS_ICON[entry.status as LogStatus] ?? '•'}</span>
                  <span className="truncate">
                    &quot;{entry.title}&quot; → {STATUS_LABEL[entry.status as LogStatus] ?? entry.status}
                    {entry.error && <span className="text-red-300 ml-1">({entry.error})</span>}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}

          {job.status === 'SUCCEEDED' && job.failed === 0 && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              동기화가 성공적으로 완료되었습니다!
            </div>
          )}

          {job.status === 'FAILED' && job.error_message && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-600">
              {job.error_message}
            </div>
          )}

          {/* 실패 목록 */}
          {failedItems.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-lg p-3 max-h-32 overflow-y-auto">
              <h4 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                실패 사유 ({failedItems.length}건)
              </h4>
              <ul className="space-y-1.5">
                {failedItems.map((item, idx) => (
                  <li
                    key={`${item.id}-${idx}`}
                    className="text-xs text-slate-700 bg-white p-2 rounded shadow-sm border border-red-50"
                  >
                    <span className="font-semibold">{item.title}</span>
                    <p className="text-red-500 mt-0.5 line-clamp-2">{item.error || '알 수 없는 오류'}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 액션 */}
          <div className="mt-4 space-y-3">
            {inFlight ? (
              <>
                <Button onClick={closePanel} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  백그라운드에서 계속하기
                </Button>
                <Button
                  onClick={() => cancel(job.id)}
                  disabled={isSubmitting}
                  variant="outline"
                  className="w-full"
                >
                  동기화 중단
                </Button>
              </>
            ) : (
              <>
                {failedItems.length > 0 && (
                  <Button
                    onClick={() => retryFailed(failedItems.map((i) => i.id).filter(Boolean))}
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    실패한 항목만 다시 시도 ({failedItems.length}건)
                  </Button>
                )}
                {(job.status === 'FAILED' || job.status === 'CANCELLED') && (
                  <Button
                    onClick={() => start({ restart: true })}
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    처음부터 다시 시도
                  </Button>
                )}
                <Button onClick={closePanel} variant="outline" className="w-full">
                  닫기
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes shimmer { 100% { transform: translateX(100%); } }`,
        }}
      />
    </div>
  )
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-slate-50 rounded-lg py-2">
      <span className="flex items-center gap-1">
        {icon}
        <span className="font-bold text-slate-800">{value}</span>
      </span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  )
}

/**
 * 최소화했을 때 남는 플로팅 표시.
 * 작업이 살아 있는 동안 어느 화면에서도 진행률을 볼 수 있고, 눌러서 다시 펼친다.
 */
export function SyncStatusPill() {
  const job = useSyncJobStore((s) => s.job)
  const isPanelOpen = useSyncJobStore((s) => s.isPanelOpen)
  const openPanel = useSyncJobStore((s) => s.openPanel)

  const visible = !!job && isJobInFlight(job.status) && !isPanelOpen
  const percentage = job && job.total > 0 ? Math.min(Math.round((job.processed / job.total) * 100), 100) : 0

  return (
    <AnimatePresence>
      {visible && job && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={openPanel}
          className="fixed bottom-24 right-5 z-[90] flex items-center gap-3 pl-3 pr-4 py-2.5 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <span className="relative flex items-center justify-center w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(percentage / 100) * 81.7} 81.7`}
              />
            </svg>
            <RefreshCw className="absolute w-3.5 h-3.5 text-indigo-600 animate-spin" />
          </span>
          <span className="text-left">
            <span className="block text-xs font-bold text-slate-800">구글 동기화 {percentage}%</span>
            <span className="block text-[10px] text-slate-500">
              {job.processed} / {job.total}
            </span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export type { SyncJob }
