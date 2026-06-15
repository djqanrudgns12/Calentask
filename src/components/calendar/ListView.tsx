'use client'


import { useState } from 'react'
import { format, isSameMonth, parseISO, startOfMonth, endOfMonth, startOfDay, addDays } from 'date-fns'
import { useCalendarStore } from '@/store/useCalendarStore'
import { Activity } from '@/app/actions/calendar'
import { isEventOnDay } from '@/lib/calendarUtils'
import { getEventPrimaryColor } from '@/lib/eventColor'
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface ListViewProps {
  currentDate: Date
  events: Activity[]
}

export function ListView({ currentDate, events }: ListViewProps) {
  const { openEventDetail, openEditEvent, openDeleteConfirm } = useCalendarStore()
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})

  const toggleExpand = (dateStr: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }))
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  // Filter events that fall within the current month
  const monthEvents = events
    .filter(e => {
      const eStart = new Date(e.start_time)
      const eEnd = new Date(e.end_time)
      return eStart <= monthEnd && eEnd > monthStart
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Group events by day to create the split timeline structure
  const groupedEvents: Record<string, Activity[]> = {}
  monthEvents.forEach(event => {
    let current = startOfDay(new Date(event.start_time))
    const end = startOfDay(new Date(event.end_time))
    
    if (current.getTime() > end.getTime()) current = end

    let safetyCounter = 0
    while (current <= end && safetyCounter < 1000) {
      if (isSameMonth(current, currentDate) && isEventOnDay(event, current)) {
        const dateStr = format(current, 'yyyy-MM-dd')
        if (!groupedEvents[dateStr]) groupedEvents[dateStr] = []
        groupedEvents[dateStr].push(event)
      }
      current = addDays(current, 1)
      safetyCounter++
    }
  })

  // Sort grouped events by date string chronologically
  const sortedGroupedEntries = Object.entries(groupedEvents).sort(([dateA], [dateB]) => dateA.localeCompare(dateB))

  if (monthEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground">
        <p className="text-lg font-medium">이번 달 일정이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-background p-4 md:p-8 lg:p-12 pb-24 md:pb-12">
      <div className="max-w-3xl mx-auto w-full relative">
        {/* Continuous Timeline Line */}
        <div className="hidden md:block absolute left-[128px] top-6 bottom-0 w-px bg-muted -translate-x-1/2 z-0" />

        {sortedGroupedEntries.map(([dateStr, dayEvents]) => {
          const date = parseISO(dateStr)
          const isExpanded = expandedDates[dateStr]

          return (
            <div key={dateStr} className="flex flex-col md:flex-row mb-8 relative group">
              {/* Left: Typography Date */}
              <div className="md:w-32 flex-shrink-0 flex flex-col md:items-end md:pr-8 mb-3 md:mb-0 md:border-r border-transparent relative z-10">
                <span className="text-2xl md:text-3xl font-light text-foreground tracking-tight">
                  {format(date, 'dd')}
                </span>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                  {format(date, 'M월')} {['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}요일
                </span>
                {/* Timeline node */}
                <div className="hidden md:block absolute right-[-4.5px] top-3 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-[#FAFAFA] transition-colors group-hover:bg-[#312E81]" />
              </div>

              {/* Right: Events List */}
              <div className="flex-1 md:pl-6 space-y-2">
                {dayEvents.slice(0, isExpanded ? undefined : 3).map(event => {
                  const primaryColor = getEventPrimaryColor(event)
                  return (
                    <div 
                      key={event.id}
                      onClick={() => openEventDetail(event)}
                      onDoubleClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                      className="group/card relative flex flex-col px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-card hover:shadow-sm border border-transparent hover:border-border"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: primaryColor }} />
                          {event.is_all_day ? '하루 종일' : `${format(new Date(event.start_time), 'HH:mm')} - ${format(new Date(event.end_time), 'HH:mm')}`}
                        </span>
                        <div className="flex space-x-1">
                          {event.categories?.map(tag => (
                            <span 
                              key={tag.id} 
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-foreground bg-muted"
                              style={{ color: tag.hex_color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-foreground group-hover/card:text-[#312E81] transition-colors pr-12">
                        {event.title}
                      </h4>

                      {/* Hover Actions */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover/card:flex items-center gap-1 bg-card/90 px-1 py-0.5 rounded shadow-sm">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openDeleteConfirm(event.id); }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
                
                {/* Accordion Toggle Button */}
                {dayEvents.length > 3 && (
                  <button
                    onClick={() => toggleExpand(dateStr)}
                    className="w-full mt-2 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/50 hover:bg-slate-200/60 rounded-xl transition-colors shadow-sm"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        {dayEvents.length - 3}개의 일정 더보기
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
