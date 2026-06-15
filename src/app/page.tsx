/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useArchiveStore } from '@/store/useArchiveStore'
import { useAgendaStore } from '@/store/useAgendaStore'
import { Button } from '@/components/ui/button'
import { Plus, Tags, Database, LogOut, Calendar as CalendarIcon, DownloadCloud, Gift, Sparkles, ChevronDown, Archive, NotebookPen, Bookmark, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { startOfWeek, endOfWeek } from 'date-fns'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { useEventDragDrop } from '@/hooks/useEventDragDrop'
import { useActivities } from '@/hooks/useCalendarQueries'
import type { Activity } from '@/app/actions/calendar'
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
import { UpcomingAnniversaryWidget } from '@/components/anniversary/UpcomingAnniversaryWidget'
import { useAnniversaryOverlay } from '@/hooks/useAnniversaryOverlay'
import { AnniversarySettingsView } from '@/components/anniversary/AnniversarySettingsView'
import InsightsClient from '@/app/insights/InsightsClient'
import { ArchiveNotesView } from '@/components/archive/ArchiveNotesView'
import { ArchiveAgendaView } from '@/components/archive/ArchiveAgendaView'
import { HomeDashboard } from '@/components/home/HomeDashboard'
import { BottomNavigation } from '@/components/ui/BottomNavigation'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { MobileCategoryBar } from '@/components/calendar/MobileCategoryBar'
import { PwaInstallPrompt } from '@/components/ui/PwaInstallPrompt'

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'display'>('profile')
  const queryClient = useQueryClient()
  const router = useRouter()
  
  const { 
    currentDate, viewMode, setViewMode,
    semesterYear, semesterTerm, activeCategories, resetStore 
  } = useCalendarStore()

  const isHome = viewMode === 'home'
  const isCalendarMenuOpen = ['monthly', 'weekly', 'list', 'semester', 'archive_agenda', 'anniversary'].includes(viewMode)
  const isMyCalendarActive = ['monthly', 'weekly', 'list', 'semester'].includes(viewMode)
  const isArchiveMenuOpen = ['archive_notes', 'link_lounge'].includes(viewMode)
  const isDataCenterMenuOpen = ['nice_import', 'tags', 'trash'].includes(viewMode)

  const handleLogout = async () => {
    resetStore()
    queryClient.clear()
    await logout()
  }

  // 현재 달 기준 날짜 계산 (전체 일정 패치를 위해)
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = startOfWeek(monthStart)
  
  // 학기 뷰일 경우 해당 학기 분량의 데이터를 패치 (1학기: 3.1~8.31, 2학기: 9.1~익년 2.28)
  const semesterStartDate = new Date(semesterYear, semesterTerm === 1 ? 2 : 8, 1) // 3월 또는 9월
  const semesterEndDate = new Date(semesterTerm === 1 ? semesterYear : semesterYear + 1, semesterTerm === 1 ? 7 : 1, semesterTerm === 1 ? 31 : 28)
  
  const queryStartDate = viewMode === 'semester' ? startOfWeek(semesterStartDate) : startDate
  const queryEndDate = viewMode === 'semester' ? endOfWeek(semesterEndDate) : endOfWeek(monthEnd)
  
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

  if (!mounted) {
    return <div className="flex h-screen w-full items-center justify-center bg-[#f7f9fb]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f2f2f7] text-slate-900 font-sans">
      {/* Sidebar - Clean, no borders, soft shadow */}
      <aside className="w-64 flex-shrink-0 bg-white shadow-apple-soft flex flex-col hidden md:flex z-10">
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/icon.png" alt="Calentask Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
            <span className="text-xl font-extrabold tracking-tight text-slate-900">Calentask</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 -mr-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-4 py-6 flex flex-col space-y-3">
          {/* 다가오는 기념일 D-Day 위젯 (최상단) */}
          <UpcomingAnniversaryWidget />

          <div className="pb-3 mb-2 relative">
            <div className="flex flex-col space-y-1.5">
            {/* 홈(대시보드) 버튼 */}
            <button 
              onClick={() => setViewMode('home')}
              className={`group relative w-full text-left px-4 py-3.5 rounded-2xl text-[15px] transition-all duration-300 ease-out flex items-center gap-3 ${
                isHome 
                ? 'bg-gradient-to-r from-violet-50/80 to-white text-violet-700 font-bold shadow-[0_2px_10px_-3px_rgba(139,92,246,0.2)] border border-violet-100 translate-y-[-1px]' 
                : 'bg-transparent text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-900 border border-transparent'
              }`}
            >
              {isHome && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-500 rounded-r-full shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
              )}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 transition-colors ${isHome ? 'text-violet-600' : 'text-slate-400 group-hover:text-violet-500'}`}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>홈</span>
            </button>

            <button 
              onClick={() => {
                if (!isCalendarMenuOpen) setViewMode('monthly')
              }}
              className={`group relative w-full text-left px-4 py-3.5 rounded-2xl text-[15px] transition-all duration-300 ease-out flex items-center justify-between ${
                isCalendarMenuOpen 
                ? 'bg-gradient-to-r from-blue-50/80 to-white text-blue-700 font-bold shadow-[0_2px_10px_-3px_rgba(59,130,246,0.2)] border border-blue-100 translate-y-[-1px]' 
                : 'bg-transparent text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-900 border border-transparent'
              }`}
            >
              {isCalendarMenuOpen && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}
              <div className="flex items-center gap-3">
                <CalendarIcon className={`w-5 h-5 transition-colors ${isCalendarMenuOpen ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
                <span>캘린더 관리</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCalendarMenuOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
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
                  <div className="flex flex-col space-y-1 mt-1.5 pb-1">
                    <button 
                      onClick={() => setViewMode('monthly')}
                      className={`w-[calc(100%-1.25rem)] ml-5 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2.5 ${
                        isMyCalendarActive
                        ? 'bg-blue-50/80 text-blue-700 font-semibold shadow-sm border border-blue-100/50' 
                        : 'bg-transparent text-slate-400 hover:bg-white hover:shadow-sm hover:text-slate-700 border border-transparent'
                      }`}
                    >
                      <CalendarIcon className={`w-4 h-4 ${isMyCalendarActive ? 'text-blue-500' : 'text-slate-300'}`} />
                      나의 캘린더
                    </button>

                    <button 
                      onClick={() => setViewMode('archive_agenda')}
                      className={`w-[calc(100%-1.25rem)] ml-5 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2.5 ${
                        viewMode === 'archive_agenda' 
                        ? 'bg-purple-50/80 text-purple-700 font-semibold shadow-sm border border-purple-100/50' 
                        : 'bg-transparent text-slate-400 hover:bg-white hover:shadow-sm hover:text-slate-700 border border-transparent'
                      }`}
                    >
                      <Sparkles className={`w-4 h-4 ${viewMode === 'archive_agenda' ? 'text-purple-500' : 'text-slate-300'}`} />
                      아젠다
                    </button>

                    <button 
                      onClick={() => setViewMode('anniversary')}
                      className={`w-[calc(100%-1.25rem)] ml-5 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2.5 ${
                        viewMode === 'anniversary' 
                        ? 'bg-pink-50/80 text-pink-700 font-semibold shadow-sm border border-pink-100/50' 
                        : 'bg-transparent text-slate-400 hover:bg-white hover:shadow-sm hover:text-slate-700 border border-transparent'
                      }`}
                    >
                      <Gift className={`w-4 h-4 ${viewMode === 'anniversary' ? 'text-pink-500' : 'text-slate-300'}`} />
                      기념일 설정
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>

            <button 
              onClick={() => {
                if (!isArchiveMenuOpen) setViewMode('archive_notes')
              }}
              className={`group relative w-full text-left px-4 py-3.5 rounded-2xl text-[15px] transition-all duration-300 overflow-hidden flex items-center justify-between ${
                isArchiveMenuOpen 
                ? 'bg-gradient-to-r from-slate-100 to-white text-slate-800 font-bold shadow-sm border border-slate-200' 
                : 'font-medium text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-800 border border-transparent'
              } mt-2`}
            >
              {isArchiveMenuOpen && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-slate-500 rounded-r-full" />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <Archive className={`w-5 h-5 transition-colors ${isArchiveMenuOpen ? 'text-slate-600' : 'text-slate-300 group-hover:text-slate-600'}`} />
                <span>아카이브</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isArchiveMenuOpen ? 'rotate-180 text-slate-600' : 'text-slate-400'}`} />
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
                  <div className="flex flex-col space-y-1 mt-1 pb-3 mb-2 border-b border-slate-100/50">
                    <button 
                      onClick={() => setViewMode('archive_notes')}
                      className={`w-[calc(100%-1.25rem)] ml-5 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2.5 group ${
                        viewMode === 'archive_notes' ? 'bg-slate-100 text-slate-800 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      <NotebookPen className={`w-4 h-4 ${viewMode === 'archive_notes' ? 'text-slate-600' : 'text-slate-300'}`} />
                      노트
                    </button>

                    <button 
                      onClick={() => setViewMode('link_lounge')}
                      className={`w-[calc(100%-1.25rem)] ml-5 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2.5 group ${
                        viewMode === 'link_lounge' ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm ring-1 ring-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${viewMode === 'link_lounge' ? 'text-indigo-600' : 'text-slate-300'}`} />
                      링크 라운지
                    </button>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => setViewMode('insights')}
              className={`group relative w-full text-left px-4 py-3.5 rounded-2xl text-[15px] transition-all duration-300 overflow-hidden flex items-center justify-between ${
                viewMode === 'insights' 
                ? 'font-bold text-indigo-800 shadow-[0_4px_20px_-5px_rgba(99,102,241,0.3)] border border-indigo-200/50 scale-[1.02] bg-white' 
                : 'font-medium text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-800 border border-transparent'
              }`}
            >
              <div className={`absolute inset-0 opacity-20 transition-opacity duration-300 ${
                viewMode === 'insights' 
                ? 'bg-gradient-to-br from-indigo-400 via-purple-300 to-pink-300' 
                : 'bg-gradient-to-br from-slate-100 to-slate-50 group-hover:opacity-40'
              }`} />
              
              <div className="relative z-10 flex items-center gap-3">
                <Sparkles className={`w-5 h-5 transition-transform duration-500 ${viewMode === 'insights' ? 'text-purple-500 rotate-12 scale-110' : 'text-slate-300 group-hover:text-purple-400'}`} />
                <span>인사이트 대시보드</span>
              </div>
            </button>
            <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-50" />
          </div>

          <div className="pb-3 mb-2 relative">
            <button 
              onClick={() => {
                if (!isDataCenterMenuOpen) setViewMode('tags')
              }}
              className={`group relative w-full text-left px-4 py-3.5 rounded-2xl text-[15px] transition-all duration-300 overflow-hidden flex items-center justify-between ${
                isDataCenterMenuOpen 
                ? 'bg-gradient-to-r from-teal-50 to-white text-teal-800 font-bold shadow-sm border border-teal-200/50' 
                : 'font-medium text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-800 border border-transparent'
              } mt-2`}
            >
              {isDataCenterMenuOpen && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal-500 rounded-r-full" />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <Database className={`w-5 h-5 transition-colors ${isDataCenterMenuOpen ? 'text-teal-600' : 'text-slate-300 group-hover:text-teal-500'}`} />
                <span>데이터 센터</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDataCenterMenuOpen ? 'rotate-180 text-teal-600' : 'text-slate-400'}`} />
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
                  <div className="flex flex-col space-y-1 mt-1 pb-3 mb-2 border-b border-slate-100/50">
                    <button 
                      onClick={() => setViewMode('nice_import')}
                      className={`w-[calc(100%-1.25rem)] ml-5 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2.5 group ${
                        viewMode === 'nice_import' ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm ring-1 ring-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      <DownloadCloud className={`w-4 h-4 ${viewMode === 'nice_import' ? 'text-indigo-600' : 'text-slate-300'}`} />
                      나이스 복무 불러오기
                    </button>

                    <button 
                      onClick={() => setViewMode('tags')}
                      className={`w-[calc(100%-1.25rem)] ml-5 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2.5 group ${
                        viewMode === 'tags' ? 'bg-teal-50 text-teal-700 font-bold shadow-sm ring-1 ring-teal-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      <Tags className={`w-4 h-4 ${viewMode === 'tags' ? 'text-teal-600' : 'text-slate-300'}`} />
                      태그 관리소
                    </button>

                    <button 
                      onClick={() => setViewMode('trash')}
                      className={`w-[calc(100%-1.25rem)] ml-5 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2.5 group ${
                        viewMode === 'trash' ? 'bg-rose-50 text-rose-700 font-bold shadow-sm ring-1 ring-rose-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      <Trash2 className={`w-4 h-4 ${viewMode === 'trash' ? 'text-rose-600' : 'text-slate-300'}`} />
                      휴지통
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-50" />
          </div>

        </div>

        <div className="px-4 py-6 flex flex-col space-y-1 shrink-0">
          <div className="mt-auto px-2 flex flex-col space-y-3">
            <PwaInstallPrompt isDesktop />
            <ClearAllDataDialog />
          </div>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative pb-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] md:pb-0">
        {/* Unified Calendar Header */}
        <CalendarHeader onOpenSettings={() => {
          setSettingsTab('profile')
          setIsSettingsOpen(true)
        }} />

        {/* Dynamic Views Area - Add padding for floating effect */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 md:px-8 pb-8">
            {/* 모바일 카테고리 필터 바 — 캘린더 뷰에서만 표시, 캘린더와 함께 스크롤 */}
            {isMyCalendarActive && <MobileCategoryBar />}

            {viewMode === 'monthly' && <MonthlyView currentDate={currentDate} events={events} />}
            {viewMode === 'weekly' && <WeeklyView currentDate={currentDate} events={events} />}
            {viewMode === 'list' && <ListView currentDate={currentDate} events={events} />}
            {viewMode === 'semester' && <SemesterView currentDate={currentDate} events={events} />}
            {viewMode === 'nice_import' && <NiceImportView />}
            {viewMode === 'anniversary' && <AnniversarySettingsView />}
            {viewMode === 'insights' && (
              <div className="min-h-full bg-[#FAFAFA] rounded-xl md:rounded-3xl p-2 md:p-6 overflow-x-hidden">
                <InsightsClient />
              </div>
            )}
            {viewMode === 'archive_notes' && (
              <div className="h-full bg-[#FAFAFA] rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                <ArchiveNotesView />
              </div>
            )}
            {viewMode === 'link_lounge' && (
              <div className="h-full bg-[#FAFAFA] rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                <LinkLoungeView />
              </div>
            )}
            {viewMode === 'archive_agenda' && (
              <div className="h-full bg-[#FAFAFA] rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                <ArchiveAgendaView />
              </div>
            )}
            {viewMode === 'tags' && (
              <div className="h-full rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-[#FAFAFA]">
                <TagsView />
              </div>
            )}
            {viewMode === 'trash' && (
              <div className="h-full rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-[#FAFAFA]">
                <TrashView />
              </div>
            )}
            {viewMode === 'home' && (
              <div className="min-h-full bg-gradient-to-b from-[#f7f9fb] to-[#f2f2f7] rounded-xl md:rounded-3xl overflow-hidden">
                <HomeDashboard />
              </div>
            )}
          </div>
          <DragOverlay>
            {activeEvent ? (
              <div className="bg-white rounded-md shadow-lg p-2 text-xs font-semibold border border-indigo-200 opacity-90 scale-105">
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

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  )
}
