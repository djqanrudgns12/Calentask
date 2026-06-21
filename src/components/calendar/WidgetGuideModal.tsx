import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Smartphone, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

type GuideType = 'ios' | 'android' | 'desktop' | null

interface Props {
  type: GuideType
  isOpen: boolean
  onClose: () => void
}

const GUIDE_DATA = {
  ios: {
    icon: Smartphone,
    title: 'iOS 위젯 가이드',
    color: 'from-blue-600 to-indigo-600',
    steps: [
      { 
        title: 'App Store에서 앱 다운로드', 
        content: '아이폰에 **Google 캘린더** 앱이 설치되어 있는지 확인합니다.\n\n💡 *로그인은 Calentask에 연동한 구글 계정으로 진행해 주세요.*' 
      },
      { 
        title: '바탕화면 길게 누르기', 
        content: '홈 화면 빈 공간을 **2초 이상 길게** 눌러 아이콘이 흔들리게(Jiggle Mode) 한 뒤,\n좌측 상단의 **[+] 버튼**을 탭합니다.' 
      },
      { 
        title: '위젯 검색 및 배치', 
        content: '검색창에서 **Google 캘린더**를 찾고, 원하는 크기의 위젯을 추가하세요.\n바탕화면에 끌어다 놓으면 완성입니다!' 
      }
    ]
  },
  android: {
    icon: Smartphone,
    title: 'Android 위젯 가이드',
    color: 'from-emerald-500 to-teal-600',
    steps: [
      { 
        title: '구글 캘린더 앱 확인', 
        content: '스마트폰에 기본 내장된 **Google 캘린더** 앱을 실행해 봅니다.\n\n💡 *로그인은 Calentask에 연동한 구글 계정으로 진행해 주세요.*' 
      },
      { 
        title: '홈 화면 위젯 메뉴', 
        content: '홈 화면의 빈 공간을 **길게 꾹** 누른 뒤,\n하단에 나타나는 🧩 **[위젯]** 아이콘을 선택합니다.' 
      },
      { 
        title: '위젯 배치 및 크기 조절', 
        content: '목록에서 캘린더(Google)를 찾아 홈 화면으로 끌어옵니다.\n테두리 점을 당겨 달력 크기를 마음껏 조절하세요!' 
      }
    ]
  },
  desktop: {
    icon: Monitor,
    title: '바탕화면 위젯 가이드',
    color: 'from-slate-700 to-slate-900',
    steps: [
      { 
        title: '위젯 편집기 열기', 
        content: '[Mac] 우측 상단 날짜를 클릭해 알림 센터를 열고 맨 아래 **[위젯 편집...]**을 누릅니다.\n\n[Windows] 작업 표시줄 왼쪽 날씨(또는 `Win + W`)를 누릅니다.' 
      },
      { 
        title: '캘린더 위젯 선택', 
        content: '[Mac] 위젯 목록에서 캘린더를 선택합니다.\n\n[Windows] 위젯 패널에서 **[+]** 버튼을 누르고 Outlook 캘린더 등을 선택하세요.' 
      },
      { 
        title: '바탕화면에 꺼내기', 
        content: '[Mac] 원하는 크기의 위젯을 화면 아무 곳이나 끌어다 놓으세요.\n\n매일 아침 컴퓨터를 켜자마자 내 일정을 한눈에 볼 수 있습니다.' 
      }
    ]
  }
}

