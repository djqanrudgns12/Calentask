'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Globe2, Smartphone, Monitor, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, Settings2, Zap, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/useCalendarQueries'
import { getGoogleCalendarListAction, startGoogleSyncAction, forceSyncNowAction, verifyGoogleTokenAction } from '@/app/actions/calendar'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'

export function GoogleSyncTab() {
  const queryClient = useQueryClient()
  const { data: profile, refetch: refetchProfile } = useUserProfile()
  const [authUser, setAuthUser] = useState<any>(null)
  
  // Custom Sync State
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const [calendarList, setCalendarList] = useState<any[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState('')
  const [customCalendarName, setCustomCalendarName] = useState('')
  
  // Loading States
  const [isLinking, setIsLinking] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setAuthUser(data.user))
    // OAuth 리다이렉트 후 돌아왔을 때 즉시 최신 프로필을 가져옴
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    refetchProfile()
  }, [])

  const isGooglePrimary = authUser?.app_metadata?.provider === 'google'
  const googleIdentity = authUser?.identities?.find((i: any) => i.provider === 'google')
  const isGoogleLinked = isGooglePrimary || !!googleIdentity || profile?.is_google_linked
  const needsReauth = isGoogleLinked && !profile?.google_refresh_token

  // 백그라운드 실시간 토큰 검증
  useEffect(() => {
    let mounted = true
    const verifyToken = async () => {
      // 이미 명백히 토큰이 없거나 연동되지 않았다면 검증 불필요
      if (!isGoogleLinked || needsReauth) return
      
      const result = await verifyGoogleTokenAction()
      if (mounted && !result.valid && result.reason === 'revoked') {
        // 백그라운드에서 권한 해제가 감지되면 즉시 UI 갱신 (needsReauth가 true가 되도록)
        queryClient.invalidateQueries({ queryKey: ['userProfile'] })
        refetchProfile()
      }
    }
    verifyToken()
    return () => { mounted = false }
  }, [isGoogleLinked, needsReauth])

  // Sync Setup State
  const isSyncSetupComplete = !!profile?.google_channel_id || !!profile?.google_sync_calendar_name

  const displayGoogleName = profile?.google_name || googleIdentity?.identity_data?.full_name || googleIdentity?.identity_data?.name || 'Google 계정'
  const displayGoogleEmail = profile?.google_email || googleIdentity?.identity_data?.email || ''
  const displayGoogleAvatar = profile?.google_avatar_url || googleIdentity?.identity_data?.avatar_url || googleIdentity?.identity_data?.picture || '/icon.png'
  const isVerified = googleIdentity?.identity_data?.email_verified === true

  let linkedDate = ''
  if (googleIdentity?.created_at) {
    const d = new Date(googleIdentity.created_at)
    linkedDate = `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`
  }

  const handleUnlinkGoogle = async () => {
    if (!confirm('정말 구글 계정 연동을 해제하시겠습니까? 구글 캘린더 동기화가 중단됩니다.')) return
    
    setIsUnlinking(true)
    try {
      const res = await fetch('/api/auth/google-unlink', { method: 'POST' })
      if (!res.ok) throw new Error('연동 해제 실패')
      alert('구글 계정 연동이 해제되었습니다.')
      window.location.reload()
    } catch (e: any) {
      alert(e.message)
      setIsUnlinking(false)
    }
  }

  const handleLinkGoogle = async () => {
    setIsLinking(true)

    // 1. 실제 구글 인증 상태를 서버에서 먼저 확인
    if (isGoogleLinked) {
      try {
        const verifyResult = await verifyGoogleTokenAction()
        if (verifyResult.valid) {
          alert('이미 구글 캘린더 인증에 성공하여 정상적으로 연결된 상태입니다.')
          setIsLinking(false)
          // UI 갱신 (혹시 경고가 떠 있었다면 없애기)
          queryClient.invalidateQueries({ queryKey: ['userProfile'] })
          refetchProfile()
          return
        }
      } catch (err) {
        console.error('Token verification failed:', err)
      }
    }

    // Supabase 연동 버그를 우회하기 위해 Custom Google OAuth 라우트로 리다이렉트
    window.location.href = '/api/auth/google/sync'
  }

  const handleOpenCustomSync = async () => {
    setIsCustomOpen(true)
    if (calendarList.length === 0) {
      setIsLoadingCalendars(true)
      try {
        const cals = await getGoogleCalendarListAction()
        setCalendarList(cals.filter((c: any) => c.id !== profile?.google_sync_calendar_id))
      } catch (err) {
        console.error(err)
        alert('캘린더 목록을 불러오지 못했습니다.')
      } finally {
        setIsLoadingCalendars(false)
      }
    }
  }

  const handleStartSync = async (type: 'simple' | 'custom') => {
    setIsSyncing(true)
    try {
      if (type === 'simple') {
        await startGoogleSyncAction()
        alert('간편 동기화가 시작되었습니다! 백그라운드에서 기존 일정들이 구글 캘린더(Calentask)로 복사됩니다.')
      } else {
        if (!selectedCalendarId) {
          alert('캘린더를 선택해주세요.')
          setIsSyncing(false)
          return
        }
        const selectedCal = calendarList.find(c => c.id === selectedCalendarId)
        await startGoogleSyncAction(selectedCalendarId, selectedCal?.summary)
        alert('선택하신 캘린더와 동기화가 시작되었습니다!')
      }
      // 새로고침 대신 캐시만 즉시 무효화하여 UI 실시간 반영
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      await refetchProfile()
      setIsSyncing(false)
    } catch (error) {
      console.error(error)
      alert('동기화 시작 중 오류가 발생했습니다.')
      setIsSyncing(false)
    }
  }

  const handleForceSyncNow = async () => {
    setIsSyncing(true)
    try {
      await forceSyncNowAction()
      alert('즉시 동기화가 요청되었습니다. 백그라운드에서 양쪽 캘린더의 차이를 비교하여 최신 상태로 맞춥니다.')
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      await refetchProfile()
    } catch (err) {
      console.error(err)
      alert('동기화 중 오류가 발생했습니다.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
          <Globe2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">구글 계정 / 캘린더 연동 센터</h2>
          <p className="text-sm text-muted-foreground mt-1">구글 캘린더 연동 및 다양한 디바이스 위젯 사용 가이드라인</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 md:p-6 border-b border-border bg-muted/30">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-indigo-600" />
            구글 캘린더 연동 상태
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            구글 계정을 연동해야 구글 캘린더로 일정을 내보내거나 가져올 수 있습니다.
          </p>
        </div>
        
        <div className="p-5 md:p-6 space-y-4">
          {isGoogleLinked ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-white border border-emerald-100/60 shadow-[0_2px_12px_-4px_rgba(16,185,129,0.15)] rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="relative">
                  <img src={displayGoogleAvatar} alt="Google Profile" className="w-16 h-16 rounded-full border-2 border-emerald-50 shadow-sm" />
                  <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 text-lg">{displayGoogleName}</h4>
                    {isVerified && (
                      <span className="flex items-center text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-md border border-blue-100">
                        인증됨
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-medium mb-2">{displayGoogleEmail}</p>
                  
                  {linkedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{linkedDate} 구글 계정 연결됨</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                {isSyncSetupComplete ? (
                  <Button 
                    onClick={handleForceSyncNow}
                    disabled={isSyncing}
                    className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? '동기화 진행 중...' : '즉시 동기화'}
                  </Button>
                ) : null}
                {!isGooglePrimary && (
                  <button 
                    onClick={handleUnlinkGoogle}
                    disabled={isUnlinking}
                    className="text-sm px-4 py-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-red-600 hover:border-red-200 font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    {isUnlinking ? '해제 중...' : '연동 해제'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <AlertCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-900">구글 계정 미연동</h4>
                  <p className="text-sm text-indigo-700 mt-0.5">
                    캘린더 동기화 기능을 사용하려면 구글 계정을 연동해주세요.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleLinkGoogle}
                disabled={isLinking}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                <Globe2 className={`w-4 h-4 mr-2 ${isLinking ? 'animate-spin' : ''}`} />
                {isLinking ? '연동 중...' : '구글 계정 연동하기'}
              </Button>
            </div>
          )}

          {/* Re-auth Notice Block */}
          {isGoogleLinked && needsReauth && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-5 bg-amber-50 border border-amber-200 rounded-xl"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 mb-1">구글 재인증이 필요합니다</h4>
                  <p className="text-sm text-amber-800 mb-3">
                    구글 계정은 연결되어 있지만, 캘린더 동기화에 필요한 인증 토큰이 만료되었거나 저장되지 않았습니다.
                    아래 버튼을 눌러 구글 계정을 다시 인증해주세요.
                  </p>
                  <p className="text-xs text-amber-700/80 mb-4">
                    💡 만약 계속 이 메시지가 보이면, <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline font-semibold">구글 계정 관리 → 서드파티 앱</a>에서 Calentask 권한을 제거한 후 다시 연동해보세요.
                  </p>
                  <Button onClick={handleLinkGoogle} disabled={isLinking} className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Globe2 className={`w-4 h-4 mr-2 ${isLinking ? 'animate-spin' : ''}`} />
                    {isLinking ? '인증 중...' : '구글 재인증하기'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Sync Options Block */}
          {isGoogleLinked && !isSyncSetupComplete && !needsReauth && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-6 border border-slate-200 rounded-2xl bg-slate-50/50"
            >
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  동기화 설정 및 시작
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  어떻게 동기화하시겠어요? 한 번만 연결해 두면, 바깥에서 스마트폰 구글 캘린더 앱으로 일정을 고쳐도 이곳에 자동으로 똑같이 고쳐집니다.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* 간편 동기화 */}
                <div className="bg-white border border-blue-100 rounded-xl p-5 hover:border-blue-300 transition-colors shadow-sm cursor-pointer" onClick={() => handleStartSync('simple')}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">간편 동기화 시작</h4>
                      <p className="text-xs text-blue-600 font-medium">원클릭 추천 설정</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 h-10">
                    구글 캘린더 안에 "Calentask" 전용 캘린더를 알아서 만들고 일정을 복사합니다.
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSyncing}>
                    {isSyncing ? '동기화 중...' : '간편하게 시작하기'}
                  </Button>
                </div>

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
                </div>
              </div>
            </motion.div>
          )}

          {/* Active Sync Info Block */}
          {isGoogleLinked && isSyncSetupComplete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
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
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 데스크탑 위젯 가이드 */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-40 bg-slate-100 flex items-center justify-center border-b border-border relative">
            <Monitor className="w-12 h-12 text-slate-300 absolute" />
            <span className="text-slate-400 font-medium z-10 text-sm">Desktop Widget Placeholder</span>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h4 className="font-bold text-base mb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-slate-600" />
              데스크탑 위젯
            </h4>
            <p className="text-sm text-muted-foreground flex-1">
              데스크탑 바탕화면에서 바로 일정을 확인하고 추가하세요. 맥북과 윈도우를 모두 지원합니다.
            </p>
            <Button variant="outline" className="w-full mt-4 justify-between" disabled>
              설치 방법 보기 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* iOS 위젯 가이드 */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-40 bg-blue-50 flex items-center justify-center border-b border-border relative">
            <Smartphone className="w-12 h-12 text-blue-200 absolute" />
            <span className="text-blue-400 font-medium z-10 text-sm">iOS Widget Placeholder</span>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h4 className="font-bold text-base mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              iOS 위젯
            </h4>
            <p className="text-sm text-muted-foreground flex-1">
              아이폰 홈 화면에서 Calentask 위젯을 추가하여 일정을 한눈에 파악하세요. PWA 설치가 필요합니다.
            </p>
            <Button variant="outline" className="w-full mt-4 justify-between" disabled>
              설치 방법 보기 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Android 위젯 가이드 */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-40 bg-emerald-50 flex items-center justify-center border-b border-border relative">
            <Smartphone className="w-12 h-12 text-emerald-200 absolute" />
            <span className="text-emerald-400 font-medium z-10 text-sm">Android Widget Placeholder</span>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h4 className="font-bold text-base mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Android 위젯
            </h4>
            <p className="text-sm text-muted-foreground flex-1">
              안드로이드 기기에서 빠르고 간편하게 캘린더에 접근하세요. 홈 화면 위젯을 지원합니다.
            </p>
            <Button variant="outline" className="w-full mt-4 justify-between" disabled>
              설치 방법 보기 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
