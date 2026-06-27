'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Sparkles, Cpu, CheckCircle2, CalendarDays } from 'lucide-react'

export type PreviewItem = { date: string; title: string; note?: string }
export type PreviewTone = 'add' | 'dup' | 'exclude' | 'remove' | 'keep'
export type PreviewGroup = {
  key: string
  label: string
  tone: PreviewTone
  items: PreviewItem[]
}

const TONE_STYLE: Record<PreviewTone, { dot: string; chip: string; text: string }> = {
  add: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-foreground' },
  keep: { dot: 'bg-slate-300', chip: 'bg-slate-50 text-slate-600 border-slate-200', text: 'text-muted-foreground' },
  dup: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-muted-foreground' },
  exclude: { dot: 'bg-rose-400', chip: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-muted-foreground line-through' },
  remove: { dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-muted-foreground line-through' },
}

interface SheetImportDialogProps {
  open: boolean
  title: string
  parser?: 'rule' | 'llm'
  groups: PreviewGroup[]
  confirmLabel: string
  confirmTone?: 'primary' | 'danger'
  loading?: boolean
  emptyHint?: string
  onConfirm: () => void
  onClose: () => void
}

export function SheetImportDialog({
  open,
  title,
  parser,
  groups,
  confirmLabel,
  confirmTone = 'primary',
  loading,
  emptyHint,
  onConfirm,
  onClose,
}: SheetImportDialogProps) {
  const totalItems = groups.reduce((s, g) => s + g.items.length, 0)
  const confirmCls =
    confirmTone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : 'bg-sky-600 hover:bg-sky-700 text-white'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={loading ? undefined : onClose} />
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative bg-card w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-base font-bold truncate">{title}</h2>
                {parser && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      parser === 'rule'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-violet-50 text-violet-700 border-violet-200'
                    }`}
                  >
                    {parser === 'rule' ? <Sparkles className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                    {parser === 'rule' ? '규칙 파서' : 'Gemini'}
                  </span>
                )}
              </div>
              <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary chips */}
            <div className="px-5 py-3 border-b border-border flex flex-wrap gap-2 shrink-0">
              {groups.map((g) => (
                <span key={g.key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${TONE_STYLE[g.tone].chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${TONE_STYLE[g.tone].dot}`} />
                  {g.label} {g.items.length}
                </span>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {totalItems === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
                  <CheckCircle2 className="w-8 h-8 opacity-30" />
                  <p className="text-sm">{emptyHint || '표시할 항목이 없습니다.'}</p>
                </div>
              )}
              {groups
                .filter((g) => g.items.length > 0)
                .map((g) => (
                  <div key={g.key}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${TONE_STYLE[g.tone].dot}`} />
                      <span className="text-xs font-bold text-foreground">{g.label}</span>
                      <span className="text-xs text-muted-foreground">({g.items.length})</span>
                    </div>
                    <div className="space-y-0.5">
                      {g.items.map((it, i) => (
                        <div key={`${g.key}-${i}`} className="flex items-start gap-2 px-2 py-1 rounded-md hover:bg-muted/50 text-sm">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground shrink-0 mt-0.5 tabular-nums">
                            <CalendarDays className="w-3 h-3" />
                            {it.date.slice(5)}
                          </span>
                          <span className={`flex-1 leading-snug ${TONE_STYLE[g.tone].text}`}>
                            {it.title}
                            {it.note && <span className="ml-1 text-[11px] text-muted-foreground">· {it.note}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
              <button onClick={onClose} disabled={loading} className="px-3.5 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted disabled:opacity-50">
                취소
              </button>
              <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60 ${confirmCls}`}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
