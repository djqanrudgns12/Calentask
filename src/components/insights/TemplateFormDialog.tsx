'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Pencil, Clock, Plus } from 'lucide-react'
import { useCategories, useCreateCategory } from '@/hooks/useCalendarQueries'
import { useCreateTemplate, useUpdateTemplate } from '@/hooks/useInsightsQueries'
import type { ActivityTemplate } from '@/app/actions/insights'

const COLOR_SWATCHES = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1',
  '#a855f7', '#ec4899', '#f43f5e', '#84cc16', '#10b981', '#06b6d4', '#8b5cf6', '#d946ef',
  '#64748b', '#78716c', '#000000', '#475569'
]

function useKeyboardAwareDialog(isOpen: boolean) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const vv = window.visualViewport
    if (!vv) return
    const el = dialogRef.current
    const handleResize = () => {
      if (!el) return
      const viewportHeight = vv.height
      const maxH = viewportHeight * 0.9
      el.style.maxHeight = `${maxH}px`
      const centerY = vv.offsetTop + viewportHeight / 2
      el.style.top = `${centerY}px`
    }
    handleResize()
    vv.addEventListener('resize', handleResize)
    vv.addEventListener('scroll', handleResize)
    return () => {
      vv.removeEventListener('resize', handleResize)
      vv.removeEventListener('scroll', handleResize)
      if (el) { el.style.maxHeight = ''; el.style.top = '' }
    }
  }, [isOpen])

  const handleFocusScroll = useCallback((e: React.FocusEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      setTimeout(() => { target.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300)
    }
  }, [])

  return { dialogRef, scrollRef, handleFocusScroll }
}

interface TemplateFormDialogProps {
  isOpen: boolean
  onClose: () => void
  editingTemplate?: ActivityTemplate | null
}

