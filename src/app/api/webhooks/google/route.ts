import { NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { handleGoogleCalendarSync } from '@/lib/google-calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// after()로 스케줄한 동기화 작업도 이 라우트의 실행 시간 예산 안에서 돌아간다.
// 초기 동기화처럼 항목이 많은 경우를 위해 넉넉히 잡는다.
export const maxDuration = 60

/**
 * Google Calendar Push Notification(Webhook) 수신 엔드포인트.
 *
 * 구글은 200 OK를 빠르게 받지 못하면 채널을 열화시키므로, 실제 동기화는
 * next/server의 `after()`로 응답 이후에 실행한다.
 * (Vercel 서버리스에서 fire-and-forget Promise는 응답 후 동결되어 실행되지 않는다.
 *  waitUntil 기반의 after()라야 작업 완료가 보장된다.)
 */
export async function POST(request: Request) {
  try {
    const channelId = request.headers.get('x-goog-channel-id')
    const channelToken = request.headers.get('x-goog-channel-token') // userId is passed here
    const resourceState = request.headers.get('x-goog-resource-state') // 'sync' | 'exists' | 'not_exists'

    // Sync(초기 구독 확인) 요청은 즉시 200으로 응답한다.
    if (resourceState === 'sync') {
      return NextResponse.json({ status: 'ok' })
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 })
    }

    // 과거 포맷 하위호환: 토큰이 없다면 channelId에서 userId 추출 시도
    let userId = channelToken
    if (!userId && channelId.startsWith('calentask-sync-')) {
      userId = channelId.substring(15, 51)
    }

    if (!userId) {
      return NextResponse.json({ status: 'ignored' })
    }

    const supabase = createAdminClient()

    // ★ 채널 소유권 검증 ★
    // 이 엔드포인트는 공개되어 있고 userId는 헤더로 들어온다. 검증이 없으면 누구나
    // 임의의 userId를 넣어 동기화를 무제한 트리거할 수 있다(구글 쿼터 소진·DB 부하).
    // 채널 ID가 실제로 그 사용자의 것인지 확인한다.
    const { data: user } = await supabase
      .from('users')
      .select('google_channel_id, google_channels')
      .eq('id', userId)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ status: 'ignored' })
    }

    const knownChannelIds = new Set<string>()
    if (user.google_channel_id) knownChannelIds.add(user.google_channel_id)
    if (user.google_channels && typeof user.google_channels === 'object') {
      for (const ch of Object.values(user.google_channels as Record<string, { channelId?: string }>)) {
        if (ch?.channelId) knownChannelIds.add(ch.channelId)
      }
    }

    if (!knownChannelIds.has(channelId)) {
      // 이미 해지된(구식) 채널이거나 위조된 요청. 200으로 응답해 구글의 재시도만 멈춘다.
      console.warn(`[Google Webhook] Unknown channel ${channelId} for user ${userId}; ignoring.`)
      return NextResponse.json({ status: 'ignored' })
    }

    after(async () => {
      try {
        await handleGoogleCalendarSync(userId as string, supabase)
      } catch (err) {
        console.error(`[Google Webhook] Sync error for user ${userId}:`, err)
      }
    })

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Google Webhook Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
