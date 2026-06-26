'use client'

import React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Monitor, Download, MoreVertical } from 'lucide-react'
import type { BrowserType } from '@/hooks/usePwaInstall'

interface DesktopInstallGuideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  browserType: BrowserType
}

/**
 * 데스크톱 설치 가이드 모달
 * beforeinstallprompt 이벤트가 없을 때 (이미 한번 거부했거나, 브라우저 정책으로 안 뜨는 경우) 표시.
 * Chrome / Edge / 기타 브라우저별로 맞춤 안내를 제공한다.
 */
export function DesktopInstallGuideModal({ open, onOpenChange, browserType }: DesktopInstallGuideModalProps) {
  const guideSteps: Record<BrowserType, React.ReactNode[]> = {
    chrome: [
      <>브라우저 <strong>주소창 오른쪽 끝</strong>의 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded text-xs"><Monitor className="w-3 h-3" />↓</span> 설치 아이콘을 클릭하세요.</>,
      <><strong>&ldquo;설치&rdquo;</strong> 또는 <strong>&ldquo;Install&rdquo;</strong> 버튼을 누르면 완료됩니다.</>,
    ],
    edge: [
      <>브라우저 오른쪽 위 <strong>⋯ (더보기 메뉴)</strong>를 클릭하세요.</>,
      <><strong>&ldquo;앱&rdquo;</strong> → <strong>&ldquo;이 사이트를 앱으로 설치&rdquo;</strong>를 선택하세요.</>,
    ],
    other: [
      <>브라우저 <strong>메뉴</strong> 또는 <strong>주소창</strong>에서 설치 옵션을 찾아주세요.</>,
      <>최신 <strong>Chrome</strong> 또는 <strong>Edge</strong> 브라우저 사용을 권장합니다.</>,
    ],
  }

  const browserLabel: Record<BrowserType, string> = {
    chrome: 'Chrome',
    edge: 'Edge',
    other: '브라우저',
  }

  const steps = guideSteps[browserType]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-sm rounded-[24px] p-0 overflow-hidden bg-card border-none shadow-2xl">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 px-6 py-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg ring-1 ring-white/30">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">데스크톱 앱으로 설치하기</h2>
          <p className="text-[13px] font-medium text-white/90 mt-2 leading-relaxed">
            {browserLabel[browserType]}에서 아래 방법으로<br />Calentask를 앱처럼 설치할 수 있어요.
          </p>
        </div>

        {/* 주소창 모의 미리보기 (Chrome / Edge) */}
        {(browserType === 'chrome' || browserType === 'edge') && (
          <div className="px-6 pt-5">
            <div className="bg-muted rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px]">🔒</span>
                  <span className="text-xs text-muted-foreground truncate">calentask.vercel.app</span>
                </div>
                <div className="w-7 h-7 rounded-md bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center animate-pulse">
                  {browserType === 'chrome'
                    ? <Download className="w-3.5 h-3.5 text-indigo-600" />
                    : <MoreVertical className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
              </div>
              <p className="text-[11px] text-indigo-600 font-bold mt-2 text-center">
                ↑ {browserType === 'chrome' ? '이 설치 아이콘을 클릭하세요' : '더보기 메뉴 → 앱 → 설치'}
              </p>
            </div>
          </div>
        )}

        {/* 단계별 가이드 */}
        <div className="p-6 space-y-5">
          {steps.map((text, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-sm shadow-sm border border-indigo-200">
                {i + 1}
              </div>
              <p className="flex-1 pt-1 text-[14px] font-medium text-foreground leading-snug">{text}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            💡 설치 아이콘이 보이지 않으면 이전에 설치를 취소했을 수 있어요. 주소창 왼쪽 정보(ⓘ) 아이콘에서도 설치할 수 있습니다.
          </p>
        </div>

        {/* 푸터 */}
        <div className="p-5 pt-0">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-12 text-[15px] font-bold rounded-xl bg-muted text-foreground hover:bg-accent border border-transparent hover:border-border transition-all active:scale-95"
          >
            확인했어요
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
