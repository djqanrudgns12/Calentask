'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useState } from 'react'
import { useAgendaStore } from '@/store/useAgendaStore'
import { useDeleteActivity } from '@/hooks/useCalendarQueries'
import { deleteRecurringActivity } from '@/app/actions/calendar'
import { RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

export function DeleteConfirmDialog() {
  const deletingEventId = useCalendarStore(s => s.deletingEventId)
  const deletingEvent = useCalendarStore(s => s.deletingEvent)
  const closeDeleteConfirm = useCalendarStore(s => s.closeDeleteConfirm)
  const { mutate: deleteActivity, isPending } = useDeleteActivity()
  
  const updateAgendaTask = useAgendaStore(state => state.updateTask)
  const agendaTasks = useAgendaStore(state => state.tasks)
  const [isAgendaDeleting, setIsAgendaDeleting] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'THIS_EVENT' | 'THIS_AND_FOLLOWING' | 'ALL_EVENTS'>('THIS_EVENT')
  const [isRecurringDeleting, setIsRecurringDeleting] = useState(false)

  const isRecurring = deletingEvent && ((deletingEvent as any).recurrence_rule || (deletingEvent as any).parent_activity_id)

  const handleDelete = async () => {
    if (deletingEventId) {
      // 아젠다 일정인지 확인
      const isAgendaTask = agendaTasks.some(t => t.id === deletingEventId)
      
      if (isAgendaTask) {
        setIsAgendaDeleting(true)
        try {
          await updateAgendaTask(deletingEventId, { status: 'trash', is_calendar_registered: false })
          closeDeleteConfirm()
        } finally {
          setIsAgendaDeleting(false)
        }
      } else if (isRecurring) {
        // 반복 일정 삭제
        setIsRecurringDeleting(true)
        try {
          const realId = deletingEventId.includes('_') ? deletingEventId.split('_').slice(0, 5).join('-') : deletingEventId
          const origStartTime = (deletingEvent as any).original_start_time || deletingEvent!.start_time
          await deleteRecurringActivity(realId, deleteMode, origStartTime)
          toast.success(
            deleteMode === 'THIS_EVENT' ? '이 회차만 삭제되었습니다.' :
            deleteMode === 'THIS_AND_FOLLOWING' ? '이후 모든 일정이 삭제되었습니다.' :
            '모든 반복 일정이 삭제되었습니다.'
          )
          closeDeleteConfirm()
        } catch (e: any) {
          toast.error(e.message || '삭제에 실패했습니다.')
        } finally {
          setIsRecurringDeleting(false)
        }
      } else {
        // 일반 캘린더 일정 삭제
        deleteActivity(deletingEventId, {
          onSuccess: () => {
            closeDeleteConfirm()
          }
        })
      }
    }
  }

  const isDeleting = isPending || isAgendaDeleting || isRecurringDeleting

  return (
    <Dialog open={!!deletingEventId} onOpenChange={(open) => { if (!open) { closeDeleteConfirm(); setDeleteMode('THIS_EVENT') } }}>
      <DialogContent className="sm:max-w-[400px] border-none shadow-2xl rounded-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">일정 삭제</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            {isRecurring 
              ? '반복 일정입니다. 삭제 범위를 선택해주세요.'
              : <>이 일정을 삭제하시겠습니까?<br />삭제된 일정은 데이터 허브의 휴지통에서 복원할 수 있습니다.</>
            }
          </DialogDescription>
        </DialogHeader>

        {isRecurring && (
          <div className="flex flex-col gap-2 mt-2">
            {[
              { value: 'THIS_EVENT' as const, label: '이 회차만 삭제', desc: '선택한 일정만 삭제합니다.' },
              { value: 'THIS_AND_FOLLOWING' as const, label: '이후 모든 일정 삭제', desc: '이 일정을 포함해 앞으로의 일정을 삭제합니다.' },
              { value: 'ALL_EVENTS' as const, label: '모든 일정 삭제', desc: '과거와 미래의 모든 반복 일정을 삭제합니다.' }
            ].map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${deleteMode === opt.value ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-red-50/50'}`}>
                <input type="radio" name="deleteMode" value={opt.value} checked={deleteMode === opt.value} onChange={() => setDeleteMode(opt.value)} className="mt-0.5 accent-red-500" />
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                    {opt.value !== 'THIS_EVENT' && <RefreshCcw className="w-3 h-3 text-red-400" />}
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        )}

        <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => { closeDeleteConfirm(); setDeleteMode('THIS_EVENT') }}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full px-5"
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 shadow-sm shadow-red-200 transition-all active:scale-95"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
