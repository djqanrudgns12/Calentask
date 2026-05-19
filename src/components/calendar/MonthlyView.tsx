'use client'

import { format, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { getHolidayName } from '@/lib/holidays'
import { useCalendarStore } from '@/store/useCalendarStore'

interface MonthlyViewProps {
  currentDate: Date
  events: Activity[]
}

export function MonthlyView({ currentDate, events }: MonthlyViewProps) {
  const { openAddEvent } = useCalendarStore()
  
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-3 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-400">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-3 flex-1 auto-rows-fr">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())
          
          const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))
          const holidayName = getHolidayName(day)

          return (
            <div 
              key={idx} 
              onClick={() => openAddEvent(day)}
              className={`bg-white rounded-2xl p-3 shadow-apple-soft hover:shadow-apple-float transition-all cursor-pointer flex flex-col ${
                !isCurrentMonth ? 'opacity-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-red-500 truncate w-16">
                  {holidayName && holidayName}
                </span>
                <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white shadow-md' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-700'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="space-y-1.5 overflow-y-auto flex-1 no-scrollbar">
                {dayEvents.map(event => {
                  const primaryColor = event.categories?.[0]?.hex_color || '#cbd5e1' 
                  
                  return (
                    <div 
                      key={event.id}
                      onClick={(e) => e.stopPropagation()}
                      className="group relative flex flex-col px-2.5 py-1.5 rounded-xl text-xs transition-all hover:scale-[1.02]"
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
