/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { Button } from '@/components/ui/button'
import { Plus, Tags, Database, LogOut, Calendar as CalendarIcon, DownloadCloud, Gift, Sparkles, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { startOfWeek, endOfWeek } from 'date-fns'
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
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
import { DaySummarySheet } from '@/components/calendar/DaySummarySheet'
import { EventDetailPopover } from '@/components/calendar/EventDetailPopover'
import { NiceImportView } from '@/components/calendar/NiceImportView'
import { DeleteConfirmDialog } from '@/components/calendar/DeleteConfirmDialog'
import { EditCategoryDialog } from '@/components/calendar/EditCategoryDialog'
import { SettingsModal } from '@/components/profile/SettingsModal'
import { TagsModal } from '@/components/profile/TagsModal'
import { DataHubModal } from '@/components/profile/DataHubModal'
import { ClearAllDataDialog } from '@/components/profile/ClearAllDataDialog'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { AnniversaryConfetti } from '@/components/anniversary/AnniversaryConfetti'
import { UpcomingAgenda } from '@/components/calendar/UpcomingAgenda'
import { UpcomingAnniversaryWidget } from '@/components/anniversary/UpcomingAnniversaryWidget'
import { useAnniversaryOverlay } from '@/hooks/useAnniversaryOverlay'
import { AnniversarySettingsView } from '@/components/anniversary/AnniversarySettingsView'
import InsightsClient from '@/app/insights/InsightsClient'

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'display'>('profile')
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false)
  const [isDataHubModalOpen, setIsDataHubModalOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const { 
    currentDate, viewMode, setViewMode,
    semesterYear, semesterTerm, activeCategories, resetStore 
  } = useCalendarStore()

  const isCalendarMenuOpen = ['monthly', 'weekly', 'list', 'semester', 'nice_import', 'anniversary'].includes(viewMode)
  const isMyCalendarActive = ['monthly', 'weekly', 'list', 'semester'].includes(viewMode)

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
  
  // 가상 기념일 배열과 기존 일정을 스프레드 병합 (클린 아키텍처)
  let events = [
    ...(activitiesData || []),
    ...((anniversaryEvents || []) as unknown as Activity[])
  ]

  // 글로벌 카테고리 필터 적용
  if (activeCategories.length > 0) {
    events = events.filter(event => 
      event.categories?.some(cat => activeCategories.includes(cat.id))
    )
  }

  const { activeEvent, handleDragStart, handleDragEnd, handleDragCancel } = useEventDragDrop({
    viewMode: viewMode as any,
    events,
    startDateStr: queryStartDate.toISOString(),
    endDateStr: queryEndDate.toISOString()
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    })
  )

  useEffect(() => {
    setMounted(true)
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

          <div className="flex flex-col space-y-1.5 mt-2">
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

                    <button 
                      onClick={() => setViewMode('nice_import')}
                      className={`w-[calc(100%-1.25rem)] ml-5 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-2.5 ${
                        viewMode === 'nice_import' 
                        ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-sm border border-indigo-100/50' 
                        : 'bg-transparent text-slate-400 hover:bg-white hover:shadow-sm hover:text-slate-700 border border-transparent'
                      }`}
                    >
                      <DownloadCloud className={`w-4 h-4 ${viewMode === 'nice_import' ? 'text-indigo-500' : 'text-slate-300'}`} />
                      나이스 복무 불러오기
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* 다가오는 일정 타임라인 */}
        <UpcomingAgenda events={events} />

        <div className="px-4 py-6 flex flex-col space-y-1 shrink-0">
          {/* Keep uploader and trash at the bottom or below */}
          <div className="mt-auto px-2 flex flex-col space-y-3">
            <Button
              variant="outline"
              className="w-full text-sm font-medium border-gray-300 flex items-center justify-center text-slate-700 hover:bg-slate-50"
              onClick={() => setIsTagsModalOpen(true)}
            >
              <Tags className="w-4 h-4 mr-2" />
              태그 관리소
            </Button>
            <Button
              variant="outline"
              className="w-full text-sm font-medium border-gray-300 flex items-center justify-center text-slate-700 hover:bg-slate-50"
              onClick={() => setIsDataHubModalOpen(true)}
            >
              <Database className="w-4 h-4 mr-2" />
              데이터 허브
            </Button>
            <ClearAllDataDialog />
          </div>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
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
          <div className="flex-1 overflow-auto px-8 pb-8">
            {viewMode === 'monthly' && <MonthlyView currentDate={currentDate} events={events} />}
            {viewMode === 'weekly' && <WeeklyView currentDate={currentDate} events={events} />}
            {viewMode === 'list' && <ListView currentDate={currentDate} events={events} />}
            {viewMode === 'semester' && <SemesterView currentDate={currentDate} events={events} />}
            {viewMode === 'nice_import' && <NiceImportView />}
            {viewMode === 'anniversary' && <AnniversarySettingsView />}
            {viewMode === 'insights' && (
              <div className="min-h-full bg-[#FAFAFA] rounded-3xl p-6">
                <InsightsClient />
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

      {/* Floating Action Button - Apple Style BIG Circle */}
      <AddEventDialog>
        <button className="absolute bottom-10 right-10 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-apple-float hover:scale-105 transition-transform flex items-center justify-center">
          <Plus className="w-8 h-8" />
        </button>
      </AddEventDialog>

      {/* Settings Modal */}
      <SettingsModal 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        initialTab={settingsTab} 
      />

      {/* Tags Modal */}
      <TagsModal
        open={isTagsModalOpen}
        onOpenChange={setIsTagsModalOpen}
      />

      {/* Data Hub Modal */}
      <DataHubModal
        open={isDataHubModalOpen}
        onOpenChange={setIsDataHubModalOpen}
      />

      <DaySummarySheet events={events} />
      <EventDetailPopover />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog />
      
      {/* Edit Category Dialog */}
      <EditCategoryDialog />
      
      {/* Confetti Animation wrapper */}
      <AnniversaryConfetti />
    </div>
  )
}
