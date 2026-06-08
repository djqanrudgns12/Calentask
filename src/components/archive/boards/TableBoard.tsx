'use client'

import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, MoreHorizontal, ArrowUpDown, Tag as TagIcon, GripVertical, Settings2, Download, Search, CheckSquare, Hash, Calendar, Type as TypeIcon } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';

type ColumnType = 'text' | 'tag' | 'status' | 'date' | 'number';

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

const EMPTY_ARRAY: any[] = [];

// Helper to get column icon
const getColIcon = (type: ColumnType) => {
  switch (type) {
    case 'text': return <TypeIcon className="w-3.5 h-3.5" />;
    case 'number': return <Hash className="w-3.5 h-3.5" />;
    case 'date': return <Calendar className="w-3.5 h-3.5" />;
    case 'tag': return <TagIcon className="w-3.5 h-3.5" />;
    case 'status': return <CheckSquare className="w-3.5 h-3.5" />;
  }
}

export function TableBoard() {
  const { activeTabId, items: storeItems, boardConfigs, setBoardConfig, updateItem, addItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;
  const config = activeTabId ? boardConfigs[activeTabId] : null;
  const columnsConfig: ColumnConfig[] = config?.columns || DEFAULT_COLUMNS;
  
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Spreadsheet state
  const [activeCell, setActiveCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

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

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if no cell is active, or if user is typing in a global input like search
      if (!activeCell || ((e.target as HTMLElement).tagName === 'INPUT' && !isEditing && (e.target as HTMLElement).id !== 'cell-input')) return;

      if (isEditing) {
        if (e.key === 'Escape') {
          setIsEditing(false);
          tableRef.current?.focus(); // Return focus to table container to continue nav
        } else if (e.key === 'Enter') {
          setIsEditing(false);
          // move down optionally
          const rowIndex = items.findIndex(i => i.id === activeCell.rowId);
          if (rowIndex < items.length - 1) {
            setActiveCell({ rowId: items[rowIndex + 1].id, colId: activeCell.colId });
          }
        }
        return;
      }

      const rowIndex = items.findIndex(i => i.id === activeCell.rowId);
      const colIndex = columnsConfig.findIndex(c => c.id === activeCell.colId);
      
      let nextRowIndex = rowIndex;
      let nextColIndex = colIndex;

      if (e.key === 'ArrowDown' && rowIndex < items.length - 1) {
        nextRowIndex++;
        e.preventDefault();
      } else if (e.key === 'ArrowUp' && rowIndex > 0) {
        nextRowIndex--;
        e.preventDefault();
      } else if (e.key === 'ArrowRight' && colIndex < columnsConfig.length - 1) {
        nextColIndex++;
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' && colIndex > 0) {
        nextColIndex--;
        e.preventDefault();
      } else if (e.key === 'Enter') {
        setIsEditing(true);
        e.preventDefault();
        return;
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        // Start typing directly!
        setIsEditing(true);
      }

      if (nextRowIndex !== rowIndex || nextColIndex !== colIndex) {
        setActiveCell({ rowId: items[nextRowIndex].id, colId: columnsConfig[nextColIndex].id });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, isEditing, items, columnsConfig]);

  // Paste Data (Ctrl+V TSV Parse)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (isEditing || !activeCell) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (!text) return;
    
    const rows = text.split('\n').map(r => r.split('\t'));
    const startRowIdx = items.findIndex(i => i.id === activeCell.rowId);
    const startColIdx = columnsConfig.findIndex(c => c.id === activeCell.colId);
    
    if (startRowIdx === -1 || startColIdx === -1) return;

    // Apply paste
    rows.forEach((rowVals, rOffset) => {
      const targetRow = items[startRowIdx + rOffset];
      if (!targetRow) return;
      rowVals.forEach((val, cOffset) => {
        const targetCol = columnsConfig[startColIdx + cOffset];
        if (!targetCol) return;
        handleUpdateCell(targetRow.id, targetCol.id, val.trim());
      });
    });
  };

  const columns = useMemo(() => {
    const cols: any[] = [
      {
        id: 'selection',
        header: () => <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />,
        cell: () => <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-20 hover:opacity-100 cursor-pointer transition-opacity" />,
        size: 40,
      },
      ...columnsConfig.map((col) => ({
        id: col.id,
        header: ({ column }: any) => {
          return (
            <div 
              className="flex items-center gap-1.5 md:gap-2 cursor-pointer select-none group w-full text-slate-500 font-bold text-xs md:text-sm whitespace-nowrap"
              onClick={column.getToggleSortingHandler()}
            >
              {getColIcon(col.type)}
              <span className="truncate">{col.name}</span>
              {column.getIsSorted() ? (
                <ArrowUpDown className="w-3 h-3 text-indigo-500 ml-auto shrink-0" />
              ) : (
                <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
              )}
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
          const isActive = activeCell?.rowId === item.id && activeCell?.colId === col.id;
          
          const getDisplayValue = () => {
             if (col.type === 'date') return val ? new Date(val).toLocaleDateString() : '';
             if (col.type === 'tag' && Array.isArray(val)) return val.join(', ');
             return val || '';
          };

          const handleCellClick = () => {
            if (isActive && !isEditing) setIsEditing(true);
            else {
              setActiveCell({ rowId: item.id, colId: col.id });
              setIsEditing(false);
            }
          };

          const handleDoubleClick = () => {
            setActiveCell({ rowId: item.id, colId: col.id });
            setIsEditing(true);
          };

          return (
            <div 
              onClick={handleCellClick}
              onDoubleClick={handleDoubleClick}
              className={cn(
                "w-full h-full min-h-[36px] px-2 md:px-3 py-1.5 md:py-2 flex items-center border-[1.5px] transition-colors overflow-hidden text-xs md:text-sm",
                isActive ? "border-indigo-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)] bg-indigo-50/10" : "border-transparent",
                !isEditing && "cursor-cell select-none"
              )}
            >
              {isActive && isEditing ? (
                col.type === 'date' ? (
                  <input 
                    id="cell-input"
                    type="date"
                    autoFocus
                    value={val ? new Date(val).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleUpdateCell(item.id, col.id, e.target.value)}
                    onBlur={() => setIsEditing(false)}
                    className="w-full bg-transparent border-none outline-none p-0 text-xs md:text-sm"
                  />
                ) : col.type === 'status' ? (
                  <select 
                    id="cell-input"
                    autoFocus
                    value={val || 'todo'}
                    onChange={(e) => { handleUpdateCell(item.id, col.id, e.target.value); setIsEditing(false); }}
                    onBlur={() => setIsEditing(false)}
                    className="w-full bg-transparent border-none outline-none p-0 text-xs md:text-sm"
                  >
                    <option value="todo">진행 전</option>
                    <option value="in-progress">진행 중</option>
                    <option value="done">완료</option>
                  </select>
                ) : (
                  <input 
                    id="cell-input"
                    type={col.type === 'number' ? 'number' : 'text'}
                    autoFocus
                    value={col.type === 'tag' && Array.isArray(val) ? val.join(', ') : (val || '')}
                    onChange={(e) => {
                       const finalVal = col.type === 'tag' ? e.target.value.split(',').map(t=>t.trim()).filter(Boolean) : e.target.value;
                       handleUpdateCell(item.id, col.id, finalVal);
                    }}
                    onBlur={() => setIsEditing(false)}
                    className="w-full bg-transparent border-none outline-none p-0 text-xs md:text-sm font-semibold text-slate-800"
                  />
                )
              ) : (
                <div className={cn("truncate whitespace-nowrap", col.type === 'number' && "text-right w-full font-mono text-slate-600", col.id === 'title' && "font-bold text-slate-900")}>
                  {col.type === 'status' ? (
                     <span className={cn(
                       "px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider",
                       val === 'done' ? 'bg-emerald-100 text-emerald-700' : val === 'in-progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                     )}>
                       {val === 'done' ? '완료' : val === 'in-progress' ? '진행 중' : '진행 전'}
                     </span>
                  ) : getDisplayValue()}
                </div>
              )}
            </div>
          );
        }
      }))
    ];
    
    // Add columns button
    cols.push({
        id: 'actions',
        header: () => (
          <div className="flex justify-center text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" onClick={handleAddColumn} title="새 컬럼 추가">
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
      });

    return cols;
  }, [columnsConfig, activeCell, isEditing]);

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
    <div className="w-full h-full bg-white flex flex-col relative overflow-hidden focus:outline-none pb-24 md:pb-0" tabIndex={0} ref={tableRef} onPaste={handlePaste}>
      {/* Toolbar */}
      <div className="px-4 md:px-8 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white gap-2 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="전체 셀 검색..."
              className="pl-9 pr-4 py-1.5 md:py-2 bg-slate-50 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all w-48 md:w-72 shadow-sm font-medium"
            />
          </div>
          <button className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap">
            <Settings2 className="w-4 h-4" /> 필터
          </button>
        </div>
        <div className="shrink-0">
          <button className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-emerald-900/10 active:scale-95 whitespace-nowrap">
            <Download className="w-4 h-4" /> <span className="hidden md:inline">CSV 내보내기</span><span className="md:hidden">CSV</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Rendering */}
      <div className="flex-1 overflow-auto hide-scrollbar bg-slate-50/30">
        <div className="min-w-full inline-block align-middle">
          <table className="w-full text-left text-slate-700 border-collapse">
            <thead className="bg-slate-100/80 sticky top-0 z-10 select-none shadow-sm backdrop-blur-md">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      className="px-2 md:px-3 py-2 md:py-2.5 font-bold text-slate-600 border-r border-b border-slate-200/60 last:border-r-0 hover:bg-slate-200/50 transition-colors whitespace-nowrap"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : 'auto' }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <tr key={row.id} className="border-b border-slate-100 bg-white hover:bg-indigo-50/30 transition-colors group">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-0 border-r border-slate-100 last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              
              {/* Summary Row */}
              {items.length > 0 && (
                 <tr className="bg-slate-50/50 border-b border-slate-200 font-medium text-slate-500 text-xs">
                    <td className="px-4 py-2 border-r border-slate-200 text-center bg-slate-100">{items.length}행</td>
                    {columnsConfig.map((col, idx) => {
                       if (idx === 0) return <td key={col.id} className="px-4 py-3 border-r border-slate-200 bg-slate-50">Count: {items.length}</td>;
                       return <td key={col.id} className="px-4 py-3 border-r border-slate-200 text-right bg-slate-50"></td>;
                    })}
                    <td className="bg-slate-50"></td>
                 </tr>
              )}

              {/* Add New Row Button */}
              <tr className="bg-white hover:bg-slate-50 cursor-pointer group" onClick={handleAddRow}>
                <td className="px-4 py-3 border-r border-slate-100 text-center text-slate-300 group-hover:text-indigo-500 transition-colors">
                   <Plus className="w-4 h-4 mx-auto" />
                </td>
                <td colSpan={columns.length} className="px-4 py-3">
                  <div className="text-slate-400 font-bold text-sm group-hover:text-indigo-600 transition-colors">
                    새 항목 추가...
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          {items.length === 0 && (
             <div className="p-8 md:p-16 text-center flex flex-col items-center justify-center h-full pb-32">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-inner">
                   <CheckSquare className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg md:text-xl font-black text-slate-800 mb-2 truncate px-4 w-full">데이터베이스를 구축하세요</h3>
                <p className="text-slate-500 font-medium text-xs md:text-sm mb-6 max-w-sm text-center px-4">방향키로 이동하고, Enter로 편집하며, Ctrl+V로 붙여넣는 강력한 스프레드시트를 경험하세요.</p>
                <button onClick={handleAddRow} className="px-5 md:px-6 py-2 md:py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs md:text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap">
                  첫 행 만들기
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
