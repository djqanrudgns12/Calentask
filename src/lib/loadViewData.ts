import type { ViewDataParameters, ViewDataResults } from '@/types/viewData'

/** 조회는 취소 가능한 독립 요청으로 보내 다른 Server Action의 대기열에 묶이지 않게 한다. */
export async function loadViewData<K extends keyof ViewDataParameters>(kind: K, parameters: ViewDataParameters[K], signal?: AbortSignal): Promise<ViewDataResults[K]> {
  const response = await fetch('/api/view-data', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, ...parameters }),
  })
  if (!response.ok) throw new Error(response.status === 401 ? '다시 로그인해 주세요.' : '화면 데이터를 불러오지 못했습니다.')
  return response.json() as Promise<ViewDataResults[K]>
}
