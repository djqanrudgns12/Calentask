export type CalendarFontSize = 'x-small' | 'small' | 'normal' | 'large'

/**
 * 캘린더 폰트 크기 설정에 따른 CSS 클래스 매핑
 * 
 * 각 요소별로 모바일(mobile)과 데스크톱(desktop) 크기를 반환합니다.
 * 현재 '보통(normal)'이 기존 코드의 기본 크기입니다.
 */
export function getCalendarFontClasses(size: CalendarFontSize) {
  switch (size) {
    case 'x-small':
      return {
        // 날짜 숫자
        dateNumber: { mobile: 'text-[7px]', desktop: 'text-[10px]' },
        // 이벤트 제목
        eventTitle: { mobile: 'text-[8px]', desktop: 'text-[10px]' },
        // 요일 헤더
        weekdayHeader: { mobile: 'text-[8px]', desktop: 'text-[9px]' },
        // 공휴일 이름
        holidayName: { mobile: 'text-[6px]', desktop: 'text-[9px]' },
        // 기타 용어 (국경일, 기념일, 24절기)
        otherTerms: { mobile: 'text-[6px]', desktop: 'text-[8px]' },
        // 더보기 버튼
        moreButton: { mobile: 'text-[8px]', desktop: 'text-[10px]' },
      }
    case 'small':
      return {
        dateNumber: { mobile: 'text-[8px]', desktop: 'text-xs' },
        eventTitle: { mobile: 'text-[9px]', desktop: 'text-[11px]' },
        weekdayHeader: { mobile: 'text-[9px]', desktop: 'text-[10px]' },
        holidayName: { mobile: 'text-[7px]', desktop: 'text-[10px]' },
        otherTerms: { mobile: 'text-[6px]', desktop: 'text-[9px]' },
        moreButton: { mobile: 'text-[8px]', desktop: 'text-[11px]' },
      }
    case 'normal':
      return {
        dateNumber: { mobile: 'text-[9px]', desktop: 'text-sm' },
        eventTitle: { mobile: 'text-[10px]', desktop: 'text-xs' },
        weekdayHeader: { mobile: 'text-[10px]', desktop: 'text-xs' },
        holidayName: { mobile: 'text-[8px]', desktop: 'text-xs' },
        otherTerms: { mobile: 'text-[7px]', desktop: 'text-[10px]' },
        moreButton: { mobile: 'text-[9px]', desktop: 'text-xs' },
      }
    case 'large':
      return {
        dateNumber: { mobile: 'text-[11px]', desktop: 'text-base' },
        eventTitle: { mobile: 'text-[11px]', desktop: 'text-sm' },
        weekdayHeader: { mobile: 'text-[11px]', desktop: 'text-sm' },
        holidayName: { mobile: 'text-[9px]', desktop: 'text-sm' },
        otherTerms: { mobile: 'text-[8px]', desktop: 'text-[11px]' },
        moreButton: { mobile: 'text-[10px]', desktop: 'text-sm' },
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
