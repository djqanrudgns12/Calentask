// 학사일정 구글 시트 파서 (서버 전용)
// 규칙 기반 파서 + Gemini 폴백. 검증된 프로토타입 로직(주간/월중 표 형태)을 이식.
import Papa from 'papaparse'
import crypto from 'crypto'
import { geminiParse } from './gemini'

export type ParsedEvent = { date: string; title: string } // date: YYYY-MM-DD
export type SheetKind = 'weekly' | 'monthly' | 'auto'
export type ParseResult = { events: ParsedEvent[]; parser: 'rule' | 'llm'; kind: SheetKind }

// ── URL → 시트 ID / gid 추출 ──
export function extractSheetIdGid(url: string): { sheetId: string | null; gid: string | null } {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  const gidMatch = url.match(/[?&#]gid=(\d+)/)
  return { sheetId: idMatch?.[1] ?? null, gid: gidMatch?.[1] ?? null }
}

export function toCsvExportUrl(sheetId: string, gid: string | null): string {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
  return gid ? `${base}&gid=${gid}` : base
}

// ── 서버 사이드 CSV fetch ──
export async function fetchSheetCsv(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Calentask Academic Importer)' },
    signal: AbortSignal.timeout(8000),
    redirect: 'follow',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`시트를 불러오지 못했습니다 (HTTP ${res.status}). 시트 공유 설정을 확인하세요.`)
  const text = await res.text()
  // 로그인/권한 페이지(HTML)가 반환된 경우 감지
  if (/^\s*<(?:!doctype|html)/i.test(text)) {
    throw new Error('시트에 접근할 수 없습니다. "링크가 있는 모든 사용자" 보기 권한으로 공개해 주세요.')
  }
  return text
}

// ── 텍스트 정규화 유틸 ──
// 번호("1.", "2.")·불릿("*", "·")·머리표 제거 → 문장만
export function cleanTitle(s: string): string {
  return s.replace(/^\s*(?:\d+\.|\*|·|▪|◦|■|●|◇|-\s)\s*/, '').replace(/\s+/g, ' ').trim()
}

// 중복 비교용 정규화(공백 정리 + 끝 구두점 제거)
export function normalizeTitle(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/[.·]+$/, '').trim()
}

