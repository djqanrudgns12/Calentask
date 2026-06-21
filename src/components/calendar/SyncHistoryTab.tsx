'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  getSyncedActivitiesTreeAction, 
  getCleanedSyncTimelineAction, 
  deleteGoogleEventAction, 
  unlinkGoogleEventAction, 
  cleanupSyncHistoryAction 
} from '@/app/actions/calendar'
import { 
  RefreshCw, Trash2, Calendar as CalendarIcon, Clock, 
  CheckCircle2, ChevronRight, FolderTree, 
  X, Search, Link2Off, AlertCircle, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

// Interfaces
interface Activity {
  id: string
  title: string
  startTime: string
  googleEventId: string
}
interface Category {
  categoryName: string
  activities: Activity[]
}
interface CalendarGroup {
  calendarName: string
  calendarColor: string
  categories: { [categoryId: string]: Category }
}
interface SyncedTree {
  [calendarId: string]: CalendarGroup
}
interface TimelineLog {
  id: string
  syncedAt: string
  icon: string
  type: string
  title: string
  message: string
  isError: boolean
  rawAction: string
}

export function SyncHistoryTab() {
  // Data States
  const [tree, setTree] = useState<SyncedTree>({})
  const [timeline, setTimeline] = useState<TimelineLog[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // UI States
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileTab, setMobileTab] = useState<'tree' | 'timeline'>('tree')
  
  // Accordion States
  const [expandedCals, setExpandedCals] = useState<Set<string>>(new Set())
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  
  // Selection & Action States
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  // Drawer State
  const [selectedItem, setSelectedItem] = useState<{ activity: Activity, calId: string, calName: string, catId: string, catName: string } | null>(null)

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [treeData, timelineData] = await Promise.all([
        getSyncedActivitiesTreeAction(),
        getCleanedSyncTimelineAction()
      ])
      setTree(treeData as SyncedTree)
      setTimeline(timelineData as TimelineLog[])
      
      // Auto expand first calendar and category
      const cals = Object.keys(treeData)
      if (cals.length > 0) {
        setExpandedCals(new Set([cals[0]]))
        const cats = Object.keys((treeData as SyncedTree)[cals[0]].categories)
        if (cats.length > 0) {
          setExpandedCats(new Set([`${cals[0]}_${cats[0]}`]))
        }
      }
    } catch (error) {
      console.error('Failed to fetch history data:', error)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const supabase = createClient()
    const channel = supabase.channel('sync_history_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_history' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const handleToggleCal = (calId: string) => {
    setExpandedCals(prev => {
      const next = new Set(prev)
      if (next.has(calId)) next.delete(calId)
      else next.add(calId)
      return next
    })
  }

  const handleToggleCat = (key: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelection = (actId: string) => {
    setSelectedActivities(prev => {
      const next = new Set(prev)
      if (next.has(actId)) next.delete(actId)
      else next.add(actId)
      return next
    })
  }

  const handleBatchDeleteFromGoogle = async () => {
    if (selectedActivities.size === 0 || isProcessing) return
    if (!confirm(`선택한 ${selectedActivities.size}개의 일정을 구글 캘린더에서 영구 삭제하시겠습니까? (Calentask 일정은 보존됩니다)`)) return

    setIsProcessing(true)
    try {
      await Promise.all(Array.from(selectedActivities).map(id => deleteGoogleEventAction(id)))
      setSelectedActivities(new Set())
      await fetchData()
    } catch (error) {
      console.error('Failed to batch delete:', error)
      alert('일부 일정 삭제에 실패했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchUnlink = async () => {
    if (selectedActivities.size === 0 || isProcessing) return
    if (!confirm(`선택한 ${selectedActivities.size}개의 일정에 대한 연동을 해제하시겠습니까? (구글 캘린더에는 일정이 그대로 남습니다)`)) return

    setIsProcessing(true)
    try {
      await Promise.all(Array.from(selectedActivities).map(id => unlinkGoogleEventAction(id)))
      setSelectedActivities(new Set())
      await fetchData()
    } catch (error) {
      console.error('Failed to batch unlink:', error)
      alert('일부 일정 연동 해제에 실패했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCleanupTimeline = async () => {
    if (!confirm('6개월 이상 경과한 로깅 기록을 모두 정리하시겠습니까? (실제 동기화된 일정에는 영향을 주지 않습니다)')) return
    setIsProcessing(true)
    try {
      await cleanupSyncHistoryAction()
      await fetchData()
    } catch (error) {
      console.error('Failed to cleanup:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree
    const query = searchQuery.toLowerCase()
    const result: SyncedTree = {}
    
    for (const [calId, calGroup] of Object.entries(tree)) {
      const filteredCategories: { [categoryId: string]: Category } = {}
      let hasMatch = false

      for (const [catId, catGroup] of Object.entries(calGroup.categories)) {
        const matchedActs = catGroup.activities.filter(a => a.title.toLowerCase().includes(query))
        const catMatch = catGroup.categoryName.toLowerCase().includes(query)
        
        if (matchedActs.length > 0 || catMatch) {
          filteredCategories[catId] = {
            ...catGroup,
            activities: catMatch ? catGroup.activities : matchedActs
          }
          hasMatch = true
        }
      }

      if (hasMatch) {
        result[calId] = { ...calGroup, categories: filteredCategories }
      }
    }
    return result
  }, [tree, searchQuery])

  const totalSynced = Object.values(tree).reduce((acc, cal) => 
    acc + Object.values(cal.categories).reduce((sum, cat) => sum + cat.activities.length, 0)
  , 0)

  const thisWeekLogs = timeline.filter(t => new Date(t.syncedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length
  const errorLogs = timeline.filter(t => t.isError).length

  // Date Grouping for Timeline
  const groupedTimeline = useMemo(() => {
    const groups: { [date: string]: TimelineLog[] } = {}
    timeline.forEach(log => {
      const d = new Date(log.syncedAt)
      const isToday = new Date().toDateString() === d.toDateString()
      const isYesterday = new Date(Date.now() - 86400000).toDateString() === d.toDateString()
      let dateKey = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
      if (isToday) dateKey = '오늘'
      else if (isYesterday) dateKey = '어제'
      
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(log)
    })
    return groups
  }, [timeline])

  return (
    <div className="flex flex-col h-[700px] md:h-[600px] bg-slate-50/50 relative rounded-b-2xl overflow-hidden border border-slate-200">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-6 border-b border-slate-200/60 bg-white/60 backdrop-blur-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-inner border border-white/50">
              <RefreshCw className="w-5 h-5 text-indigo-600" />
            </span>
            구글 연동 히스토리 센터
          </h2>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3 ml-1 text-xs md:text-sm font-medium">
            <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm">
              현재 연동: {totalSynced}건
            </span>
            <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 shadow-sm">
              금주 업데이트: {thisWeekLogs}건
            </span>
            {errorLogs > 0 && (
              <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 shadow-sm animate-pulse">
                에러: {errorLogs}건
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 mt-4 md:mt-0 self-end md:self-auto">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing} className="bg-white/80 backdrop-blur-sm shadow-sm border-slate-200 text-slate-600 h-9">
            <RefreshCw className={`w-3.5 h-3.5 md:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">새로고침</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCleanupTimeline} disabled={isProcessing} className="bg-white/80 backdrop-blur-sm shadow-sm border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9">
            <Trash2 className="w-3.5 h-3.5 md:mr-2" />
            <span className="hidden md:inline">오래된 로그 정리</span>
          </Button>
        </div>
      </div>

      {/* Mobile Tab Toggle */}
      <div className="md:hidden flex p-3 bg-white/60 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full shadow-inner">
          <button 
            className={`flex-1 py-1.5 text-sm font-extrabold rounded-lg transition-all ${mobileTab === 'tree' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setMobileTab('tree')}
          >
            🌲 연동된 일정
          </button>
          <button 
            className={`flex-1 py-1.5 text-sm font-extrabold rounded-lg transition-all ${mobileTab === 'timeline' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setMobileTab('timeline')}
          >
            ⚡ 최근 업데이트
          </button>
        </div>
      </div>

      {/* 2-Column Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Panel: Active Sync Tree (60%) */}
        <div className={`w-full md:w-[60%] flex flex-col border-r border-slate-200/60 bg-white/40 ${mobileTab === 'tree' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-3 md:p-4 border-b border-slate-200/50 bg-white/60 backdrop-blur-md sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="일정 이름 또는 카테고리 검색..." 
                className="pl-9 h-10 bg-white/80 shadow-sm border-slate-200/80 rounded-xl transition-all focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 custom-scrollbar pb-24 md:pb-4">
            {Object.keys(filteredTree).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <FolderTree className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-bold">연동된 일정이 없습니다.</p>
              </div>
            ) : (
              Object.entries(filteredTree).map(([calId, calGroup]) => {
                const isCalExpanded = expandedCals.has(calId)
                const calActCount = Object.values(calGroup.categories).reduce((sum, c) => sum + c.activities.length, 0)
                
                return (
                  <div key={calId} className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)]">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                      onClick={() => handleToggleCal(calId)}
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isCalExpanded ? 'rotate-90' : ''}`} />
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                          <CalendarIcon className="w-4 h-4 text-indigo-500" />
                        </div>
                        <h4 className="font-extrabold text-slate-800">{calGroup.calendarName}</h4>
                      </div>
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200/60 shadow-inner">{calActCount}건</span>
                    </div>
                    
                    <AnimatePresence>
                      {isCalExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }} 
                          className="overflow-hidden border-t border-slate-100/80"
                        >
                          <div className="p-2 md:p-3 space-y-2 bg-slate-50/50">
                            {Object.entries(calGroup.categories).map(([catId, catGroup]) => {
                              const catKey = `${calId}_${catId}`
                              const isCatExpanded = expandedCats.has(catKey)
                              
                              return (
                                <div key={catKey} className="rounded-xl overflow-hidden bg-white/60 border border-slate-200/40">
                                  <div 
                                    className="flex items-center justify-between p-3 hover:bg-slate-100/80 rounded-lg cursor-pointer transition-colors"
                                    onClick={() => handleToggleCat(catKey)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isCatExpanded ? 'rotate-90' : ''}`} />
                                      <FolderTree className="w-4 h-4 text-emerald-500" />
                                      <h5 className="font-bold text-sm text-slate-700">{catGroup.categoryName}</h5>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{catGroup.activities.length}건</span>
                                  </div>
                                  
                                  <AnimatePresence>
                                    {isCatExpanded && (
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }} 
                                        animate={{ height: 'auto', opacity: 1 }} 
                                        exit={{ height: 0, opacity: 0 }} 
                                        className="overflow-hidden"
                                      >
                                        <div className="px-2 pb-2 space-y-1.5">
                                          {catGroup.activities.map(act => (
                                            <div 
                                              key={act.id} 
                                              className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                                                selectedActivities.has(act.id) 
                                                  ? 'bg-indigo-50/80 border-indigo-200 shadow-[0_2px_10px_-4px_rgba(99,102,241,0.2)]' 
                                                  : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
                                              }`}
                                              onClick={() => setSelectedItem({ activity: act, calId, calName: calGroup.calendarName, catId, catName: catGroup.categoryName })}
                                            >
                                              <div 
                                                onClick={(e) => { e.stopPropagation(); toggleSelection(act.id); }} 
                                                className="p-2 -m-2 rounded-full hover:bg-slate-100 transition-colors shrink-0"
                                              >
                                                <Checkbox checked={selectedActivities.has(act.id)} className="data-[state=checked]:bg-indigo-600 rounded-sm w-4 h-4 md:w-5 md:h-5" />
                                              </div>
                                              <div className="flex-1 min-w-0 pr-2">
                                                <p className="text-sm font-extrabold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{act.title}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                  <Clock className="w-3 h-3 text-slate-400" />
                                                  <span className="text-xs text-slate-500 font-medium">
                                                    {new Date(act.startTime).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="shrink-0 hidden md:block">
                                                <span className="flex items-center text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1.5 rounded-lg border border-emerald-100 shadow-sm uppercase tracking-wider">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                                                  SYNCED
                                                </span>
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

        {/* Right Panel: Live Sync Stream (40%) */}
        <div className={`w-full md:w-[40%] flex flex-col bg-slate-50/30 ${mobileTab === 'timeline' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-3 md:p-4 border-b border-slate-200/50 bg-white/60 backdrop-blur-md sticky top-0 z-10 flex items-center gap-2 h-auto md:h-[73px]">
            <Clock className="w-5 h-5 text-slate-500" />
            <h3 className="font-extrabold text-slate-800 text-sm md:text-base">라이브 타임라인</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6 custom-scrollbar pb-24 md:pb-4">
            {Object.keys(groupedTimeline).length === 0 ? (
              <div className="text-center text-slate-400 mt-10 font-bold text-sm">최근 동기화 기록이 없습니다.</div>
            ) : (
              Object.entries(groupedTimeline).map(([date, logs]) => (
                <div key={date}>
                  <h4 className="text-[11px] md:text-xs font-extrabold text-slate-400 mb-3 px-2 flex items-center gap-2 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    {date}
                  </h4>
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`group flex gap-3 p-3.5 md:p-4 rounded-2xl border bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
                          log.isError ? 'border-rose-200 bg-rose-50/50 hover:border-rose-300' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner border ${
                          log.isError ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className="text-base md:text-lg">{log.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5 md:pt-1">
                          <h5 className={`text-sm md:text-sm font-extrabold truncate ${log.isError ? 'text-rose-800' : 'text-slate-800'}`}>
                            {log.title}
                          </h5>
                          {log.message && (
                            <p className="text-[11px] md:text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium break-words">
                              {log.message}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 font-bold mt-2">
                            {new Date(log.syncedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Floating Action Bar */}
        <AnimatePresence>
          {selectedActivities.size > 0 && (
            <motion.div 
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[90%] md:w-auto min-w-[320px]"
            >
              <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 p-2.5 md:p-3 rounded-2xl md:rounded-[1.25rem] shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
                <div className="flex items-center gap-3 px-2 w-full md:w-auto justify-between md:justify-start">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-xs md:text-sm font-extrabold shadow-inner border border-indigo-300/50">
                      {selectedActivities.size}
                    </span>
                    <span className="text-sm font-extrabold text-slate-200">항목 선택됨</span>
                  </div>
                  <button onClick={() => setSelectedActivities(new Set())} className="md:hidden p-1 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBatchUnlink}
                    disabled={isProcessing}
                    className="flex-1 md:flex-none text-slate-300 hover:text-white hover:bg-slate-800 font-bold h-10 md:h-9"
                  >
                    <Link2Off className="w-4 h-4 mr-1.5 md:mr-2" />
                    연동 해제
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleBatchDeleteFromGoogle}
                    disabled={isProcessing}
                    className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 shadow-md font-bold h-10 md:h-9"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5 md:mr-2" />
                    구글 캘린더에서 삭제
                  </Button>
                  <button onClick={() => setSelectedActivities(new Set())} className="hidden md:flex p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors ml-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail Drawer (Bottom Sheet on Mobile, Right Panel on Desktop) */}
        <AnimatePresence>
          {selectedItem && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                onClick={() => setSelectedItem(null)}
              />
              {/* Drawer Container */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute bottom-0 md:bottom-auto md:top-0 md:right-0 w-full md:w-[420px] h-[85vh] md:h-full bg-white/95 backdrop-blur-2xl shadow-[-10px_0_40px_rgba(0,0,0,0.1)] z-50 flex flex-col rounded-t-[2rem] md:rounded-none border-t md:border-l border-slate-200/60 overflow-hidden"
              >
                {/* Mobile Handle */}
                <div className="w-full flex justify-center pt-4 pb-2 md:hidden">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>

                <div className="p-5 md:p-6 flex items-center justify-between border-b border-slate-100/80 bg-white/50">
                  <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">일정 상세 연동 정보</h3>
                  <button onClick={() => setSelectedItem(null)} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-8 custom-scrollbar">
                  {/* Title & Status */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/80 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-snug break-words pr-2">
                      {selectedItem.activity.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-4">
                      <span className="flex items-center text-xs bg-emerald-100/50 text-emerald-700 font-bold px-3 py-1.5 rounded-lg border border-emerald-200/60 shadow-sm uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                        현재 정상 연동 중
                      </span>
                    </div>
                  </div>

                  {/* Breadcrumbs Path */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pl-1">연동된 경로</h4>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 relative">
                      <div className="absolute left-7 top-9 bottom-9 w-0.5 bg-slate-100"></div>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                          <CalendarIcon className="w-4 h-4 text-indigo-500" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-800 truncate">{selectedItem.calName}</span>
                      </div>
                      <div className="flex items-center gap-3 relative z-10 pl-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
                          <FolderTree className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-700 truncate">{selectedItem.catName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="space-y-1 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex justify-between items-center p-4 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><Clock className="w-4 h-4" /> 일정 시작 시각</span>
                      <span className="text-sm font-extrabold text-slate-800">
                        {new Date(selectedItem.activity.startTime).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4">
                      <span className="text-sm font-bold text-slate-500">Google Event ID</span>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded-md text-slate-600 max-w-[150px] md:max-w-[180px] truncate" title={selectedItem.activity.googleEventId}>
                        {selectedItem.activity.googleEventId}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-3 pb-8 md:pb-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1 bg-white border-slate-300 hover:bg-slate-50 text-slate-700 font-bold h-12 md:h-10 text-base md:text-sm"
                        disabled={isProcessing}
                        onClick={async () => {
                          if (!confirm('이 일정의 연동 고리를 끊습니다. (구글 캘린더에는 남습니다)')) return
                          setIsProcessing(true)
                          try {
                            await unlinkGoogleEventAction(selectedItem.activity.id)
                            setSelectedItem(null)
                            await fetchData()
                          } catch (e) {
                            alert('해제 실패')
                          } finally {
                            setIsProcessing(false)
                          }
                        }}
                      >
                        <Link2Off className="w-5 h-5 md:w-4 md:h-4 mr-2" /> 연동 연결만 해제
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1 shadow-md hover:shadow-lg font-bold h-12 md:h-10 text-base md:text-sm"
                        disabled={isProcessing}
                        onClick={async () => {
                          if (!confirm('이 일정을 구글 캘린더에서 영구 삭제하시겠습니까?')) return
                          setIsProcessing(true)
                          try {
                            await deleteGoogleEventAction(selectedItem.activity.id)
                            setSelectedItem(null)
                            await fetchData()
                          } catch (e) {
                            alert('삭제 실패')
                          } finally {
                            setIsProcessing(false)
                          }
                        }}
                      >
                        <Trash2 className="w-5 h-5 md:w-4 md:h-4 mr-2" /> 구글에서 완전히 삭제
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 text-center font-bold mt-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <AlertCircle className="w-4 h-4 inline mr-1.5 -mt-0.5 text-slate-400" />
                      위 작업은 <span className="text-slate-600">Calentask 앱 내부 데이터에는 영향을 주지 않으며</span>, 오직 연동 정보만 초기화합니다.
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
