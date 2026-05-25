"use client";

import { useSubjectDetails } from '@/hooks/useInsightsQueries';
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
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#FAFAFA] shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 pb-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">{breakdownInfo?.name || '상세 내역'}</h2>
                <p className="text-xs font-bold text-gray-400 mt-0.5">카테고리 집중 분석 리포트</p>
              </div>
              <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  <span className="text-sm font-medium">데이터를 분석 중...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Clock size={15} />
                        <span className="text-[11px] font-extrabold uppercase tracking-widest">총 소요 시간</span>
                      </div>
                      <div className="text-3xl font-black text-gray-900 tracking-tighter">
                        {Math.round((data?.totalMinutes || 0) / 60)}<span className="text-sm text-gray-400 ml-1 font-bold">시간</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <CalendarDays size={15} />
                        <span className="text-[11px] font-extrabold uppercase tracking-widest">진행 횟수</span>
                      </div>
                      <div className="text-3xl font-black text-gray-900 tracking-tighter">
                        {data?.totalCount || 0}<span className="text-sm text-gray-400 ml-1 font-bold">회</span>
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
                      <div className="space-y-5 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-gray-100">
                        {data.activities.map((act: any) => {
                          const date = new Date(act.start_time);
                          const isSameDay = act.is_all_day;
                          return (
                            <div key={act.id} className="relative flex items-start group">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] border-white shrink-0 z-10 shadow-sm" style={{ backgroundColor: breakdownInfo?.hex_color || '#E5E7EB' }}>
                              </div>
                              <div className="ml-4 w-full pt-0.5">
                                <div className="text-[14px] font-bold text-gray-900 leading-none mb-1.5">{act.title}</div>
                                <div className="text-[12px] font-semibold text-gray-400 flex items-center gap-2">
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
