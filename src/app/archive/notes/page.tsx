'use client'

import { useState } from 'react';
import { ListBoard } from '@/components/archive/boards/ListBoard';
import { CanvasBoard } from '@/components/archive/boards/CanvasBoard';
import { MasonryBoard } from '@/components/archive/boards/MasonryBoard';
import { TableBoard } from '@/components/archive/boards/TableBoard';
import { KanbanBoard } from '@/components/archive/boards/KanbanBoard';
import { JournalBoard } from '@/components/archive/boards/JournalBoard';
import { GalleryBoard } from '@/components/archive/boards/GalleryBoard';
import { Plus, LayoutGrid, LayoutList, Grip, Image as ImageIcon, Table, Columns, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dummy data to simulate dynamic tabs based on DB
const mockTabs = [
  { id: '1', name: 'Ideas & Thoughts', type: 'list', icon: LayoutList },
  { id: '2', name: 'Design Inspiration', type: 'masonry', icon: ImageIcon },
  { id: '3', name: 'Project Brainstorm', type: 'canvas', icon: LayoutGrid },
  { id: '4', name: 'Dev Database', type: 'table', icon: Table },
  { id: '5', name: 'Sprint Workflow', type: 'kanban', icon: Columns },
  { id: '6', name: 'Dev Log', type: 'journal', icon: Clock },
  { id: '7', name: 'UI Assets', type: 'gallery', icon: ImageIcon },
];

export default function NotesPage() {
  const [activeTab, setActiveTab] = useState(mockTabs[0].id);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header & Tabs */}
        <div className="px-8 pt-8 pb-4 border-b border-slate-200 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Notes</h1>
              <p className="text-slate-500 mt-1 text-sm">Your private knowledge base and creative canvas.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 shadow-md shadow-slate-900/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4" />
              New Tab
            </button>
          </div>

          {/* Custom Tabs Navigation */}
          <div className="flex items-center space-x-2 overflow-x-auto hide-scrollbar">
            {mockTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-slate-100 text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-slate-900" : "text-slate-400")} />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Content Area */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="w-full h-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {mockTabs.find(t => t.id === activeTab)?.type === 'list' && <ListBoard />}
            {mockTabs.find(t => t.id === activeTab)?.type === 'canvas' && <CanvasBoard />}
            {mockTabs.find(t => t.id === activeTab)?.type === 'masonry' && <MasonryBoard />}
            {mockTabs.find(t => t.id === activeTab)?.type === 'table' && <TableBoard />}
            {mockTabs.find(t => t.id === activeTab)?.type === 'kanban' && <KanbanBoard />}
            {mockTabs.find(t => t.id === activeTab)?.type === 'journal' && <JournalBoard />}
            {mockTabs.find(t => t.id === activeTab)?.type === 'gallery' && <GalleryBoard />}
            {!['list', 'canvas', 'masonry', 'table', 'kanban', 'journal', 'gallery'].includes(mockTabs.find(t => t.id === activeTab)?.type || '') && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Grip className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Board Content Area</h3>
                <p className="text-slate-400 text-sm">This board type is currently under construction.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
