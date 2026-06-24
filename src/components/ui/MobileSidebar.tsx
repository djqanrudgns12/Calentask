'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Calendar as CalendarIcon, Sparkles, Gift, Archive, NotebookPen,
  Bookmark, Database, DownloadCloud, Tags, Trash2, Settings, LogOut,
  ChevronDown, Puzzle, Globe2, Utensils
} from 'lucide-react'
import { useCalendarStore, ViewMode } from '@/store/useCalendarStore'
import { UpcomingAnniversaryWidget } from '@/components/anniversary/UpcomingAnniversaryWidget'
import { logout } from '@/app/actions/auth'
import { useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { IOSInstallGuideModal } from '@/components/pwa/IOSInstallGuideModal'

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenSettings: () => void
}

// ─── 메뉴 아이템 (한 줄 보장) ───
function MenuItem({
  icon: Icon,
  label,
  isActive,
  iconColor,
  activeBg,
  onClick,
}: {
  icon: React.ElementType
  label: string
  isActive: boolean
  iconColor?: string
  activeBg?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left px-3.5 py-2.5 h-[42px] rounded-xl text-[14px] transition-all duration-200 flex items-center gap-3 overflow-hidden ${
        isActive
          ? `${activeBg || 'bg-blue-50/70'} font-bold`
          : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/80'
      }`}
    >
      {isActive && (
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${iconColor ? iconColor.replace('text-', 'bg-') : 'bg-blue-500'}`} />
      )}
      <Icon className={`w-4 h-4 shrink-0 transition-transform ${
        isActive ? (iconColor || 'text-blue-600') : 'text-muted-foreground group-hover:scale-105'
      }`} />
      <span className="truncate whitespace-nowrap">{label}</span>
    </button>
  )
}

// ─── 하위 메뉴 아이템 (한 줄 보장) ───
function SubMenuItem({
  icon: Icon,
  label,
  isActive,
  iconColor,
  activeBg,
  onClick,
}: {
  icon: React.ElementType
  label: string
  isActive: boolean
  iconColor?: string
  activeBg?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 flex items-center gap-2.5 overflow-hidden ${
        isActive
          ? `${activeBg || 'bg-blue-50/70'} shadow-sm font-semibold`
          : 'text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/80'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${
        isActive ? (iconColor || 'text-blue-600') : 'text-muted-foreground/50'
      }`} />
      <span className="truncate whitespace-nowrap">{label}</span>
    </button>
  )
}

// ─── 접기/펼치기 가능한 메뉴 그룹 ───
function CollapsibleGroup({
  icon: Icon,
  label,
  isOpen,
  isActive,
  iconColor,
  activeBg,
  onToggle,
  children,
}: {
  icon: React.ElementType
  label: string
  isOpen: boolean
  isActive: boolean
  iconColor?: string
  activeBg?: string
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <button
        onClick={onToggle}
        className={`group relative w-full text-left px-3.5 py-2.5 h-[42px] rounded-xl text-[14px] transition-all duration-200 flex items-center justify-between overflow-hidden ${
          isActive
            ? `${activeBg || 'bg-blue-50/70'} font-bold`
            : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/80'
        }`}
      >
        {isActive && (
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${iconColor ? iconColor.replace('text-', 'bg-') : 'bg-blue-500'}`} />
        )}
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 transition-transform ${
            isActive ? (iconColor || 'text-blue-600') : 'text-muted-foreground group-hover:scale-105'
          }`} />
          <span className="truncate whitespace-nowrap">{label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
          isOpen ? 'rotate-180' : ''
        } ${isActive ? (iconColor || 'text-blue-600') : 'text-muted-foreground'}`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col space-y-1 mt-1 pb-1 ml-5 pl-2 border-l-2 border-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ═══════════════════════════════════════════════
