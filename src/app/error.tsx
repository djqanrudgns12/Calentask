'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 text-slate-900 font-sans p-4">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center space-y-6">
        <h2 className="text-2xl font-bold text-red-600">오류가 발생했습니다</h2>
        <p className="text-gray-600 text-sm">
          {error.message || '데이터를 불러오는 중 문제가 발생했습니다.'}
        </p>
        <div className="flex justify-center space-x-4">
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            다시 시도
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