// -----------------------------------------------------
// 기기 목업 컴포넌트들
// -----------------------------------------------------
const IPhoneMockup = ({ step }: { step: number }) => {
  return (
    <div className="relative w-[280px] h-[580px] bg-black rounded-[3.5rem] p-3 shadow-2xl border-[4px] border-slate-800 flex flex-col mx-auto overflow-hidden">
      {/* 다이나믹 아일랜드 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-30" />
      
      {/* Screen */}
      <div className="relative flex-1 bg-slate-100 rounded-[2.8rem] overflow-hidden pt-12 px-4 pb-6 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
            >
              <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center p-4">
                <svg viewBox="0 0 48 48" className="w-full h-full">
                  <path fill="#4285F4" d="M34 4H14c-2.21 0-4 1.79-4 4v32c0 2.21 1.79 4 4 4h20c2.21 0 4-1.79 4-4V8c0-2.21-1.79-4-4-4zm0 36H14V8h20v32z"/>
                  <path fill="#34A853" d="M26 14h-4v4h4v-4zm0 6h-4v4h4v-4zm0 6h-4v4h4v-4z"/>
                  <path fill="#FBBC05" d="M20 14h-4v4h4v-4zm0 6h-4v4h4v-4zm0 6h-4v4h4v-4z"/>
                  <path fill="#EA4335" d="M32 14h-4v4h4v-4zm0 6h-4v4h4v-4zm0 6h-4v4h4v-4z"/>
                </svg>
              </div>
              <div className="w-28 h-8 bg-blue-600 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-blue-500/30">
                받기
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pt-14 px-4 bg-slate-100"
            >
              {/* 왼쪽 상단 + 버튼 (펄스 효과) */}
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute top-12 left-4 w-8 h-8 bg-slate-300/80 backdrop-blur-md rounded-full flex items-center justify-center z-10"
              >
                <div className="text-slate-700 text-xl font-medium leading-none">+</div>
              </motion.div>
              
              {/* 앱 아이콘들 (흔들리는 모션) */}
              <div className="grid grid-cols-4 gap-4 mt-8">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ rotate: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 0.15, delay: i * 0.05 }}
                    className="w-12 h-12 bg-white rounded-2xl shadow-sm relative"
                  >
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-slate-300 rounded-full flex items-center justify-center text-[10px] text-slate-600 font-bold">-</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-4 pt-16 flex flex-col gap-4 bg-slate-100"
            >
              <div className="w-full h-40 bg-white rounded-[2rem] shadow-xl p-4 flex flex-col border border-slate-100/50">
                <div className="flex justify-between items-center mb-2">
                  <div className="w-24 h-4 bg-slate-100 rounded-full" />
                  <div className="w-8 h-4 bg-red-100 rounded-full" />
                </div>
                <div className="flex-1 bg-slate-50 rounded-xl" />
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-12 h-12 bg-white rounded-2xl shadow-sm" />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const AndroidMockup = ({ step }: { step: number }) => {
  return (
    <div className="relative w-[280px] h-[580px] bg-slate-900 rounded-[2.5rem] p-2 shadow-2xl border-4 border-slate-700 flex flex-col mx-auto overflow-hidden">
      {/* 펀치홀 */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-30" />
      
      {/* Screen */}
      <div className="relative flex-1 bg-gradient-to-br from-indigo-100 to-slate-200 rounded-[2rem] overflow-hidden pt-12 px-4 pb-6 flex flex-col">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
            >
               <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center p-3 relative">
                 {/* Google Calendar Icon Abstract */}
                 <div className="w-12 h-12 bg-indigo-500 rounded-xl rotate-12 flex items-center justify-center text-white font-bold text-xl">31</div>
               </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 flex items-end"
            >
              {/* 바텀 시트 */}
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                className="w-full h-64 bg-white rounded-t-3xl p-6 flex flex-col gap-4"
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-full" />
                    <div className="w-10 h-2 bg-slate-200 rounded-full" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xl">🧩</div>
                    <div className="w-10 h-2 bg-slate-800 rounded-full" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-full" />
                    <div className="w-10 h-2 bg-slate-200 rounded-full" />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-6 flex items-center justify-center bg-indigo-100/50"
            >
              <div className="w-full h-48 bg-white/80 backdrop-blur-md rounded-2xl border-2 border-indigo-400 p-3 relative">
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white" />
                
                <div className="w-1/2 h-4 bg-indigo-100 rounded-full mb-3" />
                <div className="w-full h-full bg-white rounded-lg opacity-50" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const MacMockup = ({ step }: { step: number }) => {
  return (
    <div className="relative w-[340px] h-[240px] bg-slate-200 rounded-t-xl rounded-b flex flex-col shadow-2xl border border-slate-300 mx-auto overflow-hidden">
      {/* 화면 */}
      <div className="flex-1 bg-slate-800 bg-cover bg-center flex flex-col relative overflow-hidden">
        {/* 상단 메뉴바 */}
        <div className="h-6 bg-white/20 backdrop-blur-md flex items-center justify-between px-3 z-10 relative">
          <div className="w-3 h-3 bg-white/80 rounded-full" />
          <motion.div 
            animate={step === 0 ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`text-[8px] font-bold ${step === 0 ? 'text-white' : 'text-white/60'} bg-black/20 px-1 rounded`}
          >
            10:09 AM
          </motion.div>
        </div>
        
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div 
                key="step0"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 top-0 bottom-0 w-32 bg-black/40 backdrop-blur-xl border-l border-white/10 p-2 flex flex-col gap-2 z-20"
              >
                <div className="w-full h-12 bg-white/10 rounded-lg" />
                <div className="w-full h-12 bg-white/10 rounded-lg" />
                <div className="mt-auto w-full h-6 bg-white/20 rounded-md flex items-center justify-center text-[8px] text-white font-bold">
                  위젯 편집...
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md p-4 flex gap-4 z-20"
              >
                {/* 좌측 사이드바 */}
                <div className="w-20 bg-white/10 rounded-lg p-2 flex flex-col gap-2">
                  <div className="w-full h-4 bg-white/20 rounded-md" />
                  <div className="w-full h-4 bg-blue-500/50 rounded-md border border-blue-400" />
                  <div className="w-full h-4 bg-white/10 rounded-md" />
                </div>
                {/* 우측 위젯 선택창 */}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="w-full h-16 bg-white/20 rounded-xl" />
                  <div className="w-full h-16 bg-white/20 rounded-xl" />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 p-6 flex items-start justify-end z-20"
              >
                <motion.div 
                  initial={{ scale: 0.8, x: -20, opacity: 0 }}
                  animate={{ scale: 1, x: 0, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="w-32 h-24 bg-white/80 backdrop-blur-xl rounded-xl shadow-2xl p-2 border border-white/50"
                >
                  <div className="w-10 h-2 bg-slate-300 rounded-full mb-2" />
                  <div className="grid grid-cols-4 gap-1">
                    {[...Array(16)].map((_, i) => (
                      <div key={i} className="w-full h-2 bg-slate-200 rounded-sm" />
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* 랩탑 하단 */}
      <div className="h-3 bg-slate-400 w-full z-30" />
    </div>
  )
}

// -----------------------------------------------------
// 메인 모달
// -----------------------------------------------------
export function WidgetGuideModal({ type, isOpen, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
    }
  }, [isOpen])

  if (!isOpen || !type) return null

  const data = GUIDE_DATA[type]
  const Icon = data.icon
  const totalSteps = data.steps.length
  const isLast = currentStep === totalSteps - 1

  const handleNext = () => {
    if (!isLast) setCurrentStep(s => s + 1)
    else onClose()
  }

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-800">{part.slice(2, -2)}</strong>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        {/* 딤 배경 */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          onClick={onClose}
        />

        {/* 프리미엄 모달 컨테이너 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-white backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col md:flex-row min-h-[500px]"
        >
          {/* 좌측: 기기 목업 및 비주얼 영역 */}
          <div className={`relative w-full md:w-[45%] flex items-center justify-center p-8 bg-gradient-to-br ${data.color} overflow-hidden`}>
            {/* 빛번짐 배경 장식 */}
            <div className="absolute top-0 left-0 w-full h-full bg-white/10" />
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/20 blur-3xl rounded-full mix-blend-overlay" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-black/20 blur-3xl rounded-full mix-blend-overlay" />
            
            <div className="relative z-10 w-full flex items-center justify-center h-full min-h-[300px]">
              {type === 'ios' && <IPhoneMockup step={currentStep} />}
              {type === 'android' && <AndroidMockup step={currentStep} />}
              {type === 'desktop' && <MacMockup step={currentStep} />}
            </div>
          </div>

          {/* 우측: 텍스트 및 컨트롤러 영역 */}
          <div className="relative w-full md:w-[55%] p-8 md:p-12 flex flex-col">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2.5 bg-slate-100/50 hover:bg-slate-200 text-slate-500 rounded-full transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-10">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${data.color} text-white shadow-lg`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-2xl tracking-tight text-slate-900">
                {data.title}
              </h3>
            </div>

            {/* 스텝 텍스트 영역 */}
            <div className="flex-1 flex flex-col justify-center min-h-[200px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <div className="text-sm font-bold text-indigo-500 mb-3 tracking-widest uppercase">
                    Step {currentStep + 1} of {totalSteps}
                  </div>
                  <h4 className="text-3xl font-extrabold text-slate-900 mb-5 leading-tight tracking-tight">
                    {data.steps[currentStep].title}
                  </h4>
                  <div className="text-lg text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                    {renderContent(data.steps[currentStep].content)}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 푸터 및 컨트롤 */}
            <div className="mt-10 pt-8 border-t border-slate-200/50 flex items-center justify-between">
              {/* 프로그레스 인디케이터 */}
              <div className="flex items-center gap-2">
                {data.steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === currentStep 
                        ? 'w-10 bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]' 
                        : 'w-3 bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {/* 내비게이션 버튼 */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handlePrev} 
                  disabled={currentStep === 0}
                  className={`w-12 h-12 rounded-2xl border-slate-200 hover:bg-slate-50 transition-all ${currentStep === 0 ? 'opacity-50' : ''}`}
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </Button>
                <Button 
                  onClick={handleNext}
                  className={`h-12 px-8 rounded-2xl font-bold text-base transition-all shadow-lg hover:shadow-xl ${
                    isLast 
                      ? 'bg-slate-900 hover:bg-black text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25'
                  }`}
                >
                  {isLast ? '설정 완료' : '다음 단계'}
                  {!isLast && <ChevronRight className="w-5 h-5 ml-1 -mr-1" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
