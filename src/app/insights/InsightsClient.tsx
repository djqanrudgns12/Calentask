"use client";

import { useState, useMemo, useEffect } from 'react';
import { useInsightsData, useActivityTemplates } from '@/hooks/useInsightsQueries';
import { useCategories } from '@/hooks/useCalendarQueries';
import WeeklySummaryCard from '@/components/insights/WeeklySummaryCard';
import ActivityBreakdownGrid from '@/components/insights/ActivityBreakdownGrid';
import QuickAddCarousel from '@/components/insights/QuickAddCarousel';
import SubjectDetailSheet from '@/components/insights/SubjectDetailSheet';
import DashboardFilterBar, { ActivityTypeFilter } from '@/components/insights/DashboardFilterBar';
import SmartInsightComment from '@/components/insights/SmartInsightComment';
import ActivityHeatmap from '@/components/insights/ActivityHeatmap';
import ActivityPunchCard from '@/components/insights/ActivityPunchCard';
import AnnualGoalWidget from '@/components/insights/AnnualGoalWidget';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, startOfDay, endOfDay, subMonths, subYears, differenceInDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Activity } from '@/app/actions/calendar';

type PeriodType = 'week' | 'month' | 'year' | 'custom';

function getPresetDateRange(period: PeriodType) {
  const now = new Date();
  switch (period) {
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'custom':
      return { from: subDays(now, 30), to: now };
  }
}

