/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { useUserProfile, useUpdateProfile, useUpdatePassword } from '@/hooks/useCalendarQueries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, KeyRound } from 'lucide-react'

export function ProfileTab() {
  const { data: profile } = useUserProfile()
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile()
  const { mutateAsync: updatePassword, isPending: isUpdatingPassword } = useUpdatePassword()
  
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  
  // 비밀번호 변경 관련 상태
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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

  const handleSavePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert('비밀번호가 일치하지 않거나 입력되지 않았습니다.')
      return
    }
    try {
      await updatePassword(newPassword)
      alert('비밀번호가 성공적으로 변경되었습니다.')
      setIsChangingPassword(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(err)
      alert('비밀번호 변경에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 기본 정보 섹션 */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">기본 정보</h3>
        <div className="grid sm:grid-cols-2 gap-6">
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
      <section className="space-y-4 pt-6 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">보안</h3>
          {!isChangingPassword && (
            <Button 
              variant="outline" 
              onClick={() => setIsChangingPassword(true)}
              className="text-slate-600 border-slate-300 hover:bg-slate-50"
            >
              <KeyRound className="w-4 h-4 mr-2 text-slate-400" />
              비밀번호 변경
            </Button>
          )}
        </div>

        {isChangingPassword && (
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <Input 
                  id="newPassword" 
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="새로운 비밀번호"
                  className="bg-white border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input 
                  id="confirmPassword" 
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="새로운 비밀번호 확인"
                  className="bg-white border-slate-200"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsChangingPassword(false)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-200"
              >
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

    </div>
  )
}

