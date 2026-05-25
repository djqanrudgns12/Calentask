import { Anniversary } from '@/utils/anniversaryCalculator';
import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';

interface Props {
  anniversaries: Anniversary[];
  onEdit: (ann: Anniversary) => void;
  onDelete: (id: string) => void;
}

export function AnniversaryTimeline({ anniversaries, onEdit, onDelete }: Props) {
  // 타임라인을 위해 날짜순으로 정렬 (기본적으로 base_date 기준)
  const sorted = [...anniversaries].sort((a, b) => new Date(a.base_date).getTime() - new Date(b.base_date).getTime());

  return (
    <div className="relative max-w-2xl mx-auto py-8">
      {/* 중앙(또는 좌측) 수직선 */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 rounded-full" />

      <div className="space-y-12">
        {sorted.map((ann, idx) => {
          let themeColor = '#6366f1';
          if (ann.preset_type === 'COUPLE') themeColor = '#9f1239';
          else if (ann.preset_type === 'BIRTHDAY' || ann.preset_type === 'LUNAR_BIRTHDAY') themeColor = '#b45309';
          else if (ann.preset_type === 'EXAM') themeColor = '#0369a1';
          else if (ann.preset_type === 'PAYDAY') themeColor = '#047857';

          return (
            <motion.div 
              key={ann.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-20 group"
            >
              {/* 타임라인 점 (Dot) */}
              <div 
                className="absolute left-[29px] top-4 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-125"
                style={{ backgroundColor: themeColor }}
              />

              {/* 콘텐츠 카드 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="px-2.5 py-1 text-xs font-bold rounded-lg"
                      style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                    >
                      {ann.preset_type}
                    </span>
                    <span className="text-sm font-medium text-slate-500">
                      {ann.is_lunar ? '음력 ' : ''}{ann.base_date}
                    </span>
                  </div>
                  
                  {/* Hover Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <button onClick={() => onEdit(ann)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(ann.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-slate-800">{ann.title}</h4>
                
                {/* 룰 설명 (간단) */}
                <p className="text-sm text-slate-500 mt-2 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2" />
                  {ann.calculation_rule.type === 'RECURRENCE' ? '매년 반복' : 'D-Day / 일수 계산'}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
