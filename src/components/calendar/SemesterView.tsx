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
    <div className="flex-1 overflow-auto p-6 flex flex-col min-h-0">
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden shadow-sm border border-gray-200">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="bg-white py-3 text-center text-xs font-semibold text-gray-500 sticky top-0 z-10 shadow-sm">
            {day}
          </div>
        ))}
        
        {days.map((day, idx) => {
          // 달력 렌더링 시 현재 달인지 여부는 시각적 구분(투명도)을 위해 남겨두지만, 
          // 학기 뷰는 여러 달이 섞여 있으므로 달이 바뀌는 첫 날에 월 표시를 해주는 것이 좋습니다.
          const isFirstDayOfMonth = day.getDate() === 1
          const isToday = isSameDay(day, new Date())
          
          const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))
          const holidayName = getHolidayName(day)

          return (
            <div 
              key={idx} 
              className={`min-h-[100px] bg-white p-2 transition-colors hover:bg-gray-50 cursor-pointer relative ${
                isSameMonth(day, currentDate) ? '' : 'bg-slate-50/50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-semibold text-red-500 truncate w-12">
                  {holidayName && holidayName}
                </span>
                <div className="flex items-center gap-1">
                  {isFirstDayOfMonth && (
                    <span className="text-xs font-bold text-slate-400">
                      {format(day, 'M월')}
                    </span>
                  )}
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5 overflow-y-auto max-h-20 no-scrollbar">
                {dayEvents.map(event => {
                  const primaryColor = event.categories?.[0]?.hex_color || '#cbd5e1' 
                  
                  return (
                    <div 
                      key={event.id}
                      className="group relative flex flex-col px-1.5 py-1 rounded-md text-[10px] border border-transparent hover:border-gray-200 hover:shadow-sm transition-all"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <div className="flex items-center space-x-1 mb-0.5">
                        <div className="flex space-x-0.5">
                          {event.categories?.map(tag => (
                            <div key={tag.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.hex_color }} />
                          ))}
                        </div>
                      </div>
                      <span className="font-medium text-slate-800 truncate" style={{ color: primaryColor }}>
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
