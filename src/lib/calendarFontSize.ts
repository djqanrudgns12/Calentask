export type CalendarFontSize = 'x-small' | 'small' | 'normal' | 'large' | 'x-large'

/**
 * 캘린더 폰트 크기 설정에 따른 Tailwind CSS 클래스 매핑
 * 
 * 왜 완전한 responsive 문자열을 반환하는가?
 * → Tailwind v4는 소스 파일을 정적으로 스캔하여 클래스를 감지합니다.
 *   `md:${변수}` 같은 동적 조합은 스캐너가 인식하지 못해 빌드 CSS에서 누락됩니다.
 *   따라서 'text-[9px] md:text-[13px]' 처럼 완전한 문자열을 반환하여
 *   Tailwind가 이 파일을 스캔할 때 모든 클래스를 발견할 수 있도록 합니다.
 * 
 * 크기 체계: 5단계, desktop 기준 1px 간격
 *   매우 작게(x-small) → 작게(small) → 보통(normal) → 크게(large) → 매우 크게(x-large)
 */
export function getCalendarFontClasses(size: CalendarFontSize) {
  switch (size) {
    case 'x-small':
      return {
        // 날짜 숫자 (desktop: 12px)
        dateNumber: 'text-[8px] md:text-[12px]',
        // 이벤트 제목 (desktop: 11px)
        eventTitle: 'text-[7px] md:text-[11px]',
        // 요일 헤더 (desktop: 10px)
        weekdayHeader: 'text-[7px] md:text-[10px]',
        // 공휴일 이름 — 텍스트 형태 (desktop: 10px)
        holidayName: 'text-[6px] md:text-[10px]',
        // 공휴일 태그 — 태그 카드 형태 (desktop: 11px)
        holidayTag: 'text-[7px] md:text-[11px]',
        // 기타 용어: 국경일, 기념일, 24절기 (desktop: 9px)
        otherTerms: 'text-[5px] md:text-[9px]',
        // 더보기 버튼 (desktop: 11px)
        moreButton: 'text-[7px] md:text-[11px]',
      }
    case 'small':
      return {
        // 날짜 숫자 (desktop: 13px)
        dateNumber: 'text-[9px] md:text-[13px]',
        // 이벤트 제목 (desktop: 12px = text-xs)
        eventTitle: 'text-[8px] md:text-xs',
        // 요일 헤더 (desktop: 11px)
        weekdayHeader: 'text-[8px] md:text-[11px]',
        // 공휴일 이름 (desktop: 11px)
        holidayName: 'text-[7px] md:text-[11px]',
        // 공휴일 태그 (desktop: 12px = text-xs)
        holidayTag: 'text-[8px] md:text-xs',
        // 기타 용어 (desktop: 10px)
        otherTerms: 'text-[6px] md:text-[10px]',
        // 더보기 버튼 (desktop: 12px = text-xs)
        moreButton: 'text-[8px] md:text-xs',
      }
    case 'normal':
      return {
        // 날짜 숫자 (desktop: 14px = text-sm)
        dateNumber: 'text-[10px] md:text-sm',
        // 이벤트 제목 (desktop: 13px)
        eventTitle: 'text-[9px] md:text-[13px]',
        // 요일 헤더 (desktop: 12px = text-xs)
        weekdayHeader: 'text-[9px] md:text-xs',
        // 공휴일 이름 (desktop: 12px = text-xs)
        holidayName: 'text-[8px] md:text-xs',
        // 공휴일 태그 (desktop: 13px)
        holidayTag: 'text-[9px] md:text-[13px]',
        // 기타 용어 (desktop: 11px)
        otherTerms: 'text-[7px] md:text-[11px]',
        // 더보기 버튼 (desktop: 13px)
        moreButton: 'text-[9px] md:text-[13px]',
      }
    case 'large':
      return {
        // 날짜 숫자 (desktop: 15px)
        dateNumber: 'text-[11px] md:text-[15px]',
        // 이벤트 제목 (desktop: 14px = text-sm)
        eventTitle: 'text-[10px] md:text-sm',
        // 요일 헤더 (desktop: 13px)
        weekdayHeader: 'text-[10px] md:text-[13px]',
        // 공휴일 이름 (desktop: 13px)
        holidayName: 'text-[9px] md:text-[13px]',
        // 공휴일 태그 (desktop: 14px = text-sm)
        holidayTag: 'text-[10px] md:text-sm',
        // 기타 용어 (desktop: 12px = text-xs)
        otherTerms: 'text-[8px] md:text-xs',
        // 더보기 버튼 (desktop: 14px = text-sm)
        moreButton: 'text-[10px] md:text-sm',
      }
    case 'x-large':
      return {
        // 날짜 숫자 (desktop: 16px = text-base)
        dateNumber: 'text-[12px] md:text-base',
        // 이벤트 제목 (desktop: 15px)
        eventTitle: 'text-[11px] md:text-[15px]',
        // 요일 헤더 (desktop: 14px = text-sm)
        weekdayHeader: 'text-[11px] md:text-sm',
        // 공휴일 이름 (desktop: 14px = text-sm)
        holidayName: 'text-[10px] md:text-sm',
        // 공휴일 태그 (desktop: 15px)
        holidayTag: 'text-[11px] md:text-[15px]',
        // 기타 용어 (desktop: 13px)
        otherTerms: 'text-[9px] md:text-[13px]',
        // 더보기 버튼 (desktop: 15px)
        moreButton: 'text-[11px] md:text-[15px]',
      }
  }
}

/**
 * weekStartsOn 값에 따라 요일 헤더 배열 생성
 */
export function getWeekdayHeaders(weekStartsOn: 0 | 1): string[] {
  const allDays = ['일', '월', '화', '수', '목', '금', '토']
  if (weekStartsOn === 1) {
    return ['월', '화', '수', '목', '금', '토', '일']
  }
  return allDays
}
