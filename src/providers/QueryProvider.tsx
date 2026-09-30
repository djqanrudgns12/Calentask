'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AppQueryClient } from '@/lib/queryDependencies'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new AppQueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            // Realtime 구독과 화면별 복귀 처리가 있으므로 포커스 시 전체 쿼리 폭주를 막는다.
            // 네트워크가 실제로 끊겼다가 복구된 경우에는 최신 데이터를 다시 가져온다.
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
