'use client'

import { format, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, addDays } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { getHolidayName } from '@/lib/holidays'

interface SemesterViewProps {
  currentDate: Date
  events: Activity[]
}

export function SemesterView({ currentDate, events }: SemesterViewProps) {
  // 현재 달의 첫 주부터 시작하여 16주(약 1학기 기간)를 표시합니다.
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const startDate = startOfWeek(monthStart)
  const endDate = addDays(startDate, 16 * 7 - 1) // 16주
  
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // 16주를 주 단위로 그룹화
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 sticky top-0 z-10 bg-[#f2f2f7] py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 flex-1 pb-4">
        {days.map((day, idx) => {
          const isFirstDayOfMonth = day.getDate() === 1
          const isToday = isSameDay(day, new Date())
          
          const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))
          const holidayName = getHolidayName(day)

          return (
            <div 
              key={idx} 
              className={`min-h-[100px] bg-white rounded-xl p-2 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col ${
                isSameMonth(day, currentDate) ? '' : 'opacity-60 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-[10px] font-semibold text-red-500 truncate w-12">
                  {holidayName && holidayName}
                </span>
                <div className="flex items-center gap-1">
                  {isFirstDayOfMonth && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {format(day, 'M월')}
                    </span>
                  )}
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white shadow-sm' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1 overflow-y-auto flex-1 no-scrollbar">
                {dayEvents.map(event => {
                  const primaryColor = event.categories?.[0]?.hex_color || '#cbd5e1' 
                  
                  return (
                    <div 
                      key={event.id}
                      className="group relative flex flex-col px-1.5 py-1 rounded-lg text-[10px] transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <div className="flex items-center space-x-1 mb-0.5">
                        <div className="flex space-x-0.5">
                          {event.categories?.map(tag => (
                            <div key={tag.id} className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: tag.hex_color }} />
                          ))}
                        </div>
                      </div>
                      <span className="font-semibold text-slate-800 truncate" style={{ color: primaryColor }}>
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
