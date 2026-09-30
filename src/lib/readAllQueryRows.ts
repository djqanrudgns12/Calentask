interface QueryPage<T> {
  data: T[] | null
  error: { message: string } | null
}

/** Supabase의 기본 행 제한으로 집계가 잘리지 않도록 정렬된 쿼리의 모든 페이지를 읽는다. */
export async function readAllQueryRows<T>(
  page: (from: number, to: number) => PromiseLike<QueryPage<T>>,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('조회 페이지 크기가 올바르지 않습니다.')
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) return rows
  }
}
