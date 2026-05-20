'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, LogOut, ChevronDown } from 'lucide-react'
import { useUserProfile } from '@/hooks/useCalendarQueries'
import { logout } from '@/app/actions/auth'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useQueryClient } from '@tanstack/react-query'

export function ProfileDropdown({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: profile, isLoading } = useUserProfile()
  const { resetStore } = useCalendarStore()
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    // 1. 상태 초기화
    resetStore()
    // 2. React Query 캐시 초기화
    queryClient.clear()
    // 3. 로그아웃 요청 (리다이렉트 발생)
    await logout()
  }

  // 기본 아바타 알파벳 (프로필 없거나 로딩 중일 때)
  const fallbackInitial = profile?.full_name?.charAt(0) || 'U'
  const avatarUrl = profile?.avatar_url

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className="flex items-center gap-2 px-1.5 py-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none">
        <div className="w-10 h-10 rounded-full bg-slate-200 shadow-sm flex items-center justify-center text-sm font-bold text-slate-600 overflow-hidden ring-2 ring-transparent hover:ring-indigo-100 transition-all">
            {isLoading ? (
              <div className="w-full h-full animate-pulse bg-slate-300" />
            ) : avatarUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/avatars/${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
              </>
            ) : (
              fallbackInitial
            )}
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 mr-1" />
      </PopoverTrigger>
      
      <PopoverContent 
        align="end" 
        sideOffset={8}
        className="w-64 p-2 rounded-xl bg-white/90 backdrop-blur-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
      >
        <div className="px-3 py-3 mb-2 border-b border-slate-100">
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 tracking-tight">
                {profile?.full_name || 'User'}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-0.5">
                @{profile?.username || 'user'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              setIsOpen(false)
              onOpenSettings()
            }}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-indigo-500" />
            환경설정
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-left mt-1"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            로그아웃
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
