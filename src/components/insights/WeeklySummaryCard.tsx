"use client";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { Activity } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-lg">
      <p className="text-xs font-bold text-gray-900 mb-1">{label}요일</p>
      <p className="text-sm text-blue-600 font-semibold">{payload[0].value}시간</p>
    </div>
  );
}

export default function WeeklySummaryCard({ totalHours, totalCount, chartData, period }: { totalHours: number, totalCount: number, chartData: any[], period: string }) {
  const periodLabel = period === 'week' ? '이번 주 활동 요약' : period === 'month' ? '이번 달 활동 요약' : period === 'year' ? '올해 활동 요약' : '최근 30일 활동 요약';

  // 오늘 요일 인덱스 (월=0)
  const todayIdx = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  })();

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between w-full h-[280px]">
      <div>
        <h3 className="text-gray-400 font-semibold text-xs tracking-wider mb-2">
          {periodLabel}
        </h3>
        <div className="flex items-end gap-3">
          <div className="text-5xl font-bold text-gray-900 tracking-tighter">
            {totalHours}<span className="text-3xl text-gray-300 font-semibold ml-1">시간</span>
          </div>
          <div className="flex items-center text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full mb-1 border border-blue-100">
            <Activity size={12} className="mr-1" />
            총 {totalCount}건
          </div>
        </div>
      </div>

      <div className="h-[100px] w-full mt-6">
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 500 }} dy={10} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB', radius: 6 }} />
              <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === todayIdx ? '#3B82F6' : '#F3F4F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300 text-sm font-medium">
            해당 기간에 기록된 활동이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
