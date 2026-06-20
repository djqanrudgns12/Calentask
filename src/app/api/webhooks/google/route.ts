import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Google Webhook 수신 엔드포인트
export async function POST(request: Request) {
  try {
    // 구글이 보낸 헤더 값 추출
    const channelId = request.headers.get('x-goog-channel-id')
    const resourceState = request.headers.get('x-goog-resource-state') // 'sync', 'exists', 'not_exists'
    
    // Sync(초기 구독) 요청일 경우 바로 200 OK 반환
    if (resourceState === 'sync') {
      return NextResponse.json({ status: 'ok' })
    }

    // 변경사항(exists)이 있을 때의 로직
    // 실제 프로덕션에서는 x-goog-channel-id 로 어떤 유저의 캘린더인지 찾아서
    // googleapis 패키지로 최근 변경된 일정을 긁어오고 Supabase를 업데이트합니다.
    
    // TODO: 
    // 1. channel_id 로 users 테이블 조회하여 user_id 획득
    // 2. 해당 유저의 google_refresh_token 으로 OAuth 클라이언트 생성
    // 3. calendar.events.list({ syncToken: ... }) 호출하여 변경분(delta) 획득
    // 4. Supabase DB (activities 테이블) 업데이트
    
    console.log(`[Google Webhook] Received update for channel: ${channelId}`)

    // 구글 웹훅은 반드시 200 OK를 빨리 반환해야 합니다. 안 그러면 실패로 간주하고 계속 재시도합니다.
    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Google Webhook Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
