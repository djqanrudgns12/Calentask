import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default async function SignupPage(
  props: {
    searchParams: Promise<{ error?: string }>
  }
) {
  const searchParams = await props.searchParams
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Calentask을 시작하기 위한 아이디를 생성합니다.
          </p>
        </div>
        <form className="mt-8 space-y-6" action={signup}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="text-sm font-medium text-gray-700">아이디 (필수)</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="아이디"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-700">비밀번호 (필수)</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="비밀번호"
              />
            </div>
            <div>
              <label htmlFor="recoveryEmail" className="text-sm font-medium text-gray-700">복구 이메일 (선택)</label>
              <input
                id="recoveryEmail"
                name="recoveryEmail"
                type="email"
                className="mt-1 relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="password-recovery@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">비밀번호를 분실했을 때 찾기 위해 사용됩니다.</p>
            </div>
          </div>
          {searchParams?.error && (
            <p className="text-sm text-red-500 text-center">{searchParams.error}</p>
          )}
          <div>
            <Button type="submit" className="w-full">
              회원가입
            </Button>
          </div>
          <div className="text-sm text-center">
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              이미 계정이 있으신가요? 로그인하기
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
