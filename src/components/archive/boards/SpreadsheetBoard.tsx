'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import './SpreadsheetBoard.css';
import { useArchiveStore } from '@/store/useArchiveStore';
import { Download, Upload, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import LuckyExcel from 'luckyexcel';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================
// 헬퍼: data(2D 밀집 배열) → celldata(희소 배열) 변환
// ============================================================
function dataToCelldata(data: any[][] | undefined): any[] {
  if (!data) return [];
  const celldata: any[] = [];
  data.forEach((row, r) => {
    if (!row) return;
    row.forEach((cell, c) => {
      if (cell !== null && cell !== undefined) {
        celldata.push({ r, c, v: cell });
      }
    });
  });
  return celldata;
}

// ============================================================
// 헬퍼: 저장된 시트 데이터를 FortuneSheet 초기화 형식으로 정규화
// ============================================================
function normalizeSheetForInit(sheet: any): any {
  const normalized = { ...sheet };
  if (normalized.data && !normalized.celldata) {
    normalized.celldata = dataToCelldata(normalized.data);
  }
  delete normalized.data;
  if (!normalized.celldata) {
    normalized.celldata = [];
  }
  return normalized;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function SpreadsheetBoard() {
  const { activeTabId, tabs, spreadsheetData, updateSpreadsheetData, updateTab } = useArchiveStore();
  const workbookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const currentTab = tabs.find(t => t.id === activeTabId);
  const savedData = activeTabId ? spreadsheetData[activeTabId] : null;

  const [localTitle, setLocalTitle] = useState(currentTab?.name || '스프레드시트');
  useEffect(() => {
    if (currentTab) setLocalTitle(currentTab.name || '');
  }, [currentTab?.name]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    if (activeTabId) {
      updateTab(activeTabId, { name: newTitle });
    }
  };

  const [zoom, setZoom] = useState(100);

  // Ctrl+Wheel Zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomChange = -e.deltaY * 0.5;
        setZoom(z => Math.min(200, Math.max(50, Math.round(z + zoomChange))));
      }
    };
    
    // Add to document to capture globally on the board
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  // Dropdown Click-away Fix: By adding a global click listener that triggers a click on a non-toolbar area
  // to force FortuneSheet to close its open dropdowns.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // If clicking inside the fortune-sheet editable area or formula bar, it should naturally close,
      // but sometimes the toolbar items stop propagation.
      // We check if the click target is NOT a toolbar item.
      const target = e.target as HTMLElement;
      if (!target.closest('.fortune-toolbar-item')) {
        // Dispatch a custom click to the fortune canvas to force close if needed
        const canvas = document.querySelector('.fortune-workarea canvas');
        if (canvas && e.target !== canvas) {
           // We don't want to infinite loop, so only dispatch if necessary or just let native events handle it.
           // However, for now, we just rely on the patch-package we did or the native behavior.
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const defaultData = useMemo(() => [{
    name: 'Sheet1',
    color: '',
    status: 1,
    order: 0,
    celldata: [],
    row: 100,
    column: 20,
    config: {},
    id: 'sheet_01',
  }], []);

  const sheetData = useMemo(() => {
    if (savedData && savedData.length > 0) {
      return savedData.map(normalizeSheetForInit);
    }
    return defaultData;
  }, [savedData, defaultData]);

  const handleOnChange = useCallback((updatedData: any) => {
    if (!activeTabId) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      updateSpreadsheetData(activeTabId, updatedData);
    }, 1500);
  }, [activeTabId, updateSpreadsheetData]);

  useEffect(() => {
    return () => {
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTabId) return;

    LuckyExcel.transformExcelToLucky(file, function(exportJson: any) {
      if (!exportJson.sheets || exportJson.sheets.length === 0) {
        alert("파일을 읽을 수 없습니다. 올바른 .xlsx 파일인지 확인해 주세요.");
        return;
      }
      updateSpreadsheetData(activeTabId, exportJson.sheets);
    });
    e.target.value = '';
  }, [activeTabId, updateSpreadsheetData]);

  const handleExport = useCallback(() => {
    const wb = XLSX.utils.book_new();
    let sheets: any[] | null = null;
    try {
      if (workbookRef.current?.getAllSheets) {
        sheets = workbookRef.current.getAllSheets();
      }
    } catch {}
    
    const sourceData = sheets || sheetData;
    if (!sourceData || sourceData.length === 0) return;
    
    sourceData.forEach((sheet: any) => {
      const wsData: any[][] = [];
      if (sheet.data) {
        sheet.data.forEach((row: any[]) => {
          const rowData: any[] = [];
          if (row) {
            row.forEach((cell: any) => {
              if (cell && typeof cell === 'object') {
                rowData.push(cell.f ? cell.f : (cell.m !== undefined ? cell.m : cell.v ?? null));
              } else {
                rowData.push(cell ?? null);
              }
            });
          }
          wsData.push(rowData);
        });
      } else if (sheet.celldata) {
        let maxR = 0, maxC = 0;
        sheet.celldata.forEach((cell: any) => {
          if (cell.r > maxR) maxR = cell.r;
          if (cell.c > maxC) maxC = cell.c;
        });
        for (let r = 0; r <= maxR; r++) {
          wsData.push(new Array(maxC + 1).fill(null));
        }
        sheet.celldata.forEach((cell: any) => {
          const v = cell.v;
          if (v && typeof v === 'object') {
            wsData[cell.r][cell.c] = v.f ? v.f : (v.m !== undefined ? v.m : v.v ?? null);
          } else {
            wsData[cell.r][cell.c] = v ?? null;
          }
        });
      }
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const sheetName = (sheet.name || 'Sheet1').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, \`spreadsheet_\${new Date().toISOString().slice(0, 10)}.xlsx\`);
  }, [sheetData]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey;
    if (isMod && (e.key === 'k' || e.key === 'n')) return;
    e.stopPropagation();
  }, []);

  if (!isClient) return null;

  return (
    <TooltipProvider delayDuration={500}>
      <div className="w-full h-full flex flex-col relative spreadsheet-container overflow-hidden bg-white" ref={containerRef}>
        {/* 툴바 (다크모드 지원 UI) */}
        <div className="px-4 py-2.5 bg-card/95 backdrop-blur-sm flex items-center justify-between shrink-0 border-b border-border/60 z-10">
           <div className="flex items-center gap-3">
              {/* 제목 동기화 Input */}
              <input 
                type="text" 
                value={localTitle}
                onChange={handleTitleChange}
                className="text-sm font-bold bg-transparent border border-transparent hover:border-border focus:border-indigo-500 focus:outline-none rounded px-2 py-1 max-w-[200px] transition-colors"
                placeholder="스프레드시트 이름"
              />
           </div>
           
           <div className="flex gap-4 items-center">
             {/* Zoom Controls */}
             <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg px-1.5 py-0.5 border border-border/60">
               <Tooltip><TooltipTrigger asChild><button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-0.5 hover:bg-card hover:shadow-sm rounded text-muted-foreground transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">축소</TooltipContent></Tooltip>
               <span className="text-[11px] font-bold w-9 text-center text-foreground tabular-nums">{zoom}%</span>
               <Tooltip><TooltipTrigger asChild><button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-0.5 hover:bg-card hover:shadow-sm rounded text-muted-foreground transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">확대</TooltipContent></Tooltip>
             </div>
             
             <div className="flex gap-2">
               <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-bold rounded-lg shadow-sm cursor-pointer transition-colors active:scale-95">
                 <Upload className="w-3.5 h-3.5" /> <span>가져오기</span>
                 <input type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
               </label>
               <button 
                 onClick={handleExport}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-lg shadow-sm transition-colors active:scale-95"
               >
                 <Download className="w-3.5 h-3.5" /> <span>내보내기</span>
               </button>
             </div>
           </div>
        </div>
        
        {/* 시트 캔버스 (Zoom Scale 적용) */}
        <div 
          className="flex-1 w-full relative overflow-hidden" 
          style={{ minHeight: 0 }}
          onKeyDown={handleKeyDown}
        >
          {/* Zoom을 위한 래퍼 */}
          <div 
            className="fortune-sheet-wrapper origin-top-left transition-transform duration-75"
            style={{ 
              width: \`\${(100 / zoom) * 100}%\`, 
              height: \`\${(100 / zoom) * 100}%\`, 
              transform: \`scale(\${zoom / 100})\` 
            }}
          >
            <Workbook 
              ref={workbookRef}
              data={sheetData} 
              onChange={handleOnChange}
              lang="ko"
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
