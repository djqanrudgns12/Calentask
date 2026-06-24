'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity } from '@/app/actions/calendar'
import { X, CalendarPlus, MapPin, Users, BookOpen } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getEventBarGradient, getEventBgColor } from '@/lib/eventColor'

interface AcademicEventDetailPopoverProps {
  event: Activity
  onClose: () => void
}

export function AcademicEventDetailPopover({ event, onClose }: AcademicEventDetailPopoverProps) {
  // 날짜 포맷
  const startDate = parseISO(event.start_time)
  const endDate = parseISO(event.end_time)
  const isSameDay = startDate.toDateString() === endDate.toDateString()
  
  const dateText = isSameDay 
    ? format(startDate, 'yyyy.MM.dd (E)', { locale: ko })
    : `${format(startDate, 'yyyy.MM.dd (E)', { locale: ko })} ~ ${format(endDate, 'yyyy.MM.dd (E)', { locale: ko })}`

  // 메모 내용 파싱 (대상 학년, 비고 등)
  const memoLines = event.memo ? event.memo.split('\n') : []
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-background w-full max-w-sm rounded-2xl shadow-xl border border-border overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="h-16 relative flex items-center px-5"
            style={{ backgroundColor: getEventBgColor(event) }}
          >
            <div 
              className="absolute left-0 top-0 bottom-0 w-1.5"
              style={{ background: getEventBarGradient(event) }}
            />
            <button 
              onClick={onClose}
              className="absolute right-3 top-3 p-1.5 rounded-full hover:bg-black/10 text-foreground/70 hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-lg truncate pr-8">{event.title}</h2>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <CalendarPlus className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{dateText}</span>
                <span className="text-xs text-muted-foreground mt-0.5">하루 종일</span>
              </div>
            </div>

            {memoLines.map((line, idx) => {
              let Icon = BookOpen
              if (line.includes('대상:')) Icon = Users
              if (line.includes('비고:')) Icon = MapPin
              
              if (!line.trim()) return null
              
              return (
                <div key={idx} className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    {line}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between gap-3">
            <button 
              disabled
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium opacity-60 cursor-not-allowed"
            >
              <CalendarPlus className="w-4 h-4" />
              내 캘린더에 추가 (Coming Soon)
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2.5 bg-background border border-border hover:bg-accent rounded-lg text-sm font-medium transition-colors"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
