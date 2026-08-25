import { NextResponse } from 'next/server'
import { getSpecialDaysForYear } from '@/lib/specialDays.server'

export async function GET(request: Request) {
  const requestedYear = Number(new URL(request.url).searchParams.get('year'))
  const year = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()
  return NextResponse.json(await getSpecialDaysForYear(year))
}
