"use client";
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { LayoutGrid } from 'lucide-react';

export default function ActivityBreakdownGrid({ breakdown, onSelectSubject }: { breakdown: Record<string, any>, onSelectSubject: (id: string) => void }) {
  const categories = Object.keys(breakdown).map(key => ({
    id: key,
    ...breakdown[key]
  }));
  
  if (categories.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">카테고리별 활동 분석</h2>
        <div className="bg-white rounded-3xl p-8 text-center text-gray-400 font-medium text-sm border border-gray-100">
          분석할 활동 내역이 없습니다.
        </div>
      </div>
    );
  }

  // 총합 시간 구하기 (비율 계산용)
  const totalMinutes = categories.reduce((acc, cat) => acc + cat.minutes, 0);

  // 상위 4개만 그리드에 보여주기
  const topCategories = categories.sort((a, b) => b.minutes - a.minutes).slice(0, 4);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">카테고리별 활동 분석</h2>
      <div className="grid grid-cols-2 gap-4">
        {topCategories.map((cat, idx) => {
          const percentage = totalMinutes > 0 ? Math.round((cat.minutes / totalMinutes) * 100) : 0;
          // Create dummy trend data for visual purely based on percentage
          const chartData = [
            { val: percentage * 0.5 },
            { val: percentage * 0.8 },
            { val: percentage },
            { val: percentage * 1.2 },
            { val: percentage * 0.9 }
          ];

          const color = cat.hex_color || '#9CA3AF';
          
          // Hex to RGBA wrapper for background
          const bgRgba = color.startsWith('#') ? `${color}1A` : '#F3F4F6';

          return (
            <div 
              key={idx} 
              onClick={() => onSelectSubject(cat.id)}
              className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-[160px] cursor-pointer hover:shadow-md transition-shadow active:scale-95"
            >
              <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: bgRgba, color: color }}>
                  <LayoutGrid size={16} />
                </div>
                <span className="uppercase tracking-wider text-xs truncate max-w-[80px]">{cat.name}</span>
              </div>
              <div className="text-4xl font-bold text-gray-900 mt-3 tracking-tighter">
                {percentage}<span className="text-xl text-gray-400 font-medium ml-0.5">%</span>
              </div>
              <div className="h-[36px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Bar dataKey="val" radius={[3, 3, 3, 3]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? color : bgRgba} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
