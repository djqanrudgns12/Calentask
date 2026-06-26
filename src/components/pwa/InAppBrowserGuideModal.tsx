'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Compass, Copy, Check, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import type { Platform } from '@/hooks/usePwaInstall'

interface InAppBrowserGuideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platform: Platform
}

/**
 * 인앱(내장) 브라우저 안내 모달
 * 카카오톡·네이버앱·인스타그램 등 내장 브라우저는 "홈 화면에 추가"가 불가능하므로
 * Safari(iOS) / Chrome(Android) 같은 외부 브라우저로 열도록 안내한다.
 * 현재 URL 복사 버튼을 폴백으로 제공한다.
 */
export function InAppBrowserGuideModal({ open, onOpenChange, platform }: InAppBrowserGuideModalProps) {
  const [copied, setCopied] = useState(false)

  const targetBrowser = platform === 'ios' ? 'Safari' : 'Chrome'

  const handleCopyUrl = async () => {
    try {
      const url = window.location.href
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        // 구형 폴백
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      toast.success('주소가 복사되었어요. 브라우저 주소창에 붙여넣어 주세요.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('주소 복사에 실패했어요. 주소창을 길게 눌러 복사해 주세요.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-sm rounded-[24px] p-0 overflow-hidden bg-card border-none shadow-2xl">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-6 py-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg ring-1 ring-white/30">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">{targetBrowser}에서 열어주세요</h2>
          <p className="text-[13px] font-medium text-white/90 mt-2 leading-relaxed">
            지금은 다른 앱 안의 브라우저예요.<br />
            앱 설치는 <strong>{targetBrowser}</strong>에서만 가능해요.
          </p>
        </div>

        {/* 안내 */}
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm shadow-sm border border-orange-200">
              1
            </div>
            <p className="flex-1 pt-0.5 text-[14px] font-bold text-foreground leading-snug">
              화면 오른쪽 위{' '}
              <span className="inline-flex items-center gap-1 text-orange-700 px-1.5 py-0.5 bg-orange-50 rounded-md">
                <MoreVertical className="w-4 h-4" /> 메뉴
              </span>{' '}
              를 누르세요.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm shadow-sm border border-orange-200">
              2
            </div>
            <p className="flex-1 pt-0.5 text-[14px] font-bold text-foreground leading-snug">
              {platform === 'ios'
                ? <><strong>&ldquo;기본 브라우저로 열기&rdquo;</strong> 또는 <strong>&ldquo;Safari로 열기&rdquo;</strong>를 선택하세요.</>
                : <><strong>&ldquo;다른 브라우저로 열기&rdquo;</strong> 또는 <strong>&ldquo;Chrome으로 열기&rdquo;</strong>를 선택하세요.</>}
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm shadow-sm border border-orange-200">
              3
            </div>
            <p className="flex-1 pt-0.5 text-[14px] font-bold text-foreground leading-snug">
              열린 브라우저에서 다시 <strong className="text-orange-600">앱 설치</strong> 를 눌러주세요.
            </p>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            메뉴를 못 찾겠다면 아래 버튼으로 주소를 복사한 뒤, {targetBrowser}를 직접 열어 붙여넣어 주세요.
          </p>
        </div>

        {/* 푸터 */}
        <div className="p-5 pt-0 space-y-2">
          <Button
            onClick={handleCopyUrl}
            className="w-full h-12 text-[15px] font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all active:scale-95"
          >
            {copied ? <><Check className="w-4 h-4 mr-2" /> 복사됨</> : <><Copy className="w-4 h-4 mr-2" /> 주소 복사하기</>}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-11 text-[14px] font-bold rounded-xl bg-muted text-foreground hover:bg-accent border border-transparent hover:border-border transition-all active:scale-95"
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
