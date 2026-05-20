'use client'

import { format, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { getHolidayName } from '@/lib/holidays'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useEffect, useState } from 'react'

interface WeeklyViewProps {
  currentDate: Date
  events: Activity[]
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const PIXELS_PER_HOUR = 60 // 1 minute = 1 pixel

export function WeeklyView({ currentDate, events }: WeeklyViewProps) {
  const { openAddEvent } = useCalendarStore()
  const startDate = startOfWeek(currentDate)
  const endDate = endOfWeek(currentDate)
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFAFA] rounded-2xl border border-[#EEEEEE] overflow-hidden shadow-sm">
      {/* Header: Days */}
      <div className="flex border-b border-[#EEEEEE] bg-white">
        <div className="w-16 shrink-0 border-r border-[#EEEEEE]" /> {/* Time axis spacer */}
        <div className="flex-1 grid grid-cols-7">
          {days.map((day, idx) => {
            const isToday = isSameDay(day, now)
            const holidayName = getHolidayName(day)
            
            // All day events for this day
            const allDayEvents = events.filter(e => isSameDay(new Date(e.start_time), day) && e.is_all_day)

            return (
              <div key={idx} className="flex flex-col items-center py-3 border-r border-[#EEEEEE] last:border-r-0 relative">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  {format(day, 'EEE')}
                </span>
                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  isToday ? 'bg-[#312E81] text-white shadow-md shadow-[#4338CA]/40' : holidayName || day.getDay() === 0 ? 'text-red-500' : 'text-slate-700'
                }`}>
                  {format(day, 'd')}
                </div>
                {holidayName && (
                  <span className="mt-1 text-[10px] font-medium text-red-400 truncate px-1 text-center w-full">
                    {holidayName}
                  </span>
                )}
                {/* All day events */}
                <div className="w-full px-1 mt-1 space-y-1">
                   {allDayEvents.map(event => {
                     const primaryColor = event.categories?.[0]?.hex_color || '#94a3b8'
                     return (
                        <div key={event.id} className="text-[10px] font-semibold truncate px-1.5 py-0.5 rounded" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                           {event.title}
                        </div>
                     )
                   })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Body: Time Grid */}
      <div className="flex-1 overflow-y-auto relative bg-white no-scrollbar">
        <div className="flex">
          {/* Time Axis */}
          <div className="w-16 shrink-0 flex flex-col border-r border-[#EEEEEE] bg-[#FAFAFA]">
            {HOURS.map(hour => (
              <div key={hour} className="relative text-[10px] font-medium text-slate-400 text-right pr-2" style={{ height: PIXELS_PER_HOUR }}>
                <span className="absolute -top-2 right-2 bg-[#FAFAFA] px-1">{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span>
              </div>
            ))}
          </div>

          {/* Grid Columns */}
          <div className="flex-1 grid grid-cols-7 relative">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col">
              {HOURS.map(hour => (
                <div key={hour} className="w-full border-b border-[#F1F5F9]" style={{ height: PIXELS_PER_HOUR }} />
              ))}
            </div>

            {/* Day Columns */}
            {days.map((day, dayIdx) => {
              const isToday = isSameDay(day, now)
              const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day) && !e.is_all_day)

              return (
                <div 
                  key={dayIdx} 
                  className="relative border-r border-[#F1F5F9] last:border-r-0 min-h-[1440px]"
                  onClick={() => openAddEvent(day)}
                >
                  {/* Events */}
                  {dayEvents.map(event => {
                    const startDate = new Date(event.start_time)
                    const endDate = new Date(event.end_time)
                    const startMins = startDate.getHours() * 60 + startDate.getMinutes()
                    const durationMins = differenceInMinutes(endDate, startDate) || 30 // Fallback to 30 mins
                    const top = startMins * (PIXELS_PER_HOUR / 60)
                    const height = durationMins * (PIXELS_PER_HOUR / 60)
                    const primaryColor = event.categories?.[0]?.hex_color || '#94a3b8'

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-1 right-1 rounded-md px-2 py-1 overflow-hidden transition-transform hover:scale-[1.02] shadow-sm backdrop-blur-md cursor-pointer"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: `${primaryColor}1A`,
                          borderTop: `1px solid ${primaryColor}30`,
                          borderRight: `1px solid ${primaryColor}30`,
                          borderBottom: `1px solid ${primaryColor}30`,
                          borderLeft: `3px solid ${primaryColor}`,
                        }}
                      >
                        <div className="text-[10px] font-bold opacity-80 mb-0.5" style={{ color: primaryColor }}>
                          {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                        </div>
                        <div className="text-xs font-semibold leading-tight truncate" style={{ color: primaryColor }}>
                          {event.title}
                        </div>
                      </div>
                    )
                  })}

                  {/* Crimson Neon Line for Current Time */}
                  {isToday && (
                    <div 
                      className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                      style={{ top: `${(now.getHours() * 60 + now.getMinutes()) * (PIXELS_PER_HOUR / 60)}px` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#E11D48] shadow-[0_0_8px_rgba(225,29,72,0.8)] -ml-1" />
                      <div className="flex-1 h-[2px] bg-[#E11D48] shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
