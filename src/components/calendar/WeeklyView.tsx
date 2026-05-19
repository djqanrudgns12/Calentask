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
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <div className="grid grid-cols-7 gap-4 flex-1">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, new Date())
          const holidayName = getHolidayName(day)
          const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))

          return (
            <div 
              key={idx} 
              className="flex flex-col bg-white rounded-[2rem] shadow-apple-soft hover:shadow-apple-float transition-all overflow-hidden min-h-[400px]"
            >
              <div className="flex flex-col items-center justify-center pt-6 pb-4 bg-white">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {format(day, 'EEE')}
                </span>
                <div className={`w-10 h-10 flex items-center justify-center rounded-full text-lg font-bold ${
                  isToday ? 'bg-blue-600 text-white shadow-md' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-800'
                }`}>
                  {format(day, 'd')}
                </div>
                {holidayName && (
                  <span className="mt-2 text-[10px] font-semibold text-red-500 truncate px-2 text-center w-full">
                    {holidayName}
                  </span>
                )}
              </div>
              
              <div className="flex-1 px-3 pb-4 space-y-2 overflow-y-auto no-scrollbar">
                {dayEvents.map(event => {
                  const primaryColor = event.categories?.[0]?.hex_color || '#cbd5e1' 
                  
                  return (
                    <div 
                      key={event.id}
                      className="group flex flex-col p-3 rounded-2xl hover:scale-[1.02] transition-transform cursor-pointer"
                      style={{ 
                        backgroundColor: `${primaryColor}15`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold opacity-80" style={{ color: primaryColor }}>
                          {format(new Date(event.start_time), 'HH:mm')}
                        </span>
                        <div className="flex space-x-1">
                          {event.categories?.map(tag => (
                            <div key={tag.id} className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: tag.hex_color }} />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 line-clamp-2" style={{ color: primaryColor }}>
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
