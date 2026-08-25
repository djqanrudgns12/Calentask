/**
 * Google 이벤트 시각 ↔ Calentask timestamptz 변환의 단일 진실 공급원.
 *
 * Google Calendar는 두 가지 시각 표현을 쓴다.
 *  - 시간 일정: { dateTime: '2026-08-26T09:00:00', timeZone: 'Asia/Seoul' }
 *  - 종일 일정: { date: '2026-08-26' }  ← end.date는 **배타적(exclusive)**
 *
 * Calentask는 둘 다 timestamptz(UTC) 한 컬럼에 저장하고, 종일 일정은
 * "해당 타임존의 00:00:00 ~ 23:59:59"로 표현한다(AddEventDialog와 동일한 규약).
 * 이 모듈은 그 왕복 변환을 손실 없이 처리한다.
 */

/** 동기화 기준 타임존. */
export const SYNC_TIME_ZONE = 'Asia/Seoul'

/**
 * Intl.DateTimeFormat 인스턴스 생성은 비싸다(수백 µs).
 * 이벤트 하나당 여러 번 호출되므로 타임존별로 재사용한다.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatterCache.set(timeZone, formatter)
  }
  return formatter
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const raw: Record<string, string> = {}
  for (const { type, value } of formatterFor(timeZone).formatToParts(date)) {
    raw[type] = value
  }
  return {
    year: Number(raw.year),
    month: Number(raw.month),
    day: Number(raw.day),
    // 일부 런타임은 자정을 '24'로 포맷한다.
    hour: raw.hour === '24' ? 0 : Number(raw.hour),
    minute: Number(raw.minute),
    second: Number(raw.second),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 유효한 날짜인지 확인하고 Date를 반환. 파싱 불가면 null. */
function parseInstant(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * UTC 시각 → 해당 타임존의 오프셋 없는 로컬 ISO(`YYYY-MM-DDTHH:mm:ss`).
 * Google의 `{ dateTime, timeZone }` 조합에 넣을 문자열을 만든다.
 * (오프셋을 붙이지 않아야 구글이 이벤트의 고유 타임존을 그대로 보존한다.)
 */
export function toZonedIso(utcIso: string | Date, timeZone: string = SYNC_TIME_ZONE): string {
  const date = parseInstant(utcIso)
  if (!date) return typeof utcIso === 'string' ? utcIso : ''
  const p = zonedParts(date, timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

/** UTC 시각 → 해당 타임존의 달력 날짜(`YYYY-MM-DD`). */
export function toZonedYmd(utcIso: string | Date, timeZone: string = SYNC_TIME_ZONE): string {
  return toZonedIso(utcIso, timeZone).slice(0, 10)
}

/** `YYYY-MM-DD`에 일수를 더한다(순수 달력 연산, 타임존 무관). */
export function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const shifted = new Date(Date.UTC(y, m - 1, d + days))
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

/**
 * 해당 타임존 기준 하루의 시작/끝을 UTC ISO로 변환한다.
 *
 * 벽시계 → 순간(instant) 변환은 오프셋이 그 순간에 의존하므로 한 번에 풀 수 없다.
 * UTC로 가정한 값에서 오프셋을 빼 근사치를 얻고, 그 근사치의 실제 오프셋으로
 * 한 번 더 보정하는 고정점 반복(2-pass)으로 해결한다.
 * KST처럼 DST가 없는 타임존은 1회로 수렴하고, DST 전환일도 정확히 처리된다.
 */
export function zonedYmdToUtcIso(
  ymd: string,
  boundary: 'start' | 'end',
  timeZone: string = SYNC_TIME_ZONE
): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const wallClock =
    boundary === 'start'
      ? Date.UTC(y, m - 1, d, 0, 0, 0, 0)
      : Date.UTC(y, m - 1, d, 23, 59, 59, 0)

  const offsetAt = (ms: number) => {
    const p = zonedParts(new Date(ms), timeZone)
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms
  }

  let instant = wallClock - offsetAt(wallClock)
  instant = wallClock - offsetAt(instant)
  return new Date(instant).toISOString()
}

/**
 * Calentask 종일 일정(타임존 00:00:00 ~ 23:59:59로 저장) → Google all-day `{ date }` 범위.
 *
 * Google의 `end.date`는 배타적이므로 마지막 날 **다음 날**을 넘겨야 한다.
 * 기존 코드는 UTC ISO 문자열을 그대로 `split('T')[0]` 했기 때문에,
 * KST 자정 저장분(예: 2026-08-26 00:00 KST = 2026-08-25T15:00Z)이
 * 구글에서 하루 앞당겨 보이는 버그가 있었다.
 */
export function toGoogleAllDayRange(
  startUtcIso: string,
  endUtcIso: string,
  timeZone: string = SYNC_TIME_ZONE
): { start: string; end: string } {
  const startIso = toZonedIso(startUtcIso, timeZone)
  const endIso = toZonedIso(endUtcIso, timeZone)

  const startDate = startIso.slice(0, 10)
  let lastDay = endIso.slice(0, 10)

  // 저장된 종료값이 배타적(exclusive)인지 판별한다.
  // 현재 규약은 "마지막 날 23:59:59"(포함)이지만, 예전 수입 코드는 Google의 배타적
  // end.date 문자열을 그대로 timestamptz에 넣어서 종료 시각이 시작 시각과 똑같이 남아 있다.
  // → 시각(HH:mm:ss)이 동일하면서 날짜만 뒤면 배타적 표현으로 본다.
  const endIsExclusive = lastDay > startDate && endIso.slice(11) === startIso.slice(11)
  if (endIsExclusive) lastDay = shiftYmd(lastDay, -1)
  if (lastDay < startDate) lastDay = startDate

  return { start: startDate, end: shiftYmd(lastDay, 1) }
}

/**
 * Google all-day `{ date }` 범위 → Calentask 저장값(타임존 00:00:00 ~ 23:59:59의 UTC ISO).
 * `end.date`가 배타적이므로 하루를 빼서 실제 마지막 점유일을 얻는다.
 */
export function fromGoogleAllDayRange(
  startDate: string,
  endDate?: string | null,
  timeZone: string = SYNC_TIME_ZONE
): { start: string; end: string } {
  let lastDay = endDate ? shiftYmd(endDate, -1) : startDate
  if (lastDay < startDate) lastDay = startDate

  return {
    start: zonedYmdToUtcIso(startDate, 'start', timeZone),
    end: zonedYmdToUtcIso(lastDay, 'end', timeZone),
  }
}

/**
 * Google 이벤트의 start/end → Calentask 저장용 UTC ISO 쌍.
 * 시각 정보가 없는(=반영 불가한) 이벤트는 null을 반환한다.
 */
export function eventTimesToUtc(
  event: { start?: { date?: string | null; dateTime?: string | null } | null; end?: { date?: string | null; dateTime?: string | null } | null },
  timeZone: string = SYNC_TIME_ZONE
): { startTime: string; endTime: string; isAllDay: boolean } | null {
  if (event.start?.date) {
    const range = fromGoogleAllDayRange(event.start.date, event.end?.date, timeZone)
    return { startTime: range.start, endTime: range.end, isAllDay: true }
  }

  const start = parseInstant(event.start?.dateTime || '')
  if (!start) return null
  const end = parseInstant(event.end?.dateTime || '') || start

  return {
    startTime: start.toISOString(),
    // 끝이 시작보다 앞서는 비정상 데이터는 시작 시각으로 클램프한다.
    endTime: (end.getTime() < start.getTime() ? start : end).toISOString(),
    isAllDay: false,
  }
}