// MobileSidebar 본체
// ═══════════════════════════════════════════════
export function MobileSidebar({ open, onOpenChange, onOpenSettings }: MobileSidebarProps) {
  const { viewMode, setViewMode, resetStore } = useCalendarStore()
  const queryClient = useQueryClient()
  const { isInstallable, isStandalone, installApp } = usePwaInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  // 아코디언 상태
  const isCalendarMenuOpen = ['monthly', 'weekly', 'list', 'semester', 'archive_agenda', 'anniversary'].includes(viewMode)
  const isArchiveMenuOpen = ['archive_notes', 'link_lounge'].includes(viewMode)
  const isDataCenterMenuOpen = ['insights', 'nice_import', 'tags', 'trash', 'template_center'].includes(viewMode)

  const [calendarOpen, setCalendarOpen] = useState(isCalendarMenuOpen)
  const [archiveOpen, setArchiveOpen] = useState(isArchiveMenuOpen)
  const [dataCenterOpen, setDataCenterOpen] = useState(isDataCenterMenuOpen)

  const navigate = (mode: ViewMode) => {
    setViewMode(mode)
    onOpenChange(false)
  }

  const handleLogout = async () => {
    onOpenChange(false)
    resetStore()
    queryClient.clear()
    await logout()
  }

  const handleOpenSettings = () => {
    onOpenChange(false)
    onOpenSettings()
  }

  const handleInstallClick = async () => {
    const result = await installApp()
    if (result?.action === 'show-ios-guide') {
      setShowIOSModal(true)
    } else if (result?.action === 'show-desktop-guide') {
      alert('설치 프롬프트를 띄울 수 없거나 이미 설치되어 있습니다.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={true}
        className="w-[280px] max-w-[85vw] p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
          <SheetTitle className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="Calentask"
              className="w-8 h-8 rounded-xl object-cover shadow-sm shrink-0"
            />
            <span className="text-lg font-extrabold tracking-tight text-foreground truncate whitespace-nowrap">
              Calentask
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* 스크롤 가능 메뉴 영역 — iOS 관성 스크롤 */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* 기념일 위젯 */}
          <div className="mb-4">
            <UpcomingAnniversaryWidget />
          </div>

          {/* ── DASHBOARD ── */}
          <div className="mb-5">
            <div className="px-1 mb-2 text-[11px] font-bold tracking-widest text-muted-foreground select-none">
              DASHBOARD
            </div>
            <div className="flex flex-col space-y-1">
              <MenuItem
                icon={Home}
                label="홈"
                isActive={viewMode === 'home'}
                iconColor="text-violet-600"
                activeBg="bg-violet-50/70 text-violet-700"
                onClick={() => navigate('home')}
              />
              <MenuItem
                icon={Utensils}
                label="학교 급식 정보"
                isActive={viewMode === 'school_meals'}
                iconColor="text-orange-500"
                activeBg="bg-orange-50/70 text-orange-700"
                onClick={() => navigate('school_meals')}
              />
            </div>
          </div>

          {/* ── WORKSPACE ── */}
          <div className="mb-5">
            <div className="px-1 mb-2 text-[11px] font-bold tracking-widest text-muted-foreground select-none">
              WORKSPACE
            </div>
            <div className="flex flex-col space-y-1">
              {/* 캘린더 관리 */}
              <CollapsibleGroup
                icon={CalendarIcon}
                label="캘린더 관리"
                isOpen={calendarOpen}
                isActive={isCalendarMenuOpen}
                iconColor="text-blue-600"
                activeBg="bg-blue-50/70 text-blue-700"
                onToggle={() => {
                  setCalendarOpen(!calendarOpen)
                }}
              >
                <SubMenuItem
                  icon={CalendarIcon}
                  label="나의 캘린더"
                  isActive={['monthly', 'weekly', 'list', 'semester'].includes(viewMode)}
                  iconColor="text-blue-600"
                  activeBg="bg-blue-50/70 text-blue-700"
                  onClick={() => navigate('monthly')}
                />
                <SubMenuItem
                  icon={Sparkles}
                  label="아젠다"
                  isActive={viewMode === 'archive_agenda'}
                  iconColor="text-purple-600"
                  activeBg="bg-purple-50/70 text-purple-700"
                  onClick={() => navigate('archive_agenda')}
                />
                <SubMenuItem
                  icon={Gift}
                  label="기념일 설정"
                  isActive={viewMode === 'anniversary'}
                  iconColor="text-rose-600"
                  activeBg="bg-rose-50/70 text-rose-700"
                  onClick={() => navigate('anniversary')}
                />
                <SubMenuItem
                  icon={Globe2}
                  label="구글 계정/캘린더 연동"
                  isActive={viewMode === 'google_sync'}
                  iconColor="text-emerald-600"
                  activeBg="bg-emerald-50/70 text-emerald-700"
                  onClick={() => navigate('google_sync')}
                />
              </CollapsibleGroup>

              {/* 아카이브 */}
              <CollapsibleGroup
                icon={Archive}
                label="아카이브"
                isOpen={archiveOpen}
                isActive={isArchiveMenuOpen}
                activeBg="bg-accent text-foreground"
                onToggle={() => {
                  setArchiveOpen(!archiveOpen)
                }}
              >
                <SubMenuItem
                  icon={NotebookPen}
                  label="노트"
                  isActive={viewMode === 'archive_notes'}
                  activeBg="bg-accent text-foreground"
                  onClick={() => navigate('archive_notes')}
                />
                <SubMenuItem
                  icon={Bookmark}
                  label="링크 라운지"
                  isActive={viewMode === 'link_lounge'}
                  iconColor="text-indigo-600"
                  activeBg="bg-indigo-50/70 text-indigo-700"
                  onClick={() => navigate('link_lounge')}
                />
              </CollapsibleGroup>
            </div>
          </div>

          {/* ── DATA & SYSTEM ── */}
          <div className="mb-5">
            <div className="px-1 mb-2 text-[11px] font-bold tracking-widest text-muted-foreground select-none">
              DATA & SYSTEM
            </div>
            <div className="flex flex-col space-y-1">
              <CollapsibleGroup
                icon={Database}
                label="데이터 센터"
                isOpen={dataCenterOpen}
                isActive={isDataCenterMenuOpen}
                iconColor="text-teal-600"
                activeBg="bg-teal-50/70 text-teal-800"
                onToggle={() => {
                  setDataCenterOpen(!dataCenterOpen)
                }}
              >
                <SubMenuItem
                  icon={Sparkles}
                  label="인사이트 대시보드"
                  isActive={viewMode === 'insights'}
                  iconColor="text-purple-600"
                  activeBg="bg-purple-50/70 text-purple-700"
                  onClick={() => navigate('insights')}
                />
                <SubMenuItem
                  icon={Puzzle}
                  label="템플릿 센터"
                  isActive={viewMode === 'template_center'}
                  iconColor="text-pink-600"
                  activeBg="bg-pink-50/70 text-pink-700"
                  onClick={() => navigate('template_center')}
                />
                <SubMenuItem
                  icon={DownloadCloud}
                  label="나이스 복무 불러오기"
                  isActive={viewMode === 'nice_import'}
                  iconColor="text-indigo-600"
                  activeBg="bg-indigo-50/70 text-indigo-700"
                  onClick={() => navigate('nice_import')}
                />
                <SubMenuItem
                  icon={Tags}
                  label="카테고리 허브"
                  isActive={viewMode === 'tags'}
                  iconColor="text-teal-600"
                  activeBg="bg-teal-50/70 text-teal-700"
                  onClick={() => navigate('tags')}
                />
                <SubMenuItem
                  icon={Trash2}
                  label="휴지통"
                  isActive={viewMode === 'trash'}
                  iconColor="text-rose-600"
                  activeBg="bg-rose-50/70 text-rose-700"
                  onClick={() => navigate('trash')}
                />
              </CollapsibleGroup>
            </div>
          </div>
        </div>

        {/* ── 하단 고정 영역 (safe area 대응) ── */}
        <div className="shrink-0 border-t border-border px-4 py-4 space-y-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {!isStandalone && (
            <Button
              variant="default"
              onClick={handleInstallClick}
              className="w-full text-[14px] font-bold flex items-center justify-center gap-2 h-10 whitespace-nowrap bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="truncate">앱 설치하기</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleOpenSettings}
            className="w-full text-sm font-medium flex items-center justify-center gap-2 h-10 whitespace-nowrap"
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="truncate">환경설정</span>
          </Button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="truncate">로그아웃</span>
          </button>
        </div>
      </SheetContent>
      <IOSInstallGuideModal open={showIOSModal} onOpenChange={setShowIOSModal} />
    </Sheet>
  )
}
