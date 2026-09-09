'use client'

import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { Activity } from '@/app/actions/calendar'
import { useEventDragDrop } from '@/hooks/useEventDragDrop'
import { WeeklyView } from '@/components/calendar/WeeklyView'

interface WeeklyViewWithDndProps {
  currentDate: Date
  events: Activity[]
  startDateStr: string
  endDateStr: string
}

export function WeeklyViewWithDnd({
  currentDate,
  events,
  startDateStr,
  endDateStr,
}: WeeklyViewWithDndProps) {
  const { activeEvent, handleDragStart, handleDragEnd, handleDragCancel } = useEventDragDrop({
    viewMode: 'weekly',
    events,
    startDateStr,
    endDateStr,
  })
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <WeeklyView currentDate={currentDate} events={events} />
      <DragOverlay>
        {activeEvent ? (
          <div className="rounded-md border border-indigo-200 bg-card p-2 text-xs font-semibold opacity-90 shadow-lg">
            {activeEvent.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
