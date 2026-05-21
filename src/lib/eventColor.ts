/**
 * 일정(Activity)의 최종 표시 색상을 결정하는 유틸리티.
 *
 * [색상 우선순위]
 * 1순위: event.hex_color (사용자가 팔레트에서 직접 지정한 커스텀 색상)
 * 2순위: event.categories의 색상 (1개면 단색, 2개 이상이면 그라데이션)
 * 3순위: FALLBACK_COLOR (회색)
 *
 * 왜 이렇게 설계했는가?
 * - 사용자가 색상을 직접 선택했다면 그것이 가장 강한 의도이므로 최우선 적용.
 * - 커스텀 색상이 없을 때만 카테고리 색상을 활용하여 시각적 분류 제공.
 * - 아무것도 없는 경우 회색으로 fallback하여 UI 깨짐 방지.
 */

import type { Activity } from '@/app/actions/calendar'

const FALLBACK_COLOR = '#94a3b8'

/**
 * 일정에서 대표 단일 색상을 반환합니다.
 * border, dot, 텍스트 색상 등 "1개의 색상"이 필요한 곳에 사용.
 */
export function getEventPrimaryColor(event: Activity): string {
  // 1순위: 사용자 커스텀 색상
  if (event.hex_color) return event.hex_color

  // 2순위: 첫 번째 카테고리 색상
  if (event.categories?.length > 0) {
    return event.categories[0].hex_color || FALLBACK_COLOR
  }

  // 3순위: fallback
  return FALLBACK_COLOR
}

/**
 * 일정에서 모든 카테고리 색상을 배열로 반환합니다.
 * 커스텀 색상이 있으면 그것 하나만 반환 (단색 처리).
 */
function getEventColors(event: Activity): string[] {
  // 커스텀 색상이 있으면 카테고리와 무관하게 커스텀 색상만 사용
  if (event.hex_color) return [event.hex_color]

  // 카테고리 색상 수집
  const colors = event.categories
    ?.map(cat => cat.hex_color)
    .filter(Boolean)

  if (colors && colors.length > 0) return colors

  return [FALLBACK_COLOR]
}

/**
 * 일정의 좌측 accent bar에 적용할 CSS background 스타일을 반환합니다.
 * - 단일 색상: 단색 배경
 * - 멀티 카테고리: 세로 방향 그라데이션 (위→아래, 각 카테고리 색이 균등 분할)
 *
 * 반환값은 CSS `background` 속성에 직접 사용 가능합니다.
 */
export function getEventBarGradient(event: Activity): string {
  const colors = getEventColors(event)

  if (colors.length === 1) return colors[0]

  // 멀티 카테고리: 균등 분할 그라데이션 (세로 방향, 위→아래)
  // 예: 2개 → 0~50% 첫 색, 50~100% 두 번째 색
  const step = 100 / colors.length
  const stops = colors.map((c, i) => `${c} ${i * step}%, ${c} ${(i + 1) * step}%`)
  return `linear-gradient(to bottom, ${stops.join(', ')})`
}

/**
 * 일정 배경색을 반환합니다 (대표 색상의 10% 불투명도).
 * 캘린더 셀 내 이벤트 블록의 연한 배경에 사용.
 */
export function getEventBgColor(event: Activity): string {
  const primary = getEventPrimaryColor(event)
  return `${primary}1A` // hex + 10% alpha
}
