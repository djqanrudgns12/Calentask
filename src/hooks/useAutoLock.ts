'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useArchiveStore } from '@/store/useArchiveStore'

const AUTO_LOCK_TIMEOUT = 30 * 60 * 1000 // 30분

export function useAutoLock(isEnabled: boolean) {
  const { setPinLocked, isPinLocked } = useArchiveStore()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = useCallback(() => {
    if (!isEnabled || isPinLocked) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setPinLocked(true)
    }, AUTO_LOCK_TIMEOUT)
  }, [isEnabled, isPinLocked, setPinLocked])

  useEffect(() => {
    if (!isEnabled) return

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click']

    // 초기 타이머 시작
    resetTimer()

    events.forEach(event =>
      window.addEventListener(event, resetTimer, { passive: true })
    )

    // 탭 전환 감지: 브라우저 탭을 숨겼다 돌아왔을 때도 타이머 체크
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        resetTimer()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(event => window.removeEventListener(event, resetTimer))
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isEnabled, resetTimer])
}
