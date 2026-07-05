/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, Pencil, Zap, Link as LinkIcon, Image as ImageIcon, FileText, Paperclip, ToggleRight, Play, Square, Clock, Tag, Palette, AlignLeft, Upload, Bell, RefreshCcw } from 'lucide-react'
import { useCategories, useCreateActivity, useUpdateActivity, useCreateCategory, useDeleteCategory } from '@/hooks/useCalendarQueries'
import { updateRecurringActivity } from '@/app/actions/calendar'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle } from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { useActivityTemplates } from '@/hooks/useInsightsQueries'
import type { ActivityTemplate } from '@/app/actions/insights'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useAgendaStore } from '@/store/useAgendaStore'
import { TimeSelect } from '@/components/ui/TimeSelect'
import { toast } from 'sonner'

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

const COLOR_SWATCHES = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1',
  '#a855f7', '#ec4899', '#f43f5e', '#84cc16', '#10b981', '#06b6d4', '#8b5cf6', '#d946ef',
  '#64748b', '#78716c', '#000000', '#475569'
]

type Attachment = { id: string; type: 'link' | 'image' | 'file'; url: string; name: string }

/* ─────────────────────────────────────────
   PRD 정밀 CSS 토큰
   ───────────────────────────────────────── */
const CARD = 'bg-card/85 backdrop-blur-[16px] rounded-[20px] border border-transparent/70 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.06)]'
const LABEL = 'text-[14px] font-bold text-foreground flex items-center whitespace-nowrap shrink-0'

