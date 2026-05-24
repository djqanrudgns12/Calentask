import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AnniversaryPresetType } from '@/utils/anniversaryCalculator';

export function DynamicAnniversaryForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void, onCancel: () => void }) {
  const [preset, setPreset] = useState<AnniversaryPresetType>('COUPLE');
  const [title, setTitle] = useState('');
  const [baseDate, setBaseDate] = useState('');
  const [isLunar, setIsLunar] = useState(false);

  const getPlaceholder = () => {
    switch(preset) {
      case 'COUPLE': return '우리가 처음 만난 날';
      case 'EXAM': return '수능 / 자격증 시험일';
      case 'PAYDAY': return '월급날 (매월 며칠)';
      case 'CUSTOM': return '금연한 지 (목표일)';
      default: return '기념일 제목';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !baseDate) return;
    
    // Calculate rule based on preset
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] border border-white/50 w-full max-w-md"
    >
      <h2 className="text-2xl font-bold text-slate-800 mb-6">새로운 기념일 추가</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Type Selector with Micro-animation */}
        <div className="flex flex-wrap gap-2">
          {(['COUPLE', 'BIRTHDAY', 'EXAM', 'PAYDAY', 'CUSTOM'] as AnniversaryPresetType[]).map((p) => (
            <motion.button
              key={p}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setPreset(p); if (p !== 'BIRTHDAY' && p !== 'LUNAR_BIRTHDAY') setIsLunar(false); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${preset === p ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {p}
            </motion.button>
          ))}
        </div>

        {/* Title Field with Floating Label feel */}
        <div className="relative">
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-b-2 border-slate-200 py-2 text-lg focus:outline-none focus:border-blue-600 transition-colors peer"
            placeholder={getPlaceholder()}
            required
          />
          <motion.label 
            className="absolute left-0 -top-4 text-xs font-semibold text-blue-600 opacity-0 peer-focus:opacity-100 transition-opacity"
            initial={false}
          >
            기념일 이름
          </motion.label>
        </div>

        {/* Date Field */}
        <div className="relative">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">기준 날짜</label>
          <input 
            type="date" 
            value={baseDate}
            onChange={(e) => setBaseDate(e.target.value)}
            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            required
          />
        </div>

        {/* Lunar Toggle - Smooth Fade In/Out */}
        <AnimatePresence>
          {(preset === 'BIRTHDAY' || preset === 'LUNAR_BIRTHDAY') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center space-x-3 bg-indigo-50/50 p-3 rounded-xl overflow-hidden"
            >
              <input 
                type="checkbox" 
                id="lunar-check"
                checked={isLunar || preset === 'LUNAR_BIRTHDAY'}
                onChange={(e) => {
                  setIsLunar(e.target.checked);
                  setPreset(e.target.checked ? 'LUNAR_BIRTHDAY' : 'BIRTHDAY');
                }}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="lunar-check" className="text-sm font-medium text-slate-700">
                음력 날짜입니다 (매년 양력 자동 변환)
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-700">취소</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 rounded-xl px-6">
            저장하기
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
