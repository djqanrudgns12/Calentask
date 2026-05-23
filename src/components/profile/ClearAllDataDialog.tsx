'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { hardDeleteAllActivities } from '@/app/actions/calendar'
import { useQueryClient } from '@tanstack/react-query'

export function ClearAllDataDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [isDeleting, setIsDeleting] = useState(false)
  const queryClient = useQueryClient()

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setTimeout(() => setStep(1), 300) // Reset step after closing animation
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await hardDeleteAllActivities()
      await queryClient.invalidateQueries({ queryKey: ['activities'] })
      handleOpenChange(false)
    } catch (error) {
      console.error('Failed to delete all data:', error)
      alert('초기화 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* @ts-expect-error DialogTrigger asChild typing issue */}
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full text-sm font-medium border-red-200 flex items-center justify-center text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          전체 내용 초기화
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden bg-white shadow-apple-float border-0">
        <div className="p-6 pb-8">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-6 mx-auto">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>

          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-xl font-bold text-slate-900 mb-2">
              {step === 1 ? '캘린더 전체 초기화' : '최종 경고'}
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 leading-relaxed">
              {step === 1 ? (
                <>
                  등록된 <b>모든 일정과 업로드 이력</b>이 삭제됩니다.<br />
                  이 작업은 영구적이며 되돌릴 수 없습니다.<br />
                  계속하시겠습니까?
                </>
              ) : (
                <>
                  <span className="text-red-600 font-semibold">정말 모든 데이터를 삭제하시겠습니까?</span><br />
                  휴지통에서도 복구할 수 없는 완전히 파괴적인 작업입니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-center">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="w-full sm:w-auto h-12 rounded-xl border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
              disabled={isDeleting}
            >
              취소
            </Button>
            
            {step === 1 ? (
              <Button
                variant="destructive"
                onClick={() => setStep(2)}
                className="w-full sm:w-auto h-12 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                네, 초기화합니다
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto h-12 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 relative"
              >
                {isDeleting ? '삭제 중...' : '영구 삭제'}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
