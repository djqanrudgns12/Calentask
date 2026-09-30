'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { isChunkLoadError } from '@/lib/chunkLoadError'
import { reloadAppResources } from '@/lib/pwaResources'

export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const chunkFailed = isChunkLoadError(error)
  const [reloading, setReloading] = useState(false)
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-muted text-foreground font-sans p-4">
      <div className="bg-card p-8 rounded-xl shadow-md max-w-md w-full text-center space-y-6">
        <h2 className="text-2xl font-bold text-red-600">{chunkFailed ? '화면을 불러오지 못했습니다' : '오류가 발생했습니다'}</h2>
        <p className="text-foreground text-sm">
          {chunkFailed ? '연결을 확인한 뒤 최신 화면을 다시 불러와 주세요.' : error.message || '데이터를 불러오는 중 문제가 발생했습니다.'}
        </p>
        <div className="flex justify-center space-x-4">
          <Button
            disabled={reloading}
            onClick={() => {
              if (chunkFailed) {
                setReloading(true)
                void reloadAppResources()
              } else {
                unstable_retry()
              }
            }}
          >
            {reloading ? '불러오는 중…' : chunkFailed ? '다시 불러오기' : '다시 시도'}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            홈으로 이동
          </Button>
        </div>
      </div>
    </div>
  )
}
