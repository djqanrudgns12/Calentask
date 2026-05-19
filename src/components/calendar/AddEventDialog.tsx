'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { useCategories, useCreateActivity } from '@/hooks/useCalendarQueries'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { useCalendarStore } from '@/store/useCalendarStore'

export function AddEventDialog({ children }: { children?: React.ReactNode }) {
  const { isAddEventOpen, closeAddEvent, addEventDate, openAddEvent } = useCalendarStore()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  
  // 현재 보고있는 달력을 기준으로 쿼리 갱신을 위해 날짜 범위 계산
  const currentMonthStart = startOfMonth(new Date()).toISOString()
  const currentMonthEnd = endOfMonth(new Date()).toISOString()

  const { data: categories = [] } = useCategories()
  const { mutate: createActivity, isPending } = useCreateActivity(currentMonthStart, currentMonthEnd)

  useEffect(() => {
    if (isAddEventOpen) {
      if (addEventDate) {
        setDate(format(addEventDate, 'yyyy-MM-dd'))
      } else {
        setDate(format(new Date(), 'yyyy-MM-dd'))
      }
    }
  }, [isAddEventOpen, addEventDate])

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 타임존을 강제로 설정하여 정확한 시작 시간을 UTC 기준으로 맞춥니다 (임시)
    const startDate = new Date(date + 'T09:00:00Z')
    const endDate = new Date(date + 'T10:00:00Z')

    createActivity(
      {
        payload: {
          title,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          is_all_day: false,
          type: 'EVENT',
          memo: ''
        },
        categoryIds: selectedCategories
      },
      {
        onSuccess: () => {
          closeAddEvent()
          setTitle('')
          setSelectedCategories([])
        }
      }
    )
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAddEvent()
      setTitle('')
      setSelectedCategories([])
    } else {
      openAddEvent()
    }
  }

  return (
    <Dialog open={isAddEventOpen} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          <div onClick={() => openAddEvent()}>{children}</div>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 일정 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">일정 제목</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="예: 주간 기획 회의"
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">날짜</Label>
            <Input 
              id="date" 
              type="date"
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label>카테고리 (다중 선택 가능)</Label>
            <div className="flex flex-wrap gap-2 pt-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                    selectedCategories.includes(cat.id) 
                      ? 'border-transparent text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    backgroundColor: selectedCategories.includes(cat.id) ? cat.hex_color : undefined
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isPending || !title}>
              {isPending ? '저장 중...' : '일정 저장'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
