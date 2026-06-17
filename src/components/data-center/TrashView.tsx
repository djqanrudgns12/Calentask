'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, RefreshCcw, Loader2, AlertCircle, Calendar, CheckSquare, FileText, Heart, Link2, Filter } from 'lucide-react'
import { useDataHub, type TrashItem, type TrashItemType } from '@/hooks/useDataHub'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

const TYPE_CONFIG: Record<TrashItemType, { label: string; icon: typeof Calendar; color: string; bgColor: string }> = {
  calendar: { label: '캘린더', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  agenda: { label: '아젠다', icon: CheckSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  archive: { label: '아카이브', icon: FileText, color: 'text-violet-600', bgColor: 'bg-violet-50' },
  anniversary: { label: '기념일', icon: Heart, color: 'text-rose-600', bgColor: 'bg-rose-50' },
  link: { label: '링크', icon: Link2, color: 'text-amber-600', bgColor: 'bg-amber-50' },
}

export function TrashView() {
  const {
    trashItems,
    isLoading,
    handleRestore,
    isRestoring,
    handleHardDelete,
    isHardDeleting,
    handleEmptyTrash,
    isEmptyingTrash,
    cleanupExpiredItems,
  } = useDataHub()

  const [activeFilter, setActiveFilter] = useState<TrashItemType | 'all'>('all')

  // 앱 진입 시 30일 초과 항목 자동 정리
  useEffect(() => {
    cleanupExpiredItems(30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredItems = activeFilter === 'all' 
    ? trashItems 
    : trashItems.filter(item => item.type === activeFilter)

  // 각 타입별 개수
  const typeCounts = trashItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const getDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt)
    const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const remaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return Math.max(0, remaining)
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-xl md:rounded-3xl overflow-hidden shadow-sm border border-border">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full">

          {/* 30일 만료 안내 배너 */}
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              삭제된 항목은 <strong>30일 후 자동으로 영구 삭제</strong>됩니다.
            </p>
          </div>

          {/* 메인 섹션 */}
          <section className="flex-1 flex flex-col min-h-0 bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            
            {/* 헤더 */}
            <div className="p-4 md:p-6 border-b border-border bg-muted/50 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-lg font-bold text-foreground">보관된 항목 ({trashItems.length})</h3>
                </div>
                
                {trashItems.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={handleEmptyTrash}
                    disabled={isEmptyingTrash}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 rounded-xl"
                  >
                    {isEmptyingTrash ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    휴지통 비우기
                  </Button>
                )}
              </div>

              {/* 필터 탭 */}
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    activeFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-md dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-background text-foreground hover:bg-muted border border-border'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  전체 ({trashItems.length})
                </button>
                {(Object.entries(TYPE_CONFIG) as [TrashItemType, typeof TYPE_CONFIG[TrashItemType]][]).map(([type, config]) => {
                  const count = typeCounts[type] || 0
                  if (count === 0) return null
                  const Icon = config.icon
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveFilter(type)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        activeFilter === type
                          ? `${config.bgColor} ${config.color} shadow-md`
                          : 'bg-background text-foreground hover:bg-muted border border-border'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label} ({count})
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* 목록 */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-4" />
                  <p className="text-muted-foreground font-medium">데이터를 불러오는 중...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
                    <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-1">
                    {activeFilter === 'all' ? '휴지통이 비어있습니다.' : `${TYPE_CONFIG[activeFilter]?.label} 항목이 없습니다.`}
                  </p>
                  <p className="text-sm text-muted-foreground">삭제된 항목이 이곳에 안전하게 보관됩니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredItems.map(item => {
                    const config = TYPE_CONFIG[item.type]
                    const Icon = config.icon
                    const daysRemaining = getDaysRemaining(item.deletedAt)
                    
                    return (
                      <div key={`${item.type}-${item.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm hover:border-slate-300 hover:shadow-md transition-all group gap-4">
                        <div className="flex items-start gap-3 overflow-hidden flex-1">
                          {/* 타입 아이콘 */}
                          <div className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          
                          <div className="flex flex-col overflow-hidden flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                                {config.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {daysRemaining}일 후 영구 삭제
                              </span>
                            </div>
                            <span className="text-base font-bold text-foreground truncate">{item.title}</span>
                            {item.subtitle && (
                              <span className="text-sm font-medium text-muted-foreground truncate">
                                {item.subtitle}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground/70 mt-0.5">
                              {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true, locale: ko })} 삭제됨
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity shrink-0">
                          <Button 
                            variant="outline" 
                            onClick={() => handleRestore(item)}
                            disabled={isRestoring}
                            className="flex-1 sm:flex-none h-10 px-4 text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-lg font-semibold"
                          >
                            <RefreshCcw className="w-4 h-4 mr-2 sm:mr-0" />
                            <span className="sm:hidden">복구</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => handleHardDelete(item)}
                            disabled={isHardDeleting}
                            className="flex-1 sm:flex-none h-10 px-4 text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg font-semibold"
                          >
                            <Trash2 className="w-4 h-4 mr-2 sm:mr-0" />
                            <span className="sm:hidden">영구 삭제</span>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
