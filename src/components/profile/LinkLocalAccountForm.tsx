'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { linkLocalAccount } from '@/app/actions/auth'

export function LinkLocalAccountForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    try {
      const result = await linkLocalAccount(formData)
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error || '연동 중 오류가 발생했습니다.')
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
        <p className="text-green-700 font-bold mb-1">로컬 계정 연동이 완료되었습니다!</p>
        <p className="text-sm text-green-600">이제 생성하신 아이디와 비밀번호로도 로그인할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-muted/30 p-4 sm:p-5 rounded-2xl border border-border">
      <div className="space-y-1 mb-2">
        <h4 className="font-bold text-foreground">새로운 로컬 계정 생성 (비밀번호 설정)</h4>
        <p className="text-xs text-muted-foreground">구글 로그인 외에 이메일/비밀번호로도 로그인할 수 있도록 계정을 설정합니다.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="linkFullName">이름 <span className="text-blue-500">*</span></Label>
          <Input id="linkFullName" name="fullName" required placeholder="이름 입력" className="bg-background" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkUsername">아이디 <span className="text-blue-500">*</span></Label>
          <Input id="linkUsername" name="username" required placeholder="사용할 아이디" className="bg-background" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkPassword">비밀번호 <span className="text-blue-500">*</span></Label>
          <Input id="linkPassword" name="password" type="password" required minLength={8} placeholder="8자 이상" className="bg-background" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkPasswordConfirm">비밀번호 확인 <span className="text-blue-500">*</span></Label>
          <Input id="linkPasswordConfirm" name="passwordConfirm" type="password" required minLength={8} placeholder="다시 입력" className="bg-background" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="linkRecoveryEmail">복구 이메일 (선택)</Label>
          <Input id="linkRecoveryEmail" name="recoveryEmail" type="email" placeholder="비밀번호 찾기용 이메일" className="bg-background" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <Button type="submit" disabled={isLoading} className="w-full mt-2">
        {isLoading ? '설정 중...' : '로컬 계정 설정 완료'}
      </Button>
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        💡 기존에 가입된 로컬 계정이 있다면, 로그아웃 후 해당 계정으로 로그인하여 구글 연동을 진행해주세요.
      </p>
    </form>
  )
}
