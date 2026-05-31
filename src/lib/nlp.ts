import { addDays, setHours, setMinutes, startOfToday, nextMonday } from 'date-fns';

/**
 * 간단한 자연어 처리(NLP) 엔진
 * "내일 오후 2시 기획안 작성" -> { title: "기획안 작성", date: Date객체(내일 14:00) }
 */
export function parseNLPDate(input: string): { title: string; date: Date | null; hasTime: boolean } {
  let title = input;
  let date: Date | null = null;
  let hasTime = false;
  const today = startOfToday();

  // 1. 날짜 키워드 매칭
  if (input.includes('오늘')) {
    date = today;
    title = title.replace('오늘', '');
  } else if (input.includes('내일')) {
    date = addDays(today, 1);
    title = title.replace('내일', '');
  } else if (input.includes('모레')) {
    date = addDays(today, 2);
    title = title.replace('모레', '');
  } else if (input.includes('다음주')) {
    date = nextMonday(today);
    title = title.replace('다음주', '');
  }

  // 2. 시간 키워드 매칭 (예: "오전 10시", "오후 2시 30분")
  const timeMatch = input.match(/(오전|오후)\s*(\d+)시(?:\s*(\d+)분)?/);
  if (timeMatch) {
    if (!date) date = today; // 시간이 명시되었는데 날짜가 없으면 기본값 '오늘'
    hasTime = true;
    
    const isPm = timeMatch[1] === '오후';
    let hour = parseInt(timeMatch[2], 10);
    if (hour > 12) hour = hour % 12 || 12; // Prevent invalid hours like '오후 24시'
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    
    const minute = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    
    date = setHours(setMinutes(date, minute), hour);
    title = title.replace(timeMatch[0], '');
  }

  // 3. 다듬기 및 과거시간 제한
  if (date && date.getTime() < today.getTime()) {
    date = today;
  }
  
  title = title.trim().replace(/\s+/g, ' '); // 다중 공백 제거

  return { title: title || input, date, hasTime };
}
