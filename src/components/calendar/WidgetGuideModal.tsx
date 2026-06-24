import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Smartphone, Monitor, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type GuideType = 'ios' | 'android' | 'desktop' | null

interface Props {
  type: GuideType
  isOpen: boolean
  onClose: () => void
}

// ─────────────────────────────────────────────────────────
// 가이드 데이터: 각 플랫폼 7단계
// 대본은 초등교사/직장인 대상 — 정중하고 명확한 존댓말 톤
// step 0~2: 공통 (네이버 캘린더 설치 + 구글 연동)
// step 3~6: 플랫폼별 (위젯 설치)
// ─────────────────────────────────────────────────────────
const GUIDE_DATA = {
  ios: {
    icon: Smartphone,
    title: 'iOS 위젯 연동 가이드',
    color: 'from-blue-600 to-indigo-600',
    steps: [
      {
        title: '네이버 캘린더 앱을 설치해 주세요',
        content:
          'App Store에서 **네이버 캘린더**를 검색하여 설치합니다.\n\n설치가 완료되면 앱을 열고 **네이버 아이디로 로그인**해 주세요.\n\n💡 *이미 설치되어 있다면 이 단계는 건너뛰셔도 됩니다.*',
      },
      {
        title: '구글 캘린더와 연결해 주세요',
        content:
          '네이버 캘린더 앱에서 아래 순서대로 진행해 주세요.\n\n① 왼쪽 상단 **☰ 메뉴** 아이콘을 누릅니다.\n② 메뉴 하단의 **⚙️ 설정**을 누릅니다.\n③ **캘린더 계정 추가하기**를 누릅니다.\n④ 목록에서 **Google**을 선택합니다.\n⑤ Calentask에 연동한 **동일한 구글 계정**으로 로그인합니다.\n\n⚠️ *반드시 Calentask에 연결한 구글 계정과 같은 계정으로 로그인하셔야 합니다.*',
      },
      {
        title: '일정이 표시되는지 확인해 주세요',
        content:
          '연동이 완료되면 네이버 캘린더 앱으로 돌아가 주세요.\nCalentask에서 등록한 일정이 네이버 캘린더에 표시되어야 합니다.\n\n첫 동기화에는 **1~2분 정도** 걸릴 수 있으니, 잠시 기다린 뒤 앱을 아래로 당겨 새로고침해 보세요.\n\n✅ *일정이 보이면 연동이 완료된 것입니다!*',
      },
      {
        title: '홈 화면을 편집 모드로 전환해 주세요',
        content:
          '아이폰 홈 화면에서 **아이콘이 없는 빈 공간**을 **2초 정도 꾹 길게** 눌러 주세요.\n\n앱 아이콘들이 흔들리기 시작하면 편집 모드에 진입한 것입니다.\n화면 왼쪽 상단에 나타나는 **[+] 버튼**을 눌러 주세요.\n\n💡 *아이콘이 흔들리지 않으면 빈 공간이 아닌 앱 아이콘을 누른 것일 수 있습니다.*',
      },
      {
        title: "위젯 목록에서 '네이버 캘린더'를 찾아 주세요",
        content:
          "위젯 갤러리가 열리면 상단 **검색창**에 **'네이버 캘린더'**라고 입력합니다.\n\n검색 결과에서 **네이버 캘린더** 앱을 선택하면 사용 가능한 위젯 목록이 나타납니다.\n\n💡 *목록에 네이버 캘린더가 보이지 않는다면, 앱이 최신 버전인지 확인하고 기기를 한 번 재시작해 보세요.*",
      },
      {
        title: '마음에 드는 위젯을 골라 주세요',
        content:
          '네이버 캘린더는 다양한 위젯을 제공합니다.\n좌우로 넘기면서 원하는 형태를 선택해 주세요.\n\n• **목록형** — 오늘의 일정을 리스트로 표시\n• **미니 달력** — 작은 크기의 월간 달력\n• **달력형** — 큰 크기의 월간 달력 + 일정 표시\n• **D-day** — 중요한 날까지 남은 일수 표시\n\n💡 *가장 추천하는 위젯은 **달력형 (큰 사이즈)**입니다.*',
      },
      {
        title: '위젯을 배치하고 캘린더를 선택해 주세요',
        content:
          '위젯이 홈 화면에 추가되었습니다! 🎉\n원하는 위치로 **끌어서 이동**시켜 주세요.\n\n마지막으로 중요한 설정이 남았습니다:\n\n① 방금 추가한 위젯을 **길게 누릅니다**.\n② 메뉴에서 **위젯 편집**을 선택합니다.\n③ 표시할 캘린더 목록에서 **구글 연동 캘린더(Calentask)**를 체크합니다.\n\n✅ *이제 홈 화면에서 바로 일정을 확인할 수 있습니다!*',
      },
    ],
  },
  android: {
    icon: Smartphone,
    title: 'Android 위젯 연동 가이드',
    color: 'from-emerald-500 to-teal-600',
    steps: [
      {
        title: '네이버 캘린더 앱을 설치해 주세요',
        content:
          'Play Store에서 **네이버 캘린더**를 검색하여 설치합니다.\n\n설치가 완료되면 앱을 열고 **네이버 아이디로 로그인**해 주세요.\n\n💡 *이미 설치되어 있다면 이 단계는 건너뛰셔도 됩니다.*',
      },
      {
        title: '구글 캘린더와 연결해 주세요',
        content:
          '네이버 캘린더 앱에서 아래 순서대로 진행해 주세요.\n\n① 왼쪽 상단 **☰ 메뉴** 아이콘을 누릅니다.\n② 메뉴 하단의 **⚙️ 설정**을 누릅니다.\n③ **캘린더 계정 추가하기**를 누릅니다.\n④ 목록에서 **Google**을 선택합니다.\n⑤ Calentask에 연동한 **동일한 구글 계정**으로 로그인합니다.\n\n⚠️ *반드시 Calentask에 연결한 구글 계정과 같은 계정으로 로그인하셔야 합니다.*',
      },
      {
        title: '일정이 표시되는지 확인해 주세요',
        content:
          '연동이 완료되면 네이버 캘린더 앱으로 돌아가 주세요.\nCalentask에서 등록한 일정이 네이버 캘린더에 표시되어야 합니다.\n\n첫 동기화에는 **1~2분 정도** 걸릴 수 있으니, 잠시 기다린 뒤 앱을 아래로 당겨 새로고침해 보세요.\n\n✅ *일정이 보이면 연동이 완료된 것입니다!*',
      },
      {
        title: '홈 화면에서 위젯 메뉴를 열어 주세요',
        content:
          '스마트폰 홈 화면에서 **아이콘이 없는 빈 공간**을 **2초 정도 꾹 길게** 눌러 주세요.\n\n화면 하단에 메뉴가 나타나면, 🧩 **위젯** 버튼을 눌러 주세요.\n\n💡 *기기에 따라 메뉴 위치가 다를 수 있습니다. 갤럭시는 하단, 다른 기기는 상단에 나타날 수 있어요.*',
      },
      {
        title: '네이버 캘린더 위젯을 찾아 주세요',
        content:
          "위젯 목록이 열리면 **아래로 스크롤**하거나 상단 검색창에 **'네이버 캘린더'**를 입력합니다.\n\n네이버 캘린더를 찾아서 터치하면 사용 가능한 위젯 종류가 펼쳐집니다.\n\n💡 *목록이 앱 이름 순(가나다 순)으로 정렬되어 있으니 'ㄴ' 부근에서 찾으시면 빠르게 찾을 수 있습니다.*",
      },
      {
        title: '위젯을 홈 화면에 배치해 주세요',
        content:
          '원하는 위젯 스타일을 선택한 뒤, **길게 눌러서 홈 화면**으로 끌어다 놓으세요.\n\n• **오늘 (1×1)** — 오늘 날짜만 표시\n• **미니 달력 (2×2)** — 작은 달력\n• **일정 목록 (4×1)** — 오늘의 일정을 가로로 표시\n• **월별 달력 (4×4)** — 한 달 전체를 보여주는 큰 달력\n\n💡 *가장 추천하는 크기는 **월별 달력 (4×4)**입니다.*',
      },
      {
        title: '위젯의 디자인을 꾸며 보세요',
        content:
          '위젯을 배치하면 **스타일 설정 화면**이 자동으로 나타납니다.\n\n🎨 **스타일** — 기본형, 화이트, 유리(Glass), 블랙라인 등\n🔲 **투명도** — 슬라이더를 움직여 0%~100% 조절\n\n설정이 끝나면 **확인** 버튼을 눌러 완료해 주세요.\n\n💡 *나중에 스타일을 바꾸고 싶으시면, 위젯 오른쪽 상단의 ⚙️ 톱니바퀴를 누르면 됩니다.*\n\n✅ *이제 홈 화면에서 바로 일정을 확인할 수 있습니다!*',
      },
    ],
  },
  desktop: {
    icon: Monitor,
    title: '데스크톱 연동 가이드',
    color: 'from-slate-700 to-slate-900',
    steps: [
      {
        title: '네이버 캘린더 앱을 설치해 주세요',
        content:
          '스마트폰(아이폰 또는 안드로이드)에서 **네이버 캘린더** 앱을 먼저 설치합니다.\nApp Store 또는 Play Store에서 검색하여 설치할 수 있습니다.\n\n설치 후 앱을 열고 **네이버 아이디로 로그인**해 주세요.\n\n💡 *이미 설치되어 있다면 이 단계는 건너뛰셔도 됩니다.*',
      },
      {
        title: '구글 캘린더와 연결해 주세요',
        content:
          '네이버 캘린더 앱에서 아래 순서대로 진행해 주세요.\n\n① 왼쪽 상단 **☰ 메뉴** 아이콘을 누릅니다.\n② 메뉴 하단의 **⚙️ 설정**을 누릅니다.\n③ **캘린더 계정 추가하기**를 누릅니다.\n④ 목록에서 **Google**을 선택합니다.\n⑤ Calentask에 연동한 **동일한 구글 계정**으로 로그인합니다.\n\n⚠️ *반드시 Calentask에 연결한 구글 계정과 같은 계정으로 로그인하셔야 합니다.*',
      },
      {
        title: '일정이 표시되는지 확인해 주세요',
        content:
          '연동이 완료되면 네이버 캘린더 앱으로 돌아가 주세요.\nCalentask에서 등록한 일정이 네이버 캘린더에 표시되어야 합니다.\n\n첫 동기화에는 **1~2분 정도** 걸릴 수 있으니, 잠시 기다린 뒤 앱을 아래로 당겨 새로고침해 보세요.\n\n✅ *일정이 보이면 연동이 완료된 것입니다!*',
      },
      {
        title: '컴퓨터에서 네이버 캘린더를 열어 주세요',
        content:
          '컴퓨터에서 **Chrome** 또는 **Edge** 브라우저를 실행하고, 주소창에 아래 주소를 입력합니다.\n\n🔗 **calendar.naver.com**\n\n네이버 캘린더가 열리면 **네이버 아이디로 로그인**해 주세요.\n\n💡 *Chrome, Edge 두 브라우저 모두 앱 설치 기능을 지원합니다. 어떤 브라우저를 쓰셔도 괜찮습니다.*',
      },
      {
        title: "네이버 캘린더를 '앱'으로 설치해 주세요",
        content:
          '브라우저 오른쪽 상단의 **⋮ 점 세 개 메뉴**를 눌러 주세요.\n\n🍎 **macOS (Chrome / Edge):**\n[저장 및 공유] → [페이지를 앱으로 설치]\n\n🪟 **Windows (Edge):**\n[앱] → [이 사이트를 앱으로 설치]\n\n🪟 **Windows (Chrome):**\n[저장 및 공유] → [페이지를 앱으로 설치]\n\n팝업이 나타나면 **설치** 버튼을 눌러 주세요.\n\n💡 *앱으로 설치하면 별도의 창에서 열려서, 탭에 묻히지 않고 빠르게 접근할 수 있습니다.*',
      },
      {
        title: '바탕화면에 아이콘이 생겼는지 확인해 주세요',
        content:
          '설치가 완료되면 바탕화면에 **네이버 캘린더 아이콘**이 생성됩니다.\n이 아이콘을 더블클릭하면 바로 네이버 캘린더가 열립니다.\n\n🍎 **macOS:** Launchpad에도 아이콘이 추가됩니다.\n🪟 **Windows:** 시작 메뉴 "최근에 추가됨"에도 표시됩니다.\n\n💡 *아이콘이 보이지 않는다면, Chrome 주소창에 chrome://apps 를 입력하여 확인해 보세요.*',
      },
      {
        title: '자주 쓰려면 고정해 두세요',
        content:
          '매번 바탕화면에서 아이콘을 찾지 않아도 되도록, 작업 표시줄이나 Dock에 고정해 두시면 더욱 편리합니다.\n\n🍎 **macOS:**\nDock에 있는 네이버 캘린더 아이콘을 **우클릭** → **옵션** → **Dock에 유지**\n\n🪟 **Windows:**\n작업 표시줄에 있는 네이버 캘린더 아이콘을 **우클릭** → **작업 표시줄에 고정**\n\n✅ *이제 컴퓨터를 켜고 클릭 한 번이면 네이버 캘린더에서 오늘의 일정을 바로 확인할 수 있습니다!*',
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────
// 공통 목업: 네이버 캘린더 앱 설치 & 구글 계정 연동 (step 0~2)
// 3개 플랫폼 모두 동일하게 사용
// ─────────────────────────────────────────────────────────
const NaverCalendarSetupMockup = ({ step }: { step: number }) => {
  return (
    <div className="relative w-[260px] h-[520px] bg-black rounded-[3rem] p-2.5 shadow-2xl border-[3px] border-slate-700 flex flex-col mx-auto overflow-hidden">
      {/* 다이나믹 아일랜드 */}
      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-30" />

      {/* 스크린 */}
      <div className="relative flex-1 bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
        {/* 네이버 캘린더 상단 바 */}
        <div className="h-20 bg-gradient-to-r from-[#03C75A] to-[#00B843] flex items-end px-5 pb-3">
          <span className="text-white font-bold text-sm tracking-wide">네이버 캘린더</span>
        </div>

        <AnimatePresence mode="wait">
          {/* step 0: 앱 스토어 다운로드 화면 */}
          {step === 0 && (
            <motion.div
              key="setup-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center gap-5 px-6"
            >
              {/* 네이버 캘린더 아이콘 */}
              <div className="w-24 h-24 bg-white rounded-[1.6rem] shadow-xl flex items-center justify-center border border-slate-100">
                <div className="w-16 h-16 bg-gradient-to-br from-[#03C75A] to-[#00A347] rounded-xl flex items-center justify-center">
                  <span className="text-white font-black text-2xl">N</span>
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-sm">네이버 캘린더</p>
                <p className="text-[10px] text-slate-400 mt-1">NAVER Corp.</p>
              </div>
              {/* 설치 버튼 (펄스 애니메이션) */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="px-8 py-2.5 bg-[#03C75A] rounded-full text-white text-xs font-bold shadow-lg shadow-green-500/30"
              >
                설치
              </motion.div>
            </motion.div>
          )}

          {/* step 1: 설정 → 계정 추가 → Google 선택 */}
          {step === 1 && (
            <motion.div
              key="setup-1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col px-4 pt-5 gap-3"
            >
              {/* 설정 헤더 */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-500">←</div>
                <span className="text-xs font-bold text-slate-700">설정</span>
              </div>

              {/* 메뉴 항목들 */}
              <div className="w-full h-8 bg-slate-50 rounded-lg px-3 flex items-center">
                <span className="text-[10px] text-slate-400">알림 설정</span>
              </div>
              <div className="w-full h-8 bg-slate-50 rounded-lg px-3 flex items-center">
                <span className="text-[10px] text-slate-400">디스플레이</span>
              </div>

              {/* 캘린더 계정 추가하기 (하이라이트) */}
              <motion.div
                animate={{ boxShadow: ['0 0 0 rgba(3,199,90,0)', '0 0 12px rgba(3,199,90,0.4)', '0 0 0 rgba(3,199,90,0)'] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-full h-10 bg-[#03C75A]/10 border-2 border-[#03C75A] rounded-lg px-3 flex items-center"
              >
                <span className="text-[10px] font-bold text-[#03C75A]">📅 캘린더 계정 추가하기</span>
              </motion.div>

              {/* 구글 계정 선택 카드 */}
              <div className="mt-2 space-y-2">
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-full h-12 bg-white border-2 border-blue-400 rounded-xl px-3 flex items-center gap-3 shadow-sm"
                >
                  {/* Google 아이콘 */}
                  <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100">
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Google</span>
                  <div className="ml-auto w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </motion.div>
                <div className="w-full h-10 bg-slate-50 rounded-xl px-3 flex items-center gap-3">
                  <div className="w-6 h-6 bg-slate-200 rounded-full" />
                  <span className="text-[10px] text-slate-400">Apple</span>
                </div>
                <div className="w-full h-10 bg-slate-50 rounded-xl px-3 flex items-center gap-3">
                  <div className="w-6 h-6 bg-slate-200 rounded-full" />
                  <span className="text-[10px] text-slate-400">Exchange</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* step 2: 동기화 완료 확인 화면 */}
          {step === 2 && (
            <motion.div
              key="setup-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col px-3 pt-4"
            >
              {/* 미니 달력 헤더 */}
              <div className="flex items-center justify-between px-2 mb-3">
                <span className="text-xs font-bold text-slate-800">6월 2026</span>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded bg-slate-100" />
                  <div className="w-4 h-4 rounded bg-slate-100" />
                </div>
              </div>
              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-1 px-1 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                  <div key={d} className={`text-[8px] text-center font-medium ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-slate-400'}`}>
                    {d}
                  </div>
                ))}
              </div>
              {/* 날짜 그리드 (간략화) */}
              <div className="grid grid-cols-7 gap-1 px-1">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-full aspect-square flex items-center justify-center text-[8px] rounded-md ${
                      i === 22
                        ? 'bg-[#03C75A] text-white font-bold'
                        : i % 7 === 0
                          ? 'text-red-400'
                          : 'text-slate-600'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* 일정 아이템들 — 순차적 fade-in */}
              <div className="mt-3 space-y-2 px-1">
                {[
                  { color: 'bg-blue-500', text: '팀 미팅', time: '10:00', delay: 0.3 },
                  { color: 'bg-emerald-500', text: '점심 약속', time: '12:30', delay: 0.6 },
                  { color: 'bg-purple-500', text: '기획 리뷰', time: '15:00', delay: 0.9 },
                ].map((item) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: item.delay, duration: 0.4 }}
                    className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg"
                  >
                    <div className={`w-1.5 h-6 ${item.color} rounded-full`} />
                    <div>
                      <p className="text-[9px] font-bold text-slate-700">{item.text}</p>
                      <p className="text-[8px] text-slate-400">{item.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* 동기화 완료 배지 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="mt-3 mx-auto px-4 py-1.5 bg-[#03C75A] rounded-full flex items-center gap-1.5"
              >
                <Check className="w-3 h-3 text-white" />
                <span className="text-[9px] font-bold text-white">동기화 완료!</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// iOS 전용 목업 (step 3~6)
// ─────────────────────────────────────────────────────────
const IPhoneMockup = ({ step }: { step: number }) => {
  return (
    <div className="relative w-[260px] h-[520px] bg-black rounded-[3rem] p-2.5 shadow-2xl border-[3px] border-slate-800 flex flex-col mx-auto overflow-hidden">
      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-30" />

      <div className="relative flex-1 bg-slate-100 rounded-[2.5rem] overflow-hidden pt-10 px-3 pb-4 flex flex-col">
        <AnimatePresence mode="wait">
          {/* step 0 (=step3): 홈 화면 편집 모드 — Jiggle Mode + [+] 버튼 */}
          {step === 0 && (
            <motion.div
              key="ios-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative"
            >
              {/* [+] 버튼 (펄스) */}
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute top-0 left-1 w-7 h-7 bg-slate-300/80 backdrop-blur-md rounded-full flex items-center justify-center z-10"
              >
                <span className="text-slate-700 text-lg font-medium leading-none">+</span>
              </motion.div>

              {/* 앱 아이콘 그리드 (흔들리는 모션) */}
              <div className="grid grid-cols-4 gap-3 mt-10">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ rotate: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 0.15, delay: i * 0.03 }}
                    className="relative"
                  >
                    <div className={`w-11 h-11 rounded-2xl shadow-sm ${
                      [
                        'bg-blue-400', 'bg-green-400', 'bg-orange-400', 'bg-purple-400',
                        'bg-pink-400', 'bg-yellow-400', 'bg-cyan-400', 'bg-red-400',
                        'bg-indigo-400', 'bg-teal-400', 'bg-amber-400', 'bg-rose-400',
                        'bg-emerald-400', 'bg-sky-400', 'bg-violet-400', 'bg-lime-400',
                      ][i]
                    }`} />
                    {/* 삭제 뱃지 */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-slate-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">−</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* step 1 (=step4): 위젯 갤러리 검색 */}
          {step === 1 && (
            <motion.div
              key="ios-1"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-3"
            >
              <div className="text-center text-xs font-bold text-slate-700 mt-2">위젯 검색</div>
              {/* 검색창 — 타이핑 애니메이션 */}
              <div className="w-full h-9 bg-white rounded-xl px-3 flex items-center gap-2 shadow-sm border border-slate-200">
                <span className="text-slate-300 text-[10px]">🔍</span>
                <motion.span
                  className="text-[11px] font-medium text-slate-800"
                  initial={{ width: 0 }}
                  animate={{ width: 'auto' }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block' }}
                >
                  네이버 캘린더
                </motion.span>
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-0.5 h-4 bg-blue-500"
                />
              </div>
              {/* 검색 결과 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#03C75A] to-[#00A347] rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-white font-black text-lg">N</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800">네이버 캘린더</p>
                    <p className="text-[9px] text-slate-400">캘린더 · 위젯</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* step 2 (=step5): 위젯 크기 선택 캐러셀 */}
          {step === 2 && (
            <motion.div
              key="ios-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4"
            >
              <p className="text-[10px] font-bold text-slate-500 tracking-wider">위젯 크기 선택</p>
              {/* 위젯 프리뷰 캐러셀 */}
              <motion.div
                animate={{ x: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="flex gap-3"
              >
                {/* 소형 위젯 */}
                <div className="w-20 h-20 bg-white rounded-2xl shadow-md p-2 flex flex-col items-center justify-center border border-slate-100 shrink-0">
                  <div className="text-[16px] font-black text-[#03C75A]">22</div>
                  <div className="text-[7px] text-slate-400 mt-0.5">오늘</div>
                </div>
                {/* 중형 위젯 — 추천 */}
                <div className="w-36 h-36 bg-white rounded-2xl shadow-lg p-2 flex flex-col border-2 border-[#03C75A] shrink-0 relative">
                  <motion.div
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#03C75A] rounded-full text-[7px] font-bold text-white shadow-sm"
                  >
                    추천
                  </motion.div>
                  <div className="text-[7px] font-bold text-slate-600 mb-1">6월 2026</div>
                  <div className="grid grid-cols-7 gap-px flex-1">
                    {[...Array(28)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-center text-[5px] ${
                          i === 21 ? 'bg-[#03C75A] text-white rounded-sm font-bold' : 'text-slate-500'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
              {/* 위젯 추가 버튼 */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="px-6 py-2 bg-[#03C75A] rounded-full text-white text-[10px] font-bold shadow-lg shadow-green-500/30"
              >
                위젯 추가
              </motion.div>
            </motion.div>
          )}

          {/* step 3 (=step6): 완성 화면 + sparkle */}
          {step === 3 && (
            <motion.div
              key="ios-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center pt-4 relative"
            >
              {/* 스파클 파티클 */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: [0, -20 - i * 10], x: [(i - 3) * 15, (i - 3) * 25] }}
                  transition={{ delay: 0.3 + i * 0.15, duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
                  className="absolute top-20 left-1/2 w-2 h-2 bg-yellow-400 rounded-full z-20"
                />
              ))}

              {/* 완성된 위젯 미니 뷰 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-48 h-40 bg-white rounded-2xl shadow-xl p-3 border border-slate-100"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[8px] font-bold text-slate-800">6월 2026</span>
                  <div className="w-3 h-3 bg-[#03C75A] rounded-full" />
                </div>
                <div className="grid grid-cols-7 gap-px mb-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                    <div key={d} className={`text-[5px] text-center font-medium ${d === '일' ? 'text-red-400' : 'text-slate-400'}`}>{d}</div>
                  ))}
                  {[...Array(28)].map((_, i) => (
                    <div key={i} className={`text-[5px] text-center ${i === 21 ? 'bg-[#03C75A] text-white rounded-sm font-bold' : 'text-slate-500'}`}>
                      {i + 1}
                    </div>
                  ))}
                </div>
                {/* 미니 일정 표시 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-3 bg-blue-500 rounded-full" />
                    <span className="text-[6px] text-slate-600">팀 미팅 10:00</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                    <span className="text-[6px] text-slate-600">점심 약속 12:30</span>
                  </div>
                </div>
              </motion.div>

              {/* 앱 아이콘들 */}
              <div className="grid grid-cols-4 gap-3 mt-4 px-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`w-11 h-11 rounded-2xl shadow-sm ${
                    ['bg-blue-400', 'bg-green-400', 'bg-orange-400', 'bg-purple-400',
                     'bg-pink-400', 'bg-yellow-400', 'bg-cyan-400', 'bg-red-400'][i]
                  }`} />
                ))}
              </div>

              {/* 완료 텍스트 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-3 px-4 py-1.5 bg-blue-600 rounded-full"
              >
                <span className="text-[9px] font-bold text-white">✨ 설정 완료!</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Android 전용 목업 (step 3~6)
// ─────────────────────────────────────────────────────────
const AndroidMockup = ({ step }: { step: number }) => {
  return (
    <div className="relative w-[260px] h-[520px] bg-slate-900 rounded-[2.2rem] p-2 shadow-2xl border-[3px] border-slate-700 flex flex-col mx-auto overflow-hidden">
      {/* 펀치홀 */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full z-30" />

      <div className="relative flex-1 bg-gradient-to-br from-indigo-100 via-slate-100 to-emerald-50 rounded-[1.8rem] overflow-hidden pt-10 px-3 pb-4 flex flex-col">
        <AnimatePresence mode="wait">
          {/* step 0 (=step3): 바텀 시트 위젯 메뉴 */}
          {step === 0 && (
            <motion.div
              key="android-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative"
            >
              {/* 앱 아이콘 배경 */}
              <div className="grid grid-cols-4 gap-3 px-2 mt-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`w-11 h-11 rounded-2xl shadow-sm ${
                    ['bg-blue-300', 'bg-green-300', 'bg-orange-300', 'bg-purple-300',
                     'bg-pink-300', 'bg-yellow-300', 'bg-cyan-300', 'bg-red-300',
                     'bg-indigo-300', 'bg-teal-300', 'bg-amber-300', 'bg-rose-300'][i]
                  }`} />
                ))}
              </div>
              {/* 바텀 시트 오버레이 */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 shadow-2xl"
              >
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-[14px]">🏠</div>
                    <span className="text-[8px] text-slate-400">홈 화면</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], boxShadow: ['0 0 0 rgba(3,199,90,0)', '0 0 12px rgba(3,199,90,0.5)', '0 0 0 rgba(3,199,90,0)'] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-[14px] border-2 border-emerald-400"
                    >
                      🧩
                    </motion.div>
                    <span className="text-[8px] font-bold text-slate-800">위젯</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-[14px]">🖼</div>
                    <span className="text-[8px] text-slate-400">배경화면</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* step 1 (=step4): 위젯 리스트 + 스크롤 포커스 */}
          {step === 1 && (
            <motion.div
              key="android-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-2 pt-2"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-500">←</div>
                <span className="text-[10px] font-bold text-slate-700">위젯</span>
              </div>
              {/* 위젯 검색창 */}
              <div className="w-full h-8 bg-white rounded-xl px-3 flex items-center gap-2 shadow-sm border border-slate-200">
                <span className="text-[10px] text-slate-300">🔍</span>
                <span className="text-[10px] text-slate-400">위젯 검색</span>
              </div>
              {/* 위젯 리스트 */}
              <div className="space-y-2 mt-2">
                <div className="w-full h-10 bg-white/60 rounded-xl px-3 flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-200 rounded-lg" />
                  <span className="text-[10px] text-slate-400">날씨</span>
                </div>
                <motion.div
                  animate={{ boxShadow: ['0 0 0 rgba(3,199,90,0)', '0 0 12px rgba(3,199,90,0.4)', '0 0 0 rgba(3,199,90,0)'] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-full bg-white rounded-xl px-3 py-3 flex items-center gap-3 border-2 border-[#03C75A]"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#03C75A] to-[#00A347] rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-xs">N</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-800">네이버 캘린더</p>
                    <p className="text-[8px] text-slate-400">6개의 위젯 사용 가능</p>
                  </div>
                </motion.div>
                <div className="w-full h-10 bg-white/60 rounded-xl px-3 flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-200 rounded-lg" />
                  <span className="text-[10px] text-slate-400">메모</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* step 2 (=step5): 위젯 배치 — 드래그 & 드롭 */}
          {step === 2 && (
            <motion.div
              key="android-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center relative"
            >
              {/* 배경 앱 그리드 (블러) */}
              <div className="absolute inset-0 grid grid-cols-4 gap-3 px-3 pt-4 opacity-30">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-11 h-11 bg-slate-300 rounded-2xl" />
                ))}
              </div>
              {/* 드래그 중인 위젯 */}
              <motion.div
                initial={{ y: -40, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="relative z-10 w-48 h-40 bg-white/90 backdrop-blur-md rounded-2xl border-2 border-dashed border-[#03C75A] p-3 shadow-2xl"
              >
                {/* 크기 조절 핸들 */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#03C75A] rounded-full border-2 border-white shadow" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#03C75A] rounded-full border-2 border-white shadow" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#03C75A] rounded-full border-2 border-white shadow" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#03C75A] rounded-full border-2 border-white shadow" />

                <div className="text-[8px] font-bold text-slate-700 mb-2">6월 2026</div>
                <div className="grid grid-cols-7 gap-px">
                  {[...Array(28)].map((_, i) => (
                    <div key={i} className={`text-[5px] text-center py-0.5 ${i === 21 ? 'bg-[#03C75A] text-white rounded-sm' : 'text-slate-500'}`}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* step 3 (=step6): 스타일 & 투명도 설정 */}
          {step === 3 && (
            <motion.div
              key="android-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col pt-4 px-1"
            >
              <div className="text-[10px] font-bold text-slate-700 mb-3 text-center">위젯 스타일 설정</div>

              {/* 스타일 옵션 */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { name: '기본형', bg: 'bg-white', border: 'border-[#03C75A]' },
                  { name: '유리', bg: 'bg-white/50', border: 'border-slate-200' },
                  { name: '블랙', bg: 'bg-slate-800', border: 'border-slate-600' },
                ].map((s) => (
                  <div key={s.name} className={`p-2 rounded-xl border-2 ${s.border} ${s.bg} flex flex-col items-center gap-1`}>
                    <div className={`w-full h-10 ${s.name === '블랙' ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg`} />
                    <span className={`text-[7px] font-medium ${s.name === '블랙' ? 'text-white' : 'text-slate-600'}`}>{s.name}</span>
                  </div>
                ))}
              </div>

              {/* 투명도 슬라이더 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold text-slate-600">🔲 투명도</span>
                  <span className="text-[9px] font-bold text-[#03C75A]">40%</span>
                </div>
                <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: ['20%', '60%', '40%'] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="h-full bg-gradient-to-r from-[#03C75A] to-emerald-400 rounded-full"
                  />
                </div>
              </div>

              {/* 완료 버튼 */}
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-full py-2.5 bg-[#03C75A] rounded-xl text-center text-[10px] font-bold text-white shadow-md mt-auto"
              >
                ✅ 설정 완료
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Desktop 전용 목업 (step 3~6) — macOS + Windows 병렬
// ─────────────────────────────────────────────────────────
const DesktopMockup = ({ step }: { step: number }) => {
  return (
    <div className="relative w-[320px] h-[220px] bg-slate-200 rounded-t-xl rounded-b flex flex-col shadow-2xl border border-slate-300 mx-auto overflow-hidden">
      {/* 화면 */}
      <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col relative overflow-hidden">
        {/* 상단 메뉴바 */}
        <div className="h-5 bg-white/15 backdrop-blur-md flex items-center justify-between px-2.5 z-10 relative">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </div>
          <span className="text-[6px] text-white/60 font-medium">calendar.naver.com</span>
          <div className="w-3 h-3" />
        </div>

        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {/* step 0 (=step3): 브라우저에서 네이버 캘린더 열기 */}
            {step === 0 && (
              <motion.div
                key="desktop-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white flex flex-col"
              >
                {/* 네이버 캘린더 상단 */}
                <div className="h-8 bg-[#03C75A] flex items-center px-3 gap-2">
                  <span className="text-white font-black text-[9px]">N</span>
                  <span className="text-white text-[8px] font-medium">네이버 캘린더</span>
                </div>
                {/* 캘린더 미니 뷰 */}
                <div className="flex-1 p-2 flex gap-2">
                  {/* 좌측 사이드바 */}
                  <div className="w-16 bg-slate-50 rounded-lg p-1.5 space-y-1">
                    <div className="w-full h-3 bg-slate-200 rounded-sm" />
                    <div className="w-full h-3 bg-[#03C75A]/20 rounded-sm" />
                    <div className="w-full h-3 bg-slate-100 rounded-sm" />
                  </div>
                  {/* 우측 캘린더 */}
                  <div className="flex-1 bg-white rounded-lg p-1.5">
                    <div className="grid grid-cols-7 gap-px">
                      {[...Array(28)].map((_, i) => (
                        <div key={i} className={`text-[4px] text-center py-0.5 ${i === 21 ? 'bg-[#03C75A] text-white rounded-sm' : 'text-slate-400'}`}>
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* step 1 (=step4): 브라우저 메뉴 → 앱 설치 하이라이트 */}
            {step === 1 && (
              <motion.div
                key="desktop-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/90"
              >
                {/* 브라우저 메뉴 드롭다운 */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scaleY: 0.8 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-1 right-2 w-40 bg-white rounded-lg shadow-2xl border border-slate-200 p-1.5 z-20"
                  style={{ transformOrigin: 'top right' }}
                >
                  <div className="space-y-0.5">
                    <div className="w-full h-5 px-2 flex items-center rounded-md hover:bg-slate-50">
                      <span className="text-[7px] text-slate-400">새 탭</span>
                    </div>
                    <div className="w-full h-5 px-2 flex items-center rounded-md hover:bg-slate-50">
                      <span className="text-[7px] text-slate-400">북마크</span>
                    </div>
                    <div className="w-full h-px bg-slate-100 my-0.5" />
                    <div className="w-full h-5 px-2 flex items-center rounded-md hover:bg-slate-50">
                      <span className="text-[7px] text-slate-400">저장 및 공유 ▸</span>
                    </div>
                    {/* 하이라이트 항목 */}
                    <motion.div
                      animate={{ backgroundColor: ['rgba(3,199,90,0.1)', 'rgba(3,199,90,0.25)', 'rgba(3,199,90,0.1)'] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-full h-6 px-2 flex items-center rounded-md border border-[#03C75A]/30"
                    >
                      <span className="text-[7px] font-bold text-[#03C75A]">📦 앱으로 설치</span>
                    </motion.div>
                    <div className="w-full h-5 px-2 flex items-center rounded-md hover:bg-slate-50">
                      <span className="text-[7px] text-slate-400">설정</span>
                    </div>
                  </div>
                </motion.div>

                {/* 배경 (흐릿한 캘린더) */}
                <div className="absolute inset-0 opacity-30 p-2">
                  <div className="h-6 bg-[#03C75A] rounded-t-lg" />
                  <div className="flex-1 bg-slate-50 rounded-b-lg" />
                </div>

                {/* macOS / Windows 라벨 */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                  <div className="px-2 py-0.5 bg-slate-800 rounded-full text-[6px] text-white font-medium">🍎 macOS</div>
                  <div className="px-2 py-0.5 bg-blue-600 rounded-full text-[6px] text-white font-medium">🪟 Windows</div>
                </div>
              </motion.div>
            )}

            {/* step 2 (=step5): 바탕화면에 아이콘 등장 */}
            {step === 2 && (
              <motion.div
                key="desktop-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center"
              >
                {/* 바탕화면 아이콘들 (좌측) */}
                <div className="absolute top-4 left-3 space-y-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-blue-400 rounded-lg" />
                    <span className="text-[5px] text-white/70 mt-0.5">문서</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-amber-400 rounded-lg" />
                    <span className="text-[5px] text-white/70 mt-0.5">사진</span>
                  </div>
                </div>

                {/* 네이버 캘린더 아이콘 (바운스 등장) */}
                <motion.div
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', bounce: 0.6, delay: 0.3 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-[#03C75A] to-[#00A347] rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/30">
                    <span className="text-white font-black text-xl">N</span>
                  </div>
                  <span className="text-[7px] text-white font-medium mt-1.5">네이버 캘린더</span>
                  {/* 반짝임 */}
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                      transition={{ delay: 0.5 + i * 0.2, duration: 0.8, repeat: Infinity, repeatDelay: 3 }}
                      className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full"
                      style={{ top: 20 + (i % 2) * 30, left: 30 + i * 15 }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* step 3 (=step6): Dock/작업 표시줄 고정 */}
            {step === 3 && (
              <motion.div
                key="desktop-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col"
              >
                {/* 메인 화면 — 네이버 캘린더 앱 창 */}
                <div className="flex-1 flex items-center justify-center p-3">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-52 h-28 bg-white rounded-lg shadow-2xl overflow-hidden"
                  >
                    <div className="h-5 bg-[#03C75A] flex items-center px-2">
                      <span className="text-white font-bold text-[7px]">N 네이버 캘린더</span>
                    </div>
                    <div className="p-1.5 grid grid-cols-7 gap-px">
                      {[...Array(28)].map((_, i) => (
                        <div key={i} className={`text-[4px] text-center py-0.5 ${i === 21 ? 'bg-[#03C75A] text-white rounded-sm' : 'text-slate-400'}`}>
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* 하단 Dock / 작업 표시줄 */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="h-10 bg-white/15 backdrop-blur-xl mx-6 mb-2 rounded-xl flex items-center justify-center gap-2 px-3"
                >
                  <div className="w-7 h-7 bg-blue-400 rounded-lg" />
                  <div className="w-7 h-7 bg-orange-400 rounded-lg" />
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.8 }}
                    className="w-7 h-7 bg-gradient-to-br from-[#03C75A] to-[#00A347] rounded-lg flex items-center justify-center shadow-lg shadow-green-500/40"
                  >
                    <span className="text-white font-black text-[8px]">N</span>
                  </motion.div>
                  <div className="w-7 h-7 bg-purple-400 rounded-lg" />
                  <div className="w-7 h-7 bg-pink-400 rounded-lg" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* 랩탑 하단 */}
      <div className="h-2.5 bg-slate-400 w-full z-30" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 메인 모달
// ─────────────────────────────────────────────────────────
export function WidgetGuideModal({ type, isOpen, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0)

  // 모달이 열릴 때마다 첫 스텝으로 초기화
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
    }
  }, [isOpen])

  const data = GUIDE_DATA[type]
  const Icon = data.icon
  const totalSteps = data.steps.length
  const isLast = currentStep === totalSteps - 1

  const handleNext = () => {
    if (!isLast) setCurrentStep((s) => s + 1)
    else onClose()
  }

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }

  // 마크다운 스타일 텍스트 렌더링 (**굵게**, *이탤릭*)
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-800">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return (
          <em key={i} className="text-slate-500 not-italic">
            {part.slice(1, -1)}
          </em>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  // 목업 컴포넌트 분기: step 0~2 공통, 3~6 플랫폼별
  const renderMockup = () => {
    if (currentStep < 3) {
      return <NaverCalendarSetupMockup step={currentStep} />
    }
    // 플랫폼별 목업에는 (currentStep - 3)을 전달하여 0~3으로 매핑
    const platformStep = currentStep - 3
    switch (type) {
      case 'ios':
        return <IPhoneMockup step={platformStep} />
      case 'android':
        return <AndroidMockup step={platformStep} />
      case 'desktop':
        return <DesktopMockup step={platformStep} />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && type && (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            {/* 딤 배경 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xl"
              onClick={onClose}
            />

            {/* 프리미엄 모달 컨테이너 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl bg-white backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col md:flex-row min-h-[520px] max-h-[calc(100vh-2rem)] md:max-h-none overflow-y-auto md:overflow-y-visible"
            >
              {/* 좌측: 기기 목업 비주얼 영역 */}
              <div
                className={`relative w-full md:w-[45%] flex items-center justify-center p-6 md:p-8 bg-gradient-to-br ${data.color} overflow-hidden shrink-0`}
              >
                {/* 빛번짐 배경 장식 */}
                <div className="absolute top-0 left-0 w-full h-full bg-white/10" />
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/20 blur-3xl rounded-full mix-blend-overlay" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-black/20 blur-3xl rounded-full mix-blend-overlay" />

                <div className="relative z-10 w-full flex items-center justify-center h-[280px] md:h-full md:min-h-[300px]">
                  <div className="transform scale-[0.55] sm:scale-[0.65] md:scale-100 origin-center">
                    {renderMockup()}
                  </div>
                </div>
              </div>

              {/* 우측: 텍스트 및 컨트롤러 영역 */}
              <div className="relative w-full md:w-[55%] p-6 sm:p-8 md:p-12 flex flex-col shrink-0">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 bg-slate-100/50 hover:bg-slate-200 text-slate-500 rounded-full transition-colors z-20"
                >
              <X className="w-5 h-5" />
            </button>

            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-10">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${data.color} text-white shadow-lg`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-2xl tracking-tight text-slate-900">{data.title}</h3>
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
                  <h4 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-5 leading-tight tracking-tight">
                    {data.steps[currentStep].title}
                  </h4>
                  <div className="text-base md:text-lg text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                    {renderContent(data.steps[currentStep].content)}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 푸터 및 컨트롤 */}
            <div className="mt-10 pt-8 border-t border-slate-200/50 flex items-center justify-between">
              {/* 프로그레스 인디케이터 — 7개 dot */}
              <div className="flex items-center gap-1.5">
                {data.steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === currentStep
                        ? 'w-8 bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]'
                        : i < currentStep
                          ? 'w-3 bg-indigo-300'
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
        </div>
      )}
    </AnimatePresence>
  )
}
