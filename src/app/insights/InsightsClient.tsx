"use client";

import { useQuery } from '@tanstack/react-query';
import WeeklySummaryCard from '@/components/insights/WeeklySummaryCard';
import ActivityBreakdownGrid from '@/components/insights/ActivityBreakdownGrid';
import QuickAddCarousel from '@/components/insights/QuickAddCarousel';

export default function InsightsClient() {
  const { data: insightsData, isLoading: isLoadingInsights } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const res = await fetch('/api/insights');
      if (!res.ok) throw new Error('Failed to fetch insights');
      return res.json();
    }
  });

  const { data: templatesData, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    }
  });

  if (isLoadingInsights || isLoadingTemplates) {
    return (
      <div className="flex flex-col gap-6 p-4 mt-12 animate-pulse">
        <div className="h-[280px] bg-gray-200 rounded-3xl w-full"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-[160px] bg-gray-200 rounded-3xl"></div>
          <div className="h-[160px] bg-gray-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const { summary, breakdown, rawData } = insightsData || { summary: { totalHours: 0, totalCount: 0 }, breakdown: {}, rawData: [] };
  const templates = templatesData || [];

  return (
    <>
      <WeeklySummaryCard totalHours={summary.totalHours} totalCount={summary.totalCount} rawData={rawData} />
      <ActivityBreakdownGrid breakdown={breakdown} />
      <QuickAddCarousel templates={templates} />
    </>
  );
}
