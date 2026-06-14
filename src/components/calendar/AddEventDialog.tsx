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

    if (startObj.getTime() >= endObj.getTime()) return alert('종료 시간은 시작 시간보다 이후여야 합니다.')

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
      <DialogContent ref={dialogRef} className="w-[95vw] max-w-[440px] p-0 bg-[#f0f2f5]/95 backdrop-blur-3xl border border-white/40 shadow-2xl rounded-[32px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* iOS Style Header */}
        <DialogHeader className="px-5 py-4 flex flex-row items-center justify-between">
          <Button type="button" variant="ghost" onClick={closeAddEvent} className="text-[#007AFF] font-medium text-[17px] hover:bg-transparent px-0 hover:opacity-70">
            Cancel
          </Button>
          <DialogTitle className="text-[17px] font-semibold text-black absolute left-1/2 -translate-x-1/2">
            {editingEvent ? 'Edit Event' : 'New Event'}
          </DialogTitle>
          <Button type="button" onClick={handleSubmit} disabled={isCreating || isUpdating} className="text-[#007AFF] font-semibold text-[17px] hover:bg-transparent px-0 bg-transparent shadow-none hover:opacity-70">
            {isCreating || isUpdating ? 'Saving' : 'Add'}
          </Button>
          <DialogDescription className="sr-only">iOS Style Event Dialog</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div ref={scrollRef} onFocusCapture={handleFocusScroll} className="flex-1 min-h-0 overflow-y-auto px-5 pb-8 space-y-5 hide-scrollbar">
            
            {/* Title Block */}
            <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-slate-100">
              <input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Title"
                className="w-full bg-transparent px-4 py-4 text-lg text-black font-semibold focus:outline-none placeholder:text-gray-400"
                required 
              />
            </div>

            {/* DateTime Block */}
            <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-slate-100 px-4 py-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-100/60 last:border-0">
                <span className="text-[16px] text-black">All-Day</span>
                <button 
                  type="button" 
                  onClick={() => setIsAllDay(!isAllDay)}
                  className={`w-[50px] h-[30px] rounded-full transition-colors relative flex items-center shrink-0 ${isAllDay ? 'bg-[#34C759]' : 'bg-gray-200'}`}
                >
                  <div className={`w-[26px] h-[26px] bg-white rounded-full shadow-sm transition-transform absolute ${isAllDay ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>

              <div className="py-3 border-b border-gray-100/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[16px] text-black">Starts</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-gray-100/70 text-[15px] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                      required
                    />
                    {!isAllDay && (
                      <div className="w-[100px]">
                        <TimeSelect value={startTime} onChange={handleStartTimeChange} required className="!h-[34px] !rounded-lg !bg-gray-100/70 !border-0" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] text-black">Ends</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-gray-100/70 text-[15px] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 disabled:opacity-50"
                      required={!isAllDay} disabled={isAllDay}
                    />
                    {!isAllDay && (
                      <div className="w-[100px]">
                        <TimeSelect value={endTime} onChange={setEndTime} required className="!h-[34px] !rounded-lg !bg-gray-100/70 !border-0" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!isAllDay && (
                <div className="py-3 flex items-center justify-between">
                  <span className="text-[16px] text-black">Duration</span>
                  <div className="flex bg-gray-100/70 rounded-lg p-0.5">
                    {[30, 60, 90, 120].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => applyQuickDuration(mins)}
                        className={`px-2.5 py-1 text-[13px] font-medium rounded-md transition-all ${
                          currentDurationMinutes === mins
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {mins >= 60 ? `${Math.floor(mins/60)}h${mins%60>0 ? ` ${mins%60}m` : ''}` : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Categories & Colors Block */}
            <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[16px] text-black">Category</span>
                <div className="flex items-center gap-2">
                   <Popover open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
                    <PopoverTrigger render={<button type="button" className="flex items-center gap-1 text-[14px] text-[#007AFF] font-medium"><Zap className="w-4 h-4"/> Template</button>} />
                    <PopoverContent align="end" className="w-56 p-2 shadow-xl border-gray-100 rounded-2xl bg-white/95 backdrop-blur-xl z-[110]">
                      <PopoverHeader className="px-2 py-1 mb-1 border-b border-gray-50"><PopoverTitle className="text-xs font-semibold text-gray-500">Templates</PopoverTitle></PopoverHeader>
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {templates.length === 0 ? <div className="py-2 text-center text-xs text-gray-400">No templates</div> : templates.map(t => (
                          <button key={t.id} type="button" onClick={() => handleLoadTemplate(t)} className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-gray-100 text-left">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.hex_color || '#007AFF' }} />
                            <span className="text-sm font-medium text-gray-800 truncate">{t.title}</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map(cat => {
                  const isSelected = selectedCategories.includes(cat.id)
                  return (
                    <div key={cat.id} className="relative group/cat">
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 text-[14px] font-medium rounded-full transition-all flex items-center gap-1
                          ${isSelected ? 'text-white shadow-sm' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                        style={isSelected ? { backgroundColor: cat.hex_color || '#007AFF' } : {}}
                      >
                        {cat.name}
                        {isSelected && <X className="w-3.5 h-3.5" />}
                      </button>
                      <div className="absolute -top-2 -right-2 hidden group-hover/cat:flex items-center gap-0.5 bg-white shadow-md rounded-full px-1 py-0.5 z-10 border border-gray-100">
                        <div className="cursor-pointer hover:bg-gray-100 p-0.5 rounded-full text-[#007AFF]" onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }}><Pencil className="w-3 h-3" /></div>
                        {!cat.is_default && <div className="cursor-pointer hover:bg-red-100 p-0.5 rounded-full text-red-500" onClick={(e) => handleDeleteCategory(e, cat.id)}><X className="w-3 h-3" /></div>}
                      </div>
                    </div>
                  )
                })}
                {isAddingCategory ? (
                  <div className="flex items-center gap-1">
                    <Input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddCategorySubmit(e as any) }} className="w-24 h-[32px] text-sm rounded-full px-3 bg-white border-gray-200 focus-visible:ring-[#007AFF]/30" placeholder="New..."/>
                    <button type="button" onClick={handleAddCategorySubmit} className="h-[32px] px-3 rounded-full bg-[#007AFF] text-white text-sm font-medium">Add</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setIsAddingCategory(true)} className="px-3 py-1.5 text-[14px] font-medium rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> New</button>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-100/60">
                <span className="text-[15px] text-gray-500">Color</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {COLOR_SWATCHES.slice(0, 14).map(color => (
                    <button
                      key={color} type="button" onClick={() => setCustomColor(color === customColor ? null : color)}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${customColor === color ? 'ring-2 ring-offset-2 ring-[#007AFF]' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Memo Block */}
            <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-slate-100">
              <textarea
                value={memo} onChange={e => setMemo(e.target.value)} placeholder="Notes"
                className="w-full min-h-[100px] p-4 text-[16px] text-black bg-transparent focus:outline-none resize-none placeholder:text-gray-400"
              />
            </div>

            {/* Attachments Dropzone Block */}
            <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-slate-100 p-4">
              <span className="text-[16px] text-black block mb-3">Attachments</span>
              
              <div className="space-y-2 mb-3">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                        {att.type === 'image' ? <ImageIcon className="w-4 h-4 text-blue-500" /> : 
                         att.type === 'link' ? <LinkIcon className="w-4 h-4 text-indigo-500" /> : 
                         <FileText className="w-4 h-4 text-gray-500" />}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-[14px] font-medium text-gray-900 truncate">{att.name}</span>
                        <a href={att.url} target="_blank" rel="noreferrer" className="text-[12px] text-[#007AFF] hover:underline truncate">{att.url}</a>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeAttachment(att.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                type="button" 
                onClick={handleAddAttachment}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-[#007AFF] hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all"
              >
                <Paperclip className="w-5 h-5" />
                <span className="text-[14px] font-medium">Add Attachment...</span>
              </button>
            </div>

          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
