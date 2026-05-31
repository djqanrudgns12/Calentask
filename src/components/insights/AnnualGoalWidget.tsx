"use client";

import { useMemo } from 'react';
import { Target, Trophy } from 'lucide-react';
import { useInsightsData } from '@/hooks/useInsightsQueries';
import { Activity } from '@/app/actions/calendar';
import { startOfYear, endOfYear } from 'date-fns';

export default function AnnualGoalWidget() {
  const yearStart = startOfYear(new Date()).toISOString();
  const yearEnd = endOfYear(new Date()).toISOString();
  const { data: insightsData } = useInsightsData(yearStart, yearEnd);

  const GOAL_HOURS = 1000; // 1만 시간의 법칙 대신 현실적으로 연 1,000시간 (하루 약 2.7시간)

  const progress = useMemo(() => {
    if (!insightsData?.rawData) return { hours: 0, percent: 0 };
    const activities = insightsData.rawData as Activity[];
    
    let totalMins = 0;
    activities.forEach(act => {
      const start = new Date(act.start_time).getTime();
      const end = new Date(act.end_time).getTime();
      totalMins += (end - start) / 60000;
    });

    const hours = Math.round(totalMins / 60);
    const percent = Math.min(Math.round((hours / GOAL_HOURS) * 100), 100);
    
    return { hours, percent };
  }, [insightsData?.rawData]);

  return (
    <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex items-center justify-between w-full h-[120px] relative overflow-hidden group">
      <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="flex flex-col z-10">
        <div className="flex items-center gap-1.5 text-indigo-600 font-extrabold text-[12px] uppercase tracking-widest mb-1 whitespace-nowrap">
          <Trophy size={14} /> 2026 마스터 목표
        </div>
        <div className="text-[28px] font-black text-gray-900 tracking-tighter leading-none mt-1">
          {progress.hours.toLocaleString()} <span className="text-[16px] text-gray-400 font-bold ml-0.5">/ {GOAL_HOURS.toLocaleString()} h</span>
        </div>
      </div>

      <div className="relative w-[70px] h-[70px] flex items-center justify-center shrink-0 z-10">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            stroke="#F3F4F6"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={263.89}
            strokeDashoffset={263.89 - (263.89 * progress.percent) / 100}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[14px] font-black text-indigo-600">{progress.percent}%</span>
        </div>
      </div>
    </div>
  );
}
