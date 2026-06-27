'use client'

import React, { useState } from 'react'
import { Database, Link as LinkIcon, Loader2, Sparkles, FolderSync, Filter, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAcademicSources,
  useRegisterAcademicSource,
  useApplyResyncAcademicSource,
  useDeleteAcademicSource,
} from '@/hooks/useCalendarQueries'
import {
  analyzeAcademicSheet,
  resyncAcademicSource,
  type AcademicSource,
  type AnalyzePreview,
  type ResyncPreview,
} from '@/app/actions/academicData'
import { SheetImportDialog, type PreviewGroup } from './SheetImportDialog'
import { AcademicSourceCard } from './AcademicSourceCard'
import { AcademicEventTable } from './AcademicEventTable'
import { ExclusionRulesPanel } from './ExclusionRulesPanel'

type InnerTab = 'sources' | 'data' | 'rules'

export function AcademicDataClient() {
  const [tab, setTab] = useState<InnerTab>('sources')

  // 링크 등록 폼
  const currentYear = new Date().getFullYear()
  const [url, setUrl] = useState('')
  const [year, setYear] = useState(currentYear)
  const [label, setLabel] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  // 등록 미리보기
  const [importPreview, setImportPreview] = useState<AnalyzePreview | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  // 재동기화
  const [resyncSource, setResyncSource] = useState<AcademicSource | null>(null)
  const [resyncPreview, setResyncPreview] = useState<ResyncPreview | null>(null)
  const [resyncOpen, setResyncOpen] = useState(false)
  const [resyncingId, setResyncingId] = useState<string | null>(null)

  const { data: sources = [], isLoading: sourcesLoading } = useAcademicSources()
  const registerSource = useRegisterAcademicSource()
  const applyResync = useApplyResyncAcademicSource()
  const deleteSource = useDeleteAcademicSource()

  // ── 분석 ──
  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error('구글 시트 링크를 입력해 주세요.')
      return
    }
    setAnalyzing(true)
    try {
      const preview = await analyzeAcademicSheet(url.trim(), year)
      setImportPreview(preview)
      setImportOpen(true)
    } catch (e: any) {
      toast.error(e.message || '분석에 실패했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── 등록 확정 ──
  const handleRegister = async () => {
    try {
      const r = await registerSource.mutateAsync({ url: url.trim(), year, label: label.trim() || undefined })
      toast.success(`추가 ${r.addedCount}건 · 중복 제외 ${r.crossDupCount}건 · 규칙 제외 ${r.excludedCount}건`)
      setImportOpen(false)
      setImportPreview(null)
      setUrl('')
      setLabel('')
    } catch (e: any) {
      toast.error(e.message || '등록에 실패했습니다.')
    }
  }

  // ── 재동기화 ──
  const handleResync = async (source: AcademicSource) => {
    setResyncingId(source.id)
    try {
      const preview = await resyncAcademicSource(source.id)
      setResyncSource(source)
      setResyncPreview(preview)
      setResyncOpen(true)
    } catch (e: any) {
      toast.error(e.message || '재동기화 분석에 실패했습니다.')
    } finally {
      setResyncingId(null)
    }
  }

  const handleApplyResync = async () => {
    if (!resyncSource) return
    try {
      const r = await applyResync.mutateAsync(resyncSource.id)
      toast.success(`추가 ${r.addedCount}건 · 삭제 ${r.removedCount}건 반영됨`)
      setResyncOpen(false)
      setResyncPreview(null)
      setResyncSource(null)
    } catch (e: any) {
      toast.error(e.message || '적용에 실패했습니다.')
    }
  }

  // ── 연결 해제 ──
  const handleDelete = async (source: AcademicSource) => {
    if (!confirm(`'${source.label || '이 링크'}'의 연결을 해제하시겠습니까?\n이 링크로 등록된 ${source.event_count}건이 함께 삭제됩니다.`)) return
    try {
      await deleteSource.mutateAsync(source.id)
      toast.success('연결을 해제하고 관련 일정을 삭제했습니다.')
    } catch (e: any) {
      toast.error(e.message || '삭제에 실패했습니다.')
    }
  }

  // ── 미리보기 그룹 구성 ──
  const importGroups: PreviewGroup[] = importPreview
    ? [
        { key: 'add', label: '등록 예정', tone: 'add', items: importPreview.toAdd },
        { key: 'dup', label: '다른 소스와 중복', tone: 'dup', items: importPreview.crossDuplicates },
        { key: 'ex', label: '제외 키워드', tone: 'exclude', items: importPreview.excluded.map((x) => ({ date: x.event.date, title: x.event.title, note: x.keyword })) },
      ]
    : []

  const resyncGroups: PreviewGroup[] = resyncPreview
    ? [
        { key: 'add', label: '추가', tone: 'add', items: resyncPreview.added },
        { key: 'rm', label: '삭제 예정(시트에서 사라짐)', tone: 'remove', items: resyncPreview.removed.map((r) => ({ date: r.event_date, title: r.title })) },
        { key: 'dup', label: '다른 소스와 중복', tone: 'dup', items: resyncPreview.crossDuplicates },
        { key: 'keep', label: '유지(이미 등록됨)', tone: 'keep', items: resyncPreview.unchanged },
      ]
    : []

  const tabs: { key: InnerTab; label: string; icon: React.ElementType }[] = [
    { key: 'sources', label: '링크 소스', icon: FolderSync },
    { key: 'data', label: '데이터 센터', icon: Database },
    { key: 'rules', label: '제외 규칙', icon: Filter },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* 헤더 */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold">학사일정 데이터 관리</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">구글 시트 링크로 학사일정을 등록하고, 등록된 데이터를 관리합니다.</p>
        </div>
      </div>

      {/* 내부 탭 */}
      <div className="px-4 md:px-6 pt-3 border-b border-border shrink-0">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === t.key
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        {tab === 'sources' && (
          <div className="space-y-5">
            {/* 링크 등록 바 */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold">구글 시트 링크 등록</h2>
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="별칭 (선택)"
                  className="md:w-40 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 shrink-0"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  분석
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                시트는 "링크가 있는 모든 사용자" 보기 권한으로 공개되어 있어야 합니다. 주간계획·월중계획 모두 지원합니다.
              </p>
            </div>

            {/* 소스 목록 */}
            {sourcesLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
              </div>
            ) : sources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2 border border-dashed border-border rounded-xl">
                <Inbox className="w-8 h-8 opacity-30" />
                <p className="text-sm">등록된 링크가 없습니다. 위에서 시트 링크를 분석해 등록하세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {sources.map((s) => (
                  <AcademicSourceCard
                    key={s.id}
                    source={s}
                    onResync={handleResync}
                    onDelete={handleDelete}
                    resyncing={resyncingId === s.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'data' && (
          <div className="h-full min-h-0">
            <AcademicEventTable />
          </div>
        )}

        {tab === 'rules' && <ExclusionRulesPanel />}
      </div>

      {/* 등록 미리보기 다이얼로그 */}
      <SheetImportDialog
        open={importOpen}
        title="시트 분석 결과"
        parser={importPreview?.parser}
        groups={importGroups}
        confirmLabel={`${importPreview?.toAdd.length || 0}건 등록`}
        loading={registerSource.isPending}
        emptyHint="등록할 새 일정이 없습니다."
        onConfirm={handleRegister}
        onClose={() => !registerSource.isPending && setImportOpen(false)}
      />

      {/* 재동기화 미리보기 다이얼로그 */}
      <SheetImportDialog
        open={resyncOpen}
        title={`재동기화 — ${resyncSource?.label || '링크'}`}
        groups={resyncGroups}
        confirmLabel="변경사항 적용"
        confirmTone={resyncPreview && resyncPreview.removed.length > 0 ? 'danger' : 'primary'}
        loading={applyResync.isPending}
        emptyHint="변경된 내용이 없습니다."
        onConfirm={handleApplyResync}
        onClose={() => !applyResync.isPending && setResyncOpen(false)}
      />
    </div>
  )
}
