import { addDays, addMonths, addYears, differenceInDays, format, getDay, isAfter, isBefore, isSameDay, subDays, startOfDay, isWeekend } from 'date-fns';
import { Lunar, Solar } from 'lunar-javascript';
export type AnniversaryPresetType = 'COUPLE' | 'BIRTHDAY' | 'LUNAR_BIRTHDAY' | 'EXAM' | 'PAYDAY' | 'CUSTOM';

export const PRESET_THEMES: Record<AnniversaryPresetType, string> = {
  COUPLE: '#9f1239', // Deep Velvet / Rose 800
  BIRTHDAY: '#b45309', // Champagne Gold / Amber 700
  LUNAR_BIRTHDAY: '#b45309', // Champagne Gold / Amber 700
  EXAM: '#0369a1', // Steel Blue / Sky 700
  PAYDAY: '#047857', // Emerald Forest / Emerald 700
  CUSTOM: '#4338ca', // Royal Purple / Indigo 700
};

export type CalculationRule = {
  type: 'DAYS_COUNT' | 'D_DAY' | 'RECURRENCE' | 'MONTHS_COUNT' | 'WEEKS_COUNT' | 'YEAR_MONTH_DAY';
  interval?: number;
  unit?: 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'LUNAR_YEAR';
  options?: {
    avoid_weekends?: boolean;
    milestones?: number[];
    show_in_calendar?: boolean;
    show_100_days?: boolean;
    show_years?: boolean;
    show_d_day_only?: boolean;
    show_every_month?: boolean;
    show_every_week?: boolean;
    show_in_sidebar?: boolean;
  };
};

export type Anniversary = {
  id: string;
  user_id: string;
  preset_type: AnniversaryPresetType;
  title: string;
  base_date: string;
  is_lunar: boolean;
  calculation_rule: CalculationRule;
};

export type OverlayEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  type: 'ANNIVERSARY_OVERLAY';
  hex_color: string;
  categories: { id: string; name: string; hex_color: string }[];
  memo?: string;
};

const LUNAR_MILESTONES = [100, 200, 300, 365, 500, 1000]; // Example default milestones

/**
 * 음력 날짜를 해당 연도의 양력 날짜로 변환
 */
export function getSolarDateFromLunar(lunarDateStr: string, targetYear: number): Date {
  const date = new Date(lunarDateStr);
  const lunar = Lunar.fromYmd(targetYear, date.getMonth() + 1, date.getDate());
  const solar = lunar.getSolar();
  return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
}

/**
 * 주말 회피 (이전 금요일로 당김)
 */
function avoidWeekends(date: Date): Date {
  const day = getDay(date);
  if (day === 6) return subDays(date, 1); // Saturday -> Friday
  if (day === 0) return subDays(date, 2); // Sunday -> Friday
  return date;
}

/**
 * 특정 범위 내에 해당하는 오버레이 이벤트 계산
 */
