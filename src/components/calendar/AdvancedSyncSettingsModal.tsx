'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, CheckCircle2, RefreshCw, Filter, Shield, Settings2, FolderTree, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Trash2, Plus, GripVertical, Lock, Unlock, Clock } from 'lucide-react'
import { getGoogleSyncSettingsAction, updateGoogleSyncSettingsAction, clearGoogleSyncDataAction, createGoogleCalendarAction, updateGoogleCalendarMetaAction, deleteGoogleCalendarAction, migrateActivitiesBetweenCalendarsAction } from '@/app/actions/calendar'
import { SyncHistoryTab } from './SyncHistoryTab'
import { Button } from '@/components/ui/button'
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable, defaultDropAnimationSideEffects } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
const GOOGLE_COLORS = [
  { id: '1', hex: '#7986cb', name: 'Lavender' },
  { id: '2', hex: '#33b679', name: 'Sage' },
  { id: '3', hex: '#8e24aa', name: 'Grape' },
  { id: '4', hex: '#e67c73', name: 'Flamingo' },
  { id: '5', hex: '#f6c026', name: 'Banana' },
  { id: '6', hex: '#f5511d', name: 'Tangerine' },
  { id: '7', hex: '#039be5', name: 'Peacock' },
  { id: '8', hex: '#616161', name: 'Graphite' },
  { id: '9', hex: '#3f51b5', name: 'Blueberry' },
  { id: '10', hex: '#0b8043', name: 'Basil' },
  { id: '11', hex: '#d50000', name: 'Tomato' },
]