export default function InsightsClient() {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(getPresetDateRange('week'));
  
  const [activityType, setActivityType] = useState<ActivityTypeFilter>('ALL');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // When preset period changes, update customDateRange
  useEffect(() => {
    if (period !== 'custom') {
      setCustomDateRange(getPresetDateRange(period));
    }
  }, [period]);

  const fromDate = customDateRange?.from ? startOfDay(customDateRange.from) : getPresetDateRange('week').from;
  const toDate = customDateRange?.to ? endOfDay(customDateRange.to) : (customDateRange?.from ? endOfDay(customDateRange.from) : getPresetDateRange('week').to);

  // Calculate previous period dates for comparative analytics
  const { prevFromDate, prevToDate } = useMemo(() => {
    let prevFrom, prevTo;
    if (period === 'week') {
      prevFrom = subDays(fromDate, 7);
      prevTo = subDays(toDate, 7);
    } else if (period === 'month') {
      prevFrom = subMonths(fromDate, 1);
      prevTo = subMonths(toDate, 1);
    } else if (period === 'year') {
      prevFrom = subYears(fromDate, 1);
      prevTo = subYears(toDate, 1);
    } else {
      const diff = differenceInDays(toDate, fromDate) + 1;
      prevFrom = subDays(fromDate, diff);
      prevTo = subDays(toDate, diff);
    }
    return { prevFromDate: prevFrom, prevToDate: prevTo };
  }, [period, fromDate, toDate]);

  const startDateIso = fromDate.toISOString();
  const endDateIso = toDate.toISOString();
  const prevStartDateIso = prevFromDate.toISOString();
  const prevEndDateIso = prevToDate.toISOString();

  const { data: insightsData, isLoading: isLoadingInsights } = useInsightsData(startDateIso, endDateIso);
  const { data: prevInsightsData } = useInsightsData(prevStartDateIso, prevEndDateIso);

  const { data: templatesData } = useActivityTemplates();
  const { data: categoriesData } = useCategories();

  const templates = templatesData ?? [];
  const categories = categoriesData ?? [];

  // Client-side filtering and aggregation
  const processedData = useMemo(() => {
    if (!insightsData?.rawData) {
      return { summary: { totalHours: 0, totalCount: 0 }, breakdown: {}, weeklyData: [] };
    }

    const rawActivities: Activity[] = insightsData.rawData as unknown as Activity[];
    
    // 1. Filter
    const filtered = rawActivities.filter(act => {
      // Type filter
      if (activityType !== 'ALL' && act.type !== activityType) return false;
      
      // Category filter
      if (selectedCategoryIds.length > 0) {
        if (!act.categories || act.categories.length === 0) {
          // If unclassified is selected? For now, if category filter is active, exclude unclassified unless we handle it explicitly.
          return false;
        }
        const hasMatchingCategory = act.categories.some(cat => selectedCategoryIds.includes(cat.id));
        if (!hasMatchingCategory) return false;
      }
      return true;
    });

    // 2. Aggregate
    let totalMinutes = 0;
    const breakdown: Record<string, { minutes: number, count: number, name: string, hex_color: string }> = {};
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const weeklyData: { day: string, value: number, activities: Activity[] }[] = days.map(day => ({ day, value: 0, activities: [] }));

    filtered.forEach(act => {
      const start = new Date(act.start_time);
      const end = new Date(act.end_time);
      const durationMins = (end.getTime() - start.getTime()) / 60000;
      
      totalMinutes += durationMins;

      // Weekly Data mapping
      const dayOfWeek = start.getDay();
      const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      if (adjustedDayIndex >= 0 && adjustedDayIndex <= 6) {
        weeklyData[adjustedDayIndex].value += Number((durationMins / 60).toFixed(1));
        weeklyData[adjustedDayIndex].activities.push(act);
      }

      // Breakdown mapping
      if (act.categories && act.categories.length > 0) {
        const cat = act.categories[0];
        if (!breakdown[cat.id]) breakdown[cat.id] = { minutes: 0, count: 0, name: cat.name, hex_color: cat.hex_color };
        breakdown[cat.id].minutes += durationMins;
        breakdown[cat.id].count += 1;
      } else {
        if (!breakdown['unclassified']) breakdown['unclassified'] = { minutes: 0, count: 0, name: '미분류', hex_color: '#9CA3AF' };
        breakdown['unclassified'].minutes += durationMins;
        breakdown['unclassified'].count += 1;
      }
    });

    // Fix floating point issues for weeklyData
    weeklyData.forEach(d => {
      d.value = Number(d.value.toFixed(1));
    });

    return {
      summary: {
        totalHours: Number((totalMinutes / 60).toFixed(1)),
        totalCount: filtered.length
      },
      breakdown,
      weeklyData
    };
  }, [insightsData?.rawData, activityType, selectedCategoryIds]);

  const prevProcessedData = useMemo(() => {
    if (!prevInsightsData?.rawData) return null;
    const rawActivities = prevInsightsData.rawData as Activity[];
    
    const filtered = rawActivities.filter(act => {
      if (activityType !== 'ALL' && act.type !== activityType) return false;
      if (selectedCategoryIds.length > 0) {
        if (!act.categories || act.categories.length === 0) return false;
        const hasMatchingCategory = act.categories.some(cat => selectedCategoryIds.includes(cat.id));
        if (!hasMatchingCategory) return false;
      }
      return true;
    });

    let totalMinutes = 0;
    filtered.forEach(act => {
      const start = new Date(act.start_time);
      const end = new Date(act.end_time);
      totalMinutes += (end.getTime() - start.getTime()) / 60000;
    });

    return {
      totalHours: Number((totalMinutes / 60).toFixed(1)),
      totalCount: filtered.length
    };
  }, [prevInsightsData?.rawData, activityType, selectedCategoryIds]);


  // Find top category for ambient theming
  const topCategoryColor = useMemo(() => {
    if (!processedData.breakdown) return null;
    let topColor: string | null = null;
    let maxMins = -1;
    Object.values(processedData.breakdown).forEach(item => {
      if (item.minutes > maxMins) {
        maxMins = item.minutes;
        topColor = item.hex_color;
      }
    });
    return topColor;
  }, [processedData.breakdown]);

  return (
    <div className="mt-2 pb-10 relative min-h-screen">
      {/* Ambient Glow Background */}
      {topCategoryColor && (
        <div 
          className="absolute top-[-100px] left-0 w-full h-[600px] pointer-events-none transition-all duration-1000 ease-in-out"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${topCategoryColor}20 0%, transparent 70%)`,
            zIndex: 0
          }}
        />
      )}
      
      <div className="relative z-10">
        <DashboardFilterBar
          period={period}
          setPeriod={setPeriod}
          dateRange={customDateRange}
          setDateRange={(range) => {
            setCustomDateRange(range);
            if (period !== 'custom') setPeriod('custom');
          }}
        activityType={activityType}
        setActivityType={setActivityType}
        selectedCategoryIds={selectedCategoryIds}
        setSelectedCategoryIds={setSelectedCategoryIds}
        categories={categories}
      />

      {isLoadingInsights ? (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="flex gap-4">
            <div className="h-[120px] bg-gray-100 rounded-3xl flex-1"></div>
            <div className="h-[120px] bg-gray-100 rounded-3xl w-32"></div>
          </div>
          <div className="h-[280px] bg-gray-100 rounded-3xl w-full"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-[160px] bg-gray-100 rounded-3xl"></div>
            <div className="h-[160px] bg-gray-100 rounded-3xl"></div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="col-span-1 lg:col-span-8">
              <SmartInsightComment 
                activities={insightsData?.rawData as any || []} 
                prevActivities={prevInsightsData?.rawData as any || []}
              />
            </div>
            <div className="col-span-1 lg:col-span-4">
              <AnnualGoalWidget />
            </div>
            
            <div className="col-span-1 lg:col-span-7">
              <WeeklySummaryCard 
                totalHours={processedData.summary.totalHours} 
                totalCount={processedData.summary.totalCount} 
                prevTotalHours={prevProcessedData?.totalHours}
                prevTotalCount={prevProcessedData?.totalCount}
                chartData={processedData.weeklyData} 
                period={period} 
              />
            </div>
            <div className="col-span-1 lg:col-span-5">
              <ActivityBreakdownGrid 
                breakdown={processedData.breakdown} 
                onSelectSubject={(id) => setSelectedSubjectId(id)} 
              />
            </div>

            <div className="col-span-1 lg:col-span-6">
              <ActivityHeatmap activities={insightsData?.rawData as any || []} />
            </div>
            <div className="col-span-1 lg:col-span-6">
              <ActivityPunchCard activities={insightsData?.rawData as any || []} />
            </div>
          </div>
        </>
      )}

      <QuickAddCarousel templates={templates} />

      <SubjectDetailSheet 
        subjectId={selectedSubjectId} 
        onClose={() => setSelectedSubjectId(null)}
        startDate={startDateIso}
        endDate={endDateIso}
        breakdownInfo={selectedSubjectId && processedData.breakdown[selectedSubjectId] ? processedData.breakdown[selectedSubjectId] : null}
      />
      </div>
    </div>
  );
}
