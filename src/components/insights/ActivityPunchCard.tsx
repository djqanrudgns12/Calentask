"use client";

import React, { useMemo } from 'react';
import { Activity } from '@/app/actions/calendar';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';

interface ActivityPunchCardProps {
  activities: Activity[];
}

const ActivityPunchCard = React.memo(function ActivityPunchCard({ activities }: ActivityPunchCardProps) {
  const punchCardData = useMemo(() => {
    // 7 days (0: Sun, 1: Mon, ...), 24 hours (0..23)
    // We want Y-axis to be days (Mon-Sun), X-axis to be hours (0-23)
    const data: { dayIdx: number; dayName: string; hour: number; value: number }[] = [];
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    
    // Initialize
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        data.push({
          dayIdx: d, // Original index
          dayName: days[d],
          hour: h,
          value: 0
        });
      }
    }

    activities.forEach(act => {
      if (act.is_all_day) return; // Skip all day events for time accuracy
      
      const start = new Date(act.start_time);
      const end = new Date(act.end_time);
      const current = new Date(start);

      // Distribute minutes across hours (max 24 iterations to prevent infinite loop)
      let iterations = 0;
      while (current < end && iterations < 24) {
        const h = current.getHours();
        const d = current.getDay();
        
        // Find index in flat array
        const idx = d * 24 + h;
        if (idx >= 0 && idx < data.length) {
          data[idx].value += 1;
        }
        
        current.setHours(current.getHours() + 1);
        iterations++;
      }
    });

    // Re-order days to start from Monday for display (Mon=1..Sun=0->7)
    const displayOrder = [1, 2, 3, 4, 5, 6, 0];
    const orderedData: { dayIdx: number; dayName: string; hour: number; value: number; displayY: number; hourDisplay: string }[] = [];
    
    displayOrder.forEach((dayIdx, displayY) => {
      for (let h = 0; h < 24; h++) {
        const item = data.find(d => d.dayIdx === dayIdx && d.hour === h);
        if (item && item.value > 0) {
          orderedData.push({
            ...item,
            displayY: 6 - displayY, // Invert Y axis so Monday is at the top
            hourDisplay: `${h}시`
          });
        }
      }
    });

    return orderedData;
  }, [activities]);

  const yTickFormatter = (val: number) => {
    const days = ['일', '토', '금', '목', '수', '화', '월']; // Inverted
    return days[val] || '';
  };

  const xTickFormatter = (val: number) => {
    if (val % 3 === 0) return `${val}시`;
    return '';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-lg text-sm font-bold">
          <p className="text-gray-900">{data.dayName}요일 {data.hour}시</p>
          <p className="text-blue-600">집중도: {data.value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 mt-4 h-[320px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[17px] font-extrabold text-gray-900 tracking-tight">주 활동 시간대</h3>
          <p className="text-[12px] font-bold text-gray-400 mt-0.5">언제 가장 몰입하시나요?</p>
        </div>
      </div>
      
      <div className="flex-1 w-full -ml-4">
        {punchCardData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
              <XAxis 
                type="number" 
                dataKey="hour" 
                domain={[0, 23]} 
                tickCount={24}
                tickFormatter={xTickFormatter}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }}
              />
              <YAxis 
                type="number" 
                dataKey="displayY" 
                domain={[0, 6]} 
                tickCount={7}
                tickFormatter={yTickFormatter}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }}
                width={40}
              />
              <ZAxis 
                type="number" 
                dataKey="value" 
                range={[20, 400]} // Min max circle size
              />
              <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter data={punchCardData} fill="#3B82F6">
                {punchCardData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#3B82F6" fillOpacity={Math.min(0.3 + entry.value * 0.1, 0.9)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300 text-sm font-medium">
            표시할 시간대 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
});

export default ActivityPunchCard;
