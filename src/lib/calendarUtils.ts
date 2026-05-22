import { startOfDay, endOfDay, isSameDay } from 'date-fns'
import { Activity } from '@/app/actions/calendar'

/**
 * 특정 날짜(day)에 해당 일정(event)이 포함되어 렌더링되어야 하는지 검사합니다.
 * 자정(00:00) 종료 일정이 다음 날짜로 이월되는 것을 방지하기 위해 eventEnd > dayStart 초과 조건을 사용합니다.
 */
export const isEventOnDay = (event: Activity, day: Date) => {
  const eventStart = new Date(event.start_time)
  const eventEnd = new Date(event.end_time)
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  
  return eventStart <= dayEnd && eventEnd > dayStart
}

/**
 * 해당 일정이 이틀 이상에 걸쳐 있는 다중 일자(Multi-day) 일정인지 검사합니다.
 * 0분짜리 일정을 방어하고, 00:00 종료 일정이 다음 날로 인식되는 것을 방지합니다.
 */
export const isMultiDayEvent = (event: Activity) => {
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  
  // 0분 이하 일정은 다중 일자가 아님
  if (start.getTime() >= end.getTime()) return false
  
  // 종료 시간에서 1ms를 빼서 자정(00:00) 롤오버 방지
  return !isSameDay(start, new Date(end.getTime() - 1))
}
