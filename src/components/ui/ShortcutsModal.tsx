'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useGlobalUIStore } from '@/store/useGlobalUIStore'
import { Command, X, Search, FilePlus2, ArchiveRestore, LayoutDashboard, Calendar, History, Undo2 } from 'lucide-react'

export function ShortcutsModal() {
  const { isShortcutsModalOpen, closeShortcutsModal } = useGlobalUIStore()
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    // Check OS on mount
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  const ModKey = () => (
    <kbd className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">
      {isMac ? <Command className="w-3 h-3" /> : 'Ctrl'}
    </kbd>
  )

  const Key = ({ children }: { children: React.ReactNode }) => (
    <kbd className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">
      {children}
    </kbd>
  )

  const shortcuts = [
    {
      category: '전역 제어 (Global)',
      items: [
        { icon: <Search className="w-4 h-4" />, label: '커맨드 팔레트 열기', keys: [<ModKey key="mod" />, <Key key="k">K</Key>] },
        { icon: <Search className="w-4 h-4" />, label: '단축키 안내 보기', keys: [<ModKey key="mod" />, <Key key="slash">/</Key>] },
        { icon: <X className="w-4 h-4" />, label: '모달 / 포커스 닫기', keys: [<Key key="esc">Esc</Key>] },
      ]
    },
    {
      category: '생성 및 액션 (Action)',
      items: [
        { icon: <FilePlus2 className="w-4 h-4" />, label: '새 항목 추가 (일정/노트)', keys: [<ModKey key="mod" />, <Key key="n">N</Key>] },
        { icon: <ArchiveRestore className="w-4 h-4" />, label: '저장 및 완료', keys: [<ModKey key="mod" />, <Key key="enter">Enter</Key>] },
        { icon: <Undo2 className="w-4 h-4" />, label: '실행 취소 (추후 도입)', keys: [<ModKey key="mod" />, <Key key="z">Z</Key>] },
      ]
    },
    {
      category: '화면 이동 (Navigation)',
      items: [
        { icon: <Calendar className="w-4 h-4" />, label: '캘린더 화면 이동', keys: [<ModKey key="mod" />, <Key key="1">1</Key>] },
        { icon: <LayoutDashboard className="w-4 h-4" />, label: '아카이브 화면 이동', keys: [<ModKey key="mod" />, <Key key="2">2</Key>] },
      ]
    }
  ]

  return (
    <Dialog open={isShortcutsModalOpen} onOpenChange={closeShortcutsModal}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-slate-200/60 shadow-2xl rounded-2xl">
        <div className="p-6 pb-4 bg-slate-50/50 border-b border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Command className="w-5 h-5 text-indigo-500" />
              키보드 단축키
            </DialogTitle>
            <DialogDescription className="text-slate-500 mt-1.5">
              Calentask를 마우스 없이 더 빠르게 사용하세요.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 pt-2 max-h-[60vh] overflow-y-auto space-y-6">
          {shortcuts.map((group, i) => (
            <div key={i} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{group.category}</h4>
              <div className="space-y-1">
                {group.items.map((item, j) => (
                  <div key={j} className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <div className="text-slate-400">{item.icon}</div>
                      {item.label}
                    </div>
                    <div className="flex items-center gap-1">
                      {item.keys}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
