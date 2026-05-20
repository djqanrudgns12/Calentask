'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { useCategories, useCreateActivity, useCreateCategory, useDeleteCategory } from '@/hooks/useCalendarQueries'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { useCalendarStore } from '@/store/useCalendarStore'

const COLOR_SWATCHES = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // mint
  '#0ea5e9', // light blue
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#64748b', // slate
  '#78716c', // stone
  '#000000', // black
  '#475569'  // dark slate
]

export function AddEventDialog({ children }: { children?: React.ReactNode }) {
  const { isAddEventOpen, closeAddEvent, addEventDate, openAddEvent } = useCalendarStore()
  
  const [title, setTitle] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endTime, setEndTime] = useState('10:00')
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [customColor, setCustomColor] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const currentMonthStart = startOfMonth(new Date()).toISOString()
  const currentMonthEnd = endOfMonth(new Date()).toISOString()

  const { data: categories = [] } = useCategories()
  const { mutate: createActivity, isPending } = useCreateActivity(currentMonthStart, currentMonthEnd)
  const { mutate: createCategory } = useCreateCategory()
  const { mutate: deleteCategory } = useDeleteCategory()

  useEffect(() => {
    if (isAddEventOpen) {
      if (addEventDate) {
        setStartDate(format(addEventDate, 'yyyy-MM-dd'))
        setEndDate(format(addEventDate, 'yyyy-MM-dd'))
      } else {
        const now = new Date()
        setStartDate(format(now, 'yyyy-MM-dd'))
        setEndDate(format(now, 'yyyy-MM-dd'))
      }
      // Set to next hour for default times
      const nextHour = new Date()
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
      setStartTime(format(nextHour, 'HH:mm'))
      nextHour.setHours(nextHour.getHours() + 1)
      setEndTime(format(nextHour, 'HH:mm'))
      
      setTitle('')
      setIsAllDay(false)
      setSelectedCategories([])
      setCustomColor(null)
      setMemo('')
      setIsAddingCategory(false)
      setNewCategoryName('')
    }
  }, [isAddEventOpen, addEventDate])

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => {
      const newCats = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
      if (newCats.length === 0) setCustomColor(null) // Reset color if no categories
      return newCats
    })
  }

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCategoryName.trim()) {
      // 랜덤 색상 혹은 지정된 기본 색상 할당 (예: 파란색 계열)
      createCategory({ name: newCategoryName.trim(), hexColor: '#4f46e5' })
      setNewCategoryName('')
      setIsAddingCategory(false)
    }
  }

  const handleDeleteCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteCategory(id)
    setSelectedCategories(prev => prev.filter(c => c !== id))
  }

  const getGradient = () => {
    if (customColor) return `linear-gradient(to right, ${customColor}, ${customColor})`
    if (selectedCategories.length === 0) return 'linear-gradient(to right, #e2e8f0, #e2e8f0)'
    
    const colors = selectedCategories.map(id => {
      const cat = categories.find(c => c.id === id)
      return cat?.hex_color || '#4f46e5'
    })
    
    if (colors.length === 1) return `linear-gradient(to right, ${colors[0]}, ${colors[0]})`
    
    const step = 100 / colors.length
    const stops = colors.map((c, i) => `${c} ${i * step}%, ${c} ${(i + 1) * step}%`)
    return `linear-gradient(to right, ${stops.join(', ')})`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const startObj = isAllDay ? new Date(`${startDate}T00:00:00`) : new Date(`${startDate}T${startTime}:00`)
    const endObj = isAllDay ? new Date(`${startDate}T23:59:59`) : new Date(`${endDate}T${endTime}:00`)

    // Extract final color logic
    let finalHex = customColor
    if (!finalHex && selectedCategories.length === 1) {
      finalHex = categories.find(c => c.id === selectedCategories[0])?.hex_color || null
    }

    createActivity(
      {
        payload: {
          title,
          start_time: startObj.toISOString(),
          end_time: endObj.toISOString(),
          is_all_day: isAllDay,
          type: 'EVENT',
          memo,
          hex_color: finalHex
        },
        categoryIds: selectedCategories
      },
      {
        onSuccess: () => {
          closeAddEvent()
        }
      }
    )
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAddEvent()
    } else {
      openAddEvent()
    }
  }

  return (
    <Dialog open={isAddEventOpen} onOpenChange={handleOpenChange}>
      {children && (
        <div onClick={() => openAddEvent()}>{children}</div>
      )}
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-[#f8f9ff] border-none shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-white">
          <DialogTitle className="text-xl font-bold text-gray-900">새 일정 추가</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Title */}
          <div>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="일정 제목"
              className="border-gray-200 focus-visible:ring-indigo-500 rounded-lg bg-white h-12 text-base"
              required 
            />
          </div>
          
          {/* Time block */}
          <div className="bg-white/50 rounded-xl p-4 space-y-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-gray-600 font-medium text-sm">하루 종일</Label>
              <button 
                type="button" 
                onClick={() => setIsAllDay(!isAllDay)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${isAllDay ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform absolute ${isAllDay ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-500 text-xs pl-1">시작</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                      className="pl-9 bg-white border-gray-200 focus-visible:ring-indigo-500"
                      required
                    />
                  </div>
                  {!isAllDay && (
                    <div className="relative flex-1">
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        type="time" 
                        value={startTime} 
                        onChange={e => setStartTime(e.target.value)}
                        className="pl-9 bg-white border-gray-200 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex flex-col gap-1.5 transition-all duration-200 ${isAllDay ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <Label className="text-gray-500 text-xs pl-1">종료</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      className={`pl-9 border-gray-200 focus-visible:ring-indigo-500 ${isAllDay ? 'bg-gray-100 text-gray-500 border-gray-300' : 'bg-white'}`}
                      required={!isAllDay}
                      disabled={isAllDay}
                    />
                  </div>
                  {!isAllDay && (
                    <div className="relative flex-1">
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        type="time" 
                        value={endTime} 
                        onChange={e => setEndTime(e.target.value)}
                        className="pl-9 bg-white border-gray-200 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Categories block */}
          <div className="space-y-2">
            <Label className="text-gray-600 font-medium text-sm pl-1">카테고리</Label>
            <div className="flex flex-wrap items-center gap-2">
              {categories.map(cat => {
                const isSelected = selectedCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 shadow-sm
                      ${isSelected 
                        ? 'bg-[#4f46e5] text-white border-transparent' 
                        : 'bg-[#dae2fd] text-[#5c647a] border-transparent hover:bg-indigo-100'
                      }`}
                  >
                    {cat.name}
                    {isSelected ? (
                      <X className="w-3.5 h-3.5" />
                    ) : (
                      !cat.is_default && (
                        <div
                          className="hover:bg-red-200 p-0.5 rounded-full text-red-500 transition-colors"
                          onClick={(e) => handleDeleteCategory(e, cat.id)}
                        >
                          <X className="w-3 h-3" />
                        </div>
                      )
                    )}
                  </button>
                )
              })}
              
              {isAddingCategory ? (
                <div className="flex items-center gap-1">
                  <Input 
                    autoFocus
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-28 h-8 text-sm rounded-full px-3 bg-white border-indigo-200"
                    placeholder="이름..."
                  />
                  <Button type="button" size="sm" className="h-8 rounded-full px-3 bg-indigo-600" onClick={handleAddCategorySubmit}>추가</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-2" onClick={() => setIsAddingCategory(false)}><X className="w-4 h-4"/></Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="px-3.5 py-1.5 text-sm font-medium rounded-full border border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-1 bg-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Colors block */}
          <div className="bg-white/60 rounded-xl p-4 border border-gray-100 shadow-sm space-y-4">
            <div 
              className="h-2.5 w-full rounded-full" 
              style={{ background: getGradient() }} 
            />
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 font-medium">색상 지정:</span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {COLOR_SWATCHES.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCustomColor(color === customColor ? null : color)}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${customColor === color ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Memo block */}
          <div className="space-y-2">
            <Label className="text-gray-600 font-medium text-sm pl-1">메모</Label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="일정에 대한 상세 내용을 입력하세요..."
              className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-between items-center bg-white -mx-6 -mb-5 px-6 py-4 border-t border-gray-100 rounded-b-2xl">
            <div /> {/* Spacer */}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="border-gray-200 text-gray-700 font-medium" onClick={() => closeAddEvent()}>
                취소
              </Button>
              <Button type="submit" className="bg-[#4f46e5] hover:bg-indigo-700 text-white font-medium" disabled={isPending || !title}>
                {isPending ? '저장 중...' : '일정 저장'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
