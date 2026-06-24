/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useArchiveStore } from '@/store/useArchiveStore'
import { useAgendaStore } from '@/store/useAgendaStore'
import { Button } from '@/components/ui/button'
import { Plus, Tags, Database, LogOut, Calendar as CalendarIcon, DownloadCloud, Gift, Sparkles, ChevronDown, Archive, NotebookPen, Bookmark, Trash2, Settings, Home, Puzzle, Globe2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { startOfWeek, endOfWeek } from 'date-fns'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { useEventDragDrop } from '@/hooks/useEventDragDrop'
import { useActivities, expandActivities } from '@/hooks/useCalendarQueries'
import { type Activity, getActivities } from '@/app/actions/calendar'
import { logout } from '@/app/actions/auth'
import { useQueryClient } from '@tanstack/react-query'
import { AddEventDialog } from '@/components/calendar/AddEventDialog'
import { MonthlyView } from '@/components/calendar/MonthlyView'
import { WeeklyView } from '@/components/calendar/WeeklyView'
import { ListView } from '@/components/calendar/ListView'
import { SemesterView } from '@/components/calendar/SemesterView'


import { LinkLoungeView } from '@/components/link-lounge/LinkLoungeView';

import { DaySummarySheet } from '@/components/calendar/DaySummarySheet'
import { EventDetailPopover } from '@/components/calendar/EventDetailPopover'
import { NiceImportView } from '@/components/calendar/NiceImportView'
import { DeleteConfirmDialog } from '@/components/calendar/DeleteConfirmDialog'
import { EditCategoryDialog } from '@/components/calendar/EditCategoryDialog'
import { SettingsModal } from '@/components/profile/SettingsModal'
import { TagsView } from '@/components/data-center/TagsView'
import { TrashView } from '@/components/data-center/TrashView'
import { ClearAllDataDialog } from '@/components/profile/ClearAllDataDialog'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { AnniversaryConfetti } from '@/components/anniversary/AnniversaryConfetti'
import { AddAgendaTaskDialog } from '@/components/archive/AddAgendaTaskDialog'
import { UpcomingAnniversaryWidget } from '@/components/anniversary/UpcomingAnniversaryWidget'
import { useAnniversaryOverlay } from '@/hooks/useAnniversaryOverlay'
import { AnniversarySettingsView } from '@/components/anniversary/AnniversarySettingsView'
import { GoogleSyncTab } from '@/components/calendar/GoogleSyncTab'
import InsightsClient from '@/app/insights/InsightsClient'
import { ArchiveNotesView } from '@/components/archive/ArchiveNotesView'
import { ArchiveAgendaView } from '@/components/archive/ArchiveAgendaView'
import { HomeDashboard } from '@/components/home/HomeDashboard'
import { BottomNavigation } from '@/components/ui/BottomNavigation'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { MobileCategoryBar } from '@/components/calendar/MobileCategoryBar'
import { MobileSidebar } from '@/components/ui/MobileSidebar'
import dynamic from 'next/dynamic'

const TemplateCenterTab = dynamic(() => import('@/components/insights/TemplateCenterTab'), { ssr: false })

export function CalendarClient() {
  const [mounted, setMounted] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'calendar' | 'display'>('profile')
  const queryClient = useQueryClient()
  const router = useRouter()
  
  const { 
    currentDate, viewMode, setViewMode,
    semesterYear, semesterTerm, activeCategories, resetStore,
    weekStartsOn
  } = useCalendarStore()

  const isHome = viewMode === 'home'
  const isCalendarMenuOpen = ['monthly', 'weekly', 'list', 'semester', 'archive_agenda', 'anniversary', 'google_sync'].includes(viewMode)
  const isMyCalendarActive = ['monthly', 'weekly', 'list', 'semester'].includes(viewMode)
  const isArchiveMenuOpen = ['archive_notes', 'link_lounge'].includes(viewMode)
  const isDataCenterMenuOpen = ['insights', 'nice_import', 'tags', 'trash', 'template_center'].includes(viewMode)

  const handleLogout = async () => {
    resetStore()
    queryClient.clear()
    await logout()
  }

  // 현재 달 기준 날짜 계산 (전체 일정 패치를 위해)
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = startOfWeek(monthStart, { weekStartsOn })
  
  // 학기 뷰일 경우 해당 학기 분량의 데이터를 패치 (1학기: 3.1~8.31, 2학기: 9.1~익년 2.28)
  const semesterStartDate = new Date(semesterYear, semesterTerm === 1 ? 2 : 8, 1) // 3월 또는 9월
  const semesterEndDate = new Date(semesterTerm === 1 ? semesterYear : semesterYear + 1, semesterTerm === 1 ? 7 : 1, semesterTerm === 1 ? 31 : 28)
  
  const queryStartDate = viewMode === 'semester' ? startOfWeek(semesterStartDate, { weekStartsOn }) : startDate
  const queryEndDate = viewMode === 'semester' ? endOfWeek(semesterEndDate, { weekStartsOn }) : endOfWeek(monthEnd, { weekStartsOn })
  
  // React Query Fetching
  const { data: activitiesData } = useActivities(queryStartDate.toISOString(), queryEndDate.toISOString())
  const { data: anniversaryEvents } = useAnniversaryOverlay(queryStartDate.toISOString(), queryEndDate.toISOString())
  
  // 가상 기념일 배열과 아젠다 스토어 연동 (Desktop 작업 내용과 맥북 작업 내용 호환)
  const { tasks: agendaTasksStore, fetchTasks: fetchAgendaTasks, isInitialized: isAgendaInitialized } = useAgendaStore()

  useEffect(() => {
    if (!isAgendaInitialized) {
      fetchAgendaTasks()
    }
  }, [isAgendaInitialized, fetchAgendaTasks])

  const agendaEvents = agendaTasksStore
    .filter(task => task.status !== 'trash' && task.deadline && task.is_calendar_registered === true)
    .map(task => {
      const taskDate = new Date(task.deadline!);
      return {
        id: task.id,
        title: task.title,
        start_time: taskDate.toISOString(),
        end_time: new Date(taskDate.getTime() + 60 * 60 * 1000).toISOString(),
        startTime: taskDate.toISOString(), // for legacy compatibility
        endTime: new Date(taskDate.getTime() + 60 * 60 * 1000).toISOString(), // for legacy compatibility
        categories: [{ id: 'agenda-category', name: 'Agenda', color: '#3b82f6', hex_color: '#3b82f6' }],
        is_all_day: false,
        isAllDay: false, // for legacy compatibility
        memo: task.memo || 'From Archive Agenda',
        color: '#3b82f6',
        hex_color: '#3b82f6'
      };
    }) as unknown as Activity[]

  let events = [
    ...(activitiesData || []),
    ...((anniversaryEvents || []) as unknown as Activity[]),
    ...agendaEvents
  ]

  // 글로벌 카테고리 필터 적용
  if (activeCategories.length > 0) {
    events = events.filter(event => 
      event.categories?.some(cat => activeCategories.includes(cat.id) || cat.id === 'agenda-category')
    )
  }

  const { activeEvent, handleDragStart, handleDragEnd, handleDragCancel } = useEventDragDrop({
    viewMode: viewMode as any,
    events,
    startDateStr: queryStartDate.toISOString(),
    endDateStr: queryEndDate.toISOString()
  })

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      }
    })
  )

  useEffect(() => {
    setMounted(true)
    // 아카이브 노트 렌더링 체감 속도를 0초로 만들기 위한 백그라운드 선탑재(Prefetching) 실행
    useArchiveStore.getState().prefetchArchive()
  }, [])

  // 인접 월(이전/다음 달) 프리패치 로직 (전략 4)
  useEffect(() => {
    if (!mounted || viewMode !== 'monthly') return

    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    
    const prefetchMonth = async (monthDate: Date) => {
      const start = startOfWeek(monthDate, { weekStartsOn })
      const end = endOfWeek(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), { weekStartsOn })
      
      const startStr = start.toISOString()
      const endStr = end.toISOString()

      await queryClient.prefetchQuery({
        queryKey: ['activities', startStr, endStr],
        queryFn: async () => {
          const rawActivities = await getActivities(startStr, endStr)
          return expandActivities(rawActivities, startStr, endStr)
        }
      })
    }
    
    prefetchMonth(prevMonth).catch(console.error)
    prefetchMonth(nextMonth).catch(console.error)
  }, [currentDate, weekStartsOn, mounted, queryClient, viewMode])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Apple Style Glass effect */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-full shrink-0 relative shadow-sm">
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/icon.png" alt="Calentask Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
            <span className="text-xl font-extrabold tracking-tight text-foreground">Calentask</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 -mr-2 rounded-full text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-4 py-6 flex flex-col space-y-3">
          {/* 다가오는 기념일 D-Day 위젯 (최상단) */}
          <UpcomingAnniversaryWidget />

          {/* DASHBOARD 섹션 */}
          <div className="mb-6">
            <div className="px-4 mb-2 text-[11px] font-bold tracking-widest text-muted-foreground">DASHBOARD</div>
            <div className="flex flex-col space-y-1">
              {/* 홈 버튼 */}
              <button 
                onClick={() => setViewMode('home')}
                className={`group relative w-full text-left px-3.5 py-2.5 h-[42px] rounded-xl text-[14px] transition-all duration-300 ease-out flex items-center gap-3 ${
                  isHome 
                  ? 'bg-violet-50/70 text-violet-700 font-bold' 
                  : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {isHome && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-violet-500 rounded-r-full" />
                )}
                <Home className={`w-4 h-4 transition-transform ${isHome ? 'text-violet-600' : 'text-muted-foreground group-hover:scale-105 group-hover:text-violet-500'}`} />
                <span>홈</span>
              </button>
            </div>
          </div>

          {/* WORKSPACE 섹션 */}
          <div className="mb-6">
            <div className="px-4 mb-2 text-[11px] font-bold tracking-widest text-muted-foreground">WORKSPACE</div>
            <div className="flex flex-col space-y-1">
              {/* 캘린더 관리 */}
              <button 
                onClick={() => {
                  if (!isCalendarMenuOpen) setViewMode('monthly')
                }}
                className={`group relative w-full text-left px-3.5 py-2.5 h-[42px] rounded-xl text-[14px] transition-all duration-300 ease-out flex items-center justify-between ${
                  isCalendarMenuOpen 
                  ? 'bg-blue-50/70 text-blue-700 font-bold' 
                  : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {isCalendarMenuOpen && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full" />
                )}
                <div className="flex items-center gap-3">
                  <CalendarIcon className={`w-4 h-4 transition-transform ${isCalendarMenuOpen ? 'text-blue-600' : 'text-muted-foreground group-hover:scale-105 group-hover:text-blue-500'}`} />
                  <span>캘린더 관리</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCalendarMenuOpen ? 'rotate-180 text-blue-600' : 'text-muted-foreground'}`} />
              </button>

              <AnimatePresence initial={false}>
                {isCalendarMenuOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col space-y-1 mt-1 pb-1 ml-5 pl-2 border-l-2 border-border">
                      <button 
                        onClick={() => setViewMode('monthly')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 ${
                          isMyCalendarActive
                          ? 'bg-blue-50/70 text-blue-700 shadow-sm' 
                          : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <CalendarIcon className={`w-3.5 h-3.5 ${isMyCalendarActive ? 'text-blue-600' : 'text-muted-foreground/50'}`} />
                        나의 캘린더
                      </button>

                      <button 
                        onClick={() => setViewMode('archive_agenda')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 ${
                          viewMode === 'archive_agenda' 
                          ? 'bg-purple-50/70 text-purple-700 shadow-sm' 
                          : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${viewMode === 'archive_agenda' ? 'text-purple-600' : 'text-muted-foreground/50'}`} />
                        아젠다
                      </button>

                      <button 
                        onClick={() => setViewMode('anniversary')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 ${
                          viewMode === 'anniversary' 
                          ? 'bg-rose-50/70 text-rose-700 shadow-sm' 
                          : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Gift className={`w-3.5 h-3.5 ${viewMode === 'anniversary' ? 'text-rose-600' : 'text-muted-foreground/50'}`} />
                        기념일 설정
                      </button>

                      <button 
                        onClick={() => setViewMode('google_sync')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 ${
                          viewMode === 'google_sync' 
                          ? 'bg-emerald-50/70 text-emerald-700 shadow-sm' 
                          : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Globe2 className={`w-3.5 h-3.5 ${viewMode === 'google_sync' ? 'text-emerald-600' : 'text-muted-foreground/50'}`} />
                        구글 계정/캘린더 연동
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 아카이브 */}
              <button 
                onClick={() => {
                  if (!isArchiveMenuOpen) setViewMode('archive_notes')
                }}
                className={`group relative w-full text-left px-3.5 py-2.5 h-[42px] rounded-xl text-[14px] transition-all duration-300 ease-out flex items-center justify-between ${
                  isArchiveMenuOpen 
                  ? 'bg-accent text-foreground font-bold' 
                  : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {isArchiveMenuOpen && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-muted0 rounded-r-full" />
                )}
                <div className="flex items-center gap-3">
                  <Archive className={`w-4 h-4 transition-transform ${isArchiveMenuOpen ? 'text-foreground' : 'text-muted-foreground group-hover:scale-105 group-hover:text-foreground'}`} />
                  <span>아카이브</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isArchiveMenuOpen ? 'rotate-180 text-foreground' : 'text-muted-foreground'}`} />
              </button>

              <AnimatePresence initial={false}>
                {isArchiveMenuOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col space-y-1 mt-1 pb-1 ml-5 pl-2 border-l-2 border-border">
                      <button 
                        onClick={() => setViewMode('archive_notes')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 ${
                          viewMode === 'archive_notes' ? 'bg-accent text-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <NotebookPen className={`w-3.5 h-3.5 ${viewMode === 'archive_notes' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                        노트
                      </button>

                      <button 
                        onClick={() => setViewMode('link_lounge')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 ${
                          viewMode === 'link_lounge' ? 'bg-indigo-50/70 text-indigo-700 shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${viewMode === 'link_lounge' ? 'text-indigo-600' : 'text-muted-foreground/50'}`} />
                        링크 라운지
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* DATA & SYSTEM 섹션 */}
          <div className="mb-2">
            <div className="px-4 mb-2 text-[11px] font-bold tracking-widest text-muted-foreground">DATA & SYSTEM</div>
            <div className="flex flex-col space-y-1">
              <button 
                onClick={() => {
                  if (!isDataCenterMenuOpen) setViewMode('insights')
                }}
                className={`group relative w-full text-left px-3.5 py-2.5 h-[42px] rounded-xl text-[14px] transition-all duration-300 ease-out flex items-center justify-between ${
                  isDataCenterMenuOpen 
                  ? 'bg-teal-50/70 text-teal-800 font-bold' 
                  : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {isDataCenterMenuOpen && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-teal-500 rounded-r-full" />
                )}
                <div className="flex items-center gap-3">
                  <Database className={`w-4 h-4 transition-transform ${isDataCenterMenuOpen ? 'text-teal-600' : 'text-muted-foreground group-hover:scale-105 group-hover:text-teal-500'}`} />
                  <span>데이터 센터</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDataCenterMenuOpen ? 'rotate-180 text-teal-600' : 'text-muted-foreground'}`} />
              </button>

              <AnimatePresence initial={false}>
                {isDataCenterMenuOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col space-y-1 mt-1 pb-1 ml-5 pl-2 border-l-2 border-border">
                      <button 
                        onClick={() => setViewMode('insights')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 group ${
                          viewMode === 'insights' ? 'bg-purple-50/70 text-purple-700 shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${viewMode === 'insights' ? 'text-purple-600' : 'text-muted-foreground/50'}`} />
                        인사이트 대시보드
                      </button>

                      <button 
                        onClick={() => setViewMode('template_center')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 group ${
                          viewMode === 'template_center' ? 'bg-pink-50/70 text-pink-700 shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Puzzle className={`w-3.5 h-3.5 ${viewMode === 'template_center' ? 'text-pink-600' : 'text-muted-foreground/50'}`} />
                        템플릿 센터
                      </button>

                      <button 
                        onClick={() => setViewMode('nice_import')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 group ${
                          viewMode === 'nice_import' ? 'bg-indigo-50/70 text-indigo-700 shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <DownloadCloud className={`w-3.5 h-3.5 ${viewMode === 'nice_import' ? 'text-indigo-600' : 'text-muted-foreground/50'}`} />
                        나이스 복무 불러오기
                      </button>

                      <button 
                        onClick={() => setViewMode('tags')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 group ${
                          viewMode === 'tags' ? 'bg-teal-50/70 text-teal-700 shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Tags className={`w-3.5 h-3.5 ${viewMode === 'tags' ? 'text-teal-600' : 'text-muted-foreground/50'}`} />
                        카테고리 허브
                      </button>

                      <button 
                        onClick={() => setViewMode('trash')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 flex items-center gap-2.5 group ${
                          viewMode === 'trash' ? 'bg-rose-50/70 text-rose-700 shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${viewMode === 'trash' ? 'text-rose-600' : 'text-muted-foreground/50'}`} />
                        휴지통
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        <div className="px-4 py-6 flex flex-col space-y-1 shrink-0">
          <div className="mt-auto px-2 flex flex-col space-y-3">
            <ClearAllDataDialog />
            <Button
              variant="outline"
              onClick={() => {
                setSettingsTab('profile')
                setIsSettingsOpen(true)
              }}
              className="w-full text-sm font-medium border-border flex items-center justify-center text-foreground hover:bg-accent hover:text-foreground hover:border-slate-300"
            >
              <Settings className="w-4 h-4 mr-2" />
              환경설정
            </Button>
          </div>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative pb-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] md:pb-0">
        {/* Unified Calendar Header */}
        <CalendarHeader 
          onOpenSettings={() => {
            setSettingsTab('profile')
            setIsSettingsOpen(true)
          }}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Dynamic Views Area - Add padding for floating effect */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 md:px-8 pb-8">
            {!mounted ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* 모바일 카테고리 필터 바 — 캘린더 뷰에서만 표시, 캘린더와 함께 스크롤 */}
                {isMyCalendarActive && <MobileCategoryBar />}

                {viewMode === 'monthly' && <MonthlyView currentDate={currentDate} events={events} />}
                {viewMode === 'weekly' && <WeeklyView currentDate={currentDate} events={events} />}
                {viewMode === 'list' && <ListView currentDate={currentDate} events={events} />}
                {viewMode === 'semester' && <SemesterView currentDate={currentDate} events={events} />}
                {viewMode === 'nice_import' && <NiceImportView />}
                {viewMode === 'anniversary' && <AnniversarySettingsView />}
                {viewMode === 'google_sync' && <GoogleSyncTab />}
                {viewMode === 'insights' && (
                  <div className="min-h-full bg-background rounded-xl md:rounded-3xl p-2 md:p-6 overflow-x-hidden">
                    <InsightsClient />
                  </div>
                )}
                {viewMode === 'template_center' && (
                  <div className="min-h-full bg-background rounded-xl md:rounded-3xl p-2 md:p-6 overflow-x-hidden border border-border shadow-sm">
                    <TemplateCenterTab />
                  </div>
                )}
                {viewMode === 'archive_notes' && (
                  <div className="h-full bg-background rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border">
                    <ArchiveNotesView />
                  </div>
                )}
                {viewMode === 'link_lounge' && (
                  <div className="h-full bg-background rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border">
                    <LinkLoungeView />
                  </div>
                )}
                {viewMode === 'archive_agenda' && (
                  <div className="h-full bg-background rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border">
                    <ArchiveAgendaView />
                  </div>
                )}
                {viewMode === 'tags' && (
                  <div className="h-full rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border bg-background">
                    <TagsView />
                  </div>
                )}
                {viewMode === 'trash' && (
                  <div className="h-full rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border bg-background">
                    <TrashView />
                  </div>
                )}
                {viewMode === 'home' && (
                  <div className="min-h-full bg-background md:bg-transparent rounded-xl md:rounded-3xl overflow-hidden">
                    <HomeDashboard />
                  </div>
                )}
              </>
            )}
          </div>
          <DragOverlay>
            {activeEvent ? (
              <div className="bg-card rounded-md shadow-lg p-2 text-xs font-semibold border border-indigo-200 opacity-90 scale-105">
                {activeEvent.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Floating Action Button - Apple Style BIG Circle (Only in Calendar views) */}
      {isMyCalendarActive && (
        <AddEventDialog>
          <button className="absolute bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 md:w-16 md:h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-apple-float hover:scale-105 transition-transform flex items-center justify-center z-50">
            <Plus className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        </AddEventDialog>
      )}

      <BottomNavigation 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
        onOpenSettings={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }} 
        onOpenTags={() => setViewMode('tags')} 
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        open={isMobileSidebarOpen}
        onOpenChange={setIsMobileSidebarOpen}
        onOpenSettings={() => { setSettingsTab('profile'); setIsSettingsOpen(true); }}
      />

      {/* Settings Modal */}
      <SettingsModal 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        initialTab={settingsTab} 
      />

      <DaySummarySheet events={events} />
      <EventDetailPopover />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog />
      
      {/* Edit Category Dialog */}
      <EditCategoryDialog />
      
      {/* Confetti Animation wrapper */}
      <AnniversaryConfetti />

      {/* Global Add Event Dialog - always mounted so it can be opened from any view (e.g. archive agenda "캘린더에 등록") */}
      <AddEventDialog />
      
      {/* Global Add Agenda Task Dialog */}
      <AddAgendaTaskDialog />

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  )
}
