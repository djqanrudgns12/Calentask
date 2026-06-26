'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            // 다른 기기/탭에서 작업 후 이 창으로 돌아오거나 네트워크가 복구되면
            // (staleTime이 지난) 데이터를 자동으로 다시 가져와 수동 새로고침 부담을 줄인다.
            refetchOnWindowFocus: true,
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
