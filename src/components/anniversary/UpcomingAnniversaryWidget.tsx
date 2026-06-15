import { useState } from 'react';
import { useUpcomingAnniversary } from '@/hooks/useUpcomingAnniversary';
import { Heart, Calendar, Gift, Star, Banknote } from 'lucide-react';
import { AnniversarySummaryModal } from './AnniversarySummaryModal';

export function UpcomingAnniversaryWidget() {
  const { data, isLoading } = useUpcomingAnniversary();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading || !data) return null;

  const { event, daysLeft, isToday } = data;
  const themeColor = event.hex_color || '#4338ca';

  // D-Day 텍스트 포맷팅
  const dDayText = isToday ? 'D-Day' : `D-${daysLeft}`;

  // 프리셋에 따른 아이콘 (간단한 휴리스틱 매핑)
  let Icon = Calendar;
  if (themeColor === '#9f1239') Icon = Heart; // COUPLE
  else if (themeColor === '#b45309') Icon = Gift; // BIRTHDAY
  else if (themeColor === '#047857') Icon = Banknote; // PAYDAY
  else if (themeColor === '#0369a1') Icon = Star; // EXAM

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="mx-4 mt-6 mb-2 relative group cursor-pointer overflow-hidden rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] transition-all hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 border border-transparent/40 ring-1 ring-black/5"
        title={event.title}
      >
        {/* 배경 그라데이션 및 투명도 (Glassmorphism) */}
        <div 
          className="absolute inset-0 opacity-10 transition-opacity duration-300 group-hover:opacity-15"
          style={{ backgroundColor: themeColor }}
        />
        <div 
          className="absolute inset-0 bg-gradient-to-br from-white/90 to-white/50 backdrop-blur-xl"
        />
        
        {/* 콘텐츠 */}
        <div className="relative p-4 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div 
              className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center shadow-inner border border-transparent/50"
              style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-60" style={{ color: themeColor }}>
                Upcoming
              </span>
              <span className="text-[13px] font-extrabold text-foreground line-clamp-2 leading-tight">
                {event.title}
              </span>
            </div>
          </div>

          {/* D-Day 뱃지 */}
          <div 
            className="px-3 py-1.5 shrink-0 rounded-full font-black text-xs whitespace-nowrap shadow-sm border"
            style={{ 
              backgroundColor: isToday ? themeColor : 'white', 
              color: isToday ? 'white' : themeColor,
              borderColor: isToday ? 'transparent' : `${themeColor}30`
            }}
          >
            {dDayText}
          </div>
        </div>
      </div>

      <AnniversarySummaryModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        event={event}
        daysLeft={daysLeft}
        isToday={isToday}
      />
    </>
  );
}
