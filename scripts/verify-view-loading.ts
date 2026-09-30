import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readAllQueryRows } from '../src/lib/readAllQueryRows'
import { indexTemplateActivities, type TemplateActivityRow } from '../src/lib/insightsAggregation'

config({ path: '.env.local', quiet: true })
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = process.env.TIDY_STATS_ALLOWED_USER_IDS?.split(',')[0]?.trim()
if (!url || !key || !userId) throw new Error('읽기 전용 검증에 필요한 로컬 서버 환경변수가 없습니다.')
if (new URL(url).hostname !== 'pksjjgogmxoyrvsaqzes.supabase.co') throw new Error('Calentask 프로젝트를 확인해 주세요.')
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

async function verify() {
  const started = performance.now()
  const [templates, direct, links] = await Promise.all([
    client.from('activity_templates').select('id').eq('user_id', userId),
    readAllQueryRows((from, to) => client.from('activities').select('id, template_id, start_time, end_time')
      .eq('user_id', userId).not('template_id', 'is', null).is('deleted_at', null).order('id').range(from, to)),
    readAllQueryRows((from, to) => client.from('template_activity_links')
      .select('template_id, activity_id, activity_templates!inner(user_id), activities!inner(id, user_id, start_time, end_time, deleted_at)')
      .eq('activity_templates.user_id', userId).eq('activities.user_id', userId)
      .is('activities.deleted_at', null).order('id').range(from, to)),
  ])
  if (templates.error) throw templates.error
  const rows: TemplateActivityRow[] = [...direct]
  for (const link of links) {
    const activity = Array.isArray(link.activities) ? link.activities[0] : link.activities
    if (!activity) continue
    assert.equal(activity.user_id, userId)
    const template = Array.isArray(link.activity_templates) ? link.activity_templates[0] : link.activity_templates
    assert.equal(template?.user_id, userId)
    rows.push({ id: activity.id, template_id: link.template_id, start_time: activity.start_time, end_time: activity.end_time })
  }
  const index = indexTemplateActivities(rows)
  for (const template of templates.data ?? []) {
    const expected = [...new Map(rows.filter(row => row.template_id === template.id).map(row => [row.id, row])).values()]
    const expectedMinutes = expected.reduce((sum, row) => sum + (Date.parse(row.end_time) - Date.parse(row.start_time)) / 60000, 0)
    const actual = index.get(template.id) ?? []
    assert.equal(actual.length, expected.length)
    assert.ok(Math.abs(actual.reduce((sum, row) => sum + row.minutes, 0) - expectedMinutes) < 0.000001)
  }
  console.log(JSON.stringify({ 검증: '실제 데이터의 관계 조회·소유자 조건·중복 제거·분 합계 일치', 템플릿: templates.data?.length, 직접활동: direct.length, 수동연결: links.length, 소요밀리초: Math.round(performance.now() - started) }))
}

verify().catch(() => { console.error('읽기 전용 데이터 검증에 실패했습니다. 로컬 키·프로젝트·조회 권한을 확인해 주세요.'); process.exitCode = 1 })
