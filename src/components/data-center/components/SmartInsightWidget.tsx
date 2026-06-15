'use client'

import { Category } from '@/app/actions/calendar'
import { FolderKanban, Flame, ClockAlert } from 'lucide-react'

interface SmartInsightWidgetProps {
  categories: Category[] | null
  getUsageCount: (id: string) => number
}

export function SmartInsightWidget({ categories, getUsageCount }: SmartInsightWidgetProps) {
  if (!categories || categories.length === 0) return null

  const totalCategories = categories.length
  
  // 가장 일정이 많은 카테고리 찾기 (Hot)
  let hotCategory: Category | null = null
  let maxCount = -1
  for (const cat of categories) {
    const count = getUsageCount(cat.id)
    if (count > maxCount) {
      maxCount = count
      hotCategory = cat
    }
  }

  // 이번 주 마감 임박은 일단 더미 데이터로 표시하거나 로직 추가 (추후 Phase 3에서 고도화)
  // 현재는 단순 UI 용
  const urgentCategory = categories.length > 1 ? categories[1] : categories[0]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
          <FolderKanban className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-600/80 mb-0.5">총 카테고리 수</p>
          <p className="text-2xl font-black text-indigo-950">{totalCategories}개</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-rose-600/80 mb-0.5">가장 활발한 카테고리</p>
          <p className="text-xl font-black text-rose-950 truncate max-w-[150px]">
            {hotCategory ? hotCategory.name : '-'}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
          <ClockAlert className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-600/80 mb-0.5">최근 활동/추가된</p>
          <p className="text-xl font-black text-amber-950 truncate max-w-[150px]">
            {urgentCategory ? urgentCategory.name : '-'}
          </p>
        </div>
      </div>
    </div>
  )
}
