'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 1. 스탠드얼론(설치된 앱) 모드인지 감지
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    setIsStandalone(isStandaloneMode)

    // 만약 이미 앱으로 실행 중이라면 더 이상 진행하지 않음 (버튼 숨김)
    if (isStandaloneMode) return

    // 2. iOS 기기 감지
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(isIosDevice)

    if (isIosDevice) {
      // iOS는 beforeinstallprompt를 지원하지 않으므로, 스탠드얼론이 아니라면 설치 가능 상태로 둠
      setIsInstallable(true)
    }

    // 3. beforeinstallprompt 감지 (안드로이드, 데스크톱 크롬 등)
    // 이미 발생해서 전역 객체에 저장되어 있다면 바로 사용
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

    // 4. 앱 설치 완료 감지 (설치 직후 상태 업데이트)
    const handleAppInstalled = () => {
      setIsStandalone(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (isIos) {
      // iOS는 외부 컴포넌트(모달)에서 가이드를 띄우도록 처리
      return { action: 'show-ios-guide' }
    }

    if (!deferredPrompt) {
      // 브라우저 정책(이미 설치됨, 캐시 등)으로 자동 설치 프롬프트가 없을 경우 수동 설치 안내
      return { action: 'show-desktop-guide' }
    }

    // 설치 프롬프트 띄우기
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstallable(false)
      return { action: 'installed' }
    } else {
      return { action: 'dismissed' }
    }
  }

  return {
    isInstallable,
    isStandalone,
    isIos,
    installApp
  }
}
