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
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl border border-indigo-100 dark:border-indigo-900/30 p-5 md:p-6 shadow-sm mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">분류 대기 중인 일정</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">구글 캘린더에서 가져온 새 일정의 카테고리를 지정해주세요.</p>
        </div>
        <div className="ml-auto bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 text-xs font-bold px-2 py-1 rounded-full">
          {pendingActivities.length}
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {pendingActivities.map((activity) => {
            const timeStr = activity.is_all_day 
              ? '종일' 
              : format(new Date(activity.start_time), 'a h:mm', { locale: ko })
            
            const dateStr = format(new Date(activity.start_time), 'M월 d일 (E)', { locale: ko })
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white dark:bg-zinc-800/80 rounded-2xl border border-slate-100 dark:border-zinc-700/50 shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {dateStr} {timeStr}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                    {activity.title || '(제목 없음)'}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow min-w-[120px]"
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
                    className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
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
