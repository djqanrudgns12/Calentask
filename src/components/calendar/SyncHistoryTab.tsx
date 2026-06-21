'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSyncHistoryAction, cleanupSyncHistoryAction, clearSyncHistoryAction, deleteGoogleEventAction } from '@/app/actions/calendar'
import { RefreshCw, Trash2, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, Download, ArrowRightLeft, FolderTree, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

export function SyncHistoryTab() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ total: 0, week: 0, failed: 0, lastSync: null as Date | null })
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchHistory = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await getSyncHistoryAction()
      setHistory(data || [])
      
      // Calculate stats
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      let weekCount = 0
      let failCount = 0
      let last = null
      
      if (data && data.length > 0) {
        last = new Date(data[0].synced_at)
        data.forEach(item => {
          if (new Date(item.synced_at) >= oneWeekAgo) weekCount++
          if (item.status === 'FAILED' || item.action === 'ERROR') failCount++
        })
      }
      
      setStats({
        total: data?.length || 0,
        week: weekCount,
        failed: failCount,
        lastSync: last
      })
      
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
    
    const supabase = createClient()
    const channel = supabase.channel('history_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sync_history' }, payload => {
        setHistory(prev => [payload.new, ...prev].slice(0, 500))
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          week: prev.week + 1,
          failed: (payload.new.status === 'FAILED' || payload.new.action === 'ERROR') ? prev.failed + 1 : prev.failed,
          lastSync: new Date(payload.new.synced_at)
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchHistory])

  const handleCleanup = async () => {
    if (confirm('6개월이 지난 기록을 모두 정리하시겠습니까?')) {
      await cleanupSyncHistoryAction()
      fetchHistory()
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  // Group by latest state
  const getGroupedItems = () => {
    const latestPerActivity = new Map<string, any>()
    const otherLogs: any[] = [] // Logs not attached to a specific activity (e.g. batch)

    history.forEach(log => {
      if (log.activity_id) {
        if (!latestPerActivity.has(log.activity_id)) {
          latestPerActivity.set(log.activity_id, log)
        }
      } else {
        otherLogs.push(log)
      }
    })

    const groups: Record<string, { name: string, categories: Record<string, { name: string, items: any[] }> }> = {}

    Array.from(latestPerActivity.values()).forEach(item => {
      // Skip if the latest action was DELETED
      if (item.action === 'DELETED') return

      const calId = item.calendar_id || 'unknown'
      const calName = item.calendar_name || '알 수 없는 캘린더'
      const catId = item.category_id || 'unassigned'
      const catName = item.category_name || '미배정'

      if (!groups[calId]) {
        groups[calId] = { name: calName, categories: {} }
      }
      if (!groups[calId].categories[catId]) {
        groups[calId].categories[catId] = { name: catName, items: [] }
      }
      groups[calId].categories[catId].items.push(item)
    })

    return { groups, otherLogs }
  }

  const { groups, otherLogs } = getGroupedItems()

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelection = (activityId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(activityId)) next.delete(activityId)
      else next.add(activityId)
      return next
    })
  }

  const toggleAllInCategory = (catId: string, items: any[]) => {
    const allSelected = items.every(i => selectedItems.has(i.activity_id))
    setSelectedItems(prev => {
      const next = new Set(prev)
      items.forEach(i => {
        if (allSelected) next.delete(i.activity_id)
        else next.add(i.activity_id)
      })
      return next
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`선택한 ${selectedItems.size}개의 일정을 구글 캘린더에서 삭제하시겠습니까? (Calentask 일정은 삭제되지 않습니다)`)) return

    setIsDeleting(true)
    try {
      for (const id of Array.from(selectedItems)) {
        await deleteGoogleEventAction(id)
      }
      setSelectedItems(new Set())
      await fetchHistory()
    } catch (err) {
      console.error(err)
      alert('일부 일정 삭제에 실패했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedLog = history.find(h => h.id === selectedLogId)

  return (
    <div className="relative">
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      
      {/* 📊 동기화 요약 대시보드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold mb-1">총 동기화 기록</div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}건</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold mb-1">이번 주 (7일)</div>
          <div className="text-2xl font-bold text-indigo-600">+{stats.week}건</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold mb-1">실패/에러</div>
          <div className={`text-2xl font-bold ${stats.failed > 0 ? 'text-red-600' : 'text-emerald-500'}`}>
            {stats.failed}건
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold mb-1">마지막 동기화</div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {stats.lastSync ? formatTime(stats.lastSync.toISOString()) : '-'}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-2 rounded-xl border border-slate-200 gap-2">
        <div className="text-sm font-medium text-slate-600 px-2 flex items-center gap-2 w-full sm:w-auto">
          <Clock className="w-4 h-4" /> 최근 동기화 활동 요약
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="일정 이름 검색..." 
              className="h-8 pl-8 text-sm bg-white"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={refreshing} className="h-8 shrink-0">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">새로고침</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCleanup} className="h-8 text-slate-600 shrink-0">
            <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">기록 정리</span>
          </Button>
        </div>
      </div>

      {/* 🌲 그룹/카테고리 아코디언 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">동기화된 일정 목록</span>
            {selectedItems.size > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {selectedItems.size}개 선택됨
              </span>
            )}
          </div>
          {selectedItems.size > 0 && (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting} className="h-8 shadow-sm shadow-red-500/20">
              {isDeleting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              선택 항목 구글에서 삭제
            </Button>
          )}
        </div>
        
        <div className="p-2 space-y-1">
          {Object.entries(groups).length === 0 ? (
            <div className="p-8 text-center text-slate-500">현재 동기화 유지 중인 일정이 없습니다.</div>
          ) : (
            Object.entries(groups).map(([calId, group]) => {
              const isExpanded = expandedGroups.has(calId)
              const totalInGroup = Object.values(group.categories).reduce((acc, cat) => acc + cat.items.length, 0)
              
              return (
                <div key={calId} className="border border-slate-100 rounded-xl overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => toggleGroup(calId)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <CalendarIcon className="w-4 h-4 text-indigo-500" />
                      <span className="font-semibold text-slate-700">{group.name}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {totalInGroup}건
                    </span>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: 'auto' }} 
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-white border-t border-slate-100"
                      >
                        <div className="p-2 space-y-2">
                          {Object.entries(group.categories).map(([catId, cat]) => {
                            const isCatExpanded = expandedCategories.has(catId)
                            const allSelected = cat.items.length > 0 && cat.items.every(i => selectedItems.has(i.activity_id))
                            const someSelected = cat.items.some(i => selectedItems.has(i.activity_id))
                            
                            return (
                              <div key={catId} className="ml-4 border-l-2 border-slate-100 pl-3 py-1">
                                <div className="flex items-center gap-2 py-1.5 hover:bg-slate-50 rounded-lg px-2 group">
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox 
                                      checked={allSelected} 
                                      onCheckedChange={() => toggleAllInCategory(catId, cat.items)}
                                      className={someSelected && !allSelected ? "bg-indigo-100 border-indigo-300" : ""}
                                    />
                                  </div>
                                  <div 
                                    className="flex items-center gap-2 flex-1 cursor-pointer"
                                    onClick={() => toggleCategory(catId)}
                                  >
                                    <FolderTree className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium text-sm text-slate-700">{cat.name}</span>
                                    <span className="text-xs text-slate-400">({cat.items.length}건)</span>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => toggleCategory(catId)}>
                                    {isCatExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </Button>
                                </div>

                                <AnimatePresence>
                                  {isCatExpanded && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                      <div className="space-y-1 mt-1 pl-6">
                                        {cat.items.filter(item => item.activity_title?.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                                          <div 
                                            key={item.id} 
                                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${selectedLogId === item.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                            onClick={() => setSelectedLogId(item.id)}
                                          >
                                            <div onClick={(e) => e.stopPropagation()}>
                                              <Checkbox 
                                                checked={selectedItems.has(item.activity_id)}
                                                onCheckedChange={() => toggleSelection(item.activity_id)}
                                              />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-medium text-slate-700 truncate">{item.activity_title || '이름 없는 일정'}</div>
                                              <div className="text-xs text-slate-400">{formatTime(item.activity_start_time || item.synced_at)}</div>
                                            </div>
                                            <div className="shrink-0">
                                              {item.status === 'FAILED' ? (
                                                <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">실패</span>
                                              ) : item.action === 'UPDATED' ? (
                                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">수정됨</span>
                                              ) : (
                                                <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">동기화됨</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </div>
      </div>
      {/* 🕐 동기화 타임라인 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-6">
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-700">최근 동기화 활동 (전체 로깅)</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">데이터를 불러오는 중...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-500">동기화 이력이 없습니다.</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {history.filter(item => item.activity_title?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 100).map((item) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
                  onClick={() => setSelectedLogId(item.id)}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.action === 'CREATED' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {item.action === 'UPDATED' && <RefreshCw className="w-5 h-5 text-indigo-500" />}
                    {item.action === 'DELETED' && <Trash2 className="w-5 h-5 text-slate-400" />}
                    {item.action === 'ERROR' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                    {item.action === 'MIGRATED' && <ArrowRightLeft className="w-5 h-5 text-blue-500" />}
                    {item.action === 'BATCH_SYNC' && <CalendarIcon className="w-5 h-5 text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-800 truncate">
                        {item.activity_title || '이름 없는 활동'}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatTime(item.synced_at)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 font-medium">{item.action}</span>
                      {item.calendar_name && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" /> {item.calendar_name}
                        </span>
                      )}
                      {item.error_message && (
                        <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-md truncate max-w-[200px]" title={item.error_message}>
                          {item.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {history.length > 100 && (
              <div className="text-center text-xs text-slate-400 py-2">
                최근 100건만 표시됩니다. (총 {history.length}건 보관 중)
              </div>
            )}
          </div>
        )}
      </div>
      
    </motion.div>

    {/* Drawer (Slide Panel) */}
    <AnimatePresence>
      {selectedLog && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-slate-900/20 z-[60] backdrop-blur-sm rounded-2xl"
            onClick={() => setSelectedLogId(null)}
          />
          <motion.div 
            initial={{ x: '100%', opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-[380px] bg-white z-[70] rounded-r-2xl sm:rounded-2xl shadow-2xl border-l border-slate-200 overflow-y-auto flex flex-col"
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                상세 정보
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedLogId(null)} className="h-8 w-8 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
            
            <div className="p-6 flex-1 space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1">일정 제목</div>
                  <div className="text-base font-bold text-slate-800 break-words">{selectedLog.activity_title || '-'}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1">카테고리</div>
                    <div className="text-sm font-medium text-slate-700">{selectedLog.category_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1">대상 캘린더</div>
                    <div className="text-sm font-medium text-slate-700">{selectedLog.calendar_name || '-'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1">일정 시간 (스냅샷)</div>
                  <div className="text-sm font-medium text-slate-700">{selectedLog.activity_start_time ? formatTime(selectedLog.activity_start_time) : '-'}</div>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-4" />

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                  연동 정보
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">마지막 액션</span>
                    <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200">{selectedLog.action}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">상태</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${selectedLog.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {selectedLog.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">처리 일시</span>
                    <span className="text-xs font-medium text-slate-700">{formatTime(selectedLog.synced_at)}</span>
                  </div>
                  {selectedLog.google_event_id && (
                    <div className="pt-2 border-t border-slate-200/60 mt-2">
                      <span className="text-[10px] font-mono text-slate-400 break-all bg-white px-2 py-1 rounded border border-slate-100 block">
                        ID: {selectedLog.google_event_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-red-800 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> 에러 메시지
                  </h4>
                  <p className="text-xs text-red-600 break-words">{selectedLog.error_message}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 sticky bottom-0">
              <Button 
                variant="destructive" 
                className="w-full shadow-sm"
                onClick={async () => {
                  if (confirm('이 기록을 히스토리에서 영구 삭제하시겠습니까? (구글 캘린더 일정 자체는 삭제되지 않습니다)')) {
                    await clearSyncHistoryAction([selectedLog.id])
                    setSelectedLogId(null)
                    fetchHistory()
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                이 로그 기록 삭제
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </div>
  )
}
