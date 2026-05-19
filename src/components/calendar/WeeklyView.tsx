'use client'

import { format, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { getHolidayName } from '@/lib/holidays'

interface WeeklyViewProps {
  currentDate: Date
  events: Activity[]
}

export function WeeklyView({ currentDate, events }: WeeklyViewProps) {
  const startDate = startOfWeek(currentDate)
  const endDate = endOfWeek(currentDate)
  
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col min-h-0">
      <div className="grid grid-cols-7 gap-4 flex-1">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, new Date())
          const holidayName = getHolidayName(day)
          const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))

          return (
            <div 
              key={idx} 
              className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]"
            >
              <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    {format(day, 'EEE')}
                  </span>
                  <span className={`text-lg font-bold ${
                    isToday ? 'text-blue-600' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-900'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                {holidayName && (
                  <span className="text-xs font-semibold text-red-500 truncate max-w-[60px]">
                    {holidayName}
                  </span>
                )}
              </div>
              
              <div className="flex-1 p-2 space-y-2 overflow-y-auto no-scrollbar">
                {dayEvents.map(event => {
                  const primaryColor = event.categories?.[0]?.hex_color || '#cbd5e1' 
                  
                  return (
                    <div 
                      key={event.id}
                      className="group flex flex-col p-2.5 rounded-lg border hover:shadow-md transition-all cursor-pointer"
                      style={{ 
                        backgroundColor: `${primaryColor}10`,
                        borderColor: `${primaryColor}30` 
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: primaryColor }}>
                          {format(new Date(event.start_time), 'HH:mm')}
                        </span>
                        <div className="flex space-x-1">
                          {event.categories?.map(tag => (
                            <div key={tag.id} className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: tag.hex_color }} />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-slate-800 line-clamp-2">
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
