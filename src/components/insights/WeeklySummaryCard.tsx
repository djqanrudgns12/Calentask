"use client";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { Activity, Plus, Clock } from 'lucide-react';
import { useCalendarStore } from '@/store/useCalendarStore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label }: any) {
  const openAddEvent = useCalendarStore((state) => state.openAddEvent);
  
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  const activities = data.activities || [];
  
  // Get top 3 activities (sort by start time)
  const sortedActivities = [...activities].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const displayActivities = sortedActivities.slice(0, 3);
  const hasMore = sortedActivities.length > 3;

  return (
    <div className="bg-card/95 backdrop-blur-md px-4 py-4 rounded-2xl border border-border shadow-xl min-w-[200px] z-50">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground">{label}요일</p>
        <p className="text-sm text-blue-600 font-bold">{data.value}시간</p>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-2.5 mb-3">
          {displayActivities.map((act: any) => {
            const isSameDay = act.is_all_day;
            const date = new Date(act.start_time);
            return (
              <div key={act.id} className="flex items-start gap-2">
                <div 
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0" 
                  style={{ backgroundColor: act.hex_color || (act.categories?.[0]?.hex_color) || '#E5E7EB' }} 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{act.title}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {isSameDay ? '하루 종일' : format(date, 'a h:mm', { locale: ko })}
                  </p>
                </div>
              </div>
            )
          })}
          {hasMore && (
            <p className="text-[11px] text-muted-foreground font-medium text-center pt-1">+ {sortedActivities.length - 3}개 더보기</p>
          )}
        </div>
      ) : (
        <div className="py-3 flex flex-col items-center justify-center text-muted-foreground mb-2">
          <Clock size={16} className="mb-1 opacity-50" />
          <p className="text-[12px] font-medium">활동 기록이 없습니다.</p>
        </div>
      )}

      {/* 일정 추가 버튼 (Actionable) */}
      <button 
        onClick={() => {
          // 일자 계산을 정확히 하려면 날짜 정보를 넘겨야 하지만, 우선 요일 정보를 바탕으로 새 모달 띄우기
          openAddEvent();
        }}
        className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 rounded-xl bg-muted hover:bg-muted text-foreground text-[12px] font-bold transition-colors"
      >
        <Plus size={14} />
        일정 추가하기
      </button>
    </div>
  );
}

import { TrendingUp, TrendingDown } from 'lucide-react';

export default function WeeklySummaryCard({ 
  totalHours, 
  totalCount, 
  prevTotalHours,
  prevTotalCount,
  chartData, 
  preset 
}: { 
  totalHours: number; 
  totalCount: number; 
  prevTotalHours?: number;
  prevTotalCount?: number;
  chartData: any[]; 
  preset: string; 
}) {
  const periodLabel = preset === 'this_week' ? '이번 주 활동 요약' : preset === 'this_month' ? '이번 달 활동 요약' : preset === 'this_year' ? '올해 활동 요약' : preset === 'semester1' ? '1학기 활동 요약' : preset === 'semester2' ? '2학기 활동 요약' : '조회 기간 활동 요약';
  const openAddEvent = useCalendarStore((state) => state.openAddEvent);

  const todayIdx = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const diffHours = prevTotalHours !== undefined ? totalHours - prevTotalHours : 0;
  const diffPercent = prevTotalHours ? Math.round((diffHours / prevTotalHours) * 100) : (totalHours > 0 ? 100 : 0);
  const isPositive = diffHours >= 0;

  return (
    <div className="bg-card rounded-[24px] p-6 shadow-sm border border-border flex flex-col justify-between w-full h-[280px]">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-muted-foreground font-bold text-[13px] tracking-wider">
            {periodLabel}
          </h3>
          {prevTotalHours !== undefined && diffHours !== 0 && (
            <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(diffPercent)}%
            </div>
          )}
        </div>
        <div className="flex items-end gap-3">
          <div className="text-[44px] font-black text-foreground tracking-tighter leading-none">
            {totalHours}<span className="text-[24px] text-muted-foreground/50 font-bold ml-1">시간</span>
          </div>
          <div className="flex items-center text-[13px] font-bold bg-blue-50/80 text-blue-600 px-3 py-1.5 rounded-full mb-1 border border-blue-100 shadow-sm">
            <Activity size={14} className="mr-1.5" />
            총 {totalCount}건
          </div>
        </div>
      </div>

      <div className="h-[100px] w-full mt-4">
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E5E7EB" stopOpacity={1} />
                  <stop offset="100%" stopColor="#D1D5DB" stopOpacity={1} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 13, fill: '#9CA3AF', fontWeight: 600 }} 
                dy={10} 
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: '#F3F4F6', opacity: 0.6, radius: 8 }} 
                isAnimationActive={false}
              />
              <Bar 
                dataKey="hours" 
                radius={[6, 6, 6, 6]}
                minPointSize={4}
                onClick={() => {
                  openAddEvent();
                }}
                className="cursor-pointer"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === todayIdx ? 'url(#colorToday)' : 'url(#colorNormal)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground/50 text-sm font-medium">
            해당 기간에 기록된 활동이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
