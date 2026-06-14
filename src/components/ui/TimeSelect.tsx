'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Clock } from 'lucide-react'

interface TimeSelectProps {
  value: string
  onChange: (time: string) => void
  disabled?: boolean
  className?: string
  required?: boolean
}

export function TimeSelect({ value, onChange, disabled, className = '', required }: TimeSelectProps) {
  const [open, setOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const timeOptions = useMemo(() => {
    const options: string[] = []
    for (let h = 0; h < 24; h++) {
      const hourStr = h.toString().padStart(2, '0')
      options.push(`${hourStr}:00`)
      options.push(`${hourStr}:30`)
    }
    return options
  }, [])

  useEffect(() => {
    if (open && scrollRef.current) {
      setTimeout(() => {
        // Find closest element
        let closestEl: HTMLElement | null = null
        let minDiff = Infinity
        
        const [vH, vM] = (value || '00:00').split(':').map(Number)
        const vTotal = vH * 60 + vM

        const items = scrollRef.current!.querySelectorAll<HTMLElement>('[data-time]')
        items.forEach(item => {
          const t = item.dataset.time
          if (t) {
            const [h, m] = t.split(':').map(Number)
            const tTotal = h * 60 + m
            const diff = Math.abs(tTotal - vTotal)
            if (diff < minDiff) {
              minDiff = diff
              closestEl = item
            }
          }
        })

        if (closestEl) {
          (closestEl as HTMLElement).scrollIntoView({ block: 'center' })
        }
      }, 10) // small delay to ensure DOM is ready
    }
  }, [open, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <button
          type="button"
          disabled={disabled}
          className={`relative w-full flex items-center text-left pl-9 pr-3 border rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed h-10 ${className}`}
        >
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <span className={`block truncate ${!value ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
            {value || '시간 선택'}
          </span>
        </button>
      } />
      <PopoverContent 
        align="start" 
        className="w-[160px] p-1.5 shadow-xl border-gray-100 rounded-xl bg-white z-[200]"
      >
        <div ref={scrollRef} className="max-h-[220px] overflow-y-auto overscroll-contain rounded-lg scrollbar-thin scrollbar-thumb-gray-200">
          <div className="flex flex-col gap-0.5">
            {timeOptions.map((time) => {
              const isSelected = value === time
              return (
                <button
                  key={time}
                  type="button"
                  data-time={time}
                  data-active={isSelected}
                  onClick={() => {
                    onChange(time)
                    setOpen(false)
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-md text-left transition-colors
                    ${isSelected 
                      ? 'bg-indigo-50 text-indigo-700 font-bold' 
                      : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {time}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
