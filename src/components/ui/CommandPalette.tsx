'use client'

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useArchiveStore } from '@/store/useArchiveStore'
import { useCalendarStore } from '@/store/useCalendarStore'
import { Calendar, Database, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const { tabs, setActiveTabId } = useArchiveStore()
  const { setViewMode } = useCalendarStore()
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <Command 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-2" />
          <Command.Input 
            autoFocus
            placeholder="명령어 입력 또는 노트 검색..." 
            className="flex-1 py-4 text-lg bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-semibold font-mono border border-slate-200">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-slate-500 font-medium">검색 결과가 없습니다.</Command.Empty>

          <Command.Group heading="빠른 탐색" className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Command.Item 
              onSelect={() => {
                setViewMode('monthly')
                setOpen(false)
              }}
              className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer font-medium aria-selected:bg-slate-100 aria-selected:text-indigo-600 transition-colors"
            >
              <Calendar className="w-5 h-5 text-blue-500" />
              메인 캘린더 이동
            </Command.Item>
            <Command.Item 
              onSelect={() => {
                setViewMode('archive_notes')
                setOpen(false)
              }}
              className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer font-medium aria-selected:bg-slate-100 aria-selected:text-indigo-600 transition-colors"
            >
              <Database className="w-5 h-5 text-indigo-500" />
              아카이브 홈 이동
            </Command.Item>
          </Command.Group>

          {tabs.length > 0 && (
            <Command.Group heading="아카이브 노트" className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mt-4">
              {tabs.map((tab: any) => (
                <Command.Item 
                  key={tab.id}
                  onSelect={() => {
                    setViewMode('archive_notes')
                    setActiveTabId(tab.id)
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer font-medium aria-selected:bg-slate-100 aria-selected:text-indigo-600 transition-colors"
                >
                  <Database className="w-4 h-4 text-slate-400" />
                  {tab.name}
                  <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{tab.board_type}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  )
}
