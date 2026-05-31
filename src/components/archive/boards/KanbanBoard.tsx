'use client'

import { Plus, GripHorizontal } from 'lucide-react';

export function KanbanBoard() {
  return (
    <div className="w-full h-full bg-[#f7f9fb] p-8 overflow-x-auto flex gap-6 hide-scrollbar rounded-3xl">
      {['To Do', 'In Progress', 'Done'].map((status) => (
        <div key={status} className="w-80 flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-extrabold text-slate-800 text-lg">{status} <span className="text-slate-400 font-medium text-sm ml-2">2</span></h3>
            <button className="p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors">
              <Plus className="w-5 h-5 text-slate-400 hover:text-slate-900" />
            </button>
          </div>
          <div className="flex-1 space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group">
              <p className="font-semibold text-slate-800 mb-4 leading-snug">Implement OAuth providers</p>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-700">A</div>
                  <div className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-emerald-700">B</div>
                </div>
                <GripHorizontal className="w-5 h-5 text-slate-200 group-hover:text-slate-400 transition-colors" />
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group">
              <p className="font-semibold text-slate-800 mb-4 leading-snug">Design system audit and token extraction</p>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-rose-50 text-rose-500 rounded-md text-[10px] font-bold uppercase tracking-wider">High Priority</span>
                <GripHorizontal className="w-5 h-5 text-slate-200 group-hover:text-slate-400 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
