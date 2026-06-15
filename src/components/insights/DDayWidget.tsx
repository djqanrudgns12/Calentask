"use client";

import { useMemo } from 'react';
import { CalendarHeart, Flame, Clock } from 'lucide-react';
import { differenceInDays, format, startOfDay } from 'date-fns';
import { useSharedPeriodStore, getDatesForPreset } from '@/store/useSharedPeriodStore';
import { motion } from 'framer-motion';

export default function DDayWidget() {
  const { preset, customRange } = useSharedPeriodStore();
  const { startDate } = getDatesForPreset(preset, customRange);

  const ddayInfo = useMemo(() => {
    if (preset !== 'custom' || !customRange.start || customRange.start !== customRange.end) return null;
    
    const targetDate = new Date(startDate);
    const today = startOfDay(new Date());
    const target = startOfDay(targetDate);
    const diff = differenceInDays(target, today);
    
    if (diff === 0) return { targetDate, text: "D-Day", label: "오늘", type: "today", color: "from-rose-400 to-pink-500", textCol: "text-rose-600" };
    if (diff > 0) return { targetDate, text: `D-${diff}`, label: `${diff}일 남음`, type: "future", color: "from-indigo-400 to-purple-500", textCol: "text-indigo-600" };
    return { targetDate, text: `D+${Math.abs(diff)}`, label: `${Math.abs(diff)}일 지남`, type: "past", color: "from-emerald-400 to-teal-500", textCol: "text-emerald-600" };
  }, [preset, customRange, startDate]);

  if (!ddayInfo) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex items-center justify-between w-full h-[120px] relative overflow-hidden group"
    >
      <div className={`absolute right-0 top-0 w-32 h-32 bg-gradient-to-br ${ddayInfo.color} rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 transition-colors duration-500`}></div>
      
      <div className="flex flex-col z-10">
        <div className={`flex items-center gap-1.5 ${ddayInfo.textCol} font-extrabold text-[12px] uppercase tracking-widest mb-1`}>
          <CalendarHeart size={14} /> 목표일 카운트다운
        </div>
        <div className="text-[28px] font-black text-gray-900 tracking-tighter leading-none mt-1 flex items-baseline gap-2">
          {ddayInfo.text}
        </div>
        <div className="text-[13px] font-bold text-gray-400 mt-1">
          {format(ddayInfo.targetDate, 'yyyy년 M월 d일')}
        </div>
      </div>

      <div className={`relative w-[64px] h-[64px] rounded-full bg-gradient-to-br ${ddayInfo.color} flex flex-col items-center justify-center shrink-0 z-10 shadow-lg shadow-${ddayInfo.color.split('-')[1]}/30`}>
        {ddayInfo.type === 'today' ? (
          <Flame size={28} className="text-white animate-pulse" />
        ) : (
          <Clock size={28} className="text-white" />
        )}
        <div className="text-white text-[10px] font-black tracking-widest mt-0.5">
          {ddayInfo.label}
        </div>
      </div>
    </motion.div>
  );
}
