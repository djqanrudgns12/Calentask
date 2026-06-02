'use client'

import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useArchiveStore } from '@/store/useArchiveStore';
import { FileText, Database, Columns, Layout, Video, Settings, Search, Plus, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen, tabs, setActiveTabId } = useArchiveStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'kanban': return <Columns className="w-4 h-4" />;
      case 'canvas': return <Layout className="w-4 h-4" />;
      case 'media': return <Video className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -10 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: -10 }} 
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <Command className="w-full flex flex-col bg-transparent">
          <div className="flex items-center px-4 border-b border-slate-100" cmdk-input-wrapper="">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <Command.Input 
              autoFocus
              placeholder="명령어 검색 또는 탭 이동... (예: 새 노트)"
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 font-medium placeholder:text-slate-400 px-3 py-4 text-sm" 
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-smooth">
            <Command.Empty className="py-6 text-center text-sm text-slate-400">결과가 없습니다.</Command.Empty>

            <Command.Group heading="최근 탭 이동" className="px-2 py-1 text-xs font-bold text-slate-400 mb-1">
              {tabs.slice(0, 5).map(tab => (
                <Command.Item
                  key={tab.id}
                  onSelect={() => {
                    setActiveTabId(tab.id);
                    setCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-600 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                    {getIconForType(tab.board_type)}
                  </div>
                  {tab.name}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="h-px bg-slate-100 my-2" />

            <Command.Group heading="빠른 액션" className="px-2 py-1 text-xs font-bold text-slate-400 mb-1">
              <Command.Item className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-600 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-indigo-500" />
                </div>
                새로운 워크스페이스 탭 만들기
              </Command.Item>
              <Command.Item className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-600 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-rose-500" />
                </div>
                아젠다(Agenda) 뷰로 이동
              </Command.Item>
              <Command.Item className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-600 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4 text-slate-500" />
                </div>
                환경설정
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
        
        <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
           <div className="flex items-center gap-4">
             <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-sm font-sans font-bold">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-sm font-sans font-bold">↓</kbd> 이동</span>
             <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-sm font-sans font-bold">Enter</kbd> 선택</span>
           </div>
           <span><kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-sm font-sans font-bold">ESC</kbd> 닫기</span>
        </div>
      </motion.div>
    </div>
  );
}