export function dedupHash(date: string, normTitle: string): string {
  return crypto.createHash('sha256').update(`${date}|${normTitle}`).digest('hex')
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// 셀(여러 줄 가능) → 정제된 제목 배열
function cellToTitles(cell: string | undefined): string[] {
  if (!cell) return []
  return cell
    .split('\n')
    .map(cleanTitle)
    .filter((t) => t.length > 0)
}

// ── 규칙 기반 파서 ──
// 헤더에서 활동 컬럼을 찾고, 날짜 컬럼 형식(M/D 또는 일 숫자)을 판별해 추출.
export function ruleParse(csvText: string, year: number): { ok: boolean; events: ParsedEvent[]; kind: SheetKind } {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: false })
  const rows = (parsed.data || []).filter((r) => Array.isArray(r))
  if (rows.length === 0) return { ok: false, events: [], kind: 'auto' }

  // 1) 헤더 행/활동 컬럼 탐지: "활동 내용" 또는 "교육 활동"
  //    상단 제목행("…교육활동 운영 계획")이 오인식되지 않도록, 같은 행에
  //    "요일"/"일"이 함께 있어야 헤더로 인정한다.
  const isActivityHeaderCell = (c: string) => {
    const s = (c || '').replace(/\s/g, '')
    return s.includes('활동내용') || s.includes('교육활동')
  }
  const looksLikeHeaderRow = (row: string[]) =>
    row.some((c) => (c || '').replace(/\s/g, '').includes('요일')) || (row[0] || '').trim() === '일'

  let headerIdx = -1
  let actCol = -1
  for (let i = 0; i < rows.length; i++) {
    const col = rows[i].findIndex(isActivityHeaderCell)
    if (col < 0) continue
    if (!looksLikeHeaderRow(rows[i])) continue // 제목 행 배제
    headerIdx = i
    actCol = col
    break
  }
  if (headerIdx < 0 || actCol < 0) return { ok: false, events: [], kind: 'auto' }

  const dataRows = rows.slice(headerIdx + 1)

  // 2) 날짜 컬럼 형식 판별 (col 0)
  const hasSlashDate = dataRows.some((r) => /^\s*\d{1,2}\/\d{1,2}/.test(r[0] || ''))
  const hasDayNumber = dataRows.some((r) => /^\s*\d{1,2}\s*$/.test(r[0] || ''))

  const events: ParsedEvent[] = []

  if (hasSlashDate) {
    // 주간: col0 = "M/D"
    for (const r of dataRows) {
      const m = (r[0] || '').match(/^\s*(\d{1,2})\/(\d{1,2})/)
      if (!m) continue
      const date = `${year}-${pad2(+m[1])}-${pad2(+m[2])}`
      for (const title of cellToTitles(r[actCol])) events.push({ date, title })
    }
    return { ok: events.length > 0, events, kind: 'weekly' }
  }

  if (hasDayNumber) {
    // 월중: col0 = 일(숫자), 월은 상단 제목에서 추출
    let month = 0
    for (let i = 0; i <= headerIdx && i < rows.length; i++) {
      const joined = rows[i].join(' ')
      const mm = joined.match(/(\d{1,2})\s*월/)
      if (mm) {
        month = +mm[1]
        break
      }
    }
    if (month < 1 || month > 12) return { ok: false, events: [], kind: 'monthly' }
    for (const r of dataRows) {
      const dm = (r[0] || '').match(/^\s*(\d{1,2})\s*$/)
      if (!dm) continue
      const date = `${year}-${pad2(month)}-${pad2(+dm[1])}`
      for (const title of cellToTitles(r[actCol])) events.push({ date, title })
    }
    return { ok: events.length > 0, events, kind: 'monthly' }
  }

  return { ok: false, events: [], kind: 'auto' }
}

// ── 오케스트레이터: 규칙 → 실패 시 Gemini ──
export async function parseAcademicSheet(csvText: string, year: number, kindHint?: SheetKind): Promise<ParseResult> {
  const ruled = ruleParse(csvText, year)
  if (ruled.ok) {
    return { events: dedupeWithin(ruled.events), parser: 'rule', kind: ruled.kind }
  }
  // 폴백: Gemini
  const llmEvents = await geminiParse(csvText, year)
  const cleaned = llmEvents
    .map((e) => ({ date: e.date, title: cleanTitle(e.title) }))
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.title.length > 0)
  return { events: dedupeWithin(cleaned), parser: 'llm', kind: kindHint || 'auto' }
}

// 같은 파싱 결과 내 (date+normTitle) 중복 제거
function dedupeWithin(events: ParsedEvent[]): ParsedEvent[] {
  const seen = new Set<string>()
  const out: ParsedEvent[] = []
  for (const e of events) {
    const key = `${e.date}|${normalizeTitle(e.title)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

// ── 전역 제외 키워드 적용 ──
export function applyExclusions(
  events: ParsedEvent[],
  keywords: string[]
): { kept: ParsedEvent[]; excluded: { event: ParsedEvent; keyword: string }[] } {
  const kept: ParsedEvent[] = []
  const excluded: { event: ParsedEvent; keyword: string }[] = []
  const norm = keywords.map((k) => k.replace(/\s/g, '')).filter(Boolean)
  for (const e of events) {
    const t = e.title.replace(/\s/g, '')
    const hit = norm.find((k) => t.includes(k))
    if (hit) excluded.push({ event: e, keyword: keywords[norm.indexOf(hit)] })
    else kept.push(e)
  }
  return { kept, excluded }
}
