'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { X, User, MonitorPlay, Tags, Database } from 'lucide-react'
import { ProfileTab } from './ProfileTab'
import { DisplayTab } from './DisplayTab'
import { TagsTab } from './TagsTab'
import { DataTab } from './DataTab'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TabKey = 'profile' | 'display' | 'tags' | 'data'

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('profile')

  const TABS = [
    { id: 'profile', label: '프로필 및 아바타', icon: User },
    { id: 'display', label: '디스플레이 및 테마', icon: MonitorPlay },
    { id: 'tags', label: '태그 관리소', icon: Tags },
    { id: 'data', label: '데이터 허브', icon: Database },
  ] as const

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[900px] h-[90vh] max-h-[700px] p-0 overflow-hidden bg-[#f8f9ff] border-none shadow-2xl rounded-2xl flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white flex flex-row items-center justify-between z-10 shadow-sm relative">
          <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">환경설정</DialogTitle>
          <DialogDescription className="sr-only">사용자 프로필, 디스플레이, 카테고리, 데이터를 설정하는 모달입니다.</DialogDescription>
          <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-full sm:w-64 bg-white border-b sm:border-b-0 sm:border-r border-slate-100 p-2 sm:p-4 flex flex-row sm:flex-col gap-2 shadow-sm z-0 overflow-x-auto sm:overflow-visible flex-shrink-0 hide-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
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
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'display' && <DisplayTab />}
              {activeTab === 'tags' && <TagsTab />}
              {activeTab === 'data' && <DataTab />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
