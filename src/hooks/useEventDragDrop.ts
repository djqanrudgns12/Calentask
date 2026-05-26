import { useState, useCallback } from 'react'
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Activity, updateActivity } from '@/app/actions/calendar'
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'

interface UseEventDragDropProps {
  viewMode: 'monthly' | 'weekly'
  events: Activity[]
  startDateStr: string
  endDateStr: string
}

export function useEventDragDrop({ viewMode, events, startDateStr, endDateStr }: UseEventDragDropProps) {
  const [activeEvent, setActiveEvent] = useState<Activity | null>(null)
  const queryClient = useQueryClient()

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const draggedEvent = events.find(e => e.id === active.id)
    if (draggedEvent) {
      setActiveEvent(draggedEvent)
    }
  }, [events])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over, delta } = event
    setActiveEvent(null)

    if (!over || !active) return

    const draggedEvent = events.find(e => e.id === active.id)
    if (!draggedEvent) return

    let newStart: Date
    let newEnd: Date

    if (viewMode === 'monthly') {
      // Monthly View: over.id contains the target date string, e.g. "2026-05-28"
      const targetDateStr = String(over.id)
      const targetDate = new Date(targetDateStr)
      if (isNaN(targetDate.getTime())) return

      const oldStart = new Date(draggedEvent.start_time)
      const oldEnd = new Date(draggedEvent.end_time)

      const dayDiff = differenceInCalendarDays(targetDate, startOfDay(oldStart))
      if (dayDiff === 0) return // 같은 날짜에 드롭

      newStart = addDays(oldStart, dayDiff)
      newEnd = addDays(oldEnd, dayDiff)
    } else {
      // Weekly View:
      // over.id contains the target date string for the column
      const targetDateStr = String(over.id)
      const targetDate = new Date(targetDateStr)
      if (isNaN(targetDate.getTime())) return

      const oldStart = new Date(draggedEvent.start_time)
      const oldEnd = new Date(draggedEvent.end_time)

      const dayDiff = differenceInCalendarDays(targetDate, startOfDay(oldStart))
      
      // Calculate Time shift (Y-axis snap to 30 mins = 20px)
      // 1 hour = 40px (PIXELS_PER_HOUR)
      // 30 mins = 20px
      const snapPx = 20
      const snappedDeltaY = Math.round(delta.y / snapPx) * snapPx
      const deltaMinutes = (snappedDeltaY / 40) * 60

      newStart = addDays(new Date(oldStart.getTime() + deltaMinutes * 60000), dayDiff)
      newEnd = addDays(new Date(oldEnd.getTime() + deltaMinutes * 60000), dayDiff)
    }

    const categoryIds = draggedEvent.categories?.map(c => c.id) || []
    
    // 캐시 키
    const queryKey = ['activities', startDateStr, endDateStr]
    
    // 이전 상태 백업
    const previousActivities = queryClient.getQueryData<Activity[]>(queryKey)

    // 1. 낙관적 업데이트 UI 반영
    queryClient.setQueryData<Activity[]>(queryKey, (old) => {
      if (!old) return old
      return old.map(e => e.id === draggedEvent.id ? { 
        ...e, 
        start_time: newStart.toISOString(), 
        end_time: newEnd.toISOString() 
      } : e)
    })

    // 2. 서버 통신 (즉시)
    try {
      // Error handling is managed by React Query typically, but since we call server action directly here:
      await updateActivity(draggedEvent.id, {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString()
      }, categoryIds)

      // 3. Undo 토스트 발생
      toast.success('일정이 이동되었습니다.', {
        action: {
          label: '실행 취소',
          onClick: async () => {
            // Undo UI 롤백
            queryClient.setQueryData(queryKey, previousActivities)
            // Undo 서버 통신
            try {
              await updateActivity(draggedEvent.id, {
                start_time: draggedEvent.start_time,
                end_time: draggedEvent.end_time
              }, categoryIds)
              toast.info('이동이 취소되었습니다.')
            } catch (err) {
              toast.error('실행 취소 중 오류가 발생했습니다.')
              // Re-fetch to sync with server
              queryClient.invalidateQueries({ queryKey: ['activities'] })
            }
          }
        },
        duration: 4000, // 4초간 노출
      })

    } catch (err) {
      // 서버 에러 시 롤백
      queryClient.setQueryData(queryKey, previousActivities)
      toast.error('일정 이동 중 오류가 발생했습니다.')
    }

  }, [events, viewMode, queryClient, startDateStr, endDateStr])

  const handleDragCancel = useCallback(() => {
    setActiveEvent(null)
  }, [])

  return {
    activeEvent,
    handleDragStart,
    handleDragEnd,
    handleDragCancel
  }
}
