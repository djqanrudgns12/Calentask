import { NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { handleGoogleCalendarSync } from '@/lib/google-calendar'

// Google Webhook 수신 엔드포인트
export async function POST(request: Request) {
  try {
    // 구글이 보낸 헤더 값 추출
    const channelId = request.headers.get('x-goog-channel-id')
    const channelToken = request.headers.get('x-goog-channel-token') // userId is passed here!
    const resourceState = request.headers.get('x-goog-resource-state') // 'sync', 'exists', 'not_exists'
    
    // Sync(초기 구독) 요청일 경우 바로 200 OK 반환
    if (resourceState === 'sync') {
      return NextResponse.json({ status: 'ok' })
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 })
    }

    console.log(`[Google Webhook] Received update for channel: ${channelId}, token: ${channelToken}`)

    // 1. x-goog-channel-token에서 user_id 획득 (단일/다중 캘린더 공통 적용)
    // 과거 포맷 하위호환: 토큰이 없다면 channelId에서 추출 시도
    let userId = channelToken
    if (!userId && channelId.startsWith('calentask-sync-')) {
      userId = channelId.substring(15, 51)
    }

    if (userId) {
      const supabase = createAdminClient()
      // 2~4. 해당 유저의 변경분 동기화 로직을 응답 이후 실행합니다.
      // 구글 웹훅은 200 OK를 빨리 반환해야 하므로 next/server의 after()로 스케줄합니다.
      // (Vercel 서버리스에서는 fire-and-forget 백그라운드 Promise가 응답 후 동결되어
      //  실행되지 않으므로, waitUntil 기반의 after()로 작업 완료를 보장해야 합니다.)
      after(async () => {
        try {
          await handleGoogleCalendarSync(userId as string, supabase)
        } catch (err) {
          console.error(`[Google Webhook] Sync error for user ${userId}:`, err)
        }
      })
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Google Webhook Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
