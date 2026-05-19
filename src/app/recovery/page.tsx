'use client'

import { useState } from 'react'
import { findUsername, resetUserPassword } from '@/app/actions/recovery'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function RecoveryPage() {
  const [activeTab, setActiveTab] = useState<'id' | 'password'>('id')
  
  // 상태 관리
  const [idResult, setIdResult] = useState<string | null>(null)
  const [idError, setIdError] = useState<string | null>(null)
  const [isIdLoading, setIsIdLoading] = useState(false)
  
  const [pwResult, setPwResult] = useState<string | null>(null)
  const [pwError, setPwError] = useState<string | null>(null)
  const [isPwLoading, setIsPwLoading] = useState(false)

  const handleFindId = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsIdLoading(true)
    setIdError(null)
    setIdResult(null)
    const formData = new FormData(e.currentTarget)
    const res = await findUsername(null, formData)
    if (res.success && res.username) {
      setIdResult(`가입하신 아이디는 ${res.username} 입니다.`)
    } else {
      setIdError(res.error || '알 수 없는 오류가 발생했습니다.')
    }
    setIsIdLoading(false)
  }

  const handleResetPw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPwLoading(true)
    setPwError(null)
    setPwResult(null)
    const formData = new FormData(e.currentTarget)
    const res = await resetUserPassword(null, formData)
    if (res.success) {
      setPwResult(res.message || '비밀번호가 변경되었습니다.')
      e.currentTarget.reset()
    } else {
      setPwError(res.error || '알 수 없는 오류가 발생했습니다.')
    }
    setIsPwLoading(false)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-10 shadow-apple-float border border-slate-100">
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            계정 복구
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            가입 시 등록한 정보를 입력해주세요.
          </p>
        </div>
        
        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-200 mb-8">
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'id' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('id')}
          >
            아이디 찾기
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'password' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('password')}
          >
            비밀번호 찾기
          </button>
        </div>

        {/* 아이디 찾기 폼 */}
        {activeTab === 'id' && (
          <form className="space-y-6" onSubmit={handleFindId}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-xs font-semibold text-slate-500 pl-1">
                  이름
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                  placeholder="가입 시 입력한 이름"
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="recoveryEmail" className="text-xs font-semibold text-slate-500 pl-1">
                  복구 이메일
                </label>
                <input
                  id="recoveryEmail"
                  name="recoveryEmail"
                  type="email"
                  required
                  className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            {idError && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 text-center font-medium">
                {idError}
              </div>
            )}
            {idResult && (
              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 text-center font-medium">
                {idResult}
              </div>
            )}

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={isIdLoading}
                className="w-full rounded-full bg-blue-600 py-6 text-[15px] font-semibold text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-md"
              >
                {isIdLoading ? '확인 중...' : '아이디 찾기'}
              </Button>
            </div>
          </form>
        )}

        {/* 비밀번호 찾기 폼 */}
        {activeTab === 'password' && (
          <form className="space-y-6" onSubmit={handleResetPw}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="pwUsername" className="text-xs font-semibold text-slate-500 pl-1">
                  아이디
                </label>
                <input
                  id="pwUsername"
                  name="username"
                  type="text"
                  required
                  className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                  placeholder="가입 시 입력한 아이디"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pwFullName" className="text-xs font-semibold text-slate-500 pl-1">
                  이름
                </label>
                <input
                  id="pwFullName"
                  name="fullName"
                  type="text"
                  required
                  className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                  placeholder="가입 시 입력한 이름"
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="pwRecoveryEmail" className="text-xs font-semibold text-slate-500 pl-1">
                  복구 이메일
                </label>
                <input
                  id="pwRecoveryEmail"
                  name="recoveryEmail"
                  type="email"
                  required
                  className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                  placeholder="user@example.com"
                />
              </div>

              <div className="pt-4 pb-2 border-t border-slate-100"></div>

              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="text-xs font-semibold text-slate-500 pl-1">
                  새 비밀번호
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                  placeholder="새로운 비밀번호 (8자 이상)"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="newPasswordConfirm" className="text-xs font-semibold text-slate-500 pl-1">
                  새 비밀번호 확인
                </label>
                <input
                  id="newPasswordConfirm"
                  name="newPasswordConfirm"
                  type="password"
                  required
                  minLength={8}
                  className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                  placeholder="새로운 비밀번호 재입력"
                />
              </div>
            </div>

            {pwError && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 text-center font-medium">
                {pwError}
              </div>
            )}
            {pwResult && (
              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 text-center font-medium">
                {pwResult}
              </div>
            )}

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={isPwLoading}
                className="w-full rounded-full bg-blue-600 py-6 text-[15px] font-semibold text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-md"
              >
                {isPwLoading ? '처리 중...' : '비밀번호 재설정'}
              </Button>
            </div>
          </form>
        )}
        
        <div className="text-center mt-6 pt-6 border-t border-slate-100">
          <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
