'use client'

import { Check, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function DisplayTab() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full max-w-2xl mx-auto py-2 md:py-4">
      {/* 테마 섹션 */}
      <section className="space-y-3 md:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <h3 className="text-base md:text-lg font-bold text-foreground">앱 테마</h3>
          <span className="text-[11px] md:text-sm text-muted-foreground font-medium mt-0.5 md:mt-0">눈이 편안한 테마를 선택하세요</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setTheme('light')}
            className={`relative flex flex-col items-center gap-3 p-4 bg-card border-2 rounded-2xl transition-all text-left ${
              mounted && theme !== 'dark' ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="w-full aspect-video rounded-xl bg-background border border-border flex items-center justify-center relative overflow-hidden">
              <Sun className="w-8 h-8 text-amber-500" />
              <div className="absolute top-2 right-2 w-16 h-2 bg-indigo-200 rounded-full" />
              <div className="absolute top-6 right-2 w-10 h-2 bg-slate-200 rounded-full" />
              <div className="absolute bottom-2 left-2 right-2 h-10 bg-card rounded-t-lg border-t border-border" />
            </div>
            <div className="w-full flex items-center justify-between">
              <span className={`font-semibold ${mounted && theme !== 'dark' ? 'text-foreground' : 'text-muted-foreground'}`}>라이트 모드</span>
              {mounted && theme !== 'dark' && <Check className="w-5 h-5 text-primary" />}
            </div>
          </button>

          <button 
            onClick={() => setTheme('dark')}
            className={`relative flex flex-col items-center gap-3 p-4 bg-card border-2 rounded-2xl transition-all text-left ${
              mounted && theme === 'dark' ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="w-full aspect-video rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden">
              <Moon className="w-8 h-8 text-indigo-300" />
              <div className="absolute top-2 right-2 w-16 h-2 bg-indigo-900 rounded-full" />
              <div className="absolute top-6 right-2 w-10 h-2 bg-slate-700 rounded-full" />
              <div className="absolute bottom-2 left-2 right-2 h-10 bg-slate-800 rounded-t-lg border-t border-slate-700" />
            </div>
            <div className="w-full flex items-center justify-between">
              <span className={`font-semibold ${mounted && theme === 'dark' ? 'text-foreground' : 'text-muted-foreground'}`}>다크 모드</span>
              {mounted && theme === 'dark' && <Check className="w-5 h-5 text-primary" />}
            </div>
          </button>
        </div>
      </section>
    </div>
  )
}
