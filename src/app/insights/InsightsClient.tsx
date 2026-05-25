"use client";

import { useState } from 'react';
import { useInsightsData, useActivityTemplates } from '@/hooks/useInsightsQueries';
import WeeklySummaryCard from '@/components/insights/WeeklySummaryCard';
import ActivityBreakdownGrid from '@/components/insights/ActivityBreakdownGrid';
import QuickAddCarousel from '@/components/insights/QuickAddCarousel';
import SubjectDetailSheet from '@/components/insights/SubjectDetailSheet';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';

type PeriodType = 'week' | 'month' | 'year' | 'custom';

export default function InsightsClient() {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Default dates based on period
  const now = new Date();
  let startDate = startOfWeek(now).toISOString();
  let endDate = endOfWeek(now).toISOString();

  if (period === 'month') {
    startDate = startOfMonth(now).toISOString();
    endDate = endOfMonth(now).toISOString();
  } else if (period === 'year') {
    startDate = startOfYear(now).toISOString();
    endDate = endOfYear(now).toISOString();
  } else if (period === 'custom') {
    // 임시로 최근 30일로 세팅
    startDate = subDays(now, 30).toISOString();
    endDate = now.toISOString();
  }

  const { data: insightsData, isLoading: isLoadingInsights } = useInsightsData(startDate, endDate);
  const { data: templatesData, isLoading: isLoadingTemplates } = useActivityTemplates();

  if (isLoadingInsights || isLoadingTemplates) {
    return (
      <div className="flex flex-col gap-6 p-4 mt-8 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-2xl w-[80%] mb-2"></div>
        <div className="h-[280px] bg-gray-200 rounded-3xl w-full"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-[160px] bg-gray-200 rounded-3xl"></div>
          <div className="h-[160px] bg-gray-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const { summary, breakdown, weeklyData } = insightsData || { summary: { totalHours: 0, totalCount: 0 }, breakdown: {} as Record<string, any>, weeklyData: [] };
  const templates = templatesData || [];

  return (
    <div className="mt-2 pb-10">
      {/* Period Filter UI */}
      <div className="flex items-center gap-1 mb-8 bg-white p-1.5 rounded-[20px] border border-gray-200 shadow-sm overflow-x-auto hide-scroll">
        {[
          { id: 'week', label: '이번 주' },
          { id: 'month', label: '이번 달' },
          { id: 'year', label: '올해' },
          { id: 'custom', label: '직접 설정' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPeriod(tab.id as PeriodType)}
            className={`px-4 py-2.5 rounded-[14px] text-[13px] font-bold transition-all whitespace-nowrap flex-1 ${period === tab.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <WeeklySummaryCard totalHours={summary.totalHours} totalCount={summary.totalCount} chartData={weeklyData} period={period} />
      <ActivityBreakdownGrid breakdown={breakdown} onSelectSubject={(id) => setSelectedSubjectId(id)} />
      <QuickAddCarousel templates={templates} />

      {/* Subject Detail Panel */}
      <SubjectDetailSheet 
        subjectId={selectedSubjectId} 
        onClose={() => setSelectedSubjectId(null)}
        startDate={startDate}
        endDate={endDate}
        breakdownInfo={selectedSubjectId && breakdown[selectedSubjectId] ? breakdown[selectedSubjectId] : null}
      />
    </div>
  );
}
