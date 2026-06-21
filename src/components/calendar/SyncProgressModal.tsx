'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, Calendar, CheckCircle2, XCircle, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SyncState = 'idle' | 'syncing' | 'success' | 'partial_error' | 'fatal_error'

interface LogEntry {
  title: string
  status: 'synced' | 'skipped' | 'failed' | 'task_skipped'
  error?: string
  timestamp: number
}

interface SyncProgressModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialOffset?: number
}

export function SyncProgressModal({ isOpen, onClose, onSuccess, initialOffset = 0 }: SyncProgressModalProps) {
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [progress, setProgress] = useState({
    synced: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    current: 0
  })
  const [failedItems, setFailedItems] = useState<any[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [recentTitle, setRecentTitle] = useState<string | null>(null)
  
  const isSyncingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  // 모달이 닫힐 때 상태를 초기화하는 래퍼
  const handleClose = () => {
    // 진행 중인 스트림 중단
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setSyncState('idle')
    isSyncingRef.current = false
    setProgress({ synced: 0, skipped: 0, failed: 0, total: 0, current: 0 })
    setFailedItems([])
    setLogEntries([])
    setRecentTitle(null)
    onClose()
  }

  // 로그 자동 스크롤
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logEntries])

  // ──────── 스트리밍 읽기 (줄 단위 NDJSON 파서) ────────
  const readStream = async (
    response: Response,
    signal: AbortSignal,
    onEvent: (data: any) => void
  ) => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        if (signal.aborted) break
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 마지막 불완전한 라인은 버퍼에 유지

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const data = JSON.parse(trimmed)
            onEvent(data)
          } catch {
            // 불완전한 JSON 라인 무시
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // ──────── 스트리밍 모드로 동기화 시작 ────────
  const startStreamSync = async (startOffset: number, accumSynced = 0, accumSkipped = 0, accumFailed = 0, accumFailedItems: any[] = []) => {
    let currentOffset = startOffset
    const limit = 10
    let hasMore = true
    let totalItems = 0
    const signal = abortControllerRef.current!.signal

    try {
      while (hasMore && !signal.aborted) {
        const res = await fetch('/api/calendar/sync/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset: currentOffset, limit }),
          signal
        })

        if (!res.ok || !res.body) {
          throw new Error('스트리밍 응답 오류')
        }

        let batchDone = false

        await readStream(res, signal, (data) => {
          if (data.type === 'start') {
            totalItems = data.total
            setProgress(prev => ({ ...prev, total: data.total }))
          } else if (data.type === 'progress') {
            if (data.status === 'synced') accumSynced++
            else if (data.status === 'skipped') accumSkipped++
            else if (data.status === 'failed') {
              accumFailed++
              accumFailedItems.push({ title: data.title, error: data.error })
            }

            const globalCurrent = currentOffset + data.current

            setProgress({
              synced: accumSynced,
              skipped: accumSkipped,
              failed: accumFailed,
              total: totalItems,
              current: globalCurrent
            })
            setRecentTitle(data.title)

            // 로그 추가 (최대 200건 유지)
            setLogEntries(prev => {
              const newEntry: LogEntry = {
                title: data.title,
                status: data.status,
                error: data.error,
                timestamp: Date.now()
              }
              const updated = [...prev, newEntry]
              return updated.length > 200 ? updated.slice(-200) : updated
            })
          } else if (data.type === 'done') {
            hasMore = data.hasMore
            currentOffset = data.nextOffset
            batchDone = true
          } else if (data.type === 'error') {
            throw new Error(data.message)
          }
        })

        if (!batchDone && !signal.aborted) {
          throw new Error('스트림이 완료 이벤트 없이 종료됨')
        }

        // 다음 배치 offset 저장
        sessionStorage.setItem('sync_offset', currentOffset.toString())
      }

      return { accumSynced, accumSkipped, accumFailed, accumFailedItems }
    } catch (err) {
      if (signal.aborted) return null // 사용자가 취소한 경우
      throw err
    }
  }

  // ──────── 폴백: 기존 JSON 배치 모드 ────────
  const startBatchFallback = async (startOffset: number, accumSynced: number, accumSkipped: number, accumFailed: number, accumFailedItems: any[], totalItems: number) => {
    let currentOffset = startOffset
    const limit = 10 // 기존 50에서 10으로 줄여 5배 촘촘한 업데이트
    let hasMore = true
    let loopCount = 0
    const maxLoops = 200
    const signal = abortControllerRef.current!.signal

    while (hasMore && loopCount < maxLoops && !signal.aborted) {
      loopCount++
      const res = await fetch('/api/calendar/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset: currentOffset, limit }),
        signal
      })

      if (!res.ok) throw new Error('서버 응답 오류가 발생했습니다.')

      const data = await res.json()

      accumSynced += data.synced
      accumSkipped += data.skipped
      accumFailed += data.failed
      if (data.failedItems?.length) {
        accumFailedItems = [...accumFailedItems, ...data.failedItems]
      }
      totalItems = data.total

      const currentProcessed = currentOffset + data.chunkSize

      setProgress({
        synced: accumSynced,
        skipped: accumSkipped,
        failed: accumFailed,
        total: totalItems,
        current: currentProcessed
      })

      if (data.recentActivityTitle) {
        setRecentTitle(data.recentActivityTitle)
        setLogEntries(prev => {
          const newEntry: LogEntry = {
            title: data.recentActivityTitle,
            status: data.synced > 0 ? 'synced' : 'skipped',
            timestamp: Date.now()
          }
          const updated = [...prev, newEntry]
          return updated.length > 200 ? updated.slice(-200) : updated
        })
      }

      hasMore = data.hasMore
      currentOffset = data.nextOffset
      sessionStorage.setItem('sync_offset', currentOffset.toString())
    }

    return { accumSynced, accumSkipped, accumFailed, accumFailedItems }
  }

  // ──────── 메인 동기화 함수 ────────
  const startSync = async (startOffset: number = 0) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    
    // 이전 AbortController 정리 후 새로 생성
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setSyncState('syncing')
    setProgress({ synced: 0, skipped: 0, failed: 0, total: 0, current: 0 })
    setFailedItems([])
    setLogEntries([])
    setRecentTitle(null)

    let finalResult: { accumSynced: number, accumSkipped: number, accumFailed: number, accumFailedItems: any[] } | null = null

    try {
      // 1차 시도: 스트리밍 모드
      finalResult = await startStreamSync(startOffset)
    } catch (streamErr) {
      console.warn('스트리밍 모드 실패, 폴백으로 전환:', streamErr)

      // 2차 시도: JSON 배치 폴백 모드 (현재 진행 상황 이어서)
      try {
        const currentTotal = progress.total || 0
        finalResult = await startBatchFallback(
          progress.current, // 스트리밍이 끊긴 지점부터 이어서
          progress.synced,
          progress.skipped,
          progress.failed,
          [...failedItems],
          currentTotal
        )
      } catch (fallbackErr) {
        console.error('폴백 모드도 실패:', fallbackErr)
        isSyncingRef.current = false
        setSyncState('fatal_error')
        return
      }
    }

    // 사용자가 취소한 경우
    if (!finalResult) {
      isSyncingRef.current = false
      return
    }

    sessionStorage.removeItem('sync_offset')
    isSyncingRef.current = false

    if (finalResult.accumFailed > 0) {
      setSyncState('partial_error')
      setFailedItems(finalResult.accumFailedItems)
    } else {
      setSyncState('success')
    }
  }

  // ──────── 실패 항목 재시도 ────────
  const retryFailedItems = async () => {
    if (isSyncingRef.current || failedItems.length === 0) return
    isSyncingRef.current = true

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setSyncState('syncing')
    setProgress({ synced: 0, skipped: 0, failed: 0, total: failedItems.length, current: 0 })

    const activityIds = failedItems.map(item => item.id)
    setFailedItems([])
    setLogEntries([])
    setRecentTitle('실패 항목 재시도 중...')

    try {
      const res = await fetch('/api/calendar/sync/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityIds }),
        signal: abortControllerRef.current.signal
      })

      if (!res.ok) throw new Error('서버 응답 오류가 발생했습니다.')

      const data = await res.json()

      setProgress({
        synced: data.synced,
        skipped: data.skipped,
        failed: data.failed,
        total: data.total,
        current: data.total
      })

      if (data.failedItems?.length) {
        setFailedItems(data.failedItems)
        setSyncState('partial_error')
      } else {
        setSyncState('success')
      }
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) return
      console.error('Retry failed:', error)
      setSyncState('fatal_error')
    } finally {
      isSyncingRef.current = false
    }
  }

  useEffect(() => {
    if (isOpen && syncState === 'idle') {
      startSync(initialOffset)
    }
  }, [isOpen, syncState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      isSyncingRef.current = false
    }
  }, [])

  if (!isOpen) return null

  const percentage = progress.total > 0 ? Math.min(Math.round((progress.current / progress.total) * 100), 100) : 0

  const getStatusIcon = (status: LogEntry['status']) => {
    switch (status) {
      case 'synced': return '✅'
      case 'skipped': return '🔄'
      case 'failed': return '❌'
      case 'task_skipped': return '⏭️'
    }
  }

  const getStatusLabel = (status: LogEntry['status']) => {
    switch (status) {
      case 'synced': return '동기화 완료'
      case 'skipped': return '이미 존재 (건너뜀)'
      case 'failed': return '실패'
      case 'task_skipped': return '할 일 (건너뜀)'
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
      >
        <div className="p-6 md:p-8">
          
          {/* Header Icons */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 shadow-sm">
              <Cloud className="w-7 h-7" />
            </div>
            
            <div className="text-slate-300">
              <ArrowRight className={`w-6 h-6 ${syncState === 'syncing' ? 'animate-pulse text-indigo-400' : ''}`} />
            </div>
            
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
              <Calendar className="w-7 h-7" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">
              {syncState === 'idle' && '동기화를 준비하고 있습니다...'}
              {syncState === 'syncing' && '구글 캘린더로 일정 내보내는 중...'}
              {syncState === 'success' && '모든 일정이 동기화되었습니다!'}
              {syncState === 'partial_error' && '일부 일정 동기화 실패'}
              {syncState === 'fatal_error' && '동기화 중 오류 발생'}
            </h3>
            
            {/* Progress Text */}
            {(syncState === 'syncing' || syncState === 'idle') && progress.total > 0 && (
              <p className="text-sm font-medium text-slate-500 mt-2">
                {progress.current} / {progress.total} ({percentage}%)
              </p>
            )}
          </div>

          {/* Progress Bar Container */}
          <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-4 shadow-inner">
            <motion.div 
              className={`absolute top-0 left-0 h-full rounded-full ${
                syncState === 'fatal_error' ? 'bg-red-500' :
                syncState === 'success' ? 'bg-emerald-500' :
                syncState === 'partial_error' ? 'bg-amber-500' :
                'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            {/* Shimmer Effect when syncing */}
            {syncState === 'syncing' && (
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            )}
          </div>

          {/* Stats Bar */}
          {(progress.current > 0 || syncState === 'success') && (
            <div className="flex justify-center gap-4 text-xs font-medium text-slate-600 mb-4 bg-slate-50 py-2 px-4 rounded-lg">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> 동기화: {progress.synced}</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-blue-400"/> 건너뜀: {progress.skipped}</span>
              <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-400"/> 실패: {progress.failed}</span>
            </div>
          )}

          {/* 실시간 로그 피드 */}
          {logEntries.length > 0 && (
            <div className="bg-slate-900 rounded-lg p-3 mb-4 max-h-36 overflow-y-auto font-mono text-[11px] leading-relaxed scroll-smooth">
              {logEntries.map((entry, idx) => (
                <div key={idx} className={`flex items-start gap-1.5 py-0.5 ${
                  entry.status === 'failed' ? 'text-red-400' :
                  entry.status === 'synced' ? 'text-emerald-400' :
                  entry.status === 'task_skipped' ? 'text-slate-500' :
                  'text-blue-300'
                }`}>
                  <span className="shrink-0">{getStatusIcon(entry.status)}</span>
                  <span className="truncate">
                    &quot;{entry.title}&quot; → {getStatusLabel(entry.status)}
                    {entry.error && <span className="text-red-300 ml-1">({entry.error})</span>}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}

          {/* Recent Activity Message (로그가 없을 때만) */}
          {logEntries.length === 0 && (
            <div className="h-10 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {syncState === 'syncing' && recentTitle && (
                  <motion.p 
                    key={recentTitle}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-slate-500 text-center line-clamp-1"
                  >
                    💬 &quot;{recentTitle}&quot; 처리 완료
                  </motion.p>
                )}
                {syncState === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-emerald-600 font-bold"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    동기화가 성공적으로 완료되었습니다!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 성공 메시지 (로그가 있을 때) */}
          {logEntries.length > 0 && syncState === 'success' && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              동기화가 성공적으로 완료되었습니다!
            </div>
          )}

          {/* Failed Items List */}
          {(syncState === 'partial_error' || syncState === 'fatal_error') && failedItems.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-lg p-3 max-h-32 overflow-y-auto">
              <h4 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                실패 사유 ({failedItems.length}건)
              </h4>
              <ul className="space-y-1.5">
                {failedItems.map((item, idx) => (
                  <li key={idx} className="text-xs text-slate-700 bg-white p-2 rounded shadow-sm border border-red-50">
                    <span className="font-semibold">{item.title}</span>
                    <p className="text-red-500 mt-0.5 line-clamp-2">{item.error || '알 수 없는 오류'}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons for Errors */}
          {(syncState === 'partial_error' || syncState === 'fatal_error') && (
            <div className="mt-4 space-y-3">
              {syncState === 'partial_error' ? (
                <Button onClick={retryFailedItems} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  실패한 항목만 다시 시도 ({failedItems.length}건)
                </Button>
              ) : (
                <Button onClick={() => startSync(progress.current)} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  실패한 지점부터 다시 시도
                </Button>
              )}
              <Button onClick={handleClose} variant="outline" className="w-full">
                닫기
              </Button>
            </div>
          )}

          {/* Success Button */}
          {syncState === 'success' && (
            <div className="mt-4">
              <Button onClick={() => { handleClose(); onSuccess() }} className="w-full bg-emerald-600 hover:bg-emerald-700">
                확인
              </Button>
            </div>
          )}
        </div>
      </motion.div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  )
}
