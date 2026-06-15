import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OverlayEvent } from '@/utils/anniversaryCalculator';
import { Calendar, Settings2, Heart, Gift, Star, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { useCalendarStore } from '@/store/useCalendarStore';
import { motion } from 'framer-motion';

export function AnniversarySummaryModal({
  open,
  onOpenChange,
  event,
  daysLeft,
  isToday
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: OverlayEvent;
  daysLeft: number;
  isToday: boolean;
}) {
  const { setViewMode } = useCalendarStore();
  const themeColor = event.hex_color || '#4f46e5';

  let Icon = Calendar;
  if (themeColor === '#9f1239') Icon = Heart;
  else if (themeColor === '#b45309') Icon = Gift;
  else if (themeColor === '#047857') Icon = Banknote;
  else if (themeColor === '#0369a1') Icon = Star;

  const handleGoToSettings = () => {
    onOpenChange(false);
    setViewMode('anniversary');
  };

  const formattedDate = format(new Date(event.start_time), 'yyyy년 M월 d일 (EEEE)');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-card/80 backdrop-blur-3xl border border-transparent/60 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] rounded-[2.5rem]">
        <DialogHeader className="sr-only">
          <DialogTitle>기념일 요약</DialogTitle>
          <DialogDescription>선택한 기념일의 상세 정보입니다.</DialogDescription>
        </DialogHeader>

        {/* 배경 효과 */}
        <div 
          className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: themeColor }}
        />
        <div 
          className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: themeColor }}
        />

        <div className="relative p-8 flex flex-col items-center text-center">
          {/* 아이콘 */}
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-lg mb-6 ring-4 ring-white"
            style={{ 
              background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 100%)`,
              color: 'white'
            }}
          >
            <Icon className="w-10 h-10 drop-shadow-md" />
          </motion.div>

          {/* D-Day */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="px-5 py-2 rounded-full font-black text-2xl tracking-tight shadow-sm border border-black/5 mb-4"
            style={{ 
              backgroundColor: isToday ? themeColor : 'white', 
              color: isToday ? 'white' : themeColor,
            }}
          >
            {isToday ? 'D-Day🎉' : `D-${daysLeft}`}
          </motion.div>

          {/* 제목 및 날짜 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-2 mb-8 w-full"
          >
            <h2 className="text-2xl font-extrabold text-foreground leading-tight">
              {event.title}
            </h2>
            <p className="text-muted-foreground font-medium">
              {formattedDate}
            </p>
          </motion.div>

          {/* 설정 버튼 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full"
          >
            <Button
              onClick={handleGoToSettings}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95 text-base flex items-center justify-center gap-2"
            >
              <Settings2 className="w-5 h-5" />
              기념일 설정으로 이동
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
