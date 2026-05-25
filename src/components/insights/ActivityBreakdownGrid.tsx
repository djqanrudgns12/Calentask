"use client";
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { BookOpen, Dumbbell, Briefcase, Plus, MoreHorizontal } from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  Study: <BookOpen size={16} />,
  Workout: <Dumbbell size={16} />,
  Reading: <BookOpen size={16} />,
  Work: <Briefcase size={16} />,
  Others: <MoreHorizontal size={16} />
};

export default function ActivityBreakdownGrid({ breakdown }: { breakdown: Record<string, any> }) {
  // Dummy data for design perfection
  const cards = [
    { title: 'Study', percentage: 40, data: [1, 2, 1, 3, 4], color: '#8B5CF6', bg: '#F5F3FF' },
    { title: 'Workout', percentage: 30, data: [2, 1, 3, 2, 2], color: '#06B6D4', bg: '#ECFEFF' },
    { title: 'Reading', percentage: 20, data: [1, 1, 2, 1, 1], color: '#F472B6', bg: '#FDF2F8' },
    { title: 'Others', percentage: 10, data: [1, 0, 1, 0, 1], color: '#9CA3AF', bg: '#F3F4F6' },
  ];

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Activity Breakdown</h2>
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card, idx) => {
          const chartData = card.data.map((val, i) => ({ val, name: i.toString() }));
          return (
            <div key={idx} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-[160px]">
              <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: card.bg, color: card.color }}>
                  {ICONS[card.title] || <Plus size={16} />}
                </div>
                <span className="uppercase tracking-wider text-xs">{card.title}</span>
              </div>
              <div className="text-4xl font-bold text-gray-900 mt-3 tracking-tighter">
                {card.percentage}<span className="text-xl text-gray-400 font-medium ml-0.5">%</span>
              </div>
              <div className="h-[36px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Bar dataKey="val" radius={[3, 3, 3, 3]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? card.color : card.bg} />
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
