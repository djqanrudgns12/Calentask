'use client'

import { useState } from 'react';
import { Circle, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArchiveStore } from '@/store/useArchiveStore';

export function ListBoard() {
  const { activeTabId, tabs, items: storeItems, updateItem, addItem } = useArchiveStore();
  const currentTab = tabs.find(t => t.id === activeTabId);
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];
  
  const [inputValue, setInputValue] = useState('');

  const toggleItem = (id: string) => {
    if (!activeTabId) return;
    const item = items.find(i => i.id === id);
    if (item) {
      updateItem(activeTabId, id, { status: item.status === 'done' ? 'todo' : 'done' });
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeTabId) return;
    addItem(activeTabId, {
      title: inputValue.trim(),
      status: 'todo',
    });
    setInputValue('');
  };

  const todoItems = items.filter(i => i.status !== 'done');
  const doneItems = items.filter(i => i.status === 'done');

  const totalCount = items.length;
  const doneCount = doneItems.length;

  return (
    <div className="flex h-full w-full bg-white text-left relative flex-col">
      {/* Main List */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto pb-32">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            {currentTab?.name || '새 리스트 보드'}
          </h1>
          <p className="text-slate-400 text-sm mb-12 font-bold">
            총 작업 {totalCount}개 • 완료 {doneCount}개
          </p>

          <div className="space-y-10">
            {/* Group: TODO */}
            {todoItems.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4 uppercase">진행 중 <span className="font-normal ml-1">({todoItems.length})</span></h2>
                <div className="space-y-1">
                  {todoItems.map(item => (
                    <div key={item.id} className="group flex items-center gap-4 py-3 border-b border-slate-50 hover:bg-slate-50/80 transition-colors px-2 -mx-2 rounded-lg cursor-pointer" onClick={() => toggleItem(item.id)}>
                      <button className="flex-shrink-0 transition-colors">
                        <Circle className="w-6 h-6 text-slate-300 group-hover:text-slate-400" />
                      </button>
                      <span className="text-[17px] flex-1 font-medium transition-all text-slate-700">
                        {item.title}
                      </span>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-2">
                          {item.tags.map(tag => (
                            <span key={tag} className="px-2.5 py-1 text-[11px] font-bold rounded-md transition-all bg-slate-100 text-slate-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group: DONE */}
            {doneItems.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4 uppercase">완료 <span className="font-normal ml-1">({doneItems.length})</span></h2>
                <div className="space-y-1 opacity-60">
                  {doneItems.map(item => (
                    <div key={item.id} className="group flex items-center gap-4 py-3 border-b border-slate-50 hover:bg-slate-50/80 transition-colors px-2 -mx-2 rounded-lg cursor-pointer" onClick={() => toggleItem(item.id)}>
                      <button className="flex-shrink-0 transition-colors">
                        <CheckCircle2 className="w-6 h-6 text-slate-300" />
                      </button>
                      <span className="text-[17px] flex-1 font-medium transition-all text-slate-300 line-through">
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {items.length === 0 && (
               <div className="text-center py-20 text-slate-400 font-medium">
                 하단 입력창을 통해 첫 번째 항목을 추가해보세요.
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Area Fixed at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
        <form onSubmit={handleAddItem} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="새로운 할 일을 입력하고 엔터를 누르세요..."
            className="flex-1 px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm shadow-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium placeholder:font-normal"
          />
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className="px-6 py-4 bg-indigo-600 text-white rounded-2xl shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all font-bold"
          >
            추가
          </button>
        </form>
      </div>
    </div>
  );
}
