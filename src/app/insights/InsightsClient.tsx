"use client";

import { useInsightsFilterStore, type InsightsTab } from '@/store/useInsightsFilterStore';
import dynamic from 'next/dynamic';
import { LayoutDashboard, Clock, CheckSquare, Puzzle } from 'lucide-react';
import { startTransition, useState, useEffect } from 'react';

const OverviewTab = dynamic(() => import('@/components/insights/OverviewTab'), { ssr: false });
const TimeAnalysisTab = dynamic(() => import('@/components/insights/TimeAnalysisTab'), { ssr: false });
const ExecutionTab = dynamic(() => import('@/components/insights/ExecutionTab'), { ssr: false });
const TemplateCenterTab = dynamic(() => import('@/components/insights/TemplateCenterTab'), { ssr: false });

const TABS: { id: InsightsTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: '종합 현황', icon: LayoutDashboard },
  { id: 'time', label: '시간 분석', icon: Clock },
  { id: 'execution', label: '실행력', icon: CheckSquare },
];

export default function InsightsClient() {
  const activeTab = useInsightsFilterStore(state => state.activeTab);
  const setActiveTab = useInsightsFilterStore(state => state.setActiveTab);

  // FEAT: 탭 유지 렌더링 (지연 마운트 + display:none 토글)
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set(['overview']));

  useEffect(() => {
    setMountedTabs(prev => new Set(prev).add(activeTab));
  }, [activeTab]);

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
                onClick={() => startTransition(() => setActiveTab(tab.id))}
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
        {mountedTabs.has('overview') && (
          <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
            <OverviewTab />
          </div>
        )}

        {/* ── 시간 분석 탭 ── */}
        {mountedTabs.has('time') && (
          <div style={{ display: activeTab === 'time' ? 'block' : 'none' }}>
            <TimeAnalysisTab />
          </div>
        )}

        {/* ── 실행력 탭 ── */}
        {mountedTabs.has('execution') && (
          <div style={{ display: activeTab === 'execution' ? 'block' : 'none' }}>
            <ExecutionTab />
          </div>
        )}
      </div>
    </div>
  );
}
