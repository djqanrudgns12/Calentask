"use client";

import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check, ChevronDown, Filter, RotateCcw, Crosshair, CalendarRange } from 'lucide-react';
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

  const [calendarMode, setCalendarMode] = useState<'none' | 'single' | 'custom'>('none');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const singleCalendarRef = useRef<HTMLDivElement>(null);
  const customCalendarRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarMode === 'single' && singleCalendarRef.current && !singleCalendarRef.current.contains(e.target as Node)) {
        setCalendarMode('none');
      }
      if (calendarMode === 'custom' && customCalendarRef.current && !customCalendarRef.current.contains(e.target as Node)) {
        setCalendarMode('none');
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calendarMode]);

  const toggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(catId => catId !== id));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  };

  const handleSingleClick = () => {
    setPeriod('single');
    setCalendarMode(calendarMode === 'single' ? 'none' : 'single');
  };

  const handleCustomClick = () => {
    setPeriod('custom');
    setCalendarMode(calendarMode === 'custom' ? 'none' : 'custom');
  };

  const isCustomActive = period === 'single' || period === 'custom';

  return (
    <div className="flex flex-col gap-3 mb-8">
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* ── Row 1: Unified Date Filter Bar ── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Preset period chips */}
        <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-200/80 shadow-sm">
          {([
            { id: 'week', label: '이번 주' },
            { id: 'month', label: '이번 달' },
            { id: 'year', label: '올해' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setPeriod(tab.id);
                setCalendarMode('none');
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap",
                period === tab.id
                  ? "bg-gray-900 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-gray-200/80 mx-0.5 hidden sm:block" />

        {/* 특정 일자 */}
        <div className="relative" ref={singleCalendarRef}>
          <button
            onClick={handleSingleClick}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap border",
              period === 'single'
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                : "bg-white text-gray-500 border-gray-200/80 shadow-sm hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30"
            )}
          >
            <Crosshair size={14} className={period === 'single' ? "text-indigo-200" : ""} />
            {period === 'single' && singleDate
              ? format(singleDate, "M월 d일 (하루)")
              : "특정 일자"}
          </button>

          {calendarMode === 'single' && (
            <div
              className="absolute top-full left-0 mt-2 z-[100] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 min-w-[300px]"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Crosshair size={12} />
                특정 일자 선택
              </div>
              <Calendar
                mode="single"
                defaultMonth={singleDate}
                selected={singleDate}
                onSelect={(date) => {
                  if (date) {
                    setSingleDate(date);
                    setCalendarMode('none');
                  }
                }}
                locale={ko}
              />
              {singleDate && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                  <span className="text-[13px] font-bold text-gray-700">
                    📌 {format(singleDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 기간 설정 */}
        <div className="relative" ref={customCalendarRef}>
          <button
            onClick={handleCustomClick}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap border",
              period === 'custom'
                ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20"
                : "bg-white text-gray-500 border-gray-200/80 shadow-sm hover:border-gray-400 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <CalendarRange size={14} className={period === 'custom' ? "text-gray-400" : ""} />
            {period === 'custom' && customDateRange?.from ? (
              customDateRange.to && customDateRange.from.getTime() !== customDateRange.to.getTime() ? (
                <>{format(customDateRange.from, "M/d")} — {format(customDateRange.to, "M/d")}</>
              ) : (
                format(customDateRange.from, "M/d (하루)")
              )
            ) : (
              "기간 설정"
            )}
          </button>

          {calendarMode === 'custom' && (
            <div
              className="absolute top-full left-0 mt-2 z-[100] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 min-w-[300px]"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <CalendarRange size={12} />
                기간 범위 선택
              </div>
              <Calendar
                mode="range"
                defaultMonth={customDateRange?.from}
                selected={customDateRange}
                onSelect={setCustomDateRange}
                numberOfMonths={1}
                locale={ko}
              />
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                <div className="text-[13px] text-center font-bold text-gray-600">
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      customDateRange.from.getTime() === customDateRange.to.getTime()
                        ? `${format(customDateRange.from, "yyyy년 M월 d일")} (하루)`
                        : `${format(customDateRange.from, "M월 d일")} → ${format(customDateRange.to, "M월 d일")}`
                    ) : (
                      `${format(customDateRange.from, "yyyy년 M월 d일")} (시작일 선택됨)`
                    )
                  ) : (
                    <span className="text-gray-400">시작일과 종료일을 선택하세요</span>
                  )}
                </div>
                <button
                  onClick={() => setCalendarMode('none')}
                  disabled={!customDateRange?.from}
                  className={cn(
                    "w-full py-2.5 rounded-xl text-[13px] font-bold transition-all",
                    customDateRange?.from
                      ? "bg-gray-900 text-white hover:bg-gray-800 shadow-md"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  적용하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reset */}
        {isCustomActive && (
          <button
            onClick={() => {
              resetFilter();
              setCalendarMode('none');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
            title="필터 초기화"
          >
            <RotateCcw size={13} />
            초기화
          </button>
        )}
      </div>

      {/* ── Row 2: Advanced Filters (Type & Category) ── */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scroll pb-0.5">
        {/* Type Filter */}
        <div className="flex items-center bg-white rounded-full border border-gray-200/80 shadow-sm p-0.5 shrink-0">
          {(['ALL', 'TASK', 'EVENT'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setActivityType(type)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
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
            className="flex items-center gap-2 rounded-full border border-gray-200/80 text-gray-600 shadow-sm h-[32px] px-3.5 shrink-0 text-xs font-bold bg-white hover:bg-gray-50 transition-colors"
          >
            <Filter size={13} />
            {selectedCategoryIds.length === 0
              ? '모든 카테고리'
              : `${selectedCategoryIds.length}개 선택됨`}
            <ChevronDown size={13} className="ml-0.5 opacity-50" />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-2 z-[100] bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-[240px]">
              <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
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
