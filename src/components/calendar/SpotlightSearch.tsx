'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Search, Loader2, FileText } from 'lucide-react'
import { useSearchActivities } from '@/hooks/useCalendarQueries'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface SpotlightSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SpotlightSearch({ open, onOpenChange }: SpotlightSearchProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isLoading } = useSearchActivities(debouncedQuery)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>통합 검색</DialogTitle>
          <DialogDescription>일정 제목이나 메모를 검색하세요.</DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="일정, 할 일, 메모 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-lg text-slate-800 placeholder-slate-400 focus:ring-0"
          />
          {isLoading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
        </div>

        <div className="max-h-[60vh] overflow-y-auto bg-slate-50/50">
          {!query && (
            <div className="py-12 text-center text-slate-500">
              <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p>원하는 일정을 검색해 보세요.</p>
            </div>
          )}

          {query && !isLoading && results?.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <p>검색 결과가 없습니다.</p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="p-2 space-y-1">
              {results.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex flex-col p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: activity.hex_color || '#3b82f6' }}
                      />
                      <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {activity.title}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                      {format(new Date(activity.start_time), 'yyyy. M. d. (E)', { locale: ko })}
                    </span>
                  </div>
                  {activity.memo && (
                    <div className="flex items-start mt-2 pl-6 text-sm text-slate-500">
                      <FileText className="w-4 h-4 mr-1.5 shrink-0 mt-0.5 text-slate-400" />
                      <p className="line-clamp-2">{activity.memo}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
