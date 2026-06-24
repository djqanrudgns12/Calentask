import { createClient } from '@/lib/supabase/server'
import { syncBatchActivitiesToGoogle } from '@/lib/google-calendar'
import type { SyncProgressEvent } from '@/lib/google-calendar'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  const encoder = new TextEncoder()

  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const body = await request.json()
    const offset = parseInt(body.offset || '0', 10)
    const limit = parseInt(body.limit || '10', 10)

    // Fetch activities for the chunk
    const { data: activities, error, count } = await supabase
      .from('activities')
      .select('*, activity_category_map(categories(*))', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch activities' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const total = count || 0
    const chunkSize = activities?.length || 0

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 스트림 시작 이벤트 전송
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'start', total, chunkSize, offset }) + '\n'))

          if (activities && activities.length > 0) {
            const onProgress = (event: SyncProgressEvent) => {
              try {
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: 'progress',
                  id: event.id,
                  title: event.title,
                  status: event.status,
                  current: event.current,
                  error: event.error || null
                }) + '\n'))
              } catch {
                // 스트림이 이미 닫혔을 수 있음 (클라이언트 연결 끊김)
              }
            }

            const result = await syncBatchActivitiesToGoogle(user.id, activities, onProgress)

            const nextOffset = offset + limit
            const hasMore = nextOffset < total

            // 완료 이벤트 전송
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'done',
              synced: result.synced,
              skipped: result.skipped,
              failed: result.failed,
              failedItems: result.failedItems,
              hasMore,
              nextOffset,
              total,
              chunkSize
            }) + '\n'))
          } else {
            // 데이터 없음
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'done',
              synced: 0,
              skipped: 0,
              failed: 0,
              failedItems: [],
              hasMore: false,
              nextOffset: offset,
              total,
              chunkSize: 0
            }) + '\n'))
          }

          controller.close()
        } catch (err: any) {
          try {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'error',
              message: err.message || 'Internal Server Error'
            }) + '\n'))
            controller.close()
          } catch {
            // 스트림이 이미 닫혔을 수 있음
            controller.error(err)
          }
        }
      }
    })

    // Response를 즉시 반환 (Vercel 버퍼링 방지)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Transfer-Encoding': 'chunked',
      }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
