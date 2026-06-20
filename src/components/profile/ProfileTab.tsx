/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { useUserProfile, useUpdateProfile, useUpdatePassword } from '@/hooks/useCalendarQueries'
import { verifyCurrentPassword } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, KeyRound, Monitor, Smartphone, Tablet, Globe2, LogOut, CheckCircle2, Download, Share, X, MoreVertical, ArrowUp } from 'lucide-react'
import { PinPadOverlay } from '@/components/archive/PinPadOverlay'
import { useUserSessions, useDeleteSession, useSignOutOtherDevices, useSecurityPinStatus, useVerifyPin, useUpdateSecurityPin } from '@/hooks/useSecurityQueries'
import { parseUserAgent } from '@/lib/uaParser'
import { getLocationFromIP } from '@/lib/ipLocation'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { signOutAllDevices } from '@/app/actions/sessions'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

/**
 * 데스크톱 설치 가이드 모달
 * Chrome, Edge, 기타 브라우저에 따라 맞춤형 설치 안내를 제공
 * beforeinstallprompt 이벤트가 없을 때 (이미 한번 거부했거나, 브라우저 정책으로 안 뜨는 경우) 표시됨
 */
function DesktopInstallGuideModal({ 
  isOpen, 
  onClose, 
  browserType 
}: { 
  isOpen: boolean
  onClose: () => void
  browserType: 'chrome' | 'edge' | 'other'
}) {
  const guideSteps = {
    chrome: [
      {
        text: (
          <>브라우저 <strong>주소창 오른쪽 끝</strong>에 있는 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded text-xs font-mono"><Monitor className="w-3 h-3" />↓</span> 아이콘을 클릭하세요.</>
        )
      },
      {
        text: <><strong>&ldquo;앱 설치&rdquo;</strong> 또는 <strong>&ldquo;Install app&rdquo;</strong>을 클릭하세요.</>
      },
    ],
    edge: [
      {
        text: (
          <>브라우저 오른쪽 위 <strong>⋯ (더보기 메뉴)</strong>를 클릭하세요.</>
        )
      },
      {
        text: <><strong>&ldquo;앱&rdquo;</strong> → <strong>&ldquo;이 사이트를 앱으로 설치&rdquo;</strong>를 선택하세요.</>
      },
    ],
    other: [
      {
        text: <>브라우저 <strong>메뉴</strong> 또는 <strong>주소창</strong>에서 설치 옵션을 찾아 주세요.</>
      },
      {
        text: <>최신 <strong>Chrome</strong> 또는 <strong>Edge</strong> 브라우저 사용을 권장합니다.</>
      },
    ],
  }

  const browserLabel = {
    chrome: 'Chrome',
    edge: 'Edge',
    other: '브라우저',
  }

  const steps = guideSteps[browserType]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card rounded-3xl w-full max-w-[420px] overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-muted hover:bg-slate-200 rounded-full text-muted-foreground transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner border border-indigo-100/50">
                <Monitor className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">데스크톱 앱 설치</h3>
              <p className="text-sm text-muted-foreground mb-1 leading-relaxed">
                {browserLabel[browserType]} 브라우저에서 아래 방법으로
              </p>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Calentask를 데스크톱 앱으로 설치할 수 있습니다.
              </p>

              {browserType === 'chrome' && (
                <div className="mb-5 mx-auto max-w-[340px]">
                  <div className="bg-muted rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="w-4 h-4 rounded bg-green-100 flex items-center justify-center">
                          <span className="text-[8px] text-green-600">🔒</span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">calentask.vercel.app</span>
                      </div>
                      <div className="relative">
                        <div className="w-7 h-7 rounded-md bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center animate-pulse">
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-indigo-500">
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
                            <polygon points="6,0 0,10 12,10" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-indigo-600 font-bold mt-3 text-center">
                      ↑ 이 아이콘을 클릭하세요
                    </p>
                  </div>
                </div>
              )}

              {browserType === 'edge' && (
                <div className="mb-5 mx-auto max-w-[340px]">
                  <div className="bg-muted rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between bg-card rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="w-4 h-4 rounded bg-green-100 flex items-center justify-center">
                          <span className="text-[8px] text-green-600">🔒</span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">calentask.vercel.app</span>
                      </div>
                      <div className="relative">
                        <div className="w-7 h-7 rounded-md bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center animate-pulse">
                          <MoreVertical className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-indigo-500">
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
                            <polygon points="6,0 0,10 12,10" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-indigo-600 font-bold mt-3 text-center">
                      ↑ 더보기 메뉴 → &ldquo;앱&rdquo; → &ldquo;이 사이트를 앱으로 설치&rdquo;
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-muted border border-border rounded-2xl p-4 text-left space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 px-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  💡 설치 아이콘이 보이지 않으면, 이전에 설치를 취소한 적이 있을 수 있습니다.
                  <br />
                  <span className="text-indigo-500 font-medium">
                    Chrome: 주소창 좌측 &ldquo;ℹ️&rdquo; → &ldquo;앱으로 설치&rdquo;
                  </span>
                </p>
              </div>
              
              <button 
                onClick={onClose}
                className="w-full mt-5 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors"
              >
                확인했습니다
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

import { LinkLocalAccountForm } from './LinkLocalAccountForm'

export function ProfileTab() {
  const { data: profile } = useUserProfile()
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile()
  const { mutateAsync: updatePassword, isPending: isUpdatingPassword } = useUpdatePassword()
  
  const [authUser, setAuthUser] = useState<any>(null)
  
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setAuthUser(data.user))
  }, [])

  const isGooglePrimary = authUser?.app_metadata?.provider === 'google'

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

  // 2차 비밀번호 변경 관련 상태
  const { data: secPinStatus } = useSecurityPinStatus()
  const verifyPinMutation = useVerifyPin()
  const { mutateAsync: updateSecPin, isPending: isUpdatingSecPin } = useUpdateSecurityPin()

  const [secPasswordStep, setSecPasswordStep] = useState<'idle' | 'verify' | 'change'>('idle')
  const [currentSecPassword, setCurrentSecPassword] = useState('')
  const [newSecPassword, setNewSecPassword] = useState('')
  const [confirmSecPassword, setConfirmSecPassword] = useState('')
  const [secPasswordError, setSecPasswordError] = useState('')
  const [isVerifyingSec, setIsVerifyingSec] = useState(false)

  async function hashText(text: string) {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // PWA 설치 상태
  const { isStandalone, isIos, browserType, installApp } = usePwaInstall()
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [showDesktopGuide, setShowDesktopGuide] = useState(false)

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

  const handleVerifySecPassword = async () => {
    if (!currentSecPassword || currentSecPassword.length !== 4) {
      setSecPasswordError('현재 2차 비밀번호 4자리를 입력해주세요.')
      return
    }
    setIsVerifyingSec(true)
    setSecPasswordError('')
    try {
      const hashedPin = await hashText(currentSecPassword)
      const result = await verifyPinMutation.mutateAsync(hashedPin)
      if (result.success) {
        setSecPasswordStep('change')
        setCurrentSecPassword('')
      } else {
        setSecPasswordError('현재 2차 비밀번호가 올바르지 않습니다.')
      }
    } catch {
      setSecPasswordError('2차 비밀번호 확인 중 오류가 발생했습니다.')
    } finally {
      setIsVerifyingSec(false)
    }
  }

  const handleSaveSecPassword = async () => {
    if (!newSecPassword || newSecPassword.length !== 4 || newSecPassword !== confirmSecPassword) {
      setSecPasswordError('새로운 2차 비밀번호(4자리 숫자)가 일치하지 않거나 입력되지 않았습니다.')
      return
    }
    setSecPasswordError('')
    try {
      const hashedPin = await hashText(newSecPassword)
      const result = await updateSecPin(hashedPin)
      if (result.success) {
        alert('2차 비밀번호가 성공적으로 변경되었습니다.')
        resetSecPasswordState()
      } else {
        setSecPasswordError(result.error || '2차 비밀번호 변경에 실패했습니다.')
      }
    } catch (err) {
      console.error(err)
      setSecPasswordError('2차 비밀번호 변경에 실패했습니다.')
    }
  }

  const resetSecPasswordState = () => {
    setSecPasswordStep('idle')
    setCurrentSecPassword('')
    setNewSecPassword('')
    setConfirmSecPassword('')
    setSecPasswordError('')
  }

  return (
    <>
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* PWA 앱 설치 유도 (스탠드얼론 아닐 때만 표시) */}
      {!isStandalone && (
        <section className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-4 justify-between shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 bg-card text-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground tracking-tight">앱으로 쾌적하게 사용하기</span>
              <span className="text-xs text-muted-foreground font-medium">홈 화면에 추가하여 전체화면으로 실행하세요</span>
            </div>
          </div>
          <Button 
            onClick={async () => {
              const result = await installApp()
              if (result?.action === 'show-ios-guide') {
                setShowIosGuide(true)
              } else if (result?.action === 'show-desktop-guide') {
                // toast 대신 시각적 가이드 모달 표시
                setShowDesktopGuide(true)
              } else if (result?.action === 'installed') {
                toast.success('앱이 설치되었습니다! 🎉')
              }
            }}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-transform active:scale-95"
          >
            <Download className="w-4 h-4 mr-2" />
            홈 화면에 앱 설치
          </Button>
        </section>
      )}

      {/* 기본 정보 섹션 */}
      <section className="space-y-3 md:space-y-4">
        <h3 className="text-base md:text-lg font-bold text-foreground">기본 정보</h3>
        <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground font-medium">이름</Label>
            <Input 
              id="fullName" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="bg-card border-border focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground font-medium">아이디</Label>
            <Input 
              id="username" 
              value={username}
              disabled
              className="bg-muted border-border text-muted-foreground rounded-xl cursor-not-allowed opacity-100"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="recoveryEmail" className="text-foreground font-medium">복구 이메일</Label>
            <Input 
              id="recoveryEmail" 
              type="email"
              value={recoveryEmail}
              onChange={e => setRecoveryEmail(e.target.value)}
              placeholder="비밀번호 복구용 이메일을 입력하세요"
              className="bg-card border-border focus-visible:ring-indigo-500 rounded-xl"
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

      {/* 구글 계정 연동 관리 섹션 */}
      <section className="space-y-3 md:space-y-4 pt-4 md:pt-6 border-t border-border">
        <h3 className="text-base md:text-lg font-bold text-foreground">구글 연동 및 계정 관리</h3>
        
        {isGooglePrimary ? (
          <div className="space-y-4">
            <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={profile?.google_avatar_url || '/icon.png'} alt="Google profile" className="w-10 h-10 rounded-full bg-muted" />
                <div>
                  <p className="font-semibold text-sm">{profile?.google_name || 'Google 사용자'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.google_email}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 font-bold rounded-lg border border-indigo-100">
                구글 연동 완료 (기본 계정)
              </span>
            </div>
            
            {/* 구글 기반 가입자는 로컬 폼 렌더링 */}
            <LinkLocalAccountForm />
          </div>
        ) : (
          <div className="space-y-4">
            {profile?.is_google_linked ? (
              <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={profile?.google_avatar_url || '/icon.png'} alt="Google profile" className="w-10 h-10 rounded-full bg-muted" />
                  <div>
                    <p className="font-semibold text-sm">{profile?.google_name || 'Google 연동 사용자'}</p>
                    <p className="text-xs text-muted-foreground">{profile?.google_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-green-50 text-green-600 font-bold rounded-lg border border-green-100 mr-2">
                    연동됨
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                    onClick={async () => {
                      if (confirm('구글 계정 연동을 해제하시겠습니까?')) {
                        try {
                          const res = await fetch('/api/auth/google-unlink', { method: 'POST' })
                          if (res.ok) {
                            alert('구글 계정 연동이 해제되었습니다.')
                            window.location.reload()
                          } else {
                            alert('해제 중 오류가 발생했습니다.')
                          }
                        } catch (e) {
                          alert('해제 중 오류가 발생했습니다.')
                        }
                      }
                    }}
                  >
                    연동 해제
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">구글 캘린더 연동</p>
                  <p className="text-xs text-muted-foreground">구글 계정을 연동하면 캘린더 데이터를 가져오거나 내보낼 수 있습니다.</p>
                </div>
                <Button 
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={async () => {
                    const supabase = createClient()
                    await supabase.auth.linkIdentity({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/auth/callback`,
                        queryParams: {
                          access_type: 'offline',
                          prompt: 'consent'
                        }
                      }
                    })
                  }}
                >
                  <Globe2 className="w-3.5 h-3.5 mr-1.5" />
                  Google 계정 연동하기
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 보안 섹션 (비밀번호 변경) */}
      <section className="space-y-3 md:space-y-4 pt-4 md:pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-bold text-foreground">보안</h3>
          <div className="flex gap-2">
            {passwordStep === 'idle' && secPasswordStep === 'idle' && (
              <Button 
                variant="outline" 
                onClick={() => { setPasswordStep('verify'); resetSecPasswordState() }}
                className="text-foreground border-slate-300 hover:bg-muted"
              >
                <KeyRound className="w-4 h-4 mr-2 text-muted-foreground" />
                비밀번호 변경
              </Button>
            )}
            {secPinStatus?.isSetup && passwordStep === 'idle' && secPasswordStep === 'idle' && (
              <Button 
                variant="outline" 
                onClick={() => { setSecPasswordStep('verify'); resetPasswordState() }}
                className="text-foreground border-slate-300 hover:bg-muted"
              >
                <KeyRound className="w-4 h-4 mr-2 text-muted-foreground" />
                2차 비밀번호 변경
              </Button>
            )}
          </div>
        </div>

        {/* Step 1: 현재 비밀번호 확인 */}
        {passwordStep === 'verify' && (
          <div className="bg-muted p-5 rounded-2xl border border-border space-y-4 mb-8">
            <p className="text-sm text-foreground font-medium">비밀번호를 변경하려면 먼저 현재 비밀번호를 입력해주세요.</p>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input 
                id="currentPassword" 
                type="password"
                value={currentPassword}
                onChange={e => { setCurrentPassword(e.target.value); setPasswordError('') }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
                placeholder="현재 비밀번호를 입력하세요"
                className="bg-card border-border"
                autoFocus
              />
            </div>
            {passwordError && (
              <p className="text-sm text-rose-500 font-medium">{passwordError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={resetPasswordState} className="text-muted-foreground hover:text-foreground hover:bg-slate-200">
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
          <div className="bg-muted p-5 rounded-2xl border border-border space-y-4 mb-8">
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
                  className="bg-card border-border"
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
                  className="bg-card border-border"
                />
              </div>
            </div>
            {passwordError && (
              <p className="text-sm text-rose-500 font-medium">{passwordError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={resetPasswordState} className="text-muted-foreground hover:text-foreground hover:bg-slate-200">
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

        {/* Step 1: 현재 2차 비밀번호 확인 */}
        {secPasswordStep === 'verify' && (
          <div className="bg-muted p-5 rounded-2xl border border-border space-y-4 mb-8">
            <p className="text-sm text-foreground font-medium">2차 비밀번호를 변경하려면 먼저 현재 2차 비밀번호를 입력해주세요.</p>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="currentSecPassword">현재 2차 비밀번호 (4자리)</Label>
              <Input 
                id="currentSecPassword" 
                type="password"
                maxLength={4}
                value={currentSecPassword}
                onChange={e => { setCurrentSecPassword(e.target.value.replace(/[^0-9]/g, '')); setSecPasswordError('') }}
                onKeyDown={e => e.key === 'Enter' && handleVerifySecPassword()}
                placeholder="숫자 4자리"
                className="bg-card border-border tracking-widest"
                autoFocus
              />
            </div>
            {secPasswordError && (
              <p className="text-sm text-rose-500 font-medium">{secPasswordError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={resetSecPasswordState} className="text-muted-foreground hover:text-foreground hover:bg-slate-200">
                취소
              </Button>
              <Button 
                onClick={handleVerifySecPassword}
                disabled={isVerifyingSec || currentSecPassword.length !== 4}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                {isVerifyingSec ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                확인
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 새 2차 비밀번호 입력 */}
        {secPasswordStep === 'change' && (
          <div className="bg-muted p-5 rounded-2xl border border-border space-y-4 mb-8">
            <p className="text-sm text-emerald-600 font-medium">✓ 현재 2차 비밀번호가 확인되었습니다. 새로운 2차 비밀번호를 입력해주세요.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newSecPassword">새 2차 비밀번호</Label>
                <Input 
                  id="newSecPassword" 
                  type="password"
                  maxLength={4}
                  value={newSecPassword}
                  onChange={e => { setNewSecPassword(e.target.value.replace(/[^0-9]/g, '')); setSecPasswordError('') }}
                  placeholder="숫자 4자리"
                  className="bg-card border-border tracking-widest"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmSecPassword">2차 비밀번호 확인</Label>
                <Input 
                  id="confirmSecPassword" 
                  type="password"
                  maxLength={4}
                  value={confirmSecPassword}
                  onChange={e => { setConfirmSecPassword(e.target.value.replace(/[^0-9]/g, '')); setSecPasswordError('') }}
                  placeholder="숫자 4자리 확인"
                  className="bg-card border-border tracking-widest"
                />
              </div>
            </div>
            {secPasswordError && (
              <p className="text-sm text-rose-500 font-medium">{secPasswordError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={resetSecPasswordState} className="text-muted-foreground hover:text-foreground hover:bg-slate-200">
                취소
              </Button>
              <Button 
                onClick={handleSaveSecPassword}
                disabled={isUpdatingSecPin || newSecPassword.length !== 4 || newSecPassword !== confirmSecPassword}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                {isUpdatingSecPin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                비밀번호 업데이트
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 로그인된 기기 섹션 */}
      <section className="space-y-3 md:space-y-4 pt-4 md:pt-6 border-t border-border">
        <ActiveSessions />
      </section>

    </div>

    {/* iOS 가이드 모달 */}
    <AnimatePresence>
      {showIosGuide && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bg-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-2 bg-muted hover:bg-slate-200 rounded-full text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner">
                <Download className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">앱으로 설치하기</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Calentask를 홈 화면에 추가하여<br/>전체화면 앱처럼 쾌적하게 사용해보세요.
              </p>
              
              <div className="bg-muted border border-border rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-foreground font-bold text-xs flex items-center justify-center shrink-0">1</span>
                  <p className="text-sm text-foreground flex items-center gap-1">
                    하단 메뉴에서 <Share className="w-4 h-4 text-blue-500 inline mx-1" /> 아이콘을 탭하세요.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-foreground font-bold text-xs flex items-center justify-center shrink-0">2</span>
                  <p className="text-sm text-foreground">
                    <strong>홈 화면에 추가</strong> 메뉴를 선택하세요.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowIosGuide(false)}
                className="w-full mt-6 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors"
              >
                확인했습니다
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* 데스크톱 설치 가이드 모달 - 브라우저별(Chrome/Edge/기타) 맞춤 안내 */}
      <DesktopInstallGuideModal 
        isOpen={showDesktopGuide}
        onClose={() => setShowDesktopGuide(false)}
        browserType={browserType}
      />
    </>
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
        <h3 className="text-base md:text-lg font-bold text-foreground">로그인된 기기</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSignOutOthers}
            disabled={isSigningOutOthers || !data?.sessions || data.sessions.length <= 1}
            className="text-foreground text-xs sm:text-sm"
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
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm">
          세션 정보를 불러올 수 없습니다.
        </div>
      ) : data?.sessions?.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground bg-muted rounded-xl text-sm">
          로그인된 다른 기기가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {data?.sessions?.map((session: any) => {
            const isCurrent = session.session_id === currentSessionId
            const ua = parseUserAgent(session.user_agent)
            
            const Icon = ua.deviceType === 'mobile' ? Smartphone : ua.deviceType === 'tablet' ? Tablet : Monitor

            return (
              <div key={session.session_id} className={`p-4 rounded-xl border ${isCurrent ? 'bg-indigo-50/30 border-indigo-100' : 'bg-card border-border'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-sm`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shrink-0 ${isCurrent ? 'bg-indigo-100 text-indigo-600' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{ua.summary}</span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          현재 접속 중
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5" />
                      <DeviceLocation ip={session.ip} />
                      <span className="text-muted-foreground/50">|</span>
                      <span>{session.ip}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
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


