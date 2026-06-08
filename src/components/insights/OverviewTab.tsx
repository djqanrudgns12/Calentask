'use client'

import { useState, useMemo } from 'react'
import { useInsightsData, useActivityTemplates, useOverviewKPI } from '@/hooks/useInsightsQueries'
import { useCategories } from '@/hooks/useCalendarQueries'
import { useInsightsFilterStore } from '@/store/useInsightsFilterStore'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import WeeklySummaryCard from './WeeklySummaryCard'
import ActivityBreakdownGrid from './ActivityBreakdownGrid'
import QuickAddCarousel from './QuickAddCarousel'
import SubjectDetailSheet from './SubjectDetailSheet'
import DashboardFilterBar from './DashboardFilterBar'
import SmartInsightComment from './SmartInsightComment'
import ActivityHeatmap from './ActivityHeatmap'
import ActivityPunchCard from './ActivityPunchCard'
import AnnualGoalWidget from './AnnualGoalWidget'
import DDayWidget from './DDayWidget'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, startOfDay, endOfDay, subMonths, subYears, differenceInDays } from 'date-fns'
import { Activity } from '@/app/actions/calendar'
import { motion } from 'framer-motion'
import { Clock, CheckSquare, FileText, Flame, TrendingUp, TrendingDown } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

function getPresetRange(period: string) {
  const now = new Date()
  switch (period) {
    case 'week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month': return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'year': return { from: startOfYear(now), to: endOfYear(now) }
    case 'single': return { from: now, to: now }
    default: return { from: subDays(now, 30), to: now }
  }
}

function processInsightsData(raw: Activity[], activityType: string, selectedCategoryIds: string[]) {
  let filtered = raw
  if (activityType !== 'ALL') filtered = filtered.filter(a => a.type === activityType)
  if (selectedCategoryIds.length > 0) {
    filtered = filtered.filter(a => a.categories?.some(c => selectedCategoryIds.includes(c.id)))
  }

  const breakdown: Record<string, any> = {}
  const weeklyData: { day: string; hours: number }[] = []
  let totalMinutes = 0
  let totalCount = 0

  const dayMap: Record<string, number> = {}
  filtered.forEach(act => {
    const mins = (new Date(act.end_time).getTime() - new Date(act.start_time).getTime()) / 60000
    totalMinutes += mins
    totalCount++

    const dayKey = new Date(act.start_time).toLocaleDateString('ko-KR', { weekday: 'short' })
    dayMap[dayKey] = (dayMap[dayKey] || 0) + mins

    if (act.categories) {
      act.categories.forEach(cat => {
        if (!breakdown[cat.id]) {
          breakdown[cat.id] = { name: cat.name, hex_color: cat.hex_color, minutes: 0, count: 0 }
        }
        breakdown[cat.id].minutes += mins
        breakdown[cat.id].count++
      })
    }
  })

  Object.entries(dayMap).forEach(([day, mins]) => {
    weeklyData.push({ day, hours: Number((mins / 60).toFixed(1)) })
  })

  return {
    summary: { totalHours: Number((totalMinutes / 60).toFixed(1)), totalCount },
    breakdown,
    weeklyData
  }
}

