import { useCalendarStore } from '@/store/useCalendarStore'
import { format } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { isEventOnDay } from '@/lib/calendarUtils'
import { X, Plus } from 'lucide-react'
import { getEventPrimaryColor } from '@/lib/eventColor'

interface DaySummarySheetProps {
  events: Activity[]
}

export function DaySummarySheet({ events }: DaySummarySheetProps) {
  const { selectedDaySummary, closeDaySummary, openEventDetail, openAddEvent } = useCalendarStore()

  if (!selectedDaySummary) return null

  // Filter events for this specific day
  const dayEvents = events.filter(e => isEventOnDay(e, selectedDaySummary))

  // + 버튼 클릭 시: 바텀시트를 닫고, 선택된 날짜를 전달하여 일정 추가 다이얼로그를 열기
  const handleAddEvent = () => {
    const date = selectedDaySummary
    closeDaySummary()
    openAddEvent(date)
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={closeDaySummary}
      />
      
      {/* Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-xl rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] border-t border-white/50 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full duration-300 md:left-auto md:right-10 md:w-[400px] md:rounded-3xl md:bottom-10 md:shadow-[0_8px_40px_rgba(0,0,0,0.12)] md:border"
      >
        {/* Drag Handle (Mobile) */}
        <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-12 h-1.5 bg-gray-300/60 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-gray-200/50">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {format(selectedDaySummary, 'M월 d일 (E)')}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleAddEvent}
              className="p-2 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              onClick={closeDaySummary}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {dayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <div className="w-12 h-12 mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm">일정이 없습니다</p>
            </div>
          ) : (
            dayEvents.map(event => {
              const primaryColor = getEventPrimaryColor(event)
              
              return (
                <div 
                  key={event.id}
                  onClick={() => openEventDetail(event)}
                  className="group relative flex items-stretch p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] border border-gray-100 shadow-sm hover:shadow-md bg-white"
                >
                  <div className="flex flex-col justify-center pr-4 border-r border-gray-100 min-w-[70px]">
                    <span className="text-xs font-semibold text-gray-500">
                      {event.is_all_day ? '종일' : format(new Date(event.start_time), 'a h:mm')}
                    </span>
                  </div>
                  
                  <div className="flex-1 px-4 py-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: primaryColor }}
                      />
                      <span className="text-base font-bold text-slate-800">
                        {event.title}
                      </span>
                    </div>
                    {event.memo && (
                      <p className="text-xs text-gray-500 line-clamp-1 pl-4.5">
                        {event.memo}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
