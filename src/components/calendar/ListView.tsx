'use client'

import { format, isSameMonth } from 'date-fns'
import { Activity } from '@/app/actions/calendar'

interface ListViewProps {
  currentDate: Date
  events: Activity[]
}

export function ListView({ currentDate, events }: ListViewProps) {
  // 현재 보고있는 달의 이벤트만 필터링 후 날짜순 정렬
  const monthEvents = events
    .filter(e => isSameMonth(new Date(e.start_time), currentDate))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  if (monthEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-500">
        <p className="text-lg font-medium">이번 달 일정이 없습니다.</p>
        <p className="text-sm">우측 하단의 + 버튼을 눌러 일정을 추가해보세요.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
      <h3 className="text-2xl font-bold text-slate-900 mb-8 px-2">
        {format(currentDate, 'yyyy년 M월')} 일정 목록
      </h3>
      
      <div className="space-y-5">
        {monthEvents.map((event) => {
          const startDate = new Date(event.start_time)
          const primaryColor = event.categories?.[0]?.hex_color || '#cbd5e1'

          return (
            <div 
              key={event.id}
              className="group flex items-start p-5 bg-white rounded-[1.5rem] shadow-apple-soft hover:shadow-apple-float hover:scale-[1.01] transition-all cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center w-20 flex-shrink-0 pr-5 mr-5 border-r border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {format(startDate, 'EEE')}
                </span>
                <span className="text-3xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {format(startDate, 'd')}
                </span>
              </div>
              
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex space-x-1.5">
                    {event.categories?.map(tag => (
                      <span 
                        key={tag.id} 
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: tag.hex_color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <h4 className="text-xl font-bold text-slate-900 truncate">
                  {event.title}
                </h4>
                {event.memo && (
                  <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {event.memo}
                  </p>
                )}
                <div className="text-xs font-semibold text-gray-400 mt-3 flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: primaryColor }}></span>
                  {format(startDate, 'a h:mm')} ~ {format(new Date(event.end_time), 'a h:mm')}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
