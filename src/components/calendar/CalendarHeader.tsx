'use client'

import { useState } from 'react'
import { format, subMonths, addMonths, subWeeks, addWeeks, startOfWeek, endOfWeek, isSameMonth, isSameYear } from 'date-fns'
import { Menu, ChevronLeft, ChevronRight, Search, Sparkles, Bell, CalendarHeart, Activity, BrainCircuit, Home, Bookmark, NotebookPen, Tag, Trash2, PanelLeftOpen, Globe2, Utensils } from 'lucide-react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { GlobalCategoryFilter } from '@/components/calendar/GlobalCategoryFilter'
import { CategoryPresetMenu } from '@/components/calendar/CategoryPresetMenu'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'
import { DatePickerPopover } from '@/components/calendar/DatePickerPopover'
import { SpotlightSearch } from '@/components/calendar/SpotlightSearch'
import { AnimatePresence, motion } from 'framer-motion'

interface CalendarHeaderProps {
  onOpenSettings: () => void
  onOpenMobileSidebar?: () => void
}

export function CalendarHeader({ onOpenSettings, onOpenMobileSidebar }: CalendarHeaderProps) {
  const { 
    currentDate, viewMode, setViewMode,
    semesterYear, semesterTerm,
    setCurrentDate, setSemesterYear, setSemesterTerm,
    weekStartsOn
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
    const start = startOfWeek(date, { weekStartsOn })
    const end = endOfWeek(date, { weekStartsOn })
    
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
  const isInsights = viewMode === 'insights'
  const isAgenda = viewMode === 'archive_agenda'
  const isLinkLounge = viewMode === 'link_lounge'
  const isHome = viewMode === 'home'
  const isArchiveNotes = viewMode === 'archive_notes'
  const isTags = viewMode === 'tags'
  const isTrash = viewMode === 'trash'
  const isTemplateCenter = viewMode === 'template_center'
  const isGoogleSync = viewMode === 'google_sync'
  const isSchoolMeals = viewMode === 'school_meals'
  const isSchoolSchedule = viewMode === 'school_schedule'

  let wrapperClassName = "flex-1 flex flex-row items-center justify-between rounded-xl md:rounded-[2rem] px-2 py-1.5 md:px-4 md:py-2.5 gap-2 md:gap-4 transition-all duration-500 overflow-hidden relative "

  if (isHome) {
    wrapperClassName += "bg-card/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(139,92,246,0.15)] border border-violet-100/80"
  } else if (isCalendarView) {
    wrapperClassName += "bg-card shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border"
  } else if (isNiceImport) {
    wrapperClassName += "bg-card/80 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)] border border-indigo-100/50"
  } else if (isAnniversary) {
    wrapperClassName += "bg-card/80 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)] border border-rose-100/50"
  } else if (isInsights) {
    wrapperClassName += "bg-card/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(99,102,241,0.2)] border border-indigo-100/80"
  } else if (isAgenda) {
    wrapperClassName += "bg-card/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(139,92,246,0.2)] border border-purple-100/80"
  } else if (isLinkLounge) {
    wrapperClassName += "bg-card/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(16,185,129,0.2)] border border-emerald-100/80"
  } else if (isArchiveNotes) {
    wrapperClassName += "bg-card/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(99,102,241,0.2)] border border-indigo-100/80"
  } else if (isTags) {
    wrapperClassName += "bg-card/80 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(20,184,166,0.15)] border border-teal-100/50"
  } else if (isTrash) {
    wrapperClassName += "bg-card/80 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)] border border-rose-100/50"
  } else if (isTemplateCenter) {
    wrapperClassName += "bg-card/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(236,72,153,0.2)] border border-pink-100/80"
  } else if (isGoogleSync) {
    wrapperClassName += "bg-card/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(16,185,129,0.2)] border border-emerald-100/80"
  } else if (isSchoolMeals) {
    wrapperClassName += "bg-card/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(249,115,22,0.2)] border border-orange-100/80"
  } else if (isSchoolSchedule) {
    wrapperClassName += "bg-card/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.2)] border border-yellow-100/80"
  }

  // --- Slots ---
  const renderLeftSlot = () => {
    if (isHome) {
      return (
        <motion.div 
          key="home-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-4 py-1"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0 shadow-inner border border-transparent">
            <Home className="w-5 h-5 md:w-6 md:h-6 text-violet-600 relative z-10" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-700 to-purple-700 text-base md:text-xl tracking-tight">홈 대시보드</h2>
            <div className="hidden md:flex items-center gap-2 mt-0.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-75" />
                <span className="relative inline-flex rounded-full w-2 h-2 bg-violet-500" />
              </span>
              <p className="text-xs text-violet-500 font-mono tracking-wider font-bold">TODAY&apos;S COMMAND CENTER</p>
            </div>
          </div>
        </motion.div>
      )
    }
    if (isCalendarView) {
      return (
        <motion.div 
          key="cal-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="hidden md:flex items-center shrink-0 xl:border-r xl:border-border xl:pr-4 h-full"
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
            <p className="text-xs text-muted-foreground font-medium">업로드된 결재 내역을 캘린더에 동기화합니다</p>
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
            <p className="text-xs text-muted-foreground font-medium">나만의 특별한 날들을 아름답게 기록하세요</p>
          </div>
        </motion.div>
      )
    }
    if (isInsights) {
      return (
        <motion.div 
          key="insights-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-4 py-1"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 shadow-inner border border-transparent">
            <BrainCircuit className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 relative z-10" />
            <div className="absolute inset-0 bg-card/50 rounded-xl animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700 text-base md:text-xl tracking-tight">인사이트 대시보드</h2>
            <div className="hidden md:flex items-center gap-2 mt-0.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500"></span>
              </span>
              <p className="text-xs text-indigo-500 font-mono tracking-wider font-bold">INSIGHT DASHBOARD ONLINE</p>
            </div>
          </div>
        </motion.div>
      )
    }
    if (isAgenda) {
      return (
        <motion.div 
          key="agenda-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-4 py-1"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center shrink-0 shadow-inner border border-transparent">
            <CalendarHeart className="w-5 h-5 md:w-6 md:h-6 text-purple-600 relative z-10" />
            <div className="absolute inset-0 bg-card/50 rounded-xl animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700 text-base md:text-xl tracking-tight">Agenda Center</h2>
            <div className="hidden md:flex items-center gap-2 mt-0.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2 h-2 bg-blue-500"></span>
              </span>
              <p className="text-xs text-purple-500 font-mono tracking-wider font-bold">MANAGE YOUR TASKS</p>
            </div>
          </div>
        </motion.div>
      )
    }
    if (isLinkLounge) {
      return (
        <motion.div 
          key="linklounge-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-4 py-1"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0 shadow-inner border border-transparent">
            <Bookmark className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 relative z-10" />
            <div className="absolute inset-0 bg-card/50 rounded-xl animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-700 text-base md:text-xl tracking-tight">Link Lounge</h2>
            <div className="hidden md:flex items-center gap-2 mt-0.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2 h-2 bg-teal-500"></span>
              </span>
              <p className="text-xs text-emerald-500 font-mono tracking-wider font-bold">MANAGE YOUR LINKS</p>
            </div>
          </div>
        </motion.div>
      )
    }
    if (isArchiveNotes) {
      return (
        <motion.div 
          key="archive-notes-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-4 py-1"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center shrink-0 shadow-inner border border-transparent">
            <NotebookPen className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 relative z-10" />
            <div className="absolute inset-0 bg-card/50 rounded-xl animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-slate-700 text-base md:text-xl tracking-tight">Archive Notes</h2>
            <div className="hidden md:flex items-center gap-2 mt-0.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted0 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2 h-2 bg-muted0"></span>
              </span>
              <p className="text-xs text-indigo-500 font-mono tracking-wider font-bold">YOUR KNOWLEDGE CANVAS</p>
            </div>
          </div>
        </motion.div>
      )
    }
    if (isTags) {
      return (
        <motion.div 
          key="tags-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-3 py-1"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 text-lg leading-tight tracking-tight">카테고리 허브</h2>
            <p className="text-xs text-muted-foreground font-medium">일정과 노트를 분류하기 위한 카테고리를 생성하고 관리하세요</p>
          </div>
        </motion.div>
      )
    }
    if (isTrash) {
      return (
        <motion.div 
          key="trash-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-3 py-1"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600 text-lg leading-tight tracking-tight">휴지통</h2>
            <p className="text-xs text-muted-foreground font-medium">삭제된 항목을 복구하거나 영구적으로 삭제합니다</p>
          </div>
        </motion.div>
      )
    }
    if (isTemplateCenter) {
      return (
        <motion.div 
          key="template-center-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-4 py-1"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center shrink-0 shadow-inner border border-transparent">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-pink-600 relative z-10" />
            <div className="absolute inset-0 bg-card/50 rounded-xl animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-700 to-purple-700 text-base md:text-xl tracking-tight">템플릿 센터</h2>
            <div className="hidden md:flex items-center gap-2 mt-0.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2 h-2 bg-pink-500"></span>
              </span>
              <p className="text-xs text-pink-500 font-mono tracking-wider font-bold">ACTIVITY TEMPLATE HUB</p>
            </div>
          </div>
        </motion.div>
      )
    }
    if (isGoogleSync) {
      return (
        <motion.div 
          key="google-sync-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-4 py-1"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0 shadow-inner border border-transparent">
            <Globe2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 relative z-10" />
            <div className="absolute inset-0 bg-card/50 rounded-xl animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-700 text-base md:text-xl tracking-tight">구글 연동 센터</h2>
            <div className="hidden md:flex items-center gap-2 mt-0.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2 h-2 bg-teal-500"></span>
              </span>
              <p className="text-xs text-emerald-500 font-mono tracking-wider font-bold">SYNC COMMAND CENTER</p>
            </div>
          </div>
        </motion.div>
      )
    }
    if (isSchoolMeals) {
      return (
        <motion.div 
          key="school-meals-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-4 py-1"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shrink-0 shadow-inner border border-transparent">
            <Utensils className="w-5 h-5 md:w-6 md:h-6 text-orange-600 relative z-10" />
            <div className="absolute inset-0 bg-card/50 rounded-xl animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-700 to-amber-700 text-base md:text-xl tracking-tight">학교 급식 대시보드</h2>
            <div className="hidden md:flex items-center gap-2 mt-0.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2 h-2 bg-orange-500"></span>
              </span>
              <p className="text-xs text-orange-500 font-mono tracking-wider font-bold">SCHOOL MEAL CENTER</p>
            </div>
          </div>
        </motion.div>
      )
    }
    if (isSchoolSchedule) {
      return (
        <motion.div 
          key="school-schedule-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center shrink-0 gap-4 py-1"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center shrink-0 shadow-inner border border-transparent">
            <CalendarHeart className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 relative z-10" />
            <div className="absolute inset-0 bg-card/50 rounded-xl animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-700 to-amber-700 text-base md:text-xl tracking-tight">학사 일정 대시보드</h2>
            <div className="hidden md:flex items-center gap-2 mt-0.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2 h-2 bg-yellow-500"></span>
              </span>
              <p className="text-xs text-yellow-500 font-mono tracking-wider font-bold">SCHOOL SCHEDULE CENTER</p>
            </div>
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
          className="flex-1 flex flex-row items-center justify-center gap-2 md:gap-4 overflow-x-auto hide-scrollbar w-full"
        >
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <button onClick={handlePrev} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <DatePickerPopover>
              {renderHeaderTitle()}
            </DatePickerPopover>
            <button onClick={handleNext} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={handleToday} className="px-3 py-1.5 rounded-full bg-muted hover:bg-slate-200 text-[11px] md:text-xs font-bold text-foreground transition-colors ml-1 min-h-[32px]">
              오늘
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-0.5"></div>

          <div className="flex items-center bg-muted/80 p-0.5 md:p-1 rounded-full shrink-0">
            {(['monthly', 'weekly', 'list', 'semester'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-full text-[11px] md:text-xs font-bold transition-all whitespace-nowrap min-h-[32px] ${
                  viewMode === mode ? 'bg-card text-blue-600 shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground'
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
      <div className="hidden md:flex items-center justify-end gap-1 sm:gap-2 shrink-0">
        <AnimatePresence mode="popLayout">
          {isCalendarView && (
            <motion.div
              key="cal-actions-presets"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center mr-1"
            >
              <CategoryPresetMenu />
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex items-center justify-end gap-2 shrink-0 ${isCalendarView ? 'xl:border-l xl:border-border xl:pl-4' : ''}`}>
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
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
                title="검색"
              >
                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
              
              <button 
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative group"
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
      </div>
    )
  }

  return (
    <>
      <header className="px-2 sm:px-6 py-2 sm:py-4 w-full z-20 relative">
        <div className="flex w-full items-center gap-2">
          {/* Mobile Sidebar Trigger */}
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-card border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all shrink-0"
              aria-label="메뉴 열기"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}

          {/* Unified Dynamic Wrapper */}
          <div className={wrapperClassName}>
            {/* Background Glows for Premium Vibe */}
            {isHome && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-50/50 via-purple-50/30 to-pink-50/50 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none" />
              </>
            )}
            {isNiceImport && (
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 pointer-events-none" />
            )}
            {isAnniversary && (
              <div className="absolute inset-0 bg-gradient-to-r from-rose-50/50 to-pink-50/50 pointer-events-none" />
            )}
            {isInsights && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-pink-50/50 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none" />
              </>
            )}
            {isAgenda && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-blue-50/30 to-indigo-50/50 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none" />
              </>
            )}
            {isLinkLounge && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-cyan-50/50 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none" />
              </>
            )}
            {isTemplateCenter && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-50/50 via-purple-50/30 to-rose-50/50 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none" />
              </>
            )}
            {isGoogleSync && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-cyan-50/50 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none" />
              </>
            )}

            <div className="relative z-10 flex flex-row w-full items-center justify-between gap-2 md:gap-4">
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
