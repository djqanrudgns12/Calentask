'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQueryClient } from '@tanstack/react-query'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Trash2, AlertTriangle, ClipboardList, CalendarX2, ChevronDown } from 'lucide-react'
import { parseNiceFile } from '@/lib/fileParser'
import { processNiceImport, getUploadHistory, deleteUploadHistoryOnly, deleteUploadHistoryWithActivities, UploadHistory } from '@/app/actions/niceImport'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function NiceImportView() {
  // 업로드 성공 시 카테고리 필터/캘린더 캐시를 갱신하기 위해 queryClient 사용
  const queryClient = useQueryClient()
  const [isUploading, setIsUploading] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [history, setHistory] = useState<UploadHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  // Phase 3: 삭제 경고 다이얼로그 상태
  const [deleteTarget, setDeleteTarget] = useState<UploadHistory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  // Phase 4: 미리보기 아코디언 토글 — 어떤 이력 항목이 펌쳐져 있는지 추적
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        // 서버에서 '출장'/'근무상황' 카테고리가 새로 생성되었을 수 있으므로 카테고리 필터 캐시 갱신
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        // 새 일정이 추가되었으므로 캘린더 데이터도 즉시 반영
        queryClient.invalidateQueries({ queryKey: ['activities'] })
      }
    } catch (error: unknown) {
      const err = error as Error
      showToast('error', err.message || '파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }, [fetchHistory, queryClient])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  })

  // Phase 3: 삭제 처리 핸들러 (이력만 / 이력+일정)
  const handleDelete = async (mode: 'history-only' | 'with-activities') => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    try {
      if (mode === 'history-only') {
        await deleteUploadHistoryOnly(deleteTarget.id)
        showToast('success', `"${deleteTarget.file_name}" 이력이 삭제되었습니다.`)
      } else {
        await deleteUploadHistoryWithActivities(deleteTarget.id)
        showToast('success', `"${deleteTarget.file_name}" 이력 및 ${deleteTarget.added_count}건의 일정이 휴지통으로 이동되었습니다.`)
        // 일정이 삭제되었으므로 캘린더 캐시도 갱신
        queryClient.invalidateQueries({ queryKey: ['activities'] })
      }
      fetchHistory()
    } catch (error: unknown) {
      const err = error as Error
      showToast('error', err.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  // 날짜별 이력 그룹화
  const groupedHistory = history.reduce((acc, curr) => {
    const date = format(new Date(curr.created_at), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(curr)
    return acc
  }, {} as Record<string, UploadHistory[]>)

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto py-8">
      {/* 업로드 존 (Dropzone) */}
      <div 
        {...getRootProps()} 
        className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer bg-card overflow-hidden
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-muted'}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-foreground font-medium">데이터를 분석하고 업로드 중입니다...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center pointer-events-none">
            <UploadCloud className={`w-14 h-14 mb-4 ${isDragActive ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <p className="text-lg font-semibold text-foreground">
              클릭하거나 파일을 이곳에 드래그 앤 드롭
            </p>
            <p className="text-sm text-muted-foreground mt-2">지원 확장자: .csv, .xlsx</p>
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
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-muted-foreground" />
          업로드 이력
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-4 space-y-6">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              이력을 불러오는 중...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-card rounded-xl border border-border border-dashed">
              아직 업로드된 파일이 없습니다.
            </div>
          ) : (
            Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="bg-muted px-4 py-2 border-b border-border font-semibold text-sm text-foreground">
                  {format(new Date(date), 'yyyy년 MM월 dd일')}
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const isExpanded = expandedIds.has(item.id)
                    const hasPreview = item.added_items && item.added_items.length > 0

                    return (
                      <div key={item.id}>
                        <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                          <div className="flex items-center space-x-4">
                            <div className={`h-10 px-2 min-w-[2.5rem] rounded-lg flex items-center justify-center font-bold text-xs whitespace-nowrap
                              ${item.record_type === '출장' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}
                            `}>
                              {item.record_type}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{item.file_name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(item.created_at), 'a hh:mm')} 업로드
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right flex flex-col items-end">
                              {/* Phase 4: 배지를 클릭 가능한 토글 버튼으로 변경 */}
                              <button
                                onClick={() => hasPreview && toggleExpand(item.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors
                                  ${hasPreview 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer' 
                                    : 'bg-green-100 text-green-800 cursor-default'}
                                `}
                              >
                                +{item.added_count}건 추가됨
                                {hasPreview && (
                                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                              {item.duplicate_count > 0 && (
                                <span className="text-xs text-muted-foreground mt-1">
                                  (중복 {item.duplicate_count}건 제외)
                                </span>
                              )}
                            </div>
                            {/* Phase 3: 삭제 버튼 */}
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="p-2 text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Phase 4: 미리보기 아코디언 패널 */}
                        {isExpanded && hasPreview && (
                          <div className="px-4 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="bg-muted rounded-xl border border-border overflow-hidden">
                              {/* 패널 헤더 */}
                              <div className="px-3 py-2 bg-muted/80 border-b border-border flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">
                                  📋 추가된 일정 미리보기
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.added_items.length}건
                                </span>
                              </div>
                              {/* 일정 목록 (최대 200px 스크롤) */}
                              <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-100">
                                {item.added_items.map((entry, idx) => (
                                  <div key={idx} className="px-3 py-2.5 flex items-center justify-between hover:bg-card/60 transition-colors">
                                    <span className="text-sm text-foreground font-medium truncate max-w-[55%]">
                                      {entry.title}
                                    </span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                                      {format(new Date(entry.start_time), 'MM/dd HH:mm')} ~ {format(new Date(entry.end_time), 'HH:mm')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Phase 3: 삭제 경고 다이얼로그 (3지선다: 이력만 / 이력+일정 / 취소) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl" showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              업로드 이력 삭제
            </DialogTitle>
            <DialogDescription>
              <strong>&quot;{deleteTarget?.file_name}&quot;</strong>을(를) 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2">
            {/* 옵션 1: 이력만 삭제 */}
            <button
              onClick={() => handleDelete('history-only')}
              disabled={isDeleting}
              className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-slate-300 hover:bg-muted text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardList className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-foreground">이력만 삭제</p>
                <p className="text-xs text-muted-foreground mt-1">업로드 기록만 제거합니다. 추가된 일정은 캘린더에 유지됩니다.</p>
              </div>
            </button>

            {/* 옵션 2: 해당 일정까지 삭제 */}
            <button
              onClick={() => handleDelete('with-activities')}
              disabled={isDeleting}
              className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarX2 className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-rose-700">해당 일정까지 삭제</p>
                <p className="text-xs text-muted-foreground mt-1">
                  이 업로드로 추가된 {deleteTarget?.added_count}건의 일정도 함께 삭제합니다.
                  <span className="block text-amber-600 mt-0.5">휴지통에서 복구할 수 있습니다.</span>
                </p>
              </div>
            </button>
          </div>

          {/* 삭제 중 로딩 표시 */}
          {isDeleting && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              삭제 중...
            </div>
          )}

          {/* 취소 버튼 */}
          <div className="flex justify-center mt-1">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-foreground"
            >
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
