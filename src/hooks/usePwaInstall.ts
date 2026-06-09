'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// 브라우저 종류를 감지하여 데스크톱 가이드에서 브라우저별 맞춤 안내를 제공하기 위한 유틸
type BrowserType = 'chrome' | 'edge' | 'other'

function detectBrowser(): BrowserType {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent.toLowerCase()
  // Edge는 'edg/'를 포함 (Chromium 기반 Edge)
  if (ua.includes('edg/')) return 'edge'
  // Chrome은 'chrome/'를 포함하지만 Edge가 아닌 경우
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'chrome'
  return 'other'
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [browserType, setBrowserType] = useState<BrowserType>('other')

  useEffect(() => {
    // 1. 스탠드얼론(설치된 앱) 모드인지 감지
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    setIsStandalone(isStandaloneMode)

    // 만약 이미 앱으로 실행 중이라면 더 이상 진행하지 않음 (버튼 숨김)
    if (isStandaloneMode) return

    // 2. 브라우저 종류 감지 (가이드 모달에서 브라우저별 안내를 위해)
    setBrowserType(detectBrowser())

    // 3. iOS 기기 감지
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(isIosDevice)

    if (isIosDevice) {
      // iOS는 beforeinstallprompt를 지원하지 않으므로, 스탠드얼론이 아니라면 설치 가능 상태로 둠
      setIsInstallable(true)
    }

    // 4. beforeinstallprompt 감지 (안드로이드, 데스크톱 크롬 등)
    // React hydration 지연으로 인해 이벤트를 놓치는 경우를 방지하기 위해
    // 전역 변수에 캐시된 이벤트를 우선 확인
    const winAny = window as any
    if (winAny.deferredPWAEvent) {
      setDeferredPrompt(winAny.deferredPWAEvent)
      setIsInstallable(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      // 이벤트 캐치 (이벤트가 발생했다는 것은 앱이 설치되어 있지 않음을 의미)
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      winAny.deferredPWAEvent = e
      setIsInstallable(true)
    }

    // 5. 앱 설치 완료 감지 (설치 직후 상태 업데이트)
    const handleAppInstalled = () => {
      setIsStandalone(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // 6. React hydration 타이밍 이슈 대비: 짧은 지연 후 전역 변수 재확인
    // layout.tsx 인라인 스크립트가 이벤트를 먼저 캐치하지만,
    // React useEffect가 실행될 때까지 약간의 지연이 있을 수 있음
    const retryTimer = setTimeout(() => {
      if (!deferredPrompt && winAny.deferredPWAEvent) {
        setDeferredPrompt(winAny.deferredPWAEvent)
        setIsInstallable(true)
      }
    }, 1000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(retryTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const installApp = useCallback(async () => {
    if (isIos) {
      // iOS는 외부 컴포넌트(모달)에서 가이드를 띄우도록 처리
      return { action: 'show-ios-guide' as const }
    }

    // React state에 없으면 전역 변수에서 한번 더 확인
    const prompt = deferredPrompt || (window as any).deferredPWAEvent as BeforeInstallPromptEvent | null

    if (!prompt) {
      // 브라우저 정책(이미 설치됨, 캐시 등)으로 자동 설치 프롬프트가 없을 경우
      // → 브라우저별 시각적 데스크톱 설치 가이드 모달을 표시
      return { action: 'show-desktop-guide' as const, browserType }
    }

    // 설치 프롬프트 띄우기
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice

      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        ;(window as any).deferredPWAEvent = null
        setIsInstallable(false)
        return { action: 'installed' as const }
      } else {
        return { action: 'dismissed' as const }
      }
    } catch {
      // prompt()가 실패하면 (이미 사용된 prompt 등) 데스크톱 가이드로 폴백
      return { action: 'show-desktop-guide' as const, browserType }
    }
  }, [deferredPrompt, isIos, browserType])

  return {
    isInstallable,
    isStandalone,
    isIos,
    browserType,
    installApp
  }
}
