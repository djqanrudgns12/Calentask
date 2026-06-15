'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { useExecutionAnalytics } from '@/hooks/useInsightsQueries'
import { useSharedPeriodStore, getDatesForPreset } from '@/store/useSharedPeriodStore'
import SharedPeriodDropdown from './SharedPeriodDropdown'
import { CheckSquare, Clock, AlertTriangle, TrendingUp, Target, Zap, Loader2, ListChecks, Timer, AlertCircle } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card/95 backdrop-blur-md px-3 py-2 rounded-xl border border-border shadow-lg text-[12px] font-bold">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span style={{ color: p.color || p.fill }}>{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  inbox: '#60A5FA',
  done: '#34D399',
  archive: '#A78BFA',
}

export default function ExecutionTab() {
  const { preset, customRange } = useSharedPeriodStore()
  const { startDate, endDate } = getDatesForPreset(preset, customRange)
  const { data: analytics, isLoading } = useExecutionAnalytics(startDate, endDate)

  // 미루기 지수 색상 & 레이블
  const procrastination = useMemo(() => {
    if (!analytics) return { color: '#9CA3AF', label: '-', emoji: '🔄' }
    const idx = analytics.procrastinationIndex
    if (idx <= 20) return { color: '#34D399', label: '우수', emoji: '🔥' }
    if (idx <= 40) return { color: '#60A5FA', label: '양호', emoji: '👍' }
    if (idx <= 60) return { color: '#FBBF24', label: '보통', emoji: '⏳' }
    if (idx <= 80) return { color: '#F97316', label: '주의', emoji: '⚠️' }
    return { color: '#EF4444', label: '위험', emoji: '🚨' }
  }, [analytics])

  // 완료율 게이지 각도
  const completionAngle = analytics ? (analytics.completionRate / 100) * 360 : 0

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
        <p className="font-medium text-sm">실행력 데이터를 분석하는 중...</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <CheckSquare size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm font-medium">데이터를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SharedPeriodDropdown className="mb-2" />
      {/* ── Hero KPI 4종 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {/* 완료율 */}
        <div className="bg-card rounded-[20px] p-5 shadow-sm border border-border relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[11px] mb-2">
            <Target size={13} className="text-emerald-400" /> 완료율
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[32px] font-black text-foreground tracking-tighter">{analytics.completionRate}</span>
            <span className="text-[16px] font-bold text-muted-foreground">%</span>
          </div>
          <div className="text-[11px] font-bold text-muted-foreground mt-1">
            {analytics.doneTasks}/{analytics.totalTasks}건
          </div>
          {/* 배경 원형 프로그레스 */}
          <div className="absolute -right-3 -bottom-3 w-20 h-20 opacity-10">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#34D399" strokeWidth="3"
                strokeDasharray={`${analytics.completionRate}, 100`}
              />
            </svg>
          </div>
        </div>

        {/* 미루기 지수 */}
        <div className="bg-card rounded-[20px] p-5 shadow-sm border border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[11px] mb-2">
            <AlertTriangle size={13} style={{ color: procrastination.color }} /> 미루기 지수
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] font-black tracking-tighter" style={{ color: procrastination.color }}>
              {analytics.procrastinationIndex}
            </span>
            <span className="text-[14px] font-bold" style={{ color: procrastination.color }}>
              {procrastination.emoji} {procrastination.label}
            </span>
          </div>
          <div className="text-[11px] font-bold text-muted-foreground mt-1">
            평균 {analytics.avgDaysToComplete}일 소요
          </div>
        </div>

        {/* 서브태스크 */}
        <div className="bg-card rounded-[20px] p-5 shadow-sm border border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[11px] mb-2">
            <ListChecks size={13} className="text-blue-400" /> 서브태스크
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[32px] font-black text-foreground tracking-tighter">{analytics.subtaskCompletionRate}</span>
            <span className="text-[16px] font-bold text-muted-foreground">%</span>
          </div>
          <div className="text-[11px] font-bold text-muted-foreground mt-1">
            {analytics.completedSubtasks}/{analytics.totalSubtasks}건 완료
          </div>
        </div>

        {/* 기한 준수 */}
        <div className="bg-card rounded-[20px] p-5 shadow-sm border border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[11px] mb-2">
            <Timer size={13} className="text-purple-400" /> 기한 준수
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[32px] font-black text-emerald-500 tracking-tighter">{analytics.onTimeTasks}</span>
            <span className="text-[16px] font-bold text-muted-foreground">건</span>
          </div>
          <div className="text-[11px] font-bold text-muted-foreground mt-1">
            지연 {analytics.lateTasks}건 · 미설정 {analytics.noDeadlineTasks}건
          </div>
        </div>
      </motion.div>

      {/* ── 주별 완료 추이 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card rounded-[24px] p-6 shadow-sm border border-border"
      >
        <h3 className="text-[17px] font-extrabold text-foreground tracking-tight mb-1">주별 생성 vs 완료</h3>
        <p className="text-[12px] font-bold text-muted-foreground mb-5">최근 8주간 할 일 흐름</p>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.weeklyCompletion} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="created" name="생성" fill="#93C5FD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="done" name="완료" fill="#34D399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
            <div className="w-3 h-3 rounded bg-[#93C5FD]" /> 생성
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
            <div className="w-3 h-3 rounded bg-[#34D399]" /> 완료
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── 할 일 수명 분포 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-[24px] p-6 shadow-sm border border-border"
        >
          <h3 className="text-[15px] font-extrabold text-foreground tracking-tight mb-1">할 일 수명 분포</h3>
          <p className="text-[11px] font-bold text-muted-foreground mb-4">생성에서 완료까지 걸리는 일수</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.lifespanDistribution} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="건수" radius={[6, 6, 0, 0]}>
                  {analytics.lifespanDistribution.map((entry, idx) => {
                    const colors = ['#34D399', '#60A5FA', '#FBBF24', '#F97316', '#EF4444']
                    return <Cell key={idx} fill={colors[idx] || '#9CA3AF'} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── 상태별 분포 도넛 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-[24px] p-6 shadow-sm border border-border"
        >
          <h3 className="text-[15px] font-extrabold text-foreground tracking-tight mb-4">상태별 분포</h3>
          <div className="flex items-center gap-6">
            <div className="w-[140px] h-[140px] relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusDistribution}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={65}
                    paddingAngle={3}
                    dataKey="count"
                    stroke="none"
                  >
                    {analytics.statusDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={STATUS_COLORS[entry.status] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-card/95 backdrop-blur-md px-3 py-2 rounded-xl border border-border shadow-lg text-[12px] font-bold">
                          {d.label}: {d.count}건
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-muted-foreground">Total</span>
                <span className="text-[16px] font-black text-foreground">{analytics.totalTasks}</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {analytics.statusDistribution.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || '#9CA3AF' }} />
                    <span className="text-[13px] font-bold text-foreground">{s.label}</span>
                  </div>
                  <span className="text-[15px] font-black text-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── 서브태스크 워터폴 (진행률 바) ── */}
      {analytics.totalSubtasks > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-[24px] p-6 shadow-sm border border-border"
        >
          <h3 className="text-[15px] font-extrabold text-foreground tracking-tight mb-1">서브태스크 완료 진행</h3>
          <p className="text-[11px] font-bold text-muted-foreground mb-4">전체 서브태스크 완료 현황</p>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analytics.subtaskCompletionRate}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full"
              />
            </div>
            <span className="text-[15px] font-black text-foreground tabular-nums min-w-[50px] text-right">
              {analytics.subtaskCompletionRate}%
            </span>
          </div>

          <div className="flex items-center gap-6 text-[12px] font-bold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              완료 {analytics.completedSubtasks}건
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-200" />
              미완료 {analytics.totalSubtasks - analytics.completedSubtasks}건
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 기한 초과 경고 ── */}
      {analytics.overdueTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-red-50 to-orange-50 rounded-[24px] p-6 shadow-sm border border-red-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-red-500" />
            <h3 className="text-[15px] font-extrabold text-red-700 tracking-tight">기한 초과 할 일</h3>
            <span className="ml-auto text-[12px] font-bold text-red-400 bg-red-100 px-2 py-0.5 rounded-full">
              {analytics.overdueTasks.length}건
            </span>
          </div>
          <div className="space-y-2.5">
            {analytics.overdueTasks.map((task, idx) => (
              <div key={task.id} className="flex items-center justify-between bg-card/80 rounded-xl px-4 py-3 border border-red-100/50">
                <div>
                  <div className="text-[13px] font-bold text-foreground">{task.title}</div>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    기한: {format(new Date(task.deadline), 'M월 d일', { locale: ko })}
                  </div>
                </div>
                <span className="text-[12px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                  +{task.daysOverdue}일
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 빈 상태 */}
      {analytics.totalTasks === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckSquare size={48} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-base font-bold text-muted-foreground mb-1">할 일 데이터가 없습니다</h3>
          <p className="text-sm">할 일을 생성하면 실행력 분석이 시작됩니다.</p>
        </div>
      )}
    </div>
  )
}
