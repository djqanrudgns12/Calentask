// Google Gemini REST 래퍼 (서버 전용)
// 규칙 파서가 실패한 비정형 시트를 구조화 JSON으로 추출하는 폴백.
// GEMINI_API_KEY(서버 전용 환경변수) 사용. 신규 npm 의존성 없이 REST fetch.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
const GEMINI_ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

type GeminiEvent = { date: string; title: string }

const SYSTEM_INSTRUCTION = (year: number) =>
  `다음은 한국 학교의 주간/월중 교육활동 계획 CSV다.
규칙:
- "활동 내용 및 세부 사항" 또는 "학교 교육 활동(행사)" 같은 활동 열의 내용만 추출한다.
- 담당교사, 담당자, 근무 사항, 출장, 등교 같은 열은 완전히 무시한다.
- 항목 앞의 번호("1.", "2.")와 불릿("*", "·")은 제거하고 문장만 남긴다.
- 빈 항목, 의미 없는 행(머리글/요약/공백)은 제외한다.
- 날짜는 시트의 날짜(월/일 또는 일)에 연도 ${year}를 결합해 "YYYY-MM-DD" 형식으로 만든다.
  (월중계획이면 상단 제목의 "N월"을 월로 사용한다.)
- 하루에 여러 활동이 있으면 각각 별도 항목으로 만든다.
결과는 [{ "date": "YYYY-MM-DD", "title": "..." }] JSON 배열만 출력한다.`

export async function geminiParse(csvText: string, year: number): Promise<GeminiEvent[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. 규칙 파서로 인식할 수 없는 시트는 처리할 수 없습니다.')
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${SYSTEM_INSTRUCTION(year)}\n\n[CSV]\n${csvText}` }],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING' },
            title: { type: 'STRING' },
          },
          required: ['date', 'title'],
        },
      },
    },
  }

  const res = await fetch(GEMINI_ENDPOINT(GEMINI_MODEL, key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
    cache: 'no-store',
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini 분석 실패 (HTTP ${res.status}). ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    // 안전 필터 등으로 비어 있을 수 있음
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason
    throw new Error(`Gemini 응답이 비어 있습니다${reason ? ` (${reason})` : ''}.`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // 혹시 코드펜스로 감싸진 경우 추출 시도
    const m = text.match(/\[[\s\S]*\]/)
    if (!m) throw new Error('Gemini 응답을 JSON으로 해석하지 못했습니다.')
    parsed = JSON.parse(m[0])
  }

  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((e): e is GeminiEvent => !!e && typeof e.date === 'string' && typeof e.title === 'string')
    .map((e) => ({ date: e.date.trim(), title: e.title.trim() }))
}
