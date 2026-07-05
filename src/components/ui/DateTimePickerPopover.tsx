'use client'

import React, { useState, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  isSameMonth, isSameDay, setHours, setMinutes, getHours, getMinutes, addDays, 
  nextFriday, endOfDay, isBefore, startOfDay
} from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Clock, Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarStore } from '@/store/useCalendarStore';

interface DateTimePickerPopoverProps {
  date: Date | null;
  setDate: (date: Date | null) => void;
  children: React.ReactNode;
  align?: "center" | "end" | "start";
}

export function DateTimePickerPopover({ date, setDate, children, align = "center" }: DateTimePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  
  // Internal state while popover is open
  const [currentMonth, setCurrentMonth] = useState(date || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(date);
  
  // Time states
  const [hour, setHour] = useState(date ? (getHours(date) % 12 || 12).toString() : '12');
  const [minute, setMinute] = useState(date ? getMinutes(date).toString().padStart(2, '0') : '00');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(date ? (getHours(date) >= 12 ? 'PM' : 'AM') : 'PM');

  useEffect(() => {
    if (open) {
      const initDate = date || new Date();
      setCurrentMonth(initDate);
      setSelectedDate(date);
      setHour((getHours(initDate) % 12 || 12).toString());
      setMinute(getMinutes(initDate).toString().padStart(2, '0'));
      setAmpm(getHours(initDate) >= 12 ? 'PM' : 'AM');
    }
  }, [open, date]);

  const weekStartsOn = useCalendarStore(s => s.weekStartsOn);
  const showSaturdayBlue = useCalendarStore(s => s.showSaturdayBlue);

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });
  
  const dateFormat = "yyyy년 M월";
  
  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  const handleApply = () => {
    if (!selectedDate) {
      setDate(null);
      setOpen(false);
      return;
    }
    
    let h = parseInt(hour, 10);
    if (isNaN(h)) h = 12;
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    
    let m = parseInt(minute, 10);
    if (isNaN(m)) m = 0;

    let finalDate = setHours(selectedDate, h);
    finalDate = setMinutes(finalDate, m);
    
    setDate(finalDate);
    setOpen(false);
  };

  const applyPreset = (presetFn: () => Date) => {
    const d = presetFn();
    setSelectedDate(d);
    setCurrentMonth(d);
    setHour((getHours(d) % 12 || 12).toString());
    setMinute(getMinutes(d).toString().padStart(2, '0'));
    setAmpm(getHours(d) >= 12 ? 'PM' : 'AM');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="outline-none">
        {children}
      </PopoverTrigger>
      
      <PopoverContent className="z-50 w-[340px] p-0 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-border overflow-hidden bg-card/95 backdrop-blur-3xl" align={align} sideOffset={12}>
        <div className="flex flex-col">
          {/* Presets Header */}
          <div className="bg-muted/80 p-3 border-b border-border flex flex-col gap-2">
            <div className="flex items-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" /> 빠른 선택
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => applyPreset(() => setHours(setMinutes(new Date(), 0), 18))} className="px-2.5 py-1.5 rounded-md bg-card text-[11px] font-bold text-foreground border border-border hover:border-indigo-300 hover:text-indigo-600 shadow-sm transition-colors">
                오늘 퇴근 (18:00)
              </button>
              <button onClick={() => applyPreset(() => setHours(setMinutes(addDays(new Date(), 1), 0), 9))} className="px-2.5 py-1.5 rounded-md bg-card text-[11px] font-bold text-foreground border border-border hover:border-indigo-300 hover:text-indigo-600 shadow-sm transition-colors">
                내일 출근 (09:00)
              </button>
              <button onClick={() => applyPreset(() => setHours(setMinutes(nextFriday(new Date()), 0), 18))} className="px-2.5 py-1.5 rounded-md bg-card text-[11px] font-bold text-foreground border border-border hover:border-indigo-300 hover:text-indigo-600 shadow-sm transition-colors">
                이번 주 금요일
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="font-extrabold text-foreground text-sm">
                {format(currentMonth, dateFormat)}
              </h3>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {(weekStartsOn === 1 ? ['월', '화', '수', '목', '금', '토', '일'] : ['일', '월', '화', '수', '목', '금', '토']).map(d => (
                <div key={d} className={`text-[10px] font-bold mb-2 ${
                  d === '일' ? 'text-red-500' : (d === '토' && showSaturdayBlue) ? 'text-blue-500' : 'text-muted-foreground'
                }`}>{d}</div>
              ))}
              {days.map((d, i) => {
                const isSelected = selectedDate && isSameDay(d, selectedDate);
                const isCurrentMonth = isSameMonth(d, currentMonth);
                const isToday = isSameDay(d, new Date());
                const isPast = isBefore(d, startOfDay(new Date()));
                
                return (
                  <button
                    key={i}
                    onClick={() => handleDayClick(d)}
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold mx-auto transition-all",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isCurrentMonth && !isSelected && !isPast && "text-foreground hover:bg-muted",
                      isCurrentMonth && isPast && !isSelected && "text-muted-foreground hover:bg-muted",
                      isSelected && "bg-indigo-600 text-white shadow-md font-bold scale-110",
                      isToday && !isSelected && "ring-2 ring-indigo-500/30 text-indigo-600"
                    )}
                  >
                    {format(d, 'd')}
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-muted my-4" />

            {/* Time Picker */}
            <div className="flex items-center justify-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1.5 border border-border focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <input 
                  type="text" 
                  value={hour} 
                  onChange={(e) => setHour(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                  className="w-8 text-center bg-transparent outline-none text-sm font-bold text-foreground" 
                  placeholder="12"
                />
                <span className="text-muted-foreground font-bold">:</span>
                <input 
                  type="text" 
                  value={minute} 
                  onChange={(e) => setMinute(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                  className="w-8 text-center bg-transparent outline-none text-sm font-bold text-foreground"
                  placeholder="00" 
                />
              </div>
              <div className="flex bg-muted rounded-lg p-0.5 border border-border">
                <button 
                  onClick={() => setAmpm('AM')} 
                  className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", ampm === 'AM' ? "bg-card text-indigo-700 shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  오전
                </button>
                <button 
                  onClick={() => setAmpm('PM')} 
                  className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", ampm === 'PM' ? "bg-card text-indigo-700 shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  오후
                </button>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 mt-5">
              <button 
                onClick={() => { setDate(null); setOpen(false); }} 
                className="flex-1 py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground text-sm font-bold transition-colors"
              >
                초기화
              </button>
              <button 
                onClick={handleApply} 
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> 설정 완료
              </button>
            </div>

          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
