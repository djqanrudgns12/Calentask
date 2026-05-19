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
      <h3 className="text-xl font-bold text-slate-800 mb-6">
        {format(currentDate, 'yyyy년 M월')} 일정 목록
      </h3>
      
      <div className="space-y-4">
        {monthEvents.map((event) => {
          const startDate = new Date(event.start_time)
          const primaryColor = event.categories?.[0]?.hex_color || '#cbd5e1'

          return (
            <div 
              key={event.id}
              className="flex items-start p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center justify-center w-16 flex-shrink-0 border-r border-gray-100 pr-4 mr-4">
                <span className="text-sm font-semibold text-gray-500 uppercase">
                  {format(startDate, 'EEE')}
                </span>
                <span className="text-2xl font-bold text-slate-800">
                  {format(startDate, 'd')}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="flex space-x-1">
                    {event.categories?.map(tag => (
                      <span 
                        key={tag.id} 
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: tag.hex_color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 truncate">
                  {event.title}
                </h4>
                {event.memo && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {event.memo}
                  </p>
                )}
                <div className="text-xs font-medium text-gray-500 mt-2">
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
