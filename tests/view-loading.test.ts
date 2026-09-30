import assert from 'node:assert/strict'
import test from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import { indexTemplateActivities, type TemplateActivityRow } from '@/lib/insightsAggregation'
import { readAllQueryRows } from '@/lib/readAllQueryRows'
import { AppQueryClient } from '@/lib/queryDependencies'
import { isViewDataRequest } from '@/types/viewData'

const row = (id: string, template_id = 'template-a', start_time = '2026-09-01T00:00:00Z'): TemplateActivityRow => ({
  id, template_id, start_time, end_time: '2026-09-01T01:00:00Z',
})

test('조회 입력은 허용된 화면·시간대 포함 날짜·정상 기간만 받는다', () => {
  assert.equal(isViewDataRequest({ kind: 'month', monthKey: '2026-09' }), true)
  assert.equal(isViewDataRequest({ kind: 'month', monthKey: '2026-13' }), false)
  assert.equal(isViewDataRequest({ kind: 'unknown' }), false)
  assert.equal(isViewDataRequest({ kind: 'time', startDate: '2026-09-01', endDate: '2026-09-30' }), false)
  assert.equal(isViewDataRequest({ kind: 'time', startDate: '2026-09-01T00:00:00Z', endDate: '2026-08-01T00:00:00Z' }), false)
  assert.equal(isViewDataRequest({ kind: 'time', startDate: '2000-01-01T00:00:00Z', endDate: '2100-12-31T23:59:59Z' }), true)
  assert.equal(isViewDataRequest({ kind: 'time', startDate: '1900-01-01T00:00:00Z', endDate: '2199-12-31T23:59:59Z' }), false)
})

test('직접 생성·수동 연결 중복은 템플릿 안에서만 제거한다', () => {
  const index = indexTemplateActivities([row('a'), row('a'), row('a', 'template-b'), row('b')])
  assert.equal(index.get('template-a')?.length, 2)
  assert.equal(index.get('template-b')?.length, 1)
  assert.equal(index.get('template-a')?.reduce((sum, act) => sum + act.minutes, 0), 120)
})

test('시간대 표현이 달라도 실제 시각으로 정렬하고 분을 계산한다', () => {
  const earlier = row('earlier', 'template-a', '2026-09-01T08:00:00+09:00')
  earlier.end_time = '2026-09-01T09:00:00+09:00'
  const index = indexTemplateActivities([earlier, row('later')])
  assert.deepEqual(index.get('template-a')?.map(act => act.id), ['later', 'earlier'])
  assert.equal(index.get('template-a')?.[1].minutes, 60)
})

test('잘못된 날짜와 음수 기간을 정상 집계로 숨기지 않는다', () => {
  assert.throws(() => indexTemplateActivities([row('invalid', 'template-a', 'invalid')]))
  assert.throws(() => indexTemplateActivities([row('negative', 'template-a', '2026-09-02T00:00:00Z')]))
})

test('1000행을 넘는 활동도 누락 없이 페이지를 합친다', async () => {
  const source = Array.from({ length: 2507 }, (_, id) => ({ id }))
  const ranges: number[][] = []
  const result = await readAllQueryRows(async (from, to) => {
    ranges.push([from, to])
    return { data: source.slice(from, to + 1), error: null }
  })
  assert.deepEqual(result, source)
  assert.deepEqual(ranges, [[0, 999], [1000, 1999], [2000, 2999]])
})

test('후속 페이지 실패 시 부분 결과를 정상 데이터로 반환하지 않는다', async () => {
  await assert.rejects(readAllQueryRows(async from => from === 0
    ? { data: [1, 2], error: null }
    : { data: null, error: { message: '조회 실패' } }, 2), /조회 실패/)
})

test('캘린더·템플릿 변경이 파생 집계를 무효화하고 다른 캐시는 보존한다', async () => {
  const client = new AppQueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  for (const key of ['calendar-month', 'overviewDashboard', 'templatesSummary', 'templateFullAnalytics', 'tidy-stats']) client.setQueryData([key], { value: 1 })
  await client.invalidateQueries({ queryKey: ['calendar-month'], refetchType: 'none' })
  for (const key of ['overviewDashboard', 'templatesSummary', 'templateFullAnalytics']) assert.equal(client.getQueryState([key])?.isInvalidated, true)
  assert.equal(client.getQueryState(['tidy-stats'])?.isInvalidated, false)
  client.setQueryData(['overviewDashboard'], { value: 2 })
  await client.invalidateQueries({ queryKey: ['templatesSummary'], refetchType: 'none' })
  assert.equal(client.getQueryState(['overviewDashboard'])?.isInvalidated, true)
  client.setQueryData(['overviewDashboard'], { value: 3 })
  await client.invalidateQueries({ queryKey: ['activities'], refetchType: 'none' })
  assert.equal(client.getQueryState(['overviewDashboard'])?.isInvalidated, true)
  client.clear()
})

test('동시 선로딩·화면 조회는 요청 하나에 합류하고 재진입은 캐시를 재사용한다', async () => {
  const client = new QueryClient()
  let requests = 0
  const options = { queryKey: ['view'], staleTime: 300_000, queryFn: async () => { requests++; return { value: 1 } } }
  await Promise.all([client.prefetchQuery(options), client.fetchQuery(options)])
  await client.fetchQuery(options)
  assert.equal(requests, 1)
  client.clear()
})
