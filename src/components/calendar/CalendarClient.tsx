'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useSwipeable } from 'react-swipeable'
import { useCalendarStore, type ViewMode } from '@/store/useCalendarStore'
import { useArchiveStore } from '@/store/useArchiveStore'
import { useAgendaStore } from '@/store/useAgendaStore'
import { Button } from '@/components/ui/button'
import { Plus, Tags, Database, LogOut, Calendar as CalendarIcon, DownloadCloud, Gift, Sparkles, ChevronDown, Archive, NotebookPen, Bookmark, Trash2, Settings, Home, Puzzle, Globe2, Utensils, GraduationCap } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

import { startOfWeek, endOfWeek } from 'date-fns'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { useEventDragDrop } from '@/hooks/useEventDragDrop'
import { useActivities } from '@/hooks/useCalendarQueries'
import { type Activity } from '@/app/actions/calendar'
import { getCalendarEventDetail } from '@/app/actions/calendarMonth'
import { logout } from '@/app/actions/auth'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { useAnniversaryOverlay } from '@/hooks/useAnniversaryOverlay'
import { useSyncJobSubscription } from '@/hooks/useSyncJob'
import { BottomNavigation } from '@/components/ui/BottomNavigation'
import { MobileCategoryBar } from '@/components/calendar/MobileCategoryBar'
import { MobileSidebar } from '@/components/ui/MobileSidebar'
import dynamic from 'next/dynamic'
import { useCalendarMonth } from '@/hooks/useCalendarMonth'
import { calendarSummaryToActivity, getAdjacentMonthKey, toCalendarMonthKey } from '@/lib/calendarMonth'
import type { CalendarEventSummary } from '@/types/calendarMonth'

