'use client'

import { useState } from 'react'
import { format, subMonths, addMonths, subWeeks, addWeeks, startOfWeek, endOfWeek, isSameMonth, isSameYear } from 'date-fns'
import { Menu, ChevronLeft, ChevronRight, Search, Sparkles, Bell, CalendarHeart } from 'lucide-react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { GlobalCategoryFilter } from '@/components/calendar/GlobalCategoryFilter'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'
import { DatePickerPopover } from '@/components/calendar/DatePickerPopover'
import { SpotlightSearch } from '@/components/calendar/SpotlightSearch'
import { AnimatePresence, motion } from 'framer-motion'

interface CalendarHeaderProps {
  onOpenSettings: () => void
}

export function CalendarHeader({ onOpenSettings }: CalendarHeaderProps) {
  const { 
    currentDate, viewMode, setViewMode,
    semesterYear, semesterTerm,
    setCurrentDate, setSemesterYear, setSemesterTerm
  } = useCalendarStore()

  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // 뷰별 네비게이션 로직
  const handlePrev = () => {
    switch (viewMode) {
      case 'semester':
        if (semesterTerm === 1) {
          setSemesterTerm(2)
          setSemesterYear(semesterYear - 1)
        } else {
          setSemesterTerm(1)
        }
        break
      case 'weekly':
        setCurrentDate(subWeeks(currentDate, 1))
        break
      case 'list':
      case 'monthly':
      default:
        setCurrentDate(subMonths(currentDate, 1))
        break
    }
  }

  const handleNext = () => {
    switch (viewMode) {
      case 'semester':
        if (semesterTerm === 2) {
          setSemesterTerm(1)
          setSemesterYear(semesterYear + 1)
        } else {
          setSemesterTerm(2)
        }
        break
      case 'weekly':
        setCurrentDate(addWeeks(currentDate, 1))
        break
      case 'list':
      case 'monthly':
      default:
        setCurrentDate(addMonths(currentDate, 1))
        break
    }
  }

  const handleToday = () => {
    if (viewMode === 'semester') {
      setSemesterYear(new Date().getFullYear())
      setSemesterTerm(new Date().getMonth() >= 2 && new Date().getMonth() <= 7 ? 1 : 2)
    } else {
      setCurrentDate(new Date())
    }
  }

  const getWeeklyTitle = (date: Date) => {
    const start = startOfWeek(date)
    const end = endOfWeek(date)
    
    if (!isSameYear(start, end)) {
      return `${format(start, 'yyyy. M.d')} ~ ${format(end, 'yyyy. M.d')}`
    }
    if (!isSameMonth(start, end)) {
      return `${format(start, 'yyyy. M.d')} ~ ${format(end, 'M.d')}`
    }
    return `${format(start, 'yyyy. M.d')} ~ ${format(end, 'd')}`
  }

  const renderHeaderTitle = () => {
    switch (viewMode) {
      case 'semester':
        return `${semesterYear}년 ${semesterTerm}학기`
      case 'weekly':
        return getWeeklyTitle(currentDate)
      case 'list':
      case 'monthly':
      default:
        return format(currentDate, 'yyyy년 M월')
    }
  }

  // --- Theme & Style based on Context ---
  const isCalendarView = ['monthly', 'weekly', 'list', 'semester'].includes(viewMode)
  const isNiceImport = viewMode === 'nice_import'
  const isAnniversary = viewMode === 'anniversary'

  let wrapperClassName = "flex-1 flex flex-col xl:flex-row items-center justify-between rounded-[2rem] px-3 py-2 md:px-4 md:py-2.5 gap-4 transition-all duration-500 overflow-hidden relative "

  if (isCalendarView) {
    wrapperClassName += "bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100"
  } else if (isNiceImport) {
    wrapperClassName += "bg-white/80 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)] border border-indigo-100/50"
  } else if (isAnniversary) {
    wrapperClassName += "bg-white/80 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)] border border-rose-100/50"
  }

  // --- Slots ---
  const renderLeftSlot = () => {
    if (isCalendarView) {
      return (
        <motion.div 
          key="cal-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 xl:border-r xl:border-slate-100 xl:pr-4 h-full"
        >
          <GlobalCategoryFilter />
        </motion.div>
      )
    }
    if (isNiceImport) {
      return (
        <motion.div 
          key="nice-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-3 py-1"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 text-lg leading-tight tracking-tight">나이스 복무 불러오기</h2>
            <p className="text-xs text-slate-500 font-medium">업로드된 결재 내역을 캘린더에 동기화합니다</p>
          </div>
        </motion.div>
      )
    }
    if (isAnniversary) {
      return (
        <motion.div 
          key="anni-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-3 py-1"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center shrink-0">
            <CalendarHeart className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600 text-lg leading-tight tracking-tight">기념일 설정</h2>
            <p className="text-xs text-slate-500 font-medium">나만의 특별한 날들을 아름답게 기록하세요</p>
          </div>
        </motion.div>
      )
    }
    return null
  }

  const renderCenterSlot = () => {
    if (isCalendarView) {
      return (
        <motion.div 
          key="cal-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex-1 flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto hide-scrollbar w-full"
        >
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <button onClick={handlePrev} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <DatePickerPopover>
              {renderHeaderTitle()}
            </DatePickerPopover>
            <button onClick={handleNext} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={handleToday} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors ml-1">
              오늘
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <div className="flex items-center bg-slate-100/80 p-1 rounded-full shrink-0">
            {(['monthly', 'weekly', 'list', 'semester'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  viewMode === mode ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode === 'monthly' ? '월' : mode === 'weekly' ? '주' : mode === 'list' ? '목록' : '학기'}
              </button>
            ))}
          </div>
        </motion.div>
      )
    }
    return <div className="flex-1" /> // empty space
  }

  const renderRightSlot = () => {
    return (
      <div className={`flex items-center justify-end gap-2 shrink-0 ${isCalendarView ? 'xl:border-l xl:border-slate-100 xl:pl-4' : ''}`}>
        <AnimatePresence mode="popLayout">
          {isCalendarView && (
            <motion.div
              key="cal-actions"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors group"
                title="검색"
              >
                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
              
              <button 
                className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors relative group"
                title="알림"
              >
                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white"></span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="hidden sm:block ml-1">
          <ProfileDropdown onOpenSettings={onOpenSettings} />
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="px-4 sm:px-6 py-4 w-full z-20 relative">
        <div className="flex w-full items-center gap-2">
          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-slate-600 bg-white rounded-full shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-100"><Menu className="w-5 h-5" /></button>

          {/* Unified Dynamic Wrapper */}
          <div className={wrapperClassName}>
            {/* Background Glows for Premium Vibe */}
            {isNiceImport && (
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 pointer-events-none" />
            )}
            {isAnniversary && (
              <div className="absolute inset-0 bg-gradient-to-r from-rose-50/50 to-pink-50/50 pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col xl:flex-row w-full items-center justify-between gap-4">
              <AnimatePresence mode="wait">
                {renderLeftSlot()}
              </AnimatePresence>
              
              <AnimatePresence mode="wait">
                {renderCenterSlot()}
              </AnimatePresence>

              {renderRightSlot()}
            </div>
          </div>
        </div>
      </header>

      {/* Spotlight Search Modal */}
      <SpotlightSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  )
}
