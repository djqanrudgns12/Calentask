"use client";

import React, { useMemo } from 'react';
import { Activity } from '@/app/actions/calendar';
import { useCalendarStore } from '@/store/useCalendarStore';
import { format, eachDayOfInterval, subDays, startOfDay, getDay, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ActivityHeatmapProps {
  activities: Activity[];
}

const ActivityHeatmap = React.memo(function ActivityHeatmap({ activities }: ActivityHeatmapProps) {
  const openAddEvent = useCalendarStore((state) => state.openAddEvent);

  const heatmapData = useMemo(() => {
    const today = startOfDay(new Date());
    // Show last 140 days (20 weeks) to fit nicely in a scrolling or wide container
    const startDate = subDays(today, 140);
    const days = eachDayOfInterval({ start: startDate, end: today });
    
    // Aggregate activities by day
    const dayMap = new Map<number, number>(); // timestamp -> total minutes
    
    activities.forEach(act => {
      const actStart = startOfDay(new Date(act.start_time)).getTime();
      const mins = (new Date(act.end_time).getTime() - new Date(act.start_time).getTime()) / 60000;
      
      const current = dayMap.get(actStart) || 0;
      dayMap.set(actStart, current + mins);
    });

    return days.map(day => {
      const ts = day.getTime();
      return {
        date: day,
        minutes: dayMap.get(ts) || 0
      };
    });
  }, [activities]);

  // Group into weeks (columns)
  const weeks: (typeof heatmapData)[] = [];
  let currentWeek: typeof heatmapData = [];

  heatmapData.forEach(dayData => {
    if (currentWeek.length === 0 && getDay(dayData.date) !== 0) {
      // Pad first week if it doesn't start on Sunday (0)
      for (let i = 0; i < getDay(dayData.date); i++) {
        currentWeek.push({ date: subDays(dayData.date, getDay(dayData.date) - i), minutes: -1 }); // -1 for padding
      }
    }
    currentWeek.push(dayData);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const getColor = (minutes: number) => {
    if (minutes < 0) return 'transparent'; // Padding
    if (minutes === 0) return '#F3F4F6';
    if (minutes < 30) return '#DBEAFE'; // blue-100
    if (minutes < 120) return '#93C5FD'; // blue-300
    if (minutes < 240) return '#3B82F6'; // blue-500
    return '#1D4ED8'; // blue-700
  };

  return (
    <div className="bg-card rounded-[24px] p-6 shadow-sm border border-border mt-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[17px] font-extrabold text-foreground tracking-tight">활동 잔디밭</h3>
          <p className="text-[12px] font-bold text-muted-foreground mt-0.5">매일의 꾸준함을 확인하세요</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-[3px] bg-[#F3F4F6]" />
            <div className="w-3 h-3 rounded-[3px] bg-[#DBEAFE]" />
            <div className="w-3 h-3 rounded-[3px] bg-[#93C5FD]" />
            <div className="w-3 h-3 rounded-[3px] bg-[#3B82F6]" />
            <div className="w-3 h-3 rounded-[3px] bg-[#1D4ED8]" />
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 hide-scrollbar overscroll-x-contain touch-pan-x">
        <div className="flex gap-1.5 min-w-max">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((dayData, dIdx) => (
                <div 
                  key={dIdx} 
                  className="w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-pointer relative group"
                  style={{ backgroundColor: getColor(dayData.minutes) }}
                  onClick={() => {
                    if (dayData.minutes >= 0) {
                      openAddEvent(dayData.date);
                    }
                  }}
                >
                  {/* Tooltip */}
                  {dayData.minutes >= 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                      {format(dayData.date, 'M월 d일', { locale: ko })} 
                      {dayData.minutes > 0 ? ` (${Math.round(dayData.minutes / 60 * 10) / 10}시간)` : ' (기록 없음)'}
                      <div className="text-muted-foreground font-normal mt-0.5 border-t border-gray-700 pt-0.5">
                        클릭하여 일정 추가
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ActivityHeatmap;
