'use client'

import { format, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { getHolidayName } from '@/lib/holidays'

interface MonthlyViewProps {
  currentDate: Date
  events: Activity[]
}

export function MonthlyView({ currentDate, events }: MonthlyViewProps) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col min-h-0">
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden shadow-sm border border-gray-200 flex-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="bg-white py-3 text-center text-xs font-semibold text-gray-500">
            {day}
          </div>
        ))}
        
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())
          
          const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))
          const holidayName = getHolidayName(day)

          return (
            <div 
              key={idx} 
              className={`min-h-[120px] bg-white p-2 transition-colors hover:bg-gray-50 cursor-pointer ${
                !isCurrentMonth ? 'opacity-40' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-red-500 truncate w-16">
                  {holidayName && holidayName}
                </span>
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-700'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="space-y-1.5 overflow-y-auto max-h-24 no-scrollbar">
                {dayEvents.map(event => {
                  const primaryColor = event.categories?.[0]?.hex_color || '#cbd5e1' 
                  
                  return (
                    <div 
                      key={event.id}
                      className="group relative flex flex-col px-2 py-1.5 rounded-md text-xs border border-transparent hover:border-gray-200 hover:shadow-sm transition-all"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <div className="flex items-center space-x-1.5 mb-1">
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
