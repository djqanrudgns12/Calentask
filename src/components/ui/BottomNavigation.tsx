'use client'

import { Calendar, Archive, Home, LayoutList, MoreHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import { ViewMode } from '@/store/useCalendarStore'

interface BottomNavigationProps {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  onOpenSettings: () => void
  onOpenTags: () => void
  onOpenMobileSidebar?: () => void
}

export function BottomNavigation({ viewMode, setViewMode, onOpenSettings, onOpenTags, onOpenMobileSidebar }: BottomNavigationProps) {
  const tabs = [
    { id: 'home', icon: Home, label: '홈' },
    { id: 'monthly', icon: Calendar, label: '캘린더' },
    { id: 'archive', icon: Archive, label: '아카이브' },
    { id: 'agenda', icon: LayoutList, label: '아젠다' },
    { id: 'more', icon: MoreHorizontal, label: '더보기' },
  ]

  const handleTabClick = (id: string) => {
    if (id === 'more') {
      onOpenMobileSidebar?.()
    } else if (id === 'archive') {
      setViewMode('archive_notes' as ViewMode)
    } else if (id === 'agenda') {
      setViewMode('archive_agenda' as ViewMode)
    } else {
      setViewMode(id as ViewMode)
    }
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 h-16">
        {tabs.map((tab) => {
          // "더보기"는 active 상태를 갖지 않음 — 나머지 탭에 속하지 않는 뷰에서도 하이라이트 X
          const isActive = tab.id !== 'more' && (
            (tab.id === 'home' && viewMode === 'home') ||
            (tab.id === 'archive' && ['archive_notes', 'link_lounge'].includes(viewMode)) ||
            (tab.id === 'agenda' && viewMode === 'archive_agenda') ||
            (tab.id === 'monthly' && ['monthly', 'weekly', 'list', 'semester', 'anniversary'].includes(viewMode))
          )
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="relative flex flex-col items-center justify-center w-16 h-full transition-colors"
            >
              <div className="relative flex flex-col items-center justify-center gap-1 z-10">
                <Icon 
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isActive ? 'text-blue-600 scale-110' : 'text-muted-foreground'
                  }`} 
                />
                <span className={`text-[10px] font-medium whitespace-nowrap truncate transition-colors ${
                  isActive ? 'text-blue-600' : 'text-muted-foreground'
                }`}>
                  {tab.label}
                </span>
              </div>
              
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-[1px] w-10 h-[3px] bg-blue-600 rounded-b-full shadow-[0_2px_8px_rgba(37,99,235,0.4)]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
