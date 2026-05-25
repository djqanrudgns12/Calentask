'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateActivityFromTemplate } from '@/hooks/useInsightsQueries'
import type { ActivityTemplate } from '@/app/actions/insights'
import { format, parseISO } from 'date-fns'

interface SmartQuickAdjustPopupProps {
  isOpen: boolean
  onClose: () => void
  template: ActivityTemplate | null
  onSuccess?: () => void
}

export function SmartQuickAdjustPopup({ isOpen, onClose, template, onSuccess }: SmartQuickAdjustPopupProps) {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  
  // 현재 시간에서 가장 가까운 10분 단위로 올림/내림 (깔끔한 UI를 위해)
  const getRoundedNow = () => {
    const now = new Date()
    const minutes = Math.ceil(now.getMinutes() / 10) * 10
    now.setMinutes(minutes)
    return format(now, 'HH:mm')
  }
  
  const [startTime, setStartTime] = useState(getRoundedNow())
  const [durationMinutes, setDurationMinutes] = useState<number>(60)

  const { mutate: createActivity, isPending } = useCreateActivityFromTemplate()

  useEffect(() => {
    if (isOpen && template) {
      setStartDate(format(new Date(), 'yyyy-MM-dd'))
      setStartTime(getRoundedNow())
      setDurationMinutes(template.duration_minutes || 60)
    }
  }, [isOpen, template])

  const adjustDuration = (amount: number) => {
    setDurationMinutes(prev => Math.max(0, prev + amount))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!template) return

    const customDate = new Date(`${startDate}T${startTime}:00`)

    createActivity(
      { templateId: template.id, customDate, durationMinutes },
      {
        onSuccess: () => {
          onSuccess?.()
          onClose()
        }
      }
    )
  }

  if (!template) return null

  const hexColor = template.hex_color || '#4f46e5'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden bg-[#f8f9ff] border-none shadow-2xl rounded-3xl flex flex-col z-[110]">
        <DialogHeader className="px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hexColor }} />
            <DialogTitle className="text-lg font-bold text-gray-900">{template.title}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">빠른 일정 캘린더 추가</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-gray-500 text-xs pl-1">진행 일자</Label>
              <Input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-white border-gray-200 focus-visible:ring-indigo-500 rounded-xl"
                required
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-gray-500 text-xs pl-1">시작 시각</Label>
              <Input 
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="bg-white border-gray-200 focus-visible:ring-indigo-500 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm space-y-2 text-center">
            <Label className="text-gray-500 text-xs block text-left pl-1">소요 시간</Label>
            <div className="flex items-center justify-center gap-3">
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-full border-gray-200 text-gray-500 shrink-0" onClick={() => adjustDuration(-15)}>
                -15
              </Button>
              <div className="flex items-center gap-1">
                <Input 
                  type="number"
                  value={durationMinutes || ''}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                  className="w-20 text-center font-bold text-xl h-10 border-gray-200 focus-visible:ring-indigo-500 bg-gray-50/50 p-0"
                />
                <span className="text-gray-500 font-medium text-sm">분</span>
              </div>
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-full border-gray-200 text-gray-500 shrink-0" onClick={() => adjustDuration(15)}>
                +15
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isPending} 
            className="w-full text-white rounded-xl h-12 shadow-sm transition-all active:scale-95 font-bold text-[15px]"
            style={{ backgroundColor: hexColor, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {isPending ? '추가 중...' : '✅ 캘린더에 추가하기'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
