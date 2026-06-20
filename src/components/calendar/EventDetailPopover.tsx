import { useCalendarStore } from '@/store/useCalendarStore'
import { format } from 'date-fns'
import { X, Pencil, Trash2, Clock, AlignLeft, Sparkles } from 'lucide-react'
import { getEventPrimaryColor } from '@/lib/eventColor'
import { useAgendaStore } from '@/store/useAgendaStore'

export function EventDetailPopover() {
  const { selectedEventDetail, closeEventDetail, openEditEvent, openDeleteConfirm } = useCalendarStore()
  const openAddDialog = useAgendaStore(state => state.openAddDialog)

  if (!selectedEventDetail) return null

  const event = selectedEventDetail
  const primaryColor = getEventPrimaryColor(event)

  // 편집 버튼: 팝오버를 먼저 닫고, 편집 모달을 띄움 (모달 겹침 방지)
  const handleEdit = () => {
    closeEventDetail()
    openEditEvent(event)
  }

  // 삭제 버튼: 팝오버를 먼저 닫고, 삭제 확인 다이얼로그를 띄움
  const handleDelete = () => {
    closeEventDetail()
    openDeleteConfirm(event.id, event)
  }

  // 아젠다로 보내기
  const handleSendToAgenda = () => {
    closeEventDetail()
    openAddDialog({
      title: event.title,
      memo: event.memo,
      deadline: event.start_time,
      category_id: event.categories?.[0]?.id || null,
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[70] bg-slate-900/10 backdrop-blur-[2px] transition-opacity"
        onClick={closeEventDetail}
      />
      
      {/* Popover Container (Centered) */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        {/* Popover Card */}
        <div className="bg-card/95 backdrop-blur-xl rounded-2xl w-full max-w-sm shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-transparent/60 pointer-events-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-3">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-bold text-foreground leading-tight">
                {event.title}
              </h2>
              {/* Category Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {event.categories && event.categories.length > 0 ? (
                  event.categories.map((tag) => (
                    <span 
                      key={tag.id}
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm break-keep"
                      style={{ backgroundColor: tag.hex_color || primaryColor }}
                    >
                      {tag.name}
                    </span>
                  ))
                ) : (
                  <span 
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm uppercase"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {event.type}
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={closeEventDetail}
              className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[15px] font-medium text-foreground">
                  {format(new Date(event.start_time), 'M월 d일 (E)')}
                </span>
                <span className="text-sm text-muted-foreground">
                  {event.is_all_day 
                    ? '종일' 
                    : `${format(new Date(event.start_time), 'a h:mm')} - ${format(new Date(event.end_time), 'a h:mm')}`
                  }
                </span>
              </div>
            </div>

            {/* Memo */}
            {event.memo && (
              <div className="flex items-start gap-3">
                <AlignLeft className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 bg-background rounded-xl p-3">
                  <p className="text-[14px] text-foreground whitespace-pre-wrap leading-relaxed">
                    {event.memo}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex flex-col gap-3 px-5 py-4 border-t border-border/50 bg-slate-50/50">
            <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 px-1">
              <span className="text-amber-500">💡</span>
              세부 입력 폼과 데드라인 등은 아젠다에서 직접 조정해주세요!
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={handleSendToAgenda}
                className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                아젠다로 보내기
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
                <button 
                  onClick={handleEdit}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Pencil className="w-4 h-4" />
                  편집
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