export function TemplateFormDialog({ isOpen, onClose, editingTemplate }: TemplateFormDialogProps) {
  const { dialogRef, scrollRef, handleFocusScroll } = useKeyboardAwareDialog(isOpen)
  
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [durationMinutes, setDurationMinutes] = useState<number>(60)
  const [customColor, setCustomColor] = useState<string | null>(null)
  const [memo, setMemo] = useState('')

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const { data: allCategories = [] } = useCategories()
  // 시스템 가상 카테고리(기념일 등)는 DB에 실제로 없으므로 템플릿 폼에서 제외
  const categories = allCategories.filter(c => c.user_id !== 'system')
  const { mutate: createCategory } = useCreateCategory()
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate()
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate()

  useEffect(() => {
    if (isOpen) {
      if (editingTemplate) {
        setTitle(editingTemplate.title)
        setCategoryId(editingTemplate.category_id)
        setDurationMinutes(editingTemplate.duration_minutes)
        setCustomColor(editingTemplate.hex_color || null)
        setMemo(editingTemplate.memo || '')
      } else {
        setTitle('')
        setCategoryId('')
        setDurationMinutes(60)
        setCustomColor(null)
        setMemo('')
      }
    }
  }, [isOpen, editingTemplate])

  const getGradient = () => {
    if (customColor) return `linear-gradient(to right, ${customColor}, ${customColor})`
    if (!categoryId) return 'linear-gradient(to right, #e2e8f0, #e2e8f0)'
    const catColor = categories.find(c => c.id === categoryId)?.hex_color || '#4f46e5'
    return `linear-gradient(to right, ${catColor}, ${catColor})`
  }

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCategoryName.trim()) {
      const isNameDuplicate = categories.some(c => c.name === newCategoryName.trim())
      if (isNameDuplicate) {
        alert('이미 존재하는 카테고리 이름입니다.')
        return
      }

      let newColor = '#4f46e5'
      const usedColors = categories.map(c => c.hex_color)
      const availableColors = COLOR_SWATCHES.filter(c => !usedColors.includes(c))
      
      if (availableColors.length > 0) {
        newColor = availableColors[0]
      } else {
        if (!window.confirm('기존 카테고리와 색상이 중복되었는데 이대로 등록할까요?')) {
          return
        }
      }

      createCategory({ name: newCategoryName.trim(), hexColor: newColor }, {
        onSuccess: (data) => {
          if (data) {
            setCategoryId(data.id)
          }
          setIsAddingCategory(false)
          setNewCategoryName('')
        }
      })
    }
  }

  const adjustDuration = (amount: number) => {
    setDurationMinutes(prev => Math.max(0, prev + amount))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId) {
      alert('카테고리를 선택해주세요.')
      return
    }

    const payload = {
      title,
      category_id: categoryId,
      duration_minutes: durationMinutes,
      hex_color: customColor || undefined,
      memo: memo || undefined
    }

    if (editingTemplate) {
      updateTemplate(
        { id: editingTemplate.id, payload },
        { 
          onSuccess: onClose,
          onError: (err) => alert(`템플릿 수정에 실패했습니다: ${err.message}`)
        }
      )
    } else {
      createTemplate(payload, { 
        onSuccess: onClose,
        onError: (err) => alert(`템플릿 저장에 실패했습니다: ${err.message}`)
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent ref={dialogRef} className="sm:max-w-[440px] p-0 overflow-hidden bg-[#f8f9ff] border-none shadow-2xl rounded-2xl flex flex-col z-[100]">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-white">
          <DialogTitle className="text-xl font-bold text-gray-900">{editingTemplate ? '템플릿 수정' : '새 템플릿 만들기'}</DialogTitle>
          <DialogDescription className="sr-only">일정 등록 템플릿 폼</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div ref={scrollRef} onFocusCapture={handleFocusScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 pb-6 -webkit-overflow-scrolling-touch">
            <div className="space-y-6">
              
              {/* Title */}
              <div>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="템플릿 이름 (예: 기초학력 강사)"
                  className="border-gray-200 focus-visible:ring-indigo-500 rounded-lg bg-white h-12 text-base font-semibold"
                  required 
                />
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium text-sm pl-1">카테고리 선택</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {categories.map(cat => {
                    const isSelected = categoryId === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 shadow-sm text-white border-2
                          ${isSelected ? 'border-white ring-2 ring-indigo-300' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        style={{ backgroundColor: cat.hex_color || '#4f46e5', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                      >
                        {cat.name}
                        {isSelected && <X className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                  
                  {isAddingCategory ? (
                    <div className="flex items-center gap-1">
                      <Input 
                        autoFocus
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCategorySubmit(e as any)
                          }
                        }}
                        className="w-28 h-8 text-sm rounded-full px-3 bg-white border-indigo-200 focus-visible:ring-indigo-500"
                        placeholder="이름..."
                      />
                      <Button type="button" size="sm" className="h-8 rounded-full px-3 bg-indigo-600 hover:bg-indigo-700" onClick={handleAddCategorySubmit}>추가</Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-2 text-gray-500 hover:text-gray-700" onClick={() => setIsAddingCategory(false)}><X className="w-4 h-4"/></Button>
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

              {/* Colors */}
              <div className="bg-white/60 rounded-xl p-4 border border-gray-100 shadow-sm space-y-4">
                <div className="h-2.5 w-full rounded-full" style={{ background: getGradient() }} />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-medium text-center shrink-0 leading-tight">색상<br/>지정:</span>
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

              {/* Duration Setting */}
              <div className="bg-white/60 rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
                <Label className="text-gray-600 font-medium text-sm">기본 소요시간</Label>
                <div className="flex items-center justify-center gap-4 bg-white p-3 rounded-lg border border-gray-100">
                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-full border-gray-200 text-gray-500" onClick={() => adjustDuration(-15)}>
                    -15
                  </Button>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number"
                      value={durationMinutes || ''}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                      className="w-20 text-center font-bold text-lg h-10 border-gray-200 focus-visible:ring-indigo-500"
                    />
                    <span className="text-gray-500 font-medium">분</span>
                  </div>
                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-full border-gray-200 text-gray-500" onClick={() => adjustDuration(15)}>
                    +15
                  </Button>
                </div>
              </div>

              {/* Memo */}
              <div className="space-y-2">
                <Label className="text-gray-600 font-medium text-sm pl-1">메모 (선택)</Label>
                <textarea
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder="일정에 대한 상세 내용을 입력하세요..."
                  className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

            </div>
          </div>
          
          <div className="flex-shrink-0 flex justify-end gap-3 bg-white px-6 py-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-500 hover:bg-gray-100 rounded-full px-5">취소</Button>
            <Button type="submit" disabled={isCreating || isUpdating} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-6 shadow-sm shadow-indigo-200 transition-all active:scale-95">
              {isCreating || isUpdating ? '저장 중...' : (editingTemplate ? '수정 완료' : '템플릿 저장')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
