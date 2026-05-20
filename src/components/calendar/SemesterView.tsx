'use client'

import { format, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { getHolidayName } from '@/lib/holidays'
import { useCalendarStore } from '@/store/useCalendarStore'

interface SemesterViewProps {
  currentDate: Date
  events: Activity[]
}

export function SemesterView({ events }: SemesterViewProps) {
  const { semesterYear, semesterTerm } = useCalendarStore()

  // 1학기: 3월 1일 ~ 8월 31일, 2학기: 9월 1일 ~ 익년 2월 28일
  const semesterStartDate = new Date(semesterYear, semesterTerm === 1 ? 2 : 8, 1)
  const semesterEndDate = new Date(
    semesterTerm === 1 ? semesterYear : semesterYear + 1, 
    semesterTerm === 1 ? 7 : 1, 
    semesterTerm === 1 ? 31 : 28
  )
  
  const gridStartDate = startOfWeek(semesterStartDate)
  const gridEndDate = endOfWeek(semesterEndDate)
  
  const days = eachDayOfInterval({ start: gridStartDate, end: gridEndDate })

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-3 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-[#f2f2f7] py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid - Dense but clean glassmorphism */}
      <div className="grid grid-cols-7 gap-2 flex-1 pb-4">
        {days.map((day, idx) => {
          const isFirstDayOfMonth = day.getDate() === 1 || idx === 0
          const isToday = isSameDay(day, new Date())
          const isCurrentSemester = day >= semesterStartDate && day <= semesterEndDate
          
          const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))
          const holidayName = getHolidayName(day)

          return (
            <div 
              key={idx} 
              className={`min-h-[80px] rounded-xl p-2 transition-all flex flex-col border border-white/40 shadow-apple-soft hover:shadow-lg backdrop-blur-xl ${
                isCurrentSemester ? 'bg-white/70' : 'bg-gray-100/40 opacity-50'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] font-bold text-red-400 truncate w-10">
                  {holidayName && holidayName}
                </span>
                <div className="flex items-center gap-1">
                  {isFirstDayOfMonth && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {format(day, 'M월')}
                    </span>
                  )}
                  <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
              </div>
              
              <div className="space-y-0.5 overflow-y-auto flex-1 no-scrollbar pt-1">
                {dayEvents.map(event => {
                  const primaryColor = event.categories?.[0]?.hex_color || '#cbd5e1' 
                  
                  return (
                    <div 
                      key={event.id}
                      className="group relative flex items-center px-1.5 py-0.5 rounded-md text-[9px] transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 shadow-sm" style={{ backgroundColor: primaryColor }} />
                      <span className="font-semibold text-slate-700 truncate">
                        {event.title}
                      </span>
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
}
