export const GOOGLE_COLORS = [
  { id: '1', name: 'Lavender', hex: '#7986CB' },
  { id: '2', name: 'Sage', hex: '#33B679' },
  { id: '3', name: 'Grape', hex: '#8E24AA' },
  { id: '4', name: 'Flamingo', hex: '#E67C73' },
  { id: '5', name: 'Banana', hex: '#F6BF26' },
  { id: '6', name: 'Tangerine', hex: '#F4511E' },
  { id: '7', name: 'Peacock', hex: '#039BE5' },
  { id: '8', name: 'Graphite', hex: '#616161' },
  { id: '9', name: 'Blueberry', hex: '#3F51B5' },
  { id: '10', name: 'Basil', hex: '#0B8043' },
  { id: '11', name: 'Tomato', hex: '#D50000' },
]

export const PRESET_COLOR_MAP: Record<string, string> = {
  // Red/Orange/Yellow (Tomato 11, Tangerine 6, Banana 5)
  '#ef4444': '11', // Red -> Tomato
  '#f43f5e': '11', // Rose -> Tomato
  '#f97316': '6',  // Orange -> Tangerine
  '#eab308': '5',  // Yellow -> Banana

  // Green/Teal (Basil 10, Sage 2)
  '#22c55e': '10', // Green -> Basil
  '#10b981': '10', // Emerald -> Basil
  '#84cc16': '2',  // Lime -> Sage
  '#14b8a6': '2',  // Teal -> Sage

  // Blue/Cyan (Blueberry 9, Peacock 7)
  '#3b82f6': '9',  // Blue -> Blueberry
  '#6366f1': '9',  // Indigo -> Blueberry
  '#0ea5e9': '7',  // Light Blue -> Peacock
  '#06b6d4': '7',  // Cyan -> Peacock

  // Purple/Pink (Grape 3, Lavender 1, Flamingo 4)
  '#a855f7': '3',  // Purple -> Grape
  '#d946ef': '3',  // Fuchsia -> Grape
  '#8b5cf6': '1',  // Violet -> Lavender
  '#ec4899': '4',  // Pink -> Flamingo

  // Grayscale (Graphite 8)
  '#64748b': '8',  // Slate -> Graphite
  '#78716c': '8',  // Stone -> Graphite
  '#000000': '8',  // Black -> Graphite
  '#475569': '8',  // Slate dark -> Graphite
}

function hexToRgb(hex: string) {
  let cleanHex = hex.replace('#', '')
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('')
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function getClosestGoogleColorId(hexColor: string): string {
  const lowercaseHex = hexColor.toLowerCase()

  // 1. 사전 정의된 색상 (1차 매핑)
  if (PRESET_COLOR_MAP[lowercaseHex]) {
    return PRESET_COLOR_MAP[lowercaseHex]
  }

  // 2. 수학적 변환 (유클리드 거리 기반 2차 매핑)
  const rgb = hexToRgb(lowercaseHex)
  if (!rgb) return '9' // Fallback to Blueberry

  let closestColorId = '9'
  let minDistance = Infinity

  for (const gColor of GOOGLE_COLORS) {
    const gHex = (gColor as any).hex || '#3F51B5'
    const gRgb = hexToRgb(gHex)!
    const distance = Math.sqrt(
      Math.pow(rgb.r - gRgb.r, 2) +
      Math.pow(rgb.g - gRgb.g, 2) +
      Math.pow(rgb.b - gRgb.b, 2)
    )

    if (distance < minDistance) {
      minDistance = distance
      closestColorId = gColor.id
    }
  }

  return closestColorId
}
