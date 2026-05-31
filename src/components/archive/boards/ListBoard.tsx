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
    { id: '1', title: 'Define launch goals & KPIs', completed: false, tags: ['Marketing'] },
    { id: '2', title: 'Finalize feature list', completed: true },
    { id: '3', title: 'Schedule marketing kickoff', completed: true },
    { id: '4', title: 'Draft press release (Due June 18)', completed: false, tags: ['Marketing'] },
    { id: '5', title: 'Design social assets', completed: true, tags: ['Design'] },
    { id: '6', title: 'Build landing page (In Progress)', completed: false, tags: ['Design'] },
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
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Projects</h3>
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-white shadow-sm border border-slate-100 rounded-xl text-slate-800 font-medium">
            <span className="text-lg">🚀</span> Launch Campaign
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors">
            <span className="text-lg">🎨</span> UI Redesign
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors">
            <span className="text-lg">📱</span> Content Strategy
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Product Launch Strategy</h1>
          <p className="text-slate-400 text-sm mb-12 font-medium">9 Tasks • 6 Done • Updated 2 mins ago</p>

          <div className="space-y-10">
            {/* Group: PLAN */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4 uppercase">Plan <span className="font-normal ml-1">(3)</span></h2>
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
              <h2 className="text-xs font-bold text-slate-400 tracking-widest mb-4 uppercase">Execute <span className="font-normal ml-1">(4)</span></h2>
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
