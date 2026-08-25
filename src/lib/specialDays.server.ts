import 'server-only'

import type { SpecialDaysMap, SpecialDayType } from '@/types/calendarMonth'

const API_KEY = process.env.KASI_API_KEY
const BASE_URL = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'

type KasiItem = {
  dateKind: string
  dateName: string
  isHoliday: string
  locdate: number
  seq: number
}

type KasiResponse = {
  response?: {
    body?: {
      items?: { item?: KasiItem | KasiItem[] } | ''
    }
  }
}

async function fetchKasiData(endpoint: string, year: number): Promise<KasiItem[]> {
  if (!API_KEY) return []

  const url = `${BASE_URL}/${endpoint}?solYear=${year}&ServiceKey=${API_KEY}&_type=json&numOfRows=100`

  try {
    const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } })
    if (!response.ok) return []

    const payload = await response.json() as KasiResponse
    const items = payload.response?.body?.items
    if (!items || typeof items === 'string' || !items.item) return []
    return Array.isArray(items.item) ? items.item : [items.item]
  } catch (error) {
    console.error(`KASI ${endpoint} 조회 실패`, error)
    return []
  }
}

function toDateKey(locdate: number) {
  const value = String(locdate)
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

export async function getSpecialDaysForYear(year: number): Promise<SpecialDaysMap> {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return {}

  const endpoints = [
    ['getHoliDeInfo', 'holiday'],
    ['getNationalDayInfo', 'national'],
    ['getAnniversaryInfo', 'anniversary'],
    ['get24DivisionsInfo', 'traditional'],
    ['getSundryDayInfo', 'traditional'],
  ] as const satisfies ReadonlyArray<readonly [string, SpecialDayType]>

  const results = await Promise.all(endpoints.map(([endpoint]) => fetchKasiData(endpoint, year)))
  const specialDays: SpecialDaysMap = {}

  const addDay = (dateKey: string, name: string, isHoliday: boolean, type: SpecialDayType) => {
    const days = specialDays[dateKey] ?? []
    if (!days.some(day => day.name === name)) days.push({ name, isHoliday, type })
    specialDays[dateKey] = days
  }

  results.forEach((items, index) => {
    const [, type] = endpoints[index]
    items.forEach(item => addDay(toDateKey(item.locdate), item.dateName, item.isHoliday === 'Y', type))
  })

  addDay(`${year}-05-01`, '근로자의 날', true, 'holiday')
  return specialDays
}
