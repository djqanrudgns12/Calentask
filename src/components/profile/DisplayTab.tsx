'use client'

import { useCalendarStore } from '@/store/useCalendarStore'
import { Check, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function DisplayTab() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { 
    showHolidays, setShowHolidays, 
    showHolidaysAsTags, setShowHolidaysAsTags,
    showNationalDays, setShowNationalDays,
    showAnniversaries, setShowAnniversaries,
    showTraditionalTerms, setShowTraditionalTerms
  } = useCalendarStore()

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
            <div className="w-full aspect-video rounded-xl bg-[#f8f9ff] border border-slate-100 flex items-center justify-center relative overflow-hidden">
              <Sun className="w-8 h-8 text-amber-500" />
              <div className="absolute top-2 right-2 w-16 h-2 bg-indigo-200 rounded-full" />
              <div className="absolute top-6 right-2 w-10 h-2 bg-slate-200 rounded-full" />
              <div className="absolute bottom-2 left-2 right-2 h-10 bg-white rounded-t-lg border-t border-slate-100" />
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

      {/* 캘린더 화면 표시 섹션 */}
      <section className="space-y-3 md:space-y-4">
        <h3 className="text-base md:text-lg font-bold text-foreground">화면 표시 설정</h3>
        <div className="bg-card rounded-xl md:rounded-2xl shadow-sm border border-border divide-y divide-border">
          <label className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-xl md:rounded-t-2xl">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">대한민국 공휴일 표시</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">달력에 대체공휴일을 포함한 법정 공휴일을 붉은색으로 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showHolidays ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showHolidays} onChange={(e) => setShowHolidays(e.target.checked)} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${showHolidays ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
          <label className={`flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors ${!showHolidays ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">공휴일을 태그로 표시</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">달력에 공휴일을 일반 일정처럼 태그 형태로 강조하여 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showHolidaysAsTags ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showHolidaysAsTags} onChange={(e) => setShowHolidaysAsTags(e.target.checked)} disabled={!showHolidays} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${showHolidaysAsTags ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
          <label className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">국경일 표시</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">제헌절 등 쉬지 않는 국가 경축일을 달력에 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showNationalDays ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showNationalDays} onChange={(e) => setShowNationalDays(e.target.checked)} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${showNationalDays ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
          <label className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">기념일 표시</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">어버이날, 식목일 등 법정 기념일을 달력에 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showAnniversaries ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showAnniversaries} onChange={(e) => setShowAnniversaries(e.target.checked)} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${showAnniversaries ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
          <label className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors rounded-b-xl md:rounded-b-2xl">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">24절기 및 잡절 표시</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">입춘, 동지 등 24절기와 초복, 한식 등 세시풍속을 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showTraditionalTerms ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showTraditionalTerms} onChange={(e) => setShowTraditionalTerms(e.target.checked)} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${showTraditionalTerms ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>
      </section>
    </div>
  )
}
