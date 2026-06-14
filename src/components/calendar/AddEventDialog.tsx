/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Calendar as CalendarIcon, Pencil, Zap, Link as LinkIcon, Image as ImageIcon, FileText, Paperclip } from 'lucide-react'
import { useCategories, useCreateActivity, useUpdateActivity, useCreateCategory, useDeleteCategory } from '@/hooks/useCalendarQueries'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle } from '@/components/ui/popover'
import { useActivityTemplates } from '@/hooks/useInsightsQueries'
import type { ActivityTemplate } from '@/app/actions/insights'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useAgendaStore } from '@/store/useAgendaStore'
import { TimeSelect } from '@/components/ui/TimeSelect'

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
      const maxH = viewportHeight * 0.95
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
      if (el) {
        el.style.maxHeight = ''
        el.style.top = ''
      }
    }
  }, [isOpen])

  const handleFocusScroll = useCallback((e: React.FocusEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [])

  return { dialogRef, scrollRef, handleFocusScroll }
}

const COLOR_SWATCHES = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1',
  '#a855f7', '#ec4899', '#f43f5e', '#84cc16', '#10b981', '#06b6d4', '#8b5cf6', '#d946ef',
  '#64748b', '#78716c', '#000000', '#475569'
]

type Attachment = {
  id: string
  type: 'link' | 'image' | 'file'
  url: string
  name: string
}

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
  const [attachments, setAttachments] = useState<Attachment[]>([])
  
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)
  const [templateId, setTemplateId] = useState<string | null>(null)

  const currentMonthStart = startOfMonth(new Date()).toISOString()
  const currentMonthEnd = endOfMonth(new Date()).toISOString()

  useEffect(() => {
    if (isAllDay) {
      if (startDate > endDate) setEndDate(startDate)
    } else {
      const startObj = new Date(`${startDate}T${startTime}:00`)
      const endObj = new Date(`${endDate}T${endTime}:00`)
      
      if (startObj.getTime() >= endObj.getTime()) {
        const newEndObj = new Date(startObj.getTime() + 60 * 60 * 1000)
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
        setAttachments((editingEvent as any).attachments || [])
        setIsAddingCategory(false)
        setNewCategoryName('')
      } else {
        let initStartObj: Date | null = null
        let initEndObj: Date | null = null
        
        if (prefillEventData?.start_time) {
          initStartObj = new Date(prefillEventData.start_time)
          initEndObj = new Date(initStartObj.getTime() + 60 * 60 * 1000)
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
        setAttachments([])
        setIsAddingCategory(false)
        setNewCategoryName('')
        setIsTemplateOpen(false)
      }
    }
  }, [isAddEventOpen, addEventDate, prefillEventData, editingEvent])

  const handleStartTimeChange = (newStartTime: string) => {
    if (isAllDay) {
      setStartTime(newStartTime)
      return
    }
    const startObj = new Date(`${startDate}T${newStartTime}:00`)
    const prevStartObj = new Date(`${startDate}T${startTime}:00`)
    const endObj = new Date(`${endDate}T${endTime}:00`)
    const duration = endObj.getTime() - prevStartObj.getTime()
    
    setStartTime(newStartTime)
    if (duration > 0 && duration < 24 * 60 * 60 * 1000 * 365) {
      const newEndObj = new Date(startObj.getTime() + duration)
      setEndDate(format(newEndObj, 'yyyy-MM-dd'))
      setEndTime(format(newEndObj, 'HH:mm'))
    }
  }

  const applyQuickDuration = (minutes: number) => {
    const startObj = new Date(`${startDate}T${startTime}:00`)
    const newEndObj = new Date(startObj.getTime() + minutes * 60 * 1000)
    setEndDate(format(newEndObj, 'yyyy-MM-dd'))
    setEndTime(format(newEndObj, 'HH:mm'))
  }

  const currentDurationMinutes = Math.round((new Date(`${endDate}T${endTime}:00`).getTime() - new Date(`${startDate}T${startTime}:00`).getTime()) / 60000)

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => {
      const newCats = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
      if (newCats.length === 0) setCustomColor(null)
      return newCats
    })
  }

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCategoryName.trim()) {
      const isNameDuplicate = categories.some(c => c.name === newCategoryName.trim())
      if (isNameDuplicate) return alert('이미 존재하는 카테고리 이름입니다.')

      let newColor = '#007AFF'
      const usedColors = categories.map(c => c.hex_color)
      const availableColors = COLOR_SWATCHES.filter(c => !usedColors.includes(c))
      if (availableColors.length > 0) newColor = availableColors[0]
      
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
    const catIds = template.category_ids && template.category_ids.length > 0 ? template.category_ids : (template.category_id ? [template.category_id] : [])
    setSelectedCategories(catIds)
    setCustomColor(template.hex_color || null)
    setMemo(template.memo || '')
    setTemplateId(template.id)
    
    if (!isAllDay) {
       const effectiveStartTime = template.default_start_time || startTime
       if (template.default_start_time) setStartTime(template.default_start_time)
       const startObj = new Date(`${startDate}T${effectiveStartTime}:00`)
       const duration = template.duration_minutes || 60
       const newEndObj = new Date(startObj.getTime() + duration * 60000)
       setEndDate(format(newEndObj, 'yyyy-MM-dd'))
       setEndTime(format(newEndObj, 'HH:mm'))
    }
    setIsTemplateOpen(false)
  }

  const handleAddAttachment = () => {
    const url = prompt('파일, 이미지 또는 링크 URL을 입력하세요 (http://...)')
    if (url) {
      const name = prompt('첨부 이름을 입력하세요', '새 첨부파일') || '첨부파일'
      let type: 'link' | 'image' | 'file' = 'link'
      if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) type = 'image'
      else if (url.match(/\.(pdf|doc|docx|xls|xlsx|txt)$/i)) type = 'file'
      
      setAttachments(prev => [...prev, { id: crypto.randomUUID(), type, url, name }])
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const startObj = isAllDay ? new Date(`${startDate}T00:00:00`) : new Date(`${startDate}T${startTime}:00`)
    const endObj = isAllDay ? new Date(`${startDate}T23:59:59`) : new Date(`${endDate}T${endTime}:00`)

    if (startObj.getTime() >= endObj.getTime()) return alert('종료 일시는 시작 일시보다 이후여야 합니다.')

    const payloadData = {
      title,
      start_time: startObj.toISOString(),
      end_time: endObj.toISOString(),
      is_all_day: isAllDay,
      type: 'EVENT' as const,
      memo,
      hex_color: customColor,
      template_id: templateId,
      attachments
    }

    if (editingEvent) {
      updateActivity({ id: editingEvent.id, payload: payloadData, categoryIds: selectedCategories }, { onSuccess: closeAddEvent })
    } else {
      createActivity({ payload: payloadData, categoryIds: selectedCategories }, { onSuccess: () => {
        if (prefillAgendaTaskId) useAgendaStore.getState().updateTask(prefillAgendaTaskId, { is_calendar_registered: true })
        closeAddEvent()
      }})
    }
  }

  return (
    <Dialog open={isAddEventOpen} onOpenChange={(open) => !open ? closeAddEvent() : openAddEvent()}>
      {children && <div onClick={() => openAddEvent()}>{children}</div>}
      <DialogContent ref={dialogRef} className="w-[95vw] max-w-[440px] p-0 bg-slate-50/95 backdrop-blur-3xl border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-[32px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 py-5 flex flex-row items-center justify-between border-b border-gray-100/50">
          <Button type="button" variant="ghost" onClick={closeAddEvent} className="text-[#007AFF] font-medium text-[16px] hover:bg-[#007AFF]/10 rounded-full px-4 h-9">
            취소
          </Button>
          <DialogTitle className="text-[17px] font-bold text-slate-800 absolute left-1/2 -translate-x-1/2 tracking-tight">
            {editingEvent ? '일정 수정' : '새 일정 추가'}
          </DialogTitle>
          <Button type="button" onClick={handleSubmit} disabled={isCreating || isUpdating} className="text-white font-semibold text-[15px] bg-[#007AFF] hover:bg-[#0056b3] rounded-full px-5 h-9 shadow-md shadow-[#007AFF]/20 transition-all active:scale-95">
            {isCreating || isUpdating ? '저장 중...' : '저장'}
          </Button>
          <DialogDescription className="sr-only">일정 추가 다이얼로그</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div ref={scrollRef} onFocusCapture={handleFocusScroll} className="flex-1 min-h-0 overflow-y-auto px-5 py-6 pb-8 space-y-6 hide-scrollbar">
            
            {/* Title Block (Soft Neumorphism Pill) */}
            <div className="bg-white/80 backdrop-blur-md rounded-[20px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-white/80 overflow-hidden group focus-within:ring-2 focus-within:ring-[#007AFF]/20 transition-all">
              <input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="일정 제목"
                className="w-full bg-transparent px-5 py-4 text-[17px] text-slate-900 font-semibold focus:outline-none placeholder:text-slate-400"
                required 
              />
            </div>

            {/* DateTime Block */}
            <div className="bg-white/80 backdrop-blur-md rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-white/80 px-5 py-2 relative">
              <div className="flex items-center justify-between py-3 border-b border-slate-100/80 last:border-0">
                <span className="text-[15px] font-medium text-slate-700">종일</span>
                <button 
                  type="button" 
                  onClick={() => setIsAllDay(!isAllDay)}
                  className={`w-[50px] h-[30px] rounded-full transition-colors relative flex items-center shrink-0 ${isAllDay ? 'bg-[#34C759] shadow-inner' : 'bg-slate-200 shadow-inner'}`}
                >
                  <div className={`w-[26px] h-[26px] bg-white rounded-full shadow-sm transition-transform absolute ${isAllDay ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>

              <div className="py-4 border-b border-slate-100/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-slate-700">시작 일시</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-slate-100/50 hover:bg-slate-100 text-slate-700 font-medium text-[14px] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-colors"
                        required
                      />
                    </div>
                    {!isAllDay && (
                      <div className="w-[100px]">
                        <TimeSelect value={startTime} onChange={handleStartTimeChange} required className="!h-[36px] !rounded-xl !bg-slate-100/50 hover:!bg-slate-100 !border-0 !text-slate-700 font-medium transition-colors" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-slate-700">종료 일시</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-slate-100/50 hover:bg-slate-100 text-slate-700 font-medium text-[14px] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 disabled:opacity-50 transition-colors"
                      required={!isAllDay} disabled={isAllDay}
                    />
                    {!isAllDay && (
                      <div className="w-[100px]">
                        <TimeSelect value={endTime} onChange={setEndTime} required className="!h-[36px] !rounded-xl !bg-slate-100/50 hover:!bg-slate-100 !border-0 !text-slate-700 font-medium disabled:opacity-50 transition-colors" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!isAllDay && (
                <div className="py-3.5 flex items-center justify-between">
                  <span className="text-[15px] font-medium text-slate-700">소요 시간</span>
                  <div className="flex bg-slate-100/50 rounded-xl p-1 border border-slate-100">
                    {[30, 60, 90, 120].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => applyQuickDuration(mins)}
                        className={`px-3 py-1.5 text-[13px] font-bold rounded-lg transition-all ${
                          currentDurationMinutes === mins
                            ? 'bg-white text-[#007AFF] shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {mins >= 60 ? `${Math.floor(mins/60)}시간${mins%60>0 ? ` ${mins%60}분` : ''}` : `${mins}분`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Categories & Colors Block */}
            <div className="bg-white/80 backdrop-blur-md rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-white/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[15px] font-medium text-slate-700">카테고리</span>
                <div className="flex items-center gap-2">
                   <Popover open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
                    <PopoverTrigger render={<button type="button" className="flex items-center gap-1.5 text-[13px] text-[#007AFF] font-bold hover:bg-[#007AFF]/10 px-3 py-1.5 rounded-full transition-colors"><Zap className="w-3.5 h-3.5"/> 템플릿</button>} />
                    <PopoverContent align="end" className="w-56 p-2 shadow-xl border-slate-100 rounded-[20px] bg-white/95 backdrop-blur-xl z-[110]">
                      <PopoverHeader className="px-3 py-2 mb-1 border-b border-slate-50"><PopoverTitle className="text-xs font-bold text-slate-400 tracking-wide">템플릿 목록</PopoverTitle></PopoverHeader>
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {templates.length === 0 ? <div className="py-4 text-center text-xs text-slate-400">등록된 템플릿이 없습니다.</div> : templates.map(t => (
                          <button key={t.id} type="button" onClick={() => handleLoadTemplate(t)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.hex_color || '#007AFF' }} />
                            <span className="text-sm font-semibold text-slate-800 truncate">{t.title}</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5 mb-5">
                {categories.map(cat => {
                  const isSelected = selectedCategories.includes(cat.id)
                  return (
                    <div key={cat.id} className="relative group/cat">
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-4 py-2 text-[14px] font-semibold rounded-full transition-all flex items-center gap-1.5
                          ${isSelected ? 'text-white shadow-md' : 'text-slate-600 bg-slate-100/50 hover:bg-slate-200/50 border border-slate-200/50'}`}
                        style={isSelected ? { backgroundColor: cat.hex_color || '#007AFF' } : {}}
                      >
                        {cat.name}
                        {isSelected && <X className="w-3.5 h-3.5 opacity-80" />}
                      </button>
                      <div className="absolute -top-2 -right-2 hidden group-hover/cat:flex items-center gap-0.5 bg-white shadow-lg rounded-full px-1 py-0.5 z-10 border border-slate-100">
                        <div className="cursor-pointer hover:bg-slate-100 p-1 rounded-full text-[#007AFF] transition-colors" onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }}><Pencil className="w-3.5 h-3.5" /></div>
                        {!cat.is_default && <div className="cursor-pointer hover:bg-red-50 p-1 rounded-full text-red-500 transition-colors" onClick={(e) => handleDeleteCategory(e, cat.id)}><X className="w-3.5 h-3.5" /></div>}
                      </div>
                    </div>
                  )
                })}
                {isAddingCategory ? (
                  <div className="flex items-center gap-1.5">
                    <Input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddCategorySubmit(e as any) }} className="w-28 h-[36px] text-[14px] font-medium rounded-full px-4 bg-white border-slate-200 focus-visible:ring-[#007AFF]/30" placeholder="이름 입력..."/>
                    <button type="button" onClick={handleAddCategorySubmit} className="h-[36px] px-4 rounded-full bg-[#007AFF] text-white text-[14px] font-bold shadow-md shadow-[#007AFF]/20 transition-transform active:scale-95">추가</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setIsAddingCategory(true)} className="px-4 py-2 text-[14px] font-semibold rounded-full bg-slate-100/50 border border-dashed border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700 flex items-center gap-1.5 transition-colors"><Plus className="w-3.5 h-3.5" /> 새 카테고리</button>
                )}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-slate-100/80">
                <span className="text-[14px] font-semibold text-slate-500 shrink-0">색상 지정</span>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_SWATCHES.slice(0, 14).map(color => (
                    <button
                      key={color} type="button" onClick={() => setCustomColor(color === customColor ? null : color)}
                      className={`w-6 h-6 rounded-full transition-all hover:scale-110 flex items-center justify-center ${customColor === color ? 'ring-2 ring-offset-2 ring-[#007AFF] scale-110 shadow-md' : 'shadow-sm opacity-90 hover:opacity-100'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Memo Block */}
            <div className="bg-white/80 backdrop-blur-md rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-white/80 overflow-hidden focus-within:ring-2 focus-within:ring-[#007AFF]/20 transition-all p-1">
              <textarea
                value={memo} onChange={e => setMemo(e.target.value)} placeholder="상세 메모"
                className="w-full min-h-[100px] p-4 text-[16px] text-slate-800 bg-transparent font-medium focus:outline-none resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Attachments Dropzone Block */}
            <div className="bg-white/80 backdrop-blur-md rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-white/80 p-5">
              <span className="text-[15px] font-medium text-slate-700 block mb-3">첨부파일</span>
              
              <div className="space-y-2.5 mb-3">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100/80 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                        {att.type === 'image' ? <ImageIcon className="w-4.5 h-4.5 text-[#0ea5e9]" /> : 
                         att.type === 'link' ? <LinkIcon className="w-4.5 h-4.5 text-[#8b5cf6]" /> : 
                         <FileText className="w-4.5 h-4.5 text-slate-500" />}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-[14px] font-bold text-slate-800 truncate">{att.name}</span>
                        <a href={att.url} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-[#007AFF] hover:underline truncate mt-0.5">{att.url}</a>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeAttachment(att.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                type="button" 
                onClick={handleAddAttachment}
                className="w-full py-4.5 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#007AFF] hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all group"
              >
                <div className="p-2 rounded-full bg-slate-50 group-hover:bg-[#007AFF]/10 transition-colors">
                  <Paperclip className="w-5 h-5 text-slate-400 group-hover:text-[#007AFF] transition-colors" />
                </div>
                <span className="text-[14px] font-bold">첨부파일 추가</span>
              </button>
            </div>

          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
