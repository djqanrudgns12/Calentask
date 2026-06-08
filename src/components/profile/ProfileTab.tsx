/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { useUserProfile, useUpdateProfile, useUpdatePassword } from '@/hooks/useCalendarQueries'
import { verifyCurrentPassword } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, KeyRound, Monitor, Smartphone, Tablet, Globe2, LogOut, CheckCircle2 } from 'lucide-react'
import { PinPadOverlay } from '@/components/archive/PinPadOverlay'
import { useUserSessions, useDeleteSession, useSignOutOtherDevices } from '@/hooks/useSecurityQueries'
import { parseUserAgent } from '@/lib/uaParser'
import { getLocationFromIP } from '@/lib/ipLocation'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { signOutAllDevices } from '@/app/actions/sessions'

export function ProfileTab() {
  const { data: profile } = useUserProfile()
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile()
  const { mutateAsync: updatePassword, isPending: isUpdatingPassword } = useUpdatePassword()
  
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  
  // 비밀번호 변경 관련 상태
  const [passwordStep, setPasswordStep] = useState<'idle' | 'verify' | 'change'>('idle')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setUsername(profile.username || '')
      setRecoveryEmail(profile.recovery_email || '')
    }
  }, [profile])

  const handleSaveProfile = () => {
    updateProfile({
      full_name: fullName,
      recovery_email: recoveryEmail
    })
  }

  const handleVerifyPassword = async () => {
    if (!currentPassword) {
      setPasswordError('현재 비밀번호를 입력해주세요.')
      return
    }
    setIsVerifying(true)
    setPasswordError('')
    try {
      const result = await verifyCurrentPassword(currentPassword)
      if (result.success) {
        setPasswordStep('change')
        setCurrentPassword('')
      } else {
        setPasswordError(result.error || '현재 비밀번호가 올바르지 않습니다.')
      }
    } catch {
      setPasswordError('비밀번호 확인 중 오류가 발생했습니다.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSavePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않거나 입력되지 않았습니다.')
      return
    }
    setPasswordError('')
    try {
      await updatePassword(newPassword)
      alert('비밀번호가 성공적으로 변경되었습니다.')
      resetPasswordState()
    } catch (err) {
      console.error(err)
      setPasswordError('비밀번호 변경에 실패했습니다.')
    }
  }

  const resetPasswordState = () => {
    setPasswordStep('idle')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
  }

  return (
    <PinPadOverlay>
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 기본 정보 섹션 */}
      <section className="space-y-3 md:space-y-4">
        <h3 className="text-base md:text-lg font-bold text-slate-800">기본 정보</h3>
        <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-slate-600 font-medium">이름</Label>
            <Input 
              id="fullName" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="bg-white border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username" className="text-slate-600 font-medium">아이디</Label>
            <Input 
              id="username" 
              value={username}
              disabled
              className="bg-slate-50 border-slate-200 text-slate-500 rounded-xl cursor-not-allowed opacity-100"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="recoveryEmail" className="text-slate-600 font-medium">복구 이메일</Label>
            <Input 
              id="recoveryEmail" 
              type="email"
              value={recoveryEmail}
              onChange={e => setRecoveryEmail(e.target.value)}
              placeholder="비밀번호 복구용 이메일을 입력하세요"
              className="bg-white border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>
        </div>

        {/* 프로필 저장 버튼 */}
        <div className="pt-4 flex justify-end">
          <Button 
            onClick={handleSaveProfile}
            disabled={isUpdatingProfile}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-5 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-105"
          >
            {isUpdatingProfile ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                저장 중...
              </>
            ) : '변경사항 저장'}
          </Button>
        </div>
      </section>

      {/* 보안 섹션 (비밀번호 변경) */}
      <section className="space-y-3 md:space-y-4 pt-4 md:pt-6 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-bold text-slate-800">보안</h3>
          {passwordStep === 'idle' && (
            <Button 
              variant="outline" 
              onClick={() => setPasswordStep('verify')}
              className="text-slate-600 border-slate-300 hover:bg-slate-50"
            >
              <KeyRound className="w-4 h-4 mr-2 text-slate-400" />
              비밀번호 변경
            </Button>
          )}
        </div>

        {/* Step 1: 현재 비밀번호 확인 */}
        {passwordStep === 'verify' && (
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 mb-8">
            <p className="text-sm text-slate-600 font-medium">비밀번호를 변경하려면 먼저 현재 비밀번호를 입력해주세요.</p>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input 
                id="currentPassword" 
                type="password"
                value={currentPassword}
                onChange={e => { setCurrentPassword(e.target.value); setPasswordError('') }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
                placeholder="현재 비밀번호를 입력하세요"
                className="bg-white border-slate-200"
                autoFocus
              />
            </div>
            {passwordError && (
              <p className="text-sm text-rose-500 font-medium">{passwordError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={resetPasswordState} className="text-slate-500 hover:text-slate-700 hover:bg-slate-200">
                취소
              </Button>
              <Button 
                onClick={handleVerifyPassword}
                disabled={isVerifying || !currentPassword}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                확인
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 새 비밀번호 입력 */}
        {passwordStep === 'change' && (
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 mb-8">
            <p className="text-sm text-emerald-600 font-medium">✓ 현재 비밀번호가 확인되었습니다. 새로운 비밀번호를 입력해주세요.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <Input 
                  id="newPassword" 
                  type="password"
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPasswordError('') }}
                  placeholder="새로운 비밀번호"
                  className="bg-white border-slate-200"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input 
                  id="confirmPassword" 
                  type="password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPasswordError('') }}
                  placeholder="새로운 비밀번호 확인"
                  className="bg-white border-slate-200"
                />
              </div>
            </div>
            {passwordError && (
              <p className="text-sm text-rose-500 font-medium">{passwordError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={resetPasswordState} className="text-slate-500 hover:text-slate-700 hover:bg-slate-200">
                취소
              </Button>
              <Button 
                onClick={handleSavePassword}
                disabled={isUpdatingPassword || !newPassword || newPassword !== confirmPassword}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                {isUpdatingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                비밀번호 업데이트
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 로그인된 기기 섹션 */}
      <section className="space-y-3 md:space-y-4 pt-4 md:pt-6 border-t border-slate-100">
        <ActiveSessions />
      </section>

    </div>
    </PinPadOverlay>
  )
}

function DeviceLocation({ ip }: { ip: string | null }) {
  const [location, setLocation] = useState<string>('위치 정보 불러오는 중...')
  
  useEffect(() => {
    if (!ip) {
      setLocation('IP 정보 없음')
      return
    }
    getLocationFromIP(ip).then(setLocation)
  }, [ip])

  return <span>{location}</span>
}

function ActiveSessions() {
  const { data, isLoading, error } = useUserSessions()
  const { mutate: deleteSession, isPending: isDeleting } = useDeleteSession()
  const { mutate: signOutOthers, isPending: isSigningOutOthers } = useSignOutOtherDevices()
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        try {
          const payload = data.session.access_token.split('.')[1]
          const decoded = JSON.parse(atob(payload))
          if (decoded.session_id) {
            setCurrentSessionId(decoded.session_id)
          }
        } catch (e) {
          console.error('Failed to parse session token', e)
        }
      }
    })
  }, [])

  const handleSignOutAll = async () => {
    if (!confirm('모든 기기에서 로그아웃됩니다. 현재 기기에서도 로그아웃됩니다. 계속하시겠습니까?')) return
    await signOutAllDevices()
    window.location.href = '/login'
  }

  const handleSignOutOthers = () => {
    if (!confirm('현재 기기를 제외한 다른 모든 기기에서 로그아웃하시겠습니까?')) return
    signOutOthers()
  }

  const handleDeleteSession = (sessionId: string) => {
    if (!confirm('선택한 기기에서 로그아웃하시겠습니까?')) return
    deleteSession(sessionId)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base md:text-lg font-bold text-slate-800">로그인된 기기</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSignOutOthers}
            disabled={isSigningOutOthers || !data?.sessions || data.sessions.length <= 1}
            className="text-slate-600 text-xs sm:text-sm"
          >
            다른 기기 로그아웃
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSignOutAll}
            className="text-xs sm:text-sm"
          >
            모든 기기 로그아웃
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm">
          세션 정보를 불러올 수 없습니다.
        </div>
      ) : data?.sessions?.length === 0 ? (
        <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl text-sm">
          로그인된 다른 기기가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {data?.sessions?.map((session: any) => {
            const isCurrent = session.session_id === currentSessionId
            const ua = parseUserAgent(session.user_agent)
            
            const Icon = ua.deviceType === 'mobile' ? Smartphone : ua.deviceType === 'tablet' ? Tablet : Monitor

            return (
              <div key={session.session_id} className={`p-4 rounded-xl border ${isCurrent ? 'bg-indigo-50/30 border-indigo-100' : 'bg-white border-slate-100'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-sm`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shrink-0 ${isCurrent ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{ua.summary}</span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          현재 접속 중
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5" />
                      <DeviceLocation ip={session.ip} />
                      <span className="text-slate-300">|</span>
                      <span>{session.ip}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      마지막 접속: {session.updated_at ? formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: ko }) : '알 수 없음'}
                    </div>
                  </div>
                </div>

                {!isCurrent && (
                  <Button 
                    variant="ghost" 
                    onClick={() => handleDeleteSession(session.session_id)}
                    disabled={isDeleting}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 self-start sm:self-center shrink-0"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    연결 끊기
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


