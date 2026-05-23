'use client'

import { useState } from 'react'
import { format, subMonths, addMonths, subWeeks, addWeeks, startOfWeek, endOfWeek, isSameMonth, isSameYear } from 'date-fns'
import { Menu, ChevronLeft, ChevronRight, Search, Sparkles, Bell } from 'lucide-react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { GlobalCategoryFilter } from '@/components/calendar/GlobalCategoryFilter'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'
import { DatePickerPopover } from '@/components/calendar/DatePickerPopover'
import { SpotlightSearch } from '@/components/calendar/SpotlightSearch'

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

  // Phase 2: 뷰별 맞춤형 네비게이션 로직 적용
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

  // 주간 뷰 전용 타이틀 포맷터 (달/연도 걸침 엣지케이스 처리)
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

  // 최종 타이틀 렌더러
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

  return (
    <>
      <header className="px-4 sm:px-6 py-4 w-full z-20 relative">
        <div className="flex w-full items-center gap-2">
          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-slate-600 bg-white rounded-full shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-100"><Menu className="w-5 h-5" /></button>

          {/* Unified Pure White Pill Box */}
          <div className="flex-1 flex flex-col xl:flex-row items-center justify-between bg-white rounded-[2rem] xl:rounded-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 px-3 py-2 md:px-4 md:py-2.5 gap-4 transition-all">
            
            {/* Left: Logo + Title */}
            <div className="flex items-center shrink-0 pr-4 xl:border-r xl:border-slate-100">
              <img src="/icon.png" alt="Calentask Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm mr-3" />
              <span className="text-xl font-extrabold tracking-tight text-slate-900 hidden sm:block">Calentask</span>
            </div>

            {viewMode === 'nice_import' ? (
              <div className="flex-1 flex items-center justify-center animate-in fade-in zoom-in-95 duration-500 py-1">
                <div className="relative group cursor-default">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative flex items-center gap-2.5 px-6 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-blue-100/50 shadow-sm ring-1 ring-white/50">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 tracking-tight text-sm sm:text-base">
                      나이스(NEIS) 데이터 연동 센터
                    </span>
                    <div className="flex h-2 w-2 ml-1 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col lg:flex-row items-center justify-between gap-4 w-full overflow-hidden">
                {/* Center: Global Filters & Date Navigation & View Switcher */}
                <div className="flex items-center justify-center flex-1 gap-2 sm:gap-4 overflow-x-auto hide-scrollbar w-full">
                  <GlobalCategoryFilter />
                  
                  <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

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

                  {/* View Switcher */}
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
                </div>
              </div>
            )}

            {/* Right: Search, Notification, Profile */}
            <div className="flex items-center justify-end gap-2 shrink-0 xl:border-l xl:border-slate-100 xl:pl-4">
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

              <div className="hidden sm:block ml-1">
                <ProfileDropdown onOpenSettings={onOpenSettings} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Spotlight Search Modal */}
      <SpotlightSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  )
}
