"use client";

import { useInsightsFilterStore, type InsightsTab } from '@/store/useInsightsFilterStore';
import dynamic from 'next/dynamic';
import { LayoutDashboard, Clock, CheckSquare } from 'lucide-react';
import { startTransition } from 'react';
import { CalentaskViewLoading } from '@/components/loading/CalentaskLoadingScreen';

const loading = () => <CalentaskViewLoading />;
const OverviewTab = dynamic(() => import('@/components/insights/OverviewTab'), { ssr: false, loading });
const TimeAnalysisTab = dynamic(() => import('@/components/insights/TimeAnalysisTab'), { ssr: false, loading });
const ExecutionTab = dynamic(() => import('@/components/insights/ExecutionTab'), { ssr: false, loading });

const warmTab = (tab: InsightsTab) => {
  const load = tab === 'overview' ? import('@/components/insights/OverviewTab')
    : tab === 'time' ? import('@/components/insights/TimeAnalysisTab') : import('@/components/insights/ExecutionTab');
  void load.catch(() => {});
};

const TABS: { id: InsightsTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: '종합 현황', icon: LayoutDashboard },
  { id: 'time', label: '시간 분석', icon: Clock },
  { id: 'execution', label: '실행력', icon: CheckSquare },
];

export default function InsightsClient() {
  const activeTab = useInsightsFilterStore(state => state.activeTab);
  const setActiveTab = useInsightsFilterStore(state => state.setActiveTab);

  return (
    <div className="mt-2 pb-24 md:pb-10 relative min-h-screen">
      <div className="relative z-10">
        {/* ── 탭 네비게이션 ── */}
        <div className="flex items-center gap-1 bg-card p-1 rounded-2xl border border-border/80 shadow-sm mb-6 overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onMouseEnter={() => warmTab(tab.id)}
                onFocus={() => warmTab(tab.id)}
                onClick={() => { warmTab(tab.id); startTransition(() => setActiveTab(tab.id)); }}
                className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3.5 py-2 md:py-2.5 rounded-xl text-[11px] md:text-[13px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {/* 모바일: 13px, 데스크톱: 15px — 4개 탭이 좁은 화면에도 잘림 없이 수용되도록 축소 */}
                <Icon size={15} className={`w-[13px] h-[13px] md:w-[15px] md:h-[15px] shrink-0 ${isActive ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── 종합 현황 탭 ── */}
        {activeTab === 'overview' && <OverviewTab />}

        {/* ── 시간 분석 탭 ── */}
        {activeTab === 'time' && <TimeAnalysisTab />}

        {/* ── 실행력 탭 ── */}
        {activeTab === 'execution' && <ExecutionTab />}
      </div>
    </div>
  );
}
