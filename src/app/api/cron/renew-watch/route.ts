import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { watchGoogleCalendar, handleGoogleCalendarSync } from '@/lib/google-calendar'

// Google watch 채널 만료 방지용 주기 갱신 크론.
// Vercel Cron이 하루 1회 호출합니다. (Google 채널은 최대 약 7일 후 만료)
// watchGoogleCalendar가 만료 임박 채널만 갱신하고, 안전망으로 pull 동기화도 수행합니다.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  // Vercel Cron은 Authorization: Bearer ${CRON_SECRET} 헤더를 전달합니다.
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 동기화가 활성화된(연동 + 동기화 캘린더 보유) 사용자만 대상
  const { data: users, error } = await supabase
    .from('users')
    .select('id')
    .not('google_refresh_token', 'is', null)
    .not('google_sync_calendar_id', 'is', null)

  if (error) {
    console.error('[Cron renew-watch] Failed to load users:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let renewed = 0
  let failed = 0

  for (const user of users || []) {
    try {
      // 만료 임박 채널 갱신 (내부에서 초기/안전 pull 동기화도 수행)
      await watchGoogleCalendar(user.id)
      renewed++
    } catch (err) {
      failed++
      console.error(`[Cron renew-watch] Failed for user ${user.id}:`, err)
      // 채널 갱신이 실패해도 최소한 변경분 pull은 시도
      try {
        await handleGoogleCalendarSync(user.id)
      } catch {
        // 무시
      }
    }
  }

  return NextResponse.json({ ok: true, total: users?.length || 0, renewed, failed })
}
