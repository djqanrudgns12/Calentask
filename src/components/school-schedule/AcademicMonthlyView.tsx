'use client'

import React from 'react'
import { format, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { isEventOnDay } from '@/lib/calendarUtils'
import { getEventBarGradient, getEventBgColor } from '@/lib/eventColor'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useSpecialDays } from '@/hooks/useSpecialDays'
import { getCalendarFontClasses, getWeekdayHeaders } from '@/lib/calendarFontSize'

function DayCell({ day, children, isCurrentMonth, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`min-h-[72px] md:min-h-0 rounded-none md:rounded-2xl px-[1px] py-[2px] md:p-4 transition-all flex flex-col border-r border-b border-border md:border md:border-border shadow-none md:shadow-sm bg-card relative ${isCurrentMonth ? 'opacity-100' : 'opacity-40'}`}
    >
      {children}
    </div>
  )
}

interface AcademicMonthlyViewProps {
  currentDate: Date
  events: Activity[]
  onEventClick: (event: Activity) => void
}

export const AcademicMonthlyView = React.memo(function AcademicMonthlyView({ currentDate, events, onEventClick }: AcademicMonthlyViewProps) {
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

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = startOfWeek(monthStart, { weekStartsOn })
  const endDate = endOfWeek(monthEnd, { weekStartsOn })

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full p-2 md:p-4">
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

          const dayEvents = events.filter(e => isEventOnDay(e, day))
          
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

          return (
            <DayCell
              key={idx}
              day={day}
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
                <span className={`${fontClasses.dateNumber} font-bold w-3.5 h-3.5 md:w-8 md:h-8 flex items-center justify-center rounded-full shrink-0 ${isToday ? 'bg-sky-600 text-white shadow-sm md:shadow-lg shadow-sky-500/40' : isHolidayDay || day.getDay() === 0 ? 'text-red-500' : (showSaturdayBlue && day.getDay() === 6) ? 'text-blue-500' : 'text-foreground'
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
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      className={`group relative flex items-stretch rounded-sm md:rounded-r-lg ${fontClasses.eventTitle} transition-all md:hover:scale-[1.02] overflow-hidden cursor-pointer shadow-sm`}
                      style={{ backgroundColor: getEventBgColor(event) }}
                    >
                      {/* 좌측 accent bar */}
                      <div
                        className="hidden md:block w-[3px] shrink-0 rounded-l-lg"
                        style={{ background: getEventBarGradient(event) }}
                      />
                      <div className="flex-1 flex flex-col px-[3px] py-[2px] md:px-2.5 md:py-1.5 min-w-0 min-h-[18px]">
                        <span className="font-semibold text-foreground truncate pr-0.5 leading-[1.1] tracking-tighter md:tracking-normal md:leading-normal">
                          {event.title}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {dayEvents.length > ((holidayName && showHolidaysAsTags) ? 2 : 3) && (
                  <button
                    className={`w-full mt-0 md:mt-1.5 text-center px-1 py-[2px] md:px-2 md:py-1 ${fontClasses.moreButton} font-bold text-muted-foreground bg-muted/80 rounded-sm md:rounded-md min-h-[18px] cursor-default`}
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
