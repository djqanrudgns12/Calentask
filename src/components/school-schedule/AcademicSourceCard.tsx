'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { RefreshCw, Link2Off, ExternalLink, Pencil, Check, X, Loader2, CalendarRange, Clock, Hash, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { useCategories, useUpdateAcademicSource } from '@/hooks/useCalendarQueries'
import type { AcademicSource } from '@/app/actions/academicData'

interface Props {
  source: AcademicSource
  onResync: (source: AcademicSource) => void
  onDelete: (source: AcademicSource) => void
  resyncing?: boolean
}

export function AcademicSourceCard({ source, onResync, onDelete, resyncing }: Props) {
  const { data: categories = [] } = useCategories()
  const updateSource = useUpdateAcademicSource()
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(source.label || '')

  const realCategories = categories.filter((c) => c.user_id !== 'system' && !c.id.startsWith('temp-'))
  const kindLabel = source.sheet_kind === 'weekly' ? '주간' : source.sheet_kind === 'monthly' ? '월중' : '자동'

  const saveLabel = async () => {
    try {
      await updateSource.mutateAsync({ sourceId: source.id, patch: { label: labelDraft.trim() || null } })
      setEditingLabel(false)
    } catch (e: any) {
      toast.error(e.message || '저장 실패')
    }
  }

  const changeCategory = async (categoryId: string) => {
    try {
      await updateSource.mutateAsync({ sourceId: source.id, patch: { category_id: categoryId || null } })
      toast.success(categoryId ? '메인 캘린더 노출 카테고리를 설정했습니다.' : '메인 캘린더 노출을 해제했습니다.')
    } catch (e: any) {
      toast.error(e.message || '변경 실패')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* 제목/별칭 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          {editingLabel ? (
            <div className="flex items-center gap-1.5">
              <input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveLabel()}
                placeholder="별칭 (예: 6월 월중계획)"
                autoFocus
                className="flex-1 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button onClick={saveLabel} className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setEditingLabel(false); setLabelDraft(source.label || '') }} className="p-1 rounded-md text-muted-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm truncate">{source.label || '제목 없는 링크'}</h3>
              <button onClick={() => setEditingLabel(true)} className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted shrink-0">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline mt-0.5 max-w-full truncate"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{source.url.replace(/^https?:\/\//, '').slice(0, 48)}…</span>
          </a>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold">{source.year}년 · {kindLabel}</span>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground mb-3">
        <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{source.event_count}건</span>
        <span className="inline-flex items-center gap-1"><CalendarRange className="w-3 h-3" />{format(new Date(source.created_at), 'yy.MM.dd HH:mm')} 등록</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {source.last_synced_at ? `${format(new Date(source.last_synced_at), 'yy.MM.dd HH:mm')} 동기화` : '미동기화'}
        </span>
      </div>

      {/* 메인 노출 카테고리 */}
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <select
          value={source.category_id || ''}
          onChange={(e) => changeCategory(e.target.value)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          <option value="">메인 캘린더에 표시 안 함 (학사일정 탭 전용)</option>
          {realCategories.map((c) => (
            <option key={c.id} value={c.id}>메인에 표시 · {c.name}</option>
          ))}
        </select>
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onResync(source)}
          disabled={resyncing}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-accent text-sm font-medium disabled:opacity-50"
        >
          {resyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          재동기화
        </button>
        <button
          onClick={() => onDelete(source)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-medium"
        >
          <Link2Off className="w-4 h-4" />
          연결 해제
        </button>
      </div>
    </div>
  )
}
