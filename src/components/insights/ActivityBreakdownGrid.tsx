"use client";
import { BarChart, Bar, ResponsiveContainer, Cell, PieChart, Pie, Tooltip as RechartsTooltip } from 'recharts';
import { LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-lg text-sm font-bold flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.hex_color || '#9CA3AF' }} />
        <span className="text-gray-900">{data.name}</span>
        <span className="text-gray-400 font-medium ml-1">{data.percentage}%</span>
      </div>
    );
  }
  return null;
};

export default function ActivityBreakdownGrid({ breakdown, onSelectSubject }: { breakdown: Record<string, any>, onSelectSubject: (id: string) => void }) {
  const categories = Object.keys(breakdown).map(key => ({
    id: key,
    ...breakdown[key]
  }));
  
  if (categories.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-[17px] font-extrabold text-gray-900 mb-4 tracking-tight">카테고리별 활동 분석</h2>
        <div className="bg-white rounded-[24px] p-8 text-center text-gray-400 font-medium text-sm border border-gray-100 shadow-sm">
          분석할 활동 내역이 없습니다.
        </div>
      </div>
    );
  }

  const totalMinutes = categories.reduce((acc, cat) => acc + cat.minutes, 0);
  
  // Calculate percentage and sort
  const sortedCategories = categories.map(cat => ({
    ...cat,
    percentage: totalMinutes > 0 ? Math.round((cat.minutes / totalMinutes) * 100) : 0,
    // Add dummy trend data for the visual sparkline
    trendData: [
      { val: Math.random() * 0.5 + 0.3 },
      { val: Math.random() * 0.5 + 0.5 },
      { val: Math.random() * 0.5 + 0.4 },
      { val: Math.random() * 0.5 + 0.7 },
      { val: 1 } // Last one is always highest to look like an upward trend
    ]
  })).sort((a, b) => b.minutes - a.minutes);

  const topCategories = sortedCategories.slice(0, 4);

  return (
    <div className="mt-8">
      <h2 className="text-[17px] font-extrabold text-gray-900 mb-4 tracking-tight">카테고리별 활동 분석</h2>
      
      <div className="flex flex-col gap-4">
        {/* Donut Chart Section */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex-1 pr-6">
            <h3 className="text-[13px] font-bold text-gray-400 mb-4 tracking-wider">점유율 요약</h3>
            <div className="space-y-3">
              {topCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.hex_color || '#9CA3AF' }} />
                    <span className="text-[13px] font-bold text-gray-700">{cat.name}</span>
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[140px] h-[140px] relative shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sortedCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="minutes"
                  stroke="none"
                >
                  {sortedCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.hex_color || '#9CA3AF'} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-gray-400">Total</span>
              <span className="text-[15px] font-black text-gray-900 leading-tight">
                {Math.round(totalMinutes / 60)}h
              </span>
            </div>
          </div>
        </div>

        {/* Grid Section */}
        <div className="grid grid-cols-2 gap-4">
          {topCategories.map((cat, idx) => {
            const color = cat.hex_color || '#9CA3AF';
            const bgRgba = color.startsWith('#') ? `${color}1A` : '#F3F4F6';

            return (
              <motion.div 
                key={idx}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectSubject(cat.id)}
                className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-[150px] cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
                  <div className="p-1.5 rounded-[10px]" style={{ backgroundColor: bgRgba, color: color }}>
                    <LayoutGrid size={15} />
                  </div>
                  <span className="uppercase tracking-wider text-[11px] truncate max-w-[80px]">{cat.name}</span>
                </div>
                <div className="text-[32px] font-black text-gray-900 mt-2 tracking-tighter leading-none">
                  {cat.percentage}<span className="text-[16px] text-gray-400 font-bold ml-0.5">%</span>
                </div>
                <div className="h-[28px] w-full mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cat.trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Bar dataKey="val" radius={[4, 4, 4, 4]}>
                        {cat.trendData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={index === cat.trendData.length - 1 ? color : bgRgba} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
