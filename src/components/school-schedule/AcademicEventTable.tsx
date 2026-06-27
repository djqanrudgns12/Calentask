'use client'

import React, { useState, useEffect } from 'react'
import { Search, Pencil, Trash2, Check, X, Loader2, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAcademicSources,
  useSearchAcademicEvents,
  useUpdateAcademicEvent,
  useDeleteAcademicEvents,
} from '@/hooks/useCalendarQueries'

export function AcademicEventTable() {
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftDate, setDraftDate] = useState('')
  const [draftTitle, setDraftTitle] = useState('')

  // 검색 디바운스
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 300)
    return () => clearTimeout(t)
  }, [rawQuery])

  const { data: sources = [] } = useAcademicSources()
  const { data: events = [], isLoading } = useSearchAcademicEvents({
    query: query || undefined,
    sourceId: sourceId || undefined,
  })
  const updateEvent = useUpdateAcademicEvent()
  const deleteEvents = useDeleteAcademicEvents()

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = events.length > 0 && events.every((e) => selected.has(e.id))
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(events.map((e) => e.id)))
  }

  const startEdit = (id: string, date: string, title: string) => {
    setEditingId(id)
    setDraftDate(date)
    setDraftTitle(title)
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      await updateEvent.mutateAsync({ id: editingId, patch: { date: draftDate, title: draftTitle } })
      setEditingId(null)
      toast.success('수정되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '수정 실패')
    }
  }

  const removeOne = async (id: string) => {
    try {
      await deleteEvents.mutateAsync([id])
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
    } catch (e: any) {
      toast.error(e.message || '삭제 실패')
    }
  }

  const removeSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`선택한 ${selected.size}건을 삭제하시겠습니까?`)) return
    try {
      await deleteEvents.mutateAsync(Array.from(selected))
      setSelected(new Set())
      toast.success('삭제되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '삭제 실패')
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 검색/필터 바 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="제목으로 검색…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          <option value="">모든 소스</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.label || s.url.replace(/^https?:\/\//, '').slice(0, 30)}</option>
          ))}
        </select>
      </div>

      {/* 선택 액션 바 */}
      <div className="flex items-center justify-between mb-2 px-1 shrink-0">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
          전체 선택 ({events.length}건)
        </label>
        {selected.size > 0 && (
          <button
            onClick={removeSelected}
            disabled={deleteEvents.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {selected.size}건 삭제
          </button>
        )}
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Inbox className="w-8 h-8 opacity-30" />
            <p className="text-sm">등록된 학사일정이 없습니다.</p>
          </div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40">
              <input type="checkbox" checked={selected.has(ev.id)} onChange={() => toggleSelect(ev.id)} className="rounded shrink-0" />
              {editingId === ev.id ? (
                <div className="flex-1 flex flex-col sm:flex-row gap-1.5">
                  <input
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    className="px-2 py-1 rounded-md border border-border bg-background text-sm w-full sm:w-auto"
                  />
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    autoFocus
                    className="flex-1 px-2 py-1 rounded-md border border-border bg-background text-sm"
                  />
                  <div className="flex items-center gap-1">
                    <button onClick={saveEdit} disabled={updateEvent.isPending} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50">
                      {updateEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0 w-[88px]">{ev.event_date}</span>
                  <span className="flex-1 text-sm truncate">{ev.title}</span>
                  {ev.source_label && (
                    <span className="hidden md:inline text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 max-w-[120px] truncate">{ev.source_label}</span>
                  )}
                  <button onClick={() => startEdit(ev.id, ev.event_date, ev.title)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeOne(ev.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