export function AddEventDialog({ children }: { children?: React.ReactNode }) {
  const isAddEventOpen = useCalendarStore(s => s.isAddEventOpen)
  const closeAddEvent = useCalendarStore(s => s.closeAddEvent)
  const addEventDate = useCalendarStore(s => s.addEventDate)
  const prefillEventData = useCalendarStore(s => s.prefillEventData)
  const prefillAgendaTaskId = useCalendarStore(s => s.prefillAgendaTaskId)
  const openAddEvent = useCalendarStore(s => s.openAddEvent)
  const editingEvent = useCalendarStore(s => s.editingEvent)
  const openEditCategory = useCalendarStore(s => s.openEditCategory)
  const { dialogRef, scrollRef, handleFocusScroll } = useKeyboardAwareDialog(isAddEventOpen)

  const [title, setTitle] = useState('')
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null)
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
  const [isAlsoAgenda, setIsAlsoAgenda] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [recurrence, setRecurrence] = useState<string>('NONE')
  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false)
  const [editMode, setEditMode] = useState<'THIS_EVENT' | 'THIS_AND_FOLLOWING' | 'ALL_EVENTS'>('THIS_EVENT')
  const [originalStartTime, setOriginalStartTime] = useState<string | null>(null)


  const currentMonthStart = startOfMonth(new Date()).toISOString()
  const currentMonthEnd = endOfMonth(new Date()).toISOString()

  /* ── 자동 시간 교정 ── */
  useEffect(() => {
    if (isAllDay) {
      if (startDate > endDate) setEndDate(startDate)
    } else {
      const s = new Date(`${startDate}T${startTime}:00`)
      const e = new Date(`${endDate}T${endTime}:00`)
      if (s.getTime() >= e.getTime()) {
        const ne = new Date(s.getTime() + 3600000)
        setEndDate(format(ne, 'yyyy-MM-dd'))
        setEndTime(format(ne, 'HH:mm'))
      }
    }
  }, [startDate, startTime, endDate, endTime, isAllDay])

  const { data: categories = [] } = useCategories()
  const { data: templates = [] } = useActivityTemplates()
  const { mutate: createActivity, isPending: isCreating } = useCreateActivity(currentMonthStart, currentMonthEnd)
  const { mutate: updateActivity, isPending: isUpdating } = useUpdateActivity(currentMonthStart, currentMonthEnd)
  const { mutate: createCategory } = useCreateCategory()
  const { mutate: deleteCategory } = useDeleteCategory()

  /* ── 초기화 ── */
  useEffect(() => {
    if (!isAddEventOpen) return
    if (editingEvent) {
      const s = parseISO(editingEvent.start_time), e = parseISO(editingEvent.end_time)
      setStartDate(format(s, 'yyyy-MM-dd')); setStartTime(format(s, 'HH:mm'))
      setEndDate(format(e, 'yyyy-MM-dd')); setEndTime(format(e, 'HH:mm'))
      setTitle(editingEvent.title); setIsAllDay(editingEvent.is_all_day)
      setSelectedCategories(editingEvent.categories?.map(c => c.id) || [])
      setCustomColor(editingEvent.hex_color); setMemo(editingEvent.memo || '')
      setTemplateId(editingEvent.template_id || null)
      setAttachments((editingEvent as any).attachments || [])
      let initialReminder: number | null = null
      if ((editingEvent as any).reminders && Array.isArray((editingEvent as any).reminders) && (editingEvent as any).reminders.length > 0) {
        initialReminder = (editingEvent as any).reminders[0].minutes
      }
      setReminderMinutes(initialReminder)
      setIsAddingCategory(false); setNewCategoryName('')
      
      // 반복 일정 상태 초기화
      const rrule = (editingEvent as any).recurrence_rule
      if (rrule) {
        if (rrule.includes('DAILY')) setRecurrence('DAILY')
        else if (rrule.includes('WEEKLY')) setRecurrence('WEEKLY')
        else if (rrule.includes('MONTHLY')) setRecurrence('MONTHLY')
        else if (rrule.includes('YEARLY')) setRecurrence('YEARLY')
        else setRecurrence('NONE')
      } else {
        setRecurrence('NONE')
      }
      setEditMode('THIS_EVENT')
      setOriginalStartTime((editingEvent as any).original_start_time || editingEvent.start_time)
    } else {
      let iS: Date | null = null, iE: Date | null = null
      if (prefillEventData?.start_time) { iS = new Date(prefillEventData.start_time); iE = new Date(iS.getTime() + 3600000) }
      else if (addEventDate) { iS = addEventDate; iE = addEventDate }
      if (iS && iE) {
        setStartDate(format(iS, 'yyyy-MM-dd')); setEndDate(format(iE, 'yyyy-MM-dd'))
        setStartTime(format(iS, 'HH:mm')); setEndTime(format(iE, 'HH:mm'))
      } else {
        const now = new Date(); setStartDate(format(now, 'yyyy-MM-dd')); setEndDate(format(now, 'yyyy-MM-dd'))
        const nh = new Date(); nh.setHours(nh.getHours() + 1, 0, 0, 0)
        setStartTime(format(nh, 'HH:mm')); nh.setHours(nh.getHours() + 1); setEndTime(format(nh, 'HH:mm'))
      }
      setTitle(prefillEventData?.title || ''); setIsAllDay(false)
      setSelectedCategories((prefillEventData as any)?.category_ids || [])
      setCustomColor(null); setMemo(prefillEventData?.memo || ''); setTemplateId(null)
      setAttachments([]); setIsAddingCategory(false); setNewCategoryName(''); setIsTemplateOpen(false)
      setReminderMinutes(null)
      setIsAlsoAgenda(false); setRecurrence('NONE'); setEditMode('THIS_EVENT'); setOriginalStartTime(null)
    }
  }, [isAddEventOpen, addEventDate, prefillEventData, editingEvent])

  /* ── 핸들러 ── */
  const handleStartTimeChange = (v: string) => {
    if (isAllDay) { setStartTime(v); return }
    const s = new Date(`${startDate}T${v}:00`), ps = new Date(`${startDate}T${startTime}:00`), e = new Date(`${endDate}T${endTime}:00`)
    const d = e.getTime() - ps.getTime()
    setStartTime(v)
    if (d > 0 && d < 365 * 86400000) { const ne = new Date(s.getTime() + d); setEndDate(format(ne, 'yyyy-MM-dd')); setEndTime(format(ne, 'HH:mm')) }
  }
  const applyQuickDuration = (m: number) => { const s = new Date(`${startDate}T${startTime}:00`), ne = new Date(s.getTime() + m * 60000); setEndDate(format(ne, 'yyyy-MM-dd')); setEndTime(format(ne, 'HH:mm')) }
  const currentDurationMinutes = Math.round((new Date(`${endDate}T${endTime}:00`).getTime() - new Date(`${startDate}T${startTime}:00`).getTime()) / 60000)
  const toggleCategory = (id: string) => { setSelectedCategories(p => { const n = p.includes(id) ? p.filter(c => c !== id) : [...p, id]; if (!n.length) setCustomColor(null); return n }) }

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    if (categories.some(c => c.name === newCategoryName.trim())) return alert('이미 존재하는 카테고리 이름입니다.')
    const used = categories.map(c => c.hex_color), avail = COLOR_SWATCHES.filter(c => !used.includes(c))
    createCategory({ name: newCategoryName.trim(), hexColor: avail[0] || '#007AFF' })
    setNewCategoryName(''); setIsAddingCategory(false)
  }
  const handleDeleteCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm('정말 이 카테고리를 삭제하시겠습니까?')) return
    deleteCategory(id); setSelectedCategories(p => p.filter(c => c !== id))
  }
  const handleLoadTemplate = (t: ActivityTemplate) => {
    setTitle(t.title)
    setSelectedCategories(t.category_ids?.length ? t.category_ids : t.category_id ? [t.category_id] : [])
    setCustomColor(t.hex_color || null); setMemo(t.memo || ''); setTemplateId(t.id)
    if (!isAllDay) {
      const est = t.default_start_time || startTime; if (t.default_start_time) setStartTime(t.default_start_time)
      const s = new Date(`${startDate}T${est}:00`), ne = new Date(s.getTime() + (t.duration_minutes || 60) * 60000)
      setEndDate(format(ne, 'yyyy-MM-dd')); setEndTime(format(ne, 'HH:mm'))
    }
    setIsTemplateOpen(false)
  }

  const handleAddLink = () => {
    const url = prompt('링크 URL을 입력하세요')
    if (!url) return
    const name = prompt('링크 이름을 입력하세요', '새 링크') || '링크'
    setAttachments(p => [...p, { id: crypto.randomUUID(), type: 'link', url, name }])
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const filePath = `calendar/${crypto.randomUUID()}.${fileExt}`

      const { error } = await supabase.storage
        .from('archive_media')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('archive_media')
        .getPublicUrl(filePath)

      let type: 'image' | 'file' = 'file'
      if (file.type.startsWith('image/')) type = 'image'

      setAttachments(p => [...p, { id: crypto.randomUUID(), type, url: publicUrl, name: file.name }])
    } catch (error) {
      console.error('Upload error:', error)
      alert('파일 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const sO = isAllDay ? new Date(`${startDate}T00:00:00`) : new Date(`${startDate}T${startTime}:00`)
    const eO = isAllDay ? new Date(`${startDate}T23:59:59`) : new Date(`${endDate}T${endTime}:00`)
    if (sO.getTime() >= eO.getTime()) return alert('종료는 시작보다 이후여야 합니다.')

    const reminders = reminderMinutes !== null ? [{ method: 'popup', minutes: reminderMinutes }] : []
    const payload = { title, start_time: sO.toISOString(), end_time: eO.toISOString(), is_all_day: isAllDay, type: 'EVENT' as const, memo, hex_color: customColor, template_id: templateId, attachments, reminders, parent_activity_id: null, original_start_time: null }

    const onSuccessAction = () => {
      toast.success(editingEvent ? '일정이 성공적으로 수정되었습니다.' : '일정이 구글 캘린더에도 생성되었습니다.')
      if (prefillAgendaTaskId) useAgendaStore.getState().updateTask(prefillAgendaTaskId, { is_calendar_registered: true })
      closeAddEvent()
      if (isAlsoAgenda) {
        useAgendaStore.getState().openAddDialog({
          title,
          memo: memo || null,
          deadline: sO.toISOString(),
          category_id: selectedCategories[0] || null,
        })
      }
    }

    const getRRuleString = (type: string) => {
      switch(type) {
        case 'DAILY': return 'FREQ=DAILY'
        case 'WEEKLY': return 'FREQ=WEEKLY'
        case 'MONTHLY': return 'FREQ=MONTHLY'
        case 'YEARLY': return 'FREQ=YEARLY'
        default: return null
      }
    }
    const finalPayload = { ...payload, recurrence_rule: getRRuleString(recurrence) }

    if (editingEvent) {
      if ((editingEvent as any).recurrence_rule || (editingEvent as any).parent_activity_id) {
        // 합성 ID(예: uuid_timestamp)인 경우 실제 부모 ID를 추출
        const realId = editingEvent.id.includes('_') ? editingEvent.id.split('_').slice(0, 5).join('-') : editingEvent.id
        // Use custom action for recurring events
        updateRecurringActivity(realId, finalPayload as any, selectedCategories, editMode, originalStartTime!).then(() => onSuccessAction()).catch(e => toast.error(e.message))
      } else {
        updateActivity({ id: editingEvent.id, payload: finalPayload, categoryIds: selectedCategories }, { onSuccess: onSuccessAction })
      }
    } else {
      createActivity({ payload: finalPayload, categoryIds: selectedCategories }, { onSuccess: onSuccessAction })
    }
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     RENDER
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const previewColor = customColor || (selectedCategories.length > 0 ? categories.find(c => c.id === selectedCategories[0])?.hex_color : null)

  return (
    <Dialog open={isAddEventOpen} onOpenChange={(open) => !open ? closeAddEvent() : openAddEvent()}>
      {children && <div onClick={() => openAddEvent()}>{children}</div>}

      <DialogContent
        ref={dialogRef}
        className="w-[95vw] max-w-[460px] p-0 overflow-hidden flex flex-col max-h-[90vh] border border-transparent/50 rounded-[28px]"
        style={{ background: 'linear-gradient(180deg, #f8f9fc 0%, #f0f2f7 100%)', boxShadow: '0 24px 80px -12px rgba(0,0,0,0.12)' }}
      >
        {/* 상단 미리보기 바 제거됨 */}
        {/* ── HEADER: 제목만 (Shadcn 기본 닫기 버튼 활용) ── */}
        <DialogHeader className="flex-shrink-0 px-6 py-5 flex flex-row items-center justify-center relative" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <DialogTitle className="text-[17px] font-bold text-foreground tracking-tight">
            {editingEvent ? '일정 수정' : '새 일정 추가'}
          </DialogTitle>
          <DialogDescription className="sr-only">일정 추가 다이얼로그</DialogDescription>
        </DialogHeader>

        {/* ── SCROLL AREA ── */}
        <div ref={scrollRef} onFocusCapture={handleFocusScroll} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-4 hide-scrollbar">


          {editingEvent && ((editingEvent as any).recurrence_rule || (editingEvent as any).parent_activity_id) && (
            <div className={`${CARD} px-5 py-4 bg-orange-50/50 border-orange-100/50`}>
              <span className={`${LABEL} block mb-3 text-orange-800`}><RefreshCcw className="w-4 h-4 mr-1.5 text-orange-600" />반복 일정 수정 옵션</span>
              <div className="flex flex-col gap-2">
                {[
                  { value: 'THIS_EVENT', label: '이 회차만', desc: '선택한 일정만 예외로 수정합니다.' },
                  { value: 'THIS_AND_FOLLOWING', label: '이후 모든 일정', desc: '이 일정을 포함해 앞으로의 일정을 수정합니다.' },
                  { value: 'ALL_EVENTS', label: '모든 일정', desc: '과거와 미래의 모든 일정을 한 번에 수정합니다.' }
                ].map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${editMode === opt.value ? 'bg-white border-orange-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-orange-100/50'}`}>
                    <input type="radio" name="editMode" value={opt.value} checked={editMode === opt.value} onChange={() => setEditMode(opt.value as any)} className="mt-0.5 accent-orange-500" />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-orange-900">{opt.label}</span>
                      <span className="text-[11px] text-orange-700/80 mt-0.5">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ▸ 제목 카드 */}
          <div className={`${CARD} px-5 py-4 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-shadow`}>
            <input
              id="title" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="일정 제목" required
              className="w-full bg-transparent text-[17px] text-foreground font-bold focus:outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* ▸ 날짜/시간 카드 */}
          <div className={`${CARD} px-5 py-4`}>
            {/* 종일 */}
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <span className={LABEL}><ToggleRight className="w-4 h-4 mr-1.5 text-muted-foreground" />종일</span>
              <button type="button" onClick={() => setIsAllDay(!isAllDay)}
                className={`w-[50px] h-[30px] rounded-full transition-colors relative shrink-0 ${isAllDay ? 'bg-[#34C759]' : 'bg-slate-200'}`}>
                <div className={`w-[26px] h-[26px] bg-card rounded-full shadow-sm transition-transform absolute top-[2px] ${isAllDay ? 'left-[22px]' : 'left-[2px]'}`} />
              </button>
            </div>

            {/* 시작 — flex-nowrap 강제, 모바일 대응을 위한 달력 아이콘 및 여백 최소화 */}
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <span className={`${LABEL} shrink-0 min-w-[44px]`}><Play className="w-3.5 h-3.5 mr-1 md:mr-1.5 text-muted-foreground" />시작</span>
              <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                  className="bg-muted/60 hover:bg-muted text-foreground font-medium text-[12px] sm:text-[13px] tracking-tight rounded-xl px-1.5 sm:px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors w-[110px] sm:w-[125px] shrink-0 [&::-webkit-calendar-picker-indicator]:scale-[0.8] [&::-webkit-calendar-picker-indicator]:-ml-1.5" />
                {!isAllDay && (
                  <div className="w-[90px] sm:w-[105px] shrink-0">
                    <TimeSelect value={startTime} onChange={handleStartTimeChange} required className="!w-full !h-[34px] !text-[12px] sm:!text-[13px] !rounded-xl !bg-muted/60 hover:!bg-muted !border-0 transition-colors" />
                  </div>
                )}
              </div>
            </div>

            {/* 종료 — flex-nowrap 강제, 모바일 대응을 위한 달력 아이콘 및 여백 최소화 */}
            <div className={`flex items-center justify-between py-3 ${!isAllDay ? '' : 'opacity-40 pointer-events-none'}`} style={{ borderBottom: !isAllDay ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
              <span className={`${LABEL} shrink-0 min-w-[44px]`}><Square className="w-3.5 h-3.5 mr-1 md:mr-1.5 text-muted-foreground" />종료</span>
              <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required={!isAllDay} disabled={isAllDay}
                  className="bg-muted/60 hover:bg-muted text-foreground font-medium text-[12px] sm:text-[13px] tracking-tight rounded-xl px-1.5 sm:px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 transition-colors w-[110px] sm:w-[125px] shrink-0 [&::-webkit-calendar-picker-indicator]:scale-[0.8] [&::-webkit-calendar-picker-indicator]:-ml-1.5" />
                {!isAllDay && (
                  <div className="w-[90px] sm:w-[105px] shrink-0">
                    <TimeSelect value={endTime} onChange={setEndTime} required className="!w-full !h-[34px] !text-[12px] sm:!text-[13px] !rounded-xl !bg-muted/60 hover:!bg-muted !border-0 transition-colors" />
                  </div>
                )}
              </div>
            </div>


            {/* 반복 옵션 */}
            <div className="flex items-center justify-between pt-3 pb-1" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <span className={LABEL}><RefreshCcw className="w-4 h-4 mr-1.5 text-muted-foreground" />반복</span>
              <Popover open={isRecurrenceOpen} onOpenChange={setIsRecurrenceOpen}>
                <PopoverTrigger render={
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold bg-muted/60 hover:bg-muted text-foreground rounded-xl transition-colors">
                    {recurrence === 'NONE' ? '반복 안 함' : recurrence === 'DAILY' ? '매일' : recurrence === 'WEEKLY' ? '매주' : recurrence === 'MONTHLY' ? '매월' : '매년'}
                    <span className="text-[10px] opacity-60">▼</span>
                  </button>
                } />
                <PopoverContent align="end" className="w-40 p-1.5 shadow-xl border-border rounded-2xl bg-card z-[110]">
                  {['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map(r => (
                    <button key={r} type="button" onClick={() => { setRecurrence(r); setIsRecurrenceOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-[13px] font-semibold rounded-xl transition-colors ${recurrence === r ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'hover:bg-muted text-foreground'}`}>
                      {r === 'NONE' ? '반복 안 함' : r === 'DAILY' ? '매일' : r === 'WEEKLY' ? '매주' : r === 'MONTHLY' ? '매월' : '매년'}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            {/* 소요시간 */}
            {!isAllDay && (
              <div className="flex items-center gap-2 md:gap-3 pt-3">
                <span className={`${LABEL} min-w-[66px] md:min-w-[80px]`}><Clock className="w-4 h-4 mr-1 md:mr-1.5 text-muted-foreground" />소요시간</span>
                <div className="flex-1 min-w-0 flex justify-end">
                  <div className="flex bg-black/[0.03] rounded-xl p-[3px]">
                    {[30, 60, 90, 120].map(m => (
                      <button key={m} type="button" onClick={() => applyQuickDuration(m)}
                        className={`px-2.5 py-[5px] text-[12px] font-bold rounded-[10px] transition-all whitespace-nowrap ${currentDurationMinutes === m ? 'bg-card text-[#007AFF] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        {m === 30 ? '30분' : m === 60 ? '1시간' : m === 90 ? '1.5시간' : '2시간'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 알림 */}
            <div className={`flex items-center gap-2 md:gap-3 ${isAllDay ? 'pt-0' : 'pt-3 mt-3 border-t border-black/[0.04]'}`}>
              <span className={`${LABEL} min-w-[66px] md:min-w-[80px]`}><Bell className="w-4 h-4 mr-1 md:mr-1.5 text-muted-foreground" />알림</span>
              <div className="flex-1 min-w-0 flex justify-end">
                <select 
                  value={reminderMinutes === null ? '' : reminderMinutes} 
                  onChange={e => setReminderMinutes(e.target.value === '' ? null : Number(e.target.value))}
                  className="h-[32px] text-[12px] sm:text-[13px] font-semibold bg-black/[0.03] hover:bg-black/[0.06] text-foreground rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors border-0 cursor-pointer appearance-none text-center"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto', paddingRight: '2.5em' }}
                >
                  <option value="">알림 없음</option>
                  <option value="0">정각</option>
                  <option value="10">10분 전</option>
                  <option value="30">30분 전</option>
                  <option value="60">1시간 전</option>
                  <option value="1440">1일 전</option>
                </select>
              </div>
            </div>
          </div>

          {/* ▸ 카테고리 + 색상 카드 */}
          <div className={`${CARD} px-5 py-4`}>
            <div className="flex items-center justify-between mb-3">
              <span className={LABEL}><Tag className="w-4 h-4 mr-1.5 text-muted-foreground" />카테고리</span>
              <Popover open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
                <PopoverTrigger render={
                  <button type="button" className="flex items-center gap-1.5 text-[12px] text-[#007AFF] font-bold hover:bg-[#007AFF]/10 px-2.5 py-1 rounded-full transition-colors">
                    <Zap className="w-3.5 h-3.5" /> 템플릿
                  </button>
                } />
                <PopoverContent align="end" className="w-56 p-2 shadow-xl border-border rounded-[20px] bg-card/95 backdrop-blur-xl z-[110]">
                  <PopoverHeader className="px-3 py-2 mb-1 border-b border-border"><PopoverTitle className="text-xs font-bold text-muted-foreground">템플릿 목록</PopoverTitle></PopoverHeader>
                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                    {templates.length === 0 ? <div className="py-4 text-center text-xs text-muted-foreground">등록된 템플릿이 없습니다.</div> : templates.map(t => (
                      <button key={t.id} type="button" onClick={() => handleLoadTemplate(t)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-muted text-left transition-colors">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.hex_color || '#007AFF' }} />
                        <span className="text-sm font-semibold text-foreground truncate">{t.title}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map(cat => {
                const sel = selectedCategories.includes(cat.id)
                return (
                  <div key={cat.id} className="relative group/cat">
                    <button type="button" onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 text-[12px] font-semibold rounded-full transition-all flex items-center gap-1.5 border ${sel ? 'shadow-sm' : 'text-foreground bg-card border-border hover:bg-muted'}`}
                      style={sel ? { backgroundColor: `${cat.hex_color || '#007AFF'}1A`, borderColor: cat.hex_color || '#007AFF', color: '#0f172a' } : undefined}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.hex_color || '#007AFF' }} />
                      {cat.name}
                      {sel && <X className="w-3 h-3 ml-0.5" style={{ color: cat.hex_color || '#007AFF' }} />}
                    </button>
                    <div className="absolute -top-2 -right-2 hidden group-hover/cat:flex items-center gap-0.5 bg-card shadow-lg rounded-full px-1 py-0.5 z-10 border border-border">
                      <div className="cursor-pointer hover:bg-muted p-1 rounded-full text-[#007AFF]" onClick={e => { e.stopPropagation(); openEditCategory(cat) }}><Pencil className="w-3 h-3" /></div>
                      {!cat.is_default && <div className="cursor-pointer hover:bg-red-50 p-1 rounded-full text-red-500" onClick={e => handleDeleteCategory(e, cat.id)}><X className="w-3 h-3" /></div>}
                    </div>
                  </div>
                )
              })}
              {isAddingCategory ? (
                <div className="flex items-center gap-1.5">
                  <Input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategorySubmit(e as any) }}
                    className="w-24 h-[28px] text-[12px] font-medium rounded-full px-3 bg-card border-border focus-visible:ring-indigo-500/30" placeholder="이름..." />
                  <button type="button" onClick={handleAddCategorySubmit} className="h-[28px] px-3 rounded-full bg-[#007AFF] text-white text-[12px] font-bold shadow-md shadow-[#007AFF]/20 active:scale-95 transition-transform">추가</button>
                  <button type="button" onClick={() => setIsAddingCategory(false)} className="h-[28px] w-[28px] rounded-full hover:bg-muted flex items-center justify-center"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => setIsAddingCategory(true)}
                  className="px-3 py-1.5 text-[12px] font-semibold rounded-full bg-card border border-dashed border-slate-300 text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> 추가
                </button>
              )}
            </div>

            {/* 프리미엄 색상 미리보기 바 (다중 색상 지원 빛나는 라인 효과) */}
            <div className="w-full py-2 mb-2 flex justify-center">
              <div className="relative w-full max-w-[90%] h-[3px] bg-black/5 rounded-full overflow-visible">
                <div 
                   className="absolute inset-0 w-full h-full rounded-full transition-all duration-700 ease-in-out z-10"
                   style={{
                     background: (() => {
                       const colors = customColor ? [customColor] : selectedCategories.map(id => categories.find(c => c.id === id)?.hex_color).filter(Boolean) as string[];
                       if (!colors.length) return 'transparent';
                       if (colors.length === 1) return `linear-gradient(90deg, transparent 0%, ${colors[0]} 50%, transparent 100%)`;
                       const stops = ['transparent 0%'];
                       const seg = 100 / colors.length;
                       colors.forEach((c, i) => stops.push(`${c} ${seg * i + seg / 2}%`));
                       stops.push('transparent 100%');
                       return `linear-gradient(90deg, ${stops.join(', ')})`;
                     })(),
                     opacity: (customColor || selectedCategories.length > 0) ? 1 : 0
                   }}
                />
                <div 
                   className="absolute -inset-y-1 -inset-x-2 rounded-full blur-[8px] transition-all duration-700 ease-in-out z-0"
                   style={{
                     background: (() => {
                       const colors = customColor ? [customColor] : selectedCategories.map(id => categories.find(c => c.id === id)?.hex_color).filter(Boolean) as string[];
                       if (!colors.length) return 'transparent';
                       if (colors.length === 1) return `linear-gradient(90deg, transparent 0%, ${colors[0]} 50%, transparent 100%)`;
                       const stops = ['transparent 0%'];
                       const seg = 100 / colors.length;
                       colors.forEach((c, i) => stops.push(`${c} ${seg * i + seg / 2}%`));
                       stops.push('transparent 100%');
                       return `linear-gradient(90deg, ${stops.join(', ')})`;
                     })(),
                     opacity: (customColor || selectedCategories.length > 0) ? 0.6 : 0
                   }}
                />
              </div>
            </div>

            {/* 색상 */}
            <div className="flex items-center gap-4 pt-1">
              <span className={`${LABEL} min-w-[70px]`}><Palette className="w-4 h-4 mr-1.5 text-muted-foreground"/>색상</span>
              <div className="flex flex-wrap items-center gap-[6px]">
                {COLOR_SWATCHES.slice(0, 14).map(c => (
                  <button key={c} type="button" onClick={() => setCustomColor(c === customColor ? null : c)}
                    className={`w-[20px] h-[20px] rounded-full transition-all hover:scale-110 ${customColor === c ? 'ring-2 ring-offset-2 ring-[#007AFF] scale-110' : 'opacity-85 hover:opacity-100'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* ▸ 메모 카드 */}
          <div className={`${CARD} px-5 py-4 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-shadow`}>
            <span className={`${LABEL} block mb-2`}><AlignLeft className="w-4 h-4 mr-1.5 text-muted-foreground" />상세 메모</span>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="일정에 대한 추가 메모를 남겨주세요."
              className="w-full min-h-[64px] text-[14px] text-foreground font-medium bg-transparent focus:outline-none resize-none placeholder:text-muted-foreground" />
          </div>

          {/* ▸ 첨부파일 카드 */}
          <div className={`${CARD} px-5 py-4`}>
            <span className={`${LABEL} block mb-3`}><Paperclip className="w-4 h-4 mr-1.5 text-muted-foreground" />첨부파일</span>
            {attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {attachments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/80 border border-border/80">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-card shadow-sm flex items-center justify-center shrink-0">
                        {a.type === 'image' ? <ImageIcon className="w-4 h-4 text-sky-500" /> : a.type === 'link' ? <LinkIcon className="w-4 h-4 text-violet-500" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-[13px] font-bold text-foreground truncate">{a.name}</span>
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-[#007AFF] hover:underline truncate">{a.url}</a>
                      </div>
                    </div>
                    <button type="button" onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <Popover>
              <PopoverTrigger disabled={isUploading}
                className="w-full py-3 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:text-[#007AFF] hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all group disabled:opacity-50">
                <Plus className="w-4 h-4 group-hover:text-[#007AFF] transition-colors" />
                <span className="text-[13px] font-bold">{isUploading ? '업로드 중...' : '첨부파일 추가'}</span>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 rounded-xl" align="center">
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg hover:bg-muted transition-colors text-foreground">
                    <Upload className="w-4 h-4" /> 내 컴퓨터에서 업로드
                  </button>
                  <button type="button" onClick={handleAddLink}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg hover:bg-muted transition-colors text-foreground">
                    <LinkIcon className="w-4 h-4" /> URL 링크 추가
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          </div>

          {/* 아젠다 동시 등록 토글 */}
          <div className="px-5 py-4 flex items-center justify-between bg-indigo-50/50 rounded-[20px] border border-indigo-100/50">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-indigo-900 flex items-center gap-1.5">
                <span className="text-indigo-500">✨</span> 아젠다에도 등록하기
              </span>
              <span className="text-[11px] font-medium text-indigo-600/70 mt-0.5">
                저장 후 아젠다 세부 입력 폼이 나타납니다.
              </span>
            </div>
            <button type="button" onClick={() => setIsAlsoAgenda(!isAlsoAgenda)}
              className={`w-[50px] h-[30px] rounded-full transition-colors relative shrink-0 ${isAlsoAgenda ? 'bg-indigo-500' : 'bg-slate-200'}`}>
              <div className={`w-[26px] h-[26px] bg-card rounded-full shadow-sm transition-transform absolute top-[2px] ${isAlsoAgenda ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          </div>
        </div>

        {/* ── FOOTER: 취소/저장 하단 고정 ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(0,0,0,0.04)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}>
          <Button type="button" variant="ghost" onClick={closeAddEvent}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full px-5 h-10 text-[15px] font-medium">
            취소
          </Button>
          <Button type="button" onClick={() => handleSubmit()} disabled={isCreating || isUpdating}
            className="bg-[#007AFF] hover:bg-[#0056b3] text-white rounded-full px-7 h-10 text-[15px] font-bold shadow-lg shadow-[#007AFF]/25 transition-all active:scale-95 disabled:opacity-50">
            {isCreating || isUpdating ? '저장 중...' : '저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
