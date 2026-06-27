import { useCalendarStore } from '@/store/useCalendarStore'
import { format } from 'date-fns'
import { X, Pencil, Trash2, Clock, AlignLeft, Sparkles } from 'lucide-react'
import { getEventPrimaryColor } from '@/lib/eventColor'
import { useAgendaStore } from '@/store/useAgendaStore'
import { useState } from 'react'
import { forceSyncActivityAction } from '@/app/actions/calendar'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export function EventDetailPopover() {
  const { selectedEventDetail, closeEventDetail, openEditEvent, openDeleteConfirm, setViewMode } = useCalendarStore()
  const openAddDialog = useAgendaStore(state => state.openAddDialog)
  const queryClient = useQueryClient()

  const event = selectedEventDetail
  const primaryColor = event ? getEventPrimaryColor(event) : '#ffffff'
  const [isSyncing, setIsSyncing] = useState(false)

  // 편집 버튼: 팝오버를 먼저 닫고, 편집 모달을 띄움 (모달 겹침 방지)
  const handleEdit = () => {
    if (!event) return
    closeEventDetail()
    openEditEvent(event)
  }

  // 삭제 버튼: 팝오버를 먼저 닫고, 삭제 확인 다이얼로그를 띄움
  const handleDelete = () => {
    if (!event) return
    closeEventDetail()
    openDeleteConfirm(event.id, event)
  }

  // 아젠다로 보내기
  const handleSendToAgenda = () => {
    if (!event) return
    closeEventDetail()
    openAddDialog({
      title: event.title,
      memo: event.memo,
      deadline: event.start_time,
      category_id: event.categories?.[0]?.id || null,
    })
  }

  if (!event) return null

  // 학사일정 시트에서 온 읽기 전용 이벤트 (메인 캘린더 노출분)
  const isAcademic = event.id.startsWith('academic:')

  const handleRetrySync = async () => {
    setIsSyncing(true)
    const toastId = toast.loading('구글 캘린더 연동 중...')
    try {
      const res = await forceSyncActivityAction(event.id)
      if (res.success) {
        toast.success('구글 캘린더에 성공적으로 연동되었습니다!', { id: toastId })
        // 캐시 즉시 업데이트 후 팝오버 닫기
        await queryClient.invalidateQueries({ queryKey: ['activities'] })
        closeEventDetail()
      } else {
        toast.error(`연동 실패: ${res.error}`, { id: toastId })
      }
    } catch (e: any) {
      toast.error('연동 요청 중 오류가 발생했습니다.', { id: toastId })
    } finally {
      setIsSyncing(false)
    }
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

            {/* Sync Status */}
            {!isAcademic && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 48 48" className="w-4 h-4 opacity-70">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                  <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                </svg>
              </div>
              <div className="flex-1 flex items-center justify-between">
                {event.google_event_id ? (
                  <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5">
                    구글 캘린더 연동됨
                  </span>
                ) : (
                  <>
                    <span className="text-sm font-medium text-amber-600 flex items-center gap-1.5">
                      구글 캘린더 미연동
                    </span>
                    <button
                      onClick={handleRetrySync}
                      disabled={isSyncing}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSyncing ? '요청 중...' : '연동 재시도'}
                    </button>
                  </>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Action Footer */}
          {isAcademic ? (
            <div className="flex flex-col gap-2 px-5 py-4 border-t border-border/50 bg-slate-50/50">
              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 px-1">
                <span className="text-teal-500">🎓</span>
                학사일정 시트에서 가져온 항목입니다. 수정/삭제는 데이터 관리에서 하세요.
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => { closeEventDetail(); setViewMode('academic_data') }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Pencil className="w-4 h-4" />
                  데이터 관리로 이동
                </button>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </>
  )
}
