"use client";

import React, { useState, useRef, useEffect, startTransition } from 'react';
import { Check, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category } from '@/app/actions/calendar';
import { useInsightsFilterStore } from '@/store/useInsightsFilterStore';

export type ActivityTypeFilter = 'ALL' | 'TASK' | 'EVENT';

interface DashboardFilterBarProps {
  categories: Category[];
}

export default function DashboardFilterBar({ categories }: DashboardFilterBarProps) {
  const activityType = useInsightsFilterStore(state => state.activityType);
  const setActivityType = useInsightsFilterStore(state => state.setActivityType);
  const selectedCategoryIds = useInsightsFilterStore(state => state.selectedCategoryIds);
  const setSelectedCategoryIds = useInsightsFilterStore(state => state.setSelectedCategoryIds);
  const resetFilter = useInsightsFilterStore(state => state.resetFilter);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategory = (id: string) => {
    startTransition(() => {
      if (selectedCategoryIds.includes(id)) {
        setSelectedCategoryIds(selectedCategoryIds.filter(catId => catId !== id));
      } else {
        setSelectedCategoryIds([...selectedCategoryIds, id]);
      }
    });
  };

  return (
    <div className="flex flex-row md:flex-col gap-2 md:gap-4 w-full overflow-x-auto md:overflow-visible hide-scrollbar pb-1 md:pb-0 overscroll-x-contain touch-pan-x">

      {/* ── Advanced Filters (Type & Category) ── */}
      <div className="flex items-center gap-2 shrink-0 md:shrink overflow-visible">
        {/* Type Filter */}
        <div className="flex items-center bg-card rounded-full border border-border/80 shadow-sm p-0.5 shrink-0">
          {(['ALL', 'TASK', 'EVENT'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                startTransition(() => {
                  setActivityType(type);
                });
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
                activityType === type
                  ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {type === 'ALL' ? '전체 보기' : type === 'TASK' ? '할 일' : '일정'}
            </button>
          ))}
        </div>

        {/* Category Multi-select */}
        <div className="relative" ref={categoryRef}>
          <button
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="flex items-center gap-2 rounded-full border border-border/80 text-foreground shadow-sm h-[32px] px-3.5 shrink-0 text-xs font-bold bg-card hover:bg-muted transition-colors whitespace-nowrap"
          >
            <Filter size={13} />
            {selectedCategoryIds.length === 0
              ? '모든 카테고리'
              : `${selectedCategoryIds.length}개 선택됨`}
            <ChevronDown size={13} className="ml-0.5 opacity-50" />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-2 z-[100] bg-card rounded-2xl shadow-2xl border border-border p-2 w-[240px]">
              <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                <button
                  onClick={() => {
                    startTransition(() => {
                      setSelectedCategoryIds([]);
                    });
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    selectedCategoryIds.length === 0 ? "bg-muted text-foreground" : "hover:bg-muted text-foreground"
                  )}
                >
                  모든 카테고리
                  {selectedCategoryIds.length === 0 && <Check size={16} />}
                </button>
                {categories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isSelected ? "bg-blue-50/50 text-blue-900" : "hover:bg-muted text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: cat.hex_color }} />
                        {cat.name}
                      </div>
                      {isSelected && <Check size={16} className="text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
