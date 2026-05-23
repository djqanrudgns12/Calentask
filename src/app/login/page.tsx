import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function LoginPage(
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
            Calentask
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            당신을 위한 Calentask입니다. 일정을 체계적으로 기록해보세요.
          </p>
        </div>
        
        <form className="space-y-6" action={login}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-slate-500 pl-1">
                아이디
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
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full rounded-2xl bg-slate-100 border-none px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                placeholder="비밀번호를 입력하세요"
              />
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
              로그인
            </Button>
          </div>
          
          <div className="text-center pt-6 space-y-3">
            <p className="text-sm text-slate-500">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                회원가입
              </Link>
            </p>
            <p className="text-sm text-slate-500">
              <Link href="/recovery" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                아이디 / 비밀번호 찾기
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
