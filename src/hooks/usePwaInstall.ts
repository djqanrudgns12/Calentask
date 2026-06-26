'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// 브라우저 종류를 감지하여 데스크톱 가이드에서 브라우저별 맞춤 안내를 제공하기 위한 유틸
export type BrowserType = 'chrome' | 'edge' | 'other'

// 플랫폼: 설치 방식이 근본적으로 다르므로 3가지로 구분
//  - ios:     beforeinstallprompt 미지원 → Safari "홈 화면에 추가" 가이드
//  - android: Chrome 등에서 프롬프트 지원, 없으면 ⋮ 메뉴 가이드
//  - desktop: Chromium 계열 프롬프트 지원, 없으면 주소창 가이드
export type Platform = 'ios' | 'android' | 'desktop'

// 설치 클릭 시 호출부가 받는 액션 (discriminated union)
export type InstallAction =
  | { action: 'installed' }
  | { action: 'dismissed' }
  | { action: 'show-ios-guide' }
  | { action: 'show-android-guide' }
  | { action: 'show-desktop-guide'; browserType: BrowserType }
  | { action: 'show-inapp-guide'; platform: Platform }

function detectBrowser(): BrowserType {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent.toLowerCase()
  // Edge는 'edg/'를 포함 (Chromium 기반 Edge)
  if (ua.includes('edg/')) return 'edge'
  // Chrome은 'chrome/'를 포함하지만 Edge가 아닌 경우
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'chrome'
  return 'other'
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua) || (ua.includes('mac') && 'ontouchend' in document)
  if (isIos) return 'ios'
  if (ua.includes('android')) return 'android'
  return 'desktop'
}

// 카카오톡/네이버/인스타그램 등 인앱(내장) 브라우저 감지.
// 이 환경들은 "홈 화면에 추가"가 불가능하므로 외부 브라우저로 열도록 안내해야 한다.
function detectInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  const inAppTokens = [
    'kakaotalk',
    'naver',         // 네이버 앱 / 네이버 검색 인앱
    'line/',
    'instagram',
    'fban',          // Facebook
    'fbav',
    'fb_iab',
    'daumapps',      // 다음 앱
    'whale',         // 네이버 웨일 (모바일 앱 인앱 케이스 포함)
    'everytimeapp',  // 에브리타임
    'band',          // 밴드
    'kakaostory',
    'trill',         // 틱톡
  ]
  return inAppTokens.some((token) => ua.includes(token))
}

export function usePwaInstall() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [browserType, setBrowserType] = useState<BrowserType>('other')

  // deferredPrompt는 렌더링에 직접 쓰이지 않고 클릭 시점에만 참조되므로 ref로 보관한다.
  // (setTimeout 재확인 시 stale-closure를 피하기 위함)
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)

  // 파생 편의 플래그
  const isIos = platform === 'ios'

  useEffect(() => {
    // 1. 스탠드얼론(설치된 앱) 모드 감지 및 동적 리스너 등록
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    }

    setIsStandalone(checkStandalone())

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches || (window.navigator as any).standalone === true)
    }
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaQueryChange)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleMediaQueryChange)
    }

    // 2. 플랫폼 / 브라우저 / 인앱 여부 감지
    const detectedPlatform = detectPlatform()
    setPlatform(detectedPlatform)
    setBrowserType(detectBrowser())
    setIsInAppBrowser(detectInAppBrowser())

    // iOS는 beforeinstallprompt를 지원하지 않으므로, 스탠드얼론이 아니라면 설치 가능 상태로 둠
    if (detectedPlatform === 'ios') {
      setIsInstallable(true)
    }

    // 3. beforeinstallprompt 감지 (안드로이드, 데스크톱 크롬 등)
    // React hydration 지연으로 이벤트를 놓치는 경우를 방지하기 위해
    // layout.tsx 인라인 스크립트가 전역 변수에 캐시해 둔 이벤트를 우선 확인
    const winAny = window as any
    if (winAny.deferredPWAEvent) {
      deferredPromptRef.current = winAny.deferredPWAEvent
      setIsInstallable(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e as BeforeInstallPromptEvent
      winAny.deferredPWAEvent = e
      setIsInstallable(true)
    }

    // 4. 앱 설치 완료 감지 (설치 직후 상태 업데이트)
    const handleAppInstalled = () => {
      setIsStandalone(true)
      setIsInstallable(false)
      deferredPromptRef.current = null
      winAny.deferredPWAEvent = null
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // 5. React hydration 타이밍 이슈 대비: 짧은 지연 후 전역 변수 재확인
    const retryTimer = setTimeout(() => {
      if (!deferredPromptRef.current && winAny.deferredPWAEvent) {
        deferredPromptRef.current = winAny.deferredPWAEvent
        setIsInstallable(true)
      }
    }, 1000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(retryTimer)
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaQueryChange)
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleMediaQueryChange)
      }
    }
  }, [])

  const installApp = useCallback(async (): Promise<InstallAction> => {
    // 0. 인앱(내장) 브라우저는 설치가 불가능하므로 외부 브라우저로 열도록 안내
    if (isInAppBrowser) {
      return { action: 'show-inapp-guide', platform }
    }

    // 1. 네이티브 설치 프롬프트가 있으면 우선 사용 (Android Chrome, Desktop Chromium)
    const prompt = deferredPromptRef.current || ((window as any).deferredPWAEvent as BeforeInstallPromptEvent | null)
    if (prompt) {
      try {
        await prompt.prompt()
        const { outcome } = await prompt.userChoice
        if (outcome === 'accepted') {
          deferredPromptRef.current = null
          ;(window as any).deferredPWAEvent = null
          setIsInstallable(false)
          return { action: 'installed' }
        }
        return { action: 'dismissed' }
      } catch {
        // prompt()가 실패하면 (이미 사용된 prompt 등) 플랫폼별 가이드로 폴백
      }
    }

    // 2. 프롬프트가 없으면 플랫폼별 가이드 모달로 분기
    if (platform === 'ios') {
      return { action: 'show-ios-guide' }
    }
    if (platform === 'android') {
      return { action: 'show-android-guide' }
    }
    return { action: 'show-desktop-guide', browserType }
  }, [isInAppBrowser, platform, browserType])

  return {
    isInstallable,
    isStandalone,
    isIos,
    platform,
    isInAppBrowser,
    browserType,
    installApp,
  }
}
