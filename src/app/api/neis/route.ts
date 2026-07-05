import { NextRequest, NextResponse } from 'next/server'

const NEIS_BASE = 'https://open.neis.go.kr/hub'
// 환경변수 미설정 배포에서도 무중단이도록 기존 키를 fallback으로 유지 (서버 전용 — 클라이언트 번들에 노출되지 않음)
const API_KEY = process.env.NEIS_API_KEY || '07f9fb76f9724f199ade78f4f9a1cde1'

const ALLOWED_ENDPOINTS = new Set(['schoolInfo', 'mealServiceDietInfo'])
const ALLOWED_PARAMS = ['SCHUL_NM', 'ATPT_OFCDC_SC_CODE', 'SD_SCHUL_CODE', 'MLSV_YMD', 'pIndex', 'pSize'] as const

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') || ''

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return NextResponse.json({ error: '허용되지 않은 endpoint입니다.' }, { status: 400 })
  }

  const params = new URLSearchParams({ KEY: API_KEY, Type: 'json' })
  for (const name of ALLOWED_PARAMS) {
    const value = searchParams.get(name)
    if (value) params.set(name, value)
  }

  try {
    const res = await fetch(`${NEIS_BASE}/${endpoint}?${params.toString()}`, {
      next: { revalidate: 86400 }, // 급식·학교 정보는 날짜 단위 데이터이므로 24시간 캐시
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'NEIS API 응답 오류' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'NEIS API 요청에 실패했습니다.' }, { status: 502 })
  }
}
