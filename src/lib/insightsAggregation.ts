export interface TemplateActivityRow {
  id: string
  template_id: string | null
  start_time: string
  end_time: string
}

export interface IndexedTemplateActivity extends TemplateActivityRow {
  startMs: number
  minutes: number
}

/** 각 활동의 시간을 한 번만 파싱하고 템플릿별로 묶는다. 직접 생성·수동 연결 중복은 한 번만 센다. */
export function indexTemplateActivities(rows: TemplateActivityRow[]) {
  const index = new Map<string, IndexedTemplateActivity[]>()
  const seen = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!row.template_id) continue
    const ids = seen.get(row.template_id) ?? new Set<string>()
    if (ids.has(row.id)) continue
    ids.add(row.id)
    seen.set(row.template_id, ids)
    const startMs = Date.parse(row.start_time)
    const endMs = Date.parse(row.end_time)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
      throw new Error('활동의 시작·종료 시간이 올바르지 않습니다.')
    }
    const bucket = index.get(row.template_id) ?? []
    bucket.push({ ...row, startMs, minutes: (endMs - startMs) / 60000 })
    index.set(row.template_id, bucket)
  }
  for (const bucket of index.values()) bucket.sort((a, b) => b.startMs - a.startMs)
  return index
}
