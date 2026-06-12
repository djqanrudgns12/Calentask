'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Calendar, Link2, Link2Off, Loader2, X } from 'lucide-react'
import { useSearchActivitiesForLinking, useLinkActivity, useUnlinkActivity } from '@/hooks/useInsightsQueries'
import { useDebounce } from '@/hooks/useDebounce'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface TemplateActivityLinkerProps {
  isOpen: boolean
  onClose: () => void
  templateId: string
  templateTitle: string
}

export default function TemplateActivityLinker({
  isOpen,
  onClose,
  templateId,
  templateTitle
}: TemplateActivityLinkerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showLinkedOnly, setShowLinkedOnly] = useState(false)
  const [localOptimisticLinks, setLocalOptimisticLinks] = useState<Record<string, boolean>>({})
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const { data: searchResults, isLoading } = useSearchActivitiesForLinking(
    isOpen ? templateId : null,
    debouncedSearchQuery,
    dateFrom || undefined,
    dateTo || undefined
  )
  const { mutate: linkActivity, isPending: isLinking } = useLinkActivity()
  const { mutate: unlinkActivity, isPending: isUnlinking } = useUnlinkActivity()

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return format(d, 'yyyy.MM.dd (EEE) HH:mm', { locale: ko })
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}분`
    if (m === 0) return `${h}시간`
    return `${h}시간 ${m}분`
  }

  const handleToggle = (activityId: string, isLinked: boolean, isDirectlyCreated: boolean) => {
    if (isDirectlyCreated) return
    const currentLinkedState = localOptimisticLinks[activityId] !== undefined ? localOptimisticLinks[activityId] : isLinked
    
    // 로컬 상태 즉시 업데이트 (가장 빠른 UI 피드백)
    setLocalOptimisticLinks(prev => ({ ...prev, [activityId]: !currentLinkedState }))

    if (currentLinkedState) {
      unlinkActivity({ templateId, activityId }, {
        onError: () => setLocalOptimisticLinks(prev => ({ ...prev, [activityId]: true }))
      })
    } else {
      linkActivity({ templateId, activityId }, {
        onError: () => setLocalOptimisticLinks(prev => ({ ...prev, [activityId]: false }))
      })
    }
  }

  const filteredResults = useMemo(() => {
    if (!searchResults) return []
    const withOptimistic = searchResults.map(act => ({
      ...act,
      isLinked: localOptimisticLinks[act.id] !== undefined ? localOptimisticLinks[act.id] : act.isLinked
    }))
    
    if (showLinkedOnly) {
      return withOptimistic.filter(act => act.isLinked || act.isDirectlyCreated)
    }
    return withOptimistic
  }, [searchResults, showLinkedOnly, localOptimisticLinks])

  const handleBulkLink = async () => {
    if (!filteredResults) return
    const toLink = filteredResults.filter(act => !act.isLinked && !act.isDirectlyCreated)
    
    const newLinks = { ...localOptimisticLinks }
    toLink.forEach(act => newLinks[act.id] = true)
    setLocalOptimisticLinks(newLinks)
    
    await Promise.all(toLink.map(act => linkActivity({ templateId, activityId: act.id })))
  }

  const handleBulkUnlink = async () => {
    if (!filteredResults) return
    const toUnlink = filteredResults.filter(act => act.isLinked && !act.isDirectlyCreated)
    
    const newLinks = { ...localOptimisticLinks }
    toUnlink.forEach(act => newLinks[act.id] = false)
    setLocalOptimisticLinks(newLinks)
    
    await Promise.all(toUnlink.map(act => unlinkActivity({ templateId, activityId: act.id })))
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 오버레이 — z-[300]으로 상세분석(z-[201]) 위에 표시 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[300]"
          />
          {/* 시트 — z-[301] */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 h-[85vh] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[80vh] md:rounded-3xl bg-white shadow-2xl z-[301] flex flex-col rounded-t-[28px] md:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  📎 일정 연결 관리
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  &apos;{templateTitle}&apos; 템플릿에 일정을 연결하여 통계에 반영합니다
                </p>
              </div>
              <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* 검색 필터 */}
            <div className="px-6 py-4 border-b border-gray-50 space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="일정 제목으로 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-gray-50 border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400 shrink-0" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="h-9 text-xs bg-gray-50 border-gray-200 rounded-lg"
                    placeholder="시작일"
                  />
                </div>
                <span className="text-gray-400 self-center text-xs">~</span>
                <div className="flex-1">
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="h-9 text-xs bg-gray-50 border-gray-200 rounded-lg"
                    placeholder="종료일"
                  />
                </div>
              </div>
            </div>

            {/* 액션 바 */}
            {searchResults && searchResults.length > 0 && (
              <div className="px-6 py-2 border-b border-gray-50 flex items-center justify-between shrink-0 bg-gray-50/50">
                <label className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowLinkedOnly(!showLinkedOnly)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showLinkedOnly ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300 group-hover:border-indigo-400'}`}>
                    {showLinkedOnly && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-[12px] font-bold text-gray-600 select-none">연결된 일정만 보기</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={handleBulkLink} disabled={isLinking} className="h-7 px-2.5 text-[11px] font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50">
                    모두 연결
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleBulkUnlink} disabled={isUnlinking} className="h-7 px-2.5 text-[11px] font-bold text-gray-500 hover:text-rose-600 hover:bg-rose-50">
                    모두 해제
                  </Button>
                </div>
              </div>
            )}

            {/* 검색 결과 */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  <span className="text-sm font-medium">검색 중...</span>
                </div>
              ) : !searchResults || searchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="mx-auto mb-3 text-gray-300" size={32} />
                  <p className="text-sm font-medium">검색 결과가 없습니다</p>
                  <p className="text-xs mt-1">검색어나 날짜 범위를 조정해보세요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResults.map((act) => {
                    const isChecked = act.isDirectlyCreated || act.isLinked
                    return (
                      <button
                        key={act.id}
                        type="button"
                        disabled={act.isDirectlyCreated}
                        onClick={() => handleToggle(act.id, act.isLinked, act.isDirectlyCreated)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                          isChecked 
                            ? 'bg-indigo-50/60 border-indigo-200 shadow-sm' 
                            : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                        } ${act.isDirectlyCreated ? 'opacity-80 cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                              isChecked 
                                ? 'bg-indigo-500 border-indigo-500' 
                                : 'border-gray-300 bg-white'
                            } ${act.isDirectlyCreated ? 'opacity-60' : ''}`}>
                              {isChecked && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-gray-900 truncate">{act.title}</span>
                              {act.isDirectlyCreated && (
                                <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-600 flex items-center gap-0.5">
                                  <Link2 size={9} />직접 생성
                                </span>
                              )}
                              {act.isLinked && !act.isDirectlyCreated && (
                                <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-600 flex items-center gap-0.5">
                                  <Link2 size={9} />수동 연결
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-medium space-y-0.5">
                              <div>{formatDateTime(act.startTime)} ~ {format(new Date(act.endTime), 'HH:mm')}</div>
                              <div className="text-gray-400">{formatDuration(act.durationMinutes)}</div>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 하단 */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white md:rounded-b-3xl">
              <Button
                onClick={onClose}
                className="w-full h-12 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm shadow-sm"
              >
                완료
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
