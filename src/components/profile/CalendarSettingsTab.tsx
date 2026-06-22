'use client'

import { useCalendarStore } from '@/store/useCalendarStore'
import type { CalendarFontSize } from '@/lib/calendarFontSize'

export function CalendarSettingsTab() {
  const { 
    showHolidays, setShowHolidays, 
    showHolidaysAsTags, setShowHolidaysAsTags,
    showNationalDays, setShowNationalDays,
    showAnniversaries, setShowAnniversaries,
    showTraditionalTerms, setShowTraditionalTerms,
    calendarFontSize, setCalendarFontSize,
    weekStartsOn, setWeekStartsOn,
    showSaturdayBlue, setShowSaturdayBlue,
  } = useCalendarStore()

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full max-w-2xl mx-auto py-2 md:py-4">
      {/* 화면 표시 설정 섹션 (기존 DisplayTab에서 이동) */}
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
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-card transition-transform ${showHolidays ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
          <label className={`flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors ${!showHolidays ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">공휴일을 태그로 표시</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">달력에 공휴일을 일반 일정처럼 태그 형태로 강조하여 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showHolidaysAsTags ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showHolidaysAsTags} onChange={(e) => setShowHolidaysAsTags(e.target.checked)} disabled={!showHolidays} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-card transition-transform ${showHolidaysAsTags ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
          <label className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">국경일 표시</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">제헌절 등 쉬지 않는 국가 경축일을 달력에 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showNationalDays ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showNationalDays} onChange={(e) => setShowNationalDays(e.target.checked)} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-card transition-transform ${showNationalDays ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
          <label className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">기념일 표시</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">어버이날, 식목일 등 법정 기념일을 달력에 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showAnniversaries ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showAnniversaries} onChange={(e) => setShowAnniversaries(e.target.checked)} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-card transition-transform ${showAnniversaries ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
          <label className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors rounded-b-xl md:rounded-b-2xl">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">24절기 및 잡절 표시</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">입춘, 동지 등 24절기와 초복, 한식 등 세시풍속을 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showTraditionalTerms ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showTraditionalTerms} onChange={(e) => setShowTraditionalTerms(e.target.checked)} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-card transition-transform ${showTraditionalTerms ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>
      </section>

      {/* 달력 표시 옵션 섹션 (신규) */}
      <section className="space-y-3 md:space-y-4">
        <h3 className="text-base md:text-lg font-bold text-foreground">달력 표시 옵션</h3>
        <div className="bg-card rounded-xl md:rounded-2xl shadow-sm border border-border divide-y divide-border">
          {/* 달력 글자 크기 */}
          <div className="flex items-center justify-between p-4 md:p-5">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">달력 글자 크기</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">캘린더에 표시되는 날짜, 일정 제목 등의 글자 크기를 조절합니다.</p>
            </div>
            <select
              value={calendarFontSize}
              onChange={(e) => setCalendarFontSize(e.target.value as CalendarFontSize)}
              className="shrink-0 text-sm font-semibold bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer appearance-none min-w-[100px] text-center"
            >
              <option value="x-small">매우 작게</option>
              <option value="small">작게</option>
              <option value="normal">보통</option>
              <option value="large">크게</option>
              <option value="x-large">매우 크게</option>
            </select>
          </div>

          {/* 한 주의 시작 */}
          <div className="flex items-center justify-between p-4 md:p-5">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">한 주의 시작</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">캘린더에서 한 주가 시작되는 요일을 설정합니다.</p>
            </div>
            <select
              value={weekStartsOn}
              onChange={(e) => setWeekStartsOn(parseInt(e.target.value) as 0 | 1)}
              className="shrink-0 text-sm font-semibold bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer appearance-none min-w-[100px] text-center"
            >
              <option value={0}>일요일</option>
              <option value={1}>월요일</option>
            </select>
          </div>

          {/* 토요일 파란색으로 보기 */}
          <label className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-accent/50 transition-colors rounded-b-xl md:rounded-b-2xl">
            <div className="pr-3">
              <p className="font-semibold text-[13px] md:text-base text-foreground">토요일 파란색으로 보기</p>
              <p className="text-[11px] md:text-sm leading-tight text-muted-foreground mt-1 md:mt-0.5">토요일의 날짜 숫자와 요일 헤더를 파란색으로 표시합니다.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors shrink-0 ${showSaturdayBlue ? 'bg-primary' : 'bg-muted'}`}>
              <input type="checkbox" className="sr-only" checked={showSaturdayBlue} onChange={(e) => setShowSaturdayBlue(e.target.checked)} />
              <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-card transition-transform ${showSaturdayBlue ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>
      </section>
    </div>
  )
}
