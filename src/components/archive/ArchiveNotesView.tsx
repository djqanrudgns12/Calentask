'use client'

import { useState } from 'react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { PinPadOverlay } from '@/components/archive/PinPadOverlay';
import { DocumentBoard } from '@/components/archive/boards/DocumentBoard';
import { CanvasBoard } from '@/components/archive/boards/CanvasBoard';
import { MasonryBoard } from '@/components/archive/boards/MasonryBoard';
import { TableBoard } from '@/components/archive/boards/TableBoard';
import { MediaBoard } from '@/components/archive/boards/MediaBoard';
import { JournalBoard } from '@/components/archive/boards/JournalBoard';
import { Plus, LayoutGrid, LayoutList, Grip, Image as ImageIcon, Table, Columns, Clock, FolderOpen, Video, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddNoteDialog } from './AddNoteDialog';
import { CommandPalette } from './CommandPalette';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';

export function ArchiveNotesView() {
  const { tabs, activeTabId, setActiveTabId, setCommandPaletteOpen } = useArchiveStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddNewTab = () => {
    setIsAddDialogOpen(true);
  };

  // Global Hotkeys
  useHotkeys('mod+k', (e) => { e.preventDefault(); setCommandPaletteOpen(true); }, { enableOnFormTags: true });
  useHotkeys('mod+n', (e) => { e.preventDefault(); handleAddNewTab(); }, { enableOnFormTags: true });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'list': return FileText;
      case 'masonry': return ImageIcon;
      case 'canvas': return LayoutGrid;
      case 'table': return Table;
      case 'kanban': return Video;
      case 'journal': return Clock;
      default: return LayoutGrid;
    }
  };

  return (
    <PinPadOverlay>
      <div className="flex flex-col h-full bg-[#f7f9fb]">
        {/* Header & Tabs */}
        <div className="px-8 pt-8 pb-4 border-b border-slate-200 bg-white/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">아카이브 노트</h1>
              <p className="text-slate-500 mt-1 text-sm font-medium">나만의 지식 보관소이자 창의력을 펼치는 캔버스입니다.</p>
            </div>
            <button 
              onClick={handleAddNewTab}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              새 노트 추가
            </button>
          </div>

          {/* Dynamic Tabs Navigation */}
          {tabs.length > 0 && (
            <div className="flex items-center space-x-2 overflow-x-auto hide-scrollbar">
              {tabs.map((tab: any) => {
                const Icon = getIconForType(tab.board_type);
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                      isActive 
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:bg-white/60 hover:text-slate-700 border border-transparent"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Board Content Area */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="w-full h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
            {tabs.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fafafa]">
                <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-3xl flex items-center justify-center mb-6">
                  <FolderOpen className="w-10 h-10 text-indigo-300" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800 mb-2">아직 작성된 노트가 없습니다</h2>
                <p className="text-slate-500 font-medium mb-6 text-center max-w-sm">
                  우측 상단의 <strong className="text-indigo-600">새 노트 추가</strong> 버튼을 눌러<br/>당신만의 첫 번째 캔버스를 만들어보세요!
                </p>
                <button 
                  onClick={handleAddNewTab}
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                >
                  새 노트 작성하기
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTabId || 'empty'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                  className="w-full h-full relative"
                >
                  {tabs.find((t: any) => t.id === activeTabId)?.board_type === 'list' && <DocumentBoard />}
                  {tabs.find((t: any) => t.id === activeTabId)?.board_type === 'canvas' && <CanvasBoard />}
                  {tabs.find((t: any) => t.id === activeTabId)?.board_type === 'masonry' && <MasonryBoard />}
                  {tabs.find((t: any) => t.id === activeTabId)?.board_type === 'table' && <TableBoard />}
                  {tabs.find((t: any) => t.id === activeTabId)?.board_type === 'kanban' && <MediaBoard />}
                  {tabs.find((t: any) => t.id === activeTabId)?.board_type === 'journal' && <JournalBoard />}
                  
                  {/* 렌더링 타입이 매칭되지 않을 경우 폴백 UI */}
                  {activeTabId && !['list', 'canvas', 'masonry', 'table', 'kanban', 'journal'].includes(tabs.find((t: any) => t.id === activeTabId)?.board_type || '') && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Grip className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-700 mb-1">개발 중인 보드 타입</h3>
                      <p className="text-slate-400 text-sm">해당 뷰는 현재 업데이트를 준비 중입니다.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
      <AddNoteDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} />
      <CommandPalette />
    </PinPadOverlay>
  );
}
