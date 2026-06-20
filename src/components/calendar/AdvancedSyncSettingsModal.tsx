'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, AlertTriangle, CheckCircle2, RefreshCw, Palette, Filter, Shield, Settings2, FolderTree, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Trash2 } from 'lucide-react'
import { getGoogleSyncSettingsAction, updateGoogleSyncSettingsAction, clearGoogleSyncDataAction } from '@/app/actions/calendar'
import { Button } from '@/components/ui/button'

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

export function AdvancedSyncSettingsModal({ isOpen, onClose, calendarList, categories }: { isOpen: boolean, onClose: () => void, calendarList: any[], categories: any[] }) {
  const [activeTab, setActiveTab] = useState<'core' | 'color' | 'group' | 'danger'>('core')
  
  const [settings, setSettings] = useState<any>({
    direction: 'TWO_WAY',
    conflictStrategy: 'LATEST_WINS',
    colorMapping: {},
    groupMapping: {},
    privacyMapping: {}
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      getGoogleSyncSettingsAction().then(data => {
        setSettings({
          direction: data.direction || 'TWO_WAY',
          conflictStrategy: data.conflictStrategy || 'LATEST_WINS',
          colorMapping: data.colorMapping || {},
          groupMapping: data.groupMapping || {},
          privacyMapping: data.privacyMapping || {}
        })
        setIsLoading(false)
      })
    }
  }, [isOpen])

  // Debounced auto-save effect could go here, or we use explicit save
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

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 bg-white/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">전문가 고급 설정</h2>
                <p className="text-sm text-slate-500 font-medium">동기화의 흐름과 형태를 완벽하게 통제하세요</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <AnimatePresence>
                {isSaving && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-full">
                    <RefreshCw className="w-4 h-4 animate-spin" /> 저장 중...
                  </motion.div>
                )}
                {saveMessage === '저장 완료' && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-4 h-4" /> 저장됨
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-48 sm:w-56 bg-slate-50/50 border-r border-slate-200/60 p-4 space-y-1 overflow-y-auto hidden sm:block">
              <TabButton active={activeTab === 'core'} onClick={() => setActiveTab('core')} icon={<ArrowRightLeft />} label="핵심 동작 (Core)" />
              <TabButton active={activeTab === 'color'} onClick={() => setActiveTab('color')} icon={<Palette />} label="색상 & 프라이버시" />
              <TabButton active={activeTab === 'group'} onClick={() => setActiveTab('group')} icon={<FolderTree />} label="그룹 매핑 (Routing)" />
              <div className="pt-4 mt-4 border-t border-slate-200/60">
                <TabButton active={activeTab === 'danger'} onClick={() => setActiveTab('danger')} icon={<AlertTriangle />} label="위험 구역 (Danger)" variant="danger" />
              </div>
            </div>

            {/* Mobile Tabs */}
            <div className="flex sm:hidden overflow-x-auto border-b border-slate-200/60 bg-slate-50 p-2 gap-2">
              <button onClick={() => setActiveTab('core')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'core' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>동작</button>
              <button onClick={() => setActiveTab('color')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'color' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>디자인</button>
              <button onClick={() => setActiveTab('group')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'group' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>그룹</button>
              <button onClick={() => setActiveTab('danger')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'danger' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>관리</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-white/40">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {activeTab === 'core' && (
                    <motion.div key="core" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                      {/* Direction */}
                      <section>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <Filter className="w-5 h-5 text-indigo-500" /> 동기화 방향 제어
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <RadioOption 
                            selected={settings.direction === 'TWO_WAY'} 
                            onClick={() => updateSetting('direction', 'TWO_WAY')}
                            icon={<ArrowRightLeft className="w-5 h-5" />}
                            title="양방향 동기화 (기본)"
                            desc="Calentask와 구글 캘린더 양쪽의 변경 사항을 실시간으로 상호 적용합니다."
                          />
                          <RadioOption 
                            selected={settings.direction === 'EXPORT_ONLY'} 
                            onClick={() => updateSetting('direction', 'EXPORT_ONLY')}
                            icon={<ArrowUpFromLine className="w-5 h-5" />}
                            title="내보내기 전용 (단방향)"
                            desc="Calentask에서 작성한 일정만 구글 캘린더로 보냅니다. 구글의 수정 사항은 무시됩니다."
                          />
                          <RadioOption 
                            selected={settings.direction === 'IMPORT_ONLY'} 
                            onClick={() => updateSetting('direction', 'IMPORT_ONLY')}
                            icon={<ArrowDownToLine className="w-5 h-5" />}
                            title="가져오기 전용 (단방향)"
                            desc="구글 캘린더의 일정만 Calentask로 가져옵니다. Calentask의 변경 사항은 구글에 반영되지 않습니다."
                          />
                        </div>
                      </section>

                      {/* Conflict Strategy */}
                      <section>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <Shield className="w-5 h-5 text-indigo-500" /> 데이터 충돌 해결 전략
                        </h3>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 text-sm text-amber-800">
                          인터넷이 끊긴 상태에서 양쪽을 동시에 수정했을 때, 어떤 데이터를 우선할지 결정합니다.
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <RadioOption 
                            selected={settings.conflictStrategy === 'LATEST_WINS'} 
                            onClick={() => updateSetting('conflictStrategy', 'LATEST_WINS')}
                            title="가장 최근에 수정된 내용 우선 (기본)"
                            desc="수정된 시간이 더 늦은 데이터를 최종본으로 간주하고 덮어씁니다."
                          />
                          <RadioOption 
                            selected={settings.conflictStrategy === 'CALENTASK_WINS'} 
                            onClick={() => updateSetting('conflictStrategy', 'CALENTASK_WINS')}
                            title="항상 Calentask를 우선 (Master)"
                            desc="항상 Calentask의 데이터를 유지하며 구글 캘린더의 변경 사항을 무시합니다."
                          />
                          <RadioOption 
                            selected={settings.conflictStrategy === 'GOOGLE_WINS'} 
                            onClick={() => updateSetting('conflictStrategy', 'GOOGLE_WINS')}
                            title="항상 구글 캘린더 우선"
                            desc="충돌이 감지되면 구글 캘린더의 데이터를 무조건 가져와 덮어씁니다."
                          />
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeTab === 'color' && (
                    <motion.div key="color" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3">
                        <Palette className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-indigo-900">시각적 일관성 유지</h4>
                          <p className="text-sm text-indigo-700/80 mt-1">Calentask의 카테고리 색상을 구글 캘린더의 어떤 색상으로 표시할지 1:1로 매핑하세요. 또한 특정 카테고리를 '바쁨'으로만 넘어가게 하여 프라이버시를 보호할 수 있습니다.</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {categories.map(cat => (
                          <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.hex_color }} />
                              <span className="font-bold text-slate-700">{cat.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-semibold">구글 컬러 매핑:</span>
                                <select 
                                  className="text-sm border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-100 outline-none w-32"
                                  value={settings.colorMapping?.[cat.id] || ''}
                                  onChange={(e) => updateMapping('colorMapping', cat.id, e.target.value)}
                                >
                                  <option value="">(자동 선택)</option>
                                  {GOOGLE_COLORS.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                                {settings.colorMapping?.[cat.id] && (
                                  <div className="w-5 h-5 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: GOOGLE_COLORS.find(c => c.id === settings.colorMapping[cat.id])?.hex }} />
                                )}
                              </div>
                              
                              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                              <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only"
                                    checked={settings.privacyMapping?.[cat.id] || false}
                                    onChange={(e) => updateMapping('privacyMapping', cat.id, e.target.checked ? true : null)}
                                  />
                                  <div className={`block w-10 h-6 rounded-full transition-colors ${settings.privacyMapping?.[cat.id] ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.privacyMapping?.[cat.id] ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                                <span className={`text-xs font-bold ${settings.privacyMapping?.[cat.id] ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'}`}>비공개 (바쁨)</span>
                              </label>
                            </div>
                          </div>
                        ))}
                        {categories.length === 0 && (
                          <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            생성된 카테고리가 없습니다. 카테고리를 먼저 만들어주세요.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'group' && (
                    <motion.div key="group" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                       <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3">
                        <FolderTree className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-indigo-900">다중 캘린더 라우팅</h4>
                          <p className="text-sm text-indigo-700/80 mt-1">Calentask의 카테고리별로 각기 다른 구글 캘린더(그룹)에 저장되도록 라우팅 규칙을 설정합니다. (예: '업무' 카테고리는 구글의 '회사 일정' 캘린더로 전송)</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {categories.map(cat => (
                          <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.hex_color }} />
                              <span className="font-bold text-slate-700">{cat.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                              <select 
                                className="text-sm border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-100 outline-none w-48 bg-slate-50"
                                value={settings.groupMapping?.[cat.id] || ''}
                                onChange={(e) => updateMapping('groupMapping', cat.id, e.target.value)}
                              >
                                <option value="">기본 Calentask 달력</option>
                                {calendarList.map(cal => (
                                  <option key={cal.id} value={cal.id}>
                                    {cal.summary} {cal.primary && '(기본)'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'danger' && (
                    <motion.div key="danger" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                      <div className="bg-red-50 border border-red-200 p-6 rounded-3xl">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                            <Trash2 className="w-6 h-6 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-red-900 mb-2">동기화 데이터 일괄 초기화</h3>
                            <p className="text-sm text-red-800 mb-4 leading-relaxed">
                              구글 계정 연동은 그대로 유지한 상태에서, <strong>Calentask를 통해 구글 캘린더로 넘어간 모든 일정 데이터만 깨끗하게 일괄 삭제</strong>합니다.<br/>
                              구글 캘린더에 원래 있던 사용자 개인 일정은 완벽히 보호되며 삭제되지 않습니다. 동기화가 너무 꼬였거나 초기화하고 싶을 때 사용하세요.
                            </p>
                            
                            <Button 
                              onClick={handleClearData} 
                              disabled={isClearing}
                              className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
                            >
                              {isClearing ? (
                                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 구글에서 일정 삭제 중...</>
                              ) : (
                                <><Trash2 className="w-4 h-4 mr-2" /> 동기화된 모든 일정 초기화 (Clean-up)</>
                              )}
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
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function TabButton({ active, onClick, icon, label, variant = 'default' }: { active: boolean, onClick: () => void, icon: any, label: string, variant?: 'default' | 'danger' }) {
  const activeClasses = variant === 'danger' 
    ? 'bg-red-100 text-red-700 shadow-sm border-red-200' 
    : 'bg-white text-indigo-700 shadow-sm border-slate-200 font-bold'
  const inactiveClasses = variant === 'danger'
    ? 'text-red-600 hover:bg-red-50 hover:text-red-700 border-transparent'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-transparent'

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border text-sm ${active ? activeClasses : inactiveClasses}`}
    >
      <div className={`${active && variant !== 'danger' ? 'text-indigo-600' : ''}`}>
        {icon}
      </div>
      <span className={active ? 'font-bold' : 'font-medium'}>{label}</span>
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
