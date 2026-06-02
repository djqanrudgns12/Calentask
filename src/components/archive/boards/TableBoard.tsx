'use client'

import { useState, useMemo } from 'react';
import { Plus, MoreHorizontal, ArrowUpDown, Tag as TagIcon, GripVertical, Settings2, Download, Search, CheckSquare } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';

type ColumnType = 'text' | 'tag' | 'status' | 'date';

interface ColumnConfig {
  id: string;
  name: string;
  type: ColumnType;
  width?: number;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'title', name: '이름', type: 'text' },
  { id: 'status', name: '상태', type: 'status' },
  { id: 'tags', name: '태그', type: 'tag' },
  { id: 'createdAt', name: '생성일', type: 'date' }
];

export function TableBoard() {
  const { activeTabId, items: storeItems, boardConfigs, setBoardConfig, updateItem, addItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];
  const config = activeTabId ? boardConfigs[activeTabId] : null;
  const columnsConfig: ColumnConfig[] = config?.columns || DEFAULT_COLUMNS;
  
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const handleAddRow = () => {
    if (!activeTabId) return;
    addItem(activeTabId, { title: '새 항목' });
  };

  const handleUpdateCell = (itemId: string, field: string, value: any) => {
    if (!activeTabId) return;
    if (field === 'title' || field === 'status' || field === 'tags') {
      updateItem(activeTabId, itemId, { [field]: value });
    } else {
      const item = items.find(i => i.id === itemId);
      if (item) {
        updateItem(activeTabId, itemId, { data: { ...item.data, [field]: value } });
      }
    }
  };

  const handleAddColumn = () => {
    if (!activeTabId) return;
    const name = window.prompt('새 컬럼 이름을 입력하세요 (예: 담당자, 우선순위):');
    if (!name) return;
    const newCol: ColumnConfig = { id: `col_${Date.now()}`, name, type: 'text' };
    setBoardConfig(activeTabId, { columns: [...columnsConfig, newCol] });
  };

  const columns = useMemo(() => {
    const cols: any[] = [
      {
        id: 'selection',
        header: () => <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />,
        cell: () => <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-20 hover:opacity-100 cursor-pointer transition-opacity" />,
        size: 50,
      },
      ...columnsConfig.map((col) => ({
        id: col.id,
        header: ({ column }: any) => {
          return (
            <div 
              className="flex items-center gap-2 cursor-pointer select-none group"
              onClick={column.getToggleSortingHandler()}
            >
              {col.type === 'tag' && <TagIcon className="w-3.5 h-3.5 text-slate-400" />}
              {col.name}
              <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        },
        accessorFn: (row: any) => {
          if (col.id === 'title') return row.title;
          if (col.id === 'status') return row.status;
          if (col.id === 'tags') return row.tags;
          if (col.id === 'createdAt') return row.createdAt;
          return row.data?.[col.id];
        },
        cell: (info: any) => {
          const val = info.getValue();
          const item = info.row.original;
          
          if (col.id === 'title') {
            return (
              <input 
                type="text" 
                value={val || ''} 
                onChange={(e) => handleUpdateCell(item.id, 'title', e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-bold text-slate-900 p-0 placeholder:text-slate-300"
                placeholder="입력..."
              />
            );
          }
          if (col.id === 'status') {
            const statusColors: Record<string, string> = {
              'todo': 'bg-slate-100 text-slate-600',
              'in-progress': 'bg-amber-100 text-amber-800',
              'done': 'bg-emerald-100 text-emerald-800'
            };
            const currentStatus = val || 'todo';
            return (
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
          }
          if (col.id === 'tags') {
            return (
              <input 
                type="text" 
                value={Array.isArray(val) ? val.join(', ') : (val || '')} 
                onChange={(e) => handleUpdateCell(item.id, 'tags', e.target.value.split(',').map(t=>t.trim()).filter(Boolean))}
                placeholder="태그 입력..."
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-500 text-sm p-0 placeholder:text-slate-300"
              />
            );
          }
          if (col.id === 'createdAt') {
            return <span className="text-slate-400 text-sm">{new Date(val).toLocaleDateString()}</span>;
          }
          
          return (
            <input 
              type="text" 
              value={val || ''} 
              onChange={(e) => handleUpdateCell(item.id, col.id, e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-600 text-sm p-0 placeholder:text-slate-200"
            />
          );
        }
      })),
      {
        id: 'actions',
        header: () => (
          <div className="flex justify-center text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" onClick={handleAddColumn}>
            <Plus className="w-4 h-4" />
          </div>
        ),
        cell: () => (
          <div className="flex justify-center">
            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all text-slate-400">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        ),
        size: 50,
      }
    ];
    return cols;
  }, [columnsConfig]);

  const table = useReactTable({
    data: items,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="w-full h-full bg-white flex flex-col relative overflow-hidden">
      {/* Toolbar */}
      <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="전체 컬럼 대상 스마트 검색..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-72 shadow-sm font-medium"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
            <Settings2 className="w-4 h-4" /> 보기 옵션
          </button>
        </div>
        <div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-slate-900/10 active:scale-95">
            <Download className="w-4 h-4" /> CSV 내보내기
          </button>
        </div>
      </div>

      {/* TanStack Table Rendering */}
      <div className="flex-1 overflow-auto p-8 hide-scrollbar">
        <div className="border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600 table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 select-none">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      className="px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100 transition-colors border-r border-slate-100 last:border-0"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : 'auto' }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 border-r border-slate-50 last:border-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Add New Row Button inline */}
              <tr className="hover:bg-slate-50/80 transition-colors cursor-pointer group" onClick={handleAddRow}>
                <td className="px-4 py-3 border-r border-slate-50 text-center text-slate-200 group-hover:text-indigo-400">
                   <Plus className="w-4 h-4 mx-auto" />
                </td>
                <td colSpan={columns.length} className="px-4 py-3">
                  <div className="text-slate-400 font-bold text-sm group-hover:text-slate-700 transition-colors">
                    새 항목 추가...
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          {items.length === 0 && (
             <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <CheckSquare className="w-12 h-12 text-slate-200 mb-4" />
                <p className="font-medium text-slate-500">데이터가 없습니다.</p>
                <p className="text-sm mt-1 mb-4">하단의 새 항목 추가를 눌러 에어테이블과 같은 여정을 시작하세요.</p>
                <button onClick={handleAddRow} className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-600 transition-all">
                  첫 행 만들기
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
