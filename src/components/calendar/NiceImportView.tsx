'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { parseNiceFile } from '@/lib/fileParser'
import { processNiceImport, getUploadHistory, UploadHistory } from '@/app/actions/niceImport'
import { format } from 'date-fns'

export function NiceImportView() {
  const [isUploading, setIsUploading] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [history, setHistory] = useState<UploadHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const data = await getUploadHistory()
      setHistory(data)
    } catch (err) {
      console.error('Failed to fetch upload history', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 5000)
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]

    setIsUploading(true)
    try {
      // 1. 브라우저 내 파일 파싱 (fileParser.ts)
      const { recordType, payloads } = await parseNiceFile(file)
      
      // 2. 서버 액션 호출 (niceImport.ts - Deduplication & Bulk Insert)
      const result = await processNiceImport(payloads, recordType, file.name)
      
      if (result.success) {
        showToast('success', `총 ${payloads.length}건 확인. ${result.addedCount}건 추가 완료. 아예 중복되는 복무는 제외하였습니다 (${result.dupCount}건).`)
        fetchHistory() // 이력 새로고침
      }
    } catch (error: any) {
      showToast('error', error.message || '파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }, [fetchHistory])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  })

  // 날짜별 이력 그룹화
  const groupedHistory = history.reduce((acc, curr) => {
    const date = format(new Date(curr.created_at), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(curr)
    return acc
  }, {} as Record<string, UploadHistory[]>)

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto py-8">
      {/* 타이틀 및 헤더 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">나이스 복무 불러오기</h2>
        <p className="text-sm text-slate-500 mt-2">
          나이스(NEIS)에서 다운로드한 '출장 목록' 또는 '근무상황목록' (CSV/XLSX) 파일을 업로드하세요.<br/>
          결재 완료된 건만 자동으로 캘린더에 연동되며 중복 데이터는 방지됩니다.
        </p>
      </div>

      {/* 업로드 존 (Dropzone) */}
      <div 
        {...getRootProps()} 
        className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer bg-white overflow-hidden
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-700 font-medium">데이터를 분석하고 업로드 중입니다...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center pointer-events-none">
            <UploadCloud className={`w-14 h-14 mb-4 ${isDragActive ? 'text-blue-500' : 'text-slate-400'}`} />
            <p className="text-lg font-semibold text-slate-700">
              클릭하거나 파일을 이곳에 드래그 앤 드롭
            </p>
            <p className="text-sm text-slate-500 mt-2">지원 확장자: .csv, .xlsx</p>
          </div>
        )}
      </div>

      {/* 커스텀 토스트 알림 */}
      {toastMessage && (
        <div className={`mt-6 p-4 rounded-xl flex items-center shadow-sm animate-in fade-in slide-in-from-bottom-4
          ${toastMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}
        `}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
          <span className="font-medium text-sm">{toastMessage.text}</span>
        </div>
      )}

      {/* 히스토리 리스트 */}
      <div className="mt-12 flex-1 flex flex-col min-h-0">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-slate-500" />
          업로드 이력
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-4 space-y-6">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              이력을 불러오는 중...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
              아직 업로드된 파일이 없습니다.
            </div>
          ) : (
            Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-sm text-slate-700">
                  {format(new Date(date), 'yyyy년 MM월 dd일')}
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs
                          ${item.record_type === '출장' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}
                        `}>
                          {item.record_type}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{item.file_name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(item.created_at), 'a hh:mm')} 업로드
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          +{item.added_count}건 추가됨
                        </span>
                        {item.duplicate_count > 0 && (
                          <span className="text-xs text-slate-400 mt-1">
                            (중복 {item.duplicate_count}건 제외)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
