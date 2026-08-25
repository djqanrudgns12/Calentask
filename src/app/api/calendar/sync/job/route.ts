import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { startOrResumeJob, runExportJob, cancelJob, getLatestJob } from '@/lib/google/exportJob'

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Internal Server Error'
  return NextResponse.json({ error: message }, { status: 500 })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// after()로 스케줄한 작업 러너가 이 예산 안에서 돌아간다.
// 러너는 240초에서 스스로 PAUSED로 내려앉아 강제 종료를 피한다.
export const maxDuration = 300

/**
 * 구글 캘린더 내보내기 작업의 시작 / 이어하기 / 중단.
 *
 * 응답은 즉시 돌려주고 실제 진행은 after()로 넘긴다. 클라이언트는 작업 행을
 * Realtime으로 구독하므로, 창을 닫거나 다른 화면으로 가도 서버는 계속 진행한다.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body.action || 'start'

    if (action === 'cancel') {
      if (!body.jobId) {
        return NextResponse.json({ error: 'jobId가 필요합니다.' }, { status: 400 })
      }
      await cancelJob(user.id, body.jobId)
      return NextResponse.json({ ok: true })
    }

    const mode = body.mode === 'RETRY' ? 'RETRY' : 'FULL'
    const activityIds: string[] = Array.isArray(body.activityIds) ? body.activityIds : []

    if (mode === 'RETRY' && activityIds.length === 0) {
      return NextResponse.json({ error: '재시도할 항목이 없습니다.' }, { status: 400 })
    }

    const { job, started } = await startOrResumeJob(user.id, {
      mode,
      activityIds,
      restart: body.restart === true,
    })

    // 이미 다른 인스턴스가 돌고 있으면 또 띄우지 않는다(구글 쿼터 낭비 + 중복 쓰기).
    if (started) {
      after(async () => {
        try {
          await runExportJob(job.id, user.id)
        } catch (err) {
          console.error('[sync/job] runner crashed:', err)
        }
      })
    }

    return NextResponse.json({ job, started })
  } catch (error) {
    console.error('[sync/job] POST error:', error)
    return errorResponse(error)
  }
}

/**
 * 현재 작업 상태. Realtime을 쓸 수 없는 환경(구독 실패, 첫 로드)의 폴백이다.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await getLatestJob(createAdminClient(), user.id)
    return NextResponse.json({ job })
  } catch (error) {
    console.error('[sync/job] GET error:', error)
    return errorResponse(error)
  }
}
