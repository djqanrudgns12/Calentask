import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function SignupPage(
  props: {
    searchParams: Promise<{ error?: string }>
  }
) {
  const searchParams = await props.searchParams
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f7f9fb] p-4">
      <div className="w-full max-w-md rounded-[16px] bg-white/80 p-8 backdrop-blur-xl shadow-[0_4px_15px_rgba(0,0,0,0.04)] border border-white/50">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-[#0f172a]">
            회원가입
          </h2>
          <p className="text-sm text-gray-500">
            Calentask을 시작하기 위한 아이디를 생성합니다.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" action={signup}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                이름 (필수)
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                placeholder="홍길동"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                아이디 (필수)
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                placeholder="아이디를 입력하세요"
              />
            </div>
            
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                비밀번호 (필수, 8자 이상)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="passwordConfirm" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                비밀번호 확인 (필수)
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                placeholder="비밀번호를 다시 입력하세요"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="recoveryEmail" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                복구 이메일 (선택)
              </label>
              <input
                id="recoveryEmail"
                name="recoveryEmail"
                type="email"
                className="block w-full rounded-[12px] bg-[#f2f4f6] border border-transparent px-4 py-3 text-[#191c1e] placeholder-gray-400 focus:bg-white focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all sm:text-sm"
                placeholder="password-recovery@example.com"
              />
              <p className="text-[11px] text-gray-500 pt-1">비밀번호 분실 시 계정을 찾기 위해 사용됩니다.</p>
            </div>
          </div>

          {searchParams?.error && (
            <div className="rounded-md bg-[#ffdad6] p-3 text-sm text-[#93000a] text-center font-medium">
              {searchParams.error}
            </div>
          )}

          <div>
            <Button 
              type="submit" 
              className="w-full rounded-[12px] bg-[#2563eb] py-6 text-[15px] font-semibold text-white hover:bg-[#1d4ed8] transition-colors shadow-sm"
            >
              회원가입 완료
            </Button>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
                로그인하기
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
