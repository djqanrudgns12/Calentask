'use client'

import { motion } from 'framer-motion'
import { useSharedPeriodStore, PeriodPreset } from '@/store/useSharedPeriodStore'

interface SharedPeriodDropdownProps {
  className?: string;
}

export default function SharedPeriodDropdown({ className = '' }: SharedPeriodDropdownProps) {
  const { preset, setPreset, customRange, setCustomRange } = useSharedPeriodStore()

  return (
    <div className={`flex flex-col items-end gap-2 relative z-10 ${className}`}>
      <select 
        value={preset}
        onChange={(e) => setPreset(e.target.value as PeriodPreset)}
        className="text-[13px] font-bold text-indigo-600 bg-indigo-50 border-none rounded-xl px-3 py-1.5 cursor-pointer hover:bg-indigo-100 transition-colors focus:ring-0 outline-none"
      >
        <option value="this_month">이번 달</option>
        <option value="semester1">1학기</option>
        <option value="semester2">2학기</option>
        <option value="this_year">올해</option>
        <option value="all">전체</option>
        <option value="custom">직접 선택 (캘린더)</option>
      </select>

      {preset === 'custom' && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl shadow-sm border border-indigo-100"
        >
          <input 
            type="date" 
            value={customRange.start} 
            onChange={e => setCustomRange(e.target.value, customRange.end)}
            className="text-[12px] text-foreground font-medium border-none focus:ring-0 p-0 bg-transparent cursor-pointer"
          />
          <span className="text-muted-foreground/50 font-bold">~</span>
          <input 
            type="date" 
            value={customRange.end} 
            onChange={e => setCustomRange(customRange.start, e.target.value)}
            className="text-[12px] text-foreground font-medium border-none focus:ring-0 p-0 bg-transparent cursor-pointer"
          />
        </motion.div>
      )}
    </div>
  )
}
