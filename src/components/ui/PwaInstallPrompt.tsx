'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export function PwaInstallPrompt({ isDesktop = false }: { isDesktop?: boolean }) {
  const { isInstallable, isStandalone, isIos, installApp } = usePwaInstall()
  const [showIosGuide, setShowIosGuide] = useState(false)

  // 개발 환경 등에서 디버깅용 로그 (나중에 제거 가능)
  useEffect(() => {
    // console.log("PWA State:", { isInstallable, isStandalone, isIos })
  }, [isInstallable, isStandalone, isIos])

  // 서비스 워커 등록 (React Hydration 이후 load 이벤트 대기 문제 해결)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err)
      })
    }
  }, []);

  // 스탠드얼론(앱 모드)으로 이미 실행 중이라면 렌더링하지 않음
  if (isStandalone) return null

  const handleInstallClick = async () => {
    const result = await installApp()
    if (result?.action === 'show-ios-guide') {
      setShowIosGuide(true)
    } else if (result?.action === 'show-desktop-guide') {
      toast.info('자동 설치 팝업을 띄울 수 없습니다.', {
        description: '브라우저 주소창 우측의 "설치" 아이콘이나 브라우저 메뉴의 "앱 설치" 버튼을 클릭하여 설치해 주세요.',
        duration: 5000,
      })
    }
  }

  // 데스크톱 환경에서는 사이드바 하단 등에 맞게 렌더링
  if (isDesktop) {
    return (
      <button 
        onClick={handleInstallClick}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-xl border border-indigo-100"
      >
        <Download className="w-4 h-4" />
        데스크톱 앱으로 설치
      </button>
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
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setShowIosGuide(false)}
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner">
                  <Download className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">앱으로 설치하기</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  Calentask를 홈 화면에 추가하여<br/>전체화면 앱처럼 쾌적하게 사용해보세요.
                </p>
                
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <p className="text-sm text-slate-700 flex items-center gap-1">
                      하단 메뉴에서 <Share className="w-4 h-4 text-blue-500 inline mx-1" /> 아이콘을 탭하세요.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <p className="text-sm text-slate-700">
                      <strong>홈 화면에 추가</strong> 메뉴를 선택하세요.
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowIosGuide(false)}
                  className="w-full mt-6 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  확인했습니다
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
