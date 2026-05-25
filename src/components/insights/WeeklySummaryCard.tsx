"use client";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function WeeklySummaryCard({ totalHours, totalCount, rawData }: { totalHours: number, totalCount: number, rawData: any[] }) {
  // Dummy data for design perfection
  const chartData = [
    { day: 'Mon', value: 2 },
    { day: 'Tue', value: 3.5 },
    { day: 'Wed', value: 4 },
    { day: 'Thu', value: 2.5 },
    { day: 'Fri', value: 5 },
    { day: 'Sat', value: 6 },
    { day: 'Sun', value: 1.5 },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between w-full h-[280px]">
      <div>
        <h3 className="text-gray-400 font-semibold text-xs tracking-wider mb-2 uppercase">This Week&apos;s Activity</h3>
        <div className="flex items-end gap-3">
          <div className="text-5xl font-bold text-gray-900 tracking-tighter">
            {totalHours}<span className="text-3xl text-gray-300 font-semibold ml-1">h</span>
          </div>
          <div className="flex items-center text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full mb-1 border border-blue-100">
            <TrendingUp size={12} className="mr-1" />
            +12%
          </div>
        </div>
        <p className="text-xs text-gray-400 font-medium mt-1">vs last week</p>
      </div>

      <div className="h-[100px] w-full mt-6">
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
      </div>
    </div>
  );
}
