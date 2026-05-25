"use client";

import { useSubjectDetails } from '@/hooks/useInsightsQueries';
import { X, Clock, CalendarDays, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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

  if (!subjectId) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{breakdownInfo?.name || '상세 내역'}</h2>
            <p className="text-sm text-gray-500 mt-1">집중 분석 리포트</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-sm">데이터를 불러오는 중...</span>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500 mb-3">
                    <Clock size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">총 소요 시간</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 tracking-tighter">
                    {Math.round((data?.totalMinutes || 0) / 60)}<span className="text-sm text-gray-400 ml-1 font-medium">시간</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500 mb-3">
                    <CalendarDays size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">진행 횟수</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 tracking-tighter">
                    {data?.totalCount || 0}<span className="text-sm text-gray-400 ml-1 font-medium">회</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-6 px-1 flex items-center gap-2">
                  진행 타임라인
                </h3>
                {data?.activities && data.activities.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-gray-100">
                    {data.activities.map((act: any) => {
                      const date = new Date(act.start_time);
                      const isSameDay = act.is_all_day;
                      return (
                        <div key={act.id} className="relative flex items-start group">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] border-white bg-gray-200 shrink-0 z-10 shadow-sm" style={{ backgroundColor: breakdownInfo?.hex_color || '#E5E7EB' }}>
                          </div>
                          <div className="ml-4 w-full">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[15px] font-bold text-gray-900">{act.title}</span>
                            </div>
                            <div className="text-xs font-medium text-gray-400 flex items-center gap-2">
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
