'use client'

import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, differenceInMinutes } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { isEventOnDay, isMultiDayEvent } from '@/lib/calendarUtils'
import { getEventPrimaryColor, getEventBarGradient, getEventBgColor } from '@/lib/eventColor'
import { Pencil, Trash2 } from 'lucide-react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useSpecialDays } from '@/hooks/useSpecialDays'
import { useEffect, useRef, useState } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'

function DraggableTimeBlock({ event, children, style, className, ...props }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    disabled: (event.type as string) === 'ANNIVERSARY_OVERLAY'
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${className} ${isDragging ? 'opacity-50 !z-[999] pointer-events-none' : ''}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

function DroppableColumn({ day, children, ...props }: any) {
  const dateStr = format(day, 'yyyy-MM-dd')
  const { setNodeRef, isOver } = useDroppable({ id: dateStr })
  return (
    <div ref={setNodeRef} {...props} className={`${props.className} ${isOver ? 'bg-indigo-50/30' : ''}`}>
      {children}
    </div>
  )
}

interface WeeklyViewProps {
  currentDate: Date
  events: Activity[]
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const PIXELS_PER_HOUR = 40 // 시간당 40px로 축소하여 전체 높이 33% 감소 (1440px → 960px)

import React from 'react'

export const WeeklyView = React.memo(function WeeklyView({ currentDate, events }: WeeklyViewProps) {
  const { 
    openDaySummary, openEventDetail, openEditEvent, openDeleteConfirm, 
    showHolidays, showHolidaysAsTags,
    showNationalDays, showAnniversaries, showTraditionalTerms
  } = useCalendarStore()
  
  const year = currentDate.getFullYear()
  const { data: specialDaysMap = {} } = useSpecialDays(year)
  
  const startDate = startOfWeek(currentDate)
  const endDate = endOfWeek(currentDate)
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const [now, setNow] = useState(new Date())
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // 주간 뷰 로드 시 현재 시간 - 2시간 위치로 자동 스크롤
  // 왜 -2시간? 현재 시간이 화면 상단이 아닌 약간 아래에 위치하도록 하여 맥락 확보
  useEffect(() => {
    if (scrollContainerRef.current) {
      const currentHour = new Date().getHours()
      const scrollToHour = Math.max(0, currentHour - 2)
      const scrollPosition = scrollToHour * PIXELS_PER_HOUR
      scrollContainerRef.current.scrollTo({ top: scrollPosition, behavior: 'instant' as ScrollBehavior })
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Body: Scrollable Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-auto snap-x snap-mandatory hide-scrollbar bg-card relative">
        <div className="min-w-[700px] md:min-w-0 flex flex-col h-full">
          
          {/* Header: Days */}
          <div className="flex border-b border-border bg-card sticky top-0 z-30">
            <div className="w-12 md:w-16 shrink-0 border-r border-border bg-card sticky left-0 z-40" /> {/* Time axis spacer */}
            <div className="flex-1 grid grid-cols-7">
          {days.map((day, idx) => {
            const isToday = isSameDay(day, now)
            
            const dateStr = format(day, 'yyyy-MM-dd')
            const specialDays = specialDaysMap[dateStr] || []
            
            const holidays = specialDays.filter(d => d.type === 'holiday')
            const nationalDays = specialDays.filter(d => d.type === 'national')
            const anniversaries = specialDays.filter(d => d.type === 'anniversary')
            const traditionalTerms = specialDays.filter(d => d.type === 'traditional')
            
            const isHolidayDay = showHolidays && holidays.some(d => d.isHoliday)
            const holidayName = showHolidays && holidays.length > 0 ? holidays[0].name : null

            const otherTerms = [
              showNationalDays ? nationalDays.map(d=>d.name) : [],
              showAnniversaries ? anniversaries.map(d=>d.name) : [],
              showTraditionalTerms ? traditionalTerms.map(d=>d.name) : []
            ].flat().join(', ')

            // All day events for this day
            const allDayEvents = events.filter(e => isEventOnDay(e, day) && (e.is_all_day || isMultiDayEvent(e)))

            return (
              <div key={idx} className="flex flex-col items-center py-3 border-r border-border last:border-r-0 relative">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {['일', '월', '화', '수', '목', '금', '토'][day.getDay()]}
                </span>
                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-[#312E81] text-white shadow-md shadow-[#4338CA]/40' : isHolidayDay || day.getDay() === 0 ? 'text-red-500' : 'text-foreground'
                  }`}>
                  {format(day, 'd')}
                </div>
                {holidayName && !showHolidaysAsTags && (
                  <span className="mt-1 text-[10px] font-medium text-red-400 truncate px-1 text-center w-full">
                    {holidayName}
                  </span>
                )}
                {otherTerms && (
                  <span className="mt-0.5 text-[9px] font-medium text-muted-foreground truncate px-1 text-center w-full leading-tight">
                    {otherTerms}
                  </span>
                )}
                {/* All day events */}
                <div className="w-full px-1 mt-1 space-y-1">
                   {holidayName && showHolidaysAsTags && (
                       <div 
                         className="text-[10px] font-semibold truncate px-1.5 py-0.5 rounded" 
                         style={{ backgroundColor: `#ef444420`, color: '#ef4444' }}
                       >
                          {holidayName}
                       </div>
                   )}
                  {allDayEvents.map(event => {
                    const primaryColor = getEventPrimaryColor(event)
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); openEventDetail(event); }}
                        onDoubleClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                        className="text-[10px] font-semibold truncate px-1.5 py-0.5 rounded cursor-pointer transition-transform hover:scale-[1.02]"
                        style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                      >
                        {event.title}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
            </div>
          </div>

          {/* Body: Time Grid */}
          <div className="flex-1 flex relative">
            {/* Time Axis */}
            <div className="w-12 md:w-16 shrink-0 flex flex-col border-r border-border bg-background sticky left-0 z-20">
            {HOURS.map(hour => (
              <div key={hour} className="relative text-[10px] font-medium text-muted-foreground text-right pr-2" style={{ height: PIXELS_PER_HOUR }}>
                <span className={`absolute right-2 bg-background px-1 ${hour === 0 ? 'top-1' : '-top-2'}`}>
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Columns */}
          <div className="flex-1 grid grid-cols-7 relative">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col">
              {HOURS.map(hour => (
                <div key={hour} className="w-full border-b border-border" style={{ height: PIXELS_PER_HOUR }} />
              ))}
            </div>

            {/* Day Columns */}
            {days.map((day, dayIdx) => {
              const isToday = isSameDay(day, now)
              const dayEvents = events.filter(e => isEventOnDay(e, day) && !e.is_all_day && !isMultiDayEvent(e))

              // 1. Sort events
              const sortedEvents = [...dayEvents].sort((a, b) => {
                const startA = new Date(a.start_time).getTime()
                const startB = new Date(b.start_time).getTime()
                if (startA !== startB) return startA - startB
                return new Date(b.end_time).getTime() - new Date(a.end_time).getTime()
              })

              // 2. Clustering & Column Assignment
              const eventLayouts = new Map<string, { column: number, totalColumns: number }>()
              let currentCluster: Activity[] = []
              let clusterEndTime = 0

              const processCluster = (cluster: Activity[]) => {
                if (cluster.length === 0) return
                const columns: Activity[][] = []

                cluster.forEach(event => {
                  let placed = false
                  for (let i = 0; i < columns.length; i++) {
                    const col = columns[i]
                    const lastEventInCol = col[col.length - 1]
                    if (new Date(lastEventInCol.end_time).getTime() <= new Date(event.start_time).getTime()) {
                      col.push(event)
                      placed = true
                      break
                    }
                  }
                  if (!placed) {
                    columns.push([event])
                  }
                })

                const numCols = columns.length
                columns.forEach((col, colIndex) => {
                  col.forEach(event => {
                    eventLayouts.set(event.id, { column: colIndex, totalColumns: numCols })
                  })
                })
              }

              sortedEvents.forEach(event => {
                const start = new Date(event.start_time).getTime()
                const end = new Date(event.end_time).getTime()

                if (currentCluster.length === 0) {
                  currentCluster.push(event)
                  clusterEndTime = end
                } else if (start < clusterEndTime) {
                  currentCluster.push(event)
                  clusterEndTime = Math.max(clusterEndTime, end)
                } else {
                  processCluster(currentCluster)
                  currentCluster = [event]
                  clusterEndTime = end
                }
              })
              processCluster(currentCluster)

              return (
                <DroppableColumn
                  key={dayIdx}
                  day={day}
                  className="relative border-r border-border last:border-r-0 snap-start"
                  style={{ minHeight: PIXELS_PER_HOUR * 24 }}
                  onClick={() => openDaySummary(day)}
                >
                  {/* Events */}
                  {sortedEvents.map(event => {
                    const startDate = new Date(event.start_time)
                    const endDate = new Date(event.end_time)
                    const startMins = startDate.getHours() * 60 + startDate.getMinutes()
                    const durationMins = differenceInMinutes(endDate, startDate) || 30 // Fallback to 30 mins
                    const top = startMins * (PIXELS_PER_HOUR / 60)
                    const height = durationMins * (PIXELS_PER_HOUR / 60)
                    const primaryColor = getEventPrimaryColor(event)

                    const layout = eventLayouts.get(event.id) || { column: 0, totalColumns: 1 }
                    const widthPercent = 100 / layout.totalColumns
                    const leftPercent = layout.column * widthPercent
                    const leftStr = `calc(${leftPercent}% + 2px)`
                    const widthStr = `calc(${widthPercent}% - 4px)`

                    return (
                      <DraggableTimeBlock
                        key={event.id}
                        event={event}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEventDetail(event); }}
                        onDoubleClick={(e: React.MouseEvent) => { e.stopPropagation(); openEditEvent(event); }}
                        className="group absolute rounded-md overflow-hidden flex items-stretch transition-all duration-200 hover:z-50 hover:scale-[1.02] hover:min-w-[140px] shadow-sm backdrop-blur-md cursor-pointer"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: leftStr,
                          width: widthStr,
                          zIndex: layout.column,
                          backgroundColor: getEventBgColor(event),
                          borderTop: `1px solid ${primaryColor}30`,
                          borderRight: `1px solid ${primaryColor}30`,
                          borderBottom: `1px solid ${primaryColor}30`,
                        }}
                      >
                        {/* 좌측 accent bar: 멀티 카테고리일 경우 그라데이션으로 표시 */}
                        <div
                          className="w-[3px] shrink-0"
                          style={{ background: getEventBarGradient(event) }}
                        />
                        <div className="flex-1 flex flex-col px-2 py-1 min-w-0 overflow-hidden">
                          <div className="text-[10px] font-bold opacity-80 mb-0.5" style={{ color: primaryColor }}>
                            {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                          </div>
                          <div className="text-xs font-semibold leading-tight truncate pr-10" style={{ color: primaryColor }}>
                            {event.title}
                          </div>
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-1 bg-card/90 px-1 py-0.5 rounded shadow-sm">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-indigo-600 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDeleteConfirm(event.id, event); }}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </DraggableTimeBlock>
                    )
                  })}

                  {/* Crimson Neon Line for Current Time */}
                  {isToday && (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                      style={{ top: `${(now.getHours() * 60 + now.getMinutes()) * (PIXELS_PER_HOUR / 60)}px` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#E11D48] shadow-[0_0_8px_rgba(225,29,72,0.8)] -ml-1" />
                      <div className="flex-1 h-[2px] bg-[#E11D48] shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
                    </div>
                  )}
                </DroppableColumn>
              )
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
})
