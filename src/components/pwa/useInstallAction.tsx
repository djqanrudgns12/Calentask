'use client'

import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { usePwaInstall, type Platform, type BrowserType } from '@/hooks/usePwaInstall'
import { IOSInstallGuideModal } from '@/components/pwa/IOSInstallGuideModal'
import { AndroidInstallGuideModal } from '@/components/pwa/AndroidInstallGuideModal'
import { DesktopInstallGuideModal } from '@/components/pwa/DesktopInstallGuideModal'
import { InAppBrowserGuideModal } from '@/components/pwa/InAppBrowserGuideModal'

export type { Platform, BrowserType }

/**
 * 설치 진입점(드롭다운/모바일 사이드바/환경설정 배너) 3곳이 동일하게 동작하도록
 * 설치 클릭 핸들러와 가이드 모달을 한 곳에 캡슐화한 headless 훅.
 *
 * 호출부는 자신만의 스타일 버튼에 `onInstallClick`을 연결하고,
 * 반환된 `GuideModals` 엘리먼트를 트리 어딘가에 렌더하기만 하면 된다.
 */
export function useInstallAction() {
  const { isStandalone, platform, browserType, installApp } = usePwaInstall()

  const [showIos, setShowIos] = useState(false)
  const [showAndroid, setShowAndroid] = useState(false)
  const [showDesktop, setShowDesktop] = useState(false)
  const [showInApp, setShowInApp] = useState(false)

  const onInstallClick = useCallback(async () => {
    const result = await installApp()
    switch (result.action) {
      case 'installed':
        toast.success('앱이 설치되었습니다! 🎉')
        break
      case 'dismissed':
        // 사용자가 네이티브 프롬프트를 닫음 — 별도 처리 없음
        break
      case 'show-ios-guide':
        setShowIos(true)
        break
      case 'show-android-guide':
        setShowAndroid(true)
        break
      case 'show-desktop-guide':
        setShowDesktop(true)
        break
      case 'show-inapp-guide':
        setShowInApp(true)
        break
    }
  }, [installApp])

  const GuideModals = (
    <>
      <IOSInstallGuideModal open={showIos} onOpenChange={setShowIos} />
      <AndroidInstallGuideModal open={showAndroid} onOpenChange={setShowAndroid} />
      <DesktopInstallGuideModal open={showDesktop} onOpenChange={setShowDesktop} browserType={browserType} />
      <InAppBrowserGuideModal open={showInApp} onOpenChange={setShowInApp} platform={platform} />
    </>
  )

  return { onInstallClick, GuideModals, isStandalone, platform }
}
