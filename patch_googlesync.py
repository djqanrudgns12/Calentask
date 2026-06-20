import os

file_path = "src/components/calendar/GoogleSyncTab.tsx"

with open(file_path, "r") as f:
    content = f.read()

# Add imports
import_insert = "import { AdvancedSyncSettingsModal } from './AdvancedSyncSettingsModal'\nimport { useCategories } from '@/hooks/useCalendarQueries'\n"
content = content.replace("import { WidgetGuideModal } from './WidgetGuideModal'", "import { WidgetGuideModal } from './WidgetGuideModal'\n" + import_insert)

# Add hooks
hook_insert = """
  const { data: categories = [] } = useCategories()
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false)
"""
content = content.replace("const [guideModalType, setGuideModalType] = useState<'desktop' | 'ios' | 'android' | null>(null)", "const [guideModalType, setGuideModalType] = useState<'desktop' | 'ios' | 'android' | null>(null)\n" + hook_insert)

# Replace "커스텀 동기화" block
custom_sync_block_old = """
                {/* 커스텀 동기화 */}
                <div className={`bg-white border transition-colors shadow-sm rounded-xl p-5 ${isCustomOpen ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200 hover:border-slate-300 cursor-pointer'}`} onClick={!isCustomOpen ? handleOpenCustomSync : undefined}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center shrink-0">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">내 캘린더 직접 선택</h4>
                      <p className="text-xs text-slate-500 font-medium">기존 구글 일정과 통합</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 h-10">
                    이미 구글에서 사용 중인 캘린더(예: 가족 일정, 업무용)를 골라 서로 연결합니다.
                  </p>

                  <AnimatePresence>
                    {!isCustomOpen ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); handleOpenCustomSync() }}>
                          캘린더 목록 불러오기
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        className="space-y-3 pt-2"
                      >
                        {isLoadingCalendars ? (
                          <div className="text-center py-2 text-sm text-slate-500 animate-pulse">
                            구글에서 캘린더 목록을 가져오는 중...
                          </div>
                        ) : (
                          <>
                            <select 
                              className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                              value={selectedCalendarId}
                              onChange={(e) => setSelectedCalendarId(e.target.value)}
                            >
                              <option value="">연결할 구글 캘린더 선택...</option>
                              {calendarList.map(cal => (
                                <option key={cal.id} value={cal.id}>
                                  {cal.summary} {cal.primary && '(기본)'}
                                </option>
                              ))}
                            </select>
                            <Button 
                              className="w-full bg-indigo-600 hover:bg-indigo-700" 
                              disabled={!selectedCalendarId || isSyncing}
                              onClick={(e) => { e.stopPropagation(); handleStartSync('custom'); }}
                            >
                              {isSyncing ? '동기화 중...' : '선택한 캘린더로 시작'}
                            </Button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>"""

custom_sync_block_new = """
                {/* 전문가 고급 설정 */}
                <motion.div 
                  whileHover={{ y: -2 }}
                  className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all rounded-xl p-5 cursor-pointer flex flex-col" 
                  onClick={async () => {
                    setIsAdvancedModalOpen(true)
                    // Fetch calendars for the modal if not loaded
                    if (calendarList.length === 0) {
                      const cals = await getGoogleCalendarListAction()
                      setCalendarList(cals)
                    }
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center shrink-0 shadow-inner">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">전문가 고급 설정</h4>
                      <p className="text-xs text-indigo-600 font-bold tracking-tight">세밀한 컨트롤</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 flex-1">
                    동기화 방향, 충돌 해결 전략, 색상 매핑 및 다중 캘린더 그룹화 등 모든 것을 완벽하게 통제하세요.
                  </p>
                  <Button variant="outline" className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    설정 열기
                  </Button>
                </motion.div>"""

content = content.replace(custom_sync_block_old, custom_sync_block_new)

# Add advanced button to active sync block
active_sync_old = """
                <div>
                  <div className="text-sm font-medium text-emerald-900 flex items-center gap-2">
                    실시간 자동 동기화 작동 중
                    <span className="flex items-center text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                      ON
                    </span>
                  </div>
                  <div className="text-xs text-emerald-700/80 mt-0.5">
                    연결된 캘린더: <span className="font-bold">{profile.google_sync_calendar_name || 'Calentask'}</span>
                  </div>
                </div>
              </div>
            </motion.div>"""

active_sync_new = """
                <div>
                  <div className="text-sm font-medium text-emerald-900 flex items-center gap-2">
                    실시간 자동 동기화 작동 중
                    <span className="flex items-center text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200 animate-pulse">
                      ON
                    </span>
                  </div>
                  <div className="text-xs text-emerald-700/80 mt-0.5">
                    연결된 캘린더: <span className="font-bold">{profile.google_sync_calendar_name || 'Calentask'}</span>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={async () => {
                  setIsAdvancedModalOpen(true)
                  if (calendarList.length === 0) {
                    const cals = await getGoogleCalendarListAction()
                    setCalendarList(cals)
                  }
                }}
              >
                <Settings2 className="w-4 h-4 mr-2" />
                고급 설정
              </Button>
            </motion.div>"""

content = content.replace(active_sync_old, active_sync_new)

# Add the modal component before the last closing div
modal_insert = """
      <AdvancedSyncSettingsModal 
        isOpen={isAdvancedModalOpen} 
        onClose={() => setIsAdvancedModalOpen(false)} 
        calendarList={calendarList} 
        categories={categories} 
      />
"""
content = content.replace("    </div>\n  )\n}", modal_insert + "    </div>\n  )\n}")

with open(file_path, "w") as f:
    f.write(content)
