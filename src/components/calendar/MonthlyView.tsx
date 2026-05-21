'use client'

import { format, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { getEventPrimaryColor, getEventBarGradient, getEventBgColor } from '@/lib/eventColor'
import { getHolidayName } from '@/lib/holidays'
import { useCalendarStore } from '@/store/useCalendarStore'
import { Pencil, Trash2 } from 'lucide-react'

interface MonthlyViewProps {
  currentDate: Date
  events: Activity[]
}

export function MonthlyView({ currentDate, events }: MonthlyViewProps) {
  const { openAddEvent, showHolidays, openEditEvent, openDeleteConfirm } = useCalendarStore()
  
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
          <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-[#f2f2f7] py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-3 flex-1 auto-rows-fr pb-4">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())
          
          const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))
          const holidayName = showHolidays ? getHolidayName(day) : null

          return (
            <div 
              key={idx} 
              onClick={() => openAddEvent(day)}
              className={`rounded-2xl p-4 transition-all cursor-pointer flex flex-col border border-[#EEEEEE] shadow-sm hover:shadow-md bg-white ${
                isCurrentMonth ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-semibold text-red-400 truncate w-16">
                  {holidayName && holidayName}
                </span>
                <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-[#312E81] text-white shadow-lg shadow-[#4338CA]/40' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-700'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="space-y-1.5 overflow-y-auto flex-1 no-scrollbar">
                {dayEvents.map(event => {
                  const primaryColor = getEventPrimaryColor(event)
                  
                  return (
                    <div 
                      key={event.id}
                      onClick={(e) => e.stopPropagation()}
                      className="group relative flex items-stretch rounded-r-lg text-xs transition-all hover:scale-[1.02] overflow-hidden"
                      style={{ backgroundColor: getEventBgColor(event) }}
                    >
                      {/* 좌측 accent bar: 멀티 카테고리일 경우 그라데이션으로 표시 */}
                      <div
                        className="w-[3px] shrink-0 rounded-l-lg"
                        style={{ background: getEventBarGradient(event) }}
                      />
                      <div className="flex-1 flex flex-col px-2.5 py-1.5 min-w-0">
                        <span className="font-medium text-slate-700 truncate pr-10">
                          {event.title}
                        </span>
                      </div>
                      
                      {/* Hover Actions */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white/90 px-1 py-0.5 rounded shadow-sm">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openDeleteConfirm(event.id); }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
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
}
