'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { X, User, MonitorPlay } from 'lucide-react'
import { ProfileTab } from './ProfileTab'
import { DisplayTab } from './DisplayTab'
import { PinPadOverlay } from '@/components/archive/PinPadOverlay'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: TabKey
}

type TabKey = 'profile' | 'display'

export function SettingsModal({ open, onOpenChange, initialTab = 'profile' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

  // 모달이 열리거나 initialTab이 변경될 때 상태 동기화
  useEffect(() => {
    if (open && initialTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(initialTab)
    }
  }, [open, initialTab])


  const TABS = [
    { id: 'profile', label: '프로필', icon: User },
    { id: 'display', label: '디스플레이 및 테마', icon: MonitorPlay },
  ] as const

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[900px] md:max-w-[1000px] h-[90vh] max-h-[800px] p-0 overflow-hidden bg-[#f8f9ff] border-none shadow-2xl rounded-2xl flex flex-col">
        <DialogHeader className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-white flex flex-row items-center justify-between z-10 shadow-sm relative">
          <DialogTitle className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">환경설정</DialogTitle>
          <DialogDescription className="sr-only">사용자 프로필, 디스플레이, 카테고리, 데이터를 설정하는 모달입니다.</DialogDescription>
          <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-56 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-2 md:p-4 flex flex-row md:flex-col gap-1 md:gap-2 shadow-sm z-0 overflow-x-auto md:overflow-visible flex-shrink-0 hide-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  className={`flex items-center gap-1.5 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl text-[12px] md:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100/50' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 relative">
            <PinPadOverlay>
              <div className="h-full overflow-y-auto p-3 sm:p-6 md:p-8 absolute inset-0">
                <div className="max-w-3xl mx-auto">
                  {activeTab === 'profile' && <ProfileTab />}
                  {activeTab === 'display' && <DisplayTab />}
                </div>
              </div>
            </PinPadOverlay>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
