'use client'

import { useState } from 'react'
import { format, subMonths, addMonths, subWeeks, addWeeks, startOfWeek, endOfWeek, isSameMonth, isSameYear } from 'date-fns'
import { Menu, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react'
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
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 sm:py-6 bg-transparent gap-4 w-full z-20 relative">
        
        {/* Mobile Menu Button & Unified Box Wrapper */}
        <div className="flex w-full sm:w-auto flex-1 items-center gap-2">
          <button className="md:hidden p-2 text-slate-600 bg-white rounded-full shadow-sm"><Menu className="w-5 h-5" /></button>

          {/* Unified Pill Box (Glassmorphism) */}
          <div className="flex-1 flex flex-col md:flex-row items-start md:items-center justify-between bg-white/60 backdrop-blur-xl border border-white shadow-sm rounded-[2rem] px-4 py-3 md:px-6 md:py-2.5 gap-4">
            
            {viewMode === 'nice_import' ? (
              <div className="w-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-500 py-1">
                <div className="relative group cursor-default">
                  {/* Subtle glowing blur behind */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                  
                  {/* Main badge */}
                  <div className="relative flex items-center gap-2.5 px-6 py-2.5 bg-white/90 backdrop-blur-sm rounded-full border border-blue-100/50 shadow-sm ring-1 ring-white/50">
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
              <>
                {/* Left: Global Filters */}
                <div className="flex items-center overflow-x-auto hide-scrollbar w-full md:max-w-[250px] lg:max-w-[300px]">
                  <GlobalCategoryFilter />
                </div>

                {/* Center: Date Navigation & DatePicker Trigger */}
                <div className="flex items-center justify-center flex-1 space-x-1 sm:space-x-3 shrink-0">
                  <button onClick={handlePrev} className="p-1.5 rounded-full hover:bg-slate-200/50 text-slate-600 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {/* Phase 3: DatePickerPopover 적용 */}
                  <DatePickerPopover>
                    {renderHeaderTitle()}
                  </DatePickerPopover>

                  <button onClick={handleNext} className="p-1.5 rounded-full hover:bg-slate-200/50 text-slate-600 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  <button onClick={handleToday} className="px-3.5 py-1.5 rounded-full bg-slate-200/50 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors ml-1 sm:ml-2">
                    오늘
                  </button>
                </div>

                {/* Right: View Switcher */}
                <div className="flex items-center bg-slate-200/50 p-1.5 rounded-2xl overflow-x-auto hide-scrollbar shrink-0 w-full sm:w-auto justify-center">
                  {(['monthly', 'weekly', 'list', 'semester'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap text-center ${
                        viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 shadow-none'
                      }`}
                    >
                      {mode === 'monthly' ? '월' : mode === 'weekly' ? '주' : mode === 'list' ? '목록' : '학기'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Outer Right: Spotlight & Profile */}
        <div className="flex items-center justify-end space-x-3 shrink-0 sm:pl-2">
          {/* Spotlight Search Icon */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="p-2.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-blue-600 hover:shadow-md transition-all group"
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          {/* Profile */}
          <div className="hidden sm:block">
            <ProfileDropdown onOpenSettings={onOpenSettings} />
          </div>
        </div>
      </header>

      {/* Spotlight Search Modal */}
      <SpotlightSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  )
}
