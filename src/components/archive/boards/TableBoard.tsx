'use client'

import { useState, useMemo } from 'react';
import { Plus, MoreHorizontal, ArrowUpDown, Tag as TagIcon, GripVertical, Settings2, Download, Search } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';

type ColumnType = 'text' | 'tag' | 'status' | 'date';

interface Column {
  id: string;
  name: string;
  type: ColumnType;
  width?: number;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'title', name: '이름', type: 'text' },
  { id: 'status', name: '상태', type: 'status' },
  { id: 'tags', name: '태그', type: 'tag' },
  { id: 'createdAt', name: '생성일', type: 'date' }
];

export function TableBoard() {
  const { activeTabId, items: storeItems, boardConfigs, setBoardConfig, updateItem, addItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];
  const config = activeTabId ? boardConfigs[activeTabId] : null;
  const columns: Column[] = config?.columns || DEFAULT_COLUMNS;
  const sortConfig = config?.sort || null;
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize config if not exists
  if (activeTabId && !config) {
    // defer state update slightly or it might warn during render, but zustand handles it okay outside React strict mode.
    // Better to handle add column explicitly.
  }

  const handleAddRow = () => {
    if (!activeTabId) return;
    addItem(activeTabId, { title: '새 항목' });
  };

  const handleUpdateCell = (itemId: string, field: string, value: any) => {
    if (!activeTabId) return;
    if (field === 'title' || field === 'status' || field === 'tags') {
      updateItem(activeTabId, itemId, { [field]: value });
    } else {
      // update custom fields inside data
      const item = items.find(i => i.id === itemId);
      if (item) {
        updateItem(activeTabId, itemId, { data: { ...item.data, [field]: value } });
      }
    }
  };

  const handleAddColumn = () => {
    if (!activeTabId) return;
    const name = window.prompt('새 컬럼 이름을 입력하세요:');
    if (!name) return;
    const newCol: Column = { id: `col_${Date.now()}`, name, type: 'text' };
    setBoardConfig(activeTabId, { columns: [...columns, newCol] });
  };

  // Basic sorting
  const sortedItems = useMemo(() => {
    let result = [...items];
    if (searchQuery) {
      result = result.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (sortConfig) {
       // implement sorting if needed
    }
    return result;
  }, [items, sortConfig, searchQuery]);

  return (
    <div className="w-full h-full bg-white flex flex-col relative overflow-hidden">
      {/* Toolbar */}
      <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
            <ArrowUpDown className="w-4 h-4" /> 정렬
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
            <Settings2 className="w-4 h-4" /> 보기 옵션
          </button>
        </div>
        <div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors">
            <Download className="w-4 h-4" /> CSV 내보내기
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 hide-scrollbar">
        <div className="min-w-max border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 select-none">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                </th>
                {columns.map(col => (
                  <th key={col.id} className="px-4 py-3 font-semibold text-slate-700 group cursor-pointer hover:bg-slate-100 transition-colors relative">
                    <div className="flex items-center gap-2">
                      {col.type === 'tag' && <TagIcon className="w-3.5 h-3.5 text-slate-400" />}
                      {col.name}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors w-24 text-center" onClick={handleAddColumn}>
                  <Plus className="w-4 h-4 inline-block" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                  <td className="w-10 px-4 py-3 text-center">
                    <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                  {columns.map(col => {
                    let cellContent;
                    if (col.id === 'title') {
                      cellContent = (
                        <input 
                          type="text" 
                          value={item.title} 
                          onChange={(e) => handleUpdateCell(item.id, 'title', e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-medium text-slate-900 p-0"
                        />
                      );
                    } else if (col.id === 'status') {
                      const statusColors: Record<string, string> = {
                        'todo': 'bg-slate-100 text-slate-600',
                        'in-progress': 'bg-amber-100 text-amber-800',
                        'done': 'bg-emerald-100 text-emerald-800'
                      };
                      const currentStatus = item.status || 'todo';
                      cellContent = (
                        <select 
                          value={currentStatus}
                          onChange={(e) => handleUpdateCell(item.id, 'status', e.target.value)}
                          className={`appearance-none bg-transparent font-bold text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-md cursor-pointer outline-none ${statusColors[currentStatus] || statusColors['todo']}`}
                        >
                          <option value="todo">진행 전</option>
                          <option value="in-progress">진행 중</option>
                          <option value="done">완료</option>
                        </select>
                      );
                    } else if (col.id === 'tags') {
                      cellContent = (
                        <input 
                          type="text" 
                          value={item.tags?.join(', ') || ''} 
                          onChange={(e) => handleUpdateCell(item.id, 'tags', e.target.value.split(',').map(t=>t.trim()).filter(Boolean))}
                          placeholder="태그 입력..."
                          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-500 p-0"
                        />
                      );
                    } else if (col.id === 'createdAt') {
                      cellContent = <span className="text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>;
                    } else {
                      // Custom column
                      cellContent = (
                        <input 
                          type="text" 
                          value={item.data?.[col.id] || ''} 
                          onChange={(e) => handleUpdateCell(item.id, col.id, e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-600 p-0"
                        />
                      );
                    }

                    return (
                      <td key={col.id} className="px-4 py-3">
                        {cellContent}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                     <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all text-slate-400">
                        <MoreHorizontal className="w-4 h-4" />
                     </button>
                  </td>
                </tr>
              ))}
              
              {/* Add New Row Button inline */}
              <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={handleAddRow}>
                <td className="w-10 px-4 py-3"></td>
                <td colSpan={columns.length + 1} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                    <Plus className="w-4 h-4" />
                    새 행 추가
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
