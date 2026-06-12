'use client'

import { useMemo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, CalendarDays, Loader2, TrendingUp, BarChart3, Flame, Zap, Target, Link2, Paperclip, ChevronDown } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { useTemplateFullAnalytics, useTemplateLinkedActivities } from '@/hooks/useInsightsQueries'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import TemplateActivityLinker from './TemplateActivityLinker'
import { Button } from '@/components/ui/button'

interface TemplateAnalyticsSheetProps {
  templateId: string | null
  templateTitle: string
  templateColor: string
  customUnitEnabled?: boolean
  customUnitMinutes?: number
  onClose: () => void
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-lg text-[12px] font-bold">
      <p className="text-gray-500 mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke }}>{p.name}: {p.value}{p.dataKey?.includes('minutes') || p.dataKey === 'hours' ? 'h' : '회'}</p>
      ))}
    </div>
  )
}

export function TemplateAnalyticsSheet({ 
  templateId, 
  templateTitle, 
  templateColor, 
  customUnitEnabled = false,
  customUnitMinutes = 60,
  onClose 
}: TemplateAnalyticsSheetProps) {
  const { data: fullAnalytics, isLoading } = useTemplateFullAnalytics(templateId)
  const stats = fullAnalytics?.usageStats
  const monthlyTrend = fullAnalytics?.monthlyTrend
  const weeklyTrend = fullAnalytics?.weeklyTrend
  const dailyTrend = fullAnalytics?.dailyTrend

  // FEAT-01: 연결된 일정 목록
  const { data: linkedActivities } = useTemplateLinkedActivities(templateId)
  const [showLinker, setShowLinker] = useState(false)
  const [showAllLinked, setShowAllLinked] = useState(false)

  // 시트가 열릴 때 body 스크롤 잠금 (배경 스크롤 방지)
  useEffect(() => {
    if (templateId) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [templateId])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 월별 바 차트 (최근 12개월)
  const monthlyChartData = useMemo(() => {
    if (!monthlyTrend) return []
    return monthlyTrend.map(m => ({
      month: m.month.split('-')[1] + '월',
      hours: customUnitEnabled ? Number((m.minutes / customUnitMinutes).toFixed(1)) : Number((m.minutes / 60).toFixed(1)),
      count: m.count,
      fullMonth: m.month
    }))
  }, [monthlyTrend, customUnitEnabled, customUnitMinutes])

  // 주간 차트 데이터 + 4주 이동 평균
  const weeklyChartData = useMemo(() => {
    if (!weeklyTrend) return []
    const data = weeklyTrend.map((w, idx) => ({
      week: `W${idx + 1}`,
      hours: customUnitEnabled ? Number((w.minutes / customUnitMinutes).toFixed(1)) : Number((w.minutes / 60).toFixed(1)),
      count: w.count,
      weekStart: w.weekStart
    }))
    // 4주 이동 평균
    return data.map((d, idx) => {
      const window = data.slice(Math.max(0, idx - 3), idx + 1)
      const avg = window.reduce((sum, w) => sum + w.hours, 0) / window.length
      return { ...d, movingAvg: Number(avg.toFixed(1)) }
    })
  }, [weeklyTrend, customUnitEnabled, customUnitMinutes])

  // 성장 곡선 (누적)
  const cumulativeData = useMemo(() => {
    if (!dailyTrend) return []
    let cumulative = 0
    return dailyTrend.map(d => {
      const val = customUnitEnabled ? d.minutes / customUnitMinutes : d.minutes / 60
      cumulative += val
      return {
        date: d.date.split('-').slice(1).join('/'),
        cumHours: Number(cumulative.toFixed(1)),
        dailyHours: Number(val.toFixed(1))
      }
    })
  }, [dailyTrend, customUnitEnabled, customUnitMinutes])

  // 요일별 패턴 레이더
  const weekdayRadarData = useMemo(() => {
    if (!dailyTrend) return []
    const days = ['일', '월', '화', '수', '목', '금', '토']
    const counts = new Array(7).fill(0)
    dailyTrend.forEach(d => {
      const dow = new Date(d.date + 'T00:00:00+09:00').getDay() // BUG-14 수정: KST 기준 요일
      counts[dow] += d.count
    })
    // 월~일 순서로 재배치
    const order = [1, 2, 3, 4, 5, 6, 0]
    return order.map(i => ({
      day: days[i] + '요일',
      value: counts[i]
    }))
  }, [dailyTrend])

  // 미니 캘린더 (이번 달)
  const miniCalendarData = useMemo(() => {
    if (!dailyTrend) return { days: [], performedCount: 0, totalDays: 0 }
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun

    const performedDates = new Set(
      dailyTrend.filter(d => d.count > 0 && d.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).map(d => d.date)
    )

    const days: { day: number; performed: boolean; minutes: number }[] = []
    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const trend = dailyTrend.find(d => d.date === dateKey)
      days.push({
        day: i,
        performed: performedDates.has(dateKey),
        minutes: trend?.minutes || 0
      })
    }

    return {
      days,
      performedCount: performedDates.size,
      totalDays: daysInMonth,
      firstDayOfWeek
    }
  }, [dailyTrend])



  const formatMinutes = (mins: number) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}시간 ${mins % 60}분`
    return `${mins}분`
  }

  const formatSessionStat = (mins: number) => {
    if (customUnitEnabled && customUnitMinutes > 0) {
      const units = Number((mins / customUnitMinutes).toFixed(1)).toString().replace('.0', '')
      return `${units}차시(${formatMinutes(mins)})`
    }
    return formatMinutes(mins)
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {templateId && (
        <>
          {/* 오버레이: z-[200]으로 페이지 헤더(z-10)를 완전히 덮음 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200]"
          />
          {/* 시트: 모바일은 전체화면(아래→위), 데스크톱은 가운데 560px */}
          <motion.div
            initial={{ y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%', x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:max-h-[90vh] md:rounded-3xl bg-white shadow-2xl z-[201] flex flex-col"
          >
            {/* Header — safe-area 대응 포함 */}
            <div className="flex items-center justify-between px-5 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-white z-10 sticky top-0 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: templateColor }} />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                      <span style={{ color: templateColor }}>{templateTitle}</span> 상세 분석
                    </h2>
                    {customUnitEnabled && (
                      <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {customUnitMinutes}분/1차시
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
                  <p className="font-medium text-sm">데이터를 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* ── 핵심 통계 카드 4종 ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[11px] mb-2">
                        <Clock size={13} /> 총 누적 시간
                      </div>
                      <div className="flex items-baseline gap-1">
                        <div className="text-[28px] font-black text-gray-900 tracking-tighter">
                          {stats ? Number((stats.totalMinutes / 60).toFixed(1)) : 0}
                          <span className="text-[14px] text-gray-400 font-bold ml-1">시간</span>
                        </div>
                      </div>
                      {stats?.firstPerformedAt && (
                        <p className="text-[10px] text-gray-400 font-medium mt-1">
                          {format(new Date(stats.firstPerformedAt), 'yyyy.M.d', { locale: ko })} ~
                        </p>
                      )}
                    </div>
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[11px] mb-2">
                        <CalendarDays size={13} /> 총 수행 {customUnitEnabled ? '차시' : '횟수'}
                      </div>
                      <div className="text-[28px] font-black text-gray-900 tracking-tighter">
                        {stats ? (customUnitEnabled ? stats.totalUnits : stats.totalCount) : 0}
                        <span className="text-[14px] text-gray-400 font-bold ml-1">{customUnitEnabled ? '차시' : '회'}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[11px] mb-2">
                        <Zap size={13} /> 평균 {customUnitEnabled ? '차시' : '세션'}
                      </div>
                      <div className="text-[22px] font-black text-gray-900 tracking-tighter">
                        {stats ? formatSessionStat(stats.avgSessionMinutes) : '0분'}
                      </div>
                    </div>
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[11px] mb-2">
                        <Flame size={13} /> 최장 {customUnitEnabled ? '차시' : '세션'}
                      </div>
                      <div className="text-[22px] font-black text-gray-900 tracking-tighter">
                        {stats ? formatSessionStat(stats.maxSessionMinutes) : '0분'}
                      </div>
                      {stats?.maxSessionDate && (
                        <p className="text-[10px] text-gray-400 font-medium mt-1">
                          {format(new Date(stats.maxSessionDate), 'M.d(EEE)', { locale: ko })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── 월별 누적 시간 바 차트 ── */}
                  <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                    <h3 className="text-[14px] font-bold text-gray-900 mb-4">월별 누적 시간</h3>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="hours" name={customUnitEnabled ? "차시" : "시간"} fill={templateColor} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ── 주간 추이 + 이동 평균 ── */}
                  {weeklyChartData.length > 0 && (
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-1">주간 추이</h3>
                      <p className="text-[11px] text-gray-400 font-medium mb-4">점선 = 4주 이동 평균</p>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={weeklyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="hours" name={customUnitEnabled ? "차시" : "시간"} stroke={templateColor} strokeWidth={2.5} dot={{ r: 4, fill: templateColor }} />
                            <Line type="monotone" dataKey="movingAvg" name="이동평균" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ── 성장 곡선 (누적) ── */}
                  {cumulativeData.length > 0 && (
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-1">성장 곡선</h3>
                      <p className="text-[11px] text-gray-400 font-medium mb-4">최근 90일 누적 {customUnitEnabled ? '차시' : '시간'}</p>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={cumulativeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={templateColor} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={templateColor} stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={14} />
                            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="stepAfter" dataKey="cumHours" name={customUnitEnabled ? "누적 차시" : "누적 시간"} stroke={templateColor} strokeWidth={2} fill="url(#cumGradient)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ── 수행 요일 패턴 레이더 ── */}
                  {weekdayRadarData.some(d => d.value > 0) && (
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-4">수행 요일 패턴</h3>
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={weekdayRadarData} cx="50%" cy="50%" outerRadius="75%">
                            <PolarGrid stroke="#E5E7EB" />
                            <PolarAngleAxis dataKey="day" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} />
                            <Radar name="수행 횟수" dataKey="value" stroke={templateColor} fill={templateColor} fillOpacity={0.25} strokeWidth={2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ── 수행 히스토리 미니 캘린더 ── */}
                  {miniCalendarData.days.length > 0 && (
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[14px] font-bold text-gray-900">
                          {format(new Date(), 'M월', { locale: ko })} 수행 캘린더
                        </h3>
                        <span className="text-[12px] font-bold text-gray-500">
                          {miniCalendarData.performedCount}/{miniCalendarData.totalDays}일 수행
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {['일','월','화','수','목','금','토'].map(d => (
                          <div key={d} className="text-center text-[10px] font-bold text-gray-400 pb-1">{d}</div>
                        ))}
                        {/* 첫째 날 이전 빈 칸 */}
                        {Array.from({ length: miniCalendarData.firstDayOfWeek || 0 }).map((_, i) => (
                          <div key={`empty-${i}`} />
                        ))}
                        {miniCalendarData.days.map(d => (
                          <div
                            key={d.day}
                            className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors ${
                              d.performed
                                ? 'text-white shadow-sm'
                                : d.day <= new Date().getDate()
                                  ? 'bg-gray-50 text-gray-400'
                                  : 'text-gray-300'
                            }`}
                            style={d.performed ? {
                              backgroundColor: templateColor,
                              opacity: Math.min(0.4 + (d.minutes / 120) * 0.6, 1)
                            } : undefined}
                          >
                            {d.day}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}



                  {/* FEAT-01: 연결된 일정 목록 */}
                  <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                        <CalendarDays size={15} className="text-indigo-500" />
                        연결된 일정 목록
                        {linkedActivities && <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{linkedActivities.length}건</span>}
                      </h3>
                    </div>

                    {(!linkedActivities || linkedActivities.length === 0) ? (
                      <div className="text-center py-8 text-gray-400">
                        <CalendarDays className="mx-auto mb-2 text-gray-300" size={28} />
                        <p className="text-sm font-medium">연결된 일정이 없습니다</p>
                        <p className="text-xs mt-1">아래 버튼을 눌러 일정을 연결해보세요</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(showAllLinked ? linkedActivities : linkedActivities.slice(0, 10)).map((act) => (
                          <div
                            key={act.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100"
                          >
                            <div className="w-1 h-10 rounded-full" style={{ backgroundColor: templateColor }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-bold text-gray-900 truncate">{act.title}</span>
                                {act.linkType === 'direct' ? (
                                  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-indigo-100 text-indigo-600 flex items-center gap-0.5">
                                    <Link2 size={8} />직접 생성
                                  </span>
                                ) : (
                                  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-600 flex items-center gap-0.5">
                                    <Link2 size={8} />수동 연결
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 font-medium">
                                {format(new Date(act.startTime), 'yyyy.MM.dd (EEE)', { locale: ko })} {format(new Date(act.startTime), 'HH:mm')}~{format(new Date(act.endTime), 'HH:mm')}
                                <span className="text-gray-400 ml-2">
                                  {act.durationMinutes >= 60
                                    ? `${Math.floor(act.durationMinutes / 60)}시간 ${act.durationMinutes % 60}분`
                                    : `${act.durationMinutes}분`}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {linkedActivities.length > 10 && !showAllLinked && (
                          <button
                            onClick={() => setShowAllLinked(true)}
                            className="w-full text-center py-2.5 text-xs font-bold text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-center gap-1"
                          >
                            <ChevronDown size={14} />
                            나머지 {linkedActivities.length - 10}건 더보기
                          </button>
                        )}
                      </div>
                    )}

                    {/* 일정 연결 관리 버튼 */}
                    <Button
                      onClick={() => setShowLinker(true)}
                      variant="outline"
                      className="w-full mt-4 h-11 rounded-2xl border-dashed border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 font-bold text-sm flex items-center gap-2 transition-all"
                    >
                      <Paperclip size={14} />
                      일정 연결 관리
                    </Button>
                  </div>
                </div>
              )}

              {/* FEAT-01: 일정 연결 관리 시트 */}
              {templateId && (
                <TemplateActivityLinker
                  isOpen={showLinker}
                  onClose={() => setShowLinker(false)}
                  templateId={templateId}
                  templateTitle={templateTitle}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