export default function OverviewTab() {
  const {
    period, customDateRange, singleDate, activityType, selectedCategoryIds, setCustomDateRange
  } = useInsightsFilterStore()
  const { data: categoriesData = [] } = useCategories()
  const { data: templates = [] } = useActivityTemplates()
  const { data: kpi, isLoading: isLoadingKPI } = useOverviewKPI()

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  const fromDate = period === 'single' && singleDate
    ? startOfDay(singleDate)
    : customDateRange?.from ? startOfDay(customDateRange.from) : getPresetRange(period).from
  const toDate = period === 'single' && singleDate
    ? endOfDay(singleDate)
    : customDateRange?.to ? endOfDay(customDateRange.to) : getPresetRange(period).to

  const startDateIso = fromDate.toISOString()
  const endDateIso = toDate.toISOString()

  // 이전 기간
  const diff = differenceInDays(toDate, fromDate) + 1
  const prevFrom = subDays(fromDate, diff)
  const prevTo = subDays(toDate, diff)
  const prevStartIso = prevFrom.toISOString()
  const prevEndIso = prevTo.toISOString()

  const { data: insightsData, isLoading: isLoadingInsights } = useInsightsData(startDateIso, endDateIso)
  const { data: prevInsightsData } = useInsightsData(prevStartIso, prevEndIso)

  const processedData = useMemo(() => {
    if (!insightsData?.rawData) return { summary: { totalHours: 0, totalCount: 0 }, breakdown: {}, weeklyData: [] }
    return processInsightsData(insightsData.rawData as Activity[], activityType, selectedCategoryIds)
  }, [insightsData?.rawData, activityType, selectedCategoryIds])

  const prevProcessedData = useMemo(() => {
    if (!prevInsightsData?.rawData) return null
    const d = processInsightsData(prevInsightsData.rawData as Activity[], activityType, selectedCategoryIds)
    return d.summary
  }, [prevInsightsData?.rawData, activityType, selectedCategoryIds])

  // 레이더 차트 데이터
  const radarData = useMemo(() => {
    if (!kpi) return []
    const maxHours = Math.max(kpi.currentWeekHours, kpi.prevWeekHours, 10)
    const maxDone = Math.max(kpi.currentWeekDone, kpi.prevWeekDone, 5)
    const maxSession = Math.max(kpi.avgSessionMins, 60)
    const maxStreak = Math.max(kpi.currentStreak, kpi.maxStreak, 7)
    const totalCats = Math.max(kpi.totalCategoryCount, 1)

    return [
      { axis: '투입량', current: (kpi.currentWeekHours / maxHours) * 100, prev: (kpi.prevWeekHours / maxHours) * 100 },
      { axis: '실행력', current: (kpi.currentWeekDone / maxDone) * 100, prev: (kpi.prevWeekDone / maxDone) * 100 },
      { axis: '집중도', current: Math.min((kpi.avgSessionMins / maxSession) * 100, 100), prev: 50 },
      { axis: '꾸준함', current: (kpi.currentStreak / maxStreak) * 100, prev: 50 },
      { axis: '다양성', current: (kpi.activeCategoryCount / totalCats) * 100, prev: 50 },
    ]
  }, [kpi])

  const getChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prev) / prev) * 100)
  }

  const topCategoryColor = useMemo(() => {
    const cats = Object.values(processedData.breakdown) as any[]
    if (cats.length === 0) return null
    return cats.sort((a, b) => b.minutes - a.minutes)[0]?.hex_color || null
  }, [processedData.breakdown])

  return (
    <>
      <DashboardFilterBar categories={categoriesData} />

      {/* ── Hero KPI Strip ── */}
      {kpi && !isLoadingKPI && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
        >
          {/* 투입 시간 */}
          <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[11px] mb-2">
              <Clock size={13} className="text-blue-400" /> 투입 시간
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] font-black text-gray-900 tracking-tighter">{kpi.currentWeekHours}</span>
              <span className="text-[13px] font-bold text-gray-400">h</span>
            </div>
            {(() => {
              const ch = getChange(kpi.currentWeekHours, kpi.prevWeekHours)
              if (ch === 0) return null
              return (
                <div className={`flex items-center gap-0.5 mt-1 text-[11px] font-bold ${ch > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {ch > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(ch)}% vs 전주
                </div>
              )
            })()}
          </div>

          {/* 완료한 할 일 */}
          <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[11px] mb-2">
              <CheckSquare size={13} className="text-emerald-400" /> 완료한 할 일
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] font-black text-gray-900 tracking-tighter">{kpi.currentWeekDone}</span>
              <span className="text-[13px] font-bold text-gray-400">건</span>
            </div>
            {(() => {
              const ch = getChange(kpi.currentWeekDone, kpi.prevWeekDone)
              if (ch === 0) return null
              return (
                <div className={`flex items-center gap-0.5 mt-1 text-[11px] font-bold ${ch > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {ch > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(ch)}% vs 전주
                </div>
              )
            })()}
          </div>

          {/* 아카이브 메모 */}
          <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[11px] mb-2">
              <FileText size={13} className="text-purple-400" /> 아카이브 메모
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] font-black text-gray-900 tracking-tighter">{kpi.currentWeekNotes}</span>
              <span className="text-[13px] font-bold text-gray-400">건</span>
            </div>
            {(() => {
              const ch = getChange(kpi.currentWeekNotes, kpi.prevWeekNotes)
              if (ch === 0) return null
              return (
                <div className={`flex items-center gap-0.5 mt-1 text-[11px] font-bold ${ch > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {ch > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(ch)}% vs 전주
                </div>
              )
            })()}
          </div>

          {/* 연속 기록일 */}
          <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[11px] mb-2">
              <Flame size={13} className="text-orange-400" /> 연속 기록일
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] font-black text-gray-900 tracking-tighter">{kpi.currentStreak}</span>
              <span className="text-[13px] font-bold text-gray-400">일</span>
            </div>
            <div className="text-[11px] font-bold text-gray-400 mt-1">
              최고 {kpi.maxStreak}일
            </div>
          </div>
        </motion.div>
      )}

      {isLoadingInsights ? (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="flex gap-4">
            <div className="h-[120px] bg-gray-100 rounded-3xl flex-1" />
            <div className="h-[120px] bg-gray-100 rounded-3xl w-32" />
          </div>
          <div className="h-[280px] bg-gray-100 rounded-3xl w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            <div className="col-span-1 lg:col-span-8">
              <SmartInsightComment
                activities={insightsData?.rawData as any || []}
                prevActivities={prevInsightsData?.rawData as any || []}
              />
            </div>
            <div className="col-span-1 lg:col-span-4">
              {period === 'single' ? <DDayWidget /> : <AnnualGoalWidget />}
            </div>

            <div className="col-span-1 lg:col-span-7">
              <WeeklySummaryCard
                totalHours={processedData.summary.totalHours}
                totalCount={processedData.summary.totalCount}
                prevTotalHours={prevProcessedData?.totalHours}
                prevTotalCount={prevProcessedData?.totalCount}
                chartData={processedData.weeklyData}
                period={period}
              />
            </div>
            <div className="col-span-1 lg:col-span-5">
              <ActivityBreakdownGrid
                breakdown={processedData.breakdown}
                onSelectSubject={(id) => setSelectedSubjectId(id)}
              />
            </div>

            {/* 생산성 균형 레이더 */}
            {radarData.length > 0 && (
              <div className="col-span-1 lg:col-span-12">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100"
                >
                  <h3 className="text-[17px] font-extrabold text-gray-900 tracking-tight mb-1">생산성 균형 레이더</h3>
                  <p className="text-[12px] font-bold text-gray-400 mb-2">이번 주(실선) vs 전주(점선) 비교</p>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 13, fill: '#6B7280', fontWeight: 700 }} />
                        <Radar name="이번 주" dataKey="current" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} strokeWidth={2.5} />
                        <Radar name="전주" dataKey="prev" stroke="#D1D5DB" fill="transparent" strokeWidth={1.5} strokeDasharray="5 5" />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            )}

            <div className="col-span-1 lg:col-span-12 flex overflow-x-auto lg:grid lg:grid-cols-12 gap-4 lg:gap-6 pb-2 hide-scrollbar snap-x snap-mandatory overscroll-x-contain touch-pan-x">
              <div className="min-w-[90vw] lg:min-w-0 lg:col-span-6 snap-center">
                <ActivityHeatmap activities={insightsData?.rawData as any || []} />
              </div>
              <div className="min-w-[90vw] lg:min-w-0 lg:col-span-6 snap-center">
                <ActivityPunchCard activities={insightsData?.rawData as any || []} />
              </div>
            </div>
          </div>
        </>
      )}

      <QuickAddCarousel templates={templates} />

      <SubjectDetailSheet
        subjectId={selectedSubjectId}
        onClose={() => setSelectedSubjectId(null)}
        startDate={startDateIso}
        endDate={endDateIso}
        breakdownInfo={selectedSubjectId && processedData.breakdown[selectedSubjectId] ? processedData.breakdown[selectedSubjectId] : null}
      />
    </>
  )
}
