'use client'

import { useState, useEffect, useRef } from 'react';
import { FileText, MoreHorizontal, Clock, AlignLeft, Bold, Italic, Type, MessageSquare, Plus } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';

export function DocumentBoard() {
  const { activeTabId, tabs, items: storeItems, updateItem, addItem, setTabs } = useArchiveStore();
  const currentTab = tabs.find(t => t.id === activeTabId);
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];
  
  // Use the first item as the document content
  const docItem = items[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [docItem?.content]);

  // Create document item if it doesn't exist
  useEffect(() => {
    if (activeTabId && items.length === 0) {
      addItem(activeTabId, { title: currentTab?.name || '새 문서', content: '' });
    }
  }, [activeTabId, items.length, addItem, currentTab?.name]);

  if (!docItem) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    updateItem(activeTabId!, docItem.id, { title: newTitle });
    // Update tab name as well
    const updatedTabs = tabs.map(t => t.id === activeTabId ? { ...t, name: newTitle || '제목 없음' } : t);
    setTabs(updatedTabs);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateItem(activeTabId!, docItem.id, { content: e.target.value });
  };

  const textCount = docItem.content?.length || 0;
  const wordCount = docItem.content?.trim() ? docItem.content.trim().split(/\s+/).length : 0;
  const readTime = Math.ceil(wordCount / 200); // 200 words per minute

  return (
    <div className="w-full h-full bg-white relative flex flex-col">
      {/* Top Toolbar */}
      <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all shadow-sm"><Bold className="w-4 h-4" /></button>
          <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all"><Italic className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all"><AlignLeft className="w-4 h-4" /></button>
          <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all"><Type className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> 단어 {wordCount}개</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 읽기 {readTime}분</span>
          <button className="p-2 hover:bg-slate-50 rounded-full transition-colors ml-2"><MoreHorizontal className="w-5 h-5 text-slate-400" /></button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-3xl mx-auto px-8 py-16">
          <input 
            type="text"
            value={docItem.title}
            onChange={handleTitleChange}
            placeholder="제목을 입력하세요"
            className="w-full text-4xl md:text-5xl font-extrabold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 mb-8 placeholder:text-slate-300 transition-all tracking-tight"
          />
          
          <div className="relative group">
            {/* Context menu hint */}
            <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <textarea
              ref={textareaRef}
              value={docItem.content || ''}
              onChange={handleContentChange}
              placeholder="'/'를 입력하여 명령어를 사용하거나 글을 작성하기 시작하세요..."
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-lg text-slate-700 leading-[1.8] resize-none overflow-hidden placeholder:text-slate-300 font-medium min-h-[500px]"
            />
          </div>
        </div>
      </div>
      
      {/* Floating format hint */}
      <div className="absolute bottom-8 right-8 bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 opacity-0 hover:opacity-100 animate-pulse transition-opacity">
        <MessageSquare className="w-4 h-4" /> 텍스트를 드래그하여 서식을 지정해보세요
      </div>
    </div>
  );
}
