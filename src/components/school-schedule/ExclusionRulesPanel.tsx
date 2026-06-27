'use client'

import React, { useState } from 'react'
import { Plus, X, Filter, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useExclusionRules, useAddExclusionRule, useDeleteExclusionRule } from '@/hooks/useCalendarQueries'

export function ExclusionRulesPanel() {
  const { data: rules = [], isLoading } = useExclusionRules()
  const addRule = useAddExclusionRule()
  const deleteRule = useDeleteExclusionRule()
  const [keyword, setKeyword] = useState('')

  const handleAdd = async () => {
    const k = keyword.trim()
    if (!k) return
    try {
      await addRule.mutateAsync(k)
      setKeyword('')
      toast.success(`'${k}' 제외 규칙을 추가했습니다.`)
    } catch (e: any) {
      toast.error(e.message || '추가에 실패했습니다.')
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <Filter className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold">제외 키워드 규칙</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            등록·재동기화 시 제목에 이 키워드가 포함된 일정은 자동으로 제외됩니다. (모든 링크에 공통 적용)
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="예: 좋은수업, 유치원"
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
        <button
          onClick={handleAdd}
          disabled={addRule.isPending || !keyword.trim()}
          className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          {addRule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          추가
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">불러오는 중…</div>
      ) : rules.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
          등록된 제외 규칙이 없습니다. 위에서 키워드를 추가하세요.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rules.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-sm font-medium"
            >
              {r.keyword}
              <button
                onClick={async () => {
                  try {
                    await deleteRule.mutateAsync(r.id)
                  } catch (e: any) {
                    toast.error(e.message || '삭제 실패')
                  }
                }}
                className="p-0.5 rounded-full hover:bg-rose-200/70 transition-colors"
                aria-label="삭제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
