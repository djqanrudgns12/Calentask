"use client";

import { useInsightsFilterStore, type InsightsTab } from '@/store/useInsightsFilterStore';
import dynamic from 'next/dynamic';
import { LayoutDashboard, Clock, CheckSquare, Puzzle } from 'lucide-react';
import { startTransition } from 'react';

const OverviewTab = dynamic(() => import('@/components/insights/OverviewTab'), { ssr: false });
const TimeAnalysisTab = dynamic(() => import('@/components/insights/TimeAnalysisTab'), { ssr: false });
const ExecutionTab = dynamic(() => import('@/components/insights/ExecutionTab'), { ssr: false });
const TemplateCenterTab = dynamic(() => import('@/components/insights/TemplateCenterTab'), { ssr: false });

const TABS: { id: InsightsTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: '종합 현황', icon: LayoutDashboard },
  { id: 'time', label: '시간 분석', icon: Clock },
  { id: 'execution', label: '실행력', icon: CheckSquare },
  { id: 'templates', label: '템플릿 센터', icon: Puzzle },
];

export default function InsightsClient() {
  const activeTab = useInsightsFilterStore(state => state.activeTab);
  const setActiveTab = useInsightsFilterStore(state => state.setActiveTab);

  return (
    <div className="mt-2 pb-24 md:pb-10 relative min-h-screen">
      <div className="relative z-10">
        {/* ── 탭 네비게이션 ── */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-gray-200/80 shadow-sm mb-6 overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => startTransition(() => setActiveTab(tab.id))}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-gray-300' : 'text-gray-400'} />
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

        {/* ── 템플릿 센터 탭 ── */}
        {activeTab === 'templates' && <TemplateCenterTab />}
      </div>
    </div>
  );
}
