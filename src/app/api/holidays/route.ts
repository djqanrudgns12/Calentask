import { NextResponse } from 'next/server'

const API_KEY = process.env.KASI_API_KEY
const BASE_URL = 'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'

interface KasiItem {
  dateKind: string
  dateName: string
  isHoliday: string
  locdate: number
  seq: number
}

interface KasiResponse {
  response: {
    header: {
      resultCode: string
      resultMsg: string
    }
    body: {
      items: {
        item: KasiItem | KasiItem[] | undefined
      } | ''
      numOfRows: number
      pageNo: number
      totalCount: number
    }
  }
}

export type SpecialDayType = 'holiday' | 'national' | 'anniversary' | 'traditional'

export interface SpecialDay {
  name: string
  isHoliday: boolean
  type: SpecialDayType
}

export type SpecialDaysMap = Record<string, SpecialDay[]>

async function fetchKasiData(endpoint: string, year: string): Promise<KasiItem[]> {
  if (!API_KEY) {
    console.error('KASI_API_KEY is missing')
    return []
  }

  const url = `${BASE_URL}/${endpoint}?solYear=${year}&ServiceKey=${API_KEY}&_type=json&numOfRows=100`
  
  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 * 30 } // Cache for 30 days
    })
    
    if (!res.ok) {
      console.error(`Failed to fetch ${endpoint}:`, res.statusText)
      return []
    }
    
    const data = await res.json() as KasiResponse
    const itemsData = data.response?.body?.items
    
    if (!itemsData || itemsData === '') return []
    
    const items = itemsData.item
    if (!items) return []
    if (Array.isArray(items)) return items
    return [items]
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error)
    return []
  }
}

function formatDateString(locdate: number): string {
  const dateStr = locdate.toString()
  return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') || new Date().getFullYear().toString()

  const [holidaysInfo, nationalInfo, anniversaryInfo, divisionsInfo, sundryInfo] = await Promise.all([
    fetchKasiData('getHoliDeInfo', year),
    fetchKasiData('getNationalDayInfo', year),
    fetchKasiData('getAnniversaryInfo', year),
    fetchKasiData('get24DivisionsInfo', year),
    fetchKasiData('getSundryDayInfo', year)
  ])

  const specialDaysMap: SpecialDaysMap = {}

  const addDay = (locdate: number, name: string, isHoliday: boolean, type: SpecialDayType) => {
    const dateStr = formatDateString(locdate)
    if (!specialDaysMap[dateStr]) {
      specialDaysMap[dateStr] = []
    }
    // Prevent duplicates (e.g. getHoliDeInfo and getNationalDayInfo both return 제헌절 sometimes)
    if (!specialDaysMap[dateStr].some(d => d.name === name)) {
      specialDaysMap[dateStr].push({ name, isHoliday, type })
    }
  }

  // 1. Holidays (includes some national days like 제헌절 with isHoliday=N)
  holidaysInfo.forEach(item => {
    addDay(item.locdate, item.dateName, item.isHoliday === 'Y', 'holiday')
  })

  // 2. National Days (if not already added by holiDeInfo)
  nationalInfo.forEach(item => {
    addDay(item.locdate, item.dateName, item.isHoliday === 'Y', 'national')
  })

  // 3. Anniversaries
  anniversaryInfo.forEach(item => {
    addDay(item.locdate, item.dateName, item.isHoliday === 'Y', 'anniversary')
  })

  // 4. Traditional Terms (24 Divisions + Sundry)
  divisionsInfo.forEach(item => {
    addDay(item.locdate, item.dateName, false, 'traditional')
  })
  sundryInfo.forEach(item => {
    addDay(item.locdate, item.dateName, false, 'traditional')
  })

  // 5. Labor Day (근로자의 날) - Manually add for May 1st
  // Since it's technically a paid holiday for workers, we'll classify it as 'holiday' with isHoliday=true
  addDay(parseInt(`${year}0501`), '근로자의 날', true, 'holiday')

  return NextResponse.json(specialDaysMap)
}
