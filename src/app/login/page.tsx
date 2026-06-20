import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'

export default async function LoginPage(
  props: {
    searchParams: Promise<{ error?: string }>
  }
) {
  const searchParams = await props.searchParams
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted p-6">
      <div className="w-full max-w-[420px] rounded-3xl bg-card p-10 shadow-apple-float border border-border">
        <div className="text-center space-y-3 mb-10">
          <h2 className="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
            Calentask
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            당신을 위한 Calentask입니다. 일정을 체계적으로 기록해보세요.
          </p>
        </div>
        
        <form className="space-y-6" action={login}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-muted-foreground pl-1">
                아이디
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="block w-full rounded-2xl bg-muted border-none px-4 py-3.5 text-foreground placeholder-slate-400 focus:bg-card focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                placeholder="아이디를 입력하세요"
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-muted-foreground pl-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full rounded-2xl bg-muted border-none px-4 py-3.5 text-foreground placeholder-slate-400 focus:bg-card focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all sm:text-sm shadow-inner"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            
            <div className="flex items-center space-x-2 pl-1">
              <input
                id="keepLoggedIn"
                name="keepLoggedIn"
                type="checkbox"
                defaultChecked={true}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="keepLoggedIn" className="text-sm font-medium text-foreground">
                로그인 상태 유지
              </label>
            </div>
          </div>

          {searchParams?.error && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 text-center font-medium">
              {searchParams.error === 'user_not_found'
                ? '존재하지 않는 아이디입니다.'
                : searchParams.error === 'invalid_password'
                ? '올바르지 않은 비밀번호입니다.'
                : '아이디 또는 비밀번호가 올바르지 않습니다.'}
            </div>
          )}

          <div className="pt-2 space-y-3">
            <Button 
              type="submit" 
              className="w-full rounded-full bg-blue-600 py-6 text-[15px] font-semibold text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
            >
              로그인
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">간편 로그인</span>
            </div>
          </div>

          <div className="mt-6">
            <form action={async () => {
              'use server'
              const { signInWithGoogle } = await import('@/app/actions/auth')
              await signInWithGoogle()
            }}>
              <Button
                type="submit"
                variant="outline"
                className="w-full rounded-full py-6 text-[15px] font-semibold hover:bg-muted/50 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Google 계정으로 로그인
              </Button>
            </form>
          </div>
        </div>
        
        <div className="text-center pt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                회원가입
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              <Link href="/recovery" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                아이디 / 비밀번호 찾기
              </Link>
            </p>
          </div>
      </div>
    </div>
  )
}
