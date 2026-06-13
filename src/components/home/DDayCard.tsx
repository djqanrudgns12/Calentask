'use client'

import { useState } from 'react'
import { useUpcomingAnniversary } from '@/hooks/useUpcomingAnniversary'
import { Heart, Calendar, Gift, Star, Banknote, PartyPopper } from 'lucide-react'
import { AnniversarySummaryModal } from '@/components/anniversary/AnniversarySummaryModal'
import { motion } from 'framer-motion'

export function DDayCard() {
  const { data, isLoading } = useUpcomingAnniversary()
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-100 rounded w-20" />
            <div className="h-4 bg-slate-100 rounded w-32" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center shadow-inner border border-white/50">
            <PartyPopper className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">D-Day</p>
            <p className="text-sm font-bold text-slate-400 mt-0.5">등록된 기념일이 없습니다</p>
          </div>
        </div>
      </div>
    )
  }

  const { event, daysLeft, isToday } = data
  const themeColor = event.hex_color || '#4338ca'

  const dDayText = isToday ? 'D-Day!' : `D-${daysLeft}`

  // 프리셋에 따른 아이콘
  let Icon = Calendar
  if (themeColor === '#9f1239') Icon = Heart
  else if (themeColor === '#b45309') Icon = Gift
  else if (themeColor === '#047857') Icon = Banknote
  else if (themeColor === '#0369a1') Icon = Star

  return (
    <>
      <motion.div
        onClick={() => setIsModalOpen(true)}
        whileHover={{ y: -2 }}
        className="relative bg-white/85 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer group transition-shadow hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)]"
      >
        {/* 배경 그라데이션 */}
        <div
          className="absolute inset-0 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity duration-500"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}80)` }}
        />

        <div className="relative p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div
              className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center shadow-inner border border-white/50"
              style={{ backgroundColor: `${themeColor}12`, color: themeColor }}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="text-[10px] font-extrabold uppercase tracking-[0.15em]"
                style={{ color: themeColor, opacity: 0.7 }}
              >
                Upcoming Anniversary
              </span>
              <p className="text-sm font-extrabold text-slate-800 line-clamp-1 leading-tight mt-0.5">
                {event.title}
              </p>
            </div>
          </div>

          {/* D-Day 뱃지 */}
          <div
            className="px-4 py-2 shrink-0 rounded-2xl font-black text-sm whitespace-nowrap shadow-sm border transition-transform group-hover:scale-105"
            style={{
              backgroundColor: isToday ? themeColor : 'white',
              color: isToday ? 'white' : themeColor,
              borderColor: isToday ? 'transparent' : `${themeColor}25`,
            }}
          >
            {dDayText}
          </div>
        </div>
      </motion.div>

      <AnniversarySummaryModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        event={event}
        daysLeft={daysLeft}
        isToday={isToday}
      />
    </>
  )
}
