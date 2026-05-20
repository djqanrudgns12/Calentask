'use client'

import { useState } from 'react'
import { format, isSameMonth, parseISO } from 'date-fns'
import { useCalendarStore } from '@/store/useCalendarStore'
import { Activity } from '@/app/actions/calendar'
import { Pencil, Trash2 } from 'lucide-react'

interface ListViewProps {
  currentDate: Date
  events: Activity[]
}

export function ListView({ currentDate, events }: ListViewProps) {
  const { openEditEvent, openDeleteConfirm } = useCalendarStore()
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null)

  const monthEvents = events
    .filter(e => isSameMonth(new Date(e.start_time), currentDate))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Group events by day to create the split timeline structure
  const groupedEvents = monthEvents.reduce((acc, event) => {
    const dateStr = format(new Date(event.start_time), 'yyyy-MM-dd')
    if (!acc[dateStr]) acc[dateStr] = []
    acc[dateStr].push(event)
    return acc
  }, {} as Record<string, Activity[]>)

  if (monthEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
        <p className="text-lg font-medium">이번 달 일정이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-[#FAFAFA] p-8 lg:p-12">
      <div className="max-w-3xl mx-auto w-full relative">
        {/* Continuous Timeline Line */}
        <div className="hidden md:block absolute left-[128px] top-6 bottom-0 w-px bg-[#EEEEEE] -translate-x-1/2 z-0" />

        {Object.entries(groupedEvents).map(([dateStr, dayEvents]) => {
          const date = parseISO(dateStr)
          return (
            <div key={dateStr} className="flex flex-col md:flex-row mb-12 relative group">
              {/* Left: Giant Typography Date */}
              <div className="md:w-32 flex-shrink-0 flex flex-col md:items-end md:pr-8 mb-4 md:mb-0 md:border-r border-transparent relative z-10">
                <span className="text-4xl font-light text-slate-800 tracking-tight">
                  {format(date, 'dd')}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {format(date, 'M월')} {['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}요일
                </span>
                {/* Timeline node */}
                <div className="hidden md:block absolute right-[-5px] top-3 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-[#FAFAFA] transition-colors group-hover:bg-[#312E81]" />
              </div>

              {/* Right: Events List */}
              <div className="flex-1 md:pl-8 space-y-4">
                {dayEvents.map(event => {
                  const primaryColor = event.categories?.[0]?.hex_color || '#94a3b8'
                  return (
                    <div 
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="group/card relative flex flex-col p-4 rounded-xl cursor-pointer transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-[#EEEEEE]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-400 flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: primaryColor }} />
                          {event.is_all_day ? '하루 종일' : `${format(new Date(event.start_time), 'HH:mm')} - ${format(new Date(event.end_time), 'HH:mm')}`}
                        </span>
                        <div className="flex space-x-1">
                          {event.categories?.map(tag => (
                            <span 
                              key={tag.id} 
                              className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100"
                              style={{ color: tag.hex_color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 group-hover/card:text-[#312E81] transition-colors pr-12">
                        {event.title}
                      </h4>

                      {/* Hover Actions */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden group-hover/card:flex items-center gap-1 bg-white/90 px-1 py-0.5 rounded shadow-sm">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openDeleteConfirm(event.id); }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 transform transition-all"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex space-x-1.5">
                {selectedEvent.categories?.map(tag => (
                  <span 
                    key={tag.id} 
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-50"
                    style={{ color: tag.hex_color, border: `1px solid ${tag.hex_color}30` }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">
              {selectedEvent.title}
            </h2>
            
            <div className="flex items-center text-sm font-medium text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {format(new Date(selectedEvent.start_time), 'yyyy년 MM월 dd일 HH:mm')} 
              <span className="mx-2">→</span> 
              {format(new Date(selectedEvent.end_time), 'HH:mm')}
            </div>
            
            {selectedEvent.memo && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</h3>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.memo}
                </p>
              </div>
            )}
            
            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2.5 bg-[#312E81] text-white text-sm font-bold rounded-xl shadow-md shadow-[#4338CA]/30 hover:bg-[#4338CA] transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
