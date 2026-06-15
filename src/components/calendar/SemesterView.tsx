'use client'

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { isEventOnDay } from '@/lib/calendarUtils'
import { getEventBarGradient, getEventBgColor } from '@/lib/eventColor'
import { Pencil, Trash2 } from 'lucide-react'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useSpecialDays } from '@/hooks/useSpecialDays'

import React from 'react'

interface SemesterViewProps {
  currentDate: Date
  events: Activity[]
}

export const SemesterView = React.memo(function SemesterView({ events }: SemesterViewProps) {
  const { 
    semesterYear, semesterTerm, openDaySummary, openEventDetail, openEditEvent, openDeleteConfirm, 
    showHolidays, showHolidaysAsTags,
    showNationalDays, showAnniversaries, showTraditionalTerms
  } = useCalendarStore()
  
  const { data: specialDaysMap = {} } = useSpecialDays(semesterYear)

  // 1학기: 3월 1일 ~ 8월 31일, 2학기: 9월 1일 ~ 익년 2월 28일
  const semesterStartDate = new Date(semesterYear, semesterTerm === 1 ? 2 : 8, 1)

  // Create an array of the 6 months in the semester
  const months = Array.from({ length: 6 }, (_, i) => addMonths(semesterStartDate, i))

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-6 no-scrollbar pb-24 md:pb-6">
      <div className="max-w-[1400px] mx-auto w-full">
        {/* 2x3 Grid for the 6 months */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-12">
          {months.map((monthDate, monthIdx) => {
            const mStart = startOfMonth(monthDate)
            const mEnd = endOfMonth(monthDate)
            const gridStart = startOfWeek(mStart)
            const gridEnd = endOfWeek(mEnd)
            const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

            return (
              <div key={monthIdx} className="bg-card rounded-2xl md:rounded-[1.5rem] shadow-sm border border-border flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                {/* Month Header */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-card">
                  <h3 className="text-xl font-bold text-foreground tracking-tight">
                    {format(monthDate, 'yyyy년 M월')}
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {monthIdx + 1}개월차
                  </span>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-border bg-background">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div key={idx} className="text-center text-[9px] font-bold text-muted-foreground uppercase py-2.5 tracking-widest">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-background">
                  {days.map((day, dayIdx) => {
                    const isCurrentMonth = isSameMonth(day, monthDate)
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
                      <div
                        key={dayIdx}
                        onClick={() => openDaySummary(day)}
                        className={`min-h-[80px] md:min-h-[110px] border-b border-r border-border p-1 md:p-2 flex flex-col cursor-pointer transition-colors hover:bg-background ${isCurrentMonth ? 'bg-card' : 'bg-background opacity-40'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col gap-0.5 max-w-[70%]">
                            <span className="text-[8px] font-bold text-red-400 truncate">
                              {holidayName && !showHolidaysAsTags && holidayName}
                            </span>
                            {otherTerms && (
                              <span className="text-[7.5px] font-medium text-muted-foreground truncate leading-tight">
                                {otherTerms}
                              </span>
                            )}
                          </div>
                          <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${isToday ? 'bg-[#312E81] text-white shadow-md shadow-[#4338CA]/40' : isHolidayDay || day.getDay() === 0 ? 'text-red-500' : 'text-foreground'
                            }`}>
                            {format(day, 'd')}
                          </span>
                        </div>

                        <div className="flex-1 flex flex-col justify-between overflow-hidden">
                          <div className="space-y-1.5">
                            {holidayName && showHolidaysAsTags && (
                              <div className="group relative flex items-stretch rounded-r-md text-[10px] transition-transform overflow-hidden bg-red-50 text-red-600">
                                <div className="w-[3px] shrink-0 bg-red-500" />
                                <div className="flex-1 flex flex-col px-1.5 py-1 min-w-0">
                                  <span className="font-semibold truncate leading-tight pr-1">{holidayName}</span>
                                </div>
                              </div>
                            )}
                            {dayEvents.slice(0, (holidayName && showHolidaysAsTags) ? 1 : 2).map(event => {
                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => { e.stopPropagation(); openEventDetail(event); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                                  className="group relative flex items-stretch rounded-r-md text-[10px] transition-transform hover:scale-[1.02] overflow-hidden cursor-pointer"
                                  style={{ backgroundColor: getEventBgColor(event) }}
                                >
                                  {/* 좌측 accent bar: 멀티 카테고리일 경우 그라데이션으로 표시 */}
                                  <div
                                    className="w-[3px] shrink-0"
                                    style={{ background: getEventBarGradient(event) }}
                                  />
                                  <div className="flex-1 flex flex-col px-1.5 py-1 min-w-0">
                                    <span className="font-semibold text-foreground truncate leading-tight pr-1 group-hover:pr-10">
                                      {event.title}
                                    </span>
                                  </div>

                                  {/* Hover Actions */}
                                  <div className="absolute right-0.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-card/90 px-0.5 py-0.5 rounded shadow-sm">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                                      className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-indigo-600 transition-colors"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openDeleteConfirm(event.id); }}
                                      className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-red-600 transition-colors"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {dayEvents.length > ((holidayName && showHolidaysAsTags) ? 1 : 2) && (
                            <div className="flex justify-end mt-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openDaySummary(day); }}
                                className="px-1.5 py-0.5 rounded-full bg-slate-200/60 hover:bg-slate-300 text-[9px] font-bold text-foreground transition-colors"
                              >
                                +{dayEvents.length - ((holidayName && showHolidaysAsTags) ? 1 : 2)}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})