const MonthlyView = dynamic(() => import('@/components/calendar/MonthlyView').then(module => module.MonthlyView), { ssr: false })
const WeeklyView = dynamic(() => import('@/components/calendar/WeeklyView').then(module => module.WeeklyView), { ssr: false })
const ListView = dynamic(() => import('@/components/calendar/ListView').then(module => module.ListView), { ssr: false })
const SemesterView = dynamic(() => import('@/components/calendar/SemesterView').then(module => module.SemesterView), { ssr: false })
const LinkLoungeView = dynamic(() => import('@/components/link-lounge/LinkLoungeView').then(module => module.LinkLoungeView), { ssr: false })
const TagsView = dynamic(() => import('@/components/data-center/TagsView').then(module => module.TagsView), { ssr: false })
const TrashView = dynamic(() => import('@/components/data-center/TrashView').then(module => module.TrashView), { ssr: false })
const AnniversarySettingsView = dynamic(() => import('@/components/anniversary/AnniversarySettingsView').then(module => module.AnniversarySettingsView), { ssr: false })
const GoogleSyncTab = dynamic(() => import('@/components/calendar/GoogleSyncTab').then(module => module.GoogleSyncTab), { ssr: false })
const InsightsClient = dynamic(() => import('@/app/insights/InsightsClient'), { ssr: false })
const ArchiveNotesView = dynamic(() => import('@/components/archive/ArchiveNotesView').then(module => module.ArchiveNotesView), { ssr: false })
const ArchiveAgendaView = dynamic(() => import('@/components/archive/ArchiveAgendaView').then(module => module.ArchiveAgendaView), { ssr: false })
const HomeDashboard = dynamic(() => import('@/components/home/HomeDashboard').then(module => module.HomeDashboard), { ssr: false })
const SchoolMealsClient = dynamic(() => import('@/components/school-meals/SchoolMealsClient').then(module => module.SchoolMealsClient), { ssr: false })
const SchoolScheduleClient = dynamic(() => import('@/components/school-schedule/SchoolScheduleClient').then(module => module.SchoolScheduleClient), { ssr: false })
const AcademicDataClient = dynamic(() => import('@/components/school-schedule/AcademicDataClient').then(module => module.AcademicDataClient), { ssr: false })
const AddEventDialog = dynamic(() => import('@/components/calendar/AddEventDialog').then(module => module.AddEventDialog), { ssr: false })
const DaySummarySheet = dynamic(() => import('@/components/calendar/DaySummarySheet').then(module => module.DaySummarySheet), { ssr: false })
const EventDetailPopover = dynamic(() => import('@/components/calendar/EventDetailPopover').then(module => module.EventDetailPopover), { ssr: false })
const DeleteConfirmDialog = dynamic(() => import('@/components/calendar/DeleteConfirmDialog').then(module => module.DeleteConfirmDialog), { ssr: false })
const EditCategoryDialog = dynamic(() => import('@/components/calendar/EditCategoryDialog').then(module => module.EditCategoryDialog), { ssr: false })
const SettingsModal = dynamic(() => import('@/components/profile/SettingsModal').then(module => module.SettingsModal), { ssr: false })
const ClearAllDataDialog = dynamic(() => import('@/components/profile/ClearAllDataDialog').then(module => module.ClearAllDataDialog), { ssr: false })
const AnniversaryConfetti = dynamic(() => import('@/components/anniversary/AnniversaryConfetti').then(module => module.AnniversaryConfetti), { ssr: false })
const AddAgendaTaskDialog = dynamic(() => import('@/components/archive/AddAgendaTaskDialog').then(module => module.AddAgendaTaskDialog), { ssr: false })
const UpcomingAnniversaryWidget = dynamic(() => import('@/components/anniversary/UpcomingAnniversaryWidget').then(module => module.UpcomingAnniversaryWidget), { ssr: false })
const SyncProgressModal = dynamic(() => import('@/components/calendar/SyncProgressModal').then(module => module.SyncProgressModal), { ssr: false })
const SyncStatusPill = dynamic(() => import('@/components/calendar/SyncProgressModal').then(module => module.SyncStatusPill), { ssr: false })
const CommandPalette = dynamic(() => import('@/components/ui/CommandPalette').then(module => module.CommandPalette), { ssr: false })
const TemplateCenterTab = dynamic(() => import('@/components/insights/TemplateCenterTab'), { ssr: false })
// xlsx·papaparse를 초기 번들에서 분리하기 위해 지연 로딩
const NiceImportView = dynamic(() => import('@/components/calendar/NiceImportView').then(m => m.NiceImportView), { ssr: false })

const CALENDAR_VIEWS = ['monthly', 'weekly', 'list', 'semester'] as const
type CalendarViewMode = (typeof CALENDAR_VIEWS)[number]
type MajorView = ViewMode | 'CALENDAR_GROUP'
const MAJOR_VIEWS: readonly MajorView[] = [
  'home', 'school_meals', 'CALENDAR_GROUP', 'school_schedule', 'academic_data',
  'archive_agenda', 'anniversary', 'google_sync', 'archive_notes', 'link_lounge',
  'insights', 'template_center', 'nice_import', 'tags', 'trash',
]

function isCalendarViewMode(mode: ViewMode): mode is CalendarViewMode {
  return (CALENDAR_VIEWS as readonly ViewMode[]).includes(mode)
}

