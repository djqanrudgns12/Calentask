"use client";

import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check, ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Category } from '@/app/actions/calendar';
import { DateRange } from 'react-day-picker';

export type ActivityTypeFilter = 'ALL' | 'TASK' | 'EVENT';

interface DashboardFilterBarProps {
  period: 'week' | 'month' | 'year' | 'custom';
  setPeriod: (period: 'week' | 'month' | 'year' | 'custom') => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  activityType: ActivityTypeFilter;
  setActivityType: (type: ActivityTypeFilter) => void;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
  categories: Category[];
}

export default function DashboardFilterBar({
  period,
  setPeriod,
  dateRange,
  setDateRange,
  activityType,
  setActivityType,
  selectedCategoryIds,
  setSelectedCategoryIds,
  categories
}: DashboardFilterBarProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
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
              "px-5 py-2.5 rounded-[14px] text-[14px] font-bold transition-all whitespace-nowrap flex-1",
              period === tab.id 
                ? "bg-gray-900 text-white shadow-md" 
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            {tab.label}
          </button>
        ))}

        {/* Custom Date Range Picker */}
        <div className="relative flex-1" ref={calendarRef}>
          <button
            onClick={() => {
              setPeriod('custom');
              setIsCalendarOpen(!isCalendarOpen);
            }}
            className={cn(
              "flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] text-[14px] font-bold transition-all whitespace-nowrap w-full",
              period === 'custom'
                ? "bg-gray-900 text-white shadow-md"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <CalendarIcon size={16} />
            {period === 'custom' && dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "M/d")} - {format(dateRange.to, "M/d")}
                </>
              ) : (
                format(dateRange.from, "M월 d일")
              )
            ) : (
              "직접 설정"
            )}
          </button>
          {isCalendarOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 animate-in fade-in-0 zoom-in-95">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                locale={ko}
              />
            </div>
          )}
        </div>
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
