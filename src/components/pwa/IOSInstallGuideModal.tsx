'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Share, PlusSquare, Smartphone } from 'lucide-react'

interface IOSInstallGuideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IOSInstallGuideModal({ open, onOpenChange }: IOSInstallGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-sm rounded-[24px] p-0 overflow-hidden bg-card border-none shadow-2xl">
        {/* 상단 헤더 영역 (그라데이션 강조) */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 pattern-dots opacity-20" />
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg ring-1 ring-white/30">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight relative z-10">
            바탕화면에 앱 추가하기
          </h2>
          <p className="text-[13px] font-medium text-white/90 mt-2 relative z-10 leading-relaxed">
            매번 검색할 필요 없이<br />바탕화면에서 터치 한 번으로 열어보세요!
          </p>
        </div>

        {/* 상세 가이드 단계 */}
        <div className="p-6 space-y-6 bg-card">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600 text-sm shadow-sm border border-blue-200">
              1
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[14px] font-bold text-foreground leading-snug">
                화면 맨 아래 중앙에 있는 <br />
                <span className="inline-flex items-center gap-1.5 text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded-md mt-1">
                  <Share className="w-4 h-4" /> 공유하기
                </span> 버튼을 눌러주세요.
              </p>
              <p className="text-[12px] text-muted-foreground mt-1 font-medium">네모칸 위로 화살표가 있는 모양이에요.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600 text-sm shadow-sm border border-blue-200">
              2
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[14px] font-bold text-foreground leading-snug">
                나오는 메뉴를 위로 올려서 <br />
                <span className="inline-flex items-center gap-1.5 text-foreground px-1.5 py-0.5 bg-muted rounded-md mt-1 border border-border/50">
                  <PlusSquare className="w-4 h-4" /> 홈 화면에 추가
                </span> 글자를 찾아 눌러주세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600 text-sm shadow-sm border border-blue-200">
              3
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[14px] font-bold text-foreground leading-snug">
                오른쪽 위에 나타난 <br />
                <strong className="text-blue-600">추가</strong> 글자를 누르면 완성입니다!
              </p>
            </div>
          </div>
        </div>

        {/* 푸터 영역 */}
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
