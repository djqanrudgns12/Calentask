'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share, Monitor, ArrowUp, MoreVertical } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

/**
 * 데스크톱 설치 가이드 모달
 * Chrome, Edge, 기타 브라우저에 따라 맞춤형 설치 안내를 제공
 * beforeinstallprompt 이벤트가 없을 때 (이미 한번 거부했거나, 브라우저 정책으로 안 뜨는 경우) 표시됨
 */
function DesktopGuideModal({ 
  isOpen, 
  onClose, 
  browserType 
}: { 
  isOpen: boolean
  onClose: () => void
  browserType: 'chrome' | 'edge' | 'other'
}) {
  // 브라우저별 안내 메시지 구성
  const guideSteps = {
    chrome: [
      {
        icon: <ArrowUp className="w-4 h-4 text-blue-500" />,
        text: (
          <>브라우저 <strong>주소창 오른쪽 끝</strong>에 있는 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded text-xs font-mono"><Monitor className="w-3 h-3" />↓</span> 아이콘을 클릭하세요.</>
        )
      },
      {
        icon: <Download className="w-4 h-4 text-blue-500" />,
        text: <><strong>&ldquo;앱 설치&rdquo;</strong> 또는 <strong>&ldquo;Install app&rdquo;</strong>를 클릭하세요.</>
      },
    ],
    edge: [
      {
        icon: <MoreVertical className="w-4 h-4 text-blue-500" />,
        text: (
          <>브라우저 오른쪽 위 <strong>⋯ (더보기 메뉴)</strong>를 클릭하세요.</>
        )
      },
      {
        icon: <Download className="w-4 h-4 text-blue-500" />,
        text: <><strong>&ldquo;앱&rdquo;</strong> → <strong>&ldquo;이 사이트를 앱으로 설치&rdquo;</strong>를 선택하세요.</>
      },
    ],
    other: [
      {
        icon: <MoreVertical className="w-4 h-4 text-blue-500" />,
        text: <>브라우저 <strong>메뉴</strong> 또는 <strong>주소창</strong>에서 설치 옵션을 찾아 주세요.</>
      },
      {
        icon: <Monitor className="w-4 h-4 text-blue-500" />,
        text: <>최신 <strong>Chrome</strong> 또는 <strong>Edge</strong> 브라우저 사용을 권장합니다.</>
      },
    ],
  }

  const browserLabel = {
    chrome: 'Chrome',
    edge: 'Edge',
    other: '브라우저',
  }

  const steps = guideSteps[browserType]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card rounded-3xl w-full max-w-[420px] max-h-[85vh] overflow-y-auto shadow-2xl relative"
          >
            {/* 닫기 버튼 */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-muted hover:bg-slate-200 rounded-full text-muted-foreground transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 text-center">
              {/* 아이콘 */}
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner border border-indigo-100/50">
                <Monitor className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">데스크톱 앱 설치</h3>
              <p className="text-sm text-muted-foreground mb-1 leading-relaxed">
                {browserLabel[browserType]} 브라우저에서 아래 방법으로
              </p>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Calentask를 데스크톱 앱으로 설치할 수 있습니다.
              </p>

              {/* 시각적 미리보기: Chrome 주소창 모의 이미지 */}
              {browserType === 'chrome' && (
                <div className="mb-5 mx-auto max-w-[340px]">
                  <div className="bg-muted rounded-xl border border-border p-3">
                    {/* 브라우저 주소창 모의 */}
                    <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="w-4 h-4 rounded bg-green-100 flex items-center justify-center">
                          <span className="text-[8px] text-green-600">🔒</span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">calentask.vercel.app</span>
                      </div>
                      {/* 설치 아이콘 강조 */}
                      <div className="relative">
                        <div className="w-7 h-7 rounded-md bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center animate-pulse">
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        {/* 화살표 */}
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-indigo-500">
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
                            <polygon points="6,0 0,10 12,10" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-indigo-600 font-bold mt-3 text-center">
                      ↑ 이 아이콘을 클릭하세요
                    </p>
                  </div>
                </div>
              )}

              {/* Edge 주소창 모의 */}
              {browserType === 'edge' && (
                <div className="mb-5 mx-auto max-w-[340px]">
                  <div className="bg-muted rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between bg-card rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="w-4 h-4 rounded bg-green-100 flex items-center justify-center">
                          <span className="text-[8px] text-green-600">🔒</span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">calentask.vercel.app</span>
                      </div>
                      {/* 더보기 메뉴 강조 */}
                      <div className="relative">
                        <div className="w-7 h-7 rounded-md bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center animate-pulse">
                          <MoreVertical className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-indigo-500">
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
                            <polygon points="6,0 0,10 12,10" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-indigo-600 font-bold mt-3 text-center">
                      ↑ 더보기 메뉴 → &ldquo;앱&rdquo; → &ldquo;이 사이트를 앱으로 설치&rdquo;
                    </p>
                  </div>
                </div>
              )}
              
              {/* 단계별 가이드 */}
              <div className="bg-muted border border-border rounded-2xl p-4 text-left space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* 추가 팁 */}
              <div className="mt-4 px-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  💡 설치 아이콘이 보이지 않으면, 이전에 설치를 취소한 적이 있을 수 있습니다.
                  <br />
                  <span className="text-indigo-500 font-medium">
                    Chrome: 주소창 좌측 &ldquo;ℹ️&rdquo; → &ldquo;앱으로 설치&rdquo;
                  </span>
                </p>
              </div>
              
              <button 
                onClick={onClose}
                className="w-full mt-5 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors"
              >
                확인했습니다
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/**
 * iOS 설치 가이드 모달
 * Safari의 "홈 화면에 추가" 기능을 단계별로 안내
 */
function IosGuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bg-card rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-2xl relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-muted hover:bg-slate-200 rounded-full text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner">
                <Download className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">앱으로 설치하기</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Calentask를 홈 화면에 추가하여<br/>전체화면 앱처럼 쾌적하게 사용해보세요.
              </p>
              
              <div className="bg-muted border border-border rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-foreground font-bold text-xs flex items-center justify-center shrink-0">1</span>
                  <p className="text-sm text-foreground flex items-center gap-1">
                    하단 메뉴에서 <Share className="w-4 h-4 text-blue-500 inline mx-1" /> 아이콘을 탭하세요.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-foreground font-bold text-xs flex items-center justify-center shrink-0">2</span>
                  <p className="text-sm text-foreground">
                    <strong>홈 화면에 추가</strong> 메뉴를 선택하세요.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="w-full mt-6 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors"
              >
                확인했습니다
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}


export function PwaInstallPrompt({ isDesktop = false }: { isDesktop?: boolean }) {
  const { isInstallable, isStandalone, isIos, browserType, installApp } = usePwaInstall()
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [showDesktopGuide, setShowDesktopGuide] = useState(false)

  // 개발 환경 등에서 디버깅용 로그 (나중에 제거 가능)
  useEffect(() => {
    // console.log("PWA State:", { isInstallable, isStandalone, isIos, browserType })
  }, [isInstallable, isStandalone, isIos, browserType])

  // 스탠드얼론(앱 모드)으로 이미 실행 중이라면 렌더링하지 않음
  if (isStandalone) return null

  const handleInstallClick = async () => {
    const result = await installApp()
    if (result?.action === 'show-ios-guide') {
      setShowIosGuide(true)
    } else if (result?.action === 'show-desktop-guide') {
      // toast 대신 시각적 가이드 모달을 표시하여 사용자가 확실히 설치 방법을 이해할 수 있도록 함
      setShowDesktopGuide(true)
    } else if (result?.action === 'installed') {
      toast.success('앱이 설치되었습니다! 🎉')
    }
  }

  // 데스크톱 환경에서는 사이드바 하단 등에 맞게 렌더링
  if (isDesktop) {
    return (
      <>
        <button 
          onClick={handleInstallClick}
          className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-xl border border-indigo-100"
        >
          <Download className="w-4 h-4" />
          데스크톱 앱으로 설치
        </button>
        <DesktopGuideModal 
          isOpen={showDesktopGuide} 
          onClose={() => setShowDesktopGuide(false)} 
          browserType={browserType}
        />
      </>
    )
  }

  // 모바일 환경 (혹은 공통 버튼 형태)
  return (
    <>
      <button 
        onClick={handleInstallClick}
        className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-left w-full mt-1"
      >
        <Download className="w-4 h-4 text-blue-500" />
        홈 화면에 앱 설치
      </button>

      {/* iOS 가이드 모달 */}
      <IosGuideModal isOpen={showIosGuide} onClose={() => setShowIosGuide(false)} />
      
      {/* 데스크톱 가이드 모달 (모바일 메뉴에서도 데스크톱으로 접속한 경우 대비) */}
      <DesktopGuideModal 
        isOpen={showDesktopGuide} 
        onClose={() => setShowDesktopGuide(false)} 
        browserType={browserType}
      />
    </>
  )
}
