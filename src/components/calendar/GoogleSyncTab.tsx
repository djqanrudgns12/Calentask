'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Globe2, Smartphone, Monitor, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/useCalendarQueries'

export function GoogleSyncTab() {
  const { data: profile } = useUserProfile()
  const [authUser, setAuthUser] = useState<any>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setAuthUser(data.user))
  }, [])

  const isGooglePrimary = authUser?.app_metadata?.provider === 'google'
  const isGoogleLinked = isGooglePrimary || profile?.is_google_linked

  const [isLinking, setIsLinking] = useState(false)

  const handleLinkGoogle = async () => {
    setIsLinking(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    if (error) {
      alert('구글 계정 연동 요청 중 오류가 발생했습니다: ' + error.message)
      setIsLinking(false)
      return
    }

    if (data?.url) {
      window.location.href = data.url
    } else {
      setIsLinking(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
          <Globe2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">구글 계정 / 캘린더 연동 센터</h2>
          <p className="text-sm text-muted-foreground mt-1">구글 캘린더 연동 및 다양한 디바이스 위젯 사용 가이드라인</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 md:p-6 border-b border-border bg-muted/30">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-indigo-600" />
            구글 캘린더 연동 상태
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            구글 계정을 연동해야 구글 캘린더로 일정을 내보내거나 가져올 수 있습니다.
          </p>
        </div>
        
        <div className="p-5 md:p-6 space-y-4">
          {isGoogleLinked ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900">구글 계정 연동 완료</h4>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    {profile?.google_email || '구글 계정이 성공적으로 연결되었습니다.'}
                  </p>
                </div>
              </div>
              <div className="text-sm font-medium text-emerald-800 bg-emerald-100/50 px-4 py-2 rounded-lg text-center">
                이제 캘린더 화면에서 구글 일정을 동기화할 수 있습니다.
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <AlertCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-900">구글 계정 미연동</h4>
                  <p className="text-sm text-indigo-700 mt-0.5">
                    캘린더 동기화 기능을 사용하려면 구글 계정을 연동해주세요.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleLinkGoogle}
                disabled={isLinking}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                <Globe2 className={`w-4 h-4 mr-2 ${isLinking ? 'animate-spin' : ''}`} />
                {isLinking ? '연동 중...' : '구글 계정 연동하기'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 데스크탑 위젯 가이드 */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-40 bg-slate-100 flex items-center justify-center border-b border-border relative">
            <Monitor className="w-12 h-12 text-slate-300 absolute" />
            <span className="text-slate-400 font-medium z-10 text-sm">Desktop Widget Placeholder</span>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h4 className="font-bold text-base mb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-slate-600" />
              데스크탑 위젯
            </h4>
            <p className="text-sm text-muted-foreground flex-1">
              데스크탑 바탕화면에서 바로 일정을 확인하고 추가하세요. 맥북과 윈도우를 모두 지원합니다.
            </p>
            <Button variant="outline" className="w-full mt-4 justify-between" disabled>
              설치 방법 보기 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* iOS 위젯 가이드 */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-40 bg-blue-50 flex items-center justify-center border-b border-border relative">
            <Smartphone className="w-12 h-12 text-blue-200 absolute" />
            <span className="text-blue-400 font-medium z-10 text-sm">iOS Widget Placeholder</span>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h4 className="font-bold text-base mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              iOS 위젯
            </h4>
            <p className="text-sm text-muted-foreground flex-1">
              아이폰 홈 화면에서 Calentask 위젯을 추가하여 일정을 한눈에 파악하세요. PWA 설치가 필요합니다.
            </p>
            <Button variant="outline" className="w-full mt-4 justify-between" disabled>
              설치 방법 보기 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Android 위젯 가이드 */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-40 bg-emerald-50 flex items-center justify-center border-b border-border relative">
            <Smartphone className="w-12 h-12 text-emerald-200 absolute" />
            <span className="text-emerald-400 font-medium z-10 text-sm">Android Widget Placeholder</span>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h4 className="font-bold text-base mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Android 위젯
            </h4>
            <p className="text-sm text-muted-foreground flex-1">
              안드로이드 기기에서 빠르고 간편하게 캘린더에 접근하세요. 홈 화면 위젯을 지원합니다.
            </p>
            <Button variant="outline" className="w-full mt-4 justify-between" disabled>
              설치 방법 보기 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
