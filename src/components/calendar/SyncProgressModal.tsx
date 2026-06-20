'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, Calendar, CheckCircle2, XCircle, RefreshCw, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SyncState = 'idle' | 'syncing' | 'success' | 'partial_error' | 'fatal_error'

interface SyncProgressModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialOffset?: number
}

export function SyncProgressModal({ isOpen, onClose, onSuccess, initialOffset = 0 }: SyncProgressModalProps) {
  // 모달이 닫힐 때 상태를 초기화하는 래퍼
  const handleClose = () => {
    setSyncState('idle')
    isSyncingRef.current = false
    setProgress({ synced: 0, skipped: 0, failed: 0, total: 0, current: 0 })
    setFailedItems([])
    setRecentTitle(null)
    onClose()
  }
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [progress, setProgress] = useState({
    synced: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    current: 0
  })
  const [failedItems, setFailedItems] = useState<any[]>([])
  const [recentTitle, setRecentTitle] = useState<string | null>(null)
  
  // To avoid duplicate runs in React Strict Mode
  const isSyncingRef = useRef(false)

  const startSync = async (startOffset: number = 0) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setSyncState('syncing')
    setProgress({ synced: 0, skipped: 0, failed: 0, total: 0, current: 0 })
    setFailedItems([])
    setRecentTitle(null)

    let currentOffset = startOffset
    const limit = 10
    let hasMore = true
    let accumSynced = 0
    let accumSkipped = 0
    let accumFailed = 0
    let accumFailedItems: any[] = []
    let totalItems = 0
    
    // Safety break
    let loopCount = 0
    const maxLoops = 200 // Max 2000 items

    try {
      while (hasMore && loopCount < maxLoops) {
        loopCount++
        const res = await fetch('/api/calendar/sync/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset: currentOffset, limit })
        })

        if (!res.ok) {
          throw new Error('서버 응답 오류가 발생했습니다.')
        }

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
        }

        hasMore = data.hasMore
        currentOffset = data.nextOffset
        
        // Save offset to session storage in case of accidental reload
        sessionStorage.setItem('sync_offset', currentOffset.toString())
      }

      sessionStorage.removeItem('sync_offset')
      isSyncingRef.current = false
      
      if (accumFailed > 0) {
        setSyncState('partial_error')
        setFailedItems(accumFailedItems)
      } else {
        setSyncState('success')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      isSyncingRef.current = false
      setSyncState('fatal_error')
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
      isSyncingRef.current = false
    }
  }, [])

  if (!isOpen) return null

  const percentage = progress.total > 0 ? Math.min(Math.round((progress.current / progress.total) * 100), 100) : 0

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
          <div className="text-center mb-8">
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
          <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
            <motion.div 
              className={`absolute top-0 left-0 h-full rounded-full ${
                syncState === 'fatal_error' ? 'bg-red-500' :
                syncState === 'success' ? 'bg-emerald-500' :
                syncState === 'partial_error' ? 'bg-amber-500' :
                'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            {/* Shimmer Effect when syncing */}
            {syncState === 'syncing' && (
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            )}
          </div>

          {/* Stats Bar */}
          {(progress.current > 0 || syncState === 'success') && (
            <div className="flex justify-center gap-4 text-xs font-medium text-slate-600 mb-6 bg-slate-50 py-2 px-4 rounded-lg">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> 동기화: {progress.synced}</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-blue-400"/> 건너뜀: {progress.skipped}</span>
              <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-400"/> 실패: {progress.failed}</span>
            </div>
          )}

          {/* Recent Activity Message */}
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
                  💬 "{recentTitle}" 처리 완료
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

          {/* Action Buttons for Errors */}
          {(syncState === 'partial_error' || syncState === 'fatal_error') && (
            <div className="mt-6 space-y-3">
              <Button onClick={() => startSync(progress.current)} className="w-full bg-indigo-600 hover:bg-indigo-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                실패한 지점부터 다시 시도
              </Button>
              <Button onClick={handleClose} variant="outline" className="w-full">
                닫기
              </Button>
            </div>
          )}

          {/* Success Button */}
          {syncState === 'success' && (
            <div className="mt-6">
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
