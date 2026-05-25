"use client";

import { useSubjectDetails } from '@/hooks/useInsightsQueries';
import { useCalendarStore } from '@/store/useCalendarStore';
import { X, Clock, CalendarDays, Loader2, TrendingUp, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

export default function SubjectDetailSheet({ 
  subjectId, 
  onClose,
  startDate,
  endDate,
  breakdownInfo
}: { 
  subjectId: string | null;
  onClose: () => void;
  startDate: string;
  endDate: string;
  breakdownInfo: any;
}) {
  const { data, isLoading } = useSubjectDetails(subjectId || '', startDate, endDate);
  const openEditEvent = useCalendarStore((state) => state.openEditEvent);

  // Compute deeper analytics
  const analytics = (() => {
    if (!data?.activities || data.activities.length === 0) return null;
    
    const dayCounts = new Array(7).fill(0);
    const hourCounts = new Array(24).fill(0);
    
    data.activities.forEach((act: any) => {
      const start = new Date(act.start_time);
      dayCounts[start.getDay()]++;
      if (!act.is_all_day) {
        hourCounts[start.getHours()]++;
      }
    });

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const mostFrequentDay = days[maxDayIdx];

    const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
    const timeOfDay = maxHour >= 5 && maxHour < 12 ? '아침' :
                      maxHour >= 12 && maxHour < 18 ? '오후' :
                      maxHour >= 18 && maxHour < 24 ? '저녁' : '새벽';

    return { mostFrequentDay, timeOfDay };
  })();

  return (
    <AnimatePresence>
      {subjectId && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-[480px] bg-white shadow-2xl z-[101] flex flex-col border-l border-gray-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white z-10 sticky top-0">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: breakdownInfo?.hex_color || '#E5E7EB' }}
                />
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  <span style={{ color: breakdownInfo?.hex_color || 'inherit' }}>{breakdownInfo?.name}</span> 집중 분석 리포트
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
                  <p className="font-medium text-sm">상세 데이터를 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm flex flex-col">
                      <div className="flex items-center gap-1.5 text-gray-500 font-bold text-[12px] mb-2">
                        <Clock size={14} /> 총 소요 시간
                      </div>
                      <div className="text-[28px] font-black text-gray-900 tracking-tighter mt-auto">
                        {Math.round((breakdownInfo?.minutes || 0) / 60)}<span className="text-[16px] text-gray-400 font-bold ml-1">시간</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm flex flex-col">
                      <div className="flex items-center gap-1.5 text-gray-500 font-bold text-[12px] mb-2">
                        <CalendarDays size={14} /> 진행 횟수
                      </div>
                      <div className="text-[28px] font-black text-gray-900 tracking-tighter mt-auto">
                        {breakdownInfo?.count || 0}<span className="text-[16px] text-gray-400 font-bold ml-1">회</span>
                      </div>
                    </div>
                  </div>

                  {/* Deep Analytics */}
                  {analytics && (
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[20px] p-5 shadow-lg flex items-center justify-around text-white">
                      <div className="text-center">
                        <div className="text-[11px] font-bold text-gray-400 mb-1 flex items-center justify-center gap-1">
                          <Flame size={12} className="text-orange-400" />
                          가장 활발한 요일
                        </div>
                        <div className="text-xl font-black tracking-tight">{analytics.mostFrequentDay}요일</div>
                      </div>
                      <div className="w-px h-8 bg-gray-700/50"></div>
                      <div className="text-center">
                        <div className="text-[11px] font-bold text-gray-400 mb-1 flex items-center justify-center gap-1">
                          <TrendingUp size={12} className="text-emerald-400" />
                          주 활동 시간대
                        </div>
                        <div className="text-xl font-black tracking-tight">{analytics.timeOfDay}</div>
                      </div>
                    </div>
                  )}

                {/* Timeline */}
                  <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-[14px] font-bold text-gray-900 mb-5 flex items-center gap-2">
                      진행 타임라인
                    </h3>
                    {data?.activities && data.activities.length > 0 ? (
                      <div className="space-y-2 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-gray-100">
                        {data.activities.map((act: any) => {
                          const date = new Date(act.start_time);
                          const isSameDay = act.is_all_day;
                          return (
                            <div 
                              key={act.id} 
                              className="relative flex items-start group cursor-pointer hover:bg-gray-50 p-3 -ml-3 rounded-2xl transition-all active:scale-[0.98]"
                              onClick={() => {
                                openEditEvent(act);
                              }}
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] border-white shrink-0 z-10 shadow-sm mt-0.5" style={{ backgroundColor: breakdownInfo?.hex_color || '#E5E7EB' }}>
                              </div>
                              <div className="ml-4 w-full">
                                <div className="text-[14px] font-bold text-gray-900 leading-none mb-1.5 group-hover:text-indigo-600 transition-colors">{act.title}</div>
                                <div className="text-[12px] font-semibold text-gray-400 flex items-center gap-2 group-hover:text-gray-500 transition-colors">
                                  <span>{format(date, 'yyyy.MM.dd', { locale: ko })}</span>
                                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                  <span>{isSameDay ? '하루 종일' : `${format(date, 'a h:mm', { locale: ko })}`}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-400 text-sm font-medium">
                        해당 기간에 진행된 일정이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
