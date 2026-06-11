'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { Plus, Pencil, Trash2, BarChart3, Clock, CalendarDays, Trophy, Medal, TrendingUp, TrendingDown, Minus, MoreVertical } from 'lucide-react'
import { useAllTemplatesSummary, useDeleteTemplate } from '@/hooks/useInsightsQueries'
import { useCategories } from '@/hooks/useCalendarQueries'
import { TemplateFormDialog } from './TemplateFormDialog'
import { TemplateAnalyticsSheet } from './TemplateAnalyticsSheet'
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { startOfMonth, endOfMonth } from 'date-fns'
import type { ActivityTemplate } from '@/app/actions/insights'

export default function TemplateCenterTab() {
  const now = new Date()
  const startDateIso = startOfMonth(now).toISOString()
  const endDateIso = endOfMonth(now).toISOString()

  const { data: summaries = [], isLoading } = useAllTemplatesSummary(startDateIso, endDateIso)
  const { data: categories = [] } = useCategories()
  const { mutate: deleteTemplate } = useDeleteTemplate()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null)
  const [analyticsTemplateId, setAnalyticsTemplateId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // 랭킹 정렬 (이번 달 시간 기준)
  const ranked = useMemo(() => 
    [...summaries].sort((a, b) => b.currentMonthHours - a.currentMonthHours),
    [summaries]
  )

  const totalMonthHours = useMemo(() => 
    ranked.reduce((acc, s) => acc + s.currentMonthHours, 0),
    [ranked]
  )

  const handleCreateNew = () => {
    setEditingTemplate(null)
    setIsFormOpen(true)
  }

  const handleEdit = (summary: typeof summaries[0]) => {
    const catIds = summary.categoryNames || []
    setEditingTemplate({
      id: summary.templateId,
      title: summary.title,
      category_id: catIds[0] || '',
      category_ids: catIds,
      duration_minutes: summary.avgSessionMinutes,
      hex_color: summary.hexColor,
    } as ActivityTemplate)
    setIsFormOpen(true)
    setOpenMenuId(null)
  }

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`'${title}' 템플릿을 삭제하시겠습니까?`)) {
      deleteTemplate(id)
    }
    setOpenMenuId(null)
  }

  const getMedalIcon = (idx: number) => {
    if (idx === 0) return <Trophy className="w-4 h-4 text-amber-500" />
    if (idx === 1) return <Medal className="w-4 h-4 text-gray-400" />
    if (idx === 2) return <Medal className="w-4 h-4 text-amber-700" />
    return null
  }

  const getChangePercent = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prev) / prev) * 100)
  }

  const analyticsTemplate = summaries.find(s => s.templateId === analyticsTemplateId)

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse mt-4">
        <div className="h-16 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-3xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-2">
      {/* ── 랭킹 요약 바 ── */}
      {ranked.length > 0 && totalMonthHours > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-400 tracking-wider">이번 달 템플릿 랭킹</h3>
            <span className="text-[13px] font-bold text-gray-900">총 {totalMonthHours.toFixed(1)}시간</span>
          </div>

          {/* 100% 스택 바 */}
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            {ranked.filter(s => s.currentMonthHours > 0).map((s, idx) => (
              <div
                key={s.templateId}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full relative group"
                style={{
                  width: `${Math.max((s.currentMonthHours / totalMonthHours) * 100, 2)}%`,
                  backgroundColor: s.hexColor,
                }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 whitespace-nowrap">
                  {s.title} · {s.currentMonthHours}h ({Math.round((s.currentMonthHours / totalMonthHours) * 100)}%)
                </div>
              </div>
            ))}
          </div>

          {/* 상위 3개 텍스트 */}
          <div className="flex items-center gap-4 flex-wrap">
            {ranked.slice(0, 3).map((s, idx) => (
              <div key={s.templateId} className="flex items-center gap-1.5 text-[12px]">
                {getMedalIcon(idx)}
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.hexColor }} />
                <span className="font-bold text-gray-700">{s.title}</span>
                <span className="font-bold text-gray-400">{s.currentMonthHours}h</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 템플릿 카드 그리드 ── */}
      {ranked.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleCreateNew}
          className="text-center py-16 px-4 bg-white rounded-[24px] border border-dashed border-gray-300 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors group"
        >
          <div className="w-14 h-14 bg-indigo-50 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            <Plus className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-indigo-900">템플릿이 없습니다</h3>
          <p className="text-sm text-gray-500 group-hover:text-indigo-600">첫 번째 템플릿을 만들어 활동을 추적해보세요.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ranked.map((summary, idx) => {
            const changePercent = getChangePercent(summary.currentMonthHours, summary.prevMonthHours)
            const isPositive = changePercent > 0
            const isNeutral = changePercent === 0
            const catNames = summary.categoryNames
              .map(id => categories.find(c => c.id === id)?.name)
              .filter(Boolean)
              .join(', ') || '미분류'

            return (
              <motion.div
                key={summary.templateId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 hover:shadow-lg transition-all group relative overflow-hidden"
              >
                {/* 좌측 색상 스트립 */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[24px]" style={{ backgroundColor: summary.hexColor }} />

                {/* 헤더 */}
                <div className="flex items-start justify-between mb-4 pl-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: summary.hexColor }} />
                    <div className="min-w-0">
                      <h4 className="text-[15px] font-bold text-gray-900 truncate">{summary.title}</h4>
                      <p className="text-[11px] font-medium text-gray-400 truncate">{catNames}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === summary.templateId ? null : summary.templateId)}
                      className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {openMenuId === summary.templateId && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 min-w-[120px]"
                        >
                          <button onClick={() => handleEdit(summary)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
                            <Pencil className="w-3.5 h-3.5" /> 편집
                          </button>
                          <button onClick={() => handleDelete(summary.templateId, summary.title)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-red-500 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" /> 삭제
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 이번 달 / 저번 달 통계 */}
                <div className="pl-3 mb-3">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[11px] font-bold text-gray-400">이번 달</span>
                    {!isNeutral && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isPositive ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50'
                      }`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(changePercent)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-[24px] font-black text-gray-900 tracking-tighter">{summary.currentMonthHours}</span>
                    <span className="text-[13px] font-bold text-gray-400">시간</span>
                    <span className="text-[13px] font-bold text-gray-300">·</span>
                    <span className="text-[13px] font-bold text-gray-500">{summary.currentMonthCount}회</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2 text-[12px] font-medium text-gray-400 bg-gray-50/80 px-2.5 py-1.5 rounded-lg w-fit">
                    <span className="font-bold text-gray-500">저번 달:</span>
                    <span className="font-bold text-gray-700">{summary.prevMonthHours}</span>
                    <span className="text-[11px]">시간</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-bold text-gray-700">{summary.prevMonthCount}</span>
                    <span className="text-[11px]">회</span>
                  </div>
                </div>

                {/* 스파크라인 */}
                <div className="h-[40px] w-full pl-3 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.dailyTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`spark-${summary.templateId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={summary.hexColor} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={summary.hexColor} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="minutes"
                        stroke={summary.hexColor}
                        strokeWidth={2}
                        fill={`url(#spark-${summary.templateId})`}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 총 누적 통계 */}
                <div className="pl-3 space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-[12px]">
                    <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold text-gray-500">총 누적:</span>
                    <span className="font-black text-gray-900">{summary.totalHours}시간</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">{summary.totalCount}회</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold text-gray-500">마지막 수행:</span>
                    <span className="font-bold text-gray-700">
                      {summary.lastPerformedAt 
                        ? formatDistanceToNow(new Date(summary.lastPerformedAt), { addSuffix: true, locale: ko })
                        : '기록 없음'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold text-gray-500">평균 세션:</span>
                    <span className="font-bold text-gray-700">
                      {summary.avgSessionMinutes >= 60
                        ? `${Math.floor(summary.avgSessionMinutes / 60)}시간 ${summary.avgSessionMinutes % 60}분`
                        : `${summary.avgSessionMinutes}분`}
                    </span>
                  </div>
                </div>

                {/* 상세 통계 버튼 */}
                <button
                  onClick={() => setAnalyticsTemplateId(summary.templateId)}
                  className="w-full pl-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 text-[13px] font-bold transition-colors border border-gray-100 hover:border-indigo-200"
                >
                  <BarChart3 className="w-4 h-4" />
                  상세 통계 보기
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── 새 템플릿 추가 버튼 ── */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleCreateNew}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 shadow-lg shadow-indigo-200/50 transition-all font-bold text-[15px] flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" /> 새 템플릿 추가
      </motion.button>

      {/* ── 폼 다이얼로그 ── */}
      <TemplateFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingTemplate={editingTemplate}
      />

      {/* ── 상세 통계 시트 ── */}
      <TemplateAnalyticsSheet
        templateId={analyticsTemplateId}
        templateTitle={analyticsTemplate?.title || ''}
        templateColor={analyticsTemplate?.hexColor || '#4f46e5'}
        onClose={() => setAnalyticsTemplateId(null)}
      />
    </div>
  )
}
