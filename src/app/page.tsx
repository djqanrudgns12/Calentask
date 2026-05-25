/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { Button } from '@/components/ui/button'
import { Plus, Tags, Database, LogOut } from 'lucide-react'

import { startOfWeek, endOfWeek } from 'date-fns'
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
        
        <div className="px-4 py-4 flex flex-col space-y-1">
          {/* 다가오는 기념일 D-Day 위젯 (최상단) */}
          <UpcomingAnniversaryWidget />

          <button 
            onClick={() => setViewMode('monthly')}
            className={`text-left px-4 py-3 rounded-2xl text-base font-semibold transition-colors ${viewMode !== 'nice_import' && viewMode !== 'insights' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            나의 캘린더
          </button>
          <button 
            onClick={() => setViewMode('nice_import')}
            className={`text-left px-4 ml-4 py-2 mt-1 rounded-xl text-sm transition-colors flex items-center ${viewMode === 'nice_import' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <span className="mr-2 text-slate-400">↳</span> 나이스 복무 불러오기
          </button>
          <button 
            onClick={() => setViewMode('anniversary')}
            className={`text-left px-4 ml-4 py-2 mt-1 rounded-xl text-sm transition-colors flex items-center ${viewMode === 'anniversary' ? 'bg-pink-50 text-pink-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <span className="mr-2 text-slate-400">↳</span> 기념일 설정
          </button>

          <button 
            onClick={() => setViewMode('insights')}
            className={`text-left px-4 py-3 mt-6 rounded-2xl text-base font-bold transition-colors border flex items-center justify-between shadow-sm ${viewMode === 'insights' ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border-indigo-200 shadow-md' : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-100 hover:shadow-md'}`}
          >
            <span>✨ 인사이트 대시보드</span>
          </button>
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
