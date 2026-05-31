'use client'

import { MoreHorizontal, Plus } from 'lucide-react';

export function TableBoard() {
  return (
    <div className="w-full h-full bg-white p-8">
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-900">Name</th>
              <th className="px-6 py-4 font-semibold text-slate-900">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-900">Tags</th>
              <th className="px-6 py-4 font-semibold text-slate-900 w-16"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer group">
              <td className="px-6 py-4 font-medium text-slate-900">Design System Audit</td>
              <td className="px-6 py-4"><span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-[11px] uppercase tracking-wider font-bold">In Progress</span></td>
              <td className="px-6 py-4"><span className="text-slate-400 font-medium">#design #ui</span></td>
              <td className="px-6 py-4 text-right"><MoreHorizontal className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" /></td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer group">
              <td className="px-6 py-4 font-medium text-slate-900">Update Auth Flow</td>
              <td className="px-6 py-4"><span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-[11px] uppercase tracking-wider font-bold">Done</span></td>
              <td className="px-6 py-4"><span className="text-slate-400 font-medium">#backend #security</span></td>
              <td className="px-6 py-4 text-right"><MoreHorizontal className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" /></td>
            </tr>
          </tbody>
        </table>
        <div className="p-4 text-slate-400 hover:bg-slate-50 hover:text-slate-700 cursor-pointer flex items-center gap-2 text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> New Row
        </div>
      </div>
    </div>
  );
}
