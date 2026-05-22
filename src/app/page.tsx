/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { Button } from '@/components/ui/button'
import { Plus, Tags, Database } from 'lucide-react'

import { startOfWeek, endOfWeek } from 'date-fns'
import { useActivities } from '@/hooks/useCalendarQueries'
import { AddEventDialog } from '@/components/calendar/AddEventDialog'
import { MonthlyView } from '@/components/calendar/MonthlyView'
import { WeeklyView } from '@/components/calendar/WeeklyView'
import { ListView } from '@/components/calendar/ListView'
import { SemesterView } from '@/components/calendar/SemesterView'
import { DaySummarySheet } from '@/components/calendar/DaySummarySheet'
import { EventDetailPopover } from '@/components/calendar/EventDetailPopover'
import { CsvUploader } from '@/components/calendar/CsvUploader'
import { DeleteConfirmDialog } from '@/components/calendar/DeleteConfirmDialog'
import { EditCategoryDialog } from '@/components/calendar/EditCategoryDialog'
import { SettingsModal } from '@/components/profile/SettingsModal'
import { TagsModal } from '@/components/profile/TagsModal'
import { DataHubModal } from '@/components/profile/DataHubModal'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'display'>('profile')
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false)
  const [isDataHubModalOpen, setIsDataHubModalOpen] = useState(false)
  const { 
    currentDate, viewMode,
    semesterYear, semesterTerm, activeCategories 
  } = useCalendarStore()

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
  let events = activitiesData || []

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
        <div className="p-6 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              C
            </span>
            <span>Calentask</span>
          </h1>
        </div>
        
        <div className="px-4 py-4 flex flex-col space-y-1">
          <button className="text-left px-4 py-3 rounded-2xl text-base font-semibold transition-colors bg-blue-50 text-blue-600">
            나의 캘린더
          </button>
        </div>

        <div className="px-4 py-6 flex flex-col space-y-1 flex-1">
          {/* Keep uploader and trash at the bottom or below */}
          <div className="mt-auto px-2 flex flex-col space-y-3">
            <CsvUploader />
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
    </div>
  )
}