export function AdvancedSyncSettingsModal({ isOpen, onClose, onStartSync, calendarList, categories }: { isOpen: boolean, onClose: () => void, onStartSync?: () => void, calendarList: any[], categories: any[] }) {
  const [activeTab, setActiveTab] = useState<'core' | 'group' | 'history' | 'danger'>('core')
  
  const [settings, setSettings] = useState<any>({
    direction: 'TWO_WAY',
    conflictStrategy: 'LATEST_WINS',
    groupMapping: {},
    privacyMapping: {}
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [localCalendarList, setLocalCalendarList] = useState<any[]>(calendarList)
  
  const [migrationPrompt, setMigrationPrompt] = useState<{categoryId: string, oldCalendarId: string, newCalendarId: string} | null>(null)
  const [isMigrating, setIsMigrating] = useState(false)
  const [activeDragItem, setActiveDragItem] = useState<any>(null)
  const [localGroups, setLocalGroups] = useState<Record<string, any[]>>({})
  
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      getGoogleSyncSettingsAction().then(data => {
        setSettings({
          direction: data.direction || 'TWO_WAY',
          conflictStrategy: data.conflictStrategy || 'LATEST_WINS',
          groupMapping: data.groupMapping || {},
          privacyMapping: data.privacyMapping || {}
        })
        setIsLoading(false)
      })
    }
  }, [isOpen])

  useEffect(() => {
    setLocalCalendarList(calendarList)
  }, [calendarList])

  useEffect(() => {
    if (isLoading) return
    setLocalGroups(prev => {
      const newGroups: Record<string, any[]> = { unassigned: [] }
      localCalendarList.forEach(cal => { newGroups[cal.id] = [] })
      
      const categoryMap = new Map(categories.map(c => [c.id, c]))
      
      // 기존 정렬 순서를 유지
      Object.keys(prev).forEach(calId => {
        if (newGroups[calId]) {
           prev[calId].forEach(cat => {
             const currentMappedCalId = settings.groupMapping?.[cat.id]
             const targetId = (currentMappedCalId && newGroups[currentMappedCalId]) ? currentMappedCalId : 'unassigned'
             if (targetId === calId && categoryMap.has(cat.id)) {
                newGroups[calId].push(cat)
                categoryMap.delete(cat.id)
             }
           })
        }
      })
      
      // 나머지(새로 추가되었거나, 그룹이 변경되어 매핑되지 않은) 카테고리들 배치
      categoryMap.forEach(cat => {
        const calId = settings.groupMapping?.[cat.id]
        const targetId = (calId && newGroups[calId]) ? calId : 'unassigned'
        newGroups[targetId].push(cat)
      })
      
      return newGroups
    })
  }, [categories, localCalendarList, settings.groupMapping, isLoading])

  const handleSave = async (newSettings: any = settings) => {
    setIsSaving(true)
    setSaveMessage('')
    try {
      await updateGoogleSyncSettingsAction(newSettings)
      setSaveMessage('저장 완료')
      setTimeout(() => setSaveMessage(''), 2000)
    } catch (e) {
      setSaveMessage('저장 실패')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    handleSave(updated)
  }

  const updateMapping = (mappingKey: string, catId: string, val: any) => {
    const updatedMap = { ...settings[mappingKey] }
    if (val === null || val === '') {
      delete updatedMap[catId]
    } else {
      updatedMap[catId] = val
    }
    updateSetting(mappingKey, updatedMap)
  }

  const findContainer = (id: string) => {
    if (localGroups[id]) return id
    const key = Object.keys(localGroups).find(k => localGroups[k].some(item => `cat_${item.id}` === id))
    return key
  }

  const handleDragStart = (event: any) => {
    const { active } = event
    const id = active.id.toString().replace('cat_', '')
    const cat = categories.find(c => c.id === id)
    setActiveDragItem(cat)
  }

  const handleDragOver = (event: any) => {
    const { active, over } = event
    const overId = over?.id

    if (!overId) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(overId) || (overId.toString().startsWith('cal_') ? overId.toString().replace('cal_', '') : null)

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return
    }

    setLocalGroups((prev) => {
      const activeItems = prev[activeContainer]
      const overItems = prev[overContainer]
      
      const activeIndex = activeItems.findIndex(c => `cat_${c.id}` === active.id)
      let overIndex = overItems.findIndex(c => `cat_${c.id}` === overId)
      
      const isBelowOverItem =
        over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height
      const modifier = isBelowOverItem ? 1 : 0
      const newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1
      
      return {
        ...prev,
        [activeContainer]: prev[activeContainer].filter(item => `cat_${item.id}` !== active.id),
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          activeItems[activeIndex],
          ...prev[overContainer].slice(newIndex, prev[overContainer].length),
        ]
      }
    })
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    setActiveDragItem(null)
    
    if (!over) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id) || (over.id.toString().startsWith('cal_') ? over.id.toString().replace('cal_', '') : null)

    if (activeContainer && overContainer && activeContainer === overContainer) {
      const activeIndex = localGroups[activeContainer].findIndex(c => `cat_${c.id}` === active.id)
      const overIndex = localGroups[overContainer].findIndex(c => `cat_${c.id}` === over.id)
      if (activeIndex !== overIndex) {
        setLocalGroups((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex)
        }))
      }
    }
    
    if (!overContainer) return

    const categoryId = active.id.toString().replace('cat_', '')
    const newCalendarId = overContainer
    
    // 이미 같은 캘린더에 속한 경우 무시
    const currentCalendarId = settings.groupMapping?.[categoryId] || null
    if (newCalendarId === 'unassigned' && !currentCalendarId) return
    if (currentCalendarId === newCalendarId) return
    
    const primaryCal = localCalendarList.find(c => c.primary)?.id
    const oldCalendarId = currentCalendarId || primaryCal
    
    if (newCalendarId === 'unassigned') {
      updateMapping('groupMapping', categoryId, null)
      return
    }

    if (oldCalendarId && oldCalendarId !== newCalendarId) {
      setMigrationPrompt({ categoryId, oldCalendarId, newCalendarId })
    } else {
      updateMapping('groupMapping', categoryId, newCalendarId)
    }
  }

  const confirmMigration = async (shouldMigrate: boolean) => {
    if (!migrationPrompt) return
    const { categoryId, oldCalendarId, newCalendarId } = migrationPrompt
    
    updateMapping('groupMapping', categoryId, newCalendarId)
    
    if (shouldMigrate) {
      setIsMigrating(true)
      try {
        const res = await migrateActivitiesBetweenCalendarsAction(categoryId, oldCalendarId, newCalendarId)
        alert(`총 ${res.movedCount}개의 일정이 성공적으로 이동되었습니다.`)
      } catch (e: any) {
        alert(`마이그레이션 실패: ${e.message}`)
      } finally {
        setIsMigrating(false)
      }
    }
    setMigrationPrompt(null)
  }

  const handleCreateCalendar = async () => {
    const name = prompt('새 캘린더 이름을 입력하세요')
    if (!name?.trim()) return
    setIsCreatingCalendar(true)
    try {
      const result = await createGoogleCalendarAction(name.trim())
      setLocalCalendarList(prev => [...prev, { id: result.id, summary: result.summary, primary: false }])
    } catch (e: any) {
      alert(`생성 실패: ${e.message}`)
    } finally {
      setIsCreatingCalendar(false)
    }
  }

  const handleClearData = async () => {
    if (!confirm('경고: 구글 캘린더에 동기화된 모든 Calentask 일정이 삭제됩니다. 계속하시겠습니까?')) return
    setIsClearing(true)
    try {
      const res = await clearGoogleSyncDataAction()
      alert(`총 ${res.deletedCount}개의 동기화된 일정을 삭제했습니다.`)
    } catch (e: any) {
      alert(`오류 발생: ${e.message}`)
    } finally {
      setIsClearing(false)
    }
  }

  const handleDeleteCalendarGroup = (calendarId: string) => {
    // 삭제된 캘린더에 매핑된 카테고리들의 groupMapping을 일괄 정리
    const updatedGroupMapping = { ...settings.groupMapping }
    let changed = false
    for (const catId of Object.keys(updatedGroupMapping)) {
      if (updatedGroupMapping[catId] === calendarId) {
        delete updatedGroupMapping[catId]
        changed = true
      }
    }
    if (changed) {
      updateSetting('groupMapping', updatedGroupMapping)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white/95 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 bg-white/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                <Settings2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold text-slate-800 truncate">전문가 고급 설정</h2>
                <p className="text-sm text-slate-500 font-medium truncate">동기화의 흐름과 형태를 완벽하게 통제하세요</p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0 pl-4">
              <AnimatePresence>
                {isSaving && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="hidden sm:flex items-center gap-2 text-sm text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-full">
                    <RefreshCw className="w-4 h-4 animate-spin" /> 저장 중
                  </motion.div>
                )}
                {saveMessage === '저장 완료' && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="hidden sm:flex items-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-4 h-4" /> 저장됨
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
            <div className="w-full sm:w-56 bg-slate-50/50 border-r border-slate-200/60 p-4 space-y-1 overflow-x-auto sm:overflow-y-auto flex sm:block flex-shrink-0 hide-scrollbar">
              <div className="flex sm:flex-col gap-2 w-max sm:w-full">
                <TabButton active={activeTab === 'core'} onClick={() => setActiveTab('core')} icon={<ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5"/>} label="핵심 동작 (Core)" />
                <TabButton active={activeTab === 'group'} onClick={() => setActiveTab('group')} icon={<FolderTree className="w-4 h-4 sm:w-5 sm:h-5"/>} label="그룹 및 라우팅" />
                <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5"/>} label="히스토리 관리" />
                <div className="sm:pt-4 sm:mt-4 sm:border-t border-slate-200/60">
                  <TabButton active={activeTab === 'danger'} onClick={() => setActiveTab('danger')} icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5"/>} label="위험 구역" variant="danger" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white/40">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {activeTab === 'core' && (
                    <motion.div key="core" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                      <section>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <Filter className="w-5 h-5 text-indigo-500" /> 동기화 방향 제어
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <RadioOption selected={settings.direction === 'TWO_WAY'} onClick={() => updateSetting('direction', 'TWO_WAY')} icon={<ArrowRightLeft className="w-5 h-5" />} title="양방향 동기화" desc="양쪽의 변경 사항을 실시간으로 상호 적용합니다." />
                          <RadioOption selected={settings.direction === 'EXPORT_ONLY'} onClick={() => updateSetting('direction', 'EXPORT_ONLY')} icon={<ArrowUpFromLine className="w-5 h-5" />} title="내보내기 전용" desc="Calentask의 일정만 구글 캘린더로 전송합니다." />
                          <RadioOption selected={settings.direction === 'IMPORT_ONLY'} onClick={() => updateSetting('direction', 'IMPORT_ONLY')} icon={<ArrowDownToLine className="w-5 h-5" />} title="가져오기 전용" desc="구글 캘린더의 일정만 Calentask로 가져옵니다." />
                        </div>
                      </section>
                      <section>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <Shield className="w-5 h-5 text-indigo-500" /> 데이터 충돌 해결 전략
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <RadioOption selected={settings.conflictStrategy === 'LATEST_WINS'} onClick={() => updateSetting('conflictStrategy', 'LATEST_WINS')} title="최근 수정 내용 우선" desc="수정 시간이 더 늦은 데이터를 최종본으로 간주합니다." />
                          <RadioOption selected={settings.conflictStrategy === 'CALENTASK_WINS'} onClick={() => updateSetting('conflictStrategy', 'CALENTASK_WINS')} title="항상 Calentask 우선" desc="구글 캘린더의 변경 사항을 무시합니다." />
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeTab === 'group' && (
                    <motion.div key="group" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                       <div className="bg-indigo-50 border border-indigo-100 p-4 sm:p-5 rounded-2xl flex items-start gap-4">
                        <FolderTree className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-indigo-900 text-base sm:text-lg">그룹 및 라우팅 관리</h4>
                          <p className="text-xs sm:text-sm text-indigo-700/80 mt-1 leading-relaxed">
                            카테고리를 드래그 앤 드롭하여 목적지 구글 캘린더를 지정하세요. 캘린더 아이콘 우측의 톱니바퀴로 색상과 이름을 원격 제어할 수 있습니다.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl px-4 flex items-center gap-2 font-semibold" onClick={handleCreateCalendar} disabled={isCreatingCalendar}>
                          {isCreatingCalendar ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          새 캘린더 그룹 생성
                        </Button>
                      </div>

                      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                        <div className="grid grid-cols-1 gap-6 pb-20">
                          {localCalendarList.map(cal => (
                            <DroppableCalendarGroup 
                              key={cal.id} 
                              calendar={cal} 
                              categories={localGroups[cal.id] || []} 
                              settings={settings}
                              onTogglePrivacy={(catId: string, val: boolean) => updateMapping('privacyMapping', catId, val ? true : null)}
                              onUpdateCalendarList={setLocalCalendarList}
                              onDeleteCalendarGroup={handleDeleteCalendarGroup}
                            />
                          ))}
                          <DroppableCalendarGroup 
                            calendar={{ id: 'unassigned', summary: '🚫 미배정 카테고리 (라우팅 대기)', primary: false }} 
                            categories={localGroups['unassigned'] || []} 
                            settings={settings}
                            onTogglePrivacy={(catId: string, val: boolean) => updateMapping('privacyMapping', catId, val ? true : null)}
                            onUpdateCalendarList={setLocalCalendarList}
                          />
                        </div>
                        <DragOverlay dropAnimation={{
                          duration: 250,
                          easing: 'ease',
                          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
                        }}>
                          {activeDragItem ? (
                            <div className="bg-white border-2 border-indigo-500 shadow-2xl rounded-xl p-3 flex items-center gap-3 w-full sm:w-[300px] opacity-100 scale-105 rotate-2 cursor-grabbing pointer-events-none">
                              <GripVertical className="w-5 h-5 text-indigo-400" />
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeDragItem.hex_color }} />
                              <span className="font-bold text-slate-800 text-sm truncate">{activeDragItem.name}</span>
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </motion.div>
                  )}
                  {activeTab === 'history' && (
                    <motion.div key="history" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                      <SyncHistoryTab />
                    </motion.div>
                  )}

                  {activeTab === 'danger' && (
                    <motion.div key="danger" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                      <div className="bg-red-50 border border-red-200 p-6 rounded-3xl">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                            <Trash2 className="w-6 h-6 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-red-900 mb-2">동기화 데이터 일괄 초기화</h3>
                            <p className="text-sm text-red-800 mb-4 leading-relaxed">
                              구글 계정 연동은 그대로 유지한 상태에서, Calentask를 통해 구글 캘린더로 넘어간 모든 일정 데이터만 깨끗하게 일괄 삭제합니다.
                            </p>
                            <Button onClick={handleClearData} disabled={isClearing} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 w-full sm:w-auto">
                              {isClearing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 초기화 중...</> : <><Trash2 className="w-4 h-4 mr-2" /> 모든 일정 초기화</>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* 하단 액션 바 (Sticky Footer) */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 bg-slate-50/80 backdrop-blur-md gap-4 sm:gap-0">
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              모든 설정은 실시간으로 안전하게 자동 저장되고 있습니다.
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none border-slate-200 text-slate-600 hover:bg-slate-100">
                닫기
              </Button>
              {onStartSync && (
                <Button 
                  onClick={onStartSync} 
                  className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 font-bold"
                >
                  🚀 이 설정으로 지금 동기화 시작하기
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {migrationPrompt && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-indigo-100">
                  <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 mx-auto text-indigo-600 shadow-inner">
                    <ArrowRightLeft className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-center text-slate-800 mb-2">과거 일정 마이그레이션</h3>
                  <p className="text-sm text-slate-600 text-center mb-8 leading-relaxed">
                    카테고리의 라우팅이 변경되었습니다. 과거에 동기화된 기존 일정들도 새로운 구글 캘린더로 모두 함께 이동시킬까요?
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => confirmMigration(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl text-base font-bold shadow-lg" disabled={isMigrating}>
                      {isMigrating ? (<><RefreshCw className="w-5 h-5 animate-spin mr-2" /> 이동 중...</>) : '네, 기존 일정도 이동합니다.'}
                    </Button>
                    <Button onClick={() => confirmMigration(false)} variant="outline" className="w-full h-12 rounded-xl text-base font-semibold border-slate-200 hover:bg-slate-50 text-slate-600">
                      아니오, 앞으로 추가될 일정만 보냅니다.
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function DroppableCalendarGroup({ calendar, categories, settings, onTogglePrivacy, onUpdateCalendarList, onDeleteCalendarGroup }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: `cal_${calendar.id}` })
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false) // handleDelete용으로 유지
  const [editSummary, setEditSummary] = useState(calendar.summary)
  const isUnassigned = calendar.id === 'unassigned'
  const popoverRef = useRef<HTMLDivElement>(null)
  
  const updateRequestRef = useRef(0)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')

  // 팝오버 외부 클릭 시 닫기
  useEffect(() => {
    if (!isPopoverOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPopoverOpen])

  const handleUpdateMeta = async (colorHex?: string) => {
    if (isUnassigned) return
    
    const requestId = ++updateRequestRef.current

    // 1. 상태 스냅샷 저장 (롤백용)
    const prevSummary = calendar.summary
    const prevColor = calendar.backgroundColor

    // 2. 즉시 UI 업데이트 (낙관적)
    onUpdateCalendarList((prev: any[]) => prev.map(c => c.id === calendar.id ? { ...c, summary: editSummary, backgroundColor: colorHex || c.backgroundColor } : c))
    if (!colorHex) setIsPopoverOpen(false)

    // 3. 백그라운드 서버 호출
    setUpdateStatus('syncing')
    try {
      await updateGoogleCalendarMetaAction(calendar.id, editSummary, colorHex)
      
      if (requestId === updateRequestRef.current) {
        setUpdateStatus('success')
        setTimeout(() => {
          if (requestId === updateRequestRef.current) setUpdateStatus('idle')
        }, 1500)
      }
    } catch (e: any) {
      if (requestId === updateRequestRef.current) {
        setUpdateStatus('error')
        onUpdateCalendarList((prev: any[]) => prev.map(c => c.id === calendar.id ? { ...c, summary: prevSummary, backgroundColor: prevColor } : c))
        alert(`설정 업데이트 실패: ${e.message}\n권한이 부족하거나 읽기 전용 캘린더일 수 있습니다.`)
        setTimeout(() => {
          if (requestId === updateRequestRef.current) setUpdateStatus('idle')
        }, 1500)
      }
    }
  }

  const handleDelete = async () => {
    if (calendar.primary || isUnassigned || !confirm(`'${calendar.summary}' 캘린더를 구글에서 영구 삭제하시겠습니까?\n이 캘린더에 배정된 카테고리들은 미배정 상태로 전환됩니다.`)) return
    setIsUpdating(true)
    try {
      await deleteGoogleCalendarAction(calendar.id)
      onUpdateCalendarList((prev: any[]) => prev.filter(c => c.id !== calendar.id))
      onDeleteCalendarGroup?.(calendar.id)
    } catch (error: any) {
      alert(`캘린더 삭제 실패: ${error.message}\n기본 제공 캘린더(예: 휴일 캘린더)나 읽기 전용 캘린더는 삭제할 수 없습니다.`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div ref={setNodeRef} className={`relative rounded-3xl border-2 transition-all duration-300 flex flex-col ${isOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200/60 bg-slate-50/30'}`}>
      <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200/50 bg-white/60 rounded-t-[1.3rem]">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isUnassigned ? 'bg-slate-100 text-slate-400' : 'bg-slate-100'}`}>
            {isUnassigned ? <FolderTree className="w-4 h-4" /> : (
              <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: calendar.backgroundColor || '#6366f1' }} />
            )}
          </div>
          <span className={`font-extrabold text-sm sm:text-base truncate ${isUnassigned ? 'text-slate-500' : 'text-slate-800'}`}>{calendar.summary}</span>
        </div>
        {!isUnassigned && (
          <div className="relative shrink-0" ref={popoverRef}>
            <button onClick={() => setIsPopoverOpen(!isPopoverOpen)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600"><Settings2 className="w-5 h-5" /></button>
            <AnimatePresence>
              {isPopoverOpen && (
                <motion.div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-20">
                  <div className="flex flex-col gap-2 mb-4">
                    <label className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>이름</span>
                      <div className="flex items-center">
                        {updateStatus === 'syncing' && <span className="text-indigo-500 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> 동기화 중</span>}
                        {updateStatus === 'success' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 저장됨</span>}
                        {updateStatus === 'error' && <span className="text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 실패</span>}
                      </div>
                    </label>
                    <div className="flex gap-2">
                      <input value={editSummary} onChange={e => setEditSummary(e.target.value)} className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1" />
                      <Button size="sm" onClick={() => handleUpdateMeta()} disabled={updateStatus === 'syncing'}>저장</Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {GOOGLE_COLORS.map(c => (
                      <button 
                        key={c.id} 
                        className={`w-6 h-6 rounded-full border border-black/10 transition-all ${(calendar.backgroundColor === c.hex || (!calendar.backgroundColor && c.hex === '#6366f1')) ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`} 
                        style={{ backgroundColor: c.hex }} 
                        onClick={() => handleUpdateMeta(c.hex)} 
                      />
                    ))}
                  </div>
                  {!calendar.primary && <Button variant="ghost" className="w-full text-red-600 mt-2" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" /> 삭제</Button>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      <div className="p-2 sm:p-4 min-h-[80px] flex flex-col gap-2">
        <SortableContext items={categories.map((c: any) => `cat_${c.id}`)} strategy={verticalListSortingStrategy}>
          {categories.length === 0 ? <div className="text-center text-slate-400 text-sm py-8 border-2 border-dashed border-slate-200 rounded-2xl">드롭하여 배치</div> : categories.map((cat: any) => <SortableCategory key={cat.id} category={cat} isPrivate={settings.privacyMapping?.[cat.id]} onTogglePrivacy={(val: boolean) => onTogglePrivacy(cat.id, val)} />)}
        </SortableContext>
      </div>
    </div>
  )
}

function SortableCategory({ category, isPrivate, onTogglePrivacy }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `cat_${category.id}` })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between p-3 bg-white border rounded-xl min-w-0 relative z-10 ${isDragging ? 'shadow-inner border-dashed bg-slate-50/80 z-20' : 'shadow-sm hover:border-indigo-200 hover:shadow-md transition-shadow'}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-400 transition-colors touch-none shrink-0"><GripVertical className="w-5 h-5" /></div>
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.hex_color }} />
        <span className="font-bold text-sm text-slate-700 truncate">{category.name}</span>
      </div>
      <button onClick={() => onTogglePrivacy(!isPrivate)} className={`px-2 py-1 rounded-lg text-xs font-bold ${isPrivate ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        {isPrivate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      </button>
    </div>
  )
}

function TabButton({ active, onClick, icon, label, variant = 'default' }: { active: boolean, onClick: () => void, icon: any, label: string, variant?: 'default' | 'danger' }) {
  const activeClasses = variant === 'danger' 
    ? 'bg-red-100 text-red-700 border-red-200 shadow-sm' 
    : 'bg-white text-indigo-700 font-bold border-slate-200 shadow-sm'
  const inactiveClasses = variant === 'danger'
    ? 'text-red-500 hover:bg-red-50 border-transparent'
    : 'text-slate-500 hover:bg-slate-100 border-transparent'
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm whitespace-nowrap ${active ? activeClasses : inactiveClasses}`}>
      <span className="shrink-0">{icon}</span>
      <span className={`truncate ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  )
}

function RadioOption({ selected, onClick, icon, title, desc }: { selected: boolean, onClick: () => void, icon?: any, title: string, desc: string }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
        selected ? 'border-indigo-500 bg-indigo-50/50 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
      }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
        selected ? 'border-indigo-600' : 'border-slate-300'
      }`}>
        {selected && <motion.div layoutId="radio-dot" className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
      </div>
      <div className="flex-1">
        <h4 className={`font-bold flex items-center gap-2 ${selected ? 'text-indigo-900' : 'text-slate-700'}`}>
          {icon} {title}
        </h4>
        <p className={`text-sm mt-1 leading-relaxed ${selected ? 'text-indigo-700/80' : 'text-slate-500'}`}>
          {desc}
        </p>
      </div>
    </div>
  )
}
