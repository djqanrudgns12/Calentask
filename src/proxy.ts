import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // PWA 필수 리소스(manifest.json, sw.js)는 인증 없이 접근 가능해야 한다.
    // 브라우저는 <link rel="manifest">를 기본적으로 쿠키 없이 요청하므로,
    // 이 둘이 /login으로 리다이렉트되면 설치 시 앱 이름/아이콘을 못 읽어 fallback 아이콘이 뜬다.
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
