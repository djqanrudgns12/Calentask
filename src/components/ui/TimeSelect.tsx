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
  const [inputValue, setInputValue] = useState(value)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value
  useEffect(() => {
    setInputValue(value)
  }, [value])

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
        let closestEl: HTMLElement | null = null
        let minDiff = Infinity
        
        const [vH, vM] = (value || '00:00').split(':').map(Number)
        const vTotal = (isNaN(vH) ? 0 : vH) * 60 + (isNaN(vM) ? 0 : vM)

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
      }, 10)
    }
  }, [open, value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (e.target.value) {
      onChange(e.target.value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <div
          className={`relative w-full flex items-center bg-card border border-border rounded-xl transition-colors focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent overflow-hidden h-10 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          onClick={() => { if (!disabled) inputRef.current?.focus() }}
        >
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="time"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            required={required}
            className="w-full h-full pl-9 pr-3 bg-transparent text-foreground font-medium focus:outline-none placeholder:text-muted-foreground/50 [&::-webkit-calendar-picker-indicator]:hidden"
          />
        </div>
      } />
      <PopoverContent 
        align="start" 
        className="w-[160px] p-1.5 shadow-xl border-border rounded-xl bg-card/95 backdrop-blur-xl z-[200]"
      >
        <div ref={scrollRef} className="max-h-[220px] overflow-y-auto overscroll-contain rounded-lg hide-scrollbar">
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
                    setInputValue(time)
                    setOpen(false)
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors
                    ${isSelected 
                      ? 'bg-indigo-50 text-indigo-700 font-bold' 
                      : 'text-foreground hover:bg-muted active:bg-muted'}`}
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
