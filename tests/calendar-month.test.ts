import assert from 'node:assert/strict'
import test from 'node:test'
import type { Activity } from '@/app/actions/calendar'
import type { CalendarEventSummary } from '@/types/calendarMonth'
import { expandActivities } from '@/lib/expandActivities'
import {
  getCalendarMonthRange,
  isCalendarEventOnDate,
  sortCalendarEventSummaries,
} from '@/lib/calendarMonth'

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: 'user',
    title: '반복 일정',
    start_time: '2028-02-01T00:00:00.000Z',
    end_time: '2028-02-01T01:00:00.000Z',
    is_all_day: false,
    memo: null,
    type: 'EVENT',
    hex_color: '#4f46e5',
    template_id: null,
    deleted_at: null,
    categories: [],
    attachments: [],
    reminders: [],
    recurrence_rule: null,
    parent_activity_id: null,
    original_start_time: null,
    ...overrides,
  }
}

function summary(overrides: Partial<CalendarEventSummary>): CalendarEventSummary {
  return {
    instanceId: 'event',
    entityId: 'event',
    source: 'activity',
    title: '일정',
    start: '2028-02-01T00:00:00.000Z',
    end: '2028-02-01T01:00:00.000Z',
    allDay: false,
    color: '#4f46e5',
    categories: [],
    editable: true,
    recurrenceRule: null,
    parentActivityId: null,
    originalStartTime: null,
    ...overrides,
  }
}

test('일요일·월요일 시작 그리드를 한 canonical 범위로 포함한다', () => {
  const range = getCalendarMonthRange('2026-08')
  assert.equal(range.startDate, '2026-07-26')
  assert.equal(range.endDate, '2026-09-06')
  assert.equal(range.startIso, '2026-07-25T15:00:00.000Z')
  assert.equal(range.endIso, '2026-09-06T15:00:00.000Z')
})

test('윤년 2월의 마지막 날과 6주 그리드 범위를 보존한다', () => {
  const range = getCalendarMonthRange('2028-02')
  assert.equal(range.startDate, '2028-01-30')
  assert.equal(range.endDate, '2028-03-05')
})

test('[start, end) 규칙으로 자정 종료 일정을 다음 날에 표시하지 않는다', () => {
  const event = summary({
    start: '2026-08-25T00:00:00+09:00',
    end: '2026-08-26T00:00:00+09:00',
    allDay: true,
  })
  assert.equal(isCalendarEventOnDate(event, new Date(2026, 7, 25)), true)
  assert.equal(isCalendarEventOnDate(event, new Date(2026, 7, 26)), false)
})

test('반복 예외가 원래 회차를 대체하고 이동된 회차를 한 번만 반환한다', () => {
  const master = activity({ recurrence_rule: 'FREQ=DAILY;COUNT=3' })
  const exception = activity({
    id: '22222222-2222-2222-2222-222222222222',
    title: '이동한 회차',
    start_time: '2028-02-02T03:00:00.000Z',
    end_time: '2028-02-02T04:00:00.000Z',
    parent_activity_id: master.id,
    original_start_time: '2028-02-02T00:00:00.000Z',
  })
  const expanded = expandActivities([exception, master], '2028-02-01T00:00:00.000Z', '2028-02-05T00:00:00.000Z')
  assert.equal(expanded.length, 3)
  assert.equal(expanded.filter(item => item.id === exception.id).length, 1)
  assert.equal(expanded.some(item => item.start_time === '2028-02-02T00:00:00.000Z'), false)
})

test('정렬 결과는 입력 순서와 무관하다', () => {
  const events = [
    summary({ instanceId: 'b', title: '나', allDay: false }),
    summary({ instanceId: 'a', title: '가', allDay: true, end: '2028-02-03T00:00:00.000Z' }),
    summary({ instanceId: 'c', title: '다', allDay: true }),
  ]
  const forward = sortCalendarEventSummaries(events).map(event => event.instanceId)
  const reversed = sortCalendarEventSummaries([...events].reverse()).map(event => event.instanceId)
  assert.deepEqual(forward, reversed)
  assert.deepEqual(forward, ['a', 'c', 'b'])
})
