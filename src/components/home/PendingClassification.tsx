'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { usePendingActivities, useAssignCategoryToPendingActivity, useCategories } from '@/hooks/useCalendarQueries'
import { Button } from '@/components/ui/button'

export function PendingClassification() {
  const { data: pendingActivities, isLoading } = usePendingActivities()
  const { data: categories } = useCategories()
  const { mutate: assignCategory, isPending } = useAssignCategoryToPendingActivity()

  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({})

  if (isLoading) return null
  if (!pendingActivities || pendingActivities.length === 0) return null

  const handleAssign = (activityId: string) => {
    const categoryId = selectedCategories[activityId]
    if (!categoryId) return
    assignCategory({ activityId, categoryId })
  }

  const handleSelectChange = (activityId: string, categoryId: string) => {
    setSelectedCategories(prev => ({ ...prev, [activityId]: categoryId }))
  }

  return (
    <div className="h-full flex flex-col bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-indigo-50 shadow-[0_8px_30px_rgb(99,102,241,0.08)] relative overflow-hidden ring-1 ring-white/50">
      {/* Decorative gradient blur at the top */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-transparent pointer-events-none" />
      
      <div className="p-5 md:p-6 pb-4 flex items-center justify-between shrink-0 relative z-10 border-b border-indigo-50/50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-inner border border-white/50 shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">분류 대기 중인 일정</h2>
            <p className="text-[11px] md:text-xs text-slate-500 font-medium">새 일정의 카테고리를 지정하세요.</p>
          </div>
        </div>
        <div className="ml-2 bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm shrink-0">
          {pendingActivities.length}
        </div>
      </div>

      <div className="px-5 md:px-6 pb-5 pt-2 flex-1 overflow-y-auto hide-scrollbar space-y-3 relative z-10">
        <AnimatePresence>
          {pendingActivities.map((activity) => {
            const timeStr = activity.is_all_day 
              ? '종일' 
              : format(new Date(activity.start_time), 'a h:mm', { locale: ko })
            
            const dateStr = format(new Date(activity.start_time), 'M월 d일 (E)', { locale: ko })
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-indigo-50 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] md:text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {dateStr} {timeStr}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-800 leading-snug break-words">
                    {activity.title || '(제목 없음)'}
                  </h3>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 pt-1">
                  <select
                    className="flex-1 min-w-[120px] text-[11px] md:text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2 md:px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    value={selectedCategories[activity.id] || ''}
                    onChange={(e) => handleSelectChange(activity.id, e.target.value)}
                  >
                    <option value="" disabled>카테고리 선택</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    className="rounded-xl px-3 md:px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none transition-all h-8 md:h-9 text-xs w-full sm:w-auto"
                    disabled={!selectedCategories[activity.id] || isPending}
                    onClick={() => handleAssign(activity.id)}
                  >
                    배정
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
