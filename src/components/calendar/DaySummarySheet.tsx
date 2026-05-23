import { useCalendarStore } from '@/store/useCalendarStore'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Activity } from '@/app/actions/calendar'
import { isEventOnDay } from '@/lib/calendarUtils'
import { X, Plus, Calendar } from 'lucide-react'
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
        className="fixed inset-0 z-[60] bg-slate-900/10 backdrop-blur-[2px] transition-opacity"
        onClick={closeDaySummary}
      />
      
      {/* Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] border-t border-white flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full duration-300 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[440px] md:rounded-[2rem] md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] md:border"
      >
        {/* Drag Handle (Mobile) */}
        <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-slate-100/80">
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              {format(selectedDaySummary, 'M월 d일')}
            </h2>
            <span className="text-sm font-bold text-slate-400">
              {format(selectedDaySummary, 'EEEE', { locale: ko })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleAddEvent}
              className="group flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="일정 추가"
            >
              <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={closeDaySummary}
              className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {dayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-50 to-slate-100 border border-slate-100 shadow-inner flex items-center justify-center mb-5">
                <Calendar className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-slate-500 font-semibold mb-1">등록된 일정이 없습니다</p>
              <p className="text-xs text-slate-400 mb-5">새로운 일정을 추가해 하루를 계획해보세요.</p>
              <button 
                onClick={handleAddEvent} 
                className="px-5 py-2.5 bg-slate-900 text-white rounded-full text-sm font-semibold hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                새 일정 추가하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map(event => {
                const primaryColor = getEventPrimaryColor(event)
                
                return (
                  <div 
                    key={event.id}
                    onClick={() => openEventDetail(event)}
                    className="group relative flex items-stretch p-3.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] bg-white overflow-hidden"
                  >
                    {/* Left Color Strip */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1.5" 
                      style={{ backgroundColor: primaryColor }} 
                    />
                    
                    <div className="pl-3 pr-4 flex flex-col justify-center min-w-[75px] border-r border-slate-50">
                      <span className="text-xs font-bold text-slate-400 tracking-wider">
                        {event.is_all_day ? '종일' : format(new Date(event.start_time), 'a h:mm', { locale: ko })}
                      </span>
                    </div>
                    
                    <div className="flex-1 px-4 flex flex-col justify-center">
                      <span className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
                        {event.title}
                      </span>
                      {event.memo && (
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">
                          {event.memo}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
