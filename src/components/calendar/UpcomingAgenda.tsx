'use client'

import { useState } from 'react'
import { isToday, isThisWeek, parseISO, format, isValid } from 'date-fns'
import { Clock, Inbox } from 'lucide-react'

// 이벤트 타입 추론용 (필요한 속성만 명시)
interface Category {
  id: string
  name: string
  hex_color: string | null
}

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  is_all_day?: boolean
  categories?: Category[]
  hex_color?: string | null
}

interface UpcomingAgendaProps {
  events: CalendarEvent[]
  currentDate: Date
}

export function UpcomingAgenda({ events, currentDate }: UpcomingAgendaProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today')

  // 이벤트 필터링 및 정렬
  const filteredEvents = events.filter((event) => {
    if (!event.start_time) return false
    const eventDate = parseISO(event.start_time)
    if (!isValid(eventDate)) return false

    if (activeTab === 'today') {
      return isToday(eventDate)
    } else {
      // 이번 주 필터링 (weekStartsOn: 0 (일요일) 기준)
      return isThisWeek(eventDate, { weekStartsOn: 0 })
    }
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // 시간을 예쁘게 포맷팅
  const formatTime = (event: CalendarEvent) => {
    if (event.is_all_day) return '하루 종일'
    const d = parseISO(event.start_time)
    return isValid(d) ? format(d, 'a h:mm').replace('AM', '오전').replace('PM', '오후') : ''
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full mt-2 bg-transparent rounded-2xl">
      {/* 탭 헤더 */}
      <div className="flex items-center gap-2 px-6 mb-4">
        <button
          onClick={() => setActiveTab('today')}
          className={`relative px-3 py-1.5 text-sm font-extrabold rounded-full transition-all ${
            activeTab === 'today' 
            ? 'text-indigo-600 bg-indigo-50 shadow-sm' 
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          오늘
        </button>
        <button
          onClick={() => setActiveTab('week')}
          className={`relative px-3 py-1.5 text-sm font-extrabold rounded-full transition-all ${
            activeTab === 'week' 
            ? 'text-indigo-600 bg-indigo-50 shadow-sm' 
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          이번 주
        </button>
      </div>

      {/* 타임라인 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-70">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100">
              <Inbox className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500">예정된 일정이 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">휴식을 즐기세요!</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-2.5 space-y-6 pb-4">
            {filteredEvents.map((event, index) => {
              // 색상 추출 (카테고리 색상 우선, 없으면 기본 색상)
              const color = event.categories?.[0]?.hex_color || event.hex_color || '#4f46e5'
              const timeString = formatTime(event)
              const categoryName = event.categories?.[0]?.name
              
              // 날짜가 이번주 탭일 경우 요일/날짜 표시 추가
              let dateHeader = null
              if (activeTab === 'week') {
                const prevEvent = index > 0 ? filteredEvents[index - 1] : null
                const currentDateStr = format(parseISO(event.start_time), 'yyyy-MM-dd')
                const prevDateStr = prevEvent ? format(parseISO(prevEvent.start_time), 'yyyy-MM-dd') : null
                
                if (currentDateStr !== prevDateStr) {
                  const dateObj = parseISO(event.start_time)
                  const dayStr = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()]
                  dateHeader = (
                    <div className="relative -ml-2.5 mb-4 mt-6 first:mt-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-700">
                        {format(dateObj, 'M월 d일')} ({dayStr})
                      </span>
                    </div>
                  )
                }
              }

              return (
                <div key={event.id}>
                  {dateHeader}
                  <div className="relative pl-6 group">
                    {/* 타임라인 마커 (Dot) */}
                    <div 
                      className="absolute -left-[5px] top-1.5 w-[10px] h-[10px] rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-125 z-10"
                      style={{ backgroundColor: color }}
                    />
                    
                    {/* 이벤트 컨텐츠 */}
                    <div className="flex flex-col p-3 -mt-2 bg-white rounded-xl border border-transparent hover:border-slate-50 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] transition-all cursor-pointer">
                      <div className="flex items-center gap-1.5 mb-1 opacity-80">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-500 tracking-wide">
                          {timeString}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-slate-800 leading-tight mb-1.5 line-clamp-2">
                        {event.title}
                      </h4>
                      
                      {categoryName && (
                        <div className="flex items-center">
                          <span 
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm"
                            style={{ 
                              backgroundColor: `${color}15`, 
                              color: color,
                              border: `1px solid ${color}30`
                            }}
                          >
                            {categoryName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
