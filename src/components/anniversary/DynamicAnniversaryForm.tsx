import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AnniversaryPresetType } from '@/utils/anniversaryCalculator';
import { CalendarDays, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const PRESET_LABELS: Record<AnniversaryPresetType, string> = {
  COUPLE: '💕 연인/커플',
  BIRTHDAY: '🎂 생일',
  LUNAR_BIRTHDAY: '🎂 생일', // 내부적으로만 쓰임
  EXAM: '📝 시험/디데이',
  PAYDAY: '💰 월급/정기일',
  CUSTOM: '✨ 직접 설정'
};

export function DynamicAnniversaryForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void, onCancel: () => void }) {
  const [preset, setPreset] = useState<AnniversaryPresetType>('COUPLE');
  const [title, setTitle] = useState('');
  const [baseDate, setBaseDate] = useState('');
  const [isLunar, setIsLunar] = useState(false);

  const getPlaceholder = () => {
    switch(preset) {
      case 'COUPLE': return '누구와의 디데이인가요?';
      case 'BIRTHDAY':
      case 'LUNAR_BIRTHDAY': return '누구의 생일인가요?';
      case 'EXAM': return '어떤 시험/디데이인가요?';
      case 'PAYDAY': return '어떤 정기일인가요?';
      case 'CUSTOM': return '어떤 기념일인가요?';
      default: return '기념일 이름';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !baseDate) return;
    
    let calculation_rule: any = { type: 'DAYS_COUNT' };
    if (preset === 'EXAM') calculation_rule = { type: 'D_DAY' };
    if (preset === 'PAYDAY') calculation_rule = { type: 'RECURRENCE', unit: 'MONTH', options: { avoid_weekends: true } };
    if (preset === 'BIRTHDAY' || preset === 'LUNAR_BIRTHDAY') calculation_rule = { type: 'RECURRENCE', unit: 'YEAR' };

    onSubmit({
      preset_type: preset,
      title,
      base_date: baseDate,
      is_lunar: preset === 'LUNAR_BIRTHDAY' || isLunar,
      calculation_rule
    });
  };

  // 날짜 포맷팅 로직
  const formattedDate = baseDate 
    ? format(new Date(baseDate), 'yyyy년 M월 d일') 
    : '날짜를 선택해 주세요';

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDateClick = () => {
    if (dateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch (e) {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="bg-white/95 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 w-full max-w-md relative overflow-hidden group"
    >
      {/* Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-400/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shadow-inner border border-white">
            <Sparkles className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">새로운 기념일 추가</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Preset Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 tracking-wider uppercase ml-1">유형 선택</label>
            <div className="flex flex-wrap gap-2">
              {(['COUPLE', 'BIRTHDAY', 'EXAM', 'PAYDAY', 'CUSTOM'] as AnniversaryPresetType[]).map((p) => {
                const isSelected = preset === p || (p === 'BIRTHDAY' && preset === 'LUNAR_BIRTHDAY');
                return (
                  <motion.button
                    key={p}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setPreset(p); if (p !== 'BIRTHDAY' && p !== 'LUNAR_BIRTHDAY') setIsLunar(false); }}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] ring-2 ring-blue-600/20 ring-offset-2 ring-offset-white' 
                        : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    {PRESET_LABELS[p]}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Title Field (Floating Label style) */}
          <div className="relative pt-5">
            <input 
              type="text" 
              id="anni-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent border-b-2 border-slate-200 py-2 text-xl font-bold text-slate-800 focus:outline-none focus:border-blue-600 transition-colors peer placeholder-transparent"
              placeholder={getPlaceholder()}
              required
            />
            <label 
              htmlFor="anni-title"
              className={`absolute left-0 transition-all duration-300 font-semibold pointer-events-none 
                ${title ? 'text-xs -top-1 text-blue-600' : 'text-xl top-7 text-slate-400 peer-focus:text-xs peer-focus:-top-1 peer-focus:text-blue-600'}`}
            >
              {getPlaceholder()}
            </label>
          </div>

          {/* Date Field (Custom Masked UI) */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 tracking-wider uppercase ml-1">기준 날짜</label>
            <div className="relative group cursor-pointer" onClick={handleDateClick}>
              {/* Actual Input (Invisible but interactive) */}
              <input 
                type="date"
                ref={dateInputRef}
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                required
              />
              {/* Custom Display UI */}
              <div className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between ${
                baseDate ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/80 border-slate-100 group-hover:border-slate-300 group-hover:bg-slate-100/50'
              }`}>
                <span className={`text-lg transition-colors ${baseDate ? 'text-blue-900 font-extrabold' : 'text-slate-400 font-semibold'}`}>
                  {formattedDate}
                </span>
                <div className={`p-2 rounded-xl transition-colors ${baseDate ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Lunar Toggle */}
          <AnimatePresence>
            {(preset === 'BIRTHDAY' || preset === 'LUNAR_BIRTHDAY') && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <label className="flex items-center space-x-3 bg-indigo-50/60 p-4 rounded-2xl cursor-pointer border border-indigo-100/50 hover:bg-indigo-50 transition-colors">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={isLunar || preset === 'LUNAR_BIRTHDAY'}
                      onChange={(e) => {
                        setIsLunar(e.target.checked);
                        setPreset(e.target.checked ? 'LUNAR_BIRTHDAY' : 'BIRTHDAY');
                      }}
                      className="peer sr-only"
                    />
                    <div className="w-6 h-6 border-2 border-indigo-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors flex items-center justify-center">
                      <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-indigo-900">
                    음력 날짜입니다 (매년 양력 자동 변환)
                  </span>
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100/60">
            <Button 
              variant="ghost" 
              type="button" 
              onClick={onCancel} 
              className="text-slate-500 hover:text-slate-800 font-semibold px-6 py-6 rounded-2xl"
            >
              취소
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] font-bold text-base px-8 py-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
            >
              저장하기
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