export function CalendarClient() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'calendar' | 'display'>('profile')
  const queryClient = useQueryClient()
  const prefersReducedMotion = useReducedMotion()

  // 구글 내보내기 작업 구독. 앱 셸에서 한 번만 호출해 중복 구독을 피한다.
  // 멈춘(PAUSED/heartbeat 끊김) 작업을 자동으로 이어받는 것도 여기서 처리한다.
  useSyncJobSubscription()

  useEffect(() => {
    const preload = () => { void import('@/components/calendar/MonthlyView') }
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(preload, { timeout: 1800 })
      return () => window.cancelIdleCallback(idleId)
    }
    const timer = globalThis.setTimeout(preload, 900)
    return () => globalThis.clearTimeout(timer)
  }, [])

  // 필드별 셀렉터: 다이얼로그 등 일시 상태 변경 시 불필요한 전체 리렌더 방지
  const currentDate = useCalendarStore(s => s.currentDate)
  const viewMode = useCalendarStore(s => s.viewMode)
  const setViewMode = useCalendarStore(s => s.setViewMode)
  const semesterYear = useCalendarStore(s => s.semesterYear)
  const semesterTerm = useCalendarStore(s => s.semesterTerm)
  const activeCategories = useCalendarStore(s => s.activeCategories)
  const resetStore = useCalendarStore(s => s.resetStore)
  const weekStartsOn = useCalendarStore(s => s.weekStartsOn)
  const openEventDetail = useCalendarStore(s => s.openEventDetail)
  const openAddEvent = useCalendarStore(s => s.openAddEvent)

  // --- 스와이프 전역 모바일 뷰 전환 (Swipe Navigation) 상태 ---
  // 마지막으로 보던 캘린더 하위 뷰 기억
  const lastCalendarViewRef = useRef<ViewMode>('monthly');
  useEffect(() => {
    if (isCalendarViewMode(viewMode)) {
      lastCalendarViewRef.current = viewMode;
    }
  }, [viewMode]);

  // 현재 viewMode가 CALENDAR_VIEWS에 속하면 'CALENDAR_GROUP'으로 취급
  const currentMajorView: MajorView = isCalendarViewMode(viewMode) ? 'CALENDAR_GROUP' : viewMode

  const slideDirection = 'left'
  // 동일한 그룹 내에서의 이동(예: monthly -> weekly 사이드바 클릭 등)일 경우 애니메이션 방향 계산 보완
  const swipeHandlers = useSwipeable({
    onSwipedLeft: (e) => {
      // 스마트 스와이프 예외 로직: 가로 스크롤 영역이나 지정된 예외 요소에서의 스와이프 무시
      if ((e.event.target as HTMLElement).closest('.no-swipe, .overflow-x-auto, .overflow-x-scroll, .touch-pan-x, [data-no-swipe="true"]')) return;

      const currentIndex = MAJOR_VIEWS.indexOf(currentMajorView)
      if (currentIndex !== -1 && currentIndex < MAJOR_VIEWS.length - 1) {
        const nextView = MAJOR_VIEWS[currentIndex + 1];
        setViewMode(nextView === 'CALENDAR_GROUP' ? lastCalendarViewRef.current : nextView)
      }
    },
    onSwipedRight: (e) => {
      // 스마트 스와이프 예외 로직
      if ((e.event.target as HTMLElement).closest('.no-swipe, .overflow-x-auto, .overflow-x-scroll, .touch-pan-x, [data-no-swipe="true"]')) return;

      const currentIndex = MAJOR_VIEWS.indexOf(currentMajorView)
      if (currentIndex > 0) {
        const prevView = MAJOR_VIEWS[currentIndex - 1];
        setViewMode(prevView === 'CALENDAR_GROUP' ? lastCalendarViewRef.current : prevView)
      }
    },
    preventScrollOnSwipe: false, // 스크롤을 막지 않아 캘린더 세로 스크롤 허용
    trackMouse: false, // 데스크톱에서는 동작하지 않음
    delta: 50 // 터치 민감도 50px
  })


  const isHome = viewMode === 'home'
  const isSchoolMeals = viewMode === 'school_meals'
  const isCalendarMenuOpen = ['monthly', 'weekly', 'list', 'semester', 'archive_agenda', 'anniversary', 'google_sync', 'school_schedule', 'academic_data'].includes(viewMode)
  const isMyCalendarActive = ['monthly', 'weekly', 'list', 'semester'].includes(viewMode)
  const isArchiveMenuOpen = ['archive_notes', 'link_lounge'].includes(viewMode)
  const isDataCenterMenuOpen = ['insights', 'nice_import', 'tags', 'trash', 'template_center'].includes(viewMode)

  const handleLogout = async () => {
    resetStore()
    lastCalendarViewRef.current = 'monthly'
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

  const legacyCalendarEnabled = ['weekly', 'list', 'semester'].includes(viewMode)
  const monthKey = toCalendarMonthKey(currentDate)
  const monthlyQuery = useCalendarMonth(monthKey, viewMode === 'monthly')
  const { data: activitiesData } = useActivities(queryStartDate.toISOString(), queryEndDate.toISOString(), legacyCalendarEnabled)
  const { data: anniversaryEvents } = useAnniversaryOverlay(queryStartDate.toISOString(), queryEndDate.toISOString(), legacyCalendarEnabled)
  
  // 가상 기념일 배열과 아젠다 스토어 연동 (Desktop 작업 내용과 맥북 작업 내용 호환)
  const { tasks: agendaTasksStore, fetchTasks: fetchAgendaTasks, isInitialized: isAgendaInitialized } = useAgendaStore()

  const needsAgendaStore = legacyCalendarEnabled || viewMode === 'archive_agenda' || viewMode === 'home'
  useEffect(() => {
    if (needsAgendaStore && !isAgendaInitialized) {
      fetchAgendaTasks()
    }
  }, [fetchAgendaTasks, isAgendaInitialized, needsAgendaStore])

  const agendaEvents = useMemo(() => agendaTasksStore
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
    }) as unknown as Activity[], [agendaTasksStore])

  // 참조 안정성을 유지해야 MonthlyView 등의 React.memo가 실효성을 가짐
  const legacyEvents = useMemo(() => {
    const merged = [
      ...(activitiesData || []),
      ...((anniversaryEvents || []) as unknown as Activity[]),
      ...agendaEvents
    ]

    // 글로벌 카테고리 필터 적용
    if (activeCategories.length > 0) {
      return merged.filter(event =>
        event.categories?.some(cat => activeCategories.includes(cat.id) || cat.id === 'agenda-category')
      )
    }
    return merged
  }, [activitiesData, anniversaryEvents, agendaEvents, activeCategories])

  const monthlyEvents = useMemo(() => {
    const snapshotEvents = monthlyQuery.data?.events ?? []
    if (activeCategories.length === 0) return snapshotEvents
    return snapshotEvents.filter(event => event.categories.some(category =>
      activeCategories.includes(category.id) || category.id === 'agenda-category'))
  }, [activeCategories, monthlyQuery.data?.events])

  const monthlyActivities = useMemo(
    () => monthlyEvents.map(calendarSummaryToActivity),
    [monthlyEvents],
  )
  const events = viewMode === 'monthly' ? monthlyActivities : legacyEvents

  const loadMonthlyDetail = useCallback(async (summary: CalendarEventSummary) => {
    const detail = await getCalendarEventDetail(
      summary.source,
      summary.entityId,
      summary.originalStartTime ?? summary.start,
    )
    if (!detail) return null
    return {
      ...detail,
      id: summary.instanceId,
      calendar_source: summary.source,
      calendar_entity_id: summary.entityId,
      calendar_is_summary: false,
    } as Activity
  }, [])

  const handleMonthlyEventOpen = useCallback((summary: CalendarEventSummary) => {
    const placeholder = calendarSummaryToActivity(summary)
    openEventDetail(placeholder)
    void loadMonthlyDetail(summary).then(detail => {
      if (detail && useCalendarStore.getState().selectedEventDetail?.id === summary.instanceId) {
        openEventDetail(detail)
      }
    }).catch(console.error)
  }, [loadMonthlyDetail, openEventDetail])

  const { activeEvent, handleDragStart, handleDragEnd, handleDragCancel } = useEventDragDrop({
    viewMode: viewMode === 'weekly' ? 'weekly' : 'monthly',
    events: legacyEvents,
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
    // 아카이브 노트 렌더링 체감 속도를 0초로 만들기 위한 백그라운드 선탑재(Prefetching) 실행
    useArchiveStore.getState().prefetchArchive()

    // 실시간 DB 변경 감지 (구글 웹훅·다른 기기 입력을 새로고침 없이 자동 반영하는 WebSocket 연동)
    // ※ 동작하려면 Supabase에서 각 테이블이 supabase_realtime publication에 등록되어 있어야 함
    //   (마이그레이션 20260626020000_enable_realtime.sql 참고)
    let isMounted = true

    const initRealtime = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // 방어 코드: 기존에 db_realtime 채널이 남아있으면 깔끔하게 지우기 (StrictMode Race Condition 방지)
      supabase.getChannels().forEach((ch) => {
        if (ch.topic === 'realtime:db_realtime') {
          supabase.removeChannel(ch)
        }
      })

      // 잦은 연속 변경 시 과도한 재조회를 막기 위한 가벼운 디바운스
      const timers: Record<string, ReturnType<typeof setTimeout>> = {}
      const debounce = (key: string, fn: () => void, delay = 250) => {
        if (timers[key]) clearTimeout(timers[key])
        timers[key] = setTimeout(fn, delay)
      }
      const invalidate = (keys: string[][]) =>
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))

      const channel = supabase.channel('db_realtime')
        // 캘린더 일정
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () =>
          debounce('activities', () => invalidate([['activities'], ['calendar-month'], ['pendingActivities'], ['deleted_activities']])))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_category_map' }, () =>
          debounce('activities', () => invalidate([['activities'], ['calendar-month']])))
        // 카테고리
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () =>
          debounce('categories', () => invalidate([['categories'], ['activities'], ['calendar-month']])))
        // 기념일
        .on('postgres_changes', { event: '*', schema: 'public', table: 'anniversaries' }, () =>
          debounce('anniversaries', () => invalidate([['anniversaries'], ['anniversaries_list'], ['calendar-month']])))
        // Agenda 할일 (Zustand 스토어)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_tasks' }, () =>
          debounce('agenda', () => {
            invalidate([['calendar-month']])
            if (useCalendarStore.getState().viewMode !== 'monthly') useAgendaStore.getState().fetchTasks()
          }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_subtasks' }, () =>
          debounce('agenda', () => useAgendaStore.getState().fetchTasks()))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'academic_events' }, () =>
          debounce('academic-events', () => invalidate([['calendar-month'], ['academic_events']])))
        // 아카이브 노트 (Zustand 스토어)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () =>
          debounce('archive', () => useArchiveStore.getState().fetchTabs()))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_tabs' }, () =>
          debounce('archive', () => useArchiveStore.getState().fetchTabs()))
        // 링크 라운지
        .on('postgres_changes', { event: '*', schema: 'public', table: 'link_lounge_bookmarks' }, () =>
          debounce('link', () => invalidate([['link_lounge_bookmarks'], ['deleted_link_bookmarks']])))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'link_lounge_categories' }, () =>
          debounce('link', () => invalidate([['link_lounge_categories']])))
        .subscribe()

      return () => {
        Object.values(timers).forEach(clearTimeout)
        supabase.removeChannel(channel)
      }
    }

    let cleanupFunc: (() => void) | undefined
    initRealtime().then(cleanup => { 
      cleanupFunc = cleanup 
      // 만약 initRealtime 완료 전 언마운트 되었다면 즉시 클린업 실행
      if (!isMounted && cleanupFunc) cleanupFunc()
    })

    return () => {
      isMounted = false
      if (cleanupFunc) cleanupFunc()
    }
  }, [queryClient])

  // A3: 다른 기기/탭에서 작업 후 이 창으로 복귀하면 Zustand 기반 탭 데이터를 다시 불러온다.
  // (React Query 기반 탭은 QueryProvider의 refetchOnWindowFocus가 자동 처리)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const vm = useCalendarStore.getState().viewMode
      if (vm === 'archive_agenda' || vm === 'home') useAgendaStore.getState().fetchTasks()
      if (vm === 'archive_notes') useArchiveStore.getState().fetchTabs()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  // 인접 월(이전/다음 달) 프리패치 로직 (전략 4)
  useEffect(() => {
    if (viewMode !== 'monthly' || !monthlyQuery.data) return

    const prefetchAdjacent = () => {
      ;([-1, 1] as const).forEach(delta => {
        const adjacentMonth = getAdjacentMonthKey(monthKey, delta)
        void queryClient.prefetchQuery({
          queryKey: ['calendar-month', adjacentMonth],
          queryFn: () => import('@/app/actions/calendarMonth').then(module => module.getCalendarMonthSnapshot(adjacentMonth)),
          staleTime: 5 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
        })
      })
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prefetchAdjacent, { timeout: 1500 })
      return () => window.cancelIdleCallback(idleId)
    }
    const timer = globalThis.setTimeout(prefetchAdjacent, 250)
    return () => globalThis.clearTimeout(timer)
  }, [monthKey, monthlyQuery.data, queryClient, viewMode])

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Sidebar - Apple Style Glass effect */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-full shrink-0 relative shadow-sm">
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image src="/icon-192x192.png" alt="Calentask 로고" width={32} height={32} priority className="h-8 w-8 rounded-xl object-cover shadow-sm" />
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

              {/* 학교 급식 정보 버튼 */}
              <button 
                onClick={() => setViewMode('school_meals')}
                className={`group relative w-full text-left px-3.5 py-2.5 h-[42px] rounded-xl text-[14px] transition-all duration-300 ease-out flex items-center gap-3 ${
                  isSchoolMeals 
                  ? 'bg-orange-50/70 text-orange-700 font-bold' 
                  : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {isSchoolMeals && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-orange-500 rounded-r-full" />
                )}
                <Utensils className={`w-4 h-4 transition-transform ${isSchoolMeals ? 'text-orange-600' : 'text-muted-foreground group-hover:scale-105 group-hover:text-orange-500'}`} />
                <span>학교 급식 정보</span>
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
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2.5 ${
                          isMyCalendarActive ? 'bg-blue-50/70 text-blue-700 shadow-sm font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <CalendarIcon className={`w-3.5 h-3.5 ${isMyCalendarActive ? 'text-blue-600' : 'text-muted-foreground/50'}`} />
                        <span>나의 캘린더</span>
                      </button>

                      <button 
                        onClick={() => setViewMode('school_schedule')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2.5 ${
                          viewMode === 'school_schedule' ? 'bg-sky-50/70 text-sky-700 shadow-sm font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <GraduationCap className={`w-3.5 h-3.5 ${viewMode === 'school_schedule' ? 'text-sky-600' : 'text-muted-foreground/50'}`} />
                        <span>학사일정</span>
                      </button>

                      <button
                        onClick={() => setViewMode('academic_data')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2.5 ${
                          viewMode === 'academic_data' ? 'bg-teal-50/70 text-teal-700 shadow-sm font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Database className={`w-3.5 h-3.5 ${viewMode === 'academic_data' ? 'text-teal-600' : 'text-muted-foreground/50'}`} />
                        <span>학사일정 데이터 관리</span>
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
          <div className={`flex flex-1 flex-col overflow-y-auto overflow-x-hidden ${viewMode === 'monthly' ? 'px-1.5 pb-2 md:px-4 md:pb-4' : 'px-1 pb-8 md:px-8'}`} {...swipeHandlers}>
              <AnimatePresence mode="wait" custom={slideDirection}>
                <motion.div
                  key={viewMode}
                  custom={slideDirection}
                  variants={{
                    enter: (direction: string) => ({
                      x: prefersReducedMotion && viewMode === 'monthly' ? 0 : direction === 'left' ? '20%' : '-20%',
                      opacity: prefersReducedMotion && viewMode === 'monthly' ? 1 : 0,
                    }),
                    center: {
                      x: 0,
                      opacity: 1,
                    },
                    exit: (direction: string) => ({
                      x: prefersReducedMotion && viewMode === 'monthly' ? 0 : direction === 'left' ? '-20%' : '20%',
                      opacity: prefersReducedMotion && viewMode === 'monthly' ? 1 : 0,
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={prefersReducedMotion && viewMode === 'monthly' ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 35 }}
                  className="w-full flex-1 flex flex-col min-h-0"
                >
                  {/* 모바일 카테고리 필터 바 — 캘린더 뷰에서만 표시, 캘린더와 함께 스크롤 */}
                  {isMyCalendarActive && <MobileCategoryBar />}

                {viewMode === 'monthly' && (
                  <MonthlyView
                    currentDate={currentDate}
                    events={monthlyEvents}
                    specialDays={monthlyQuery.data?.specialDays ?? {}}
                    isLoading={monthlyQuery.isFetching && !monthlyQuery.data}
                  />
                )}
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
                {viewMode === 'school_meals' && (
                  <div className="min-h-full bg-background rounded-xl md:rounded-3xl p-2 md:p-6 overflow-x-hidden border border-border shadow-sm">
                    <SchoolMealsClient />
                  </div>
                )}
                {viewMode === 'school_schedule' && (
                  <div className="min-h-full flex flex-col bg-background rounded-xl md:rounded-3xl overflow-x-hidden border border-border shadow-sm">
                    <SchoolScheduleClient />
                  </div>
                )}
                {viewMode === 'academic_data' && (
                  <div className="min-h-full flex flex-col bg-background rounded-xl md:rounded-3xl overflow-x-hidden border border-border shadow-sm">
                    <AcademicDataClient />
                  </div>
                )}
                {viewMode === 'template_center' && (
                  <div className="min-h-full bg-background rounded-xl md:rounded-3xl p-2 md:p-6 overflow-x-hidden border border-border shadow-sm">
                    <TemplateCenterTab />
                  </div>
                )}
                {viewMode === 'archive_notes' && (
                  <div className="flex-1 flex flex-col min-h-0 bg-background rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border">
                    <ArchiveNotesView />
                  </div>
                )}
                {viewMode === 'link_lounge' && (
                  <div className="flex-1 flex flex-col min-h-0 bg-background rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border">
                    <LinkLoungeView />
                  </div>
                )}
                {viewMode === 'archive_agenda' && (
                  <div className="flex-1 flex flex-col min-h-0 bg-background rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border">
                    <ArchiveAgendaView />
                  </div>
                )}
                {viewMode === 'tags' && (
                  <div className="flex-1 flex flex-col min-h-0 rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border bg-background">
                    <TagsView />
                  </div>
                )}
                {viewMode === 'trash' && (
                  <div className="flex-1 flex flex-col min-h-0 rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border bg-background">
                    <TrashView />
                  </div>
                )}
                {viewMode === 'home' && (
                  <div className="min-h-full bg-background md:bg-transparent rounded-xl md:rounded-3xl">
                    <HomeDashboard />
                  </div>
                )}
                </motion.div>
              </AnimatePresence>
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
        <button
          type="button"
          aria-label="새 일정 추가"
          onClick={() => openAddEvent(currentDate)}
          className="absolute bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 md:w-16 md:h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-apple-float hover:scale-105 transition-transform flex items-center justify-center z-50"
        >
          <Plus className="w-6 h-6 md:w-8 md:h-8" />
        </button>
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

      <DaySummarySheet
        events={events}
        onEventOpen={viewMode === 'monthly' ? event => {
          const summary = monthlyEvents.find(item => item.instanceId === event.id)
          if (summary) handleMonthlyEventOpen(summary)
          else openEventDetail(event)
        } : undefined}
      />
      <EventDetailPopover />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog />
      
      {/* Edit Category Dialog */}
      <EditCategoryDialog />
      
      {/* Confetti Animation wrapper */}
      <AnniversaryConfetti />

      {/* 구글 동기화 진행 표시 — 앱 셸에 상주하므로 어떤 화면으로 이동해도 유지된다.
          작업 자체는 서버가 진행하므로 이 UI를 닫아도 동기화는 멈추지 않는다. */}
      <SyncProgressModal />
      <SyncStatusPill />

      {/* Global Add Event Dialog - always mounted so it can be opened from any view (e.g. archive agenda "캘린더에 등록") */}
      <AddEventDialog />
      
      {/* Global Add Agenda Task Dialog */}
      <AddAgendaTaskDialog />

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  )
}
