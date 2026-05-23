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
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-10 shadow-apple-float border border-slate-100">
        <div className="text-center space-y-3 mb-10">
          <h2 className="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight text-slate-900">
            <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
            회원가입
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Calentask을 시작하기 위한 계정을 생성합니다.
          </p>
        </div>
        
        <form className="space-y-6" action={signup}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-semibold text-slate-500 pl-1">
                이름 <span className="text-blue-500">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                placeholder="홍길동"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-slate-500 pl-1">
                아이디 <span className="text-blue-500">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                placeholder="아이디를 입력하세요"
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-slate-500 pl-1">
                비밀번호 <span className="text-blue-500">*</span>
                <span className="font-normal text-slate-400 ml-1">(8자 이상)</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="passwordConfirm" className="text-xs font-semibold text-slate-500 pl-1">
                비밀번호 확인 <span className="text-blue-500">*</span>
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                placeholder="비밀번호를 다시 입력하세요"
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <label htmlFor="recoveryEmail" className="text-xs font-semibold text-slate-500 pl-1">
                복구 이메일 <span className="font-normal text-slate-400">(선택)</span>
              </label>
              <input
                id="recoveryEmail"
                name="recoveryEmail"
                type="email"
                className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                placeholder="recovery@example.com"
              />
              <p className="text-[11px] text-slate-400 pt-1 pl-1">비밀번호 분실 시 계정을 찾기 위해 사용됩니다.</p>
            </div>
          </div>

          {searchParams?.error && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 text-center font-medium">
              {searchParams.error}
            </div>
          )}

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full rounded-full bg-blue-600 py-6 text-[15px] font-semibold text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
            >
              회원가입 완료
            </Button>
          </div>
          
          <div className="text-center pt-6">
            <p className="text-sm text-slate-500">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                로그인
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
