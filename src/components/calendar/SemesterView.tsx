'use client'

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { getHolidayName } from '@/lib/holidays'
import { Pencil, Trash2 } from 'lucide-react'
import { useCalendarStore } from '@/store/useCalendarStore'

interface SemesterViewProps {
  currentDate: Date
  events: Activity[]
}

export function SemesterView({ events }: SemesterViewProps) {
  const { semesterYear, semesterTerm, openAddEvent, showHolidays, openEditEvent, openDeleteConfirm } = useCalendarStore()

  // 1학기: 3월 1일 ~ 8월 31일, 2학기: 9월 1일 ~ 익년 2월 28일
  const semesterStartDate = new Date(semesterYear, semesterTerm === 1 ? 2 : 8, 1)
  
  // Create an array of the 6 months in the semester
  const months = Array.from({ length: 6 }, (_, i) => addMonths(semesterStartDate, i))

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 no-scrollbar">
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
              <div key={monthIdx} className="bg-white rounded-[1.5rem] shadow-sm border border-[#EEEEEE] flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                {/* Month Header */}
                <div className="px-6 py-5 border-b border-[#EEEEEE] flex items-center justify-between bg-white">
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                    {format(monthDate, 'yyyy년 M월')}
                  </h3>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {monthIdx + 1}개월차
                  </span>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-[#F1F5F9] bg-[#FAFAFA]">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div key={idx} className="text-center text-[9px] font-bold text-slate-400 uppercase py-2.5 tracking-widest">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-[#F8FAFC]">
                  {days.map((day, dayIdx) => {
                    const isCurrentMonth = isSameMonth(day, monthDate)
                    const isToday = isSameDay(day, new Date())
                    const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))
                    const holidayName = showHolidays ? getHolidayName(day) : null

                    return (
                      <div 
                        key={dayIdx} 
                        onClick={() => openAddEvent(day)}
                        className={`min-h-[110px] border-b border-r border-[#F1F5F9] p-2 flex flex-col cursor-pointer transition-colors hover:bg-[#FAFAFA] ${
                          isCurrentMonth ? 'bg-white' : 'bg-[#F8FAFC] opacity-40'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[8px] font-bold text-red-400 truncate max-w-[60%]">
                            {holidayName && holidayName}
                          </span>
                          <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday ? 'bg-[#312E81] text-white shadow-md shadow-[#4338CA]/40' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-700'
                          }`}>
                            {format(day, 'd')}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 overflow-y-auto no-scrollbar flex-1">
                          {dayEvents.map(event => {
                            const primaryColor = event.categories?.[0]?.hex_color || '#94a3b8'
                            
                            return (
                              <div 
                                key={event.id}
                                onClick={(e) => e.stopPropagation()}
                                className="group relative flex flex-col px-1.5 py-1 rounded-r-md text-[10px] border-l-[3px] transition-transform hover:scale-[1.02]"
                                style={{ 
                                  backgroundColor: `${primaryColor}1A`,
                                  borderLeftColor: primaryColor
                                }}
                              >
                                <span className="font-semibold text-slate-700 truncate leading-tight pr-8">
                                  {event.title}
                                </span>

                                {/* Hover Actions */}
                                <div className="absolute right-0.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white/90 px-0.5 py-0.5 rounded shadow-sm">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                                    className="p-0.5 hover:bg-gray-100 rounded text-gray-500 hover:text-indigo-600 transition-colors"
                                  >
                                    <Pencil className="w-2.5 h-2.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openDeleteConfirm(event.id); }}
                                    className="p-0.5 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
