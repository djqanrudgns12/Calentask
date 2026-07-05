'use client'

import { format, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { isEventOnDay } from '@/lib/calendarUtils'
import { getEventBarGradient, getEventBgColor } from '@/lib/eventColor'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useSpecialDays } from '@/hooks/useSpecialDays'
import { getCalendarFontClasses, getWeekdayHeaders } from '@/lib/calendarFontSize'
import { Pencil, Trash2 } from 'lucide-react'
import { useDroppable, useDraggable } from '@dnd-kit/core'

import React, { useMemo } from 'react'

function DraggableEventCard({ event, children }: { event: Activity, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    disabled: (event.type as string) === 'ANNIVERSARY_OVERLAY'
  })
  
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-full ${isDragging ? 'opacity-30 pointer-events-none' : ''}`}
    >
      {children}
    </div>
  )
}

function DayCell({ day, children, isCurrentMonth, onClick }: any) {
  const dateStr = format(day, 'yyyy-MM-dd')
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr
  })
  
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`min-h-[72px] md:min-h-0 rounded-none md:rounded-2xl px-[1px] py-[2px] md:p-4 transition-all cursor-pointer flex flex-col border-r border-b border-border md:border md:border-border shadow-none md:shadow-sm hover:shadow-md bg-card relative ${isCurrentMonth ? 'opacity-100' : 'opacity-40'} ${isOver ? 'ring-2 ring-indigo-400 bg-indigo-50/50' : ''}`}
    >
      {children}
    </div>
  )
}

interface MonthlyViewProps {
  currentDate: Date
  events: Activity[]
}

export const MonthlyView = React.memo(function MonthlyView({ currentDate, events }: MonthlyViewProps) {
  const openDaySummary = useCalendarStore(s => s.openDaySummary)
  const openEventDetail = useCalendarStore(s => s.openEventDetail)
  const openEditEvent = useCalendarStore(s => s.openEditEvent)
  const openDeleteConfirm = useCalendarStore(s => s.openDeleteConfirm)
  const showHolidays = useCalendarStore(s => s.showHolidays)
  const showHolidaysAsTags = useCalendarStore(s => s.showHolidaysAsTags)
  const showNationalDays = useCalendarStore(s => s.showNationalDays)
  const showAnniversaries = useCalendarStore(s => s.showAnniversaries)
  const showTraditionalTerms = useCalendarStore(s => s.showTraditionalTerms)
  const calendarFontSize = useCalendarStore(s => s.calendarFontSize)
  const weekStartsOn = useCalendarStore(s => s.weekStartsOn)
  const showSaturdayBlue = useCalendarStore(s => s.showSaturdayBlue)
  
  const fontClasses = getCalendarFontClasses(calendarFontSize)
  const weekdayHeaders = getWeekdayHeaders(weekStartsOn)
  
  const year = currentDate.getFullYear()
  const { data: specialDaysMap = {} } = useSpecialDays(year)

  const days = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startDate = startOfWeek(monthStart, { weekStartsOn })
    const endDate = endOfWeek(monthEnd, { weekStartsOn })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentDate, weekStartsOn])

  // 셀마다 events.filter를 반복(O(일수×이벤트))하지 않도록 일자→이벤트 맵을 사전 계산
  const dayEventsMap = useMemo(() => {
    const map = new Map<string, Activity[]>()
    for (const day of days) {
      map.set(format(day, 'yyyy-MM-dd'), events.filter(e => isEventOnDay(e, day)))
    }
    return map
  }, [days, events])

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-[1px] md:gap-3 mb-1 md:mb-2 bg-muted md:bg-transparent border-t border-l border-border md:border-none">
        {weekdayHeaders.map((day) => (
          <div key={day} className={`text-center ${fontClasses.weekdayHeader} font-bold uppercase tracking-wider bg-background py-1 md:py-2 border-r border-b border-border md:border-none ${
            day === '일' ? 'text-red-500' : (day === '토' && showSaturdayBlue) ? 'text-blue-500' : 'text-muted-foreground'
          }`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-[1px] md:gap-3 flex-1 auto-rows-fr pb-4 bg-muted md:bg-transparent border-l border-border md:border-none">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())

          const dateStr = format(day, 'yyyy-MM-dd')
          const dayEvents = dayEventsMap.get(dateStr) || []
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

          return (
            <DayCell
              key={idx}
              day={day}
              onClick={() => openDaySummary(day)}
              isCurrentMonth={isCurrentMonth}
            >
              <div className="flex justify-between items-start mb-0.5 md:mb-3">
                <div className="flex flex-col gap-0 max-w-[70%]">
                  <span className={`${fontClasses.holidayName} font-semibold text-red-400 truncate leading-[1.1] md:leading-normal mt-[1px] md:mt-0`}>
                    {holidayName && !showHolidaysAsTags && holidayName}
                  </span>
                  {otherTerms && (
                    <span className={`${fontClasses.otherTerms} font-medium text-muted-foreground truncate leading-[1.1] md:leading-tight`}>
                      {otherTerms}
                    </span>
                  )}
                </div>
                <span className={`${fontClasses.dateNumber} font-bold w-3.5 h-3.5 md:w-8 md:h-8 flex items-center justify-center rounded-full shrink-0 ${isToday ? 'bg-[#312E81] text-white shadow-sm md:shadow-lg shadow-[#4338CA]/40' : isHolidayDay || day.getDay() === 0 ? 'text-red-500' : (showSaturdayBlue && day.getDay() === 6) ? 'text-blue-500' : 'text-foreground'
                  }`}>
                  {format(day, 'd')}
                </span>
              </div>

              <div className="space-y-1.5 flex-1 overflow-hidden">
                {holidayName && showHolidaysAsTags && (
                  <div className={`group relative flex items-stretch rounded-sm md:rounded-r-lg ${fontClasses.holidayTag} transition-all overflow-hidden bg-red-50 text-red-600`}>
                    <div className="hidden md:block w-[3px] shrink-0 rounded-l-lg bg-red-500" />
                    <div className="flex-1 flex flex-col px-[2px] py-[1px] md:px-2.5 md:py-1.5 min-w-0">
                      <span className="font-semibold truncate pr-0.5 tracking-tighter md:tracking-normal leading-tight md:leading-normal">{holidayName}</span>
                    </div>
                  </div>
                )}
                {dayEvents.slice(0, (holidayName && showHolidaysAsTags) ? 2 : 3).map(event => {
                  return (
                    <DraggableEventCard key={event.id} event={event}>
                      <div
                        onClick={(e) => { e.stopPropagation(); openEventDetail(event); }}
                      onDoubleClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                      className={`group relative flex items-stretch rounded-sm md:rounded-r-lg ${fontClasses.eventTitle} transition-all md:hover:scale-[1.02] overflow-hidden cursor-pointer`}
                      style={{ backgroundColor: getEventBgColor(event) }}
                    >
                      {/* 좌측 accent bar: 멀티 카테고리일 경우 그라데이션으로 표시 */}
                      <div
                        className="hidden md:block w-[3px] shrink-0 rounded-l-lg"
                        style={{ background: getEventBarGradient(event) }}
                      />
                      <div className="flex-1 flex flex-col px-[3px] py-[2px] md:px-2.5 md:py-1.5 min-w-0 min-h-[18px]">
                        <span className="font-semibold text-foreground truncate pr-0.5 group-hover:pr-10 leading-[1.1] tracking-tighter md:tracking-normal md:leading-normal">
                          {event.title}
                        </span>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-card/90 px-1 py-0.5 rounded shadow-sm">
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
                      </div>
                    </DraggableEventCard>
                  )
                })}

                {dayEvents.length > ((holidayName && showHolidaysAsTags) ? 2 : 3) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openDaySummary(day); }}
                    className={`w-full mt-0 md:mt-1.5 text-center px-1 py-[2px] md:px-2 md:py-1 ${fontClasses.moreButton} font-bold text-muted-foreground bg-muted/80 hover:bg-muted rounded-sm md:rounded-md transition-colors min-h-[18px]`}
                  >
                    + {dayEvents.length - ((holidayName && showHolidaysAsTags) ? 2 : 3)}
                  </button>
                )}
              </div>
            </DayCell>
          )
        })}
      </div>
    </div>
  )
})
