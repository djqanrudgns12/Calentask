'use client'

import { useState } from 'react';
import { Circle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListItem {
  id: string;
  title: string;
  completed: boolean;
  tags?: string[];
}

export function ListBoard() {
  const [items, setItems] = useState<ListItem[]>([
    { id: '1', title: '출시 목표 및 KPI 정의', completed: false, tags: ['마케팅'] },
    { id: '2', title: '핵심 기능 리스트 확정', completed: true },
    { id: '3', title: '마케팅 킥오프 미팅 일정 잡기', completed: true },
    { id: '4', title: '보도자료 초안 작성 (6월 18일 마감)', completed: false, tags: ['마케팅'] },
    { id: '5', title: '소셜 미디어 에셋 디자인', completed: true, tags: ['디자인'] },
    { id: '6', title: '랜딩 페이지 구축 (진행 중)', completed: false, tags: ['디자인'] },
  ]);

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const planItems = items.slice(0, 3);
  const executeItems = items.slice(3, 6);

  return (
    <div className="flex h-full w-full bg-white text-left">
      {/* Sidebar Folders */}
      <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-6 hidden md:block">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">프로젝트 목록</h3>
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-white shadow-sm border border-slate-100 rounded-xl text-slate-800 font-bold">
            <span className="text-lg">🚀</span> 출시 캠페인
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors">
            <span className="text-lg">🎨</span> UI 리디자인
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors">
            <span className="text-lg">📱</span> 콘텐츠 전략
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">제품 출시 전략</h1>
          <p className="text-slate-400 text-sm mb-12 font-bold">총 작업 6개 • 완료 3개 • 방금 전 업데이트됨</p>

          <div className="space-y-10">
            {/* Group: PLAN */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4 uppercase">계획 <span className="font-normal ml-1">(3)</span></h2>
              <div className="space-y-1">
                {planItems.map(item => (
                  <div key={item.id} className="group flex items-center gap-4 py-3 border-b border-slate-50 hover:bg-slate-50/80 transition-colors px-2 -mx-2 rounded-lg cursor-pointer" onClick={() => toggleItem(item.id)}>
                    <button className="flex-shrink-0 transition-colors">
                      {item.completed ? <CheckCircle2 className="w-6 h-6 text-slate-300" /> : <Circle className="w-6 h-6 text-slate-300 group-hover:text-slate-400" />}
                    </button>
                    <span className={cn("text-[17px] flex-1 font-medium transition-all", item.completed ? "text-slate-300 line-through" : "text-slate-700")}>
                      {item.title}
                    </span>
                    {item.tags && (
                      <div className="flex gap-2">
                        {item.tags.map(tag => (
                          <span key={tag} className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", item.completed ? "bg-slate-50 text-slate-300" : "bg-slate-100 text-slate-500")}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Group: EXECUTE */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4 uppercase">실행 <span className="font-normal ml-1">(3)</span></h2>
              <div className="space-y-1">
                {executeItems.map(item => (
                  <div key={item.id} className="group flex items-center gap-4 py-3 border-b border-slate-50 hover:bg-slate-50/80 transition-colors px-2 -mx-2 rounded-lg cursor-pointer" onClick={() => toggleItem(item.id)}>
                    <button className="flex-shrink-0 transition-colors">
                      {item.completed ? <CheckCircle2 className="w-6 h-6 text-slate-300" /> : <Circle className="w-6 h-6 text-slate-300 group-hover:text-slate-400" />}
                    </button>
                    <span className={cn("text-[17px] flex-1 font-medium transition-all", item.completed ? "text-slate-300 line-through" : "text-slate-700")}>
                      {item.title}
                    </span>
                    {item.tags && (
                      <div className="flex gap-2">
                        {item.tags.map(tag => (
                          <span key={tag} className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", item.completed ? "bg-slate-50 text-slate-300" : "bg-slate-100 text-slate-500")}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
