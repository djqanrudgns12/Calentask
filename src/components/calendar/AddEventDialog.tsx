/* eslint-disable react-hooks/set-state-in-effect */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Calendar as CalendarIcon, Clock, Pencil, Zap } from 'lucide-react'
import { useCategories, useCreateActivity, useUpdateActivity, useCreateCategory, useDeleteCategory } from '@/hooks/useCalendarQueries'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle } from '@/components/ui/popover'
import { useActivityTemplates } from '@/hooks/useInsightsQueries'
import type { ActivityTemplate } from '@/app/actions/insights'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useAgendaStore } from '@/store/useAgendaStore'

/**
 * 모바일 키보드가 올라올 때 visualViewport를 감지하여
 * 다이얼로그의 최대 높이를 동적으로 조정하는 커스텀 훅.
 * iOS Safari는 dvh 단위가 키보드를 고려하지 않으므로 JS로 보완해야 함.
 */
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

      // visualViewport.height는 키보드가 올라오면 줄어든 실제 보이는 영역 높이
      const viewportHeight = vv.height
      // 모달의 최대 높이를 보이는 영역의 90%로 제한
      const maxH = viewportHeight * 0.9
      el.style.maxHeight = `${maxH}px`
      // 키보드가 올라오면 모달을 뷰포트 중앙으로 재배치
      // visualViewport.offsetTop은 주소표시줄 등으로 인한 오프셋
      const centerY = vv.offsetTop + viewportHeight / 2
      el.style.top = `${centerY}px`
    }

    // 초기 한번 실행 + resize 이벤트 구독
    handleResize()
    vv.addEventListener('resize', handleResize)
    vv.addEventListener('scroll', handleResize)

    return () => {
      vv.removeEventListener('resize', handleResize)
      vv.removeEventListener('scroll', handleResize)
      // 정리: 스타일 초기화
      if (el) {
        el.style.maxHeight = ''
        el.style.top = ''
      }
    }
  }, [isOpen])

  // 포커스된 input이 스크롤 영역 내에서 보이도록 스크롤
  const handleFocusScroll = useCallback((e: React.FocusEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // 약간의 딜레이를 줘야 키보드가 올라온 후 정확한 위치로 스크롤됨
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [])

  return { dialogRef, scrollRef, handleFocusScroll }
}

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
  const { isAddEventOpen, closeAddEvent, addEventDate, prefillEventData, prefillAgendaTaskId, openAddEvent, editingEvent, openEditCategory } = useCalendarStore()
  const { dialogRef, scrollRef, handleFocusScroll } = useKeyboardAwareDialog(isAddEventOpen)
  
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
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)
  const [templateId, setTemplateId] = useState<string | null>(null)

  const currentMonthStart = startOfMonth(new Date()).toISOString()
  const currentMonthEnd = endOfMonth(new Date()).toISOString()

  useEffect(() => {
    if (isAllDay) {
      if (startDate > endDate) {
        setEndDate(startDate)
      }
    } else {
      const startObj = new Date(`${startDate}T${startTime}:00`)
      const endObj = new Date(`${endDate}T${endTime}:00`)
      
      if (startObj.getTime() >= endObj.getTime()) {
        const newEndObj = new Date(startObj.getTime() + 60 * 60 * 1000) // +1 hour
        setEndDate(format(newEndObj, 'yyyy-MM-dd'))
        setEndTime(format(newEndObj, 'HH:mm'))
      }
    }
  }, [startDate, startTime, endDate, endTime, isAllDay])

  const { data: categories = [] } = useCategories()
  const { data: templates = [] } = useActivityTemplates()
  const { mutate: createActivity, isPending: isCreating } = useCreateActivity(currentMonthStart, currentMonthEnd)
  const { mutate: updateActivity, isPending: isUpdating } = useUpdateActivity(currentMonthStart, currentMonthEnd)
  const { mutate: createCategory } = useCreateCategory()
  const { mutate: deleteCategory } = useDeleteCategory()

  useEffect(() => {
    if (isAddEventOpen) {
      if (editingEvent) {
        // 수정 모드 초기화
        const startObj = parseISO(editingEvent.start_time)
        const endObj = parseISO(editingEvent.end_time)
        setStartDate(format(startObj, 'yyyy-MM-dd'))
        setStartTime(format(startObj, 'HH:mm'))
        setEndDate(format(endObj, 'yyyy-MM-dd'))
        setEndTime(format(endObj, 'HH:mm'))
        setTitle(editingEvent.title)
        setIsAllDay(editingEvent.is_all_day)
        setSelectedCategories(editingEvent.categories?.map(c => c.id) || [])
        setCustomColor(editingEvent.hex_color)
        setMemo(editingEvent.memo || '')
        setTemplateId(editingEvent.template_id || null)
        setIsAddingCategory(false)
        setNewCategoryName('')
      } else {
        // 생성 모드 초기화
        let initStartObj: Date | null = null
        let initEndObj: Date | null = null
        
        if (prefillEventData?.start_time) {
          initStartObj = new Date(prefillEventData.start_time)
          initEndObj = new Date(initStartObj.getTime() + 60 * 60 * 1000) // add 1 hour
        } else if (addEventDate) {
          initStartObj = addEventDate
          initEndObj = addEventDate
        }

        if (initStartObj && initEndObj) {
          setStartDate(format(initStartObj, 'yyyy-MM-dd'))
          setEndDate(format(initEndObj, 'yyyy-MM-dd'))
          setStartTime(format(initStartObj, 'HH:mm'))
          setEndTime(format(initEndObj, 'HH:mm'))
        } else {
          const now = new Date()
          setStartDate(format(now, 'yyyy-MM-dd'))
          setEndDate(format(now, 'yyyy-MM-dd'))
          const nextHour = new Date()
          nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
          setStartTime(format(nextHour, 'HH:mm'))
          nextHour.setHours(nextHour.getHours() + 1)
          setEndTime(format(nextHour, 'HH:mm'))
        }
        
        setTitle(prefillEventData?.title || '')
        setIsAllDay(false)
        setSelectedCategories((prefillEventData as any)?.category_ids || [])
        setCustomColor(null)
        setMemo(prefillEventData?.memo || '')
        setTemplateId(null)
        setIsAddingCategory(false)
        setNewCategoryName('')
        setIsTemplateOpen(false)
      }
    }
  }, [isAddEventOpen, addEventDate, prefillEventData, editingEvent])

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

      createCategory({ name: newCategoryName.trim(), hexColor: newColor })
      setNewCategoryName('')
      setIsAddingCategory(false)
    }
  }

  const handleDeleteCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm('정말 이 카테고리를 삭제하시겠습니까? 관련 일정에서 이 카테고리 지정이 해제됩니다.')) return
    deleteCategory(id)
    setSelectedCategories(prev => prev.filter(c => c !== id))
  }

  const handleLoadTemplate = (template: ActivityTemplate) => {
    setTitle(template.title)
    // 복수 카테고리 지원
    const catIds = template.category_ids && template.category_ids.length > 0 
      ? template.category_ids 
      : (template.category_id ? [template.category_id] : [])
    setSelectedCategories(catIds)
    setCustomColor(template.hex_color || null)
    setMemo(template.memo || '')
    setTemplateId(template.id)
    
    if (!isAllDay) {
       // 템플릿에 기본 시작 시각이 있으면 적용 (날짜는 유지)
       const effectiveStartTime = template.default_start_time || startTime
       if (template.default_start_time) {
         setStartTime(template.default_start_time)
       }
       const startObj = new Date(`${startDate}T${effectiveStartTime}:00`)
       const duration = template.duration_minutes || 60
       const newEndObj = new Date(startObj.getTime() + duration * 60000)
       setEndDate(format(newEndObj, 'yyyy-MM-dd'))
       setEndTime(format(newEndObj, 'HH:mm'))
    }
    setIsTemplateOpen(false)
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

    if (startObj.getTime() >= endObj.getTime()) {
      alert('종료 시간은 시작 시간보다 이후여야 합니다.')
      return
    }

    // Extract final color logic
    // customColor가 있으면 → 사용자가 팔레트에서 직접 지정한 것이므로 그대로 저장
    // customColor가 null이면 → hex_color를 null로 저장하여 런타임에서 카테고리 최신 색상을 따르게 함
    const finalHex = customColor

    const payloadData = {
      title,
      start_time: startObj.toISOString(),
      end_time: endObj.toISOString(),
      is_all_day: isAllDay,
      type: 'EVENT' as const,
      memo,
      hex_color: finalHex,
      template_id: templateId
    }

    if (editingEvent) {
      updateActivity(
        {
          id: editingEvent.id,
          payload: payloadData,
          categoryIds: selectedCategories
        },
        {
          onSuccess: () => {
            closeAddEvent()
          }
        }
      )
    } else {
      createActivity(
        {
          payload: payloadData,
          categoryIds: selectedCategories
        },
        {
          onSuccess: () => {
            if (prefillAgendaTaskId) {
              useAgendaStore.getState().updateTask(prefillAgendaTaskId, { is_calendar_registered: true })
            }
            closeAddEvent()
          }
        }
      )
    }
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
      <DialogContent ref={dialogRef} className="w-[95vw] max-w-[440px] sm:max-w-[440px] p-0 overflow-hidden bg-[#f8f9ff] border-none shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-white flex flex-row items-center justify-between pr-10">
          <DialogTitle className="text-xl font-bold text-gray-900">{editingEvent ? '일정 수정' : '새 일정 추가'}</DialogTitle>
          <div className="flex items-center">
            <Popover open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
              <PopoverTrigger render={<button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors" />}>
                <Zap className="w-3.5 h-3.5" />
                템플릿
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2 shadow-xl border-gray-100 rounded-2xl bg-white z-[110]">
                <PopoverHeader className="px-2 py-2 mb-1 border-b border-gray-50">
                  <PopoverTitle className="text-sm font-bold text-gray-700">템플릿 불러오기</PopoverTitle>
                </PopoverHeader>
                <div className="max-h-[240px] overflow-y-auto space-y-1">
                  {templates.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-400">
                      등록된 템플릿이 없습니다.
                    </div>
                  ) : (
                    templates.map(template => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleLoadTemplate(template)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors group text-left"
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: template.hex_color || '#4f46e5' }} />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700 truncate">{template.title}</span>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">{template.duration_minutes}분</span>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <DialogDescription className="sr-only">{editingEvent ? '일정을 수정합니다.' : '새로운 일정을 추가하기 위한 모달입니다. 아래 양식을 채워주세요.'}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          {/* 스크롤 가능한 콘텐츠 영역 - min-h-0이 flex 자식의 overflow 활성화에 필수 */}
          <div ref={scrollRef} onFocusCapture={handleFocusScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 pb-6 -webkit-overflow-scrolling-touch">
            <div className="space-y-6">
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
                  <div key={cat.id} className="relative group/cat flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 shadow-sm text-white border-2
                        ${isSelected ? 'border-white ring-2 ring-indigo-300' : 'border-transparent opacity-85 hover:opacity-100'}`}
                      style={{ backgroundColor: cat.hex_color || '#4f46e5', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {cat.name}
                      {isSelected && <X className="w-3.5 h-3.5" />}
                    </button>
                    
                    {/* Hover Actions */}
                    <div className="absolute -top-2 -right-2 hidden group-hover/cat:flex items-center gap-0.5 bg-white shadow-md rounded-full px-1 py-0.5 z-10 border border-gray-100">
                      <div
                        className="cursor-pointer hover:bg-gray-100 p-0.5 rounded-full text-indigo-500 transition-colors"
                        onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }}
                      >
                        <Pencil className="w-3 h-3" />
                      </div>
                      {!cat.is_default && (
                        <div
                          className="cursor-pointer hover:bg-red-100 p-0.5 rounded-full text-red-500 transition-colors"
                          onClick={(e) => handleDeleteCategory(e, cat.id)}
                        >
                          <X className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
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

          </div>
          </div>
          
          {/* Actions */}
          {/* 하단 버튼 - 항상 보이도록 shrink 방지 */}
          <div className="flex-shrink-0 flex justify-between items-center bg-white px-6 py-3 border-t border-gray-100">
            <div /> {/* Spacer */}
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={closeAddEvent} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full px-5">
                취소
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="bg-indigo-400 hover:bg-indigo-500 text-white rounded-full px-6 shadow-sm shadow-indigo-200 transition-all active:scale-95">
                {isCreating || isUpdating ? '저장 중...' : (editingEvent ? '수정 완료' : '일정 저장')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
