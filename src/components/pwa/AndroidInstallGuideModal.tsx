'use client'

import React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MoreVertical, Download, Smartphone } from 'lucide-react'

interface AndroidInstallGuideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Android 설치 가이드 모달
 * 네이티브 설치 프롬프트(beforeinstallprompt)가 뜨지 않는 Android 환경의 폴백.
 * Chrome 우측 상단 ⋮ 메뉴를 통한 수동 설치 방법을 안내한다.
 */
export function AndroidInstallGuideModal({ open, onOpenChange }: AndroidInstallGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-sm rounded-[24px] p-0 overflow-hidden bg-card border-none shadow-2xl">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-6 py-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg ring-1 ring-white/30">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">홈 화면에 앱 추가하기</h2>
          <p className="text-[13px] font-medium text-white/90 mt-2 leading-relaxed">
            매번 검색할 필요 없이<br />홈 화면에서 터치 한 번으로 열어보세요!
          </p>
        </div>

        {/* 단계별 가이드 */}
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-green-100 flex items-center justify-center font-black text-green-600 text-sm shadow-sm border border-green-200">
              1
            </div>
            <p className="flex-1 pt-0.5 text-[14px] font-bold text-foreground leading-snug">
              브라우저 오른쪽 위의{' '}
              <span className="inline-flex items-center gap-1 text-green-700 px-1.5 py-0.5 bg-green-50 rounded-md">
                <MoreVertical className="w-4 h-4" /> 더보기
              </span>{' '}
              메뉴를 눌러주세요.
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-green-100 flex items-center justify-center font-black text-green-600 text-sm shadow-sm border border-green-200">
              2
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[14px] font-bold text-foreground leading-snug">
                <span className="inline-flex items-center gap-1 text-foreground px-1.5 py-0.5 bg-muted rounded-md border border-border/50">
                  <Download className="w-4 h-4" /> 앱 설치
                </span>{' '}
                또는{' '}
                <strong>홈 화면에 추가</strong> 를 눌러주세요.
              </p>
              <p className="text-[12px] text-muted-foreground mt-1 font-medium">메뉴 이름은 브라우저에 따라 조금 다를 수 있어요.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-green-100 flex items-center justify-center font-black text-green-600 text-sm shadow-sm border border-green-200">
              3
            </div>
            <p className="flex-1 pt-0.5 text-[14px] font-bold text-foreground leading-snug">
              나타나는 창에서 <strong className="text-green-600">설치 / 추가</strong> 를 누르면 완성입니다!
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-5 pt-0">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-12 text-[15px] font-bold rounded-xl bg-muted text-foreground hover:bg-accent border border-transparent hover:border-border transition-all active:scale-95"
          >
            이해했어요, 닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