export function calculateOverlays(anniversary: Anniversary, rangeStart: Date, rangeEnd: Date): OverlayEvent[] {
  const events: OverlayEvent[] = [];
  const baseDate = startOfDay(new Date(anniversary.base_date));
  const rule = anniversary.calculation_rule;

  // 마스터 토글 확인
  if (rule.options?.show_in_calendar === false) return [];
  if (rule.type === 'YEAR_MONTH_DAY') return []; // 연월일은 달력에 표시하지 않음 (안내됨)

  const themeColor = PRESET_THEMES[anniversary.preset_type] || '#4338ca';

  const createEvent = (date: Date, suffix: string): OverlayEvent => {
    // end_time을 당일 23:59:59로 설정해야 isEventOnDay의 eventEnd > dayStart 비교를 통과함
    const endOfDayDate = new Date(date);
    endOfDayDate.setHours(23, 59, 59, 999);
    
    return {
      id: `${anniversary.id}-${format(date, 'yyyyMMdd')}-${suffix}`,
      title: `${anniversary.title} ${suffix}`.trim(),
      start_time: date.toISOString(),
      end_time: endOfDayDate.toISOString(),
      is_all_day: true,
      type: 'ANNIVERSARY_OVERLAY',
      hex_color: themeColor,
      categories: [{ id: 'sys-anniversary', name: '기념일', hex_color: themeColor }],
    };
  };

  if (rule.type === 'DAYS_COUNT') {
    // 1일부터 시작. base_date가 1일.
    // 주년 이벤트가 생성된 날짜를 추적 (일수 마일스톤과 중복 방지)
    const yearAnniversaryDates = new Set<string>();

    // 매년 1주년, 2주년 등도 계산 (range 내)
    if (rule.options?.show_years !== false) {
      for (let y = rangeStart.getFullYear() - 1; y <= rangeEnd.getFullYear() + 1; y++) {
        const anniversaryYearDate = new Date(baseDate.getFullYear() + (y - baseDate.getFullYear()), baseDate.getMonth(), baseDate.getDate());
        if (anniversaryYearDate >= rangeStart && anniversaryYearDate <= rangeEnd) {
          const diffYears = y - baseDate.getFullYear();
          if (diffYears > 0) {
            events.push(createEvent(anniversaryYearDate, `${diffYears}주년`));
            yearAnniversaryDates.add(format(anniversaryYearDate, 'yyyy-MM-dd'));
          }
        }
      }
    }

    // 일수 마일스톤 계산
    if (rule.options?.show_100_days !== false) {
      const milestones = rule.options?.milestones || LUNAR_MILESTONES;
      milestones.forEach(m => {
        const milestoneDate = addDays(baseDate, m - 1);
        if (milestoneDate >= rangeStart && milestoneDate <= rangeEnd) {
          // 같은 날짜에 이미 주년 이벤트가 있으면 일수 마일스톤은 스킵 (예: 365일 vs 1주년)
          const dateKey = format(milestoneDate, 'yyyy-MM-dd');
          if (!yearAnniversaryDates.has(dateKey)) {
            events.push(createEvent(milestoneDate, `${m}일`));
          }
        }
      });
    }

  } else if (rule.type === 'D_DAY') {
    // 0일부터 시작. base_date가 D-Day.
    // range 안에 D-day 당일이 있으면 추가
    if (baseDate >= rangeStart && baseDate <= rangeEnd) {
      events.push(createEvent(baseDate, 'D-Day'));
    }
    
    // D-10, D-30 등 주요 마일스톤
    if (rule.options?.show_d_day_only !== true) {
      const milestones = rule.options?.milestones || [10, 30, 50, 100];
      milestones.forEach(m => {
        const beforeDate = subDays(baseDate, m);
        if (beforeDate >= rangeStart && beforeDate <= rangeEnd) {
          events.push(createEvent(beforeDate, `D-${m}`));
        }
        const afterDate = addDays(baseDate, m);
        if (afterDate >= rangeStart && afterDate <= rangeEnd) {
          events.push(createEvent(afterDate, `D+${m}`));
        }
      });
    }

  } else if (rule.type === 'RECURRENCE') {
    const interval = rule.interval || 1;
    
    if (rule.unit === 'DAY' || rule.unit === 'WEEK') {
      const stepDays = rule.unit === 'WEEK' ? interval * 7 : interval;
      // 시작점 계산 (rangeStart 이전 가장 가까운 반복일 찾기)
      // 최적화를 위해 차이 계산 후 cursor를 rangeStart 근처로 점프시킵니다.
      const diffMs = rangeStart.getTime() - baseDate.getTime();
      let jumpDays = 0;
      if (diffMs > 0) {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        jumpDays = Math.floor(diffDays / stepDays) * stepDays;
      }
      
      let cursor = addDays(baseDate, jumpDays);
      if (cursor < baseDate) cursor = new Date(baseDate);

      // loop End
      const loopEnd = new Date(rangeEnd);
      
      while (cursor <= loopEnd) {
        if (cursor >= rangeStart && cursor <= rangeEnd) {
          events.push(createEvent(cursor, ''));
        }
        cursor = addDays(cursor, stepDays);
      }
    } else if (rule.unit === 'MONTH') {
      // 매월 반복
      const loopStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 2, 1);
      const loopEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() + 2, 0);
      
      let cursor = new Date(loopStart);
      
      while (cursor <= loopEnd) {
        const targetDay = baseDate.getDate();
        const lastDayOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const safeDay = Math.min(targetDay, lastDayOfMonth);
        const monthDate = new Date(cursor.getFullYear(), cursor.getMonth(), safeDay);
        
        // interval 보정 로직 (baseDate로부터 경과 개월 수가 interval의 배수인지 확인)
        const monthsDiff = (cursor.getFullYear() - baseDate.getFullYear()) * 12 + (cursor.getMonth() - baseDate.getMonth());
        
        if (monthsDiff >= 0 && monthsDiff % interval === 0) {
          let finalDate = monthDate;
          if (rule.options?.avoid_weekends) {
            finalDate = avoidWeekends(finalDate);
          }

          if (finalDate >= rangeStart && finalDate <= rangeEnd) {
            events.push(createEvent(finalDate, ''));
          }
        }
        
        cursor = addMonths(cursor, 1);
      }
    } else if (rule.unit === 'YEAR' || rule.unit === 'LUNAR_YEAR') {
      // 매년 (또는 음력) 반복
      for (let y = rangeStart.getFullYear() - 1; y <= rangeEnd.getFullYear() + 1; y++) {
        let finalDate: Date;
        
        // 음력 반복은 LUNAR_YEAR 이거나 is_lunar가 켜져있을때
        if (anniversary.is_lunar || rule.unit === 'LUNAR_YEAR') {
          finalDate = getSolarDateFromLunar(anniversary.base_date, y);
        } else {
          finalDate = new Date(y, baseDate.getMonth(), baseDate.getDate());
        }

        if (finalDate >= rangeStart && finalDate <= rangeEnd) {
          const diffYears = y - baseDate.getFullYear();
          // interval 체크 (예: 2년마다)
          if (diffYears >= 0 && diffYears % interval === 0) {
            const suffix = diffYears > 0 && anniversary.preset_type !== 'LUNAR_BIRTHDAY' && anniversary.preset_type !== 'BIRTHDAY' ? `${diffYears}주년` : '';
            events.push(createEvent(finalDate, suffix));
          }
        }
      }
    }
  } else if (rule.type === 'MONTHS_COUNT') {
    if (rule.options?.show_every_month !== false) {
      const loopStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 2, 1);
      const loopEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() + 2, 0);
      let cursor = new Date(loopStart);
      while (cursor <= loopEnd) {
        const targetDay = baseDate.getDate();
        const lastDayOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const safeDay = Math.min(targetDay, lastDayOfMonth);
        const monthDate = new Date(cursor.getFullYear(), cursor.getMonth(), safeDay);
        
        const monthsDiff = (cursor.getFullYear() - baseDate.getFullYear()) * 12 + (cursor.getMonth() - baseDate.getMonth());
        
        if (monthsDiff > 0 && monthDate >= rangeStart && monthDate <= rangeEnd) {
          events.push(createEvent(monthDate, `${monthsDiff}개월`));
        }
        cursor = addMonths(cursor, 1);
      }
    }
  } else if (rule.type === 'WEEKS_COUNT') {
    if (rule.options?.show_every_week !== false) {
      const diffMs = rangeStart.getTime() - baseDate.getTime();
      let jumpWeeks = 0;
      if (diffMs > 0) {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        jumpWeeks = Math.floor(diffDays / 7);
      }
      let cursor = addDays(baseDate, jumpWeeks * 7);
      if (cursor <= baseDate) cursor = addDays(baseDate, 7); // 1주차부터 표시

      const loopEnd = new Date(rangeEnd);
      while (cursor <= loopEnd) {
        if (cursor >= rangeStart) {
          const weeksDiff = Math.round((cursor.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
          if (weeksDiff > 0) {
             events.push(createEvent(cursor, `${weeksDiff}주차`));
          }
        }
        cursor = addDays(cursor, 7);
      }
    }
  }

  return events;
}
