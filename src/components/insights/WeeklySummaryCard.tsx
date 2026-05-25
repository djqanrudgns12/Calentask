"use client";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

export default function WeeklySummaryCard({ totalHours, totalCount, chartData, period }: { totalHours: number, totalCount: number, chartData: any[], period: string }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between w-full h-[280px]">
      <div>
        <h3 className="text-gray-400 font-semibold text-xs tracking-wider mb-2">
          {period === 'week' ? '이번 주 활동 요약' : period === 'month' ? '이번 달 활동 요약' : period === 'year' ? '올해 활동 요약' : '기간 활동 요약'}
        </h3>
        <div className="flex items-end gap-3">
          <div className="text-5xl font-bold text-gray-900 tracking-tighter">
            {totalHours}<span className="text-3xl text-gray-300 font-semibold ml-1">시간</span>
          </div>
          <div className="flex items-center text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full mb-1 border border-blue-100">
            <Activity size={12} className="mr-1" />
            총 {totalCount}회
          </div>
        </div>
      </div>

      <div className="h-[100px] w-full mt-6">
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 500 }} dy={10} />
              <Tooltip 
                cursor={{ fill: '#F9FAFB' }} 
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
              />
              <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#3B82F6' : '#F3F4F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300 text-sm font-medium">
            데이터가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
