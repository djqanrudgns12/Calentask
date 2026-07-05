'use client'

import { useState, useRef, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCalendarStore } from '@/store/useCalendarStore'
import { setYear, setMonth, getYear, getMonth } from 'date-fns'
import { ChevronDown } from 'lucide-react'

interface DatePickerPopoverProps {
  children: React.ReactNode
}

export function DatePickerPopover({ children }: DatePickerPopoverProps) {
  const currentDate = useCalendarStore(s => s.currentDate)
  const viewMode = useCalendarStore(s => s.viewMode)
  const setCurrentDate = useCalendarStore(s => s.setCurrentDate)
  const semesterYear = useCalendarStore(s => s.semesterYear)
  const semesterTerm = useCalendarStore(s => s.semesterTerm)
  const setSemesterYear = useCalendarStore(s => s.setSemesterYear)
  const setSemesterTerm = useCalendarStore(s => s.setSemesterTerm)

  const [open, setOpen] = useState(false)
  
  const currentY = viewMode === 'semester' ? semesterYear : getYear(currentDate)
  const currentM = viewMode === 'semester' ? null : getMonth(currentDate)

  const [selectedYear, setSelectedYear] = useState(currentY)
  const yearScrollRef = useRef<HTMLDivElement>(null)

  // 팝업이 열릴 때 선택된 연도를 현재 캘린더 연도로 동기화 및 자동 스크롤
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedYear(currentY)
      setTimeout(() => {
        if (yearScrollRef.current) {
          const activeEl = yearScrollRef.current.querySelector('.active-year') as HTMLElement
          if (activeEl) {
            activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
        }
      }, 50)
    }
  }, [open, currentY])

  const years = Array.from({ length: 41 }, (_, i) => currentY - 20 + i)

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(currentDate, selectedYear), monthIndex)
    setCurrentDate(newDate)
    setOpen(false)
  }

  const handleSemesterSelect = (term: 1 | 2) => {
    setSemesterYear(selectedYear)
    setSemesterTerm(term)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* @base-ui/react의 PopoverTrigger는 asChild가 없으므로 render prop 없이 직접 내용을 넣음 */}
      <PopoverTrigger
        className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl hover:bg-card/50 transition-colors group outline-none cursor-pointer"
      >
        <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
          {children}
        </h2>
        <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0 rounded-2xl shadow-xl border border-border overflow-hidden" align="center" sideOffset={8}>
        <div className="flex h-[280px]">
          {/* Left: Year Scroll */}
          <div 
            ref={yearScrollRef}
            className="w-1/3 border-r border-border overflow-y-auto hide-scrollbar bg-muted/50 py-2"
          >
            {years.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`w-full py-2.5 text-center text-sm font-semibold transition-colors ${
                  selectedYear === y 
                    ? 'text-blue-600 bg-blue-50 active-year' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {y}년
              </button>
            ))}
          </div>

          {/* Right: Months or Semester Grid */}
          <div className="w-2/3 p-4 bg-card flex flex-col justify-center">
            {viewMode === 'semester' ? (
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => handleSemesterSelect(1)}
                  className={`py-5 rounded-xl font-bold text-lg transition-all ${
                    selectedYear === semesterYear && semesterTerm === 1
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-muted text-foreground hover:bg-muted'
                  }`}
                >
                  1학기 (3월~8월)
                </button>
                <button 
                  onClick={() => handleSemesterSelect(2)}
                  className={`py-5 rounded-xl font-bold text-lg transition-all ${
                    selectedYear === semesterYear && semesterTerm === 2
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-muted text-foreground hover:bg-muted'
                  }`}
                >
                  2학기 (9월~2월)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 h-full">
                {Array.from({ length: 12 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => handleMonthSelect(i)}
                    className={`rounded-xl text-sm font-semibold transition-all ${
                      selectedYear === currentY && currentM === i
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-muted text-foreground hover:bg-muted'
                    }`}
                  >
                    {i + 1}월
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
