'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useInsightsData } from '@/hooks/useInsightsQueries'
import { useCategories } from '@/hooks/useCalendarQueries'
import { useInsightsFilterStore } from '@/store/useInsightsFilterStore'
import DashboardFilterBar from './DashboardFilterBar'
import SubjectDetailSheet from './SubjectDetailSheet'
import { Activity } from '@/app/actions/calendar'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay, subDays, format, eachDayOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { LayoutGrid, TrendingUp, TrendingDown } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

function getPresetDateRange(period: string) {
  const now = new Date()
  switch (period) {
    case 'week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month': return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'year': return { from: startOfYear(now), to: endOfYear(now) }
    case 'single': return { from: now, to: now }
    default: return { from: subDays(now, 30), to: now }
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-lg text-[12px] font-bold z-50">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span style={{ color: p.color || p.fill }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}h</span>
        </div>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload
    return (
      <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-lg text-[12px] font-bold">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
          <span className="text-gray-900">{d.name}</span>
          <span className="text-gray-400 ml-1">{d.hours.toFixed(1)}h ({d.percentage}%)</span>
        </div>
      </div>
    )
  }
  return null
}

export default function TimeAnalysisTab() {
  const { period, customDateRange, singleDate, activityType, selectedCategoryIds, setCustomDateRange } = useInsightsFilterStore()
  const { data: categoriesData = [] } = useCategories()
  const categories = categoriesData

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  const fromDate = period === 'single' && singleDate
    ? startOfDay(singleDate)
    : customDateRange?.from ? startOfDay(customDateRange.from) : getPresetDateRange(period).from
  const toDate = period === 'single' && singleDate
    ? endOfDay(singleDate)
    : customDateRange?.to ? endOfDay(customDateRange.to) : getPresetDateRange(period).to

  const startDateIso = fromDate.toISOString()
  const endDateIso = toDate.toISOString()

  const { data: insightsData, isLoading } = useInsightsData(startDateIso, endDateIso)

  // ── 누적 영역 차트 데이터 ──
  const stackedAreaData = useMemo(() => {
    if (!insightsData?.rawData) return []
    const rawActivities = insightsData.rawData as Activity[]
    const days = eachDayOfInterval({ start: fromDate, end: toDate })

    return days.map(day => {
      const dayStr = format(day, 'M/d')
      const entry: any = { date: dayStr }

      rawActivities.forEach(act => {
        const actDate = startOfDay(new Date(act.start_time))
        if (actDate.getTime() !== startOfDay(day).getTime()) return
        const mins = (new Date(act.end_time).getTime() - new Date(act.start_time).getTime()) / 60000
        const catName = act.categories?.[0]?.name || '미분류'
        entry[catName] = (entry[catName] || 0) + Number((mins / 60).toFixed(2))
      })

      return entry
    })
  }, [insightsData?.rawData, fromDate, toDate])

  // ── 카테고리별 집계 ──
  const categoryBreakdown = useMemo(() => {
    if (!insightsData?.rawData) return { items: [], totalMinutes: 0 }
    const rawActivities = insightsData.rawData as Activity[]
    const map: Record<string, { name: string; color: string; minutes: number; count: number }> = {}

    rawActivities.forEach(act => {
      if (activityType !== 'ALL' && act.type !== activityType) return
      if (selectedCategoryIds.length > 0) {
        if (!act.categories?.some(c => selectedCategoryIds.includes(c.id))) return
      }
      const mins = (new Date(act.end_time).getTime() - new Date(act.start_time).getTime()) / 60000
      const cat = act.categories?.[0]
      const key = cat?.id || 'unclassified'
      if (!map[key]) map[key] = { name: cat?.name || '미분류', color: cat?.hex_color || '#9CA3AF', minutes: 0, count: 0 }
      map[key].minutes += mins
      map[key].count++
    })

    const items = Object.entries(map)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.minutes - a.minutes)
    const totalMinutes = items.reduce((s, i) => s + i.minutes, 0)
    return { items, totalMinutes }
  }, [insightsData?.rawData, activityType, selectedCategoryIds])

  // ── 워터폴 차트 데이터 ──
  const waterfallData = useMemo(() => {
    if (!insightsData?.rawData) return []
    const rawActivities = insightsData.rawData as Activity[]
    const days = eachDayOfInterval({ start: fromDate, end: toDate })

    let cumulative = 0
    const data = days.map(day => {
      let dayTotal = 0
      rawActivities.forEach(act => {
        if (startOfDay(new Date(act.start_time)).getTime() !== startOfDay(day).getTime()) return
        dayTotal += (new Date(act.end_time).getTime() - new Date(act.start_time).getTime()) / 60000
      })
      const hours = Number((dayTotal / 60).toFixed(1))
      const prev = cumulative
      cumulative += hours
      return {
        date: format(day, 'M/d(E)', { locale: ko }),
        hours,
        base: prev,
        total: cumulative
      }
    })

    return data
  }, [insightsData?.rawData, fromDate, toDate])

  // 도넛 데이터
  const donutData = useMemo(() => {
    return categoryBreakdown.items.map(item => ({
      name: item.name,
      value: item.minutes,
      hours: Number((item.minutes / 60).toFixed(1)),
      color: item.color,
      percentage: categoryBreakdown.totalMinutes > 0
        ? Math.round((item.minutes / categoryBreakdown.totalMinutes) * 100)
        : 0
    }))
  }, [categoryBreakdown])

  // 카테고리 색상 목록 (누적 영역 차트용)
  const categoryColors = useMemo(() => {
    const colorMap: Record<string, string> = {}
    categoryBreakdown.items.forEach(item => {
      colorMap[item.name] = item.color
    })
    colorMap['미분류'] = '#9CA3AF'
    return colorMap
  }, [categoryBreakdown])

  const allCatNames = useMemo(() => Object.keys(categoryColors), [categoryColors])

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-gray-100 rounded-2xl" />
        <div className="h-[300px] bg-gray-100 rounded-3xl" />
        <div className="h-[200px] bg-gray-100 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardFilterBar categories={categories} />

      {/* ── 누적 영역 차트 ── */}
      {stackedAreaData.length > 0 && allCatNames.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-[17px] font-extrabold text-gray-900 tracking-tight mb-1">카테고리별 시간 흐름</h3>
          <p className="text-[12px] font-bold text-gray-400 mb-5">기간 내 카테고리별 시간 변화를 한눈에</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stackedAreaData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {allCatNames.map(name => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stackId="1"
                    stroke={categoryColors[name]}
                    fill={categoryColors[name]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ── 시간 비율 스택 바 ── */}
      {donutData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-extrabold text-gray-900 tracking-tight">카테고리 점유율</h3>
            <span className="text-[13px] font-bold text-gray-500">
              총 {(categoryBreakdown.totalMinutes / 60).toFixed(1)}시간
            </span>
          </div>

          {/* 100% Proportional Bar */}
          <div className="flex h-4 rounded-full overflow-hidden mb-5">
            {donutData.map((d, i) => (
              <div
                key={i}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full relative group"
                style={{ width: `${Math.max(d.percentage, 2)}%`, backgroundColor: d.color }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 whitespace-nowrap">
                  {d.name} · {d.hours}h ({d.percentage}%)
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* 도넛 차트 */}
            <div className="w-[160px] h-[160px] relative shrink-0 mx-auto md:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value" stroke="none">
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-gray-400">Total</span>
                <span className="text-[15px] font-black text-gray-900">{Math.round(categoryBreakdown.totalMinutes / 60)}h</span>
              </div>
            </div>

            {/* 카테고리 리스트 */}
            <div className="flex-1 space-y-2.5">
              {donutData.slice(0, 6).map((d, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const item = categoryBreakdown.items[i]
                    if (item) setSelectedSubjectId(item.id)
                  }}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[13px] font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-gray-900">{d.hours}h</span>
                    <span className="text-[11px] font-bold text-gray-400">{d.percentage}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 워터폴 차트 ── */}
      {waterfallData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-[17px] font-extrabold text-gray-900 tracking-tight mb-1">일별 시간 투입 폭포</h3>
          <p className="text-[12px] font-bold text-gray-400 mb-5">하루하루의 시간 투입 변동을 한눈에</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-lg text-[12px] font-bold">
                        <p className="text-gray-500">{label}</p>
                        <p className="text-blue-600">{d?.hours}시간</p>
                        <p className="text-gray-400">누적: {d?.total?.toFixed(1)}h</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="base" stackId="a" fill="transparent" />
                <Bar dataKey="hours" stackId="a" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.hours > 0 ? '#60A5FA' : '#F3F4F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ── 카테고리 카드 그리드 ── */}
      {categoryBreakdown.items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-[17px] font-extrabold text-gray-900 mb-4 tracking-tight">카테고리별 상세</h3>
          <div className="grid grid-cols-2 gap-4">
            {categoryBreakdown.items.slice(0, 6).map((item, idx) => {
              const hours = Number((item.minutes / 60).toFixed(1))
              const pct = categoryBreakdown.totalMinutes > 0 ? Math.round((item.minutes / categoryBreakdown.totalMinutes) * 100) : 0
              const bgRgba = item.color.startsWith('#') ? `${item.color}1A` : '#F3F4F6'

              return (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedSubjectId(item.id)}
                  className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-[150px] cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
                    <div className="p-1.5 rounded-[10px]" style={{ backgroundColor: bgRgba, color: item.color }}>
                      <LayoutGrid size={15} />
                    </div>
                    <span className="uppercase tracking-wider text-[11px] truncate max-w-[80px]">{item.name}</span>
                  </div>
                  <div>
                    <div className="text-[32px] font-black text-gray-900 tracking-tighter leading-none">
                      {hours}<span className="text-[16px] text-gray-400 font-bold ml-0.5">h</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] font-bold text-gray-400">{pct}%</span>
                      <span className="text-[12px] font-bold text-gray-300">·</span>
                      <span className="text-[12px] font-bold text-gray-400">{item.count}건</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* 빈 상태 */}
      {categoryBreakdown.items.length === 0 && !isLoading && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-sm font-medium">해당 기간에 기록된 활동이 없습니다.</p>
        </div>
      )}

      {/* 카테고리 딥다이브 시트 */}
      <SubjectDetailSheet
        subjectId={selectedSubjectId}
        onClose={() => setSelectedSubjectId(null)}
        startDate={startDateIso}
        endDate={endDateIso}
        breakdownInfo={selectedSubjectId && categoryBreakdown.items.find(i => i.id === selectedSubjectId)
          ? (() => { const item = categoryBreakdown.items.find(i => i.id === selectedSubjectId)!; return { name: item.name, hex_color: item.color, minutes: item.minutes, count: item.count } })()
          : null}
      />
    </div>
  )
}
