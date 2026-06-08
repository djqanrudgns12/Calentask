"use client";

import { useMemo, useEffect } from 'react';
import { useSubjectDetails, useCategoryMonthlyTrend } from '@/hooks/useInsightsQueries';
import { useCalendarStore } from '@/store/useCalendarStore';
import { X, Clock, CalendarDays, Loader2, TrendingUp, Flame, Zap, Timer } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-lg text-[12px] font-bold">
      <p className="text-gray-500 mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color }}>{p.name}: {p.value}{p.dataKey === 'hours' ? 'h' : '건'}</p>
      ))}
    </div>
  );
};

export default function SubjectDetailSheet({ 
  subjectId, 
  onClose,
  startDate,
  endDate,
  breakdownInfo
}: { 
  subjectId: string | null;
  onClose: () => void;
  startDate: string;
  endDate: string;
  breakdownInfo: any;
}) {
  const { data, isLoading } = useSubjectDetails(subjectId || '', startDate, endDate);
  const { data: monthlyTrend } = useCategoryMonthlyTrend(subjectId);
  const openEditEvent = useCalendarStore((state) => state.openEditEvent);

  const catColor = breakdownInfo?.hex_color || '#6366F1';

  // 시트가 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (subjectId) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [subjectId])

  // 핵심 통계
  const stats = useMemo(() => {
    if (!data?.activities || data.activities.length === 0) return null;
    
    let totalMins = 0;
    let maxSession = 0;
    let maxSessionDate = '';
    const sessions: number[] = [];
    const weeklyMap: Record<number, number> = {};
    
    data.activities.forEach((act: any) => {
      const start = new Date(act.start_time);
      const end = new Date(act.end_time);
      const mins = (end.getTime() - start.getTime()) / 60000;
      totalMins += mins;
      sessions.push(mins);
      if (mins > maxSession) {
        maxSession = mins;
        maxSessionDate = act.start_time;
      }
      // 주 카운트 (ISO week 근사)
      const weekKey = Math.floor(start.getTime() / (7 * 24 * 60 * 60 * 1000));
      weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + mins;
    });

    const weekKeys = Object.keys(weeklyMap);
    const recentWeeks = weekKeys.slice(-4);
    const weeklyAvg = recentWeeks.length > 0
      ? recentWeeks.reduce((s, k) => s + weeklyMap[Number(k)], 0) / recentWeeks.length
      : 0;

    return {
      avgSessionMins: Math.round(totalMins / data.activities.length),
      maxSessionMins: Math.round(maxSession),
      maxSessionDate,
      weeklyAvgMins: Math.round(weeklyAvg),
      sessions
    };
  }, [data]);

  // 요일별 히트맵
  const weekdayHeatmap = useMemo(() => {
    if (!data?.activities) return [];
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const totals = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    
    data.activities.forEach((act: any) => {
      const start = new Date(act.start_time);
      const dow = start.getDay(); // 0=Sun
      const idx = dow === 0 ? 6 : dow - 1; // 월=0 ~ 일=6
      const mins = (new Date(act.end_time).getTime() - start.getTime()) / 60000;
      totals[idx] += mins;
      counts[idx]++;
    });

    const maxTotal = Math.max(...totals, 1);
    return days.map((day, i) => ({
      day,
      totalMins: Math.round(totals[i]),
      count: counts[i],
      intensity: totals[i] / maxTotal
    }));
  }, [data]);

  // 세션 길이 분포 히스토그램
  const sessionHistogram = useMemo(() => {
    if (!stats?.sessions) return [];
    const buckets = [
      { label: '~30분', min: 0, max: 30, count: 0 },
      { label: '30분~1h', min: 30, max: 60, count: 0 },
      { label: '1~2h', min: 60, max: 120, count: 0 },
      { label: '2~3h', min: 120, max: 180, count: 0 },
      { label: '3h+', min: 180, max: Infinity, count: 0 },
    ];
    stats.sessions.forEach(m => {
      const bucket = buckets.find(b => m >= b.min && m < b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [stats]);

  // 월별 차트 데이터
  const monthlyChartData = useMemo(() => {
    if (!monthlyTrend) return [];
    return monthlyTrend.map(m => ({
      month: m.month.split('-')[1] + '월',
      hours: Number((m.minutes / 60).toFixed(1)),
      count: m.count
    }));
  }, [monthlyTrend]);

  // 활발한 요일/시간대
  const analytics = useMemo(() => {
    if (!data?.activities || data.activities.length === 0) return null;
    const dayCounts = new Array(7).fill(0);
    const hourCounts = new Array(24).fill(0);
    data.activities.forEach((act: any) => {
      const start = new Date(act.start_time);
      dayCounts[start.getDay()]++;
      if (!act.is_all_day) hourCounts[start.getHours()]++;
    });
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
    const timeOfDay = maxHour >= 5 && maxHour < 12 ? '아침' :
                      maxHour >= 12 && maxHour < 18 ? '오후' :
                      maxHour >= 18 && maxHour < 24 ? '저녁' : '새벽';
    return { mostFrequentDay: days[maxDayIdx], timeOfDay };
  }, [data]);

  const formatMins = (mins: number) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
    return `${mins}분`;
  };

  return (
    <AnimatePresence>
      {subjectId && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200]"
          />
          <motion.div 
            initial={{ y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%', x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 md:w-[520px] bg-white shadow-2xl z-[201] flex flex-col"
          >
            {/* Header — safe-area 대응 포함 */}
            <div className="flex items-center justify-between px-5 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-white z-10 sticky top-0 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: catColor }} />
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  <span style={{ color: catColor }}>{breakdownInfo?.name}</span> 집중 분석
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
                  <p className="font-medium text-sm">상세 데이터를 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* ── 핵심 통계 카드 ── */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-[18px] p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1 text-gray-400 font-bold text-[10px] mb-1.5">
                        <Zap size={11} /> 평균 세션
                      </div>
                      <div className="text-[20px] font-black text-gray-900 tracking-tighter leading-tight">
                        {stats ? formatMins(stats.avgSessionMins) : '0분'}
                      </div>
                    </div>
                    <div className="bg-white rounded-[18px] p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1 text-gray-400 font-bold text-[10px] mb-1.5">
                        <Flame size={11} /> 최장 세션
                      </div>
                      <div className="text-[20px] font-black text-gray-900 tracking-tighter leading-tight">
                        {stats ? formatMins(stats.maxSessionMins) : '0분'}
                      </div>
                      {stats?.maxSessionDate && (
                        <p className="text-[9px] text-gray-400 font-medium mt-0.5">
                          {format(new Date(stats.maxSessionDate), 'M.d(EEE)', { locale: ko })}
                        </p>
                      )}
                    </div>
                    <div className="bg-white rounded-[18px] p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1 text-gray-400 font-bold text-[10px] mb-1.5">
                        <Timer size={11} /> 주간 평균
                      </div>
                      <div className="text-[20px] font-black text-gray-900 tracking-tighter leading-tight">
                        {stats ? formatMins(stats.weeklyAvgMins) : '0분'}
                      </div>
                    </div>
                  </div>

                  {/* ── 총 소요 시간 / 진행 횟수 ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-[18px] p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1 text-gray-400 font-bold text-[11px] mb-1.5">
                        <Clock size={12} /> 총 소요 시간
                      </div>
                      <div className="text-[26px] font-black text-gray-900 tracking-tighter">
                        {Math.round((breakdownInfo?.minutes || 0) / 60)}<span className="text-[14px] text-gray-400 font-bold ml-1">시간</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-[18px] p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1 text-gray-400 font-bold text-[11px] mb-1.5">
                        <CalendarDays size={12} /> 진행 횟수
                      </div>
                      <div className="text-[26px] font-black text-gray-900 tracking-tighter">
                        {breakdownInfo?.count || 0}<span className="text-[14px] text-gray-400 font-bold ml-1">회</span>
                      </div>
                    </div>
                  </div>

                  {/* ── 활발한 요일/시간대 ── */}
                  {analytics && (
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[18px] p-5 shadow-lg flex items-center justify-around text-white">
                      <div className="text-center">
                        <div className="text-[11px] font-bold text-gray-400 mb-1 flex items-center justify-center gap-1">
                          <Flame size={12} className="text-orange-400" /> 가장 활발한 요일
                        </div>
                        <div className="text-xl font-black">{analytics.mostFrequentDay}요일</div>
                      </div>
                      <div className="w-px h-8 bg-gray-700/50" />
                      <div className="text-center">
                        <div className="text-[11px] font-bold text-gray-400 mb-1 flex items-center justify-center gap-1">
                          <TrendingUp size={12} className="text-emerald-400" /> 주 활동 시간대
                        </div>
                        <div className="text-xl font-black">{analytics.timeOfDay}</div>
                      </div>
                    </div>
                  )}

                  {/* ── 월별 추이 바 차트 ── */}
                  {monthlyChartData.length > 0 && (
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-4">월별 추이</h3>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="hours" name="시간" fill={catColor} radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ── 요일별 히트맵 ── */}
                  {weekdayHeatmap.length > 0 && (
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-4">요일별 분포</h3>
                      <div className="flex gap-2">
                        {weekdayHeatmap.map(d => (
                          <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                            <div
                              className="w-full aspect-square rounded-xl flex items-center justify-center text-[11px] font-bold transition-all"
                              style={{
                                backgroundColor: d.intensity > 0 ? catColor : '#F3F4F6',
                                opacity: d.intensity > 0 ? Math.max(0.25, d.intensity) : 1,
                                color: d.intensity > 0.3 ? 'white' : '#9CA3AF'
                              }}
                            >
                              {d.totalMins > 0 ? `${Math.round(d.totalMins / 60)}h` : '-'}
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">{d.day}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── 세션 길이 분포 히스토그램 ── */}
                  {sessionHistogram.some(b => b.count > 0) && (
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-4">세션 길이 분포</h3>
                      <div className="h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sessionHistogram} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="count" name="세션 수" fill={catColor} radius={[6, 6, 0, 0]} fillOpacity={0.7} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ── 타임라인 ── */}
                  <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                    <h3 className="text-[14px] font-bold text-gray-900 mb-4">진행 타임라인</h3>
                    {data?.activities && data.activities.length > 0 ? (
                      <div className="space-y-2 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-gray-100">
                        {data.activities.slice(0, 20).map((act: any) => {
                          const date = new Date(act.start_time);
                          const end = new Date(act.end_time);
                          const durationMins = Math.round((end.getTime() - date.getTime()) / 60000);
                          const isSameDay = act.is_all_day;
                          return (
                            <div 
                              key={act.id} 
                              className="relative flex items-start group cursor-pointer hover:bg-gray-50 p-3 -ml-3 rounded-2xl transition-all active:scale-[0.98]"
                              onClick={() => openEditEvent(act)}
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] border-white shrink-0 z-10 shadow-sm mt-0.5" style={{ backgroundColor: catColor }} />
                              <div className="ml-4 w-full flex items-start justify-between">
                                <div>
                                  <div className="text-[14px] font-bold text-gray-900 leading-none mb-1.5 group-hover:text-indigo-600 transition-colors">{act.title}</div>
                                  <div className="text-[12px] font-semibold text-gray-400 flex items-center gap-2">
                                    <span>{format(date, 'yyyy.MM.dd', { locale: ko })}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                    <span>{isSameDay ? '하루 종일' : format(date, 'a h:mm', { locale: ko })}</span>
                                  </div>
                                </div>
                                {durationMins > 0 && !isSameDay && (
                                  <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                                    {durationMins >= 60 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : `${durationMins}m`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {data.activities.length > 20 && (
                          <div className="text-center py-2 text-[12px] font-bold text-gray-400">
                            +{data.activities.length - 20}건 더
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-400 text-sm font-medium">
                        해당 기간에 진행된 일정이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
