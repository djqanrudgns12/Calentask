"use client";
import { ResponsiveContainer, Cell, PieChart, Pie, Tooltip as RechartsTooltip } from 'recharts';
import { LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-md px-3 py-2 rounded-xl border border-border shadow-lg text-sm font-bold flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.hex_color || '#9CA3AF' }} />
        <span className="text-foreground">{data.name}</span>
        <span className="text-muted-foreground font-medium ml-1">{data.percentage}%</span>
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
        <h2 className="text-[17px] font-extrabold text-foreground mb-4 tracking-tight">카테고리별 활동 분석</h2>
        <div className="bg-card rounded-[24px] p-8 text-center text-muted-foreground font-medium text-sm border border-border shadow-sm">
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
    hours: Number((cat.minutes / 60).toFixed(1))
  })).sort((a, b) => b.minutes - a.minutes);

  const topCategories = sortedCategories.slice(0, 4);

  return (
    <div className="mt-8">
      <h2 className="text-[17px] font-extrabold text-foreground mb-4 tracking-tight">카테고리별 활동 분석</h2>
      
      <div className="flex flex-col gap-4">
        {/* Donut Chart Section */}
        <div className="bg-card rounded-[24px] p-6 shadow-sm border border-border flex items-center justify-between">
          <div className="flex-1 pr-6">
            <h3 className="text-[13px] font-bold text-muted-foreground mb-4 tracking-wider">점유율 요약</h3>
            <div className="space-y-3">
              {topCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.hex_color || '#9CA3AF' }} />
                    <span className="text-[13px] font-bold text-foreground">{cat.name}</span>
                  </div>
                  <span className="text-[13px] font-bold text-foreground">{cat.percentage}%</span>
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
              <span className="text-xs font-bold text-muted-foreground">Total</span>
              <span className="text-[15px] font-black text-foreground leading-tight">
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
                className="bg-card rounded-[24px] p-5 shadow-sm border border-border flex flex-col justify-between h-[150px] cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 text-muted-foreground font-semibold text-sm">
                  <div className="p-1.5 rounded-[10px]" style={{ backgroundColor: bgRgba, color: color }}>
                    <LayoutGrid size={15} />
                  </div>
                  <span className="uppercase tracking-wider text-[11px] truncate max-w-[80px]">{cat.name}</span>
                </div>
                <div className="text-[32px] font-black text-foreground mt-2 tracking-tighter leading-none">
                  {cat.percentage}<span className="text-[16px] text-muted-foreground font-bold ml-0.5">%</span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[11px] font-bold text-muted-foreground">
                  <span className="text-foreground">{cat.hours}h</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-foreground">{cat.count}회</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
