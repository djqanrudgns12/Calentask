'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useDeleteActivity } from '@/hooks/useCalendarQueries'

export function DeleteConfirmDialog() {
  const { deletingEventId, closeDeleteConfirm } = useCalendarStore()
  const { mutate: deleteActivity, isPending } = useDeleteActivity()

  const handleDelete = () => {
    if (deletingEventId) {
      deleteActivity(deletingEventId, {
        onSuccess: () => {
          closeDeleteConfirm()
        }
      })
    }
  }

  return (
    <Dialog open={!!deletingEventId} onOpenChange={(open) => !open && closeDeleteConfirm()}>
      <DialogContent className="sm:max-w-[400px] border-none shadow-2xl rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">일정 삭제</DialogTitle>
          <DialogDescription className="text-gray-500 pt-2">
            이 일정을 삭제하시겠습니까?<br />
            삭제된 일정은 데이터 허브의 휴지통에서 복원할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={closeDeleteConfirm}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full px-5"
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 shadow-sm shadow-red-200 transition-all active:scale-95"
          >
            {isPending ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
