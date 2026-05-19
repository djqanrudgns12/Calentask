'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { UploadCloud } from 'lucide-react'
import { useCreateActivity } from '@/hooks/useCalendarQueries'
import { startOfMonth, endOfMonth } from 'date-fns'

export function CsvUploader() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

  const currentMonthStart = startOfMonth(new Date()).toISOString()
  const currentMonthEnd = endOfMonth(new Date()).toISOString()
  
  const { mutateAsync: createActivity } = useCreateActivity(currentMonthStart, currentMonthEnd)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setStatus('uploading')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // NEIS CSV 구조 가정: 제목(일정명), 시작일자, 종료일자, 내용 등
          const rows = results.data as any[]
          
          for (const row of rows) {
            // CSV 헤더 이름에 따라 매핑 수정 필요 (예: row['일정명'], row['시작일'])
            const title = row['일정명'] || row['제목'] || '새 일정'
            const startDate = row['시작일'] || row['날짜'] || new Date().toISOString()
            const endDate = row['종료일'] || row['날짜'] || startDate
            const memo = row['내용'] || row['비고'] || ''

            // 임시로 UTC 변환
            const startStr = new Date(`${startDate}T09:00:00Z`).toISOString()
            const endStr = new Date(`${endDate}T10:00:00Z`).toISOString()

            await createActivity({
              payload: {
                title,
                start_time: startStr,
                end_time: endStr,
                is_all_day: true,
                type: 'EVENT',
                memo
              },
              categoryIds: [] // 임시: 업로드 전용 NEIS 카테고리로 묶을 수도 있음
            })
          }
          setStatus('done')
          setTimeout(() => {
            setOpen(false)
            setStatus('idle')
          }, 2000)
        } catch (err) {
          setStatus('error')
        }
      },
      error: () => {
        setStatus('error')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error DialogTrigger asChild typing issue */}
      <DialogTrigger asChild>
        <Button variant="outline" className="text-sm font-medium border-gray-300">
          <UploadCloud className="w-4 h-4 mr-2" />
          CSV 가져오기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>일정 데이터 가져오기 (CSV)</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mt-4">
          <UploadCloud className="w-10 h-10 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-4 text-center">
            NEIS 또는 다른 시스템에서 다운로드한 CSV 파일을 업로드하세요.<br/>
            (지원 헤더: 일정명, 시작일, 종료일, 내용)
          </p>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
            disabled={status === 'uploading'}
          />
          <label 
            htmlFor="csv-upload"
            className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {status === 'uploading' ? '업로드 중...' : status === 'done' ? '업로드 완료!' : '파일 선택'}
          </label>
        </div>
      </DialogContent>
    </Dialog>
  )
}
