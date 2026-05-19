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
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f7f9fb] p-4">
      <div className="w-full max-w-md rounded-[16px] bg-white/80 p-8 backdrop-blur-xl shadow-[0_4px_15px_rgba(0,0,0,0.04)] border border-white/50">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#0f172a]">
            계정 복구
          </h2>
          <p className="text-sm text-gray-500">
            가입 시 등록한 정보를 입력해주세요.
          </p>
        </div>
        
        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'id' 
                ? 'border-[#2563eb] text-[#2563eb]' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('id')}
          >
            아이디 찾기
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'password' 
                ? 'border-[#2563eb] text-[#2563eb]' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
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
              <div className="space-y-1">
                <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  이름
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                  placeholder="가입 시 입력한 이름"
                />
              </div>
              
              <div className="space-y-1">
                <label htmlFor="recoveryEmail" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  복구 이메일
                </label>
                <input
                  id="recoveryEmail"
                  name="recoveryEmail"
                  type="email"
                  required
                  className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            {idError && (
              <div className="rounded-md bg-[#ffdad6] p-3 text-sm text-[#93000a] text-center font-medium">
                {idError}
              </div>
            )}
            {idResult && (
              <div className="rounded-md bg-[#d3e3fd] p-3 text-sm text-[#041e49] text-center font-medium">
                {idResult}
              </div>
            )}

            <div>
              <Button 
                type="submit" 
                disabled={isIdLoading}
                className="w-full rounded-[12px] bg-[#2563eb] py-6 text-[15px] font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors shadow-sm"
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
              <div className="space-y-1">
                <label htmlFor="pwUsername" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  아이디
                </label>
                <input
                  id="pwUsername"
                  name="username"
                  type="text"
                  required
                  className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                  placeholder="가입 시 입력한 아이디"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="pwFullName" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  이름
                </label>
                <input
                  id="pwFullName"
                  name="fullName"
                  type="text"
                  required
                  className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                  placeholder="가입 시 입력한 이름"
                />
              </div>
              
              <div className="space-y-1">
                <label htmlFor="pwRecoveryEmail" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  복구 이메일
                </label>
                <input
                  id="pwRecoveryEmail"
                  name="recoveryEmail"
                  type="email"
                  required
                  className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                  placeholder="user@example.com"
                />
              </div>

              <div className="pt-2 border-t border-gray-100"></div>

              <div className="space-y-1">
                <label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  새 비밀번호
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                  placeholder="새로운 비밀번호 (8자 이상)"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="newPasswordConfirm" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  새 비밀번호 확인
                </label>
                <input
                  id="newPasswordConfirm"
                  name="newPasswordConfirm"
                  type="password"
                  required
                  minLength={8}
                  className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                  placeholder="새로운 비밀번호 재입력"
                />
              </div>
            </div>

            {pwError && (
              <div className="rounded-md bg-[#ffdad6] p-3 text-sm text-[#93000a] text-center font-medium">
                {pwError}
              </div>
            )}
            {pwResult && (
              <div className="rounded-md bg-[#d3e3fd] p-3 text-sm text-[#041e49] text-center font-medium">
                {pwResult}
              </div>
            )}

            <div>
              <Button 
                type="submit" 
                disabled={isPwLoading}
                className="w-full rounded-[12px] bg-[#2563eb] py-6 text-[15px] font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors shadow-sm"
              >
                {isPwLoading ? '처리 중...' : '비밀번호 재설정'}
              </Button>
            </div>
          </form>
        )}
        
        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          <Link href="/login" className="text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
