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
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    steps: [
      { 
        title: 'Step 1. 구글 캘린더 앱 준비하기', 
        content: '아이폰에 **Google 캘린더** 앱이 설치되어 있는지 확인합니다.\n앱스토어(App Store)에서 무료로 다운로드할 수 있습니다.\n\n💡 *로그인은 Calentask에 연동한 동일한 구글 계정으로 진행해 주세요.*' 
      },
      { 
        title: 'Step 2. 흔들리는 아이콘 만들기', 
        content: '아이폰 배경화면의 빈 공간을 **앱 아이콘들이 흔들릴 때까지 2초 이상 꾹** 눌러주세요.\n\n화면 **왼쪽 상단(또는 우측 상단)**에 나타나는 **[+] 버튼**을 터치합니다.' 
      },
      { 
        title: 'Step 3. 위젯 고르기 및 배치', 
        content: '검색창에 **"Google 캘린더"**를 검색합니다.\n오늘의 일정, 주간 달력 등 원하는 모양을 고른 뒤 **[위젯 추가]** 버튼을 누릅니다.\n\n원하는 위치로 끌어다 놓은 뒤 화면 우측 상단의 **[완료]**를 누르면 끝입니다!' 
      }
    ]
  },
  android: {
    icon: Smartphone,
    title: 'Android 위젯 가이드',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    steps: [
      { 
        title: 'Step 1. 구글 캘린더 앱 확인하기', 
        content: '스마트폰에 **Google 캘린더** 앱이 설치되어 있는지 확인합니다.\n(대부분의 안드로이드 기기에는 기본 설치되어 있습니다.)\n\n💡 *로그인은 Calentask에 연동한 동일한 구글 계정으로 진행해 주세요.*' 
      },
      { 
        title: 'Step 2. 위젯 메뉴 열기', 
        content: '스마트폰 홈 화면의 빈 공간을 **약 2초간 길게 꾹** 누릅니다.\n\n화면 아래에 나타나는 여러 메뉴 중 🧩 **[위젯]** 아이콘을 선택합니다.' 
      },
      { 
        title: 'Step 3. 위젯 추가 및 크기 조절', 
        content: '목록을 스크롤하여 **캘린더(Google)** 항목을 찾아 누릅니다.\n원하는 달력 형태를 길게 누른 채 홈 화면으로 끌어다 놓습니다.\n\n위젯 테두리의 점들을 잡고 당기면 **달력 크기를 자유롭게 조절**할 수 있습니다!' 
      }
    ]
  },
  desktop: {
    icon: Monitor,
    title: 'Desktop 바탕화면 위젯 가이드',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    steps: [
      { 
        title: 'Step 1. Mac 위젯 설정 열기', 
        content: '맥 화면 오른쪽 위 구석에 있는 **날짜와 시간**을 클릭합니다.\n알림 센터가 스르륵 열리면, 맨 아래에 있는 **[위젯 편집...]** 버튼을 클릭하세요.' 
      },
      { 
        title: 'Step 2. 캘린더 위젯 끌어오기', 
        content: '화면 중앙에 나타나는 위젯 선택 창의 왼쪽 메뉴에서 **[캘린더]**를 선택합니다.\n\n원하는 모양을 클릭한 채 드래그하여 **바탕화면 빈 곳 아무 데나** 놓으세요.' 
      },
      { 
        title: 'Step 3. Windows 11 위젯 설정', 
        content: '윈도우 사용자의 경우, 작업 표시줄 왼쪽의 **날씨 아이콘**을 클릭하거나 단축키 `Win + W`를 누릅니다.\n\n위젯 패널에서 **[+] (위젯 추가)** 버튼을 누른 뒤, Outlook 캘린더 위젯 등을 추가하세요.\n💡 *※ Windows 캘린더 앱에 구글 계정을 연동해 두어야 일정이 동기화됩니다.*' 
      }
    ]
  }
}

export function WidgetGuideModal({ type, isOpen, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0)

  // 리셋 상태
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

  // 간단한 마크다운 볼드체 처리 렌더러
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${data.bg} ${data.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg">{data.title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-muted-foreground hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Carousel */}
          <div className="relative overflow-hidden bg-slate-50 min-h-[280px] p-6 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full flex-1"
              >
                <div className="text-sm font-bold text-indigo-600 mb-2 tracking-tight">
                  {currentStep + 1} / {totalSteps}
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-4">
                  {data.steps[currentStep].title}
                </h4>
                <div className="text-base text-slate-600 leading-relaxed whitespace-pre-line">
                  {renderContent(data.steps[currentStep].content)}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          <div className="p-5 border-t border-border flex items-center justify-between bg-card">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {data.steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all ${
                    i === currentStep ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handlePrev} 
                disabled={currentStep === 0}
                className="w-10 h-10 rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button 
                onClick={handleNext}
                className={`h-10 px-6 rounded-full font-bold ${
                  isLast ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isLast ? '완료' : '다음'}
                {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
