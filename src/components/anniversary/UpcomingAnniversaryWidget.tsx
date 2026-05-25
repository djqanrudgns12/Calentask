import { useUpcomingAnniversary } from '@/hooks/useUpcomingAnniversary';
import { Heart, Calendar, Gift, Star, Banknote } from 'lucide-react';

export function UpcomingAnniversaryWidget() {
  const { data, isLoading } = useUpcomingAnniversary();

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
    <div className="mx-4 mt-6 mb-2 relative group cursor-pointer overflow-hidden rounded-2xl shadow-sm transition-all hover:shadow-md border border-white/20">
      {/* 배경 그라데이션 및 투명도 (Glassmorphism) */}
      <div 
        className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-15"
        style={{ backgroundColor: themeColor }}
      />
      <div 
        className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-md"
      />
      
      {/* 콘텐츠 */}
      <div className="relative p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
            style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70" style={{ color: themeColor }}>
              Upcoming
            </span>
            <span className="text-sm font-extrabold text-slate-800 line-clamp-1">
              {event.title}
            </span>
          </div>
        </div>

        {/* D-Day 뱃지 */}
        <div 
          className="px-3 py-1.5 rounded-full font-black text-sm whitespace-nowrap shadow-sm"
          style={{ 
            backgroundColor: isToday ? themeColor : 'white', 
            color: isToday ? 'white' : themeColor,
            border: isToday ? 'none' : `1px solid ${themeColor}30`
          }}
        >
          {dDayText}
        </div>
      </div>
    </div>
  );
}
