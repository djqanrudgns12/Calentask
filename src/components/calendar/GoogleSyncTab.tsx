'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Globe2, Smartphone, Monitor, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, Settings2, Zap, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/useCalendarQueries'
import { getGoogleCalendarListAction, startGoogleSyncAction, forceSyncNowAction, verifyGoogleTokenAction } from '@/app/actions/calendar'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { SyncProgressModal } from './SyncProgressModal'
import { WidgetGuideModal } from './WidgetGuideModal'
import { AdvancedSyncSettingsModal } from './AdvancedSyncSettingsModal'
import { useCategories } from '@/hooks/useCalendarQueries'

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
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)

  // Widget Guide State
  const [guideModalType, setGuideModalType] = useState<'desktop' | 'ios' | 'android' | null>(null)

  const { data: categories = [] } = useCategories()
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false)


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
      } else {
        if (!selectedCalendarId) {
          alert('캘린더를 선택해주세요.')
          setIsSyncing(false)
          return
        }
        const selectedCal = calendarList.find(c => c.id === selectedCalendarId)
        await startGoogleSyncAction(selectedCalendarId, selectedCal?.summary)
      }
      // 서버 DB가 업데이트 되었으므로 UI 리패치
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      await refetchProfile()
      setIsSyncing(false)
      
      // 청크 동기화 모달 띄우기
      setIsSyncModalOpen(true)
    } catch (error) {
      console.error(error)
      alert('동기화 시작 중 오류가 발생했습니다.')
      setIsSyncing(false)
    }
  }

  const handleForceSyncNow = async () => {
    setIsSyncing(true)
    try {
      // Pull (Google -> Calentask)
      await forceSyncNowAction()
      
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      await refetchProfile()
      
      // Push (Calentask -> Google) via Chunk Modal
      setIsSyncModalOpen(true)
    } catch (err) {
      console.error(err)
      alert('동기화 중 오류가 발생했습니다.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleOpenGuide = (type: 'desktop' | 'ios' | 'android') => {
    if (!isGoogleLinked) {
      alert('캘린더 위젯을 사용하려면 먼저 구글 계정을 연동해주세요.')
      return
    }
    setGuideModalType(type)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-10 pt-4 md:pt-8 px-2 md:px-0">
      
      {/* 1. 연동 상태 코어 패널 - Glassmorphism & Glow */}
      <div className="relative rounded-3xl overflow-hidden bg-white/40 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 p-[2px]">
        {/* Animated Glow Border Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 opacity-20 animate-pulse" />
        
        <div className="relative bg-white/70 backdrop-blur-3xl rounded-[1.4rem] overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-white/50 relative overflow-hidden bg-gradient-to-br from-emerald-50/30 to-transparent">
            <h3 className="text-xl md:text-2xl font-extrabold flex items-center gap-3 text-slate-800 relative z-10 tracking-tight">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shadow-inner border border-white/60">
                <Globe2 className="w-6 h-6 text-emerald-600" />
              </div>
              동기화 코어 상태
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-2 ml-15 relative z-10 max-w-lg">
              구글 계정을 연동하여 모든 디바이스에서 일정을 완벽하게 양방향 동기화하세요.
            </p>
          </div>
          
          <div className="p-6 md:p-8 space-y-6">
            {isGoogleLinked ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 bg-white/80 backdrop-blur-md border border-emerald-100/60 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.15)] rounded-2xl relative overflow-hidden group">
                {/* Glow Background inside linked card */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-300/10 rounded-full blur-3xl group-hover:bg-emerald-300/20 transition-all duration-500"></div>
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-teal-500"></div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
                  <div className="relative">
                    <img src={displayGoogleAvatar} alt="Google Profile" className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white shadow-md" />
                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-extrabold text-slate-900 text-xl">{displayGoogleName}</h4>
                      {isVerified && (
                        <span className="flex items-center text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-md border border-blue-100 uppercase tracking-wider">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm md:text-base text-slate-500 font-medium mb-3">{displayGoogleEmail}</p>
                    
                    {linkedDate && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-50/50 w-fit px-3 py-1.5 rounded-full border border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                        <span>{linkedDate} 구글 계정 연결됨</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto relative z-10">
                  {isSyncSetupComplete ? (
                    <Button 
                      onClick={handleForceSyncNow}
                      disabled={isSyncing}
                      className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white hover:from-indigo-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
                      size="lg"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? '동기화 진행 중...' : '즉시 동기화'}
                    </Button>
                  ) : null}
                  {!isGooglePrimary && (
                    <button 
                      onClick={handleUnlinkGoogle}
                      disabled={isUnlinking}
                      className="text-sm px-6 py-2.5 text-slate-600 bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold rounded-xl transition-all disabled:opacity-50 shadow-sm"
                    >
                      {isUnlinking ? '해제 중...' : '연동 해제'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 border border-indigo-100/80 rounded-2xl shadow-inner">
                <div className="flex items-start md:items-center gap-5">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-indigo-50/50 shrink-0">
                    <AlertCircle className="w-7 h-7 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-indigo-900 text-lg">구글 계정 미연동</h4>
                    <p className="text-sm text-indigo-700/80 mt-1">
                      캘린더 동기화 및 위젯 기능을 사용하려면 먼저 구글 계정을 연동해야 합니다.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleLinkGoogle}
                  disabled={isLinking}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-md hover:shadow-lg transition-all"
                  size="lg"
                >
                  <Globe2 className={`w-5 h-5 mr-2 ${isLinking ? 'animate-spin' : ''}`} />
                  {isLinking ? '연동 중...' : '구글 계정 연동하기'}
                </Button>
              </div>
            )}

            {/* Re-auth Notice Block */}
            {isGoogleLinked && needsReauth && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl shadow-sm"
              >
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-white text-amber-600 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-amber-100">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-extrabold text-amber-900 mb-1 text-lg">구글 재인증이 필요합니다</h4>
                    <p className="text-sm text-amber-800 mb-4 leading-relaxed">
                      구글 계정은 연결되어 있지만, 캘린더 동기화에 필요한 인증 토큰이 만료되었거나 저장되지 않았습니다.
                      아래 버튼을 눌러 구글 계정을 다시 인증해주세요.
                    </p>
                    <p className="text-xs text-amber-700/80 mb-5 p-3 bg-amber-100/50 rounded-xl">
                      💡 만약 계속 이 메시지가 보이면, <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-900">구글 계정 관리 → 서드파티 앱</a>에서 Calentask 권한을 제거한 후 다시 연동해보세요.
                    </p>
                    <Button onClick={handleLinkGoogle} disabled={isLinking} className="bg-amber-600 hover:bg-amber-700 text-white shadow-md">
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
                className="mt-8 relative"
              >
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                      동기화 방식 선택
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      어떻게 동기화하시겠어요? 한 번만 설정하면 자동으로 동기화됩니다.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {/* 간편 동기화 */}
                  <motion.div 
                    whileHover={{ y: -4 }}
                    className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-2xl p-6 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer flex flex-col group relative overflow-hidden" 
                    onClick={() => handleStartSync('simple')}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/5 rounded-full blur-2xl group-hover:bg-blue-400/10 transition-all"></div>
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-lg group-hover:text-blue-700 transition-colors">간편 동기화 시작</h4>
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-0.5">One-click Setup</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-6 flex-1 relative z-10">
                      구글 캘린더 안에 "Calentask" 전용 캘린더를 알아서 만들고 일정을 복사합니다. 가장 추천하는 방식입니다.
                    </p>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-md relative z-10" disabled={isSyncing} size="lg">
                      {isSyncing ? '동기화 중...' : '간편하게 시작하기'}
                    </Button>
                  </motion.div>

                  {/* 전문가 고급 설정 */}
                  <motion.div 
                    whileHover={{ y: -4 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:shadow-indigo-500/20 transition-all cursor-pointer flex flex-col group relative overflow-hidden" 
                    onClick={async () => {
                      setIsAdvancedModalOpen(true)
                      if (calendarList.length === 0) {
                        const cals = await getGoogleCalendarListAction()
                        setCalendarList(cals)
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-transparent"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                      <div className="w-12 h-12 bg-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 border border-slate-700 shadow-inner">
                        <Settings2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-lg group-hover:text-indigo-400 transition-colors">전문가 고급 설정</h4>
                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mt-0.5">Advanced Control</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-6 flex-1 relative z-10">
                      동기화 방향, 충돌 해결 전략, 색상 매핑 및 다중 캘린더 그룹화 등 모든 것을 완벽하게 통제하세요.
                    </p>
                    <Button variant="outline" className="w-full border-slate-700 text-white bg-slate-800/50 hover:bg-slate-800 hover:text-white relative z-10" size="lg">
                      설정 열기
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Active Sync Info Block */}
            {isGoogleLinked && isSyncSetupComplete && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-200/60 rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-emerald-100 shrink-0">
                    <CalendarDays className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-extrabold text-emerald-950 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                      실시간 자동 동기화 작동 중
                      <span className="flex shrink-0 items-center text-[9px] sm:text-[10px] bg-emerald-500 text-white font-bold px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm animate-pulse uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                    <div className="text-sm text-emerald-700/80 mt-1 font-medium">
                      연결된 캘린더: <span className="font-bold text-emerald-900 bg-white/60 px-2 py-0.5 rounded-md ml-1">{profile.google_sync_calendar_name || 'Calentask'}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="bg-white/80 backdrop-blur-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold shadow-sm"
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
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* 2. 네이버 캘린더 위젯 가이드 섹션 - Glass & Gradient Cards */}
      <div className="pt-4">
        <h3 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-2 px-1">
          <Monitor className="w-6 h-6 text-slate-400" />
          네이버 캘린더 위젯 설정
        </h3>
        <p className="text-sm text-slate-500 font-medium mb-6 px-1">
          네이버 캘린더와 연동하여 모든 디바이스에서 위젯으로 일정을 확인하세요.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {/* 데스크탑 위젯 가이드 */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="group bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-slate-300 transition-all cursor-pointer flex flex-col"
            onClick={() => handleOpenGuide('desktop')}
          >
            <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border-b border-white/50 relative overflow-hidden group-hover:from-slate-200 group-hover:to-slate-100 transition-colors">
              <Monitor className="w-16 h-16 text-slate-300 absolute group-hover:scale-110 group-hover:text-slate-400 transition-all duration-500" />
              <span className="text-slate-500 font-bold z-10 text-sm tracking-wide bg-white/50 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">macOS · Windows</span>
            </div>
            <div className="p-6 flex-1 flex flex-col bg-white/40">
              <h4 className="font-extrabold text-lg mb-2 flex items-center gap-2 text-slate-800">
                데스크톱 연동
              </h4>
              <p className="text-sm text-slate-500 flex-1 leading-relaxed font-medium">
                브라우저에서 네이버 캘린더를 앱으로 설치하여 macOS와 Windows 바탕화면에서 일정을 관리하세요.
              </p>
              <div className="mt-5 flex items-center justify-between text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                연동 가이드 보기
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 group-hover:translate-x-1 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* iOS 위젯 가이드 */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="group bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] hover:border-blue-300 transition-all cursor-pointer flex flex-col"
            onClick={() => handleOpenGuide('ios')}
          >
            <div className="h-44 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-b border-white/50 relative overflow-hidden group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
              <Smartphone className="w-16 h-16 text-blue-200 absolute group-hover:scale-110 group-hover:text-blue-300 transition-all duration-500" />
              <span className="text-blue-600 font-bold z-10 text-sm tracking-wide bg-white/50 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">iPhone · iPad</span>
            </div>
            <div className="p-6 flex-1 flex flex-col bg-white/40">
              <h4 className="font-extrabold text-lg mb-2 flex items-center gap-2 text-slate-800">
                iOS 연동
              </h4>
              <p className="text-sm text-slate-500 flex-1 leading-relaxed font-medium">
                아이폰 홈 화면에 네이버 캘린더 위젯을 추가하여 깔끔한 달력 위젯으로 일정을 확인하세요.
              </p>
              <div className="mt-5 flex items-center justify-between text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                연동 가이드 보기
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:translate-x-1 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Android 위젯 가이드 */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="group bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.15)] hover:border-emerald-300 transition-all cursor-pointer flex flex-col"
            onClick={() => handleOpenGuide('android')}
          >
            <div className="h-44 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center border-b border-white/50 relative overflow-hidden group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
              <Smartphone className="w-16 h-16 text-emerald-200 absolute group-hover:scale-110 group-hover:text-emerald-300 transition-all duration-500" />
              <span className="text-emerald-600 font-bold z-10 text-sm tracking-wide bg-white/50 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">Galaxy · Android</span>
            </div>
            <div className="p-6 flex-1 flex flex-col bg-white/40">
              <h4 className="font-extrabold text-lg mb-2 flex items-center gap-2 text-slate-800">
                Android 연동
              </h4>
              <p className="text-sm text-slate-500 flex-1 leading-relaxed font-medium">
                안드로이드 홈 화면에 네이버 캘린더 위젯을 배치하고, 스타일과 투명도를 자유롭게 조절하세요.
              </p>
              <div className="mt-5 flex items-center justify-between text-sm font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors">
                연동 가이드 보기
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 group-hover:translate-x-1 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <SyncProgressModal 
        isOpen={isSyncModalOpen} 
        onClose={() => setIsSyncModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['userProfile'] })
          refetchProfile()
        }}
      />

      <WidgetGuideModal 
        type={guideModalType} 
        isOpen={guideModalType !== null} 
        onClose={() => setGuideModalType(null)} 
      />

      <AdvancedSyncSettingsModal 
        isOpen={isAdvancedModalOpen} 
        onClose={() => setIsAdvancedModalOpen(false)} 
        onStartSync={() => {
          setIsAdvancedModalOpen(false)
          handleForceSyncNow()
        }}
        calendarList={calendarList} 
        categories={categories} 
      />
    </div>
  )
}
