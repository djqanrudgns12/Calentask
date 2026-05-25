"use client";

import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Category } from '@/app/actions/calendar';
import { DateRange } from 'react-day-picker';
import { useInsightsFilterStore } from '@/store/useInsightsFilterStore';

export type ActivityTypeFilter = 'ALL' | 'TASK' | 'EVENT';

interface DashboardFilterBarProps {
  categories: Category[];
}

export default function DashboardFilterBar({ categories }: DashboardFilterBarProps) {
  const {
    period,
    setPeriod,
    customDateRange,
    setCustomDateRange,
    singleDate,
    setSingleDate,
    activityType,
    setActivityType,
    selectedCategoryIds,
    setSelectedCategoryIds,
    resetFilter
  } = useInsightsFilterStore();

  const [isSingleCalendarOpen, setIsSingleCalendarOpen] = useState(false);
  const [isCustomCalendarOpen, setIsCustomCalendarOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const singleCalendarRef = useRef<HTMLDivElement>(null);
  const customCalendarRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (singleCalendarRef.current && !singleCalendarRef.current.contains(e.target as Node)) {
        setIsSingleCalendarOpen(false);
      }
      if (customCalendarRef.current && !customCalendarRef.current.contains(e.target as Node)) {
        setIsCustomCalendarOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(catId => catId !== id));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Date Presets */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-[20px] border border-gray-200 shadow-sm overflow-x-auto hide-scroll">
        {([
          { id: 'week', label: '이번 주' },
          { id: 'month', label: '이번 달' },
          { id: 'year', label: '올해' }
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPeriod(tab.id)}
            className={cn(
              "px-5 py-2.5 rounded-[14px] text-[14px] font-bold transition-all whitespace-nowrap",
              period === tab.id 
                ? "bg-gray-900 text-white shadow-md" 
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            {tab.label}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        {/* Single Date Picker */}
        <div className="relative" ref={singleCalendarRef}>
          <button
            onClick={() => {
              setPeriod('single');
              setIsSingleCalendarOpen(!isSingleCalendarOpen);
              setIsCustomCalendarOpen(false);
            }}
            className={cn(
              "flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] text-[14px] font-bold transition-all whitespace-nowrap",
              period === 'single'
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <CalendarIcon size={16} />
            {period === 'single' && singleDate ? format(singleDate, "M/d (하루)") : "특정 일자"}
          </button>
          {isSingleCalendarOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 animate-in fade-in-0 zoom-in-95 min-w-[280px]">
              <Calendar
                mode="single"
                defaultMonth={singleDate}
                selected={singleDate}
                onSelect={(date) => {
                  if (date) setSingleDate(date);
                  setIsSingleCalendarOpen(false);
                }}
                locale={ko}
              />
            </div>
          )}
        </div>

        {/* Custom Date Range Picker */}
        <div className="relative" ref={customCalendarRef}>
          <button
            onClick={() => {
              setPeriod('custom');
              setIsCustomCalendarOpen(!isCustomCalendarOpen);
              setIsSingleCalendarOpen(false);
            }}
            className={cn(
              "flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] text-[14px] font-bold transition-all whitespace-nowrap",
              period === 'custom'
                ? "bg-gray-900 text-white shadow-md"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <CalendarIcon size={16} />
            {period === 'custom' && customDateRange?.from ? (
              customDateRange.to ? (
                customDateRange.from.getTime() === customDateRange.to.getTime() ? (
                  format(customDateRange.from, "M/d (하루)")
                ) : (
                  <>
                    {format(customDateRange.from, "M/d")} - {format(customDateRange.to, "M/d")}
                  </>
                )
              ) : (
                format(customDateRange.from, "M/d (하루)")
              )
            ) : (
              "기간 설정"
            )}
          </button>
          {isCustomCalendarOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 animate-in fade-in-0 zoom-in-95 min-w-[280px]">
              <Calendar
                mode="range"
                defaultMonth={customDateRange?.from}
                selected={customDateRange}
                onSelect={setCustomDateRange}
                numberOfMonths={1}
                locale={ko}
              />
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                <div className="text-[13px] text-center font-semibold text-gray-600">
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      customDateRange.from.getTime() === customDateRange.to.getTime()
                        ? `${format(customDateRange.from, "yyyy년 M월 d일")} (하루)`
                        : `${format(customDateRange.from, "M월 d일")} - ${format(customDateRange.to, "M월 d일")}`
                    ) : (
                      `${format(customDateRange.from, "yyyy년 M월 d일")} (하루)`
                    )
                  ) : (
                    "조회할 날짜를 선택하세요"
                  )}
                </div>
                <button
                  onClick={() => setIsCustomCalendarOpen(false)}
                  className="w-full py-2 bg-gray-900 text-white rounded-xl text-[13px] font-bold hover:bg-gray-800 transition-colors"
                >
                  적용하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reset Filter Button */}
        <button
          onClick={resetFilter}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[14px] text-[14px] font-bold text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all ml-auto shrink-0"
          title="필터 초기화"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Advanced Filters (Type & Category) */}
      <div className="flex items-center gap-3 overflow-x-auto hide-scroll pb-1">
        {/* Type Filter */}
        <div className="flex items-center bg-white rounded-full border border-gray-200 shadow-sm p-1 shrink-0">
          {(['ALL', 'TASK', 'EVENT'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setActivityType(type)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                activityType === type 
                  ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100" 
                  : "text-gray-500 hover:text-gray-900"
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
            className="flex items-center gap-2 rounded-full border border-gray-200 text-gray-600 shadow-sm h-[34px] px-4 shrink-0 text-xs font-bold bg-white hover:bg-gray-50 transition-colors"
          >
            <Filter size={14} />
            {selectedCategoryIds.length === 0 
              ? '모든 카테고리' 
              : `${selectedCategoryIds.length}개 선택됨`}
            <ChevronDown size={14} className="ml-1 opacity-50" />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 w-[240px] animate-in fade-in-0 zoom-in-95">
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                <button
                  onClick={() => setSelectedCategoryIds([])}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    selectedCategoryIds.length === 0 ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-600"
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
                        isSelected ? "bg-blue-50/50 text-blue-900" : "hover:bg-gray-50 text-gray-600"
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
