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
  type: 'DAYS_COUNT' | 'D_DAY' | 'RECURRENCE';
  interval?: number;
  unit?: 'YEAR' | 'MONTH' | 'WEEK' | 'DAY';
  options?: {
    avoid_weekends?: boolean;
    milestones?: number[];
    show_in_calendar?: boolean;
    show_100_days?: boolean;
    show_years?: boolean;
    show_d_day_only?: boolean;
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
    // 매년 1주년, 2주년 등도 계산 (range 내)
    if (rule.options?.show_years !== false) {
      for (let y = rangeStart.getFullYear() - 1; y <= rangeEnd.getFullYear() + 1; y++) {
        const anniversaryYearDate = new Date(baseDate.getFullYear() + (y - baseDate.getFullYear()), baseDate.getMonth(), baseDate.getDate());
        if (anniversaryYearDate >= rangeStart && anniversaryYearDate <= rangeEnd) {
          const diffYears = y - baseDate.getFullYear();
          if (diffYears > 0) {
            events.push(createEvent(anniversaryYearDate, `${diffYears}주년`));
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
          events.push(createEvent(milestoneDate, `${m}일`));
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
    if (rule.unit === 'MONTH') {
      // 매월 반복 (예: 월급날)
      // rangeStart보다 2개월 전부터 시작하여 avoid_weekends로 당겨진 날짜도 놓치지 않도록 함
      const loopStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 2, 1);
      const loopEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() + 2, 0);
      
      let cursor = new Date(loopStart);
      
      while (cursor <= loopEnd) {
        const targetDay = baseDate.getDate();
        // 해당 월의 마지막 날을 넘지 않도록 보정 (예: 31일인데 2월인 경우)
        const lastDayOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const safeDay = Math.min(targetDay, lastDayOfMonth);
        const monthDate = new Date(cursor.getFullYear(), cursor.getMonth(), safeDay);
        
        let finalDate = monthDate;
        if (rule.options?.avoid_weekends) {
          finalDate = avoidWeekends(finalDate);
        }

        if (finalDate >= rangeStart && finalDate <= rangeEnd) {
          events.push(createEvent(finalDate, ''));
        }
        
        cursor = addMonths(cursor, rule.interval || 1);
      }
    } else if (rule.unit === 'YEAR') {
      // 매년 반복 (예: 생일, 결혼기념일, 제사)
      for (let y = rangeStart.getFullYear() - 1; y <= rangeEnd.getFullYear() + 1; y++) {
        let finalDate: Date;
        
        if (anniversary.is_lunar) {
          finalDate = getSolarDateFromLunar(anniversary.base_date, y);
        } else {
          finalDate = new Date(y, baseDate.getMonth(), baseDate.getDate());
        }

        if (finalDate >= rangeStart && finalDate <= rangeEnd) {
          const diffYears = y - baseDate.getFullYear();
          const suffix = diffYears > 0 && anniversary.preset_type !== 'LUNAR_BIRTHDAY' && anniversary.preset_type !== 'BIRTHDAY' ? `${diffYears}주년` : '';
          events.push(createEvent(finalDate, suffix));
        }
      }
    }
  }

  return events;
}
