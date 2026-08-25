/**
 * Calentask 활동 ↔ Google 이벤트를 이어 붙이는 상관(correlation) 키 유틸리티.
 *
 * 단일 키에 의존하면 서드파티(네이버 캘린더 등)가 구글을 미러링하면서
 * 확장 속성을 떨어뜨리거나 이벤트를 새 ID로 재생성하는 순간 연결이 끊어진다.
 * 그래서 강한 키에서 약한 키 순으로 4단계 폴백을 둔다.
 *
 *   1. extendedProperties.private.calentask_id  — 우리가 심은 태그(가장 정확, 가장 잘 지워짐)
 *   2. activities.google_event_id               — 우리 DB가 기억하는 이벤트 ID
 *   3. 이벤트 ID 역변환(UUID ↔ base32hex)        — 우리가 만든 이벤트라면 ID 자체가 곧 활동 UUID
 *   4. iCalUID                                  — 캘린더 복사·CalDAV/ICS 브리지를 넘어도 보존됨
 *   5. 지문(제목 + 시작시각)                      — 위가 전부 끊겼을 때 중복 생성만은 막는 최후 수단
 */

/**
 * UUID → Google Calendar Event ID 변환.
 * Google의 커스텀 Event ID는 base32hex(a-v, 0-9)만 허용한다.
 * UUID의 hex(0-9, a-f)는 모두 이 범위 안이므로 하이픈만 제거하면 된다.
 */
export function toGoogleEventId(uuid: string): string {
  return uuid.replace(/-/g, '')
}

/**
 * Google Calendar Event ID → Calentask Activity UUID 역변환.
 * `toGoogleEventId`의 역함수. 유효한 형식이 아니면 null.
 */
export function fromGoogleEventId(googleEventId: string | null | undefined): string | null {
  if (!googleEventId || !/^[0-9a-f]{32}$/.test(googleEventId)) return null
  return [
    googleEventId.slice(0, 8),
    googleEventId.slice(8, 12),
    googleEventId.slice(12, 16),
    googleEventId.slice(16, 20),
    googleEventId.slice(20),
  ].join('-')
}

/**
 * 지문 매칭용 제목 정규화.
 * 서드파티가 앞뒤 공백·전각 공백을 손대거나 대소문자를 바꾸는 경우를 흡수한다.
 */
export function normalizeTitle(title: string | null | undefined): string {
  return (title || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** 제목 + 시작시각(밀리초 절삭) 지문. 동일 순간·동일 제목이면 같은 일정으로 본다. */
export function fingerprintKey(title: string | null | undefined, startUtcIso: string): string {
  const startMs = new Date(startUtcIso).getTime()
  const bucket = Number.isNaN(startMs) ? startUtcIso : String(Math.floor(startMs / 1000))
  return `${normalizeTitle(title)}@${bucket}`
}

/** Google 이벤트에서 우리가 심어 둔 활동 ID 태그를 읽는다. */
export function readCalentaskTag(event: { extendedProperties?: { private?: Record<string, string> | null } | null }): string | null {
  return event.extendedProperties?.private?.calentask_id || null
}
